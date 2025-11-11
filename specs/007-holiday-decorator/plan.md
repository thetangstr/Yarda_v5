# Implementation Plan: Holiday Decorator - Viral Marketing Feature

**Branch**: `007-holiday-decorator` | **Date**: 2025-11-10 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `/specs/007-holiday-decorator/spec.md`

**Note**: This template is filled in by the `/speckit.plan` command. See `.specify/templates/commands/plan.md` for the execution workflow.

## Summary

Build a holiday-themed viral marketing feature that generates AI-decorated home images using Google Street View and drives user acquisition through social media sharing. Users receive 1 free Holiday Credit on signup, can adjust Street View angles to capture their home's best view, select from 3 decoration styles (Classic/Modern/Over-the-Top), and earn additional credits by sharing results on Instagram, Facebook, or TikTok. The feature includes email capture for HD downloads, a pivot CTA to the core landscaping product with 25% discount, and operates seasonally from Thanksgiving through New Year's Day.

**Technical Approach**: Extend existing Yarda architecture with new Holiday Credit system (separate from trial/token credits), reuse Google Maps Street View integration with added 360° rotation controls, implement img-to-img AI transformation using Gemini for decoration overlay, integrate social platform APIs (Facebook Graph API, Instagram Basic Display API, TikTok Creator API) for share verification, and add seasonal activation logic to homepage hero section.

## Technical Context

**Language/Version**: TypeScript 5.6.3 (Frontend), Python 3.11+ (Backend)
**Primary Dependencies**:
- **Frontend**: Next.js 15.0.2, React 18, Zustand (state), TailwindCSS, Framer Motion (animations), Axios (HTTP)
- **Backend**: FastAPI, asyncpg (connection pool), Pydantic, Google Gemini 2.5 Flash (AI), Google Maps API (Street View, Geocoding)
- **Social APIs**: Facebook Graph API, Instagram Basic Display API, TikTok Creator API (share verification)

**Storage**: PostgreSQL 17 (Supabase) with Row-Level Security - New tables: `holiday_credits`, `holiday_generations`, `social_shares`, `email_nurture_list`
**Testing**: Playwright (E2E frontend), pytest (backend unit tests)
**Target Platform**: Web (responsive: mobile, tablet, desktop browsers)
**Project Type**: Web application (frontend + backend)
**Performance Goals**:
- Image generation: <10 seconds (95th percentile)
- Page load: <3 seconds (initial load)
- Street View rotation: <1 second response time
- Social share verification: <5 seconds

**Constraints**:
- Seasonal feature: Active only Thanksgiving - January 1st
- Daily share limit: 3 per user (abuse prevention)
- Single credit per generation (consistent with existing landscape feature)
- Must reuse existing Google Maps integration and Gemini AI client
- Must not interfere with core landscape generation flow

**Scale/Scope**:
- Target: 1,000+ email subscribers by January 1st
- Expected: 300% DAU increase during holiday season
- Support: Concurrent generation requests (same infrastructure as landscape feature)
- 5 user stories (P1-P4), 42 functional requirements, 10 success criteria

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

### Architecture Principles

✅ **Component-Based Architecture (React)**: Feature will use existing React component patterns. New components: `HolidayHero`, `HolidayDecoratorPage`, `StreetViewRotator`, `StyleSelector`, `ShareButtons`, `PivotCTA`

✅ **Type Safety (TypeScript - NON-NEGOTIABLE)**: All frontend code will use TypeScript 5.6.3 with strict mode. Backend uses Pydantic for type validation.

✅ **Test-First Development (Playwright - NON-NEGOTIABLE)**: Will write E2E tests for all 5 user stories before implementation. Backend services will have pytest unit tests.

✅ **CI/CD Pipeline**: Will use existing 5-stage automated testing workflow (`/test-smart` command)

✅ **State Management (Zustand)**: Will extend existing `userStore` with holiday credit tracking. May add `holidayStore` for feature-specific state (generation progress, share status)

✅ **Centralized API Pattern**: Will add new endpoints to existing API client (`src/lib/api.ts`): `holidayAPI.generate()`, `holidayAPI.verifyShare()`, `holidayAPI.requestHDDownload()`

✅ **Project Complexity Limit**: This is a feature within the existing Yarda project, not a new project. Does not violate 3-project limit.

✅ **Avoid Premature Abstraction**: Will reuse existing services (`MapsService`, `GeminiClient`, `EmailService`) without creating new Repository patterns. Holiday Credit system will use simple service pattern like existing `TrialService` and `TokenService`.

✅ **Single-Page Flows**: Holiday Decorator will be a single-page experience at `/holiday` route (similar to `/generate`). No multi-page routing required.

### Quality Gates

