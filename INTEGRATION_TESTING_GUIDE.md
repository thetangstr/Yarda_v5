# Integration Testing Guide - Yarda v5

**Last Updated:** 2025-10-28

This guide walks through testing all integrations to ensure the complete system works end-to-end.

## Testing Timeline

We test integrations at these key points:

1. **After each User Story** - Verify story works independently
2. **Before Phase 8 (Polish)** - ⭐ **WE ARE HERE** - Full system integration test
3. **Before Production Deployment** - Final validation

---

## Pre-Testing Setup

### 1. Apply User Story 5 Database Migrations

**Option A: Supabase SQL Editor (Recommended)**

1. Open [Supabase SQL Editor](https://app.supabase.com/project/ynsfmvonkoodmqfkukge/sql/new)
2. Copy the contents of `supabase/apply_user_story_5_migrations.sql`
3. Paste into SQL Editor
4. Click "Run" (or press Cmd/Ctrl + Enter)
5. Verify success: You should see "Success. No rows returned"

**Option B: Supabase CLI**

```bash
supabase login
supabase link --project-ref ynsfmvonkoodmqfkukge
supabase db push
```

**Verification:**

Run this query in SQL Editor to verify migrations applied:

```sql
-- Check columns renamed
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'token_accounts'
ORDER BY ordinal_position;

-- Should see: total_purchased and total_consumed (NOT lifetime_*)

-- Check trigger exists
SELECT trigger_name, event_manipulation, event_object_table
FROM information_schema.triggers
WHERE trigger_name = 'on_auth_user_created';

-- Should return 1 row
```

### 2. Set Up Environment Variables

**Backend `.env`:**

```bash
cd backend

# If .env doesn't exist, copy from example
cp .env.example .env

# Edit .env and add:
SUPABASE_URL=https://ynsfmvonkoodmqfkukge.supabase.co
SUPABASE_SERVICE_ROLE_KEY=<your-service-role-key>
SUPABASE_ANON_KEY=<your-anon-key>
```

Get keys from: https://app.supabase.com/project/ynsfmvonkoodmqfkukge/settings/api

**Frontend `.env.local`:**

```bash
cd frontend

# If .env.local doesn't exist
cp .env.local.example .env.local

# Edit .env.local and add:
NEXT_PUBLIC_SUPABASE_URL=https://ynsfmvonkoodmqfkukge.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<your-anon-key>
```

### 3. Install Dependencies

**Backend:**

```bash
cd backend
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
```

**Frontend:**

```bash
cd frontend
npm install
```

---

## Integration Test Suite

### Level 1: Database Integration (CRITICAL)

Test that all database functions work correctly.

**Run in Supabase SQL Editor:**

```sql
-- Test 1: Create test user manually
INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, created_at, updated_at)
VALUES (
  gen_random_uuid(),
  'integration-test@example.com',
  crypt('testpassword', gen_salt('bf')),
  NOW(),
  NOW(),
  NOW()
)
RETURNING id;

-- Save the returned UUID, then verify trigger created user and token account

-- Test 2: Verify user record created (replace <user-id>)
SELECT * FROM users WHERE id = '<user-id>';
-- Should return 1 row with trial_credits = 3

-- Test 3: Verify token account created
SELECT * FROM token_accounts WHERE user_id = '<user-id>';
-- Should return 1 row with balance = 0, total_purchased = 0, total_consumed = 0

-- Test 4: Test get_credit_balance function
SELECT * FROM get_credit_balance('<user-id>');
-- Should return: trial_credits=3, token_balance=0, total_credits=3

-- Test 5: Test consume_credit function (trial first)
SELECT consume_credit('<user-id>');
-- Should return: 'trial'

SELECT * FROM get_credit_balance('<user-id>');
-- Should return: trial_credits=2, token_balance=0, total_credits=2

-- Test 6: Add tokens and consume
UPDATE token_accounts SET balance = 5, total_purchased = 5 WHERE user_id = '<user-id>';

-- Consume remaining trial credits
SELECT consume_credit('<user-id>');  -- Returns 'trial', trial_credits=1
SELECT consume_credit('<user-id>');  -- Returns 'trial', trial_credits=0

-- Now should consume from tokens
SELECT consume_credit('<user-id>');  -- Returns 'token'

SELECT * FROM get_credit_balance('<user-id>');
-- Should return: trial_credits=0, token_balance=4, total_credits=4

-- Test 7: Test rate limiting
SELECT check_rate_limit('<user-id>');  -- Returns true (0 attempts)

-- Record 3 attempts
INSERT INTO rate_limits (user_id) VALUES ('<user-id>');
INSERT INTO rate_limits (user_id) VALUES ('<user-id>');
INSERT INTO rate_limits (user_id) VALUES ('<user-id>');

SELECT check_rate_limit('<user-id>');  -- Returns false (3 attempts in window)

-- Clean up test data
DELETE FROM rate_limits WHERE user_id = '<user-id>';
DELETE FROM token_accounts WHERE user_id = '<user-id>';
DELETE FROM users WHERE id = '<user-id>';
DELETE FROM auth.users WHERE id = '<user-id>';
```

**Expected Result:** All queries should succeed with expected values.

---

### Level 2: Backend Integration Tests

Run all 47 integration tests:

```bash
cd backend
source venv/bin/activate

# Run all integration tests
pytest tests/integration/ -v

# Or run by user story:
pytest tests/integration/test_email_verification.py -v      # User Story 1 (6 tests)
pytest tests/integration/test_credit_consumption.py -v      # User Story 2 (10 tests)
pytest tests/integration/test_generation_history.py -v      # User Story 3 (9 tests)
pytest tests/integration/test_rate_limiting.py -v           # User Story 4 (9 tests)
pytest tests/integration/test_token_account.py -v           # User Story 5 (13 tests)

# Run with coverage report
pytest tests/integration/ -v --cov=src --cov-report=html
# Open htmlcov/index.html to see coverage
```

**Expected Result:** All 47 tests should pass.

**Common Issues:**

- **"Connection refused"**: Supabase credentials not set in `.env`
- **"Table not found"**: Migrations not applied
- **"Function not found"**: Database functions not created (run migrations)
- **"Column does not exist: lifetime_purchased"**: Need to apply User Story 5 migrations

---

### Level 3: Backend API Integration

Start the backend server and test API endpoints manually:

```bash
cd backend
source venv/bin/activate
python -m uvicorn src.main:app --reload

# Server runs at: http://localhost:8000
# API Docs: http://localhost:8000/docs
```

**Test Endpoints Using API Docs (http://localhost:8000/docs):**

1. **POST /api/auth/register**
   - Body: `{"email": "apitest@example.com", "password": "SecurePass123!"}`
   - Should return: `201 Created` with user data

2. **GET /api/credits/balance** (requires auth token)
   - Should return: `{"trial_credits": 3, "token_balance": 0, "total_credits": 3}`

3. **GET /api/credits/token-account** (requires auth token)
   - Should return token account with `total_purchased` and `total_consumed` fields

4. **POST /api/generations** (requires auth token)
   - Should consume credit and create generation

5. **GET /api/rate-limits/status** (requires auth token)
   - Should return rate limit status

**Expected Result:** All endpoints respond with correct status codes and data.

---

### Level 4: Frontend E2E Tests

Run all 59 E2E tests using Playwright:

```bash
cd frontend

# Make sure backend is running on http://localhost:8000
# Make sure frontend is running on http://localhost:3000

# Start frontend dev server (in separate terminal)
npm run dev

# Run all E2E tests
npm test

# Or run by user story:
npm test tests/e2e/registration.spec.ts          # User Story 1 (9 tests)
npm test tests/e2e/trial-credits.spec.ts         # User Story 1
npm test tests/e2e/credit-consumption.spec.ts    # User Story 2 (7 tests)
npm test tests/e2e/generation-creation.spec.ts   # User Story 2 (11 tests)
npm test tests/e2e/generation-history.spec.ts    # User Story 3 (13 tests)
npm test tests/e2e/rate-limiting.spec.ts         # User Story 4 (9 tests)
npm test tests/e2e/token-account.spec.ts         # User Story 5 (10 tests)

# Run with UI mode (interactive debugging)
npm run test:ui

# Run headed (see browser)
npm test -- --headed
```

**Expected Result:** All 59 tests should pass.

**Common Issues:**

- **"Timeout waiting for selector"**: Missing `data-testid` attributes or components not rendering
- **"Navigation timeout"**: Backend not running or slow responses
- **"expect().toHaveText() failed"**: API returning wrong data format
- **"Unable to connect"**: Frontend not running on localhost:3000

---

### Level 5: Manual End-to-End Testing

Test complete user journeys manually in the browser:

**Journey 1: New User Registration**

1. Navigate to http://localhost:3000/register
2. Enter email: `manual-test-{timestamp}@example.com`
3. Enter password: `SecurePass123!`
4. Click "Register"
5. ✅ Should redirect to `/verify-email`
6. ✅ Check database: User should have token account with balance=0

**Journey 2: Credit Display**

1. (After registering) Navigate to `/generate`
2. ✅ Should see:
   - Trial Credits: 3
   - Token Balance: 0
   - Total Credits: 3

**Journey 3: Design Generation**

1. On `/generate` page
2. Enter address: "123 Main St, San Francisco, CA"
3. Select style: "Modern"
4. Click "Generate Design"
5. ✅ Should see generation in progress
6. ✅ Credits should update to Trial: 2, Total: 2
7. Wait for generation to complete
8. ✅ Should see generated design

**Journey 4: Rate Limiting**

1. Generate 3 designs rapidly
2. ✅ After 3rd generation: Trial Credits = 0
3. Try 4th generation
4. ✅ Should see rate limit alert with countdown timer
5. Wait 60 seconds
6. ✅ Alert should disappear, can generate again

**Journey 5: Token Account**

1. Navigate to `/profile`
2. ✅ Should see Token Account section
3. ✅ Should display:
   - Balance: 0
   - Total Purchased: 0
   - Total Consumed: 0
   - Account ID: (UUID)

**Journey 6: Purchase Flow**

1. After consuming all 3 trial credits
2. ✅ Should see "Purchase Tokens" CTA
3. Click CTA
4. ✅ Should navigate to `/purchase-tokens`
5. ✅ Should see 3 pricing tiers

**Journey 7: Generation History**

1. Navigate to `/history`
2. ✅ Should see all past generations
3. Click on a generation
4. ✅ Should open modal with full details
5. Filter by status
6. ✅ Should show only filtered generations

**Expected Result:** All user journeys work smoothly end-to-end.

---

## Integration Testing Checklist

Before proceeding to Phase 8 (Polish), verify:

### Database ✅
- [ ] All 10 migrations applied successfully
- [ ] Database functions work correctly (consume_credit, refund_credit, get_credit_balance, check_rate_limit)
- [ ] Token account trigger creates accounts on user registration
- [ ] RLS policies protect user data

### Backend ✅
- [ ] All 47 integration tests pass
- [ ] API endpoints return correct responses
- [ ] Authentication works (JWT tokens)
- [ ] Error handling returns proper HTTP status codes
- [ ] Service role and anon key both work correctly

### Frontend ✅
- [ ] All 59 E2E tests pass
- [ ] All pages render without errors
- [ ] All data-testid attributes present
- [ ] State management (Zustand) works correctly
- [ ] API calls succeed and update UI

### End-to-End ✅
- [ ] User registration creates user + token account
- [ ] Credit display shows correct balances
- [ ] Generation consumes credits in correct order (trial first)
- [ ] Rate limiting blocks 4th request within 60 seconds
- [ ] Token account displays in profile
- [ ] Purchase flow navigates correctly
- [ ] History shows all generations
- [ ] All user journeys complete successfully

---

## When Tests Fail

### Debugging Strategy

1. **Check Database First**
   - Run verification queries in Supabase SQL Editor
   - Ensure all migrations applied
   - Check RLS policies aren't blocking queries

2. **Check Backend Logs**
   - Look at terminal where `uvicorn` is running
   - Check for Python exceptions
   - Verify environment variables loaded

3. **Check Frontend Console**
   - Open browser DevTools (F12)
   - Look for JavaScript errors
   - Check Network tab for failed API calls

4. **Check Test Output**
   - Read error messages carefully
   - Look for `data-testid` mismatches
   - Check for timeout issues (slow API responses)

### Common Fixes

**"Table/column does not exist"**
→ Apply missing migrations in Supabase SQL Editor

**"Insufficient credits"**
→ Reset user trial credits: `UPDATE users SET trial_credits = 3 WHERE id = '<user-id>'`

**"Rate limit exceeded"**
→ Clear rate limits: `DELETE FROM rate_limits WHERE user_id = '<user-id>'`

**"Authentication failed"**
→ Check JWT token is being sent in Authorization header

**"Connection refused"**
→ Ensure backend running on localhost:8000 and environment variables set

---

## Test Reporting

After running all tests, document results:

```bash
# Generate backend coverage report
cd backend
pytest tests/integration/ -v --cov=src --cov-report=html
# View: open htmlcov/index.html

# Generate frontend test report
cd frontend
npm test -- --reporter=html
# View: open playwright-report/index.html
```

**Save Results:**
- Screenshot passing test suites
- Save coverage reports
- Document any failures and fixes

---

## Next Steps After Integration Testing

Once all integration tests pass:

### Option A: Proceed to Phase 8 (Polish)

Start implementing polish tasks:
- Comprehensive error handling
- Loading states
- Performance optimization
- Accessibility improvements
- Production build

### Option B: Deploy to Staging

Test in a production-like environment:
- Deploy to Vercel (frontend)
- Ensure Supabase is production-ready
- Test with real users
- Monitor performance

### Option C: Add More Features

If integrations work perfectly, optionally add:
- Stripe payment integration
- Email notifications
- Admin dashboard
- Analytics tracking

---

## Summary

**Integration testing ensures:**
1. ✅ Database layer works (migrations, functions, triggers)
2. ✅ Backend API works (endpoints, authentication, business logic)
3. ✅ Frontend works (UI, state, API calls)
4. ✅ End-to-end flows work (complete user journeys)

**Test at 3 levels:**
- **Unit**: Individual functions (covered by TDD)
- **Integration**: Services talking to each other (47 backend + 59 frontend tests)
- **E2E**: Complete user workflows (manual testing)

**Current Status:** Ready to test all integrations before Phase 8 (Polish)

**Estimated Testing Time:** 1-2 hours for complete integration test suite

---

**Questions or issues during testing?**
Check the troubleshooting section or review the test output for specific error messages.
