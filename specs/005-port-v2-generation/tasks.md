# Tasks: Port V2 Generation Flow to V5

**Input**: Design documents from `/specs/005-port-v2-generation/`
**Prerequisites**: plan.md ✅, spec.md ✅, research.md ✅, data-model.md ✅

**Tests**: TDD approach mandated by constitution - E2E tests written before implementation

**Organization**: Tasks grouped by user story priority to enable independent implementation and testing

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1-US5)
- Exact file paths included in all descriptions

## Path Conventions

- **Frontend**: `frontend/src/`
- **Backend**: No changes required - using existing v5 API
- **Tests**: `frontend/tests/e2e/`

---

## Phase 1: Setup (Shared Infrastructure) ✅ COMPLETE

**Purpose**: Project initialization and type definitions

- [x] T001 [P] Create TypeScript types for suggested prompts in frontend/src/types/generation.ts
- [x] T002 [P] Create suggested prompts data with emoji mappings in frontend/src/lib/suggested-prompts.ts
- [x] T003 [P] Create localStorage constants file in frontend/src/lib/localStorage-keys.ts

---

## Phase 2: Foundational (Blocking Prerequisites) ✅ COMPLETE

**Purpose**: Core infrastructure that MUST be complete before ANY user story can be implemented

**✅ COMPLETE**: Foundation ready - all user story work can now proceed

- [x] T004 Refactor Zustand store in frontend/src/store/generationStore.ts to add suggested prompts state
- [x] T005 [P] Extend generation types in frontend/src/types/generation.ts with YardArea, SuggestedPrompt, Style entities
- [x] T006 [P] Add polling helper functions to frontend/src/lib/api.ts for 2-second interval polling
- [x] T007 [P] Create emoji mapping utility function in frontend/src/lib/suggested-prompts.ts (30+ keyword mappings)

**Checkpoint**: Foundation ready - user story implementation can now begin in parallel

---

## Phase 3: US1 + US5 (Priority: P1) 🎯 MVP - Single-Page Flow with Polling ✅ COMPLETE

**Combined Goal**: Users complete entire generation flow (form → progress → results) on a single page with real-time polling updates

**Why Combined**: US1 (single-page) and US5 (polling) are tightly coupled - inline progress requires working polling

**Independent Test**: Submit a generation and verify: (1) no page navigation occurs, (2) progress updates appear inline every 2 seconds, (3) results display inline when complete

### Tests for US1 + US5 ✅ WRITTEN (TDD Red Phase)

> **✅ Tests written FIRST per TDD methodology**

- [x] T008 [P] [US1] [US5] E2E test for single-page generation flow in frontend/tests/e2e/generation-flow-v2.spec.ts
- [x] T009 [P] [US1] [US5] E2E test for polling progress updates in frontend/tests/e2e/generation-flow-v2.spec.ts
- [x] T010 [P] [US1] [US5] E2E test for inline results display in frontend/tests/e2e/generation-flow-v2.spec.ts

### Implementation for US1 + US5 ✅ COMPLETE

- [x] T011 [P] [US1] Create GenerationProgressInline component in frontend/src/components/generation/GenerationProgressInline.tsx
- [x] T012 [P] [US1] Create GenerationResultsInline component in frontend/src/components/generation/GenerationResultsInline.tsx
- [x] T013 [US5] Implement polling logic with 2-second interval and 5-minute timeout in frontend/src/lib/api.ts
- [x] T014 [US5] Add polling state management to Zustand store in frontend/src/store/generationStore.ts
- [x] T015 [US1] [US5] Refactor generate.tsx to show form, progress, and results inline in frontend/src/pages/generate-v2.tsx
- [x] T016 [US1] [US5] Add conditional rendering logic for progress section (hidden until generation starts)
- [x] T017 [US1] [US5] Add conditional rendering logic for results section (hidden until completion)
- [x] T018 [US1] Add "Start New Generation" button that resets form without page reload
- [x] T019 [US5] Add error handling for network interruptions during polling
- [x] T020 [US5] Add timeout handling (5 minutes) with user-facing error message

**Checkpoint**: ✅ Single-page generation flow with polling is fully implemented - ready for integration testing

---

## Phase 4: US2 (Priority: P2) - Interactive Suggested Prompts

**Goal**: Users can quickly select from suggested design ideas (max 3 per area) with clickable emoji chips

**Independent Test**: Select a yard area, click 3 suggested prompts, verify they populate the textarea and chips show selected state

