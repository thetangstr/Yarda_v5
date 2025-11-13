# Yarda V5 - System Architecture Diagram

## High-Level System Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           USER'S BROWSER                                     │
│                                                                               │
│  ┌──────────────────────────────────────────────────────────────────────┐   │
│  │  FRONTEND (Vercel - Next.js 15.0.2 + React 18)                       │   │
│  │  ┌────────────────────────────────────────────────────────────────┐  │   │
│  │  │ Pages:                                                         │  │   │
│  │  │ - index.tsx (landing)          - generate.tsx (main app)     │  │   │
│  │  │ - auth.tsx (OAuth)             - holiday.tsx (seasonal)      │  │   │
│  │  │ - pricing.tsx (packages)       - history.tsx (gallery)       │  │   │
│  │  │ - account.tsx (profile)        - subscription/ (mgmt)        │  │   │
│  │  └────────────────────────────────────────────────────────────────┘  │   │
│  │                                                                        │   │
│  │  ┌────────────────────────────────────────────────────────────────┐  │   │
│  │  │ Components (React):                                            │  │   │
│  │  │ - GenerationForm + AreaSelector + StyleSelector              │  │   │
│  │  │ - GenerationProgress (polling UI)                            │  │   │
│  │  │ - TokenBalance, TrialCounter, SubscriptionManager            │  │   │
│  │  │ - GoogleSignInButton, ErrorRecovery, Toast                   │  │   │
│  │  └────────────────────────────────────────────────────────────────┘  │   │
│  │                                                                        │   │
│  │  ┌────────────────────────────────────────────────────────────────┐  │   │
│  │  │ State Management (Zustand):                                   │  │   │
│  │  │ - userStore (auth + balances)                                │  │   │
│  │  │ - generationStore (form + polling)                           │  │   │
│  │  └────────────────────────────────────────────────────────────────┘  │   │
│  │                                                                        │   │
│  │  ┌────────────────────────────────────────────────────────────────┐  │   │
│  │  │ HTTP Client (Axios):                                          │  │   │
│  │  │ - apiClient with auth token injection (localStorage)         │  │   │
│  │  │ - Request: Inject Bearer token                               │  │   │
│  │  │ - Response: Catch 401 → logout + redirect                    │  │   │
│  │  └────────────────────────────────────────────────────────────────┘  │   │
│  └──────────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    │ HTTPS API Calls
                                    │ (axios with auth)
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                    BACKEND (Railway - FastAPI Python 3.11+)                  │
│                                                                               │
│  ┌────────────────────────────────────────────────────────────────────────┐ │
│  │ FastAPI Application (main.py)                                         │ │
│  │ - Lifespan: Initialize asyncpg pool on startup                       │ │
│  │ - CORS: localhost:3000-3003 + production URLs                        │ │
│  │ - Routes: /auth, /users, /v1/generations, /v1/tokens, /v1/webhooks  │ │
│  └────────────────────────────────────────────────────────────────────────┘ │
│                                                                               │
│  ┌────────────────────────────────────────────────────────────────────────┐ │
│  │ API Endpoints (/api/endpoints/)                                       │ │
│  ├─────────────────────────────────────────────────────────────────────┐ │ │
│  │ auth.py                                                             │ │ │
│  │ - POST /auth/signup (register)                                      │ │ │
│  │ - POST /auth/login (oauth callback)                                 │ │ │
│  │ - POST /auth/logout                                                 │ │ │
│  └─────────────────────────────────────────────────────────────────────┘ │ │
│  ├─────────────────────────────────────────────────────────────────────┐ │ │
│  │ users.py                                                            │ │ │
│  │ - GET /users (current user profile)                                │ │ │
│  │ - GET /users/payment-status (subscription/trial/token balance)     │ │ │
│  └─────────────────────────────────────────────────────────────────────┘ │ │
│  ├─────────────────────────────────────────────────────────────────────┐ │ │
│  │ generations.py                                    🔴 CRITICAL      │ │ │
│  │ - POST /v1/generations (create generation)                          │ │ │
│  │ - GET /v1/generations/{id} (poll status)                            │ │ │
│  │ - GET /v1/generations (history)                                     │ │ │
│  │                                                                      │ │ │
│  │ Workflow:                                                            │ │ │
│  │ 1. Authorize user (subscription > trial > token)                   │ │ │
│  │ 2. Deduct payment ATOMICALLY (FOR UPDATE NOWAIT)                   │ │ │
│  │ 3. Fetch Google Maps images (geocoding, street view, satellite)   │ │ │
│  │ 4. Call Gemini 2.5 Flash for each area                             │ │ │
│  │ 5. Upload results to Vercel Blob                                    │ │ │
│  │ 6. Save generation record                                           │ │ │
│  │ 7. Refund on failure                                                │ │ │
│  └─────────────────────────────────────────────────────────────────────┘ │ │
│  ├─────────────────────────────────────────────────────────────────────┐ │ │
│  │ tokens.py                                                           │ │ │
│  │ - POST /v1/tokens/checkout (create Stripe session)                  │ │ │
│  │ - GET /v1/tokens/balance (current balance)                          │ │ │
│  └─────────────────────────────────────────────────────────────────────┘ │ │
│  ├─────────────────────────────────────────────────────────────────────┐ │ │
│  │ subscriptions.py                                                    │ │ │
│  │ - POST /v1/subscriptions/checkout (Monthly Pro)                     │ │ │
│  │ - GET /v1/subscriptions/status                                      │ │ │
│  │ - POST /v1/subscriptions/cancel                                     │ │ │
│  └─────────────────────────────────────────────────────────────────────┘ │ │
│  ├─────────────────────────────────────────────────────────────────────┐ │ │
│  │ webhooks.py                                        🔴 CRITICAL      │ │ │
│  │ - POST /v1/webhooks/stripe (payment.intent.succeeded, etc.)         │ │ │
│  │ - Verify signature with STRIPE_WEBHOOK_SECRET                       │ │ │
│  │ - Idempotency: Check event.request.idempotency_key                  │ │ │
│  │ - Deduct tokens atomically on success                               │ │ │
│  └─────────────────────────────────────────────────────────────────────┘ │ │
│  ├─────────────────────────────────────────────────────────────────────┐ │ │
│  │ holiday.py (Feature 007)                                            │ │ │
│  │ - POST /v1/holiday/generations                                      │ │ │
│  │ - GET /v1/holiday/generations/{id}                                  │ │ │
│  │ - GET /v1/holiday/credits                                           │ │ │
│  └─────────────────────────────────────────────────────────────────────┘ │ │
│  ├─────────────────────────────────────────────────────────────────────┐ │ │
│  │ credits.py (Unified Credit System)                                  │ │ │
│  │ - GET /v1/credits (trial + tokens + holiday + subscription)         │ │ │
│  └─────────────────────────────────────────────────────────────────────┘ │ │
│                                                                               │
│  ┌────────────────────────────────────────────────────────────────────────┐ │
│  │ Services (/services/)                                                  │ │
│  │                                                                         │ │
│  │ Core Generation:                                                       │ │
│  │ ├─ generation_service.py      🔴 Orchestrates full workflow          │ │
│  │ ├─ gemini_client.py           🔴 Google Gemini 2.5 Flash API        │ │
│  │ ├─ maps_service.py            🔴 Google Maps (geocoding, images)    │ │
│  │ └─ storage_service.py         🔴 Vercel Blob upload/download        │ │
│  │                                                                         │ │
│  │ Payment Systems:                                                       │ │
│  │ ├─ trial_service.py           Trial credits (3 free)                │ │
│  │ ├─ token_service.py           Token balance (pay-per-use)           │ │
│  │ ├─ subscription_service.py     Monthly Pro subscription              │ │
│  │ ├─ stripe_service.py          Stripe API wrapper                    │ │
│  │ └─ webhook_service.py         Webhook verification & processing     │ │
│  │                                                                         │ │
│  │ Credit Systems:                                                        │ │
│  │ ├─ credit_service.py          Unified credit balance                │ │
│  │ ├─ holiday_credit_service.py  Holiday decorator credits             │ │
│  │ └─ holiday_generation_service.py Holiday decorator generation      │ │
│  │                                                                         │ │
│  │ Utilities:                                                             │ │
│  │ ├─ prompt_builder.py          Perspective-based prompt engineering  │ │
│  │ ├─ prompt_templates.py        Style-specific templates              │ │
│  │ ├─ auto_reload_service.py     Automatic token top-up                │ │
│  │ ├─ retention_policy.py        Data cleanup & archiving              │ │
│  │ ├─ share_service.py           Social share tracking                 │ │
│  │ ├─ usage_monitor.py           API usage monitoring                  │ │
│  │ └─ debug_service.py           Admin logging utilities               │ │
│  └────────────────────────────────────────────────────────────────────────┘ │
│                                                                               │
│  ┌────────────────────────────────────────────────────────────────────────┐ │
│  │ Database Connection Pool (/db/connection_pool.py)   🔴 CRITICAL       │ │
│  │                                                                         │ │
│  │ Global singleton: db_pool                                              │ │
│  │ - asyncpg pool (min: 2, max: 10 connections)                          │ │
│  │ - Connection timeout: 60 seconds                                       │ │
│  │ - Statement cache: DISABLED (pgbouncer compatibility)                 │ │
│  │ - All queries use FOR UPDATE NOWAIT for atomicity                     │ │
│  │                                                                         │ │
│  │ Initialized in FastAPI lifespan (startup)                              │ │
│  │ Closed on shutdown                                                     │ │
│  └────────────────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────────────┘
        ▲
        │
        │ SQL Queries (asyncpg)
        │ (FOR UPDATE NOWAIT for atomicity)
        │
        ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│              DATABASE (Supabase - PostgreSQL 17, us-east-2)                 │
