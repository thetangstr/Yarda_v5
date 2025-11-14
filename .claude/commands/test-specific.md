---
description: Test specific feature or module - smart test selection based on feature name
---

# Test Specific Feature - Smart Feature-Based Testing

**Purpose:** Quickly test a specific feature or module without running the full test suite.

**Usage:** `/test-specific [feature-name] [environment]`

## Quick Start

```bash
# Test language switching feature
/test-specific language-switching

# Test generation flow on staging
/test-specific generation-flow staging

# Test token management with detailed output
/test-specific tokens local --verbose

# Test authentication across all browsers
/test-specific auth all
```

## Supported Features

| Feature | Test File | Tests | Browsers | Time |
|---------|-----------|-------|----------|------|
| `language-switching` or `i18n` | `language-switching.spec.ts` | 9 | All 5 | 2-3 min |
| `auth` or `authentication` | `auth.spec.ts` | 12+ | All 5 | 2-3 min |
| `generation` or `generation-flow` | `generation-flow*.spec.ts` | 15+ | All 5 | 4-5 min |
| `tokens` or `token-management` | `token-management.spec.ts` | 8+ | All 5 | 2-3 min |
| `trial` or `trial-credits` | `trial-*.spec.ts` | 6+ | All 5 | 2-3 min |
| `purchase` or `payment` | `purchase-flow.spec.ts` | 10+ | All 5 | 3-4 min |
| `subscription` | `subscription.spec.ts` | 8+ | All 5 | 3-4 min |
| `holiday` or `decorator` | `holiday-*.spec.ts` | 12+ | All 5 | 4-5 min |

## Parameters

### Feature Name (Required)
Specify which feature to test. Agent will auto-detect and run corresponding tests.

```bash
/test-specific language-switching       # Exact match
/test-specific i18n                     # Alias
/test-specific lang                     # Partial match
```

### Environment (Optional, Default: `local`)
Where to run tests: `local`, `staging`, or `production`.

```bash
/test-specific language-switching local       # Test against localhost:3000 + localhost:8000
/test-specific generation-flow staging        # Test against Vercel preview + Railway staging
/test-specific tokens production              # Test against production (caution!)
```

### Options

```bash
--verbose                # Show all test output (default: summary only)
--ui                     # Run with interactive UI mode
--headed                 # Show browser window during test
--debug                  # Print debugging info
--fail-fast              # Stop on first failure
--repeat 3               # Run tests 3 times
```

## How It Works

### Agent Behavior

1. **Parse feature name** - Match against known features
2. **Locate test file** - Find corresponding `.spec.ts` file
3. **Determine environment** - Set API URL based on local/staging/production
4. **Run tests** - Execute Playwright with appropriate config
5. **Parse results** - Extract pass/fail counts by browser
6. **Report findings** - Show summary with next steps

### Test Selection Logic

```python
# Agent auto-detects based on feature name
if "lang" in feature or "i18n" in feature or "switch" in feature:
    tests = "language-switching.spec.ts"
elif "auth" in feature or "login" in feature or "register" in feature:
    tests = "auth.spec.ts"
elif "gen" in feature or "creation" in feature:
    tests = "generation-flow*.spec.ts"
elif "token" in feature or "credit" in feature or "trial" in feature:
    tests = "token-*.spec.ts" or "trial-*.spec.ts"
# ... etc
```

## Example Workflows

### Workflow 1: Quick Feature Verification

```bash
# You: Just finished implementing language switching
/test-specific language-switching

# Agent:
✅ TESTING LANGUAGE SWITCHING
Environment: local (http://localhost:3000)
Tests: language-switching.spec.ts (9 tests)
Browsers: chromium, firefox, webkit, mobile-chrome, mobile-safari

Running tests...
[chromium] ✅ 9/9 passed
[firefox] ✅ 9/9 passed
[webkit] ⚠️ 7/9 passed (timing issues on multi-step)
[mobile-chrome] ✅ 9/9 passed
[mobile-safari] ⚠️ 7/9 passed (timing issues on multi-step)

📊 SUMMARY
✅ 41/45 tests passed (91%)
⚠️ 4 timing-related failures in webkit-based browsers
✅ Core functionality verified in chromium

RECOMMENDATIONS:
- Increase timeouts for webkit browsers (known issue)
- Core feature ready for staging verification
```

### Workflow 2: Staging Verification After Deploy