### Tests for US2 ⚠️ WRITE FIRST

- [ ] T021 [P] [US2] E2E test for suggested prompt selection in frontend/tests/e2e/suggested-prompts.spec.ts
- [ ] T022 [P] [US2] E2E test for max 3 prompts limit in frontend/tests/e2e/suggested-prompts.spec.ts
- [ ] T023 [P] [US2] E2E test for prompt deselection in frontend/tests/e2e/suggested-prompts.spec.ts

### Implementation for US2

- [ ] T024 [P] [US2] Create SuggestedPromptChip component in frontend/src/components/generation/SuggestedPromptChip.tsx
- [ ] T025 [US2] Create SuperMinimalYardSelector component in frontend/src/components/generation/SuperMinimalYardSelector.tsx
- [ ] T026 [US2] Implement prompt selection logic (max 3, comma-separated) in SuperMinimalYardSelector
- [ ] T027 [US2] Implement prompt deselection logic (remove from textarea and chip state)
- [ ] T028 [US2] Add emoji indicator to each chip based on keyword matching in SuggestedPromptChip
- [ ] T029 [US2] Integrate SuperMinimalYardSelector into generate.tsx replacing existing AreaSelector
- [ ] T030 [US2] Add visual states for chips (unselected, selected, disabled) with checkmark icon

**Checkpoint**: At this point, suggested prompts system should work independently with clickable chips

---

## Phase 5: US3 (Priority: P2) - Visual Design Enhancements

**Goal**: Users experience smooth animations, gradient backgrounds, and emoji icons throughout the interface

**Independent Test**: Interact with any component and verify smooth animations, gradient backgrounds, and emoji icons appear correctly

### Tests for US3 ⚠️ WRITE FIRST

- [ ] T031 [P] [US3] E2E test for expand/collapse animations in frontend/tests/e2e/visual-enhancements.spec.ts
- [ ] T032 [P] [US3] E2E test for numbered selection indicators (1, 2, 3) in frontend/tests/e2e/visual-enhancements.spec.ts
- [ ] T033 [P] [US3] E2E test for emoji icons display in frontend/tests/e2e/visual-enhancements.spec.ts

### Implementation for US3

- [ ] T034 [P] [US3] Create SuperMinimalStyleSelector component in frontend/src/components/generation/SuperMinimalStyleSelector.tsx
- [ ] T035 [US3] Add Framer Motion expand/collapse animation to yard area prompt sections
- [ ] T036 [US3] Add Framer Motion staggered grid animation (0.1s delay per item) to yard/style grids
- [ ] T037 [US3] Add numbered selection indicators (1, 2, 3) with animated appearance to style selector
- [ ] T038 [US3] Add gradient backgrounds for selected states (blue for front_yard, emerald for back_yard, amber for walkway)
- [ ] T039 [US3] Add hover animations (scale + shadow transitions) to all selectable items
- [ ] T040 [US3] Replace all SVG icons with emoji icons (🏠 🌲 🚶 🌸 etc.) throughout components
- [ ] T041 [US3] Add pulse animation indicator for selection count summary
- [ ] T042 [US3] Integrate SuperMinimalStyleSelector into generate.tsx replacing existing StyleSelector
- [ ] T043 [US3] Add prefers-reduced-motion media query support for accessibility

**Checkpoint**: All visual enhancements should be applied with smooth 60 FPS animations

---

## Phase 6: US4 (Priority: P3) - Session Recovery and Persistence

**Goal**: Users can recover in-progress or completed generations if browser is accidentally closed

**Independent Test**: Start a generation, close browser, reopen, and verify generation recovers with current status displayed

### Tests for US4 ⚠️ WRITE FIRST

- [ ] T044 [P] [US4] E2E test for localStorage save on generation start in frontend/tests/e2e/generation-recovery.spec.ts
- [ ] T045 [P] [US4] E2E test for recovery of completed generation in frontend/tests/e2e/generation-recovery.spec.ts
- [ ] T046 [P] [US4] E2E test for recovery of in-progress generation in frontend/tests/e2e/generation-recovery.spec.ts
- [ ] T047 [P] [US4] E2E test for localStorage clear on completion in frontend/tests/e2e/generation-recovery.spec.ts

### Implementation for US4

