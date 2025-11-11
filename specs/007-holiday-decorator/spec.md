# Feature Specification: Holiday Decorator - Viral Marketing Feature

**Feature Branch**: `007-holiday-decorator`
**Created**: 2025-11-10
**Status**: Draft
**Input**: User description: "Holiday Decorator - AI-powered holiday home decoration feature with viral sharing loop for user acquisition. Users get 1 free credit on signup and earn more by sharing their decorated home images on social media."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - New User Discovery & First Generation (Priority: P1)

As a new visitor landing on Yarda.com during the holiday season, I want to immediately understand that Yarda offers a free, fun holiday decoration feature, so that I'm enticed to sign up and try it right now.

**Why this priority**: This is the entry point for all user acquisition. Without compelling discovery and easy onboarding, the entire viral loop fails. This story delivers immediate value (1 free decorated home image) and captures the user's email.

**Independent Test**: Can be fully tested by visiting the homepage, clicking "Try the AI Holiday Decorator 🎄", signing up with email, entering a home address, adjusting the Street View angle, selecting a style (Classic/Modern/Over-the-Top), and receiving a decorated image. Success = user sees their decorated home within 10 seconds of clicking "Generate".

**Acceptance Scenarios**:

1. **Given** I am a new visitor on the Yarda homepage, **When** I view the hero section, **Then** I see a holiday-themed video showing a plain house transforming with decorations and a headline "From Landscape to Winter Wonderland. Design your yard for Spring, or decorate your home for the holidays—for free."

2. **Given** I am on the homepage, **When** I see the dual CTAs, **Then** I can choose between "Get Your Free Landscape Plan" (primary) and "Try the AI Holiday Decorator 🎄" (secondary/holiday).

3. **Given** I click "Try the AI Holiday Decorator 🎄", **When** I am prompted to sign up, **Then** I can create an account using Google OAuth or magic link email authentication.

4. **Given** I just signed up, **When** I land on the Holiday Decorator page, **Then** I see "Holiday Credits: 1" displayed prominently, an address search field, and three style options (Classic, Modern, Over-the-Top).

5. **Given** I enter my home address and the Street View loads, **When** I view my home, **Then** I can rotate the Street View to adjust the angle and get the best view of my house exterior.

6. **Given** I have adjusted the Street View angle and selected a style, **When** I click "Generate" (after confirming "This will use your 1 free credit"), **Then** I see my decorated home image within 10 seconds and can toggle between Original and Decorated views.

7. **Given** I have used my free credit, **When** I view my credits counter, **Then** it shows "Holiday Credits: 0" and displays a "Share to get 1 more free credit!" button.

---

### User Story 2 - Viral Sharing Loop (Priority: P2)

As a delighted user who loves my decorated home image, I want to easily share a before-and-after comparison on social media (Instagram, Facebook, TikTok), so that I can show my friends and get reactions while earning another free credit.

**Why this priority**: This is the viral engine that drives user acquisition. Each share creates a new potential user. Without this working smoothly, the marketing strategy fails. However, it depends on P1 (users must first generate an image to share).

**Independent Test**: Can be tested by generating a decorated home image (from P1), clicking "Share to get 1 more free credit!", selecting a social platform (Instagram/Facebook/TikTok), and verifying that: (1) the shared image includes before-and-after comparison, (2) image has subtle Yarda watermark + URL, (3) user receives +1 credit after successful share, (4) shared link points to Yarda homepage.

**Acceptance Scenarios**:

1. **Given** I have a generated decorated home image, **When** I view the results page, **Then** I see prominent "Share to..." buttons for Instagram, Facebook, and TikTok.

2. **Given** I click "Share to Instagram", **When** the share dialog opens, **Then** I see a before-and-after comparison image with Yarda logo and yarda.com URL subtly watermarked.

3. **Given** I complete a social media share, **When** the share is verified, **Then** my Holiday Credits counter increases by 1 and I see a success message "You earned 1 free credit! Share again to get more."

4. **Given** someone clicks the shared link, **When** they land on Yarda's homepage, **Then** they see the same holiday-themed hero section with "Try the AI Holiday Decorator 🎄" CTA.

5. **Given** I want to share multiple times, **When** I share to different platforms, **Then** I earn 1 credit per unique share (Instagram = 1, Facebook = 1, TikTok = 1), with a daily limit of 3 total shares to prevent abuse.

