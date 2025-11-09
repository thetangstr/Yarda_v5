# /test-and-fix - Automated E2E Testing & Fixing

**Autonomous E2E testing workflow with environment support and Playwright MCP integration**

---

## Purpose

Execute comprehensive automated E2E testing based on TEST_PLAN.md, generate detailed reports, and optionally fix discovered issues. Supports multiple environments (local, staging, production) with automatic environment preparation and targeting specific CUJs or running the complete test suite.

---

## Parameters

- `env` (optional): Target environment. Options:
  - `local` (default): Test against local backend (localhost:8000) and frontend (localhost:3000)
  - `staging` or `preview`: Test against Vercel preview deployment
  - `production` or `prod`: Test against production deployment
- `cuj` (optional): Specific CUJ to test (e.g., `CUJ-1`, `CUJ-8`). If omitted, runs all CUJs.
- `fix` (optional): `true` to automatically attempt fixes for failures. Default: `false` (report only).
- `browser` (optional): Browser to use (`chromium`, `firefox`, `webkit`). Default: `chromium`.

---

## Environment Configuration

### Local Environment (`env=local`)
**Backend:** http://localhost:8000
**Frontend:** http://localhost:3000
**Requirements:**
- Backend running: `cd backend && uvicorn src.main:app --reload --port 8000`
- Frontend running: `cd frontend && npm run dev`
- Environment: `frontend/.env.local` with `NEXT_PUBLIC_API_URL=http://localhost:8000`

### Staging/Preview Environment (`env=staging` or `env=preview`)
**Backend:** https://yarda-api-production.up.railway.app
**Frontend:** https://yarda-v5-frontend-git-*-thetangstrs-projects.vercel.app (preview URL)
**Requirements:**
- Vercel preview deployment active
- Railway backend deployed
- CORS configured for preview domain

### Production Environment (`env=production` or `env=prod`)
**Backend:** https://yarda-api-production.up.railway.app
**Frontend:** https://yarda.vercel.app (TBD - production domain)
**Requirements:**
- Production deployment live
- All environment variables configured
- No breaking changes deployed

---

## Workflow

### Phase 0: Environment Preparation (2-5 min)

This phase runs BEFORE test execution to ensure the target environment is ready.

#### Step 1: Parse Environment Parameter
- Determine target environment (local, staging, production)
- Set environment-specific URLs
- Load environment-specific configuration

#### Step 2: Environment-Specific Setup

**For Local Environment:**
1. Check if backend is running on port 8000
   ```bash
   curl http://localhost:8000/docs
   ```
   - **If not running: Automatically start backend in background**
   - Command: `cd backend && uvicorn src.main:app --reload --port 8000 --log-level info`
   - Wait up to 30 seconds for backend to be ready
   - Poll `http://localhost:8000/docs` every 2 seconds
   - Store background process ID for cleanup
   - Expected: FastAPI docs page loads

2. Check if frontend is running on port 3000
   ```bash
   curl http://localhost:3000
   ```
   - **If not running: Automatically start frontend in background**
   - Command: `cd frontend && npm run dev`
   - Wait up to 45 seconds for frontend to be ready
   - Poll `http://localhost:3000` every 3 seconds
   - Store background process ID for cleanup
   - Expected: Next.js page loads

3. Verify `frontend/.env.local` configuration
   ```bash
   grep "NEXT_PUBLIC_API_URL=http://localhost:8000" frontend/.env.local
   ```
   - If incorrect: Display error and stop
   - Expected: Points to local backend

4. Check database connection
   - Verify DATABASE_URL in `backend/.env`
   - Ping Supabase to confirm connectivity
   - Expected: Connection successful

5. Display local environment status:
   ```
   ✅ Local Environment Ready
   Backend:  http://localhost:8000 (responding)
             - Process: [PID] (auto-started)
   Frontend: http://localhost:3000 (responding)
             - Process: [PID] (auto-started)
   Database: Connected (Supabase)
   API URL:  ✅ Correctly configured
   ```

**Note:** Services started automatically will continue running after tests complete. Use the following commands to stop them if needed:
```bash
# Stop backend
lsof -ti:8000 | xargs kill

# Stop frontend
lsof -ti:3000 | xargs kill
```

