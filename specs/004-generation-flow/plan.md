# Implementation Plan: Generation Flow Interface

**Branch**: `004-generation-flow` | **Date**: 2025-11-06 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `/specs/004-generation-flow/spec.md`

**Note**: This template is filled in by the `/speckit.plan` command. See `.specify/templates/commands/plan.md` for the execution workflow.

## Summary

Implement a generation flow interface that allows users to select yard areas, choose design styles, and generate landscape designs using their payment method (trial credits, tokens, or subscription). The interface must support both single-area and multi-area generation with real-time progress tracking, automatic payment deduction with atomic operations, and graceful error handling with automatic refunds. The feature enables trial users to generate their first design in under 3 minutes and supports parallel processing for multi-area generation completing in under 90 seconds.

## Technical Context

**Language/Version**: TypeScript 5.6.3 (Frontend), Python 3.11+ (Backend)
**Primary Dependencies**:
- Frontend: React 18, Next.js 15.0.2, Zustand (state), Axios (HTTP), Tailwind CSS
- Backend: FastAPI, asyncpg (database), Google Maps API (Places + Street View), Google Gemini 2.5 Flash (AI)

**Storage**: PostgreSQL 17 (Supabase) with atomic operations via row-level locking
**Testing**: Playwright (E2E), Vitest (frontend unit), pytest (backend unit)
**Target Platform**: Web (desktop + mobile), deployed on Vercel (frontend) + Railway (backend)
**Project Type**: Web application (frontend + backend)
**Performance Goals**:
- Page load < 3 seconds on 3G
- Single-area generation: 30-60 seconds
- Multi-area parallel generation: < 90 seconds total (not 3×60 seconds)
- 100 concurrent users without degradation

**Constraints**:
- Payment deduction must be atomic (row-level locking with FOR UPDATE NOWAIT)
- Zero negative balances allowed (CHECK constraint enforcement)
- Generation progress must persist across page refresh (localStorage)
- Google Maps API costs: $0.007 per Street View image
- Backend API timeout: 5 minutes maximum for generation

**Scale/Scope**:
- Expected load: 100-1000 concurrent users
- 3-5 generations per user session
- 4 yard area types (Front Yard, Backyard, Walkway, Side Yard)
- 5 predefined design styles
- Multi-area support: up to 4 areas per request

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

### Pre-Design Constitution Compliance

✅ **I. Component-Based Architecture**
- Generation form will be modular components (AddressInput, AreaSelector, StyleSelector)
- Progress tracker as separate component
- Reusable payment indicator component
- All components self-contained with TypeScript interfaces

✅ **II. Type Safety (NON-NEGOTIABLE)**
- All components will have TypeScript interfaces
- Shared types in `frontend/src/types/generation.ts`
- No `any` types allowed
- Backend Pydantic models for all API contracts

✅ **III. Test-First Development (NON-NEGOTIABLE)**
- E2E tests for all 3 user stories (P1, P2, P3)
- Tests written before implementation
- Test files: `frontend/tests/e2e/generation-flow.spec.ts`
- Coverage: trial flow, multi-area, payment transparency

✅ **V. State Management**
- Zustand store for generation state (`useGenerationStore`)
- localStorage persistence for progress recovery
- Request ID persisted for page refresh recovery
- Clear separation: global (payment status) vs local (form state)

✅ **VI. API Integration**
- All API calls through `frontend/src/services/api.ts`
- Endpoints: POST `/generations/`, GET `/generations/{id}`, GET `/tokens/balance`
- 5-minute timeout for generation operations
- Polling mechanism for progress updates (every 2 seconds)
- Health checks before generation start

✅ **VII. Responsive Design**
- Mobile-first design with Tailwind CSS
- Touch-friendly area selection (large tap targets)
- Responsive grid for multi-area display
- Progressive disclosure for mobile (collapse sections)

✅ **VIII. Authentication & Authorization**
- Generation endpoint requires authentication
- Backend validates tokens via middleware
- Payment hierarchy: subscription > trial > token
- Atomic authorization check before deduction

