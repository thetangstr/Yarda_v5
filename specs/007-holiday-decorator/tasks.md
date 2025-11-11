# Tasks: Holiday Decorator - Viral Marketing Feature

**Input**: Design documents from `/specs/007-holiday-decorator/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/

**Tests**: E2E tests with Playwright are included per user story (test-first approach per CLAUDE.md). Backend unit tests with pytest are included for services.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions

- **Web app**: `backend/src/`, `frontend/src/`
- Paths follow the structure defined in plan.md

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization and database schema setup

- [ ] T001 Create database migration file `supabase/migrations/014_holiday_decorator.sql` based on data-model.md
- [ ] T002 Add holiday_credits, holiday_credits_earned, whats_new_modal_shown columns to users table in migration
- [ ] T003 [P] Create holiday_generations table with RLS policies in migration
- [ ] T004 [P] Create social_shares table with RLS policies in migration
- [ ] T005 [P] Create email_nurture_list table with RLS policies in migration
- [ ] T006 [P] Create deduct_holiday_credit() PostgreSQL function in migration
- [ ] T007 [P] Create grant_holiday_credit() PostgreSQL function in migration
- [ ] T008 [P] Create check_daily_share_limit() PostgreSQL function in migration
- [ ] T009 [P] Create grant_initial_holiday_credit() trigger in migration
- [ ] T010 Apply migration to Supabase database and verify schema changes
- [ ] T011 Create frontend TypeScript types file `frontend/src/types/holiday.ts` with HolidayGeneration, HolidayStyle, ShareRequest interfaces from contracts/
- [ ] T012 Create backend Pydantic models file `backend/src/models/holiday.py` with HolidayGenerationRequest, HolidayGenerationResponse models from contracts/

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before ANY user story can be implemented

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [ ] T013 Create seasonal activation utility `frontend/src/lib/seasonalFeatures.ts` with isHolidaySeasonActive() function (date-based logic + env override)
- [ ] T014 Create HolidayCreditService class in `backend/src/services/holiday_credit_service.py` with deduct_credit(), grant_credit(), get_balance() methods
- [ ] T015 Write pytest unit tests for HolidayCreditService in `backend/tests/unit/test_holiday_credit_service.py` (atomic deduction, insufficient credits, grant credit)
- [ ] T016 Run pytest to verify HolidayCreditService tests pass (test-first validation)
- [ ] T017 [P] Extend MapsService in `backend/src/services/maps_service.py` to support Street View heading parameter (already supported per research.md, verify implementation)
- [ ] T018 [P] Create before/after image composition utility in `frontend/src/lib/imageComposition.ts` with createBeforeAfterImage() function (canvas-based composition)
- [ ] T019 [P] Extend userStore in `frontend/src/store/userStore.ts` to add holiday_credits field to UserState interface
- [ ] T020 [P] Add holidayAPI namespace to `frontend/src/lib/api.ts` with createGeneration(), getGeneration(), pollGenerationStatus() methods
- [ ] T021 Create email template file `backend/src/templates/emails/holiday_hd_download.html` for HD image email delivery

**Checkpoint**: Foundation ready - user story implementation can now begin in parallel

---

## Phase 3: User Story 1 - New User Discovery & First Generation (Priority: P1) 🎯 MVP

**Goal**: New users can sign up, receive 1 free holiday credit, enter their address, rotate Street View, select a decoration style, and generate their first decorated home image within 10 seconds.

**Independent Test**: Visit homepage, click "Try the AI Holiday Decorator 🎄", sign up with email, enter address, adjust Street View angle, select Classic style, click Generate, see decorated image within 10 seconds.

### Tests for User Story 1 (E2E with Playwright)

> **NOTE: Write these tests FIRST, ensure they FAIL before implementation**

- [ ] T022 [P] [US1] Write E2E test for new user discovery & first generation in `frontend/tests/e2e/holiday-discovery.spec.ts` (homepage hero → signup → address entry → Street View rotation → style selection → generation → results)
- [ ] T023 [US1] Run Playwright test to verify it FAILS (red phase of TDD)

### Implementation for User Story 1

- [ ] T024 [P] [US1] Create HolidayHero component in `frontend/src/components/HolidayHero.tsx` with auto-playing before/after video, headline, dual CTAs
- [ ] T025 [P] [US1] Create StreetViewRotator component in `frontend/src/components/StreetViewRotator.tsx` with 360° rotation controls, heading display, preview image
- [ ] T026 [P] [US1] Create StyleSelector component in `frontend/src/components/StyleSelector.tsx` with Classic/Modern/Over-the-Top cards
- [ ] T027 [P] [US1] Create HolidayGenerationService class in `backend/src/services/holiday_generation_service.py` with create_generation(), _generate_decorated_image() methods
- [ ] T028 [US1] Write pytest unit tests for HolidayGenerationService in `backend/tests/unit/test_holiday_generation_service.py` (credit deduction, geocoding, Street View fetch, generation creation)
- [ ] T029 [US1] Run pytest to verify HolidayGenerationService tests pass
- [ ] T030 [US1] Create holiday generation API endpoints in `backend/src/api/endpoints/holiday.py` with POST /v1/holiday/generations, GET /v1/holiday/generations/:id, GET /v1/holiday/generations routes
- [ ] T031 [US1] Register holiday router in `backend/src/main.py` with app.include_router(holiday.router, tags=["holiday"])
- [ ] T032 [US1] Create holiday decorator page in `frontend/src/pages/holiday.tsx` with address search, StreetViewRotator, StyleSelector, credit display, generate button, progress inline, results inline
- [ ] T033 [US1] Extend homepage in `frontend/src/pages/index.tsx` to conditionally render HolidayHero when isHolidaySeasonActive() is true
- [ ] T034 [US1] Test generation flow end-to-end with curl (create generation, poll status, verify completion)
- [ ] T035 [US1] Run Playwright E2E test to verify User Story 1 works (green phase of TDD)

**Checkpoint**: At this point, User Story 1 should be fully functional and testable independently. Users can generate their first holiday decoration.

---

## Phase 4: User Story 2 - Viral Sharing Loop (Priority: P2)

**Goal**: Users can share their decorated home image on Instagram, Facebook, or TikTok with before/after comparison, tracking link embedded, and earn 1 holiday credit when link is clicked (max 3 shares/day).

**Independent Test**: Complete US1 generation, click "Share to Instagram", verify before/after image has watermark, tracking link copied to clipboard, click tracking link in new tab, verify credit granted, balance increases from 0 to 1.

### Tests for User Story 2 (E2E with Playwright)

- [ ] T036 [P] [US2] Write E2E test for viral sharing loop in `frontend/tests/e2e/holiday-sharing.spec.ts` (generate decoration → share button → clipboard check → tracking link click → credit granted → balance updated)
- [ ] T037 [US2] Run Playwright test to verify it FAILS (red phase of TDD)

### Implementation for User Story 2

- [ ] T038 [P] [US2] Create ShareButtons component in `frontend/src/components/ShareButtons.tsx` with Instagram/Facebook/TikTok buttons, clipboard integration, share dialog logic
- [ ] T039 [P] [US2] Create SocialShareService class in `backend/src/services/social_share_service.py` with create_share(), track_share_click(), check_daily_limit() methods
- [ ] T040 [US2] Write pytest unit tests for SocialShareService in `backend/tests/unit/test_social_share_service.py` (daily limit check, tracking link generation, credit grant idempotency)
- [ ] T041 [US2] Run pytest to verify SocialShareService tests pass
- [ ] T042 [US2] Create social sharing API endpoints in `backend/src/api/endpoints/holiday_share.py` with POST /v1/holiday/shares, GET /v1/holiday/shares/track/:code, GET /v1/holiday/shares routes
- [ ] T043 [US2] Register holiday_share router in `backend/src/main.py`
- [ ] T044 [US2] Integrate ShareButtons component into holiday.tsx results section (after generation completes)
- [ ] T045 [US2] Test share flow end-to-end: create share → get tracking link → click link → verify credit granted
- [ ] T046 [US2] Run Playwright E2E test to verify User Story 2 works (green phase of TDD)

**Checkpoint**: At this point, User Stories 1 AND 2 should both work independently. Users can generate decorations and share to earn credits.

---

## Phase 5: User Story 3 - Returning User "What's New" Modal (Priority: P3)

**Goal**: Existing users (created before holiday feature launch) see a one-time "What's New?" modal on login, learn about Holiday Decorator, receive 1 free credit, and can redirect to /holiday page.

**Independent Test**: Log in with existing account (created before feature launch), verify modal appears with "Try our new AI Holiday Decorator!" message, click "Try It Now", verify redirect to /holiday, verify 1 credit granted, log out and log in again, verify modal does NOT appear (one-time only).

### Tests for User Story 3 (E2E with Playwright)

- [ ] T047 [P] [US3] Write E2E test for "What's New?" modal in `frontend/tests/e2e/holiday-existing-user.spec.ts` (login → modal appears → credit granted → redirect → logout → login → modal does not appear)
- [ ] T048 [US3] Run Playwright test to verify it FAILS (red phase of TDD)

### Implementation for User Story 3

- [ ] T049 [P] [US3] Create WhatsNewModal component in `frontend/src/components/WhatsNewModal.tsx` with holiday feature announcement, "Try It Now" button, dismiss logic
- [ ] T050 [US3] Add modal detection logic to auth callback in `frontend/src/pages/auth/callback.tsx` to check if user.whats_new_modal_shown is false and user was created before holiday feature launch
- [ ] T051 [US3] Update grant_initial_holiday_credit() trigger in migration to set whats_new_modal_shown=false for existing users, true for new users
- [ ] T052 [US3] Add endpoint to mark modal as shown in `backend/src/api/endpoints/holiday.py` (PATCH /v1/holiday/modal-shown)
- [ ] T053 [US3] Test modal flow: login as existing user → modal shows → click Try It Now → credit granted → modal dismissed → relogin → modal does not show
- [ ] T054 [US3] Run Playwright E2E test to verify User Story 3 works (green phase of TDD)

**Checkpoint**: At this point, User Stories 1, 2, AND 3 should all work independently. Existing users are onboarded to the holiday feature.

---

## Phase 6: User Story 4 - Lead Capture via HD Download (Priority: P3)

**Goal**: Users who love their decoration can request HD image via email, receive it within 1 minute, get added to "Holiday-to-Spring" nurture list, and see a success message with pivot CTA preview.

**Independent Test**: Complete US1 generation, click "Email My Design", enter email, submit, verify email received with HD image attached, verify success message appears, verify user added to email_nurture_list in database.

### Tests for User Story 4 (E2E with Playwright)

- [ ] T055 [P] [US4] Write E2E test for lead capture in `frontend/tests/e2e/holiday-lead-capture.spec.ts` (generate decoration → click Email My Design → enter email → submit → success message → redirect to /holiday/success)
- [ ] T056 [US4] Run Playwright test to verify it FAILS (red phase of TDD)

### Implementation for User Story 4

- [ ] T057 [P] [US4] Create HDDownloadButton component in `frontend/src/components/HDDownloadButton.tsx` with email input modal, form validation, success redirect
- [ ] T058 [P] [US4] Extend EmailService in `backend/src/services/email_service.py` to add send_hd_download_email() method with attachment support
- [ ] T059 [P] [US4] Create EmailNurtureService class in `backend/src/services/email_nurture_service.py` with add_to_list(), check_duplicate() methods
- [ ] T060 [US4] Write pytest unit tests for EmailNurtureService in `backend/tests/unit/test_email_nurture_service.py` (add to list, duplicate prevention, campaign tag validation)
- [ ] T061 [US4] Run pytest to verify EmailNurtureService tests pass
- [ ] T062 [US4] Create email API endpoints in `backend/src/api/endpoints/holiday_email.py` with POST /v1/holiday/email/request-hd route
- [ ] T063 [US4] Register holiday_email router in `backend/src/main.py`
- [ ] T064 [US4] Integrate HDDownloadButton component into holiday.tsx results section
- [ ] T065 [US4] Test email flow end-to-end: request HD → verify email sent → check database for nurture list entry
- [ ] T066 [US4] Run Playwright E2E test to verify User Story 4 works (green phase of TDD)

**Checkpoint**: At this point, User Stories 1-4 should all work independently. Email lead capture funnel is operational.

---

## Phase 7: User Story 5 - Pivot to Core Landscaping App (Priority: P4)

**Goal**: Users who requested HD download see a compelling pivot CTA on success page with before/after comparison (holiday vs. spring landscape), "Get 25% Off" button with discount code pre-applied, and redirect to signup flow.

**Independent Test**: Complete US4 HD download request, verify redirect to /holiday/success page, see comparison of holiday house and spring landscape preview, click "Get 25% Off Your First Landscape Plan", verify redirect to /signup with discount=SPRING2026-25 in URL query params.

### Tests for User Story 5 (E2E with Playwright)

- [ ] T067 [P] [US5] Write E2E test for pivot CTA in `frontend/tests/e2e/holiday-pivot.spec.ts` (HD download → success page → pivot CTA visible → comparison images → discount button click → redirect with discount code)
- [ ] T068 [US5] Run Playwright test to verify it FAILS (red phase of TDD)

### Implementation for User Story 5

- [ ] T069 [P] [US5] Create PivotCTA component in `frontend/src/components/PivotCTA.tsx` with headline, comparison images, discount button, disclaimer text
- [ ] T070 [P] [US5] Create success page in `frontend/src/pages/holiday/success.tsx` with generation fetch, PivotCTA integration, back button
- [ ] T071 [US5] Add GET /v1/holiday/success route to `backend/src/api/endpoints/holiday_email.py` (if needed for server-side rendering)
- [ ] T072 [US5] Create discount_codes table entry in migration (if not exists) with code SPRING2026-25, 25% discount, valid until 2026-05-01
- [ ] T073 [US5] Test pivot flow end-to-end: success page loads → pivot CTA displays → click button → redirect with discount code
- [ ] T074 [US5] Run Playwright E2E test to verify User Story 5 works (green phase of TDD)

**Checkpoint**: All user stories (1-5) should now be independently functional. Complete holiday feature with full funnel.

---

## Phase 8: Polish & Cross-Cutting Concerns

**Purpose**: Improvements that affect multiple user stories

- [ ] T075 [P] Add loading states and skeleton screens to holiday.tsx for better UX during generation polling
- [ ] T076 [P] Add error handling and retry logic for failed generations in holiday.tsx
- [ ] T077 [P] Add analytics tracking for key events (signup, generation, share, email capture, pivot click) using existing analytics integration
- [ ] T078 [P] Add rate limiting middleware to holiday API endpoints (5 req/sec per user) in backend
- [ ] T079 [P] Optimize Street View image loading with lazy loading and WebP format in StreetViewRotator.tsx
- [ ] T080 [P] Add accessibility improvements (ARIA labels, keyboard navigation) to holiday components
- [ ] T081 [P] Add responsive design media queries for mobile/tablet views to holiday.tsx
- [ ] T082 [P] Add Gemini prompt variations for different decoration styles (Classic/Modern/Over-the-Top) based on research.md prompt engineering strategy
- [ ] T083 [P] Write additional backend unit tests for edge cases (Street View unavailable, generation timeout, email bounce) if needed
- [ ] T084 [P] Performance testing: verify <10 second generation time (p95), <3 second page load, <100ms credit operations
- [ ] T085 Code cleanup: remove console.logs, add TypeScript strict mode validation, run linter
- [ ] T086 Security audit: verify RLS policies, check for SQL injection, validate CORS configuration, test rate limiting
- [ ] T087 Run quickstart.md validation: Follow Phase 0-10 checklist to ensure all steps are documented correctly
- [ ] T088 Create PLANNING_COMPLETE.md summary with metrics, risks, and post-launch monitoring plan

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **User Stories (Phase 3-7)**: All depend on Foundational phase completion
  - User stories can then proceed in parallel (if staffed)
  - Or sequentially in priority order (P1 → P2 → P3 → P4)
- **Polish (Phase 8)**: Depends on all desired user stories being complete

### User Story Dependencies

- **User Story 1 (P1)**: Can start after Foundational (Phase 2) - No dependencies on other stories
- **User Story 2 (P2)**: Can start after Foundational (Phase 2) - Integrates with US1 results but independently testable
- **User Story 3 (P3)**: Can start after Foundational (Phase 2) - No dependencies on other stories (modal is orthogonal)
- **User Story 4 (P3)**: Can start after Foundational (Phase 2) - Integrates with US1 results but independently testable
- **User Story 5 (P4)**: Depends on US4 (email flow) but can be built in parallel if success page is stubbed

### Within Each User Story

- Tests MUST be written and FAIL before implementation (TDD red-green-refactor)
- Models/components before services
- Services before endpoints
- Core implementation before integration
- Story complete before moving to next priority

### Parallel Opportunities

- All Setup tasks marked [P] can run in parallel (T003-T009: different table creations)
- All Foundational tasks marked [P] can run in parallel within Phase 2 (T017-T021: different files/services)
- Once Foundational phase completes, all user stories can start in parallel (if team capacity allows)
- All tests for a user story marked [P] can run in parallel
- Components/models within a story marked [P] can run in parallel (T024-T026: different components)
- Different user stories can be worked on in parallel by different team members

---

## Parallel Example: User Story 1

```bash
# Launch all parallelizable tasks for User Story 1 together:

# Tests (write first):
Task T022: "Write E2E test for new user discovery in frontend/tests/e2e/holiday-discovery.spec.ts"

# Components (after test written):
Task T024: "Create HolidayHero component in frontend/src/components/HolidayHero.tsx"
Task T025: "Create StreetViewRotator component in frontend/src/components/StreetViewRotator.tsx"
Task T026: "Create StyleSelector component in frontend/src/components/StyleSelector.tsx"

# Then sequential:
Task T027: "Create HolidayGenerationService in backend/src/services/holiday_generation_service.py"
Task T028: "Write pytest unit tests for HolidayGenerationService"
Task T029: "Run pytest"
Task T030: "Create API endpoints"
Task T031: "Register router"
Task T032: "Create holiday page"
Task T033: "Extend homepage"
Task T034: "Test with curl"
Task T035: "Run Playwright E2E test (should pass)"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup (database migration)
2. Complete Phase 2: Foundational (credit service, seasonal activation, core utilities) - CRITICAL
3. Complete Phase 3: User Story 1 (discovery & first generation)
4. **STOP and VALIDATE**: Run Playwright test for US1, verify generation works end-to-end
5. Deploy/demo if ready - this is a viable MVP!

### Incremental Delivery

1. Complete Setup + Foundational → Foundation ready
2. Add User Story 1 → Test independently → Deploy/Demo (MVP!)
3. Add User Story 2 → Test independently → Deploy/Demo (viral sharing added)
4. Add User Story 3 → Test independently → Deploy/Demo (existing user onboarding)
5. Add User Story 4 → Test independently → Deploy/Demo (lead capture funnel)
6. Add User Story 5 → Test independently → Deploy/Demo (complete feature)
7. Each story adds value without breaking previous stories

