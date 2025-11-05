# Research & Technical Decisions: AI Landscape Studio Platform

**Feature**: 001-002-landscape-studio
**Date**: 2025-11-03
**Status**: Complete

## Overview

This document captures the research findings and technical decisions made during the planning phase for the AI Landscape Studio platform. All decisions are informed by the functional requirements in [spec.md](./spec.md) and aligned with the constitution principles.

---

## Decision 1: PostgreSQL Row-Level Locking for Race Condition Prevention

**Context**: The platform requires atomic token/trial deduction to prevent race conditions when users click "Generate" multiple times rapidly.

**Decision**: Use PostgreSQL `FOR UPDATE` row-level locking for all financial operations

**Rationale**:
1. **Atomic Operations**: PostgreSQL transactions with `FOR UPDATE` guarantee that only one request can modify a token balance at a time
2. **Database-Level Enforcement**: Lock is enforced at the database layer, independent of application logic
3. **Performance**: Row-level locks are highly performant for this use case (<10ms overhead)
4. **Proven Pattern**: Standard practice for financial systems, battle-tested in production

**Alternatives Considered**:
1. **Application-Level Locking (Redis)**:
   - ❌ Requires additional infrastructure (Redis cluster)
   - ❌ Network latency adds overhead
   - ❌ Lock expiration management is complex
   - ❌ Race conditions still possible if Redis fails

2. **Optimistic Locking (Version Numbers)**:
   - ❌ Retry logic required on conflict (poor UX)
   - ❌ Higher contention under load
   - ❌ More complex error handling

3. **Queue-Based Processing**:
   - ❌ Adds latency (queue processing delay)
   - ❌ Requires queue infrastructure (RabbitMQ, SQS)
   - ❌ Overkill for this use case

**Implementation Example**:
```python
def deduct_token(user_id: str) -> bool:
    with db.transaction():
        # Lock the row until transaction commits
        account = db.query("""
            SELECT * FROM users_token_accounts
            WHERE user_id = %s
            FOR UPDATE
        """, [user_id])

        if account.balance < 1:
            return False  # Insufficient tokens

        # Deduct atomically
        db.query("""
            UPDATE users_token_accounts
            SET balance = balance - 1
            WHERE user_id = %s
        """, [user_id])

        return True
```

**Test Coverage**:
- TC-RACE-1.1: 10 concurrent deduction attempts, balance=1 → only 1 succeeds
- TC-RACE-3.1: Trial deduction race condition (same pattern)
- Integration test: Stress test with 100 concurrent requests

**References**:
- PostgreSQL Locking Documentation: https://www.postgresql.org/docs/current/explicit-locking.html
- Pattern used by Stripe, GitHub, GitLab for financial operations

---

## Decision 2: Stripe Webhook Idempotency via Payment Intent ID

**Context**: Stripe may retry webhooks up to 3 times on network failures. We must prevent duplicate token credits.

**Decision**: Use `stripe_payment_intent_id` as idempotency key, check before processing

**Rationale**:
1. **Stripe Best Practice**: Payment Intent IDs are unique and stable per transaction
2. **Database Constraint**: `UNIQUE` constraint on `stripe_payment_intent_id` column provides automatic enforcement
3. **Zero Overhead**: Simple `SELECT` query before processing
4. **Guaranteed Correctness**: Database-level uniqueness constraint prevents duplicates even under race conditions

**Alternatives Considered**:
1. **Stripe Idempotency Keys (API-Level)**:
   - ❌ Only prevents duplicate API calls TO Stripe, not FROM Stripe (webhooks)
   - ❌ Doesn't solve webhook retry problem

2. **Distributed Lock (Redis)**:
   - ❌ Adds complexity and infrastructure
   - ❌ Lock expiration management
   - ❌ Database constraint is simpler and more reliable

3. **Event Sourcing (Store All Events)**:
   - ❌ Overkill for this requirement
   - ❌ Requires event replay logic
   - ❌ More storage and complexity

**Implementation Example**:
```python
def process_webhook(event: dict) -> bool:
    payment_intent_id = event['data']['object']['id']

    # Check if already processed (idempotency)
    existing = db.query("""
        SELECT * FROM users_token_transactions
        WHERE stripe_payment_intent_id = %s
    """, [payment_intent_id])

    if existing:
        logger.info(f"Webhook already processed: {payment_intent_id}")
        return True  # Return success to Stripe (already handled)

    with db.transaction():
        # Process payment and credit tokens
        credit_tokens(user_id, amount, payment_intent_id)

    return True
```

**Test Coverage**:
- TC-RACE-2.1: Webhook received 3 times with same payment_intent_id → tokens credited once
- TC-1.4.3: Duplicate webhook (idempotency) test in spec.md
- Integration test: Simulate webhook retries

**References**:
- Stripe Webhook Best Practices: https://stripe.com/docs/webhooks/best-practices
- Idempotency Guide: https://stripe.com/docs/api/idempotent_requests

---

## Decision 3: Parallel Generation Processing with asyncio

**Context**: Multi-area generation (3 areas) should complete in 60-90s, not 3×60=180s sequential

**Decision**: Use Python asyncio with `asyncio.gather()` for parallel Gemini API calls

**Rationale**:
1. **Performance**: 3× faster completion time (60-90s vs 180s)
2. **Native Python**: No additional infrastructure required (asyncio built-in)
3. **Gemini SDK Support**: Google Gemini SDK supports async operations
4. **Error Isolation**: One area failure doesn't block others
5. **Token Refund**: Failed areas refunded individually (e.g., 3 areas requested, 1 fails → 1 token refunded, user gets 2 designs)