✅ **IX. CI/CD Pipeline (NON-NEGOTIABLE)**
- GitHub Actions workflow will run on PR
- Automated E2E tests for generation flow
- Vercel preview deployment for testing
- Quality gates: TypeScript 0 errors, all tests pass
- Production deployment only after manual approval

### Violations Requiring Justification

**NONE** - Feature fully complies with all constitution principles

## Project Structure

### Documentation (this feature)

```text
specs/004-generation-flow/
├── plan.md              # This file (/speckit.plan command output)
├── research.md          # Phase 0 output - Technology decisions and patterns
├── data-model.md        # Phase 1 output - Database schema and entities
├── quickstart.md        # Phase 1 output - Developer onboarding guide
├── contracts/           # Phase 1 output - API contracts
│   ├── openapi.yaml     # OpenAPI spec for generation endpoints
│   └── types.ts         # Shared TypeScript types
└── tasks.md             # Phase 2 output (/speckit.tasks command - NOT created by /speckit.plan)
```

### Source Code (repository root)

```text
backend/
├── src/
│   ├── api/
│   │   └── endpoints/
│   │       └── generations.py        # Existing - extend with progress polling
│   ├── services/
│   │   ├── trial_service.py          # Existing - trial credit operations
│   │   ├── token_service.py          # Existing - token operations
│   │   └── maps_service.py           # Existing - Google Maps integration
│   └── models/
│       └── generation.py             # Existing - extend with progress fields
└── tests/
    ├── test_generation_flow.py       # NEW - E2E generation flow tests
    └── test_concurrent_generation.py # NEW - Race condition tests

frontend/
├── src/
│   ├── components/
│   │   ├── generation/               # NEW - Generation flow components
│   │   │   ├── AddressInput.tsx      # Address autocomplete component
│   │   │   ├── AreaSelector.tsx      # Multi-area selection component
│   │   │   ├── StyleSelector.tsx     # Design style dropdown
│   │   │   ├── PaymentIndicator.tsx  # Shows payment method being used
│   │   │   ├── GenerationProgress.tsx # Real-time progress tracker
│   │   │   └── GenerationForm.tsx    # Main form container
│   │   └── ui/                       # Existing - SuperMinimal components
│   ├── pages/
│   │   └── generate.tsx              # Existing - integrate new components
│   ├── services/
│   │   └── api.ts                    # Existing - add generation polling
│   ├── store/
│   │   └── generationStore.ts        # NEW - Generation state management
│   └── types/
│       └── generation.ts             # NEW - TypeScript interfaces
└── tests/
    └── e2e/
        ├── generation-trial-flow.spec.ts      # NEW - P1 user story tests
        ├── generation-multi-area.spec.ts      # NEW - P2 user story tests
        └── generation-payment-display.spec.ts # NEW - P3 user story tests
```

**Structure Decision**: Web application structure (frontend + backend). Frontend uses component-based architecture with Next.js pages. Backend uses FastAPI service layer pattern. Shared types defined in contracts/ directory and synced to frontend/backend.

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

**NO VIOLATIONS** - Feature adheres to all constitution principles without exceptions.

---

## Implementation Progress

### ✅ Phase 0: Research & Technical Decisions (COMPLETE)

**Status**: Complete - 2025-11-06
**Output**: [research.md](./research.md)

**Decisions Made**:
1. **Real-time Progress Tracking**: Polling-based approach (2-second intervals)
2. **Atomic Payment Deduction**: PostgreSQL row-level locking (`FOR UPDATE NOWAIT`)
3. **Multi-Area Parallel Generation**: FastAPI BackgroundTasks with `asyncio.gather()`
4. **Progress Persistence**: localStorage + backend status polling
5. **Payment Method Hierarchy Display**: Inline indicator in generate button
6. **Google Places Autocomplete**: Debounced search with 300ms delay + session tokens
7. **State Management**: Zustand with localStorage persistence
8. **Testing**: Playwright E2E tests for all user stories

**Rationale Documentation**: All decisions documented with alternatives considered, cost analysis, and performance implications. Zero unresolved technical questions.

---

### ✅ Phase 1: Design & Contracts (COMPLETE)

