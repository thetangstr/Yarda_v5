# Yarda V5 Codebase - Executive Summary

## What is Yarda V5?

**Yarda** is an AI-powered landscape design generation platform that allows users to submit photos or addresses of their properties and receive AI-generated landscape design recommendations using Google Gemini AI.

### Core Features

1. **AI Landscape Design Generation**
   - Input: Property address or yard image
   - Output: AI-generated landscape designs for multiple yard areas
   - Technology: Google Gemini 2.5 Flash image generation
   - Perspectives: Multi-angle views (Street View + Satellite + Custom renderings)

2. **Multi-Area Generation**
   - Front Yard: Street View image transformed with landscape design
   - Backyard: Satellite overhead view converted to 45° architectural rendering
   - Walkway: New ground-level perspective generation
   - Each area can have different styles and customization

3. **Credit System (Freemium Model)**
   - **Trial Credits**: 3 free credits on signup (one-time offer)
   - **Token System**: Purchase credits ($5 = 5 tokens, $20 = 25 tokens)
   - **Subscription**: Monthly Pro ($99/month) for unlimited generations
   - **Holiday Credits**: Seasonal feature with social sharing rewards

4. **Social Sharing & Viral Growth**
   - Holiday decorator feature with aesthetic house decoration designs
   - Earn credits by sharing designs on social media
   - Tracking system for share clicks and credit rewards
   - Limited-time promotional campaign

---

## Architecture at a Glance

```
┌──────────────────┐       ┌──────────────────┐      ┌──────────────────┐
│   FRONTEND       │       │    BACKEND       │      │   DATABASE       │
│  (Vercel)        │◄─────►│  (Railway)       │◄────►│  (Supabase)      │
│                  │ HTTPS │                  │ SQL  │                  │
│  Next.js 15.0.2  │       │  FastAPI 0.115.0 │      │  PostgreSQL 17   │
│  React 18        │       │  Python 3.11+    │      │  us-east-2       │
│  TypeScript 5.6  │       │                  │      │                  │
│  Zustand Store   │       │  17 Services:    │      │  7 Key Tables:   │
│  Axios HTTP      │       │  - Generation    │      │  - users         │
│                  │       │  - Gemini AI     │      │  - generations   │
└──────────────────┘       │  - Maps          │      │  - subscriptions │
         │                 │  - Stripe        │      │  - tokens        │
         │                 │  - Trial/Token   │      │  - ...           │
         │                 │  - Webhooks      │      │                  │
         │                 │                  │      └──────────────────┘
         │                 └──────────────────┘
         │
         └─► External APIs:
             - Google OAuth (Supabase Auth)
             - Google Maps API (Geocoding, Street View, Satellite)
             - Google Gemini 2.5 Flash (Image Generation)
             - Stripe (Payment Processing)
             - Vercel Blob (Image Storage)
```

---

## Key Stats

| Metric | Value |
|--------|-------|
| **Total Lines of Code** | ~15,000+ (backend + frontend) |
| **Backend Endpoints** | 20+ API routes |
| **Database Tables** | 7 core tables + 3 transaction tables |
| **External API Integrations** | 5 major (Google, Stripe, Supabase, Vercel) |
| **Frontend Components** | 40+ React components |
| **Services/Modules** | 17 backend services |
| **Test Coverage** | 20+ unit tests, 10+ E2E tests |
| **Deployment Targets** | 3 (Vercel frontend, Railway backend, Supabase database) |

---

## Critical Paths to Understand

### 1. **Payment Flow (Most Complex)**
```
User → Authorization Check (subscription > trial > token)
     → Atomic Deduction (FOR UPDATE NOWAIT)
     → Gemini Generation
     → Result Storage
     → Refund if Failure
```
**Why Complex**: Race conditions, atomicity requirements, refund logic
**Key Files**: 
- `backend/src/services/generation_service.py`
- `backend/src/services/trial_service.py`
- `backend/src/services/token_service.py`

