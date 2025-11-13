# Yarda AI Landscape Studio - Comprehensive Codebase Architecture Overview

## Executive Summary

**Yarda V5** is a full-stack AI-powered landscape design generation platform with:
- **Frontend**: Next.js 15.0.2 + React 18 + TypeScript 5.6.3 + TailwindCSS (Vercel deployment)
- **Backend**: Python 3.11+ FastAPI with asyncpg connection pooling (Railway deployment)
- **Database**: PostgreSQL 17 via Supabase with Row-Level Security (us-east-2)
- **AI/ML**: Google Gemini 2.5 Flash for image generation
- **Maps**: Google Maps API for Street View + Satellite imagery
- **Storage**: Vercel Blob for image storage
- **Payments**: Stripe for tokens, subscriptions, and webhooks
- **Auth**: Supabase Auth with Google OAuth + Magic Link (passwordless)

---

## 1. DIRECTORY STRUCTURE

### Root Level
```
/Users/Kailor_1/Desktop/Projects/Yarda_v5/
├── backend/                    # Python FastAPI application
├── frontend/                   # Next.js React application  
├── supabase/                   # Database migrations & configuration
├── specs/                      # Feature specifications (archived)
├── docs/                       # Documentation
├── statics/                    # Static assets & images
├── .playwright-mcp/            # Playwright test execution artifacts
├── .env.local                  # Local environment variables (GITIGNORED)
├── CLAUDE.md                   # 🔴 CRITICAL: Project instructions & patterns
├── package.json                # Root monorepo setup
└── test_prompt_generation.py   # Local testing script
```

### Backend Structure (`backend/src/`)
```
backend/
├── src/
│   ├── main.py                 # FastAPI app entry point + lifespan management
│   ├── config.py               # Environment variables & application settings
│   ├── db/
│   │   ├── connection_pool.py  # Global asyncpg connection pool (CRITICAL)
│   │   └── __init__.py
│   ├── api/
│   │   ├── dependencies.py     # FastAPI dependency injection (auth, services)
│   │   └── endpoints/          # API routers organized by domain
│   │       ├── auth.py         # Authentication endpoints
│   │       ├── users.py        # User profile & payment status
│   │       ├── generations.py  # Landscape generation workflow
│   │       ├── tokens.py       # Token purchase & management
│   │       ├── subscriptions.py # Stripe subscription management
│   │       ├── webhook.py      # Stripe webhook handlers
│   │       ├── holiday.py      # Holiday decorator feature (Feature 007)
│   │       ├── credits.py      # Unified credit balance endpoint
│   │       └── debug.py        # Admin debug endpoints
│   ├── services/               # Business logic & external integrations
│   │   ├── generation_service.py        # Orchestrates landscape generation workflow
│   │   ├── gemini_client.py             # Google Gemini 2.5 Flash AI integration
│   │   ├── maps_service.py              # Google Maps API integration (geocoding, Street View, Satellite)
│   │   ├── storage_service.py           # Vercel Blob storage integration
│   │   ├── trial_service.py             # Trial credit management (atomic deductions)
│   │   ├── token_service.py             # Token credit management (pay-per-use)
│   │   ├── subscription_service.py      # Subscription status & grace period logic
│   │   ├── stripe_service.py            # Stripe API wrapper
│   │   ├── webhook_service.py           # Webhook signature verification & idempotency
│   │   ├── holiday_generation_service.py # Holiday decorator generation
│   │   ├── holiday_credit_service.py    # Holiday credit system (viral marketing)
│   │   ├── share_service.py             # Social share tracking & credit rewards
│   │   ├── prompt_builder.py            # AI prompt generation with perspective-based strategy
│   │   ├── prompt_templates.py          # Style-specific prompt templates
│   │   ├── credit_service.py            # Unified credit balance management
│   │   ├── auto_reload_service.py       # Automatic token recharge system
│   │   ├── retention_policy.py          # Data retention & cleanup
│   │   ├── usage_monitor.py             # API usage tracking
│   │   ├── debug_service.py             # Admin logging utilities
│   │   └── __init__.py
│   ├── models/                 # Pydantic V2 data models
│   │   ├── generation.py       # Generation request/response models
│   │   ├── user.py             # User data models
│   │   ├── subscription.py     # Subscription data models
│   │   ├── token_account.py    # Token account models
│   │   ├── holiday.py          # Holiday decorator models
│   │   ├── credits.py          # Unified credit models
│   │   └── __init__.py
│   ├── lib/
│   │   ├── imageComposition.py # Image composition utilities
│   │   └── __init__.py
│   └── __init__.py
├── tests/                      # Test suites
│   ├── unit/                   # Unit tests for services
│   ├── integration/            # Integration tests with database
│   ├── conftest.py             # Pytest fixtures & configuration
│   └── setup_test_user.py
├── scripts/                    # Utility scripts
│   ├── verify_setup.py
│   ├── get_credentials.py
│   ├── grant_admin_credits.py
│   └── apply_migrations.py
├── venv/                       # Python virtual environment (GITIGNORED)
├── requirements.txt            # Python dependencies
├── pytest.ini                  # Pytest configuration
└── .env                        # Backend environment variables (GITIGNORED)
```

