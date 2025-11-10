# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Yarda AI Landscape Studio - AI-powered landscape design generation with Google Maps integration, Google OAuth authentication, and flexible payment options (trials, tokens, subscriptions).

## Critical Project Information

### Deployment Configuration (USE THESE ONLY)

**Frontend (Vercel)**
- Project ID: `prj_H82uxC9rqafgCvhSaKYEZm5GskNn`
- Project Name: `yarda-v5-frontend`
- Team: `team_VKfqq7FT5jFRbV7UQ5K1YEFR` (thetangstrs-projects)
- Production: tbd
- Preview: https://yarda-v5-frontend-git-003-google-ma-fbe974-thetangstrs-projects.vercel.app

**Backend (Railway)**
- Project ID: `7a8f9bcb-a265-4c34-82d2-c9c3655d26bf`
- Project Name: `yarda-api`
- URL: https://yarda-api-production.up.railway.app

**Database (Supabase)**
- Project ID: `gxlmnjnjvlslijiowamn`
- Project Name: `yarda`
- Organization: `sqrkdtcgqpzmyrcwcpqn`
- Region: us-east-2
- URL: https://gxlmnjnjvlslijiowamn.supabase.co
- Dashboard: https://supabase.com/dashboard/project/gxlmnjnjvlslijiowamn

**Payments (Stripe)**
- Account ID: `acct_1SFRz7F7hxfSl7pF`
- Account: Yarda (Test Mode)

## Technology Stack

**Frontend:** Next.js 15.0.2, React 18, TypeScript 5.6.3, TailwindCSS, Zustand (state), Axios (HTTP)
**Backend:** Python 3.11+, FastAPI, asyncpg (connection pool), Pydantic
**Database:** PostgreSQL 17 (Supabase) with Row-Level Security
**Auth:** Supabase Auth with Google OAuth + Magic Link (passwordless)
**Payments:** Stripe (Checkout, Customer Portal, Webhooks)
**AI:** Google Gemini 2.5 Flash
**Maps:** Google Maps API (Street View, Satellite)
**Storage:** Vercel Blob

## Architecture Patterns

### Backend

**Connection Pool Pattern** (`src/db/connection_pool.py`)
- Single global `db_pool` instance initialized at app startup
- Use `async with db_pool.transaction()` for atomic operations
- Connection pool managed via FastAPI lifespan context

**Service Layer Pattern**
- Business logic in `src/services/` (e.g., `trial_service.py`, `token_service.py`)
- Services injected as dependencies: `Depends(get_trial_service)`
- Services handle atomic database operations with row-level locking

**Atomic Operations with Locking**
```python
# Critical: Always use FOR UPDATE NOWAIT for atomic deductions
async with db_pool.transaction() as conn:
    user = await conn.fetchrow("""
        SELECT trial_remaining FROM users
        WHERE id = $1 FOR UPDATE NOWAIT
    """, user_id)
```

**API Router Pattern**
- Routers in `src/api/endpoints/` with prefix `/v1/{resource}`
- All endpoints use dependency injection for services
- Pydantic models for request/response validation

### Frontend

**State Management (Zustand)**
- Global state in `src/store/userStore.ts` with localStorage persistence
- User, accessToken, tokenBalance stored in state
- Access via `const { user, setUser } = useUserStore()`

**API Client Pattern** (`src/lib/api.ts`)
- Centralized axios instance with request interceptor for auth
- Automatic token injection from `userStore`
- Structured API namespaces: `authAPI`, `generationsAPI`, `tokensAPI`

**Authentication Flow**
1. User clicks "Sign in with Google" → Supabase OAuth redirect
2. Google authenticates → callback to `/auth/callback`
3. Callback handler gets session, fetches user from `users` table
4. Stores session in Zustand + localStorage → redirect to `/generate`
5. Database trigger auto-syncs `auth.users` to `public.users`

## Critical Development Commands

### Local Development Setup

**Terminal 1 - Backend:**
```bash
cd backend
# First time: Create virtual environment
python -m venv venv

# CRITICAL: ALWAYS activate venv before starting server
source venv/bin/activate  # Windows: venv\Scripts\activate

# Install dependencies (first time only)
pip install -r requirements.txt

# Start development server
uvicorn src.main:app --reload --port 8000
```

**⚠️ CRITICAL:** Backend MUST run with virtual environment activated. If you see:
- CORS errors from frontend
- `ModuleNotFoundError: No module named 'stripe'`
- API endpoints returning 500 errors

