# Testing Strategy

Comprehensive testing approach for Yarda AI Landscape Studio.

## Testing Philosophy

### **CRITICAL: Automated Testing First, Manual Testing LAST**

**Golden Rule:** NEVER request manual (human) testing until ALL automated tests pass and ALL Critical User Journeys (CUJs) work perfectly, frictionlessly, and beautifully.

---

## Testing Hierarchy

### 1. Automated E2E Tests (Playwright MCP) ✅ **ALWAYS USE FIRST**

- Use Playwright MCP to validate ALL functionality automatically
- Test against local, staging, and production environments
- Verify E2E user flows, UI interactions, and backend integration
- Fix ALL issues discovered through automated testing before proceeding

**Command:**
```bash
cd frontend && npm run test:e2e
```

### 2. Backend Unit Tests (pytest)

- Test services independently with mocked database
- Use `pytest` fixtures for test data
- Validate business logic and atomic operations

**Command:**
```bash
cd backend && pytest tests/ -v
```

### 3. Frontend E2E Tests (Playwright)

- Playwright tests for all critical user journeys
- Test against local backend (port 8000) AND staging (Railway)
- Validate single-page flows, polling, results display

**Commands:**
```bash
# Local testing
cd frontend && npm run test:e2e

# Staging testing
npx playwright test --config=playwright.config.staging.ts

# Production smoke tests
npx playwright test --config=playwright.config.production.ts
```

### 4. Integration Tests

- Full flow testing with real database
- Use separate test database for safety
- Validate end-to-end scenarios with actual services

### 5. Manual (Human) Testing ⚠️ **ONLY AS FINAL SIGN-OFF**

**Prerequisites:**
- ALL automated tests must pass 100%
- ALL CUJs must work perfectly (no bugs, no issues)
- User experience must be frictionless and polished
- Design must be beautiful and production-ready

**Purpose:** Final user experience validation and aesthetic review ONLY

---

## When to Request Manual Testing

### ✅ YES - Request manual testing when:

- All Playwright E2E tests pass (100%)
- All backend unit tests pass (100%)
- All CUJs verified working through automated tests
- No known bugs or issues exist
- UI/UX is polished and frictionless
- Design is beautiful and production-ready
- Ready for production deployment

### ❌ NO - Do NOT request manual testing when:

- Any automated tests are failing
- Known bugs or issues exist
- Features are incomplete or partially working
- UI has rough edges or usability issues
- Design needs polish
- Backend errors occur during automated testing

---

## Test Coverage Matrix

| Feature | Tests | Status | Browsers | Notes |
|---------|-------|--------|----------|-------|
| Language Switching (Feature 006 - i18n) | 9 tests | 27/40 passing | Chromium, Firefox, WebKit, Mobile Chrome, Mobile Safari | Core functionality verified; timing issues on multi-step scenarios |
| Authentication | 12+ tests | ✅ Passing | All | Google OAuth, magic link, session persistence |
| Generation Flow (Feature 004-005) | 15+ tests | ✅ Passing | All | Single-page form, polling, results display |
| Token Management | 8+ tests | ✅ Passing | All | Purchase, balance tracking, deduction |
| Trial Credits | 6+ tests | ✅ Passing | All | Registration credits, deduction, exhaustion modal |
| **Total** | **50+ tests** | **40+ passing** | **5 browsers** | Production-ready core features |

---

## Test Commands & Slash Commands

### Available Slash Commands

- **`/test-smart`** - Full CI/CD pipeline (local → staging → production with approval gates)
- **`/test-bug-fix`** - Environment-aware bug fix workflow (detects production/staging/local)
- **`/test-specific`** - Test specific feature/module (planned)
- **`/test-cuj`** - Test specific Critical User Journey (planned)

### Direct Test Commands

```bash
# Language switching tests (40 tests across 5 browsers)
npm run test:e2e -- tests/e2e/language-switching.spec.ts

# All E2E tests
npm run test:e2e

# Specific test file
npx playwright test tests/e2e/{feature}.spec.ts

# With UI mode (interactive debugging)
npx playwright test --ui

# Backend unit tests
pytest tests/ -v

# Backend coverage
pytest tests/ --cov=src --cov-report=html
```

### Execution Time Estimates

| Command | Time | Details |
|---------|------|---------|
| `npm run test:e2e` (single feature) | 3-5 min | ~9 tests |
| `npm run test:e2e` (all features) | 15-20 min | 50+ tests × 5 browsers |
| Local test suite + staging deploy | 25-35 min | Includes auto-fix attempts |
| Full `/test-smart` pipeline | 45-60 min | Includes human approval gate |