### Frontend Structure (`frontend/src/`)
```
frontend/
├── src/
│   ├── pages/                  # Next.js pages (file-based routing)
│   │   ├── _app.tsx            # Root app wrapper + global providers
│   │   ├── _document.tsx       # HTML document template
│   │   ├── index.tsx           # Landing page with marketing content
│   │   ├── auth.tsx            # Authentication page (Google OAuth)
│   │   ├── auth/
│   │   │   └── callback.tsx    # OAuth callback handler
│   │   ├── login.tsx           # Login page (passwordless/magic link)
│   │   ├── register.tsx        # User registration
│   │   ├── generate.tsx        # Main generation page (Feature 005: Single-page flow)
│   │   ├── generate/           # Multi-area generation sub-pages
│   │   ├── holiday.tsx         # Holiday decorator feature (Feature 007)
│   │   ├── pricing.tsx         # Token packages & subscription pricing
│   │   ├── account.tsx         # User account & profile management
│   │   ├── purchase.tsx        # Token purchase flow (Stripe Checkout)
│   │   ├── history.tsx         # Generation history & gallery
│   │   ├── projects.tsx        # Saved projects (future)
│   │   ├── share-test.tsx      # Social share testing page
│   │   └── subscription/       # Subscription management pages
│   ├── components/             # React components (organized by feature)
│   │   ├── generation/
│   │   │   ├── GenerationForm.tsx                # Form for area selection & prompts
│   │   │   ├── GenerationFormEnhanced.tsx        # Enhanced version with validation
│   │   │   ├── GenerationProgress.tsx            # Progress indicator
│   │   │   ├── GenerationProgressInline.tsx      # Inline progress (Feature 005)
│   │   │   ├── AreaSelector.tsx                  # Yard area selection UI
│   │   │   ├── AreaSelectorEnhanced.tsx          # Enhanced with map preview
│   │   │   ├── LocationPreviewThumbnails.tsx     # Google Maps preview thumbnails
│   │   │   ├── AddressInput.tsx                  # Address input with autocomplete
│   │   │   ├── StyleSelector.tsx                 # Landscape style selection
│   │   │   ├── StyleSelectorEnhanced.tsx         # Enhanced style UI
│   │   │   ├── PreservationStrengthSlider.tsx    # Transformation intensity slider
│   │   │   ├── SuggestedPrompts.tsx              # AI-suggested improvements
│   │   │   └── CameraAnimation.tsx               # Camera animation effects
│   │   ├── holiday/
│   │   │   ├── SocialShareModal.tsx              # Share modal for credits
│   │   │   └── (holiday-specific components)
│   │   ├── auth/
│   │   │   ├── AuthOptions.tsx                   # OAuth & email options
│   │   │   ├── MagicLinkForm.tsx                 # Passwordless auth form
│   │   │   └── GoogleSignInButton.tsx
│   │   ├── GoogleOneTap.tsx                      # Google One Tap prompt
│   │   ├── Navigation.tsx                        # Header navigation
│   │   ├── Footer.tsx                            # Footer navigation
│   │   ├── TokenBalance/                         # Token balance display
│   │   ├── TrialCounter/                         # Trial credits counter
│   │   ├── SubscriptionManager/                  # Subscription UI
│   │   ├── TokenPurchaseModal/                   # Token purchase modal
│   │   ├── TrialExhaustedModal/                  # Modal when trial exhausted
│   │   ├── BeforeAfterSlider.tsx                 # Image comparison slider
│   │   ├── BounceLoadingIcon.tsx                 # Reusable loading animation
│   │   ├── HolidayHero.tsx                       # Holiday hero section
│   │   ├── StreetViewRotator.tsx                 # Street View camera rotator
│   │   ├── ErrorRecovery.tsx                     # Network error recovery UI
│   │   ├── WhatsNewModal.tsx                     # Feature announcement modal
│   │   ├── DebugPanel.tsx                        # Development debug panel
│   │   └── Toast.tsx                             # Toast notifications
│   ├── lib/                    # Utility functions & API clients
│   │   ├── api.ts              # Axios API client with interceptors (CRITICAL)
│   │   ├── supabase.ts         # Supabase client initialization
│   │   ├── creditSync.ts       # Credit balance synchronization
│   │   ├── imageComposition.ts # Image processing utilities
│   │   ├── seasonalFeatures.ts # Seasonal feature logic
│   │   ├── watermark.ts        # Image watermarking
│   │   ├── validation.ts       # Form validation utilities
│   │   ├── validators.ts       # Input validators
│   │   ├── error-handling.ts   # Error handling utilities
│   │   ├── localStorage-keys.ts # localStorage key constants
│   │   └── suggested-prompts.ts # AI prompt suggestions
│   ├── store/                  # Zustand state management
│   │   ├── userStore.ts        # User auth & profile state (CRITICAL)
│   │   ├── generationStore.ts  # Generation form & polling state
│   │   └── (other stores)
│   ├── types/                  # TypeScript type definitions
│   │   ├── index.ts            # Main type exports
│   │   ├── auth.ts             # Auth-related types
│   │   ├── generation.ts       # Generation request/response types
│   │   ├── subscription.ts     # Subscription types
│   │   ├── holiday.ts          # Holiday decorator types
│   │   └── google-maps.d.ts    # Google Maps API types
│   ├── styles/
│   │   ├── theme.ts            # Design system theme
│   │   ├── globals.css         # Global styles
│   │   └── (component styles)
│   ├── test/
│   │   └── setup.ts            # Test environment setup
│   └── __pycache__/
├── tests/                      # Playwright E2E tests
│   └── e2e/
│       ├── generation-flow.spec.ts
│       ├── holiday-discovery.spec.ts
│       ├── auth-flow.spec.ts
│       ├── payment-flow.spec.ts
│       └── (other E2E tests)
├── public/                     # Static assets
├── playwright.config.ts        # Local Playwright config
├── playwright.config.staging.ts # Staging Playwright config
├── playwright.config.production.ts # Production smoke tests
├── next.config.js              # Next.js configuration
├── tsconfig.json               # TypeScript configuration
├── tailwind.config.ts          # TailwindCSS configuration
├── package.json                # Dependencies
├── .env.local                  # Frontend environment variables (GITIGNORED)
└── node_modules/               # Dependencies (GITIGNORED)
```