---

### User Story 3 - Returning User "What's New" Modal (Priority: P3)

As an existing Yarda user who signed up before the holiday feature launched, I want to be greeted with a "What's New?" modal when I log in, so that I'm aware of the free Holiday Decorator feature and can try it.

**Why this priority**: Re-engages existing users and converts them into the viral sharing loop. Lower priority than P1/P2 because it's about existing user re-activation, not new acquisition. Can be implemented after the core feature works for new users.

**Independent Test**: Can be tested by logging in with an existing account (created before holiday feature launch), verifying the one-time modal appears with "Try our new AI Holiday Decorator! Get 1 free credit to see your home ready for the holidays", clicking "Try It Now", and being redirected to the Holiday Decorator page with 1 credit.

**Acceptance Scenarios**:

1. **Given** I am an existing user logging in for the first time since the holiday feature launched, **When** I complete authentication, **Then** I see a one-time "What's New?" modal announcing the Holiday Decorator.

2. **Given** the modal is displayed, **When** I read the message, **Then** it says "Try our new AI Holiday Decorator! Get 1 free credit to see your home ready for the holidays" with a "Try It Now" button.

3. **Given** I click "Try It Now", **When** the modal closes, **Then** I am redirected to the Holiday Decorator page and my credits show "Holiday Credits: 1".

4. **Given** I dismiss the modal or log in again later, **When** I check for the modal, **Then** it does not appear again (shown only once per user account).

---

### User Story 4 - Lead Capture via HD Download (Priority: P3)

As a user who loves my holiday decoration design, I want to save a high-resolution version by entering my email, so that I can use it as my holiday e-card and receive nurture emails about Yarda's landscaping services.

**Why this priority**: Captures email for users who may have signed up with OAuth (no direct email access). Feeds the email nurture funnel for spring landscaping conversions. Lower priority because P1 already captures email at signup; this is an additional touchpoint.

**Independent Test**: Can be tested by generating a decorated image, clicking "Download HD Version" or "Email My Design", entering an email address, and verifying that: (1) user receives an email with the HD image attached, (2) user is added to the "Holiday-to-Spring" email list, (3) user sees a success message with the pivot CTA.

**Acceptance Scenarios**:

1. **Given** I have a generated decorated home image, **When** I click "Download HD Version" or "Email My Design", **Then** I am prompted to enter my email address with the message "Enter your email to receive this high-resolution image, for free."

2. **Given** I enter my email and click "Submit", **When** the request is processed, **Then** I immediately receive an email with my high-resolution decorated image attached.

3. **Given** I submitted my email, **When** the backend processes it, **Then** I am added to the "Holiday-to-Spring" email nurture list for future marketing campaigns.

4. **Given** I successfully submitted my email, **When** the modal closes, **Then** I see a "Success!" page with a thank-you message and the pivot CTA (see P5).

---

### User Story 5 - Pivot to Core Landscaping App (Priority: P4)

As a new lead who just gave my email for the HD image, I want to be made aware of Yarda's core landscaping service, so that I consider signing up for a discounted landscape plan when I'm ready in the spring.

**Why this priority**: Converts holiday users into landscaping prospects. This is the business goal but lowest priority for the holiday feature MVP because it doesn't affect the user's immediate holiday decoration experience. Can be added after P1-P4 are working.

**Independent Test**: Can be tested by completing the email submission flow (P4), verifying the "Success!" page displays the pivot CTA with headline "Love your holiday look? Wait 'til you see what we can do for your landscape.", a side-by-side visual showing [Holiday House] vs [AI Spring Landscape], and a button "Get 25% Off Your First Landscape Plan. Join the Spring 2026 Waitlist."

**Acceptance Scenarios**:

1. **Given** I just submitted my email for the HD image (P4), **When** I see the "Success!" page, **Then** I see a clean module (not a popup) with the pivot CTA.

2. **Given** the pivot CTA is displayed, **When** I read the headline, **Then** it says "Love your holiday look? Wait 'til you see what we can do for your landscape."

3. **Given** the pivot CTA includes a visual, **When** I view it, **Then** I see a side-by-side or carousel showing my holiday-decorated house next to an AI-generated spring landscape of the same house.

