---
description: Comprehensive automated testing with Playwright MCP - design, UX, accessibility, responsiveness, performance
---

# Comprehensive Testing - Automated Design & UX Verification

**Purpose:** Agent-driven comprehensive testing using Playwright MCP to verify design polish, UX quality, accessibility, responsive behavior, and performance metrics.

**This is NOT human manual testing.** This is automated testing by an intelligent agent using Playwright to comprehensively validate all aspects of the application.

**Usage:** `/test-comprehensive [feature] [environment]`

## Quick Start

```bash
# Comprehensive verification of language switching
/test-comprehensive language-switching

# Full design + UX verification on staging
/test-comprehensive generation staging --detailed

# Accessibility audit before production
/test-comprehensive all --accessibility --report

# Design polish check with screenshots
/test-comprehensive generation local --visual-inspection
```

## What This Command Does

### 🎨 Design Verification (Automated)
Agent uses Playwright to verify:
- ✅ CSS styling applied correctly
- ✅ Layout alignment and spacing
- ✅ Color contrast meets WCAG AA
- ✅ Typography readable at all sizes
- ✅ Responsive breakpoints work
- ✅ Dark mode (if applicable)
- ✅ Animations smooth (no jank)
- ✅ Visual hierarchy clear

**How it works:**
```typescript
// Agent-driven visual testing
const designChecks = await page.evaluate(() => {
  const button = document.querySelector('button');
  return {
    padding: getComputedStyle(button).padding,
    color: getComputedStyle(button).color,
    contrast: calculateContrast(bgColor, textColor),
    alignment: button.getBoundingClientRect().x % 5, // pixel-perfect
    fontSize: parseInt(getComputedStyle(button).fontSize)
  };
});
```

### ♿ Accessibility Testing (Automated)
Agent verifies:
- ✅ ARIA labels present and correct
- ✅ Keyboard navigation works (Tab, Enter, Escape)
- ✅ Screen reader announces correctly
- ✅ Color contrast ≥ 4.5:1 (normal text) or 3:1 (large text)
- ✅ Focus visible at all times
- ✅ Form fields labeled
- ✅ Error messages announced
- ✅ No focusable elements hidden
- ✅ Zoom to 200% doesn't break layout
- ✅ Page meaningful at 400% zoom

**How it works:**
```typescript
// Agent-driven accessibility audit
const a11yChecks = await axe.run(page);
// Returns violations, passes, and incomplete checks
// Agent remediates if fixable

// Keyboard navigation test
await page.press('Tab'); // Focus moves to next element
await page.press('Enter'); // Activates button
await page.press('Escape'); // Closes modal
```

### 📱 Responsive Design Testing (Automated)
Agent tests on multiple viewports:
- 📱 Mobile Small (375×667) - iPhone SE
- 📱 Mobile Large (430×932) - iPhone 14 Pro Max
- 📱 Tablet (768×1024) - iPad
- 💻 Desktop (1440×900) - Standard desktop
- 💻 Desktop Large (1920×1080) - High-res monitor
- 📺 4K (2560×1440) - Ultra-wide

For each viewport:
- ✅ Touch targets ≥ 44×44px
- ✅ Text readable without zoom
- ✅ No horizontal scroll (< 320px width)
- ✅ Images load and display
- ✅ Forms accessible
- ✅ Keyboard accessible

### ⚡ Performance Testing (Automated)
Agent measures:
- ✅ Page load time (target: < 3 sec)
- ✅ Time to Interactive (target: < 5 sec)
- ✅ Cumulative Layout Shift (target: < 0.1)
- ✅ First Contentful Paint (target: < 1.8 sec)
- ✅ Total payload size
- ✅ Unused CSS/JS
- ✅ Image optimization
- ✅ Network waterfall analysis

**How it works:**
```typescript
// Agent-driven performance measurement
const metrics = await page.evaluate(() => {
  const navigation = performance.getEntriesByType('navigation')[0];
  return {
    loadTime: navigation.loadEventEnd - navigation.loadEventStart,
    tti: navigation.domContentLoadedEventEnd - navigation.fetchStart,
    cls: PerformanceObserver.observe({ type: 'layout-shift' })
  };
});
```

