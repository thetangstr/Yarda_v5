# Feature Specification: AI Landscape Studio Platform

**Feature Branch**: `001-002-landscape-studio`
**Created**: 2025-11-03
**Status**: Draft
**Input**: Complete AI-powered landscape design platform with trials, tokens, subscriptions, and multi-area generation

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Trial User Registration and First Generation (Priority: P1)

A first-time visitor creates an account and generates their first landscape design using free trial credits, experiencing the core value proposition immediately.

**Why this priority**: This is the entry point for all users and demonstrates immediate value. Without this working, no user can experience the product. It's the foundation for all monetization and the primary user acquisition funnel.

**Independent Test**: Can be fully tested by registering a new account, verifying email, and generating one design. Delivers immediate value by showing users what the AI can do with their property without any payment required.

**Acceptance Scenarios**:

1. **Given** a visitor lands on yarda.pro, **When** they click "Get Started Free", enter email "sarah@example.com" and password, **Then** account is created with trial_remaining=3, trial_used=0, and verification email is sent within 30 seconds
2. **Given** a user with 3 trial credits and verified email, **When** they upload a yard photo, select "Front Yard" area, choose "Modern Minimalist" style, and click "Generate Design", **Then** generation completes in 30-60 seconds and trial_remaining decrements to 2 atomically
3. **Given** a user mid-generation with trial_remaining=2, **When** generation fails due to Gemini API timeout, **Then** trial is refunded (trial_remaining=2) and error message shows "Generation failed, please try again"
4. **Given** a user with trial_remaining=1, **When** they click "Generate" twice within 100ms (race condition), **Then** only one generation proceeds, the second returns "Insufficient trials", and final trial_remaining=0 (not negative)
5. **Given** a user has used all 3 trials (trial_remaining=0), **When** they attempt to generate another design, **Then** "Trial Exhausted" modal appears with pricing options and generation is blocked

---

### User Story 2 - Token Purchase and Pay-Per-Use Generation (Priority: P1)

A user who has exhausted their free trials purchases tokens and generates additional designs with atomic token deductions, establishing the primary monetization path.

**Why this priority**: This is the core monetization mechanism and must work flawlessly to prevent revenue loss. Token deduction race conditions could result in free generations or incorrect charges, which are critical business risks.

**Independent Test**: Can be fully tested by purchasing tokens via Stripe, waiting for webhook to credit account, then generating designs and verifying correct token deduction. Delivers value by allowing users to continue using the service beyond trials.

**Acceptance Scenarios**:

1. **Given** a user with 0 tokens clicks "Buy 50 Tokens ($10)", **When** they complete Stripe checkout with card 4242 4242 4242 4242, **Then** webhook received within 10 seconds, 50 tokens credited atomically, and transaction recorded with stripe_payment_intent_id
2. **Given** a user with balance=50, **When** they generate a design, **Then** token is deducted BEFORE Gemini API call (balance=49), transaction recorded as type='deduction', and generation proceeds
3. **Given** a user with balance=1, **When** they click "Generate" 10 times concurrently within 100ms, **Then** only 1 request succeeds (balance=0), 9 requests return "Insufficient tokens", and transaction log shows exactly 1 deduction
4. **Given** a Stripe webhook is received 3 times with the same payment_intent_id (retry), **When** each webhook is processed, **Then** tokens credited only once (balance=50, not 150), and only 1 transaction record exists
5. **Given** a user starts generation with balance=25, **When** Gemini API times out after 5 minutes, **Then** token automatically refunded (balance=25), refund transaction recorded with type='refund', and user can retry

---

### User Story 3 - Auto-Reload Configuration (Priority: P2)

A power user configures automatic token reload to ensure they never run out mid-project, experiencing seamless unlimited-like access without subscription commitment.

**Why this priority**: This bridges the gap between pay-per-use and subscription for high-volume users. It reduces friction for professionals who generate many designs and improves retention by preventing workflow interruptions.

**Independent Test**: Can be fully tested by enabling auto-reload with threshold=20 and amount=100, then generating designs until balance drops below 20, verifying auto-reload triggers and credits tokens automatically. Delivers value by removing the need to manually purchase tokens.

