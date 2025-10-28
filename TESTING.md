# Testing Guide

This document describes the automated test suite for the Yarda v5 Landscape Designer application.

## Test Coverage

### User Story 1: New User Registration and Trial Credits

All critical user journeys (CUJs) for User Story 1 have automated tests.

## Frontend E2E Tests (Playwright)

**Location:** `frontend/tests/e2e/`

### Registration Flow Tests

**File:** `frontend/tests/e2e/registration.spec.ts`

Tests the complete user registration flow:

✅ **test_successful_registration** - Verifies:
- User can navigate to `/register`
- Form accepts valid email and password
- Password confirmation matching works
- Success message displays with `data-testid="registration-success"`
- Automatic redirect to `/verify-email` after 2 seconds

✅ **test_invalid_email** - Verifies:
- Form validates email format
- Shows error with `data-testid="email-error"`
- Invalid formats: missing @, missing domain, etc.

✅ **test_weak_password** - Verifies:
- Password must be 8+ characters
- Requires uppercase, lowercase, number, special character
- Shows error with `data-testid="password-error"`

✅ **test_password_mismatch** - Verifies:
- Confirm password must match password
- Shows error with `data-testid="password-mismatch-error"`

✅ **test_duplicate_email** - Verifies:
- Cannot register with existing email
- Shows error with `data-testid="duplicate-email-error"`

### Trial Credits Tests

**File:** `frontend/tests/e2e/trial-credits.spec.ts`

Tests trial credit allocation and display:

✅ **test_allocate_3_trial_credits** - Verifies:
- New users receive exactly 3 trial credits
- Credits visible on dashboard with `data-testid="trial-credits"`

✅ **test_display_trial_credits** - Verifies:
- Dashboard shows credit display component
- Trial credits section visible
- Token balance section visible

✅ **test_show_total_credits** - Verifies:
- Total credits = trial credits + token balance
- Calculation displayed correctly

✅ **test_token_account_zero_balance** - Verifies:
- New users have token balance of 0
- Token account created automatically

## Backend Integration Tests (pytest)

**Location:** `backend/tests/integration/`

### Email Verification Tests

**File:** `backend/tests/integration/test_email_verification.py`

Tests the email verification system:

✅ **test_verify_email_with_valid_token** - Verifies:
- Valid token successfully verifies email
- User's `email_verified` set to `true`
- Timestamp recorded

✅ **test_verify_email_with_expired_token** - Verifies:
- Tokens expire after 1 hour
- Expired token returns error
- User remains unverified

✅ **test_verify_email_with_invalid_token** - Verifies:
- Invalid/random tokens rejected
- Proper error message returned

✅ **test_resend_verification_email** - Verifies:
- Users can request new verification email
- New token generated
- New expiry time set (1 hour from now)

✅ **test_verified_user_can_generate** - Verifies:
- Verified users have `email_verified = true`
- Verified users have 3 trial credits
- Access to generation features

✅ **test_unverified_user_cannot_generate** - Verifies:
- Unverified users blocked from generation
- RLS policies enforced

## Running Tests

### Frontend E2E Tests

**Prerequisites:**
```bash
cd frontend
npm install
```

**Run all tests:**
```bash
npm test
```

**Run with UI mode (recommended for development):**
```bash
npm run test:ui
```

**Run in headed mode (see browser):**
```bash
npm run test:headed
```

**Run specific browser:**
```bash
npm run test:chromium
```

**View test report:**
```bash
npm run test:report
```

### Backend Integration Tests

**Prerequisites:**
```bash
cd backend
python3 -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
```

**Set environment variables:**
```bash
export SUPABASE_URL=https://ynsfmvonkoodmqfkukge.supabase.co
export SUPABASE_ANON_KEY=your-anon-key
export SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

**Run all tests:**
```bash
pytest
```

**Run with coverage:**
```bash
pytest --cov=src --cov-report=html
```

**Run specific test file:**
```bash
pytest tests/integration/test_email_verification.py
```

**Run specific test:**
```bash
pytest tests/integration/test_email_verification.py::TestEmailVerification::test_verify_email_with_valid_token
```

## Test Configuration

### Playwright Config

**File:** `frontend/playwright.config.ts`

Configuration:
- **Base URL:** `http://localhost:3000`
- **Browsers:** Chromium, Firefox, WebKit, Mobile Chrome, Mobile Safari
- **Retries:** 2 on CI, 0 locally
- **Screenshot:** On failure only
- **Trace:** On first retry
- **Reporter:** HTML