### 🌐 Browser Compatibility Testing (Automated)
Agent tests on:
- ✅ Chrome/Chromium (latest)
- ✅ Firefox (latest)
- ✅ Safari/WebKit (latest)
- ✅ Mobile Chrome (Android)
- ✅ Mobile Safari (iOS)

For each browser:
- ✅ Renders correctly
- ✅ No console errors
- ✅ Features work
- ✅ Performance acceptable
- ✅ No layout shifts

### 🔗 Real Device Testing (Automated)
Agent uses Playwright's device emulation to test:
- ✅ iPhone 12 (iOS)
- ✅ iPhone 14 Pro Max (iOS, large)
- ✅ Samsung Galaxy S21 (Android)
- ✅ iPad Air (Tablet)
- ✅ Pixel 6 (Android, modern)

Tests on each device:
- ✅ Touch interactions responsive
- ✅ Keyboard handling (mobile keyboard)
- ✅ Notch/safe area doesn't cut content
- ✅ Landscape orientation works
- ✅ Dark mode readability

### 🎬 Visual Regression Testing (Automated)
Agent captures baseline screenshots and compares:
- ✅ No unexpected visual changes
- ✅ Component styling consistent
- ✅ Color changes detected
- ✅ Layout shifts identified
- ✅ Animation frame rendering

## Supported Features

| Feature | Tests | Coverage |
|---------|-------|----------|
| Language Switching | 9 base tests + 20 design checks | Design, A11y, Responsive |
| Generation Flow | 15 base tests + 35 design checks | Design, A11y, Perf, Responsive |
| Authentication | 12 base tests + 15 design checks | Design, A11y, Responsive |
| Token Purchase | 8 base tests + 25 design checks | Design, A11y, Perf, Responsive |
| Subscription | 8 base tests + 20 design checks | Design, A11y, Responsive |
| Holiday Decorator | 12 base tests + 30 design checks | Design, A11y, Perf, Responsive |
| **All Features** | 50+ base tests + 145+ design checks | Complete |

## Parameters

### Feature Name (Optional)
Specific feature to test, or `all` for comprehensive system testing.

```bash
/test-comprehensive language-switching       # Feature only
/test-comprehensive all                      # Everything
```

### Environment (Optional, Default: `local`)
Where to test:
```bash
/test-comprehensive generation local        # Local (fastest)
/test-comprehensive generation staging       # Staging (real backend)
/test-comprehensive generation production    # Production (with caution)
```

### Testing Levels

```bash
# Level 1: Basic Design Checks (fast)
/test-comprehensive generation --basic
# Checks: Colors, spacing, typography, alignment

# Level 2: Design + Accessibility (standard)
/test-comprehensive generation --standard
# Includes: A11y audit, keyboard nav, ARIA labels

# Level 3: Design + A11y + Responsive (comprehensive)
/test-comprehensive generation --comprehensive
# Includes: All devices, all orientations, all zooms

# Level 4: Full Deep Dive (slow)
/test-comprehensive generation --detailed
# Includes: Performance, visual regression, detailed reports
```

### Options

```bash
--accessibility              # Focus on a11y checks
--responsive                 # Focus on responsive testing
--performance               # Focus on performance metrics
--visual-inspection         # Generate visual comparison reports
--detailed                  # Verbose output with all checks
--fix                       # Auto-fix any CSS/styling issues found
--report                    # Generate detailed HTML report
--compare-baseline          # Compare against baseline screenshots
--no-screenshots            # Skip screenshot capture
```

## Example Workflows

### Workflow 1: Design Polish Before Launch