**For Staging/Preview Environment:**
1. Determine Vercel preview URL
   - Check latest preview deployment
   - Extract URL from Vercel API or recent deployments
   - Example: `https://yarda-v5-frontend-git-004-generation-flow-fbe974-thetangstrs-projects.vercel.app`

2. Verify backend is accessible
   ```bash
   curl https://yarda-api-production.up.railway.app/docs
   ```
   - Expected: FastAPI docs page loads

3. Check CORS configuration
   - Verify backend allows preview domain
   - Test preflight request

4. Verify environment variables
   - Check Vercel environment variables
   - Confirm Railway environment variables

5. Display staging environment status:
   ```
   ✅ Staging Environment Ready
   Backend:  https://yarda-api-production.up.railway.app (responding)
   Frontend: https://yarda-v5-frontend-git-...-vercel.app (deployed)
   Branch:   004-generation-flow
   CORS:     Configured for *.vercel.app
   ```

**For Production Environment:**
1. Verify production backend
   ```bash
   curl https://yarda-api-production.up.railway.app/docs
   ```

2. Verify production frontend
   ```bash
   curl https://yarda.vercel.app
   ```

3. Check production database
   - Verify using production credentials
   - Ensure no test data pollution

4. Confirm user wants to test production
   - Display warning about production testing
   - Require explicit confirmation

5. Display production environment status:
   ```
   ⚠️  Production Environment Testing
   Backend:  https://yarda-api-production.up.railway.app
   Frontend: https://yarda.vercel.app

   WARNING: Testing in production. Use caution with test data.
   Proceed? (requires confirmation)
   ```

#### Step 3: Environment Health Check
- Ping backend health endpoint
- Load frontend homepage
- Verify authentication endpoints
- Check database connectivity
- Confirm Stripe (test mode for non-prod)
- Verify Google Maps API quota

---

### Phase 1: Test Plan Preparation (5 min)

1. **Read Latest TEST_PLAN.md**
   - Parse all CUJ definitions (including new Phase 2 CUJ-8)
   - Extract E2E test scenarios (marked as "Type: E2E" or "Type: E2E (Playwright)")
   - Identify dependencies (e.g., user registration before generation)
   - **New:** Include Phase 2 test cases (TC-UX-1 through TC-UX-6)

2. **Parse Phase 2 Features**
   - TC-UX-1: Preservation Strength Slider
   - TC-UX-2: Suggested Prompts (Area-Specific)
   - TC-UX-3: Suggested Prompts (Style-Specific)
   - TC-UX-4: Character Counter Enforcement
   - TC-UX-5: Enhanced Progress Display (v2 Fields)
   - TC-UX-6: Result Recovery with v2 Fields

3. **Validate Environment Compatibility**
   - Check if Playwright MCP is available and configured
   - Verify test credentials exist for target environment
   - Confirm services are running and accessible
   - Verify deployment URLs match environment

4. **Create Test Session Plan**
   - Generate `TEST_SESSION_{env}_{timestamp}.md` with:
     - Timestamp and test scope
     - Environment configuration (URLs, branch)
     - List of CUJs to test (including CUJ-8 if Phase 2 features)
     - Test case mapping (TC-IDs to execution order)
     - Expected duration
     - Success criteria

5. **Initialize TodoWrite**
   - Create todos for each CUJ or test case to be executed
   - Mark preparation phase as complete
   - Example:
     - [ ] CUJ-1: Trial Flow (4 test cases)
     - [ ] CUJ-7: Generation Flow (16 test cases)
     - [ ] CUJ-8: Phase 2 UX Features (6 test cases)

---

### Phase 2: E2E Test Execution (30-90 min)

For each CUJ or test case in scope:

#### Step 1: Pre-Test Setup
- Launch browser using Playwright MCP
- Navigate to frontend URL (environment-specific)
- Clear cookies/storage if needed
- Take baseline screenshot
- Verify page loads correctly

#### Step 2: Execute Test Scenario

**CRITICAL: Form Interaction Tests (Added 2025-11-08)**