The venv is NOT activated. Always run `source venv/bin/activate` before `uvicorn`.

**Terminal 2 - Frontend:**
```bash
cd frontend
npm install  # First time only
npm run dev  # Port 3000
```

### Backend Commands

```bash
cd backend

# Run all tests
pytest tests/ -v

# Run specific test file
pytest tests/unit/test_trial_service.py -v

# Run tests matching pattern
pytest -k "test_trial_deduction" -v

# Run with coverage
pytest tests/ --cov=src --cov-report=html

# Type check
mypy src/

# Lint
eslint . --fix  # Note: Backend uses Python, not ESLint

# Format code
black src/
isort src/  # Import sorting
```

### Frontend Commands

```bash
cd frontend

# Build for production
npm run build

# Type check
npm run type-check

# Lint
npm run lint

# Run unit tests (Vitest)
npm run test

# Run E2E tests
npm run test:e2e

# Run specific E2E test
npx playwright test tests/e2e/generation-flow.spec.ts --headed
```

### Database Operations

```bash
# Apply migration via Supabase dashboard or psql
psql $DATABASE_URL -f supabase/migrations/XXX_migration.sql

# View database logs
supabase logs

# Reset local Supabase (development only)
supabase db reset
```

### Full Stack Testing

For local E2E testing, ensure both services are running:
1. Backend on port 8000
2. Frontend on port 3000
3. Frontend `.env.local` has `NEXT_PUBLIC_API_URL=http://localhost:8000`

## Common Development Tasks

### Adding New API Endpoint

1. **Define Pydantic models** in `src/models/{resource}.py`:
   ```python
   from pydantic import BaseModel, Field

   class ResourceCreate(BaseModel):
       name: str = Field(..., min_length=1)
       description: str

   class ResourceResponse(BaseModel):
       id: str
       name: str
       description: str
   ```

2. **Create service** in `src/services/{resource}_service.py`:
   - Handle business logic and atomic operations
   - Use `db_pool.transaction()` for critical sections
   - Include `FOR UPDATE NOWAIT` for row locks

3. **Create endpoint** in `src/api/endpoints/{resource}.py`:
   - Define dependencies: `def get_{resource}_service() -> {Resource}Service`
   - Use in endpoint: `service: {Resource}Service = Depends(get_{resource}_service)`
   - Validate auth and user ownership

4. **Register router** in `src/main.py`:
   ```python
   app.include_router({resource}.router)
   ```

### Adding New Frontend Page

1. Create page in `src/pages/{route}.tsx`
2. Add API method to `src/lib/api.ts` with proper error handling
3. Use Zustand store: `const { user, setUser } = useUserStore()`
4. Add auth guard: Redirect if `!user || !user.isAuthenticated`
5. Add E2E tests in `tests/e2e/{feature}.spec.ts`

### Database Schema Changes

1. Create migration file in `supabase/migrations/` (numbered: `NNN_description.sql`)
2. Write migration SQL with comments explaining changes
3. Apply via Supabase dashboard or: `psql $DATABASE_URL -f supabase/migrations/NNN_description.sql`
4. Update corresponding TypeScript types in `src/types/`
5. Update Pydantic models in `src/models/`
6. Create database test data if needed

### Testing Patterns

**Backend - Service Unit Tests:**
```python
@pytest.mark.asyncio
async def test_trial_deduction(test_pool):
    service = TrialService(test_pool)
    result = await service.use_trial_credit(user_id, cost=1)
    assert result.trial_remaining == 2
```

**Frontend - E2E Tests (Playwright):**
```typescript
test('generation flow end-to-end', async ({ page }) => {
    await page.goto('/generate');
    await page.fill('input[name="prompt"]', 'Modern patio');
    await page.click('button:has-text("Generate")');
    await expect(page.locator('.success-message')).toBeVisible();
});
```

## Critical Business Logic

### Trial System
- 3 free credits on registration
- Atomic deduction with `FOR UPDATE NOWAIT`
- Service: `TrialService.use_trial_credit()`
- Shows "trial exhausted" modal when `trial_remaining = 0`

### Token System
- Pay-per-use packages via Stripe Checkout
- Webhook handler at `/v1/webhooks/stripe` (verify signature!)
- Atomic operations prevent negative balances
- Idempotency keys for webhook deduplication

