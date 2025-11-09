# Pre-Push Testing Hook Guide

## Overview

An automated E2E testing hook that runs before every `git push` to prevent bugs from reaching production. This hook uses Playwright to test the generation flow and other critical user journeys.

## Features

- ✅ **Automatic Testing:** Runs E2E tests before every push
- 🚫 **Prevents Bad Pushes:** Blocks pushes if tests fail
- 🎯 **Smart Branch Detection:** Only runs for critical branches (main, master, 004-generation-flow)
- 🔧 **Easy to Enable/Disable:** Simple chmod command
- ⏭️ **Skippable:** Use `--no-verify` for emergencies

## Installation

The hook is already installed at `.git/hooks/pre-push` and enabled.

### Verify Installation
```bash
ls -l .git/hooks/pre-push
# Should show: -rwxr-xr-x (executable)
```

### Manual Installation
If the hook gets removed or you're setting up a new clone:
```bash
# Copy the hook
cp .git/hooks/pre-push.sample .git/hooks/pre-push  # if needed
chmod +x .git/hooks/pre-push

# Or enable existing hook
chmod +x .git/hooks/pre-push
```

## Usage

### Normal Push (With Tests)
```bash
git push origin 004-generation-flow
```

**What Happens:**
1. ✅ Checks frontend server running (port 3000)
2. ✅ Checks backend API accessible
3. 🧪 Runs Playwright E2E tests
4. 🚀 Push proceeds if all tests pass
5. 🚫 Push blocked if any tests fail

### Skip Tests (Emergency Only)
```bash
# Use --no-verify to bypass hook
git push --no-verify origin 004-generation-flow

# Or use environment variable
SKIP_E2E=1 git push origin 004-generation-flow
```

⚠️ **Warning:** Only skip tests in emergencies. Skipping tests defeats the purpose of preventing bugs!

### Disable Hook Permanently
```bash
# Make hook non-executable
chmod -x .git/hooks/pre-push

# To re-enable later
chmod +x .git/hooks/pre-push
```

## Requirements

### 1. Frontend Dev Server
The hook requires the frontend dev server to be running on port 3000:
```bash
cd frontend
npm run dev
```

Keep this running in a separate terminal.

### 2. Backend API
The hook checks for backend API accessibility. It accepts either:
- **Railway Production:** https://yarda-api-production.up.railway.app
- **Local Backend:** http://localhost:8000

At least one must be accessible.

### 3. E2E Test Script
Ensure `package.json` has the test script:
```json
{
  "scripts": {
    "test:e2e": "playwright test tests/e2e/"
  }
}
```

## Workflow Example

### Typical Development Flow
```bash
# 1. Start frontend dev server (terminal 1)
cd frontend && npm run dev

# 2. Make your changes
# ... edit code ...

# 3. Run tests manually (optional)
cd frontend && npm run test:e2e

# 4. Commit changes
git add .
git commit -m "feat: Add new feature"

# 5. Push changes (hook runs automatically)
git push origin 004-generation-flow
```

**Output:**
```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🧪 Pre-Push E2E Testing Hook
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📋 Push Target: 004-generation-flow
🔍 Running E2E tests before push...

1️⃣  Checking frontend server (port 3000)...
✅ Frontend server is running

2️⃣  Checking backend API...
✅ Backend API is accessible (Railway)

3️⃣  Running Playwright E2E tests...
Running 8 tests using 1 worker

  ✓ generation-flow.spec.ts:10:1 › Feature 004: Generation Flow › User can access generation form
  ✓ generation-flow.spec.ts:20:1 › Feature 004: Generation Flow › User can select area and style
  ✓ generation-flow.spec.ts:35:1 › Feature 004: Generation Flow › Form validation shows correctly
  ✓ generation-flow.spec.ts:50:1 › Feature 004: Generation Flow › Generation submission flow
  ✓ generation-flow.spec.ts:70:1 › Feature 004: Generation Flow › Progress tracking displays
  ✓ generation-flow.spec.ts:85:1 › Feature 004: Generation Flow › State persists across refresh
  ✓ generation-flow.spec.ts:100:1 › Feature 004: Generation Flow › Generation shows success
  ✓ generation-flow.spec.ts:115:1 › Feature 004: Generation Flow › Blocking shows when no credits

  8 passed (45s)

✅ All E2E tests passed!
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🚀 Push allowed - tests successful
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

## Troubleshooting

### Problem: "Frontend server not running on port 3000"
**Solution:** Start the dev server
```bash
cd frontend && npm run dev
```

### Problem: "Backend API not accessible"
**Solution:** Check Railway status or start local backend
```bash
# Check Railway
curl https://yarda-api-production.up.railway.app/health

