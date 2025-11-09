# Implementation Plan: Port V2 Generation Flow to V5

**Branch**: `005-port-v2-generation` | **Date**: 2025-11-07 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/005-port-v2-generation/spec.md`

## Summary

Port Yarda v2's proven single-page generation flow to v5, featuring suggested prompts with emojis, inline progress/results, localStorage recovery, and smooth Framer Motion animations. Integrate with v5's FastAPI backend (`/v1/generations`) while preserving all v2 UX patterns that drive user engagement.

**Primary Requirement**: Users complete entire generation flow (form → progress → results) on a single page without navigation.

**Technical Approach** (from research.md):
- Port SuperMinimal components (AddressInput, YardSelector, StyleSelector)
- Add suggested prompts system (5 per area, max 3 selections, emoji indicators)
- Implement 2-second polling with 5-minute timeout
- Add localStorage recovery for interrupted generations
- Apply Framer Motion animations with staggered delays

## Technical Context

**Language/Version**: TypeScript 5.6.3, Python 3.11+
**Primary Dependencies**:
- Frontend: Next.js 15.0.2, React 18.3.1, Framer Motion 10.18.0, Zustand 5.0.0, TailwindCSS 3.4.18
- Backend: FastAPI, asyncpg, Pydantic 2.11

**Storage**: PostgreSQL 17 (Supabase), Vercel Blob (images), localStorage (session recovery)
**Testing**: Playwright (E2E), Vitest (frontend unit), pytest (backend unit)
**Target Platform**: Web (Chrome, Firefox, Safari), Mobile-responsive
**Project Type**: Web application (frontend + backend)

**Performance Goals**:
- Visual state transitions: < 300ms (GPU-accelerated transforms)
- Suggested prompt selection: < 1 second to populate textarea
- Polling latency: 2 seconds (good responsiveness/load balance)
- Animation smoothness: 60 FPS on modern devices

**Constraints**:
- Zero page navigation during generation flow
- localStorage storage: < 5KB per generation
- Framer Motion bundle size: Already included, no additional cost
- Polling timeout: 5 minutes maximum

**Scale/Scope**:
- 3 yard areas (front_yard, back_yard, walkway)
- 5 suggested prompts per area (15 total)
- 30+ emoji keyword mappings
- Max 3 prompt selections per area
- Support 1000+ concurrent polling connections

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

### ✅ I. Component-Based Architecture
**Status**: PASS
- Using SuperMinimal component pattern (modular, reusable)
- Clear props interfaces from v2 analysis
- Self-contained components with documented purpose
- Following existing Tailwind design system

### ✅ II. Type Safety (NON-NEGOTIABLE)
**Status**: PASS
- All components have TypeScript interfaces
- Shared types in `frontend/src/types/generation.ts`
- Path aliases (@/*) already configured in v5
- Zero `any` types (explicit interfaces for all props/state)

### ✅ III. Test-First Development (NON-NEGOTIABLE)
**Status**: PASS - TDD Workflow Planned
- E2E tests will be written before implementation
- Test files: `frontend/tests/e2e/generation-flow-v2.spec.ts`
- Critical journeys: Single-page flow, suggested prompts, polling, recovery
- Red-Green-Refactor cycle will be followed

### ✅ V. State Management
**Status**: PASS
- Zustand for application state (already in v5)
- Store structure in `frontend/src/store/generationStore.ts`
- Selective persistence (form state persisted, progress transient)
- Clear separation: global (Zustand) vs component-local (useState)

### ✅ VI. API Integration
**Status**: PASS
- Centralized API service: `frontend/src/lib/api.ts` (existing)
- 5-minute timeout for generation polling (matches requirement)
- TypeScript interfaces for requests/responses
- Health check pattern already implemented in v5

### ✅ VII. Responsive Design
**Status**: PASS
- Mobile-first grid layouts (2 cols → 3 cols on desktop)
- Touch-friendly chip selections
- Responsive animations with `prefers-reduced-motion`
- Tailwind responsive classes throughout

### ✅ VIII. Authentication & Authorization
**Status**: PASS
- Supabase Auth with token validation (v5 existing)
- Backend validates tokens via dependencies
- Auth guard on /generate page (existing)
- Automatic token refresh via Zustand store

### ✅ IX. CI/CD Pipeline (NON-NEGOTIABLE)
**Status**: PASS - Will Be Verified
- E2E tests will be added to existing Playwright suite
- TypeScript type checking already in CI (GitHub Actions)
- Preview deployments via Vercel (existing)
- Production deployment gates (linting, tests, build)

**Constitution Check Result**: ✅ ALL GATES PASSED

## Project Structure

### Documentation (this feature)

```text
specs/005-port-v2-generation/
├── plan.md              # This file
├── spec.md              # Feature specification
├── research.md          # v2 architecture analysis ✅
├── data-model.md        # Phase 1 output (next)
├── quickstart.md        # Phase 1 output (next)
├── contracts/           # Phase 1 output (next)
│   └── generation-api.yaml
└── tasks.md             # Phase 2 output (/speckit.tasks command)
```

### Source Code (repository root)

```text
backend/
├── src/
│   ├── models/
│   │   └── generation.py              # Existing (may need updates)
│   ├── services/
│   │   ├── generation_service.py      # Existing
│   │   └── gemini_client.py           # Existing
│   └── api/
│       └── endpoints/
│           └── generations.py          # Existing (no changes needed)
└── tests/
    └── integration/
        └── test_generation_polling.py # New tests

