# Stripe Payment E2E Testing Guide

**Date:** 2025-11-06
**Status:** Ready for Testing
**Environment:** Local (localhost:8000, localhost:3000)
**Infrastructure:** ✅ All systems operational

---

## Prerequisites Checklist

Before starting, verify all infrastructure is ready:

```bash
# 1. Backend running
curl http://localhost:8000/docs
# Expected: 200 OK (FastAPI docs page)

# 2. Frontend running
curl http://localhost:3000
# Expected: 200 OK (Next.js page)

# 3. Stripe webhook listener active
ps aux | grep "stripe listen" | grep -v grep
# Expected: Process running (PID: 29760)

# 4. Webhook secret configured
grep STRIPE_WEBHOOK_SECRET backend/.env
# Expected: whsec_d262bfda976a9f2bae27d6f2655fb0f3bce3fc79130e1e6dfd5547de837ec321

# 5. Test accounts seeded
cd backend && python tests/seed_test_accounts.py
# Expected: 5 accounts listed
```

**If all checks pass:** ✅ Ready to test

---

## TC-2.1: Token Purchase Flow (Stripe Checkout)

**Duration:** 5-10 minutes
**Test Account:** test+exhausted@yarda.ai (ID: d8e86fbd-045d-422f-94e2-c6aa3f6a7b92)
**Prerequisites:** User has 0 trial credits, 0 tokens

### Step 1: Login as Exhausted User

1. Navigate to: http://localhost:3000
2. Click "Sign In"
3. Login via Supabase with: `test+exhausted@yarda.ai`
4. Verify user is logged in (check navigation bar)

**Screenshot:** `tc-2-1-step-1-logged-in.png`

---

### Step 2: Verify Zero Balance

1. Navigate to: http://localhost:3000/generate
2. Check payment status indicator
3. Verify displays: "No Credits Available" or "0 trial credits, 0 tokens"
4. Verify "Generate" button is disabled or shows "Purchase Tokens"

**SQL Verification:**
```sql
-- Check user balance
SELECT trial_remaining, subscription_tier, subscription_status
FROM users
WHERE id = 'd8e86fbd-045d-422f-94e2-c6aa3f6a7b92';
-- Expected: trial_remaining = 0, subscription_tier = NULL, subscription_status = 'inactive'

-- Check token balance
SELECT balance
FROM users_token_accounts
WHERE user_id = 'd8e86fbd-045d-422f-94e2-c6aa3f6a7b92';
-- Expected: 0 OR no row (account doesn't exist yet)
```

**Screenshot:** `tc-2-1-step-2-zero-balance.png`

---

### Step 3: Navigate to Token Purchase Page

1. Click "Purchase Tokens" button OR navigate to: http://localhost:3000/purchase
2. Verify token packages are displayed
3. Expected packages:
   - Starter: 20 tokens for $29
   - Standard: 50 tokens for $69
   - Pro: 100 tokens for $129
   - Enterprise: 500 tokens for $599

**Screenshot:** `tc-2-1-step-3-purchase-page.png`

---

### Step 4: Initiate Stripe Checkout

1. Select "Starter" package (20 tokens, $29)
2. Click "Buy Now" button
3. Wait for redirect to Stripe Checkout
4. Verify Stripe checkout page loads with:
   - Correct package name
   - Correct amount ($29.00)
   - Test mode indicator

**Screenshot:** `tc-2-1-step-4-stripe-checkout.png`

---

### Step 5: Complete Payment with Test Card

Fill in Stripe test card details:
```
Card Number:    4242 4242 4242 4242
Expiry:         12/25 (any future date)
CVC:            123 (any 3 digits)
ZIP:            12345 (any 5 digits)
Name:           Test User
```

Click "Pay"

**Expected:** Redirect to success page or back to application

**Screenshot:** `tc-2-1-step-5-payment-completed.png`

---

### Step 6: Verify Webhook Received

**Terminal:**
```bash
# Watch webhook log in real-time
tail -f /tmp/stripe_webhook.log

# Expected output:
# --> checkout.session.completed [evt_...]
# <-- [200] POST http://localhost:8000/v1/webhooks/stripe [evt_...]
```

**Look for:**
- ✅ Event type: `checkout.session.completed`
- ✅ HTTP 200 response from backend
- ✅ No errors in webhook processing

**Screenshot:** `tc-2-1-step-6-webhook-received.png`

---

### Step 7: Verify Token Balance Updated

1. Navigate back to: http://localhost:3000/generate
2. Check payment status indicator
3. Verify displays: "20 tokens available"

**SQL Verification:**
```sql
-- Check token account created and balance updated
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
-- Expected:
--   amount = 20
--   type = 'purchase'
--   balance_after = 20
--   stripe_payment_intent_id = 'pi_...' (not NULL)
```

