# E2E Test Session Plan - Local Environment

**Session ID:** TEST_SESSION_local_20251106_164935
**Date:** 2025-11-06 16:49:35
**Environment:** LOCAL
**Test Mode:** Auto-Fix Enabled
**Browser:** Chromium

---

## Executive Summary

**Status:** ⚠️ BLOCKED - Backend Not Running
**Scope:** All CUJs (CUJ-1, CUJ-2, CUJ-7, CUJ-8) + Phase 2 Features
**Total Test Cases:** 29 E2E tests
**Estimated Duration:** 52-78 minutes

---

## Environment Status

### ✅ Frontend: READY
```
Port:     3000
Process:  78514 (node)
URL:      http://localhost:3000
Status:   Running
```

### ❌ Backend: NOT RUNNING (BLOCKING)
```
Port:     8000
Status:   Not running
URL:      http://localhost:8000
Required: YES - All E2E tests require backend API
```

### ✅ Configuration: READY
```
NEXT_PUBLIC_API_URL: http://localhost:8000 ✅
Database:            Configured (Supabase)
Stripe:              Test mode configured
Google Maps:         API key configured
```

---

## Required Action to Proceed

**Start the backend server:**

```bash
cd backend
uvicorn src.main:app --reload --port 8000
```

**Expected output:**
```
INFO:     Uvicorn running on http://127.0.0.1:8000 (Press CTRL+C to quit)
INFO:     Started reloader process using WatchFiles
INFO:     Started server process
INFO:     Waiting for application startup.
INFO:     Application startup complete.
```

**Verify backend:**
```bash
curl http://localhost:8000/docs
# Should return FastAPI documentation page
```

**Once backend is running, resume testing with:**
```bash
/test-and-fix env=local fix=true
```

---

## Test Plan Analysis

### CUJ-1: New User Trial → First Generation
**Test Cases:** 4
**Type:** E2E (Playwright)
**Status:** Pending backend

**Test Scenarios:**
1. User registration with trial credits (3 credits granted)
2. Email verification flow
3. First generation using trial credit
4. Trial credit depletion tracking

**Expected Duration:** 8-12 minutes
**Critical:** YES - Core trial flow validation

---

### CUJ-2: Token-Based Generation
**Test Cases:** 3
**Type:** E2E (Playwright)
**Status:** Pending backend

**Test Scenarios:**
1. Login as trial-exhausted user
2. Purchase 50 tokens via Stripe checkout
3. Generate design using tokens
4. Token balance validation

**Expected Duration:** 6-9 minutes
**Critical:** YES - Payment flow validation

---

### CUJ-7: Generation Flow UI Components (Feature 004)
**Test Cases:** 16
**Type:** E2E (Playwright)
**Status:** 11 PASSED, 5 PENDING

**Passed Tests:**
- ✅ TC-GEN-1: Generation Form Access
- ✅ TC-GEN-3: Area Selection (Single Mode)
- ✅ TC-GEN-4: Style Selection with Visual Cards
- ✅ TC-GEN-5: Custom Prompt with Character Counter
- ✅ TC-GEN-6: Form Validation
- ✅ TC-GEN-8: Generation Submission Flow
- ✅ TC-GEN-9: Real-Time Progress Tracking
- ✅ TC-GEN-10: Result Display
- ✅ TC-GEN-11: Token Deduction Success
- ✅ TC-GEN-12: Multi-Area Support
- ✅ TC-GEN-16: TypeScript Type Safety

**Pending Tests:**
- 🔄 TC-GEN-2: Address Input with Google Places (requires API key)
- 🔄 TC-GEN-7: Payment Status Indicator (requires test accounts)
- 🔄 TC-GEN-13: Trial Exhausted Modal (requires trial depletion)
- 🔄 TC-GEN-14: Refund on Failure (requires failure simulation)
- 🔄 TC-GEN-15: Multi-Area Progress (requires 2+ areas)

**Expected Duration:** 25-35 minutes (pending tests only)
**Critical:** MEDIUM - UI component validation

---

