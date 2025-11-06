# Phase 0: Research & Technical Decisions

**Feature**: Generation Flow Interface
**Date**: 2025-11-06
**Status**: Complete

## Research Questions

### 1. Real-time Progress Tracking Architecture

**Question**: How should we implement real-time progress updates for generation without overwhelming the backend?

**Decision**: Polling-based approach with exponential backoff

**Rationale**:
- WebSocket overhead unnecessary for ~60 second operations
- Polling every 2 seconds provides smooth UX (30 updates max)
- Server-Sent Events (SSE) considered but adds deployment complexity
- localStorage persistence enables recovery on page refresh
- Request ID as correlation key prevents orphaned requests

**Implementation Pattern**:
```typescript
const pollGenerationStatus = async (requestId: string) => {
  const interval = setInterval(async () => {
    const status = await api.get(`/generations/${requestId}`);

    if (status.status === 'completed' || status.status === 'failed') {
      clearInterval(interval);
      updateUI(status);
    }
  }, 2000); // 2 second polling
};
```

**Alternatives Considered**:
- **WebSockets**: Rejected - adds infrastructure complexity for short-lived operations
- **Server-Sent Events**: Rejected - deployment challenges on Railway/Vercel serverless
- **Long Polling**: Rejected - timeout issues with 5-minute generation limit

---

### 2. Atomic Payment Deduction Strategy

**Question**: How do we prevent race conditions when multiple generation requests arrive simultaneously?

**Decision**: PostgreSQL row-level locking with `FOR UPDATE NOWAIT`

**Rationale**:
- Database-level locking prevents race conditions at source
- NOWAIT fails fast instead of queueing (better UX for concurrent clicks)
- Existing pattern in trial_service.py and token_service.py
- Zero risk of negative balances (CHECK constraints + atomic operations)
- Transaction rollback on generation failure enables automatic refunds

**Implementation Pattern** (Already exists in backend):
```python
async with db_pool.transaction() as conn:
    user = await conn.fetchrow("""
        SELECT trial_remaining FROM users
        WHERE id = $1 FOR UPDATE NOWAIT
    """, user_id)

    if user['trial_remaining'] <= 0:
        raise InsufficientCredits()

    await conn.execute("""
        UPDATE users SET trial_remaining = trial_remaining - 1
        WHERE id = $1
    """, user_id)
```

**Alternatives Considered**:
- **Application-level locking (Redis)**: Rejected - adds dependency, less reliable than DB
- **Optimistic locking (version field)**: Rejected - worse UX (retry loop for user)
- **Queue system (Celery)**: Rejected - overkill for simple deduction operation

---

### 3. Multi-Area Parallel Generation Architecture

**Question**: How should we process multiple area selections to meet <90 second target?

**Decision**: Background worker with async parallel processing

**Rationale**:
- Sequential processing would take 3×60 = 180 seconds (fails SC-003)
- Python asyncio enables I/O-bound parallelism (Gemini API calls)
- FastAPI BackgroundTasks sufficient for MVP (no external queue needed)
- Single transaction for upfront payment, separate tasks for generation
- Partial failure handling: refund failed areas, keep successful ones

**Implementation Pattern**:
```python
@router.post("/generations/")
async def create_multi_area_generation(
    background_tasks: BackgroundTasks,
    areas: List[str],
    # ... other params
):
    # 1. Deduct payment atomically (all areas upfront)
    total_cost = len(areas)
    await token_service.deduct_tokens_atomic(user_id, total_cost)

    # 2. Create request record
    request_id = await create_generation_request(user_id, areas)

    # 3. Start parallel background tasks
    background_tasks.add_task(
        process_areas_parallel,
        request_id=request_id,
        areas=areas
    )

    return {"request_id": request_id, "status": "pending"}

async def process_areas_parallel(request_id, areas):
    tasks = [process_single_area(request_id, area) for area in areas]
    results = await asyncio.gather(*tasks, return_exceptions=True)

    # Refund failed areas
    failed_count = sum(1 for r in results if isinstance(r, Exception))
    if failed_count > 0:
        await token_service.add_tokens(user_id, failed_count)
```

**Alternatives Considered**:
- **Celery + Redis**: Rejected - infrastructure overhead for MVP, adds 2 dependencies
- **Sequential processing**: Rejected - violates SC-003 performance requirement
- **Separate API calls per area**: Rejected - no atomic payment, complex client logic

---

### 4. Progress Persistence Across Page Refresh

**Question**: How do we recover generation progress if user refreshes page?

**Decision**: localStorage + backend status polling