│                                                                               │
│  ┌────────────────────────────────────────────────────────────────────────┐ │
│  │ Core Tables:                                                           │ │
│  │ ├─ users (id, email, trial_remaining, subscription_tier, etc.)       │ │
│  │ ├─ users_token_accounts (balance, updated_at)                         │ │
│  │ ├─ users_token_transactions (type, amount, balance_after)             │ │
│  │ ├─ generations (id, user_id, status, payment_type, error_message)    │ │
│  │ ├─ generation_areas (area_type, style, image_urls)                    │ │
│  │ ├─ subscriptions (stripe_subscription_id, status, period_end)         │ │
│  │ └─ holiday_generations (style, coordinates, decorated_image_url)     │ │
│  │                                                                         │ │
│  │ Security:                                                              │ │
│  │ ├─ Row-Level Security (RLS) policies per user                         │ │
│  │ ├─ All data filtered by auth.users.id                                 │ │
│  │ └─ Trigger: Auto-sync auth.users → users table                        │ │
│  │                                                                         │ │
│  │ Indexes:                                                               │ │
│  │ ├─ idx_users_email, idx_users_subscription_status                     │ │
│  │ ├─ idx_generations_user_created, idx_generations_status               │ │
│  │ └─ idx_token_transactions_user_created                                │ │
│  └────────────────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────────────┘
        ▲                                    ▲
        │                                    │
        │ Auth Tokens & Session              │ OAuth Redirect
        │ (JWT from Supabase Auth)           │
        │                                    │
        ▼                                    ▼
