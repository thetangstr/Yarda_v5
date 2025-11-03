# Implementation Plan: AI Landscape Studio Platform

**Branch**: `001-002-landscape-studio` | **Date**: 2025-11-03 | **Spec**: [spec.md](./spec.md)
**Input**: Complete AI-powered landscape design platform with trials, tokens, subscriptions, and multi-area generation

## Summary

Build a comprehensive web application that transforms property photos into professional AI-generated landscape designs using Google's Gemini 2.5 Flash model. The platform implements a sophisticated monetization system with free trials (3 credits per user), pay-per-use tokens (with automatic reload), and unlimited subscription plans. The technical approach emphasizes **atomic financial operations** with PostgreSQL row-level locking to prevent race conditions, **idempotent webhook processing** for Stripe payments, and **parallel generation** for multi-area requests to optimize user experience.

**Key Technical Challenges**:
1. **Race Condition Prevention**: Token/trial deduction must be atomic even under concurrent requests
2. **Payment Integrity**: Stripe webhooks must be idempotent to prevent duplicate credits
3. **Generation Scalability**: Multi-area requests processed in parallel, not sequential
4. **Session Persistence**: Generation progress must survive page refreshes
5. **Subscription Management**: Graceful transitions between token/subscription systems

## Technical Context

**Language/Version**: Python 3.11+ (backend), TypeScript 5.x (frontend)
**Primary Dependencies**:
- Backend: FastAPI, Supabase Python Client, Stripe Python SDK, Google Gemini SDK, psycopg2 (PostgreSQL)
- Frontend: React 18+, TypeScript, Vite, Zustand, TailwindCSS, React Router v6
**Storage**: PostgreSQL (Supabase) with row-level security, Vercel Blob (image storage)
**Testing**: Playwright (E2E), pytest (backend unit/integration), Vitest (frontend unit)
**Target Platform**: Web application (Railway backend, Vercel frontend hosting)
**Project Type**: Web (separated backend/frontend with Railway + Vercel deployment)
**Performance Goals**: <500ms API response (p95), 30-60s single generation, 60-90s multi-area (3 areas parallel)
**Constraints**:
- 99.9% uptime requirement
- Zero negative balances (race condition prevention)
- <100ms token deduction operations
- 100+ concurrent users support
- 5-minute generation timeout with auto-refund
**Scale/Scope**:
- 1,000+ users at launch
- 10,000+ generations per month
- $15K+ monthly revenue target
- 88 functional requirements across 8 feature areas

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

### I. Component-Based Architecture ✅ PASS
- **Requirement**: Modular, reusable React components with clear props interfaces
- **Compliance**: Feature uses existing SuperMinimal component system, adds new components:
  - `LandscapeStudioEnhanced.tsx` (main generation UI)
  - `TokenBalance.tsx` (balance display with real-time updates)
  - `SubscriptionManager.tsx` (subscription lifecycle management)
  - `GenerationProgress.tsx` (real-time progress with WebSocket/polling)
  - `MultiAreaSelector.tsx` (parallel generation UI)
- **Status**: PASS - All components self-contained, independently testable, properly typed

### II. Type Safety (NON-NEGOTIABLE) ✅ PASS
- **Requirement**: TypeScript mandatory, shared types in `types/index.ts`, no `any` types
- **Compliance**:
  - New types: `TokenTransaction`, `Subscription`, `Generation`, `AutoReloadConfig`
  - Backend: Pydantic models for all request/response validation
  - Path aliases (`@/*` → `src/*`) used throughout
- **Status**: PASS - Full type coverage, no `any` types in new code

### III. Test-First Development (NON-NEGOTIABLE) ✅ PASS
- **Requirement**: TDD with Playwright E2E tests, red-green-refactor cycle
- **Compliance**:
  - 6 E2E test suites mapping to 6 user stories in spec.md:
    - `trial-user-registration.spec.ts` (US1)
    - `token-purchase.spec.ts` (US2)
    - `auto-reload.spec.ts` (US3)
    - `subscription-upgrade.spec.ts` (US4)
    - `multi-area-generation.spec.ts` (US5)
    - `transaction-history.spec.ts` (US6)
  - Integration tests for race conditions (TC-RACE-1.1, TC-RACE-2.1, TC-RACE-3.1, TC-RACE-4.1)
  - Unit tests for token/trial services (80%+ coverage target)
