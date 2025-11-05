# /test-and-fix - Automated E2E Testing & Fixing

**Autonomous E2E testing workflow with Playwright MCP integration**

---

## Purpose

Execute comprehensive automated E2E testing based on TEST_PLAN.md, generate detailed reports, and optionally fix discovered issues. Supports targeting specific CUJs or running the complete test suite.

---

## Parameters

- `cuj` (optional): Specific CUJ to test (e.g., `CUJ-1`, `CUJ-2`). If omitted, runs all CUJs.
- `fix` (optional): `true` to automatically attempt fixes for failures. Default: `false` (report only).
- `browser` (optional): Browser to use (`chromium`, `firefox`, `webkit`). Default: `chromium`.

---

## Workflow

### Phase 1: Preparation & Planning (5 min)

1. **Read TEST_PLAN.md**
   - Parse all CUJ definitions and test cases
   - Extract E2E test scenarios (marked as "Type: E2E" or "Type: E2E (Playwright)")
   - Identify dependencies (e.g., user registration before generation)

2. **Validate Environment**
   - Check if Playwright MCP is available and configured
   - Verify `.env.local` has required test credentials
   - Confirm backend/frontend services are running
   - Check deployment URLs (Railway backend, Vercel frontend)

3. **Create Test Session Plan**
   - Generate `TEST_SESSION_SUMMARY.md` with:
     - Timestamp and test scope
     - List of CUJs to test
     - Test case mapping (TC-IDs to execution order)
     - Expected duration
     - Success criteria

4. **Initialize TodoWrite**
   - Create todos for each CUJ or test case to be executed
   - Mark preparation phase as complete

---

### Phase 2: E2E Test Execution (30-90 min)

For each CUJ or test case in scope:

#### Step 1: Pre-Test Setup
- Launch browser using Playwright MCP
- Navigate to application URL
- Clear cookies/storage if needed
- Take baseline screenshot

#### Step 2: Execute Test Scenario

**Example: CUJ-1 Trial Flow (TC-E2E-1)**

```typescript
1. Navigate to homepage → Take snapshot
2. Click "Get Started" → Verify redirect to /register
3. Fill registration form:
   - Email: test-{timestamp}@example.com
   - Password: SecurePass123!
   - Click "Register"
4. Wait for email verification (mock or actual)
5. Click verification link
6. Navigate to /dashboard
7. Click "Generate Design"
8. Fill form:
   - Address: "1600 Amphitheatre Parkway, Mountain View, CA"
   - Area: front_yard
   - Style: modern_minimalist
9. Click "Generate"
10. Monitor progress (wait up to 60s)
11. Verify:
    - Trial count decremented (3→2)
    - Generation completes
    - Images displayed
12. Repeat for 2nd and 3rd trials
13. Verify "Trial Exhausted" modal appears
14. Take final screenshot
```

**Example: CUJ-2 Token Purchase (TC-E2E-2)**

```typescript
1. Login as trial-exhausted user
2. Click "Buy 50 Tokens ($10)"
3. Verify Stripe checkout page loads
4. Fill test card: 4242 4242 4242 4242, 12/34, 123
5. Click "Pay"
6. Wait for redirect to /dashboard
7. Verify token balance shows "50 tokens"
8. Take screenshot of dashboard
```

**Example: CUJ-5 Multi-Area (TC-E2E-3)**

```typescript
1. Login with token balance
2. Click "New Generation"
3. Enter address: "1 Apple Park Way, Cupertino, CA"
4. Select areas: front_yard, back_yard, walkway
5. Add custom prompts for each area
6. Verify cost preview: "3 areas = 3 tokens"
7. Click "Generate"
8. Monitor parallel progress bars
9. Wait for all 3 to complete
10. Verify all 3 results displayed
11. Check token balance (50→47)
```

#### Step 3: Assertion & Validation
- Verify expected UI elements present
- Check API responses (via browser network logs)
- Validate data integrity (token balance, trial count)
- Take screenshots at key steps
- Record console errors/warnings

#### Step 4: Result Recording
- Update `TEST_SESSION_SUMMARY.md` with:
  - ✅ PASS or ❌ FAIL status
  - Execution time
  - Screenshots (save to `.playwright-mcp/`)
  - Error messages if any
  - API logs if relevant