**Rationale**:
- Generation continues in background (backend worker)
- Request ID stored in localStorage as correlation key
- On page load: check localStorage → resume polling if found
- Backend status endpoint returns current progress
- Auto-clear localStorage after completion

**Implementation Pattern**:
```typescript
// Store on generation start
localStorage.setItem('activeGeneration', JSON.stringify({
  requestId: response.request_id,
  timestamp: Date.now(),
  areas: selectedAreas
}));

// Restore on page load
useEffect(() => {
  const saved = localStorage.getItem('activeGeneration');
  if (saved) {
    const { requestId, timestamp } = JSON.parse(saved);

    // Only restore if < 10 minutes old (prevent stale state)
    if (Date.now() - timestamp < 600000) {
      resumeGenerationPolling(requestId);
    } else {
      localStorage.removeItem('activeGeneration');
    }
  }
}, []);

// Clear on completion
const handleGenerationComplete = (result) => {
  localStorage.removeItem('activeGeneration');
  displayResults(result);
};
```

**Alternatives Considered**:
- **Server-side session storage**: Rejected - requires Redis, complicates serverless deployment
- **URL query parameters**: Rejected - exposes request IDs, poor UX (shareable links)
- **Database polling without localStorage**: Rejected - no recovery after page refresh

---

### 5. Payment Method Hierarchy Display

**Question**: How should we communicate which payment method will be used?

**Decision**: Inline indicator in generate button + explicit balance display

**Rationale**:
- Transparency builds trust (reduces support tickets per SC-009)
- Payment hierarchy already implemented in backend (FR-007)
- Frontend mirrors backend logic for immediate feedback
- Visual differentiation: trial (green), token (blue), subscription (purple)
- Clear CTA when insufficient funds

**Implementation Pattern**:
```typescript
const getPaymentIndicator = (user) => {
  if (user.subscription_status === 'active') {
    return { method: 'subscription', label: 'Unlimited', color: 'purple' };
  }
  if (user.trial_remaining > 0) {
    return { method: 'trial', label: 'Trial Credit', color: 'green' };
  }
  if (user.token_balance > 0) {
    return { method: 'token', label: '1 Token', color: 'blue' };
  }
  return { method: 'none', label: 'Purchase Required', color: 'gray' };
};

// In UI
<button className={`bg-${indicator.color}-500`}>
  Generate Design ({indicator.label})
</button>

<div className="text-sm">
  {user.trial_remaining > 0 && `${user.trial_remaining} trial credits`}
  {user.token_balance > 0 && `${user.token_balance} tokens`}
</div>
```

**Alternatives Considered**:
- **Modal confirmation before generation**: Rejected - adds friction, slows UX
- **No explicit display**: Rejected - users confused about charges, increases support tickets
- **Pre-calculation API call**: Rejected - adds latency, backend already does this

---

### 6. Google Places Autocomplete Integration

**Question**: How should we implement address autocomplete without excessive API costs?

**Decision**: Debounced search with 300ms delay + session tokens

**Rationale**:
- Google Places autocomplete billed per session, not per keystroke
- 300ms debounce reduces API calls by ~80% (standard typing speed)
- Session tokens ($0.017 per session) cheaper than per-request pricing
- Predictions cached for session reduces redundant calls
- Fallback to manual entry if API unavailable