4. **Given** I am interested in the landscaping service, **When** I click "Get 25% Off Your First Landscape Plan. Join the Spring 2026 Waitlist", **Then** I am redirected to the core Yarda signup flow with the discount code pre-applied.

5. **Given** I am not interested right now, **When** I dismiss or ignore the pivot CTA, **Then** I can return to the Holiday Decorator to generate more images (if I have credits).

---

### Edge Cases

- What happens when a user tries to generate without sufficient credits? → Generate button is disabled; clicking shows modal: "You need 1 Holiday Credit. Share your design on social media to earn more!"

- How does the system handle rapid-fire share attempts (spam)? → Daily share limit of 3 per user; additional shares show message "You've reached your daily share limit. Come back tomorrow for more free credits!"

- What happens if image generation fails? → User sees error message "Oops! Decoration failed. We've refunded your credit. Please try again with a different photo." Credit is refunded automatically.

- What happens if Street View is not available for a user's address? → User sees message "Street View not available for this location. Please try a different address or contact support." No credit is deducted.

- What happens if the user's Street View shows the wrong side of the house? → User can rotate the Street View 360° to find the correct angle before generating. Rotation controls are prominent and labeled.

- What happens when the holiday season ends (after New Year)? → Feature is hidden from homepage; existing users can still access via direct URL but cannot earn new credits; marketing materials updated to "Spring Landscaping" focus.

- How does the system verify social media shares? → System uses social platform APIs (Facebook Graph API, Instagram Basic Display API, TikTok Creator API) to confirm posts were published. Users must grant OAuth "publish_actions" permissions. Share verification happens server-side; credit is granted only after API confirms successful post.

- What happens if a user's email bounces during HD image delivery? → User sees error "Email delivery failed. Please check your email address and try again." Email is not added to nurture list until successful delivery confirmed.

## Requirements *(mandatory)*

### Visual Design Requirements (Optional - Festive Mode)

**Toggle**: All visual enhancements below are controlled by environment variable `NEXT_PUBLIC_ENABLE_FESTIVE_UI=true|false`. When disabled, the original clean UI is used. This allows easy A/B testing and quick rollback.

#### Festive Holiday Landing Page (Festive Mode Only)

- **FR-VIS-001**: Homepage hero section SHOULD feature animated snowflakes falling across the screen when festive mode is enabled.
  - Implementation: CSS animation, 20-30 snowflakes of varying sizes
  - Snowflakes should be subtle, not obstructive (opacity 0.6-0.8)
  - Component: `HolidayHero.tsx` with conditional rendering

- **FR-VIS-002**: CTA buttons ("Try the AI Holiday Decorator 🎄") SHOULD have twinkling lights animation around borders when festive mode is enabled.
  - Implementation: CSS keyframe animation with color cycling (gold, white, soft blue)
  - Animation: 2-3 second loop
  - Fallback: Solid border when disabled

- **FR-VIS-003**: Homepage headline SHOULD use festive font when festive mode is enabled.
  - Font options: "Mountains of Christmas", "Lobster", or similar from Google Fonts
  - Include text shadow for depth
  - Fallback: Standard font (Inter/System) when disabled

#### Enchanted Holiday Decorator Studio (Festive Mode Only)

- **FR-VIS-004**: Holiday Credits counter SHOULD be visually engaging when festive mode is enabled:
  - Large, prominent display (32px+ font size)
  - Icon animation (coin/snowflake spinning on credit change)
  - Color-coded by balance:
    - Green with glow if credits > 0
    - Orange/amber if credits = 0
    - Pulsing effect when updated
  - Fallback: Simple numeric display with icon when disabled

- **FR-VIS-005**: Style selector buttons SHOULD have festive icons when festive mode is enabled:
  - **Classic**: Wreath icon 🎄 or custom SVG
  - **Modern**: Sleek star icon ⭐ or custom SVG
  - **Over-the-Top**: Santa/snowman icon 🎅 or custom SVG
  - Icons prominently displayed above/beside style name
  - Fallback: Text-only labels when disabled

- **FR-VIS-006**: "Generate" button SHOULD have sparkling/shimmer effect when festive mode is enabled:
  - CSS animation with gradient shift or particle effect
  - Hover state with scale transform (1.05x) and glow
  - Disabled state (no credits) should be visually distinct (grayed out, no sparkle)
  - Fallback: Standard button with simple hover state when disabled

