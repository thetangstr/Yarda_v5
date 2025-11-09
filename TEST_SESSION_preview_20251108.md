# E2E Test Session - Preview/Staging Environment

**Date:** 2025-11-08
**Session ID:** TEST-PREVIEW-20251108
**Environment:** STAGING (Preview/Railway)
**Tester:** Claude Code (Playwright MCP)
**Branch:** 005-port-v2-generation
**Commit:** ca99c43

## Environment Configuration

**Frontend (Vercel Preview):**
- URL: https://yarda-v5-frontend-mhpbb47po-thetangstrs-projects.vercel.app
- Shareable URL: https://yarda-v5-frontend-mhpbb47po-thetangstrs-projects.vercel.app/?_vercel_share=Lse2OmbqRyomGIf1PRdMeMDGke9zzOCr
- Deployment: dpl_FLcnHoBXJ4xU8LvAgJ1htzLbH6oG
- Branch: 005-port-v2-generation

**Backend (Railway Staging):**
- URL: https://yardav5-staging.up.railway.app
- Health: {"status":"healthy","database":"connected","environment":"development"}
- Environment: staging (yardav5-staging)
- Project: yarda-api (7a8f9bcb-a265-4c34-82d2-c9c3655d26bf)

**Database (Supabase):**
- Project: gxlmnjnjvlslijiowamn
- URL: https://gxlmnjnjvlslijiowamn.supabase.co
- Connection: Verified ✅

**Test Account:**
- Email: test.uat.bypass@yarda.app
- Whitelisted: Yes (SKIP_EMAIL_VERIFICATION=true)
- Initial Trial Credits: 3

## Test Scope

### Feature 005: Phase 2 UX Features (CUJ-8)
**Status:** PRIMARY FOCUS
**Components:**
- PreservationStrengthSlider.tsx
- SuggestedPrompts.tsx
- GenerationProgressInline.tsx
- GenerationResultsInline.tsx
- Enhanced form validation
- LocalStorage recovery

**Test Cases (6):**
1. TC-UX-1: Preservation Strength Slider
2. TC-UX-2: Suggested Prompts (Area-Specific)
3. TC-UX-3: Suggested Prompts (Style-Specific)
4. TC-UX-4: Character Counter Enforcement
5. TC-UX-5: Enhanced Progress Display (v2 fields)
6. TC-UX-6: Result Recovery with v2 Fields

### Feature 004: Core Generation Flow (CUJ-7)
**Status:** REGRESSION CHECK
**Components:**
- GenerationFormEnhanced.tsx
- AreaSelector.tsx
- StyleSelector.tsx
- TokenBalance component

**Test Cases (4):**
1. TC-GEN-8: Generation Submission Flow
2. TC-GEN-9: Real-Time Progress Tracking
3. TC-GEN-10: Progress Page Refresh Persistence
4. TC-GEN-15: User Balance Update After Generation

## Pre-Test Verification

### Environment Health Checks
- [x] Backend /health endpoint: 200 OK
- [x] Database connection: active
- [x] CORS configuration: *.vercel.app allowed
- [x] Environment variables: All 10 configured
- [x] Frontend deployment: Successful
- [x] Backend deployment: Healthy

### Deployment Verification
- [x] Git commit: ca99c43 (Feature 005 complete)
- [x] TypeScript build: No errors
- [x] Environment variables: Staging backend configured
- [x] Preview URL accessible: Yes
- [x] Shareable link generated: Yes (expires 2025-11-10)

## Test Execution Log

### Phase 2a: CUJ-8 Phase 2 UX Features

---

#### TC-UX-1: Preservation Strength Slider
**Status:** PENDING
**Started:** [timestamp]
**Expected Duration:** 5 minutes

**Steps:**
1. [ ] Navigate to /generate as authenticated user
2. [ ] Scroll to "Transformation Intensity" section
3. [ ] Verify slider displays with default value 0.5
4. [ ] Drag slider to 0.2 (Dramatic)
5. [ ] Verify label changes to "Dramatic" with purple color
6. [ ] Drag slider to 0.8 (Subtle)
7. [ ] Verify label changes to "Subtle" with green color
8. [ ] Submit generation with preservation_strength=0.8
9. [ ] Verify API request includes preservation_strength field

**Expected Results:**
- Default value: 0.5 (Balanced)
- Range: 0.0 - 1.0 (step: 0.1)
- Labels: Dramatic (purple), Balanced (blue), Subtle (green)
- API integration: preservation_strength sent to backend

**Actual Results:**
[To be filled during test execution]

**Screenshots:**
- [ ] Slider at default (0.5)
- [ ] Slider at 0.2 (Dramatic)
- [ ] Slider at 0.8 (Subtle)
- [ ] API request payload

**Result:** ⏳ PENDING

---

