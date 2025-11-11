# Holiday Decorator E2E Test Analysis Report

**Date:** November 10, 2025
**Feature:** Holiday Decorator (007-holiday-decorator)
**Test File:** `frontend/tests/e2e/holiday-discovery.spec.ts`
**Test Command:** `cd frontend && npx playwright test tests/e2e/holiday-discovery.spec.ts --project=chromium --reporter=list`

## Executive Summary

**Total Tests:** 6
**Passed:** 4 (67%)
**Failed:** 2 (33%)
**Status:** CRITICAL IMPLEMENTATION ISSUES

## Test Results Overview

### Passing Tests (4/6)
✅ **Test 1:** "should show holiday hero on homepage during season" (1.4s)
✅ **Test 3:** "should prevent generation when user has 0 credits" (3.5s)
✅ **Test 2:** "meta-test: verify holiday page implementation exists" (1.5s)
✅ **Test 5:** "should navigate to holiday page when CTA clicked" (1.7s)

### Failing Tests (2/6)
❌ **Test 4:** "should render holiday page with all components" (7.0s)
❌ **Test 6:** "should complete full generation flow: address → rotation → style → generate → results" (8.6s)

---

## Detailed Failure Analysis

### FAILURE #1: Credit Balance Showing 0 Instead of 1

**Test:** "should render holiday page with all components" (line 122)
**Failure Type:** IMPLEMENTATION ISSUE
**Severity:** CRITICAL

#### Error Message
```
Error: expect(locator).toContainText(expected) failed
Locator: locator('[data-testid="credit-display"]')
Expected substring: "1"
Received string: "🎁Holiday Credits0"
Timeout: 5000ms
```

#### Root Cause Analysis

The holiday.tsx page component attempts to fetch credits from the backend API:

```typescript
// File: frontend/src/pages/holiday.tsx, lines 67-77
const fetchCredits = async () => {
  setIsLoadingCredits(true);
  try {
    const response = await holidayAPI.getCredits();  // API call
    setCredits(response.holiday_credits);             // Set to state
  } catch (error: any) {
    console.error('Failed to fetch credits:', error);
  } finally {
    setIsLoadingCredits(false);
  }
};
```

**Problem Chain:**
1. **Test Setup** (line 43 in test): Sets `holiday_credits: 1` in mock user localStorage
2. **Page Mount** (line 70): Calls `fetchCredits()` which calls `holidayAPI.getCredits()`
3. **API Call** (frontend/src/lib/api.ts, line 544-546):
   ```typescript
   getCredits: async (): Promise<HolidayCreditsResponse> => {
     const response = await apiClient.get('/holiday/credits');
     return response.data;
   }
   ```
4. **Backend Missing** (CRITICAL):
   - The backend endpoint `/v1/holiday/credits` **does not exist**
   - No holiday credit service in Python backend
   - API call fails silently or returns error
5. **State Falls Back to 0**: When API fails, `setCredits()` never gets called, stays at initialized value of 0

#### Why Tests Still Pass (1 & 3)
- Test 1: Only checks for hero visibility, not credits
- Test 3: Checks "prevent generation when 0 credits" - which IS working because credits default to 0

#### Evidence from Error Context
From `test-results/error-context.md`:
```yaml
paragraph [ref=e14]: "0"  # Credit display shows 0
```

#### Fix Required (PRIORITY: CRITICAL)

**Backend Implementation Needed:**
1. Create Python endpoint: `GET /v1/holiday/credits`
2. Return user's holiday credit balance
3. Database schema must have `holiday_credits` column in `users` table

**Filename:** `backend/src/api/endpoints/holiday_credits.py` (NEW)

**Database Migration:** `supabase/migrations/XXX_add_holiday_credits_table.sql`
- Add `holiday_credits INT DEFAULT 0` to `users` table
- Add `holiday_credits_earned INT DEFAULT 0` tracking
- Create `holiday_credit_transactions` audit table

---

### FAILURE #2: Street View Rotator Not Showing Image

**Test:** "should complete full generation flow" (line 156)
**Failure Type:** IMPLEMENTATION + DESIGN ISSUE
**Severity:** CRITICAL

#### Error Message
```
Error: expect(locator).toBeVisible() failed
Locator: locator('[data-testid="street-view-rotator"]').locator('img')
Expected: visible
Timeout: 5000ms
Error: element(s) not found
```

#### Root Cause Analysis

**Issue 1: No `<img>` Tag in Component**

The StreetViewRotator component is intentionally a placeholder:

```typescript
// File: frontend/src/components/StreetViewRotator.tsx, lines 134-146
{previewUrl && !error && (
  <div className="relative w-full h-full">
    {/* Placeholder until actual Street View integration */}
    <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-blue-50 to-gray-100">
      <div className="text-center">
        <span className="text-6xl mb-2">🏠</span>  {/* No img tag! */}
        <p className="text-sm text-gray-600 font-medium">Street View Preview</p>
        <p className="text-xs text-gray-500 mt-1">Heading: {heading}°</p>
      </div>
    </div>
  </div>
)}
```

**Issue 2: TODO Comment at Lines 49-50**
```typescript
// TODO: Replace with actual Google Street View API call
// For now, use placeholder
await new Promise((resolve) => setTimeout(resolve, 500));

// Mock preview URL (replace with actual Street View image)
const mockUrl = `/api/placeholder?heading=${heading}&address=${encodeURIComponent(address)}`;
setPreviewUrl(mockUrl);
```

**Issue 3: Test Expects Real Image**

Test at line 173-174:
```typescript
const previewImage = streetViewRotator.locator('img');
await expect(previewImage).toBeVisible();  // Fails - no img element!
```