**Status**: Complete - 2025-11-06
**Outputs**:
- [data-model.md](./data-model.md) - Entity definitions and relationships
- [contracts/openapi.yaml](./contracts/openapi.yaml) - REST API specification
- [contracts/types.ts](./contracts/types.ts) - TypeScript type definitions
- [quickstart.md](./quickstart.md) - Developer onboarding guide

**Artifacts Created**:

1. **Data Model** (`data-model.md`):
   - 7 core entities defined (Property Address, Yard Area, Generation Request, Generation Progress, Payment Status, Payment Transaction, Generation Source Image)
   - State transition diagrams for generation lifecycle
   - Validation rules mapped to functional requirements
   - Atomic operation patterns documented
   - Success metrics mapped to data fields

2. **API Contracts** (`contracts/openapi.yaml`):
   - 3 REST endpoints specified:
     - `POST /v1/generations` - Create generation request
     - `GET /v1/generations/{id}` - Get generation status
     - `GET /v1/users/payment-status` - Get payment capabilities
   - Request/response schemas with examples
   - Error responses for all scenarios (400, 401, 403, 429, 500)
   - Authentication scheme documented (Bearer JWT)
   - Rate limiting policy defined (max 5 concurrent)

3. **TypeScript Types** (`contracts/types.ts`):
   - 8 enums for type safety
   - 12 interfaces for API contracts
   - 4 UI helper types
   - Type guards for common checks
   - JSDoc examples for all interfaces
   - Progress state for localStorage persistence

4. **Developer Guide** (`quickstart.md`):
   - Step-by-step implementation guide (5 steps)
   - Code examples for backend service, API endpoints, frontend components
   - Database migration SQL script
   - Testing checklist (unit, E2E)
   - Deployment checklist
   - Troubleshooting guide

**Constitution Re-Check**: ✅ All principles still compliant (no violations)

**Agent Context Updated**: Claude Code context file updated with TypeScript/Python stack and PostgreSQL database info.

---

### ✅ Phase 2: Task Generation (COMPLETE)

**Status**: Complete - 2025-11-06
**Output**: [tasks.md](./tasks.md)

**Tasks Generated**:
- **Total**: 69 tasks organized by user story
- **Phase 1 (Setup)**: 4 tasks - Database migration, type setup (2 hours)
- **Phase 2 (Foundational)**: 5 tasks - Core services and models (4 hours)
- **Phase 3 (US1 - MVP)**: 24 tasks - Single-area generation with trial credits (12 hours) 🎯
- **Phase 4 (US2)**: 12 tasks - Multi-area with token payment (6 hours)
- **Phase 5 (US3)**: 7 tasks - Payment transparency UI (2 hours)
- **Phase 6 (Background Worker)**: 7 tasks - AI generation processing (6 hours) ⚠️ CRITICAL
- **Phase 7 (Polish)**: 10 tasks - Production hardening (4 hours)

**Key Features**:
- Each user story independently testable and shippable
- 15 tasks marked [P] for parallel execution
- MVP scope identified: Phase 1+2+3 = 18 hours
- Strict task format: `- [ ] [ID] [P?] [Story?] Description with file path`
- Clear dependencies and execution order
- E2E tests included per user story

**MVP Delivery Path**: Phase 1 → Phase 2 → Phase 3 (US1) = Trial users can generate designs end-to-end

---

### 🔜 Phase 3: Implementation (PENDING)

**Status**: Not started (requires `/speckit.implement` command)
**Prerequisites**: Phase 2 (tasks.md) must be complete

**Implementation Order** (estimated):
1. **Database Migration** (1 hour) - Create tables, indexes, triggers
2. **Backend Services** (4-6 hours) - Generation service, payment authorization, background worker
3. **Backend API** (2 hours) - Endpoints for creation, status polling
4. **Frontend Components** (6-8 hours) - Form, progress tracker, payment indicator
5. **Frontend Integration** (2 hours) - Connect components, state management, routing
6. **E2E Tests** (2-3 hours) - Trial flow, multi-area, payment display
7. **Deployment** (1 hour) - Railway + Vercel, environment variables

**Total Estimated Effort**: 18-23 hours (3-5 days with testing)