**Acceptance Scenarios**:

1. **Given** a user on Account → Token Settings, **When** they enable auto-reload with threshold=20, amount=100, and have payment method on file, **Then** settings saved with auto_reload_enabled=true, auto_reload_threshold=20, auto_reload_amount=100
2. **Given** a user with auto_reload enabled (threshold=20, amount=100) and balance=20, **When** they generate a design (balance drops to 19), **Then** auto-reload triggers within 5 seconds, Stripe charges $20, webhook credits 100 tokens (balance=119), and email confirmation sent
3. **Given** auto-reload just triggered 30 seconds ago, **When** balance drops below threshold again, **Then** auto-reload blocked by 60-second throttle, no duplicate charge created
4. **Given** a user with failure_count=2 (2 previous auto-reload failures), **When** 3rd auto-reload attempt fails (card declined), **Then** auto_reload_enabled set to false, user receives email "Auto-reload disabled after 3 failures"
5. **Given** auto-reload is in progress (not yet completed), **When** user generates another design, **Then** deduction uses current balance (before reload completes), and once reload completes balance updates correctly with no race condition

---

### User Story 4 - Subscription Upgrade and Unlimited Generation (Priority: P2)

A frequent user upgrades to Monthly Pro subscription for unlimited generations, experiencing no token deductions while preserving their existing token balance for future use.

**Why this priority**: Subscriptions provide predictable recurring revenue and are critical for business sustainability. High-volume users (architects, real estate agents) need unlimited access, and this is a key differentiator for the product.

**Independent Test**: Can be fully tested by subscribing to Monthly Pro via Stripe, generating 150+ designs without token deduction, then cancelling and verifying graceful reversion to token system. Delivers value by removing generation limits for power users.

**Acceptance Scenarios**:

1. **Given** a user with balance=30 tokens and no subscription clicks "Upgrade to Monthly Pro", **When** they complete $99/month Stripe checkout, **Then** webhook received, subscription_status='active', user tier updated to 'monthly_pro', and token balance preserved (balance=30)
2. **Given** a user with active Monthly Pro subscription, **When** they generate 150 designs over 3 weeks, **Then** all generations succeed, no tokens deducted (balance=30 throughout), and no generation limits enforced
3. **Given** a subscription is 30 days old (renewal due), **When** renewal date reached, **Then** Stripe charges $99 automatically, webhook updates current_period_end, subscription_status remains 'active', and user access uninterrupted
4. **Given** a subscription renewal fails (card declined), **When** Stripe attempts charge, **Then** subscription_status='past_due', user receives email "Payment failed - Update card", user has 7-day grace period, and after grace period subscription_status='cancelled'
5. **Given** a user with active subscription (period_end=Nov 15) cancels on Oct 28, **When** cancellation processed, **Then** cancel_at_period_end=true, subscription_status remains 'active' until Nov 15, on Nov 16 subscription_status='cancelled', and user reverts to token system (balance=30 preserved)

---

### User Story 5 - Multi-Area Landscape Generation (Priority: P3)

A homeowner planning full yard renovation generates designs for multiple areas (front yard, backyard, walkway) simultaneously in a single request, experiencing fast parallel processing and comprehensive results.

**Why this priority**: This is a convenience feature that improves user experience for complex projects but is not essential for core functionality. Users can achieve the same result by generating each area sequentially, though it takes longer.

**Independent Test**: Can be fully tested by selecting 3 areas (Front, Back, Walkway), adding custom prompts, generating all simultaneously, and verifying all complete in <90 seconds (not 3×60=180 seconds sequential). Delivers value by saving time for users planning comprehensive renovations.

**Acceptance Scenarios**:

1. **Given** a user on landscape studio page, **When** they select 3 areas (Front Yard, Backyard, Walkway) with custom prompts and click "Generate All Areas", **Then** cost preview shows "3 tokens" (or "Unlimited" for subscribers) and generate button is enabled
2. **Given** a user with balance=50 starts 3-area generation, **When** generation begins, **Then** 3 tokens deducted upfront (balance=47), real-time progress shown for each area independently, and all 3 areas complete in 60-90 seconds total (parallel, not sequential)
3. **Given** 3-area generation in progress, **When** Backyard generation fails (Gemini timeout) but Front Yard and Walkway succeed, **Then** 2 designs displayed, Backyard shows error status, user receives 1 token refund (balance=48), and option to retry backyard separately
4. **Given** user starts 3-area generation, **When** user accidentally refreshes page mid-generation, **Then** request_id persisted in localStorage, progress recovers on page load, polling resumes from current state, and user doesn't lose progress
5. **Given** 3-area generation completed (6 total images: Front×2, Back×3, Walkway×1), **When** results displayed, **Then** grid layout shows all 6 images with labels, each image downloadable individually, "Download All" creates ZIP file within 10 seconds, and all 6 designs saved to gallery grouped by session

---

### User Story 6 - Transaction History and Usage Analytics (Priority: P3)

A user reviews their complete token transaction history and usage statistics to understand spending patterns and plan future purchases.

**Why this priority**: This is important for transparency and user trust but not essential for core generation functionality. Users can still use the product without viewing history, though it improves confidence in billing accuracy.

**Independent Test**: Can be fully tested by performing multiple token operations (purchase, deductions, refunds), then viewing transaction history and verifying all transactions listed with correct running balance. Delivers value by providing transparency and helping users make informed purchase decisions.

**Acceptance Scenarios**:

1. **Given** a user with 10 transactions (2 purchases, 6 deductions, 2 refunds), **When** they navigate to Account → Token History, **Then** all 10 transactions listed in chronological order with running balance calculated correctly
2. **Given** a user with 100+ transactions, **When** they scroll to end of transaction history page, **Then** more transactions load automatically (pagination), no duplicate transactions shown, and performance <200ms per page load
3. **Given** a user on transaction history page, **When** they filter by type="purchase" and date range "Last 30 days", **Then** only purchase transactions from last 30 days displayed, and filter results appear within 200ms
4. **Given** a user views usage statistics, **When** page loads, **Then** displays "This week: 23 tokens used", "This month: 87 tokens used", "Lifetime: 234 tokens used" with accurate counts

---

### Edge Cases

- **What happens when user's balance is exactly 0 but they have an active subscription?** System checks subscription_status='active' first before token balance, so generation proceeds without token deduction
- **What happens when Stripe webhook is delayed by 5 minutes after payment?** Tokens credited when webhook finally arrives, user sees balance update within 5 seconds of webhook receipt, late but accurate
- **What happens when user has 50 tokens and subscribes to Monthly Pro?** Token balance preserved (balance=50) throughout subscription, available for use when subscription ends
- **What happens when auto-reload is triggered but user manually purchases tokens simultaneously?** Both transactions process independently, user receives tokens from both (e.g., 100 from auto-reload + 50 from manual = 150 total), no race condition
- **What happens when generation is 90% complete and user closes browser tab?** request_id persisted in backend, generation completes, user can retrieve result when they return by checking generation history
- **What happens when user attempts to generate with 0 trials, 0 tokens, and expired subscription?** All three checks fail, "Insufficient access" modal appears with options: "Renew Subscription" or "Buy Tokens"
- **What happens when two users register with same email simultaneously?** Database UNIQUE constraint on email column prevents duplicate, second request returns "Email already registered" error
- **What happens when Gemini API is completely unavailable (5xx errors)?** After 3 retry attempts with exponential backoff, generation fails, payment refunded, user shown "AI service temporarily unavailable, please try again later"

---

## Requirements *(mandatory)*

### Functional Requirements

#### Authentication & User Management

