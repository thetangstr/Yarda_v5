# Comprehensive E2E Test Plan - Yarda AI Landscape Studio

**Date:** November 5, 2025
**Backend Status:** ✅ Running on http://localhost:8000
**Frontend Status:** 🔄 Starting on http://localhost:3000
**Database:** ✅ Connected (Supabase PostgreSQL)

## Test Environment Setup

### Prerequisites
1. Backend running: `cd backend && source venv/bin/activate && uvicorn src.main:app --reload --port 8000`
2. Frontend running: `cd frontend && npm run dev`
3. Environment variables configured in `.env` files
4. Test user with Google account for OAuth testing

### Verification
- ✅ Backend health: `curl http://localhost:8000/health` → `{"status":"healthy","database":"connected"}`
- 🔄 Frontend accessible: `curl http://localhost:3000`

---

## Test Suite 1: New FRE Flow (/start → /auth → /generate)

### Test 1.1: Landing Page (/start)
**Objective:** Verify simplified landing page loads correctly

**Steps:**
1. Navigate to http://localhost:3000/start
2. Verify page elements:
   - Logo header with "Yarda AI"
   - Hero heading: "Reimagine Your Yard In Seconds"
   - Address input field with location icon
   - "Generate Free Design" CTA button
   - "How It Works" section with 3 steps

**Expected Result:**
- All elements render correctly
- Mobile-first responsive design
- Gradient background (brand-sage to brand-cream)

**Playwright Code:**
```javascript
await page.goto('http://localhost:3000/start');
await expect(page.locator('h1')).toContainText('Reimagine Your Yard');
await expect(page.locator('input[type="text"]')).toBeVisible();
await expect(page.locator('button[type="submit"]')).toContainText('Generate Free Design');
```

### Test 1.2: Address Input and Session Storage
**Objective:** Verify address is saved to session storage

**Steps:**
1. On /start page, enter address: "22054 clearwood ct cupertino 95014"
2. Click "Generate Free Design"
3. Verify redirect to /login?redirect=/generate
4. Check session storage for pending_address

**Expected Result:**
- Address saved in sessionStorage
- Redirected to login page
- Redirect parameter preserved

**Playwright Code:**
```javascript
await page.fill('input[type="text"]', '22054 clearwood ct cupertino 95014');
await page.click('button[type="submit"]');
await expect(page).toHaveURL(/.*\/login\?redirect=\/generate/);
const pendingAddress = await page.evaluate(() => sessionStorage.getItem('pending_address'));
expect(pendingAddress).toBe('22054 clearwood ct cupertino 95014');
```

### Test 1.3: Combined Auth Page (/auth)
**Objective:** Verify tab-based sign up/login page

**Steps:**
1. Navigate to http://localhost:3000/auth
2. Verify tab switcher (Sign Up / Log In)
3. Click "Sign Up" tab → verify active state
4. Click "Log In" tab → verify active state
5. Verify Google Sign-In button present
6. Verify Apple Sign-In button (disabled placeholder)
7. Verify email/password form

**Expected Result:**
- Tabs switch correctly
- Active tab has green highlight
- Social sign-in buttons present
- Form fields render correctly

**Playwright Code:**
```javascript
await page.goto('http://localhost:3000/auth');
await page.click('button:has-text("Sign Up")');
await expect(page.locator('button:has-text("Sign Up")')).toHaveClass(/bg-white text-brand-green/);
await page.click('button:has-text("Log In")');
await expect(page.locator('button:has-text("Log In")')).toHaveClass(/bg-white text-brand-green/);
```

---

## Test Suite 2: Google Sign-In Authentication

### Test 2.1: Google OAuth Initiation
**Objective:** Verify Google OAuth flow initiates correctly

**Steps:**
1. Navigate to http://localhost:3000/auth
2. Click "Continue with Google" button
3. Verify redirect to Supabase Auth URL
4. Verify redirect to Google OAuth consent screen

**Expected Result:**
- Redirect to `https://gxlmnjnjvlslijiowamn.supabase.co/auth/v1/authorize`
- Google consent screen loads

**Note:** Full OAuth testing requires valid Google test account credentials.

