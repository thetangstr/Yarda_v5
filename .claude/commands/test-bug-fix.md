---
description: Smart bug-fix workflow - environment-aware (local/staging/production), auto-detect where to fix, test, and deploy
---

# Smart Bug Fix Workflow - Environment-Aware Testing

**Goal:** Intelligently detect where the bug exists, fix it, test it appropriately for that environment, and deploy safely.

## Instructions for Agent

You are a smart bug-fix orchestrator that understands production workflows. When a bug is reported, you must:

1. **Detect the environment** where the bug exists (local dev, staging, or production)
2. **Apply smart workflow** based on the environment
3. **Auto-fix and verify** with appropriate testing
4. **Deploy through proper channels** (staging verification before production)

## Environment-Aware Decision Tree

```
START: Bug Reported
│
├─ WHERE IS THE BUG?
│  ├─ Production (user-facing)
│  │  └─ WORKFLOW A: Local Fix → Local Test → Staging Verify → Prod Deploy
│  │
│  ├─ Staging (testing environment)
│  │  └─ WORKFLOW B: Local Fix → Local Test → Staging Test → Auto-Deploy
│  │
│  └─ Local Development
│     └─ WORKFLOW C: Fix → Test → Done
│
└─ END: Bug Fixed & Verified
```

## Workflow A: Production Bug (Most Critical)

**When:** User reports bug in production or you discover it via monitoring

### Phase 1: Diagnose
```
1. Ask: "Where is the bug occurring?"
   - Specific feature (generation, payments, auth)?
   - Specific user action?
   - Error message or behavior?

2. Reproduce locally
   - Set up exact conditions
   - Confirm reproduction
   - Document steps

3. Identify root cause
   - Check backend logs
   - Check frontend console logs
   - Trace through code
```

### Phase 2: Fix Locally
```
1. Create fix branch
   git checkout -b fix/prod-bug-{description}

2. Apply fix to code
   - Make minimal, focused changes
   - Add comments explaining fix

3. Run affected tests locally
   - Tests related to the bug
   - Smoke tests
   - Any dependent features
```

### Phase 3: Local Verification (CRITICAL)
```
1. Run local test suite
   /test-all-local

   Must ensure: ✅ All tests pass
                ✅ No regressions
                ✅ Fix is correct

2. Manual verification (if needed)
   - Reproduce original bug → should be FIXED
   - Test related features → should be WORKING
   - Test edge cases → should HANDLE correctly
```

### Phase 4: Deploy to Staging First (MANDATORY)
```
1. Deploy to staging (NOT production yet)
   /test-smart

   This will:
   - Deploy to staging
   - Run full test suite on staging
   - Auto-fix any staging-specific issues

2. Human verification on staging
   "
   ⚠️ PRODUCTION BUG FIX STAGED

   Bug: [Description]
   Fix: [What was changed]
   Status: Staging ✅ Tests Passed

   BEFORE deploying to production:
   1. Visit staging: [URL]
   2. Reproduce original bug → Should be FIXED
   3. Test related features
   4. Approve for production

   Type 'approve' to deploy to production
   "

3. Wait for human approval
   - User must manually verify fix works in staging
   - User must test edge cases
   - User must confirm deployment to production
```

### Phase 5: Production Deployment (After Approval)
```
1. Merge and deploy
   /test-smart

   When prompted: YES → Deploy to production

2. Verify in production
   - Run production smoke tests
   - Monitor error logs
   - Verify original bug is fixed

3. Final report
   "
   ✅ PRODUCTION BUG FIX DEPLOYED

   Bug: [Description]
   Fix: [What was changed]
   Staging Verified: ✅
   Production Status: ✅ Live

   Bug is now fixed in production.
   "
```

## Workflow B: Staging Bug (Semi-Critical)

**When:** Bug found in staging environment

### Phase 1-2: Diagnose & Fix (Same as Workflow A)

### Phase 3: Verify Locally (CRITICAL)
```
1. Run full local test suite
   /test-all-local

   Must ensure: ✅ All tests pass
```

### Phase 4: Deploy to Staging (Auto)
```
1. Push fix to current branch
   git push origin fix/staging-bug-{description}

2. Auto-deploy to staging with tests
   /test-smart

   Will automatically:
   - Deploy to staging
   - Run full test suite
   - Report results

3. Auto-verification
   - If all tests pass → DONE ✅
   - If tests fail → Auto-fix or ask for help
```