### Database Structure (`supabase/migrations/`)
```
supabase/migrations/
├── 001_create_users_table.sql              # Core users table with trial & subscription
├── 002_create_token_accounts.sql           # Token balance tracking
├── 003_create_token_transactions.sql       # Token transaction history
├── 004_create_generations.sql              # Landscape generation records
├── 005_create_generation_areas.sql         # Per-area generation details
├── 006_create_rate_limits.sql              # Rate limiting tables
├── 007_create_functions.sql                # PL/pgSQL helper functions
├── 008_create_triggers.sql                 # Database triggers (auth sync, etc.)
├── 009_create_rls_policies.sql             # Row-Level Security policies
├── 010_create_indexes.sql                  # Performance indexes
├── 011_add_password_hash.sql               # Password authentication columns
├── 012_add_image_source_to_generations.sql # Image source tracking
├── 013_add_batch_deduction_functions.sql   # Batch credit deduction procedures
├── 014_add_subscription_columns.sql        # Stripe subscription columns
├── 014_holiday_decorator.sql               # Holiday decorator feature (Feature 007)
├── 015_fix_style_constraint.sql            # Style constraint fixes
├── 016_reset_holiday_credits.sql           # Holiday credit resets
├── 016_update_holiday_styles.sql           # Holiday style updates
├── 017_add_retention_policy.sql            # Data retention policies
└── 20251106_generation_flow.sql            # Latest generation flow updates
```

---

## 2. TECH STACK SUMMARY

### Core Technologies

| Component | Technology | Version | Purpose |
|-----------|-----------|---------|---------|
| **Frontend Framework** | Next.js | 15.0.2 | React server-side rendering & routing |
| **UI Library** | React | 18.3.1 | Component rendering & hooks |
| **Language** | TypeScript | 5.6.3 | Type-safe JavaScript |
| **Styling** | TailwindCSS | 3.4.18 | Utility-first CSS framework |
| **State Management** | Zustand | 5.0.0 | Lightweight state management |
| **HTTP Client** | Axios | 1.7.7 | API requests with interceptors |
| **Backend Framework** | FastAPI | 0.115.0 | Async Python web framework |
| **Backend Language** | Python | 3.11+ | Backend logic |
| **Database** | PostgreSQL 17 | 17 | Relational database (Supabase) |
| **Connection Pool** | asyncpg | 0.30.0 | Async PostgreSQL driver |
| **ORM/Validation** | Pydantic | 2.11.7 | Data validation |
| **AI/ML** | Google Gemini | 2.5 Flash | Image generation AI |
| **Maps API** | Google Maps | Latest | Geocoding, Street View, Satellite |
| **Storage** | Vercel Blob | 0.2.1 | Image storage & CDN |
| **Payments** | Stripe | 11.1.0 | Payment processing |
| **Auth** | Supabase Auth | 2.23.2 | Google OAuth + Magic Link |
| **Testing** | Playwright | 1.48.1 | E2E browser testing |
| **Testing** | Pytest | 8.3.3 | Python unit/integration testing |

### Critical Dependencies

**Backend** (`requirements.txt`):
- `fastapi` + `uvicorn` - Web server
- `asyncpg` - Database driver
- `pydantic` + `pydantic-settings` - Validation
- `supabase` - Auth SDK
- `stripe` - Payment processing
- `google-genai` - Gemini AI
- `aiohttp` - Async HTTP (Google Maps API)
- `structlog` - Structured logging
- `Pillow` - Image processing
- `vercel-blob` - Storage

**Frontend** (`package.json`):
- `@supabase/supabase-js` - Auth & database
- `@stripe/stripe-js` - Stripe payments
- `axios` - HTTP requests
- `zustand` - State management
- `framer-motion` - Animations
- `lucide-react` - Icon library

---

## 3. MAIN ENTRY POINTS

### Backend Entry Point
**File**: `/Users/Kailor_1/Desktop/Projects/Yarda_v5/backend/src/main.py`

```python
# FastAPI application with lifespan management
app = FastAPI(title="Yarda AI Landscape Studio", version="1.0.0", lifespan=lifespan)

# Lifespan context manager:
# - Startup: Initialize asyncpg connection pool
# - Shutdown: Close database connections

# CORS configuration: localhost:3000-3003 + production URLs
# Routers registered:
#   - /auth (authentication)
#   - /users (profile)
#   - /v1/generations (landscape generation)
#   - /v1/tokens (token management)
#   - /v1/webhooks (Stripe webhooks)
#   - /v1/subscriptions (subscription management)
#   - /v1/holiday (holiday decorator)
#   - /v1/credits (unified credit balance)

# Start command:
# source venv/bin/activate && uvicorn src.main:app --reload --port 8000
```