### Test 2.2: OAuth Callback and User Creation
**Objective:** Verify user is created in database after OAuth

**Steps:**
1. Complete Google sign-in
2. Verify redirect to /auth/callback
3. Check Supabase `auth.users` table for new user
4. Check `public.users` table for synced user (via trigger)
5. Verify user has:
   - `trial_remaining = 3`
   - `trial_used = 0`
   - `subscription_status = NULL`

**Expected Result:**
- User exists in both tables
- Trial credits initialized
- Redirect to /generate

**Database Query:**
```sql
SELECT id, email, trial_remaining, trial_used, subscription_status
FROM users
WHERE email = 'test@example.com';
```

---

## Test Suite 3: Google Maps Integration

### Test 3.1: Street View Image Fetching (front_yard)
**Objective:** Verify Google Maps Street View API integration

**Steps:**
1. Navigate to /generate page (authenticated)
2. Enter address: "22054 clearwood ct cupertino 95014"
3. Select area: "Front Yard"
4. Select style: "Modern Minimalist"
5. Click "Generate Design"
6. Verify API call to backend `/v1/generations`
7. Check backend logs for Maps API call
8. Verify image uploaded to Vercel Blob
9. Check `generation_source_images` table for Street View URL

**Expected Result:**
- Street View image fetched successfully
- Image URL stored in database
- Blob storage contains image

**Backend Log Check:**
```bash
tail -f /tmp/backend.log | grep "Maps API"
```

**Database Query:**
```sql
SELECT generation_id, image_type, source_url, blob_url
FROM generation_source_images
WHERE generation_id = 'gen_xxx';
```

### Test 3.2: Satellite Image Fetching (backyard)
**Objective:** Verify Google Maps Satellite API integration

**Steps:**
1. On /generate page, enter address
2. Select area: "Backyard"
3. Select style: "California Native"
4. Click "Generate Design"
5. Verify Satellite image fetched (not Street View)
6. Check backend logs for Maps API call type
7. Verify image stored in blob

**Expected Result:**
- Satellite imagery fetched for backyard
- Different API endpoint than front_yard
- Image URL stored correctly

---

## Test Suite 4: Landscape Image Generation with Gemini

### Test 4.1: Prompt Generation for All Area/Style Combinations
**Objective:** Verify all 20 combinations generate correct prompts

**Test Matrix:**
| Area         | Style              | Expected Prompt Elements |
|--------------|--------------------|-------------------------|
| front_yard   | modern_minimalist  | "front yard entrance", "modern minimalist design" |
| front_yard   | california_native  | "front yard entrance", "California native plants" |
| front_yard   | japanese_zen       | "front yard entrance", "Japanese zen garden" |
| front_yard   | english_garden     | "front yard entrance", "English cottage garden" |
| front_yard   | desert_landscape   | "front yard entrance", "desert landscape" |
| backyard     | modern_minimalist  | "backyard outdoor living", "modern minimalist design" |
| ... (16 more combinations) | | |

**Verification:** Check backend logs for generated prompts

### Test 4.2: Gemini API Call and Image Generation
**Objective:** Verify Gemini 2.5 Flash generates landscape images

**Steps:**
1. Submit generation request
2. Verify Gemini API called with correct prompt
3. Verify image returned from Gemini
4. Check `generations` table for:
   - `status = 'pending'` → `'processing'` → `'completed'`
   - `image_urls` array populated
   - `payment_method` recorded

**Expected Result:**
- Generated image URL stored
- Status updated to 'completed'
- Image accessible via URL

**Database Query:**
```sql
SELECT id, status, image_urls, payment_method, created_at
FROM generations
WHERE user_id = 'user_xxx'
ORDER BY created_at DESC
LIMIT 1;
```

---

## Test Suite 5: Trial Credit Usage and Counter Updates

### Test 5.1: Trial Credit Deduction
**Objective:** Verify trial credits decrease atomically

**Steps:**
1. Check user's `trial_remaining` (should be 3 for new user)
2. Generate first design
3. Verify `trial_remaining = 2` and `trial_used = 1`
4. Generate second design
5. Verify `trial_remaining = 1` and `trial_used = 2`
6. Generate third design
7. Verify `trial_remaining = 0` and `trial_used = 3`

