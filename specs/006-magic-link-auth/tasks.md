# Tasks: Magic Link Authentication

**Input**: Design documents from `/specs/006-magic-link-auth/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/supabase-otp-api.md, quickstart.md

**Tests**: Test tasks are included per constitution requirement (III. Test-First Development - NON-NEGOTIABLE)

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions

- **Web app**: `frontend/src/`, `frontend/tests/`
- **Backend**: No changes (Supabase handles all backend logic)
- **Database**: No schema changes (Supabase manages auth.one_time_tokens internally)

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Verify existing infrastructure is ready for magic link authentication

- [ ] T001 Verify Supabase Email Auth is enabled in Supabase Dashboard → Authentication → Providers → Email → Confirm OTP is ON
- [ ] T002 [P] Verify environment variables in frontend/.env.local (NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY)
- [ ] T003 [P] Verify Supabase SDK is installed: Check frontend/package.json for @supabase/supabase-js dependency
- [ ] T004 [P] Verify Playwright is installed: Check frontend/package.json for @playwright/test dependency

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core utilities that MUST be complete before ANY user story can be implemented

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [ ] T005 [P] Create email validation utility in frontend/src/lib/validators.ts with validateEmail() function (RFC 5322 compliant, max 254 chars)
- [ ] T006 [P] Create TypeScript interfaces in frontend/src/types/auth.ts for SendMagicLinkRequest, SendMagicLinkResponse, MagicLinkError, and MagicLinkCallbackParams (based on contracts/supabase-otp-api.md)
- [ ] T007 [P] Create toast hook in frontend/src/hooks/useToast.ts if not already exists (for success/error messages)

**Checkpoint**: Foundation ready - user story implementation can now begin in parallel

---

## Phase 3: User Story 1 - Send and Authenticate with Email Magic Link (Priority: P1) 🎯 MVP

**Goal**: User receives a one-time authentication link via email, clicks it, and is immediately signed in to Yarda without entering a password

**Independent Test**: Enter email address on /login, click "Send Magic Link", receive email, click link, and be redirected to /generate as authenticated user

### Tests for User Story 1 (Test-First Development)

> **NOTE: Write these tests FIRST, ensure they FAIL before implementation**

- [ ] T008 [P] [US1] Create E2E test file frontend/tests/e2e/magic-link-auth.spec.ts with test: "should send magic link and show success message"
- [ ] T009 [P] [US1] Add E2E test: "should authenticate user when magic link is clicked" (mock callback URL with valid token)
- [ ] T010 [P] [US1] Add E2E test: "should persist session after browser refresh"
- [ ] T011 [P] [US1] Add E2E test: "should show error when same magic link is clicked twice"
- [ ] T012 [US1] Run E2E tests and verify ALL FAIL (no implementation yet) - use: npm run test:e2e

### Implementation for User Story 1

- [ ] T013 [P] [US1] Add sendMagicLink() function to frontend/src/lib/supabase.ts that calls supabase.auth.signInWithOtp() with email and emailRedirectTo options
- [ ] T014 [P] [US1] Create MagicLinkForm component in frontend/src/components/auth/MagicLinkForm.tsx with email input, send button, loading state, and success/error messaging
- [ ] T015 [US1] Integrate MagicLinkForm into frontend/src/pages/login.tsx below the Google Sign In button with divider ("Or sign in with magic link")
- [ ] T016 [US1] Add error handling in MagicLinkForm for invalid email format (use validateEmail from T005)
- [ ] T017 [US1] Add error handling in MagicLinkForm for Supabase API errors (network issues, service down)
- [ ] T018 [US1] Verify frontend/src/pages/auth/callback.tsx already handles magic link tokens via onAuthStateChange (NO CHANGES NEEDED - already implemented)
- [ ] T019 [US1] Test User Story 1 independently: Send magic link → Receive email → Click link → Verify redirect to /generate and session persists
- [ ] T020 [US1] Run E2E tests and verify ALL PASS for User Story 1 - use: npx playwright test frontend/tests/e2e/magic-link-auth.spec.ts

**Checkpoint**: At this point, User Story 1 should be fully functional and testable independently. MVP complete!

---

## Phase 4: User Story 2 - Handle Expired Magic Links (Priority: P2)

**Goal**: User receives clear feedback when clicking an expired magic link (after 1 hour) and can easily request a new one

**Independent Test**: Request magic link, wait 61 minutes (or mock expiration), click link, and verify "This link has expired. Please request a new one." message appears with functional "Request New Magic Link" button

### Tests for User Story 2 (Test-First Development)

- [ ] T021 [P] [US2] Add E2E test to frontend/tests/e2e/magic-link-auth.spec.ts: "should show error when expired magic link is clicked" (mock expired token)
- [ ] T022 [P] [US2] Add E2E test: "should redirect to /login with pre-filled email when 'Request New Magic Link' is clicked"
- [ ] T023 [P] [US2] Add E2E test: "should send new magic link successfully after expiration error"
- [ ] T024 [US2] Run E2E tests and verify User Story 2 tests FAIL (no implementation yet)

### Implementation for User Story 2

- [ ] T025 [P] [US2] Add expired token error handling in frontend/src/pages/auth/callback.tsx for error code 'otp_expired' (show user-friendly error message)
- [ ] T026 [P] [US2] Create ErrorPage component in frontend/src/components/auth/ErrorPage.tsx with title, message, and "Request New Magic Link" button
- [ ] T027 [US2] Update callback.tsx to render ErrorPage when otp_expired error occurs with redirect to /login?email={email} on button click
- [ ] T028 [US2] Update MagicLinkForm to pre-fill email from URL query parameter (?email=...)
- [ ] T029 [US2] Test User Story 2 independently: Mock expired token → Click link → Verify error message → Click "Request New Magic Link" → Verify redirect to /login with email pre-filled
- [ ] T030 [US2] Run E2E tests and verify User Story 2 tests PASS - use: npx playwright test frontend/tests/e2e/magic-link-auth.spec.ts

**Checkpoint**: At this point, User Stories 1 AND 2 should both work independently

---

## Phase 5: User Story 3 - Rate Limiting Protection (Priority: P3)

**Goal**: System prevents magic link abuse by limiting requests to 3 per hour per email address, with clear messaging when limit is exceeded

**Independent Test**: Request 4 magic links within 1 hour for same email. First 3 succeed, 4th shows error "Too many requests. Please try again in a few minutes." After 1 hour, can request again successfully.

### Tests for User Story 3 (Test-First Development)

- [ ] T031 [P] [US3] Add E2E test to frontend/tests/e2e/magic-link-auth.spec.ts: "should show rate limit error on 4th request within 1 hour"
- [ ] T032 [P] [US3] Add E2E test: "should show password login as alternative when rate limited"
- [ ] T033 [P] [US3] Add E2E test: "should allow new request after 1 hour wait"
- [ ] T034 [US3] Run E2E tests and verify User Story 3 tests FAIL (no implementation yet)

### Implementation for User Story 3

- [ ] T035 [P] [US3] Add rate limit error handling in MagicLinkForm for error code 'over_email_send_rate_limit'
- [ ] T036 [US3] Update error message for rate limit to include "Try password login or wait a few minutes" with visible password login option
- [ ] T037 [US3] Add visual emphasis to password login option when rate limit error occurs (highlight border or background color)
- [ ] T038 [US3] Test User Story 3 independently: Send 4 magic links rapidly → Verify 4th shows rate limit error → Verify password login option is visible
- [ ] T039 [US3] Run E2E tests and verify User Story 3 tests PASS - use: npx playwright test frontend/tests/e2e/magic-link-auth.spec.ts

**Checkpoint**: All user stories should now be independently functional

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Improvements that affect multiple user stories and production readiness

- [ ] T040 [P] Add loading spinner to "Send Magic Link" button while request is in flight (prevents double-clicks)
- [ ] T041 [P] Add animation to success/error messages using Framer Motion (fade in/out)
- [ ] T042 [P] Ensure mobile-responsive styling for MagicLinkForm (test on 375px width)
- [ ] T043 [P] Add email input autocomplete="email" attribute for browser autofill
- [ ] T044 [P] Add ARIA labels to MagicLinkForm for accessibility (screen reader support)
- [ ] T045 [P] Update CLAUDE.md with magic link authentication pattern and common issues
- [ ] T046 Verify all acceptance scenarios from spec.md pass manually (User Story 1: 5 scenarios, User Story 2: 3 scenarios, User Story 3: 4 scenarios)
- [ ] T047 Run full E2E test suite and verify 100% pass rate: npm run test:e2e
- [ ] T048 Run quickstart.md validation: Follow all steps in quickstart.md and verify they work
- [ ] T049 [P] Add console logging for debugging magic link flow (email sent, token received, auth state change)
- [ ] T050 Code review: Verify zero `any` types in all TypeScript files (constitution requirement)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **User Stories (Phase 3-5)**: All depend on Foundational phase completion
  - User Story 1 (P1): Can start after Foundational - No dependencies on other stories ✅ MVP
  - User Story 2 (P2): Can start after Foundational - Independent of US1, but enhances error handling
  - User Story 3 (P3): Can start after Foundational - Independent of US1/US2, but enhances security
- **Polish (Phase 6)**: Depends on all desired user stories being complete

### User Story Dependencies

- **User Story 1 (P1)**: Can start after Foundational (Phase 2) - No dependencies on other stories ✅ **START HERE FOR MVP**
- **User Story 2 (P2)**: Can start after Foundational (Phase 2) - Extends callback error handling from US1 but independently testable
- **User Story 3 (P3)**: Can start after Foundational (Phase 2) - Extends MagicLinkForm error handling from US1 but independently testable

### Within Each User Story

- Tests MUST be written and FAIL before implementation (TDD - constitution requirement)
- Components before integration (MagicLinkForm before login.tsx integration)
- Error handling after core functionality
- Story complete and tested before moving to next priority

### Parallel Opportunities

**Phase 1 (Setup)**: All 4 tasks can run in parallel
- T002, T003, T004 (all marked [P])

**Phase 2 (Foundational)**: All 3 tasks can run in parallel
- T005, T006, T007 (all marked [P])

**User Story 1 - Tests**: All 4 test tasks can run in parallel
- T008, T009, T010, T011 (all marked [P])

**User Story 1 - Implementation**: 2 tasks can run in parallel
- T013, T014 (different files, no dependencies)

**User Story 2 - Tests**: All 3 test tasks can run in parallel
- T021, T022, T023 (all marked [P])

**User Story 2 - Implementation**: 2 tasks can run in parallel
- T025, T026 (different files, no dependencies)

**User Story 3 - Tests**: All 3 test tasks can run in parallel
- T031, T032, T033 (all marked [P])

**User Story 3 - Implementation**: 2 tasks can run in parallel
- T035, T036 (both modify same file but independent logic)

**Phase 6 (Polish)**: Most tasks can run in parallel
- T040, T041, T042, T043, T044, T045, T049, T050 (all marked [P])

**Cross-Story Parallelization**:
Once Foundational phase (Phase 2) completes, ALL THREE user stories can be worked on in parallel by different developers:
- Developer A: User Story 1 (T008-T020)
- Developer B: User Story 2 (T021-T030)
- Developer C: User Story 3 (T031-T039)

---

## Parallel Example: User Story 1

```bash
# Launch all tests for User Story 1 together (TDD - write failing tests first):
Task: "Create E2E test file frontend/tests/e2e/magic-link-auth.spec.ts with test: should send magic link and show success message"
Task: "Add E2E test: should authenticate user when magic link is clicked"
Task: "Add E2E test: should persist session after browser refresh"
Task: "Add E2E test: should show error when same magic link is clicked twice"