### Frontend Entry Point
**File**: `/Users/Kailor_1/Desktop/Projects/Yarda_v5/frontend/src/pages/_app.tsx`

```typescript
// Root component with global providers
// - Zustand store hydration (user auth state)
// - Google Maps script loading
// - Google One Tap initialization
// - Supabase client setup
// - Error boundaries

// Start command:
# npm run dev  # Port 3000
```

### OAuth Callback Handler
**File**: `/Users/Kailor_1/Desktop/Projects/Yarda_v5/frontend/src/pages/auth/callback.tsx`

```typescript
// Handles Google OAuth redirect:
// 1. Parse callback URL parameters
// 2. Exchange auth code for session token
// 3. Fetch user from /users endpoint
// 4. Store in Zustand + localStorage
// 5. Redirect to /generate
```

---

## 4. KEY SERVICES & MODULES

### Backend Critical Services

#### 1. **Database Connection Pool** (`db/connection_pool.py`) 🔴
- Global singleton `db_pool` instance
- asyncpg pool with 2-10 connections
- Statement cache disabled for Supabase pgbouncer
- **CRITICAL**: Connection pool must be initialized in FastAPI lifespan
- All queries use `FOR UPDATE NOWAIT` for atomic deductions

```python
# Usage pattern:
async with db_pool.transaction() as conn:
    user = await conn.fetchrow(
        "SELECT * FROM users WHERE id = $1 FOR UPDATE NOWAIT",
        user_id
    )
```

#### 2. **GenerationService** (`services/generation_service.py`) 🔴
**Orchestrates entire landscape generation workflow:**

```
1. Authorization Check
   └─ Subscription > Trial > Token (priority order)

2. Atomic Payment Deduction (before Gemini call)
   └─ WITH row-level locks (FOR UPDATE NOWAIT)

3. Google Maps Integration
   ├─ Geocoding (address → coordinates)
   ├─ Street View (front yard imagery)
   └─ Satellite (backyard overhead view)

4. Vercel Blob Upload
   └─ Store Google Maps images as source

5. Gemini AI Processing
   ├─ Per-area prompt generation (perspective-based)
   ├─ Image generation with Gemini 2.5 Flash
   └─ Image upload to Vercel Blob

6. Database Recording
   └─ Store generation record with image URLs

7. Error Handling & Refund
   └─ Automatic credit refund on failure
```

**Key Methods**:
- `authorize_and_deduct_payment()` - Payment hierarchy + atomic deduction
- `create_generation()` - Create generation record
- `process_generation()` - Run Gemini generation
- `process_multi_area_generation()` - Handle multiple yard areas
- `_handle_failure()` - Refund credits on error

#### 3. **GeminiClient** (`services/gemini_client.py`) 🔴
- Google Gemini 2.5 Flash API integration
- Image-to-image generation (original image → landscape design)
- Prompt engineering with style & preservation strength
- Usage monitoring & error handling

```python
# Perspective-Based Generation Strategy:
# - Front Yard: Street View → Transform while preserving house
# - Backyard: Satellite overhead → CREATE NEW 45° architectural rendering
# - Walkway: Satellite overhead → CREATE NEW ground-level perspective

# This prevents "unmodified satellite image" problem
# See: PERSPECTIVE_GENERATION_APPROACH.md
```

#### 4. **MapsService** (`services/maps_service.py`)
- Google Maps Platform integration:
  - Geocoding: address → lat/lng
  - Street View: front yard imagery at specific heading/pitch
  - Satellite: overhead property view
- Structured logging with `structlog`
- Error handling with retry logic

#### 5. **TrialService** (`services/trial_service.py`)
- Trial credit management (initial 3 credits)
- Atomic deduction with row-level locking
- Tracks trial_remaining + trial_used

#### 6. **TokenService** (`services/token_service.py`)
- Token balance management (pay-per-use)
- Atomic deductions with FOR UPDATE NOWAIT
- Transaction history tracking

#### 7. **SubscriptionService** (`services/subscription_service.py`)
- Stripe subscription status checking
- Grace period logic (3 days for past_due)
- Allows unlimited generations while active

#### 8. **HolidayGenerationService** + **HolidayCreditService** (Feature 007)
- Separate credit system for holiday decorator feature
- Social share tracking & credit rewards
- Viral marketing campaign integration

### Frontend Critical Services

#### 1. **API Client** (`lib/api.ts`) 🔴
**Centralized axios instance with auth interceptors:**

```typescript
// Request interceptor:
// - Injects Bearer token from localStorage
// - Token extracted from Zustand userStore

// Response interceptor:
// - Catches 401 Unauthorized
// - Clears session & redirects to /login
// - Debounced to prevent race conditions

// API Namespace Pattern:
export const authAPI = { ... }        // /auth endpoints
export const generationsAPI = { ... } // /v1/generations
export const tokensAPI = { ... }      // /v1/tokens
export const subscriptionsAPI = { ... } // /v1/subscriptions
```

#### 2. **UserStore** (`store/userStore.ts`) 🔴
**Zustand state management for authentication & balance:**

```typescript
interface UserState {
  // Auth
  user: User | null
  accessToken: string | null
  isAuthenticated: boolean

  // Credit balances (unified consolidation)
  tokenBalance: TokenBalance | null
  balances: UnifiedBalanceResponse | null  // trial, tokens, holiday credits

  // Actions
  setUser()
  setAccessToken()
  setTokenBalance()
  setBalances()
  logout()
}

// Persistence: localStorage under 'user-storage' key
```