**Expected Result:**
- Credits decrease by 1 per generation
- Database uses `FOR UPDATE NOWAIT` for atomic operations
- No race conditions

**Database Query:**
```sql
SELECT trial_remaining, trial_used
FROM users
WHERE id = 'user_xxx';
```

### Test 5.2: Trial Exhausted Modal
**Objective:** Verify modal shown when trial_remaining = 0

**Steps:**
1. Use all 3 trial credits
2. Navigate to /generate
3. Attempt to generate 4th design
4. Verify modal appears with:
   - "Your Free Trial is Complete"
   - Option to purchase tokens
   - Option to upgrade to Pro

**Expected Result:**
- Modal blocks generation
- Links to /purchase page work
- User cannot generate without payment

**Playwright Code:**
```javascript
await page.click('button[type="submit"]'); // Attempt generation
await expect(page.locator('[data-testid="trial-exhausted-modal"]')).toBeVisible();
await expect(page.locator('text=Your Free Trial is Complete')).toBeVisible();
```

### Test 5.3: Trial Counter Display
**Objective:** Verify trial counter updates in real-time

**Steps:**
1. Check navbar shows "3 free designs remaining"
2. Generate design
3. Verify counter updates to "2 free designs remaining"
4. Refresh page
5. Verify counter persists

**Expected Result:**
- Counter synced with database
- Updates without page refresh (via Zustand store)

---

## Test Suite 6: Token Balance Tracking

### Test 6.1: Token Balance Display
**Objective:** Verify token balance component shows correct balance

**Steps:**
1. Navigate to /generate
2. Verify `<TokenBalance />` component visible in navbar
3. Check initial balance (should be 0 for new user)
4. Purchase tokens (see Test Suite 8)
5. Verify balance updates

**Expected Result:**
- Balance displays correctly
- Refreshes on mount
- Auto-updates after purchase

**Playwright Code:**
```javascript
const balance = await page.locator('[data-testid="token-balance"]').textContent();
expect(balance).toContain('0 tokens');
```

### Test 6.2: Token Deduction on Generation
**Objective:** Verify tokens decrease when used

**Steps:**
1. User with `trial_remaining = 0` and `token_balance > 0`
2. Generate design
3. Verify token balance decreases by 1
4. Check `tokens` table for transaction record:
   - `transaction_type = 'usage'`
   - `amount = -1`
   - `balance_after = previous_balance - 1`

**Expected Result:**
- Token deducted atomically
- Transaction logged
- Balance updated in UI

**Database Query:**
```sql
SELECT transaction_type, amount, balance_after, created_at
FROM tokens
WHERE user_id = 'user_xxx'
ORDER BY created_at DESC
LIMIT 5;
```

---

## Test Suite 7: Token Purchase Flow with Stripe

### Test 7.1: Token Purchase Modal
**Objective:** Verify modal displays token packages

**Steps:**
1. On /generate page, click "Purchase Tokens" button
2. Verify modal shows packages:
   - 10 tokens for $9.99
   - 50 tokens for $39.99 (20% discount)
   - 100 tokens for $69.99 (30% discount)
3. Verify "Best Value" badge on 100 tokens

**Expected Result:**
- Modal renders correctly
- Prices displayed
- Stripe integration ready

**Playwright Code:**
```javascript
await page.click('button:has-text("Purchase Tokens")');
await expect(page.locator('[data-testid="token-purchase-modal"]')).toBeVisible();
await expect(page.locator('text=$9.99')).toBeVisible();
```

### Test 7.2: Stripe Checkout Session Creation
**Objective:** Verify Stripe Checkout session created

**Steps:**
1. Click "Buy 10 Tokens" button
2. Verify POST to `/v1/tokens/checkout`
3. Verify redirect to Stripe Checkout page
4. Verify session includes:
   - Correct price ID
   - User metadata
   - Success/cancel URLs

**Expected Result:**
- Checkout session created
- Redirect to Stripe
- Session contains correct data

**API Test:**
```bash
curl -X POST http://localhost:8000/v1/tokens/checkout \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"package_type":"small"}'
```