```bash
# You: Design complete, want to verify polish
/test-comprehensive all --detailed --visual-inspection

# Agent:
🎨 COMPREHENSIVE DESIGN & UX VERIFICATION
Environment: local (http://localhost:3000)
Testing all features for design, accessibility, and UX quality

🎨 DESIGN VERIFICATION
[language-switching]
✅ Typography: All fonts correct sizes
✅ Colors: All colors within design system
✅ Spacing: Alignment pixel-perfect
✅ Animation: Smooth 60 FPS
✅ Contrast: All text ≥ 4.5:1

[generation]
✅ Form layout: Responsive at all sizes
✅ Progress indicators: Clear and animated
✅ Result gallery: Proper image display
✅ Buttons: Proper sizes and states
✅ Modal: Centered and accessible

♿ ACCESSIBILITY VERIFICATION
✅ Keyboard navigation: All features accessible via Tab/Enter
✅ Screen readers: All labels present and correct
✅ Focus visible: Clear focus indicators throughout
✅ ARIA: All dynamic content properly labeled
✅ Zoom: Layout works at 200% and 400%
✅ Color: Not sole differentiator (icons + text)

📱 RESPONSIVE DESIGN
✅ iPhone SE (375px): Readable without zoom
✅ iPhone 14 (390px): Touch targets ≥ 44px
✅ iPad (768px): Proper tablet layout
✅ Desktop (1440px): Full-width usage
✅ Ultra-wide (2560px): Doesn't stretch excessively

⚡ PERFORMANCE METRICS
✅ Page Load: 1.2 sec (target: < 3 sec)
✅ Time to Interactive: 2.4 sec (target: < 5 sec)
✅ CLS (Layout Shift): 0.08 (target: < 0.1)
✅ Total Payload: 2.1 MB (reasonable for image-heavy app)

📊 SUMMARY
✅ All 50+ base tests passing
✅ All 145+ design checks passing
✅ All devices responsive
✅ All accessibility requirements met
✅ Performance within SLA
✅ Ready for production

📸 Visual Reports: [link to detailed comparison report]
📋 Accessibility Audit: [link to WCAG compliance report]
📊 Performance Report: [link to metrics breakdown]
```

### Workflow 2: Staging Verification Before Production

```bash
# You: Feature deployed to staging, verify before production
/test-comprehensive all staging --accessibility --responsive

# Agent:
🚀 COMPREHENSIVE TESTING ON STAGING
Environment: staging (Vercel preview + Railway)
Backend: Production (real data)

📋 RUNNING COMPREHENSIVE CHECKS...

🎨 Design Quality
✅ All 145+ design checks passing
✅ Visual regression: No unexpected changes
✅ Screenshot comparison: Matches baseline

♿ Accessibility Audit
✅ WCAG AA: 100% compliant
✅ Keyboard navigation: All features accessible
✅ Screen readers: All content announced
✅ 18 accessibility checks: All passing

📱 Responsive Testing
✅ 6 device types tested
✅ All viewports render correctly
✅ Touch targets appropriate
✅ No layout shifts

🌐 Cross-Browser
✅ Chrome: All features work
✅ Firefox: All features work
✅ Safari: All features work
✅ Mobile browsers: All features work

⚡ Performance
✅ Load time: 1.5 sec
✅ TTI: 2.8 sec
✅ CLS: 0.05
✅ API response: < 500ms

📊 SUMMARY
✅ All checks passing on staging
✅ Ready for production deployment
✅ No issues detected
```

### Workflow 3: Feature-Specific Deep Dive

```bash
# You: Want to deeply verify generation flow design before launch
/test-comprehensive generation local --detailed --visual-inspection --report

# Agent tests:
✅ Form rendering (all input types)
✅ Address autocomplete styling
✅ Area selection visual feedback
✅ Style previews display
✅ Progress animation smooth
✅ Result gallery responsive
✅ Image loading states
✅ Error messages readable
✅ Mobile button sizes
✅ Keyboard accessible
✅ Screen reader friendly
✅ 200% zoom works
✅ Performance metrics

Result: Comprehensive HTML report with:
- ✅ All checks documented
- 📸 Before/after screenshots
- ♿ Accessibility audit
- 📱 Device-specific findings
- ⚡ Performance metrics
```

## Integration with Other Commands