#### TC-UX-2: Suggested Prompts (Area-Specific)
**Status:** PENDING
**Started:** [timestamp]
**Expected Duration:** 3 minutes

**Steps:**
1. [ ] Navigate to /generate
2. [ ] Select area: "Back Yard"
3. [ ] Scroll to custom instructions section
4. [ ] Verify blue suggestion buttons appear
5. [ ] Click suggestion: "Fire pit and seating area"
6. [ ] Verify prompt added to textarea
7. [ ] Select different area: "Front Yard"
8. [ ] Verify different suggestions appear
9. [ ] Click suggestion
10. [ ] Verify smart comma-separated appending

**Expected Results:**
- Suggestions change based on selected area
- Blue buttons for area-specific prompts
- One-click insertion works
- Smart comma-separated appending

**Actual Results:**
[To be filled during test execution]

**Screenshots:**
- [ ] Suggestions for Back Yard
- [ ] Suggestions for Front Yard
- [ ] Prompt appending behavior

**Result:** ⏳ PENDING

---

#### TC-UX-3: Suggested Prompts (Style-Specific)
**Status:** PENDING
**Started:** [timestamp]
**Expected Duration:** 3 minutes

**Steps:**
1. [ ] Navigate to /generate
2. [ ] Select style: "Modern Minimalist"
3. [ ] Verify purple keyword buttons appear
4. [ ] Verify keywords include: "clean geometric lines", "structured plantings"
5. [ ] Click keyword: "minimalist water feature"
6. [ ] Verify keyword added to prompt
7. [ ] Select style: "Japanese Zen"
8. [ ] Verify different keywords appear
9. [ ] Click keyword: "bamboo grove"
10. [ ] Verify keyword appends with comma

**Expected Results:**
- Keywords change based on selected style
- Purple buttons for style-specific keywords
- Keywords shorter than area prompts
- One-click insertion works

**Actual Results:**
[To be filled during test execution]

**Screenshots:**
- [ ] Keywords for Modern Minimalist
- [ ] Keywords for Japanese Zen
- [ ] Keyword appending behavior

**Result:** ⏳ PENDING

---

#### TC-UX-4: Character Counter Enforcement
**Status:** PENDING
**Started:** [timestamp]
**Expected Duration:** 4 minutes

**Steps:**
1. [ ] Navigate to /generate
2. [ ] Verify character counter shows "0/500 characters"
3. [ ] Type 350 characters → counter shows "350/500" (gray)
4. [ ] Type 50 more characters → counter shows "400/500" (darker)
5. [ ] Type 55 more characters → counter shows "455/500" (orange)
6. [ ] Try to type more → blocked at 500 characters
7. [ ] Delete 50 characters → counter updates
8. [ ] Click suggested prompt that would exceed 500 → should not add

**Expected Results:**
- Counter updates in real-time
- Color changes: gray (0-400), darker (400-450), orange (450+)
- Hard limit at 500 characters
- Suggested prompts respect limit

**Actual Results:**
[To be filled during test execution]

**Screenshots:**
- [ ] Counter at 0 chars
- [ ] Counter at 350 chars (gray)
- [ ] Counter at 455 chars (orange)
- [ ] Limit enforcement at 500

**Result:** ⏳ PENDING

---

#### TC-UX-5: Enhanced Progress Display (v2 Fields)
**Status:** PENDING
**Started:** [timestamp]
**Expected Duration:** 10 minutes (includes generation wait)

**Steps:**
1. [ ] Submit generation with preservation_strength=0.7
2. [ ] Verify progress displays inline (no navigation)
3. [ ] Verify preservation strength displayed: "0.7 (Subtle)"
4. [ ] Verify source image displayed hero-sized (500px height)
5. [ ] Verify status messages update every 2 seconds
6. [ ] Wait for generation completion (up to 5 minutes)
7. [ ] Verify results display inline
8. [ ] Verify before/after carousel renders
9. [ ] Verify preservation strength persisted throughout

**Expected Results:**
- All v2 fields tracked: preservation_strength
- Hero-sized source image visible
- Status messages user-friendly
- 2-second polling interval
- Inline progress (no page navigation)
- Results display inline on completion

**Actual Results:**
[To be filled during test execution]

**Screenshots:**
- [ ] Initial progress state
- [ ] Source image hero display
- [ ] Status updates during processing
- [ ] Completion state
- [ ] Before/after carousel

**Result:** ⏳ PENDING

---

#### TC-UX-6: Result Recovery with v2 Fields
**Status:** PENDING
**Started:** [timestamp]
**Expected Duration:** 8 minutes

**Steps:**
1. [ ] Submit generation with preservation_strength=0.3
2. [ ] Wait for status: "processing"
3. [ ] Open DevTools → Application → Local Storage
4. [ ] Verify localStorage contains:
   - preservation_strength: 0.3
   - areas: [{...}]
   - request_id