### Subscriptions
- Monthly Pro ($99/month): Unlimited generations
- Active subscription bypasses token/trial checks
- Stripe Customer Portal for self-service management
- Graceful fallback to tokens when subscription expires

### Generation Flow (Feature 004)
- **Endpoint**: `POST /v1/generations` - Accepts location, areas, and transformation prompt
- **Process**:
  1. Validate user has credits (trial or tokens or active subscription)
  2. Fetch Google Maps images (Street View + Satellite) for each yard area
  3. Upload images to Vercel Blob storage
  4. Create generation record with status: `pending`
  5. Queue async Gemini image generation task
  6. Return generation ID immediately for polling
- **Status Tracking**: Client polls `GET /v1/generations/{id}` to track `pending` → `processing` → `completed` or `failed`
- **Credit Deduction**: Atomic operation when generation completes successfully
- **Service**: `GenerationService` with `MapsService` and `GeminiClient` integration

### Google Maps Integration
- Street View + Satellite imagery for yard areas
- Service: `MapsService` with Google Maps API
- Images uploaded to Vercel Blob with signed URLs
- Metadata stored in database for audit trail

### Single-Page Generation Flow (Feature 005)
- **Pattern**: Form + Progress + Results all inline on `/generate` page
- **No Navigation**: Everything happens on one page without routing
- **Polling**: 2-second intervals with 5-minute timeout using `pollGenerationStatus()`
- **State Management**: Zustand store with selective persistence (form state persisted, polling state transient)
- **LocalStorage Recovery**: Save `request_id` on submit, recover on mount, clear on completion
- **Components**:
  - `GenerationProgressInline` - Per-area progress cards with emojis and animations
  - `GenerationResultsInline` - Image gallery with download buttons and modal viewer
- **Error Handling**: Network errors with auto-retry, timeout handling with clear messaging
- **Key Files**:
  - Page: `src/pages/generate.tsx` (single-page flow)
  - Polling Utils: `src/lib/api.ts` (`pollGenerationStatus()`, `isGenerationComplete()`)
  - LocalStorage: `src/lib/localStorage-keys.ts`
  - Store: `src/store/generationStore.ts` (form + polling state)

## Testing Strategy

### **CRITICAL: Automated Testing First, Manual Testing LAST**

**Golden Rule:** NEVER request manual (human) testing until ALL automated tests pass and ALL Critical User Journeys (CUJs) work perfectly, frictionlessly, and beautifully.

### Testing Hierarchy

**1. Automated Testing with Playwright MCP** ✅ **ALWAYS USE THIS FIRST**
- Use Playwright MCP to validate ALL functionality automatically
- Test against local, staging, and production environments
- Verify E2E user flows, UI interactions, and backend integration
- Fix ALL issues discovered through automated testing before proceeding

**2. Backend Unit Tests** (`backend/tests/`)
- Test services independently with mocked database
- Use `pytest` fixtures for test data
- Validate business logic and atomic operations
- Run: `pytest tests/ -v`

**3. Frontend E2E Tests** (`frontend/tests/e2e/`)
- Playwright tests for all critical user journeys
- Test against local backend (port 8000) AND staging (Railway)
- Validate single-page flows, polling, results display
- Run locally: `npm run test:e2e`
- Run staging: `npx playwright test --config=playwright.config.staging.ts`

**4. Integration Tests**
- Full flow testing with real database
- Use separate test database for safety
- Validate end-to-end scenarios with actual services

**5. Manual (Human) Testing** ⚠️ **ONLY AS FINAL SIGN-OFF**
- **Prerequisite:** ALL automated tests must pass 100%
- **Prerequisite:** ALL CUJs must work perfectly (no bugs, no issues)
- **Prerequisite:** User experience must be frictionless and polished
- **Prerequisite:** Design must be beautiful and production-ready
- **Purpose:** Final user experience validation and aesthetic review ONLY

### When to Request Manual Testing

**✅ YES - Request manual testing when:**
- All Playwright E2E tests pass (100%)
- All backend unit tests pass (100%)
- All CUJs verified working through automated tests
- No known bugs or issues exist
- UI/UX is polished and frictionless
- Design is beautiful and production-ready
- Ready for production deployment

**❌ NO - Do NOT request manual testing when:**
- Any automated tests are failing
- Known bugs or issues exist
- Features are incomplete or partially working
- UI has rough edges or usability issues
- Design needs polish
- Backend errors occur during automated testing