**Implementation Pattern**:
```typescript
const [searchValue, setSearchValue] = useState('');
const debouncedSearch = useDebounce(searchValue, 300);

useEffect(() => {
  if (debouncedSearch.length > 3) {
    fetchAddressSuggestions(debouncedSearch, sessionToken);
  }
}, [debouncedSearch]);

const fetchAddressSuggestions = async (query, sessionToken) => {
  const response = await fetch(
    `https://maps.googleapis.com/maps/api/place/autocomplete/json?` +
    `input=${query}&types=address&sessiontoken=${sessionToken}&key=${API_KEY}`
  );
  // Cache results for session
  setSuggestions(response.predictions);
};
```

**Alternatives Considered**:
- **No debounce**: Rejected - excessive API costs ($0.017 per session × typing)
- **Client-side geocoding library**: Rejected - less accurate, no autocomplete
- **Manual address only**: Rejected - poor UX, higher error rate

---

## Technology Stack Decisions

### Frontend State Management: Zustand

**Decision**: Zustand for generation flow state

**Rationale**:
- Already used in project (`useUserStore` for auth)
- Lightweight (1.3KB) vs Redux (10KB+)
- Built-in localStorage persistence
- TypeScript-first design
- No boilerplate, simple API

**Usage**:
```typescript
// frontend/src/store/generationStore.ts
export const useGenerationStore = create<GenerationStore>()(
  persist(
    (set) => ({
      activeRequest: null,
      selectedAreas: [],
      setActiveRequest: (requestId) => set({ activeRequest: requestId }),
      clearActiveRequest: () => set({ activeRequest: null }),
    }),
    { name: 'generation-state' }
  )
);
```

---

### Backend Background Processing: FastAPI BackgroundTasks

**Decision**: FastAPI BackgroundTasks for MVP

**Rationale**:
- Built into FastAPI, zero additional dependencies
- Sufficient for < 1000 concurrent users
- Simple upgrade path to Celery if needed
- No infrastructure setup (Redis, RabbitMQ)
- Works with Railway serverless deployment

**Upgrade Path** (if needed):
- Replace BackgroundTasks with Celery
- Add Redis for task queue
- Update deployment to include worker process
- No code changes in frontend (same API contract)

---

### Testing Strategy: Playwright E2E

**Decision**: Playwright for all generation flow tests

**Rationale**:
- Already used in project (constitution requirement)
- Supports multi-step flows (registration → generation → results)
- Built-in retry logic for flaky assertions
- Screenshot capture for debugging
- Browser automation with real user interactions

**Test Coverage**:
1. **P1 - Trial Flow**: `generation-trial-flow.spec.ts`
2. **P2 - Multi-Area**: `generation-multi-area.spec.ts`
3. **P3 - Payment Display**: `generation-payment-display.spec.ts`

---

## Best Practices

### Error Handling

**Pattern**: Graceful degradation with user-friendly messages

```typescript
try {
  await api.post('/generations/', formData);
} catch (error) {
  if (error.response?.status === 403) {
    // Insufficient payment
    showModal('Purchase tokens or upgrade to continue');
  } else if (error.response?.status === 400) {
    // Validation error (invalid address, etc.)
    showError(error.response.data.detail);
  } else {
    // System error - refund automatic
    showError('Generation failed. Your credit has been refunded. Please try again.');
  }
}
```

**Automatic Refund**: Backend refunds on ANY failure (network, timeout, API error)

---

### Performance Optimization

**Patterns**:
1. **Code Splitting**: Lazy load generation components
   ```typescript
   const GenerationForm = lazy(() => import('./components/generation/GenerationForm'));
   ```

2. **Image Optimization**: Next.js Image component for generated results
   ```typescript
   <Image src={generationUrl} width={600} height={400} loading="lazy" />
   ```

3. **Memoization**: Prevent unnecessary re-renders
   ```typescript
   const memoizedAreaSelector = useMemo(
     () => <AreaSelector areas={areas} />,
     [areas]
   );
   ```

---

## Security Considerations

### Payment Authorization

**Pattern**: Backend validation (never trust frontend)

```python
# Frontend can suggest payment method, but backend decides
payment_method = await check_authorization_hierarchy(user)

# Atomic deduction prevents race conditions
if payment_method == 'trial':
    await trial_service.deduct_trial_atomic(user.id)
elif payment_method == 'token':
    await token_service.deduct_tokens_atomic(user.id, 1)
# Subscription: no deduction needed
```

**Security Gates**:
1. Authentication required (JWT validation)
2. Authorization hierarchy enforced
3. Atomic operations prevent race conditions
4. Input validation (address length, area enum, style enum)
5. Rate limiting (max 5 concurrent generations per user)

---

## Deployment Considerations

### Environment Variables

**Frontend** (.env.local):
```bash
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=<key>  # For autocomplete
NEXT_PUBLIC_API_URL=https://yarda-api-production.up.railway.app
```

**Backend** (Railway):
```bash
GOOGLE_MAPS_API_KEY=<key>     # For Street View + geocoding
GEMINI_API_KEY=<key>          # For AI generation (existing)
DATABASE_URL=<postgres-url>   # Supabase (existing)
```

### Cost Monitoring

**Google Maps API costs per generation**:
- Autocomplete session: $0.017 (one-time per form fill)
- Geocoding: FREE (within quota)
- Street View metadata: FREE
- Street View image: $0.007 per image

**Total cost per single-area generation**: ~$0.024 ($0.017 + $0.007)
**Total cost per 3-area generation**: ~$0.038 ($0.017 + 3×$0.007)

---

## Conclusion

All technical decisions made with existing codebase patterns, constitution compliance, and performance requirements (SC-001 through SC-010). No new dependencies beyond what's already in the stack. Implementation can proceed to Phase 1 (Design) with zero unresolved technical questions.

**Next Phase**: Generate data-model.md, API contracts, and quickstart guide.