- [ ] T048 [US4] Implement localStorage save on generation submit in frontend/src/store/generationStore.ts
- [ ] T049 [US4] Implement recovery check on page mount in frontend/src/pages/generate.tsx
- [ ] T050 [US4] Add recovery toast notifications ("Recovered generation!") using existing toast library
- [ ] T051 [US4] Implement localStorage clear on generation completion
- [ ] T052 [US4] Add graceful handling for localStorage quota exceeded or disabled
- [ ] T053 [US4] Add stale data cleanup (clear if > 24 hours old) on page mount

**Checkpoint**: Session recovery should work reliably with 95%+ recovery rate for interrupted generations

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Improvements that affect multiple user stories and final deployment readiness

- [ ] T054 [P] Update CLAUDE.md with new SuperMinimal components and suggested prompts patterns
- [ ] T055 [P] Add inline code comments for complex polling and recovery logic
- [ ] T056 [P] Performance audit: Verify animations run at 60 FPS on mid-range devices
- [ ] T057 [P] Accessibility audit: Test keyboard navigation and screen reader support
- [ ] T058 Remove old multi-page navigation components (GenerationFormEnhanced, separate progress page)
- [ ] T059 Verify zero console errors in browser DevTools during full generation flow
- [ ] T060 Run full E2E test suite and verify 100% pass rate (all 15+ tests)
- [ ] T061 Build frontend and verify no TypeScript errors (`npm run build`)
- [ ] T062 Type check frontend and verify no errors (`npm run type-check`)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **US1 + US5 (Phase 3)**: Depends on Foundational - These are MVP, tightly coupled
- **US2 (Phase 4)**: Depends on Foundational - Can start after Phase 2, independent of US1/US5
- **US3 (Phase 5)**: Depends on Foundational + US2 (needs yard/style selectors from US2)
- **US4 (Phase 6)**: Depends on US1 + US5 (needs working generation flow to recover)
- **Polish (Phase 7)**: Depends on all implemented user stories

### User Story Dependencies

```
Foundational (Phase 2) → Blocks all stories
    ↓
    ├─→ US1 + US5 (Phase 3) ← MVP Core (can deploy after this)
    │       ↓
    │   US4 (Phase 6) ← Depends on US1+US5
    │
    ├─→ US2 (Phase 4) ← Independent of US1/US5
    │       ↓
    │   US3 (Phase 5) ← Depends on US2 (needs selectors)
    │
    └─→ Polish (Phase 7) ← Depends on all implemented stories
```

### Within Each User Story

1. **Tests FIRST** (write and ensure they FAIL)
2. **Models/Components** (parallel where possible)
3. **Logic/Integration** (sequential - depends on components)
4. **Story Validation** (run tests, ensure they PASS)

### Parallel Opportunities

- **Phase 1 (Setup)**: All 3 tasks [T001-T003] can run in parallel
- **Phase 2 (Foundational)**: T005, T006, T007 can run in parallel (after T004 completes)
- **Phase 3 Tests**: T008, T009, T010 can run in parallel
- **Phase 3 Implementation**: T011 and T012 can run in parallel
- **Phase 4 Tests**: T021, T022, T023 can run in parallel
- **Phase 4 Implementation**: T024 can start while T025 is being written
- **Phase 5 Tests**: T031, T032, T033 can run in parallel
- **Phase 5 Implementation**: T034, T035, T036, T037, T038, T039, T040, T041 (first 8 tasks) can be parallelized across different files
- **Phase 6 Tests**: T044, T045, T046, T047 can run in parallel
- **Phase 7 (Polish)**: T054, T055, T056, T057 can run in parallel

---

## Parallel Example: US1 + US5 (MVP Core)

```bash
# Step 1: Write all tests in parallel (MUST FAIL):
Task T008: "E2E test for single-page generation flow in frontend/tests/e2e/generation-flow-v2.spec.ts"
Task T009: "E2E test for polling progress updates in frontend/tests/e2e/generation-flow-v2.spec.ts"
Task T010: "E2E test for inline results display in frontend/tests/e2e/generation-flow-v2.spec.ts"

# Step 2: Build components in parallel:
Task T011: "Create GenerationProgressInline component in frontend/src/components/generation/GenerationProgressInline.tsx"
Task T012: "Create GenerationResultsInline component in frontend/src/components/generation/GenerationResultsInline.tsx"

# Step 3: Sequential integration (depends on components):
Task T013: "Implement polling logic..." (sequential)
Task T014: "Add polling state management..." (sequential, after T013)
Task T015: "Refactor generate.tsx..." (sequential, after T011, T012, T013, T014)
```

