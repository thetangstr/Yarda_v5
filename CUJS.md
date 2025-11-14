# Critical User Journeys (CUJs) - Canonical Definition

**Version:** 1.0
**Last Updated:** 2025-11-13
**Status:** Production
**Owner:** Engineering Team

This is the **canonical source of truth** for all Critical User Journeys (CUJs). Every test must verify one or more CUJs defined here.

---

## Overview

A **CUJ** is a complete end-to-end user scenario that represents a critical business flow. Each CUJ:
- Starts with a specific user state (logged in, has credits, etc.)
- Goes through a series of interactions
- Ends with a measurable outcome (generation complete, payment processed, etc.)
- Must pass 100% of the time in production

---

## CUJ1: New User Registration & Trial Flow

**Priority:** 🔴 Critical (P0)
**Business Impact:** New user acquisition
**Test Files:** `trial-user-registration.spec.ts`

### Scenario
New user registers with email/password and receives 3 trial credits.

### Steps
1. User navigates to /register
2. User enters email, password, password confirmation
3. User clicks "Create Account" button
4. System validates inputs (email format, password strength)
5. System creates user account with trial_remaining=3, trial_used=0
6. System sends verification email
7. User sees success message: "You have 3 free trial credits"
8. User can navigate to /generate page

### Acceptance Criteria
- ✅ User account created in database
- ✅ trial_remaining = 3 (verified in database)
- ✅ trial_used = 0
- ✅ Email verified field = false (until user verifies)
- ✅ Success message displays
- ✅ User can access /generate page

### Related Features
- FR-001 to FR-010 (Authentication)
- FR-011 to FR-016 (Trial Credits)

### Test Coverage
- TC-REG-1.1: User registers and receives 3 trial credits
- TC-REG-1.3: Email verification within 30 seconds
- TC-REG-1.4: Duplicate email registration prevented
- TC-REG-1.5: Email format validation
- TC-REG-1.6: Password minimum 8 characters
- TC-REG-1.7: Resend verification email (rate limited to 3/hour)

---

## CUJ2: Language Selection & Persistence

**Priority:** 🟡 High (P1)
**Business Impact:** Localization / International users
**Test Files:** `language-switching.spec.ts`

### Scenario
User selects language preference and it persists across sessions and is synced to backend.

### Steps
1. User on login page (default English)
2. User clicks language switcher button
3. User sees dropdown with options: English, Español (Spanish), 中文 (Chinese)
4. User selects Spanish
5. Page UI changes to Spanish
6. User logs in with authentication
7. System fetches user profile and language preference from backend
8. System confirms language matches selected preference
9. User logs out and logs back in
10. Language preference still Spanish

### Acceptance Criteria
- ✅ Switcher button visible and accessible
- ✅ All three languages available (en, es, zh)
- ✅ Selection updates UI immediately
- ✅ Preference persists in localStorage
- ✅ On login, backend syncs preference
- ✅ On page reload, language persists
- ✅ Preference synced to backend on change
- ✅ Backend stores in users.preferred_language

### Related Features
- Feature 006: Internationalization (i18n)

### Test Coverage
- Should render login page in English by default
- Should have all three language options available
- Should switch to Spanish and persist preference
- Should switch between multiple languages
- Should display correct active language indicator
- Should close switcher when clicking outside
- Language preference should sync to backend
- Multiple language switches should work correctly

---

## CUJ3: Single-Page Generation Flow

**Priority:** 🔴 Critical (P0)
**Business Impact:** Core feature (landscape generation)
**Test Files:** `generation-flow-v2.spec.ts`

### Scenario
User submits landscape design request and sees results all on one page without navigation.

### Steps
1. User navigates to /generate page (authenticated)
2. User fills address field: "123 Main St, San Francisco, CA"
3. System geocodes address and shows on map
4. User selects areas: Front Yard, Back Yard, Walkway
5. User selects style: Modern, Traditional, Zen, etc.
6. User optionally adds custom prompt
7. User clicks "Generate Landscape Design" button
8. **Form remains visible** (not cleared)
9. Progress section appears inline showing "Generating area 1 of 3"
10. Progress updates every 2 seconds: "2/3 areas", "3/3 areas"
11. Results section appears inline with generated images
12. User can see before/after comparison
13. User can download generated images
14. User can click "Create New Design" to reset form
15. **URL never changes** (no page navigation)

### Acceptance Criteria
- ✅ No page navigation (URL stays /generate)
- ✅ Form, progress, results all on same page
- ✅ Progress updates every 2 seconds (max 5 min timeout)
- ✅ Images display when generation completes
- ✅ User can start new generation immediately
- ✅ No console errors during flow
- ✅ Works on desktop, tablet, mobile

### Related Features
- Feature 004: Generation Flow
- Feature 005: Single-Page Experience

### Test Coverage
- T008: Should complete generation flow without page navigation
- T009: Should poll for progress updates every 2 seconds
- Generation form visible during polling
- Results display when complete
- Multiple generations in sequence work correctly

