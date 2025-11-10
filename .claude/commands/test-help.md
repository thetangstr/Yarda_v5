# Testing Help - Quick Reference

## 🧠 Smart Commands (Use This!)

### Primary Command (ONE COMMAND FOR EVERYTHING)
- **`/test-smart`** - 🚀 Full CI/CD Pipeline (Local → Staging → Production)
  - **LOCAL**: Analyzes changes, runs tests, auto-fixes failures
  - **STAGING**: Auto-deploys, runs full suite, auto-fixes failures
  - **APPROVAL**: Asks for human approval after all tests pass
  - **PRODUCTION**: Deploys to production, runs smoke tests
  - **Replaces:** /test-fix, /deploy-staging, /deploy-production
  - **Use this for:** Everything from development to production

- `/test-all-local` - 📋 Run complete test suite (< 8 min)
  - All 47 tests in parallel
  - Use before PRs
  - Comprehensive validation

## 📦 Deployment Commands

- `/deploy-staging` - Deploy + validate in staging
  - Runs full test suite in staging
  - Auto-fixes failures
  - Reports results

- `/deploy-production` - Deploy to production
  - Requires user approval
  - Runs smoke tests
  - Monitors for errors

## 🎯 Test Suites (4 Consolidated)

1. **auth-onboarding.spec.ts** (11 tests, ~90s)
   - Google OAuth & Magic Link
   - Trial credits (3 on signup)
   - Session persistence

2. **generation-complete.spec.ts** (10 tests, ~180s)
   - Address autocomplete
   - Location preview (Street View/Satellite)
   - Single-page flow with polling
   - Multi-area generation

3. **payments.spec.ts** (12 tests, ~150s)
   - Token packages (10, 50, 100, 500)
   - Stripe Checkout & webhooks
   - Subscriptions & Customer Portal
   - Authorization hierarchy

4. **error-recovery.spec.ts** (14 tests, ~120s)
   - Network timeouts & offline mode
   - API errors (500, 429)
   - Form validation
   - localStorage recovery

**Total: 47 tests, ~540s (9 min) sequential, < 8 min parallel**

## ⚡ Quick Commands

```bash
# SMART TESTING (Recommended) 🧠
/test-smart                    # AI decides what to run (2-5 min)

# Run specific suite
npx playwright test tests/e2e/auth-onboarding.spec.ts
npx playwright test tests/e2e/generation-complete.spec.ts
npx playwright test tests/e2e/payments.spec.ts
npx playwright test tests/e2e/error-recovery.spec.ts

# Run by priority
npx playwright test --grep @critical  # High-priority tests (< 5 min)
npx playwright test --grep @smoke     # Quick validation (< 2 min)

# Development
npm run test:unit:watch        # Real-time unit test feedback
npm run test:all:local         # Full suite locally (< 8 min)

# Staging & Production
npm run test:staging           # Full staging suite (< 10 min)
npm run test:prod:smoke        # Production smoke tests (< 3 min)
```

## 🧠 Smart Testing Intelligence

**What `/test-smart` Does:**

1. **Analyzes Changes**
   ```bash
   $ /test-smart

   🔍 Analyzing git diff...
   📁 Changed: AddressInput.tsx
   🎯 Impact: Generation flow (Medium risk)
   💡 Plan: Run generation-complete.spec.ts only
   ⚡ Time: 3 min (vs 8 min full suite)
   ```

2. **Maps to Tests**
   - Uses [test-dependencies.yml](../test-dependencies.yml)
   - Understands code dependencies
   - Detects risk levels

3. **Smart Execution**
   - Runs smoke tests first
   - Then affected tests
   - Full suite only if high-risk

**Advanced Features:**
- 🆕 Auto-generates tests for new components
- 🔧 Auto-fixes flaky tests
- 📊 Detects coverage gaps
- ⚡ Tracks performance regressions
- 🔮 Predicts likely failures

## 📊 Test Execution Times

| Test Type | Target | Parallel | Strategy |
|-----------|--------|----------|----------|
| Smoke tests | < 2m | ✅ Yes | Quick validation |
| Critical tests | < 5m | ✅ Yes | High-priority |
| Affected tests | 2-5m | ✅ Yes | Smart selection |
| Full suite | < 8m | ✅ Yes | Comprehensive |

## 🎯 Daily Workflow

**Development:**
```bash
# 1. Make changes
$ git add .

# 2. Smart test (FAST)
$ /test-smart
> ✅ 10 tests passed in 2m 34s

# 3. Commit
$ git commit -m "Fix bug"
```

**Before PR:**
```bash
# Run full suite for safety
$ /test-all-local
> ✅ 47 tests passed in 7m 21s
```

**When Tests Fail:**
```bash
# Agent auto-fixes
$ /test-fix
> 🔧 Fixed flaky test
> ✅ Re-run passed
```

## 📚 Documentation

- **[SMART_TESTING_GUIDE.md](../SMART_TESTING_GUIDE.md)** - Complete guide
- **[test-dependencies.yml](../test-dependencies.yml)** - Code-to-test mapping
- **[TEST_PLAN.md](../TEST_PLAN.md)** - Full testing strategy
- **[TEST_CONSOLIDATION_COMPLETE.md](../TEST_CONSOLIDATION_COMPLETE.md)** - Consolidation summary

## ✅ Success Criteria

- ✅ 100% tests passing
- ✅ 80%+ code coverage
- ✅ < 1% flaky test rate
- ✅ Execution time < 8 minutes
- ✅ Zero manual testing

## 💡 Pro Tips

1. **Use `/test-smart` daily** - Save 60-90% testing time
2. **Trust the agent** - It knows the dependency map
3. **Let agent auto-fix** - Don't debug tests manually
4. **Review insights** - Learn from coverage gaps
5. **Update mappings** - Keep test-dependencies.yml current

## 🆘 Need Help?

**Just ask!** The agent is designed to think for you:

```bash
$ /test-smart
> Agent analyzes changes
> Agent recommends strategy
> Agent executes tests
> Agent provides insights
```

**Type `/test-smart` now to see it in action! 🚀**