# After tests FAIL, launch implementation tasks in parallel:
Task: "Add sendMagicLink() function to frontend/src/lib/supabase.ts"
Task: "Create MagicLinkForm component in frontend/src/components/auth/MagicLinkForm.tsx"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only) ✅ RECOMMENDED

1. Complete Phase 1: Setup (T001-T004) - Verify infrastructure ready
2. Complete Phase 2: Foundational (T005-T007) - Create reusable utilities
3. Complete Phase 3: User Story 1 (T008-T020) - Core magic link flow
4. **STOP and VALIDATE**: Test User Story 1 independently
   - Manual testing: Send magic link → Receive email → Click → Authenticate
   - E2E tests: 100% pass rate for User Story 1
5. Deploy/demo if ready - **MVP COMPLETE!**

**MVP Scope**: 20 tasks (T001-T020)
**Estimated Time**: 4-6 hours (including testing)
**Value Delivered**: Passwordless authentication via email magic links

### Incremental Delivery (Add Features Progressively)

1. Complete Setup + Foundational → Foundation ready
2. Add User Story 1 (P1) → Test independently → Deploy/Demo ✅ **MVP!**
3. Add User Story 2 (P2) → Test independently → Deploy/Demo (better error handling)
4. Add User Story 3 (P3) → Test independently → Deploy/Demo (rate limiting protection)
5. Add Polish (Phase 6) → Final production-ready release
6. Each story adds value without breaking previous stories