---

## CUJ4: Token Purchase via Stripe

**Priority:** 🔴 Critical (P0)
**Business Impact:** Revenue generation
**Test Files:** `purchase-flow.spec.ts` (if exists)

### Scenario
User purchases tokens via Stripe and tokens appear in account immediately.

### Steps
1. User navigates to /purchase or /tokens page
2. User sees token packages: 10 ($9.99), 50 ($49.99), 100 ($99.99), 500 ($399.99)
3. User selects 100 tokens package
4. User clicks "Purchase" button
5. System creates Stripe Checkout session
6. User redirected to Stripe Checkout
7. User enters test card: 4242 4242 4242 4242
8. User enters expiry, CVC
9. User clicks "Pay" button
10. Stripe processes payment
11. Stripe sends webhook to backend /v1/webhooks/stripe
12. Backend updates user.token_balance
13. User redirected back to app
14. User's token balance shows 100
15. User can generate using tokens

### Acceptance Criteria
- ✅ Checkout session created successfully
- ✅ Payment processes successfully
- ✅ Webhook received and processed
- ✅ Token balance updated in database
- ✅ Token balance reflects in UI (no page reload needed)
- ✅ User can generate immediately with new tokens
- ✅ Failed payments don't add tokens
- ✅ Webhook idempotency prevents duplicate charges

### Related Features
- Payment System Integration
- Stripe Checkout
- Webhook Processing

### Test Coverage
- Payment flow without errors
- Webhook processing adds tokens
- Token balance updates immediately
- Failed payment doesn't add tokens
- Duplicate webhook doesn't double-charge

---

## CUJ5: Active Subscription Allows Unlimited Generations

**Priority:** 🔴 Critical (P0)
**Business Impact:** Recurring revenue
**Test Files:** `subscription.spec.ts` (if exists)

### Scenario
User subscribes to Pro plan ($99/month) and can generate unlimited times.

### Steps
1. User navigates to /subscribe page
2. User sees Pro plan: "$99/month, unlimited generations"
3. User clicks "Subscribe" button
4. Stripe Checkout for subscription opens
5. User enters payment details and confirms
6. Stripe charges card
7. Stripe sends webhook webhook.subscription_created
8. Backend updates users.subscription_tier='pro', subscription_status='active'
9. User sees "Active Subscription" badge in UI
10. User attempts generation (no credit check)
11. Generation completes and uses subscription, not trial/tokens
12. User can generate unlimited times

### Acceptance Criteria
- ✅ Subscription created in Stripe
- ✅ Webhook updates subscription_tier to 'pro'
- ✅ subscription_status = 'active'
- ✅ Active subscription bypasses credit checks
- ✅ User sees unlimited indicator
- ✅ Can access Customer Portal to manage
- ✅ Cancellation works properly
- ✅ Graceful fallback to tokens when subscription expires

### Related Features
- Subscription System
- Payment Processing

### Test Coverage
- Subscription flow completes
- Active subscription allows unlimited generation
- Can manage via Customer Portal
- Cancellation works
- Expired subscription falls back to tokens

---

## CUJ6: Trial Exhaustion & Purchase Required

**Priority:** 🟡 High (P1)
**Business Impact:** Monetization funnel
**Test Files:** `trial-user-registration.spec.ts`

### Scenario
User exhausts 3 trial credits and must purchase tokens or subscribe to continue.

### Steps
1. New user has 3 trial credits
2. User generates design (uses 1 credit, 2 remaining)
3. User generates again (uses 1 credit, 1 remaining)
4. User generates again (uses 1 credit, 0 remaining)
5. User attempts to generate again with 0 credits
6. System shows modal: "Your trial credits are exhausted"
7. Modal shows two options:
   - "Purchase Tokens" → goes to /purchase
   - "Subscribe to Pro" → goes to /subscribe