frontend/
├── src/
│   ├── components/
│   │   └── generation/
│   │       ├── AddressInput.tsx                  # Existing (keep v2 simplification)
│   │       ├── SuperMinimalYardSelector.tsx      # New (port from v2)
│   │       ├── SuperMinimalStyleSelector.tsx     # New (port from v2)
│   │       ├── SuggestedPromptChip.tsx          # New
│   │       ├── GenerationProgressInline.tsx      # New (replace separate page)
│   │       └── GenerationResultsInline.tsx       # New (replace separate page)
│   ├── pages/
│   │   └── generate.tsx                          # Major refactor (single-page flow)
│   ├── store/
│   │   └── generationStore.ts                    # Refactor (add suggested prompts state)
│   ├── types/
│   │   └── generation.ts                         # Extend (add suggested prompts types)
│   └── lib/
│       ├── api.ts                                 # Update (add polling helper)
│       └── suggested-prompts.ts                   # New (emoji mappings + prompts data)
└── tests/
    └── e2e/
        ├── generation-flow-v2.spec.ts             # New (primary test suite)
        ├── suggested-prompts.spec.ts              # New
        └── generation-recovery.spec.ts            # New (localStorage tests)
```

**Structure Decision**: Web application with existing backend/frontend separation. Frontend changes are isolated to `components/generation/`, `pages/generate.tsx`, and `store/generationStore.ts`. Backend endpoints remain unchanged - frontend adapts to existing v5 API.

## Complexity Tracking

> No constitution violations. This section intentionally left blank.

---

## Phase 0: Research ✅ COMPLETE

**Output**: [research.md](./research.md) - 10 sections covering:
1. Component patterns (SuperMinimal family)
2. Suggested prompts system (5 per area, max 3, emojis)
3. Polling strategy (2s interval, 5min timeout)
4. localStorage recovery (save on submit, clear on completion)
5. Framer Motion animations (stagger, expand, select)
6. v5 backend integration (FastAPI adapter)
7. State management strategy (Zustand with selective persistence)
8. Technology stack decisions
9. Risk mitigation
10. Implementation checklist

**Key Decisions Made**:
- Use emoji icons instead of lucide-react SVG components
- Port SuperMinimal component pattern from v2
- 2-second polling with 5-minute timeout
- localStorage stores: request_id, areas, address (< 500 bytes)
- Framer Motion animations with 0.1s stagger delays

---

## Phase 1: Design & Contracts

### Phase 1.1: Data Model

**Output**: [data-model.md](./data-model.md) (to be generated)

**Key Entities** (from spec.md):
1. **Yard Area** - Front yard, back yard, walkway with prompts
2. **Style** - Landscape design styles with selection order
3. **Generation Request** - Active or completed generation
4. **Suggested Prompt** - Pre-defined prompt options with emojis
5. **Area Result** - Generation output per yard area

### Phase 1.2: API Contracts

**Output**: `contracts/generation-api.yaml` (to be generated)

**Endpoints** (existing v5 endpoints, no changes):
- `POST /v1/generations` - Create generation
- `GET /v1/generations/{id}` - Poll generation status

**Contract Focus**:
- Request/response TypeScript interfaces
- Polling response structure
- Error handling formats

### Phase 1.3: Quickstart Guide

**Output**: [quickstart.md](./quickstart.md) (to be generated)

**Covers**:
- Local development setup
- Running single-page generation flow
- Testing suggested prompts
- Testing localStorage recovery
- E2E test execution

---

## Phase 2: Task Breakdown

**Command**: `/speckit.tasks` (separate command, not part of /speckit.plan)

**Output**: [tasks.md](./tasks.md) - Dependency-ordered implementation tasks

**Estimated Task Categories**:
1. Component porting (SuperMinimal family)
2. Suggested prompts system
3. Single-page flow refactor
4. Polling and recovery logic
5. E2E tests for all user stories
6. Documentation updates (CLAUDE.md)

---

## Post-Phase 1 Constitution Re-check

*To be completed after data-model.md and contracts/ are generated.*

**Expected Result**: All gates continue to pass. No new violations introduced by detailed design.

---

## Next Steps

1. ✅ Phase 0 complete - research.md generated
2. ⏳ Phase 1.1 - Generate data-model.md
3. ⏳ Phase 1.2 - Generate contracts/generation-api.yaml
4. ⏳ Phase 1.3 - Generate quickstart.md
5. ⏳ Phase 1.4 - Update `.claude/CLAUDE.md` with new components
6. ⏳ Post-Phase 1 Constitution re-check
7. → User runs `/speckit.tasks` to generate tasks.md

---

**Planning Status**: Phase 0 complete, proceeding to Phase 1