- **Status**: PASS - Comprehensive test coverage defined in spec, TDD workflow mandated

### V. State Management ✅ PASS
- **Requirement**: Zustand for state, localStorage persistence, clear separation
- **Compliance**:
  - New store: `tokenStore.ts` (balance, transactions, auto-reload config)
  - Existing: `generationStore.ts` (extended for multi-area progress tracking)
  - Existing: `userStore.ts` (extended for subscription status)
  - Selective persistence: token balance, generation request_id (for refresh recovery)
- **Status**: PASS - Follows established Zustand patterns

### VI. API Integration ✅ PASS
- **Requirement**: Centralized API service, proper error handling, 5-min timeout
- **Compliance**:
  - All calls through `frontend/src/services/api.ts`
  - New endpoints:
    - `POST /api/v1/tokens?action=purchase` (Stripe checkout initiation)
    - `GET /api/v1/tokens?action=balance` (real-time balance fetch)
    - `POST /api/v1/tokens?action=configure_auto_reload` (auto-reload settings)
    - `POST /api/subscription/create-checkout` (subscription purchase)
    - `POST /api/subscription/webhook` (Stripe webhook handler)
    - `POST /api/design/complete-landscape` (multi-area generation)
  - Generation timeout: 5 minutes with automatic refund
  - Health checks: `/api/health` for backend availability
- **Status**: PASS - Extends existing API service patterns

### VII. Responsive Design ✅ PASS
- **Requirement**: Mobile-first, Tailwind CSS, touch-friendly
- **Compliance**:
  - All new components use Tailwind responsive classes (`sm:`, `md:`, `lg:`)
  - Gallery grid: 1 column mobile, 3 columns desktop
  - Touch-optimized: Large buttons (min 44x44px), swipe gestures for gallery
  - Performance: Lazy loading for gallery images, optimistic UI updates
- **Status**: PASS - Mobile-first design throughout

### VIII. Authentication & Authorization ✅ PASS (with extension)
- **Requirement**: Firebase Auth, backend token validation via `auth.py`
- **Compliance**:
  - Existing Firebase Auth integration extended
  - **NEW**: Subscription status checked in authorization flow (subscription_status='active' bypasses token check)
  - Backend middleware: `auth.py` validates JWT on every request
  - Protected routes: All token/subscription operations require authentication
  - Rate limiting: Implemented per-user per-endpoint (see FR-088)
- **Status**: PASS - Extends existing auth with subscription awareness
- **Note**: No whitelist enforcement mentioned in spec (may need clarification if required)

### IX. CI/CD Pipeline (NON-NEGOTIABLE) ✅ PASS
- **Requirement**: Automated testing (5 stages), deployment (3 workflows), quality gates (5)
- **Compliance**:
  - **Automated Testing**:
    1. Linting: ESLint (frontend), Ruff (backend) - 2-3 min
    2. Unit Tests: Vitest (frontend), pytest (backend) - 80%+ coverage - 3-5 min
    3. Integration Tests: PostgreSQL service, API contracts, migrations - 5-7 min
    4. E2E Tests: Playwright critical journeys, cross-browser - 8-12 min
    5. Security: npm audit, safety, Semgrep, secret detection - 3-5 min
  - **Deployment Workflows**:
    1. PR Preview: Vercel preview + automated UAT with Playwright MCP
    2. Production: Push to master → all checks pass → deploy → smoke tests → monitor 15 min
    3. Rollback: Auto-rollback if error rate >5%, manual revert + push (<2 min)
  - **Quality Gates**:
    1. Code Quality: TypeScript 0 errors, ESLint 0 errors, build success (HARD FAIL)
    2. Testing: 100% test pass, 80%+ coverage, no flaky tests (HARD FAIL)
    3. Security: No high/critical vulnerabilities, no secrets, SAST clean (HARD FAIL)
    4. Performance: <5MB gzip, Lighthouse ≥90, queries <100ms p95 (HARD FAIL prod)
    5. Documentation: API changes in CLAUDE.md, breaking changes in CHANGELOG (override allowed)
  - **Environment Management**: .env.local (dev), Vercel preview (test), Vercel production (live)
  - **Monitoring**: Vercel Analytics, Supabase dashboard, custom business metrics, PagerDuty alerts
  - **DORA Metrics**: Deployment frequency 10+/week, lead time <30min, MTTR <15min, change failure <5%
  - **Disaster Recovery**: Daily DB backups (30-day retention), RPO 24h, RTO 4h, weekly restore tests