### 2. **Image Generation Workflow**
```
Address → Geocoding (Google Maps)
       → Street View + Satellite Download
       → Gemini AI Processing (per area)
       → Image Upload (Vercel Blob)
       → Database Recording
```
**Why Complex**: Perspective-based prompt engineering, multi-area coordination
**Key Files**:
- `backend/src/services/maps_service.py`
- `backend/src/services/gemini_client.py`
- `backend/src/services/prompt_builder.py`

### 3. **Stripe Integration**
```
User Buys Tokens → Stripe Checkout → Payment Success
                                  → Webhook Event
                                  → Idempotency Check
                                  → Atomic Token Addition
                                  → User Sees Balance Update
```
**Why Complex**: Webhook signature verification, deduplication, async processing
**Key Files**:
- `backend/src/api/endpoints/webhooks.py`
- `backend/src/services/webhook_service.py`
- `backend/src/services/stripe_service.py`

### 4. **Authentication & Session Management**
```
Google OAuth → Supabase Auth → JWT Token
            → Database User Creation
            → Zustand Store + localStorage
            → Axios Auth Injection
```
**Why Complex**: OAuth flow coordination, localStorage persistence, token refreshing
**Key Files**:
- `frontend/src/pages/auth/callback.tsx`
- `frontend/src/store/userStore.ts`
- `frontend/src/lib/api.ts`

---

## Potential Bottlenecks

### Performance Issues

1. **Sequential Google Maps Calls** (2-3 seconds)
   - Geocoding → Street View → Satellite are serial, not parallel
   - **Fix**: Use `asyncio.gather()` for parallel requests

2. **Gemini API Latency** (30-60 seconds)
   - Takes 10-30 seconds per image, scales linearly with areas
   - 3 areas = 30-90 seconds total
   - **Current**: Frontend polls every 2 seconds (acceptable)

3. **Database Connection Pool** (10 max connections)
   - With slow Gemini (30s), only ~0.3 requests/sec capacity
   - 4 concurrent users could cause queuing
   - **Threshold**: Contention at 3-4 concurrent users

4. **No Background Job Queue**
   - Generation processing runs inline without queue
   - High concurrent load could timeout
   - **Solution**: Implement Celery/RQ or Railway background jobs

### Data Integrity Risks

1. **Race Conditions on Credit Deduction**
   - Without `FOR UPDATE NOWAIT`, concurrent requests could both deduct credits
   - **Status**: PROTECTED with row-level locking (correctly implemented)

2. **Stripe Webhook Duplicates**
   - Multiple webhook retries could cause double charging
   - **Status**: PROTECTED with idempotency key deduplication

3. **Image Upload Failures**
   - Generation marked "completed" but images missing from Vercel Blob
   - **Mitigation**: Verify upload before marking complete (may not be implemented)

---

## Critical Gotchas

### 1. **Backend Virtual Environment Required**
- Backend MUST run with `source venv/bin/activate` activated
- Without venv: `ModuleNotFoundError: No module named 'stripe'`
- CORS errors also indicate venv not activated

### 2. **CORS Configuration**
- Hardcoded to localhost:3000-3003 in config.py
- Production URLs must be whitelisted manually
- Vercel preview URLs may fail with CORS errors

### 3. **Perspective-Based Prompt Engineering**
- Satellite imagery alone won't transform correctly
- Prompt must explicitly say "CREATE NEW 45° view" for backyard
- Wrong: "Transform this overhead view"
- Right: "Use this as reference, CREATE NEW architectural rendering"

### 4. **Firebase is Deprecated**
- Old Firebase references might linger in codebase
- All auth must use Supabase Auth only

### 5. **Multiple Railway Projects**
- Old `yarda-backend.onrender.com` on Render is deprecated
- Only use: `yarda-api-production.up.railway.app` on Railway

---

## File Navigation Cheat Sheet