# Or start local backend
cd backend && uvicorn src.main:app --reload
```

### Problem: "E2E tests failed"
**Solution:** Fix the tests before pushing
```bash
# Run tests locally to debug
cd frontend
npm run test:e2e

# Run specific test
npx playwright test tests/e2e/generation-flow.spec.ts

# Run with UI for debugging
npx playwright test --ui
```

### Problem: Hook not running
**Solution:** Check if hook is executable
```bash
ls -l .git/hooks/pre-push
# Should show -rwxr-xr-x

# If not executable:
chmod +x .git/hooks/pre-push
```

### Problem: Hook runs but tests don't start
**Solution:** Check if test script exists
```bash
cd frontend
npm run test:e2e

# If script missing, add to package.json:
# "test:e2e": "playwright test tests/e2e/"
```

## Branch Behavior

### Tested Branches (Hook Runs)
- `main` / `master` - Production branches
- `004-generation-flow` - Current feature branch

### Skipped Branches (Hook Doesn't Run)
- All other feature branches
- Experimental branches
- Documentation branches

This prevents slowing down development on non-critical branches.

## Best Practices

### ✅ DO
- Keep frontend dev server running during development
- Run tests locally before pushing (`npm run test:e2e`)
- Fix tests immediately when they fail
- Use the hook for all critical branches

### ❌ DON'T
- Skip tests with `--no-verify` unless emergency
- Disable the hook permanently
- Push without running tests
- Ignore test failures

## Benefits

### Before Hook
- ❌ Bugs reach production
- ❌ Manual testing forgotten
- ❌ Wasted time debugging in production
- ❌ 5 critical bugs discovered (this session)

### After Hook
- ✅ Bugs caught before push
- ✅ Automatic testing enforced
- ✅ Faster feedback loop
- ✅ Higher code quality

## Statistics from This Session

**Bugs that would have been prevented:**
1. ✅ Database schema missing columns
2. ✅ Pydantic model attribute access
3. ✅ JSONB serialization issue
4. ✅ Database constraint violation (status)
5. ✅ Database constraint violation (image_type)

**Impact:** All 5 bugs would have been caught before push, preventing production outage.

## Customization

### Add More Tests
Edit the hook to run additional test suites:
```bash
# In .git/hooks/pre-push, add:
npm run test:unit        # Unit tests
npm run test:integration # Integration tests
npm run test:e2e         # E2E tests
```

### Change Branch Logic
Edit the hook to test different branches:
```bash
# In .git/hooks/pre-push, modify:
if [[ "$BRANCH" != "main" ]] && [[ "$BRANCH" != "your-branch" ]]; then
    echo "Skipping tests for non-critical branch"
    continue
fi
```

### Add Notifications
Send Slack/email notifications on test results:
```bash
# Add to hook after test results
if [ $? -eq 0 ]; then
    curl -X POST https://hooks.slack.com/... -d '{"text":"✅ Tests passed"}'
else
    curl -X POST https://hooks.slack.com/... -d '{"text":"❌ Tests failed"}'
fi
```

## Integration with CI/CD

This hook complements (doesn't replace) CI/CD pipelines:

### Local Hook (Pre-Push)
- Fast feedback (30-60 seconds)
- Catches obvious bugs
- Runs before push

### CI/CD Pipeline (Post-Push)
- Comprehensive testing (5-10 minutes)
- Integration with staging
- Deployment automation

Both layers provide defense-in-depth against bugs.

## Maintenance

### Monthly Check
```bash
# Verify hook is still working
git push --dry-run origin 004-generation-flow

# Update hook if needed
nano .git/hooks/pre-push
chmod +x .git/hooks/pre-push
```

### After Playwright Updates
```bash
# Re-test hook after updating Playwright
cd frontend
npm install @playwright/test@latest
npx playwright install
git push origin 004-generation-flow  # Verify hook works
```

## Support

### Questions
- Check this guide first
- Review hook output for specific errors
- Check Playwright documentation: https://playwright.dev

### Issues
- Hook not running: Check permissions (`chmod +x`)
- Tests failing: Run locally first (`npm run test:e2e`)
- False positives: Update test expectations

## Version History

- **2025-11-06:** Initial version created during E2E testing session
  - Discovered 5 critical bugs
  - Fixed all bugs
  - Created hook to prevent future bugs

---

**Created:** 2025-11-06
**Purpose:** Automated E2E testing before push
**Status:** ✅ Active and ready to use
