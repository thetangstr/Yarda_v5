# Yarda AI - Test Strategy & CI/CD Pipeline

**Version:** 3.0
**Last Updated:** 2025-11-13
**Status:** ACTIVE - Production Ready
**Owner:** Engineering Team

---

## 🎯 Testing Philosophy

**Core Principles:**
1. **Automated Everything** - Every test executed by agents via Playwright MCP
2. **No Manual Testing** - Except final UX/design review (also agent-assisted)
3. **Fast Feedback** - Tests run in parallel, fail fast, auto-fix
4. **Environment-Aware** - Local → Staging → Production with approval gates
5. **CUJ-First** - Test user journeys, not just features
6. **Shift-Left** - Catch issues early in development

---

## 🏗️ Test Architecture

### Layer 1: Unit Tests (< 30 seconds)
**Purpose:** Test individual functions/components in isolation
**Tools:** pytest (backend), vitest (frontend)
**Coverage:** Core business logic, API endpoints, services
**Agent:** Backend tests run automatically, reviewed by team

### Layer 2: Integration Tests (< 2 minutes)
**Purpose:** Test service interactions, database state, atomic operations
**Tools:** pytest with real database (backend), Playwright with real API (frontend)
**Coverage:** Credit deduction, payment webhooks, auth flows
**Status:** ⚠️ Needs implementation (see TEST_REVIEW.md)

### Layer 3: E2E Tests (< 10 minutes)
**Purpose:** Test complete user journeys (CUJs) with real backend
**Tools:** Playwright MCP - automated agent-driven testing
**Coverage:** 100% of Critical User Journeys
**Agent:** `full-stack-orchestration:test-automator` via slash commands

### Layer 4: Design/UX Tests (< 15 minutes)
**Purpose:** Verify design polish, accessibility, responsive design
**Tools:** Playwright MCP - automated visual inspection
**Coverage:** WCAG AA compliance, responsive breakpoints, visual regression
**Agent:** Automated via `/test-comprehensive` command

---

## 🚀 Testing Slash Commands (Primary Interface)

All testing is executed through these unified slash commands:

### `/test-smart` - Full CI/CD Pipeline ⭐ PRIMARY COMMAND

**What it does:**
```
Local Test → Auto-Fix → Deploy Staging → Test → Auto-Fix → Approval → Deploy Production → Monitor
```

**Usage:**
```bash
/test-smart
```

**Workflow:**
1. Analyzes changed files
2. Runs affected tests locally (smart selection)
3. Auto-fixes failures (up to 3 attempts)
4. Commits auto-fixes
5. Pushes to branch (triggers staging deployment)
6. Waits for Vercel/Railway deployment
7. Runs full test suite on staging
8. Auto-fixes staging-specific issues
9. Requests human approval
10. Merges to main and deploys to production
11. Runs smoke tests and monitors

**Time:** 45-60 minutes for full pipeline

**Agent:** `deployment-engineer` + `test-automator` + `debugger`

---

### `/test-all-local` - Complete Local Test Suite

**Usage:**
```bash
/test-all-local
```

**What it tests:**
- 50+ E2E tests across all features
- All 7 Critical User Journeys
- 5 browser types (Chromium, Firefox, WebKit, Mobile Chrome, Mobile Safari)
- 145+ design verification checks

**Time:** 15-20 minutes

**Agent:** `test-automator`

---

### `/test-specific` - Single Feature Quick Test

**Usage:**
```bash
/test-specific language-switching
/test-specific generation staging --verbose
/test-specific tokens local --fail-fast
```

**Supported features:**
- `language-switching` / `i18n` (9 tests, 2-3 min)
- `auth` / `authentication` (12+ tests, 2-3 min)
- `generation` / `generation-flow` (15+ tests, 4-5 min)
- `tokens` / `token-management` (8+ tests, 2-3 min)
- `trial` / `trial-credits` (6+ tests, 2-3 min)
- `payment` / `purchase` (10+ tests, 3-4 min)
- `subscription` (8+ tests, 3-4 min)
- `holiday` / `decorator` (12+ tests, 4-5 min)

**Time:** 2-5 minutes per feature

**Agent:** `general-purpose` with Playwright MCP

---

### `/test-cuj` - Critical User Journey Testing

**Usage:**
```bash
/test-cuj registration-to-generation        # CUJ1
/test-cuj single-page-generation           # CUJ3
/test-cuj token-purchase-flow              # CUJ4
/test-cuj subscription-unlimited            # CUJ5
/test-cuj all                               # All CUJs
/test-cuj registration-to-generation staging # With environment
```

**Available CUJs:**
- **CUJ1:** New user registration & 3 trial credits
- **CUJ2:** Language selection & persistence (i18n)
- **CUJ3:** Single-page generation without navigation
- **CUJ4:** Token purchase via Stripe
- **CUJ5:** Subscription for unlimited generations
- **CUJ6:** Trial exhaustion & purchase required
- **CUJ7:** Holiday decorator (seasonal)