---

## Implementation Strategy

### MVP First (US1 + US5 Only)

**Goal**: Deployable single-page generation flow with polling

1. ✅ Complete Phase 1: Setup (T001-T003)
2. ✅ Complete Phase 2: Foundational (T004-T007) - CRITICAL BLOCKER
3. ✅ Complete Phase 3: US1 + US5 (T008-T020)
4. **STOP and VALIDATE**:
   - Run E2E tests (T008-T010) - should all PASS
   - Manual test: Complete a full generation without leaving page
   - Verify polling updates every 2 seconds
   - Verify 5-minute timeout works
5. **Deploy/Demo MVP** if all tests pass

**MVP Scope**:
- Tasks T001-T020 (20 tasks)
- Estimated effort: 16-24 hours
- Deliverable: Working single-page generation with polling

### Incremental Delivery (Add Features)

**After MVP deployed:**

1. **Add US2** (Suggested Prompts):
   - Complete Phase 4 (T021-T030)
   - Test independently
   - Deploy/Demo enhanced UX

2. **Add US3** (Visual Polish):
   - Complete Phase 5 (T031-T043)
   - Test independently
   - Deploy/Demo polished interface

3. **Add US4** (Session Recovery):
   - Complete Phase 6 (T044-T053)
   - Test independently
   - Deploy/Demo recovery feature

4. **Final Polish**:
   - Complete Phase 7 (T054-T062)
   - Full regression testing
   - Production deployment

### Parallel Team Strategy

With multiple developers, after Foundational phase completes:

**Scenario 1: 2 developers**
- Developer A: US1 + US5 (MVP core, high priority)
- Developer B: US2 (Suggested prompts, independent)
- After both complete: Developer A → US4, Developer B → US3

**Scenario 2: 3 developers**
- Developer A: US1 + US5 (MVP core)
- Developer B: US2 (Suggested prompts)
- Developer C: US3 (Visual enhancements, depends on US2 completing T025)
- After MVP: Developer A → US4

---

## Task Summary

**Total Tasks**: 62
- **Setup**: 3 tasks (T001-T003)
- **Foundational**: 4 tasks (T004-T007)
- **US1 + US5** (P1 - MVP): 13 tasks (T008-T020)
- **US2** (P2): 10 tasks (T021-T030)
- **US3** (P2): 13 tasks (T031-T043)
- **US4** (P3): 10 tasks (T044-T053)
- **Polish**: 9 tasks (T054-T062)

**Test Tasks**: 15 E2E tests (TDD approach as mandated)
**Implementation Tasks**: 47

**Parallel Opportunities**: 23 tasks marked [P] can run concurrently

**MVP Scope**: 20 tasks (T001-T020) delivers functional single-page generation flow

**Independent Test Criteria**:
- ✅ **US1 + US5**: Complete generation without page navigation, see polling updates
- ✅ **US2**: Select 3 suggested prompts, see them populate textarea
- ✅ **US3**: See smooth animations and emoji icons throughout
- ✅ **US4**: Close browser during generation, reopen, see recovery

---

## Format Validation

✅ **ALL tasks follow required format**:
- Checkbox: `- [ ]`
- Task ID: T001-T062 (sequential)
- [P] marker: 23 tasks (different files, parallelizable)
- [Story] label: All user story tasks labeled (US1-US5)
- File paths: All implementation tasks include exact paths
- Descriptions: Clear, actionable, specific

✅ **Organization validated**:
- Setup → Foundational → User Stories (by priority) → Polish
- Each user story has independent test criteria
- Dependencies clearly documented
- Parallel opportunities identified

---

## Notes

- **TDD Required**: Constitution mandates E2E tests before implementation - all test tasks must FAIL before proceeding
- **[P] tasks**: Can run in parallel (different files, no dependencies within same phase)
- **[Story] labels**: Map tasks to user stories for traceability and independent delivery
- **Backend**: NO changes required - frontend adapts to existing `/v1/generations` API
- **Commit frequency**: After each task or logical group (e.g., all tests for a story)
- **Checkpoint validation**: Stop after each phase to ensure user story works independently
- **Zero page navigation**: Critical requirement verified by E2E tests in US1
- **Animation performance**: Target 60 FPS verified in T056 performance audit
- **Recovery rate**: Target 95%+ verified by E2E tests in US4