**Alternatives Considered**:
1. **Sequential Processing**:
   - ❌ Poor UX (3× slower)
   - ❌ No performance benefit

2. **Threading (concurrent.futures)**:
   - ❌ Python GIL limits true parallelism
   - ❌ More overhead than asyncio for I/O-bound tasks
   - ✅ Could work, but asyncio is more idiomatic

3. **Task Queue (Celery)**:
   - ❌ Overkill for this use case
   - ❌ Requires Celery + broker (Redis/RabbitMQ)
   - ❌ Adds deployment complexity

4. **Separate Microservice**:
   - ❌ Over-engineering
   - ❌ Network latency between services
   - ❌ More infrastructure to manage

**Implementation Example**:
```python
async def generate_multi_area(areas: list[Area], user_id: str) -> list[GenerationResult]:
    # Deduct tokens upfront for all areas
    tokens_needed = len(areas)
    deduct_tokens(user_id, tokens_needed)

    # Generate all areas in parallel
    tasks = [generate_single_area(area) for area in areas]
    results = await asyncio.gather(*tasks, return_exceptions=True)

    # Refund tokens for failed areas
    failed_count = sum(1 for r in results if isinstance(r, Exception))
    if failed_count > 0:
        refund_tokens(user_id, failed_count)

    return [r for r in results if not isinstance(r, Exception)]
```

**Test Coverage**:
- TC-5.2.1: 3-area generation completes in <90s (not 180s)
- TC-5.2.2: Partial generation failure (1 area fails, 2 succeed, 1 token refunded)
- Performance benchmark: Measure parallel vs sequential completion time

**References**:
- Python asyncio Documentation: https://docs.python.org/3/library/asyncio.html
- Google Gemini Async SDK: https://ai.google.dev/api/python/google/generativeai

---

## Decision 4: localStorage for Generation Progress Persistence

**Context**: Users may accidentally refresh the page mid-generation. Progress should be recoverable.

**Decision**: Store `request_id` in localStorage, resume polling on page load

**Rationale**:
1. **Simplicity**: No backend state management required
2. **Zero Latency**: Instant recovery on page refresh
3. **Privacy**: request_id is not sensitive data
4. **Browser Support**: localStorage widely supported (99%+ browsers)

**Alternatives Considered**:
1. **Session Storage**:
   - ❌ Lost on tab close (less resilient than localStorage)
   - ✅ Same simplicity as localStorage

2. **Backend Session State**:
   - ❌ Requires backend polling state management
   - ❌ More complex (session expiration, cleanup)
   - ❌ Not needed for read-only progress tracking

3. **Cookies**:
   - ❌ Sent with every request (unnecessary overhead)
   - ❌ Size limitations (4KB)
   - ❌ More complex than localStorage

**Implementation Example**:
```typescript
// Save request_id when generation starts
const startGeneration = async (params: GenerationParams) => {
  const requestId = uuid();
  localStorage.setItem('activeGenerationId', requestId);

  await apiClient.generateDesign({ ...params, requestId });
  pollGenerationStatus(requestId);
};

// Resume on page load
useEffect(() => {
  const activeId = localStorage.getItem('activeGenerationId');
  if (activeId) {
    // Resume polling for this generation
    pollGenerationStatus(activeId);
  }
}, []);

// Clear on completion
const onGenerationComplete = (requestId: string) => {
  localStorage.removeItem('activeGenerationId');
  // Display results...
};
```

**Test Coverage**:
- TC-5.2.3: Progress persistence across page refresh
- E2E test: Start generation, refresh page, verify progress resumes

**References**:
- MDN localStorage: https://developer.mozilla.org/en-US/docs/Web/API/Window/localStorage
- Best practices for localStorage usage

---

## Decision 5: Zustand Store Architecture for Token State

**Context**: Token balance must update in real-time across all UI components (navbar, modal, account page)

**Decision**: Centralized `tokenStore` with selective localStorage persistence

**Rationale**:
1. **Constitution Compliance**: Zustand is mandated in constitution (V. State Management)
2. **Real-Time Updates**: Single source of truth, all components subscribe to same store
3. **Selective Persistence**: Only persist balance/config, not transactions (transactions fetched from API)
4. **Optimistic Updates**: Update UI immediately, reconcile with backend asynchronously

**Alternatives Considered**:
1. **React Context + useReducer**:
   - ❌ More boilerplate than Zustand
   - ❌ No built-in persistence middleware
   - ❌ Constitution mandates Zustand

2. **Redux Toolkit**:
   - ❌ Heavier than Zustand for this use case
   - ❌ Constitution mandates Zustand

3. **Component-Local State**:
   - ❌ No shared state across components
   - ❌ Multiple API calls for same data
   - ❌ Inconsistent UI state

**Implementation Example**:
```typescript
interface TokenState {
  balance: number;
  transactions: TokenTransaction[];
  autoReloadConfig: AutoReloadConfig | null;

  // Actions
  fetchBalance: () => Promise<void>;
  fetchTransactions: (filters?: TransactionFilters) => Promise<void>;
  updateAutoReload: (config: AutoReloadConfig) => Promise<void>;
}

export const useTokenStore = create<TokenState>()(
  persist(
    (set, get) => ({
      balance: 0,
      transactions: [],
      autoReloadConfig: null,

      fetchBalance: async () => {
        const balance = await apiClient.getTokenBalance();
        set({ balance });
      },

      fetchTransactions: async (filters) => {
        const transactions = await apiClient.getTransactions(filters);
        set({ transactions });
      },

      updateAutoReload: async (config) => {
        await apiClient.configureAutoReload(config);
        set({ autoReloadConfig: config });
      },
    }),
    {
      name: 'token-storage',
      // Only persist balance and config, not transactions
      partialize: (state) => ({
        balance: state.balance,
        autoReloadConfig: state.autoReloadConfig
      }),
    }
  )
);
```