- **Status**: PASS - Full CI/CD compliance with existing pipeline

## Project Structure

### Documentation (this feature)

```text
specs/001-002-landscape-studio/
├── plan.md              # This file (/speckit.plan command output)
├── spec.md              # Feature specification (already created)
├── research.md          # Phase 0 output (/speckit.plan command)
├── data-model.md        # Phase 1 output (/speckit.plan command)
├── quickstart.md        # Phase 1 output (/speckit.plan command)
├── contracts/           # Phase 1 output (/speckit.plan command)
│   ├── openapi.yaml     # API contract definitions
│   └── types.ts         # Shared TypeScript types
├── checklists/          # Quality validation checklists
│   └── requirements.md  # Requirement completion tracking
└── tasks.md             # Phase 2 output (/speckit.tasks command - NOT created by /speckit.plan)
```

### Source Code (repository root)

```text
# Web Application Structure (Backend + Frontend)

backend/
├── src/
│   ├── api/
│   │   ├── endpoints/
│   │   │   ├── __init__.py
│   │   │   ├── auth.py              # Authentication endpoints (existing, extended)
│   │   │   ├── credits.py           # DEPRECATED - replaced by tokens.py
│   │   │   ├── tokens.py            # NEW - Token operations (balance, purchase, auto-reload)
│   │   │   ├── generations.py       # Generation endpoints (existing, extended for multi-area)
│   │   │   ├── subscriptions.py     # NEW - Subscription management endpoints
│   │   │   └── rate_limits.py       # Rate limiting (existing, may need extension)
│   │   └── dependencies.py          # Dependency injection (existing)
│   ├── models/
│   │   ├── __init__.py
│   │   ├── user.py                  # User model (existing, extended with subscription fields)
│   │   ├── token_account.py         # NEW - Token balance and auto-reload config
│   │   ├── token_transaction.py     # NEW - Token operation records
│   │   ├── generation.py            # Generation model (existing, extended for multi-area)
│   │   ├── subscription.py          # NEW - Subscription lifecycle tracking
│   │   └── rate_limit.py            # Rate limiting (existing)
│   ├── services/
│   │   ├── __init__.py
│   │   ├── auth_service.py          # Authentication (existing, extended for subscription check)
│   │   ├── token_service.py         # NEW - Token CRUD with atomic operations
│   │   ├── trial_service.py         # NEW - Trial credit management
│   │   ├── auto_reload_service.py   # NEW - Auto-reload trigger logic
│   │   ├── subscription_service.py  # NEW - Subscription lifecycle management
│   │   ├── generation_service.py    # Generation orchestration (existing, extended for parallel)
│   │   ├── gemini_client.py         # Gemini API integration (existing)
│   │   ├── stripe_service.py        # NEW - Stripe payment integration
│   │   └── webhook_service.py       # NEW - Stripe webhook processing (idempotent)
│   ├── db/
│   │   ├── __init__.py
│   │   ├── connection_pool.py       # NEW - PostgreSQL connection pooling
│   │   └── migrations/              # Database migrations (see supabase/migrations/)
│   ├── config.py                    # Configuration (existing, extended)
│   ├── exceptions.py                # Custom exceptions (existing, extended)
│   └── main.py                      # FastAPI entry point (existing, extended routes)
├── tests/
│   ├── unit/
│   │   ├── test_token_service.py    # NEW - Token service unit tests (race conditions)
│   │   ├── test_trial_service.py    # NEW - Trial service unit tests
│   │   ├── test_auto_reload.py      # NEW - Auto-reload logic tests
│   │   ├── test_subscription.py     # NEW - Subscription service tests
│   │   └── test_webhook_idempotency.py # NEW - Webhook idempotency tests
│   ├── integration/
│   │   ├── test_token_operations.py # NEW - End-to-end token flow tests
│   │   ├── test_stripe_webhooks.py  # NEW - Webhook integration tests
│   │   ├── test_race_conditions.py  # NEW - Concurrent request tests (10 parallel)
│   │   └── test_multi_area_generation.py # NEW - Parallel generation tests
│   └── conftest.py                  # Test fixtures (existing, extended)
├── requirements.txt                 # Python dependencies (extended)
└── Procfile                         # Railway deployment config (existing)

frontend/
├── src/
│   ├── components/
│   │   ├── TokenBalance/            # NEW - Real-time token balance display
│   │   │   ├── index.tsx
│   │   │   └── TokenBalance.test.tsx
│   │   ├── TrialCounter/            # NEW - Trial credits remaining display
│   │   │   ├── index.tsx
│   │   │   └── TrialCounter.test.tsx
│   │   ├── TokenPurchaseModal/      # NEW - Token package selection modal
│   │   │   ├── index.tsx
│   │   │   └── TokenPurchaseModal.test.tsx
│   │   ├── AutoReloadConfig/        # NEW - Auto-reload settings UI
│   │   │   ├── index.tsx
│   │   │   └── AutoReloadConfig.test.tsx
│   │   ├── SubscriptionManager/     # NEW - Subscription status and management
│   │   │   ├── index.tsx
│   │   │   └── SubscriptionManager.test.tsx
│   │   ├── TransactionHistory/      # NEW - Token transaction list with filters
│   │   │   ├── index.tsx
│   │   │   └── TransactionHistory.test.tsx
│   │   ├── MultiAreaSelector/       # NEW - Parallel generation area selection
│   │   │   ├── index.tsx
│   │   │   └── MultiAreaSelector.test.tsx
│   │   ├── GenerationProgress/      # Extended - Multi-area progress tracking
│   │   │   ├── index.tsx
│   │   │   └── GenerationProgress.test.tsx
│   │   ├── LandscapeStudioEnhanced/ # Extended - Main generation UI with multi-area
│   │   │   ├── index.tsx
│   │   │   └── LandscapeStudioEnhanced.test.tsx
│   │   └── [existing components]    # CreditDisplay, EmailVerification, etc.
│   ├── pages/
│   │   ├── Generate.tsx             # Extended - Add multi-area support
│   │   ├── Account/                 # NEW - Account management page
│   │   │   ├── index.tsx
│   │   │   ├── TokensTab.tsx        # Token balance, history, auto-reload
│   │   │   ├── SubscriptionTab.tsx  # Subscription management
│   │   │   ├── ProfileTab.tsx       # User profile
│   │   │   └── SettingsTab.tsx      # User settings
│   │   ├── Pricing.tsx              # NEW - Pricing page with packages and plans
│   │   └── [existing pages]         # History, Profile, etc.
│   ├── services/
│   │   ├── api.ts                   # Extended - Add token/subscription endpoints
│   │   └── [existing services]
│   ├── store/
│   │   ├── tokenStore.ts            # NEW - Token balance, transactions, auto-reload state
│   │   ├── subscriptionStore.ts     # NEW - Subscription status and plan details
│   │   ├── generationStore.ts       # Extended - Multi-area progress tracking
│   │   └── userStore.ts             # Extended - Add subscription status
│   ├── types/
│   │   ├── index.ts                 # Extended - Add token/subscription types
│   │   └── database.ts              # Extended - Add PostgreSQL schema types
│   └── lib/
│       └── [existing utilities]     # firebase, supabase clients
├── tests/
│   ├── e2e/
│   │   ├── trial-user-registration.spec.ts    # NEW - US1 E2E test
│   │   ├── token-purchase.spec.ts             # NEW - US2 E2E test
│   │   ├── auto-reload.spec.ts                # NEW - US3 E2E test
│   │   ├── subscription-upgrade.spec.ts       # NEW - US4 E2E test
│   │   ├── multi-area-generation.spec.ts      # NEW - US5 E2E test
│   │   ├── transaction-history.spec.ts        # NEW - US6 E2E test
│   │   └── race-conditions.spec.ts            # NEW - Concurrent request tests
│   └── fixtures/
│       └── [test data]
├── package.json                     # Extended - Add new dependencies
├── tsconfig.json                    # Existing
├── vite.config.ts                   # Existing
└── playwright.config.ts             # Extended - Add new test specs

supabase/
├── migrations/
│   ├── 001_create_users_table.sql            # Existing - Extended with subscription fields
│   ├── 002_create_token_accounts.sql         # NEW - Token balance and auto-reload config
│   ├── 003_create_token_transactions.sql     # NEW - Token operation records
│   ├── 004_create_subscriptions.sql          # NEW - Subscription lifecycle tracking
│   ├── 005_create_generations.sql            # Existing - Extended for multi-area
│   ├── 006_create_rate_limits.sql            # Existing
│   ├── 007_create_functions.sql              # NEW - Database functions (balance calc, etc.)
│   ├── 008_create_indexes.sql                # NEW - Performance indexes
│   ├── 009_create_rls_policies.sql           # NEW - Row-level security policies
│   └── 010_create_triggers.sql               # NEW - Auto-reload trigger, balance validation
└── seed/
    ├── seed.sql                     # Test data for development
    └── README.md                    # Seeding instructions

.github/
└── workflows/
    ├── ci.yml                       # Extended - Add token/subscription tests
    ├── preview.yml                  # Existing - Vercel preview deployment
    └── production.yml               # Existing - Production deployment
```