## Workflow C: Local Development Bug (Lowest Priority)

**When:** Bug only exists in your local dev environment

### Phase 1-2: Diagnose & Fix

### Phase 3: Test Locally (Simple)
```
1. Run affected tests only
   npx playwright test {affected-test}.spec.ts

2. Or run specific test
   npx playwright test -k "test name"

3. Done ✅
```

## Auto-Detection Logic

When user says: "There's a bug"

Agent should ask and determine:

```python
# Determine where bug is
if "production" in bug_description or "live" in bug_description or "user reported":
    workflow = WORKFLOW_A  # Production
elif "staging" in bug_description or "preview" in bug_description:
    workflow = WORKFLOW_B  # Staging
else:
    workflow = WORKFLOW_C  # Local

# Then apply appropriate workflow
apply_workflow(workflow)
```

## Testing Strategy by Environment

### Production Bug Testing
- ✅ **Local:** Full test suite MUST pass
- ✅ **Staging:** Full test suite MUST pass + Human verification
- ✅ **Production:** Smoke tests + Manual verification

### Staging Bug Testing
- ✅ **Local:** Full test suite MUST pass
- ✅ **Staging:** Automatic (tests run, auto-deploy if pass)

### Local Bug Testing
- ✅ **Local:** Affected tests MUST pass

## Bug Report Format

When user reports a bug, ask for:

```
✅ REQUIRED INFORMATION:
- What's the bug? (Be specific)
- Where does it occur? (production/staging/local)
- How to reproduce it? (Step-by-step)
- Expected behavior? (What should happen)
- Actual behavior? (What does happen)
- Error message? (If any)

OPTIONAL BUT HELPFUL:
- Browser/OS? (For frontend bugs)
- User account? (If specific user affected)
- When did it start? (Today/yesterday/last week)
```

## Communication Throughout Process

### Diagnostic Phase
```
🔍 ANALYZING BUG
- Determining environment
- Reproducing issue
- Identifying root cause
```

### Fix Phase
```
🔧 APPLYING FIX
- Modified: [Files changed]
- Testing: [Tests running]
```

### Verification Phase
```
✅ LOCAL VERIFICATION
- Tests: 47/47 passed ✅
- No regressions detected ✅
```

### Staging Phase (Production bugs only)
```
🚀 DEPLOYING TO STAGING
- Frontend: ✅ Deployed
- Backend: ✅ Deployed
- Tests: 47/47 passed ✅

⏸️ AWAITING HUMAN VERIFICATION
- Visit staging URL
- Reproduce original bug → Should be FIXED
- Approve for production deployment
```

### Production Phase
```
🚀 DEPLOYING TO PRODUCTION
- Merged to main
- Deployed to production
- Smoke tests: 12/12 passed ✅

✅ BUG FIX LIVE IN PRODUCTION
```

## Error Handling

### If Local Tests Fail
```
❌ Local tests failed after fix

Possible causes:
1. Fix introduced new bug
2. Didn't consider edge cases
3. Affected unexpected tests

ACTION:
- Analyze failing tests
- Revise fix
- Retry: /test-bug-fix
```

### If Staging Tests Fail
```
❌ Staging tests failed

Possible causes:
1. Environment-specific issue
2. Database state different
3. External API integration issue

ACTION:
- Check staging environment
- Review staging-specific variables
- Retry: /test-bug-fix
```

### If Human Verification Finds Issue
```
❌ Human found issue in staging

Your feedback:
[User describes issue found]

ACTION:
- Apply additional fix
- Re-test locally
- Re-deploy to staging
- Request human re-verification
```

## Tips for Maximum Success

1. **Document the bug clearly** - More details = faster fix
2. **Reproduce before fixing** - Never fix blind
3. **Trust the tests** - If tests pass, code is good
4. **Staging first for production** - Never push untested to prod
5. **Approval gate matters** - Human eyes before production

## Integration with Other Commands

This command **WORKS WITH:**
- `/test-smart` - For auto-testing & deployment
- `/test-all-local` - For comprehensive local verification
- `/test-specific` - For testing specific features affected by bug

This command **REPLACES:**
- Manual bug fix workflows
- Guessing at deployment safety
- Testing without automation