**Test Coverage**:
- Unit tests: Zustand store actions and state updates
- E2E tests: Verify balance updates propagate to all components
- Persistence test: Refresh page, verify balance persisted

**References**:
- Zustand Documentation: https://github.com/pmndrs/zustand
- Zustand Persist Middleware: https://github.com/pmndrs/zustand#persist-middleware

---

## Decision 6: Stripe Checkout (Hosted) vs Custom Payment Form

**Context**: Token purchases and subscriptions require credit card processing

**Decision**: Use Stripe Checkout (hosted page), not custom payment form

**Rationale**:
1. **PCI Compliance**: Stripe Checkout is PCI-compliant out of the box, no card data touches our servers
2. **Security**: Reduces attack surface (no card data in our application)
3. **Features**: Built-in support for multiple payment methods, Apple Pay, Google Pay, etc.
4. **Localization**: Multi-language and multi-currency support
5. **Lower Dev Cost**: 80% less code than custom payment form
6. **Compliance**: SC-034 requires no card data stored in database (PASS)

**Alternatives Considered**:
1. **Custom Payment Form (Stripe Elements)**:
   - ❌ More complex implementation (tokenization, validation, styling)
   - ❌ Requires PCI compliance audit
   - ❌ More attack surface
   - ✅ More customizable UI (not needed for v1.0)

2. **PayPal Only**:
   - ❌ Lower conversion rates (credit cards convert better)
   - ❌ No subscription management
   - ❌ Doesn't solve trial-to-paid funnel

3. **Cryptocurrency (Bitcoin, Ethereum)**:
   - ❌ Poor UX for non-crypto users (target audience is homeowners)
   - ❌ Price volatility
   - ❌ No refund mechanism

**Implementation Example**:
```python
# Backend: Create Stripe Checkout session
@router.post("/tokens/purchase")
async def create_token_checkout(package: TokenPackage, user: User):
    session = stripe.checkout.Session.create(
        customer=user.stripe_customer_id,
        mode='payment',
        line_items=[{
            'price_data': {
                'currency': 'usd',
                'product_data': {'name': f'{package.tokens} Tokens'},
                'unit_amount': package.price_cents,
            },
            'quantity': 1,
        }],
        success_url='https://yarda.pro/purchase-success',
        cancel_url='https://yarda.pro/pricing',
        metadata={'user_id': user.id, 'tokens': package.tokens},
    )
    return {'checkout_url': session.url}

# Frontend: Redirect to Stripe Checkout
const purchaseTokens = async (packageId: string) => {
  const { checkout_url } = await apiClient.createTokenCheckout(packageId);
  window.location.href = checkout_url;  // Redirect to Stripe
};
```

**Test Coverage**:
- E2E test: Complete checkout flow with test card (4242 4242 4242 4242)
- Webhook test: Verify tokens credited after successful payment
- Error test: Verify cancelled checkout doesn't credit tokens

**References**:
- Stripe Checkout Documentation: https://stripe.com/docs/payments/checkout
- PCI Compliance Guide: https://stripe.com/docs/security/guide

---

## Decision 7: PostgreSQL vs Firestore for Token Transactions

**Context**: Constitution mentions Firestore as storage, but spec requires ACID transactions and row-level locking

**Decision**: Migrate from Firestore to PostgreSQL (Supabase) for token/subscription system

**Rationale**:
1. **ACID Transactions**: PostgreSQL guarantees atomicity, Firestore doesn't (eventual consistency)
2. **Row-Level Locking**: Required for race condition prevention (FR-011, FR-021)
3. **Complex Queries**: Transaction history with filters, pagination, aggregations (easier in SQL)
4. **Performance**: Indexes for fast lookups (user_id, stripe_payment_intent_id)
5. **Referential Integrity**: Foreign keys ensure data consistency
6. **Compliance**: NFR-2.2 requires ACID transactions (critical for financial operations)

**Alternatives Considered**:
1. **Keep Firestore**:
   - ❌ No ACID transactions (critical failure for financial operations)
   - ❌ No row-level locking (race conditions)
   - ❌ Eventual consistency (balance discrepancies possible)
   - ❌ Doesn't meet NFR-2.2 (Data Integrity requirement)

2. **Hybrid (Firestore + PostgreSQL)**:
   - ❌ Adds complexity (two databases to maintain)
   - ❌ Synchronization issues
   - ✅ Could work, but unnecessary complexity

3. **DynamoDB**:
   - ❌ NoSQL (same issues as Firestore for financial operations)
   - ❌ No native ACID transactions across items

**Migration Strategy**:
- Generations table: Keep in Firestore (no ACID requirement)
- Users table: Migrate to PostgreSQL (add subscription fields)
- Token accounts: NEW PostgreSQL table
- Token transactions: NEW PostgreSQL table
- Rate limits: Keep in Firestore (read-heavy, no ACID requirement)

**Implementation Notes**:
- Supabase provides PostgreSQL with built-in RLS (Row-Level Security)
- Connection pooling via psycopg2 (10-20 connections)
- Migrations managed in `supabase/migrations/`

**Test Coverage**:
- Migration test: Verify all users migrated correctly
- ACID test: Verify transaction rollback on error
- Performance test: Verify <100ms token deduction (NFR-1.1)

**References**:
- Supabase PostgreSQL: https://supabase.com/docs/guides/database
- ACID vs BASE: https://www.postgresql.org/docs/current/transaction-iso.html

---

## Decision 8: Auto-Reload Throttle Mechanism

**Context**: Auto-reload must not trigger multiple times in rapid succession (FR-037)