#### Celebratory Results & Sharing Screen (Festive Mode Only)

- **FR-VIS-007**: Decorated image SHOULD reveal with animation when generation completes and festive mode is enabled:
  - **Recommended**: Curtain opening effect (two vertical panels slide apart)
  - Alternative options: Magical dust/sparkle reveal, zoom + fade from center
  - Animation duration: 1-2 seconds
  - Fallback: Simple fade-in when disabled

- **FR-VIS-008**: Share buttons SHOULD be prominent and festive when festive mode is enabled:
  - Larger size (48px height vs. standard 40px)
  - Platform-specific colors with festive borders:
    - Instagram: Gradient with snowflake decoration
    - Facebook: Blue with twinkle effect
    - TikTok: Black with sparkles
  - Hover effect with scale (1.1x) + glow animation
  - Fallback: Standard sized buttons with platform colors when disabled

- **FR-VIS-009**: Before/after toggle button SHOULD have smooth transition animation:
  - Fade or slide between images (300ms duration)
  - Toggle button itself should have festive styling in festive mode
  - Always animated (not tied to festive mode toggle)

#### Implementation Notes

- All festive UI enhancements MUST be implemented as optional CSS classes/components
- Environment variable: `NEXT_PUBLIC_ENABLE_FESTIVE_UI` (default: `true` during holiday season, `false` after)
- CSS classes pattern: `festive-snowflakes`, `festive-button-sparkle`, etc.
- Components should accept `festiveMode` prop with default from environment
- Performance: Animations should be CSS-based (GPU accelerated), not JavaScript
- Accessibility: Animations should respect `prefers-reduced-motion` media query

### Functional Requirements

#### Marketing & Discovery

- **FR-001**: Homepage MUST display a holiday-themed hero section during the holiday season (Thanksgiving through New Year) with auto-playing before/after decoration video.

- **FR-002**: Homepage MUST offer dual CTAs: primary "Get Your Free Landscape Plan" and secondary "Try the AI Holiday Decorator 🎄".

- **FR-003**: System MUST display a one-time "What's New?" modal to existing users announcing the Holiday Decorator feature.

- **FR-004**: System MUST add a "Holiday Decorator" section to the "How It Works" or "Features" area explaining the credit model.

#### Credit System

- **FR-005**: System MUST grant 1 free Holiday Credit to every new user upon signup during the holiday season.

- **FR-006**: System MUST grant existing users 1 free Holiday Credit when they view the "What's New?" modal for the first time.

- **FR-007**: System MUST display the user's current Holiday Credit balance persistently throughout the Holiday Decorator experience.

- **FR-008**: System MUST disable the "Generate" button when user has 0 credits and display a "Share to get 1 more free credit!" message.

- **FR-009**: System MUST deduct 1 credit atomically before starting image generation to prevent negative balances.

- **FR-010**: System MUST refund 1 credit if image generation fails for any reason.

- **FR-011**: System MUST grant 1 credit per successful social media share (Instagram, Facebook, TikTok) with a maximum of 3 shares per day.

#### Address Search & Street View

- **FR-012**: System MUST allow users to enter their home address using Google Maps Geocoding API.

- **FR-013**: System MUST load Google Street View imagery for the entered address.

- **FR-014**: System MUST provide Street View rotation controls allowing users to adjust the viewing angle 360° to get the best view of their house exterior.

- **FR-015**: System MUST display an error message if Street View is not available for the address: "Street View not available for this location. Please try a different address or contact support."

#### Image Generation

- **FR-016**: System MUST offer three preset holiday decoration styles: Classic, Modern, and Over-the-Top.

- **FR-017**: System MUST confirm credit usage before generation: "This will use your 1 free credit. [Generate] / [Cancel]".

- **FR-018**: System MUST generate a decorated home image in under 10 seconds using img-to-img AI transformation on the Street View image.

- **FR-019**: System MUST realistically apply decorations (lights, wreaths, inflatables, etc.) without altering the home's core architecture.

- **FR-020**: System MUST allow users to toggle between "Original" (Street View) and "Decorated" views after generation.

- **FR-021**: System MUST store both original Street View image and decorated image for the user's account.

#### Viral Sharing

- **FR-022**: System MUST generate a before-and-after comparison image for sharing that includes both original Street View and decorated versions side-by-side.

