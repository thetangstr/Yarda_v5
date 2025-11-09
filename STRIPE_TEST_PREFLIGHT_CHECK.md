# Stripe Payment Testing - Pre-Flight Check ✅

**Date:** 2025-11-06
**Status:** All systems operational
**Ready for:** Manual E2E testing

---

## Infrastructure Status ✅

### ✅ Backend API
```
URL:      http://localhost:8000
Status:   200 OK
PID:      98635
Endpoint: /docs accessible
```

### ✅ Frontend Application
```
URL:      http://localhost:3000
Status:   200 OK
PID:      509
```

### ✅ Stripe Webhook Forwarding
```
Process:  stripe listen --forward-to http://localhost:8000/v1/webhooks/stripe
PID:      29760
Status:   Active and listening
Secret:   whsec_d262bfda976a9f2bae27d6f2655fb0f3bce3fc79130e1e6dfd5547de837ec321
```

### ✅ Test Accounts Seeded
```
Database: Supabase (gxlmnjnjvlslijiowamn)
Accounts: 5 test accounts verified

1. test+trial@yarda.ai
   ID: 301dd4e9-7866-43d5-8550-dc64ff6d1fa2
   Trial: 3/3 credits
   Tokens: 0
   Purpose: Trial flow testing

2. test+exhausted@yarda.ai
   ID: d8e86fbd-045d-422f-94e2-c6aa3f6a7b92
   Trial: 0/3 credits (exhausted)
   Tokens: 0
   Purpose: Token purchase testing (TC-2.1)

3. test+tokens@yarda.ai
   ID: 655c468d-7623-46b7-82f2-75c99977633b
   Trial: 0/3 credits
   Tokens: 50
   Purpose: Token deduction testing (TC-2.2)

4. test+subscriber@yarda.ai
   ID: 26c3bd34-d808-45a9-81a8-07e1c3166c3a
   Trial: 0/3 credits
   Tokens: 0
   Subscription: monthly_pro (active)
   Purpose: Subscription flow testing

5. test+rich@yarda.ai
   ID: b0355f7d-6553-460b-8484-3124383ef5b0
   Trial: 0/3 credits
   Tokens: 500
   Subscription: monthly_pro (active)
   Purpose: Multi-payment method testing
```

---

## Test Execution Plan

### TC-2.1: Token Purchase Flow (20-25 min)

**Prerequisites:** ✅ All verified
**Test Account:** test+exhausted@yarda.ai (ID: d8e86fbd-045d-422f-94e2-c6aa3f6a7b92)
**Guide:** [STRIPE_PAYMENT_TEST_GUIDE.md](STRIPE_PAYMENT_TEST_GUIDE.md) (Lines 40-208)

**Quick Steps:**
1. Login at http://localhost:3000 with test+exhausted@yarda.ai
2. Navigate to http://localhost:3000/purchase
3. Select "Starter" package (20 tokens, $29)
4. Complete Stripe checkout with test card: `4242 4242 4242 4242`
5. Monitor webhook: `tail -f /tmp/stripe_webhook.log`
6. Verify balance updated to 20 tokens

**SQL Verification:**
```sql
-- Check token balance after purchase
SELECT balance, created_at, updated_at
FROM users_token_accounts
WHERE user_id = 'd8e86fbd-045d-422f-94e2-c6aa3f6a7b92';
-- Expected: balance = 20

-- Check transaction recorded
SELECT amount, type, description, balance_after, stripe_payment_intent_id
FROM users_token_transactions
WHERE user_id = 'd8e86fbd-045d-422f-94e2-c6aa3f6a7b92'
ORDER BY created_at DESC
LIMIT 1;
-- Expected: amount = 20, type = 'purchase', stripe_payment_intent_id NOT NULL
```

---

### TC-2.2: Token Deduction Before Generation (15-20 min)

**Prerequisites:** ✅ All verified
**Test Account:** test+tokens@yarda.ai (ID: 655c468d-7623-46b7-82f2-75c99977633b)
**Guide:** [STRIPE_PAYMENT_TEST_GUIDE.md](STRIPE_PAYMENT_TEST_GUIDE.md) (Lines 210-352)