### Test 7.3: Stripe Webhook Processing
**Objective:** Verify webhook updates token balance

**Steps:**
1. Complete Stripe payment (use test card: 4242424242424242)
2. Stripe sends `checkout.session.completed` webhook
3. Verify backend `/v1/webhooks/stripe` receives webhook
4. Verify signature validation
5. Verify tokens added to user account
6. Check `tokens` table for purchase record

**Expected Result:**
- Webhook processed successfully
- Tokens added to balance
- Transaction logged with `transaction_type = 'purchase'`

**Backend Log Check:**
```bash
tail -f /tmp/backend.log | grep "Stripe webhook"
```

**Database Query:**
```sql
SELECT transaction_type, amount, balance_after, stripe_checkout_session_id
FROM tokens
WHERE user_id = 'user_xxx' AND transaction_type = 'purchase'
ORDER BY created_at DESC
LIMIT 1;
```

---

## Test Suite 8: View Previously Generated Photos (/projects)

### Test 8.1: Projects Dashboard Display
**Objective:** Verify /projects page shows user's generations

**Steps:**
1. Generate 3 designs (with different statuses)
2. Navigate to /projects
3. Verify grid layout with project cards
4. Verify each card shows:
   - Title
   - Status badge (completed, processing, pending, failed)
   - Created date
   - Thumbnail image (if available)
   - "View Design" button

**Expected Result:**
- All user's projects displayed
- Correct status badges
- Images load properly

**Playwright Code:**
```javascript
await page.goto('http://localhost:3000/projects');
const projectCards = await page.locator('.project-card').count();
expect(projectCards).toBeGreaterThan(0);
await expect(page.locator('text=Completed')).toBeVisible();
```

### Test 8.2: Project Status Indicators
**Objective:** Verify status badges display correctly

**Test Matrix:**
| Status      | Badge Color | Icon         |
|-------------|-------------|--------------|
| completed   | Green       | Checkmark ✓  |
| processing  | Amber       | Spinner ⟳    |
| pending     | Gray        | Clock        |
| failed      | Red         | X            |

**Expected Result:**
- Correct color and icon for each status
- Animated spinner for processing

### Test 8.3: View Generation Details
**Objective:** Verify clicking "View Design" navigates correctly

**Steps:**
1. On /projects page, click "View Design" on first project
2. Verify redirect to `/generations/{id}`
3. Verify generation details page shows:
   - Original address
   - Selected area and style
   - Source images (Street View/Satellite)
   - Generated landscape image
   - Metadata (created date, payment method)

**Expected Result:**
- Details page loads correctly
- All images display
- Back button returns to /projects

---

## Test Suite 9: Authorization Hierarchy

### Test 9.1: Subscription Takes Priority
**Objective:** Verify active subscription bypasses trials/tokens

**Steps:**
1. User with `subscription_status = 'active'`
2. Verify `trial_remaining` is ignored
3. Verify `token_balance` is ignored
4. Generate unlimited designs
5. Verify `payment_method = 'subscription'` in generations table

**Expected Result:**
- Subscription users can generate unlimited
- No deductions from trial or tokens

### Test 9.2: Trial Before Tokens
**Objective:** Verify trial credits used before tokens

**Steps:**
1. User with `trial_remaining = 2` and `token_balance = 10`
2. Generate design
3. Verify trial credit used (not token)
4. Verify `trial_remaining = 1` and `token_balance = 10`

**Expected Result:**
- Trial credits consumed first
- Tokens preserved

### Test 9.3: Tokens After Trial Exhausted
**Objective:** Verify tokens used when trial = 0

**Steps:**
1. User with `trial_remaining = 0` and `token_balance = 5`
2. Generate design
3. Verify token used
4. Verify `token_balance = 4`

**Expected Result:**
- Tokens used only when trial exhausted
- `payment_method = 'token'`

---

## Test Suite 10: Error Handling and Edge Cases

### Test 10.1: Invalid Address
**Objective:** Verify error shown for invalid address

**Steps:**
1. Enter invalid address: "asdfasdf"
2. Submit generation
3. Verify error message

**Expected Result:**
- Error: "Could not find location"
- Generation blocked

