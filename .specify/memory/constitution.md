<!--
SYNC IMPACT REPORT
==================
Version Change: 1.0.0 → 1.1.0 (MINOR)

Reason for Bump:
- New principle added (CI/CD Pipeline) - materially expands governance with comprehensive deployment strategy

Modified Principles:
- NONE (existing principles unchanged)

Added Sections:
- IX. CI/CD Pipeline (NON-NEGOTIABLE) - Complete automated pipeline strategy including:
  * 5-stage automated testing (linting, unit, integration, E2E, security)
  * 3 deployment workflows (preview, production, rollback)
  * 5 quality gates (code, testing, security, performance, documentation)
  * Environment management strategy
  * Monitoring & observability (4-layer stack)
  * DORA metrics (Elite tier performance)
  * Disaster recovery (RPO/RTO objectives)
  * Automated development pipeline (Feature 011+)

Removed Sections:
- NONE

Templates Requiring Updates:
- ✅ `.specify/templates/plan-template.md` - Should include CI/CD verification checklist
- ✅ `.specify/templates/spec-template.md` - Should reference deployment strategy requirements
- ✅ `.specify/templates/tasks-template.md` - Should include CI/CD task categories
- ✅ `CLAUDE.md` - Already has comprehensive CI/CD documentation (synced)
- ✅ `doc/PRD_Yarda_AI_Landscape_Studio.md` - Already has CI/CD requirements section

Follow-up TODOs:
- NONE - All placeholders filled

Last Updated: 2025-10-28
-->

# Yarda AI Landscape Studio Constitution

## Core Principles

### I. Component-Based Architecture
Every feature is built as modular, reusable components following React best practices. Components must be:
- Self-contained with clear props interfaces
- Independently testable
- Documented with clear purpose
- Following the existing design system (SuperMinimal components for UI consistency)

### II. Type Safety (NON-NEGOTIABLE)
TypeScript is mandatory across the entire codebase:
- All components must have proper TypeScript interfaces
- Shared types defined in `types/index.ts` or feature-specific type files
- Path aliases (`@/*` maps to `src/*`) must be used
- No `any` types except where absolutely necessary with justification

### III. Test-First Development (NON-NEGOTIABLE)
TDD mandatory using Playwright for E2E tests:
- Tests written → User approved → Tests fail → Then implement
- Red-Green-Refactor cycle strictly enforced
- All new features require E2E tests in `frontend/tests/e2e/`
- Critical user journeys must be tested


### V. State Management
Zustand for application state with localStorage persistence:
- Store structure defined in `frontend/src/store/`
- Selective persistence (only necessary data)
- Clear separation between global and component-local state

### VI. API Integration
Backend communication via centralized API service:
- All API calls through `frontend/src/services/api.ts`
- Proper error handling and timeout management (5-minute timeout for long operations)
- TypeScript interfaces for all request/response types
- Health checks for backend availability

### VII. Responsive Design
Mobile-first responsive design using Tailwind CSS:
- All components must work on mobile, tablet, and desktop
- Touch-friendly interactions
- Performance optimized for mobile networks

### VIII. Authentication & Authorization
Firebase Auth with whitelist enforcement:
- Backend validates tokens via `auth.py` middleware
- Whitelisted users only (managed in `backend/auth.py`)
- Admin routes protected with role checks
- Automatic token refresh handling

### IX. CI/CD Pipeline (NON-NEGOTIABLE)
Fully automated CI/CD pipeline with multi-environment deployment:

**Pipeline Architecture:**
- **Source Control**: GitHub with branch protection (master requires passing checks)
- **CI Platform**: GitHub Actions (`.github/workflows/`)
- **Deployment Platform**: Vercel (preview + production)
- **Test Automation**: Playwright (E2E), pytest (backend), Vitest (frontend unit)

**Automated Testing Stages:**
1. **Linting & Type Checking** (2-3 min)
   - ESLint (frontend), Ruff (backend)
   - TypeScript type checking (strict mode, 0 errors)
   - Python type hints (mypy)

2. **Unit Tests** (3-5 min)
   - Frontend: Vitest with 80%+ coverage
   - Backend: pytest with 80%+ coverage (90%+ for critical modules like token_service_pg.py)
   - Coverage reports to Codecov

3. **Integration Tests** (5-7 min)
   - PostgreSQL service (docker)
   - API contract validation
   - Database migration tests

4. **E2E Tests** (8-12 min)
   - Playwright critical user journeys
   - Visual regression testing
   - Cross-browser compatibility (Chrome, Firefox, Safari)

5. **Security Scanning** (3-5 min)
   - Dependency vulnerability check (npm audit, safety)
   - SAST scanning (Semgrep)
   - Secret detection

**Deployment Workflows:**

1. **Pull Request Preview**
   - Automatic Vercel preview deployment on PR open/sync
   - Automated UAT tests with Playwright MCP browser automation
   - Results posted as PR comment with manual testing instructions
   - Preview URL: `https://yard-web-app-<hash>.vercel.app`

2. **Production Deployment**
   - Triggered on push to `master` branch
   - All CI checks must pass (hard requirement)
   - Zero-downtime deployment via Vercel blue-green strategy
   - Post-deployment smoke tests (health checks, critical flows)
   - Automated monitoring for 15 minutes post-deploy

3. **Rollback Procedure**
   - Automatic rollback if error rate > 5% within 15 min
   - Manual rollback via GitHub: revert commit + push
   - Rollback time target: < 2 minutes
   - Previous deployment always retained (Vercel keeps last 100)

**Quality Gates (Must Pass):**
1. **Code Quality** (HARD FAIL)
   - TypeScript: 0 errors
   - ESLint: 0 errors (warnings acceptable)
   - Build: Must succeed