Before running CUJ-specific tests, ALWAYS run these interaction tests:

```typescript
// TC-FORM-INTERACTION-1: Address Input Persistence
1. Navigate to {frontend_url}/generate
2. Type "123 Main" in address field
3. Wait for autocomplete suggestions
4. Click first autocomplete suggestion (selects full address)
5. ✅ ASSERT: Input value is full address (e.g., "123 Main St, City, State, ZIP")
6. Click on "Front Yard" area selector
7. ✅ ASSERT: Address input STILL shows full address (NOT "123 Main")
8. Click on "Back Yard" area selector
9. ✅ ASSERT: Address input STILL shows full address
10. Take screenshot: "address-persistence-after-interaction.png"
11. If FAILED: Report bug "Address reverts after area selection"

// TC-FORM-VALIDATION-1: Backend Accepts Frontend Enum Values
1. Navigate to {frontend_url}/generate
2. Fill form with valid data:
   - Address: "1600 Amphitheatre Parkway, Mountain View, CA"
   - Area: front_yard
   - Style: modern_minimalist (or any frontend default style)
3. Open Network tab (monitor API calls)
4. Click "Generate Design"
5. Wait for POST /generations/multi request
6. ✅ ASSERT: HTTP status is 200 or 201 (NOT 422)
7. If 422:
   - Capture request payload
   - Capture response error details
   - Take screenshot: "422-validation-error.png"
   - Report bug: "Frontend-backend enum mismatch"
8. ✅ ASSERT: Response includes generation_id
9. Take screenshot: "form-submission-success.png"
```

**Example: CUJ-8 Phase 2 Features (TC-UX-1)**

```typescript
// TC-UX-1: Preservation Strength Slider
1. Navigate to {frontend_url}/generate → Take snapshot
2. Verify user is authenticated (or login first)
3. Scroll to "Section 4: Transformation Intensity"
4. Verify slider displays with default value 0.5
5. Take screenshot: "preservation-slider-default.png"
6. Drag slider to 0.2 (Dramatic)
7. Verify label changes to "Dramatic" with purple color
8. Take screenshot: "preservation-slider-dramatic.png"
9. Drag slider to 0.8 (Subtle)
10. Verify label changes to "Subtle" with green color
11. Fill form:
    - Address: "1600 Amphitheatre Parkway, Mountain View, CA"
    - Area: front_yard
    - Style: modern_minimalist
    - Preservation: 0.8
12. Click "Generate"
13. Open Network tab → Verify API request
14. Check payload includes: preservation_strength: 0.8
15. ✅ ASSERT: HTTP status is 200/201 (NOT 422)
16. Take screenshot: "preservation-api-request.png"
17. Navigate to progress page
18. Verify preservation strength displayed in UI
```

**Example: CUJ-1 Trial Flow (TC-E2E-1)**

```typescript
1. Navigate to {frontend_url}/ → Take snapshot
2. Click "Get Started" → Verify redirect to /register
3. Fill registration form:
   - Email: test-{timestamp}@example.com
   - Password: SecurePass123!
   - Click "Register"
4. Wait for email verification (mock or actual)
5. Click verification link
6. Navigate to /generate
7. Click "Generate Design"
8. Fill form:
   - Address: "1600 Amphitheatre Parkway, Mountain View, CA"
   - Area: front_yard
   - Style: modern_minimalist
9. Click "Generate"
10. Monitor progress (wait up to 90s)
11. Verify:
    - Trial count decremented (3→2)
    - Generation completes
    - Images displayed
    - 2-second polling interval (Phase 2 enhancement)
12. Repeat for 2nd and 3rd trials
13. Verify "Trial Exhausted" modal appears
14. Take final screenshot
```

**Example: CUJ-2 Token Purchase (TC-E2E-2)**

```typescript
1. Login as trial-exhausted user at {frontend_url}/login
2. Click "Buy 50 Tokens ($10)"
3. Verify Stripe checkout page loads
4. Fill test card: 4242 4242 4242 4242, 12/34, 123
5. Click "Pay"
6. Wait for redirect to /generate
7. Verify token balance shows "50 tokens"
8. Take screenshot of token balance
```