### CUJ-8: Phase 2 UX Features (Yarda v2 Enhancements) ⭐ NEW
**Test Cases:** 6
**Type:** E2E (Playwright)
**Status:** 🔄 INTEGRATED, PENDING LOCAL TESTING
**Integration Date:** 2025-11-06

#### TC-UX-1: Preservation Strength Slider
**Location:** `/generate` → Section 4: Transformation Intensity
**Duration:** ~12 minutes
**Critical:** HIGH - Core Phase 2 feature

**Test Steps:**
1. Navigate to /generate as authenticated user
2. Scroll to "Transformation Intensity" section
3. Verify slider displays with default value 0.5 (Balanced)
4. Drag slider to 0.2 (Dramatic) - verify purple color
5. Drag slider to 0.8 (Subtle) - verify green color
6. Submit generation with preservation_strength=0.8
7. Verify API request includes `preservation_strength: 0.8`

**Expected Outcomes:**
- ✅ Default value: 0.5 (Balanced)
- ✅ Range: 0.0 - 1.0 (step: 0.1)
- ✅ Labels: Dramatic (purple), Balanced (blue), Subtle (green)
- ✅ Visual feedback updates in real-time
- ✅ API request includes preservation_strength field

**Implementation:** `src/components/generation/PreservationStrengthSlider.tsx`

---

#### TC-UX-2: Suggested Prompts (Area-Specific)
**Location:** `/generate` → Section 3: Custom Instructions
**Duration:** ~9 minutes
**Critical:** HIGH - User experience enhancement

**Test Steps:**
1. Navigate to /generate
2. Select area: "Front Yard"
3. Scroll to custom instructions section
4. Verify blue suggestion buttons appear
5. Verify suggestions include: "Colorful flower beds", "Modern entrance pathway"
6. Click suggestion: "Low-maintenance drought-resistant plants"
7. Verify prompt added to textarea
8. Select area: "Backyard"
9. Verify different suggestions appear: "Entertainment area", "Fire pit"
10. Click suggestion: "Pool-adjacent tropical planting"
11. Verify prompt appends with comma

**Expected Outcomes:**
- ✅ Suggestions change based on selected area
- ✅ Blue buttons for area-specific prompts
- ✅ One-click insertion works
- ✅ Smart comma-separated appending
- ✅ 50+ total suggestions across all areas

**Implementation:** `src/components/generation/SuggestedPrompts.tsx`

---

#### TC-UX-3: Suggested Prompts (Style-Specific)
**Location:** `/generate` → Section 3: Custom Instructions
**Duration:** ~8 minutes
**Critical:** MEDIUM - Additional user guidance

**Test Steps:**
1. Navigate to /generate
2. Select style: "Japanese Zen"
3. Verify purple keyword buttons appear
4. Verify keywords include: "zen meditation area", "koi pond", "stone lanterns"
5. Click keyword: "bamboo grove"
6. Verify keyword added to prompt
7. Select style: "Modern Minimalist"
8. Verify different keywords: "clean geometric lines", "structured plantings"
9. Click keyword: "minimalist water feature"
10. Verify keyword appends with comma

**Expected Outcomes:**
- ✅ Keywords change based on selected style
- ✅ Purple buttons for style-specific keywords
- ✅ Keywords shorter than area prompts
- ✅ One-click insertion works
- ✅ 30+ total keywords across all styles

**Implementation:** `src/components/generation/SuggestedPrompts.tsx`

---

#### TC-UX-4: Character Counter Enforcement
**Location:** `/generate` → Section 3: Custom Instructions
**Duration:** ~7 minutes
**Critical:** HIGH - Data validation

**Test Steps:**
1. Navigate to /generate
2. Verify character counter shows "0/500 characters"
3. Type 350 characters → counter shows "350/500" (gray)
4. Type 50 more characters → counter shows "400/500" (darker gray)
5. Type 55 more characters → counter shows "455/500" (orange warning)
6. Try to type more → blocked at 500 characters
7. Delete 50 characters → counter shows "450/500" (orange)
8. Click suggested prompt that would exceed 500 → should not add
9. Delete more text → now 480 characters
10. Click short keyword → should add if fits

