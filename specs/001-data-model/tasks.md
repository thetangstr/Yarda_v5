---

description: "Task list for Data Model implementation"
---

# Tasks: Data Model for Landscape Design Platform

**Input**: Design documents from `/specs/001-data-model/`
**Prerequisites**: plan.md (required), spec.md (required for user stories), research.md, data-model.md, contracts/

**Tests**: Tests are included based on the Test-First Development requirement in the constitution

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions

- **Frontend**: `frontend/src/`
- **Backend**: `backend/src/`
- **Database**: `supabase/migrations/`
- **Tests**: `frontend/tests/e2e/`, `backend/tests/`

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization and basic structure

- [X] T001 Create Supabase project and configure environment variables
- [X] T002 [P] Install frontend dependencies (Supabase client, React Query, Zustand) in frontend/
- [X] T003 [P] Install backend dependencies (FastAPI, pytest, Supabase) in backend/
- [X] T004 [P] Configure TypeScript paths and aliases in frontend/tsconfig.json
- [X] T005 [P] Set up environment files (.env.local) with Supabase credentials

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before ANY user story can be implemented

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [X] T006 Create database schema migrations in supabase/migrations/001_create_users_table.sql
- [X] T007 Create token accounts table in supabase/migrations/002_create_token_accounts.sql
- [X] T008 Create generations table in supabase/migrations/003_create_generations.sql
- [X] T009 Create rate limits table in supabase/migrations/004_create_rate_limits.sql
- [X] T010 Create database functions in supabase/migrations/005_create_functions.sql
- [X] T011 Create RLS policies in supabase/migrations/006_create_rls_policies.sql
- [ ] T012 Apply all migrations to Supabase database using supabase db push
- [X] T013 [P] Copy TypeScript types from contracts/types.ts to frontend/src/types/index.ts
- [X] T014 [P] Create Supabase client configuration in frontend/src/lib/supabase.ts
- [X] T015 [P] Generate database types in frontend/src/types/database.ts

**Checkpoint**: Foundation ready - user story implementation can now begin in parallel

---

## Phase 3: User Story 1 - New User Registration and Trial Credits (Priority: P1) 🎯 MVP

**Goal**: Enable new users to register and automatically receive 3 trial credits

**Independent Test**: Register a new user account and verify they receive exactly 3 trial credits visible in their account

### Tests for User Story 1 ⚠️

> **NOTE: Write these tests FIRST, ensure they FAIL before implementation**

- [X] T016 [P] [US1] E2E test for user registration in frontend/tests/e2e/registration.spec.ts
- [X] T017 [P] [US1] E2E test for trial credit allocation in frontend/tests/e2e/trial-credits.spec.ts
- [X] T018 [P] [US1] Integration test for email verification in backend/tests/integration/test_email_verification.py

### Implementation for User Story 1

- [X] T019 [P] [US1] Create User model in backend/src/models/user.py
- [X] T020 [P] [US1] Create TokenAccount model in backend/src/models/token_account.py
- [X] T021 [US1] Implement registration service in backend/src/services/auth_service.py
- [X] T022 [US1] Create registration endpoint in backend/src/api/endpoints/auth.py
- [X] T023 [US1] Create user store in frontend/src/store/userStore.ts
- [X] T024 [US1] Implement registration API client in frontend/src/services/api.ts
- [X] T025 [P] [US1] Create RegistrationForm component in frontend/src/components/RegistrationForm/index.tsx
- [X] T026 [P] [US1] Create EmailVerification component in frontend/src/components/EmailVerification/index.tsx
- [X] T027 [US1] Create registration page in frontend/src/pages/Register.tsx
- [X] T028 [US1] Add email verification flow with 1-hour expiry handling

**Checkpoint**: User Story 1 (Registration + Trial Credits) should be fully functional and independently testable

---

## Phase 4: User Story 2 - Design Generation with Trial Consumption (Priority: P1)

**Goal**: Enable users to generate designs using their trial credits with atomic consumption

**Independent Test**: Use trial credits to generate designs and verify credit deduction and generation tracking

### Tests for User Story 2 ⚠️

- [X] T029 [P] [US2] E2E test for credit consumption in frontend/tests/e2e/credit-consumption.spec.ts
- [X] T030 [P] [US2] E2E test for generation creation in frontend/tests/e2e/generation-creation.spec.ts
- [X] T031 [P] [US2] Integration test for atomic credit handling in backend/tests/integration/test_credit_consumption.py

### Implementation for User Story 2