**Decision**: 60-second throttle using `last_reload_at` timestamp check

**Rationale**:
1. **Simplicity**: Single timestamp field, no complex logic
2. **Database-Enforced**: Checked in transaction with row lock
3. **Business Logic**: 60 seconds gives buffer for webhook processing
4. **No Infrastructure**: No Redis or external cache needed

**Alternatives Considered**:
1. **Distributed Lock (Redis)**:
   - ❌ Adds Redis infrastructure
   - ❌ Lock expiration management
   - ❌ Overkill for this requirement

2. **Rate Limiting Service**:
   - ❌ Over-engineering
   - ❌ External service dependency

3. **Client-Side Throttle**:
   - ❌ Not secure (client can bypass)
   - ❌ Doesn't prevent backend triggers

**Implementation Example**:
```python
def trigger_auto_reload(user_id: str) -> bool:
    with db.transaction():
        account = db.query("""
            SELECT * FROM users_token_accounts
            WHERE user_id = %s
            FOR UPDATE
        """, [user_id])

        # Check throttle (60 seconds minimum)
        if account.last_reload_at:
            seconds_since_last = (now() - account.last_reload_at).total_seconds()
            if seconds_since_last < 60:
                logger.info(f"Auto-reload throttled: {seconds_since_last}s since last")
                return False  # Throttled

        # Update timestamp immediately to prevent duplicate triggers
        db.query("""
            UPDATE users_token_accounts
            SET last_reload_at = NOW()
            WHERE user_id = %s
        """, [user_id])

        # Proceed with Stripe payment
        create_stripe_payment_intent(user_id, account.auto_reload_amount)

        return True
```

**Test Coverage**:
- TC-RACE-4.1: Auto-reload triggered twice within 30 seconds → second blocked
- TC-3.2.2: Throttle prevents duplicate reloads

**References**:
- Throttling patterns: https://www.postgresql.org/docs/current/functions-datetime.html

---

## Decisions Summary

| Decision | Technology Choice | Key Benefit |
|----------|------------------|-------------|
| Race Condition Prevention | PostgreSQL `FOR UPDATE` | Atomic operations, database-enforced |
| Webhook Idempotency | `stripe_payment_intent_id` unique constraint | Zero overhead, guaranteed correctness |
| Parallel Generation | Python asyncio `gather()` | 3× faster, no infrastructure |
| Progress Persistence | localStorage `request_id` | Zero latency, simple |
| Token State | Zustand with persistence | Constitution compliance, real-time |
| Payment Processing | Stripe Checkout (hosted) | PCI compliance, security |
| Database for Tokens | PostgreSQL (Supabase) | ACID transactions, row-locking |
| Auto-Reload Throttle | Timestamp check (60s) | Simple, database-enforced |

---

## Risk Mitigation

### Risk 1: Gemini API Rate Limits (60 req/min)

**Mitigation**:
- Rate limit per user: 10 generations per minute (FR-088)
- Backend queue for multi-area requests (3 areas = 3 API calls, spread over time)
- Exponential backoff on 429 errors
- Monitor quota usage via Gemini dashboard

### Risk 2: Stripe Webhook Delivery Failures

**Mitigation**:
- Idempotency key prevents duplicate processing
- Manual reconciliation script (daily cron job) to catch missed webhooks
- Webhook retry configuration (Stripe retries up to 3 times)
- Alert on webhook failure count >5 in 1 hour

### Risk 3: Database Connection Pool Exhaustion

**Mitigation**:
- Connection pool size: 10-20 connections (configured in psycopg2)
- Connection timeout: 5 seconds (fail fast)
- Monitoring: Alert when >90% pool utilization
- Auto-scaling: Increase pool size if sustained high utilization

### Risk 4: Race Condition Under Extreme Load

**Mitigation**:
- Load testing with 100+ concurrent users before production
- Stress test: 1,000 concurrent deduction attempts, verify all handled correctly
- Database performance: Ensure <10ms lock acquisition time
- Monitoring: Alert on lock wait time >100ms

---

## Performance Benchmarks

| Operation | Target | Measured | Status |
|-----------|--------|----------|--------|
| Token Balance Fetch | <100ms | TBD | Not Tested |
| Token Deduction (Atomic) | <50ms | TBD | Not Tested |
| Transaction History (20 items) | <200ms | TBD | Not Tested |
| Single Generation | 30-60s | TBD | Not Tested |
| Multi-Area (3 areas) | 60-90s | TBD | Not Tested |
| Auto-Reload Trigger | <5s | TBD | Not Tested |

**Note**: Benchmarks will be measured during implementation and integration testing phase.

---

## References

1. PostgreSQL Locking: https://www.postgresql.org/docs/current/explicit-locking.html
2. Stripe Webhooks: https://stripe.com/docs/webhooks/best-practices
3. Stripe Idempotency: https://stripe.com/docs/api/idempotent_requests
4. Python asyncio: https://docs.python.org/3/library/asyncio.html
5. Google Gemini Async SDK: https://ai.google.dev/api/python/google/generativeai
6. Zustand Documentation: https://github.com/pmndrs/zustand
7. Supabase PostgreSQL: https://supabase.com/docs/guides/database
8. Stripe Checkout: https://stripe.com/docs/payments/checkout

---

## Decision 9: Google Maps Platform APIs for Automatic Property Image Fetching

**Context**: When users don't upload their own property images, the system needs to automatically fetch property imagery from Google Maps Platform APIs based on the provided address.

**Decision**: Use a three-API approach: Geocoding API for address validation, Street View Static API for ground-level imagery (primary), and Maps Static API (satellite view) as fallback when Street View is unavailable.

