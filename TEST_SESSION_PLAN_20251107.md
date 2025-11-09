# E2E Test Session Plan - 2025-11-07

**Session ID:** TEST-20251107-FEATURE-005
**Command:** `/test-and-fix`
**Scope:** Feature 005 - Port V2 Generation Flow + Feature 004 Validation
**Environment:** Local (Backend: localhost:8000, Frontend: localhost:3000)
**Test Framework:** Playwright (Chromium)
**Duration Estimate:** 60-90 minutes

---

## 📋 Test Execution Order

### Priority 1: Feature 005 - Single-Page Generation Flow (NEW)
**Test File:** `tests/e2e/generation-flow-v2.spec.ts`
**Status:** Login function fixed, ready to execute
**Scenarios:** 6 tests

| Test ID | Test Name | Description | Status |
|---------|-----------|-------------|--------|
| T008 | Complete generation flow without page navigation | Verify form → progress → results on single page | 🔄 READY |
| T009 | Poll for progress updates every 2 seconds | Verify 2-second polling interval | 🔄 READY |
| T010 | Display results inline when generation completes | Verify results show without navigation | 🔄 READY |
| T018 | Reset form without page reload | Verify "Start New" clears form inline | 🔄 READY |
| T019 | Handle network interruptions gracefully | Verify polling recovery after network error | 🔄 READY |
| T020 | Timeout after 5 minutes of polling | Verify 5-minute timeout enforcement | 🔄 READY |

**Critical Fix Applied:**
- ✅ Login function updated to use `/auth` directly (no longer clicks non-existent button on `/start`)
- ✅ Matches fix from generation-flow.spec.ts

**Dependencies:**
- Backend running on localhost:8000
- Frontend running on localhost:3000
- Test user credentials: `test.uat.bypass@yarda.app`
- Trial credits available (at least 1)

---

### Priority 2: Feature 004 - Generation Flow Validation (REGRESSION)
**Test File:** `tests/e2e/generation-flow.spec.ts`
**Status:** Previously passed (11/11), re-run for regression
**Scenarios:** 11 tests (skip blocked/pending tests)

| Test ID | Test Name | Last Status | Re-Run? |
|---------|-----------|-------------|---------|
| TC-GEN-1 | Generation Form Access | ✅ PASSED | ✅ Yes |
| TC-GEN-3 | Area Selection (Single Mode) | ✅ PASSED | ✅ Yes |
| TC-GEN-4 | Style Selection with Visual Cards | ✅ PASSED | ✅ Yes |
| TC-GEN-5 | Custom Prompt with Character Counter | ✅ PASSED | ✅ Yes |
| TC-GEN-6 | Form Validation | ✅ PASSED | ✅ Yes |
| TC-GEN-7 | Payment Status Indicator | ✅ PASSED | ✅ Yes |
| TC-GEN-8 | Generation Submission Flow | ✅ PASSED | ✅ Yes |
| TC-GEN-9 | Real-Time Progress Tracking | ✅ PASSED | ✅ Yes |
| TC-GEN-10 | Progress Page Refresh Persistence | ✅ PASSED | ✅ Yes |
| TC-GEN-11 | Generation Completion Display | ✅ PASSED | ✅ Yes |
| TC-GEN-13 | No Credits Error Handling | ✅ PASSED | ✅ Yes |
| TC-GEN-15 | User Balance Update After Generation | ✅ PASSED | ✅ Yes |
| TC-GEN-2 | Address Input with Google Places | ⏭️ PENDING | ❌ Skip (requires Maps API) |
| TC-GEN-12 | Generation Failure Handling | ⏭️ BLOCKED | ❌ Skip (requires API mocking) |

**Note:** This is regression testing to ensure Feature 005 changes didn't break existing functionality.

---

### Priority 3: CUJ-8 - Phase 2 UX Features (OPTIONAL)
**Test File:** Not yet created (would be `tests/e2e/phase2-ux-features.spec.ts`)
**Status:** Manual testing recommended, E2E tests pending
**Scenarios:** 6 test cases