### Parallel Team Strategy

With multiple developers:

1. Team completes Setup + Foundational together (critical path)
2. Once Foundational is done:
   - Developer A: User Story 1 (P1) - MVP priority
   - Developer B: User Story 2 (P2) - Viral sharing
   - Developer C: User Story 3 (P3) - Existing user modal
   - Developer D: User Story 4 + 5 (P3/P4) - Email funnel
3. Stories complete and integrate independently
4. Run all E2E tests together for full regression validation

---

## Task Summary

**Total Tasks**: 88

### Breakdown by Phase:
- **Phase 1 (Setup)**: 12 tasks
- **Phase 2 (Foundational)**: 9 tasks (CRITICAL - blocks all stories)
- **Phase 3 (US1 - P1)**: 14 tasks 🎯 MVP
- **Phase 4 (US2 - P2)**: 11 tasks
- **Phase 5 (US3 - P3)**: 8 tasks
- **Phase 6 (US4 - P3)**: 12 tasks
- **Phase 7 (US5 - P4)**: 8 tasks
- **Phase 8 (Polish)**: 14 tasks

### Parallel Opportunities:
- Setup: 7 parallelizable tasks (table creation, function creation)
- Foundational: 5 parallelizable tasks (service creation, utility creation)
- US1: 3 parallelizable components (HolidayHero, StreetViewRotator, StyleSelector)
- US2: 2 parallelizable tasks (ShareButtons component, SocialShareService)
- US3: 2 parallelizable tasks (WhatsNewModal, auth callback update)
- US4: 4 parallelizable tasks (HDDownloadButton, EmailService, EmailNurtureService, tests)
- US5: 2 parallelizable tasks (PivotCTA component, success page)
- Polish: 12 parallelizable tasks (different files/concerns)

### MVP Scope (Recommended):
**Phases 1 + 2 + 3 only** = 35 tasks = User Story 1 complete
- Users can discover feature, sign up, generate decorated homes
- Foundation for viral loop is in place
- Can be deployed as working MVP and gather feedback

---

## Notes

- [P] tasks = different files, no dependencies, can run in parallel
- [Story] label maps task to specific user story for traceability
- Each user story should be independently completable and testable
- Tests written FIRST (red phase), implementation makes them pass (green phase), then refactor
- Commit after each task or logical group of related tasks
- Stop at any checkpoint to validate story independently
- Avoid: vague tasks, same file conflicts, cross-story dependencies that break independence
- Follow TDD red-green-refactor cycle: Write test → Verify it fails → Implement → Verify it passes → Refactor
- All E2E tests use Playwright (per CLAUDE.md NON-NEGOTIABLE requirement)
- All backend unit tests use pytest
- Follow quickstart.md for detailed implementation guidance per phase