┌───────────────────────────────┐  ┌──────────────────────────────────────┐
│  SUPABASE AUTH                │  │  GOOGLE OAUTH                        │
│  (Passwordless + Google)      │  │  - Sign in with Google               │
│  - Magic Link flow            │  │  - Redirect to callback.tsx          │
│  - Google OAuth2              │  │  - Exchange code for session         │
│  - Token verification         │  └──────────────────────────────────────┘
└───────────────────────────────┘

                    ▲
                    │ HTTP Requests (Google Maps API, Gemini API)
                    │
        ┌───────────┴──────────┬──────────────┬────────────────┐
        │                      │              │                │
        ▼                      ▼              ▼                ▼
┌──────────────────┐  ┌──────────────────┐  ┌──────────────┐  ┌────────────┐
│ GOOGLE MAPS API  │  │ GOOGLE GEMINI AI │  │  STRIPE API  │  │ VERCEL     │
│                  │  │  (2.5 Flash)     │  │              │  │ BLOB       │
│ - Geocoding      │  │                  │  │ - Checkout   │  │            │
│ - Street View    │  │ - Image generation
│ - Satellite      │  │ - Model: 2.5-    │  │ - Webhooks   │  │ - Upload   │
│                  │  │   flash-image    │  │ - Customer   │  │ - Download │
│                  │  │                  │  │   Portal     │  │ - CDN      │
└──────────────────┘  └──────────────────┘  └──────────────┘  └────────────┘
```

---

## Data Flow: Complete Generation Request

```
USER INTERACTION
│
▼
[FRONTEND: generate.tsx]
  Input: address, areas=[front_yard, backyard], style, custom_prompt
  │
  ├─ Validate inputs
  ├─ Show loading UI
  └─ POST /v1/generations
      │
      ▼
