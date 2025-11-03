# Tasks: AI Landscape Studio Platform

**Input**: Design documents from `/specs/001-002-landscape-studio/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/, quickstart.md

**Tests**: This feature requires **Test-First Development (NON-NEGOTIABLE)** per constitution - all test tasks MUST be completed before implementation.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions

This is a web application with separated backend/frontend:
- Backend: `backend/src/`
- Frontend: `frontend/src/`
- Database migrations: `supabase/migrations/`
- Tests: `backend/tests/`, `frontend/tests/`

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization and basic structure

- [ ] T001 Create database connection pool in backend/src/db/connection_pool.py
- [ ] T002 [P] Configure Stripe SDK with secret keys in backend/src/config.py
- [ ] T003 [P] Configure Vercel Blob storage client in backend/src/services/storage_service.py
- [ ] T004 [P] Configure Google Gemini SDK in backend/src/services/gemini_client.py
- [ ] T005 [P] Setup Zustand stores structure in frontend/src/store/

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core database schema and infrastructure that MUST be complete before ANY user story can be implemented

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

### Database Migrations

- [ ] T006 Apply migration 001_create_users_table.sql with trial fields (trial_remaining, trial_used, subscription fields)
- [ ] T007 Apply migration 002_create_token_accounts.sql with balance CHECK constraint >= 0
- [ ] T008 Apply migration 003_create_token_transactions.sql with stripe_payment_intent_id UNIQUE constraint
- [ ] T009 Apply migration 004_create_generations.sql with status and payment_type fields
- [ ] T010 Apply migration 005_create_generation_areas.sql for multi-area support
- [ ] T011 Apply migration 006_create_rate_limits.sql for API throttling
- [ ] T012 Apply migration 007_create_functions.sql (get_token_balance, deduct_token_atomic, check_auto_reload_trigger)
- [ ] T013 Apply migration 008_create_triggers.sql (update_updated_at, validate_token_balance)
- [ ] T014 Apply migration 009_create_rls_policies.sql for all tables
- [ ] T015 Apply migration 010_create_indexes.sql for performance optimization

### Database Verification

- [ ] T016 Verify CHECK constraint prevents negative balances: INSERT INTO users_token_accounts (balance) VALUES (-1)
- [ ] T017 Verify UNIQUE constraint prevents duplicate payment_intent_id: INSERT duplicate stripe_payment_intent_id
- [ ] T018 Verify database functions exist and execute: SELECT get_token_balance('test-user-id')

**Checkpoint**: Foundation ready - user story implementation can now begin in parallel

---

## Phase 3: User Story 1 - Trial User Registration and First Generation (Priority: P1) 🎯 MVP

**Goal**: First-time visitors can register, verify email, and generate their first landscape design using 3 free trial credits

**Independent Test**: Register new account → verify email → generate one design → verify trial_remaining decrements from 3 to 2

### Tests for User Story 1 ⚠️

> **NOTE: Write these tests FIRST, ensure they FAIL before implementation**

- [ ] T019 [P] [US1] E2E test for registration with trial credits in frontend/tests/e2e/trial-user-registration.spec.ts
- [ ] T020 [P] [US1] E2E test for trial exhausted modal in frontend/tests/e2e/trial-user-registration.spec.ts
- [ ] T021 [P] [US1] Integration test for concurrent trial deduction in backend/tests/integration/test_race_conditions.py
- [ ] T022 [P] [US1] Integration test for trial refund on generation failure in backend/tests/integration/test_trial_refund.py
- [ ] T023 [P] [US1] Integration test for generation authorization hierarchy in backend/tests/integration/test_generation_authorization.py

### Backend Implementation for User Story 1

- [ ] T024 [P] [US1] Create User Pydantic model with trial fields in backend/src/models/user.py
- [ ] T025 [US1] Implement trial_service.py with deduct_trial_atomic() using FOR UPDATE lock in backend/src/services/trial_service.py
- [ ] T026 [US1] Implement refund_trial() for generation failures in backend/src/services/trial_service.py
- [ ] T027 [US1] Create registration endpoint POST /auth/register with trial_remaining=3 initialization in backend/src/api/endpoints/auth.py
- [ ] T028 [US1] Create email verification endpoint POST /auth/verify-email in backend/src/api/endpoints/auth.py
- [ ] T029 [US1] Extend generation endpoint POST /generations with trial authorization check in backend/src/api/endpoints/generations.py
- [ ] T030 [US1] Implement generation failure refund logic in backend/src/services/generation_service.py

### Frontend Implementation for User Story 1

- [ ] T031 [P] [US1] Create TrialCounter component in frontend/src/components/TrialCounter/index.tsx
- [ ] T032 [P] [US1] Create TrialExhaustedModal component in frontend/src/components/TrialExhaustedModal/index.tsx
- [ ] T033 [P] [US1] Create unit test for TrialCounter in frontend/src/components/TrialCounter/TrialCounter.test.tsx
- [ ] T034 [P] [US1] Create unit test for TrialExhaustedModal in frontend/src/components/TrialExhaustedModal/TrialExhaustedModal.test.tsx
- [ ] T035 [US1] Extend Register page with trial messaging in frontend/src/pages/Register.tsx
- [ ] T036 [US1] Extend userStore with trial_remaining field in frontend/src/store/userStore.ts
- [ ] T037 [US1] Add trial authorization check to Generate page in frontend/src/pages/Generate.tsx
- [ ] T038 [US1] Integrate TrialCounter into app navbar in frontend/src/components/Layout/Navbar.tsx

**Checkpoint**: At this point, User Story 1 should be fully functional and testable independently

---

## Phase 4: User Story 2 - Token Purchase and Pay-Per-Use Generation (Priority: P1) 🎯 MVP

**Goal**: Users can purchase token packages via Stripe and generate designs using tokens with atomic deduction and idempotent webhook processing

**Independent Test**: Purchase 50 tokens → verify webhook credits exactly 50 tokens → generate design → verify token decrements to 49

### Tests for User Story 2 ⚠️

- [ ] T039 [P] [US2] E2E test for token purchase flow in frontend/tests/e2e/token-purchase.spec.ts
- [ ] T040 [P] [US2] Integration test for concurrent token deduction in backend/tests/integration/test_race_conditions.py
- [ ] T041 [P] [US2] Integration test for webhook idempotency in backend/tests/integration/test_webhook_idempotency.py
- [ ] T042 [P] [US2] Integration test for Stripe checkout session creation in backend/tests/integration/test_stripe_checkout.py
- [ ] T043 [P] [US2] Integration test for token refund on generation failure in backend/tests/integration/test_token_refund.py

### Backend Implementation for User Story 2

- [ ] T044 [P] [US2] Create TokenAccount Pydantic model in backend/src/models/token_account.py
- [ ] T045 [P] [US2] Create TokenTransaction Pydantic model with stripe_payment_intent_id in backend/src/models/token_transaction.py
- [ ] T046 [US2] Implement token_service.py with deduct_token_atomic() using FOR UPDATE lock in backend/src/services/token_service.py
- [ ] T047 [US2] Implement refund_token() for generation failures in backend/src/services/token_service.py
- [ ] T048 [US2] Implement stripe_service.py with create_token_checkout_session() in backend/src/services/stripe_service.py
- [ ] T049 [US2] Implement webhook_service.py with process_checkout_completed() for idempotent processing in backend/src/services/webhook_service.py
- [ ] T050 [US2] Create token purchase endpoint POST /tokens/purchase in backend/src/api/endpoints/tokens.py
- [ ] T051 [US2] Create token balance endpoint GET /tokens/balance with <100ms response time in backend/src/api/endpoints/tokens.py
- [ ] T052 [US2] Create Stripe webhook endpoint POST /webhooks/stripe in backend/src/api/endpoints/webhooks.py
- [ ] T053 [US2] Extend generation authorization to check token balance in backend/src/api/endpoints/generations.py

### Frontend Implementation for User Story 2

- [ ] T054 [P] [US2] Create TokenBalance component with 10-second auto-refresh in frontend/src/components/TokenBalance/index.tsx
- [ ] T055 [P] [US2] Create TokenPurchaseModal component with 4 packages in frontend/src/components/TokenPurchaseModal/index.tsx
- [ ] T056 [P] [US2] Create unit test for TokenBalance in frontend/src/components/TokenBalance/TokenBalance.test.tsx
- [ ] T057 [P] [US2] Create unit test for TokenPurchaseModal in frontend/src/components/TokenPurchaseModal/TokenPurchaseModal.test.tsx
- [ ] T058 [US2] Create tokenStore with balance and fetchBalance() in frontend/src/store/tokenStore.ts
- [ ] T059 [US2] Add purchaseTokens() API method in frontend/src/services/api.ts
- [ ] T060 [US2] Integrate TokenBalance into app navbar in frontend/src/components/Layout/Navbar.tsx
- [ ] T061 [US2] Add token authorization check to Generate page in frontend/src/pages/Generate.tsx

**Checkpoint**: At this point, User Stories 1 AND 2 should both work independently

---

## Phase 5: User Story 3 - Auto-Reload Configuration (Priority: P2)

**Goal**: Power users can configure automatic token reload with threshold and amount settings, preventing workflow interruptions

**Independent Test**: Enable auto-reload with threshold=20 and amount=100 → generate designs until balance drops to 19 → verify auto-reload triggers and balance becomes 119

### Tests for User Story 3 ⚠️

- [ ] T062 [P] [US3] E2E test for auto-reload trigger in frontend/tests/e2e/auto-reload.spec.ts
- [ ] T063 [P] [US3] E2E test for auto-reload 60-second throttle in frontend/tests/e2e/auto-reload.spec.ts
- [ ] T064 [P] [US3] E2E test for auto-reload disabled after 3 failures in frontend/tests/e2e/auto-reload.spec.ts
- [ ] T065 [P] [US3] Integration test for auto-reload trigger logic in backend/tests/integration/test_auto_reload.py

### Backend Implementation for User Story 3

- [ ] T066 [P] [US3] Extend TokenAccount model with auto_reload fields in backend/src/models/token_account.py
- [ ] T067 [US3] Implement auto_reload_service.py with check_and_trigger() logic in backend/src/services/auto_reload_service.py
- [ ] T068 [US3] Implement 60-second throttle check in auto_reload_service.py
- [ ] T069 [US3] Implement failure count increment and disable after 3 failures in backend/src/services/auto_reload_service.py
- [ ] T070 [US3] Create auto-reload configuration endpoint PUT /tokens/auto-reload in backend/src/api/endpoints/tokens.py
- [ ] T071 [US3] Create auto-reload status endpoint GET /tokens/auto-reload in backend/src/api/endpoints/tokens.py
- [ ] T072 [US3] Integrate auto-reload trigger in token deduction flow in backend/src/services/token_service.py
- [ ] T073 [US3] Extend webhook_service to handle auto-reload payments in backend/src/services/webhook_service.py

### Frontend Implementation for User Story 3

- [ ] T074 [P] [US3] Create AutoReloadConfig component with threshold and amount inputs in frontend/src/components/AutoReloadConfig/index.tsx
- [ ] T075 [P] [US3] Create unit test for AutoReloadConfig in frontend/src/components/AutoReloadConfig/AutoReloadConfig.test.tsx
- [ ] T076 [US3] Extend tokenStore with auto-reload configuration in frontend/src/store/tokenStore.ts
- [ ] T077 [US3] Create Account page with auto-reload settings tab in frontend/src/pages/Account/TokensTab.tsx
- [ ] T078 [US3] Add configureAutoReload() API method in frontend/src/services/api.ts

**Checkpoint**: Auto-reload should work independently without affecting trial or token purchase features

---

## Phase 6: User Story 4 - Subscription Upgrade and Unlimited Generation (Priority: P2)

**Goal**: Frequent users can upgrade to Monthly Pro subscription ($99/month) for unlimited generations without token deduction

**Independent Test**: Subscribe to Monthly Pro → generate 150 designs → verify no tokens deducted and balance preserved → cancel subscription → verify reversion to token system

### Tests for User Story 4 ⚠️

- [ ] T079 [P] [US4] E2E test for subscription upgrade flow in frontend/tests/e2e/subscription-upgrade.spec.ts
- [ ] T080 [P] [US4] E2E test for unlimited generation with subscription in frontend/tests/e2e/subscription-upgrade.spec.ts
- [ ] T081 [P] [US4] E2E test for subscription cancellation and reversion in frontend/tests/e2e/subscription-upgrade.spec.ts
- [ ] T082 [P] [US4] Integration test for subscription webhook processing in backend/tests/integration/test_subscription_webhooks.py

### Backend Implementation for User Story 4

- [ ] T083 [P] [US4] Extend User model with subscription fields (subscription_tier, subscription_status) in backend/src/models/user.py
- [ ] T084 [P] [US4] Create Subscription Pydantic model in backend/src/models/subscription.py
- [ ] T085 [US4] Implement subscription_service.py with create_checkout() in backend/src/services/subscription_service.py
- [ ] T086 [US4] Implement subscription webhook handlers in backend/src/services/webhook_service.py
- [ ] T087 [US4] Create subscription plans endpoint GET /subscriptions/plans in backend/src/api/endpoints/subscriptions.py
- [ ] T088 [US4] Create subscription checkout endpoint POST /subscriptions/subscribe in backend/src/api/endpoints/subscriptions.py
- [ ] T089 [US4] Create subscription status endpoint GET /subscriptions/current in backend/src/api/endpoints/subscriptions.py
- [ ] T090 [US4] Create subscription cancellation endpoint POST /subscriptions/cancel in backend/src/api/endpoints/subscriptions.py
- [ ] T091 [US4] Create Customer Portal endpoint GET /subscriptions/portal in backend/src/api/endpoints/subscriptions.py
- [ ] T092 [US4] Update generation authorization to check subscription_status='active' BEFORE token balance in backend/src/api/endpoints/generations.py

### Frontend Implementation for User Story 4

- [ ] T093 [P] [US4] Create SubscriptionManager component in frontend/src/components/SubscriptionManager/index.tsx
- [ ] T094 [P] [US4] Create unit test for SubscriptionManager in frontend/src/components/SubscriptionManager/SubscriptionManager.test.tsx
- [ ] T095 [US4] Create subscriptionStore in frontend/src/store/subscriptionStore.ts
- [ ] T096 [US4] Create Pricing page with subscription plans in frontend/src/pages/Pricing.tsx
- [ ] T097 [US4] Extend Account page with subscription tab in frontend/src/pages/Account/SubscriptionTab.tsx
- [ ] T098 [US4] Add subscription API methods in frontend/src/services/api.ts
- [ ] T099 [US4] Extend userStore with subscription_status in frontend/src/store/userStore.ts

**Checkpoint**: Subscription system should work independently with proper integration into generation authorization

---

## Phase 7: User Story 5 - Multi-Area Landscape Generation (Priority: P3)

**Goal**: Users can select multiple areas (front yard, backyard, walkway) and generate all designs simultaneously in 60-90 seconds using parallel processing

**Independent Test**: Select 3 areas → generate all simultaneously → verify completion in <90 seconds (not 180 seconds sequential) → verify correct token deduction (3 tokens, not 1)

### Tests for User Story 5 ⚠️

- [ ] T100 [P] [US5] E2E test for multi-area selection and generation in frontend/tests/e2e/multi-area-generation.spec.ts
- [ ] T101 [P] [US5] E2E test for parallel processing timing in frontend/tests/e2e/multi-area-generation.spec.ts
- [ ] T102 [P] [US5] E2E test for partial failure handling in frontend/tests/e2e/multi-area-generation.spec.ts
- [ ] T103 [P] [US5] Integration test for parallel generation with asyncio in backend/tests/integration/test_multi_area_generation.py

### Backend Implementation for User Story 5

- [ ] T104 [P] [US5] Extend Generation model for multi-area support in backend/src/models/generation.py
- [ ] T105 [P] [US5] Create GenerationArea model in backend/src/models/generation_area.py
- [ ] T106 [US5] Implement parallel generation with asyncio.gather() in backend/src/services/generation_service.py
- [ ] T107 [US5] Implement per-area progress tracking in backend/src/services/generation_service.py
- [ ] T108 [US5] Implement partial failure handling with individual area refunds in backend/src/services/generation_service.py
- [ ] T109 [US5] Extend POST /generations to accept multiple areas in backend/src/api/endpoints/generations.py
- [ ] T110 [US5] Create endpoint GET /generations/{id}/areas/{area_id} in backend/src/api/endpoints/generations.py
- [ ] T111 [US5] Update token deduction to charge for all areas upfront in backend/src/services/token_service.py

### Frontend Implementation for User Story 5

- [ ] T112 [P] [US5] Create MultiAreaSelector component in frontend/src/components/MultiAreaSelector/index.tsx
- [ ] T113 [P] [US5] Create unit test for MultiAreaSelector in frontend/src/components/MultiAreaSelector/MultiAreaSelector.test.tsx
- [ ] T114 [US5] Extend GenerationProgress component for multi-area tracking in frontend/src/components/GenerationProgress/index.tsx
- [ ] T115 [US5] Extend generationStore for multi-area state management in frontend/src/store/generationStore.ts
- [ ] T116 [US5] Add localStorage persistence for request_id recovery in frontend/src/store/generationStore.ts
- [ ] T117 [US5] Extend Generate page with multi-area selection in frontend/src/pages/Generate.tsx
- [ ] T118 [US5] Implement "Download All" ZIP functionality in frontend/src/pages/Generate.tsx

**Checkpoint**: Multi-area generation should work independently with correct parallel processing

---

## Phase 8: User Story 6 - Transaction History and Usage Analytics (Priority: P3)

**Goal**: Users can review complete token transaction history with filters and export to CSV for transparency and spending analysis

**Independent Test**: Perform 10 token operations (purchases, deductions, refunds) → view transaction history → verify all 10 listed with correct running balance → filter by type → export to CSV

### Tests for User Story 6 ⚠️

- [ ] T119 [P] [US6] E2E test for transaction history display in frontend/tests/e2e/transaction-history.spec.ts
- [ ] T120 [P] [US6] E2E test for transaction filtering in frontend/tests/e2e/transaction-history.spec.ts
- [ ] T121 [P] [US6] E2E test for CSV export in frontend/tests/e2e/transaction-history.spec.ts
- [ ] T122 [P] [US6] Integration test for transaction history pagination in backend/tests/integration/test_transaction_history.py

### Backend Implementation for User Story 6

- [ ] T123 [US6] Create transaction history endpoint GET /tokens/transactions with pagination in backend/src/api/endpoints/tokens.py
- [ ] T124 [US6] Implement transaction filtering by type and date range in backend/src/api/endpoints/tokens.py
- [ ] T125 [US6] Create CSV export endpoint GET /tokens/transactions/export in backend/src/api/endpoints/tokens.py
- [ ] T126 [US6] Create usage statistics endpoint GET /account/statistics in backend/src/api/endpoints/account.py

### Frontend Implementation for User Story 6

- [ ] T127 [P] [US6] Create TransactionHistory component with pagination in frontend/src/components/TransactionHistory/index.tsx
- [ ] T128 [P] [US6] Create unit test for TransactionHistory in frontend/src/components/TransactionHistory/TransactionHistory.test.tsx
- [ ] T129 [US6] Create transaction filters UI in frontend/src/components/TransactionHistory/Filters.tsx
- [ ] T130 [US6] Extend Account page with transaction history tab in frontend/src/pages/Account/TokensTab.tsx
- [ ] T131 [US6] Implement CSV export button in frontend/src/components/TransactionHistory/index.tsx
- [ ] T132 [US6] Create usage statistics dashboard in frontend/src/pages/Account/StatsTab.tsx
- [ ] T133 [US6] Extend tokenStore with transaction history in frontend/src/store/tokenStore.ts

**Checkpoint**: All user stories should now be independently functional

---

## Phase 9: Polish & Cross-Cutting Concerns

**Purpose**: Improvements that affect multiple user stories

- [ ] T134 [P] Add error boundary components in frontend/src/components/ErrorBoundary/
- [ ] T135 [P] Implement rate limiting for all API endpoints in backend/src/api/middleware/rate_limit.py
- [ ] T136 [P] Add comprehensive API documentation in docs/api.md
- [ ] T137 [P] Add performance monitoring with Sentry in backend/src/main.py
- [ ] T138 [P] Add analytics tracking for key user actions in frontend/src/services/analytics.ts
- [ ] T139 [US1] Add email notification for trial exhausted
- [ ] T140 [US2] Add email notification for token purchase confirmation
- [ ] T141 [US3] Add email notification for auto-reload success/failure
- [ ] T142 [US4] Add email notifications for subscription events
- [ ] T143 Code cleanup and refactoring across all user stories
- [ ] T144 Security hardening: SQL injection prevention, XSS protection, CSRF tokens
- [ ] T145 Run quickstart.md validation for all test scenarios
- [ ] T146 Performance optimization: database query optimization, frontend bundle size reduction

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **User Stories (Phase 3-8)**: All depend on Foundational phase completion
  - User stories can then proceed in parallel (if staffed)
  - Or sequentially in priority order: US1 (P1) → US2 (P1) → US3 (P2) → US4 (P2) → US5 (P3) → US6 (P3)
- **Polish (Phase 9)**: Depends on all desired user stories being complete

### User Story Dependencies

- **User Story 1 (P1)**: Can start after Foundational (Phase 2) - No dependencies on other stories
- **User Story 2 (P1)**: Can start after Foundational (Phase 2) - No dependencies on other stories
- **User Story 3 (P2)**: Can start after Foundational (Phase 2) - Requires US2 token system but independently testable
- **User Story 4 (P2)**: Can start after Foundational (Phase 2) - No dependencies on other stories
- **User Story 5 (P3)**: Can start after Foundational (Phase 2) - Requires US2 token system but independently testable
- **User Story 6 (P3)**: Can start after Foundational (Phase 2) - Requires US2 transaction records but independently testable

### Within Each User Story

- Tests MUST be written and FAIL before implementation (TDD - NON-NEGOTIABLE per constitution)
- Models before services
- Services before endpoints
- Backend implementation before frontend integration
- Story complete before moving to next priority

### Parallel Opportunities

- All Setup tasks marked [P] can run in parallel (T001-T005)
- Database migrations can run sequentially but be batched (T006-T015)
- Once Foundational phase completes, all user stories can start in parallel (if team capacity allows)
- All tests for a user story marked [P] can run in parallel
- Models within a story marked [P] can run in parallel
- Frontend components within a story marked [P] can run in parallel
- Different user stories can be worked on in parallel by different team members

---

## Parallel Example: User Story 1

```bash
# Launch all tests for User Story 1 together (TDD - write these first):
Task T019: "E2E test for registration with trial credits"
Task T020: "E2E test for trial exhausted modal"
Task T021: "Integration test for concurrent trial deduction"
Task T022: "Integration test for trial refund on generation failure"
Task T023: "Integration test for generation authorization hierarchy"

