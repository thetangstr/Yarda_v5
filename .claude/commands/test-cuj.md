---
description: Test specific Critical User Journey (CUJ) - verifies end-to-end user flows
---

# Test Critical User Journey (CUJ) - End-to-End Flow Verification

**Purpose:** Verify complete user workflows from start to finish. Tests the real scenarios users experience.

**Usage:** `/test-cuj [cuj-name] [environment] [options]`

## AUTOMATED TEST EXECUTION

**Test File:** `frontend/tests/e2e/all-cujs-automated.spec.ts`

This command now runs **fully automated** Playwright tests (no manual clicking required).

**Current Status:** ✅ **81% Pass Rate** (21/26 tests passing)
- ✅ CUJ1: Registration & Trial Flow - PASSING
- ❌ CUJ2: Language Selection - Needs selector fix
- ✅ CUJ3: Single-Page Generation - PASSING
- ⏭️ CUJ4: Token Purchase - SKIPPED (requires Stripe)
- ⏭️ CUJ5: Subscription - SKIPPED (requires Stripe)
- ❌ CUJ6: Trial Exhaustion - Needs test logic fix
- ✅ CUJ7: Holiday Decorator - PASSING
- ✅ Backend Integration - All passing

## Quick Start

```bash
# Test ALL CUJs (automated)
/test-cuj all

# Test specific CUJ
/test-cuj cuj1                          # Registration & trial
/test-cuj cuj2                          # Language switching
/test-cuj cuj3                          # Generation flow
/test-cuj cuj7                          # Holiday decorator

# Test on different environments
/test-cuj all staging                   # Test all on staging
/test-cuj cuj3 production --verbose     # Test generation on production

# Direct npm commands (for CI/CD)
npm run test:e2e -- tests/e2e/all-cujs-automated.spec.ts
npx playwright test tests/e2e/all-cujs-automated.spec.ts --headed
```

## Available CUJs

### CUJ1: New User Registration & Trial Flow
**Name:** `registration-to-generation` or `cuj1`

**What It Tests:**
- User registers with Google OAuth
- Account created with 3 trial credits
- Redirected to /generate page
- Can submit first generation using trial credit
- Trial credits decrement correctly (3 → 2)
- Receives generation results

**Endpoints Used:**
- `/v1/auth/google` - OAuth login
- `POST /v1/generations` - Submit generation
- `GET /v1/users/payment-status` - Check trial balance

**Expected Result:** ✅ New user flows to first generation seamlessly

**Run:** `/test-cuj registration-to-generation`

---

### CUJ2: Language Selection & Persistence
**Name:** `language-switching-persistence` or `cuj2`

**What It Tests:**
- Login page renders in English by default
- User can access language switcher
- User can select Spanish, then Chinese, then English again
- Each selection persists in localStorage
- Language syncs to backend when user logs in
- Language preference remembered on next login

**Endpoints Used:**
- `GET /v1/users/me/profile` - Fetch saved language preference
- `PUT /v1/users/preferences/language` - Save language preference

**Expected Result:** ✅ Language preference selected, saved locally, synced to backend, persisted

**Run:** `/test-cuj language-switching-persistence`

---

### CUJ3: Generation Flow (Single Page, No Navigation)
**Name:** `single-page-generation` or `cuj3`

**What It Tests:**
- User navigates to /generate page
- User fills in address, selects areas, chooses style
- User submits form without page reload
- Progress updates appear inline (loading animation)
- Polling updates progress every 2 seconds
- Results appear inline when ready
- User can download generated images
- "Create New Design" button resets form for next generation

**UI Elements:**
- Form stays visible while polling (no navigation)
- Progress cards show per-area status
- Results gallery appears below progress
- No page refresh or navigation
- User can create new design immediately

**Expected Result:** ✅ Generation flow works entirely on one page without navigation

**Run:** `/test-cuj single-page-generation`

---

### CUJ4: Token Purchase via Stripe
**Name:** `token-purchase-flow` or `cuj4`

**What It Tests:**
- User clicks "Purchase Tokens" button
- Shown available packages and pricing
- User selects package
- Stripe Checkout session created
- User fills payment details (test card: 4242 4242 4242 4242)
- Payment succeeds
- Stripe webhook processes payment
- Token balance updates in UI immediately
- User can generate using purchased tokens