**Structure Decision**:
This is a **web application** with separated backend (Railway) and frontend (Vercel) deployments. The backend uses PostgreSQL (Supabase) for data persistence with comprehensive migrations for the new token/subscription system. The frontend extends the existing React/TypeScript architecture with new components for monetization features. Database migrations are managed in `supabase/migrations/` and applied via Supabase CLI or dashboard.

**Key Structural Notes**:
1. **Backend Services**: New `*_service.py` files follow existing pattern (e.g., `credit_service.py` → deprecated in favor of `token_service.py`)
2. **Frontend Components**: New components in `src/components/` follow existing structure with test files co-located
3. **Database Migrations**: Sequential numbered migrations in `supabase/migrations/` for schema evolution
4. **E2E Tests**: One test spec per user story in `frontend/tests/e2e/` for clear traceability
5. **API Endpoints**: New endpoints in `backend/src/api/endpoints/` organized by resource (tokens, subscriptions)

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

**No violations detected.** All aspects of this feature comply with the constitution:
- Component-based React architecture maintained
- Type safety enforced (TypeScript + Pydantic)
- TDD mandated with comprehensive E2E test coverage
- Existing state management patterns (Zustand) extended appropriately
- API integration through centralized service layer
- Mobile-first responsive design throughout
- Firebase Auth extended (not replaced) with subscription awareness
- Full CI/CD compliance with existing pipeline

**Complexity Notes (Not Violations)**:
1. **PostgreSQL Row-Level Locking**: Necessary for atomic token operations, prevents race conditions (critical business requirement)
2. **Stripe Webhook Idempotency**: Required for payment integrity, standard pattern for financial systems
3. **Parallel Generation Processing**: Performance optimization for user experience, not a deviation from architecture
4. **Auto-Reload Throttle**: Business logic requirement (60-second minimum), prevents duplicate charges

All complexity is **justified by functional requirements** (FR-011, FR-020, FR-037, FR-070) and does not violate constitution principles.