#### Step 3: Assertion & Validation
- Verify expected UI elements present
- Check API responses (via browser network logs)
- Validate data integrity (token balance, trial count)
- **Phase 2:** Verify preservation_strength, current_stage, status_message in responses
- Take screenshots at key steps
- Record console errors/warnings

#### Step 4: Result Recording
- Update `TEST_SESSION_{env}_{timestamp}.md` with:
  - ✅ PASS or ❌ FAIL status
  - Execution time
  - Screenshots (save to `.playwright-mcp/{env}/`)
  - Error messages if any
  - API logs if relevant
  - Environment-specific notes

#### Step 5: Failure Handling (if `fix=true`)
- If test fails:
  - Analyze error (UI not found, timeout, API error)
  - Identify root cause (frontend bug, backend issue, timing, environment)
  - Attempt automated fix:
    - Update selectors if UI changed
    - Add wait conditions if timing issue
    - Report backend bugs if API error
    - Check environment configuration if CORS/network error
  - Retry test once after fix
  - Document fix in summary

---

### Phase 3: Reporting & Analysis (10 min)

1. **Generate Comprehensive Report**
   - Update `TEST_SESSION_{env}_{timestamp}.md`:
     - Environment details (URLs, branch, commit)
     - Executive summary (pass rate, duration)
     - Detailed results per CUJ
     - Screenshots and logs
     - Failed test analysis
     - Environment-specific issues
     - Recommendations

2. **Create Bug Report (if failures found)**
   - Generate `BUG_REPORT_{env}_{timestamp}.md`:
     - List all failures with reproduction steps
     - Screenshots and error logs
     - Environment where bug occurred
     - Suggested fixes
     - Priority/severity ratings

3. **Update TEST_PLAN.md**
   - Mark test cases as ✅ PASSED or ❌ FAILED
   - Update "Test Results Summary" section
   - Record date, environment, and pass rate
   - Update Phase 2 test status (CUJ-8)
   - Example:
     ```markdown
     - ✅ TC-UX-1: PASSED (local, 2025-11-06)
     - ✅ TC-UX-2: PASSED (local, 2025-11-06)
     ```

4. **Output Summary to User**
   - Display pass/fail statistics
   - Show environment tested
   - Link to generated reports
   - Highlight critical issues
   - Suggest next actions (e.g., test in staging next)

---

## Usage Examples

### Example 1: Test All CUJs in Local Environment (Default)
```bash
/test-and-fix
```
**or explicitly:**
```bash
/test-and-fix env=local
```