### Critical User Journeys (CUJs) Checklist

Before requesting manual testing, verify these CUJs work perfectly via Playwright:

**CUJ1: New User Registration & Trial Flow**
- ✅ Google OAuth sign-in works
- ✅ User created in database with 3 trial credits
- ✅ Redirected to /generate page
- ✅ Can submit first generation using trial credit
- ✅ Trial credits decrement correctly (3 → 2)

**CUJ2: Generation Flow (Feature 005 - Single Page)**
- ✅ Form submission works without page navigation
- ✅ Progress updates appear inline every 2 seconds
- ✅ Results display inline when complete
- ✅ Images load successfully (Vercel Blob)
- ✅ "Create New Design" button resets form
- ✅ No console errors throughout flow

**CUJ3: Token Purchase & Payment**
- ✅ Purchase page displays packages correctly
- ✅ Stripe Checkout session creates successfully
- ✅ Payment succeeds with test card (4242...)
- ✅ Webhook processes payment and adds tokens
- ✅ Token balance updates in UI immediately
- ✅ Can generate with purchased tokens

**CUJ4: Subscription Flow**
- ✅ Subscription page displays plans
- ✅ Can subscribe to Pro plan
- ✅ Active subscription allows unlimited generations
- ✅ Can manage subscription via Customer Portal
- ✅ Cancellation works correctly

### Playwright MCP Commands

```bash
# Local testing (use this for development)
cd frontend && npm run test:e2e

# Staging testing (use this before deployment)
cd frontend && npx playwright test --config=playwright.config.staging.ts

# Production smoke tests (use this after deployment)
cd frontend && npx playwright test --config=playwright.config.production.ts

# Specific test file
npx playwright test tests/e2e/generation-flow-v2.spec.ts

# With UI mode for debugging
npx playwright test --ui

# Generate test report
npx playwright show-report
```

### Test-Driven Development Workflow

1. **Write test FIRST** (Red) - Define expected behavior in Playwright test
2. **Implement feature** (Green) - Make the test pass
3. **Refactor** (Refactor) - Clean up code while tests still pass
4. **Validate with Playwright MCP** - Run full E2E suite
5. **Fix all issues** - Iterate until 100% pass rate
6. **Request manual review** - ONLY when everything is perfect

## Environment Variables

### Frontend (Vercel)
```bash
NEXT_PUBLIC_SUPABASE_URL=https://gxlmnjnjvlslijiowamn.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ... # From Supabase Dashboard
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_51SFRz...
NEXT_PUBLIC_API_URL=https://yarda-api-production.up.railway.app
```

### Backend (Railway)
```bash
DATABASE_URL=postgresql://postgres:...@db.gxlmnjnjvlslijiowamn.supabase.co/postgres
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
GEMINI_API_KEY=...
GOOGLE_MAPS_API_KEY=...
BLOB_READ_WRITE_TOKEN=vercel_blob_rw_...
```

## Database Schema (Key Tables)

**users** - User profiles (synced from auth.users)
- `id` (uuid, PK) - Matches Supabase auth.users.id
- `email`, `email_verified`
- `trial_remaining`, `trial_used` - Trial credit tracking
- `subscription_tier`, `subscription_status`
- `stripe_subscription_id`, `current_period_end`, `cancel_at_period_end` - Subscription details (added 2025-11-06)

**generations** - Generation requests
- `id`, `user_id`, `status`, `image_urls`, `metadata`

**tokens** - Token purchase records
- `user_id`, `amount`, `balance_after`, `transaction_type`

**subscriptions** - Subscription records
- `user_id`, `stripe_subscription_id`, `status`, `plan_type`

## Known Issues & Gotchas

1. **Firebase is deprecated** - Uses Supabase Auth only. Remove all Firebase dependencies when refactoring.
2. **Multiple Railway projects** - Only use `yarda-api` (ID: `7a8f9bcb-a265-4c34-82d2-c9c3655d26bf`). Render backend (`yarda-backend.onrender.com`) is deprecated.
3. **CORS for local development** - When running E2E tests locally:
   - Frontend `.env.local` must have `NEXT_PUBLIC_API_URL=http://localhost:8000`
   - If it points to production Railway URL, API calls will be blocked by CORS
   - Production URL MUST be commented out for local dev
