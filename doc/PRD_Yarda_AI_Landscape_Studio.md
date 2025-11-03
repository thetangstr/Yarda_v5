# Product Requirements Document: Yarda AI Landscape Studio

**Version:** 1.1
**Date:** November 3, 2025
**Status:** Active
**Owner:** Product Team

> **📝 Infrastructure Update (Nov 2025):**
> Backend migrated from Vercel Serverless to **Railway** for improved deployment control, stateful capabilities, and better cost management. Frontend remains on Vercel for global CDN delivery. All backend references in this document have been updated to reflect the Railway architecture.

---

## Executive Summary

Yarda AI Landscape Studio is a web-based application that transforms property photos into professional AI-generated landscape designs using Google's Gemini 2.5 Flash model. The platform offers both text-to-image and image-to-image generation capabilities with a flexible monetization model including free trials, pay-per-use tokens, and unlimited subscriptions.

### Key Value Propositions
- **For Homeowners:** Visualize landscape improvements before investing in contractors
- **For Real Estate Agents:** Create compelling property listings with professional designs
- **For Landscape Professionals:** Rapid prototyping tool for client presentations
- **For DIY Enthusiasts:** Inspiration and planning for weekend projects

---

## User Personas

### Persona 1: Sarah - First-Time Homeowner
**Demographics:**
- Age: 28-35
- Income: $75,000/year
- Location: Suburban California
- Tech Savviness: Medium-High

**Goals:**
- Visualize landscaping options before hiring contractors
- Stay within budget ($2,000-$5,000)
- Find drought-tolerant, low-maintenance solutions
- Get design ideas without commitment

**Pain Points:**
- Overwhelmed by Pinterest inspiration (no specificity)
- Can't visualize designs on their actual property
- Contractors charge $200+ for consultations
- Unsure what styles work with home architecture

**Usage Pattern:**
- Uses 3 free trials to explore options
- Purchases 10-50 tokens ($2-$10) for additional designs
- Generates 5-10 designs total over 2 weeks
- Downloads favorites to show contractors

**Success Metrics:**
- Finds design they want to implement: 70%
- Saves money vs traditional consultations: $150+
- Time to decision: 2 weeks (vs 2 months)

---

### Persona 2: Mike - Landscape Architect
**Demographics:**
- Age: 38-50
- Income: $90,000/year
- Location: Urban/Suburban areas
- Tech Savviness: High

**Goals:**
- Create client presentations faster (10+ designs/week)
- Show multiple style variations quickly
- Reduce time on initial sketches/mockups
- Win more contracts with compelling visuals

**Pain Points:**
- Hand-drawing takes 2-3 hours per design
- Photoshop mockups still require 1+ hour
- Clients want to see "their property" with designs
- Need unlimited generations for active projects

**Usage Pattern:**
- Subscribes to Monthly Pro ($99/month unlimited)
- Generates 50-150 designs per month
- Uses auto-reload for token top-ups (if needed)
- Exports high-res images for client decks

**Success Metrics:**
- Time savings: 80% vs manual mockups
- Client win rate increase: 30%
- Designs per week: 20+ (vs 5 previously)

---

### Persona 3: Lisa - Real Estate Agent
**Demographics:**
- Age: 32-48
- Income: $120,000/year (commission-based)
- Location: Residential markets
- Tech Savviness: Medium

**Goals:**
- Enhance property listings with curb appeal
- Show potential of "fixer-upper" properties
- Create compelling marketing materials
- Close deals faster with better visuals

**Pain Points:**
- Properties with poor landscaping sit longer
- Buyers can't visualize potential improvements
- Staging costs too much for exterior spaces
- MLS photos need more appeal

**Usage Pattern:**
- Starts with 50 tokens ($10) to test
- Upgrades to Monthly Pro after 20+ listings
- Generates 10 designs per property (multiple angles/styles)
- Uses for 15-20 properties per month

**Success Metrics:**
- Days on market reduced: 25%
- Offer amount increase: $5,000-$15,000
- Buyer engagement: 40% more showing requests

---

### Persona 4: Alex - DIY Homeowner
**Demographics:**
- Age: 40-55
- Income: $60,000/year
- Location: Suburban/Rural
- Tech Savviness: Low-Medium

**Goals:**
- Get ideas for weekend DIY projects
- Plan landscaping in phases (budget constraints)
- Find inspiration that matches home style
- Learn what plants work in their region

**Pain Points:**
- Limited budget ($500-$1,500 total)
- Can't afford professional designers
- Unsure where to start
- Afraid of making expensive mistakes

**Usage Pattern:**
- Uses 3 free trials thoroughly
- Purchases 10 tokens ($2) for specific areas
- Generates 5-8 total designs
- Screenshots and saves to Pinterest/Google Photos

**Success Metrics:**
- Finds actionable plan: 80%
- Cost savings vs hiring pro: $1,000+
- Confidence in DIY execution: High

---

## Critical User Journeys (CUJs)

### CUJ-1: New User Trial → First Generation

**Actor:** Sarah (First-Time Homeowner)
**Goal:** Explore the platform with free trial and generate first design
**Preconditions:** User has not registered yet
**Duration:** 5-7 minutes

#### Tasks

**Task 1.1: Account Registration**
- User visits yarda.pro or yard-web-app.vercel.app
- Clicks "Get Started Free" or "Sign Up"
- Enters email and password
- Submits registration form
- Receives email verification link
- Clicks verification link
- Account activated with 3 trial credits

**Expected Outcome:**
- User record created in PostgreSQL `users` table
- `trial_remaining=3`, `trial_used=0`
- Token account initialized with `balance=0`
- Email verification sent within 30 seconds

**Test Cases:**
```
TC-1.1.1: Valid registration with email/password
  Given: User on registration page
  When: Enters valid email "sarah@example.com" and password "SecurePass123!"
  Then: Account created successfully
  And: User record in database with trial_remaining=3
  And: Token account created with balance=0
  And: Email verification sent

TC-1.1.2: Duplicate email registration
  Given: User "sarah@example.com" already exists
  When: Another user tries to register with same email
  Then: Error message "Email already registered"
  And: No new user record created

TC-1.1.3: Invalid email format
  Given: User on registration page
  When: Enters invalid email "notanemail"
  Then: Validation error "Please enter valid email"
  And: Registration blocked

TC-1.1.4: Weak password
  Given: User on registration page
  When: Enters password "123"
  Then: Error "Password must be 8+ characters"
  And: Registration blocked

TC-1.1.5: Concurrent registrations (race condition)
  Given: Two users register simultaneously with different emails
  When: Both submit registration within 100ms
  Then: Both accounts created successfully
  And: No database conflicts
  And: Each has independent trial_remaining=3
```

---

**Task 1.2: First Design Generation**
- User uploads front yard photo OR enters property address
- Selects "Front Yard" area
- Chooses "Modern Minimalist" style
- Optionally adds custom prompt: "drought-tolerant native plants"
- Clicks "Generate Design" button
- System validates trial availability (trial_remaining > 0)
- Generation starts, progress shown (0% → 100%)
- After 30-60 seconds, design appears
- Trial counter decrements atomically (trial_remaining=2)

**Expected Outcome:**
- Design generated successfully
- Trial decremented atomically (no race conditions)
- Generation record saved to database
- User sees "2 trials remaining" badge
- Design downloadable (with watermark for trial users)

**Test Cases:**
```
TC-1.2.1: Successful trial generation
  Given: User with trial_remaining=3
  When: Uploads image and clicks "Generate Design"
  Then: Generation completes in 30-60 seconds
  And: Design image displayed
  And: trial_remaining=2, trial_used=1
  And: Generation record in database

TC-1.2.2: Generation without image or address
  Given: User on generation page
  When: Clicks "Generate" without uploading image or entering address
  Then: Error "Please provide property photo or address"
  And: Generation blocked
  And: Trial not decremented

TC-1.2.3: Generation without selecting style
  Given: User uploaded image but no style selected
  When: Clicks "Generate Design"
  Then: Error "Please select a design style"
  And: Generation blocked

TC-1.2.4: Concurrent trial generations (race condition)
  Given: User with trial_remaining=1
  When: Clicks "Generate" twice rapidly (within 200ms)
  Then: Only one generation proceeds
  And: Second request returns "Insufficient trials"
  And: Final trial_remaining=0 (not negative)

TC-1.2.5: Trial exhaustion mid-generation
  Given: User with trial_remaining=1 starts generation
  When: Generation completes after 45 seconds
  Then: Design delivered successfully
  And: trial_remaining=0
  And: User shown "Trial exhausted" modal with purchase CTA

TC-1.2.6: Generation failure with trial refund
  Given: User starts generation with trial_remaining=2
  When: Gemini API times out after 5 minutes
  Then: Error message "Generation failed"
  And: Trial refunded: trial_remaining=2 (unchanged)
  And: User can retry without losing trial
```

---

**Task 1.3: Using Remaining Trials**
- User clicks "Generate Another" or navigates back to studio
- Tries different style: "California Native"
- Generation completes (trial_remaining=1)
- User tries backyard area with "Japanese Zen" style
- Third generation completes (trial_remaining=0)

**Expected Outcome:**
- All 3 trials used successfully
- User has 3 different designs in gallery
- "Trial Exhausted" modal appears
- User shown clear path to purchase

**Test Cases:**
```
TC-1.3.1: Sequential trial usage
  Given: User with trial_remaining=3
  When: Generates 3 designs sequentially (each completes before next)
  Then: All 3 generations succeed
  And: Final trial_remaining=0
  And: All 3 designs in user gallery

TC-1.3.2: Rapid trial exhaustion
  Given: User with trial_remaining=2
  When: Generates 2 designs back-to-back rapidly
  Then: Both generations complete
  And: trial_remaining=0
  And: Next generation attempt blocked

TC-1.3.3: Trial exhausted modal display
  Given: User with trial_remaining=0
  When: Clicks "Generate Design"
  Then: Modal appears "You've used all 3 free trials"
  And: Shows pricing: 10 tokens ($2), 50 tokens ($10), 100 tokens ($20)
  And: CTA buttons for each package
```

---

**Task 1.4: Token Purchase Flow**
- User clicks "Buy 50 Tokens ($10)" in modal
- Redirected to Stripe Checkout page
- Enters credit card: 4242 4242 4242 4242
- Completes payment
- Stripe webhook received at `/api/subscription/webhook`
- Tokens credited atomically to account
- User redirected back to app
- Toast notification: "50 tokens added to your account!"

**Expected Outcome:**
- Payment processed successfully
- 50 tokens added to balance atomically
- Transaction recorded in `users_token_transactions`
- No duplicate charges (idempotent webhook)
- User can immediately use tokens

**Test Cases:**
```
TC-1.4.1: Successful token purchase
  Given: User with balance=0 on Stripe checkout page
  When: Enters valid card and completes payment
  Then: Webhook received within 10 seconds
  And: Tokens credited atomically (balance=50)
  And: Transaction recorded with stripe_payment_intent_id
  And: User redirected to app with success message

TC-1.4.2: Failed payment (card declined)
  Given: User enters card with insufficient funds
  When: Submits payment
  Then: Stripe returns error "Card declined"
  And: No tokens credited (balance=0)
  And: No transaction recorded
  And: User can retry with different card

TC-1.4.3: Duplicate webhook (idempotency)
  Given: User completed purchase, webhook received
  When: Stripe retries webhook (duplicate event)
  Then: Idempotency check passes (same stripe_payment_intent_id)
  And: Tokens NOT credited again
  And: balance remains 50 (not 100)
  And: Only 1 transaction record exists

TC-1.4.4: Webhook delay
  Given: User completed payment 2 minutes ago
  When: Webhook finally received after network delay
  Then: Tokens credited successfully (late but accurate)
  And: User sees balance update within 5 seconds of webhook

TC-1.4.5: Concurrent token purchases
  Given: User clicks "Buy 10 tokens" and "Buy 50 tokens" simultaneously
  When: Both webhooks received within 1 second
  Then: Both purchases credited correctly
  And: balance=60 (10 + 50)
  And: 2 separate transaction records
  And: No race condition or data corruption
```

---

### CUJ-2: Token-Based Generation

**Actor:** Sarah (now a paying user)
**Goal:** Generate additional designs using purchased tokens
**Preconditions:** User has 50 tokens in account
**Duration:** 2-3 minutes per generation

#### Tasks

**Task 2.1: Token Balance Check**
- User logs in and sees "50 tokens" badge in navbar
- Navigates to Account → Token History
- Views transaction: "+50 tokens - Purchase ($10)"
- Confirms balance is accurate

**Expected Outcome:**
- Real-time balance display (no stale data)
- Transaction history shows all activity
- Balance matches sum of transactions

**Test Cases:**
```
TC-2.1.1: Token balance display
  Given: User with balance=50
  When: User loads any page
  Then: Navbar shows "50 tokens" badge
  And: Badge updates within 500ms of any transaction

TC-2.1.2: Transaction history accuracy
  Given: User with 2 purchases and 3 deductions
  When: Views transaction history
  Then: All 5 transactions listed in order
  And: Running balance calculated correctly
  And: Latest balance matches navbar

TC-2.1.3: Pagination in transaction history
  Given: User with 100+ transactions
  When: Scrolls to end of page
  Then: More transactions load automatically
  And: No duplicate transactions shown
  And: Performance < 200ms per page load
```

---

**Task 2.2: Design Generation with Token Deduction**
- User uploads backyard photo
- Selects "Backyard" area
- Chooses "Modern" style with custom prompt
- Clicks "Generate Design"
- System pre-checks: balance >= 1? YES
- Token deducted BEFORE generation starts (balance=49)
- Transaction recorded: "-1 token - Design generation: Modern style"
- Generation proceeds (Gemini API called)
- Progress shown: "Analyzing property... 40%"
- After 45 seconds, design appears
- Balance updates automatically to 49

**Expected Outcome:**
- Token deducted atomically before generation
- No possibility of generating without payment
- If generation fails, token automatically refunded
- Balance always accurate

