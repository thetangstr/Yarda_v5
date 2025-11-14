---
description: Manual testing guidance - when, why, and how to test by hand
---

# Manual Testing - When & How to Test by Hand

**Purpose:** Provides guidance for manual (human) testing when automated tests reach their limits.

**Usage:** `/test-manual [feature] [checklist]`

## Quick Start

```bash
# Get guidance on manual testing language switching
/test-manual language-switching

# See complete checklist for generation flow
/test-manual generation --checklist

# Get tips for testing on actual devices
/test-manual design-responsive --devices

# Review what you should verify before requesting manual testing
/test-manual pre-manual-gate
```

## Critical Philosophy

> **Golden Rule:** NEVER request manual testing until ALL automated tests pass and ALL Critical User Journeys work perfectly.

### When Manual Testing is Appropriate ✅

Use manual testing ONLY for:
- **Final UX/design review** - Does it look and feel right?
- **Real device testing** - How does it work on actual phones/tablets?
- **Accessibility verification** - Can users with disabilities use it?
- **Visual polish** - Colors, spacing, animations look good?
- **Edge case scenarios** - Unusual user behaviors not covered by CUJs
- **Performance on real devices** - Latency, battery drain, data usage
- **Localization quality** - Do translations read naturally?
- **Real payment processing** - Live Stripe card processing (if needed)

### When Manual Testing is NOT Appropriate ❌