#### Step 5: Failure Handling (if `fix=true`)
- If test fails:
  - Analyze error (UI not found, timeout, API error)
  - Identify root cause (frontend bug, backend issue, timing)
  - Attempt automated fix:
    - Update selectors if UI changed
    - Add wait conditions if timing issue
    - Report backend bugs if API error
  - Retry test once after fix
  - Document fix in summary

---

### Phase 3: Reporting & Analysis (10 min)

1. **Generate Comprehensive Report**
   - Update `TEST_SESSION_SUMMARY.md`:
     - Executive summary (pass rate, duration)
     - Detailed results per CUJ
     - Screenshots and logs
     - Failed test analysis
     - Recommendations

2. **Create Bug Report (if failures found)**
   - Generate `BUG_REPORT_{timestamp}.md`:
     - List all failures with reproduction steps
     - Screenshots and error logs
     - Suggested fixes
     - Priority/severity ratings

3. **Update TEST_PLAN.md**
   - Mark test cases as ✅ PASSED or ❌ FAILED
   - Update "Test Results Summary" section
   - Record date and pass rate

4. **Output Summary to User**
   - Display pass/fail statistics
   - Link to generated reports
   - Highlight critical issues
   - Suggest next actions

---

## Usage Examples

### Example 1: Test All CUJs (Report Only)
```bash
/test-and-fix
```

**Output:**
```
🧪 E2E Test Session Started
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📋 Scope: All CUJs (CUJ-1 through CUJ-6)
🌐 Browser: chromium
🎯 Mode: Report Only (fix=false)

Phase 1: Preparation
✅ TEST_PLAN.md parsed: 6 CUJs, 23 E2E test cases
✅ Playwright MCP available
✅ Backend: https://yarda-backend.up.railway.app
✅ Frontend: https://yarda.vercel.app
✅ Test session summary created

Phase 2: Execution
⏳ Testing CUJ-1: Trial Flow (TC-E2E-1)
   ✅ Homepage loaded (0.8s)
   ✅ Registration completed (2.3s)
   ✅ Email verified (0.5s mock)
   ✅ First generation: 48.2s
   ✅ Second generation: 51.7s
   ✅ Third generation: 49.3s
   ✅ Trial exhausted modal shown
   📸 Screenshots: 7 saved to .playwright-mcp/

⏳ Testing CUJ-2: Token Purchase (TC-E2E-2)
   ✅ Login successful (1.2s)
   ✅ Stripe checkout loaded (2.1s)
   ✅ Payment processed (3.4s)
   ✅ Balance updated to 50 tokens
   📸 Screenshots: 4 saved

⏳ Testing CUJ-5: Multi-Area (TC-E2E-3)
   ✅ Multi-area form loaded (1.0s)
   ✅ 3 areas selected
   ✅ Parallel generation started
   ❌ FAILED: Only 2 of 3 areas completed
      Error: Timeout waiting for walkway result
      Time: 92s (exceeded 90s limit)
   📸 Error screenshot: .playwright-mcp/cuj5-timeout.png

Phase 3: Reporting
✅ TEST_SESSION_SUMMARY.md updated
✅ BUG_REPORT_20251104_143022.md created

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📊 Results Summary:
   Total: 23 tests
   Passed: 22 (95.7%)
   Failed: 1 (4.3%)
   Duration: 47m 23s

❌ Critical Issues:
   1. CUJ-5: Multi-area timeout on 3rd area
      Severity: HIGH
      Impact: Users cannot complete 3-area generations
      Suggested Fix: Increase timeout or optimize backend

📄 Reports:
   - TEST_SESSION_SUMMARY.md
   - BUG_REPORT_20251104_143022.md
   - Screenshots: .playwright-mcp/ (18 files)

✅ Recommendation: Fix CUJ-5 timeout before production deployment
```

---

### Example 2: Test Single CUJ with Auto-Fix
```bash
/test-and-fix cuj=CUJ-1 fix=true
```