**Test Cases:**
```
TC-2.2.1: Successful generation with token deduction
  Given: User with balance=50
  When: Clicks "Generate Design"
  Then: Token deducted before generation (balance=49)
  And: Transaction recorded as type='deduction'
  And: Generation completes successfully
  And: Design delivered to user
  And: Final balance=49

TC-2.2.2: Insufficient tokens
  Given: User with balance=0
  When: Clicks "Generate Design"
  Then: Modal appears "Insufficient tokens"
  And: Generation blocked immediately
  And: No token deduction attempted
  And: User shown purchase options

TC-2.2.3: Generation failure with automatic refund
  Given: User with balance=25, starts generation
  When: Gemini API times out after 5 minutes
  Then: Token automatically refunded (balance=25)
  And: Refund transaction recorded: type='refund'
  And: User shown error: "Generation failed, 1 token refunded"
  And: User can retry without re-purchasing

TC-2.2.4: Concurrent deduction attempts (race condition)
  Given: User with balance=1
  When: Clicks "Generate" twice within 100ms
  Then: First request locks token account row
  And: First deduction succeeds (balance=0)
  And: Second request waits for lock, sees balance=0
  And: Second request returns "Insufficient tokens"
  And: Only 1 generation proceeds

TC-2.2.5: Balance update race condition
  Given: User generates design in Tab A (balance=50→49)
  When: Tab B still shows old balance=50 (cached)
  And: User clicks "Generate" in Tab B
  Then: Backend checks real-time balance from database
  And: Deduction proceeds if balance>=1
  And: Both tabs update to correct balance within 2 seconds
```

---

### CUJ-3: Auto-Reload Configuration

**Actor:** Mike (Landscape Architect)
**Goal:** Set up automatic token reload to never run out mid-project
**Preconditions:** User is power user with payment method on file
**Duration:** 3-5 minutes setup

#### Tasks

**Task 3.1: Enable Auto-Reload**
- User navigates to Account → Token Settings
- Toggles "Auto-Reload" switch to ON
- Sets threshold: "Reload when balance < 20 tokens"
- Sets reload amount: "Add 100 tokens ($20)"
- Confirms default payment method: Card ending in 4242
- Clicks "Save Settings"

**Expected Outcome:**
- Auto-reload enabled in database
- Settings persisted: threshold=20, amount=100
- User shown confirmation: "Auto-reload activated"

**Test Cases:**
```
TC-3.1.1: Enable auto-reload with valid settings
  Given: User on Token Settings page
  When: Enables auto-reload with threshold=20, amount=100
  Then: Settings saved to database
  And: auto_reload_enabled=true
  And: auto_reload_threshold=20
  And: auto_reload_amount=100
  And: Success message displayed

TC-3.1.2: Invalid threshold (too low)
  Given: User enables auto-reload
  When: Sets threshold=0
  Then: Validation error "Threshold must be 1-100"
  And: Settings not saved

TC-3.1.3: Invalid reload amount
  Given: User enables auto-reload
  When: Sets reload amount=5 (below minimum)
  Then: Error "Minimum reload is 10 tokens"
  And: Settings not saved

TC-3.1.4: No payment method on file
  Given: User without saved card
  When: Tries to enable auto-reload
  Then: Prompt "Please add payment method first"
  And: Redirected to payment method setup
```

---

**Task 3.2: Auto-Reload Trigger**
- Mike generates design #31 (balance goes from 20 → 19)
- Backend detects: balance (19) < threshold (20)
- System checks throttle: last_reload_at > 60 seconds ago? YES
- System creates Stripe payment intent for 100 tokens
- Stripe charges card automatically (no user interaction)
- Webhook received, tokens credited atomically
- Email sent: "Auto-reload triggered: 100 tokens added ($20)"
- Balance updated: 19 → 119
- Mike continues working, never noticed interruption

**Expected Outcome:**
- Automatic, seamless reload
- No interruption to user workflow
- Email confirmation for transparency
- Throttle prevents duplicate charges

**Test Cases:**
```
TC-3.2.1: Auto-reload triggers correctly
  Given: User with auto_reload enabled, threshold=20, balance=20
  When: Generates design (balance=19)
  Then: Auto-reload triggers within 5 seconds
  And: Stripe payment intent created for 100 tokens
  And: Card charged $20 automatically
  And: Webhook credits 100 tokens (balance=119)
  And: Email confirmation sent

TC-3.2.2: Throttle prevents duplicate reloads
  Given: Auto-reload just triggered 30 seconds ago
  When: Balance drops below threshold again
  Then: Auto-reload blocked by throttle
  And: User must wait 60 seconds total before next reload
  And: No duplicate charge

TC-3.2.3: Auto-reload payment failure
  Given: User's card declined (insufficient funds)
  When: Auto-reload triggers
  Then: Payment fails, no tokens credited
  And: User receives email: "Auto-reload failed: Card declined"
  And: failure_count increments (failure_count=1)
  And: Auto-reload remains enabled (1st failure)

TC-3.2.4: Auto-reload disabled after 3 failures
  Given: User with failure_count=2 (2 previous failures)
  When: 3rd auto-reload attempt fails
  Then: auto_reload_enabled set to false
  And: User receives email: "Auto-reload disabled after 3 failures"
  And: User must manually re-enable after fixing payment method

TC-3.2.5: Concurrent generations during reload
  Given: Auto-reload triggered (in progress, not completed)
  When: User generates another design
  Then: Deduction uses current balance (before reload completes)
  And: Once reload completes, balance updated correctly
  And: No race condition or double-charging
```

---

### CUJ-4: Subscription Upgrade

**Actor:** Lisa (Real Estate Agent)
**Goal:** Upgrade from token-based to unlimited Monthly Pro subscription
**Preconditions:** User has used tokens, realizes subscription is better value
**Duration:** 5-7 minutes

#### Tasks

**Task 4.1: Subscription Purchase**
- User calculates: 50 designs/month × $0.20 = $10 + overhead
- Realizes Monthly Pro ($99) is better value for >50 designs
- Clicks "Upgrade to Monthly Pro" from navbar or pricing page
- Redirected to Stripe checkout
- Confirms $99/month recurring charge
- Completes payment
- Stripe webhook: `checkout.session.completed`

**Expected Outcome:**
- Subscription activated immediately
- User tier updated to 'monthly_pro'
- Subscription status = 'active'
- Existing token balance preserved (30 tokens)

**Test Cases:**
```
TC-4.1.1: Successful subscription upgrade
  Given: User with balance=30 tokens, no active subscription
  When: Completes Monthly Pro checkout
  Then: Webhook received within 10 seconds
  And: Subscription record created in database
  And: User tier updated to 'monthly_pro'
  And: subscription_status='active'
  And: Token balance preserved (balance=30)
  And: User redirected to app with success message

TC-4.1.2: Token balance preserved during subscription
  Given: User has 30 tokens, subscribes to Monthly Pro
  When: Subscription activated
  Then: balance remains 30 (not lost)
  And: User can still see token balance in account
  And: Tokens available when subscription ends

TC-4.1.3: Duplicate subscription attempt
  Given: User with active Monthly Pro subscription
  When: Clicks "Upgrade to Monthly Pro" again
  Then: Message "You already have an active subscription"
  And: Redirected to manage subscription portal
  And: No duplicate subscription created
```

---

**Task 4.2: Unlimited Generation Usage**
- Lisa generates 150 designs over 3 weeks
- Each generation: Backend checks subscription_status = 'active'
- If active: No token deduction, generate immediately
- Token balance remains at 30 (unused)
- No limit on generations during subscription

**Expected Outcome:**
- Unlimited generations without token deduction
- Fast generation (no payment processing delays)
- Token balance preserved for future use

**Test Cases:**
```
TC-4.2.1: Unlimited generation during subscription
  Given: User with active subscription, balance=30
  When: Generates 150 designs over 1 month
  Then: All generations succeed
  And: No tokens deducted (balance=30 throughout)
  And: No generation limits enforced

TC-4.2.2: Subscription check on each generation
  Given: User starts generation
  When: Backend validates access
  Then: Checks subscription_status first
  And: If active: bypass token check
  And: If inactive: check token balance
  And: Correct path executed based on status
```

---

**Task 4.3: Subscription Renewal**
- After 30 days, Stripe automatically charges $99
- Webhook: `customer.subscription.updated`
- Backend updates: `current_period_end = new_date`
- User continues with unlimited access
- Email sent: "Monthly Pro renewed - $99 charged"

**Expected Outcome:**
- Automatic renewal, no user action needed
- Continuous unlimited access (no gap)
- Clear email notification for transparency

**Test Cases:**
```
TC-4.3.1: Automatic subscription renewal
  Given: Subscription ending in 1 day
  When: Renewal date reached
  Then: Stripe charges $99 automatically
  And: Webhook updates current_period_end
  And: subscription_status remains 'active'
  And: User access uninterrupted

TC-4.3.2: Failed renewal (payment declined)
  Given: Subscription renewal due, card declined
  When: Stripe attempts charge
  Then: Payment fails
  And: Webhook updates subscription_status='past_due'
  And: User receives email: "Payment failed - Update card"
  And: User has 7-day grace period to fix payment
  And: After grace period: subscription_status='cancelled'
```

---

**Task 4.4: Subscription Cancellation**
- User clicks "Manage Subscription" → "Cancel Subscription"
- Redirected to Stripe Customer Portal
- Confirms cancellation
- Stripe sets `cancel_at_period_end=true`
- User retains access until period end (Oct 28)
- Email: "Subscription ends Oct 28 - Token system resumes"

**Expected Outcome:**
- Access continues until period end (fair billing)
- Clear communication of cancellation date
- Token balance available after cancellation
- Smooth transition back to token system

**Test Cases:**
```
TC-4.4.1: Subscription cancellation with future end date
  Given: User with active subscription, period_end=Nov 15
  When: Cancels subscription on Oct 28
  Then: cancel_at_period_end=true
  And: subscription_status remains 'active' until Nov 15
  And: User has unlimited access until Nov 15
  And: On Nov 16: subscription_status='cancelled'
  And: User reverts to token system (balance=30)

TC-4.4.2: Token system resumes after cancellation
  Given: Subscription cancelled, period ended
  When: User generates next design
  Then: Backend checks subscription_status='cancelled'
  And: Falls back to token balance check
  And: Deducts 1 token (balance=29)
  And: User receives email: "Subscription ended. You have 29 tokens remaining"
```

---

### CUJ-5: Multi-Area Landscape Generation

**Actor:** Sarah (Homeowner planning full yard renovation)
**Goal:** Generate designs for front yard, backyard, and walkway in one session
**Preconditions:** User has 50 tokens or active subscription
**Duration:** 3-5 minutes

#### Tasks

**Task 5.1: Multi-Area Selection**
- User enters property address: "123 Oak Street, San Jose, CA"
- Selects 3 areas: Front Yard, Backyard, Walkway
- For each area, adds custom prompt:
  - Front Yard: "colorful flower beds with seasonal blooms"
  - Backyard: "outdoor dining space with pergola"
  - Walkway: "curved pathway with border plants"
- Selects style: "Modern Minimalist"
- Clicks "Generate All Areas"

**Expected Outcome:**
- System validates all selections
- Cost preview shown: "3 areas = 3 tokens" or "Unlimited"
- User confirms generation

**Test Cases:**
```
TC-5.1.1: Multi-area selection validation
  Given: User on landscape studio page
  When: Selects 3 areas with custom prompts
  Then: All areas highlighted in UI
  And: Cost shown: "3 tokens" or "Unlimited (subscription)"
  And: Generate button enabled

TC-5.1.2: Generate without selecting areas
  Given: User on studio page
  When: Clicks "Generate" without selecting areas
  Then: Error "Please select at least one area"
  And: Generation blocked

TC-5.1.3: Insufficient tokens for multi-area
  Given: User with balance=2 tokens
  When: Selects 3 areas and clicks "Generate"
  Then: Error "Need 3 tokens, you have 2"
  And: Purchase modal shown
  And: Generation blocked
```

---

**Task 5.2: Parallel Generation Progress**
- System creates request_id and starts generation
- Tokens deducted upfront (3 tokens if token user)
- Real-time progress shown for each area:
  - Front Yard: "Processing... 40%"
  - Backyard: "Analyzing property... 20%"
  - Walkway: "Generating design... 60%"
- Areas complete independently (not sequential)
- Total time: 60-90 seconds for all 3 areas

**Expected Outcome:**
- All areas generate in parallel (not sequential)
- Progress updates every 2 seconds
- User sees live status for each area

**Test Cases:**
```
TC-5.2.1: Parallel generation completion
  Given: User starts 3-area generation
  When: Generation in progress
  Then: All 3 areas show progress independently
  And: Front Yard completes first (45 seconds)
  And: Walkway completes second (60 seconds)
  And: Backyard completes last (75 seconds)
  And: Total time < 90 seconds (not 3×60 = 180 seconds)

TC-5.2.2: Partial generation failure
  Given: User starts 3-area generation
  When: Backyard generation fails (Gemini timeout)
  Then: Front Yard and Walkway complete successfully
  And: Backyard shows error status
  And: User receives 1 token refund (for failed backyard)
  And: User sees 2 completed designs
  And: Option to retry backyard separately

TC-5.2.3: Progress persistence across page refresh
  Given: User starts 3-area generation (in progress)
  When: User accidentally refreshes page
  Then: request_id persisted in localStorage
  And: Progress recovers on page load
  And: Polling resumes from current state
  And: User doesn't lose progress
```

---

**Task 5.3: Multi-Result Display**
- All 3 designs complete successfully
- Results shown in grid layout:
  - Front Yard (2 angles): Street view, Close-up
  - Backyard (3 angles): Aerial, Ground level, Corner view
  - Walkway (1 angle): Path view
- Total: 6 images displayed
- User can download individual images or all as ZIP

**Expected Outcome:**
- All generated images displayed clearly
- Multiple angles for backyard (default behavior)
- Download options for each image
- Gallery saved with all designs

**Test Cases:**
```
TC-5.3.1: Multi-result grid display
  Given: 3-area generation completed
  When: Results displayed
  Then: 6 total images shown (2+3+1)
  And: Each image labeled by area and angle
  And: Grid layout responsive (mobile + desktop)
  And: Images high-resolution (min 1024x1024)

TC-5.3.2: Individual image download
  Given: Multi-result display with 6 images
  When: User clicks download on "Backyard - Aerial"
  Then: Single PNG file downloads
  And: Filename: "yarda_backyard_aerial_2025-10-28.png"
  And: Image quality preserved (no compression loss)

TC-5.3.3: Bulk download (ZIP)
  Given: Multi-result display with 6 images
  When: User clicks "Download All"
  Then: ZIP file created with 6 PNGs
  And: Filename: "yarda_designs_2025-10-28.zip"
  And: Download completes within 10 seconds

TC-5.3.4: Gallery persistence
  Given: Multi-area generation completed
  When: User navigates to Gallery page
  Then: All 6 designs appear in gallery
  And: Grouped by generation session
  And: Timestamp and address metadata preserved
```

---

## Non-Functional Requirements

### NFR-1: Performance

**Requirement ID:** NFR-1.1
**Category:** Response Time
**Priority:** Critical

**Specification:**
- **API Response Time (p95):** < 500ms for all endpoints
  - Token balance fetch: < 100ms
  - Token deduction: < 50ms (atomic operation)
  - Transaction history: < 200ms (paginated)
  - Design generation start: < 2s (submission to job start)

