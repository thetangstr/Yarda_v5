# Testing Help - Quick Reference

## 🚀 Command Family (Consolidated)

All testing functionality organized into focused, non-overlapping commands:

### Primary Command (ONE COMMAND FOR EVERYTHING)
**`/test-smart`** - Full CI/CD Pipeline (Local → Staging → Production)
- **LOCAL**: Analyzes changes, runs tests, auto-fixes failures
- **STAGING**: Auto-deploys, runs full suite, auto-fixes failures
- **APPROVAL**: Asks for human approval after all tests pass
- **PRODUCTION**: Deploys to production, runs smoke tests
- **Use this for:** Everything from development to production
- **Time:** 45-60 min (includes all phases)

---

## 🎯 Specialized Testing Commands

### `/test-all-local` - Complete Local Test Suite
- Run **all 50+ tests** locally before PRs
- **9 tests each** for: language-switching, auth, generation, tokens, trial, purchase, subscription, holiday, etc.
- Comprehensive validation
- **Time:** 15-20 min

### `/test-specific` - Test Specific Feature
- Quick feature verification
- Smart feature selection: `language-switching`, `generation`, `tokens`, `auth`, etc.
- Run against local, staging, or production
- Examples:
  ```bash
  /test-specific language-switching
  /test-specific generation staging --verbose
  /test-specific tokens local --fail-fast
  ```
- **Time:** 2-5 min per feature

### `/test-cuj` - Critical User Journey Testing
- Test complete end-to-end user flows
- Verify real user scenarios work perfectly
- Examples:
  ```bash
  /test-cuj registration-to-generation      # New user → first generation
  /test-cuj single-page-generation         # Entire generation on one page
  /test-cuj token-purchase-flow            # Purchase → use tokens
  /test-cuj subscription-unlimited          # Subscribe → unlimited generations
  ```
- **Time:** 3-5 min per CUJ

### `/test-bug-fix` - Environment-Aware Bug Workflow
- Smart bug detection and appropriate fix strategy
- Auto-detects: production bug? staging? local?
- **Workflow A (Production):** Fix → Test → Staging Verify → Production Deploy
- **Workflow B (Staging):** Fix → Test → Auto-Deploy Staging
- **Workflow C (Local):** Fix → Test → Done
- Examples:
  ```bash
  /test-bug-fix                # Auto-detects environment
  /test-bug-fix --production   # Force production workflow
  ```
- **Time:** Varies by workflow (2-45 min)

### `/test-comprehensive` - Design, UX, A11y, Responsive Testing
- **Agent-driven comprehensive testing** using Playwright MCP
- Design verification (colors, spacing, typography, animations)
- Accessibility audit (WCAG AA compliance)
- Responsive testing (6+ devices, all orientations)
- Performance metrics (load time, TTI, CLS)
- Cross-browser compatibility
- Visual regression detection
- Examples:
  ```bash
  /test-comprehensive all                     # Everything
  /test-comprehensive generation --accessibility  # A11y focus
  /test-comprehensive all staging --detailed      # Full report
  ```
- **Time:** 5-15 min for detailed verification

---

## 📊 Quick Reference Matrix

| Command | Purpose | Use When | Time |
|---------|---------|----------|------|
| `/test-smart` | Full CI/CD pipeline | Ready to deploy | 45-60 min |
| `/test-all-local` | Complete test suite | Before PR | 15-20 min |
| `/test-specific` | Test one feature | Quick verification | 2-5 min |
| `/test-cuj` | Test user journey | Verify CUJ works | 3-5 min |
| `/test-bug-fix` | Fix bug properly | Found a bug | 2-45 min |
| `/test-comprehensive` | Design/UX/A11y | Polish verification | 5-15 min |

---

## 🔥 Common Workflows

### Workflow 1: Daily Development
```bash
# 1. Make changes
# 2. Quick feature test
/test-specific language-switching           # 2 min

# 3. If passes → ready to commit
# 4. Before PR → full suite
/test-all-local                             # 15 min
```

### Workflow 2: Bug Fix
```bash
# 1. Found a bug
# 2. Smart bug fix workflow (auto-detects environment)
/test-bug-fix                               # 2-45 min depending on bug

# Result:
# - Fixed locally if local bug
# - Fixed + staged if staging bug
# - Fixed + staged + production if production bug
```

### Workflow 3: Feature Complete
```bash
# 1. Feature complete, all tests passing
/test-all-local                             # 15 min

# 2. Verify critical user journeys
/test-cuj registration-to-generation        # 3 min
/test-cuj single-page-generation           # 3 min

# 3. Comprehensive design/UX verification
/test-comprehensive all --accessibility --responsive  # 10 min

# 4. Full CI/CD (ready to production)
/test-smart                                 # 45-60 min
```

### Workflow 4: Before Production Deploy
```bash
# 1. All local tests pass
/test-all-local                             # 15 min ✅

# 2. All CUJs verified
/test-cuj all                               # 30 min ✅

# 3. Comprehensive verification
/test-comprehensive all staging --detailed --report  # 15 min ✅

# 4. Full CI/CD pipeline
/test-smart                                 # 45-60 min ✅
# → Ask for approval
# → Deploy to production
```

---

## ⚙️ Advanced Options

### By Test Type
```bash
# Smoke tests (fast)
/test-all-local --smoke                      # 2-3 min

# Critical tests only
/test-all-local --critical                   # 5-7 min

# Full suite
/test-all-local                              # 15-20 min
```

### By Environment
```bash
# Local (fastest)
/test-specific generation local              # 3 min

# Staging (real backend)
/test-specific generation staging            # 4 min

# Production (with caution)
/test-specific generation production --read-only  # 5 min
```