**Screenshot:** `tc-2-1-step-7-balance-updated.png`

---

### Step 8: Verify Idempotency (Optional)

**Purpose:** Ensure duplicate webhook calls don't create duplicate credits

**Test Procedure:**
1. Manually trigger webhook again using Stripe CLI:
   ```bash
   stripe trigger checkout.session.completed
   ```

2. Check token balance remains unchanged:
   ```sql
   SELECT balance FROM users_token_accounts
   WHERE user_id = 'd8e86fbd-045d-422f-94e2-c6aa3f6a7b92';
   -- Expected: Still 20 (not 40)
   ```

3. Check transaction count:
   ```sql
   SELECT COUNT(*) FROM users_token_transactions
   WHERE user_id = 'd8e86fbd-045d-422f-94e2-c6aa3f6a7b92';
   -- Expected: Still 1 (not 2)
   ```

**Result:** ✅ Idempotency working if balance doesn't increase

---

## TC-2.2: Token Deduction Before Generation

**Duration:** 5-10 minutes
**Test Account:** test+tokens@yarda.ai (ID: 655c468d-7623-46b7-82f2-75c99977633b)
**Prerequisites:** User has 0 trial credits, 50 tokens

### Step 1: Login as Token User

1. Logout if logged in as different user
2. Navigate to: http://localhost:3000
3. Login via Supabase with: `test+tokens@yarda.ai`
4. Verify user is logged in

**Screenshot:** `tc-2-2-step-1-logged-in-tokens.png`

---

### Step 2: Verify Initial Token Balance

1. Navigate to: http://localhost:3000/generate
2. Check payment status indicator
3. Verify displays: "50 tokens available"
4. Verify "Generate" button is enabled

**SQL Verification:**
```sql
SELECT balance FROM users_token_accounts
WHERE user_id = '655c468d-7623-46b7-82f2-75c99977633b';
-- Expected: balance = 50
```

**Screenshot:** `tc-2-2-step-2-initial-balance-50.png`

---

### Step 3: Fill Generation Form

1. Enter address: `1600 Amphitheatre Parkway, Mountain View, CA`
2. Wait for Google Maps autocomplete
3. Select address from dropdown OR press Enter
4. Select area: "Front Yard"
5. Select style: "Modern Minimalist"
6. (Optional) Add custom prompt: "Include native California plants"
7. Verify "Generate Landscape Design" button is enabled

**Screenshot:** `tc-2-2-step-3-form-filled.png`

---

### Step 4: Submit Generation

1. Click "Generate Landscape Design" button
2. Verify immediate redirect to progress page: `/generate/progress/[id]`
3. Note the generation ID from URL

**Screenshot:** `tc-2-2-step-4-generation-started.png`

---

### Step 5: Verify Immediate Token Deduction

**CRITICAL:** Token must be deducted BEFORE generation completes

1. Open new browser tab
2. Navigate to: http://localhost:3000/generate
3. Check payment status indicator
4. **Expected:** "49 tokens available" (decremented from 50)

**SQL Verification (Immediate):**
```sql
-- Check token balance (should be 49 IMMEDIATELY after submission)
SELECT balance FROM users_token_accounts
WHERE user_id = '655c468d-7623-46b7-82f2-75c99977633b';
-- Expected: balance = 49 (NOT 50)

-- Check deduction transaction recorded
SELECT amount, type, description, balance_after
FROM users_token_transactions
WHERE user_id = '655c468d-7623-46b7-82f2-75c99977633b'
ORDER BY created_at DESC
LIMIT 1;
-- Expected:
--   amount = -1 (negative for deduction)
--   type = 'deduction'
--   balance_after = 49
```

**Screenshot:** `tc-2-2-step-5-token-decremented-49.png`

---

### Step 6: Verify Generation Status

1. Return to progress page tab
2. Verify status updates:
   - Initial: "Pending" (0% progress)
   - Then: "Processing" (progress increases)
   - Final: "Completed" (100% progress)
3. Verify generated images are displayed

**SQL Verification:**
```sql
-- Check generation record
SELECT id, status, payment_type, tokens_deducted
FROM generations
WHERE user_id = '655c468d-7623-46b7-82f2-75c99977633b'
ORDER BY created_at DESC
LIMIT 1;
-- Expected:
--   status = 'completed' OR 'processing'
--   payment_type = 'token'
--   tokens_deducted = 1
```

**Screenshot:** `tc-2-2-step-6-generation-completed.png`

---

### Step 7: Verify Final Token Balance

1. Navigate to: http://localhost:3000/generate
2. Verify balance remains: "49 tokens available"
3. Verify no additional deduction occurred