- **FR-001**: System MUST support user registration via email/password with minimum 8-character password requirement
- **FR-002**: System MUST support user registration via Google OAuth integration
- **FR-003**: System MUST send email verification link within 30 seconds of registration
- **FR-004**: System MUST initialize new users with trial_remaining=3, trial_used=0, and token balance=0
- **FR-005**: System MUST prevent duplicate email registrations (return "Email already registered" error)
- **FR-006**: System MUST validate email format according to RFC 5322 standard
- **FR-007**: System MUST expire email verification links after 24 hours
- **FR-008**: System MUST allow users to resend verification email (max 3 times per hour per account)
- **FR-009**: System MUST issue JWT tokens that expire after 1 hour with auto-refresh mechanism
- **FR-010**: System MUST support password reset via email link

#### Trial System

- **FR-011**: System MUST decrement trial_remaining atomically using row-level locking (FOR UPDATE) to prevent race conditions
- **FR-012**: System MUST prevent trial_remaining from going negative even under concurrent requests
- **FR-013**: System MUST refund trial credit if generation fails (restore trial_remaining)
- **FR-014**: System MUST display real-time trial counter in UI (e.g., "2 trials remaining")
- **FR-015**: System MUST show "Trial Exhausted" modal when trial_remaining=0 with pricing options
- **FR-016**: System MUST block new generations when trial_remaining=0

#### Token System

- **FR-017**: System MUST offer token packages: 10 ($2), 50 ($10), 100 ($20), 200 ($40)
- **FR-018**: System MUST integrate with Stripe Checkout (hosted page) for token purchases
- **FR-019**: System MUST process Stripe webhooks to credit tokens atomically
- **FR-020**: System MUST implement idempotent webhook processing using stripe_payment_intent_id to prevent duplicate token credits
- **FR-021**: System MUST deduct 1 token BEFORE calling Gemini API (not after) using row-level locking
- **FR-022**: System MUST prevent token balance from going negative using database CHECK constraint (balance >= 0)
- **FR-023**: System MUST refund token if generation fails (automatic rollback)
- **FR-024**: System MUST block generation if balance < 1 (return "Insufficient tokens" error)
- **FR-025**: System MUST record every token transaction in users_token_transactions table with type (purchase/deduction/refund/auto_reload)
- **FR-026**: System MUST display real-time token balance in navbar with auto-update on transactions
- **FR-027**: System MUST support concurrent token purchases from same user without race conditions

#### Transaction History

- **FR-028**: System MUST display all token transactions (purchases, deductions, refunds, auto_reload) in chronological order
- **FR-029**: System MUST show running balance after each transaction in history
- **FR-030**: System MUST support pagination (20 transactions per page) with infinite scroll
- **FR-031**: System MUST allow filtering by transaction type (purchase/deduction/refund/auto_reload)
- **FR-032**: System MUST allow filtering by date range with performance <200ms
- **FR-033**: System MUST support export to CSV with all transaction details

#### Auto-Reload

- **FR-034**: System MUST allow users to enable auto-reload with configurable threshold (1-100 tokens) and amount (min 10 tokens)
- **FR-035**: System MUST validate that user has payment method on file before enabling auto-reload
- **FR-036**: System MUST trigger auto-reload when balance drops below threshold (detected after each deduction)
- **FR-037**: System MUST implement 60-second throttle to prevent duplicate auto-reload charges
- **FR-038**: System MUST send email confirmation on successful auto-reload with amount and new balance
- **FR-039**: System MUST increment failure_count on auto-reload payment failure
- **FR-040**: System MUST disable auto_reload_enabled after 3 consecutive payment failures
- **FR-041**: System MUST send email notification on auto-reload failure with instructions to update payment method
- **FR-042**: System MUST reset failure_count to 0 on successful auto-reload

#### Subscription System

- **FR-043**: System MUST offer subscription plans: 7-Day Pass ($49), Per-Property ($29), Monthly Pro ($99/month recurring)
- **FR-044**: System MUST integrate with Stripe Checkout for subscription creation
- **FR-045**: System MUST process subscription webhooks (checkout.session.completed, customer.subscription.updated, customer.subscription.deleted)
- **FR-046**: System MUST update user tier and subscription_status in database on subscription activation
- **FR-047**: System MUST check subscription_status='active' BEFORE checking token balance for generation authorization
- **FR-048**: System MUST allow unlimited generations for active subscribers without token deduction
- **FR-049**: System MUST preserve token balance throughout subscription (no impact on balance)
- **FR-050**: System MUST allow users to access Stripe Customer Portal for subscription management
- **FR-051**: System MUST support subscription cancellation with cancel_at_period_end=true (access until period end)
- **FR-052**: System MUST automatically revert user to token system when subscription ends (subscription_status='cancelled')
- **FR-053**: System MUST handle subscription renewal failures by setting subscription_status='past_due' with 7-day grace period
- **FR-054**: System MUST send email notifications on subscription events (activation, renewal, failure, cancellation)