- [X] T032 [P] [US2] Create Generation model in backend/src/models/generation.py
- [X] T033 [US2] Implement credit service with atomic consumption in backend/src/services/credit_service.py
- [X] T034 [US2] Implement generation service in backend/src/services/generation_service.py
- [X] T035 [US2] Create generation endpoint in backend/src/api/endpoints/generations.py
- [X] T036 [US2] Create credit balance endpoint in backend/src/api/endpoints/credits.py
- [X] T037 [P] [US2] Create CreditDisplay component in frontend/src/components/CreditDisplay/index.tsx
- [X] T038 [P] [US2] Create GenerateButton component in frontend/src/components/GenerateButton/index.tsx
- [X] T039 [US2] Implement generation API calls in frontend/src/services/api.ts
- [X] T040 [US2] Update user store with credit management in frontend/src/store/userStore.ts
- [X] T041 [US2] Implement credit refund logic for failed generations
- [X] T042 [US2] Add trial-before-token consumption priority logic

**Checkpoint**: User Story 2 (Generation + Credit Consumption) should work independently

---

## Phase 5: User Story 3 - Generation History Tracking (Priority: P2)

**Goal**: Enable users to view and access all their past design generations

**Independent Test**: Generate multiple designs and verify they all appear in history with correct details

### Tests for User Story 3 ⚠️

- [X] T043 [P] [US3] E2E test for history display in frontend/tests/e2e/generation-history.spec.ts
- [X] T044 [P] [US3] Integration test for history pagination in backend/tests/integration/test_generation_history.py

### Implementation for User Story 3

- [X] T045 [US3] Implement history query service in backend/src/services/generation_service.py
- [X] T046 [US3] Create history endpoint with pagination in backend/src/api/endpoints/generations.py
- [X] T047 [P] [US3] Create GenerationCard component in frontend/src/components/GenerationCard/index.tsx
- [X] T048 [P] [US3] Create GenerationHistory component in frontend/src/components/GenerationHistory/index.tsx
- [X] T049 [US3] Create History page in frontend/src/pages/History.tsx
- [X] T050 [US3] Implement history API calls with pagination in frontend/src/services/api.ts
- [X] T051 [US3] Add generation store for history caching in frontend/src/store/generationStore.ts
- [X] T052 [US3] Implement status filtering (pending, completed, failed) in history view
- [X] T053 [US3] Add generation detail modal with full information display

**Checkpoint**: User Story 3 (History Tracking) should be independently functional

---

## Phase 6: User Story 4 - Rate Limiting Protection (Priority: P2)

**Goal**: Limit users to 3 generation requests per minute using rolling window

**Independent Test**: Attempt 4+ rapid generations and verify rate limit enforcement after 3

### Tests for User Story 4 ⚠️

- [ ] T054 [P] [US4] E2E test for rate limiting in frontend/tests/e2e/rate-limiting.spec.ts
- [ ] T055 [P] [US4] Integration test for rolling window in backend/tests/integration/test_rate_limiting.py

### Implementation for User Story 4

- [ ] T056 [P] [US4] Create RateLimit model in backend/src/models/rate_limit.py
- [ ] T057 [US4] Implement rate limit service with rolling window in backend/src/services/rate_limit_service.py
- [ ] T058 [US4] Add rate limit middleware to generation endpoint in backend/src/api/endpoints/generations.py
- [ ] T059 [US4] Implement automatic cleanup job for old rate limit records
- [ ] T060 [P] [US4] Create RateLimitAlert component in frontend/src/components/RateLimitAlert/index.tsx
- [ ] T061 [US4] Handle rate limit errors in frontend/src/services/api.ts
- [ ] T062 [US4] Display retry timer in UI when rate limited
- [ ] T063 [US4] Add rate limit status to generation store in frontend/src/store/generationStore.ts

**Checkpoint**: User Story 4 (Rate Limiting) should work independently

---

## Phase 7: User Story 5 - Token Account Management (Priority: P3)

**Goal**: Prepare token accounts for future paid credit purchases

**Independent Test**: Verify token accounts are created with zero balance for new users

### Tests for User Story 5 ⚠️

- [ ] T064 [P] [US5] E2E test for token account display in frontend/tests/e2e/token-account.spec.ts
- [ ] T065 [P] [US5] Integration test for token account creation in backend/tests/integration/test_token_account.py

### Implementation for User Story 5

- [ ] T066 [US5] Add token account creation to registration service in backend/src/services/auth_service.py
- [ ] T067 [US5] Create token balance endpoint in backend/src/api/endpoints/credits.py
- [ ] T068 [P] [US5] Create TokenBalance component in frontend/src/components/TokenBalance/index.tsx
- [ ] T069 [US5] Update CreditDisplay to show both trial and token balances in frontend/src/components/CreditDisplay/index.tsx
- [ ] T070 [US5] Add token account to user store in frontend/src/store/userStore.ts