2. **Testing** (HARD FAIL)
   - Unit tests: 100% pass, 80%+ coverage
   - Integration tests: 100% pass
   - E2E critical flows: 100% pass
   - No flaky tests (3+ consecutive passes required)

3. **Security** (HARD FAIL)
   - No high/critical dependency vulnerabilities
   - No exposed secrets in code
   - SAST scan clean

4. **Performance** (HARD FAIL for Production)
   - Build size: < 5MB gzipped
   - Lighthouse score: ≥ 90 performance
   - Database queries: < 100ms p95

5. **Documentation** (SHOULD PASS, can override with approval)
   - API changes documented in CLAUDE.md
   - Breaking changes in CHANGELOG.md
   - New features have user-facing docs

**Environment Management:**
- **Development**: Local `.env.local` (not committed)
- **Preview**: Vercel preview environment (test/dev variables)
- **Production**: Vercel production environment (live keys)
- **Secrets**: GitHub Secrets + Vercel Environment Variables
- **Variable Validation**: Pre-deployment script checks all required variables

**Monitoring & Observability:**
- **Application**: Vercel Analytics + custom logging
- **Database**: Supabase dashboard + query performance logs
- **Business Metrics**: Token purchases, generation success rate, error rates
- **External Services**: Gemini API health, Stripe webhook status, Firebase Auth uptime
- **Alerting**: PagerDuty for critical issues (> 5% error rate, complete outage)

**Deployment Metrics (DORA):**
- **Deployment Frequency**: 10+/week (Elite tier) ✅
- **Lead Time**: < 30 min commit→production (Elite tier) ✅
- **MTTR**: < 15 min detection→resolution (Elite tier) ✅
- **Change Failure Rate**: < 5% (Elite tier) ✅

**Disaster Recovery:**
- **Database Backups**: Daily automated (Supabase), 30-day retention
- **RPO (Recovery Point Objective)**: 24 hours
- **RTO (Recovery Time Objective)**: 4 hours
- **Deployment History**: Last 100 deployments retained (Vercel)
- **Backup Restoration**: Weekly restore test to verify integrity

**Automated Development Pipeline (Feature 011+):**
- `/auto-pipeline` - Full requirement to production (30 min automated)
- `/auto-develop REQ-123` - Generate spec + implement + test (20 min)
- `/deploy-uat` - Deploy to preview + run UAT tests (8 min)
- `/uat` - Browser-based testing with auto-fix (5 min)
- `/approve-production REQ-123` - Human approval gate (1 min manual)
- `/deploy-production` - Deploy to production + monitoring (5 min)

## Technical Standards

### Frontend Stack
- **Framework**: React 18+ with TypeScript
- **Build Tool**: Vite
- **Styling**: Tailwind CSS
- **State**: Zustand with localStorage persistence
- **Routing**: React Router v6
- **Testing**: Playwright for E2E
- **Animation**: Framer Motion
- **UI Feedback**: react-hot-toast

### Backend Stack
- **Framework**: FastAPI (Python 3.11+)
- **AI**: Google Gemini 2.5 Flash Image Preview SDK
- **Authentication**: Firebase Admin SDK
- **Database**: Firestore
- **Async**: AsyncIO with executor-based streaming
- **API Docs**: Auto-generated via FastAPI

### Code Quality Gates
- TypeScript type checking must pass (`npm run typecheck`)
- ESLint rules must pass (`npm run lint`)
- Playwright tests must pass (`npm run test`)
- Production build must succeed (`npm run build`)
- Backend must start without errors (`python main.py`)

### File Organization
```
frontend/src/
├── components/        # Reusable React components
├── pages/            # Route pages
├── services/         # API integration
├── contexts/         # React contexts (Auth, etc.)
├── store/            # Zustand state management
├── types/            # TypeScript definitions
└── lib/              # Utilities (firebase, etc.)

backend/
├── main.py           # FastAPI entry point
├── auth.py           # Firebase Auth middleware
├── *_service.py      # Specialized services
└── config.py         # Configuration
```

## Development Workflow

### Branch Strategy
- Feature branches: `###-feature-name` format
- All development via feature branches
- Merge to `master` after UAT approval

### Testing Requirements
1. Unit tests for utility functions (if applicable)
2. **E2E tests for all user journeys (mandatory)**
3. Browser-based UAT testing with Playwright MCP
4. Zero console errors requirement for UAT approval

### Deployment Process
1. Development → Local testing
2. UAT Deployment → Automated testing → Error fixing → Retest
3. Human approval review
4. Production deployment → Health monitoring
5. Rollback available if issues detected

### Performance Standards
- Page load: < 3 seconds on 3G
- First Contentful Paint: < 1 second
- Time to Interactive: < 3 seconds
- Backend API response: < 2 seconds (excluding AI generation)
- AI generation timeout: 5 minutes maximum

### Security Requirements
- All API endpoints require authentication (except `/api/health`, `/api/styles`)
- Firebase tokens validated on every request
- User data encrypted at rest (Firestore default)
- No sensitive data in client-side code
- CORS properly configured for production domains

## Governance

### Constitution Supremacy
This constitution supersedes all other coding practices. When conflicts arise, constitution rules take precedence.

### Amendments
Constitution changes require:
1. Documentation of rationale
2. Impact analysis on existing features
3. Migration plan for affected code
4. Approval before merging

### Complexity Justification
Any deviation from these principles must include:
- Clear business justification
- Technical rationale
- Risk assessment
- Approval from technical lead

### Code Review Requirements
All PRs must:
1. Verify TypeScript compilation
2. Pass all tests
3. Follow component structure
4. Include proper error handling
5. Update documentation if needed

**Version**: 1.1.0 | **Ratified**: 2025-10-05 | **Last Amended**: 2025-10-28