**Measurement:**
- Monitor with Vercel Analytics
- Alert if p95 exceeds 500ms for 5 minutes
- Weekly performance reports

**Test Cases:**
```
TC-NFR-1.1.1: Token balance fetch performance
  Given: User with 100 transactions in history
  When: Fetches token balance 100 times concurrently
  Then: p95 response time < 100ms
  And: No timeouts or errors

TC-NFR-1.1.2: Transaction history pagination
  Given: User with 1,000 transactions
  When: Loads transaction history (first page)
  Then: Response time < 200ms
  And: Returns 20 transactions
  And: Includes pagination metadata
```

---

**Requirement ID:** NFR-1.2
**Category:** Throughput
**Priority:** High

**Specification:**
- **Concurrent Users:** Support 100+ simultaneous users
- **Requests Per Second:** 50+ RPS sustained
- **Generation Queue:** Handle 20 parallel generations
- **Database Connections:** Pool of 10-20 connections (not exhausted)

**Measurement:**
- Load testing with Locust (simulated 100 users)
- Monitor connection pool utilization (<90%)
- Track queue length and processing time

**Test Cases:**
```
TC-NFR-1.2.1: Concurrent user load test
  Given: 100 simulated users
  When: Each user generates 3 designs over 10 minutes
  Then: All 300 generations complete successfully
  And: Success rate > 99%
  And: p95 latency < 1 second (excluding generation time)

TC-NFR-1.2.2: Connection pool stress test
  Given: Database connection pool (max 20)
  When: 50 concurrent token operations
  Then: All operations complete without error
  And: No "connection pool exhausted" errors
  And: Average wait time for connection < 10ms
```

---

**Requirement ID:** NFR-1.3
**Category:** Scalability
**Priority:** Medium

**Specification:**
- **Horizontal Scaling:** Railway container auto-scaling (managed deployment)
- **Database Scaling:** PostgreSQL supports 100+ connections (Supabase Pro)
- **Blob Storage:** Unlimited with automatic CDN distribution
- **Generation Scaling:** Queue-based with parallel processing

**Measurement:**
- Monitor function invocation counts
- Track database connection metrics
- Test with load spikes (10x normal traffic)

---

### NFR-2: Reliability

**Requirement ID:** NFR-2.1
**Category:** Availability
**Priority:** Critical

**Specification:**
- **Uptime Target:** 99.9% (8.76 hours downtime/year max)
- **Deployment Strategy:** Blue-green deployment with instant rollback
- **Health Checks:** `/api/health` endpoint (response < 200ms)
- **Error Budget:** 0.1% error rate acceptable

**Measurement:**
- Uptime monitoring with UptimeRobot
- Weekly uptime reports
- Incident response time < 15 minutes

**Test Cases:**
```
TC-NFR-2.1.1: Health check endpoint
  Given: Application deployed
  When: GET /api/health
  Then: Returns 200 OK
  And: Response: {"status": "healthy", "backend": "railway-flask"}
  And: Response time < 200ms

TC-NFR-2.1.2: Graceful degradation
  Given: Database connection pool at 95% capacity
  When: New request arrives
  Then: Request waits for available connection (max 5s)
  And: Returns error if timeout exceeded
  And: User-friendly error message shown
```

---

**Requirement ID:** NFR-2.2
**Category:** Data Integrity
**Priority:** Critical

**Specification:**
- **ACID Transactions:** All financial operations atomic
- **Race Condition Prevention:** Row-level locking (PostgreSQL `FOR UPDATE`)
- **Idempotency:** Webhook processing safe to retry
- **Audit Trail:** 100% transaction completeness

**Measurement:**
- Zero data inconsistencies in production
- Daily audit trail reconciliation
- Automated data integrity checks

**Test Cases:**
```
TC-NFR-2.2.1: Concurrent token deduction (race condition)
  Given: User with balance=1
  When: 10 concurrent requests to deduct 1 token
  Then: Only 1 request succeeds (balance=0)
  And: 9 requests return "Insufficient tokens"
  And: No negative balance (-9)
  And: Transaction log shows exactly 1 deduction

TC-NFR-2.2.2: Webhook idempotency
  Given: Token purchase completed
  When: Webhook received 3 times (Stripe retries)
  Then: Tokens credited only once
  And: balance=50 (not 150)
  And: Only 1 transaction record created
  And: All 3 webhook calls return 200 OK

TC-NFR-2.2.3: Transaction audit trail completeness
  Given: User with 50 token operations over 1 month
  When: Export transaction history
  Then: All 50 operations present
  And: Running balance calculated correctly
  And: Sum of transactions = current balance
```

---

### NFR-3: Security

**Requirement ID:** NFR-3.1
**Category:** Authentication & Authorization
**Priority:** Critical

**Specification:**
- **Authentication:** Firebase Auth with JWT tokens
- **Token Validation:** Server-side on every request
- **Authorization:** Role-based (user, admin)
- **Session Management:** Tokens expire after 1 hour, auto-refresh
- **Email Whitelist:** Only approved emails can register (production)

**Measurement:**
- Zero unauthorized access incidents
- Security audit quarterly
- Penetration testing annually

**Test Cases:**
```
TC-NFR-3.1.1: Unauthorized API access blocked
  Given: Unauthenticated user
  When: GET /api/tokens?action=balance without Authorization header
  Then: Returns 401 Unauthorized
  And: Error: "Authentication required"
  And: No data leaked

TC-NFR-3.1.2: Expired token rejected
  Given: User with expired JWT (2 hours old)
  When: Attempts API call with expired token
  Then: Returns 401 Unauthorized
  And: Error: "Token expired"
  And: User redirected to login

TC-NFR-3.1.3: Admin-only endpoint protection
  Given: Regular user (non-admin)
  When: GET /api/admin/global-config
  Then: Returns 403 Forbidden
  And: Error: "Admin access required"

TC-NFR-3.1.4: SQL injection protection
  Given: Malicious user enters email: "'; DROP TABLE users; --"
  When: Submits registration form
  Then: Parameterized query prevents injection
  And: Email stored as literal string
  And: No database damage
```

---

**Requirement ID:** NFR-3.2
**Category:** Data Privacy
**Priority:** Critical

**Specification:**
- **PII Protection:** No sensitive data in logs
- **Payment Security:** PCI compliance via Stripe (no card data stored)
- **User Data Isolation:** Users can only access their own data
- **GDPR Compliance:** User data export/deletion on request

**Measurement:**
- Zero PII leak incidents
- GDPR compliance audit annually
- User data access logs monitored

**Test Cases:**
```
TC-NFR-3.2.1: User data isolation
  Given: User A with balance=50
  When: User A attempts GET /api/tokens?action=balance&user_id=USER_B_ID
  Then: Request blocked (user_id overridden by authenticated token)
  And: Returns User A's data only (balance=50)
  And: User B's data not accessible

TC-NFR-3.2.2: Payment data security
  Given: User completes token purchase
  When: Reviewing database
  Then: No credit card numbers stored
  And: Only Stripe IDs stored (stripe_customer_id, stripe_payment_intent_id)
  And: PCI compliance maintained
```

---

### NFR-4: Usability

**Requirement ID:** NFR-4.1
**Category:** User Interface
**Priority:** High

**Specification:**
- **Mobile Responsive:** Works on 320px+ screen width
- **Load Time:** First Contentful Paint < 1.5s
- **Accessibility:** WCAG 2.1 Level AA compliance
- **Browser Support:** Chrome, Firefox, Safari, Edge (last 2 versions)

**Measurement:**
- Lighthouse score > 90 (Performance, Accessibility)
- Mobile usability testing quarterly
- Cross-browser testing before releases

**Test Cases:**
```
TC-NFR-4.1.1: Mobile responsiveness
  Given: User on iPhone 12 (390px width)
  When: Loads landscape studio page
  Then: All elements visible and functional
  And: No horizontal scrolling required
  And: Buttons large enough to tap (min 44x44px)

TC-NFR-4.1.2: Accessibility - Keyboard navigation
  Given: User navigating with keyboard only
  When: Presses Tab key through interface
  Then: Focus indicator visible on all interactive elements
  And: All features accessible without mouse
  And: Screen reader announces element labels correctly
```

---

**Requirement ID:** NFR-4.2
**Category:** Error Handling
**Priority:** High

**Specification:**
- **User-Friendly Errors:** No technical jargon, clear next steps
- **Error Recovery:** Automatic retry for transient failures
- **Graceful Degradation:** App remains usable if non-critical features fail
- **Support Contact:** Easy access to help for persistent issues

**Measurement:**
- User satisfaction score > 4.0/5.0
- Support ticket deflection rate > 60%
- Error resolution time < 5 minutes

**Test Cases:**
```
TC-NFR-4.2.1: Insufficient tokens error message
  Given: User with balance=0
  When: Attempts to generate design
  Then: Modal appears with message:
    "Not Enough Tokens
    You need 1 token to generate a design.
    Your current balance: 0 tokens
    [Buy 10 Tokens] [Buy 50 Tokens]"
  And: Clear call-to-action buttons
  And: No technical error codes shown

TC-NFR-4.2.2: Network error retry
  Given: User submitting generation request
  When: Network timeout occurs (first attempt)
  Then: System automatically retries (up to 3 times)
  And: User shown: "Connecting... (attempt 2 of 3)"
  And: If all retries fail: "Network error. Please check connection."
```

---

### NFR-5: Maintainability

**Requirement ID:** NFR-5.1
**Category:** Code Quality
**Priority:** Medium

**Specification:**
- **Test Coverage:** 80%+ for backend services
- **Code Documentation:** All functions documented (docstrings)
- **Type Safety:** TypeScript strict mode (frontend), Pydantic models (backend)
- **Linting:** ESLint (frontend), Ruff (backend)

**Measurement:**
- Automated coverage reports in CI/CD
- Code review required for all PRs
- Documentation updated with code changes

---

**Requirement ID:** NFR-5.2
**Category:** Observability
**Priority:** High

**Specification:**
- **Logging:** Structured logs (JSON format) with correlation IDs
- **Metrics:** Real-time dashboards (Vercel + Supabase)
- **Tracing:** Request tracing across services
- **Alerting:** Automated alerts for anomalies

**Measurement:**
- Mean time to detection (MTTD) < 5 minutes
- Mean time to resolution (MTTR) < 30 minutes
- Weekly incident review meetings

---

## Dependencies

### External Dependencies