# Then launch all models for User Story 1 together:
Task T024: "Create User Pydantic model in backend/src/models/user.py"

# Then launch all frontend components for User Story 1 together:
Task T031: "Create TrialCounter component"
Task T032: "Create TrialExhaustedModal component"
Task T033: "Create unit test for TrialCounter"
Task T034: "Create unit test for TrialExhaustedModal"
```

---

## Implementation Strategy

### MVP First (User Stories 1 & 2 Only)

1. Complete Phase 1: Setup (5 tasks, ~2 hours)
2. Complete Phase 2: Foundational (13 tasks, ~1 day) - CRITICAL - blocks all stories
3. Complete Phase 3: User Story 1 (20 tasks, ~3 days)
4. **STOP and VALIDATE**: Test User Story 1 independently
5. Complete Phase 4: User Story 2 (23 tasks, ~4 days)
6. **STOP and VALIDATE**: Test User Stories 1 & 2 together
7. Deploy/demo MVP with trial system and token purchases

**MVP Total**: 61 tasks, ~8 days (with proper TDD workflow)

### Incremental Delivery

1. Complete Setup + Foundational → Foundation ready
2. Add User Story 1 → Test independently → Deploy/Demo (Trial system MVP!)
3. Add User Story 2 → Test independently → Deploy/Demo (Full payment MVP!)
4. Add User Story 3 → Test independently → Deploy/Demo (Auto-reload for power users)
5. Add User Story 4 → Test independently → Deploy/Demo (Subscriptions for high-volume users)
6. Add User Story 5 → Test independently → Deploy/Demo (Multi-area convenience)
7. Add User Story 6 → Test independently → Deploy/Demo (Full feature set!)
8. Each story adds value without breaking previous stories

### Parallel Team Strategy

With 3 developers after Foundational phase:

1. Team completes Setup + Foundational together (~1.5 days)
2. Once Foundational is done:
   - **Developer A**: User Story 1 (Trial system) - 3 days
   - **Developer B**: User Story 2 (Token purchase) - 4 days
   - **Developer C**: User Story 4 (Subscriptions) - 3 days
3. Then proceed to lower-priority stories:
   - **Developer A**: User Story 3 (Auto-reload) - 2 days
   - **Developer B**: User Story 5 (Multi-area) - 3 days
   - **Developer C**: User Story 6 (Transaction history) - 2 days
4. Stories complete and integrate independently

---

## Task Metrics

| Phase | Tasks | User Story | Est. Days |
|-------|-------|------------|-----------|
| Phase 1: Setup | 5 | - | 0.5 |
| Phase 2: Foundational | 13 | - | 1 |
| Phase 3: User Story 1 | 20 | US1 (P1) | 3 |
| Phase 4: User Story 2 | 23 | US2 (P1) | 4 |
| Phase 5: User Story 3 | 17 | US3 (P2) | 2 |
| Phase 6: User Story 4 | 21 | US4 (P2) | 3 |
| Phase 7: User Story 5 | 19 | US5 (P3) | 3 |
| Phase 8: User Story 6 | 15 | US6 (P3) | 2 |
| Phase 9: Polish | 13 | - | 1 |
| **TOTAL** | **146** | **6 stories** | **19.5** |

**MVP (US1 + US2)**: 61 tasks, ~8 days
**Full Feature**: 146 tasks, ~19.5 days

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- Each user story should be independently completable and testable
- **TDD is NON-NEGOTIABLE**: Verify tests fail before implementing (per constitution)
- Commit after each task or logical group
- Stop at any checkpoint to validate story independently
- Avoid: vague tasks, same file conflicts, cross-story dependencies that break independence
- All tasks follow strict checklist format: `- [ ] [ID] [P?] [Story?] Description with file path`