[BACKEND: API Endpoint - generations.py]
  POST /v1/generations (authenticated with Bearer token)
      │
      ├─ Extract user_id from JWT token
      ├─ Load user profile (subscription_tier, subscription_status, trial_remaining, tokens)
      │
      ▼
[BACKEND: GenerationService]
  1. AUTHORIZATION (check_authorization_hierarchy)
      ├─ IF subscription_status='active' → use 'subscription' (unlimited)
      ├─ ELSE IF trial_remaining > 0 → use 'trial'
      ├─ ELSE IF token_balance > 0 → use 'token'
      └─ ELSE → return 403 (insufficient credits)
      │
      ▼
  2. ATOMIC PAYMENT DEDUCTION (authorize_and_deduct_payment)
      ├─ LOCK user row: FOR UPDATE NOWAIT
      ├─ IF using trial:  trial_remaining -= 1
      ├─ IF using token: token_balance -= 1
      ├─ IF using subscription: no change (unlimited)
      ├─ COMMIT transaction (payment locked in)
      └─ Create generation record with status='pending'
      │
      ▼
  3. MAPS SERVICE (fetch source images)
      ├─ Geocode address → lat/lng
      │  (Google Geocoding API)
      │
      ├─ FOR EACH AREA:
      │  ├─ IF front_yard:
      │  │   ├─ Get Street View at heading/pitch
      │  │   ├─ Upload to Vercel Blob
      │  │   └─ Store URL in generation_areas
      │  │
      │  └─ IF backyard:
      │      ├─ Get Satellite overhead view
      │      ├─ Upload to Vercel Blob
      │      └─ Store URL in generation_areas
      │
      ▼
  4. GEMINI AI PROCESSING (process_multi_area_generation)
      │
      ├─ FOR EACH AREA in parallel (asyncio.gather):
      │  │
      │  ├─ Load source image from Vercel Blob
      │  │
      │  ├─ Build perspective-aware prompt:
      │  │  ├─ IF front_yard:
      │  │  │   └─ "Transform this street view while preserving house..."
      │  │  │
      │  │  └─ IF backyard:
      │  │      └─ "CREATE NEW 45° architectural rendering..."
      │  │      └─ "This is SATELLITE VIEW (overhead). Generate new perspective"
      │  │
      │  ├─ Call Gemini 2.5 Flash API
      │  │  (input_image + prompt → output image)
      │  │
      │  ├─ Upload result to Vercel Blob
      │  │
      │  └─ Update generation_areas with image_url
      │
      ▼
  5. DATABASE UPDATE
      │
      ├─ UPDATE generations SET status='completed'
      ├─ UPDATE generation_areas SET image_urls={...}
      └─ Return generation_id to frontend
      │
      ▼
[FRONTEND: Display Results]
  GET /v1/generations/{id} (poll every 2 seconds)
      │
      ├─ WHILE status='pending' or 'processing':
      │   ├─ Wait 2 seconds
      │   └─ Fetch status again
      │
      ├─ WHEN status='completed':
      │   ├─ Stop polling
      │   ├─ Display GenerationResultsInline component
      │   ├─ Show before/after images
      │   ├─ Offer download, share, "Create New Design"
      │   └─ Update credit balance in UI
      │
      └─ IF status='failed':
          ├─ Stop polling
          ├─ Display error message
          ├─ REFUND credits to user
          └─ Allow retry or new design


ERROR HANDLING & REFUND PATH:
────────────────────────────

If ANY step fails after payment deduction:
  │
  ├─ Catch exception
  ├─ Log error with context
  ├─ Call GenerationService._handle_failure()
  │   │
  │   ├─ IF payment_type='trial':
  │   │   └─ trial_remaining += 1 (refund atomic)
  │   │
  │   ├─ IF payment_type='token':
  │   │   └─ token_balance += 1 (refund atomic)
  │   │
  │   └─ IF payment_type='subscription':
  │       └─ (no refund, unlimited)
  │
  ├─ UPDATE generation SET status='failed', error_message='...'
  └─ Return 500 with error details
```

---

## Payment System Hierarchy

```
AUTHORIZATION CHECK (when user submits generation):
══════════════════════════════════════════════════════