8. User can click either button to proceed
9. Generation is blocked (doesn't proceed)

### Acceptance Criteria
- ✅ Modal appears when trial_remaining = 0
- ✅ Modal clearly states "trial exhausted"
- ✅ "Purchase Tokens" button functional
- ✅ "Subscribe to Pro" button functional
- ✅ Generation blocked with 0 credits
- ✅ User cannot bypass with API call
- ✅ Modal is dismissible

### Related Features
- Trial Credit System
- Trial Exhaustion Handling

### Test Coverage
- TC-UI-1.2: Trial exhausted modal displays
- TC-AUTH-1.3: Generation blocked when trial_remaining=0

---

## CUJ7: Holiday Decorator (Seasonal Feature)

**Priority:** 🟡 High (P1)
**Business Impact:** Seasonal viral marketing / social sharing
**Test Files:** `holiday-discovery.spec.ts`, `holiday-full-flow.spec.ts`

### Scenario
During holiday season (Nov-Jan), user can create holiday decorations on their home via separate credit system.

### Steps
1. User navigates to /holiday page (during season)
2. User sees Street View of a house
3. User can rotate Street View (drag to adjust heading)
4. User selects decoration style: Traditional, Modern, Minimalist, Eclectic
5. Style preview images show different decoration options
6. User clicks "Generate Decoration"
7. System deducts 1 holiday credit atomically (prevents negative balance)
8. Generation starts, user polls for status
9. When complete, user sees before/after comparison
10. User can download both images
11. User can share on social media (Twitter, Facebook)
12. Each share earns 1 bonus credit (max 3/day)

### Acceptance Criteria
- ✅ Holiday page only available Nov-Jan
- ✅ 1 free credit on signup during season
- ✅ Atomic credit deduction (no negative balance)
- ✅ Credit deducted BEFORE generation starts
- ✅ User synced with `/v1/holiday/credits` endpoint
- ✅ Generation completes within 30 seconds
- ✅ Before/after displayed correctly
- ✅ Social sharing grants bonus credits
- ✅ Max 3 bonus credits/day limit enforced

### Related Features
- Feature 007: Holiday Decorator
- Credit Systems Consolidation

### Test Coverage
- Holiday page loads during season
- Credit balance displays correctly
- Generation with atomic deduction
- Before/after comparison displays
- Social sharing grants credits
- Max 3/day limit enforced
- Cannot generate with 0 credits

---

## CUJ Implementation Matrix

| CUJ | Feature | Tests | Priority | Status |
|-----|---------|-------|----------|--------|
| CUJ1 | Registration & Trial | 6 tests | P0 | ✅ Implemented |
| CUJ2 | Language Switching | 9 tests | P1 | ✅ Implemented |
| CUJ3 | Single-Page Generation | 5+ tests | P0 | ✅ Implemented |
| CUJ4 | Token Purchase | 5+ tests | P0 | ⚠️ Partial |
| CUJ5 | Subscription | 5+ tests | P0 | ⚠️ Partial |
| CUJ6 | Trial Exhaustion | 2 tests | P1 | ✅ Implemented |
| CUJ7 | Holiday Decorator | 6+ tests | P1 | ✅ Implemented |

---

## CUJ Testing Requirements

### Every CUJ Must Verify:
1. **Happy Path** - All steps succeed as planned
2. **Error Handling** - Graceful errors when things fail
3. **Edge Cases** - Boundary conditions (0 credits, max credits, etc.)
4. **Concurrency** - Multiple simultaneous requests don't corrupt state
5. **State Persistence** - Changes persist across page reloads
6. **Atomic Operations** - No partial states (credit deduction)

### CUJ Test Naming Convention:
- File: `{feature}-{cuj-number}.spec.ts`
- Test name: `CUJ{N}: {Description}`
- Example: `CUJ3: Should complete generation flow without page navigation`

---

## CUJ Success Criteria (for all CUJs)

Before marking a CUJ as "complete", verify:
- ✅ Happy path test passes (100%)
- ✅ Error path test passes (realistic failures)
- ✅ Edge case tests pass (boundary conditions)
- ✅ All related backend unit tests pass
- ✅ Integration tests verify database state changes
- ✅ Works on desktop, tablet, mobile
- ✅ Works across all browsers (Chrome, Firefox, Safari)
- ✅ No console errors or warnings
- ✅ No flaky tests (pass 100 times in a row)
- ✅ Response times acceptable (< SLA)

---

## Adding New CUJs

When adding a new feature, create a new CUJ:

1. **Define the CUJ** in this file with:
   - Priority (P0/P1/P2)
   - Complete scenario steps
   - All acceptance criteria
   - Related features

2. **Write tests** (TDD - tests FIRST):
   - Create `{feature}.spec.ts`
   - Write tests for all acceptance criteria
   - Run tests (should fail)

3. **Implement feature** to make tests pass

4. **Mark as complete** when all tests pass on:
   - Local (localhost)
   - Staging (Vercel preview + Railway)
   - Production (after deployment)

---

## CUJ Testing Slash Commands

Use these commands to test specific CUJs:

```bash
# Test specific CUJ
/test-cuj cuj1                              # Registration & Trial
/test-cuj cuj2                              # Language Switching
/test-cuj cuj3                              # Single-Page Generation
/test-cuj cuj4                              # Token Purchase
/test-cuj cuj5                              # Subscription
/test-cuj cuj6                              # Trial Exhaustion
/test-cuj cuj7                              # Holiday Decorator

# Test all CUJs
/test-cuj all                               # All CUJs

# Test specific CUJ on staging
/test-cuj cuj1 staging
```

---

## References

- **Testing Strategy:** [TEST_PLAN.md](TEST_PLAN.md)
- **Slash Commands:** [.claude/commands/test-cuj.md](.claude/commands/test-cuj.md)
- **Architecture:** [CLAUDE.md](CLAUDE.md#critical-user-journeys-cujs-checklist)
- **Test Review:** [TEST_REVIEW.md](TEST_REVIEW.md)

---

**Last Updated:** 2025-11-13
**Next Review:** 2025-11-20