**Rationale**:
1. **Complete Coverage**: Street View for most addresses, satellite as universal fallback
2. **Cost-Effective**: Metadata endpoint is free, preventing wasted requests
3. **Production-Ready**: Official Google APIs with SLA guarantees
4. **Quality**: High-resolution imagery suitable for landscape design context
5. **Async Integration**: Native support for Python async/await patterns (FastAPI)

### API Component 1: Geocoding API

**Purpose**: Validate and standardize addresses, convert to coordinates

**Request Format**:
```
GET https://maps.googleapis.com/maps/api/geocode/json?address=ADDRESS&key=API_KEY
```

**Key Parameters**:
- `address` (string): Full street address (e.g., "1600 Amphitheatre Parkway, Mountain View, CA")
- `key` (string): Your API key

**Response Structure**:
```json
{
  "results": [
    {
      "formatted_address": "1600 Amphitheatre Pkwy, Mountain View, CA 94043, USA",
      "geometry": {
        "location": {
          "lat": 37.4224764,
          "lng": -122.0842499
        }
      },
      "address_components": [...],
      "place_id": "ChIJ2eUgeAK6j4ARbn5u_wAGqWA"
    }
  ],
  "status": "OK"
}
```

**Status Codes**:
- `OK`: Valid address found
- `ZERO_RESULTS`: No results for address
- `OVER_QUERY_LIMIT`: Quota exceeded
- `REQUEST_DENIED`: API not enabled or invalid key
- `INVALID_REQUEST`: Missing address parameter

**Rate Limits**:
- 3,000 requests per minute
- 50 requests per second (per project)

**Pricing** (2024-2025):
- $5 per 1,000 requests
- $200 monthly credit (until Feb 28, 2025) = ~40,000 free requests/month
- Volume discounts available for 500,000+ monthly requests

### API Component 2: Street View Static API

**Purpose**: Fetch ground-level property images for context-rich landscape design

**Metadata Endpoint** (Check Availability - FREE):
```
GET https://maps.googleapis.com/maps/api/streetview/metadata?location=LAT,LNG&key=API_KEY
```

**Metadata Response**:
```json
{
  "status": "OK",
  "pano_id": "tu510ie_z4ptBZYo2BGEJg",
  "location": {
    "lat": 40.457375,
    "lng": -80.009353
  },
  "date": "2021-05",
  "copyright": "© 2021 Google"
}
```

**Metadata Status Codes**:
- `OK`: Imagery available (proceed with image request)
- `ZERO_RESULTS`: No panorama near location (use satellite fallback)
- `NOT_FOUND`: Address couldn't be resolved
- `OVER_QUERY_LIMIT`: Quota exceeded

**Image Request** (After Metadata Confirms Availability):
```
GET https://maps.googleapis.com/maps/api/streetview?size=600x400&location=LAT,LNG&fov=90&heading=0&pitch=0&key=API_KEY
```

**Key Parameters**:
- `location` (required): Lat/lng coordinates or address string
- `size` (required): Image dimensions, format `{width}x{height}` (max 640x640 standard)
- `key` (required): Your API key
- `fov` (optional): Horizontal field of view in degrees, 0-120 (default: 90)
  - Smaller values = more zoom
  - 90° = natural human vision
  - 120° = wide-angle view
- `heading` (optional): Compass direction 0-360 (default: calculated)
  - 0/360 = North, 90 = East, 180 = South, 270 = West
- `pitch` (optional): Vertical angle -90 to 90 (default: 0)
  - 0 = straight ahead
  - Positive = looking up
  - Negative = looking down
- `radius` (optional): Search radius in meters (default: 50)
- `return_error_code` (optional): Return 404 instead of gray placeholder (default: false)
- `source` (optional): Limit to "default" or "outdoor" imagery

**Best Practices for Residential Addresses**:
1. **Always check metadata first** (free, prevents wasted requests)
2. **Use coordinates over addresses** for faster, more accurate results
3. **Set `return_error_code=true`** to avoid gray placeholder images
4. **Set `radius=50-100`** for residential areas (default 50m may miss some houses)
5. **Calculate heading** to face the property (use coordinates + address components)
6. **Use `fov=90-100`** for balanced property view
7. **Keep `pitch=0` or slightly negative** (-10 to 0) to show more ground/landscape

**Rate Limits**:
- 30,000 requests per minute
- Unsigned requests limited (sign requests for production)

**Pricing** (2024-2025):
- $0.007 per panorama (Standard tier: 0-100,000 requests/month)
- $0.0056 per panorama (Volume tier: 100,001+ requests/month)
- $200 monthly credit (until Mar 1, 2025)
- Maximum image size: 640x640 pixels (standard), higher with Premium Plan

### API Component 3: Maps Static API (Satellite View - Fallback)

**Purpose**: Satellite imagery when Street View unavailable (universal coverage)

**Request Format**:
```
GET https://maps.googleapis.com/maps/api/staticmap?center=LAT,LNG&zoom=ZOOM&size=600x400&maptype=satellite&key=API_KEY
```

**Key Parameters**:
- `center` (required): Lat/lng coordinates or address
- `zoom` (required): Zoom level 0-21+ (higher = more detail)
- `size` (required): Image dimensions `{width}x{height}` (max 640x640 standard)
- `maptype` (required): "satellite" or "hybrid" (satellite + road overlay)
- `key` (required): Your API key
- `scale` (optional): 1, 2, or 4 for high-DPI displays

**Zoom Level Recommendations for Residential Property**:
- **17-18**: Individual buildings clearly visible (recommended for most properties)
- **19-20**: Maximum detail in well-covered areas (US, Europe)
- **21**: Street-level detail (available in major cities)
- **15-16**: Neighborhood context (too far for landscape design)