**Endpoints Used:**
- `POST /v1/payments/create-checkout-session` - Create Stripe session
- Webhook: `/v1/webhooks/stripe` - Process successful payment
- `GET /v1/users/payment-status` - Check token balance

**Expected Result:** ✅ Payment → Webhook → Tokens in account → Can generate

**Run:** `/test-cuj token-purchase-flow`

---

### CUJ5: Active Subscription Allows Unlimited Generations
**Name:** `subscription-unlimited` or `cuj5`

**What It Tests:**
- User navigates to subscription page
- Subscription plan displayed ($99/month)
- User clicks "Subscribe"
- Redirected to Stripe checkout
- User pays with test card
- Webhook processes subscription
- User receives "Active Subscription" badge in UI
- User can generate unlimited times (no credit cost)
- User can manage subscription via Customer Portal

**Endpoints Used:**
- `POST /v1/payments/create-subscription-session` - Stripe subscription
- Webhook: `/v1/webhooks/stripe` - Process successful subscription
- `GET /v1/users/payment-status` - Returns subscription_tier = "pro"

**Expected Result:** ✅ Subscription active → Unlimited generations → Can manage

**Run:** `/test-cuj subscription-unlimited`

---

### CUJ6: Trial Exhaustion & Purchase Required
**Name:** `trial-exhaustion-purchase` or `cuj6`

**What It Tests:**
- New user starts with 3 trial credits
- User generates 3 designs (3 → 2 → 1 → 0 credits)
- After 3rd generation, trial exhausted modal appears
- Modal shows "You're out of trial credits"
- Modal offers two options:
  1. "Purchase Tokens" (one-time payment)
  2. "Subscribe to Pro" (monthly unlimited)
- User can click through to payment

**Expected Result:** ✅ Trial exhaustion handled gracefully with purchase options

**Run:** `/test-cuj trial-exhaustion-purchase`

---

### CUJ7: Holiday Decorator (Seasonal Feature)
**Name:** `holiday-decorator-flow` or `cuj7`

**What It Tests:**
- User navigates to /holiday during holiday season
- Holiday page displays with Street View rotation
- User rotates Street View, selects decoration style
- User submits decoration generation
- Atomic credit deduction happens before generation
- Generation starts, user polls for status
- Decorated image returned
- User sees before/after comparison
- User can share on social media
- Sharing grants bonus credit (if available)

**Endpoints Used:**
- `POST /v1/holiday/generations` - Submit decoration
- `GET /v1/holiday/generations/{id}` - Check status
- `GET /v1/holiday/credits` - Check balance
- Social share webhook (optional)

**Expected Result:** ✅ Holiday decorator complete with credit deduction and sharing bonuses

**Run:** `/test-cuj holiday-decorator-flow`

---

## Parameters

### CUJ Name (Required)
Use the full name, short name, or CUJ number:

```bash
/test-cuj registration-to-generation          # Full name
/test-cuj cuj1                                # CUJ number
/test-cuj single-page-generation              # Another CUJ
```

### Environment (Optional, Default: `local`)
Where to run CUJ test:

```bash
/test-cuj token-purchase-flow local          # Against localhost
/test-cuj subscription-unlimited staging      # Against staging preview
/test-cuj holiday-decorator production         # Against production (caution!)
```

### Options

```bash
--verbose                # Show all test output and details
--ui                     # Interactive UI mode for debugging
--headed                 # Show browser during test
--debug                  # Print debugging information
--real-payment           # Use real payment (NOT RECOMMENDED in test environment)
--no-cleanup             # Don't clean up test data afterward
```

## How It Works

### Agent Behavior

1. **Identify CUJ** - Parse CUJ name/number
2. **Extract requirements** - Determine which tests verify this CUJ
3. **Run tests sequentially** - Tests run in order (user journey order)
4. **Track state** - Maintain state across tests (user logged in, token balance, etc.)
5. **Generate report** - Show pass/fail with detailed step-by-step results
6. **Provide guidance** - Explain what's broken if any steps fail

### Execution Order

CUJ tests run in **user journey order** (not alphabetical):

