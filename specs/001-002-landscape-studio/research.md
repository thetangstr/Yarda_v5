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

**Document Status**: ✅ Complete | All technical decisions finalized
**Next Phase**: Data Model Design (data-model.md)