**Expected Outcomes:**
- ✅ Counter updates in real-time
- ✅ Color changes: gray (0-400), darker gray (400-450), orange (450+)
- ✅ Hard limit at 500 characters
- ✅ Suggested prompts respect limit
- ✅ Cannot type or paste beyond 500

**Implementation:** `src/components/generation/StyleSelectorEnhanced.tsx`

---

#### TC-UX-5: Enhanced Progress Display (v2 Fields)
**Location:** `/generate/progress/[id]`
**Duration:** ~15 minutes
**Critical:** HIGH - Real-time feedback

**Test Steps:**
1. Submit generation with preservation_strength=0.7
2. Navigate to progress page
3. Verify preservation strength displayed: "0.7 (Subtle)"
4. Verify current_stage displays: "retrieving_imagery"
5. Wait 2 seconds for polling
6. Verify stage updates: "analyzing_property"
7. Verify status_message displays: "Analyzing your property..."
8. Wait for more updates
9. Verify stage progresses: "generating_design" → "applying_style" → "finalizing"
10. Verify status messages update for each stage
11. Wait for completion
12. Verify final preservation strength still displayed

**Expected Outcomes:**
- ✅ Preservation strength tracked throughout
- ✅ Current stage updates every 2 seconds
- ✅ Status messages are user-friendly
- ✅ 6 processing stages visible
- ✅ All v2 fields persist in localStorage

**Implementation:** `src/hooks/useGenerationProgress.ts`

---

#### TC-UX-6: Result Recovery with v2 Fields
**Location:** `/generate/progress/[id]`
**Duration:** ~12 minutes
**Critical:** HIGH - Data persistence

**Test Steps:**
1. Submit generation with preservation_strength=0.3, custom_prompt="zen garden"
2. Wait for status: "processing", stage: "generating_design"
3. Open DevTools → Application → Local Storage
4. Verify `user-storage` contains:
   - preservation_strength: 0.3
   - current_stage: "generating_design"
   - status_message: "Generating landscape design..."
5. Hard refresh page (Cmd/Ctrl + Shift + R)
6. Verify preservation strength restored: 0.3
7. Verify current stage restored: "generating_design"
8. Verify status message restored
9. Verify polling resumes automatically
10. Let generation complete
11. Verify all v2 fields still present in completed state

**Expected Outcomes:**
- ✅ All v2 fields persist to localStorage
- ✅ Recovery restores preservation_strength
- ✅ Recovery restores current_stage
- ✅ Recovery restores status_message
- ✅ Zero data loss on refresh
- ✅ Polling resumes automatically

**Implementation:** `src/store/generationStore.ts`, `src/hooks/useGenerationProgress.ts`

---

### Phase 2 Test Coverage Summary

**Total Test Cases:** 6
**Implemented:** 6 (100%)
**Tested:** 0 (requires local backend)
**Pending:** 6 (all tests require backend)

**Components Created:**
- ✅ PreservationStrengthSlider.tsx (150+ lines) - FIXED import bug
- ✅ SuggestedPrompts.tsx (200+ lines)
- ✅ useGenerationProgress.ts (200+ lines) - FIXED import bug

**Components Modified:**
- ✅ GenerationFormEnhanced.tsx (added Section 4)
- ✅ StyleSelectorEnhanced.tsx (added character counter)
- ✅ api.ts (added preservation_strength parameter)

**Expected Duration for Phase 2:** 63 minutes total
**Critical Priority:** HIGH - Core v2 enhancements

---

## Test Execution Order (When Backend Ready)

### Priority 1: Core Flows (Critical Path)
1. **CUJ-8 (Phase 2)** - Test new features first (63 min)
   - TC-UX-1: Preservation Strength Slider
   - TC-UX-2: Suggested Prompts (Area-Specific)
   - TC-UX-3: Suggested Prompts (Style-Specific)
   - TC-UX-4: Character Counter Enforcement
   - TC-UX-5: Enhanced Progress Display
   - TC-UX-6: Result Recovery with v2 Fields

2. **CUJ-1: Trial Flow** (8-12 min)
   - User registration
   - Email verification
   - Trial credit usage