5. [ ] Hard refresh page (Cmd/Ctrl + Shift + R)
6. [ ] Verify progress restored
7. [ ] Verify preservation strength restored: 0.3
8. [ ] Verify polling resumes automatically
9. [ ] Let generation complete
10. [ ] Verify all v2 fields still present

**Expected Results:**
- All v2 fields persist to localStorage
- Recovery restores preservation_strength
- Recovery restores generation state
- Zero data loss on refresh
- Polling resumes automatically

**Actual Results:**
[To be filled during test execution]

**Screenshots:**
- [ ] localStorage contents before refresh
- [ ] Progress state after refresh
- [ ] Completed state with v2 fields

**Result:** ⏳ PENDING

---

### Phase 2b: CUJ-7 Regression Tests

---

#### TC-GEN-8: Generation Submission Flow
**Status:** PENDING
**Started:** [timestamp]
**Expected Duration:** 3 minutes

**Steps:**
1. [ ] Fill complete form: address, front_yard, modern_minimalist
2. [ ] Add custom prompt: "Include water feature"
3. [ ] Click "Generate Landscape Design" button
4. [ ] Verify loading state (spinner visible)
5. [ ] Verify inline progress appears (no navigation)

**Expected Results:**
- Loading spinner appears immediately
- Progress displays inline
- No navigation to separate progress page
- Generation ID tracked in state

**Actual Results:**
[To be filled during test execution]

**Result:** ⏳ PENDING

---

#### TC-GEN-9: Real-Time Progress Tracking
**Status:** PENDING
**Started:** [timestamp]
**Expected Duration:** 5 minutes

**Steps:**
1. [ ] Submit generation
2. [ ] Verify polling starts (2-second interval)
3. [ ] Verify status messages update
4. [ ] Verify progress percentage visible
5. [ ] Wait for completion (up to 5 minutes)
6. [ ] Verify status changes to "Completed"

**Expected Results:**
- Polling interval: 2 seconds
- Status messages update smoothly
- Progress visible for each area
- Completion detected automatically

**Actual Results:**
[To be filled during test execution]

**Result:** ⏳ PENDING

---

#### TC-GEN-10: Progress Page Refresh Persistence
**Status:** PENDING
**Started:** [timestamp]
**Expected Duration:** 4 minutes

**Steps:**
1. [ ] Start generation
2. [ ] Wait 10 seconds for some progress
3. [ ] Hard refresh page (F5 or CMD+R)
4. [ ] Verify still on /generate page
5. [ ] Verify progress continues from where it was
6. [ ] Verify polling resumes automatically

**Expected Results:**
- Generation state persisted to localStorage
- Progress recovers after refresh
- Polling resumes automatically
- No data loss on refresh

**Actual Results:**
[To be filled during test execution]

**Result:** ⏳ PENDING

---

#### TC-GEN-15: User Balance Update After Generation
**Status:** PENDING
**Started:** [timestamp]
**Expected Duration:** 3 minutes

**Steps:**
1. [ ] Login with trial_remaining=3
2. [ ] Navigate to /generate
3. [ ] Complete generation
4. [ ] Verify trial counter updates: 3 → 2
5. [ ] Verify update happens immediately after submission

**Expected Results:**
- Balance updates immediately after submission
- Counter visible in UI
- Accurate deduction (atomic)

**Actual Results:**
[To be filled during test execution]

**Result:** ⏳ PENDING

---

## Test Results Summary

**Total Tests:** 10
**Passed:** 0
**Failed:** 0
**Blocked:** 0
**Pending:** 10

**Pass Rate:** 0% (pending execution)

### CUJ-8: Phase 2 UX Features
- TC-UX-1: ⏳ PENDING
- TC-UX-2: ⏳ PENDING
- TC-UX-3: ⏳ PENDING
- TC-UX-4: ⏳ PENDING
- TC-UX-5: ⏳ PENDING
- TC-UX-6: ⏳ PENDING

### CUJ-7: Regression Tests
- TC-GEN-8: ⏳ PENDING
- TC-GEN-9: ⏳ PENDING
- TC-GEN-10: ⏳ PENDING
- TC-GEN-15: ⏳ PENDING

## Bugs Found

**Critical:** 0
**Major:** 0
**Minor:** 0
**Total:** 0

[To be filled during test execution]

## Next Steps

1. Execute all 10 test cases against staging environment
2. Document results with screenshots
3. Update TEST_PLAN.md with staging test results
4. Create bug reports for any failures
5. Generate deployment readiness report

## Notes

- Testing against real staging environment with production-like configuration
- Using whitelisted test account (bypasses email verification)
- All deployments verified healthy before testing
- Full stack connectivity confirmed
- Environment variables configured correctly

---

**Session Status:** IN PROGRESS
**Last Updated:** 2025-11-08 [timestamp to be added]