| Test ID | Feature | Manual Test Status | E2E Test |
|---------|---------|-------------------|----------|
| TC-UX-1 | Preservation Strength Slider | ✅ PASSED (2025-11-06) | 🔄 Pending |
| TC-UX-2 | Suggested Prompts (Area-Specific) | ✅ PASSED (2025-11-06) | 🔄 Pending |
| TC-UX-3 | Suggested Prompts (Style-Specific) | ✅ PASSED (2025-11-06) | 🔄 Pending |
| TC-UX-4 | Character Counter Enforcement | ✅ PASSED (2025-11-06) | 🔄 Pending |
| TC-UX-5 | Enhanced Progress Display (v2 Fields) | 🔄 PENDING | 🔄 Pending |
| TC-UX-6 | Result Recovery with v2 Fields | 🔄 PENDING | 🔄 Pending |

**Note:** These tests require full generation completion (2-5 minutes per test). Recommend manual validation for this session.

---

## 🎯 Test Objectives

### Primary Objectives (Must Complete)
1. ✅ Validate Feature 005 single-page generation flow works end-to-end
2. ✅ Confirm inline progress tracking without page navigation
3. ✅ Verify polling mechanism (2-second intervals, 5-minute timeout)
4. ✅ Ensure "Start New Generation" resets form without reload
5. ✅ Regression test Feature 004 to ensure no breakage

### Secondary Objectives (If Time Permits)
1. 🔄 Manual validation of Phase 2 UX features
2. 🔄 Test network interruption recovery
3. 🔄 Verify localStorage persistence across refreshes

---

## 🐛 Known Issues & Workarounds

### Issue 1: Login Button on /start Page
**Status:** ✅ FIXED
**Description:** Tests were failing because login function tried to click non-existent "Sign In" button on /start page
**Fix:** Updated login function to navigate directly to `/auth` page
**Files Fixed:** `generation-flow-v2.spec.ts`, `generation-flow.spec.ts`

### Issue 2: Address Bar Autocomplete Reversion
**Status:** 🔴 UNRESOLVED (NOT BLOCKING E2E TESTS)
**Description:** When selecting from Google Places autocomplete, address reverts when clicking another field
**Impact:** Manual testing shows issue, but E2E tests may not catch it due to timing
**Workaround:** For E2E tests, fill address manually without using autocomplete
**Tracking:** Console logs added, awaiting user feedback

### Issue 3: Debug Panel 404 Spam
**Status:** ✅ FIXED
**Description:** Debug panel was flooding console with 404 errors for non-existent `/debug/logs` endpoint
**Fix:** Added smart endpoint detection - stops polling after first 404

### Issue 4: Test User Trial Credits
**Status:** ⚠️ MONITOR
**Description:** Test user may run out of trial credits during extensive testing
**Workaround:**
  - Check trial balance before starting: `SELECT trial_remaining FROM users WHERE email = 'test.uat.bypass@yarda.app'`
  - Reset if needed: `UPDATE users SET trial_remaining = 3 WHERE email = 'test.uat.bypass@yarda.app'`

---

## 📊 Success Criteria

### Feature 005 Success Criteria
- ✅ All 6 tests in generation-flow-v2.spec.ts pass
- ✅ Form submission → progress → results flow works without navigation
- ✅ Polling starts automatically and updates every 2 seconds
- ✅ Results display inline when generation completes
- ✅ "Start New Generation" button resets form without page reload
- ✅ Network interruptions handled gracefully (bonus)
- ✅ 5-minute timeout enforced (bonus)

### Feature 004 Regression Success Criteria
- ✅ All 11 previously-passing tests still pass
- ✅ No new console errors or warnings
- ✅ Generation flow still works (even though we replaced the page)

### Overall Session Success Criteria
- ✅ 100% pass rate on Feature 005 tests (6/6)
- ✅ 90%+ pass rate on Feature 004 regression tests (10/11 acceptable)
- ✅ Zero critical bugs found
- ✅ All known issues documented

---

## 🔧 Pre-Flight Checklist

**Environment:**
- ✅ Backend running on localhost:8000 (verified)
- ✅ Frontend running on localhost:3000 (verified)
- ✅ API URL configured correctly in .env.local (verified)
- ✅ Supabase connection active

**Test Data:**
- ✅ Test user account exists: `test.uat.bypass@yarda.app`
- ⚠️ Trial credits available (check before running)
- ✅ Backend bypasses email verification for test user

