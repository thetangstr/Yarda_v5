# Quick Reference: Running Integration Tests

**Status:** Database migrations applied ✅ - Ready to test!

## Prerequisites

✅ Database migrations applied (User Story 5)
✅ Supabase CLI configured
✅ Environment variables need to be set

---

## Step 1: Backend Integration Tests (47 tests)

### Setup Environment

```bash
cd backend

# Create .env file if it doesn't exist
cat > .env << 'EOF'
SUPABASE_URL=https://ynsfmvonkoodmqfkukge.supabase.co
SUPABASE_SERVICE_ROLE_KEY=<paste-your-service-role-key-here>
SUPABASE_ANON_KEY=<paste-your-anon-key-here>
EOF

# Get keys from: https://app.supabase.com/project/ynsfmvonkoodmqfkukge/settings/api
```

### Install Dependencies

```bash
# Create virtual environment if needed
python -m venv venv

# Activate it
source venv/bin/activate  # macOS/Linux
# OR
venv\Scripts\activate  # Windows

# Install dependencies
pip install -r requirements.txt
```

### Run Tests

```bash
# Run all 47 integration tests
pytest tests/integration/ -v

# Or run by user story:
pytest tests/integration/test_email_verification.py -v      # User Story 1 (6 tests)
pytest tests/integration/test_credit_consumption.py -v      # User Story 2 (10 tests)
pytest tests/integration/test_generation_history.py -v      # User Story 3 (9 tests)
pytest tests/integration/test_rate_limiting.py -v           # User Story 4 (9 tests)
pytest tests/integration/test_token_account.py -v           # User Story 5 (13 tests)

# With coverage report
pytest tests/integration/ -v --cov=src --cov-report=html
# Then open: htmlcov/index.html
```

### Expected Output

```
tests/integration/test_email_verification.py::TestEmailVerification::test_valid_token_verification PASSED [ 2%]
tests/integration/test_email_verification.py::TestEmailVerification::test_expired_token PASSED [ 4%]
...
=============== 47 passed in 23.45s ===============
```

---

## Step 2: Start Backend Server (for E2E tests)

In a **separate terminal**:

```bash
cd backend
source venv/bin/activate
python -m uvicorn src.main:app --reload
```

Server will run at:
- API: http://localhost:8000
- Docs: http://localhost:8000/docs

Keep this terminal running while you run frontend tests.

---

## Step 3: Frontend E2E Tests (59 tests)

### Setup Environment

```bash
cd frontend

# Create .env.local file if it doesn't exist
cat > .env.local << 'EOF'
NEXT_PUBLIC_SUPABASE_URL=https://ynsfmvonkoodmqfkukge.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<paste-your-anon-key-here>
EOF
```

### Install Dependencies

```bash
npm install
```

### Run Tests

**Option A: Headless (fast)**

```bash
# Make sure backend is running on localhost:8000

# Run all 59 E2E tests
npm test

# Or run by user story:
npm test tests/e2e/registration.spec.ts          # User Story 1 (9 tests)
npm test tests/e2e/trial-credits.spec.ts         # User Story 1
npm test tests/e2e/credit-consumption.spec.ts    # User Story 2 (7 tests)
npm test tests/e2e/generation-creation.spec.ts   # User Story 2 (11 tests)
npm test tests/e2e/generation-history.spec.ts    # User Story 3 (13 tests)
npm test tests/e2e/rate-limiting.spec.ts         # User Story 4 (9 tests)
npm test tests/e2e/token-account.spec.ts         # User Story 5 (10 tests)
```

**Option B: UI Mode (interactive debugging)**

```bash
npm run test:ui
```

**Option C: Headed (see browser)**

```bash
npm test -- --headed
```

### Expected Output

```
Running 59 tests using 1 worker
  ✓ tests/e2e/registration.spec.ts:5:1 › Registration › should register a new user (1234ms)
  ✓ tests/e2e/registration.spec.ts:15:1 › Registration › should show validation errors (456ms)
  ...
  59 passed (2.3m)
```

---

## Step 4: Manual End-to-End Testing

### Start Frontend Dev Server

In **another separate terminal**:

```bash
cd frontend
npm run dev
```

Frontend will run at: http://localhost:3000

### Test User Journeys

Open browser to http://localhost:3000 and test:

1. **Registration Journey**
   - Go to `/register`
   - Register with unique email
   - Verify redirects to `/verify-email`

2. **Credit Display Journey**
   - Go to `/generate`
   - Verify shows Trial: 3, Tokens: 0, Total: 3

3. **Generation Journey**
   - Fill address form
   - Click "Generate Design"
   - Verify credit decreases to 2

4. **Rate Limiting Journey**
   - Generate 3 designs quickly
   - 4th attempt should show rate limit alert

5. **Token Account Journey**
   - Go to `/profile`
   - Verify token account section shows

6. **Purchase Flow Journey**
   - After depleting credits, click "Purchase Tokens"
   - Verify navigates to `/purchase-tokens`

7. **History Journey**
   - Go to `/history`
   - Verify shows all generations
   - Click one, verify modal opens

---

## Troubleshooting

### Backend Tests Fail

**"Connection refused"**
```bash
# Check Supabase credentials in .env
cat backend/.env

# Verify they match your Supabase dashboard:
# https://app.supabase.com/project/ynsfmvonkoodmqfkukge/settings/api
```

**"Table not found"**
```bash
# Verify migrations applied
# Run in Supabase SQL Editor:
SELECT column_name FROM information_schema.columns WHERE table_name = 'token_accounts';
```

**"Column does not exist: lifetime_purchased"**
```bash
# User Story 5 migrations not applied
# See DATABASE_MIGRATIONS_VERIFIED.md
```

### Frontend Tests Fail

**"Timeout waiting for selector"**
```bash
# Ensure backend is running
curl http://localhost:8000/health

# Check data-testid in component matches test
```

**"Navigation timeout"**
```bash
# Backend responding too slowly
# Check backend terminal for errors
```

**"Unable to connect"**
```bash
# Frontend dev server not running
npm run dev
```

### General Issues

**Port already in use**
```bash
# Backend (8000)
lsof -ti:8000 | xargs kill -9

# Frontend (3000)
lsof -ti:3000 | xargs kill -9
```

**Environment variables not loaded**
```bash
# Restart servers after editing .env files
```

---

## Success Criteria

✅ All 47 backend integration tests pass
✅ All 59 frontend E2E tests pass
✅ All 7 manual user journeys work
✅ No errors in browser console
✅ No errors in backend terminal

---

## After Tests Pass

Document results in [INTEGRATION_TESTING_GUIDE.md](INTEGRATION_TESTING_GUIDE.md) and proceed to:

- **Phase 8: Polish** (8 remaining tasks)
- OR **Deploy to Staging** for real-world testing
- OR **Add Stripe Integration** for token purchases

---

## Quick Command Summary

```bash
# Terminal 1: Backend tests
cd backend && source venv/bin/activate && pytest tests/integration/ -v

# Terminal 2: Backend server
cd backend && source venv/bin/activate && uvicorn src.main:app --reload

# Terminal 3: Frontend tests
cd frontend && npm test

# Terminal 4: Frontend server
cd frontend && npm run dev
```

---

**Everything ready to test!** 🚀

Check [DATABASE_MIGRATIONS_VERIFIED.md](DATABASE_MIGRATIONS_VERIFIED.md) for migration verification results.