The dev server automatically starts before tests run.

### Pytest Config

**File:** `backend/pytest.ini`

Configuration:
- **Test Discovery:** `test_*.py`, `Test*` classes, `test_*` functions
- **Async Mode:** Auto (supports `async def test_*`)
- **Coverage:** HTML and terminal reports
- **Markers:** unit, integration, e2e, slow, asyncio

## Test Data IDs

### Registration Form

| Element | data-testid | Purpose |
|---------|------------|---------|
| Success message | `registration-success` | Confirms registration completed |
| Email error | `email-error` | Shows email validation error |
| Duplicate email error | `duplicate-email-error` | Shows email already exists |
| Password error | `password-error` | Shows password validation error |
| Password mismatch | `password-mismatch-error` | Shows passwords don't match |

### Email Verification

| Element | data-testid | Purpose |
|---------|------------|---------|
| Success message | `verification-success` | Email verified successfully |
| Error message | `verification-error` | Verification failed |

### Credit Display

| Element | data-testid | Purpose |
|---------|------------|---------|
| Credit display | `credit-display` | Overall credit component |
| Trial credits | `trial-credits` | Trial credit count |
| Token balance | `token-balance` | Paid token count |
| Total credits | `total-credits` | Combined total |

## CI/CD Integration

### GitHub Actions (Future)

Add to `.github/workflows/test.yml`:

```yaml
name: Tests

on: [push, pull_request]

jobs:
  frontend-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: 18
      - name: Install dependencies
        run: cd frontend && npm ci
      - name: Install Playwright
        run: cd frontend && npx playwright install --with-deps
      - name: Run E2E tests
        run: cd frontend && npm test
      - uses: actions/upload-artifact@v3
        if: always()
        with:
          name: playwright-report
          path: frontend/playwright-report/

  backend-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-python@v4
        with:
          python-version: '3.11'
      - name: Install dependencies
        run: cd backend && pip install -r requirements.txt
      - name: Run tests
        run: cd backend && pytest
        env:
          SUPABASE_URL: ${{ secrets.SUPABASE_URL }}
          SUPABASE_ANON_KEY: ${{ secrets.SUPABASE_ANON_KEY }}
          SUPABASE_SERVICE_ROLE_KEY: ${{ secrets.SUPABASE_SERVICE_ROLE_KEY }}
```

## Test Maintenance

### Adding New Tests

When implementing new user stories:

1. **Write tests FIRST** (TDD approach)
2. **Ensure tests FAIL** before implementation
3. **Add data-testid attributes** to UI components
4. **Document test IDs** in this file
5. **Run tests** to verify they pass

### Updating Tests

When modifying features:

1. **Update tests** to match new requirements
2. **Run full test suite** to catch regressions
3. **Update test documentation** if IDs change

## Coverage Goals

- **E2E Tests:** All critical user journeys
- **Integration Tests:** All API endpoints
- **Unit Tests:** Complex business logic

**Current Coverage:**
- User Story 1: 100% ✅
- User Story 2: 0% (pending)
- User Story 3: 0% (pending)
- User Story 4: 0% (pending)
- User Story 5: 0% (pending)

## Troubleshooting

### Frontend Tests Failing

**Server not starting:**
```bash
# Manually start dev server first
cd frontend
npm run dev

# In another terminal
npm test
```

**Browser not found:**
```bash
npx playwright install
```

### Backend Tests Failing

**Import errors:**
```bash
# Ensure virtual environment is activated
source venv/bin/activate
pip install -r requirements.txt
```

**Database connection errors:**
```bash
# Check environment variables
echo $SUPABASE_URL
echo $SUPABASE_ANON_KEY

# Verify Supabase project is running
# https://app.supabase.com/project/ynsfmvonkoodmqfkukge
```

## Next Steps

As you implement User Stories 2-5, add corresponding tests:

**User Story 2 (Design Generation):**
- E2E: Test design generation flow
- Integration: Test credit consumption
- Integration: Test generation API

**User Story 3 (History Tracking):**
- E2E: Test history display
- Integration: Test generation retrieval

**User Story 4 (Rate Limiting):**
- Integration: Test rate limit enforcement
- Integration: Test rolling window

**User Story 5 (Token Management):**
- E2E: Test token purchase flow
- Integration: Test token account operations

---

**Remember:** Tests are documentation. Keep them up-to-date and comprehensive! 🧪