**Output:**
```
🧪 E2E Test Session Started
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🌍 Environment: LOCAL
📋 Scope: All CUJs (CUJ-1, CUJ-2, CUJ-7, CUJ-8)
🌐 Browser: chromium
🎯 Mode: Report Only (fix=false)

Phase 0: Environment Preparation
⏳ Checking local backend...
   curl http://localhost:8000/docs
   ❌ Backend not running
   🚀 Auto-starting backend...
   cd backend && uvicorn src.main:app --reload --port 8000
   ⏳ Waiting for backend to start... (0/30s)
   ⏳ Polling http://localhost:8000/docs... (2s)
   ⏳ Polling http://localhost:8000/docs... (4s)
   ⏳ Polling http://localhost:8000/docs... (6s)
   ✅ Backend started successfully (PID: 12345)
   ✅ Backend responding (FastAPI 0.115.4)

⏳ Checking local frontend...
   curl http://localhost:3000
   ✅ Frontend already running (Next.js 15.0.2)

⏳ Verifying environment configuration...
   ✅ NEXT_PUBLIC_API_URL=http://localhost:8000
⏳ Testing database connection...
   ✅ Supabase connected (gxlmnjnjvlslijiowamn)

✅ Local Environment Ready (auto-started backend)
   Backend:  http://localhost:8000 (PID: 12345)
   Frontend: http://localhost:3000 (already running)
   Database: Supabase (us-east-2)
   API URL:  ✅ Correctly configured

Phase 1: Test Plan Preparation
✅ TEST_PLAN.md parsed: 8 CUJs, 29 E2E test cases
✅ Phase 2 features detected: 6 test cases (TC-UX-1 to TC-UX-6)
✅ Playwright MCP available
✅ Test session summary created: TEST_SESSION_local_20251106.md

Phase 2: Execution
⏳ Testing CUJ-1: Trial Flow (TC-E2E-1)
   ✅ Homepage loaded (0.8s)
   ✅ Registration completed (2.3s)
   ✅ Email verified (0.5s mock)
   ✅ First generation: 48.2s
   ✅ Second generation: 51.7s
   ✅ Third generation: 49.3s
   ✅ Trial exhausted modal shown
   📸 Screenshots: 7 saved to .playwright-mcp/local/

⏳ Testing CUJ-8: Phase 2 UX Features
   ⏳ TC-UX-1: Preservation Strength Slider
      ✅ Default value 0.5 (Balanced)
      ✅ Visual feedback updates (purple/blue/green)
      ✅ API includes preservation_strength
      ✅ PASSED (12.3s)

   ⏳ TC-UX-2: Suggested Prompts (Area-Specific)
      ✅ Blue buttons appear for Front Yard
      ✅ One-click insertion works
      ✅ Comma-separated appending
      ✅ PASSED (8.7s)

   ⏳ TC-UX-4: Character Counter
      ✅ Real-time counter updates
      ✅ 500 character limit enforced
      ✅ Visual warnings at thresholds
      ✅ PASSED (6.2s)

Phase 3: Reporting
✅ TEST_SESSION_local_20251106.md updated
✅ TEST_PLAN.md updated with results

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📊 Results Summary (Local Environment):
   Total: 29 tests
   Passed: 29 (100%)
   Failed: 0 (0%)
   Duration: 52m 18s

✅ All tests passing in local environment!

📄 Reports:
   - TEST_SESSION_local_20251106.md
   - Screenshots: .playwright-mcp/local/ (43 files)

✅ Recommendation: Ready for staging testing
   Next: /test-and-fix env=staging
```

---

### Example 2: Test Phase 2 Features in Staging
```bash
/test-and-fix env=staging cuj=CUJ-8
```

**Output:**
```
🧪 E2E Test Session: CUJ-8 Only (Staging)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🌍 Environment: STAGING
📋 Scope: CUJ-8 Phase 2 UX Features (6 test cases)
🌐 Browser: chromium

Phase 0: Environment Preparation
⏳ Determining Vercel preview URL...
   ✅ Latest preview: https://yarda-v5-frontend-git-004-generation-flow-fbe974.vercel.app
⏳ Checking backend...
   ✅ Backend: https://yarda-api-production.up.railway.app
⏳ Verifying CORS configuration...
   ✅ CORS allows *.vercel.app

✅ Staging Environment Ready
   Backend:  https://yarda-api-production.up.railway.app
   Frontend: https://yarda-v5-frontend-git-004-generation-flow-fbe974.vercel.app
   Branch:   004-generation-flow
   CORS:     ✅ Configured

Phase 1: Test Plan Preparation
✅ TEST_PLAN.md parsed: Phase 2 features (6 test cases)
✅ Test session summary: TEST_SESSION_staging_20251106.md

Phase 2: Execution
⏳ Testing CUJ-8: Phase 2 UX Features
   ⏳ TC-UX-1: Preservation Strength Slider
      ✅ PASSED (staging, 13.1s)

   ⏳ TC-UX-5: Enhanced Progress Display
      ✅ current_stage displays correctly
      ✅ status_message updates
      ✅ 2-second polling verified
      ✅ PASSED (staging, 62.4s)

   ⏳ TC-UX-6: Result Recovery with v2 Fields
      ✅ localStorage persists v2 fields
      ✅ Page refresh recovery works
      ✅ PASSED (staging, 48.9s)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📊 Results Summary (Staging):
   Total: 6 tests (Phase 2 only)
   Passed: 6 (100%)
   Failed: 0 (0%)
   Duration: 18m 47s

✅ Phase 2 features working in staging!
   Ready for production deployment.
```

---

### Example 3: Test Single CUJ with Auto-Fix (Local)
```bash
/test-and-fix env=local cuj=CUJ-1 fix=true
```