```
CUJ1: Registration
  → Auth endpoint
  → User creation
  → Trial credit assignment
  → Redirect to /generate

CUJ2: Language Selection (on any auth page)
  → See language switcher
  → Select language
  → Preference persists locally
  → Syncs to backend

CUJ3: Generation
  → Fill form
  → Submit
  → Poll status
  → Receive results

CUJ4: Token Purchase
  → Click purchase
  → Select package
  → Checkout
  → Confirm payment
  → Webhook processes
  → Balance updates

CUJ5: Subscription
  → Similar to CUJ4
  → But subscription instead of one-time tokens
```

## Example Workflows

### Workflow 1: Pre-Launch CUJ Verification

```bash
# You: About to launch new version, want to verify all critical flows
/test-cuj registration-to-generation
/test-cuj single-page-generation
/test-cuj token-purchase-flow
/test-cuj subscription-unlimited

# Agent:
✅ CUJ1: Registration → Generation PASSED
   All steps succeeded, new user can generate immediately

✅ CUJ2: Language Switching PASSED
   Language persists locally and syncs to backend

✅ CUJ3: Single-Page Generation PASSED
   Form submission, polling, results all inline (no navigation)

✅ CUJ4: Token Purchase PASSED
   Payment → Webhook → Balance updated → Can generate

✅ CUJ5: Subscription PASSED
   Subscription active, unlimited generations working

📊 SUMMARY
✅ All 5 critical CUJs passed
✅ Ready for production deployment
```

### Workflow 2: Production Issue Investigation

```bash
# You: Users reporting they can't generate after purchase
/test-cuj token-purchase-flow production --verbose

# Agent:
🔍 TESTING TOKEN PURCHASE ON PRODUCTION
Environment: Production (https://yarda.app)
Payment system: Stripe (live mode)

Step 1: Navigate to purchase page
✅ Page loaded

Step 2: Select token package
✅ Package selected

Step 3: Create Stripe checkout session
✅ Session created: cs_test_...

Step 4: Complete payment
✅ Payment succeeded with test card

Step 5: Webhook processes payment
❌ FAILED: Webhook not processing within 5 seconds

⚠️ ISSUE FOUND
Webhook delivery is slow or failing
- Check Railway logs for webhook errors
- Verify Stripe webhook endpoint is registered
- Check DATABASE_URL connectivity on Railway

NEXT STEPS:
1. SSH into Railway backend
2. Check webhook logs: `railway logs backend --service webhook`
3. Verify database connection pool
4. Restart backend if needed
```

### Workflow 3: Staging Verification Before Production Deploy

```bash
# You: Deployed new code to staging, verify all CUJs before production
/test-cuj registration-to-generation staging
/test-cuj single-page-generation staging --verbose

# Agent:
🚀 TESTING CRITICAL PATHS ON STAGING
Environment: Staging Preview (Vercel)
Backend: Railway staging environment

Testing CUJ1: Registration → Generation
  ✅ Auth works
  ✅ User created with 3 trial credits
  ✅ Redirected to /generate
  ✅ Generation submitted successfully
  ✅ Results received

Testing CUJ3: Single-Page Generation
  ✅ Form submission works without navigation
  ✅ Progress updates inline
  ✅ Results display inline
  ✅ "Create New Design" resets form

📊 SUMMARY
✅ All critical CUJs passing on staging
✅ Safe to deploy to production
✅ Estimated impact: 100% of users
```

## CUJ-to-Test Mapping

| CUJ | Tests | Expected Time | Risk Level |
|-----|-------|----------------|-----------|
| CUJ1: Registration | auth.spec.ts, user creation tests | 2-3 min | 🔴 High (new users affected) |
| CUJ2: Language Switching | language-switching.spec.ts | 1-2 min | 🟡 Medium (localization) |
| CUJ3: Single-Page Generation | generation-flow-v2.spec.ts | 3-4 min | 🔴 High (core feature) |
| CUJ4: Token Purchase | purchase-flow.spec.ts | 3-4 min | 🔴 High (revenue feature) |
| CUJ5: Subscription | subscription.spec.ts | 3-4 min | 🔴 High (revenue feature) |
| CUJ6: Trial Exhaustion | trial exhaustion modal tests | 2-3 min | 🟡 Medium (UX improvement) |
| CUJ7: Holiday Decorator | holiday-*.spec.ts | 4-5 min | 🟢 Low (seasonal, isolated) |

