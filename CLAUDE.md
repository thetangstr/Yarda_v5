# CLAUDE.md

This file provides high-level guidance to Claude Code when working with code in this repository.

## Project Overview

Yarda AI Landscape Studio - AI-powered landscape design generation with Google Maps integration, Google OAuth authentication, and flexible payment options (trials, tokens, subscriptions).

## Technology Stack

- **Frontend:** Next.js 15.0.2, React 18, TypeScript 5.6.3, TailwindCSS, Zustand
- **Backend:** Python 3.11+, FastAPI, asyncpg, Pydantic 2.11
- **Database:** PostgreSQL 17 (Supabase) with Row-Level Security
- **Auth:** Supabase Auth with Google OAuth
- **Payments:** Stripe (Checkout, Customer Portal, Webhooks)
- **AI:** Google Gemini 2.5 Flash
- **Maps:** Google Maps API
- **Storage:** Vercel Blob

**See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for detailed system design and patterns.**

## Critical Deployment IDs

**Frontend (Vercel):** `prj_H82uxC9rqafgCvhSaKYEZm5GskNn`
**Backend (Railway):** `7a8f9bcb-a265-4c34-82d2-c9c3655d26bf`
**Database (Supabase):** `gxlmnjnjvlslijiowamn`
**Payments (Stripe):** `acct_1SFRz7F7hxfSl7pF`

**See [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) for complete environment configurations.**

## Active Features

- **Generation Flow** (004-005): Single-page AI generation with polling
- **Holiday Decorator** (007): Viral marketing with social sharing credits
- **Internationalization** (006): Multi-language support (en, es, zh)
- **Authentication**: Google OAuth + Magic Link (passwordless)
- **Payment Systems**: Trials, tokens, subscriptions

**See [docs/REQUIREMENTS.md](docs/REQUIREMENTS.md) for detailed feature specifications.**

## Quick Start Commands

### Local Development

```bash
# Backend (ALWAYS activate venv first!)
cd backend && source venv/bin/activate && uvicorn src.main:app --reload

# Frontend
cd frontend && npm run dev
```

### Testing

```bash
# Full CI/CD pipeline (recommended)
/test-smart

# E2E tests
cd frontend && npm run test:e2e

# Backend tests
cd backend && pytest tests/ -v
```

**See [docs/TESTING.md](docs/TESTING.md) for testing strategy and CUJs.**
**See [docs/DEVELOPMENT.md](docs/DEVELOPMENT.md) for setup and common tasks.**

## Critical Architecture Patterns

### Backend Patterns

**Connection Pool:** Single global `db_pool` instance
**Service Layer:** Business logic in `src/services/` with dependency injection
**Atomic Operations:** Always use `FOR UPDATE NOWAIT` for credit deductions

```python
# Critical: Atomic deduction pattern
async with db_pool.transaction() as conn:
    user = await conn.fetchrow("""
        SELECT trial_remaining FROM users
        WHERE id = $1 FOR UPDATE NOWAIT
    """, user_id)
```

### Frontend Patterns

**State Management:** Zustand with localStorage persistence
**API Client:** Centralized axios with auth interceptor
**Single-Page Flows:** No navigation, inline progress/results

**See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for complete patterns and data flows.**

## Critical Known Issues

1. **Backend venv activation required** - Always `source venv/bin/activate` before `uvicorn`
   - Symptom: CORS errors, `ModuleNotFoundError`
   - Solution: Activate venv first

2. **Row-level locking required** - Use `FOR UPDATE NOWAIT` for atomic operations
   - Prevents race conditions in credit deduction
   - See backend service examples

3. **CORS for local development** - Frontend `.env.local` must have `NEXT_PUBLIC_API_URL=http://localhost:8000`

**See [docs/DEVELOPMENT.md](docs/DEVELOPMENT.md) for complete troubleshooting guide.**

## Testing Philosophy

**Golden Rule:** NEVER request manual testing until ALL automated tests pass and work perfectly.

**Testing Hierarchy:**
1. Automated E2E tests (Playwright MCP) - ALWAYS USE FIRST
2. Backend unit tests (pytest)
3. Integration tests
4. Manual testing - ONLY as final sign-off when everything is perfect

**See [docs/TESTING.md](docs/TESTING.md) for complete strategy and CUJs checklist.**

## Documentation Index

| Document | Purpose | Use When |
|----------|---------|----------|
| [ARCHITECTURE.md](docs/ARCHITECTURE.md) | System design, patterns, data flows | Understanding system design |
| [REQUIREMENTS.md](docs/REQUIREMENTS.md) | Feature specs, business logic | Understanding product requirements |
| [TESTING.md](docs/TESTING.md) | Testing strategy, CUJs, commands | Running tests or debugging test failures |
| [DEPLOYMENT.md](docs/DEPLOYMENT.md) | Environments, CI/CD, configs | Deploying or troubleshooting environments |
| [DEVELOPMENT.md](docs/DEVELOPMENT.md) | Setup, commands, troubleshooting | Setting up or common development tasks |
| [API.md](docs/API.md) | Endpoint reference | Integrating with API |
| [DATABASE.md](docs/DATABASE.md) | Schema, migrations, queries | Database changes or queries |
| [adr/](docs/adr/) | Architecture decision records | Understanding why decisions were made |

## Quick Reference - Key Files

| Task | File |
|------|------|
| User authentication flow | `frontend/src/pages/auth/callback.tsx` |
| User state management | `frontend/src/store/userStore.ts` |
| API client with auth | `frontend/src/lib/api.ts` |
| Language context & state | `frontend/src/context/LanguageContext.tsx` |
| Trial credit deduction | `backend/src/services/trial_service.py` |
| Token deduction | `backend/src/services/token_service.py` |
| Generation API | `backend/src/api/endpoints/generations.py` |
| Maps service | `backend/src/services/maps_service.py` |
| Gemini AI integration | `backend/src/services/gemini_client.py` |
| Database connection pool | `backend/src/db/connection_pool.py` |

## Recent Major Changes

### 2025-11-13: Internationalization (i18n) System ✅
- Multi-language support (en, es, zh)
- Backend API for language preferences
- React Context with database sync
- E2E tests passing

### 2025-11-08: Integration Verified ✅
- End-to-end generation flow working
- Google Maps integration operational

**See [docs/REQUIREMENTS.md](docs/REQUIREMENTS.md) for complete changelog.**