**Testing Pipeline:**
```bash
1. Code implementation
   ↓
2. Unit tests pass: /test-specific
   ↓
3. CUJs verified: /test-cuj
   ↓
4. Full test suite: /test-all-local
   ↓
5. 🎨 Design/UX comprehensive: /test-comprehensive  ← You are here
   ↓
6. Full CI/CD: /test-smart
   ↓
7. Deploy to production ✅
```

**Pre-Launch Checklist:**
```bash
# Step 1: Core functionality
/test-smart              # All tests pass

# Step 2: CUJ verification
/test-cuj registration-to-generation
/test-cuj single-page-generation
/test-cuj token-purchase-flow

# Step 3: Design & UX polish ← Design team does this
/test-comprehensive all --accessibility --responsive --report

# Step 4: Production ready
# If all above ✅ → Ready to deploy
```

## Output & Reports

Agent generates three types of reports:

### 1. Console Report (Real-time)
Shows checks as they run, final summary with pass/fail counts.

### 2. HTML Report (Detailed)
Comprehensive report with:
- All check results
- Screenshots and visual comparisons
- WCAG compliance details
- Performance metrics
- Device-specific findings
- Recommendations

### 3. JSON Report (Machine-readable)
Detailed data for automated analysis:
- Check results
- Metric values
- Baseline comparisons
- Accessibility violations

## Success Criteria

Before shipping to production, all of these must pass:

```
✅ 50+ base tests passing
✅ 145+ design checks passing
✅ Accessible on all devices
✅ Responsive at all breakpoints
✅ WCAG AA compliant
✅ Performance within SLA
✅ No visual regressions
✅ No layout shifts (CLS < 0.1)
✅ All browsers compatible
✅ Code reviewed and approved
```

## How It Works (Agent Behavior)

```typescript
// Agent runs comprehensive checks automatically
const comprehensiveTest = async (feature, environment) => {
  // 1. Setup environment
  setupEnvironment(environment);

  // 2. Load page
  await page.goto(featureUrl);

  // 3. Design checks
  await verifyColors(page);
  await verifySpacing(page);
  await verifyTypography(page);

  // 4. Accessibility audit
  const violations = await axe.run(page);
  await remediateIfPossible(violations);

  // 5. Responsive testing
  for (const viewport of viewports) {
    await page.setViewportSize(viewport);
    await verifyResponsiveness(page);
  }

  // 6. Performance metrics
  const metrics = await collectMetrics(page);

  // 7. Generate reports
  await generateReports(results);

  // Return summary
  return summary;
};
```

## Key Differences from Human Testing

| Aspect | This Command (/test-comprehensive) | Human Manual Testing |
|--------|-----------------------------------|----------------------|
| **Speed** | 5-15 min | 30+ min |
| **Consistency** | 100% (same checks every time) | Varies (human factor) |
| **Repeatability** | Deterministic | Non-deterministic |
| **Scale** | Test everything at once | Limited to what user tests |
| **Accessibility** | Automated a11y audit | Manual verification |
| **Documentation** | Detailed reports auto-generated | Manual notes |
| **Coverage** | All viewports, all browsers | Sample testing |
| **Cost** | Free (runs in agent) | Hours of human time |

## Requirements Met

✅ **Agent-Driven Testing**
- Uses Playwright MCP for automated testing
- No human interaction required
- Autonomous decision-making
- Comprehensive verification

✅ **Comprehensive Coverage**
- Design verification (colors, spacing, typography)
- Accessibility audit (WCAG AA)
- Responsive testing (6+ devices)
- Performance metrics
- Cross-browser compatibility
- Visual regression detection

✅ **Environment-Aware**
- Local testing (fastest iteration)
- Staging verification (before production)
- Production monitoring (with safeguards)

✅ **Actionable Results**
- Detailed HTML reports
- Pass/fail metrics
- Specific violations with remediation
- Performance comparisons

---

**Command Family:**
- `/test-all-local` - All tests (comprehensive)
- `/test-specific` - Specific feature (focused)
- `/test-cuj` - Critical User Journey (end-to-end)
- `/test-bug-fix` - Environment-aware bug workflow
- `/test-comprehensive` - Design/UX/A11y verification ← You are here
- `/test-smart` - Full CI/CD pipeline