#### 3. **GenerationStore** (`store/generationStore.ts`)
**Form state + polling state for single-page generation flow:**

```typescript
interface GenerationState {
  // Form
  request_id: string | null
  selectedAreas: Array
  selectedStyle: string
  customPrompt: string

  // Polling
  generationStatus: 'idle' | 'submitting' | 'polling' | 'completed' | 'failed'
  areaResults: Map<string, GenerationResult>
  
  // Actions
  setFormData()
  submitGeneration()
  pollStatus()
}
```

#### 4. **Credit Synchronization** (`lib/creditSync.ts`)
- Automatic sync of credit balances from API response
- Updates Zustand store when credits change
- Prevents orphaned state between frontend/backend

---

## 5. EXTERNAL SERVICE INTEGRATIONS

### Google Gemini AI 🔴
- **Service**: Google Generative AI (Gemini 2.5 Flash)
- **Integration**: `services/gemini_client.py`
- **API Key**: `GEMINI_API_KEY` environment variable
- **Model**: `gemini-2.5-flash-image` (image generation capability)
- **Input**: Original image + landscape design prompt
- **Output**: PNG image of generated landscape design
- **Timeout**: Built-in to Gemini SDK
- **Costs**: Pay-per-request (counted in account quotas)

### Google Maps API 🔴
- **Service**: Google Maps Platform
- **Integration**: `services/maps_service.py`
- **APIs Used**:
  - Geocoding API (address → lat/lng)
  - Street View Static API (front yard imagery)
  - Maps Static API (satellite imagery)
- **API Key**: `GOOGLE_MAPS_API_KEY` environment variable
- **Request Format**: Async HTTP with `aiohttp`
- **Logging**: Structured logging with `structlog`
- **Heading Calculation**: Custom bearing calculation for camera angle
- **Rate Limits**: Per account quota

### Stripe Payment Processing 🔴
- **Service**: Stripe (Test Mode in development)
- **Integration**: 
  - Frontend: `@stripe/stripe-js` for Checkout
  - Backend: `stripe` SDK for webhooks + Customer Portal
- **Account**: Yarda (Test Mode) - `acct_1SFRz7F7hxfSl7pF`
- **Key Endpoints**:
  - Token Purchase: Redirect to Checkout Session
  - Subscription: Checkout for Monthly Pro plan
  - Webhooks: `/v1/webhooks/stripe` (event-driven payment processing)
- **Signature Verification**: CRITICAL - All webhooks verified with `STRIPE_WEBHOOK_SECRET`
- **Idempotency**: Event deduplication via `event.request.idempotency_key`
- **Test Cards**: 
  - Success: `4242 4242 4242 4242`
  - Decline: `4000 0000 0000 0002`

### Supabase Auth 🔴
- **Service**: Supabase Auth (Supabase-hosted)
- **URL**: `https://gxlmnjnjvlslijiowamn.supabase.co`
- **Auth Methods**: 
  - Google OAuth (primary)
  - Magic Link / Passwordless (secondary)
- **Integration**:
  - Frontend: `@supabase/supabase-js` client
  - Backend: Service role key for user sync
- **Auth Flow**:
  1. Frontend redirects to Google OAuth
  2. Google authenticates user
  3. Callback returns to `/auth/callback`
  4. Backend exchanges token, creates user record
  5. Frontend stores token + user in Zustand + localStorage

### Supabase Database (PostgreSQL 17) 🔴
- **URL**: `https://gxlmnjnjvlslijiowamn.supabase.co`
- **Region**: us-east-2
- **Instance**: `gxlmnjnjvlslijiowamn`
- **Connection Pool**: asyncpg (2-10 connections)
- **Key Tables**:
  - `users` - User profiles + subscription status
  - `users_token_accounts` - Token balance per user
  - `users_token_transactions` - Token transaction history
  - `generations` - Landscape generation records
  - `generation_areas` - Per-area generation details
  - `subscriptions` - Subscription records
  - `holiday_generations` - Holiday decorator feature
- **Security**: Row-Level Security (RLS) policies per user
- **Migrations**: Applied via SQL files in `supabase/migrations/`

### Vercel Blob Storage 🔴
- **Service**: Vercel Blob (file storage + CDN)
- **Integration**: `services/storage_service.py`
- **Token**: `BLOB_READ_WRITE_TOKEN` environment variable
- **Usage**:
  - Upload Google Maps images (source)
  - Upload Gemini-generated images (result)
  - Store before/after comparison images
- **URLs**: Public HTTPS URLs with signed tokens
- **Cleanup**: Via retention policy (TTL for temporary files)

### Vercel Deployment (Frontend) 🔴
- **Platform**: Vercel (Next.js optimized)
- **Project ID**: `prj_H82uxC9rqafgCvhSaKYEZm5GskNn`
- **Team**: `team_VKfqq7FT5jFRbV7UQ5K1YEFR` (thetangstrs-projects)
- **Preview URL**: Auto-generated on PR (feature branch)
- **Auto-deploy**: Main branch → production
- **Environment Variables**: Set via Vercel dashboard

### Railway Deployment (Backend) 🔴
- **Platform**: Railway (Python/Docker deployment)
- **Project ID**: `7a8f9bcb-a265-4c34-82d2-c9c3655d26bf`
- **Service**: `yarda-api`
- **URL**: `https://yarda-api-production.up.railway.app`
- **Auto-deploy**: Main branch → production
- **Environment Variables**: Set via Railway dashboard
- **Database**: Connected to Supabase (remote)

