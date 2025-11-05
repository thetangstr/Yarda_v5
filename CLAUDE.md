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

### Run Backend
```bash
cd backend
uvicorn src.main:app --reload --port 8000
```

### Run Frontend
```bash
cd frontend
npm run dev  # Port 3000
```

### Run Single Backend Test
```bash
cd backend
pytest tests/test_trial_service.py -v -k "test_specific_function"
```

### Run Frontend E2E Test
```bash
cd frontend
npx playwright test tests/e2e/trial-flow.spec.ts --headed
```

### Database Migration (Supabase)
```bash
# Use Supabase MCP or apply via psql:
psql $DATABASE_URL -f supabase/migrations/XXX_migration.sql
```

### Type Check
```bash
# Frontend
cd frontend && npm run type-check

# Backend
cd backend && mypy src/
```

## Common Development Tasks

### Adding New API Endpoint

1. Define Pydantic models in `src/models/`
2. Create endpoint in `src/api/endpoints/{resource}.py`
3. Add service logic in `src/services/{resource}_service.py`
4. Use dependency injection for services
5. Register router in `src/main.py`

Example:
```python
# src/api/endpoints/resource.py
@router.post("/resource", response_model=ResourceResponse)
async def create_resource(
    data: ResourceCreate,
    service: ResourceService = Depends(get_resource_service)
):
    return await service.create(data)
```

### Adding New Frontend Page

1. Create page in `src/pages/{route}.tsx`
2. Add API method to `src/lib/api.ts`
3. Use Zustand store for state: `const { user } = useUserStore()`
4. Handle authentication: Check `user` and redirect if needed

### Database Schema Changes

1. Create migration file in `supabase/migrations/` (numbered sequence)
2. Apply via Supabase MCP: `mcp__supabase__apply_migration`
3. Update TypeScript types if needed
4. Update Pydantic models in `src/models/`

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

### Google Maps Integration
- Street View + Satellite imagery for yard areas
- Service: `MapsService` with Google Maps API
- Images uploaded to Vercel Blob
- Metadata stored in `generation_source_images` table

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

**generations** - Generation requests
- `id`, `user_id`, `status`, `image_urls`, `metadata`

**tokens** - Token purchase records
- `user_id`, `amount`, `balance_after`, `transaction_type`

**subscriptions** - Subscription records
- `user_id`, `stripe_subscription_id`, `status`, `plan_type`

## Known Issues & Gotchas

1. **Firebase is being removed** - Project is migrating to Supabase Auth only
2. **Multiple Railway projects exist** - Only use `yarda-api` (ID: `7a8f9bcb-a265-4c34-82d2-c9c3655d26bf`)
3. **Render backend is deprecated** - Do not use `yarda-backend.onrender.com`
4. **CORS configured for Vercel** - Regex allows `*.vercel.app` preview deployments
5. **Row-level locking required** - Always use `FOR UPDATE NOWAIT` for atomic operations

## Deployment Process

**Frontend** - Auto-deploys on push to main via Vercel
**Backend** - Auto-deploys on push via Railway
**Database** - Migrations applied manually via Supabase MCP

Update environment variables:
```bash
# Vercel
cd frontend && vercel env add VARIABLE_NAME production

# Railway
# Use Railway dashboard or CLI
```

## Recent Changes (2025-11-04)
- Implemented Google Sign-In with Supabase Auth (removed Firebase)
- Created `users` table with auth.users sync trigger
- Updated all environment variables to use correct project IDs
- Fixed CORS to support Vercel preview deployments
