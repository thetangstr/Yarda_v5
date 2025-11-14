# Archived Test Files - Consolidation Record

**Archive Date:** 2025-11-13
**Reason:** Test consolidation and cleanup to reduce duplication and improve maintainability
**Status:** Tests moved to archive but NOT deleted - can be reviewed if needed

---

## Archived Test Files

### Duplicate/Manual Test Files (12 files)

These files were duplicates or manual/debug versions of existing tests. Core functionality is covered by canonical test files.

| Archived File | Canonical File | Reason |
|---------------|----------------|--------|
| `comprehensive-generation-test.spec.ts` | `generation-flow-v2.spec.ts` | Duplicate generation flow tests |
| `helpers-verification.spec.ts` | Various | Test helpers, not core tests |
| `holiday-decorator-manual.spec.ts` | `holiday-decorator-flow.spec.ts` | Manual version, canonical exists |
| `holiday-flow-simple.spec.ts` | `holiday-full-flow.spec.ts` | Simplified version, full exists |
| `holiday-test-final.spec.ts` | `holiday-full-flow.spec.ts` | Intermediate version, full exists |
| `image-generation-debug.spec.ts` | `generation-flow-v2.spec.ts` | Debug version, canonical exists |
| `image-generation-real.spec.ts` | `generation-flow-v2.spec.ts` | Real integration version replaced by v2 |
| `language-switching.spec.ts.bak` | `language-switching.spec.ts` | Backup file, original exists |
| `google-maps-manual-override.spec.ts` | `google-maps-street-view.spec.ts` | Manual override, canonical exists |
| `staging-manual-test.spec.ts` | Various | Manual staging test, covered by /test-smart |
| `test-react-keys.spec.ts` | Various | Key testing, covered elsewhere |
| `uat-comprehensive-verification.spec.ts` | `generation-flow-v2.spec.ts` | UAT version, covered by canonical |

---

## Remaining Active Test Files (14 files)

These are the canonical, actively maintained test files that cover all Critical User Journeys:

### Core Tests
- `language-switching.spec.ts` - CUJ2: Language selection & persistence (9 tests)
- `trial-user-registration.spec.ts` - CUJ1: Registration & trial flow (6+ tests)
- `generation-flow-v2.spec.ts` - CUJ3: Single-page generation (5+ tests)
- `generation-flow.spec.ts` - Alternative generation flow tests

### Payment & Credits
- `token-management.spec.ts` - Token balance, deduction, management
- `purchase-flow.spec.ts` - Token purchase flow
- `token-purchase.spec.ts` - Token purchase via Stripe
- `credit-sync-integration.spec.ts` - Credit sync system (7 tests)

### Authentication
- `magic-link-auth.spec.ts` - Magic link authentication

### Holiday Feature (CUJ7)
- `holiday-discovery.spec.ts` - Holiday page discovery (6 tests)
- `holiday-full-flow.spec.ts` - Complete holiday flow
- `holiday-decorator-flow.spec.ts` - Holiday decoration generation
- `holiday-social-sharing.spec.ts` - Social sharing with bonuses

### Infrastructure
- `google-maps-street-view.spec.ts` - Google Maps integration

---

## Archived Test Results

All historical test result artifacts (screenshots, logs, traces) have been archived:

- **Archive File:** `test-results-archive-YYYYMMDD-HHMMSS.tar.gz`
- **Size:** ~8.2 MB
- **Contents:**
  - Screenshots from failed tests
  - Error context documents
  - Trace files from test runs
  - Test execution logs

**To restore:**
```bash
tar -xzf test-results-archive-20251113-181417.tar.gz
```

---

## Why Archive Now?

1. **Reduce Clutter** - 25 test files → 14 canonical files
2. **Eliminate Duplication** - Multiple versions of same tests
3. **Improve Maintenance** - Fewer files to update when features change
4. **Faster Execution** - Less test duplication = faster CI/CD
5. **Clearer Intent** - Each remaining file serves a specific CUJ
6. **Better Documentation** - Easy to see which tests cover which CUJ

---

## Recovery Policy

If you need to recover an archived test:

1. Check this file to understand why it was archived
2. Extract from `.archive/` directory
3. Review against canonical test to understand differences
4. Either:
   - Use canonical test (recommended)
   - Restore archived test if it had unique value
   - Update canonical test with missing coverage

---

## Canonical Test Organization

Tests are now organized by CUJ (Critical User Journey):

```
frontend/tests/e2e/
├── CUJ1 Tests (Registration)
│   └── trial-user-registration.spec.ts
├── CUJ2 Tests (Language)
│   └── language-switching.spec.ts
├── CUJ3 Tests (Generation)
│   ├── generation-flow-v2.spec.ts
│   ├── generation-flow.spec.ts
│   └── credit-sync-integration.spec.ts
├── CUJ4-5 Tests (Payment)
│   ├── token-management.spec.ts
│   ├── purchase-flow.spec.ts
│   └── token-purchase.spec.ts
├── CUJ6 Tests (Trial Exhaustion)
│   └── trial-user-registration.spec.ts (also covers this)
├── CUJ7 Tests (Holiday)
│   ├── holiday-discovery.spec.ts
│   ├── holiday-full-flow.spec.ts
│   ├── holiday-decorator-flow.spec.ts
│   └── holiday-social-sharing.spec.ts
├── Infrastructure
│   ├── google-maps-street-view.spec.ts
│   └── magic-link-auth.spec.ts
└── .archive/
    └── [old/duplicate files for reference]
```

---

## Updated Documentation

See these files for updated testing information:

- **TEST_PLAN.md** - Updated with current test architecture
- **CUJS.md** - New file: Canonical CUJ definitions
- **TEST_REVIEW.md** - Comprehensive test coverage analysis
- **test-help.md** - Quick reference for slash commands

---

**Archive created on:** 2025-11-13
**Archive location:** `frontend/tests/.archive/`
**Archive list:** See this file for complete listing
**Contact:** Engineering Team for questions about specific archived tests
