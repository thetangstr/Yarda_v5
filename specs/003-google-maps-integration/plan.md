# Implementation Plan: Google Maps Property Image Integration

**Branch**: `003-google-maps-integration` | **Date**: 2025-11-04 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `/specs/003-google-maps-integration/spec.md`

**Note**: This template is filled in by the `/speckit.plan` command. See `.specify/templates/commands/plan.md` for the execution workflow.

## Summary

Implement automatic property imagery retrieval from Google Maps APIs when users don't manually upload images for landscape generation. The system will fetch Street View imagery for front yards (highest priority) and Satellite imagery for other areas (back yard, side yard, full property). If image retrieval fails, the system must automatically refund deducted credits/tokens and preserve user form data for manual upload retry. Quality enhancement techniques will be applied during generation to handle low-resolution imagery without pre-validation rejection.

## Technical Context

**Language/Version**: Python 3.11+ (backend), TypeScript 5.x (frontend)
**Primary Dependencies**:
- Backend: FastAPI, Google Maps Platform (Street View Static API, Maps Static API), asyncio
- Frontend: React 18+, TypeScript, Tailwind CSS, Zustand
**Storage**: PostgreSQL (Supabase) for generation tracking, image source metadata
**Testing**: pytest (backend unit/integration), Playwright (E2E)
**Target Platform**: Web application (Linux backend server, modern browsers for frontend)
**Project Type**: Web application with backend API and frontend React app
**Performance Goals**:
- Image retrieval: < 10 seconds from address submission to imagery obtained
- Refund processing: < 5 seconds
- API success rate: 80%+ for valid residential addresses in covered areas
**Constraints**:
- Google Maps API quota limits (monitor usage)
- Payment must be deducted BEFORE API calls (prevent fraud)
- Zero permanently lost credits/tokens (all failures must refund)
**Scale/Scope**:
- Support all landscape areas (front_yard, back_yard, side_yard, full_property)
- Handle 3 payment methods (trial credits, tokens, subscription)
- Track image source for analytics (user_upload, google_street_view, google_satellite)

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

### Evaluated Against Constitution v1.1.0

#### I. Component-Based Architecture ✅ PASS
- **Backend**: New `MapsService` class for Google Maps integration (self-contained, single responsibility)
- **Frontend**: Existing `generate.tsx` page already supports optional image upload (no changes needed per FR-012)
- **Modularity**: Service layer pattern maintained

#### II. Type Safety (NON-NEGOTIABLE) ✅ PASS
- **Backend**: Python type hints required for all new functions (address validation, image retrieval, refund logic)
- **Frontend**: TypeScript interfaces already exist for generation requests (no breaking changes)
- **Shared Types**: ImageSource enum to be added: `"user_upload" | "google_street_view" | "google_satellite"`

#### III. Test-First Development (NON-NEGOTIABLE) ⚠️ CONDITIONAL PASS
- **Requirement**: TDD with Playwright E2E tests BEFORE implementation
- **Status**: E2E tests already documented in previous session (E2E_API_TESTING_REPORT.md)
- **Action Required**: Write E2E tests for Google Maps integration BEFORE backend implementation
- **Test Scenarios**:
  1. Front yard generation without image → Street View retrieval → success
  2. Back yard generation without image → Satellite retrieval → success
  3. No imagery available → refund triggered → error message displayed
  4. Manual upload provided → Google Maps skipped → user image used

#### V. State Management ✅ PASS
- **No new frontend state required** - existing generation form state sufficient
- **Backend**: Image source tracked in generations table (already designed in spec)

#### VI. API Integration ✅ PASS
- **New Service**: `MapsService` class to encapsulate Google Maps API calls
- **Error Handling**: Try-catch blocks for API failures, rate limiting, timeouts
- **Health Checks**: Monitor Google Maps API availability (FR-010 logging requirement)

#### VII. Responsive Design ✅ PASS
- **No UI changes required** - image upload already optional in form
- **Error messages**: Must be mobile-friendly (toast notifications or inline errors)

#### VIII. Authentication & Authorization ✅ PASS
- **Existing Flow**: User must be verified before generation (already implemented)
- **Payment Check**: Authorization hierarchy already working (subscription > trial > token)
- **No changes to auth logic**

#### IX. CI/CD Pipeline (NON-NEGOTIABLE) ✅ PASS
- **E2E Tests**: New Playwright tests for Google Maps integration must be added to CI
- **Backend Tests**: pytest unit tests for MapsService, address validation, refund logic
- **Quality Gates**: All existing gates apply (type checking, linting, test coverage)

### Constitution Violations

**NONE** - All principles satisfied with existing architecture.

### Pre-Implementation Checklist

- [ ] Phase 0: Research Google Maps APIs (Street View Static, Maps Static, Geocoding)
- [ ] Phase 0: Document API authentication approach (API key, request signing)
- [ ] Phase 1: Design MapsService class interface and methods
- [ ] Phase 1: Design data model changes (image_source field in generations table)
- [ ] Phase 1: Write E2E tests BEFORE backend implementation (TDD requirement)
- [ ] Phase 2: Implement backend MapsService integration
- [ ] Phase 2: Update generation endpoint to support optional image
- [ ] Phase 2: Verify all tests pass (E2E, unit, integration)

## Project Structure

### Documentation (this feature)

```text
specs/003-google-maps-integration/
├── spec.md              # Feature specification
├── plan.md              # This file (/speckit.plan command output)
├── research.md          # Phase 0 output (Google Maps API research)
├── data-model.md        # Phase 1 output (database schema changes)
├── quickstart.md        # Phase 1 output (developer guide)
├── contracts/           # Phase 1 output (API contracts)
│   └── maps-service.yaml   # MapsService interface spec
└── checklists/
    └── requirements.md  # Spec quality validation (already complete)
```

### Source Code (repository root)

```text
backend/
├── src/
│   ├── api/endpoints/
│   │   └── generations.py        # [MODIFY] Make image parameter optional (FR-012)
│   ├── services/
│   │   ├── maps_service.py       # [NEW] Google Maps integration service
│   │   ├── trial_service.py      # [EXISTING] Trial credit refunds
│   │   └── token_service.py      # [EXISTING] Token refunds
│   ├── models/
│   │   └── generation.py         # [MODIFY] Add image_source field
│   └── config.py                 # [MODIFY] Add Google Maps API key
└── tests/
    ├── unit/
    │   ├── test_maps_service.py     # [NEW] Unit tests for MapsService
    │   └── test_address_validation.py  # [NEW] Address validation tests
    └── integration/
        └── test_maps_integration.py  # [NEW] Google Maps API integration tests

frontend/
├── src/
│   ├── pages/
│   │   └── generate.tsx          # [NO CHANGE] Already supports optional image upload
│   └── types/
│       └── index.ts              # [MODIFY] Add ImageSource type
└── tests/e2e/
    └── google-maps-integration.spec.ts  # [NEW] E2E tests (TDD requirement)
```

**Structure Decision**: Web application structure (Option 2) - Existing backend + frontend architecture. This feature adds a new backend service (`MapsService`) and modifies the generation endpoint to support optional image uploads with automatic Google Maps fallback. Frontend requires minimal changes (type definitions only) as the optional image upload UI already exists per the E2E testing session findings.

## Complexity Tracking

**No complexity violations** - This feature aligns with existing architecture patterns:
- Service layer pattern (MapsService follows same structure as TrialService, TokenService)
- Optional parameters (image upload already designed as optional in frontend)
- Error handling and refunds (existing refund logic in payment services can be reused)
- Type safety maintained (Python type hints, TypeScript interfaces)