---

## 6. DATA FLOW ARCHITECTURE

### Critical Path: Landscape Generation Workflow

```
┌─────────────────────────────────────────────────────────────────┐
│ USER SUBMITS GENERATION REQUEST                                 │
│ (address, areas: [front_yard, backyard], style, custom_prompt)  │
└──────────────────────────┬──────────────────────────────────────┘
                           │
                ┌──────────▼────────────┐
                │ FRONTEND (generate.tsx)│
                │ - Validate inputs      │
                │ - Display form         │
                └──────────┬─────────────┘
                           │
                    POST /v1/generations
                           │
        ┌──────────────────▼─────────────────────┐
        │ BACKEND: GenerationService              │
        │ 1. Authorize user (subscription>trial)  │
        │ 2. Deduct payment ATOMICALLY            │
        │    (FOR UPDATE NOWAIT row-level lock)   │
        └──────────────────┬─────────────────────┘
                           │
        ┌──────────────────▼──────────────────────┐
        │ BACKEND: MapsService                     │
        │ 1. Geocode address → lat/lng             │
        │ 2. Fetch Street View (front_yard)       │
        │ 3. Fetch Satellite (backyard overhead)  │
        │ 4. Upload to Vercel Blob                │
        └──────────────────┬──────────────────────┘
                           │
        ┌──────────────────▼──────────────────────┐
        │ BACKEND: Gemini AI Processing             │
        │ FOR EACH AREA:                            │
        │ 1. Load source image from Vercel Blob    │
        │ 2. Build perspective-aware prompt        │
        │    - Front yard: transform + preserve    │
        │    - Backyard: create new 45° view      │
        │    - Walkway: create ground-level view  │
        │ 3. Call Gemini 2.5 Flash API             │
        │ 4. Get generated image                   │
        │ 5. Upload to Vercel Blob                 │
        │ 6. Save URL to database                  │
        └──────────────────┬──────────────────────┘
                           │
        ┌──────────────────▼──────────────────────┐
        │ BACKEND: Database Update                 │
        │ UPDATE generations SET status='completed'│
        │ UPDATE generation_areas                  │
        │ WITH image URLs                          │
        └──────────────────┬──────────────────────┘
                           │
                    GET /v1/generations/{id}
                    (Polling every 2s)
                           │
        ┌──────────────────▼──────────────────────┐
        │ FRONTEND: Display Results                │
        │ - GenerationResultsInline component      │
        │ - Before/after slider                    │
        │ - Download buttons                       │
        │ - Share options                          │
        └──────────────────────────────────────────┘
```

### Payment Deduction Atomicity 🔴

**CRITICAL**: Payment must be deducted BEFORE Gemini call to prevent:
- Free generations if Gemini fails
- Negative balances from race conditions
- Duplicate charges from network retries

```python
# Implementation using FOR UPDATE NOWAIT:
async with db_pool.transaction() as conn:
    # Lock user row to prevent concurrent updates
    user = await conn.fetchrow(
        "SELECT trial_remaining, balance FROM users WHERE id = $1 FOR UPDATE NOWAIT",
        user_id
    )
    
    if user.trial_remaining > 0:
        # Deduct trial atomically
        await conn.execute(
            "UPDATE users SET trial_remaining = trial_remaining - 1 WHERE id = $1",
            user_id
        )
        payment_method = 'trial'
    elif user.balance > 0:
        # Deduct token atomically
        await conn.execute(
            "UPDATE users_token_accounts SET balance = balance - 1 WHERE user_id = $1",
            user_id
        )
        payment_method = 'token'
    else:
        raise HTTPException(403, "Insufficient credits")
    
    # NOW safe to call Gemini (payment already deducted)
    generated_image = await gemini.generate(...)
    
    # Save generation record
    ...
```

### Error Handling & Refund Flow

```
Generation Fails
      │
      ├─ Gemini timeout / API error
      ├─ Network error during upload
      └─ Database error saving result
      │
      ▼
Call _handle_failure()
      │
      ├─ Check payment_type (trial/token/subscription)
      │
      ├─ IF trial: Refund trial_remaining += 1
      │
      ├─ IF token: Refund balance += 1
      │
      ├─ IF subscription: No refund needed (unlimited)
      │
      └─ Update generation status='failed' + error_message
```

---

## 7. CRITICAL INTEGRATION POINTS & BOTTLENECKS

### 🔴 Potential Performance Bottlenecks

#### 1. **Sequential Google Maps API Calls**
**Issue**: Geocoding, Street View, and Satellite calls are serial (not parallel)
```
Time: Geocode (500ms) + StreetView (800ms) + Satellite (800ms) = ~2.1 seconds
Potential: parallel with asyncio.gather() = ~800ms
```
**Location**: `services/maps_service.py`
**Impact**: 60% of total generation time
**Fix**: Already using `aiohttp` for async, but calls might not be parallelized

#### 2. **Gemini API Response Time**
**Issue**: Image generation takes 10-30 seconds per image
```
Time: 30s × 3 areas = 90 seconds
Parallel: 30s (all 3 areas concurrently)
```
**Location**: `services/gemini_client.py`
**Impact**: 60-70% of total generation time
**Status**: Already async-capable, frontend polls every 2s