┌─────────────────────────────────────────────────┐
│ CHECK 1: ACTIVE SUBSCRIPTION                    │
│ IF subscription_status = 'active'               │
│    THEN: Unlimited generations (no deduction)   │
│    PRIORITY: Highest ✓                          │
│                                                   │
│ Statuses that allow generation:                │
│ ├─ 'active' (current period)                   │
│ └─ 'past_due' (grace period, 3 days)           │
└─────────────────────────────────────────────────┘
                      │
                      NO
                      │
                      ▼
┌─────────────────────────────────────────────────┐
│ CHECK 2: TRIAL CREDITS                          │
│ IF trial_remaining > 0                          │
│    THEN: Deduct 1 trial credit                 │
│    PRIORITY: Medium ✓                           │
│                                                   │
│ Initialize on signup: 3 credits                │
│ Reset: Never (one-time offer)                  │
└─────────────────────────────────────────────────┘
                      │
                      NO
                      │
                      ▼
┌─────────────────────────────────────────────────┐
│ CHECK 3: TOKEN BALANCE                          │
│ IF balance > 0                                  │
│    THEN: Deduct 1 token                        │
│    PRIORITY: Lowest ✓                           │
│                                                   │
│ Acquire via: Stripe purchase or Webhook        │
│ Price: $5 = 5 tokens, $20 = 25 tokens          │
└─────────────────────────────────────────────────┘
                      │
                      NO
                      │
                      ▼
           ┌──────────────────────┐
           │ 403 FORBIDDEN        │
           │ No payment method    │
           │ available            │
           └──────────────────────┘
```

---

## Critical Database Atomicity Pattern

```
❌ WRONG (Race condition possible):
═══════════════════════════════════

async def deduct_trial(user_id):
    user = await db.fetchrow("SELECT trial_remaining FROM users WHERE id = $1", user_id)
    if user.trial_remaining > 0:
        # ⚠️ RACE: Another request might check here at same time
        # Both see trial_remaining=1, both try to deduct → ends up at -1
        await db.execute("UPDATE users SET trial_remaining = ? - 1 WHERE id = ?", user_id)


✅ CORRECT (Atomic with row-level lock):
═════════════════════════════════════════

async def deduct_trial(user_id):
    async with db_pool.transaction() as conn:
        # Lock the row so no other request can touch it
        user = await conn.fetchrow(
            "SELECT trial_remaining FROM users WHERE id = $1 FOR UPDATE NOWAIT",
            user_id
        )
        if user.trial_remaining > 0:
            # ✓ Only this transaction can update
            # ✓ Other transactions must wait for lock
            # ✓ If lock timeout: raise exception (conflict)
            await conn.execute(
                "UPDATE users SET trial_remaining = trial_remaining - 1 WHERE id = $1",
                user_id
            )
        else:
            raise InsufficientCreditsError()
```

---

## Deployment Topology

```
PRODUCTION:
═══════════

Internet
   │
   ├─ FRONTEND DOMAIN (TBD)
   │  │
   │  └─ Vercel Edge Network (CDN)
   │     │
   │     └─ Vercel Serverless Functions
   │        └─ Next.js 15.0.2 (auto-deployed on main push)
   │           │
   │           ├─ Client-side routing
   │           ├─ Static assets
   │           └─ API routes (if any)
   │
   └─ API: yarda-api-production.up.railway.app
      │
      └─ Railway Container (Docker)
         │
         └─ FastAPI + Uvicorn
            │
            ├─ Service: yarda-api
            ├─ Project: yarda-api (ID: 7a8f9bcb-a265-4c34-82d2-c9c3655d26bf)
            └─ Auto-deployed on main push
               │
               └─ Connects to Supabase Database (us-east-2)
                  │
                  └─ PostgreSQL 17
                     ├─ Project: gxlmnjnjvlslijiowamn
                     └─ Region: us-east-2

STAGING/PREVIEW:
════════════════

  Feature Branch
     │
     ├─ Vercel Preview
     │  └─ Auto-generated URL: yarda-v5-frontend-git-[branch]-...
     │
     └─ Railway Preview (optional)
        └─ Deploy current branch for testing

LOCAL DEVELOPMENT:
══════════════════

  Developer Machine
     │
     ├─ Frontend: http://localhost:3000 (npm run dev)
     ├─ Backend: http://localhost:8000 (python -m uvicorn src.main:app)
     └─ Database: Supabase (remote, same as production)
        └─ .env.local has credentials
```

