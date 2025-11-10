---
description: Fully automated CI/CD pipeline - test locally, auto-fix failures, deploy to staging, test again, auto-fix, get approval, deploy to production
---

# Smart Test & Deploy - Fully Automated CI/CD Pipeline

**Goal:** Test → Fix → Deploy → Test → Fix → Approve → Deploy (fully automated until human approval)

## Instructions for Agent

You are a smart CI/CD orchestrator. This is a **SINGLE COMMAND** that handles the entire deployment pipeline from local to production with minimal human intervention.

## Automated Pipeline Workflow

### PHASE 1: LOCAL TESTING & AUTO-FIX

```bash
# Step 1: Analyze what changed
git diff --name-only HEAD

# Step 2: Map changes to affected tests (use test-dependencies.yml)
# Determine risk level and which tests to run

# Step 3: Run affected tests locally
cd frontend && npx playwright test tests/e2e/{affected-suite}.spec.ts

# Step 4: AUTO-FIX failures (NO approval needed)
# If tests fail:
# - Analyze root cause
# - Apply fixes automatically
# - Re-run tests
# - Repeat until all pass OR max 3 attempts

# Step 5: Report local results
"✅ Local tests passed (10/10)"
"🔧 Auto-fixed 2 flaky tests"
"⏱️ Execution time: 2m 34s"
```

**CRITICAL:** If local tests fail after 3 auto-fix attempts, STOP and ask user for help. Do NOT proceed to deployment.

### PHASE 2: AUTO-DEPLOY TO STAGING/PREVIEW

```bash
# Step 6: Commit changes (if auto-fixes were applied)
git add .
git commit -m "test: Auto-fix test issues

- Fixed race condition in TC-GEN-8
- Added explicit wait for autocomplete dropdown

🤖 Generated with Claude Code"

# Step 7: Push to current branch (triggers auto-deploy)
git push origin HEAD

# Step 8: Wait for deployments
# Railway (backend): Auto-deploys on push
# Vercel (frontend): Creates preview deployment
# Monitor deployment status via APIs

# Step 9: Verify deployments are live
# Check Railway deployment status
# Check Vercel preview URL
```

**Output:**
```
🚀 Deployed to staging/preview:
- Frontend: https://yarda-v5-frontend-git-{branch}-{team}.vercel.app
- Backend: https://yarda-api-staging.up.railway.app
- Status: Live ✅
```

### PHASE 3: STAGING/PREVIEW TESTING & AUTO-FIX

```bash
# Step 10: Run FULL E2E suite on staging/preview
cd frontend && npx playwright test --config=playwright.config.staging.ts

# This runs ALL 47 tests against staging environment:
# - auth-onboarding.spec.ts (11 tests)
# - generation-complete.spec.ts (10 tests)
# - payments.spec.ts (12 tests)
# - error-recovery.spec.ts (14 tests)

# Step 11: AUTO-FIX staging failures
# If tests fail:
# - Analyze root cause
# - Determine if it's code issue or environment issue
# - Apply fixes automatically
# - Re-run failed tests
# - Repeat until all pass OR max 3 attempts

# Step 12: Report staging results
"✅ Staging tests passed (47/47)"
"🔧 Auto-fixed 1 environment-specific issue"
"⏱️ Execution time: 7m 21s"
```

**CRITICAL:** If staging tests fail after 3 auto-fix attempts, STOP and ask user for help. Do NOT proceed to production.

### PHASE 4: HUMAN APPROVAL GATE

```bash
# Step 13: Request human approval
"
🎉 ALL TESTS PASSED IN STAGING/PREVIEW

📊 Summary:
- Local tests: ✅ 10/10 passed
- Staging tests: ✅ 47/47 passed
- Auto-fixes applied: 3 (all verified)
- Preview URL: https://yarda-v5-frontend-git-{branch}-{team}.vercel.app

🚀 Ready to deploy to PRODUCTION?

Type 'yes' to deploy, 'no' to cancel, or 'review' to see details.
"
```

**Wait for user response before proceeding.**

### PHASE 5: PRODUCTION DEPLOYMENT (After Approval)

```bash
# Step 14: Merge to main and deploy
git checkout main
git merge {current-branch}
git push origin main

# Triggers auto-deploy:
# - Vercel: Auto-deploys frontend to production
# - Railway: Auto-deploys backend to production

# Step 15: Run production smoke tests
npx playwright test --grep @smoke --config=playwright.config.production.ts

# Step 16: Monitor for errors
# - Check Vercel logs
# - Check Railway logs
# - Monitor Sentry (if configured)

# Step 17: Final report
"
✅ PRODUCTION DEPLOYMENT SUCCESSFUL

📊 Summary:
- Frontend: https://yarda.app
- Backend: https://yarda-api-production.up.railway.app
- Smoke tests: ✅ 12/12 passed
- Status: Live and healthy ✅

🎉 Deployment complete!
"
```

## Auto-Fix Strategy

When tests fail, the agent should:

1. **Analyze the failure:**
   - Read test output and stack trace
   - Identify root cause (race condition, selector change, API error, etc.)
   - Determine if it's fixable automatically