**Output:**
```
🧪 E2E Test Session: CUJ-1 Only (Auto-Fix Enabled)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Testing: CUJ-1 Trial Flow (4 test cases)

⏳ TC-E2E-1: Complete Trial Flow
   ❌ FAILED: Email verification link not found
      Error: Button with text "Verify Email" not found

🔧 Auto-Fix Attempt:
   Analyzing... Button text changed to "Confirm Email"
   Updated selector: button:has-text("Confirm Email")
   Retrying...
   ✅ FIXED: Test now passes

⏳ TC-1.2: Email Verification
   ✅ PASSED (0.6s)

⏳ TC-1.3: First Design Generation
   ✅ PASSED (49.2s)

⏳ TC-1.4: Complete All Trials
   ✅ PASSED (152.8s)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📊 Results: 4/4 PASSED (1 auto-fixed)
⏱️ Duration: 12m 34s

✅ All CUJ-1 tests passing after auto-fix
🔧 Fix applied: Updated email verification selector in test suite
```

---

### Example 3: Test Specific CUJs
```bash
/test-and-fix cuj=CUJ-1,CUJ-2,CUJ-5 browser=firefox
```

---

## Success Criteria

- ✅ All targeted test cases executed
- ✅ Comprehensive report generated
- ✅ Screenshots captured at key steps
- ✅ Pass rate ≥90% for production readiness
- ✅ All failures documented with reproduction steps
- ✅ TEST_PLAN.md updated with results

---

## Error Handling

### Common Issues:

1. **Playwright MCP Not Available**
   - Error: "Playwright MCP tool not found"
   - Action: Prompt user to install/configure MCP

2. **Services Not Running**
   - Error: "Cannot connect to backend"
   - Action: Verify Railway/Vercel deployments, suggest starting local services

3. **Test Timeout**
   - Error: "Generation exceeded 60s timeout"
   - Action: Log timeout, mark as FAIL, suggest backend optimization

4. **Element Not Found**
   - Error: "Button 'Generate' not found"
   - Action: Take screenshot, log HTML structure, suggest UI fix

5. **Network Error**
   - Error: "API returned 500"
   - Action: Log response body, check backend logs, mark as backend issue

---

## Technical Notes

### Playwright MCP Integration:

```typescript
// Navigation
mcp__playwright__browser_navigate(url: "https://yarda.vercel.app")

// Interaction
mcp__playwright__browser_click(element: "button:has-text('Get Started')", ref: "...")

// Form Filling
mcp__playwright__browser_fill_form(fields: [
  { name: "email", type: "textbox", ref: "...", value: "test@example.com" },
  { name: "password", type: "textbox", ref: "...", value: "SecurePass123!" }
])

// Screenshot
mcp__playwright__browser_take_screenshot(filename: "cuj1-step3.png")

// Assertion
mcp__playwright__browser_snapshot() // Get accessibility tree
```

### Test Data Management:

- Use timestamp-based emails: `test-{timestamp}@example.com`
- Use Stripe test cards: `4242 4242 4242 4242`
- Generate unique addresses to avoid caching issues
- Clean up test users after session (optional)

---

## Output Files

1. **TEST_SESSION_SUMMARY.md**
   - Executive summary
   - Detailed results per test case
   - Screenshots and logs
   - Pass/fail statistics

2. **BUG_REPORT_{timestamp}.md** (if failures)
   - List of failures
   - Reproduction steps
   - Screenshots
   - Suggested fixes

3. **Screenshots** (`.playwright-mcp/`)
   - Organized by CUJ and test case
   - Baseline, success, and error screenshots
   - Labeled with timestamp

4. **Updated TEST_PLAN.md**
   - Test status updated (✅/❌)
   - Pass rate recorded
   - Date of last run

---

## Autonomous Execution

This command runs fully autonomously:
1. ✅ Reads TEST_PLAN.md without user input
2. ✅ Executes all test cases sequentially
3. ✅ Generates reports automatically
4. ✅ Attempts fixes if `fix=true`
5. ✅ Updates status in TEST_PLAN.md
6. ✅ Outputs final summary with recommendations

**User only needs to:** Run `/test-and-fix` and review the final report.

---

## Integration with Other Commands

- `/speckit.implement` → Run `/test-and-fix` after implementation
- `/speckit.analyze` → Use test results for quality analysis
- Commit workflow → Run `/test-and-fix` before creating PR

---

**Usage:** `/test-and-fix [cuj=CUJ-1] [fix=true] [browser=chromium]`
