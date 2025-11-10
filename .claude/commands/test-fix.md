---
description: Launch the debugging agent to automatically fix failing tests (deprecated - use /test-smart instead)
---

# Fix Failing Tests

Launch the debugging agent to automatically fix failing tests.

**What the agent will do:**
1. Analyze test failures and error messages
2. Identify root causes (flaky tests, timing issues, broken assertions)
3. Fix the tests automatically
4. Re-run tests to verify fixes
5. Report results

**Agent:** `debugging-toolkit:debugger`

**Common fixes:**
- Add explicit waits for dynamic content
- Update selectors to use data-testid
- Fix race conditions
- Update assertions for changed UI
- Mock flaky external services