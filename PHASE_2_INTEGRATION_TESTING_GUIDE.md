# Phase 2 Integration Testing Guide

**Date:** 2025-11-06
**Feature:** Yarda v2 UX Improvements - Phase 2 Integration
**Status:** ✅ READY FOR TESTING
**Environment:** Local Development Only

## Overview

This guide provides step-by-step instructions for testing Phase 2 UX features in a local environment. All features must be tested with the local backend before deployment.

## Prerequisites

### 1. Environment Setup

Ensure your local environment is configured:

```bash
# Frontend environment (.env.local)
NEXT_PUBLIC_API_URL=http://localhost:8000  # CRITICAL: Must point to local backend
NEXT_PUBLIC_SUPABASE_URL=https://gxlmnjnjvlslijiowamn.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...

# Backend environment (.env)
DATABASE_URL=postgresql://...
GEMINI_API_KEY=...
GOOGLE_MAPS_API_KEY=...
BLOB_READ_WRITE_TOKEN=...
```

**⚠️ CRITICAL:** The `NEXT_PUBLIC_API_URL` MUST be set to `http://localhost:8000` or all API calls will be blocked by CORS.

### 2. Start Services

#### Terminal 1: Backend
```bash
cd backend
uvicorn src.main:app --reload --port 8000
```

Wait for: `Application startup complete`

#### Terminal 2: Frontend
```bash
cd frontend
npm run dev
```

Wait for: `ready - started server on 0.0.0.0:3000`

### 3. Verify Services

- Backend: http://localhost:8000/docs (should load Swagger docs)
- Frontend: http://localhost:3000 (should load homepage)

## Phase 2 Features to Test

### Feature 1: Preservation Strength Slider