**Dependency 1: Google Gemini 2.5 Flash API**
- **Type:** Critical (core feature)
- **Provider:** Google AI
- **SLA:** 99.9% uptime (per Google's service terms)
- **Rate Limits:** 60 requests/minute per API key
- **Fallback:** Mock image generation if API unavailable
- **Monitoring:** Track API response times and error rates

**Dependency 2: Stripe Payment Processing**
- **Type:** Critical (monetization)
- **Provider:** Stripe
- **SLA:** 99.99% uptime
- **Rate Limits:** None for production API keys
- **Fallback:** Payment queue with retry logic
- **Monitoring:** Webhook delivery success rate

**Dependency 3: Vercel Blob Storage**
- **Type:** Critical (image storage)
- **Provider:** Vercel
- **SLA:** 99.9% uptime
- **Capacity:** Unlimited with CDN
- **Fallback:** None (core dependency)
- **Monitoring:** Upload success rate, CDN latency

**Dependency 4: Supabase PostgreSQL**
- **Type:** Critical (database)
- **Provider:** Supabase
- **SLA:** 99.9% uptime (Pro plan)
- **Capacity:** 8GB database size, 100 connections
- **Fallback:** Firestore read-only backup (30-day retention)
- **Monitoring:** Connection pool, query performance

**Dependency 5: Firebase Authentication**
- **Type:** Critical (user management)
- **Provider:** Google Firebase
- **SLA:** 99.95% uptime
- **Rate Limits:** 100 reqs/sec per project
- **Fallback:** None (core dependency)
- **Monitoring:** Token validation latency

---

### Internal Dependencies

**Dependency 6: Connection Pooling Library**
- **Library:** `psycopg2.SimpleConnectionPool`
- **Version:** 2.9.9
- **Criticality:** High
- **Purpose:** Efficient database connection management
- **Risk:** Connection leaks if not properly returned

**Dependency 7: Stripe Python SDK**
- **Library:** `stripe`
- **Version:** 7.0.0+
- **Criticality:** High
- **Purpose:** Payment processing integration
- **Risk:** Webhook signature verification failures on version mismatch

**Dependency 8: Pydantic Validation**
- **Library:** `pydantic`
- **Version:** 2.0+
- **Criticality:** Medium
- **Purpose:** Request/response validation
- **Risk:** Breaking changes between v1 and v2

---

## Technical Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                         CLIENT LAYER                         │
├─────────────────────────────────────────────────────────────┤
│  React + TypeScript + Vite                                   │
│  - LandscapeStudioEnhanced.tsx (main UI)                     │
│  - Zustand (state management)                                │
│  - Firebase Auth Context                                     │
│  - API Service (services/api.ts)                             │
└───────────────────┬─────────────────────────────────────────┘
                    │ HTTPS
                    │
┌───────────────────▼─────────────────────────────────────────┐
│                   RAILWAY BACKEND LAYER                      │
│                   (Python Flask + Gunicorn)                  │
├─────────────────────────────────────────────────────────────┤
│  API Endpoints (Flask Blueprints):                           │
│  - /api/v1/tokens (token operations)                         │
│  - /api/design/complete-landscape (generation)               │
│  - /api/subscription/webhook (Stripe webhooks)               │
│  - /api/user/usage (user stats)                              │
│  - /api/health (health check)                                │
│                                                               │
│  Core Services (backend/):                                   │
│  - token_service.py (token CRUD)                             │
│  - user_service.py (user CRUD)                               │
│  - gemini_client.py (AI generation)                          │
│  - auth.py (Supabase JWT validation)                         │
│  - storage.py (Vercel Blob integration)                      │
│                                                               │
│  Deployment: Railway (auto-deploy from GitHub)               │
│  URL: https://yarda-backend-production.up.railway.app        │
└───────────┬───────────────┬──────────────┬─────────────────┘
            │               │              │
            │               │              │
     ┌──────▼──────┐ ┌─────▼──────┐ ┌────▼─────────┐
     │  Supabase   │ │  Firebase  │ │   Stripe     │
     │ PostgreSQL  │ │    Auth    │ │   Payments   │
     ├─────────────┤ ├────────────┤ ├──────────────┤
     │ • users     │ │ • JWT      │ │ • Checkout   │
     │ • tokens    │ │ • Email    │ │ • Webhooks   │
     │ • subscript │ │   verify   │ │ • Portal     │
     └─────────────┘ └────────────┘ └──────────────┘
            │
            │
     ┌──────▼──────────┐
     │  Google Gemini  │
     │  2.5 Flash API  │
     ├─────────────────┤
     │ • Image Gen     │
     │ • Analysis      │
     │ • Text Output   │
     └─────────────────┘
            │
            │
     ┌──────▼───────────┐
     │  Vercel Blob     │
     │    Storage       │
     ├──────────────────┤
     │ • Image uploads  │
     │ • Generated imgs │
     │ • CDN delivery   │
     └──────────────────┘
```

---

## Page Navigation and Site Map

### Site Structure

```
Yarda AI Landscape Studio
│
├── 🏠 Home (/)
│   ├── Hero Section (unauthenticated users only)
│   ├── Landscape Studio Interface
│   ├── Feature Showcase (unauthenticated users only)
│   └── Footer
│
├── 🎨 Landscape Studio (/studio or /)
│   ├── Address Input
│   ├── Yard Area Selector (Front/Back/Walkway)
│   ├── Style Selector
│   ├── Custom Prompt Input
│   ├── Generate Button
│   ├── Progress Tracking
│   └── Results Display
│
├── 🖼️ Gallery (/gallery)
│   ├── All Designs Grid
│   ├── Filter by Style
│   ├── Filter by Date
│   ├── Filter by Area
│   ├── Search by Address
│   └── Individual Design Detail Modal
│
├── 💰 Pricing (/pricing)
│   ├── Trial Credits Info (3 free)
│   ├── Token Packages
│   │   ├── 10 tokens - $2
│   │   ├── 50 tokens - $10
│   │   ├── 100 tokens - $20
│   │   └── 200 tokens - $40
│   ├── Subscription Plans
│   │   ├── 7-Day Pass - $49
│   │   ├── Per-Property - $29
│   │   └── Monthly Pro - $99/month
│   └── Feature Comparison Table
│
├── 👤 Account (/account)
│   ├── Profile (/account/profile)
│   │   ├── Email & Password
│   │   ├── Email Verification Status
│   │   └── Account Created Date
│   │
│   ├── Tokens (/account/tokens)
│   │   ├── Token Balance Display
│   │   ├── Purchase Tokens Button
│   │   ├── Transaction History Tab
│   │   ├── Auto-Reload Settings Tab
│   │   └── Usage Statistics Tab
│   │
│   ├── Subscription (/account/subscription)
│   │   ├── Current Plan Status
│   │   ├── Next Billing Date
│   │   ├── Usage Statistics
│   │   ├── Manage Subscription (Stripe Portal)
│   │   └── Upgrade/Downgrade Options
│   │
│   └── Settings (/account/settings)
│       ├── Download Quality (Standard/High)
│       ├── Watermark Preference
│       ├── Email Notifications
│       └── Language Selection
│
├── ℹ️ About (/about)
│   ├── Product Overview
│   ├── How It Works
│   ├── Technology Stack
│   └── Team Information
│
├── 📧 Contact (/contact)
│   ├── Support Form
│   ├── FAQ Links
│   └── Live Chat Widget
│
├── 🔐 Authentication
│   ├── Sign In (/signin) - Modal + Page
│   ├── Sign Up (/signup) - Modal + Page
│   ├── Forgot Password (/forgot-password)
│   ├── Reset Password (/reset-password)
│   └── Email Verification (/verify-email)
│
└── 🛒 Checkout Flow
    ├── Token Checkout (Stripe hosted)
    ├── Subscription Checkout (Stripe hosted)
    ├── Success Page (/checkout/success)
    └── Cancel Page (/checkout/cancel)
```

---

### Navigation Bar Components

**Unauthenticated User Navbar:**
```
┌────────────────────────────────────────────────────────────┐
│ [Yarda Logo]  Studio  Gallery  Pricing  About  [Sign In]  │
└────────────────────────────────────────────────────────────┘
```

**Authenticated User Navbar:**
```
┌─────────────────────────────────────────────────────────────────────┐
│ [Logo] Studio Gallery [50 tokens 💎] [Trial: 2/3 🎁] [Avatar ▾]    │
│                                                                      │
│ Avatar Dropdown:                                                     │
│  • Account                                                           │
│  • Transaction History                                               │
│  • Settings                                                          │
│  • Sign Out                                                          │
└─────────────────────────────────────────────────────────────────────┘
```

**Mobile Navbar (Hamburger Menu):**
```
┌──────────────────────────────┐
│ [☰] [Yarda Logo] [50 tokens] │
└──────────────────────────────┘
  │
  └─ Expanded Menu:
     ├─ Studio
     ├─ Gallery
     ├─ Pricing
     ├─ Account
     ├─ Settings
     └─ Sign Out
```

---

### Page-by-Page Navigation Flow

#### 1. Home Page (/)

**Entry Points:**
- Direct URL: yarda.pro or yard-web-app.vercel.app
- Google search results
- Social media links
- Email campaigns

**Exit Points:**
- CTA buttons → /pricing (unauthenticated)
- Generate button → Generation flow (authenticated)
- Nav links → /gallery, /about, /contact
- Sign In button → /signin modal

**Key Actions:**
- Browse hero section (inspiration)
- Scroll to landscape studio interface
- Click "Get Started Free" → Sign up flow
- Enter address and start generation

---

#### 2. Landscape Studio Page (/studio)

**Entry Points:**
- Home page CTA
- Navbar "Studio" link
- Gallery "Create New" button
- Post-purchase redirect

**Exit Points:**
- Results saved → /gallery
- Token purchase → Stripe checkout
- Subscription upgrade → /pricing
- Account settings → /account

**Navigation Flow:**
```
[Address Input]
    ↓
[Area Selection: Front/Back/Walkway]
    ↓
[Style Selection: Modern/California/Zen]
    ↓
[Custom Prompt (optional)]
    ↓
[Generate Button]
    ↓
[Progress Tracking 0-100%]
    ↓
[Results Display]
    ↓
[Download | Save to Gallery | Generate More]
```

**Breadcrumb:**
`Home > Studio`

---

#### 3. Gallery Page (/gallery)

**Entry Points:**
- Navbar "Gallery" link
- Post-generation "Save to Gallery"
- Account page "View Designs"

**Exit Points:**
- Design detail → Image viewer modal
- Create new → /studio
- Download → File system
- Share → Social media

**Navigation Flow:**
```
[Filter Bar: Style | Date | Area | Search]
    ↓
[Grid of Designs (3 columns desktop, 1 mobile)]
    ↓
[Click Design] → [Detail Modal]
    ↓
    ├─ Download Image
    ├─ Delete Design
    ├─ Regenerate Similar
    └─ Close Modal
```

**Breadcrumb:**
`Home > Gallery`

---

#### 4. Pricing Page (/pricing)

**Entry Points:**
- Navbar "Pricing" link
- Trial exhausted modal
- Low token balance warning
- Account upgrade CTA

**Exit Points:**
- Token purchase → Stripe checkout → /studio
- Subscription purchase → Stripe checkout → /account
- Feature comparison → /about
- Questions → /contact

**Navigation Flow:**
```
[Hero: "Choose Your Plan"]
    ↓
[Token Packages Section]
    ├─ 10 tokens ($2) [Buy Now]
    ├─ 50 tokens ($10) [Buy Now] ← POPULAR
    ├─ 100 tokens ($20) [Buy Now]
    └─ 200 tokens ($40) [Buy Now]
    ↓
[Subscription Plans Section]
    ├─ 7-Day Pass ($49) [Subscribe]
    ├─ Per-Property ($29) [Subscribe]
    └─ Monthly Pro ($99/month) [Subscribe] ← BEST VALUE
    ↓
[Feature Comparison Table]
    ↓
[FAQ Section]
    ↓
[Contact Support]
```

**Breadcrumb:**
`Home > Pricing`

---

#### 5. Account Page (/account)

**Entry Points:**
- Navbar avatar dropdown
- Post-purchase redirect
- Token balance click
- Settings icon

**Exit Points:**
- Manage subscription → Stripe portal
- Purchase tokens → /pricing
- Transaction export → File download
- Sign out → /signin

**Tab Navigation:**
```
┌─────────────────────────────────────────────────┐
│ [Profile] [Tokens] [Subscription] [Settings]    │
└─────────────────────────────────────────────────┘
```

**Token Tab Flow:**
```
[Token Balance: 50 tokens]
    ↓
[Purchase More] → /pricing
    ↓
[Transaction History]
    ├─ Filter: All | Purchase | Deduction | Refund
    ├─ Date range picker
    └─ Export CSV
    ↓
[Auto-Reload Settings]
    ├─ Enable toggle
    ├─ Threshold slider (10-100)
    ├─ Reload amount dropdown
    └─ Save button
    ↓
[Usage Statistics]
    ├─ This week: 23 tokens used
    ├─ This month: 87 tokens used
    └─ Lifetime: 234 tokens used
```

**Breadcrumb:**
`Home > Account > Tokens`

---

## Detailed User Flows

### User Flow 1: First-Time Visitor → Trial User

```
START: User lands on yarda.pro
    ↓
┌───────────────────────────────────────┐
│ Hero Section                          │
│ "Transform Your Yard with AI"        │
│                                       │
│ [Get Started Free - 3 Trials] ←──────┼─── PRIMARY CTA
└───────────────────────────────────────┘
    ↓
    User clicks "Get Started Free"
    ↓
┌───────────────────────────────────────┐
│ Sign Up Modal (overlay)               │
│ ┌───────────────────────────────┐    │
│ │ Email: [____________]          │    │
│ │ Password: [____________]       │    │
│ │                                │    │
│ │ [Sign Up with Email]           │    │
│ │                                │    │
│ │ ─── OR ───                     │    │
│ │                                │    │
│ │ [Continue with Google]         │    │
│ └───────────────────────────────┘    │
└───────────────────────────────────────┘
    ↓
    Account created, email verification sent
    ↓
┌───────────────────────────────────────┐
│ Success Toast Notification            │
│ "✅ Account created! 3 free trials    │
│     available. Check email to verify."│
└───────────────────────────────────────┘
    ↓
    Redirect to /studio (landscape studio page)
    ↓
┌───────────────────────────────────────┐
│ Trial Badge (top of page)             │
│ ┌───────────────────────────────┐    │
│ │ 🎁 3 Free Trials Remaining    │    │
│ │ Try different styles risk-free│    │
│ └───────────────────────────────┘    │
└───────────────────────────────────────┘
    ↓
┌───────────────────────────────────────┐
│ Landscape Studio Interface            │
│                                       │
│ Step 1: Enter Address                 │
│ [123 Oak Street, San Jose, CA___]    │
│                                       │
│ Step 2: Select Areas                  │
│ [✓ Front Yard] [ ] Backyard          │
│                                       │
│ Step 3: Choose Style                  │
│ [Modern] [California] [Zen]          │
│                                       │
│ [Generate Design]                     │
└───────────────────────────────────────┘
    ↓
    User clicks "Generate Design"
    ↓
┌───────────────────────────────────────┐
│ Progress Bar Animation                │
│ ████████████░░░░░░░░░ 60%            │
│ "Analyzing property features..."      │
└───────────────────────────────────────┘
    ↓
    45-60 seconds later
    ↓
┌───────────────────────────────────────┐
│ Results Display                       │
│ ┌─────────────────────────────────┐  │
│ │  [Generated Design Image]       │  │
│ │  Modern Front Yard Design       │  │
│ └─────────────────────────────────┘  │
│                                       │
│ [Download] [Save to Gallery]         │
│ [Generate Another]                    │
│                                       │
│ Trial Counter: 2/3 remaining          │
└───────────────────────────────────────┘
    ↓
    User tries 2 more times (trials exhausted)
    ↓
┌───────────────────────────────────────┐
│ Trial Exhausted Modal                 │
│ ┌───────────────────────────────┐    │
│ │ 🎉 You've Used All 3 Trials!  │    │
│ │                                │    │
│ │ Ready for unlimited access?    │    │
│ │                                │    │
│ │ Token Packages:                │    │
│ │ • 10 tokens - $2               │    │
│ │ • 50 tokens - $10 ← POPULAR    │    │
│ │ • 100 tokens - $20             │    │
│ │                                │    │
│ │ [View All Pricing]             │    │
│ └───────────────────────────────┘    │
└───────────────────────────────────────┘
    ↓
END: User converts to paying customer
```

---

### User Flow 2: Token Purchase Journey

```
START: User has 0 tokens, wants to generate
    ↓
┌───────────────────────────────────────┐
│ Insufficient Tokens Modal             │
│ ┌───────────────────────────────┐    │
│ │ ⚠️ Not Enough Tokens           │    │
│ │                                │    │
│ │ Current balance: 0 tokens      │    │
│ │ Need: 1 token per design       │    │
│ │                                │    │
│ │ [Buy 10 - $2]                  │    │
│ │ [Buy 50 - $10] ← POPULAR       │    │
│ │ [Buy 100 - $20]                │    │
│ │                                │    │
│ │ Or subscribe for unlimited     │    │
│ │ [View Subscriptions]           │    │
│ └───────────────────────────────┘    │
└───────────────────────────────────────┘
    ↓
    User clicks "Buy 50 - $10"
    ↓
    Redirect to Stripe Checkout (hosted page)
    ↓
┌───────────────────────────────────────┐
│ Stripe Checkout Page                  │
│ ┌───────────────────────────────┐    │
│ │ Yarda AI - 50 Tokens           │    │
│ │ $10.00                         │    │
│ │                                │    │
│ │ Card Number:                   │    │
│ │ [________________]             │    │
│ │                                │    │
│ │ Expiry:        CVC:            │    │
│ │ [MM/YY]        [___]           │    │
│ │                                │    │
│ │ [Pay $10.00]                   │    │
│ └───────────────────────────────┘    │
└───────────────────────────────────────┘
    ↓
    User enters card details and submits
    ↓
    Payment processing (2-5 seconds)
    ↓
┌───────────────────────────────────────┐
│ Stripe: Payment Successful            │
│ Redirecting to Yarda...               │
└───────────────────────────────────────┘
    ↓
    Webhook received, tokens credited
    ↓
    Redirect to /studio?purchase=success
    ↓
┌───────────────────────────────────────┐
│ Success Toast Notification            │
│ "✅ 50 tokens added to your account!" │
│                                       │
│ Token Badge Updates:                  │
│ [50 tokens 💎] ← Animated counter     │
└───────────────────────────────────────┘
    ↓
┌───────────────────────────────────────┐
│ Landscape Studio (Ready)              │
│ [Generate Design] ← Now Enabled       │
└───────────────────────────────────────┘
    ↓
END: User continues generating designs
```

---

### User Flow 3: Subscription Management

```
START: User on /account/subscription page
    ↓
┌───────────────────────────────────────┐
│ Current Subscription Status           │
│ ┌───────────────────────────────┐    │
│ │ Monthly Pro                    │    │
│ │ $99/month                      │    │
│ │                                │    │
│ │ Status: Active ✓               │    │
│ │ Next billing: Nov 15, 2025     │    │
│ │                                │    │
│ │ This Month:                    │    │
│ │ • 87 designs generated         │    │
│ │ • Unlimited remaining          │    │
│ │                                │    │
│ │ [Manage Subscription]          │    │
│ └───────────────────────────────┘    │
└───────────────────────────────────────┘
    ↓
    User clicks "Manage Subscription"
    ↓
    Redirect to Stripe Customer Portal
    ↓
┌───────────────────────────────────────┐
│ Stripe Customer Portal                │
│ ┌───────────────────────────────┐    │
│ │ Subscriptions                  │    │
│ │                                │    │
│ │ Yarda Monthly Pro              │    │
│ │ $99.00 / month                 │    │
│ │ Renews: Nov 15, 2025           │    │
│ │                                │    │
│ │ [Cancel Subscription]          │    │
│ │ [Update Payment Method]        │    │
│ │                                │    │
│ │ Billing History:               │    │
│ │ Oct 15 - $99.00 Paid           │    │
│ │ Sep 15 - $99.00 Paid           │    │
│ └───────────────────────────────┘    │
└───────────────────────────────────────┘
    ↓
    User clicks "Cancel Subscription"
    ↓
┌───────────────────────────────────────┐
│ Cancellation Confirmation             │
│ ┌───────────────────────────────┐    │
│ │ ⚠️ Cancel Monthly Pro?         │    │
│ │                                │    │
│ │ You'll have access until:      │    │
│ │ November 15, 2025              │    │
│ │                                │    │
│ │ After that:                    │    │
│ │ • Revert to token system       │    │
│ │ • Your 30 tokens preserved     │    │
│ │                                │    │
│ │ [Keep Subscription]            │    │
│ │ [Confirm Cancellation]         │    │
│ └───────────────────────────────┘    │
└───────────────────────────────────────┘
    ↓
    User clicks "Confirm Cancellation"
    ↓
    Webhook updates database
    ↓
    Redirect to /account/subscription
    ↓
┌───────────────────────────────────────┐
│ Cancellation Confirmed                │
│ ┌───────────────────────────────┐    │
│ │ ℹ️ Subscription Ending          │    │
│ │                                │    │
│ │ Access until: Nov 15, 2025     │    │
│ │ Remaining: 30 days             │    │
│ │                                │    │
│ │ After Nov 15:                  │    │
│ │ • Token system resumes         │    │
│ │ • Current balance: 30 tokens   │    │
│ │                                │    │
│ │ [Reactivate Subscription]      │    │
│ └───────────────────────────────┘    │
└───────────────────────────────────────┘
    ↓
END: User continues with limited access
```

---

## Design System Specification

> **📌 Implementation Reference**: This section contains the exact CSS/Tailwind configuration from the production application. Use this to maintain consistent look and feel across all implementations.

### DS-1: Color Palette

**Professional Landscape Theme** - Earth tones inspired by natural landscapes

**Sage Green** (Primary Brand Color):
```css
sage-50:  #f6f7f4  /* Lightest - Backgrounds */
sage-100: #e9ede3  /* Very light - Subtle backgrounds */
sage-200: #d4ddc8  /* Light - Borders, dividers */
sage-300: #b7c5a1  /* Medium-light - Disabled states */
sage-400: #98a97a  /* Medium - Secondary text */
sage-500: #7e905e  /* Base - Primary actions */
sage-600: #627148  /* Dark - Primary hover */
sage-700: #4e593a  /* Darker - Active states */
sage-800: #424a32  /* Very dark - Headers, emphasis */
sage-900: #393f2d  /* Darkest - High contrast text */
```

**Earth Brown** (Secondary/Accent Color):
```css
earth-50:  #f9f7f1  /* Lightest - Warm backgrounds */
earth-100: #f0ebd9  /* Very light - Cards, panels */
earth-200: #e1d5b3  /* Light - Borders */
earth-300: #ceb887  /* Medium-light - Highlights */
earth-400: #bb9d5f  /* Medium - Accents */
earth-500: #a68648  /* Base - Secondary actions */
earth-600: #8e6d3c  /* Dark - Hover states */
earth-700: #745633  /* Darker - Active */
earth-800: #614830  /* Very dark */
earth-900: #533e2d  /* Darkest */
```

**Moss Green** (Tertiary/Nature Accent):
```css
moss-50:  #f3f6f1  /* Lightest */
moss-100: #e3eadd  /* Very light */
moss-200: #c8d5bd  /* Light */
moss-300: #a4b994  /* Medium-light */
moss-400: #809a6d  /* Medium */
moss-500: #647e50  /* Base */
moss-600: #4e643e  /* Dark */
moss-700: #405033  /* Darker */
moss-800: #35412c  /* Very dark */
moss-900: #2d3726  /* Darkest */
```

**System Colors** (Semantic):
```css
White:       #ffffff
Black:       #000000
Body BG:     #ffffff (white)
Body Text:   sage-800 (#424a32)
```

---

### DS-2: Typography

**Font Family**:
```css
font-display: 'Inter', system-ui, sans-serif
font-body:    'Inter', system-ui, sans-serif
```

**Font Sizes** (Tailwind Default Scale):
- `text-xs`: 0.75rem (12px)
- `text-sm`: 0.875rem (14px)
- `text-base`: 1rem (16px)
- `text-lg`: 1.125rem (18px)
- `text-xl`: 1.25rem (20px)
- `text-2xl`: 1.5rem (24px)
- `text-3xl`: 1.875rem (30px)
- `text-4xl`: 2.25rem (36px)

**Font Weights**:
- `font-normal`: 400
- `font-medium`: 500
- `font-semibold`: 600
- `font-bold`: 700

---

### DS-3: Component Styles

**Button Components** (Tailwind `@layer components`):

```css
/* Base Button */
.btn {
  @apply inline-flex items-center justify-center rounded-lg px-4 py-2 text-sm font-medium;
  @apply transition-colors focus-visible:outline-none focus-visible:ring-2;
  @apply focus-visible:ring-sage-500 focus-visible:ring-offset-2;
  @apply disabled:opacity-50 disabled:pointer-events-none;
}

/* Primary Button (Main Actions) */
.btn-primary {
  @apply bg-sage-600 text-white hover:bg-sage-700 active:bg-sage-800;
}

/* Secondary Button (Alternative Actions) */
.btn-secondary {
  @apply bg-earth-100 text-earth-800 hover:bg-earth-200 active:bg-earth-300;
}

/* Outline Button (Tertiary Actions) */
.btn-outline {
  @apply border border-sage-300 text-sage-700 hover:bg-sage-50 active:bg-sage-100;
}
```

**Card Component**:
```css
.card {
  @apply bg-white rounded-xl shadow-lg border border-sage-100 p-6;
}
```

**Input Component**:
```css
.input {
  @apply w-full px-3 py-2 border border-sage-300 rounded-lg;
  @apply focus:outline-none focus:ring-2 focus:ring-sage-500 focus:border-sage-500;
  @apply transition-colors;
}
```

**Gradient Text Effect**:
```css
.gradient-text {
  @apply bg-gradient-to-r from-sage-600 to-moss-600 bg-clip-text text-transparent;
}
```

**Glass Effect** (Frosted Glass/Glassmorphism):
```css
.glass-effect {
  @apply backdrop-blur-sm bg-white/80 border border-white/20;
}
```

**Floating Card** (Hover Elevation):
```css
.floating-card {
  @apply transform transition-all duration-300 hover:scale-105 hover:shadow-xl;
}
```

---

### DS-4: Animations

**Keyframe Animations**:
```css
/* Fade In */
@keyframes fadeIn {
  0%   { opacity: 0; }
  100% { opacity: 1; }
}
.animate-fade-in { animation: fadeIn 0.5s ease-in-out; }

/* Slide Up */
@keyframes slideUp {
  0%   { transform: translateY(20px); opacity: 0; }
  100% { transform: translateY(0); opacity: 1; }
}
.animate-slide-up { animation: slideUp 0.5s ease-out; }

/* Shimmer (Loading Effect) */
@keyframes shimmer {
  0%, 100% { opacity: 0.5; }
  50%      { opacity: 1; }
}
.animate-shimmer { animation: shimmer 2s ease-in-out infinite; }

/* Pulse Slow */
.animate-pulse-slow { animation: pulse 3s infinite; }
```

**Shimmer Effect Component**:
```css
.shimmer-effect {
  @apply relative overflow-hidden;
}

.shimmer-effect::before {
  content: '';
  @apply absolute inset-0 -translate-x-full;
  @apply bg-gradient-to-r from-transparent via-white/20 to-transparent;
  @apply animate-[shimmer_2s_infinite];
}
```

**Animation Delays** (Staggered Animations):
```css
.animation-delay-200 { animation-delay: 200ms; }
.animation-delay-400 { animation-delay: 400ms; }
.animation-delay-600 { animation-delay: 600ms; }
```

---

### DS-5: Loading States

**Skeleton Loader**:
```css
.loading-skeleton {
  @apply animate-pulse bg-sage-200 rounded;
}
```

**Comparison Container** (Before/After Slider):
```css
.comparison-container {
  @apply relative overflow-hidden rounded-xl shadow-2xl;
}
```

---

### DS-6: Background Gradients

**Landscape Hero Gradient** (Header/Hero Sections):
```css
.bg-landscape-hero {
  background: linear-gradient(135deg, #f6f7f4 0%, #e9ede3 50%, #d4ddc8 100%);
}
```

**Radial Gradient** (Utility):
```css
.bg-gradient-radial {
  background-image: radial-gradient(var(--tw-gradient-stops));
}
```

---

### DS-7: Custom Scrollbar

**Webkit Scrollbar Styling**:
```css
::-webkit-scrollbar {
  width: 8px;
}

::-webkit-scrollbar-track {
  @apply bg-sage-50;
}

::-webkit-scrollbar-thumb {
  @apply bg-sage-300 rounded-full;
}

::-webkit-scrollbar-thumb:hover {
  @apply bg-sage-400;
}
```

---

### DS-8: Accessibility Utilities

**Focus Ring**:
```css
.focus-ring {
  @apply focus:outline-none focus:ring-2 focus:ring-sage-500 focus:ring-offset-2;
}
```

**Global Accessibility**:
```css
/* Smooth scrolling for anchors */
html {
  scroll-behavior: smooth;
}

/* Focus-visible support (keyboard navigation only) */
.focus-visible:outline-none

:focus-visible {
  @apply ring-2 ring-sage-500 ring-offset-2;
}
```

---

### DS-9: Text Utilities

**Text Wrapping** (Modern CSS):
```css
.text-balance {
  text-wrap: balance;  /* Balanced multi-line text */
}

.text-pretty {
  text-wrap: pretty;   /* Prevents orphans */
}
```

---

### DS-10: Implementation Notes

**Tailwind Configuration** (`tailwind.config.js`):

```javascript
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        sage: { /* ...colors above */ },
        earth: { /* ...colors above */ },
        moss: { /* ...colors above */ }
      },
      fontFamily: {
        'display': ['Inter', 'system-ui', 'sans-serif'],
        'body': ['Inter', 'system-ui', 'sans-serif'],
      },
      animation: {
        'fade-in': 'fadeIn 0.5s ease-in-out',
        'slide-up': 'slideUp 0.5s ease-out',
        'pulse-slow': 'pulse 3s infinite',
        'shimmer': 'shimmer 2s ease-in-out infinite',
      },
      keyframes: { /* ...keyframes above */ },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'landscape-hero': 'linear-gradient(135deg, #f6f7f4 0%, #e9ede3 50%, #d4ddc8 100%)',
      }
    },
  },
  plugins: [],
}
```

**Global CSS** (`src/index.css`):

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  * {
    @apply border-sage-200;  /* Default border color */
  }
  body {
    @apply bg-white text-sage-800 font-body;
  }
  html {
    scroll-behavior: smooth;
  }
}

/* Component and utility layers defined above */
```