**Quality Considerations**:
- Satellite imagery quality varies by location
- Best coverage: US, Europe, major cities worldwide
- Rural/remote areas may have lower max zoom
- Imagery age varies (updated every 1-3 years)

**Map Types**:
- `satellite`: Pure satellite imagery
- `hybrid`: Satellite + transparent road/label overlay (recommended for context)
- `roadmap`: Vector map (not useful for landscape design)
- `terrain`: Topographic map

**Rate Limits**:
- Same as Maps JavaScript API (varies by plan)
- Default: 28,500 requests per day

**Pricing** (2024-2025):
- $2 per 1,000 requests (Static Maps SKU)
- $200 monthly credit (until Mar 1, 2025)

### Authentication & Security

**API Key Management**:
```bash
# Environment variable (never commit to git)
GOOGLE_MAPS_API_KEY=AIzaSy...
```

**Application Restrictions** (Required for Production):
```
IP addresses (server-side): Restrict to production server IPs
- e.g., 34.123.45.67, 34.123.45.68
```

**API Restrictions** (Principle of Least Privilege):
```
Restrict key to only required APIs:
- Geocoding API
- Street View Static API
- Maps Static API
```

**Security Best Practices**:
1. **Never expose API key in frontend code** (server-side only)
2. **Use separate keys for dev/staging/prod** environments
3. **Set daily quota limits** in Cloud Console (e.g., 10,000 req/day)
4. **Enable billing alerts** (notify at 50%, 90%, 100% of budget)
5. **Monitor usage daily** via Google Cloud Console
6. **Rotate keys quarterly** or after security incidents
7. **Use request signing** for additional security (optional)

**Monitoring Usage**:
```python
# Log every API call for debugging and quota tracking
import structlog
logger = structlog.get_logger()

async def fetch_street_view(lat: float, lng: float):
    logger.info("google_maps_api_call",
                api="street_view_metadata",
                lat=lat,
                lng=lng)
    # ... API call
```

### Error Handling

**Common Error Codes**:

| Error Code | API | Meaning | Retry Strategy |
|------------|-----|---------|----------------|
| `OVER_QUERY_LIMIT` | All | Quota exceeded | Exponential backoff (2s, 4s, 8s), check quota type |
| `OVER_DAILY_LIMIT` | All | Daily quota exhausted | Don't retry, alert admin, graceful degradation |
| `REQUEST_DENIED` | All | API not enabled or invalid key | Don't retry, check API configuration |
| `INVALID_REQUEST` | All | Missing parameters | Don't retry, fix request parameters |
| `ZERO_RESULTS` | Geocoding, Street View | No data for location | Don't retry, try fallback API |
| `UNKNOWN_ERROR` | All | Server error | Retry up to 3 times with exponential backoff |
| `NOT_FOUND` | Street View | Address couldn't be resolved | Use Geocoding API first |
| 429 | All | Rate limit (too many req/sec) | Exponential backoff, reduce request rate |
| 404 | Street View | No imagery (if `return_error_code=true`) | Use satellite fallback |

**Quota Determination** (When `OVER_QUERY_LIMIT` Occurs):
```python
# As per Google documentation:
# 1. Wait 2 seconds, retry same request
# 2. If still OVER_QUERY_LIMIT: Daily limit exceeded
# 3. If success: Per-second rate limit (slow down requests)
```

**Exponential Backoff Implementation**:
```python
import asyncio
from typing import Optional

async def retry_with_backoff(func, max_retries=3, base_delay=2):
    """Retry API call with exponential backoff"""
    for attempt in range(max_retries):
        try:
            return await func()
        except QuotaExceededError as e:
            if attempt == max_retries - 1:
                raise  # Final attempt failed

            delay = base_delay * (2 ** attempt)  # 2s, 4s, 8s
            logger.warning(f"Quota exceeded, retrying in {delay}s",
                         attempt=attempt + 1)
            await asyncio.sleep(delay)

    raise MaxRetriesExceededError("API call failed after retries")
```

**Graceful Degradation**:
```python
async def fetch_property_image(address: str) -> Optional[bytes]:
    """Fetch property image with fallback chain"""
    try:
        # 1. Geocode address
        coords = await geocode_address(address)

        # 2. Try Street View (check metadata first - FREE)
        metadata = await get_street_view_metadata(coords)
        if metadata.status == "OK":
            return await fetch_street_view_image(coords)

        # 3. Fallback to satellite
        logger.info("Street View unavailable, using satellite fallback")
        return await fetch_satellite_image(coords)

    except DailyQuotaExceeded:
        logger.error("Google Maps quota exhausted, degrading gracefully")
        return None  # Display placeholder or user upload prompt

    except Exception as e:
        logger.exception("Failed to fetch property image", error=str(e))
        return None
```

### Python Integration with aiohttp (FastAPI)

**Recommended Libraries**:
1. **aiohttp** (async HTTP client) - Primary choice for FastAPI
2. **googlemaps** (official Google client) - Sync only, not ideal for FastAPI
3. **async_googlemaps** (community async wrapper) - Alternative

**Installation**:
```bash
pip install aiohttp
```

**Complete Implementation Example**:

```python
import aiohttp
import asyncio
from typing import Optional, Tuple
from dataclasses import dataclass
import structlog

logger = structlog.get_logger()

@dataclass
class Coordinates:
    lat: float
    lng: float

@dataclass
class StreetViewMetadata:
    status: str
    pano_id: Optional[str] = None
    date: Optional[str] = None

class GoogleMapsClient:
    def __init__(self, api_key: str):
        self.api_key = api_key
        self.base_url_geocoding = "https://maps.googleapis.com/maps/api/geocode/json"
        self.base_url_streetview = "https://maps.googleapis.com/maps/api/streetview"
        self.base_url_staticmap = "https://maps.googleapis.com/maps/api/staticmap"

    async def geocode_address(self, address: str) -> Optional[Coordinates]:
        """Convert address to coordinates using Geocoding API"""
        params = {
            'address': address,
            'key': self.api_key
        }

        async with aiohttp.ClientSession() as session:
            async with session.get(self.base_url_geocoding, params=params) as response:
                if response.status != 200:
                    logger.error("Geocoding API error", status=response.status)
                    return None

                data = await response.json()

                if data['status'] != 'OK':
                    logger.warning("Geocoding failed", status=data['status'], address=address)
                    return None

                location = data['results'][0]['geometry']['location']
                return Coordinates(lat=location['lat'], lng=location['lng'])

    async def get_street_view_metadata(self, coords: Coordinates) -> StreetViewMetadata:
        """Check if Street View imagery is available (FREE request)"""
        params = {
            'location': f"{coords.lat},{coords.lng}",
            'key': self.api_key,
            'radius': 50  # Search within 50 meters
        }

        async with aiohttp.ClientSession() as session:
            async with session.get(f"{self.base_url_streetview}/metadata", params=params) as response:
                if response.status != 200:
                    logger.error("Street View metadata error", status=response.status)
                    return StreetViewMetadata(status="ERROR")

                data = await response.json()
                logger.info("Street View metadata", status=data['status'], coords=coords)

                return StreetViewMetadata(
                    status=data['status'],
                    pano_id=data.get('pano_id'),
                    date=data.get('date')
                )

    async def fetch_street_view_image(
        self,
        coords: Coordinates,
        size: str = "600x400",
        fov: int = 90,
        heading: int = 0,
        pitch: int = 0
    ) -> Optional[bytes]:
        """Fetch Street View image (PAID request)"""
        params = {
            'location': f"{coords.lat},{coords.lng}",
            'size': size,
            'fov': fov,
            'heading': heading,
            'pitch': pitch,
            'key': self.api_key,
            'return_error_code': 'true'  # Return 404 instead of gray placeholder
        }

        async with aiohttp.ClientSession() as session:
            async with session.get(self.base_url_streetview, params=params) as response:
                if response.status == 404:
                    logger.warning("Street View image not found", coords=coords)
                    return None

                if response.status != 200:
                    logger.error("Street View image error", status=response.status)
                    return None

                image_bytes = await response.read()
                logger.info("Street View image fetched", size=len(image_bytes), coords=coords)
                return image_bytes

    async def fetch_satellite_image(
        self,
        coords: Coordinates,
        zoom: int = 18,
        size: str = "600x400",
        maptype: str = "satellite"
    ) -> Optional[bytes]:
        """Fetch satellite image (PAID request)"""
        params = {
            'center': f"{coords.lat},{coords.lng}",
            'zoom': zoom,
            'size': size,
            'maptype': maptype,
            'key': self.api_key
        }

        async with aiohttp.ClientSession() as session:
            async with session.get(self.base_url_staticmap, params=params) as response:
                if response.status != 200:
                    logger.error("Satellite image error", status=response.status)
                    return None

                image_bytes = await response.read()
                logger.info("Satellite image fetched", size=len(image_bytes), coords=coords)
                return image_bytes

    async def fetch_property_image(self, address: str) -> Optional[bytes]:
        """
        Main method: Fetch property image with automatic fallback chain
        1. Geocode address
        2. Check Street View metadata (free)
        3. Fetch Street View if available
        4. Fallback to satellite if Street View unavailable
        """
        # Step 1: Geocode
        coords = await self.geocode_address(address)
        if not coords:
            logger.error("Failed to geocode address", address=address)
            return None

        # Step 2 & 3: Try Street View
        metadata = await self.get_street_view_metadata(coords)
        if metadata.status == "OK":
            image = await self.fetch_street_view_image(coords)
            if image:
                logger.info("Using Street View image", address=address)
                return image

        # Step 4: Fallback to satellite
        logger.info("Street View unavailable, using satellite", address=address)
        return await self.fetch_satellite_image(coords)


# FastAPI endpoint example
from fastapi import FastAPI, HTTPException
from fastapi.responses import Response

app = FastAPI()
gmaps_client = GoogleMapsClient(api_key=os.getenv("GOOGLE_MAPS_API_KEY"))

@app.get("/api/property-image")
async def get_property_image(address: str):
    """Fetch property image for given address"""
    image_bytes = await gmaps_client.fetch_property_image(address)

    if not image_bytes:
        raise HTTPException(status_code=404, detail="Property image not found")

    return Response(content=image_bytes, media_type="image/jpeg")
```

**Processing Image Bytes for Downstream Use**:
```python
from PIL import Image
import io

async def process_and_save_image(image_bytes: bytes, property_id: str):
    """Process image and save to storage"""
    # Convert bytes to PIL Image
    image = Image.open(io.BytesIO(image_bytes))

    # Optional: Resize, compress, or enhance
    image = image.resize((800, 600), Image.Resampling.LANCZOS)

    # Save to file or upload to cloud storage
    output_buffer = io.BytesIO()
    image.save(output_buffer, format='JPEG', quality=85)

    # Upload to S3/GCS/Azure
    await upload_to_storage(property_id, output_buffer.getvalue())
```

**Parallel Image Fetching** (Multiple Properties):
```python
async def fetch_multiple_properties(addresses: list[str]) -> dict[str, bytes]:
    """Fetch images for multiple properties in parallel"""
    tasks = [
        gmaps_client.fetch_property_image(address)
        for address in addresses
    ]

    results = await asyncio.gather(*tasks, return_exceptions=True)

    return {
        address: result
        for address, result in zip(addresses, results)
        if result and not isinstance(result, Exception)
    }
```