**SQL Verification:**
```sql
-- Final balance check
SELECT balance FROM users_token_accounts
WHERE user_id = '655c468d-7623-46b7-82f2-75c99977633b';
-- Expected: balance = 49

-- Transaction history (should show only 1 deduction)
SELECT amount, type, created_at
FROM users_token_transactions
WHERE user_id = '655c468d-7623-46b7-82f2-75c99977633b'
  AND type = 'deduction'
ORDER BY created_at DESC;
-- Expected: Only 1 recent deduction of -1 token
```

**Screenshot:** `tc-2-2-step-7-final-balance-49.png`

---

## Additional Test Cases (Optional)

### TC-2.4: Token Refund on Generation Failure

**Prerequisites:** Requires backend API mocking (not yet implemented)

**Manual Test (If backend supports failure injection):**
1. Login as test+tokens@yarda.ai
2. Set backend to force failure: `POST /test/force-failure { "enabled": true }`
3. Submit generation
4. Wait for failure status
5. Verify token refunded (balance returns to 50)
6. Verify refund transaction recorded

**SQL Verification:**
```sql
-- Check for refund transaction
SELECT amount, type, description
FROM users_token_transactions
WHERE user_id = '655c468d-7623-46b7-82f2-75c99977633b'
  AND type = 'refund'
ORDER BY created_at DESC
LIMIT 1;
-- Expected: amount = 1, type = 'refund'
```

---

## Troubleshooting

### Issue: Stripe webhook not received

**Symptoms:**
- Token balance doesn't update after payment
- No webhook log entry

**Check:**
1. Stripe listener running: `ps aux | grep "stripe listen"`
2. Webhook secret matches: `grep STRIPE_WEBHOOK_SECRET backend/.env`
3. Backend webhook endpoint accessible: `curl -X POST http://localhost:8000/v1/webhooks/stripe`

**Fix:**
```bash
# Restart Stripe listener
pkill -f "stripe listen"
stripe listen --forward-to http://localhost:8000/v1/webhooks/stripe
```

---

### Issue: Token balance not updating

**Symptoms:**
- Webhook received but balance remains 0

**Check:**
1. Backend logs for errors: `tail -f /tmp/yarda_backend.log`
2. Database connection: `psql $DATABASE_URL -c "SELECT 1"`
3. User token account exists:
   ```sql
   SELECT * FROM users_token_accounts
   WHERE user_id = 'd8e86fbd-045d-422f-94e2-c6aa3f6a7b92';
   ```

**Fix:**
```bash
# Check backend logs for specific error
cat /tmp/yarda_backend.log | grep -i error | tail -20
```

---

### Issue: Payment intent idempotency not working

**Symptoms:**
- Duplicate webhook calls create duplicate credits

**Check:**
1. Verify `stripe_payment_intent_id` is stored:
   ```sql
   SELECT stripe_payment_intent_id
   FROM users_token_transactions
   WHERE user_id = 'd8e86fbd-045d-422f-94e2-c6aa3f6a7b92';
   -- Should NOT be NULL
   ```

2. Check for unique constraint on payment_intent_id:
   ```sql
   \d users_token_transactions
   -- Look for UNIQUE constraint on stripe_payment_intent_id
   ```

---

## Test Results Template

**TC-2.1: Token Purchase Flow**
- [  ] Step 1: Login successful
- [  ] Step 2: Zero balance verified
- [  ] Step 3: Purchase page displayed correctly
- [  ] Step 4: Stripe checkout loaded
- [  ] Step 5: Payment completed successfully
- [  ] Step 6: Webhook received and processed (HTTP 200)
- [  ] Step 7: Token balance updated to 20
- [  ] Step 8: Idempotency verified (optional)

**Overall Result:** ⬜ PASS / ⬜ FAIL

---

**TC-2.2: Token Deduction Before Generation**
- [  ] Step 1: Login successful
- [  ] Step 2: Initial balance 50 verified
- [  ] Step 3: Generation form filled correctly
- [  ] Step 4: Generation submitted successfully
- [  ] Step 5: Token decremented IMMEDIATELY to 49
- [  ] Step 6: Generation completed successfully
- [  ] Step 7: Final balance remains 49

**Overall Result:** ⬜ PASS / ⬜ FAIL

---

## Summary

**Infrastructure Status:**
- ✅ Stripe webhook forwarding active (PID: 29760)
- ✅ Test accounts seeded (5 accounts)
- ✅ Backend running (PID: 98635)
- ✅ Frontend running (PID: 509)

**Test Cases Ready:**
- ✅ TC-2.1: Token Purchase Flow (Manual E2E)
- ✅ TC-2.2: Token Deduction Before Generation (Manual E2E)
- ⏭️ TC-2.4: Token Refund on Failure (Blocked - requires API mocking)

**Estimated Testing Time:** 15-20 minutes for both test cases

---

**Test Guide Created:** 2025-11-06
**Prepared By:** Claude Code
**Environment:** Local (localhost)
**Next Step:** Execute manual tests and document results