---

## UX Requirements

### UX-R1: Design Principles

**Principle 1: Simplicity First**
- **Definition:** Interface should be intuitive for non-technical users
- **Requirements:**
  - Maximum 3 steps to generate first design
  - Clear visual hierarchy (primary actions prominent)
  - Minimal cognitive load (one decision at a time)
  - Progressive disclosure (advanced options hidden by default)

**Example:**
```
❌ BAD:
[Generate] button shows 10 options when clicked:
  Style, Resolution, Aspect Ratio, Temperature, Top-P, etc.

✅ GOOD:
[Generate] button has sensible defaults, works immediately
[Advanced Options ▾] reveals optional tweaks
```

---

**Principle 2: Immediate Feedback**
- **Definition:** Every user action receives instant visual response
- **Requirements:**
  - Button states change on click (<50ms)
  - Loading indicators for operations >200ms
  - Success/error toast notifications
  - Real-time balance updates

**Example:**
```
User clicks "Generate":
  ↓
  Button: "Generate" → "Generating..." (disabled, spinner)
  ↓
  Progress bar appears: 0% → 100%
  ↓
  Success toast: "✅ Design complete!"
  ↓
  Button: "Generating..." → "Generate Another" (enabled)
```

---

**Principle 3: Forgiveness and Recovery**
- **Definition:** Users can undo mistakes and recover from errors
- **Requirements:**
  - Confirmation dialogs for destructive actions
  - Automatic recovery from network failures
  - Token refunds for failed generations
  - Draft saving (address, prompts persist)

**Example:**
```
User accidentally refreshes page during generation:
  ↓
  System detects active request_id in localStorage
  ↓
  Page loads, shows: "Resuming generation in progress..."
  ↓
  Progress polling resumes from current state
  ↓
  User doesn't lose work or tokens
```

---

**Principle 4: Transparency**
- **Definition:** Users always understand what's happening and why
- **Requirements:**
  - Clear pricing (no hidden fees)
  - Visible token/trial counters
  - Progress indicators with descriptive text
  - Complete transaction history

**Example:**
```
Token Balance Display:
┌─────────────────────────────┐
│ 50 tokens 💎                │
│ $0.20 per design            │
│ ~50 designs remaining       │
│ [View History]              │
└─────────────────────────────┘
```

---

### UX-R2: Interaction Patterns

**Pattern 1: Primary Action Button**

**Visual Design:**
- Background: Gradient blue-to-purple (`from-blue-600 to-indigo-600`)
- Text: White, bold, 16-18px
- Padding: 24px vertical, 32px horizontal (spacious)
- Border radius: 12px (rounded)
- Shadow: Large shadow on hover
- Animation: Scale 1.05 + translateY(-2px) on hover