**Time:** 3-5 minutes per CUJ

**Agent:** `general-purpose` with Playwright MCP

---

### `/test-bug-fix` - Environment-Aware Bug Workflow

**Usage:**
```bash
/test-bug-fix              # Auto-detects environment
/test-bug-fix --production # Force production workflow
```

**Smart workflows:**
- **Production Bug:** Fix locally → Test locally → Test on staging → Deploy to production
- **Staging Bug:** Fix locally → Test locally → Auto-deploy staging
- **Local Bug:** Fix → Test → Done

**Time:** 2-45 minutes depending on bug environment

**Agent:** `debugging-toolkit:debugger` + `deployment-engineer`

---

### `/test-comprehensive` - Design/UX/A11y/Performance

**Usage:**
```bash
/test-comprehensive all                           # Everything
/test-comprehensive generation --accessibility    # A11y focus
/test-comprehensive all staging --detailed --report
```

**Coverage:**
- 🎨 Design verification (colors, spacing, typography)
- ♿ Accessibility audit (WCAG AA compliance)
- 📱 Responsive testing (6+ devices, all orientations)
- ⚡ Performance metrics (load time, TTI, CLS)
- 🌐 Cross-browser compatibility
- 🔄 Visual regression detection

**Time:** 5-15 minutes

**Agent:** Playwright MCP automated visual inspection

---

### `/test-help` - Quick Reference Guide

**Usage:**
```bash
/test-help
```

Shows quick reference for all commands, common workflows, troubleshooting.

---

## 📋 Test Coverage Matrix

| Feature | E2E Tests | Integration Tests | Unit Tests | Status |
|---------|-----------|------------------|-----------|--------|
| Registration (CUJ1) | 6+ | 🔴 Missing | ✅ Present | ⚠️ Partial |
| Language Switching (CUJ2) | 9+ | 🔴 Missing | ✅ Present | ✅ Complete |
| Generation (CUJ3) | 15+ | 🔴 Missing | ✅ Present | ⚠️ Partial |
| Token Purchase (CUJ4) | 🔴 Minimal | 🔴 Missing | ✅ Present | 🔴 Minimal |
| Subscription (CUJ5) | 🔴 Minimal | 🔴 Missing | ✅ Present | 🔴 Minimal |
| Trial System (CUJ6) | 6+ | ⏱️ Timeout | ✅ Present | ⚠️ Flaky |
| Holiday Decorator (CUJ7) | 12+ | 🔴 Missing | ✅ Present | ✅ Complete |
| **Total** | **50+** | **Missing** | **100+** | **Partial** |

**Legend:** ✅ Complete | ⚠️ Partial | 🔴 Missing | ⏱️ Issues

---

## 🔄 CI/CD Pipeline Architecture

### Phase 1: Local Development

```
Developer writes code
    ↓
/test-specific {feature}     # Quick feedback (2-5 min)
    ↓
Tests pass? → YES → Continue
              NO → Fix and retry
```

### Phase 2: Before PR

```
/test-all-local              # Full local validation (15-20 min)
    ↓
All tests pass? → YES → Create PR
                → NO → Fix and retry
```

### Phase 3: Pre-Deployment

```
/test-cuj {cuj-name}         # Verify specific journey (3-5 min)
/test-comprehensive all      # Design/UX verification (5-15 min)
    ↓
All CUJs verified? → YES → Deploy
                   → NO → Fix and retry
```

### Phase 4: Full Deployment

```
/test-smart                  # Complete pipeline (45-60 min)
    ↓
Local tests pass? → YES → Deploy staging
                 → NO → Stop, fix locally
    ↓
Staging tests pass? → YES → Request approval
                   → NO → Auto-fix and retry
    ↓
Human approves? → YES → Deploy production
               → NO → Cancel or fix
    ↓
Production smoke tests pass? → YES → Success ✅
                            → NO → Monitor & alert
```

---

## 📊 Test Execution Times

| Command | Time | Details |
|---------|------|---------|
| `/test-specific {feature}` | 2-5 min | Single feature, quick feedback |
| `/test-all-local` | 15-20 min | All 50+ tests, full coverage |
| `/test-cuj {cuj}` | 3-5 min | Single user journey |
| `/test-comprehensive all` | 5-15 min | Design/UX/A11y/perf checks |
| `/test-smart local only` | 5-10 min | Local phase only |
| `/test-smart full pipeline` | 45-60 min | Local → staging → production |

---

## 🔍 Critical User Journeys (CUJs)

All testing is organized around these 7 critical journeys:

### CUJ1: New User Registration & Trial Flow
- User registers → Gets 3 trial credits
- Can generate immediately
- **Test Command:** `/test-cuj registration-to-generation`

