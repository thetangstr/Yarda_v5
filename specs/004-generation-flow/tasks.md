---
description: "Implementation tasks for Generation Flow Interface feature"
---

# Tasks: Generation Flow Interface

**Input**: Design documents from `/specs/004-generation-flow/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/

**Tests**: E2E tests included per user story to validate functionality

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions

- **Backend**: `backend/src/`, `backend/tests/`
- **Frontend**: `frontend/src/`, `frontend/tests/`
- Web application structure with separate frontend and backend

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization and database foundation

- [X] T001 Create database migration file `supabase/migrations/20251106_generation_flow.sql` per quickstart.md
- [X] T002 Apply database migration to create generation_areas, generation_source_images tables and enums
- [X] T003 [P] Copy TypeScript types from `specs/004-generation-flow/contracts/types.ts` to `frontend/src/types/generation.ts`
- [X] T004 [P] Verify existing trial_service.py and token_service.py have atomic deduction methods with row-level locking

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core backend services and models that ALL user stories depend on

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [ ] T005 Create Pydantic models for generation requests in `backend/src/models/generation.py` (YardArea, DesignStyle, GenerationStatus, AreaStatusResponse, CreateGenerationRequest, GenerationResponse)
- [ ] T006 Create GenerationService class in `backend/src/services/generation_service.py` with payment authorization hierarchy method
- [ ] T007 Implement payment authorization check in GenerationService (subscription → trial → token hierarchy per FR-007)
- [ ] T008 [P] Create PaymentStatusResponse endpoint `GET /v1/users/payment-status` in `backend/src/api/endpoints/users.py` per contracts/openapi.yaml
- [ ] T009 [P] Create Zustand generation store in `frontend/src/store/generationStore.ts` with localStorage persistence

**Checkpoint**: Foundation ready - user story implementation can now begin in parallel

---

## Phase 3: User Story 1 - Single Area Generation with Trial Credits (Priority: P1) 🎯 MVP

**Goal**: Enable new users to generate their first landscape design using trial credits by entering an address, selecting one area, choosing a style, and receiving a generated design within 60 seconds.

**Independent Test**: Create trial user account → navigate to /generate → enter address "1600 Amphitheatre Parkway, Mountain View, CA" → select Front Yard → select Modern Minimalist → click Generate → verify trial credits: 3→2 → wait for completion → verify generated design appears.

### Backend Implementation for User Story 1

- [ ] T010 [US1] Implement atomic trial deduction in GenerationService.create_generation() using trial_service with FOR UPDATE NOWAIT per research.md
- [ ] T011 [US1] Integrate Google Maps Street View image retrieval in GenerationService using existing maps_service.py
- [ ] T012 [US1] Create generation record in database with status=pending, create generation_areas records per data-model.md
- [ ] T013 [US1] Create source image records in generation_source_images table with pano_id and api_cost per data-model.md
- [ ] T014 [US1] Implement `POST /v1/generations` endpoint in `backend/src/api/endpoints/generations.py` per contracts/openapi.yaml
- [ ] T015 [US1] Implement `GET /v1/generations/{id}` status endpoint in `backend/src/api/endpoints/generations.py` per contracts/openapi.yaml
- [ ] T016 [US1] Add error handling for invalid address (FR-016), insufficient payment (FR-014), Street View unavailable
- [ ] T017 [US1] Implement automatic refund on generation failure per FR-011 in GenerationService

### Frontend Components for User Story 1

- [ ] T018 [P] [US1] Create AddressInput component in `frontend/src/components/generation/AddressInput.tsx` with Google Places autocomplete per FR-001
- [ ] T019 [P] [US1] Create AreaSelector component in `frontend/src/components/generation/AreaSelector.tsx` with single-select mode per FR-003
- [ ] T020 [P] [US1] Create StyleSelector component in `frontend/src/components/generation/StyleSelector.tsx` with design style dropdown per FR-005
- [ ] T021 [US1] Create GenerationForm component in `frontend/src/components/generation/GenerationForm.tsx` integrating address, area, style inputs
- [ ] T022 [US1] Add form validation in GenerationForm (address, area, style required per FR-015)
- [ ] T023 [US1] Implement generation API calls in GenerationForm using generationsAPI.create() from `frontend/src/lib/api.ts`
- [ ] T024 [US1] Store active request in generationStore and navigate to progress page on success
- [ ] T025 [US1] Create GenerationProgress component in `frontend/src/components/generation/GenerationProgress.tsx` with status polling
- [ ] T026 [US1] Create useGenerationProgress hook in `frontend/src/hooks/useGenerationProgress.ts` with 2-second polling per research.md
- [ ] T027 [US1] Create progress page at `frontend/src/pages/generate/progress/[id].tsx` displaying real-time progress per FR-009
- [ ] T028 [US1] Implement localStorage progress recovery on page refresh per FR-012 in useGenerationProgress hook
- [ ] T029 [US1] Display completed design with image_url when status=completed in progress page

### API Integration for User Story 1

- [ ] T030 [US1] Add generationsAPI.create() method to `frontend/src/lib/api.ts` per contracts/types.ts
- [ ] T031 [US1] Add generationsAPI.getStatus() method to `frontend/src/lib/api.ts` per contracts/types.ts
- [ ] T032 [US1] Add paymentAPI.getStatus() method to `frontend/src/lib/api.ts` per contracts/types.ts

### E2E Test for User Story 1

- [ ] T033 [US1] Create Playwright E2E test in `frontend/tests/e2e/generation-trial-flow.spec.ts` testing full trial user journey from address input to completed design per quickstart.md

**Checkpoint**: At this point, User Story 1 (P1 MVP) should be fully functional - trial users can generate single-area designs end-to-end

---

## Phase 4: User Story 2 - Multi-Area Selection with Token Cost Preview (Priority: P2)

**Goal**: Enable paid users to select multiple yard areas (up to 4) and generate designs for all areas in parallel, with clear cost preview and independent progress tracking per area.

**Independent Test**: Log in as token user with 50 tokens → select 3 areas (Front Yard, Backyard, Walkway) → verify cost preview shows "3 tokens" → click Generate → verify token deduction: 50→47 → verify each area has independent progress → verify all 3 designs complete.

### Backend Implementation for User Story 2

- [ ] T034 [US2] Extend GenerationService.create_generation() to support multiple areas with atomic token deduction per research.md
- [ ] T035 [US2] Implement parallel area processing using asyncio.gather() in GenerationService per research.md
- [ ] T036 [US2] Implement partial failure handling with per-area refunds per FR-011 and data-model.md state transitions
- [ ] T037 [US2] Update POST /v1/generations endpoint to accept areas array (1-4 items) per contracts/openapi.yaml
- [ ] T038 [US2] Update GET /v1/generations/{id} endpoint to return per-area progress percentages per contracts/openapi.yaml

### Frontend Components for User Story 2

- [ ] T039 [US2] Extend AreaSelector component to support multi-select mode with checkboxes per FR-003
- [ ] T040 [US2] Add cost preview display in GenerationForm showing "X areas = X tokens" per FR-006
- [ ] T041 [US2] Update GenerationForm to display total cost in generate button per FR-006
- [ ] T042 [US2] Extend GenerationProgress component to display multiple areas with independent progress bars per FR-009
- [ ] T043 [US2] Update progress page to show per-area status (pending, processing, completed, failed) per contracts/types.ts
- [ ] T044 [US2] Display partial failure message and refund notification per FR-011

### E2E Test for User Story 2

- [ ] T045 [US2] Create Playwright E2E test in `frontend/tests/e2e/generation-multi-area.spec.ts` testing token user multi-area flow with parallel generation per quickstart.md

**Checkpoint**: At this point, User Stories 1 AND 2 should both work independently - single-area (trial) and multi-area (token) flows complete

---

## Phase 5: User Story 3 - Payment Method Hierarchy Display (Priority: P3)

**Goal**: Display clear payment method indicators in the UI so users understand which payment method (trial, token, or subscription) will be used before generating, building trust and transparency.

**Independent Test**: Test with 3 user types - (1) trial user sees "Generate Design (Trial)" with "3 trial credits remaining", (2) token user sees "Generate Design (1 Token)" with "10 tokens available", (3) subscriber sees "Generate Design (Unlimited)" with "Active Subscription".

### Frontend Components for User Story 3

- [ ] T046 [P] [US3] Create PaymentIndicator component in `frontend/src/components/generation/PaymentIndicator.tsx` per research.md payment indicator pattern
- [ ] T047 [US3] Implement getPaymentIndicator() helper function in PaymentIndicator using payment hierarchy logic per contracts/types.ts
- [ ] T048 [US3] Integrate PaymentIndicator into GenerationForm to show payment method being used per FR-013
- [ ] T049 [US3] Display trial credits remaining / token balance / subscription status prominently per FR-019
- [ ] T050 [US3] Update generate button label dynamically based on payment method ("Trial" / "1 Token" / "Unlimited") per FR-013
- [ ] T051 [US3] Show "No payment method available" modal with upgrade CTA when can_generate=false per FR-014

### E2E Test for User Story 3

- [ ] T052 [US3] Create Playwright E2E test in `frontend/tests/e2e/generation-payment-display.spec.ts` testing payment indicator display for all user types per quickstart.md

**Checkpoint**: All user stories (P1, P2, P3) should now be independently functional and tested

---

## Phase 6: Background Worker Implementation (CRITICAL for Production)

**Purpose**: Implement actual AI generation processing - currently BLOCKING production per TC-E2E-1 test report

**⚠️ NOTE**: This phase is REQUIRED before production launch. Current implementation only creates pending records without processing.

- [ ] T053 Create background worker function process_generation() in `backend/src/services/generation_service.py` using FastAPI BackgroundTasks per research.md
- [ ] T054 Implement Gemini API integration in process_generation() for landscape design generation using existing Gemini 2.5 Flash setup
- [ ] T055 Update generation status from pending → processing → completed with image_url storage per data-model.md state transitions
- [ ] T056 Add status update helper method update_generation_status() in GenerationService
- [ ] T057 Implement error handling and automatic refund in background worker per FR-011
- [ ] T058 Add background task queueing in POST /v1/generations endpoint using background_tasks.add_task() per quickstart.md
- [ ] T059 Store generated image URLs in generation_areas.image_url per data-model.md

**Checkpoint**: Background worker complete - generations now actually produce AI-generated designs (not just pending status)

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Improvements that affect multiple user stories and production readiness

- [ ] T060 [P] Add request rate limiting (max 5 concurrent per user) per FR-018 and contracts/openapi.yaml
- [ ] T061 [P] Implement concurrent generation blocking with "Generation in progress" error per edge cases in spec.md
- [ ] T062 [P] Add transaction logging for trial deductions using record_trial_deduction() per TC-E2E-1 report
- [ ] T063 [P] Add transaction logging for token deductions in GenerationService
- [ ] T064 [P] Optimize Google Places autocomplete with 300ms debounce and session tokens per research.md
- [ ] T065 [P] Add manual image upload option as fallback for Street View unavailable per FR-017
- [ ] T066 [P] Verify CHECK constraints on trial_remaining and token_balance per FR-008 and data-model.md
- [ ] T067 [P] Add performance monitoring for generation duration to track SC-003 (<90 seconds) per data-model.md
- [ ] T068 Run full quickstart.md validation checklist
- [ ] T069 Update CLAUDE.md with generation flow endpoints and new components

**Checkpoint**: All features polished and production-ready

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **User Stories (Phase 3-5)**: All depend on Foundational phase completion
  - User stories can then proceed in parallel (if staffed)
  - Or sequentially in priority order: P1 (Phase 3) → P2 (Phase 4) → P3 (Phase 5)
- **Background Worker (Phase 6)**: Can start after US1 backend is complete - BLOCKS production deployment
- **Polish (Phase 7)**: Depends on all user stories and background worker being complete

### User Story Dependencies

- **User Story 1 (P1)**: Can start after Foundational (Phase 2) - No dependencies on other stories
  - **MVP SCOPE**: This story alone is sufficient for initial launch (trial users only)
- **User Story 2 (P2)**: Can start after Foundational (Phase 2) - Extends US1 but independently testable
  - Depends on US1 for core generation flow
  - Adds multi-area and token payment on top
- **User Story 3 (P3)**: Can start after Foundational (Phase 2) - Independently testable
  - Pure UI enhancement (payment transparency)
  - No dependencies on US1 or US2 completion

### Within Each User Story

- Backend models and services before endpoints
- Frontend components before API integration
- E2E tests run after implementation is complete

### Parallel Opportunities

**Phase 1 (Setup)**: T003 and T004 can run in parallel (different files)

**Phase 2 (Foundational)**: T008 and T009 can run in parallel (backend vs frontend)

**Phase 3 (US1)**:
- T018, T019, T020 can run in parallel (independent frontend components)
- T030, T031, T032 can run in parallel (independent API methods)

**Phase 4 (US2)**: All frontend component updates (T039-T044) affect different files and can run in parallel if backend (T034-T038) is complete

**Phase 5 (US3)**: T046 can start immediately (new component, no dependencies)

**Phase 7 (Polish)**: All tasks marked [P] (T060-T067) can run in parallel - different concerns, no dependencies

**Team Parallelization**:
- After Foundational phase, one dev can work US1 backend while another works US1 frontend simultaneously
- After US1 complete, US2 and US3 can be developed in parallel by different team members

---

## Parallel Example: User Story 1

**Sequential Phases**:
1. Setup (Phase 1) → Foundational (Phase 2) → US1 Implementation (Phase 3)

**Within US1 Backend** (must be sequential):
- T010 → T011 → T012 → T013 → T014 → T015 → T016 → T017

**Within US1 Frontend** (parallel groups):
- **Group 1 (parallel)**: T018 [AddressInput] + T019 [AreaSelector] + T020 [StyleSelector]
- **Group 2 (sequential)**: T021 [Form] → T022 [Validation] → T023 [API calls] → T024 [Store]
- **Group 3 (parallel)**: T025 [Progress component] + T026 [useProgress hook]
- **Group 4 (sequential)**: T027 [Progress page] → T028 [Recovery] → T029 [Display]

**Within US1 API Integration** (all parallel):
- T030 + T031 + T032 (independent methods in api.ts)

**US1 E2E Test** (runs last):
- T033 (after all US1 implementation complete)

---

## Implementation Strategy

### MVP First Approach (Recommended)

**Week 1**: Focus exclusively on User Story 1 (P1) to get a working MVP
- Complete Phase 1 (Setup) - 2 hours
- Complete Phase 2 (Foundational) - 4 hours
- Complete Phase 3 (US1) - 12 hours
- **Result**: Trial users can generate single-area designs end-to-end

**Week 2**: Add premium features
- Complete Phase 6 (Background Worker) - 6 hours [CRITICAL]
- Complete Phase 4 (US2 Multi-Area) - 6 hours
- Complete Phase 5 (US3 Payment Display) - 2 hours
- **Result**: Full feature set with token and subscription support

**Week 3**: Polish and deploy
- Complete Phase 7 (Polish) - 4 hours
- Deploy to production
- Monitor and iterate

### Incremental Delivery

Each user story is a shippable increment:
- **After US1**: Ship to trial users only (MVP)
- **After US2**: Enable token purchases
- **After US3**: Improve transparency and trust

### Testing Approach

- E2E tests validate each user story independently
- Tests ensure features work in isolation before integration
- Frontend and backend can be tested separately

---

## Task Summary

**Total Tasks**: 69
- Phase 1 (Setup): 4 tasks (2 hours)
- Phase 2 (Foundational): 5 tasks (4 hours)
- Phase 3 (US1): 24 tasks (12 hours) 🎯 MVP
- Phase 4 (US2): 12 tasks (6 hours)
- Phase 5 (US3): 7 tasks (2 hours)
- Phase 6 (Background Worker): 7 tasks (6 hours) ⚠️ CRITICAL
- Phase 7 (Polish): 10 tasks (4 hours)

**Total Estimated Effort**: 36 hours (4-5 days with testing)

**Parallel Opportunities**: 15 tasks marked [P] can run concurrently (save ~4 hours with 2+ developers)

**MVP Scope**: Phase 1 + Phase 2 + Phase 3 (US1 only) = 18 hours
- Delivers core value: Trial users can generate landscape designs
- Sufficient for initial launch and validation

**Production Blockers**:
- Phase 6 (Background Worker) MUST be complete before production launch
- Currently generations remain in "pending" status indefinitely (per TC-E2E-1 test report)

---

## Validation Checklist

Before marking feature complete, verify:

- [ ] All 3 user stories pass their independent tests (US1, US2, US3)
- [ ] Trial credit system works atomically (no race conditions per SC-005)
- [ ] Token system works atomically (no negative balances per SC-005)
- [ ] Single-area generation completes in 30-60 seconds (SC-001)
- [ ] Multi-area (3 areas) completes in <90 seconds (SC-003)
- [ ] Page refresh recovers progress correctly (SC-007, FR-012)
- [ ] Failed generations refund automatically within 2 seconds (SC-010, FR-011)
- [ ] Background worker generates actual AI designs (not just pending status)
- [ ] All E2E tests pass (generation-trial-flow, generation-multi-area, generation-payment-display)
- [ ] Quickstart.md validation checklist complete

---

**Generated**: 2025-11-06
**Feature**: 004-generation-flow
**Ready for Implementation**: ✅ Yes - Run `/speckit.implement` to execute tasks