### Parallel Team Strategy

With multiple developers:

1. Team completes Setup + Foundational together (T001-T007)
2. Once Foundational is done:
   - Developer A: User Story 1 (T008-T020) - MVP
   - Developer B: User Story 2 (T021-T030) - Error handling
   - Developer C: User Story 3 (T031-T039) - Rate limiting
3. Stories complete and integrate independently
4. Team reconvenes for Polish (T040-T050)

---

## Task Summary

**Total Tasks**: 50

**By Phase**:
- Phase 1 (Setup): 4 tasks
- Phase 2 (Foundational): 3 tasks
- Phase 3 (User Story 1 - MVP): 13 tasks
- Phase 4 (User Story 2): 10 tasks
- Phase 5 (User Story 3): 9 tasks
- Phase 6 (Polish): 11 tasks

**By User Story**:
- User Story 1 (P1): 13 tasks (MVP scope)
- User Story 2 (P2): 10 tasks
- User Story 3 (P3): 9 tasks
- Infrastructure (Setup + Foundational): 7 tasks
- Cross-cutting (Polish): 11 tasks

**Parallel Opportunities**:
- Phase 1: 3 tasks can run in parallel
- Phase 2: 3 tasks can run in parallel
- User Story 1: 6 tasks can run in parallel (4 tests + 2 implementation)
- User Story 2: 5 tasks can run in parallel (3 tests + 2 implementation)
- User Story 3: 5 tasks can run in parallel (3 tests + 2 implementation)
- Phase 6: 8 tasks can run in parallel
- **Cross-story**: All 3 user stories can be developed in parallel after Foundational phase