3. **CUJ-7: Generation Flow** - Pending tests only (25-35 min)
   - TC-GEN-2: Address Input with Google Places
   - TC-GEN-7: Payment Status Indicator
   - TC-GEN-13: Trial Exhausted Modal
   - TC-GEN-14: Refund on Failure
   - TC-GEN-15: Multi-Area Progress

### Priority 2: Payment Flows
4. **CUJ-2: Token Purchase** (6-9 min)
   - Stripe checkout integration
   - Token balance updates

---

## Success Criteria

**Phase 2 Features (Priority 1):**
- ✅ All 6 Phase 2 test cases pass
- ✅ Preservation slider works (0.0-1.0 range)
- ✅ Suggested prompts display correctly
- ✅ Character counter enforces 500 limit
- ✅ Progress polling shows v2 fields (current_stage, status_message)
- ✅ Page refresh recovers v2 fields from localStorage

**Overall Session:**
- ✅ Pass rate ≥ 90% (26+ of 29 tests passing)
- ✅ All critical paths validated
- ✅ Phase 2 features production-ready
- ✅ No blocking bugs discovered
- ✅ Auto-fix resolves any selector issues

---

## Auto-Fix Strategy

**Enabled:** YES (`fix=true`)

**Auto-Fix Will Attempt:**
1. Update selectors if UI elements changed
2. Add wait conditions for timing issues
3. Retry tests once after fix
4. Document all fixes in final report

**Will NOT Auto-Fix:**
1. Backend API errors (500, 404, etc.)
2. Database schema issues
3. Authentication failures
4. Payment processing errors

---

## Environment URLs

```javascript
const LOCAL_ENV = {
  backend:  'http://localhost:8000',
  frontend: 'http://localhost:3000',
  docs:     'http://localhost:8000/docs',
};
```

---

## Playwright MCP Tools Available

✅ `mcp__playwright__browser_navigate` - Navigate to URL
✅ `mcp__playwright__browser_snapshot` - Capture accessibility tree
✅ `mcp__playwright__browser_click` - Click elements
✅ `mcp__playwright__browser_fill_form` - Fill forms
✅ `mcp__playwright__browser_type` - Type text
✅ `mcp__playwright__browser_take_screenshot` - Capture screenshots
✅ `mcp__playwright__browser_wait_for` - Wait conditions
✅ `mcp__playwright__browser_console_messages` - Check console logs

---

## Expected Outputs

1. **TEST_SESSION_local_20251106_164935.md** (this document, updated with results)
2. **Screenshots:** `.playwright-mcp/local/` (organized by test case)
3. **BUG_REPORT_local_20251106.md** (if failures found)
4. **Updated TEST_PLAN.md** (test status marked ✅/❌)

---

## Next Steps

### Immediate Action Required:
```bash
# Terminal 1: Start backend
cd backend
uvicorn src.main:app --reload --port 8000

# Terminal 2: Verify backend is ready
curl http://localhost:8000/docs

# Terminal 3: Resume testing (from project root)
/test-and-fix env=local fix=true
```

### After Tests Complete:
1. Review test results in this document
2. Check screenshots in `.playwright-mcp/local/`
3. Review TEST_PLAN.md for updated status
4. Address any failures in BUG_REPORT (if created)
5. Proceed to staging: `/test-and-fix env=staging`

---

## Testing Guide Reference

For detailed manual testing instructions for Phase 2 features:
📖 [PHASE_2_INTEGRATION_TESTING_GUIDE.md](PHASE_2_INTEGRATION_TESTING_GUIDE.md)

For Phase 2 implementation details:
📖 [PHASE_2_INTEGRATION_COMPLETE.md](PHASE_2_INTEGRATION_COMPLETE.md)

For pre-testing fixes applied:
📖 [PHASE_2_PRE_TESTING_FIXES.md](PHASE_2_PRE_TESTING_FIXES.md)

---

**Status:** ⏸️ PAUSED - Waiting for backend to start
**Resume Command:** `/test-and-fix env=local fix=true`
**Estimated Total Duration:** 52-78 minutes (when backend ready)
