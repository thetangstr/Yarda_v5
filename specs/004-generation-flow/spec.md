# Feature Specification: Generation Flow Interface

**Feature Branch**: `004-generation-flow`
**Created**: 2025-11-06
**Status**: Draft
**Input**: User description: "Implement free design flow generation interface based on CUJ-5 and mockup"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Single Area Generation with Trial Credits (Priority: P1)

A new user with 3 trial credits wants to generate their first landscape design by entering their property address, selecting an area, and choosing a style.

**Why this priority**: This is the core MVP functionality that delivers immediate value to new users. It's the primary entry point to the platform and must work flawlessly to convert trials to paid users.

**Independent Test**: Can be fully tested by creating a trial user account, entering a valid address, selecting one area and style, then clicking generate. Success is measured by receiving a generated design and trial credit deduction from 3 to 2.

**Acceptance Scenarios**:

1. **Given** a user with 3 trial credits on the generation page, **When** they enter property address "123 Main Street, Anytown, USA 12345" and select Front Yard area with Modern Minimalist style, **Then** the system shows satellite/street view imagery of the property and enables the generate button.

2. **Given** the user has filled all required fields (address, area, style), **When** they click "Generate Design", **Then** the system deducts 1 trial credit, shows generation progress, and displays "2 trial credits remaining".

3. **Given** the generation is in progress, **When** the user waits 30-60 seconds, **Then** the completed landscape design appears with the selected style applied to the chosen area.

4. **Given** a user enters an invalid address, **When** they try to proceed, **Then** the system shows error "Unable to find address. Please verify the address or upload a photo manually" and blocks generation.

---

### User Story 2 - Multi-Area Selection with Token Cost Preview (Priority: P2)

A paid user with tokens wants to generate designs for multiple yard areas (front yard, backyard, walkway) in a single session to visualize a complete landscape renovation.

**Why this priority**: Multi-area generation is a premium feature that increases token consumption and provides comprehensive design coverage. It's valuable but not essential for the MVP.

**Independent Test**: Can be tested independently by logging in as a token user, selecting 3 areas (Front Yard, Backyard, Walkway), and verifying the cost preview shows "3 areas = 3 tokens" before generation starts.

**Acceptance Scenarios**:

1. **Given** a user with 50 tokens on the generation page, **When** they select Front Yard, Backyard, and Walkway areas, **Then** the UI highlights all three areas and shows "Cost: 3 tokens" in the generate button.

2. **Given** the user has selected multiple areas with different styles, **When** they click "Generate All Areas", **Then** the system deducts 3 tokens upfront and starts parallel generation for all selected areas.

3. **Given** multi-area generation is in progress, **When** the user views the progress screen, **Then** each area shows independent progress percentages (e.g., Front Yard: 60%, Backyard: 40%, Walkway: 80%).

4. **Given** one area fails during multi-area generation, **When** the other areas complete successfully, **Then** the failed area shows error status, the user receives a refund for that specific area (1 token), and can retry just that area.

---

### User Story 3 - Payment Method Hierarchy Display (Priority: P3)

A user wants to clearly understand which payment method will be used (trial credits, tokens, or subscription) before generating a design.

**Why this priority**: Payment transparency builds trust but is not critical for basic functionality. Users can still generate designs without this explicit display.

**Independent Test**: Can be tested by logging in with different user types (trial user, token user, subscriber) and verifying the UI shows the correct payment indicator for each (e.g., "Using Trial Credit", "1 Token", "Unlimited - Subscription").

**Acceptance Scenarios**:

1. **Given** a user with 2 trial credits and 0 tokens, **When** they view the generation page, **Then** the generate button shows "Generate Design (Trial)" and displays "2 trial credits remaining" prominently.

2. **Given** a user with 0 trial credits and 10 tokens, **When** they select 1 area, **Then** the generate button shows "Generate Design (1 Token)" and displays "10 tokens available".

3. **Given** a user with an active Monthly Pro subscription, **When** they select any number of areas, **Then** the generate button shows "Generate Design (Unlimited)" and displays "Active Subscription".

---

### Edge Cases

- What happens when a user's trial credits expire mid-generation? **System completes the current generation (already paid), then shows trial exhausted modal with purchase CTA.**

- How does the system handle concurrent generation requests from the same user? **System blocks the second request with "Generation already in progress" error until first completes.**