**Independent Test Criteria**:
- User Story 1: Send magic link → Receive email → Click → Authenticate → Verify session persists
- User Story 2: Click expired link → Verify error message → Request new link → Verify email pre-filled
- User Story 3: Send 4 magic links → Verify rate limit error → Verify password login option visible

**MVP Scope** (Recommended for first iteration):
- Phase 1 + Phase 2 + Phase 3 (User Story 1)
- Total: 20 tasks
- Delivers core passwordless authentication value
- Can be completed in 4-6 hours with TDD approach

---

## Notes

- **[P] tasks** = different files, no dependencies - can run in parallel
- **[Story] label** maps task to specific user story for traceability
- **Each user story should be independently completable and testable**
- **TDD (Test-First Development)**: Write tests FIRST, ensure they FAIL, then implement to make them PASS (constitution requirement III)
- **Verify tests fail before implementing** - Critical for TDD discipline
- **Commit after each task or logical group**
- **Stop at any checkpoint to validate story independently**
- **Avoid**: vague tasks, same file conflicts, cross-story dependencies that break independence
- **Frontend-only changes**: No backend or database modifications required (Supabase handles all auth logic)
- **Zero cost**: Magic links included in existing Supabase plan ($0.00325/MAU)
- **Existing callback works**: frontend/src/pages/auth/callback.tsx already handles magic link tokens via onAuthStateChange (no changes needed per T018)