**Checkpoint**: User Story 5 (Token Accounts) should be independently functional

---

## Phase 8: Polish & Cross-Cutting Concerns

**Purpose**: Improvements that affect multiple user stories

- [ ] T071 [P] Add comprehensive error handling across all services
- [ ] T072 [P] Implement request/response logging in backend
- [ ] T073 Performance optimization for history queries with 100+ records
- [ ] T074 Add database connection pooling configuration
- [ ] T075 [P] Create seed data script in supabase/seed/seed.sql
- [ ] T076 Run full quickstart.md validation end-to-end
- [ ] T077 [P] Add API documentation annotations to all endpoints
- [ ] T078 Security audit of RLS policies and data isolation

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **User Stories (Phase 3-7)**: All depend on Foundational phase completion
  - US1 and US2 are both P1 priority and can proceed in parallel or sequentially
  - US3 and US4 are P2 priority and can start after Foundational
  - US5 is P3 priority and can start after Foundational
- **Polish (Phase 8)**: Depends on all desired user stories being complete

### User Story Dependencies

- **User Story 1 (P1)**: Can start after Foundational - No dependencies on other stories
- **User Story 2 (P1)**: Can start after Foundational - Integrates with US1's user model but independently testable
- **User Story 3 (P2)**: Can start after Foundational - Uses generation data but independently testable
- **User Story 4 (P2)**: Can start after Foundational - Applies to generation endpoint but independently testable
- **User Story 5 (P3)**: Can start after Foundational - Extends user model but independently testable

### Within Each User Story

1. Tests MUST be written and FAIL before implementation
2. Models before services
3. Services before endpoints
4. Backend before frontend
5. Core implementation before UI components
6. Story complete before moving to next priority

### Parallel Opportunities

- All Setup tasks marked [P] can run in parallel
- Database migrations must run sequentially (T006-T011) but other Foundational tasks can parallelize
- US1 and US2 can be developed in parallel (both P1)
- US3 and US4 can be developed in parallel (both P2)
- All test files for a story marked [P] can be written in parallel
- All models within a story marked [P] can be created in parallel
- All UI components within a story marked [P] can be developed in parallel

---

## Parallel Example: User Story 1

```bash
# Launch all tests for User Story 1 together:
Task: "E2E test for user registration in frontend/tests/e2e/registration.spec.ts"
Task: "E2E test for trial credit allocation in frontend/tests/e2e/trial-credits.spec.ts"
Task: "Integration test for email verification in backend/tests/integration/test_email_verification.py"

# Launch all models for User Story 1 together:
Task: "Create User model in backend/src/models/user.py"
Task: "Create TokenAccount model in backend/src/models/token_account.py"

# Launch all components for User Story 1 together:
Task: "Create RegistrationForm component in frontend/src/components/RegistrationForm/index.tsx"
Task: "Create EmailVerification component in frontend/src/components/EmailVerification/index.tsx"
```

---

## Implementation Strategy

### MVP First (User Story 1 + 2 Only)

1. Complete Phase 1: Setup (T001-T005)
2. Complete Phase 2: Foundational (T006-T015) - CRITICAL
3. Complete Phase 3: User Story 1 (T016-T028) - Registration
4. Complete Phase 4: User Story 2 (T029-T042) - Generation
5. **STOP and VALIDATE**: Test core value proposition
6. Deploy/demo if ready

### Incremental Delivery

1. Setup + Foundational → Database and infrastructure ready
2. Add User Story 1 → Users can register with trial credits (Demo!)
3. Add User Story 2 → Users can generate designs (MVP Complete!)
4. Add User Story 3 → Users can view history (Enhanced experience)
5. Add User Story 4 → Platform protected from abuse (Production ready)
6. Add User Story 5 → Ready for monetization (Business ready)

### Parallel Team Strategy

With multiple developers:

1. Team completes Setup + Foundational together (T001-T015)
2. Once Foundational is done:
   - Developer A: User Story 1 (T016-T028) - Registration
   - Developer B: User Story 2 (T029-T042) - Generation
   - Developer C: User Story 3 (T043-T053) - History
   - Developer D: User Story 4 (T054-T063) - Rate Limiting
3. Stories complete and integrate independently
4. Final team effort on Polish phase (T071-T078)

---

## Notes

- [P] tasks = different files, no dependencies within the same phase
- [US#] label maps task to specific user story for traceability
- Each user story should be independently completable and testable
- Tests must fail before implementing (TDD requirement from constitution)
- Commit after each task or logical group
- Stop at any checkpoint to validate story independently
- Database migrations must run in sequence (T006-T011)
- RLS policies provide data isolation at database level
- All credit operations are atomic to prevent race conditions