| Goal | Files to Check |
|------|----------------|
| Understand generation flow | `generations.py`, `generation_service.py` |
| Understand payment logic | `trial_service.py`, `token_service.py`, `subscription_service.py` |
| Understand Stripe integration | `webhooks.py`, `webhook_service.py`, `stripe_service.py` |
| Understand frontend auth | `pages/auth/callback.tsx`, `store/userStore.ts`, `lib/api.ts` |
| Understand image generation | `gemini_client.py`, `prompt_builder.py`, `maps_service.py` |
| Understand database schema | `supabase/migrations/` (all SQL files) |
| Understand deployment | `CLAUDE.md`, Vercel/Railway dashboards |
| Understand testing | `frontend/tests/e2e/`, `backend/tests/` |

---

## Development Workflow

### Local Development
```bash
# Terminal 1: Backend
cd backend
source venv/bin/activate
uvicorn src.main:app --reload --port 8000

# Terminal 2: Frontend
cd frontend
npm run dev  # http://localhost:3000

# Terminal 3: Tests (as needed)
cd frontend
npm run test:e2e

# Or backend tests
cd backend
pytest tests/ -v
```

### Deployment
```bash
# Push to main branch
git push origin main

# Automatic:
# - Vercel deploys frontend preview + production
# - Railway deploys backend
# - E2E tests run automatically on staging
# - Manual approval needed for production
```

---

## Support & Documentation

### In the Codebase
- **CLAUDE.md**: Complete project instructions & patterns (READ THIS FIRST)
- **CODEBASE_ARCHITECTURE_OVERVIEW.md**: Detailed architecture documentation
- **ARCHITECTURE_DIAGRAM.md**: Visual diagrams of data flow & system design

### External Resources
- Supabase Dashboard: https://supabase.com/dashboard/project/gxlmnjnjvlslijiowamn
- Vercel Dashboard: https://vercel.com/dashboard/projects
- Railway Dashboard: https://railway.app/dashboard
- Stripe Dashboard: https://dashboard.stripe.com (test mode)
- Google Cloud Console: For API keys

---

## Current Status (as of 2025-11-13)

### Completed Features
- [x] User authentication (Google OAuth + Magic Link)
- [x] Trial credit system (3 free credits)
- [x] Token purchase system (Stripe Checkout)
- [x] Monthly Pro subscription (Stripe recurring)
- [x] Multi-area landscape generation (Feature 005)
- [x] Single-page generation flow (no navigation)
- [x] Holiday decorator feature (Feature 007)
- [x] Social sharing with credit rewards
- [x] Full E2E test suite (Playwright)
- [x] Production deployment (Vercel + Railway)

### Known Issues
- [ ] Sequential Maps API calls (should be parallel)
- [ ] No background job queue (risk at high concurrency)
- [ ] Image upload failure handling (may not refund properly)
- [ ] Possible localStorage corruption edge cases

### Recommended Improvements
1. **Parallel API calls** for Maps service
2. **Background job queue** (Celery/RQ)
3. **Connection pool optimization** (increase max or add queueing)
4. **Webhook retry logic** (exponential backoff)
5. **Image upload verification** (before marking complete)

---

## Questions? Start Here

1. **"How does generation work?"** → Read `ARCHITECTURE_DIAGRAM.md` (Data Flow section)
2. **"Where is the payment logic?"** → `backend/src/services/{trial,token,subscription}_service.py`
3. **"How do I run tests?"** → See CLAUDE.md (Testing Strategy section)
4. **"How do I debug a hang/timeout?"** → Check connection pool, API rate limits, Gemini latency
5. **"Where is the database schema?"** → `supabase/migrations/` (all SQL files)
6. **"How do I deploy?"** → Push to main, automatic Vercel + Railway deploy

---

**Last Updated**: 2025-11-13
**Created**: 2025-11-13
**Status**: Production-Ready with Known Optimizations