### CUJ2: Language Selection & Persistence
- User selects language → Persists in localStorage & backend
- Works across login/logout
- **Test Command:** `/test-cuj language-switching-persistence`

### CUJ3: Single-Page Generation
- User fills form → Progress updates inline → Results inline
- No page navigation during flow
- **Test Command:** `/test-cuj single-page-generation`

### CUJ4: Token Purchase via Stripe
- User purchases tokens → Stripe webhook processes → Tokens added
- Can generate immediately with new tokens
- **Test Command:** `/test-cuj token-purchase-flow`

### CUJ5: Subscription for Unlimited
- User subscribes ($99/month) → Active subscription allows unlimited generation
- Can manage via Customer Portal
- **Test Command:** `/test-cuj subscription-unlimited`

### CUJ6: Trial Exhaustion & Purchase Required
- User exhausts 3 trial credits
- Modal appears with purchase/subscribe options
- Generation blocked until purchase
- **Test Command:** `/test-cuj trial-exhaustion-purchase`

### CUJ7: Holiday Decorator (Seasonal)
- During Nov-Jan, user can decorate home with holiday theme
- Atomic credit deduction prevents negative balance
- Social sharing grants bonus credits
- **Test Command:** `/test-cuj holiday-decorator-flow`

**Full CUJ documentation:** [CUJS.md](CUJS.md)

---

## 🤖 Agent Capabilities

Your testing system uses these specialized agents:

| Agent | Role | Capabilities |
|-------|------|--------------|
| `deployment-engineer` | CI/CD orchestration | Deploy, monitor, approval gates |
| `test-automator` | Test execution | Run tests, parse results, generate reports |
| `debugger` | Auto-fix failures | Analyze failures, apply fixes, retry |
| `general-purpose` | Test execution | Run specific features, CUJs |
| `playwright-mcp` | Browser automation | Visual testing, design verification |

---

## ✅ Success Criteria for Production

Before deploying to production, verify:

```
✅ /test-smart passed all phases
✅ 50+ E2E tests passing (100%)
✅ All 7 CUJs verified working
✅ /test-comprehensive passed
✅ Design/UX/A11y verified
✅ Performance within SLA
✅ No flaky tests
✅ Code reviewed
✅ No known issues
✅ Ready for users! 🚀
```

---

## ⚠️ Known Limitations & Action Items

### Issue 1: Frontend Tests Use Mocked APIs
**Status:** 🔴 HIGH PRIORITY
**Description:** E2E tests mock API responses, can't detect backend failures
**Impact:** Can't verify credit deduction, payment processing, etc.
**Fix:** Implement real backend integration tests
**Timeline:** This sprint

### Issue 2: Missing Integration Tests
**Status:** 🔴 HIGH PRIORITY
**Description:** No tests verify database state changes
**Impact:** Can't detect data corruption, atomic operation failures
**Fix:** Create backend integration test suite
**Timeline:** This sprint

### Issue 3: Payment Tests Missing
**Status:** 🔴 HIGH PRIORITY
**Description:** No tests for Stripe webhook processing
**Impact:** Payment failures won't be caught before production
**Fix:** Add Stripe test mode tests
**Timeline:** Next sprint

### Issue 4: Backend Unit Tests Timeout
**Status:** 🔴 BLOCKING
**Description:** Holiday credit service tests timeout
**Impact:** Can't verify credit system works correctly
**Fix:** Debug and fix timeouts
**Timeline:** Immediate

---

## 📚 Related Documents

- **[CUJS.md](CUJS.md)** - Canonical definition of all 7 Critical User Journeys
- **[TEST_REVIEW.md](TEST_REVIEW.md)** - Comprehensive test coverage analysis
- **[CLAUDE.md](CLAUDE.md)** - Architecture & development guidelines
- **[.claude/commands/test-smart.md](.claude/commands/test-smart.md)** - Full CI/CD details
- **[.claude/commands/test-comprehensive.md](.claude/commands/test-comprehensive.md)** - Design/UX testing

---

## 🔗 Quick Links

### Run Tests
- Quick feature: `/test-specific {feature}`
- Single CUJ: `/test-cuj {cuj-name}`
- Full suite: `/test-all-local`
- Full pipeline: `/test-smart`

### Add New Tests
1. Add CUJ definition to [CUJS.md](CUJS.md)
2. Create test file: `frontend/tests/e2e/{feature}.spec.ts`
3. Write tests for all acceptance criteria
4. Run `/test-specific {feature}` to verify

### View Progress
- Test coverage: [Test Coverage Matrix](#📊-test-coverage-matrix) above
- CUJ status: [CUJS.md](CUJS.md#cuj-implementation-matrix)
- Known issues: [Known Limitations](#⚠️-known-limitations--action-items) above

---

**Last Updated:** 2025-11-13
**Next Review:** 2025-11-20 (weekly)
**Maintained By:** Engineering Team