#### Design Generation

- **FR-055**: System MUST support image upload (property photo) with max file size 10MB and formats: JPG, PNG, WEBP
- **FR-056**: System MUST support address input (text) as alternative to image upload
- **FR-057**: System MUST provide yard area selection: Front Yard, Backyard, Walkway, Side Yard
- **FR-058**: System MUST provide style presets: Modern Minimalist, California Native, Japanese Zen, English Garden, Desert Landscape
- **FR-059**: System MUST allow custom text prompt (optional, max 500 characters)
- **FR-060**: System MUST support multi-area selection for parallel generation (up to 5 areas simultaneously)
- **FR-061**: System MUST validate user access (trial > 0 OR token balance >= 1 OR subscription_status='active') before generation
- **FR-062**: System MUST deduct payment (trial OR token) BEFORE calling Gemini API
- **FR-063**: System MUST call Google Gemini 2.5 Flash API with multimodal parameters (image + text prompt)
- **FR-064**: System MUST display real-time progress (0-100%) with status messages ("Analyzing property...", "Generating design...")
- **FR-065**: System MUST timeout generation after 5 minutes with error message and automatic refund
- **FR-066**: System MUST refund payment (trial or token) if generation fails for any reason
- **FR-067**: System MUST save generated images to Vercel Blob storage with unique URLs
- **FR-068**: System MUST create generation record in database with status (pending/processing/completed/failed)
- **FR-069**: System MUST support multiple angles for backyard generations (2-3 images per area)
- **FR-070**: System MUST process multi-area generations in parallel (not sequential) using async/await or threading

#### Gallery

- **FR-071**: System MUST display all user's generated designs in grid layout (3 columns desktop, 1 column mobile)
- **FR-072**: System MUST show thumbnail with area, style, and date for each design
- **FR-073**: System MUST support filtering by style, date, area with <200ms response time
- **FR-074**: System MUST support search by address with fuzzy matching
- **FR-075**: System MUST implement pagination or infinite scroll for large galleries (>100 designs)
- **FR-076**: System MUST allow users to click design to view full-size in modal
- **FR-077**: System MUST allow users to download individual images (PNG format, high-resolution)
- **FR-078**: System MUST allow users to delete designs from gallery with confirmation prompt
- **FR-079**: System MUST allow users to "Regenerate Similar" with same parameters pre-filled

#### Account Management

- **FR-080**: System MUST display user profile with email, account creation date, email verification status
- **FR-081**: System MUST allow users to change password (require current password for verification)
- **FR-082**: System MUST allow users to change email (require re-verification of new email)
- **FR-083**: System MUST display current token balance prominently on account page
- **FR-084**: System MUST display current subscription status, plan, and next billing date (if applicable)
- **FR-085**: System MUST display usage statistics: tokens used this week, month, lifetime
- **FR-086**: System MUST display designs generated this week, month, lifetime
- **FR-087**: System MUST allow users to configure download quality preference (Standard 1024x1024 / High 2048x2048)
- **FR-088**: System MUST allow users to configure email notification preferences (generation complete, token low, auto-reload, subscription events)

### Key Entities