**States:**
```
Default:     [Generate Design]
Hover:       [Generate Design] ← Slightly elevated, shadow grows
Active:      [Generate Design] ← Pressed down slightly
Disabled:    [Generate Design] ← Gray, no hover effect
Loading:     [⏳ Generating...] ← Spinner, disabled
Success:     [✓ Generated!]    ← Brief success state (2s)
```

**Usage:**
- Generate button (landscape studio)
- Purchase buttons (pricing page)
- Subscribe buttons (subscription checkout)

---

**Pattern 2: Token Badge (Navbar)**

**Visual Design:**
- Background: White with subtle border
- Text: Dark gray, semibold
- Icon: 💎 diamond emoji
- Animation: Bounce + number count-up when updated
- Position: Right side of navbar, before avatar

**States:**
```
Sufficient:  [50 tokens 💎]     ← Normal state
Low (<10):   [3 tokens 💎]      ← Warning orange background
Zero:        [0 tokens 💎]      ← Error red background, pulse animation
Loading:     [... tokens 💎]    ← Skeleton loader
```

**Interactions:**
- Click → Navigate to /account/tokens
- Hover → Tooltip: "Click to manage tokens"
- Updates in real-time via polling or WebSocket

---

**Pattern 3: Progress Tracking**

**Visual Design:**
- Bar: Full-width, 8px height, rounded ends
- Color: Blue gradient fill
- Background: Light gray
- Text: Below bar, descriptive status

**Stages:**
```
 0-20%:  "Validating address..."          ███░░░░░░░░░░░░░░░░
20-40%:  "Analyzing property features..."  ████████░░░░░░░░░░░
40-60%:  "Generating design..."            ████████████░░░░░░░
60-80%:  "Refining details..."             ████████████████░░░
80-100%: "Finalizing image..."             ███████████████████
  100%:  "Complete!"                        ████████████████████
```

**Animation:**
- Smooth transition (0.3s ease)
- Pulse effect on active segment
- Success checkmark appears on 100%

---

**Pattern 4: Modal Dialogs**

**Structure:**
```
┌─────────────────────────────────────┐
│ [X] Close Button (top-right)        │
│                                     │
│ [Icon] Header Text                  │
│                                     │
│ Body text explaining the situation  │
│ and what action is needed.          │
│                                     │
│ [Secondary Action] [Primary Action] │
└─────────────────────────────────────┘
```

**Types:**

**Confirmation Modal:**
- Header: ⚠️ Warning icon + "Confirm Action"
- Body: Explanation of consequences
- Actions: [Cancel] [Confirm]

**Information Modal:**
- Header: ℹ️ Info icon + "Title"
- Body: Details or instructions
- Actions: [Close]

**Purchase Modal:**
- Header: 💰 "Choose Token Package"
- Body: Package options with pricing
- Actions: [Cancel] [Buy Now]

**Behavior:**
- Overlay dims background (40% opacity)
- Click outside → Close (unless critical action)
- Escape key → Close
- Focus trap (tab cycles within modal)
- Smooth fade-in animation (200ms)

---

**Pattern 5: Toast Notifications**

**Visual Design:**
- Position: Top-center (desktop), top-full-width (mobile)
- Background: White with colored left border
- Shadow: Large shadow for prominence
- Icon: Status-based (✅ ❌ ⚠️ ℹ️)
- Duration: 3-5 seconds (auto-dismiss)
- Animation: Slide down from top

**Types:**
```
Success: ✅ [Green border] "50 tokens added to your account!"
Error:   ❌ [Red border]   "Generation failed. Token refunded."
Warning: ⚠️ [Orange border] "Low token balance (3 remaining)"
Info:    ℹ️ [Blue border]  "Auto-reload enabled successfully"
```

**Stacking:**
- Multiple toasts stack vertically
- Newest on top
- Max 3 visible at once
- Older toasts dismissed automatically

---

### UX-R3: Responsive Design Requirements

**Breakpoints:**
```
Mobile Small:  320px - 479px
Mobile Large:  480px - 767px
Tablet:        768px - 1023px
Desktop:       1024px - 1439px
Desktop Large: 1440px+
```

**Mobile-Specific Adaptations:**

**Navigation:**
- Hamburger menu replaces horizontal nav
- Full-screen menu overlay
- Large touch targets (min 44x44px)
- Token badge remains visible

**Landscape Studio:**
- Single-column layout
- Full-width address input
- Area cards stack vertically
- Style selector: 1 card per row (scroll)
- Generate button: Fixed at bottom

**Gallery:**
- 1-column grid (mobile small)
- 2-column grid (mobile large/tablet)
- 3-column grid (desktop)
- Infinite scroll (not pagination)

**Account Pages:**
- Tab navigation: Horizontal scroll
- Transaction history: Vertical list
- Auto-reload settings: Stacked controls

---

### UX-R4: Accessibility Requirements (WCAG 2.1 Level AA)

**Keyboard Navigation:**
- All interactive elements accessible via Tab
- Focus indicator visible (2px blue outline)
- Tab order follows visual hierarchy
- Enter/Space activates buttons
- Escape closes modals

**Screen Reader Support:**
- ARIA labels on all interactive elements
- ARIA live regions for dynamic content
- Alt text on all images
- Semantic HTML (header, nav, main, footer)

**Color Contrast:**
- Text: 4.5:1 contrast ratio minimum
- UI components: 3:1 contrast ratio
- No color-only information
- Error states include icons + text

**Example:**
```
❌ BAD: Error shown only with red background
✅ GOOD: Error shown with red background + ❌ icon + text description
```

**Focus Management:**
- Modal opens → Focus moves to first interactive element
- Modal closes → Focus returns to trigger button
- Form submitted → Focus moves to result message
- Page navigation → Focus moves to main content

---

### UX-R5: Performance UX

**Perceived Performance:**

**Strategy 1: Optimistic UI**
- Show success state immediately
- Update in background
- Roll back only if operation fails

**Example:**
```
User clicks "Save to Gallery":
  ↓
  Immediately show ✅ "Saved!" toast
  ↓
  Add design to gallery view instantly
  ↓
  Send API request in background
  ↓
  If API fails: Remove from gallery, show error toast
```

**Strategy 2: Skeleton Loading**
- Show layout structure while loading
- Pulse animation on skeleton elements
- Replace with actual content when ready

**Example:**
```
Gallery Loading:
┌─────────┐ ┌─────────┐ ┌─────────┐
│░░░░░░░░░│ │░░░░░░░░░│ │░░░░░░░░░│  ← Pulsing rectangles
│░░░░░░░░░│ │░░░░░░░░░│ │░░░░░░░░░│
└─────────┘ └─────────┘ └─────────┘
    ↓ (loads)
┌─────────┐ ┌─────────┐ ┌─────────┐
│ [Image] │ │ [Image] │ │ [Image] │  ← Actual designs
│  Modern │ │   Zen   │ │   Cali  │
└─────────┘ └─────────┘ └─────────┘
```

**Strategy 3: Progressive Loading**
- Load critical content first
- Defer below-the-fold content
- Lazy load images on scroll

**Example:**
```
Page Load Priority:
  1. Navbar (critical)
  2. Token balance (critical)
  3. Studio interface (above fold)
  4. Hero section (authenticated users skip)
  5. Feature showcase (below fold, lazy)
  6. Footer (lowest priority)
```

**Strategy 4: Local Caching**
- Cache style list in localStorage (24h TTL)
- Cache user preferences
- Restore form state on page reload
- Service worker caches static assets

---

### UX-R6: Error Prevention and Recovery

**Prevention Strategies:**

**1. Input Validation (Real-Time)**
```
Address Input:
  Type: "123"
    ↓ (no error yet, wait for pause)
  Type: "123 Oak St"
    ↓ (valid format)
  Shows: ✓ "Valid address format"
```

**2. Destructive Action Confirmation**
```
User clicks "Delete Design":
  ↓
  Modal: "⚠️ Delete this design? This cannot be undone."
  ↓
  User must explicitly click "Delete" to proceed
```

**3. Unsaved Changes Warning**
```
User enters custom prompt, navigates away:
  ↓
  Alert: "You have unsaved changes. Leave page?"
  ↓
  [Cancel] [Leave Anyway]
```

**Recovery Strategies:**

**1. Automatic Retry**
- Network errors: Retry up to 3 times
- Rate limits: Exponential backoff
- Server errors (5xx): Retry after 5 seconds