**Output:**
```
🧪 E2E Test Session: CUJ-1 Only (Local, Auto-Fix)
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

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📊 Results: 4/4 PASSED (1 auto-fixed)
⏱️ Duration: 12m 34s

✅ All CUJ-1 tests passing after auto-fix
🔧 Fix applied: Updated email verification selector
```

---

### Example 4: Test Production (with Confirmation)
```bash
/test-and-fix env=production cuj=CUJ-1,CUJ-2
```

**Output:**
```
⚠️  Production Environment Testing
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

WARNING: You are about to test in PRODUCTION
- Real user data may be affected
- Test users will be created in production database
- Stripe test mode should be verified

Backend:  https://yarda-api-production.up.railway.app
Frontend: https://yarda.vercel.app

Proceed with production testing? (y/N)

[Requires explicit confirmation before continuing]
```

---

## Success Criteria

- ✅ All targeted test cases executed
- ✅ Environment correctly configured and validated
- ✅ Comprehensive report generated with environment details
- ✅ Screenshots captured at key steps (organized by environment)
- ✅ Pass rate ≥90% for production readiness
- ✅ All failures documented with reproduction steps and environment
- ✅ TEST_PLAN.md updated with results and environment
- ✅ Phase 2 features tested (if CUJ-8 included)

---

## Error Handling

### Environment-Specific Issues:

1. **Backend Fails to Start**
   - Error: "Backend failed to start after 30 seconds"
   - Possible causes: Port 8000 in use, database connection error, missing dependencies
   - Action: Check logs, verify DATABASE_URL, ensure dependencies installed
   - Manual start: `cd backend && uvicorn src.main:app --reload --port 8000`
   - Display: "⚠️ Backend startup failed. Check logs above for errors."

2. **Frontend Fails to Start**
   - Error: "Frontend failed to start after 45 seconds"
   - Possible causes: Port 3000 in use, Node.js error, missing node_modules
   - Action: Check logs, ensure `npm install` completed, verify Node version
   - Manual start: `cd frontend && npm run dev`
   - Display: "⚠️ Frontend startup failed. Check logs above for errors."

3. **Wrong API URL in Local Environment**
   - Error: "NEXT_PUBLIC_API_URL points to production"
   - Action: Display fix instructions
   - Display: "⚠️ Update frontend/.env.local: NEXT_PUBLIC_API_URL=http://localhost:8000"

4. **Staging Deployment Not Found**
   - Error: "No preview deployment found for branch"
   - Action: Check Vercel dashboard, suggest deploying branch
   - Display: "⚠️ Deploy branch to Vercel first"

5. **CORS Error in Staging**
   - Error: "CORS policy blocked request from preview domain"
   - Action: Verify backend CORS configuration allows *.vercel.app
   - Display: "⚠️ Check backend CORS settings"

6. **Production Testing Aborted**
   - Error: "User declined production testing"
   - Action: Stop execution gracefully
   - Display: "✅ Production testing cancelled. Test in staging instead."

### Common Issues:

7. **Playwright MCP Not Available**
   - Error: "Playwright MCP tool not found"
   - Action: Prompt user to install/configure MCP

8. **Test Timeout**
   - Error: "Generation exceeded 90s timeout"
   - Action: Log timeout, mark as FAIL, note environment

9. **Element Not Found**
   - Error: "Button 'Generate' not found"
   - Action: Take screenshot, log HTML structure, check environment

10. **Network Error**
    - Error: "API returned 500"
    - Action: Log response, check backend logs, note environment

---

## Technical Notes

### Environment URLs:

```typescript
const ENVIRONMENTS = {
  local: {
    backend: 'http://localhost:8000',
    frontend: 'http://localhost:3000',
    requiresRunning: true,
  },
  staging: {
    backend: 'https://yarda-api-production.up.railway.app',
    frontend: 'https://yarda-v5-frontend-git-*-vercel.app', // Dynamic
    requiresRunning: false,
  },
  production: {
    backend: 'https://yarda-api-production.up.railway.app',
    frontend: 'https://yarda.vercel.app', // TBD
    requiresRunning: false,
    requiresConfirmation: true,
  },
};
```