### Production Checklist

**Before Launch**:
- [ ] API keys created and restricted (IP + API restrictions)
- [ ] Environment variables configured (`GOOGLE_MAPS_API_KEY`)
- [ ] Billing account enabled with payment method
- [ ] Daily quota limits set (e.g., 10,000 requests/day)
- [ ] Billing alerts configured (50%, 90%, 100%)
- [ ] Error logging implemented (structlog or similar)
- [ ] Retry logic with exponential backoff tested
- [ ] Graceful degradation tested (quota exhausted scenario)
- [ ] Image caching implemented (avoid re-fetching same address)
- [ ] Metadata pre-check implemented (free, prevents wasted requests)
- [ ] Rate limiting per user (prevent abuse)

**Monitoring**:
```python
# Track API usage metrics
metrics = {
    'geocoding_requests': 0,
    'street_view_metadata_requests': 0,  # Free
    'street_view_image_requests': 0,     # Paid
    'satellite_image_requests': 0,       # Paid
    'errors': 0,
    'fallback_to_satellite': 0
}

# Export to Prometheus/Datadog/CloudWatch
```

**Cost Estimation** (Example: 1,000 property lookups/month):
```
Scenario: User provides address, system fetches image automatically

1. Geocoding: 1,000 requests × $0.005 = $5.00
2. Street View Metadata: 1,000 requests × $0 = $0 (FREE)
3. Street View Images (80% availability): 800 × $0.007 = $5.60
4. Satellite Fallback (20% unavailable): 200 × $0.002 = $0.40

Total: $11.00/month (within $200 free tier)

At scale (10,000 properties/month): ~$110/month
```

### Alternatives Considered

**Alternative 1: Mapbox Static Images API**
- ❌ Lower street-level imagery coverage than Google
- ❌ No Street View equivalent (only satellite/map tiles)
- ✅ Better satellite imagery quality in some regions
- ✅ $0.50 per 1,000 requests (cheaper than Google)

**Alternative 2: Bing Maps Static API**
- ❌ Lower global coverage than Google
- ❌ Inferior Street View (Streetside) availability
- ✅ Similar pricing to Google
- ❌ Less mature Python SDK ecosystem

**Alternative 3: Apple Maps API**
- ❌ No static image API (requires MapKit JS, client-side only)
- ❌ iOS-centric, poor server-side support
- ❌ Limited street-level imagery

**Alternative 4: OpenStreetMap + Custom Imagery**
- ❌ No street-level imagery (only map tiles)
- ❌ Would require separate imagery source
- ✅ Free and open-source
- ❌ Complex setup for satellite imagery

**Decision**: Google Maps Platform is the clear winner for this use case due to:
1. Best global Street View coverage (billions of images)
2. High-quality satellite imagery
3. Mature Python ecosystem (aiohttp integration)
4. Reliable SLA and support
5. Reasonable pricing with $200 monthly credit

### References

1. **Google Maps Platform Documentation**:
   - Geocoding API: https://developers.google.com/maps/documentation/geocoding/overview
   - Street View Static API: https://developers.google.com/maps/documentation/streetview/overview
   - Maps Static API: https://developers.google.com/maps/documentation/maps-static/overview

2. **Pricing & Billing**:
   - Pricing Page: https://mapsplatform.google.com/pricing/
   - Geocoding Pricing: https://developers.google.com/maps/documentation/geocoding/usage-and-billing
   - Street View Pricing: https://developers.google.com/maps/documentation/streetview/usage-and-billing

3. **Best Practices & Security**:
   - API Security: https://developers.google.com/maps/api-security-best-practices
   - API Key Restrictions: https://cloud.google.com/docs/authentication/api-keys-best-practices
   - Error Handling: https://developers.google.com/maps/documentation/streetview/error-messages

4. **Python Integration**:
   - aiohttp Documentation: https://docs.aiohttp.org/
   - async_googlemaps: https://github.com/shane806/async_googlemaps
   - Official Google Maps Python Client: https://github.com/googlemaps/google-maps-services-python

### Test Coverage

**Unit Tests**:
- TC-GMAPS-1.1: Geocoding valid address → returns coordinates
- TC-GMAPS-1.2: Geocoding invalid address → returns None, status=ZERO_RESULTS
- TC-GMAPS-2.1: Street View metadata for covered address → status=OK
- TC-GMAPS-2.2: Street View metadata for uncovered address → status=ZERO_RESULTS
- TC-GMAPS-3.1: Street View image fetch → returns JPEG bytes
- TC-GMAPS-4.1: Satellite image fetch → returns JPEG bytes
- TC-GMAPS-5.1: Full property image fetch (with Street View) → returns Street View image
- TC-GMAPS-5.2: Full property image fetch (without Street View) → falls back to satellite

**Integration Tests**:
- TC-GMAPS-INT-1: Quota exceeded (429) → exponential backoff, retry succeeds
- TC-GMAPS-INT-2: Daily quota exhausted → graceful degradation, returns None
- TC-GMAPS-INT-3: Network timeout → retry with backoff, eventually fails
- TC-GMAPS-INT-4: Invalid API key → REQUEST_DENIED, don't retry

**Load Tests**:
- TC-GMAPS-LOAD-1: 100 parallel address lookups → all complete successfully
- TC-GMAPS-LOAD-2: Rate limit stress test → backoff prevents 429 errors

---

**Document Status**: ✅ Complete | All technical decisions finalized
**Next Phase**: Data Model Design (data-model.md)