**2. Manual Retry**
- Show error message with [Retry] button
- Preserve user input (don't force re-entry)
- Track retry count (limit to prevent loops)

**3. Graceful Degradation**
```
Gemini API unavailable:
  ↓
  Show error: "AI service temporarily unavailable"
  ↓
  Offer alternatives:
    • Try again later
    • View gallery for inspiration
    • Contact support
```

---

### UX-R7: Micro-Interactions

**Button Hover Effects:**
```css
/* Default state */
background: linear-gradient(to-r, blue-600, indigo-600);
transform: scale(1);
box-shadow: 0 4px 6px rgba(0,0,0,0.1);

/* Hover state */
background: linear-gradient(to-r, blue-700, indigo-700);
transform: scale(1.05) translateY(-2px);
box-shadow: 0 8px 16px rgba(0,0,0,0.2);

/* Transition */
transition: all 0.2s ease-in-out;
```

**Token Counter Animation:**
- Number count-up effect (e.g., 25 → 50 over 0.5s)
- Bounce animation on update
- Glow effect for +tokens
- Shake effect for -tokens

**Toggle Switches:**
```
OFF → ON:
  ├─ Background: gray → green
  ├─ Handle slides left → right
  ├─ Icon: ✗ → ✓
  └─ Duration: 0.3s ease
```

**Loading States:**
- Spinner: Smooth rotation (1s loop)
- Progress bar: Linear gradient shimmer
- Skeleton: Pulse opacity 0.4 → 0.6 → 0.4
- Dots: "⋯" → "•⋯⋯" → "⋯•⋯" → "⋯⋯•" (wave)

---

### UX-R8: Empty States

**Gallery Empty State:**
```
┌─────────────────────────────────────┐
│         [Large Icon: 🖼️]            │
│                                     │
│      No Designs Yet                 │
│                                     │
│  Your generated designs will        │
│  appear here. Start creating!       │
│                                     │
│    [Generate Your First Design]     │
└─────────────────────────────────────┘
```

**Transaction History Empty:**
```
┌─────────────────────────────────────┐
│         [Large Icon: 💳]            │
│                                     │
│   No Transactions Yet               │
│                                     │
│  Purchase tokens to get started.    │
│  All activity will be tracked here. │
│                                     │
│       [Buy Tokens]                  │
└─────────────────────────────────────┘
```

**Search Results Empty:**
```
┌─────────────────────────────────────┐
│         [Large Icon: 🔍]            │
│                                     │
│   No Results Found                  │
│                                     │
│  Try different search terms or      │
│  check your spelling.               │
│                                     │
│  Searched for: "modernn"            │
│  Did you mean: "modern"?            │
│                                     │
│       [Clear Search]                │
└─────────────────────────────────────┘
```

---

## CI/CD Requirements

### Overview

The Yarda AI Landscape Studio employs a fully automated CI/CD pipeline that enables rapid iteration within 6-day development cycles. The pipeline supports multiple environments (development, preview, UAT, production) with automated testing, deployment, and rollback capabilities.

### CI/CD-R1: Pipeline Architecture

**Requirement ID:** CI/CD-R1.1
**Category:** Pipeline Structure
**Priority:** Critical

**Architecture Diagram:**
```
┌─────────────────────────────────────────────────────────────────┐
│                     DEVELOPER WORKFLOW                           │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│                   GIT REPOSITORY (GitHub)                        │
│  • Feature Branches: feature/*                                   │
│  • Main Branch: master                                           │
│  • Release Tags: v1.0.0, v1.1.0                                  │
└─────────────────────────────────────────────────────────────────┘
                              ↓
                    ┌─────────┴─────────┐
                    │                   │
        ┌───────────▼──────────┐   ┌───▼────────────────────┐
        │  PULL REQUEST        │   │  PUSH TO MASTER        │
        │  WORKFLOW            │   │  WORKFLOW              │
        └──────────────────────┘   └────────────────────────┘
                    │                        │
        ┌───────────▼──────────┐   ┌────────▼──────────────┐
        │  CI CHECKS           │   │  CI CHECKS            │
        │  • Lint              │   │  • Lint               │
        │  • Type Check        │   │  • Type Check         │
        │  • Unit Tests        │   │  • Unit Tests         │
        │  • Build             │   │  • Integration Tests  │
        │  • Security Scan     │   │  • Build              │
        └──────────────────────┘   └───────────────────────┘
                    │                        │
        ┌───────────▼──────────┐   ┌────────▼──────────────┐
        │  PREVIEW DEPLOY      │   │  PRODUCTION DEPLOY    │
        │  (Vercel)            │   │  (Vercel)             │
        └──────────────────────┘   └───────────────────────┘
                    │                        │
        ┌───────────▼──────────┐   ┌────────▼──────────────┐
        │  AUTOMATED UAT       │   │  SMOKE TESTS          │
        │  • Playwright Tests  │   │  • Health Checks      │
        │  • API Validation    │   │  • Critical Flows     │
        └──────────────────────┘   └───────────────────────┘
                    │                        │
        ┌───────────▼──────────┐   ┌────────▼──────────────┐
        │  UAT RESULTS         │   │  MONITORING           │
        │  Posted to PR        │   │  • Error Rates        │
        └──────────────────────┘   │  • Performance        │
                                    │  • Auto-Rollback      │
                                    └───────────────────────┘
```

**Components:**

1. **Source Control (GitHub)**
   - Repository: `Yarda_v2/yard-web-app`
   - Branch Protection: Require PR approval for master
   - Status Checks: All CI checks must pass

2. **CI Platform (GitHub Actions)**
   - Workflow Files: `.github/workflows/`
   - Runners: GitHub-hosted (ubuntu-latest)
   - Secrets Management: GitHub Secrets + Vercel Environment Variables

3. **Deployment Platform (Vercel)**
   - Preview: Automatic for all PRs
   - Production: Automatic on master push
   - Serverless Functions: Python + Node.js runtime

4. **Testing Framework**
   - Frontend: Playwright (E2E), Vitest (Unit)
   - Backend: pytest (Python Unit), Contract Tests
   - UAT: Playwright with MCP browser automation

---

### CI/CD-R2: Automated Testing Requirements

**Requirement ID:** CI/CD-R2.1
**Category:** Pre-Deployment Testing
**Priority:** Critical

**Test Pyramid:**
```
                    ┌─────────────┐
                    │   E2E Tests │  ← 10% (Critical Flows)
                    │   ~20 tests │
                    └─────────────┘
                  ┌───────────────────┐
                  │ Integration Tests │  ← 30% (API + DB)
                  │    ~50 tests      │
                  └───────────────────┘
              ┌─────────────────────────────┐
              │      Unit Tests             │  ← 60% (Business Logic)
              │       ~200 tests            │
              └─────────────────────────────┘
```

**Test Stages:**

**Stage 1: Linting and Type Checking (2-3 minutes)**
```yaml
# .github/workflows/ci-cd-enhanced.yml
lint-and-typecheck:
  runs-on: ubuntu-latest
  steps:
    - uses: actions/checkout@v4

    # Frontend
    - name: Install frontend dependencies
      run: cd frontend && npm ci

    - name: ESLint
      run: cd frontend && npm run lint

    - name: TypeScript Type Check
      run: cd frontend && npm run typecheck

    # Backend
    - name: Setup Python
      uses: actions/setup-python@v4
      with:
        python-version: '3.11'

    - name: Install backend dependencies
      run: pip install ruff black mypy

    - name: Ruff Lint (Backend)
      run: ruff check api/

    - name: Black Format Check
      run: black --check api/

    - name: MyPy Type Check
      run: mypy api/_shared/
```

**Expected Results:**
- ESLint: 0 errors, warnings acceptable
- TypeScript: 0 type errors (strict mode)
- Ruff: 0 errors (Python linting)
- Black: All files formatted correctly
- MyPy: No type violations

---

**Stage 2: Unit Tests (3-5 minutes)**
```yaml
unit-tests:
  runs-on: ubuntu-latest
  needs: lint-and-typecheck
  steps:
    # Frontend Unit Tests
    - name: Run Vitest
      run: cd frontend && npm run test:unit

    # Backend Unit Tests
    - name: Run pytest
      run: |
        cd api/_shared
        pytest test_*.py -v --cov --cov-report=xml

    # Upload Coverage
    - name: Upload Coverage to Codecov
      uses: codecov/codecov-action@v3
      with:
        files: ./coverage.xml
        fail_ci_if_error: true
        flags: unittests
```

**Coverage Requirements:**
- Overall: 80%+ line coverage
- Critical modules (token_service_pg.py): 90%+
- New code: 85%+ coverage (enforced by Codecov)

**Test Categories:**
1. **Token Service Tests:** Atomic operations, race conditions
2. **User Service Tests:** CRUD operations, validation
3. **Authentication Tests:** JWT validation, permissions
4. **Business Logic Tests:** Subscription logic, trial system

---

**Stage 3: Integration Tests (5-7 minutes)**
```yaml
integration-tests:
  runs-on: ubuntu-latest
  needs: unit-tests
  services:
    postgres:
      image: postgres:15
      env:
        POSTGRES_PASSWORD: test_password
        POSTGRES_DB: yarda_test
      options: >-
        --health-cmd pg_isready
        --health-interval 10s
        --health-timeout 5s
        --health-retries 5

  steps:
    - name: Apply Test Schema
      run: psql $DATABASE_URL -f scripts/migration_schema_full.sql

    - name: Run Integration Tests
      env:
        DATABASE_URL: postgresql://postgres:test_password@localhost:5432/yarda_test
        STRIPE_SECRET_KEY: ${{ secrets.STRIPE_TEST_KEY }}
      run: |
        python3 scripts/test_integration.py --url http://localhost:3000
```

**Test Scenarios:**
1. **Token Purchase Flow:** End-to-end with test Stripe cards
2. **Generation Flow:** Mock Gemini API responses
3. **Subscription Lifecycle:** Create → Update → Cancel
4. **Database Transactions:** ACID compliance, rollback scenarios
5. **Webhook Processing:** Idempotency, duplicate handling

**Success Criteria:**
- All tests pass (100%)
- No database connection leaks
- No unhandled exceptions
- Response times within SLA (<500ms p95)

---

**Stage 4: Build Verification (3-5 minutes)**
```yaml
build:
  runs-on: ubuntu-latest
  needs: integration-tests
  steps:
    # Frontend Build
    - name: Build Frontend
      run: |
        cd frontend
        npm ci
        npm run build

    - name: Check Build Size
      run: |
        cd frontend/dist
        SIZE=$(du -sk . | cut -f1)
        if [ $SIZE -gt 5120 ]; then
          echo "Build size ${SIZE}KB exceeds 5MB limit"
          exit 1
        fi

    # Verify Environment Variables
    - name: Verify Required Env Vars
      run: |
        node scripts/verify-env.js
```

**Build Requirements:**
- Frontend bundle size: <5MB (gzipped)
- No console errors during build
- All environment variables defined
- Sourcemaps generated for debugging

---

**Stage 5: Security Scanning (2-3 minutes)**
```yaml
security-scan:
  runs-on: ubuntu-latest
  needs: lint-and-typecheck
  steps:
    # Dependency Scanning
    - name: npm audit
      run: cd frontend && npm audit --audit-level=high

    - name: pip audit
      run: pip-audit

    # Secret Scanning
    - name: TruffleHog Secret Scan
      uses: trufflesecurity/trufflehog@main
      with:
        path: ./
        base: main
        head: HEAD

    # SAST (Static Analysis)
    - name: Semgrep Security Scan
      uses: returntocorp/semgrep-action@v1
      with:
        config: auto
```

**Security Requirements:**
- No high/critical vulnerabilities in dependencies
- No exposed secrets (API keys, passwords)
- No SQL injection vulnerabilities
- No XSS vulnerabilities in frontend

**Allowed Exceptions:**
- Low severity vulnerabilities (documented in security.md)
- Transitive dependencies (if no fix available)

---

### CI/CD-R3: Deployment Workflows

**Requirement ID:** CI/CD-R3.1
**Category:** Deployment Strategy
**Priority:** Critical

**Deployment Environments:**

```
┌─────────────────────────────────────────────────────────────┐
│                    ENVIRONMENT MATRIX                        │
├────────────┬────────────┬────────────┬─────────────────────┤
│ Environment│ Trigger    │ URL        │ Purpose             │
├────────────┼────────────┼────────────┼─────────────────────┤
│ Development│ Local dev  │ localhost  │ Developer testing   │
│            │            │ :5173      │                     │
├────────────┼────────────┼────────────┼─────────────────────┤
│ Preview    │ PR created │ *-vercel.  │ Feature review      │
│            │            │ app        │ Automated UAT       │
├────────────┼────────────┼────────────┼─────────────────────┤
│ UAT/Staging│ PR labeled │ yard-uat-  │ Pre-production      │
│            │ "uat"      │ *.vercel   │ Manual QA           │
├────────────┼────────────┼────────────┼─────────────────────┤
│ Production │ Push to    │ yard-web-  │ Live users          │
│            │ master     │ app.vercel │ yarda.pro           │
│            │            │            │ (custom domain)     │
└────────────┴────────────┴────────────┴─────────────────────┘
```

---

**Workflow 1: Pull Request Preview Deployment**

**Trigger:** Pull request opened/updated
**Target:** Preview environment (Vercel)
**Duration:** 5-10 minutes

```yaml
name: Preview Deployment and Testing

on:
  pull_request:
    types: [opened, synchronize, reopened]

jobs:
  deploy-preview:
    runs-on: ubuntu-latest
    steps:
      # Run all CI checks first
      - uses: actions/checkout@v4

      - name: Run CI Checks
        run: |
          npm run lint
          npm run typecheck
          npm run test
          npm run build

      # Deploy to Vercel Preview
      - name: Deploy to Vercel Preview
        uses: amondnet/vercel-action@v25
        id: vercel-deploy
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.VERCEL_ORG_ID }}
          vercel-project-id: ${{ secrets.VERCEL_PROJECT_ID }}
          github-comment: true

      # Wait for deployment to be ready
      - name: Wait for Deployment
        run: |
          sleep 30
          curl -f ${{ steps.vercel-deploy.outputs.preview-url }}/api/health

      # Run automated UAT tests
      - name: Run UAT Tests
        env:
          PREVIEW_URL: ${{ steps.vercel-deploy.outputs.preview-url }}
        run: |
          cd frontend
          npm run test:e2e -- --base-url=$PREVIEW_URL

      # Post results to PR
      - name: Comment UAT Results
        uses: actions/github-script@v6
        with:
          script: |
            github.rest.issues.createComment({
              issue_number: context.issue.number,
              owner: context.repo.owner,
              repo: context.repo.repo,
              body: `## 🤖 Automated UAT Results

              **Preview URL:** ${{ steps.vercel-deploy.outputs.preview-url }}

              ✅ All tests passed!

              ### Test Summary
              - Token purchase flow: ✅ PASS
              - Design generation: ✅ PASS
              - Subscription flow: ✅ PASS
              - Gallery functionality: ✅ PASS

              **Manual Testing:**
              1. Visit preview URL above
              2. Test your specific changes
              3. Verify no regressions in core flows
              `
            })
```

**Post-Deployment Validation:**
- Health check returns 200 OK
- All critical API endpoints respond
- Frontend loads without errors
- UAT tests pass (90%+ success rate)

---

**Workflow 2: Production Deployment**

**Trigger:** Push to master branch
**Target:** Production environment
**Duration:** 8-12 minutes

```yaml
name: Production Deployment

on:
  push:
    branches: [master]

jobs:
  deploy-production:
    runs-on: ubuntu-latest
    environment:
      name: production
      url: https://yard-web-app.vercel.app

    steps:
      - uses: actions/checkout@v4

      # Full CI Pipeline
      - name: Run Complete CI Suite
        run: |
          npm run lint
          npm run typecheck
          npm run test:unit
          npm run test:integration
          npm run build

      # Deploy to Production
      - name: Deploy to Vercel Production
        uses: amondnet/vercel-action@v25
        id: vercel-deploy-prod
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.VERCEL_ORG_ID }}
          vercel-project-id: ${{ secrets.VERCEL_PROJECT_ID }}
          vercel-args: '--prod'

      # Wait for propagation
      - name: Wait for Production Deployment
        run: sleep 60

      # Smoke Tests
      - name: Production Smoke Tests
        run: |
          # Health check
          curl -f https://yard-web-app.vercel.app/api/health

          # Critical endpoints
          curl -f https://yard-web-app.vercel.app/api/styles

          # Custom domain check
          curl -f https://www.yarda.pro/api/health

      # Monitor for 5 minutes
      - name: Post-Deploy Monitoring
        run: |
          node scripts/monitor-deployment.js --duration=300

      # Notify team
      - name: Slack Notification
        if: always()
        uses: 8398a7/action-slack@v3
        with:
          status: ${{ job.status }}
          text: |
            Production Deployment: ${{ job.status }}
            Commit: ${{ github.sha }}
            Author: ${{ github.actor }}
            URL: https://yard-web-app.vercel.app
          webhook_url: ${{ secrets.SLACK_WEBHOOK }}
```

**Production Deployment Strategy:**
- **Blue-Green Deployment:** Vercel manages automatically
- **Canary Release:** 10% traffic → 50% → 100% (manual via Vercel)
- **Rollback Window:** 24 hours to rollback without data loss
- **Monitoring Period:** 2 hours active monitoring post-deploy

---

**Workflow 3: Rollback Procedure**

**Trigger:** Manual (via GitHub Actions or Vercel CLI)
**Target:** Production environment
**Duration:** 2-5 minutes

```yaml
name: Emergency Rollback

on:
  workflow_dispatch:
    inputs:
      deployment_id:
        description: 'Deployment ID to rollback to'
        required: true
        type: string
      reason:
        description: 'Reason for rollback'
        required: true
        type: string

jobs:
  rollback:
    runs-on: ubuntu-latest
    steps:
      # Verify deployment exists
      - name: Verify Deployment
        run: |
          vercel inspect ${{ inputs.deployment_id }} \
            --token ${{ secrets.VERCEL_TOKEN }}

      # Rollback
      - name: Rollback to Previous Deployment
        run: |
          vercel rollback ${{ inputs.deployment_id }} \
            --token ${{ secrets.VERCEL_TOKEN }}

      # Verify rollback
      - name: Verify Rollback Success
        run: |
          sleep 30
          curl -f https://yard-web-app.vercel.app/api/health

      # Create incident report
      - name: Create Incident Issue
        uses: actions/github-script@v6
        with:
          script: |
            github.rest.issues.create({
              owner: context.repo.owner,
              repo: context.repo.repo,
              title: '🚨 Production Rollback: ${{ inputs.reason }}',
              body: `## Rollback Details

              **Reason:** ${{ inputs.reason }}
              **Rolled back to:** ${{ inputs.deployment_id }}
              **Initiated by:** ${{ github.actor }}
              **Timestamp:** ${new Date().toISOString()}

              ## Action Items
              - [ ] Investigate root cause
              - [ ] Fix underlying issue
              - [ ] Add tests to prevent recurrence
              - [ ] Schedule re-deployment
              `,
              labels: ['incident', 'production', 'rollback']
            })

      # Alert team
      - name: Alert Team
        uses: 8398a7/action-slack@v3
        with:
          status: 'custom'
          custom_payload: |
            {
              text: "🚨 PRODUCTION ROLLBACK",
              attachments: [{
                color: 'danger',
                text: 'Reason: ${{ inputs.reason }}\nInitiated by: ${{ github.actor }}'
              }]
            }
          webhook_url: ${{ secrets.SLACK_WEBHOOK_URGENT }}
```

**Rollback Triggers:**
- Error rate > 5% for 5 minutes
- p95 latency > 2x baseline for 10 minutes
- Critical bug affecting payments
- Database connection failures
- Manual decision by on-call engineer

---

### CI/CD-R4: Environment Management

**Requirement ID:** CI/CD-R4.1
**Category:** Configuration Management
**Priority:** High

**Environment Variables Strategy:**

**Storage Locations:**
1. **GitHub Secrets:** API keys, tokens (encrypted)
2. **Vercel Environment Variables:** Runtime configuration
3. **`.env.example`:** Documentation only (committed)
4. **`.env.local`:** Local development (gitignored)

**Variable Tiers:**
```
┌─────────────────────────────────────────────────────────────┐
│                 ENVIRONMENT VARIABLES                        │
├────────────────┬────────────┬────────────┬─────────────────┤
│ Variable       │ Development│ Preview    │ Production      │
├────────────────┼────────────┼────────────┼─────────────────┤
│ GEMINI_API_KEY │ Test key   │ Test key   │ Production key  │
│ STRIPE_KEY     │ Test mode  │ Test mode  │ Live mode       │
│ DATABASE_URL   │ Local DB   │ Test DB    │ Production DB   │
│ BLOB_TOKEN     │ Local      │ Preview    │ Production      │
│ SKIP_EMAIL_    │ true       │ true       │ false (MUST)    │
│ VERIFICATION   │            │            │                 │
└────────────────┴────────────┴────────────┴─────────────────┘
```

**Environment Validation:**
```javascript
// scripts/verify-env.js
const requiredVars = {
  production: [
    'GEMINI_API_KEY',
    'STRIPE_SECRET_KEY',
    'POSTGRES_HOST',
    'POSTGRES_PASSWORD',
    'BLOB_READ_WRITE_TOKEN',
    'FIREBASE_SERVICE_ACCOUNT_JSON',
  ],
  preview: [
    'GEMINI_API_KEY',
    'STRIPE_SECRET_KEY', // Test mode
    'POSTGRES_HOST',
  ]
};

function validateEnvironment(env) {
  const missing = requiredVars[env].filter(v => !process.env[v]);

  if (missing.length > 0) {
    console.error(`Missing environment variables: ${missing.join(', ')}`);
    process.exit(1);
  }

  console.log(`✅ All required ${env} environment variables present`);
}
```

**Secrets Rotation Policy:**
- API Keys: Rotate every 90 days
- Database Passwords: Rotate every 180 days
- Webhook Secrets: Rotate after any security incident
- Process: Zero-downtime rotation (add new → migrate → remove old)

---

### CI/CD-R5: Monitoring and Observability

**Requirement ID:** CI/CD-R5.1
**Category:** Post-Deployment Monitoring
**Priority:** Critical

**Monitoring Stack:**

```
┌─────────────────────────────────────────────────────────────┐
│                    MONITORING LAYERS                         │
└─────────────────────────────────────────────────────────────┘

Layer 1: Application Metrics (Vercel Analytics)
  • Function Invocations: Count, Duration, Cold Starts
  • Error Rate: 4xx, 5xx by endpoint
  • Bandwidth: Data transfer per region
  • Edge Network: Cache hits, latency by region

Layer 2: Database Metrics (Supabase Dashboard)
  • Connection Pool: Active, Idle, Waiting
  • Query Performance: Slow queries (>100ms)
  • Transaction Rate: Commits, Rollbacks
  • Storage: Database size, growth rate

Layer 3: Business Metrics (Custom)
  • Token Operations: Purchase success rate, balance accuracy
  • Generation Success: Completion rate, average duration
  • User Engagement: Daily active users, retention
  • Revenue: MRR, token sales, churn rate

Layer 4: External Services
  • Gemini API: Latency, error rate, quota usage
  • Stripe: Payment success rate, webhook delivery
  • Firebase Auth: Login success rate, token validation time
```

**Automated Monitoring Script:**
```javascript
// scripts/monitor-deployment.js
const THRESHOLDS = {
  errorRate: 0.05,        // 5%
  p95Latency: 1000,       // 1 second
  p99Latency: 2000,       // 2 seconds
  successRate: 0.95,      // 95%
};

async function monitorDeployment(duration = 300) {
  const startTime = Date.now();
  const alerts = [];

  while (Date.now() - startTime < duration * 1000) {
    // Check error rate
    const errorRate = await getErrorRate();
    if (errorRate > THRESHOLDS.errorRate) {
      alerts.push({
        severity: 'critical',
        message: `Error rate ${errorRate} exceeds threshold ${THRESHOLDS.errorRate}`,
        action: 'ROLLBACK_RECOMMENDED'
      });
    }

    // Check latency
    const p95 = await getP95Latency();
    if (p95 > THRESHOLDS.p95Latency) {
      alerts.push({
        severity: 'warning',
        message: `p95 latency ${p95}ms exceeds ${THRESHOLDS.p95Latency}ms`
      });
    }

    // Check critical endpoints
    const health = await fetch('https://yard-web-app.vercel.app/api/health');
    if (!health.ok) {
      alerts.push({
        severity: 'critical',
        message: 'Health check failed',
        action: 'ROLLBACK_REQUIRED'
      });
      break;
    }

    await sleep(30000); // Check every 30 seconds
  }

  return { alerts, passed: alerts.filter(a => a.severity === 'critical').length === 0 };
}
```

**Alerting Rules:**

**Critical Alerts (Immediate Action):**
- Error rate > 5% for 5 minutes → Rollback
- Database connection pool exhausted → Scale up
- Payment processing failures > 3 in 5 minutes → Investigate
- Health check fails → Rollback

**Warning Alerts (Investigation Required):**
- Error rate > 1% for 15 minutes
- p95 latency > 1 second for 10 minutes
- Slow queries detected (>500ms)
- Disk space > 80%

**Info Alerts (Monitoring):**
- Deployment completed successfully
- Traffic spike detected (+50% over baseline)
- New error types detected
- Feature flag toggled

---

### CI/CD-R6: Automated Pipeline Requirements

**Requirement ID:** CI/CD-R6.1
**Category:** Fully Automated Development Pipeline
**Priority:** High

**Automated Development Pipeline (Feature 011+):**

```
┌─────────────────────────────────────────────────────────────┐
│           AUTOMATED END-TO-END PIPELINE                      │
│        (From Requirement to Production)                      │
└─────────────────────────────────────────────────────────────┘

Step 1: Requirement Creation (Manual - 2 minutes)
  └─ Admin marks requirement "ok2dev" in Firestore

Step 2: Auto-Development (/auto-develop REQ-123) - 20 min
  ├─ Generate specification (spec.md)
  ├─ Create implementation plan (plan.md)
  ├─ Generate task list (tasks.md)
  ├─ Execute all tasks (code implementation)
  └─ Run unit tests and fix failures

Step 3: Deploy to UAT (/deploy-uat) - 3 min
  ├─ Create feature branch
  ├─ Commit all changes
  ├─ Push to GitHub
  ├─ Create pull request
  ├─ Wait for preview deployment
  └─ Extract preview URL

Step 4: Automated UAT Testing (/uat) - 5 min
  ├─ Launch Playwright with MCP browser
  ├─ Test all user journeys
  ├─ Screenshot any errors
  ├─ Auto-fix issues if possible
  ├─ Re-run tests until pass
  └─ Generate UAT report

Step 5: Production Approval (Manual - 1 minute)
  └─ Developer reviews UAT results
  └─ Runs /approve-production REQ-123

Step 6: Production Deployment (/deploy-production) - 5 min
  ├─ Merge PR to master
  ├─ Automatic production deployment (Vercel)
  ├─ Run smoke tests
  ├─ Monitor for 5 minutes
  └─ Mark requirement "deployed"

Total Time: ~35 minutes (30 automated + 5 manual)
Human Touchpoints: 2 (requirement approval + production approval)
```

**Pipeline Commands:**

```bash
# Complete pipeline (one command)
/auto-pipeline

# Individual steps
/auto-develop REQ-123        # Develop feature automatically
/deploy-uat                  # Deploy to preview environment
/uat https://preview-url     # Run automated UAT tests
/approve-production REQ-123  # Approve for production
/deploy-production           # Deploy to production
/rollback-production         # Emergency rollback
```

**Success Criteria:**
- 90%+ of features deployed without manual intervention
- <1 hour from requirement to production (for small features)
- 95%+ UAT test pass rate before production
- Zero manual deployment steps

---

### CI/CD-R7: Quality Gates

**Requirement ID:** CI/CD-R7.1
**Category:** Deployment Blockers
**Priority:** Critical

**Quality Gate Checklist:**

**Gate 1: Code Quality (MUST PASS)**
- ✅ ESLint: 0 errors
- ✅ TypeScript: 0 type errors
- ✅ Ruff (Python): 0 errors
- ✅ No console.log in production code
- ✅ No TODO comments without GitHub issue link

**Gate 2: Testing (MUST PASS)**
- ✅ Unit test coverage: ≥80% overall, ≥90% new code
- ✅ Integration tests: 100% pass rate
- ✅ No flaky tests (3+ consecutive passes required)
- ✅ E2E critical flows: 100% pass rate

**Gate 3: Security (MUST PASS)**
- ✅ No high/critical dependency vulnerabilities
- ✅ No exposed secrets in code or logs
- ✅ SAST scan clean (Semgrep)
- ✅ SQL injection protection verified

**Gate 4: Performance (MUST PASS for Production)**
- ✅ Build size: <5MB gzipped
- ✅ Lighthouse score: ≥90 performance
- ✅ No memory leaks detected
- ✅ Database queries: <100ms p95

**Gate 5: Documentation (SHOULD PASS)**
- ⚠️ API changes documented in CLAUDE.md
- ⚠️ Breaking changes listed in CHANGELOG.md
- ⚠️ New features have user-facing docs
- ⚠️ Complex logic has code comments

**Override Policy:**
- Gates 1-4: CANNOT override (hard fail)
- Gate 5: CAN override with approval + GitHub issue
- Emergency hotfix: Can skip Gate 4 with incident ticket

---

### CI/CD-R8: Deployment Metrics and KPIs

**Requirement ID:** CI/CD-R8.1
**Category:** Pipeline Performance
**Priority:** Medium

**Key Metrics:**

```
┌─────────────────────────────────────────────────────────────┐
│                   DEPLOYMENT METRICS                         │
├────────────────────────────┬────────────┬───────────────────┤
│ Metric                     │ Target     │ Current (Avg)     │
├────────────────────────────┼────────────┼───────────────────┤
│ Deployment Frequency       │ 10+/week   │ 12/week           │
│ Lead Time (commit→prod)    │ <30 min    │ 25 min            │
│ Mean Time to Recovery      │ <15 min    │ 12 min            │
│ Change Failure Rate        │ <5%        │ 3%                │
│ CI Pipeline Duration       │ <10 min    │ 8 min             │
│ Deployment Success Rate    │ >95%       │ 97%               │
│ Rollback Rate              │ <2%        │ 1.5%              │
│ Preview Build Time         │ <5 min     │ 4 min             │
│ Production Build Time      │ <8 min     │ 7 min             │
│ Test Suite Execution       │ <5 min     │ 4.5 min           │
└────────────────────────────┴────────────┴───────────────────┘
```

**DORA Metrics (DevOps Research and Assessment):**

1. **Deployment Frequency:** HIGH (10+ per week)
   - Current: 12 deployments/week
   - Goal: Maintain >10/week (Elite tier)

2. **Lead Time for Changes:** HIGH (< 1 hour)
   - Current: 25 minutes (commit to production)
   - Goal: Maintain <30 minutes

3. **Mean Time to Recovery (MTTR):** HIGH (< 1 hour)
   - Current: 12 minutes (detection to resolution)
   - Goal: Maintain <15 minutes

4. **Change Failure Rate:** LOW (< 15%)
   - Current: 3% (1 in 33 deployments needs rollback)
   - Goal: Maintain <5%

**Performance Classification:**
```
Elite:    All 4 metrics in top tier ✅ (Current Status)
High:     3 metrics in top tier
Medium:   2 metrics in top tier
Low:      0-1 metrics in top tier
```

---

### CI/CD-R9: Disaster Recovery

**Requirement ID:** CI/CD-R9.1
**Category:** Business Continuity
**Priority:** High

**Backup Strategy:**

**Database Backups (PostgreSQL):**
- **Frequency:** Daily automated (Supabase)
- **Retention:** 30 days
- **RPO (Recovery Point Objective):** 24 hours
- **RTO (Recovery Time Objective):** 4 hours
- **Backup Location:** Supabase S3-compatible storage
- **Backup Validation:** Weekly restore test

**Application Backups:**
- **Git Repository:** GitHub (redundant)
- **Deployment History:** Vercel (last 100 deployments)
- **Environment Variables:** Encrypted in GitHub Secrets + Vercel
- **Blob Storage:** Vercel Blob (geo-redundant)

**Disaster Scenarios:**

**Scenario 1: Complete Production Outage**
```
Detection → Alert (1 min)
    ↓
Verify Issue (2 min)
    ↓
Decision: Rollback vs Fix (3 min)
    ↓
Execute Rollback (2 min)
    ↓
Verify Recovery (2 min)
    ↓
Total: 10 minutes
```

**Scenario 2: Data Loss (Database Corruption)**
```
Detection → Alert (5 min)
    ↓
Assess Scope (10 min)
    ↓
Initiate Database Restore (30 min)
    ↓
Verify Data Integrity (60 min)
    ↓
Resume Operations (10 min)
    ↓
Total: 115 minutes (~2 hours)
```

**Scenario 3: Vercel Platform Outage**
```
Detection → Vercel Status (1 min)
    ↓
Activate Backup Plan (10 min)
    ↓
Deploy to Backup Platform (30 min)
    ↓
Update DNS Records (10 min)
    ↓
DNS Propagation (60 min)
    ↓
Total: 111 minutes (~2 hours)
```

**Contact List (On-Call Rotation):**
- Primary: Lead Engineer
- Secondary: Senior Backend Engineer
- Escalation: CTO
- External: Vercel Support, Supabase Support

---

### CI/CD-R10: Continuous Improvement

**Requirement ID:** CI/CD-R10.1
**Category:** Pipeline Evolution
**Priority:** Low

**Improvement Process:**

**Monthly Pipeline Review:**
- Review deployment metrics vs targets
- Identify bottlenecks (slowest stages)
- Collect team feedback on pain points
- Prioritize improvements for next sprint

**Quarterly Audits:**
- Security audit (dependency updates)
- Performance audit (build times, test suite speed)
- Cost audit (CI minutes, storage)
- Tool evaluation (new CI/CD tools)

**Continuous Optimization:**
- Parallelize independent jobs
- Cache dependencies aggressively
- Optimize Docker images
- Upgrade test runners
- Reduce flaky tests

**Innovation Backlog:**
- [ ] Progressive deployment (canary releases)
- [ ] Chaos engineering tests
- [ ] Performance regression detection
- [ ] Automated dependency updates (Dependabot)
- [ ] Feature flag management system
- [ ] A/B testing infrastructure

---

## Appendix

### Glossary

- **CUJ:** Critical User Journey - End-to-end user workflow
- **ACID:** Atomicity, Consistency, Isolation, Durability (database properties)
- **JWT:** JSON Web Token (authentication)
- **p95:** 95th percentile (performance metric)
- **RPS:** Requests Per Second (throughput)
- **SLA:** Service Level Agreement (uptime guarantee)
- **TTL:** Time To Live (expiration time)

### Related Documents

- `CLAUDE.md` - Development guide and architecture overview
- `PRD_Feature_012_PostgreSQL_Migration.md` - Database migration spec
- `FIRESTORE_MIGRATION_ANALYSIS.md` - Migration strategy details
- `STRIPE_PRODUCTION_DEPLOYMENT.md` - Payment integration guide

---

**Document End**
