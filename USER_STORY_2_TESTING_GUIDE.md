# User Story 2: Token Purchase System - Testing Guide

**Status**: Ready for Testing
**Date**: 2025-11-03

---

## 🧪 Testing Checklist

Before we can test User Story 2, we need to complete these setup steps:

### ✅ Prerequisites

1. **Database Migrations** ⚠️ REQUIRED
   - [ ] Create migration for `users_token_accounts` table
   - [ ] Create migration for `users_token_transactions` table
   - [ ] Apply migrations to Supabase

2. **Stripe Configuration** ⚠️ REQUIRED
   - [ ] Get Stripe test API keys
   - [ ] Configure environment variables
   - [ ] Set up webhook endpoint (for local testing: use Stripe CLI)

3. **Environment Variables** ⚠️ REQUIRED
   - [ ] Backend: Add Stripe keys to `.env`
   - [ ] Frontend: Add API URL to `.env.local`

4. **Backend Server** ⚠️ REQUIRED
   - [ ] Install Python dependencies
   - [ ] Start FastAPI server
   - [ ] Verify server is running

5. **Frontend Server** ⚠️ REQUIRED
   - [ ] Install Node dependencies (currently running)
   - [ ] Start Next.js dev server
   - [ ] Verify frontend is running

---

## 🔧 Setup Steps

### Step 1: Create Database Migrations

We need to create two migration files in Supabase:

#### Migration 1: Create Token Accounts Table

```sql
-- supabase/migrations/[timestamp]_create_token_accounts.sql

-- Create token accounts table
CREATE TABLE IF NOT EXISTS users_token_accounts (
    user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    balance INT NOT NULL DEFAULT 0 CHECK (balance >= 0),
    total_purchased INT NOT NULL DEFAULT 0 CHECK (total_purchased >= 0),
    total_spent INT NOT NULL DEFAULT 0 CHECK (total_spent >= 0),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_token_accounts_user_id ON users_token_accounts(user_id);

-- Add RLS policies
ALTER TABLE users_token_accounts ENABLE ROW LEVEL SECURITY;

-- Users can only view their own token account
CREATE POLICY "Users can view own token account"
    ON users_token_accounts
    FOR SELECT
    USING (auth.uid() = user_id);

-- Add comment
COMMENT ON TABLE users_token_accounts IS 'Stores user token balances and purchase history';
```

#### Migration 2: Create Token Transactions Table

```sql
-- supabase/migrations/[timestamp]_create_token_transactions.sql

-- Create token transactions table
CREATE TABLE IF NOT EXISTS users_token_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    amount INT NOT NULL,
    transaction_type VARCHAR(50) NOT NULL CHECK (transaction_type IN ('purchase', 'generation', 'refund')),
    description TEXT NOT NULL,
    stripe_payment_intent_id VARCHAR(255) UNIQUE,
    price_paid_cents INT CHECK (price_paid_cents >= 0),
    generation_id UUID REFERENCES generations(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_token_transactions_user_id ON users_token_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_token_transactions_created_at ON users_token_transactions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_token_transactions_stripe_payment_intent ON users_token_transactions(stripe_payment_intent_id) WHERE stripe_payment_intent_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_token_transactions_generation_id ON users_token_transactions(generation_id) WHERE generation_id IS NOT NULL;

-- Add RLS policies
ALTER TABLE users_token_transactions ENABLE ROW LEVEL SECURITY;

-- Users can only view their own transactions
CREATE POLICY "Users can view own transactions"
    ON users_token_transactions
    FOR SELECT
    USING (auth.uid() = user_id);

-- Add comment
COMMENT ON TABLE users_token_transactions IS 'Stores all token-related transactions (purchases, generations, refunds)';
```

**Apply migrations:**
```bash
cd /Volumes/home/Projects_Hosted/Yarda_v5
supabase db push
```

---

### Step 2: Configure Stripe

#### Get Stripe Test Keys