```bash
# You: Just deployed to staging, want to verify generation flow
/test-specific generation staging --verbose

# Agent:
🚀 TESTING GENERATION FLOW ON STAGING
Environment: staging (https://yarda-v5-frontend-git-*.vercel.app)
Backend: https://yarda-api-production.up.railway.app
Tests: generation-flow*.spec.ts (15+ tests)

Verifying staging environment...
✅ Frontend accessible
✅ Backend API responding
✅ Database connection working
✅ Stripe webhooks configured

Running tests against staging...
[chromium] ✅ 15/15 passed
[firefox] ✅ 15/15 passed
[webkit] ✅ 15/15 passed
[mobile-chrome] ✅ 15/15 passed
[mobile-safari] ✅ 15/15 passed

📊 SUMMARY
✅ 75/75 tests passed (100%)
✅ All browsers passing
✅ Feature ready for production deployment
```

### Workflow 3: Debugging Specific Browser Issues

```bash
# You: Tests pass in chromium but fail in firefox
/test-specific auth local --headed

# Agent opens firefox browser window showing exact failure point
# You can watch the test run and see exactly where it fails
# Debug output shows:
- Page state at each step
- Network requests
- Console errors
- Element selectors that fail
```

## Performance Notes

**Fastest Features to Test:**
- `language-switching` - 2-3 min (9 tests, focused)
- `auth` - 2-3 min (12 tests, mostly UI interactions)
- `tokens` - 2-3 min (8 tests, quick deductions)

**Moderate Testing:**
- `generation` - 4-5 min (15+ tests, includes API calls & polling)
- `purchase` - 3-4 min (10+ tests, includes Stripe)

**Longest Tests:**
- `holiday` - 4-5 min (12+ tests, complex flow)
- `subscription` - 3-4 min (8+ tests)

## Common Scenarios

### Scenario 1: Verify After Quick Bug Fix

```bash
# Fixed a language switcher click issue
/test-specific language-switching --fail-fast

# Runs until first failure (faster feedback)
```

### Scenario 2: Verify Feature Across All Browsers

```bash
# Want to see detailed results for each browser
/test-specific generation local --verbose

# Shows per-browser results and failure details
```

### Scenario 3: Performance Testing

```bash
# Run same tests 3 times to check for flakiness
/test-specific auth local --repeat 3

# If test passes all 3 runs → stable feature
# If test fails intermittently → needs investigation
```

### Scenario 4: Debug in Browser UI

```bash
# Visual debugging mode
/test-specific language-switching local --ui

# Opens Playwright inspector
# You can:
# - Step through test
# - Watch page interactions
# - Inspect elements
# - Check network requests
```

## Integration with Other Commands

**Sequential Flow:**
```bash
# 1. Test specific feature
/test-specific language-switching

# 2. If passes → proceed to full test
/test-all-local

# 3. If passes → use smart deployment
/test-smart
```

**Troubleshooting Flow:**
```bash
# 1. Feature has issues
/test-specific generation

# 2. Tests fail → debug interactively
/test-specific generation --ui

# 3. Found and fixed issue
/test-specific generation      # Verify fix

# 4. Ready for next phase
/test-bug-fix                  # If production bug
/test-smart                    # If ready to deploy
```

## Exit Codes & Reporting

| Code | Meaning | Action |
|------|---------|--------|
| 0 | All tests passed | Ready for deployment |
| 1 | Some tests failed | Review failures, fix code |
| 2 | Environment issue | Check API connectivity |
| 3 | Test file not found | Check feature name spelling |
| 4 | Timeout | Increase timeout or check performance |

## Tips for Best Results

1. **Use feature aliases** - Both `language-switching` and `i18n` work
2. **Specify environment early** - Don't test production casually
3. **Use --fail-fast for rapid iteration** - Faster feedback loop
4. **Use --ui for visual debugging** - See exactly what's happening
5. **Run staging tests before production** - Always verify in staging first

## Requirements Met

✅ **User Requirements:**
- Agent understands type and level of testing needed ✅
- Agent knows which CUJs to test for each feature ✅
- Agent knows environment where tests happen ✅
- Smart about feature selection and test mapping ✅

✅ **Feature-Specific CUJs Tested:**
- Language Switching: Default language, switching, persistence, backend sync
- Generation: Form submission, polling, results display
- Tokens: Purchase, balance, deduction
- Auth: Login, registration, session persistence
- Trial: Registration credits, deduction, exhaustion handling

---

**Integration:** Works with `/test-smart`, `/test-all-local`, `/test-bug-fix`, `/test-cuj`

**Command Family:**
- `/test-all-local` - All tests (comprehensive)
- `/test-specific` - Specific feature (focused) ← You are here
- `/test-bug-fix` - Environment-aware bug workflow
- `/test-cuj` - Specific Critical User Journey
- `/test-smart` - Full CI/CD pipeline