4. **Row-level locking required** - Always use `FOR UPDATE NOWAIT` for atomic deductions in services:
   ```python
   async with db_pool.transaction() as conn:
       user = await conn.fetchrow(
           "SELECT * FROM users WHERE id = $1 FOR UPDATE NOWAIT",
           user_id
       )
   ```
5. **DATABASE_URL password encoding** - Special characters MUST be URL-encoded:
   - `$` → `%24`, `%` → `%25`, `^` → `%5E`, etc.
   - Or asyncpg will fail with "Tenant or user not found" error
6. **Stripe webhook idempotency** - Always check `event.request.idempotency_key` and store processed events to prevent duplicate charge processing
7. **Async generation tasks** - Generation image processing runs async without background job queue. Monitor task queue if performance degrades with many concurrent requests.
8. **Backend venv activation required** - Backend MUST run with virtual environment activated:
   - Symptom: `ModuleNotFoundError: No module named 'stripe'` → venv not activated
   - Symptom: CORS errors from frontend → venv not activated (CORS middleware fails to load)
   - Solution: Always run `source backend/venv/bin/activate` before `uvicorn`
   - Health check may return 200 even without venv (misleading!), but API endpoints will fail
9. **React key props for conditional siblings** - When ANY sibling is conditionally rendered, ALL siblings need unique keys:
   ```tsx
   {networkError && <div key="error-banner">...</div>}
   {timedOut && <div key="timeout-banner">...</div>}
   <Component key="always-rendered" />  {/* This also needs a key! */}
   ```
   - Even always-rendered components need keys if they have conditional siblings
   - Use descriptive keys: `key="network-error"` not `key="div-1"`
   - Prevents React console warnings and improves render performance
   - **Framer Motion AnimatePresence**: Conditional motion.div wrappers MUST have keys:
     ```tsx
     <AnimatePresence>
       {isVisible && (
         <motion.div key="unique-section" ...>  {/* Key required! */}
           <Component />
         </motion.div>
       )}
     </AnimatePresence>
     ```
   - **Sibling motion.div elements**: All sibling motion.div elements need keys, even if not conditionally rendered:
     ```tsx
     <div>
       <motion.div key="dot-1" animate={...} />
       <motion.div key="dot-2" animate={...} />
       <motion.div key="dot-3" animate={...} />
     </div>
     ```

## Fully Automated CI/CD Workflow

### ONE COMMAND: `/test-smart`

This single slash command handles the **entire pipeline** from local development to production deployment with automatic testing, fixing, and deployment at each stage.

**Flow:**
```
Local → Staging/Preview → Production
  ↓         ↓                ↓
Test      Test          Smoke Test
  ↓         ↓                ↓
Auto-Fix  Auto-Fix      Monitor
  ↓         ↓                ↓
Pass      Pass          Done ✅
  ↓         ↓
Deploy    Approve
```

### Environments

**Terminology (Consistent):**
- **Staging** (Railway backend) = **Preview** (Vercel frontend) = Same environment
- `local` → `staging/preview` → `production`

**Local Development:**
- Frontend: `http://localhost:3000`
- Backend: `http://localhost:8000`
- Database: Supabase (development)

**Staging/Preview:**
- Frontend (Vercel Preview): `https://yarda-v5-frontend-git-{branch}-{team}.vercel.app`
- Backend (Railway): Auto-deploys on push to current branch
- Database: Supabase (same as production, but separate schema if needed)
- **Purpose:** Full E2E testing before production

**Production:**
- Frontend (Vercel): `https://yarda.app` (or configured domain)
- Backend (Railway): `https://yarda-api-production.up.railway.app`
- Database: Supabase (production)

### Usage: Single Command Workflow

```bash
# Make code changes
# Edit files in local development

# Run the fully automated pipeline
/test-smart

# Agent automatically does:
# ✅ PHASE 1: LOCAL TESTING & AUTO-FIX
#    - Analyzes what changed
#    - Runs affected tests (smart selection)
#    - Auto-fixes failures (up to 3 attempts)
#    - Reports: "✅ 10/10 tests passed"
#
# ✅ PHASE 2: AUTO-DEPLOY TO STAGING
#    - Commits auto-fixes
#    - Pushes to current branch
#    - Waits for Vercel preview + Railway deployment
#    - Reports: "🚀 Deployed to staging/preview"
#
# ✅ PHASE 3: STAGING TESTING & AUTO-FIX
#    - Runs FULL test suite (47 tests) on staging
#    - Auto-fixes staging-specific failures
#    - Reports: "✅ 47/47 tests passed"
#
# ⏸️ PHASE 4: HUMAN APPROVAL GATE
#    - Shows summary of all tests
#    - Shows preview URL for manual review (optional)
#    - Asks: "Deploy to production? (yes/no/review)"
#
# You type: yes
#
# ✅ PHASE 5: PRODUCTION DEPLOYMENT
#    - Merges to main branch
#    - Pushes (triggers auto-deploy)
#    - Runs production smoke tests
#    - Monitors for errors
#    - Reports: "✅ Production deployment successful!"
```