### Playwright MCP Integration:

```typescript
// Navigation (environment-aware)
const frontendUrl = ENVIRONMENTS[env].frontend;
mcp__playwright__browser_navigate(url: frontendUrl)

// Interaction
mcp__playwright__browser_click(element: "button:has-text('Get Started')", ref: "...")

// Form Filling
mcp__playwright__browser_fill_form(fields: [
  { name: "email", type: "textbox", ref: "...", value: "test@example.com" },
  { name: "password", type: "textbox", ref: "...", value: "SecurePass123!" }
])

// Screenshot (environment-organized)
mcp__playwright__browser_take_screenshot(
  filename: `.playwright-mcp/${env}/cuj1-step3.png`
)

// Assertion
mcp__playwright__browser_snapshot() // Get accessibility tree
```

### Test Data Management:

- Use timestamp-based emails: `test-{env}-{timestamp}@example.com`
- Use Stripe test cards: `4242 4242 4242 4242`
- Generate unique addresses to avoid caching
- Tag test users with environment for easy cleanup

---

## Output Files

1. **TEST_SESSION_{env}_{timestamp}.md**
   - Environment configuration details
   - Executive summary with environment
   - Detailed results per test case
   - Screenshots and logs
   - Pass/fail statistics

2. **BUG_REPORT_{env}_{timestamp}.md** (if failures)
   - Environment where bug occurred
   - List of failures
   - Reproduction steps
   - Screenshots
   - Suggested fixes

3. **Screenshots** (`.playwright-mcp/{env}/`)
   - Organized by environment and CUJ
   - Baseline, success, and error screenshots
   - Labeled with timestamp

4. **Updated TEST_PLAN.md**
   - Test status updated with environment (✅/❌)
   - Pass rate recorded per environment
   - Date and environment of last run
   - Example: `✅ TC-UX-1: PASSED (local, 2025-11-06)`

---

## Autonomous Execution

This command runs fully autonomously:
1. ✅ Validates and prepares target environment
2. ✅ **Auto-starts backend/frontend if not running (local env only)**
3. ✅ Reads latest TEST_PLAN.md (including Phase 2 updates)
4. ✅ Executes all test cases sequentially
5. ✅ Generates environment-specific reports
6. ✅ Attempts fixes if `fix=true`
7. ✅ Updates TEST_PLAN.md with environment details
8. ✅ Outputs final summary with recommendations

**User only needs to:**
- Run `/test-and-fix env={target_env}`
- Review the final report

**No manual service startup required!** The command automatically:
- Starts backend in background if not running (local env)
- Starts frontend in background if not running (local env)
- Waits for services to be ready (polls every 2-3 seconds)
- Continues with tests once environment is ready
- Leaves services running after tests complete (for iterative development)

---

## Integration with Other Commands

- `/speckit.implement` → Run `/test-and-fix env=local` after implementation
- `/speckit.analyze` → Use test results for quality analysis
- Commit workflow → Run `/test-and-fix env=local` before creating PR
- Deployment workflow → Run `/test-and-fix env=staging` before production

---

## Environment Testing Workflow

**Recommended testing progression:**

1. **Local Development:**
   ```bash
   /test-and-fix env=local
   ```
   - Rapid iteration and debugging
   - Immediate feedback
   - Test Phase 2 features

2. **Staging Validation:**
   ```bash
   /test-and-fix env=staging
   ```
   - Verify deployment
   - Test with production-like environment
   - CORS and networking validation

3. **Production Smoke Test:**
   ```bash
   /test-and-fix env=production cuj=CUJ-1
   ```
   - Light smoke testing only
   - Verify critical paths
   - Requires confirmation

---

**Usage:**
```bash
/test-and-fix [env=local|staging|production] [cuj=CUJ-1] [fix=true] [browser=chromium]
```

**Examples:**
```bash
/test-and-fix                           # Test all in local (default)
/test-and-fix env=staging               # Test all in staging
/test-and-fix env=local cuj=CUJ-8       # Test Phase 2 features locally
/test-and-fix env=staging fix=true     # Test staging with auto-fix
```