- **FR-023**: System MUST add a subtle Yarda logo and yarda.com URL watermark to all shared images.

- **FR-024**: System MUST provide "Share to..." buttons for Instagram, Facebook, and TikTok on the results page.

- **FR-025**: System MUST verify shares using social platform APIs (Facebook Graph API, Instagram Basic Display API, TikTok Creator API) before granting credits.

- **FR-026**: System MUST request OAuth "publish_actions" permissions from users to enable share verification.

- **FR-027**: System MUST grant 1 credit per verified platform share (max 3/day) only after API confirms successful post.

- **FR-028**: Shared links MUST redirect to the Yarda homepage with the holiday hero section visible.

- **FR-029**: System MUST enforce daily share limit of 3 to prevent abuse.

#### Lead Capture & Email

- **FR-030**: System MUST offer "Download HD Version" or "Email My Design" options on the results page.

- **FR-031**: System MUST prompt users for email address with message: "Enter your email to receive this high-resolution image, for free."

- **FR-032**: System MUST send an email with the high-resolution decorated image attached within 1 minute of submission.

- **FR-033**: System MUST add the user's email to the "Holiday-to-Spring" email nurture list upon successful delivery.

- **FR-034**: System MUST validate email format before submission and show error for invalid emails.

#### Pivot to Core App

- **FR-035**: System MUST display a pivot CTA on the "Success!" page after email submission.

- **FR-036**: Pivot CTA MUST include headline: "Love your holiday look? Wait 'til you see what we can do for your landscape."

- **FR-037**: Pivot CTA MUST show a side-by-side visual of the user's holiday house and an AI-generated spring landscape of the same house (using the same Street View location).

- **FR-038**: Pivot CTA MUST include a button: "Get 25% Off Your First Landscape Plan. Join the Spring 2026 Waitlist."

- **FR-039**: Button click MUST redirect to core Yarda signup with the 25% discount code pre-applied.

#### Seasonal Behavior

- **FR-040**: System MUST automatically activate the holiday feature from Thanksgiving Day through January 1st.

- **FR-041**: System MUST hide the holiday feature from the homepage after January 1st but allow direct URL access for existing users.

- **FR-042**: System MUST prevent new Holiday Credit earning after January 1st.

### Key Entities

- **Holiday Credit**: Virtual currency for the holiday feature. Each user has a balance (integer). Credits are earned (signup, shares) and spent (generation). Must support atomic deduction to prevent race conditions.

- **Holiday Generation**: A record of a single decoration generation request. Contains user ID, address (location), Street View heading/angle, original Street View image URL, decorated image URL, style selected (Classic/Modern/Over-the-Top), credit deducted, generation status (pending/completed/failed), and timestamp.

- **Social Share**: A record of a user sharing their decorated image. Contains user ID, platform (Instagram/Facebook/TikTok), share timestamp, credit granted flag, and daily share count for rate limiting.

- **Email Nurture List**: A collection of user emails captured via HD download. Contains email address, source (holiday feature), opt-in timestamp, and nurture campaign status.

- **Discount Code**: A promotional code for the pivot CTA. Contains code string ("SPRING2026-25"), discount percentage (25%), expiration date, and usage limit.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 80% of new users who click "Try the AI Holiday Decorator 🎄" complete account creation and generate their first decorated image within 5 minutes.

- **SC-002**: Image generation completes in under 10 seconds from "Generate" button click to decorated image display for 95% of requests.

- **SC-003**: 40% of users who generate a decorated image share it on at least one social media platform within 24 hours.

- **SC-004**: Each social media share results in at least 0.5 new user signups on average (measured via UTM tracking on shared links).

- **SC-005**: 60% of users who see the "What's New?" modal (existing users) generate at least one holiday decoration within 48 hours.

- **SC-006**: 25% of users who request the HD download via email click the pivot CTA to learn about landscaping services.

- **SC-007**: 10% of users who click the pivot CTA join the Spring 2026 Waitlist with the 25% discount code.

- **SC-008**: Daily active users increase by 300% during the holiday season (Thanksgiving - New Year) compared to pre-holiday baseline.

- **SC-009**: The feature generates at least 1,000 new email subscribers for the "Holiday-to-Spring" nurture list by January 1st.

- **SC-010**: Zero instances of negative credit balances due to race conditions in concurrent generation requests.
