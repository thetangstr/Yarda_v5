# Consolidate E2E Tests

Merge scattered E2E test files into 4 focused, maintainable suites.

**Current state:** 20+ test files with duplication
**Target state:** 4 consolidated suites:
1. `auth-onboarding.spec.ts` - Authentication & trial credits
2. `generation-complete.spec.ts` - Full generation flow
3. `payments.spec.ts` - Tokens & subscriptions
4. `error-recovery.spec.ts` - Error handling

**What the agent will do:**
1. Analyze all existing E2E tests
2. Identify duplicate scenarios
3. Group tests by CUJ (Critical User Journey)
4. Create 4 new consolidated files
5. Remove old scattered test files
6. Update test configurations

**Agent:** `full-stack-orchestration:test-automator`

**Benefits:**
- Faster execution (better parallelization)
- Easier maintenance
- Clear test organization
- Reduced duplication

**Estimated time:** 15-20 minutes