2. **Apply fix automatically:**
   - Update test code (add waits, fix selectors, update assertions)
   - Update source code (if it's a simple bug like typo)
   - Document what was fixed

3. **Re-run and verify:**
   - Run the fixed test
   - If it passes, continue
   - If it fails, try alternative fix
   - After 3 attempts, escalate to human

**Example Auto-Fixes:**
```typescript
// Auto-fix 1: Add explicit wait
- await page.click('.submit-button')
+ await page.waitForSelector('.submit-button', { state: 'visible' })
+ await page.click('.submit-button')

// Auto-fix 2: Update selector
- await page.click('[data-testid="area"]')
+ await page.click('[data-yard-area="front_yard"]')

// Auto-fix 3: Fix race condition
- const result = await page.textContent('.result')
+ await page.waitForLoadState('networkidle')
+ const result = await page.textContent('.result')
```

## Deployment Configuration

### Staging/Preview Environment

**Frontend (Vercel Preview):**
- Trigger: Push to any branch
- URL: `https://yarda-v5-frontend-git-{branch}-{team}.vercel.app`
- Config: Uses preview environment variables

**Backend (Railway - staging branch):**
- Trigger: Push to `staging` branch or current branch if staging service exists
- URL: `https://yarda-api-staging.up.railway.app`
- Config: Uses staging environment variables

### Production Environment

**Frontend (Vercel Production):**
- Trigger: Push to `main` branch
- URL: `https://yarda.app` (or configured production domain)
- Config: Uses production environment variables

**Backend (Railway Production):**
- Trigger: Push to `main` branch
- URL: `https://yarda-api-production.up.railway.app`
- Config: Uses production environment variables

## Decision Tree

```
START
│
├─ Analyze changes
│  └─ Determine affected tests
│
├─ LOCAL PHASE
│  ├─ Run affected tests
│  ├─ Tests pass? → Continue
│  └─ Tests fail? → Auto-fix (max 3 attempts)
│     ├─ Fixed? → Continue
│     └─ Not fixed? → STOP, ask user
│
├─ DEPLOY TO STAGING
│  ├─ Commit auto-fixes
│  ├─ Push to current branch
│  └─ Wait for deployments
│
├─ STAGING PHASE
│  ├─ Run FULL test suite
│  ├─ Tests pass? → Continue
│  └─ Tests fail? → Auto-fix (max 3 attempts)
│     ├─ Fixed? → Continue
│     └─ Not fixed? → STOP, ask user
│
├─ APPROVAL GATE
│  └─ Ask user: "Deploy to production?"
│     ├─ Yes → Continue
│     └─ No → STOP
│
└─ PRODUCTION PHASE
   ├─ Merge to main
   ├─ Push (triggers auto-deploy)
   ├─ Run smoke tests
   └─ Monitor and report
```

## Environment Detection

The agent should automatically detect which environment to use:

```bash
# Check if staging branch exists
git show-ref --verify --quiet refs/heads/staging

# If yes: Use staging branch for staging deployment
git checkout staging
git merge {current-branch}
git push origin staging

# If no: Current branch creates Vercel preview (no staging branch needed)
git push origin HEAD
# Vercel automatically creates preview deployment
```

## Error Handling

**Local test failures (after 3 auto-fix attempts):**
```
❌ Unable to fix local test failures automatically.

Failed tests:
- TC-GEN-8: Address autocomplete timeout
- TC-PAY-15: Stripe webhook signature mismatch

Attempted fixes:
1. Added explicit wait (failed)
2. Updated selector (failed)
3. Increased timeout (failed)

Manual intervention required. Please review the failures and run:
/test-smart (to retry after manual fixes)
```

**Staging test failures (after 3 auto-fix attempts):**
```
❌ Staging tests failing after auto-fix attempts.

Failed tests:
- TC-GEN-12: Multi-area generation

This might be an environment-specific issue. Check:
1. Staging environment variables
2. Database state in staging
3. External API integrations (Google Maps, Stripe, etc.)

Fix the environment issue and run:
/test-smart (to retry deployment pipeline)
```

**Deployment failures:**
```
❌ Deployment failed.

Service: Railway backend
Error: Build timeout (exceeded 10 minutes)

Possible causes:
1. Large dependency installation
2. Database migration timeout
3. Build script error

Check Railway logs: https://railway.app/project/{id}/deployments

Fix the issue and run:
/test-smart (to retry deployment)
```

## Output Format

**Progress updates:**
```
🔍 PHASE 1: LOCAL TESTING
  ✅ Analyzed changes (3 files)
  ✅ Running affected tests (10 tests)
  ⏱️ 2m 15s elapsed...

🚀 PHASE 2: DEPLOYING TO STAGING
  ✅ Committed auto-fixes
  ✅ Pushed to branch: feature/my-feature
  ⏱️ Waiting for deployments...
  ✅ Frontend deployed to preview
  ✅ Backend deployed to staging

🧪 PHASE 3: STAGING TESTING
  ✅ Running full test suite (47 tests)
  ⏱️ 7m 05s elapsed...
  ✅ All tests passed

⏸️ PHASE 4: AWAITING APPROVAL
  📊 Ready to deploy to production

🚀 PHASE 5: PRODUCTION DEPLOYMENT
  ✅ Merged to main
  ✅ Deployed to production
  ✅ Smoke tests passed

✅ DEPLOYMENT COMPLETE!
```

## Tips for Maximum Automation

1. **Trust the auto-fix** - It's designed to handle common issues
2. **Only intervene when asked** - The agent will escalate when needed
3. **Review the summary** - Before approving production deployment
4. **Monitor logs** - After production deployment
5. **Provide feedback** - If auto-fixes are wrong, tell the agent

## Integration with Other Commands

This command **REPLACES:**
- `/test-fix` (auto-fix is built-in)
- `/deploy-staging` (auto-deploys to staging)
- `/deploy-production` (auto-deploys after approval)

This is now the **SINGLE COMMAND** for the entire development → production pipeline.