---

## Critical User Journeys (CUJs)

Before requesting manual testing, verify these CUJs work perfectly via Playwright:

### CUJ1: New User Registration & Trial Flow

- ✅ Google OAuth sign-in works
- ✅ User created in database with 3 trial credits
- ✅ Redirected to /generate page
- ✅ Can submit first generation using trial credit
- ✅ Trial credits decrement correctly (3 → 2)
- ✅ Language preference persists across login (Feature 006)

**Test File:** `frontend/tests/e2e/auth-flow.spec.ts`

---

### CUJ2: Language Selection & Persistence (Feature 006 - i18n)

- ✅ Login page renders in English by default
- ✅ Language switcher button is visible and accessible
- ✅ All three languages available (en, es, zh)
- ✅ Can switch languages and preference persists in localStorage
- ✅ Language syncs to backend on login
- ✅ Multiple language switches work correctly
- ✅ Switcher closes when clicking outside

**Test File:** `frontend/tests/e2e/language-switching.spec.ts`

---

### CUJ3: Generation Flow (Feature 004-005 - Single Page)

- ✅ Form submission works without page navigation
- ✅ Progress updates appear inline every 2 seconds
- ✅ Results display inline when complete
- ✅ Images load successfully (Vercel Blob)
- ✅ "Create New Design" button resets form
- ✅ No console errors throughout flow

**Test File:** `frontend/tests/e2e/generation-flow-v2.spec.ts`

---

### CUJ4: Token Purchase & Payment

- ✅ Purchase page displays packages correctly
- ✅ Stripe Checkout session creates successfully
- ✅ Payment succeeds with test card (4242...)
- ✅ Webhook processes payment and adds tokens
- ✅ Token balance updates in UI immediately
- ✅ Can generate with purchased tokens

**Test File:** `frontend/tests/e2e/token-purchase.spec.ts`

---

### CUJ5: Subscription Flow

- ✅ Subscription page displays plans
- ✅ Can subscribe to Pro plan
- ✅ Active subscription allows unlimited generations
- ✅ Can manage subscription via Customer Portal
- ✅ Cancellation works correctly

**Test File:** `frontend/tests/e2e/subscription-flow.spec.ts`

---

## Test-Driven Development Workflow

1. **Write test FIRST** (Red) - Define expected behavior in Playwright test
2. **Implement feature** (Green) - Make the test pass
3. **Refactor** (Refactor) - Clean up code while tests still pass
4. **Validate with Playwright MCP** - Run full E2E suite
5. **Fix all issues** - Iterate until 100% pass rate
6. **Request manual review** - ONLY when everything is perfect

---

## Backend Testing Patterns

### Service Unit Tests (pytest)

```python
# tests/unit/test_trial_service.py
import pytest
from src.services.trial_service import TrialService

@pytest.mark.asyncio
async def test_trial_deduction(test_pool, test_user):
    service = TrialService(test_pool)

    result = await service.use_trial_credit(test_user['id'], cost=1)

    assert result.trial_remaining == 2
    assert result.trial_used == 1

@pytest.mark.asyncio
async def test_insufficient_trial_credits(test_pool, test_user):
    service = TrialService(test_pool)

    # Use all credits
    await service.use_trial_credit(test_user['id'], cost=3)

    # Should raise error
    with pytest.raises(InsufficientTrialCreditsError):
        await service.use_trial_credit(test_user['id'], cost=1)
```

### Fixtures

```python
# tests/conftest.py
import pytest
from src.db.connection_pool import DatabasePool

@pytest.fixture
async def test_pool():
    """Database connection pool for tests"""
    pool = DatabasePool(TEST_DATABASE_URL)
    await pool.initialize()
    yield pool
    await pool.close()

@pytest.fixture
async def test_user(test_pool):
    """Create test user with 3 trial credits"""
    async with test_pool.transaction() as conn:
        user = await conn.fetchrow("""
            INSERT INTO users (email, trial_remaining)
            VALUES ($1, $2)
            RETURNING *
        """, "test@example.com", 3)

    yield user

    # Cleanup
    async with test_pool.transaction() as conn:
        await conn.execute("DELETE FROM users WHERE id = $1", user['id'])
```

---

## Frontend Testing Patterns

### E2E Tests (Playwright)

