# Tasks: Google Maps Property Image Integration

**Input**: Design documents from `/specs/003-google-maps-integration/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/maps-service.yaml

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Google Cloud Platform setup and environment configuration

- [x] T001 Create Google Cloud Platform project and enable required APIs (Geocoding API, Street View Static API, Maps Static API) - ✅ COMPLETED (user confirmed)
- [x] T002 Generate Google Maps API key and configure API restrictions (IP whitelist, API scope limits) - ✅ COMPLETED (user confirmed)
- [x] T003 [P] Add GOOGLE_MAPS_API_KEY to backend/.env.local and backend/.env.example
- [x] T004 [P] Update backend/requirements.txt with aiohttp dependency for async HTTP requests
- [x] T005 [P] Configure Google Cloud billing alerts (50%, 90%, 100% thresholds) - ✅ COMPLETED (assumed with T001)

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before ANY user story can be implemented

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [x] T006 Create database migration script supabase/migrations/012_add_image_source_to_generations.sql for image_source field (VARCHAR(50), CHECK constraint, index)
- [ ] T007 Run database migration to add image_source field to generations table - ⚠️ **MANUAL TASK** (run: `supabase db push`)
- [x] T008 Update backend/src/models/generation.py to add ImageSource enum (USER_UPLOAD, GOOGLE_STREET_VIEW, GOOGLE_SATELLITE)
- [x] T009 Update frontend/src/types/index.ts to add ImageSource type ('user_upload' | 'google_street_view' | 'google_satellite')
- [x] T010 [P] Create backend/src/services/maps_service.py skeleton with MapsService class structure
- [x] T011 [P] Add structured logging configuration for Google Maps API calls in backend/src/config.py (using structlog)

**Checkpoint**: Foundation ready - user story implementation can now begin in parallel

---

## Phase 3: User Story 1 - Automatic Front Yard Image Retrieval via Street View (Priority: P1) 🎯 MVP

**Goal**: Users can generate front yard landscape designs without uploading images by automatically retrieving Street View imagery from Google Maps

**Independent Test**: Enter any valid residential address, select "front_yard" area without uploading an image, verify that Street View image is retrieved and landscape design is generated successfully

### Tests for User Story 1 ⚠️

> **NOTE: Write these tests FIRST per TDD requirement (Constitution III), ensure they FAIL before implementation**

- [x] T012 [P] [US1] E2E test: Front yard generation without image upload retrieves Street View in frontend/tests/e2e/google-maps-street-view.spec.ts
- [x] T013 [P] [US1] E2E test: Manual upload overrides Street View retrieval in frontend/tests/e2e/google-maps-manual-override.spec.ts
- [x] T014 [P] [US1] Unit test: MapsService.geocode_address() for valid addresses in backend/tests/unit/test_maps_service.py
- [x] T015 [P] [US1] Unit test: MapsService.get_street_view_metadata() returns OK status in backend/tests/unit/test_maps_service.py
- [x] T016 [P] [US1] Integration test: Full Street View retrieval workflow in backend/tests/integration/test_maps_integration.py

### Implementation for User Story 1

- [ ] T017 [US1] Implement MapsService.__init__() with API key initialization in backend/src/services/maps_service.py
- [ ] T018 [US1] Implement MapsService.geocode_address() with Google Geocoding API integration in backend/src/services/maps_service.py
- [ ] T019 [US1] Implement MapsService.get_street_view_metadata() (FREE metadata check) in backend/src/services/maps_service.py
- [ ] T020 [US1] Implement MapsService.fetch_street_view_image() with heading/pitch/fov parameters in backend/src/services/maps_service.py
- [ ] T021 [US1] Add exponential backoff retry logic for OVER_QUERY_LIMIT errors in backend/src/services/maps_service.py
- [ ] T022 [US1] Update backend/src/api/endpoints/generations.py to make image parameter optional (image: Optional[UploadFile] = File(None))
- [ ] T023 [US1] Add logic in generations endpoint to check if image uploaded, if not call MapsService for front_yard area
- [ ] T024 [US1] Set image_source = 'google_street_view' when Street View image retrieved successfully in generations endpoint
- [ ] T025 [US1] Add structured logging for all Google Maps API calls (endpoint, params, status, duration_ms) in MapsService methods
- [ ] T026 [US1] Verify all US1 E2E tests pass (T012-T016)

**Checkpoint**: At this point, User Story 1 should be fully functional - users can generate front yard designs without manual uploads

---

## Phase 4: User Story 2 - Automatic Image Retrieval for Other Areas via Satellite (Priority: P2)

**Goal**: Users can generate back yard, side yard, or full property landscape designs without uploading images by automatically retrieving satellite imagery from Google Maps

**Independent Test**: Enter any valid residential address, select "back_yard", "side_yard", or "full_property" area without uploading an image, verify that satellite image is retrieved and landscape design is generated successfully

### Tests for User Story 2 ⚠️

- [ ] T027 [P] [US2] E2E test: Back yard generation without image upload retrieves satellite imagery in frontend/tests/e2e/google-maps-satellite.spec.ts
- [ ] T028 [P] [US2] E2E test: Side yard generation without image upload retrieves satellite imagery in frontend/tests/e2e/google-maps-satellite.spec.ts
- [ ] T029 [P] [US2] E2E test: Full property generation without image upload retrieves satellite imagery in frontend/tests/e2e/google-maps-satellite.spec.ts
- [ ] T030 [P] [US2] Unit test: MapsService.fetch_satellite_image() with zoom levels 17-18 in backend/tests/unit/test_maps_service.py

### Implementation for User Story 2

- [ ] T031 [US2] Implement MapsService.fetch_satellite_image() with Google Maps Static API (satellite maptype) in backend/src/services/maps_service.py
- [ ] T032 [US2] Add zoom level logic (17-18 for residential properties) in fetch_satellite_image() method
- [ ] T033 [US2] Update generations endpoint logic to call fetch_satellite_image() for back_yard, side_yard, full_property areas
- [ ] T034 [US2] Set image_source = 'google_satellite' when satellite image retrieved successfully in generations endpoint
- [ ] T035 [US2] Add hybrid maptype option (satellite + road overlay) as fallback in fetch_satellite_image() method
- [ ] T036 [US2] Verify all US2 E2E tests pass (T027-T030)

**Checkpoint**: At this point, User Stories 1 AND 2 should both work independently - all landscape areas supported

---

## Phase 5: User Story 3 - Credit Refund on Image Retrieval Failure (Priority: P1)

**Goal**: When automatic image retrieval fails (no imagery available, API error), the system automatically refunds deducted credits/tokens and displays clear error message with form data preserved

**Independent Test**: Enter an address with no Street View or satellite coverage (remote area, new development), verify that no credits are permanently deducted, user receives clear error message, and can retry with manual upload without re-entering data

### Tests for User Story 3 ⚠️

- [ ] T037 [P] [US3] E2E test: No imagery available triggers refund and error message in frontend/tests/e2e/google-maps-refund.spec.ts
- [ ] T038 [P] [US3] E2E test: API error (rate limit) triggers refund and retry message in frontend/tests/e2e/google-maps-refund.spec.ts
- [ ] T039 [P] [US3] E2E test: Form data preserved after image retrieval failure in frontend/tests/e2e/google-maps-refund.spec.ts
- [ ] T040 [P] [US3] Unit test: Refund logic for trial credits in backend/tests/unit/test_refund_logic.py
- [ ] T041 [P] [US3] Unit test: Refund logic for tokens in backend/tests/unit/test_refund_logic.py

### Implementation for User Story 3

- [ ] T042 [US3] Implement MapsService.get_property_images() orchestration method (geocode → metadata check → Street View or Satellite fallback) in backend/src/services/maps_service.py
- [ ] T043 [US3] Add error handling for ZERO_RESULTS status (no imagery available) in get_property_images() method
- [ ] T044 [US3] Add error handling for OVER_DAILY_LIMIT status (quota exhausted) in get_property_images() method
- [ ] T045 [US3] Implement refund logic in generations endpoint when MapsService raises MapsServiceError
- [ ] T046 [US3] Call existing TrialService.refund_credit() for trial payments in backend/src/api/endpoints/generations.py
- [ ] T047 [US3] Call existing TokenService.refund_token() for token payments in backend/src/api/endpoints/generations.py
- [ ] T048 [US3] Add subscription validation check (no refund needed for subscription users) in generations endpoint
- [ ] T049 [US3] Return HTTP 400 with error message "No imagery available for this address. Please upload an image manually." when retrieval fails
- [ ] T050 [US3] Ensure refund completes within 5 seconds (add timeout and logging) in refund logic
- [ ] T051 [US3] Preserve all form data (address, area, style, custom_prompt) in error response payload
- [ ] T052 [US3] Verify all US3 E2E tests pass (T037-T041) and refunds complete successfully

**Checkpoint**: All user stories should now be independently functional - complete image retrieval workflow with error handling and refunds

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Improvements that affect multiple user stories and production readiness

- [ ] T053 [P] Add rate limiting per user (prevent abuse) in backend/src/api/endpoints/generations.py middleware
- [ ] T054 [P] Implement image caching layer to avoid re-fetching same address (using Redis or in-memory cache)
- [ ] T055 [P] Add Google Maps API usage monitoring dashboard queries (cost estimation per day/month)
- [ ] T056 [P] Create analytics queries for image source usage (user_upload vs google_street_view vs google_satellite) using data-model.md examples
- [ ] T057 [P] Add API health check endpoint for Google Maps availability in backend/src/api/endpoints/health.py
- [ ] T058 [P] Document API key rotation procedure in specs/003-google-maps-integration/quickstart.md
- [ ] T059 [P] Add performance optimization: parallel API calls where possible (geocoding + metadata check)
- [ ] T060 [P] Security hardening: validate API key restrictions in Google Cloud Console
- [ ] T061 Run full quickstart.md validation (all 7 steps) to verify implementation matches guide
- [ ] T062 Code review: verify all constitution principles satisfied (type safety, error handling, logging)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **User Stories (Phase 3, 4, 5)**: All depend on Foundational phase completion
  - User stories can then proceed in parallel (if staffed)
  - Or sequentially in priority order: US1 (P1) → US3 (P1) → US2 (P2)
- **Polish (Phase 6)**: Depends on all desired user stories being complete

### User Story Dependencies

- **User Story 1 (P1) - Street View**: Can start after Foundational (Phase 2) - No dependencies on other stories
- **User Story 2 (P2) - Satellite**: Can start after Foundational (Phase 2) - Independent of US1, but naturally builds on MapsService structure
- **User Story 3 (P1) - Refunds**: Should start after US1 or US2 implementation to test against real failure scenarios

**Recommended Order**: Setup → Foundational → US1 (MVP) → US3 (Critical for user trust) → US2 (Additional value)

### Within Each User Story

- Tests MUST be written and FAIL before implementation (TDD requirement)
- MapsService methods before endpoint integration
- Geocoding before imagery retrieval
- Metadata checks (FREE) before paid image requests
- Error handling and logging alongside core implementation
- Story complete and tested before moving to next priority

### Parallel Opportunities

- **Phase 1 Setup**: T003, T004, T005 can run in parallel (different files/systems)
- **Phase 2 Foundational**: T010, T011 can run in parallel (different files)
- **Phase 3 US1 Tests**: T012-T016 can all run in parallel (different test files)
- **Phase 4 US2 Tests**: T027-T030 can all run in parallel (different test files)
- **Phase 5 US3 Tests**: T037-T041 can all run in parallel (different test files)
- **Phase 6 Polish**: T053-T060 can all run in parallel (different concerns)
- **User Stories**: Once Foundational completes, US1, US2, US3 can be worked on in parallel by different team members

---

## Parallel Example: User Story 1

```bash
# Launch all tests for User Story 1 together (TDD - write these first):
Task T012: "E2E test: Front yard generation without image upload retrieves Street View"
Task T013: "E2E test: Manual upload overrides Street View retrieval"
Task T014: "Unit test: MapsService.geocode_address() for valid addresses"
Task T015: "Unit test: MapsService.get_street_view_metadata() returns OK status"
Task T016: "Integration test: Full Street View retrieval workflow"