**Test Files:**
- ✅ generation-flow-v2.spec.ts exists and login fixed
- ✅ generation-flow.spec.ts exists and previously passed
- ✅ Test credentials configured (TEST_USER_EMAIL, TEST_USER_PASSWORD)

---

## 📝 Test Execution Plan

### Step 1: Verify Test User Trial Balance (5 min)
```bash
# Check current trial balance
psql $DATABASE_URL -c "SELECT email, trial_remaining FROM users WHERE email = 'test.uat.bypass@yarda.app';"

# If needed, reset to 3 trials
psql $DATABASE_URL -c "UPDATE users SET trial_remaining = 3 WHERE email = 'test.uat.bypass@yarda.app';"
```

### Step 2: Run Feature 005 Tests (15 min)
```bash
cd frontend
npx playwright test tests/e2e/generation-flow-v2.spec.ts --project=chromium
```

**Expected Results:**
- 6/6 tests pass
- Duration: ~10-15 minutes (includes generation completion waits)
- Screenshots saved to `test-results/`

### Step 3: Analyze Feature 005 Results (5 min)
- Review test output for failures
- Check screenshots for visual validation
- Document any unexpected behavior

### Step 4: Run Feature 004 Regression Tests (20 min)
```bash
cd frontend
npx playwright test tests/e2e/generation-flow.spec.ts --project=chromium
```

**Expected Results:**
- 11/11 tests pass (same as previous session)
- No new failures introduced by Feature 005 changes

### Step 5: Manual Validation of Phase 2 UX Features (15 min) - OPTIONAL
- Open http://localhost:3000/generate in browser
- Test preservation strength slider (0.0 - 1.0 range)
- Test suggested prompts (area-specific and style-specific)
- Test character counter (500 max with warnings at 450+)
- Verify all features integrated correctly

### Step 6: Generate Test Report (10 min)
- Compile results from both test suites
- Document pass/fail for each test
- Note any issues or observations
- Create summary document

---

## 🎬 Post-Test Actions

### If All Tests Pass
1. ✅ Mark Phase 1 complete (Test Plan Preparation)
2. ✅ Mark Phase 2 complete (E2E Test Execution)
3. ✅ Create final test report
4. ✅ Update TEST_PLAN.md with results
5. ✅ Recommend deployment to staging

### If Tests Fail
1. 🔴 Document failure details (screenshot, error message, stack trace)
2. 🔴 Add to todo list for fixing
3. 🔴 Re-run after fixes
4. 🔴 Update test report with final results

---

## 📸 Screenshot Expectations

**Feature 005 Screenshots to Verify:**
1. Form filled and ready to submit
2. Progress section appears inline (no navigation)
3. Polling in progress (status updating every 2 seconds)
4. Results displayed inline (no navigation)
5. "Start New Generation" button visible
6. Form reset after clicking "Start New"

**Feature 004 Regression Screenshots:**
1. All form elements rendered correctly
2. Validation errors display properly
3. Payment status indicator correct
4. Generation submission successful
5. Progress tracking working
6. Completion display correct

---

## 📈 Expected Timeline

| Phase | Activity | Duration | Status |
|-------|----------|----------|--------|
| 0 | Environment Preparation | 5 min | ✅ COMPLETE |
| 1 | Test Plan Preparation | 10 min | 🔄 IN PROGRESS |
| 2a | Feature 005 Tests | 15 min | 🔄 PENDING |
| 2b | Feature 004 Regression | 20 min | 🔄 PENDING |
| 2c | Phase 2 UX Manual Validation | 15 min | 🔄 OPTIONAL |
| 3 | Fix Test Failures (if any) | 20 min | 🔄 PENDING |
| 4 | Generate Test Report | 10 min | 🔄 PENDING |
| **TOTAL** | | **60-90 min** | |

---

## 🎯 Next Steps

1. Complete this test plan preparation (Phase 1)
2. Execute Feature 005 tests (Phase 2a)
3. Analyze results and fix any failures
4. Execute Feature 004 regression tests (Phase 2b)
5. Generate comprehensive test report (Phase 4)
6. Update TEST_PLAN.md with session results

**Session Start Time:** 2025-11-07 (now)
**Estimated Completion:** 2025-11-07 (60-90 minutes from start)
