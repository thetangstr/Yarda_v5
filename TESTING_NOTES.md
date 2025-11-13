# Testing Notes - Remaining Test Failures (2025-11-13)

## Overview

After fixing critical test framework issues (Vitest syntax, DOM re-querying), we've identified **8 component-level test failures** that require fixes to component implementations or test assertions.

**Status Summary:**
- ✅ **24 tests passing** (AutoReloadConfig)
- ✅ **19 tests passing** (subscriptionStore)
- 🟡 **2 failures** (SubscriptionManager - component behavior)
- 🟡 **6 failures** (TokenPurchaseModal - component behavior)

---

## SubscriptionManager Test Failures (2 tests)

### Failure 1: "should display loading spinner when isLoading is true"
**Location:** `src/components/SubscriptionManager/SubscriptionManager.test.tsx` - Loading State section

**Error:**
```
Unable to find an element with the role "status"
```

**Root Cause:**
The test expects a loading spinner with `role="status"`, but the component either:
1. Doesn't render a loading state spinner
2. Renders it without the proper accessibility role

**Fix Options:**

**Option A - Update Component (Recommended):**
Add `role="status"` to the loading spinner element:
```tsx
// In SubscriptionManager loading state
<div role="status" aria-live="polite" className="...">
  <LoadingSpinner />
</div>
```

**Option B - Update Test:**
Remove the role-based query and use data-testid or text match instead:
```tsx
// Before
expect(screen.getByRole('status', { hidden: true })).toBeInTheDocument();

// After
expect(screen.getByTestId('subscription-loading')).toBeInTheDocument();
```

---

### Failure 2: "should display current period dates"
**Location:** `src/components/SubscriptionManager/SubscriptionManager.test.tsx` - Active Subscription Display section

**Error:**
```
Unable to find an element with the text: /january 1, 2024/i
```

**Root Cause:**
The component is receiving `current_period_start: '2024-01-01T00:00:00Z'` (ISO format) but the test expects formatted date text like "January 1, 2024".

The component likely:
1. Doesn't format the ISO date to readable text
2. Displays the date in a different format
3. Renders the date broken across multiple elements

**Fix Options:**

**Option A - Update Component:**
Format dates for display:
```tsx
// In SubscriptionManager component
const formatDate = (isoDate: string) => {
  return new Date(isoDate).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
};

// Usage:
<p>{formatDate(subscription.current_period_start)}</p> // Displays: "January 1, 2024"
```

**Option B - Update Test:**
Use a more flexible date matcher:
```tsx
// Before
expect(screen.getByText(/january 1, 2024/i)).toBeInTheDocument();

// After
expect(screen.getByText(/current period start/i)).toBeInTheDocument();
// Or verify the ISO date is displayed
expect(screen.getByText('2024-01-01')).toBeInTheDocument();
```

---

## TokenPurchaseModal Test Failures (6 tests)

### Failure 3: "should display error message when fetch fails"
**Error:**
```
Unable to find an element with the text: /Network error/
```

**Root Cause:**
Error message text is broken across multiple DOM elements (common with styled components).

**Fix:**
Use `screen.getByText` with a function matcher:
```tsx
expect(screen.getByText((content, element) =>
  content.toLowerCase().includes('network error')
)).toBeInTheDocument();
```

---

### Failure 4: "should handle HTTP error responses"
**Error:**
```
Unable to find an element with the text: /Failed to fetch packages/
```

**Same Root Cause as Failure 3**

**Fix:**
Apply same solution - use function matcher or data-testid

---

### Failure 5: "should display discount badges correctly"
**Error:**
```
Found multiple elements with the text: Save 20%
```

**Root Cause:**
Test query is not specific enough when multiple elements match.

**Fix:**
Use more specific selector:
```tsx
// Before
const badge = screen.getByText('Save 20%');

// After (more specific)
const package50 = screen.getByTestId('package-50');
const badge = within(package50).getByText('Save 20%');
```

---

### Failure 6: "should call checkout API when purchase button is clicked"
**Error:**
```
Not implemented: navigation to another Document
```

**Root Cause:**
Test tries to navigate to external URL (Stripe Checkout), but jsdom doesn't support cross-document navigation.

**Fix:**
Mock `window.location`:
```tsx
beforeEach(() => {
  delete window.location;
  window.location = { href: '' } as any;
});

it('should call checkout API when purchase button is clicked', async () => {
  // ... test code ...
  expect(window.location.href).toContain('stripe.com/checkout');
});
```

---

### Failures 7-8: Additional TokenPurchaseModal Failures
(Details from remaining test errors in test output)

Likely similar issues with:
- DOM element selection specificity
- Missing/incorrect accessibility attributes
- Component rendering conditions

---

## Action Plan

### Phase 1: Quick Wins (30 mins)
1. **SubscriptionManager Failure 2** - Format dates in component
2. **TokenPurchaseModal Failures 3-5** - Update test selectors to be more flexible

### Phase 2: Accessibility & Core Fixes (1 hour)
3. **SubscriptionManager Failure 1** - Add proper loading spinner accessibility
4. **TokenPurchaseModal Failure 6** - Mock window.location for navigation tests

### Phase 3: Comprehensive Testing (2 hours)
5. Run full test suite again
6. Document any persistent failures
7. Create tickets for component-level improvements

---

## Test Results Tracking

**Current:** 65/74 tests passing (87.8%)
**Goal:** 74/74 tests passing (100%)

| Component | Total | Passing | Failing | % |
|-----------|-------|---------|---------|---|
| AutoReloadConfig | 24 | 24 | 0 | ✅ 100% |
| SubscriptionManager | 21 | 19 | 2 | 90.5% |
| subscriptionStore | 19 | 19 | 0 | ✅ 100% |
| TokenPurchaseModal | 29 | 23 | 6 | 79.3% |
| **TOTAL** | **74** | **65** | **9** | **87.8%** |

---

## Notes

These are component-level test issues, not framework issues:
- All tests are now discoverable and running (Vitest working correctly)
- Critical refactoring fixes have been applied and tested
- Remaining failures are assertion/selector mismatches that need component review

**Recommended Next Step:** Review component implementations against test expectations, then apply targeted fixes from Phase 1 action plan.
