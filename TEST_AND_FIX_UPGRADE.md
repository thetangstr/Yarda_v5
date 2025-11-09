# /test-and-fix Command Upgrade - Now Executes Real Playwright Tests

**Date:** 2025-11-09
**Commit:** `e638d1d`
**Status:** ✅ UPGRADED

---

## 🎯 Summary

The `/test-and-fix` command has been **significantly upgraded** to execute actual Playwright tests instead of just documenting the test workflow.

### Before (Documentation Only)
- ❌ Described what tests SHOULD do
- ❌ Did not execute any Playwright tests
- ❌ No automated test result parsing
- ❌ Manual test execution required

### After (Full Test Execution)
- ✅ Executes actual Playwright test files
- ✅ Parses test results automatically
- ✅ Generates comprehensive reports
- ✅ Updates TEST_PLAN.md with results
- ✅ Fully autonomous E2E testing

---

## 🚀 What's New

### Phase 2: E2E Test Execution - Now Actually Runs Tests!

#### Step 1: Test File Mapping

The command now maps CUJs to existing Playwright test files:

```bash
CUJ-1 (Trial Flow)      → trial-user-registration.spec.ts
CUJ-2 (Token Purchase)  → token-purchase.spec.ts, purchase-flow.spec.ts
CUJ-7 (Generation Flow) → comprehensive-generation-test.spec.ts
CUJ-8 (Phase 2 UX)      → generation-flow-v2.spec.ts
All CUJs                → uat-comprehensive-verification.spec.ts
```

#### Step 2: Actual Playwright Execution

**Local Environment:**
```bash
cd frontend
npx playwright test [test-file] --config=playwright.config.ts --project=chromium
```

**Staging Environment:**
```bash
cd frontend
npx playwright test [test-file] --config=playwright.config.staging.ts --project=chromium-staging
```

#### Step 3: Automated Result Parsing

Uses JSON reporter to parse test results:

```bash
npx playwright test --reporter=json --output=test-results.json
```

Extracts:
- Total tests run
- Passed/failed/skipped counts
- Execution duration
- Error messages and stack traces
- Screenshot paths

#### Step 4: Comprehensive Reporting

Generates `TEST_SESSION_{env}_{timestamp}.md` with:

```markdown
## Test Execution Results

**Environment:** staging
**Date:** 2025-11-09
**Total Duration:** 15m 32s

### Summary
- ✅ Passed: 42/45 (93.3%)
- ❌ Failed: 3/45 (6.7%)
- ⏭️ Skipped: 0/45

### Test Results by CUJ

#### CUJ-1: Trial Flow
- File: trial-user-registration.spec.ts
- Status: ✅ PASSED
- Duration: 3m 12s
- Tests:
  - ✅ TC-E2E-1-1: User registration
  - ✅ TC-E2E-1-2: First generation
  - ✅ TC-E2E-1-3: Trial exhaustion

[And so on for each CUJ...]
```

#### Step 5: TEST_PLAN.md Updates

Automatically marks tests as passed/failed:

```markdown
- ✅ TC-E2E-1: PASSED (staging, 2025-11-09)
- ✅ TC-E2E-2: PASSED (staging, 2025-11-09)
- ❌ TC-E2E-7: FAILED (staging, 2025-11-09)
```

---

## 📋 Test Execution Strategy

### 1. Critical Form Interaction Tests First

Runs these tests before CUJ-specific tests to catch fundamental bugs:

```bash
npx playwright test -g "TC-FORM-INTERACTION-1|TC-FORM-VALIDATION-1"
```

These tests verify:
- ✅ Address input persistence across interactions
- ✅ Backend accepts frontend enum values (no 422 errors)

### 2. CUJ-Specific Tests

- If `cuj` parameter: Run only that CUJ's test file
- If no `cuj` parameter: Run all test files sequentially

### 3. Environment-Specific Configuration

- **Local:** Uses `playwright.config.ts` targeting localhost
- **Staging:** Uses `playwright.config.staging.ts` targeting Vercel preview

### 4. Screenshot and Trace Capture

- Screenshots saved on failure
- Traces captured for debugging
- Organized by environment and timestamp

---

## 🔧 Usage Examples

### Run All Tests Locally
```bash
/test-and-fix env=local
```

**What it does:**
1. Checks backend/frontend running (auto-starts if needed)
2. Runs all Playwright test files
3. Parses results
4. Generates TEST_SESSION_local_20251109.md
5. Updates TEST_PLAN.md with results

### Run Specific CUJ in Staging
```bash
/test-and-fix env=staging cuj=CUJ-8
```

**What it does:**
1. Verifies staging deployment active
2. Runs generation-flow-v2.spec.ts (Phase 2 UX tests)
3. Parses results
4. Generates TEST_SESSION_staging_20251109.md
5. Updates TEST_PLAN.md

### Run Tests with Auto-Fix
```bash
/test-and-fix env=local fix=true
```

**What it does:**
1. Runs all tests
2. If failures detected, attempts automated fixes
3. Retries failed tests
4. Reports results

---

## 📊 Output Files

### 1. Test Results JSON
```json
{
  "config": {...},
  "suites": [
    {
      "title": "CUJ-1: Trial Flow",
      "file": "trial-user-registration.spec.ts",
      "tests": [
        {
          "title": "TC-E2E-1-1: User registration",
          "status": "passed",
          "duration": 12345
        }
      ]
    }
  ],
  "stats": {
    "expected": 42,
    "unexpected": 3,
    "duration": 932145
  }
}
```

### 2. Test Session Report
`TEST_SESSION_staging_20251109.md` - Comprehensive results

### 3. Updated TEST_PLAN.md
Test statuses updated with environment and date

### 4. Screenshots
`.playwright-mcp/staging/` - Organized by test and failure

---

## 🎯 Benefits

### For Developers
- ✅ Automated E2E testing with one command
- ✅ No manual test execution needed
- ✅ Fast feedback on code changes
- ✅ Environment-specific testing (local vs staging)

### For CI/CD
- ✅ Can be integrated into GitHub Actions
- ✅ Automated testing on every PR
- ✅ Prevents broken code from being merged

### For Quality Assurance
- ✅ Comprehensive test coverage
- ✅ Automated result tracking
- ✅ Screenshot evidence of failures
- ✅ Historical test results in TEST_PLAN.md

---

## 🔄 Comparison: Before vs After

### Before This Upgrade

```
User: /test-and-fix env=staging