1. Go to [Stripe Dashboard](https://dashboard.stripe.com/test/apikeys)
2. Get your **Publishable Key** (starts with `pk_test_`)
3. Get your **Secret Key** (starts with `sk_test_`)
4. Get your **Webhook Secret** (we'll generate this in Step 3)

#### Update Backend `.env`

```bash
# Edit backend/.env
cd /Volumes/home/Projects_Hosted/Yarda_v5/backend

# Add these lines:
STRIPE_SECRET_KEY=sk_test_YOUR_KEY_HERE
STRIPE_PUBLISHABLE_KEY=pk_test_YOUR_KEY_HERE
STRIPE_WEBHOOK_SECRET=whsec_YOUR_SECRET_HERE
FRONTEND_URL=http://localhost:3000
```

#### Update Frontend `.env.local`

```bash
# Edit frontend/.env.local
cd /Volumes/home/Projects_Hosted/Yarda_v5/frontend

# Verify this line exists:
NEXT_PUBLIC_API_URL=http://localhost:8000
```

---

### Step 3: Set Up Stripe Webhook (Local Testing)

For local testing, we need to use Stripe CLI to forward webhooks:

```bash
# Install Stripe CLI (if not installed)
brew install stripe/stripe-cli/stripe

# Login to Stripe
stripe login

# Forward webhooks to local backend
stripe listen --forward-to http://localhost:8000/webhooks/stripe
```

This will output a webhook signing secret like `whsec_...`. Add this to `backend/.env`:

```bash
STRIPE_WEBHOOK_SECRET=whsec_YOUR_SECRET_FROM_STRIPE_CLI
```

**Keep this terminal open** - it needs to run while testing!

---

### Step 4: Start Backend Server

```bash
cd /Volumes/home/Projects_Hosted/Yarda_v5/backend

# Install dependencies (if not already installed)
pip install -r requirements.txt

# Start FastAPI server
uvicorn src.main:app --reload --port 8000
```

**Verify backend is running:**
```bash
curl http://localhost:8000/health
# Should return: {"status":"healthy"}
```

---

### Step 5: Start Frontend Server

```bash
cd /Volumes/home/Projects_Hosted/Yarda_v5/frontend

# Install dependencies (already running in background)
# npm install

# Start Next.js dev server
npm run dev
```

**Verify frontend is running:**
Open browser to [http://localhost:3000](http://localhost:3000)

---

## 🧪 Manual Testing Scenarios

Once setup is complete, test these scenarios:

### Scenario 1: Purchase Token Package
1. Register/login to the app
2. Navigate to `/purchase` page
3. Click "View Token Packages" button
4. Select the 10-token package ($10.00)
5. Click "Purchase" button
6. Complete Stripe checkout with test card: `4242 4242 4242 4242`
7. Verify redirect to `/purchase/success`
8. Check token balance is updated (+10 tokens)

**Expected Result**: ✅ Tokens credited, balance shows 10 tokens

### Scenario 2: Token Balance Auto-Refresh
1. On the `/purchase` or `/generate` page
2. Observe the TokenBalance component
3. Wait 10 seconds
4. Verify the balance refreshes automatically

**Expected Result**: ✅ Balance auto-refreshes every 10 seconds

### Scenario 3: Generate with Tokens
1. Exhaust trial credits (set `trial_remaining=0` in database)
2. Purchase 10 tokens
3. Go to `/generate` page
4. Fill in generation form and submit
5. Verify 1 token is deducted
6. Check balance shows 9 tokens

**Expected Result**: ✅ Token deducted, generation created

### Scenario 4: Token Refund on Failure
1. Have 10 tokens
2. Simulate generation failure (backend returns error)
3. Verify token is refunded
4. Check balance still shows 10 tokens

**Expected Result**: ✅ Token refunded automatically

### Scenario 5: Transaction History
1. Purchase tokens multiple times
2. Generate some designs
3. Navigate to `/transactions` page
4. Verify all transactions are listed
5. Test filtering by type (purchase/generation/refund)
6. Test CSV export

**Expected Result**: ✅ All transactions visible, filters work, CSV exports

### Scenario 6: Webhook Idempotency
1. Purchase tokens
2. In Stripe CLI terminal, you'll see the webhook being sent
3. Try to manually replay the webhook:
   ```bash
   stripe trigger checkout.session.completed
   ```
4. Verify tokens are NOT duplicated

**Expected Result**: ✅ Duplicate webhook ignored, no duplicate tokens

### Scenario 7: Authorization Hierarchy
1. Have active subscription → Can generate (tokens preserved)
2. Cancel subscription, have trial credits → Can generate (tokens preserved)
3. Exhaust trial, have tokens → Can generate (tokens used)
4. No credits → Cannot generate, prompted to purchase

**Expected Result**: ✅ Hierarchy works: Subscription > Trial > Tokens

---

## 🧪 Automated Testing

### Backend Integration Tests

```bash
cd /Volumes/home/Projects_Hosted/Yarda_v5/backend

# Run all token-related tests
pytest tests/integration/test_token_deduction.py -v
pytest tests/integration/test_webhook_idempotency.py -v
pytest tests/integration/test_stripe_checkout.py -v

# Run all integration tests
pytest tests/integration/ -v
```

**Expected Result**: All tests should pass ✅

### Frontend E2E Tests

```bash
cd /Volumes/home/Projects_Hosted/Yarda_v5/frontend

# Install Playwright browsers (if not installed)
npx playwright install

# Run token purchase E2E tests
npx playwright test tests/e2e/token-purchase.spec.ts --headed

# Run all E2E tests
npx playwright test --headed
```

**Expected Result**: All 10 token purchase tests should pass ✅

---

## 🐛 Common Issues and Solutions

### Issue 1: "stripe_payment_intent_id column doesn't exist"
**Solution**: Run database migrations (Step 1)

### Issue 2: "Invalid Stripe signature"
**Solution**:
- Ensure Stripe CLI is running: `stripe listen --forward-to http://localhost:8000/webhooks/stripe`
- Copy the webhook secret from Stripe CLI output to `backend/.env`
- Restart backend server

### Issue 3: "Cannot fetch token balance"
**Solution**:
- Verify backend is running on port 8000
- Check `NEXT_PUBLIC_API_URL` in `frontend/.env.local`
- Check browser console for CORS errors

### Issue 4: "Token not deducted after generation"
**Solution**:
- Ensure authorization hierarchy is working
- Check backend logs for errors
- Verify `payment_method='token'` in generation response

### Issue 5: "npm install still running"
**Solution**:
```bash
# Check background process
# If npm install is still running, wait for it to complete
# Or kill it and run manually:
cd /Volumes/home/Projects_Hosted/Yarda_v5/frontend
npm install
```

---

## 📊 Testing Coverage

### Backend Tests (18 tests)
- ✅ Concurrent token deduction (race conditions)
- ✅ Negative balance prevention (CHECK constraints)
- ✅ Token refund on failure
- ✅ Webhook idempotency (UNIQUE constraint)
- ✅ Concurrent webhooks (only 1 succeeds)
- ✅ Package pricing validation
- ✅ Checkout session creation

### Frontend Tests (10 tests)
- ✅ Token purchase flow
- ✅ 4 packages displayed correctly
- ✅ Balance updates after purchase
- ✅ Generate with tokens
- ✅ Auto-refresh (10 seconds)
- ✅ Webhook idempotency (no duplicates)
- ✅ Token refund on failure
- ✅ Authorization hierarchy
- ✅ Subscription preserves tokens

---

## ✅ Testing Checklist Summary

Before testing:
- [ ] Database migrations applied
- [ ] Stripe keys configured
- [ ] Stripe CLI running (for webhooks)
- [ ] Backend server running (port 8000)
- [ ] Frontend server running (port 3000)

Manual testing:
- [ ] Purchase token package
- [ ] Verify auto-refresh
- [ ] Generate with tokens
- [ ] Verify token refund
- [ ] Check transaction history
- [ ] Test webhook idempotency
- [ ] Verify authorization hierarchy

Automated testing:
- [ ] Backend integration tests pass
- [ ] Frontend E2E tests pass

---

## 🎯 Next Steps After Testing

Once all tests pass:

1. **Review Test Results**: Document any failures or issues
2. **Fix Bugs**: Address any issues found during testing
3. **Performance Testing**: Test with 100+ concurrent users
4. **Security Audit**: Review webhook security and payment flow
5. **Production Deployment**: Deploy to staging, then production
6. **Monitor**: Set up error tracking and metrics

---

## 📝 Quick Start Commands

```bash
# Terminal 1: Stripe CLI (webhooks)
stripe listen --forward-to http://localhost:8000/webhooks/stripe

# Terminal 2: Backend
cd backend
uvicorn src.main:app --reload --port 8000

# Terminal 3: Frontend
cd frontend
npm run dev

# Terminal 4: Tests
cd backend
pytest tests/integration/ -v

# Terminal 5: E2E Tests
cd frontend
npx playwright test tests/e2e/token-purchase.spec.ts --headed
```

---

**Ready to test User Story 2!** Complete the setup steps above, then run through the manual and automated testing scenarios.