- What if the user selects an area but Google Street View imagery is unavailable for that address? **System shows error "Street View not available for this address. Please upload a photo manually" and provides image upload option.**

- What happens when a user refreshes the page during generation? **Generation continues in background, progress is restored via request_id stored in localStorage, polling resumes from current state.**

- How does the system handle users with both trial credits AND tokens? **Authorization hierarchy: subscription > trial > token. Trial credits are used first before tokens.**

- What if a user tries to generate with 0 credits, 0 tokens, and no subscription? **System blocks generation and shows modal: "No payment method available. Purchase tokens or subscribe to Monthly Pro."**

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST display property address input field with autocomplete suggestions from Google Places API
- **FR-002**: System MUST retrieve and display satellite/street view imagery when valid address is entered
- **FR-003**: System MUST allow users to select one or more yard areas (Front Yard, Backyard, Walkway, Side Yard) via checkboxes or toggle buttons
- **FR-004**: System MUST display token/credit cost next to each area (e.g., "Front Yard - 1 token")
- **FR-005**: System MUST provide a style selection dropdown with predefined options (Modern Minimalist, California Native, Japanese Zen, English Garden, Desert Landscape)
- **FR-006**: System MUST show total cost preview before generation starts (e.g., "3 areas = 3 tokens")
- **FR-007**: System MUST implement payment authorization hierarchy: check subscription status FIRST, then trial credits, then token balance
- **FR-008**: System MUST deduct payment (trial/token) atomically BEFORE starting generation to prevent race conditions
- **FR-009**: System MUST display real-time generation progress for each selected area independently
- **FR-010**: System MUST support parallel generation for multiple areas (not sequential)
- **FR-011**: System MUST refund payment if generation fails due to system error or timeout
- **FR-012**: System MUST persist generation progress in localStorage to handle page refresh during generation
- **FR-013**: System MUST show appropriate payment indicator in generate button based on user's payment method (e.g., "Using Trial Credit", "1 Token", "Unlimited")
- **FR-014**: System MUST block generation if user has insufficient payment method and show clear upgrade/purchase CTA
- **FR-015**: System MUST validate all required fields (address OR uploaded image, area selection, style selection) before enabling generate button
- **FR-016**: System MUST show error message and block generation if address cannot be geocoded or Street View unavailable
- **FR-017**: System MUST provide manual image upload option as fallback when address-based imagery fails
- **FR-018**: System MUST prevent concurrent generation requests from same user (block with "Generation in progress" message)
- **FR-019**: System MUST display trial credit balance, token balance, or subscription status prominently in UI
- **FR-020**: System MUST show "Trial Exhausted" modal with purchase CTA when user uses last trial credit

### Key Entities *(include if feature involves data)*

- **Property Address**: User-entered address string, geocoded coordinates (lat/lng), associated Street View imagery, validation status (valid/invalid/unavailable)

- **Yard Area**: Type identifier (front_yard, backyard, walkway, side_yard), selection state (selected/unselected), cost in tokens (1 per area), custom prompt text (optional), generation status (pending/processing/completed/failed)

- **Generation Request**: Unique request_id, user identifier, selected areas list, chosen style, total cost (tokens deducted), payment method used (trial/token/subscription), overall status (pending/processing/completed/partial_failed), creation timestamp

- **Generation Progress**: Per-area progress percentage (0-100), status message ("Analyzing property", "Generating design"), completion timestamp, error message (if failed)

- **Payment Status**: Available trial credits count, token balance, subscription tier (free/monthly_pro), subscription status (active/past_due/canceled), payment method hierarchy result

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: New users can complete their first landscape design generation in under 3 minutes from landing on the generation page
- **SC-002**: System handles 100 concurrent users generating designs without performance degradation
- **SC-003**: Multi-area generation completes all 3 areas in under 90 seconds total (parallel processing), not 180 seconds (sequential)
- **SC-004**: Generation success rate exceeds 95% (excluding user errors like invalid address)
- **SC-005**: Zero instances of negative trial credit or token balance due to race conditions
- **SC-006**: 90% of users successfully select area and style on first attempt without errors
- **SC-007**: Page refresh during generation recovers progress state successfully in 100% of cases
- **SC-008**: Trial-to-paid conversion rate increases by 25% after implementing clear payment method hierarchy display
- **SC-009**: Support tickets related to "generation stuck" or "lost credits" decrease by 80%
- **SC-010**: Users with failed generations receive automatic refunds within 2 seconds in 100% of cases