#### 3. **Database Connection Pool Exhaustion**
**Issue**: With only 10 max connections, high concurrency could exhaust pool
```
Scenario: 10 concurrent users × 3 API calls each = 30 connection requests
Max pool: 10 connections
Result: Queuing/timeout
```
**Location**: `db/connection_pool.py` line 36 (`max_size=10`)
**Threshold**: ~3-4 concurrent users before contention
**Monitoring**: Check `/health` endpoint for connection status

#### 4. **Stripe Webhook Processing Race Condition**
**Issue**: Multiple webhook retries could create duplicate token additions
**Solution**: `idempotency_key` deduplication + database UNIQUE constraints
**Location**: `api/endpoints/webhooks.py`
**Risk**: If deduplication fails, users get double charged

#### 5. **Trial/Token Deduction Atomicity**
**Issue**: Without row-level locking, concurrent requests could result in overselling
```
Scenario: User has 1 trial credit, 2 concurrent requests
Without lock: Both might see 1 > 0, both deduct → negative balance
With lock: First request locks, second waits, only first succeeds
```
**Solution**: `FOR UPDATE NOWAIT` in all deduction queries
**Location**: `services/trial_service.py`, `services/token_service.py`
**Status**: IMPLEMENTED correctly

#### 6. **Vercel Blob Upload Reliability**
**Issue**: Large image uploads could fail silently or timeout
**Location**: `services/storage_service.py`
**Risk**: Generation marked complete but images missing
**Mitigation**: Verify upload before marking generation complete

#### 7. **Google Maps API Rate Limiting**
**Issue**: Shared API key could hit rate limits with high concurrency
```
Limits: ~50 QPS per project, 25,000 requests/day (Geocoding)
Scenario: 100 users at once = 300 requests to Maps API
Result: 429 Too Many Requests
```
**Mitigation**: Implement exponential backoff + queue
**Location**: `services/maps_service.py`

### 🟡 Subtle Integration Bugs

#### 1. **Perspective-Based Prompt Mismatch**
**Issue**: If prompt says "transform" for backyard (overhead), Gemini returns unchanged image
**Solution**: Explicitly state "CREATE NEW 45-degree architectural rendering"
**Location**: `services/prompt_builder.py` lines 97-231
**Status**: Fixed in latest version

#### 2. **Image MIME Type Handling**
**Issue**: Clipboard copy requires exact `image/jpeg` MIME type
**Location**: `frontend/src/components/generation/GenerationResultsInline.tsx`
**Status**: Recently fixed

#### 3. **Credit Sync Timing**
**Issue**: Frontend might not sync credits immediately after generation
**Solution**: Return updated `credits_remaining` in API response
**Location**: `lib/creditSync.ts`

#### 4. **localStorage Corruption**
**Issue**: Malformed JSON in localStorage could crash app on load
**Location**: `lib/api.ts` line 44 (try/catch in request interceptor)
**Status**: Handled with error logging

---

## 8. TESTING INFRASTRUCTURE

### Playwright E2E Tests
**Location**: `frontend/tests/e2e/`