## Troubleshooting Guide

### CUJ Fails at Step 3: "Form submission fails"
**Problem:** User can't submit generation form

**Debug:**
```bash
/test-cuj single-page-generation local --ui --headed
```
Watch browser window, check:
- Form fields accessible?
- Submit button clickable?
- Network request sent?
- API response received?

**Common Fixes:**
- Increase timeout: `--timeout 30000`
- Check API connectivity: `/test-specific generation`
- Verify database: `psql $DATABASE_URL -c "SELECT COUNT(*) FROM users"`

### CUJ Fails at Step 5: "Webhook not processing payment"
**Problem:** Payment succeeds but tokens not added

**Debug:**
```bash
# Check webhook logs
railway logs backend --service webhook --since 5m

# Check database for transaction
psql $DATABASE_URL -c "SELECT * FROM token_transactions ORDER BY created_at DESC LIMIT 5"

# Manually trigger webhook
stripe trigger payment_intent.succeeded
```

**Common Fixes:**
- Restart backend: `railway up`
- Check `STRIPE_WEBHOOK_SECRET` matches
- Verify database connection pool is healthy
- Check for database constraints preventing insert

## Integration with Other Commands

**CUJ Testing Flow:**
```bash
1. Finish feature implementation
2. Run affected CUJs: /test-cuj cuj-name
3. If passes → Full test: /test-all-local
4. If passes → Deploy: /test-smart
```

**CUJ as Part of /test-smart:**
```bash
/test-smart
  ↓
1. Local unit tests pass
2. Local CUJs verified
3. Deploy to staging
4. Staging CUJs verified
5. Request human approval
6. Deploy to production
```

## Requirements Met

✅ **User Requirements:**
- Tests understand type of testing needed ✅
- Tests know CUJs to test ✅
- Tests verify complete user journeys ✅
- Environment-aware (local/staging/production) ✅

✅ **CUJ Verification:**
Each CUJ test verifies:
- All steps execute in order
- State preserved between steps
- Expected outcomes achieved
- User can proceed to next CUJ

---

## IMPLEMENTATION

When user runs `/test-cuj [cuj-name]`, execute the following:

```bash
# Parse CUJ name and map to test
cd frontend

# Run specific CUJ test or all
case "$cuj_name" in
  "all")
    npx playwright test tests/e2e/all-cujs-automated.spec.ts
    ;;
  "cuj1"|"registration-to-generation")
    npx playwright test tests/e2e/all-cujs-automated.spec.ts -g "CUJ1"
    ;;
  "cuj2"|"language-switching-persistence")
    npx playwright test tests/e2e/all-cujs-automated.spec.ts -g "CUJ2"
    ;;
  "cuj3"|"single-page-generation")
    npx playwright test tests/e2e/all-cujs-automated.spec.ts -g "CUJ3"
    ;;
  "cuj6"|"trial-exhaustion")
    npx playwright test tests/e2e/all-cujs-automated.spec.ts -g "CUJ6"
    ;;
  "cuj7"|"holiday-decorator")
    npx playwright test tests/e2e/all-cujs-automated.spec.ts -g "CUJ7"
    ;;
  *)
    echo "Unknown CUJ: $cuj_name"
    echo "Available: all, cuj1, cuj2, cuj3, cuj6, cuj7"
    exit 1
    ;;
esac
```

**Environment Configuration:**
- `local`: Uses http://localhost:3000 and http://localhost:8000
- `staging`: Uses Vercel preview URL and Railway staging
- `production`: Uses production URLs (use with caution!)

---

**Integration:** Works with `/test-smart`, `/test-all-local`, `/test-specific`, `/test-bug-fix`

**Command Family:**
- `/test-all-local` - All tests (comprehensive)
- `/test-specific` - Specific feature (focused)
- `/test-cuj` - Critical User Journey (end-to-end) ← You are here
- `/test-bug-fix` - Environment-aware bug workflow
- `/test-smart` - Full CI/CD pipeline