**Location:** [/generate](http://localhost:3000/generate) → Section 4: Transformation Intensity

**What to Test:**

1. **Visual Feedback**
   - [ ] Slider displays with default value 0.5 (Balanced)
   - [ ] Label changes as you drag: "Dramatic" (0.0-0.4), "Balanced" (0.4-0.6), "Subtle" (0.6-1.0)
   - [ ] Color changes: Purple (Dramatic), Blue (Balanced), Green (Subtle)
   - [ ] Description text updates based on value
   - [ ] Three visual guide boxes highlight the active range

2. **Functionality**
   - [ ] Slider moves smoothly with 0.1 step increments
   - [ ] Scale markers show 0.0, 0.5, 1.0
   - [ ] Disabled state works (try submitting while disabled)

3. **API Integration**
   - [ ] Submit a generation with preservation_strength = 0.2 (Dramatic)
   - [ ] Check Network tab: Request should include `preservation_strength: 0.2`
   - [ ] Submit with preservation_strength = 0.8 (Subtle)
   - [ ] Check Network tab: Request should include `preservation_strength: 0.8`

**Expected Behavior:**
- Default value should be 0.5 (Balanced)
- API request includes preservation_strength field
- Backend receives and stores the value

---

### Feature 2: Suggested Prompts

**Location:** [/generate](http://localhost:3000/generate) → Section 3: Style Selection → Custom Instructions

**What to Test:**

1. **Area-Specific Suggestions (Blue Buttons)**
   - [ ] Select "Front Yard" area
   - [ ] Verify blue prompt buttons appear (e.g., "Colorful flower beds with seasonal blooms")
   - [ ] Click a suggestion → prompt is added to textarea
   - [ ] Select "Backyard" area
   - [ ] Verify different blue prompts appear (e.g., "Entertainment area with patio")

2. **Style-Specific Keywords (Purple Buttons)**
   - [ ] Select "Japanese Zen" style
   - [ ] Verify purple keyword buttons appear (e.g., "zen meditation area", "koi pond")
   - [ ] Click a keyword → added to prompt
   - [ ] Select "Modern Minimalist" style
   - [ ] Verify different purple keywords (e.g., "clean geometric lines")

3. **Prompt Insertion Logic**
   - [ ] Empty prompt: Click "Fire pit" → prompt is "Fire pit"
   - [ ] Existing prompt "Pool area": Click "tropical plants" → prompt is "Pool area, tropical plants"
   - [ ] Character limit respected (500 chars)

**Expected Behavior:**
- Suggestions change based on selected area and style
- Prompts append with comma separator
- Won't exceed 500 character limit

---

### Feature 3: Character Counter

**Location:** [/generate](http://localhost:3000/generate) → Section 3: Style Selection → Custom Instructions

**What to Test:**

1. **Counter Display**
   - [ ] Shows "0/500 characters" when empty
   - [ ] Updates in real-time as you type
   - [ ] Turns orange when > 450 characters
   - [ ] Turns darker at > 400 characters

2. **Character Limit Enforcement**
   - [ ] Type exactly 500 characters → should accept
   - [ ] Try to type 501st character → should be blocked
   - [ ] Paste 600 character text → should truncate to 500
   - [ ] Suggested prompt that would exceed 500 → should not be added

**Expected Behavior:**
- Hard limit of 500 characters enforced
- Visual warning at 400+ characters
- Suggested prompts respect the limit

---

### Feature 4: Progress Polling (2-Second Intervals)

**Location:** [/generate/progress/[id]](http://localhost:3000/generate/progress/[id])

**What to Test:**

1. **Real-Time Updates**
   - [ ] Submit a generation request
   - [ ] Navigate to progress page
   - [ ] Observe "Live updates enabled" indicator with pulsing green dot
   - [ ] Open Network tab → Filter by "generations"
   - [ ] Verify API calls every 2 seconds: `GET /generations/{id}`
   - [ ] Watch progress percentage update in real-time
   - [ ] Observe status messages update (e.g., "Retrieving imagery...", "Generating design...")

2. **Incremental Display**
   - [ ] Generate multiple areas (Front Yard + Backyard)
   - [ ] First area completes → image appears immediately
   - [ ] Second area still processing → shows progress bar
   - [ ] Second area completes → image appears

3. **Automatic Stop**
   - [ ] Wait for generation to complete
   - [ ] Verify polling stops (no more API calls in Network tab)
   - [ ] "Live updates enabled" indicator disappears
   - [ ] Completion message appears

**Expected Behavior:**
- Polling starts immediately on page load
- Updates every 2 seconds
- Stops when status is "completed" or "failed"
- Shows incremental results as areas complete

---

### Feature 5: Result Recovery (localStorage)

**Location:** [/generate/progress/[id]](http://localhost:3000/generate/progress/[id])

**What to Test:**

1. **Page Refresh During Generation**
   - [ ] Submit a generation (use 2+ areas for longer runtime)
   - [ ] Wait for generation to start (status: "processing")
   - [ ] Refresh the page (Cmd/Ctrl + R)
   - [ ] Verify progress is restored from localStorage
   - [ ] Verify polling resumes automatically
   - [ ] Verify progress continues updating

2. **Browser Close/Reopen**
   - [ ] Submit a generation
   - [ ] Wait for processing to start
   - [ ] Close the browser tab
   - [ ] Reopen: http://localhost:3000/generate/progress/[id]
   - [ ] Verify generation is recovered
   - [ ] Verify polling resumes

3. **Navigation Away and Back**
   - [ ] Submit a generation
   - [ ] Navigate to /generate (new tab or back button)
   - [ ] Navigate back to progress page
   - [ ] Verify progress is restored

**Expected Behavior:**
- Zero progress loss on page refresh
- localStorage persists generation state
- Polling resumes automatically after recovery
- Works across browser sessions

---

### Feature 6: Enhanced Progress Display

**Location:** [/generate/progress/[id]](http://localhost:3000/generate/progress/[id])

**What to Test:**

1. **Current Stage Display**
   - [ ] Verify current_stage field displays: "queued", "retrieving_imagery", "analyzing_property", "generating_design", "applying_style", "finalizing"
   - [ ] Stage updates in real-time during generation

2. **Status Messages**
   - [ ] Verify user-friendly status_message appears (e.g., "Analyzing your property...")
   - [ ] Messages update as generation progresses
   - [ ] Messages are clear and helpful

3. **Progress Percentage**
   - [ ] Each area shows individual progress (0-100%)
   - [ ] Overall progress is calculated (average of all areas)
   - [ ] Progress bar visually represents percentage

**Expected Behavior:**
- Stage and status message update every 2 seconds
- Clear indication of what's happening
- Progress bar matches percentage

---

## End-to-End Test Scenarios

### Scenario 1: Complete Generation Flow (Happy Path)

**Steps:**
1. Navigate to [/generate](http://localhost:3000/generate)
2. Enter address: "1600 Amphitheatre Parkway, Mountain View, CA"
3. Select areas: Front Yard + Backyard
4. Select style: Modern Minimalist
5. Add custom prompt: "Include drought-tolerant plants"
6. Set preservation strength: 0.7 (Subtle)
7. Click "Generate Landscape Design"
8. Wait for redirect to progress page
9. Observe real-time progress updates
10. Refresh page during processing → verify recovery
11. Wait for completion
12. Verify both area images appear
13. Verify completion message displays
14. Click "Generate Another Design" → returns to form

**Expected Result:** ✅ Complete generation with all features working

---

### Scenario 2: Suggested Prompts Integration

**Steps:**
1. Navigate to [/generate](http://localhost:3000/generate)
2. Enter address
3. Select area: Backyard
4. Select style: Japanese Zen
5. Click suggested prompt: "zen meditation area"
6. Click style keyword: "koi pond with natural rocks"
7. Verify custom prompt is: "zen meditation area, koi pond with natural rocks"
8. Observe character counter: should be around 50/500
9. Set preservation strength: 0.5 (Balanced)
10. Submit generation
11. Verify request includes correct custom_prompt and preservation_strength

**Expected Result:** ✅ Suggested prompts insert correctly, API receives both fields

---

### Scenario 3: Progress Recovery After Refresh

**Steps:**
1. Submit a generation with 3 areas (longer runtime)
2. Wait for status: "processing"
3. Note the progress percentage (e.g., 35%)
4. Open DevTools → Application → Local Storage
5. Verify `user-storage` key contains generation data
6. Hard refresh page (Cmd/Ctrl + Shift + R)
7. Verify progress restores to same percentage
8. Verify polling resumes (Network tab shows API calls)
9. Let generation complete
10. Verify localStorage is cleared after completion

**Expected Result:** ✅ Zero data loss, automatic recovery, cleanup after completion

---

### Scenario 4: Character Limit Enforcement

**Steps:**
1. Navigate to [/generate](http://localhost:3000/generate)
2. Paste 400 character text into custom prompt
3. Observe counter: 400/500 (normal color)
4. Type 55 more characters → counter should be 455/500 (orange warning)
5. Try to type more → should stop at 500
6. Click suggested prompt → should not add (would exceed limit)
7. Delete some text → now 480/500
8. Click suggested prompt → should add if fits

**Expected Result:** ✅ Hard limit enforced, visual warning at threshold, suggested prompts respect limit

---

### Scenario 5: Multiple Area Generation

**Steps:**
1. Submit generation with 4 areas (Front Yard, Backyard, Side Yard, Walkway)
2. Observe each area's individual progress
3. Verify first completed area shows image immediately
4. Other areas still show progress bars
5. Verify overall progress is average of all areas
6. Wait for all areas to complete
7. Verify all 4 images display

**Expected Result:** ✅ Incremental display, individual tracking, all areas complete

---

## Debugging Tips

### Issue: CORS Errors
**Symptom:** API calls fail with CORS errors in console
**Fix:**
```bash
# Check frontend/.env.local
NEXT_PUBLIC_API_URL=http://localhost:8000  # Must be localhost, not production URL
```

### Issue: Polling Doesn't Start
**Symptom:** Progress page loads but no updates
**Check:**
1. Network tab → Are API calls being made?
2. Console → Any JavaScript errors?
3. Backend terminal → Is it receiving requests?
4. localStorage → Is generation data persisted?

### Issue: Preservation Strength Not Sent
**Symptom:** API doesn't receive preservation_strength
**Check:**
1. Network tab → Inspect request payload
2. Should see: `preservation_strength: 0.5` in each area object
3. Backend logs → Check if parameter is received

### Issue: Suggested Prompts Don't Appear
**Symptom:** No blue/purple buttons visible
**Check:**
1. Area must be selected first
2. Scroll down to custom prompt section
3. Verify StyleSelectorEnhanced received selectedArea prop

### Issue: Progress Not Recovered After Refresh
**Symptom:** Page refresh loses progress
**Check:**
1. DevTools → Application → Local Storage → `user-storage`
2. Should contain currentGeneration object
3. Verify generation status is not "completed"
4. Check browser console for errors

---

## Test Checklist Summary

Before marking Phase 2 complete, verify:

### Generation Form
- [ ] Preservation strength slider works (0.0-1.0 range)
- [ ] Visual feedback changes (colors, labels, descriptions)
- [ ] Suggested prompts display for selected area/style
- [ ] Character counter shows and enforces 500 limit
- [ ] API request includes preservation_strength

### Progress Page
- [ ] Real-time polling every 2 seconds
- [ ] Live updates indicator visible
- [ ] Progress percentage updates
- [ ] Current stage and status messages display
- [ ] Polling stops when complete

### Result Recovery
- [ ] Page refresh preserves progress
- [ ] Polling resumes after recovery
- [ ] localStorage contains generation data
- [ ] Works across browser sessions

### API Integration
- [ ] preservation_strength sent to backend
- [ ] Backend accepts and stores parameter
- [ ] API returns current_stage and status_message
- [ ] getGeneration() alias works for polling

---

## Known Limitations

1. **Local Only:** These features are tested in local environment only. Production deployment requires separate testing.
2. **No E2E Tests Yet:** Phase 2 features do not have automated Playwright tests. Add after manual verification.
3. **Backend Must Support v2 Fields:** Ensure backend returns preservation_strength, current_stage, status_message in responses.

---

## Next Steps After Testing

Once all tests pass:

1. **Create Playwright E2E Tests**
   - Test preservation strength slider
   - Test suggested prompts insertion
   - Test character counter enforcement
   - Test progress polling and recovery

2. **Deploy to Staging**
   - Update Vercel environment variables
   - Test against staging backend
   - Verify CORS configuration

3. **Production Deployment**
   - Update production environment variables
   - Monitor API usage and costs
   - Track user engagement with new features

4. **Monitor Performance**
   - Check API call frequency (should be 2 seconds)
   - Monitor localStorage size
   - Track Gemini API costs with new prompts

---

## Support

If you encounter issues:

1. Check CORS configuration in frontend/.env.local
2. Verify backend is running on port 8000
3. Review browser console for JavaScript errors
4. Check Network tab for failed API calls
5. Inspect localStorage for persistence issues

**Phase 2 is ready for local testing. Follow this guide to verify all features before deployment.**