**Test Environments**:
- **Local**: `npm run test:e2e` (against http://localhost:8000)
- **Staging**: `npm run test:e2e:staging` (against Railway staging)
- **Production**: `npm run test:e2e:production --grep @smoke` (smoke tests only)

**Test Files**:
- `generation-flow.spec.ts` - Full generation flow
- `holiday-discovery.spec.ts` - Holiday decorator feature
- `auth-flow.spec.ts` - Google OAuth authentication
- `payment-flow.spec.ts` - Token purchase & subscription
- (Others for specific features)

**Critical User Journeys (CUJs)**:
1. New user registration + trial
2. Generation with trial credit
3. Token purchase via Stripe
4. Subscription activation
5. Holiday decorator with social sharing

### Backend Unit Tests
**Location**: `backend/tests/unit/`

**Test Files**:
- `test_trial_service.py` - Trial deduction logic
- `test_token_service.py` - Token deduction
- `test_subscription_endpoints.py` - Subscription API
- `test_maps_service.py` - Google Maps integration
- `test_holiday_credit_service.py` - Holiday feature
- `test_prompt_builder.py` - Prompt generation

### Backend Integration Tests
**Location**: `backend/tests/integration/`

**Test Files**:
- `test_generation_authorization.py` - Payment hierarchy
- `test_race_conditions.py` - Concurrent deductions
- `test_webhook_idempotency.py` - Stripe webhook dedup
- `test_stripe_checkout.py` - Token purchase flow
- `test_subscription_integration.py` - Subscription flow
- `test_maps_integration.py` - Google Maps API

### Running Tests

```bash
# Backend unit tests
cd backend && pytest tests/unit/ -v

# Backend integration tests (requires database)
cd backend && pytest tests/integration/ -v

# Frontend E2E tests (local)
cd frontend && npm run test:e2e

# Frontend E2E tests (staging)
cd frontend && npm run test:e2e:staging

# All tests with coverage
cd backend && pytest tests/ --cov=src --cov-report=html
```

---

## 9. DEPLOYMENT ARCHITECTURE

### Production Environments

| Component | Platform | URL | Auto-Deploy |
|-----------|----------|-----|-------------|
| Frontend | Vercel | TBD (custom domain) | Main branch |
| Backend | Railway | `yarda-api-production.up.railway.app` | Main branch |
| Database | Supabase | `gxlmnjnjvlslijiowamn.supabase.co` | Manual migrations |
| Payments | Stripe | Production account | Manual setup |

### CI/CD Pipeline (Proposed)

```
Feature Branch
     │
     ├─ Vercel Preview Deployment (auto)
     ├─ Railway Staging Deployment (auto)
     │
     └─ E2E Tests (Playwright)
        ├─ Local tests
        ├─ Staging tests
        └─ Smoke tests
           │
           ▼
      Manual Approval
           │
           ├─ Merge to main
           └─ Production Deploy (auto)
              ├─ Vercel production
              ├─ Railway production
              └─ Smoke tests
```

### Environment Variables

**Frontend** (Vercel dashboard):
```bash
NEXT_PUBLIC_SUPABASE_URL=https://gxlmnjnjvlslijiowamn.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
NEXT_PUBLIC_API_URL=https://yarda-api-production.up.railway.app
```

**Backend** (Railway dashboard):
```bash
DATABASE_URL=postgresql://...  # Supabase connection
GEMINI_API_KEY=...
GOOGLE_MAPS_API_KEY=...
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
BLOB_READ_WRITE_TOKEN=vercel_blob_rw_...
SUPABASE_URL=...
SUPABASE_SERVICE_ROLE_KEY=...
ENVIRONMENT=production
```

---

## 10. ARCHITECTURE ANTI-PATTERNS & ISSUES TO WATCH

### ⚠️ Known Issues

1. **Async Generator Tasks (No Queue)**
   - Generation processing runs inline without background job queue
   - No retry mechanism for failed image processing
   - Large concurrent requests could overwhelm server
   - Solution: Implement Celery/RQ or Railway background jobs

2. **Firebase Deprecated**
   - Old Firebase references might still exist in codebase
   - All auth should use Supabase only
   - Search for `firebase` imports and remove

3. **Multiple Railway Projects**
   - Old `yarda-backend.onrender.com` on Render is deprecated
   - Only use Railway: `yarda-api-production.up.railway.app`
   - Remove any hardcoded Render URLs

4. **CORS Configuration Hardcoded**
   - Localhost ports hardcoded in `config.py`
   - Production URLs might not be whitelisted
   - Need to update CORS origins per environment

5. **venv Activation Required**
   - Backend MUST run with virtual environment activated
   - Symptom: `ModuleNotFoundError: No module named 'stripe'`
   - Solution: Always run `source backend/venv/bin/activate`

### 🟡 Performance Gotchas

1. **Image Processing Pipeline Not Parallelized**
   - Maps API calls are sequential (could be parallel)
   - Gemini calls are sequential (should be parallel for multi-area)
   - Consider `asyncio.gather()` for concurrent processing

2. **Connection Pool Sizing**
   - Only 10 max connections
   - Each request holds connection for entire generation
   - With slow Gemini API (30s), only 0.3 requests/s capacity
   - Consider connection pooling with timeout

3. **No Request Queuing**
   - No queue for generations (first-come-first-served)
   - No backpressure handling for overload
   - Consider Bull Queue or Celery

---

## 11. QUICK REFERENCE: CRITICAL FILES

| Purpose | File | Key Content |
|---------|------|-------------|
| **Backend entry** | `backend/src/main.py` | FastAPI app, lifespan, routers |
| **Database pool** | `backend/src/db/connection_pool.py` | asyncpg pool, critical for all DB ops |
| **Generation flow** | `backend/src/services/generation_service.py` | Payment deduction, Gemini, workflow |
| **Google Maps** | `backend/src/services/maps_service.py` | Geocoding, Street View, Satellite |
| **Gemini AI** | `backend/src/services/gemini_client.py` | Image generation, prompt building |
| **Stripe webhooks** | `backend/src/api/endpoints/webhooks.py` | Payment processing, idempotency |
| **Database schema** | `supabase/migrations/` | All table definitions, RLS policies |
| **Frontend entry** | `frontend/src/pages/_app.tsx` | Root component, global setup |
| **Auth callback** | `frontend/src/pages/auth/callback.tsx` | OAuth handling |
| **User store** | `frontend/src/store/userStore.ts` | Global auth state (localStorage) |
| **API client** | `frontend/src/lib/api.ts` | Axios with interceptors (auth injection) |
| **Generation page** | `frontend/src/pages/generate.tsx` | Single-page generation flow |
| **Holiday feature** | `frontend/src/pages/holiday.tsx` | Holiday decorator with sharing |
| **Project setup** | `CLAUDE.md` | Critical project instructions |

---

## Summary

**Yarda V5** is a sophisticated AI landscape design platform with:
- **Complex async workflow** integrating 5+ external APIs
- **Atomic payment deductions** using PostgreSQL row-level locking
- **Real-time progress polling** from frontend to backend
- **Multi-area generation** with perspective-aware prompt engineering
- **Full payment system** with trial, tokens, and subscriptions
- **Social sharing mechanics** for viral holiday feature

**Key Bottlenecks**:
1. Sequential API calls (Maps, Gemini) instead of parallel
2. 10-connection pool with 30s Gemini responses = low concurrency capacity
3. No background job queue = inline processing risk
4. Stripe webhook deduplication relies on idempotency key

**Critical Success Factors**:
1. Atomic payment deductions before AI processing
2. Proper error handling with refund fallback
3. Connection pool initialization in FastAPI lifespan
4. Perspective-based prompts for multi-area generation
5. localStorage synchronization for auth tokens