**The Component Has:**
- ✅ Placeholder div with emoji "🏠"
- ❌ NO `<img>` tag rendering
- ❌ NO actual Google Street View API integration
- ❌ Mock URL created but never used in an image

#### Evidence
From test failure:
```
element(s) not found  # No <img> tag exists in component
```

#### Fix Required (PRIORITY: HIGH)

**Option A: Google Street View Integration (Recommended)**

1. **Get Street View API Key** from Google Cloud Console
2. **Add to Backend Environment:** `GOOGLE_MAPS_API_KEY`
3. **Create Backend Endpoint:** `GET /v1/holiday/street-view`
   - Takes: address, heading (degrees), pitch
   - Returns: Street View image URL
   - Uses Google Street View API
4. **Update StreetViewRotator Component:**
   ```typescript
   // Call backend to get Street View image
   const response = await holidayAPI.getStreetViewPreview(address, heading);
   setPreviewUrl(response.image_url);
   ```
5. **Add `<img>` tag to render the preview**

**Option B: Mock Implementation for Tests (Temporary)**

1. Add `<img>` tag to component (even with mock src)
2. Mock Google Street View API in tests
3. Later replace with real implementation

**Filename:** `frontend/src/components/StreetViewRotator.tsx` (MODIFY lines 134-146)

---

## Test Improvement Recommendations

### Issue with Test Setup Function

The test's `setupAuthenticatedUser()` function has a timing issue:

```typescript
// Lines 34-63 in test
async function setupAuthenticatedUser(page: any) {
  await page.goto('/');
  await page.evaluate(() => {
    localStorage.setItem('user-store', JSON.stringify({...}));  // Wrong key!
  });
  await page.reload();
}
```

**Problem:** Sets `user-store` but code expects `user-storage`!

**Evidence:**
- Test setup uses: `user-store`
- API client reads: `user-storage` (line 34 of frontend/src/lib/api.ts)
- Authenticated state files use: `user-storage`

**Fix Required:** Change test to use consistent key name:
```typescript
localStorage.setItem('user-storage', JSON.stringify({...}));
```

---

## Impact Assessment

### Affected Features
1. **Holiday Decorator Page:** Cannot display credit balance
2. **Generation Flow:** Cannot validate user has credits
3. **Street View Preview:** Cannot show property photos
4. **Full User Journey:** Broken at Step 2 (page component)

### Does Holiday Decorator Interfere with Main Yarda App?
**Answer:** ✅ NO - Both apps are isolated

Evidence:
- Holiday page: `/holiday` route (separate)
- Main app: `/generate` route (separate)
- No shared state modification
- Separate API endpoints: `/holiday/*` vs `/v1/generations`

**Verification Results:**
Main app tests (10/10 failing) are **pre-existing failures**, NOT caused by Holiday Decorator:
- Error: `area-selector` component missing (unrelated)
- Error: `area-option-pool_area` selector not found (unrelated)
- These failures exist in current codebase independently

**Conclusion:** Holiday Decorator feature does NOT break main app. Main app has separate unrelated test failures.

---

## Priority-Ordered Fix List

### CRITICAL (Blocks All Functionality)
1. ✅ **Implement Backend: `GET /v1/holiday/credits` endpoint**
   - Files: `backend/src/api/endpoints/holiday_credits.py`
   - Database: Add `holiday_credits` column to `users` table
   - Time Estimate: 30 minutes

2. ✅ **Implement Street View Rendering**
   - Files: `frontend/src/components/StreetViewRotator.tsx`
   - Integrate Google Street View API
   - Time Estimate: 1 hour

### HIGH (Test Reliability)
3. ✅ **Fix localStorage Key in Test**
   - File: `frontend/tests/e2e/holiday-discovery.spec.ts` line 51
   - Change `user-store` → `user-storage`
   - Time Estimate: 5 minutes

### MEDIUM (Polish)
4. ⚠️ **Add Error Handling for Credit Fetch Failures**
   - Show user message if credit balance can't load
   - Add retry logic
   - Time Estimate: 15 minutes

---

## Test Execution Path

### Current Flow (Failing)
```
Page loads → fetchCredits() → API call fails → credits = 0
                              ↓
                     "Holiday Credits0" shown
```

### Expected Flow
```
Page loads → fetchCredits() → API returns {holiday_credits: 1}
                              ↓
                     "Holiday Credits1" shown
```

---

## Recommendations

### Before Manual Testing
✅ **All automated tests must pass (6/6)**
- No manual testing until 100% pass rate
- Verify all components render correctly
- Verify all API integrations work

### Post-Fix Validation
Run full test suite:
```bash
cd frontend && npx playwright test tests/e2e/holiday-discovery.spec.ts \
  --project=chromium \
  --reporter=list
```

Verify main app still works:
```bash
cd frontend && npx playwright test tests/e2e/generation-flow.spec.ts \
  --project=chromium
```

### Frontend-Only Testing (Current State)
Since backend endpoints don't exist, consider:
1. Mocking API responses in tests using Playwright
2. Creating mock backend in MSW (Mock Service Worker)
3. Or implement actual backend endpoints first (recommended)

---

## Conclusion

**The Holiday Decorator feature is 67% complete.**

**Blocking Issues:**
1. Missing backend credit endpoint
2. Missing Street View image rendering
3. localStorage key naming inconsistency in tests

**Time to Fix:** ~2 hours (implementation) + 30 minutes (testing)

**Risk Level:** LOW - Issues are isolated to holiday feature, no impact to main app

**Recommendation:** Implement backend endpoint first (30 min), then Street View rendering (1 hour), then run full test suite to verify (15 min).