### By Feature Focus
```bash
# Design focus
/test-comprehensive all --visual-inspection

# Accessibility focus
/test-comprehensive all --accessibility --report

# Performance focus
/test-comprehensive all --performance --detailed

# Responsive focus
/test-comprehensive all --responsive
```

### Debugging Options
```bash
# Show all output
/test-specific generation --verbose

# Interactive UI mode (visual debugging)
/test-specific generation --ui

# Show browser window
/test-specific generation --headed

# Stop on first failure
/test-specific generation --fail-fast
```

---

## 📚 Test Coverage

**Current Status:**
- **50+ total tests**
- **40+ passing** (core features verified)
- **5 browser types** (Chromium, Firefox, WebKit, Mobile Chrome, Mobile Safari)
- **145+ design checks** (via comprehensive testing)

**Coverage by Feature:**
| Feature | Tests | Browsers | Status |
|---------|-------|----------|--------|
| Language Switching (i18n) | 9 | 5 | ✅ Core working |
| Authentication | 12+ | 5 | ✅ All passing |
| Generation Flow | 15+ | 5 | ✅ All passing |
| Token Management | 8+ | 5 | ✅ All passing |
| Trial Credits | 6+ | 5 | ✅ All passing |
| Payment/Stripe | 10+ | 5 | ✅ All passing |
| Subscription | 8+ | 5 | ✅ All passing |

---

## 🎯 When to Use Each Command

### Use `/test-smart` when:
- ✅ Feature complete, all other tests pass
- ✅ Ready to deploy to production
- ✅ Want full CI/CD automation
- ✅ Need approval gate before production

### Use `/test-all-local` when:
- ✅ Before creating PR
- ✅ Want comprehensive validation
- ✅ Want full test coverage report
- ✅ Before merging to main

### Use `/test-specific` when:
- ✅ Testing single feature
- ✅ Quick verification needed
- ✅ Don't need full suite
- ✅ Want fast feedback (2-5 min)

### Use `/test-cuj` when:
- ✅ Want to verify complete user flow
- ✅ Feature touches multiple areas
- ✅ Want end-to-end validation
- ✅ User journey is complex

### Use `/test-bug-fix` when:
- ✅ Found a bug
- ✅ Not sure if production/staging/local
- ✅ Want smart fix strategy
- ✅ Need approval gate for production bugs

### Use `/test-comprehensive` when:
- ✅ Feature complete, tests pass
- ✅ Want design/UX polish verification
- ✅ Need accessibility audit
- ✅ Before final production approval
- ✅ Want detailed HTML report

---

## 🆘 Troubleshooting

### Tests are flaky
```bash
# Run same test 3 times to verify stability
/test-specific language-switching --repeat 3

# If passes all 3 times → test is stable
# If fails intermittently → investigate timing issues
```

### Want to debug specific test failure
```bash
# Interactive UI mode (watch test run)
/test-specific generation local --ui --headed

# Shows exactly where test fails
# You can inspect page, check console, etc.
```

### Test fails but passes manually
```bash
# Run with increased timeout
/test-specific generation --timeout 30000

# Run without parallelization
/test-specific generation --serial

# Check if it's timing/race condition
```

### Need detailed error information
```bash
# Get verbose output
/test-specific generation --verbose

# Get detailed report with screenshots
/test-comprehensive generation --detailed --report
```

---

## 💡 Pro Tips

1. **Use `/test-smart` as your source of truth** - It handles all workflows
2. **Trust agent decisions** - It analyzes code changes intelligently
3. **Run `/test-specific` for rapid feedback** - 2-5 min cycles
4. **Use `/test-cuj` for user story verification** - Real scenarios
5. **Let agent auto-fix tests** - Don't debug manually
6. **Generate reports before production** - Documentation matters
7. **Check `/test-help` when unsure** - This file is your guide

---

## 📖 Full Documentation

For detailed documentation of each command, see:
- **`/test-smart`** - `test-smart.md`
- **`/test-all-local`** - `test-all-local.md`
- **`/test-specific`** - `test-specific.md`
- **`/test-cuj`** - `test-cuj.md`
- **`/test-bug-fix`** - `test-bug-fix.md`
- **`/test-comprehensive`** - `test-comprehensive.md`

Or ask the agent: `"Tell me about /test-specific"`

---

## 🎓 Key Concepts

### Critical User Journeys (CUJs)
End-to-end user scenarios tested by `/test-cuj`:
- **CUJ1:** New user registration → first generation
- **CUJ2:** Language selection and persistence
- **CUJ3:** Single-page generation without navigation
- **CUJ4:** Token purchase via Stripe
- **CUJ5:** Subscription for unlimited generations
- **CUJ6:** Trial exhaustion and purchase required
- **CUJ7:** Holiday decorator (seasonal)

### Test Environment Hierarchy
- **Local:** Fastest, for development (localhost:3000 + localhost:8000)
- **Staging:** Real backend, for verification (Vercel preview + Railway)
- **Production:** Real users, for monitoring (use with caution)

### Test Levels
- **Smoke tests** (< 2 min): Quick validation
- **Critical tests** (< 5 min): High-priority paths
- **Full suite** (15-20 min): Comprehensive validation
- **Deep dive** (5-15 min): Design/UX/A11y/performance

---

## ✅ Success Checklist

Before deploying to production:

```
✅ /test-smart ran successfully
✅ All tests passed (50+ tests)
✅ All CUJs verified (7 critical paths)
✅ /test-comprehensive passed (design/UX/A11y)
✅ No known issues remaining
✅ Code reviewed and approved
✅ Performance within SLA
✅ Accessibility verified (WCAG AA)
✅ Responsive on all devices
✅ Ready for production! 🚀
```

---

**Start Testing:** Type `/test-smart` to get started! 🚀

Or use `/test-help` for this quick reference anytime.