**Quick Steps:**
1. Login at http://localhost:3000 with test+tokens@yarda.ai
2. Navigate to http://localhost:3000/generate
3. Verify payment status shows "50 tokens available"
4. Submit generation: 1600 Amphitheatre Parkway, Front Yard, Modern Minimalist
5. **IMMEDIATELY** check balance (< 1 second after submission)
6. Verify token decremented to 49 (atomic deduction)
7. Wait for generation to complete
8. Verify balance remains 49 (no double deduction)

**SQL Verification (Immediate - within 1 second of submission):**
```sql
-- Check token balance IMMEDIATELY after submission
SELECT balance FROM users_token_accounts
WHERE user_id = '655c468d-7623-46b7-82f2-75c99977633b';
-- Expected: balance = 49 (NOT 50)

-- Check deduction transaction
SELECT amount, type, description, balance_after
FROM users_token_transactions
WHERE user_id = '655c468d-7623-46b7-82f2-75c99977633b'
ORDER BY created_at DESC
LIMIT 1;
-- Expected: amount = -1, type = 'deduction', balance_after = 49
```

---

## Critical Testing Notes

### 🔴 CRITICAL: Test Token Deduction Timing
**Why Important:** This verifies that tokens are deducted BEFORE generation starts, not after completion.

**How to Test:**
1. Submit generation request
2. **IMMEDIATELY** (< 1 second) run SQL query to check balance
3. Balance MUST be decremented to 49 before generation completes
4. If balance is still 50, this indicates a critical bug (deduction happening after completion)

**Expected Timeline:**
```
T+0s:   User clicks "Generate" button
T+0.1s: Token deducted (balance: 50 → 49) ✅ CRITICAL CHECK
T+0.2s: Generation status: "Pending"
T+3s:   Generation status: "Processing"
T+30s:  Generation status: "Completed"
T+30s:  Balance still 49 (no change) ✅ Verify no double deduction
```

---

### 🟡 IMPORTANT: Webhook Verification
**Why Important:** Ensures Stripe payment events are received and processed correctly.

**How to Monitor:**
```bash
# Terminal 1: Watch webhook logs in real-time
tail -f /tmp/stripe_webhook.log

# Expected output after payment:
# --> checkout.session.completed [evt_...]
# <-- [200] POST http://localhost:8000/v1/webhooks/stripe [evt_...]
```

**What to Look For:**
- ✅ Event type: `checkout.session.completed`
- ✅ HTTP 200 response (success)
- ✅ No error messages in log
- ❌ If 400/500 error: Check backend logs at `/tmp/yarda_backend.log`

---

### 🟢 OPTIONAL: Idempotency Testing
**Why Important:** Ensures duplicate webhook calls don't create duplicate credits.

**How to Test:**
```bash
# After TC-2.1 completes successfully:
stripe trigger checkout.session.completed

# Then verify balance unchanged:
# Expected: Still 20 tokens (not 40)
```

---

## Authentication Setup Required

⚠️ **IMPORTANT:** The test accounts exist in the database but may not have Supabase Auth credentials.

### Option 1: Use Existing Authenticated Session
If you're currently logged in to http://localhost:3000:
1. Check which user you're logged in as
2. Verify that user has the correct balance state for testing
3. Proceed with tests using current session

### Option 2: Create Supabase Auth Accounts
For each test account that needs authentication:
```bash
# Use Supabase dashboard or Auth API to create accounts:
# 1. Go to https://supabase.com/dashboard/project/gxlmnjnjvlslijiowamn/auth/users
# 2. Click "Add user"
# 3. Email: test+exhausted@yarda.ai
# 4. Password: [choose a test password]
# 5. Confirm email automatically
```

### Option 3: Use Magic Link (Passwordless)
If Supabase Auth supports magic links:
1. Request magic link for test+exhausted@yarda.ai
2. Check MailHog at http://localhost:8025 for email
3. Click link to authenticate

---

## Quick Start Commands

### Start All Services
```bash
# Backend (if not running)
cd /Volumes/home/Projects_Hosted/Yarda_v5/backend
source venv/bin/activate
uvicorn src.main:app --reload --port 8000

# Frontend (if not running)
cd /Volumes/home/Projects_Hosted/Yarda_v5/frontend
npm run dev

# Stripe webhook (if not running)
stripe listen --forward-to http://localhost:8000/v1/webhooks/stripe
```