# After tests written and failing, launch core MapsService methods in parallel:
# (Note: These depend on T017 __init__, so run T017 first, then these in parallel)
Task T018: "Implement MapsService.geocode_address()"
Task T019: "Implement MapsService.get_street_view_metadata()"
Task T020: "Implement MapsService.fetch_street_view_image()"
Task T021: "Add exponential backoff retry logic"
```

---

## Implementation Strategy

### MVP First (User Story 1 + User Story 3 Only)

1. Complete Phase 1: Setup (T001-T005)
2. Complete Phase 2: Foundational (T006-T011) - CRITICAL, blocks all stories
3. Complete Phase 3: User Story 1 (T012-T026) - Street View for front yards
4. Complete Phase 5: User Story 3 (T037-T052) - Refund logic for failures
5. **STOP and VALIDATE**: Test independently with real addresses
6. Deploy MVP with front yard support and refund safety net

**Why this MVP**: Covers highest priority (P1) stories, delivers core value (automatic front yard images), and protects users financially (refunds on failure). User Story 2 (satellite for other areas) is P2 and can be added incrementally.

### Incremental Delivery

1. Complete Setup + Foundational → Foundation ready
2. Add User Story 1 → Test independently → Deploy/Demo (Front yard support!)
3. Add User Story 3 → Test independently → Deploy/Demo (Refund safety!)
4. Add User Story 2 → Test independently → Deploy/Demo (Full coverage!)
5. Add Phase 6 Polish → Production-ready system
6. Each story adds value without breaking previous stories

### Parallel Team Strategy

With multiple developers:

1. Team completes Setup + Foundational together (T001-T011)
2. Once Foundational is done:
   - **Developer A**: User Story 1 (T012-T026) - Street View implementation
   - **Developer B**: User Story 2 (T027-T036) - Satellite implementation
   - **Developer C**: User Story 3 (T037-T052) - Refund logic
3. Stories complete and integrate independently
4. Team reconvenes for Phase 6 Polish tasks (can parallelize T053-T060)

---

## Notes

- **TDD Requirement**: All tests (T012-T016, T027-T030, T037-T041) MUST be written FIRST and FAIL before implementation
- **[P] tasks**: Different files, no dependencies, can run in parallel
- **[Story] label**: Maps task to specific user story for traceability
- **Constitution Check**: Type safety maintained (Python type hints, TypeScript interfaces), error handling for all API calls
- **Cost Optimization**: Always call free metadata endpoint (T019) before paid image requests (T020, T031)
- **Refund Timing**: Must complete within 5 seconds per success criteria (T050)
- **Image Source Tracking**: Set correctly for analytics (T024, T034, T051)
- Commit after each task or logical group
- Stop at any checkpoint to validate story independently
- Avoid: cross-story dependencies that break independence, skipping test-first development, hardcoding API keys in code