```typescript
// tests/e2e/generation-flow-v2.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Generation Flow', () => {
  test('generates design successfully', async ({ page }) => {
    // Navigate to generate page
    await page.goto('/generate');

    // Fill form
    await page.fill('input[name="address"]', '123 Main St, San Francisco, CA');
    await page.fill('textarea[name="prompt"]', 'Modern minimalist patio');
    await page.check('input[value="front_yard"]');

    // Submit form
    await page.click('button:has-text("Generate Design")');

    // Wait for progress to appear
    await expect(page.locator('.generation-progress')).toBeVisible();

    // Wait for results (max 2 minutes)
    await expect(page.locator('.generation-results')).toBeVisible({ timeout: 120000 });

    // Verify images loaded
    await expect(page.locator('.result-image')).toHaveCount(1);
  });

  test('handles network errors gracefully', async ({ page, context }) => {
    // Block API calls
    await context.route('**/api/v1/generations', route => route.abort());

    await page.goto('/generate');
    await page.fill('input[name="address"]', '123 Main St');
    await page.click('button:has-text("Generate Design")');

    // Verify error message
    await expect(page.locator('.error-message')).toBeVisible();
    await expect(page.locator('.error-message')).toContainText('network error');
  });
});
```

### Page Object Model

```typescript
// tests/e2e/page-objects/GeneratePage.ts
export class GeneratePage {
  constructor(private page: Page) {}

  async goto() {
    await this.page.goto('/generate');
  }

  async fillAddress(address: string) {
    await this.page.fill('input[name="address"]', address);
  }

  async fillPrompt(prompt: string) {
    await this.page.fill('textarea[name="prompt"]', prompt);
  }

  async selectArea(area: string) {
    await this.page.check(`input[value="${area}"]`);
  }

  async submit() {
    await this.page.click('button:has-text("Generate Design")');
  }

  async waitForResults() {
    await this.page.locator('.generation-results').waitFor({ timeout: 120000 });
  }
}
```

---

## CI/CD Integration

### Local Testing Workflow

```bash
# 1. Make code changes
# 2. Run tests locally
npm run test:e2e

# 3. Fix failures
# 4. Commit when all tests pass
git add .
git commit -m "feat: add new feature"
```

### `/test-smart` Pipeline

```
PHASE 1: LOCAL TESTING & AUTO-FIX
├── Analyze changed files
├── Run affected tests (smart selection)
├── Auto-fix failures (up to 3 attempts)
└── Report: "✅ 10/10 tests passed"

PHASE 2: AUTO-DEPLOY TO STAGING
├── Commit auto-fixes
├── Push to current branch
├── Wait for Vercel preview + Railway deployment
└── Report: "🚀 Deployed to staging/preview"

PHASE 3: STAGING TESTING & AUTO-FIX
├── Run FULL test suite (50+ tests) on staging
├── Auto-fix staging-specific failures
└── Report: "✅ 50/50 tests passed"

PHASE 4: HUMAN APPROVAL GATE ⏸️
├── Show summary of all tests
├── Show preview URL for manual review (optional)
└── Ask: "Deploy to production? (yes/no/review)"

PHASE 5: PRODUCTION DEPLOYMENT
├── Merge to main branch
├── Push (triggers auto-deploy)
├── Run production smoke tests
├── Monitor for errors
└── Report: "✅ Production deployment successful!"
```

**Time Estimate:** 15-25 minutes (automated) + approval time

---

## Test Data Management

### Stripe Test Cards

- **Success:** `4242 4242 4242 4242`
- **Decline:** `4000 0000 0000 0002`
- **3D Secure:** `4000 0025 0000 3155`

### Test Users

```typescript
// Hardcoded test users for E2E (DO NOT use in production)
const TEST_USERS = {
  withTrial: {
    email: 'trial@test.com',
    trial_remaining: 3
  },
  withTokens: {
    email: 'tokens@test.com',
    token_balance: 10
  },
  withSubscription: {
    email: 'pro@test.com',
    subscription_status: 'active'
  }
};
```

---

## Debugging Test Failures

### Playwright UI Mode

```bash
npx playwright test --ui
```

- Interactive test runner
- Step through tests
- Inspect DOM at each step
- View console logs

### Trace Viewer

```bash
npx playwright test --trace on
npx playwright show-report
```

- Detailed execution trace
- Network requests
- Screenshots
- Console logs

### Backend Debugging

```bash
# Enable detailed logging
pytest tests/ -v --log-cli-level=DEBUG

# Run specific test with print statements
pytest tests/unit/test_trial_service.py::test_trial_deduction -s
```

---

For architectural details, see [ARCHITECTURE.md](ARCHITECTURE.md).
For deployment testing, see [DEPLOYMENT.md](DEPLOYMENT.md).
For development setup, see [DEVELOPMENT.md](DEVELOPMENT.md).