- **User**: Represents a registered user account with authentication credentials (Firebase UID), trial credits (trial_remaining, trial_used), subscription tier (free/7day/property/monthly_pro), and subscription status (inactive/active/past_due/cancelled)
- **Token Account**: Represents a user's token balance (balance >= 0), auto-reload configuration (enabled, threshold, amount, failure_count), and last reload timestamp for throttling
- **Token Transaction**: Represents a single token operation (purchase/deduction/refund/auto_reload) with amount, description, balance_after, and Stripe payment intent ID for idempotency
- **Generation**: Represents a landscape design generation request with input parameters (address, area, style, custom_prompt), status (pending/processing/completed/failed), output (image_urls), payment details (payment_type, tokens_deducted), and timestamps
- **Subscription**: Represented as fields on User entity - stripe_customer_id, stripe_subscription_id, subscription_tier, subscription_status, current_period_end for managing subscription lifecycle
- **Rate Limit**: Represents API rate limiting per user per endpoint with request_count, window_start, window_end for throttling abusive usage

---

## Success Criteria *(mandatory)*

### Measurable Outcomes

#### User Acquisition & Conversion
- **SC-001**: 70%+ of trial users successfully generate at least 1 design within 24 hours of registration
- **SC-002**: 50%+ trial-to-paid conversion rate (trial user purchases tokens OR subscribes within 7 days)
- **SC-003**: 80%+ of new users successfully verify their email within 48 hours of registration
- **SC-004**: Email verification sent and delivered within 30 seconds of registration in 99%+ of cases

#### Engagement & Retention
- **SC-005**: Paying users generate average of 10+ designs per month
- **SC-006**: Monthly Pro subscribers generate average of 50+ designs per month
- **SC-007**: 30%+ week-2 retention rate (users return within 14 days for 2nd session)
- **SC-008**: 60%+ of multi-area generations complete successfully with all areas rendering

#### Technical Performance
- **SC-009**: API response time p95 <500ms for all endpoints (token balance <100ms, deduction <50ms, transaction history <200ms)
- **SC-010**: Design generation completes in 30-60 seconds for 95%+ of single-area requests
- **SC-011**: Multi-area generation (3 areas) completes in 60-90 seconds total (parallel, not 3×60=180s sequential)
- **SC-012**: System supports 100+ concurrent users without performance degradation
- **SC-013**: 99.9%+ uptime (8.76 hours max downtime per year)
- **SC-014**: Zero negative token balances or trial_remaining in production (race condition prevention)
- **SC-015**: Zero duplicate token credits from Stripe webhooks (idempotency verification)

#### Data Integrity & Reliability
- **SC-016**: 100% transaction audit trail completeness (all token operations recorded)
- **SC-017**: Token balance reconciliation matches sum of transactions for 100% of users (daily audit)
- **SC-018**: Stripe payment records match database transactions for 100% of purchases (weekly audit)
- **SC-019**: Zero data inconsistencies detected in production (ACID transaction verification)
- **SC-020**: Generation failure refund rate: 100% of failed generations receive automatic token/trial refund within 5 seconds

#### Business & Revenue
- **SC-021**: $10,000+ monthly recurring revenue (MRR) from subscriptions within 3 months of launch
- **SC-022**: $5,000+ monthly token sales revenue within 3 months of launch
- **SC-023**: 10%+ of paying users enable auto-reload within first month
- **SC-024**: <5% monthly subscription churn rate
- **SC-025**: $15+ average revenue per paying user (ARPPU) per month

#### User Experience & Support
- **SC-026**: 90%+ of users successfully complete first design generation on first attempt (no errors)
- **SC-027**: <12 hour average support response time for all inquiries
- **SC-028**: 80%+ customer satisfaction (CSAT) score based on post-generation surveys
- **SC-029**: <10 critical bugs reported in first 30 days post-launch
- **SC-030**: 95%+ of error messages provide clear next steps for user (no technical jargon)

#### Security & Compliance
- **SC-031**: Zero unauthorized access incidents detected (authentication/authorization breaches)
- **SC-032**: Zero PII leaks in application logs (verified through log audit)
- **SC-033**: Zero SQL injection vulnerabilities detected in security audit (parameterized queries verified)
- **SC-034**: 100% of payment data handled via Stripe (no card data stored in database - PCI compliance)
- **SC-035**: Rate limiting successfully blocks 100% of abusive traffic (>100 req/min from single IP)
