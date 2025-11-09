# Feature Specification: Port V2 Generation Flow to V5

**Feature Branch**: `005-port-v2-generation`
**Created**: 2025-11-07
**Status**: Draft
**Input**: User description: "port v2 to v5, make sure everything is connected to our backend as well."

## Context

Yarda v2 has a proven, delightful generation flow with superior UX. Users complete the entire generation process on a single page with inline progress and results. The flow includes interactive features like suggested prompts, emoji-based iconography, and smooth animations that create an engaging experience. v5 currently uses a more complex multi-page flow that requires navigation between generation, progress, and results pages.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Single-Page Generation Experience (Priority: P1)

As a user, I want to create landscape designs without navigating between different pages, so I can maintain context and have a seamless experience from start to finish.

**Why this priority**: Core UX improvement that directly impacts user satisfaction and reduces friction. This is the foundation that all other improvements build upon.

**Independent Test**: Can be fully tested by completing a generation from form fill to viewing results without any page navigation, delivering a continuous single-page experience.

**Acceptance Scenarios**:

1. **Given** I am on the generate page, **When** I submit the generation form, **Then** I remain on the same page and see progress updates inline below the form
2. **Given** generation is in progress, **When** I scroll up, **Then** I can still see the form I submitted while progress continues below
3. **Given** generation completes successfully, **When** results appear, **Then** they display inline on the same page without navigation
4. **Given** I complete a generation, **When** I want to create another, **Then** I can modify the form and submit again without leaving the page

---

### User Story 2 - Interactive Suggested Prompts (Priority: P2)

As a user, I want to quickly select from suggested design ideas for each yard area, so I can get inspiration and speed up the form filling process.

**Why this priority**: Significantly reduces cognitive load and speeds up task completion. Provides value immediately when user selects a yard area.

**Independent Test**: Can be fully tested by selecting a yard area and clicking suggested prompts, verifying they populate the custom prompt field and are limited to 3 selections.

**Acceptance Scenarios**:

1. **Given** I select a yard area (front yard, back yard, or walkway), **When** the selection expands, **Then** I see 5 suggested prompts specific to that area displayed as clickable chips with relevant emojis
2. **Given** I see suggested prompts, **When** I click on a prompt chip, **Then** it is added to the custom prompt textarea and the chip shows a visual selected state with a checkmark
3. **Given** I have 3 prompts selected, **When** I try to click a 4th prompt, **Then** the 4th prompt chip is disabled and shows a visual disabled state
4. **Given** I have selected prompts, **When** I click a selected prompt again, **Then** it is removed from the textarea and the chip returns to unselected state
5. **Given** I manually type in the textarea, **When** I add or remove text matching a suggested prompt, **Then** the corresponding chip updates its selected state accordingly

---

### User Story 3 - Visual Design Enhancements (Priority: P2)

As a user, I want to experience a visually delightful interface with smooth animations and clear visual feedback, so I understand what's happening and feel engaged with the process.

**Why this priority**: Creates emotional connection and reduces user anxiety during generation. Makes the interface feel polished and professional.

**Independent Test**: Can be fully tested by interacting with any component and verifying smooth animations, gradient backgrounds, and emoji icons appear correctly.

**Acceptance Scenarios**:

1. **Given** I select a yard area, **When** the selection is made, **Then** I see smooth expand/collapse animation for the prompt section with gradient background transition
2. **Given** I select a style, **When** the selection is made, **Then** I see an animated selection indicator with a number (1, 2, or 3) appear in the top-right corner
3. **Given** I interact with any selectable item, **When** I hover over it, **Then** I see smooth scale and shadow transitions providing clear feedback
4. **Given** I view style or area options, **When** I look at the icons, **Then** I see emoji icons (🏠 🌲 🌸) instead of SVG icon components
5. **Given** I have items selected, **When** I view the summary, **Then** I see an animated pulse indicator showing my selection count

---

### User Story 4 - Session Recovery and Persistence (Priority: P3)

As a user, I want my generation to be recoverable if I accidentally close the browser or lose connection, so I don't lose my work and can see my results when I return.

**Why this priority**: Safety net that prevents frustration but doesn't affect the core happy path experience.

**Independent Test**: Can be fully tested by starting a generation, closing the browser, reopening it, and verifying the generation recovers with results displayed.

**Acceptance Scenarios**:

1. **Given** I submit a generation request, **When** the request starts processing, **Then** the request ID and selected areas are saved to localStorage
2. **Given** I have a generation in progress, **When** I close and reopen the browser, **Then** the page checks localStorage and attempts to recover my generation
3. **Given** my generation completed while I was away, **When** I return and the page loads, **Then** I see my completed results displayed inline
4. **Given** my generation is still processing, **When** I return to the page, **Then** I see the current progress status and continue polling for updates
5. **Given** my generation completed successfully, **When** results are displayed, **Then** the localStorage entry is cleared to prevent stale data

---

### User Story 5 - Backend Integration with Polling (Priority: P1)

As a user, I want to see real-time progress updates while my landscape design is being generated, so I know the system is working and approximately how long I need to wait.

**Why this priority**: Critical for user confidence and reduces perceived wait time. Must work correctly to prevent user abandonment.

**Independent Test**: Can be fully tested by submitting a generation and verifying progress updates appear every 2 seconds until completion.

**Acceptance Scenarios**:

1. **Given** I submit a valid generation request, **When** the backend accepts it, **Then** I receive a request_id and polling begins immediately
2. **Given** polling is active, **When** each poll occurs (every 2 seconds), **Then** I see updated progress information for each selected yard area
3. **Given** an area completes, **When** the poll detects completion, **Then** I see that area's status update to "completed" and the generated image appears
4. **Given** all areas complete or fail, **When** the final poll detects this, **Then** polling stops and I see a completion or error message
5. **Given** polling has been running for 5 minutes, **When** the timeout is reached, **Then** polling stops and I see a timeout error message with option to refresh

---

### Edge Cases

- What happens when the user submits a generation while another generation is still in progress?
- How does the system handle network interruptions during polling?
- What happens if the user manually edits the form while viewing completed results?
- How does the system handle partial failures (some areas succeed, others fail)?
- What happens if localStorage is full or disabled?
- How does the system handle very long custom prompts (e.g., > 500 characters)?
- What happens if the user selects an area but provides no prompt?
- How does the system behave on slow connections where polling responses take > 2 seconds?

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST display all generation controls (address, yard areas, styles, submit button) on a single page without navigation
- **FR-002**: System MUST show suggested prompts (5 per yard area) when a yard area is selected
- **FR-003**: System MUST limit suggested prompt selections to a maximum of 3 per yard area
- **FR-004**: System MUST add selected prompts to the custom prompt textarea with comma separation
- **FR-005**: System MUST allow users to deselect suggested prompts by clicking them again
- **FR-006**: System MUST use emoji icons for all visual indicators (areas, styles, prompts)
- **FR-007**: System MUST display progress updates inline below the form on the same page
- **FR-008**: System MUST poll the backend generation status endpoint every 2 seconds
- **FR-009**: System MUST display results inline on the same page when generation completes
- **FR-010**: System MUST save request_id and selected areas to localStorage when generation starts
- **FR-011**: System MUST attempt to recover in-progress or completed generations from localStorage on page load
- **FR-012**: System MUST clear localStorage entries when results are successfully displayed
- **FR-013**: System MUST stop polling after 5 minutes and display a timeout message
- **FR-014**: System MUST handle partial failures by displaying completed areas and noting failed ones
- **FR-015**: System MUST show smooth animations for expand/collapse, selection, and state transitions using Framer Motion
- **FR-016**: System MUST apply gradient background colors to selected items (areas and styles)
- **FR-017**: System MUST show numbered selection indicators (1, 2, 3) for style selections
- **FR-018**: System MUST allow users to start a new generation without page refresh after viewing results
- **FR-019**: System MUST integrate with the v5 backend `/v1/generations` endpoint for submission
- **FR-020**: System MUST integrate with the v5 backend generation status polling endpoint

### Key Entities

- **Yard Area**: Represents a selectable area of the property (front yard, back yard, walkway). Contains: id, name, emoji icon, selected state, custom prompt text, suggested prompts array
- **Style**: Represents a landscape design style. Contains: id, name, description, emoji icon, selection order number (1-3)
- **Generation Request**: Represents an active or completed generation. Contains: request_id, address, selected areas, selected styles, status, results per area
- **Suggested Prompt**: Represents a pre-defined prompt option for a yard area. Contains: text, emoji indicator, selected state
- **Area Result**: Represents the generation output for one yard area. Contains: area_id, status (pending/processing/completed/failed), image URLs, error message if failed

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Users can complete a generation from form submission to viewing results without any page navigation or redirects
- **SC-002**: Users can select suggested prompts and see them populate the custom prompt field in under 1 second
- **SC-003**: Progress updates appear on screen within 2 seconds of backend status changes
- **SC-004**: 95% of in-progress generations that are interrupted (browser close) successfully recover when the user returns
- **SC-005**: All visual state transitions (select, hover, expand) complete within 300ms for smooth perceived performance
- **SC-006**: Users can initiate a new generation within 5 seconds of completing a previous one without page reload
- **SC-007**: Suggested prompt selection reduces average form completion time by 40% compared to manual entry
- **SC-008**: Zero page navigation events occur during the entire generation flow (form → progress → results)

## Assumptions

- The v5 backend already has the `/v1/generations` POST endpoint for creating generations
- The v5 backend already has a status polling endpoint that returns per-area progress
- The backend response format matches the v2 format or can be easily adapted
- Framer Motion is already available in the v5 frontend dependencies
- The Google Maps API key and integration are already configured in v5
- Users have JavaScript enabled and localStorage available (graceful degradation for localStorage failures)
- Network latency for polling requests is typically under 500ms
- The browser supports modern CSS features (gradients, transforms, animations)

## Dependencies

- v5 backend generation endpoints must be functional and return consistent response formats
- Google Maps API integration must be working for address autocomplete
- Frontend routing must support client-side only (no forced page reloads during generation)
- State management (Zustand) must support persisting and restoring generation state

## Scope Boundaries

### In Scope

- Porting all v2 UI components for the generation flow (address input, yard selector, style selector)
- Implementing single-page experience with inline progress and results
- Adding suggested prompts system with clickable chips
- Integrating with v5 backend endpoints
- Adding localStorage-based session recovery
- Implementing all v2 visual enhancements (emojis, gradients, animations)
- Polling for generation progress every 2 seconds
- Handling partial failures and timeout scenarios

### Out of Scope

- Changes to backend API design or response formats (use existing v5 endpoints)
- Authentication or payment flow changes
- Gallery management or viewing past generations
- Download or sharing functionality for results
- Multi-language support for suggested prompts
- Admin or analytics features
- Mobile-specific UI optimizations beyond responsive design
- Advanced error recovery (manual retry with different parameters)