### Monitor Logs
```bash
# Terminal 1: Backend logs
tail -f /tmp/yarda_backend.log

# Terminal 2: Frontend logs
tail -f /tmp/yarda_frontend.log

# Terminal 3: Stripe webhook logs
tail -f /tmp/stripe_webhook.log
```

### Database Queries
```bash
# Connect to database
psql $DATABASE_URL

# Or via Supabase MCP (recommended)
# Use mcp__supabase__execute_sql tool
```

---

## Test Results Template

### TC-2.1: Token Purchase Flow
- [ ] Step 1: Login successful (test+exhausted@yarda.ai)
- [ ] Step 2: Zero balance verified (0 trial, 0 tokens)
- [ ] Step 3: Purchase page displays 4 token packages
- [ ] Step 4: Stripe checkout loaded with correct amount ($29)
- [ ] Step 5: Payment completed with test card 4242 4242 4242 4242
- [ ] Step 6: Webhook received (checkout.session.completed, HTTP 200)
- [ ] Step 7: Token balance updated to 20
- [ ] Step 8: Transaction recorded with stripe_payment_intent_id

**Result:** ⬜ PASS / ⬜ FAIL

**Notes:**
```
[Record any observations, errors, or screenshots here]
```

---

### TC-2.2: Token Deduction Before Generation
- [ ] Step 1: Login successful (test+tokens@yarda.ai)
- [ ] Step 2: Initial balance 50 verified
- [ ] Step 3: Generation form filled (1600 Amphitheatre Parkway, Front Yard, Modern)
- [ ] Step 4: Generation submitted successfully
- [ ] Step 5: Token decremented IMMEDIATELY to 49 (< 1 second)
- [ ] Step 6: Generation completed successfully
- [ ] Step 7: Final balance remains 49 (no double deduction)

**Result:** ⬜ PASS / ⬜ FAIL

**Notes:**
```
[Record timing observations, SQL query results, generation ID]
```

---

## Expected Outcomes

### If All Tests Pass ✅
- **Test Coverage:** 10/13 test cases (77%)
- **Confidence Level:** HIGH for payment integration
- **Production Readiness:** Payment flows verified and ready for staging/production
- **Next Steps:**
  1. Update TEST_PLAN.md with results
  2. Create final test report (TEST_SESSION_STRIPE_PAYMENT_20251106.md)
  3. Proceed with deployment preparation

### If Tests Fail ❌
**Common Issues:**

1. **Webhook not received:**
   - Check: `ps aux | grep "stripe listen"`
   - Fix: Restart Stripe CLI listener
   - Verify: Backend endpoint accessible at http://localhost:8000/v1/webhooks/stripe

2. **Token balance not updating:**
   - Check: Backend logs (`/tmp/yarda_backend.log`)
   - Verify: Database connection working
   - Check: User token account exists (may need to create)

3. **Token deduction timing wrong:**
   - Critical bug if deduction happens AFTER generation
   - Check: Generation submission endpoint logic
   - Verify: Deduction happens in transaction BEFORE async generation starts

---

## Documentation References

- **Full Testing Guide:** [STRIPE_PAYMENT_TEST_GUIDE.md](STRIPE_PAYMENT_TEST_GUIDE.md)
- **Test Plan:** [TEST_PLAN.md](TEST_PLAN.md#cuj-2-token-purchase-flow)
- **Phase 2 Complete:** [PHASE_2_COMPLETE.md](PHASE_2_COMPLETE.md)
- **Infrastructure Setup:** [PHASE_1_INFRASTRUCTURE_COMPLETE.md](PHASE_1_INFRASTRUCTURE_COMPLETE.md)

---

## Pre-Flight Checklist ✅

- ✅ Backend API running (localhost:8000)
- ✅ Frontend running (localhost:3000)
- ✅ Stripe webhook forwarding active (PID 29760)
- ✅ Webhook secret configured (whsec_d262...)
- ✅ Test accounts seeded (5 accounts)
- ✅ MailHog running (localhost:8025)
- ✅ Database accessible (Supabase)
- ⚠️ Test account authentication (needs setup)

**Overall Status:** ✅ **READY FOR MANUAL TESTING**

---

**Created:** 2025-11-06
**By:** Claude Code
**Next Step:** Execute TC-2.1 and TC-2.2 following STRIPE_PAYMENT_TEST_GUIDE.md