### Auto-Fix Capability

The agent **automatically fixes** common test failures without manual intervention:

**Examples of Auto-Fixes:**
- Race conditions → Add explicit waits
- Selector changes → Update test selectors
- Timeouts → Increase timeout values
- Network issues → Add retry logic
- Flaky tests → Add stability improvements

**Max 3 attempts per failure.** If unable to fix automatically, escalates to human.

### Error Handling

**Local tests fail (after 3 auto-fix attempts):**
```
❌ Unable to fix automatically.
Manual intervention required.

Run /test-smart again after fixing.
```

**Staging tests fail (after 3 auto-fix attempts):**
```
❌ Staging environment issues detected.
Check: environment variables, database state, API keys

Fix and run /test-smart again.
```

**Agent stops and waits for you to fix the issue.**

### Benefits

- **Zero Manual Testing**: Agent handles all test execution and fixing
- **Zero Manual Deployment**: Agent deploys automatically after tests pass
- **Single Approval Point**: Only human decision is production deployment
- **Full Traceability**: Agent reports every step with detailed logs
- **Automatic Rollback**: If production smoke tests fail, agent can revert

### When to Use

```bash
# Daily development (recommended)
# Make changes → /test-smart → Approve → Done
/test-smart

# Emergency hotfix (skip staging, direct to prod - NOT RECOMMENDED)
# Only use in critical situations
git checkout main
# Make fix
/test-smart --skip-staging  # (if implemented)
```

### Time Estimates

| Phase | Time | What Happens |
|-------|------|--------------|
| Local Testing | 2-5 min | Smart test selection, auto-fix |
| Deploy to Staging | 2-3 min | Push + Vercel/Railway deployment |
| Staging Testing | 7-10 min | Full suite (47 tests), auto-fix |
| Human Approval | 0-∞ min | You review and approve |
| Production Deploy | 2-3 min | Merge, push, smoke tests |
| **Total** | **15-25 min** | Fully automated except approval |

**Compare to manual workflow:** 2-3 hours (testing, fixing, deploying manually)

### Previous Commands (Deprecated)

These are now **built into /test-smart**:
- ~~`/test-fix`~~ → Auto-fix is built-in
- ~~`/deploy-staging`~~ → Auto-deploys after local tests pass
- ~~`/deploy-production`~~ → Auto-deploys after approval

**Use `/test-smart` for everything.**

## Deployment Process (Manual Alternative)

### Frontend (Vercel)
- Auto-deploys on push to `main` branch
- Preview deployments on pull requests
- Configure env vars via Vercel dashboard:
  ```bash
  cd frontend && vercel env add VARIABLE_NAME production
  ```

### Backend (Railway)
- Auto-deploys on push to `main` branch
- Use Railway CLI for manual deploys:
  ```bash
  railway up
  ```
- Configure env vars via Railway dashboard

### Database (Supabase)
- Migrations applied manually via SQL
- Use Supabase dashboard SQL editor or:
  ```bash
  psql $DATABASE_URL -f supabase/migrations/NNN_description.sql
  ```
- Always test migrations locally first

### Deployment Checklist
1. Run all tests locally and ensure they pass
2. Type check both frontend and backend
3. Create pull request with clear description
4. Wait for CI/CD to pass
5. Merge to `main` (auto-deploys to production)
6. Monitor logs for errors:
   - Frontend: Vercel Analytics
   - Backend: Railway logs
   - Database: Supabase logs

## Debugging & Monitoring

### Backend Debugging

**Enable detailed logging:**
```python
import logging
logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger(__name__)
```

**Debug database transactions:**
```python
# Check connection pool status
pool_status = db_pool._pool._holders  # Monitor active connections
```