DO NOT request manual testing for:
- ❌ Testing if features work (that's what automated tests do)
- ❌ Catching bugs (automated tests should catch all bugs)
- ❌ Verifying functionality (automated CUJ tests verify this)
- ❌ Finding edge cases (tests should cover edge cases)
- ❌ Checking if code is correct (that's code review)
- ❌ Validating backend logic (that's backend unit tests)

**If you're tempted to request manual testing for any ❌ item above, run automated tests instead.**

## Pre-Manual-Testing Gate ✅

Before you EVER request manual testing, verify:

### Step 1: All Automated Tests Pass
```bash
# Local test suite
npm run test:e2e
# Result: 50+ tests passing ✅

# Backend tests
pytest tests/ -v
# Result: All passing ✅
```

### Step 2: All Critical CUJs Verified
```bash
# CUJ1: Registration
/test-cuj registration-to-generation
# Result: ✅ PASSED

# CUJ2: Language Switching (if modified)
/test-cuj language-switching-persistence
# Result: ✅ PASSED

# CUJ3: Generation Flow (if modified)
/test-cuj single-page-generation
# Result: ✅ PASSED

# [Continue for all affected CUJs]
```

### Step 3: No Known Issues
```bash
# Check recent error logs
railway logs backend --since 1h
# Result: No errors ✅

# Check frontend console for errors
npm run dev
# Open browser, check console
# Result: No errors ✅
```

### Step 4: UI is Polish
```
Visual checklist:
✅ Alignment looks correct
✅ Colors are consistent with design system
✅ Typography is clean and readable
✅ Buttons have proper hover/active states
✅ Forms have proper validation messaging
✅ Loading animations are smooth
✅ Error messages are clear and helpful
✅ Spacing is consistent
```

### Step 5: Code Review Passed
```
Code checklist:
✅ Code reviewed and approved
✅ No TypeScript errors
✅ No ESLint warnings
✅ No security issues found
✅ Performance optimization considered
✅ Accessibility (a11y) verified
✅ Browser compatibility checked
```

**Only when ALL 5 steps are complete can you request manual testing.**

## Feature-Specific Manual Testing Checklists

### Feature: Language Switching (i18n)
**When ready for manual testing:** All 9 tests passing, CUJ2 verified

**What to manually test:**

#### 1. Visual Appearance of Translations
```
□ Spanish translations display correctly
  □ No text overflow in buttons/forms
  □ Special characters (á, é, ñ) render properly
  □ Text alignment correct for right-to-left (if added)

□ Chinese translations display correctly
  □ Characters not cut off
  □ Font weights readable
  □ Character spacing appropriate
```

#### 2. Language Switcher UX
```
□ Button position natural and accessible
□ Hover state provides clear feedback
□ Language options labeled clearly
□ Current language highlighted appropriately
□ Dropdown transitions smooth
□ Close-on-click-outside works naturally
```

#### 3. Real Device Testing
```
□ Switcher accessible on iPhone 12
□ Switcher accessible on Samsung Galaxy S21
□ Switcher accessible on iPad
□ Dropdown not cut off by notch/safe area
□ Dropdown height reasonable on small screens
```

#### 4. Edge Cases
```
□ Reload page → language persists ✓
□ Close and reopen browser → language persists ✓
□ Share link with friend → works in their language ✓
□ Logout and login as different user → language correct ✓
```

#### 5. Accessibility
```
□ Language switcher keyboard accessible (Tab key)
□ Screen reader announces switcher properly
□ Language options are clearly readable
□ Color contrast meets WCAG AA standard
□ Font size readable on 400% zoom
```

**Manual Testing Time:** 15-20 minutes
**Who should test:** Designer, QA specialist, or accessibility expert
**Approver:** Product owner or lead

---

### Feature: Generation Flow (Single Page)
**When ready for manual testing:** CUJ3 passing, 15+ tests passing

**What to manually test:**

#### 1. Form UX
```
□ Form fields feel natural and responsive
□ Address input provides autocomplete suggestions
□ Map updates as you type address
□ Area selection visual feedback is clear
□ Style selection shows preview images
□ Form validation messages are helpful
```

#### 2. Polling Experience
```
□ Progress bars update smoothly every 2 seconds
□ No page jank or stuttering during updates
□ Progress text is accurate (e.g., "2/3 areas")
□ Loading animation is not distracting
□ User understands they're waiting for results
```

#### 3. Results Display
```
□ Generated images display in high quality
□ Image gallery scrolls smoothly
□ Before/after comparison is clear (if applicable)
□ Download button easy to find and use
□ Mobile preview works well
□ Images load completely before showing
```

#### 4. Mobile Experience
```
□ Form accessible on iPhone 12 (small screen)
□ Touch targets are large enough (44x44px minimum)
□ Keyboard doesn't cover form inputs
□ Scrolling is smooth on slow network
□ Results visible without zooming in
□ Download works on mobile browser
```

#### 5. Edge Cases
```
□ Network interruption handled gracefully
□ User can navigate away and come back
□ Multiple tabs open with same generation
□ Very long address doesn't break layout
□ Very large generated images load
□ Browser back button doesn't break state
```

**Manual Testing Time:** 20-30 minutes
**Who should test:** QA specialist, designer, or power user
**Approver:** Product owner

---

### Feature: Payment/Stripe Integration
**When ready for manual testing:** CUJ4/5 passing, payment tests passing

**What to manually test:**

#### 1. Checkout Experience
```
□ Stripe Checkout modal opens smoothly
□ Form fields accept input naturally
□ Error messages clear (e.g., invalid card)
□ Loading state clear during payment
□ Success confirmation immediate and obvious
□ Redirect back to app works
```

#### 2. Real Card Testing (Use Test Cards)
```
✓ 4242 4242 4242 4242 - Should succeed
✓ 4000 0000 0000 0002 - Should be declined
✓ 4000 0025 0000 3155 - Should trigger 3D Secure
✓ 5555 5555 5555 4444 - Should succeed (Mastercard)

For each test card:
□ Enters form naturally
□ Processes without errors
□ Shows appropriate result (success/failure)
□ Doesn't get stuck on loading
```

#### 3. Token Balance Updates
```
□ Token balance updates immediately after payment
□ No page refresh needed to see new balance
□ Balance reflected in generate button
□ User can generate immediately with new tokens
□ Stripe Customer Portal access works
□ Invoice history visible
```

#### 4. Error Scenarios
```
□ Network timeout handled gracefully
□ User can retry payment
□ Partial failures don't corrupt balance
□ Declined cards show helpful message
□ 3D Secure flow works smoothly
□ Can cancel payment and try again
```

**Manual Testing Time:** 25-35 minutes
**Who should test:** QA specialist with payment expertise
**Approver:** Engineering lead + Product owner
**Environment:** Stripe test mode first, then production after verification

---

### Feature: Holiday Decorator (Seasonal)
**When ready for manual testing:** CUJ7 passing, holiday tests passing

**What to manually test:**

#### 1. Street View Rotation
```
□ Rotation smooth and responsive
□ Heading indicator shows current angle
□ Drag/swipe works naturally on mobile
□ Arrow buttons work for those who prefer keyboard
□ Rotation limits prevent full 360 (realistic view range)
```

#### 2. Style Selection
```
□ Style preview images load and display
□ Style names clearly describe the look
□ Selected style shows visual feedback
□ Can change style and reprocess
□ Hover previews helpful or distracting? (designer judgment)
```

#### 3. Social Sharing
```
□ Share button easy to find
□ Web Share API works on mobile
□ Fallback copy-to-clipboard works on desktop
□ Shared image preview looks good
□ Shared URL works when friends visit
□ Credit bonus verification visible
```

#### 4. Mobile Experience
```
□ Street View rotatable with one finger
□ Style selection accessible
□ Generate button easy to tap
□ Before/after comparison works on mobile
□ Download works on mobile
□ Share works natively on iOS/Android
```

#### 5. Design Polish
```
□ Holiday theme colors appropriate
□ Icons are recognizable
□ Animations feel festive but not annoying
□ Dark mode support (if applicable)
□ Loading states clear
□ Error messages helpful
```

**Manual Testing Time:** 30-40 minutes
**Who should test:** Designer, QA, and real users if available
**Approver:** Product owner

---

## Manual Testing Environments

### Local Manual Testing
```bash
# Start both frontend and backend
cd frontend && npm run dev          # Port 3000
cd backend && source venv/bin/activate && uvicorn src.main:app --reload --port 8000

# Open browser
http://localhost:3000

# Testing checklist:
✓ Can see local changes immediately
✓ Can inspect browser console
✓ Can use DevTools
✓ Can mock API responses
✗ No real Stripe test (use test mode instead)
✗ No real notification delivery
```

### Staging/Preview Manual Testing
```bash
# Get preview URL from Vercel
https://yarda-v5-frontend-git-{branch}-{team}.vercel.app

# Testing checklist:
✓ Tests against real Railway backend
✓ Tests against real database
✓ Tests real Stripe test mode
✓ Tests real webhook delivery
✗ Tests against staging data (not production data)
✓ Can request test payment without charge
```

### Production Manual Testing
```bash
# Production URL
https://yarda.app

# Testing checklist:
⚠️ WARNING: Only test safe actions
✓ Can view existing designs
✓ Can test language switching (no charge)
✓ Can view account settings
✗ Do NOT test payments on production
✗ Do NOT delete user accounts
✗ Do NOT modify production data

# Safe testing scenarios:
□ View existing user account
□ View generation history
□ Test language switching
□ Test responsive design
□ View error handling
```

## Real Device Testing

### Devices to Test
```
□ iPhone 12 (iOS, small screen)
□ iPhone 14 Pro Max (iOS, large screen)
□ Samsung Galaxy S21 (Android)
□ iPad Air (Tablet)
□ Pixel 6 (Android, modern)
□ iPhone SE (iOS, old)
```

### Device Testing Checklist
```
□ Touch target sizes (44x44px minimum)
□ Keyboard handling (doesn't cover inputs)
□ Notch/safe area (doesn't cut off content)
□ Landscape orientation works
□ Dark mode readability
□ Network speed on 4G
□ Battery drain during generation
□ Data usage for image downloads
```

### Network Conditions to Test
```
□ Fast WiFi (normal)
□ Slow WiFi (throttled)
□ 4G network (mobile)
□ Intermittent connection (network timeout)
□ Offline (should show error gracefully)
```

## Accessibility Testing

### Screen Reader Testing
```bash
# Mac: Built-in VoiceOver
# Windows: NVDA (free)
# Mobile: Native screen reader

Checklist:
□ Navigation order makes sense
□ Button purposes announced clearly
□ Form labels associated with inputs
□ Error messages announced
□ Loading state announced
□ Results announced as ready
```

### Keyboard Navigation
```
□ Can reach all interactive elements with Tab
□ Tab order logical
□ Enter/Space activate buttons
□ Escape closes modals
□ Arrow keys work in appropriate contexts
□ Focus visible at all times (not invisible)
```

### Color Contrast
```
Use tool: https://webaim.org/resources/contrastchecker/

□ Text meets WCAG AA (4.5:1 for normal, 3:1 for large)
□ UI elements have sufficient contrast
□ Colorblind safe (don't rely on red/green alone)
□ Dark mode has sufficient contrast
```

### Zoom/Scale Testing
```
□ 400% zoom doesn't break layout
□ Text remains readable at 200% zoom
□ Can still access buttons at high zoom
□ No horizontal scrolling at 200% zoom
```

## Browser Compatibility Testing

### Desktop Browsers
```
□ Chrome (latest)
□ Firefox (latest)
□ Safari (latest)
□ Edge (latest)
```

### Mobile Browsers
```
□ Safari iOS (iPhone)
□ Chrome mobile (Android)
□ Firefox mobile
□ Samsung Internet (Android)
```

### Features to Verify by Browser
```
□ CSS animations smooth
□ Form inputs accessible
□ File downloads work
□ Clipboard copy works
□ Native share API available (mobile)
□ Geolocation permissions (if used)
```

## Performance Manual Testing

### Perception Testing
```
□ Page loads feel fast (subjective)
□ Form input response immediate
□ Image results appear quickly
□ No long (>2 sec) loading gaps
□ Animations are smooth (60 FPS feel)
```

### Network Monitoring
```
Using Chrome DevTools → Network Tab:
□ Total payload size reasonable
□ Large images lazy-load
□ API responses quick
□ No unnecessary requests
□ Cache headers correct
```

### Real Device Performance
```
On actual slow device:
□ Generation doesn't timeout
□ Images load progressively
□ User can still interact while loading
□ Battery drain acceptable
□ Data usage reasonable
```

## Sign-Off Criteria

Before signing off on manual testing, verify:

```
✅ All automated tests pass
✅ All CUJs work perfectly
✅ Visual design polished
✅ Mobile responsive
✅ Accessibility verified
✅ Real devices tested
✅ No known issues
✅ Performance acceptable
✅ Code reviewed
✅ Product owner approved

IF ALL ABOVE ✅ → READY FOR PRODUCTION DEPLOYMENT
```

## Integration with Automated Testing

```
Automated Testing (100% required)
    ↓
All tests passing?
    ├─ NO → Fix code, re-run tests
    └─ YES ↓
All CUJs verified?
    ├─ NO → Run CUJ tests, fix issues
    └─ YES ↓
UI polished?
    ├─ NO → Polish design, iterate
    └─ YES ↓
MANUAL TESTING (Optional, final polish)
    ↓
Manual testing passed?
    ├─ NO → Address feedback
    └─ YES ↓
PRODUCTION READY ✅
```

## When to Escalate from Automated to Manual

**Escalate when:**
- ✓ Automated tests all passing
- ✓ Edge cases verified by tests
- ✓ Real-world scenarios tested via CUJs
- ✓ Designer confident in visual design
- ✓ Accessibility verified by tools

**Then request:**
- Responsive device testing
- Real Stripe payment processing
- Live notification delivery
- Real user interaction feedback
- Design/UX review

## Tips for Effective Manual Testing

1. **Test with fresh eyes** - Have someone unfamiliar with code test it
2. **Test like a user** - Don't test as a developer, test as actual user
3. **Use real data** - Test with realistic addresses, styles, etc.
4. **Test edge cases** - Try the unusual scenarios
5. **Document issues** - Note exact steps to reproduce any problems
6. **Take screenshots** - Visual documentation of any issues found
7. **Use checklists** - Follow systematic approach, don't rely on memory
8. **Test on real devices** - Emulators are good but real devices better

## Common Manual Testing Mistakes

❌ **Don't:** Request manual testing for bug hunting
✅ **Do:** Fix bugs with automated tests first

❌ **Don't:** Use manual testing to validate features work
✅ **Do:** Use automated CUJ tests to validate features

❌ **Don't:** Skip automated testing to save time
✅ **Do:** Run full automated suite first

❌ **Don't:** Test features you personally built
✅ **Do:** Have someone else test your features

❌ **Don't:** Test only happy path
✅ **Do:** Test edge cases and error scenarios too

---

**Integration:** Works with `/test-smart`, `/test-all-local`, `/test-specific`, `/test-cuj`

**Manual Testing Philosophy:**
Automated testing finds bugs. Manual testing finds delight.