✅ **Atomic Database Operations**: Holiday Credit deduction will use `FOR UPDATE NOWAIT` locks (same pattern as trial/token credits after 2025-11-10 bugfix)

✅ **Error Handling**: Will handle Street View unavailability, generation failures (with credit refund), social API failures gracefully

✅ **Performance**: <10 second generation target aligns with existing Gemini processing times

### Seasonal Activation

⚠️ **New Pattern**: Seasonal homepage hero switching (Thanksgiving - January 1st) is a NEW pattern not currently in the codebase. Needs research on implementation approach (environment variable, database flag, or date-based logic).

**Constitution Check Result**: ✅ **PASS** - No violations. All patterns align with existing architecture. One new pattern (seasonal activation) requires research in Phase 0.

## Project Structure

### Documentation (this feature)

```text
specs/[###-feature]/
├── plan.md              # This file (/speckit.plan command output)
├── research.md          # Phase 0 output (/speckit.plan command)
├── data-model.md        # Phase 1 output (/speckit.plan command)
├── quickstart.md        # Phase 1 output (/speckit.plan command)
├── contracts/           # Phase 1 output (/speckit.plan command)
└── tasks.md             # Phase 2 output (/speckit.tasks command - NOT created by /speckit.plan)
```

### Source Code (repository root)

```text
backend/
├── src/
│   ├── api/endpoints/
│   │   ├── holiday.py              # NEW: Holiday Decorator endpoints
│   │   └── webhooks.py             # EXTEND: Add social share webhook handlers
│   ├── models/
│   │   └── holiday.py              # NEW: Pydantic models (HolidayGenerationRequest, ShareVerificationRequest)
│   ├── services/
│   │   ├── holiday_credit_service.py    # NEW: Holiday credit management (atomic deduction)
│   │   ├── holiday_generation_service.py # NEW: Orchestrates holiday decoration generation
│   │   ├── social_share_service.py      # NEW: Social platform API integration
│   │   ├── maps_service.py             # EXTEND: Add Street View rotation support
│   │   ├── gemini_client.py            # REUSE: Img-to-img transformation
│   │   └── email_service.py            # EXTEND: Add HD image email template
│   └── db/
│       └── connection_pool.py          # REUSE: Existing database pool
└── tests/
    ├── unit/
    │   ├── test_holiday_credit_service.py   # NEW: Test atomic deduction
    │   ├── test_social_share_service.py     # NEW: Test share verification
    │   └── test_holiday_generation_service.py # NEW: Test orchestration
    └── integration/
        └── test_holiday_flow.py            # NEW: Test end-to-end holiday generation

frontend/
├── src/
│   ├── pages/
│   │   ├── index.tsx               # EXTEND: Add holiday hero section
│   │   └── holiday.tsx             # NEW: Holiday Decorator single-page flow
│   ├── components/
│   │   ├── HolidayHero.tsx         # NEW: Seasonal hero section
│   │   ├── StreetViewRotator.tsx   # NEW: 360° rotation controls
│   │   ├── StyleSelector.tsx       # NEW: Classic/Modern/Over-the-Top
│   │   ├── ShareButtons.tsx        # NEW: Instagram/Facebook/TikTok sharing
│   │   ├── PivotCTA.tsx            # NEW: Landscape upsell module
│   │   └── GenerationProgressInline.tsx # REUSE: Existing progress component
│   ├── store/
│   │   ├── userStore.ts            # EXTEND: Add holiday_credits field
│   │   └── holidayStore.ts         # NEW: Holiday feature state (optional)
│   ├── lib/
│   │   └── api.ts                  # EXTEND: Add holidayAPI namespace
│   └── types/
│       └── holiday.ts              # NEW: TypeScript types for holiday feature
└── tests/e2e/
    ├── holiday-discovery.spec.ts   # NEW: P1 - Discovery & first generation
    ├── holiday-sharing.spec.ts     # NEW: P2 - Viral sharing loop
    ├── holiday-existing-user.spec.ts # NEW: P3 - "What's New?" modal
    ├── holiday-lead-capture.spec.ts  # NEW: P4 - HD download email
    └── holiday-pivot.spec.ts       # NEW: P5 - Pivot to landscaping

supabase/migrations/
└── 014_holiday_decorator.sql       # NEW: Tables for holiday feature
```

**Structure Decision**: Web application architecture with backend (Python/FastAPI) and frontend (TypeScript/Next.js). This feature extends the existing Yarda codebase by:
- Adding new API endpoints and services to backend
- Adding new page and components to frontend
- Reusing existing infrastructure (MapsService, GeminiClient, EmailService, connection pool)
- Following established patterns (service layer, Zustand state, API client)

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

**No violations.** Constitution Check passed with no architectural concerns. This feature adheres to all project principles and reuses existing patterns.