**Common errors and fixes:**
- `Tenant or user not found` → Check DATABASE_URL encoding (special chars need URL encoding)
- `FOR UPDATE NOWAIT timeout` → Another request is holding the row lock, increase timeout or add retry logic
- `CORS error in E2E tests` → Verify frontend `.env.local` has `NEXT_PUBLIC_API_URL=http://localhost:8000`
- `Stripe webhook signature mismatch` → Verify `STRIPE_WEBHOOK_SECRET` matches webhook signing secret

### Frontend Debugging

**React DevTools:**
- Install React DevTools browser extension for Zustand store inspection
- Monitor state changes in real-time

**Network monitoring:**
- Open DevTools → Network tab to inspect API calls
- Check request/response headers for auth token
- Verify CORS headers on cross-origin requests

**Browser console debugging:**
```typescript
// Check user state
console.log(useUserStore.getState())

// Check auth token
console.log(useUserStore.getState().accessToken)
```

### Monitoring Checklist

**Daily checks:**
- Vercel: No deploy errors or failed builds
- Railway: No backend errors in logs (check `/health` endpoint)
- Supabase: Database connection status, no unusual query times

**Weekly checks:**
- Stripe dashboard: All webhook deliveries successful
- Error tracking: Review any new error patterns
- Performance: Check generation processing times (target: < 2 minutes)

### Stripe Testing

**Test webhook locally:**
```bash
# Install Stripe CLI
stripe listen --forward-to localhost:8000/v1/webhooks/stripe

# In another terminal, trigger test event
stripe trigger payment_intent.succeeded
```

**Test card numbers (Stripe test mode):**
- Success: `4242 4242 4242 4242`
- Decline: `4000 0000 0000 0002`
- 3D Secure: `4000 0025 0000 3155`

## Recent Changes
- 006-magic-link-auth: Added TypeScript 5.6.3 (Frontend), Next.js 15.0.2

### 2025-11-08 - Integration Success & Code Quality Improvements ✅
**Integration Working:**
- ✅ End-to-end generation flow verified working (test generation completed in ~15 seconds)
- ✅ Google Maps API integration operational (geocoding, Street View)

**Critical Infrastructure Fix:**

**Code Quality Improvements:**

**Bug Fixes:**

**Documentation:**

**Status:** Integration verified working, all code production-ready

### 2025-11-07 - Feature 005 Single-Page Generation Flow (Ready for Testing ✅)
**Implementation:**

**Type System:**

**Testing:**

**Status:** Ready for integration testing and verification

### 2025-11-06 - Feature 004 Generation Flow (Production Ready ✅)
**Bug Fixes:**

**Testing:**

**Status:** Feature 004 is production-ready pending final deployment

### 2025-11-04

## Quick Reference - File Locations

| Task | File |
|------|------|
| User authentication flow | `frontend/src/pages/auth/callback.tsx` |
| User state management | `frontend/src/store/userStore.ts` |
| API client with auth | `frontend/src/lib/api.ts` |
| Trial credit deduction | `backend/src/services/trial_service.py` |
| Token deduction | `backend/src/services/token_service.py` |
| Subscription logic | `backend/src/services/subscription_service.py` |
| Generation API | `backend/src/api/endpoints/generations.py` |
| Maps service | `backend/src/services/maps_service.py` |
| Gemini AI integration | `backend/src/services/gemini_client.py` |
| Stripe webhooks | `backend/src/api/endpoints/webhooks.py` |
| Database connection pool | `backend/src/db/connection_pool.py` |
| Database migrations | `supabase/migrations/` |
| Type definitions | `frontend/src/types/` |
| Pydantic models | `backend/src/models/` |

## Active Technologies
- TypeScript 5.6.3 (Frontend), Next.js 15.0.2 (006-magic-link-auth)

- **Frontend**: TypeScript 5.6.3, Next.js 15.0.2, React 18, TailwindCSS, Zustand
- **Backend**: Python 3.11+, FastAPI, asyncpg, Pydantic 2.11
- **Database**: PostgreSQL 17 (Supabase) with row-level security and atomic locking
- **Auth**: Supabase Auth with Google OAuth (Firebase deprecated)
- **Payments**: Stripe (Checkout, Customer Portal, Webhooks)
- **AI**: Google Gemini 2.5 Flash
- **Storage**: Vercel Blob
- **Deployment**: Vercel (Frontend), Railway (Backend), Supabase (Database)