### Test 10.2: Gemini API Failure
**Objective:** Verify graceful failure handling

**Steps:**
1. Temporarily disable Gemini API key
2. Submit generation
3. Verify status = 'failed'
4. Verify error message shown to user
5. Verify credit/token refunded

**Expected Result:**
- Status updated to 'failed'
- User notified
- No charge applied

### Test 10.3: Concurrent Generation Requests
**Objective:** Verify no race conditions in credit deduction

**Steps:**
1. Submit 2 generation requests simultaneously
2. Verify only 1 succeeds (if user has 1 credit remaining)
3. Verify `FOR UPDATE NOWAIT` prevents double deduction

**Expected Result:**
- Atomic operations prevent race conditions
- One request succeeds, other fails gracefully

---

## Performance Benchmarks

### Target Metrics:
- **Page Load Time:** < 2 seconds
- **API Response Time:** < 500ms
- **Image Generation Time:** < 120 seconds (Gemini API)
- **Street View Fetch:** < 3 seconds
- **Satellite Fetch:** < 3 seconds

### Monitoring:
```javascript
// Measure generation time
const startTime = Date.now();
await page.click('button[type="submit"]');
await page.waitForSelector('[data-testid="generation-status"]');
const endTime = Date.now();
console.log(`Generation time: ${endTime - startTime}ms`);
```

---

## Security Tests

### Test S1: SQL Injection Protection
**Test:** Submit malicious input in address field
**Input:** `'; DROP TABLE users; --`
**Expected:** Input sanitized, no SQL execution

### Test S2: XSS Protection
**Test:** Submit script in custom prompt
**Input:** `<script>alert('XSS')</script>`
**Expected:** Script escaped, not executed

### Test S3: CSRF Protection
**Test:** Attempt generation without CSRF token
**Expected:** Request blocked

### Test S4: Authentication Required
**Test:** Access /generate without authentication
**Expected:** Redirect to /login

---

## Accessibility Tests

### Test A1: Keyboard Navigation
**Test:** Tab through entire flow without mouse
**Expected:** All interactive elements focusable

### Test A2: Screen Reader Compatibility
**Test:** Use VoiceOver/NVDA
**Expected:** All content readable

### Test A3: Color Contrast
**Test:** Check WCAG 2.1 AA compliance
**Expected:** Minimum 4.5:1 contrast ratio

---

## Mobile Responsiveness Tests

### Test M1: Mobile Viewport (375px)
**Test:** Resize viewport to iPhone size
**Expected:** Layout adapts, no horizontal scroll

### Test M2: Tablet Viewport (768px)
**Test:** Resize to iPad size
**Expected:** Grid adjusts to 2 columns

### Test M3: Touch Interactions
**Test:** Use touch events instead of clicks
**Expected:** All buttons respond to touch

---

## Deployment Verification

### Test D1: Preview Deployment
**URL:** https://yarda-v5-frontend-git-003-google-ma-fbe974-thetangstrs-projects.vercel.app
**Test:** Verify new pages deployed
**Expected:** /start, /auth, /projects accessible

### Test D2: Environment Variables
**Test:** Check all env vars loaded correctly
**Expected:** API calls use correct endpoints

### Test D3: CORS Configuration
**Test:** API calls from Vercel preview domain
**Expected:** No CORS errors

---

## Summary

**Total Test Cases:** 50+
**Critical Path Tests:** 15
**Estimated Testing Time:** 4-6 hours

**Priority Order:**
1. ✅ FRE Flow (Suite 1)
2. ✅ Google Sign-In (Suite 2)
3. ✅ Image Generation (Suite 4)
4. ✅ Trial/Token System (Suites 5-7)
5. ⚠️ Projects Dashboard (Suite 8)
6. ⚠️ Error Handling (Suite 10)

**Next Steps:**
1. Complete frontend startup verification
2. Execute critical path tests with Playwright
3. Document any bugs found
4. Create regression test suite
5. Set up CI/CD pipeline with automated tests

---

**Test Execution Log:**
- Backend: ✅ Healthy and connected to database
- Frontend: 🔄 In progress (startup taking longer than expected)
- Playwright: ⏸️ Ready to begin once frontend accessible
