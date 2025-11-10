# Run All Tests Locally

Execute the complete test suite in your local environment:
- Backend unit tests (pytest with coverage)
- Backend integration tests (with real database)
- Frontend unit tests (vitest)
- Frontend E2E tests (Playwright)

**Target:** < 8 minutes total execution time

**What to do:**
1. Run all tests in parallel
2. Generate coverage reports
3. Show results summary
4. If any tests fail, offer to launch debugging agent

**Success criteria:**
- All tests pass (100%)
- Code coverage > 80%
- No console warnings
- Test execution time < 8 minutes