# ADR 002: Single-Page Generation Flow

**Status:** Accepted
**Date:** 2025-11-07
**Author:** Frontend Team
**Deciders:** Engineering Team, Product Team

---

## Context

Users need to generate AI landscape designs and track progress in real-time. Multiple UX patterns exist for handling async operations:

1. **Multi-page flow:** Separate pages for form, progress, and results
2. **Single-page flow:** All states on one page without navigation
3. **Modal-based:** Form in modal, progress/results inline
4. **Split-screen:** Form and results side-by-side

### Requirements

- User can submit generation request
- User sees real-time progress updates
- User views results when complete
- User can create new generation without page reload
- Handle network errors and timeouts gracefully
- Recover from page refresh during generation

---

## Decision

We will implement a **single-page flow** where form, progress, and results all render on `/generate` page without navigation.

**Implementation:**
```typescript
// frontend/src/pages/generate.tsx
const [state, setState] = useState<'form' | 'progress' | 'results'>('form');
const [generationId, setGenerationId] = useState<string | null>(null);

// Submit handler
const handleSubmit = async (formData) => {
  const { id } = await generationsAPI.create(formData);
  setGenerationId(id);
  setState('progress');

  // Start polling
  const result = await pollGenerationStatus(id);
  setState('results');
};

// Render based on state
return (
  <div>
    {state === 'form' && <GenerationForm onSubmit={handleSubmit} />}
    {state === 'progress' && <GenerationProgressInline id={generationId} />}
    {state === 'results' && <GenerationResultsInline id={generationId} />}
  </div>
);
```

---

## Consequences

### Positive

1. **Seamless UX:** No jarring page transitions during generation
2. **State preservation:** Form data remains available if user wants to edit
3. **Simple mental model:** Everything happens on one page
4. **Easy recovery:** Can resume polling after page refresh via localStorage
5. **Performance:** No page reload overhead

### Negative

1. **Component complexity:** Single component handles multiple states
2. **State management:** Need to manage form, polling, and results state
3. **Memory:** All components loaded (but only one visible at a time)

### Neutral

1. **Testing:** E2E tests need to verify state transitions
2. **Analytics:** Track state changes as events (not page views)

---

## Alternatives Considered

### Alternative 1: Multi-Page Flow

**Approach:**
```
/generate (form) → /generate/progress/:id → /generate/results/:id
```

**Rejected because:**
- Page transitions feel clunky
- Loses form state when navigating
- More complex URL management
- Harder to recover from refresh (need to parse URL)

### Alternative 2: Modal-Based

**Approach:**
Form in modal overlay, progress/results inline below.

**Rejected because:**
- Modals can be confusing for primary workflow
- Accessibility concerns
- Mobile UX issues

### Alternative 3: Split-Screen

**Approach:**
Form on left, progress/results on right (desktop only).

**Rejected because:**
- Poor mobile experience
- Wastes screen space
- User focus split between two areas

---

## Implementation Details

### State Management

**Zustand Store (Selective Persistence):**
```typescript
interface GenerationStore {
  // Persisted (saved to localStorage)
  formData: {
    address: string;
    areas: string[];
    prompt: string;
  };

  // Transient (NOT persisted)
  currentGenerationId: string | null;
  isPolling: boolean;
}
```

**Why Selective Persistence:**
- Form data persisted → User can refresh and continue typing
- Polling state NOT persisted → Prevents stale polling on reload

### LocalStorage Recovery

**Save request ID on submit:**
```typescript
const handleSubmit = async () => {
  const { id } = await generationsAPI.create(formData);
  localStorage.setItem('current_generation_request', id);
  startPolling(id);
};
```

**Recover on mount:**
```typescript
useEffect(() => {
  const savedRequestId = localStorage.getItem('current_generation_request');
  if (savedRequestId) {
    resumePolling(savedRequestId);
  }
}, []);
```

**Clear on completion:**
```typescript
const handleComplete = () => {
  localStorage.removeItem('current_generation_request');
  setState('results');
};
```

### Polling Strategy

**Interval:** 2 seconds
**Timeout:** 5 minutes (150 attempts)

```typescript
export async function pollGenerationStatus(id: string, maxAttempts = 150) {
  for (let i = 0; i < maxAttempts; i++) {
    const generation = await generationsAPI.getById(id);

    if (isGenerationComplete(generation.status)) {
      return generation;
    }

    await new Promise(resolve => setTimeout(resolve, 2000));
  }

  throw new Error('Generation timed out');
}
```

---

## Components

### GenerationProgressInline

**Features:**
- Per-area progress cards
- Status: pending, processing, completed, failed
- Animated loading states
- Estimated time remaining

**Implementation:**
```typescript
export function GenerationProgressInline({ generationId }: Props) {
  const { generation, isLoading } = useGenerationPolling(generationId);

  return (
    <div>
      {generation.areas.map(area => (
        <ProgressCard
          key={area}
          area={area}
          status={generation.status[area]}
        />
      ))}
    </div>
  );
}
```

### GenerationResultsInline

**Features:**
- Image gallery with before/after
- Download buttons
- Modal viewer for fullscreen
- "Create New Design" CTA

---

## Related Decisions

- [ADR 001: Connection Pool](001-connection-pool-pattern.md) - Backend handles async generation
- [ADR 003: Atomic Operations](003-atomic-operations-with-locking.md) - Credit deduction before generation

---

## Testing Strategy

### E2E Tests (Playwright)

**Test Cases:**
1. Submit form → See progress → See results
2. Refresh during progress → Resume polling
3. Network error → Show error message with retry
4. Timeout → Show timeout message
5. Create new generation from results

**Example:**
```typescript
test('generates design successfully', async ({ page }) => {
  await page.goto('/generate');

  // Fill form
  await page.fill('input[name="address"]', '123 Main St');
  await page.click('button:has-text("Generate")');

  // Verify progress
  await expect(page.locator('.generation-progress')).toBeVisible();

  // Wait for results
  await expect(page.locator('.generation-results')).toBeVisible({ timeout: 120000 });
});
```

---

## Future Enhancements

1. **WebSocket updates:** Replace polling with real-time updates
2. **Optimistic UI:** Show "processing" state immediately on submit
3. **Queue position:** Show user's position in generation queue
4. **Cancel button:** Allow user to cancel in-progress generation

---

## Files

- `frontend/src/pages/generate.tsx` - Main page
- `frontend/src/components/GenerationProgressInline.tsx` - Progress UI
- `frontend/src/components/GenerationResultsInline.tsx` - Results gallery
- `frontend/src/lib/api.ts` - Polling utilities
- `frontend/src/store/generationStore.ts` - State management

---

## References

- [React useState patterns](https://react.dev/reference/react/useState)
- [Zustand persist middleware](https://docs.pmnd.rs/zustand/integrations/persisting-store-data)
- [Polling vs WebSockets](https://ably.com/topic/polling-vs-websockets)
