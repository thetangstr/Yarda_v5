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
**Auth:** Supabase Auth with Google OAuth
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

**Backend Unit Tests** - `backend/tests/`
- Test services independently with mocked database
- Use `pytest` fixtures for test data

**Frontend E2E Tests** - `frontend/tests/e2e/`
- Playwright tests for critical flows
- Run against local backend (port 8000)

**Integration Tests**
- Full flow testing with real database
- Use separate test database

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

## Deployment Process

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

### 2025-11-08 - Integration Success & Code Quality Improvements ✅
**Integration Working:**
- ✅ End-to-end generation flow verified working (test generation completed in ~15 seconds)
- ✅ Google Maps API integration operational (geocoding, Street View)
- ✅ Gemini 2.5 Flash API integration operational (image generation)
- ✅ Trial credit atomic deduction working correctly (3 → 2)

**Critical Infrastructure Fix:**
- Fixed CORS errors caused by backend not running with venv activated
- Root cause: Backend must run with `source venv/bin/activate` to load dependencies
- Symptom: CORS errors, ModuleNotFoundError, API endpoints failing
- **Note:** Gemini API key was NOT expired - integration worked on first try after venv fix

**Code Quality Improvements:**
- Created shared component utilities: `frontend/src/components/generation/shared/constants.ts` (150 lines)
- Created shared utility functions: `frontend/src/components/generation/shared/utils.ts` (42 lines)
- Eliminated ~90 lines of duplicated code from GenerationProgressInline and GenerationResultsInline
- Single source of truth for area mappings, animations, and status colors

**Bug Fixes:**
- Fixed React key warnings in `generate.tsx` lines 340, 365, 389 (parent component issue)
- All siblings in progress section now have unique keys (network-error, timeout-banner, progress-inline)
- Updated area selector to use emoji icons (🏠 🌲 🚶) instead of Lucide components per spec FR-006

**Documentation:**
- Created comprehensive integration summary: `INTEGRATION_SUCCESS_SUMMARY.md`
- Updated CLAUDE.md with critical venv activation requirements
- Documented React key pattern for conditional siblings

**Status:** Integration verified working, all code production-ready

### 2025-11-07 - Feature 005 Single-Page Generation Flow (Ready for Testing ✅)
**Implementation:**
- Ported Yarda v2's proven single-page generation UX to v5
- Created inline progress tracking (`GenerationProgressInline.tsx`) and results display (`GenerationResultsInline.tsx`)
- Implemented 2-second polling with 5-minute timeout
- Added localStorage recovery for interrupted generations
- Replaced `generate.tsx` with single-page flow (old version backed up as `generate-old-backup.tsx`)
- Updated `GenerationFormEnhanced` to sync state with Zustand store

**Type System:**
- Extended `generation.ts` with 5 new interfaces for v2-specific types
- Created utility libraries: `suggested-prompts.ts` (30+ emoji mappings), `localStorage-keys.ts`
- Fixed all type errors: Changed `MultiAreaStatusResponse` → `GenerationStatusResponse` with `areas` property

**Testing:**
- Fixed E2E test login flow to use `/auth` directly
- E2E tests ready to run: `frontend/tests/e2e/generation-flow-v2.spec.ts` (6 comprehensive tests)
- Manual testing required: Verify polling, localStorage recovery, and network error handling

**Status:** Ready for integration testing and verification

### 2025-11-06 - Feature 004 Generation Flow (Production Ready ✅)
**Bug Fixes:**
- Fixed missing database columns: Added `stripe_subscription_id`, `current_period_end`, `cancel_at_period_end` to users table
- Fixed Pydantic model attribute access: Changed `.get()` calls to direct attribute access in payment-status endpoint
- Fixed local development CORS: Updated `frontend/.env.local` to point to `http://localhost:8000` instead of production Railway URL

**Testing:**
- Completed comprehensive E2E testing: 11/11 tests passed (100% pass rate)
- Verified trial credit system working atomically
- Validated generation flow end-to-end: form submission → progress tracking → credit deduction
- Migration file created: `supabase/migrations/014_add_subscription_columns.sql`

**Status:** Feature 004 is production-ready pending final deployment

### 2025-11-04
- Implemented Google Sign-In with Supabase Auth (removed Firebase)
- Created `users` table with auth.users sync trigger
- Updated all environment variables to use correct project IDs
- Fixed CORS to support Vercel preview deployments

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

- **Frontend**: TypeScript 5.6.3, Next.js 15.0.2, React 18, TailwindCSS, Zustand
- **Backend**: Python 3.11+, FastAPI, asyncpg, Pydantic 2.11
- **Database**: PostgreSQL 17 (Supabase) with row-level security and atomic locking
- **Auth**: Supabase Auth with Google OAuth (Firebase deprecated)
- **Payments**: Stripe (Checkout, Customer Portal, Webhooks)
- **AI**: Google Gemini 2.5 Flash
- **Storage**: Vercel Blob
- **Deployment**: Vercel (Frontend), Railway (Backend), Supabase (Database)
