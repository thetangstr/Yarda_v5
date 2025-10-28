# Feature Specification: Data Model for Landscape Design Platform

**Feature Branch**: `001-data-model`
**Created**: 2025-10-28
**Status**: Draft
**Input**: User description: "Phase 1.1: Data Model for user registration, trial credit tracking, design generation history, and rate limiting using Supabase PostgreSQL"

## User Scenarios & Testing *(mandatory)*

<!--
  IMPORTANT: User stories should be PRIORITIZED as user journeys ordered by importance.
  Each user story/journey must be INDEPENDENTLY TESTABLE - meaning if you implement just ONE of them,
  you should still have a viable MVP (Minimum Viable Product) that delivers value.
  
  Assign priorities (P1, P2, P3, etc.) to each story, where P1 is the most critical.
  Think of each story as a standalone slice of functionality that can be:
  - Developed independently
  - Tested independently
  - Deployed independently
  - Demonstrated to users independently
-->

### User Story 1 - New User Registration and Trial Credits (Priority: P1)

As a new user, I want to register for the platform and receive free trial credits so I can try the landscape design generation service before committing to a purchase.

**Why this priority**: This is the entry point for all users into the platform. Without registration and trial credits, users cannot experience the core value proposition.

**Independent Test**: Can be fully tested by registering a new user account and verifying they receive 3 trial credits that are visible in their account.

**Acceptance Scenarios**:

1. **Given** a visitor on the registration page, **When** they submit valid email and password, **Then** an account is created with 3 trial credits
2. **Given** a newly registered user, **When** they view their account, **Then** they see exactly 3 available trial credits
3. **Given** an unverified email address, **When** the user tries to generate a design, **Then** they are prompted to verify their email first

---

### User Story 2 - Design Generation with Trial Consumption (Priority: P1)

As a registered user with trial credits, I want to generate landscape designs using my credits so I can visualize improvements to my property.

**Why this priority**: This is the core value delivery mechanism of the platform. Users need to successfully consume trials to experience the product.

**Independent Test**: Can be tested by using trial credits to generate designs and verifying credit deduction and generation history.

**Acceptance Scenarios**:

1. **Given** a user with trial credits remaining, **When** they request a design generation, **Then** one trial credit is consumed and generation begins
2. **Given** a user with zero trial credits, **When** they attempt to generate a design, **Then** they receive a message about purchasing tokens
3. **Given** multiple rapid generation requests, **When** processed simultaneously, **Then** only one trial credit is consumed per successful generation

---

### User Story 3 - Generation History Tracking (Priority: P2)

As a user, I want to view all my past design generations so I can compare different design options and download previous results.

**Why this priority**: Users need to access their generation history to compare designs and retrieve past work, essential for decision-making.

**Independent Test**: Can be tested by generating multiple designs and verifying they all appear in the user's history with correct details.

**Acceptance Scenarios**:

1. **Given** a user with past generations, **When** they access their history, **Then** all generations are displayed with creation dates and status
2. **Given** a completed generation, **When** viewing its details, **Then** the style, input image/address, and output design are accessible
3. **Given** a failed generation, **When** viewing its details, **Then** the error reason is displayed

---

### User Story 4 - Rate Limiting Protection (Priority: P2)

As the platform operator, I want to limit users to a reasonable number of generation requests per minute to prevent abuse and ensure fair resource distribution.

**Why this priority**: Protects platform resources and ensures quality of service for all users by preventing abuse.

**Independent Test**: Can be tested by attempting multiple rapid generations and verifying the rate limit is enforced after 3 attempts per minute.

**Acceptance Scenarios**:

1. **Given** a user making generation requests, **When** they make 3 requests within 60 seconds, **Then** the 4th request is temporarily blocked
2. **Given** a rate-limited user, **When** 60 seconds have passed since their first request, **Then** they can make new generation requests
3. **Given** multiple users on the platform, **When** one user hits rate limits, **Then** other users are not affected

---

### User Story 5 - Token Account Management (Priority: P3)

As a user who has exhausted trial credits, I want to have a token account ready for future purchases so I can continue using the service.

**Why this priority**: Foundation for future monetization, but not critical for initial trial experience.

**Independent Test**: Can be tested by verifying token accounts are created with zero balance and ready for future token purchases.

**Acceptance Scenarios**:

1. **Given** a newly registered user, **When** their account is created, **Then** a token account with zero balance is automatically created
2. **Given** a user with a token account, **When** viewing their account, **Then** they can see their current token balance
3. **Given** a user with tokens, **When** trials are exhausted, **Then** the system is ready to consume tokens for generation

### Edge Cases

- What happens when a user rapidly clicks "Generate" multiple times?
- How does the system handle concurrent generation attempts from the same user?
- What occurs if email verification fails or times out?
- How does the system respond when database constraints are violated?
- What happens if a generation starts but the user's trial credits are consumed by another process?

## Requirements *(mandatory)*

<!--
  ACTION REQUIRED: The content in this section represents placeholders.
  Fill them out with the right functional requirements.
-->

### Functional Requirements

- **FR-001**: System MUST create user accounts with unique email addresses
- **FR-002**: System MUST allocate exactly 3 trial credits to each new user upon registration
- **FR-003**: System MUST track email verification status and restrict certain actions for unverified users, with verification links expiring after 1 hour
- **FR-004**: System MUST atomically consume one trial credit per successful generation request, or refund the credit if generation fails for any reason
- **FR-005**: System MUST prevent trial credit balance from going negative
- **FR-006**: System MUST record complete generation history including inputs, image URL references, and status
- **FR-007**: System MUST enforce rate limiting of maximum 3 generation attempts per user per minute using a rolling window (resetting as oldest requests leave the 60-second window)
- **FR-008**: System MUST track both successful and failed generation attempts with appropriate error messages, automatically refunding credits for failed attempts
- **FR-009**: System MUST maintain user data isolation ensuring users can only access their own data
- **FR-010**: System MUST create token accounts for future paid credit purchases
- **FR-011**: System MUST track generation duration and completion timestamps for analytics
- **FR-012**: System MUST support both photo upload and text address as property input methods
- **FR-013**: System MUST store user-selected design style and optional custom prompts with each generation
- **FR-014**: System MUST handle concurrent requests without double-consuming credits or creating race conditions
- **FR-015**: System MUST automatically clean up rate limiting data older than the configured time window
- **FR-016**: System MUST consume trial credits before paid tokens when both are available

### Key Entities

- **User**: Represents a registered platform user with authentication credentials, email verification status, and trial credit balance
- **Token Account**: Represents a user's paid token balance for future purchases, maintaining a non-negative integer balance
- **Generation**: Represents a single design generation attempt including input data (photo/address), selected style, output image URL reference, processing status, and timing metrics
- **Generation Attempt**: Represents rate limiting records tracking when users attempt generations to enforce per-minute limits

## Success Criteria *(mandatory)*

<!--
  ACTION REQUIRED: Define measurable success criteria.
  These must be technology-agnostic and measurable.
-->

### Measurable Outcomes

- **SC-001**: New users receive exactly 3 trial credits within 1 second of registration
- **SC-002**: Trial credit consumption completes atomically in under 500 milliseconds
- **SC-003**: System prevents more than 3 generation attempts per user within any 60-second window
- **SC-004**: User registration and initial setup completes in under 2 seconds
- **SC-005**: Generation history loads for users with up to 100 past generations in under 1 second
- **SC-006**: Zero instances of double credit consumption under concurrent request scenarios
- **SC-007**: 100% of users can only access their own data (complete data isolation)
- **SC-008**: Rate limit enforcement activates within 100 milliseconds of exceeding threshold
- **SC-009**: Failed generations store diagnostic error messages 100% of the time
- **SC-010**: System maintains data integrity with zero negative credit balances

## Assumptions

- Users will have valid email addresses for registration
- The platform will use session-based authentication for user access
- Generation processing happens asynchronously after credit consumption
- Rate limiting is per-user, not per-IP address
- Trial credits are non-transferable and non-refundable
- Token purchases will be handled through a separate payment system in a future phase
- Email verification will use standard confirmation link patterns
- Generation images will be stored separately from the data model
- The system will implement standard password security requirements
- Data retention follows standard practices for user-generated content platforms

## Clarifications

### Session 2025-10-28

- Q: How long should email verification links remain valid? → A: 1 hour expiration for security
- Q: What rate limit window behavior should be implemented? → A: Rolling/sliding window (reset when oldest request leaves 60-second window)
- Q: How should failed generations be handled regarding credits? → A: Automatically refund credit if generation fails for any reason
- Q: How should generation images be stored in the data model? → A: Store only references/URLs to externally stored images
- Q: When users have both trial and paid tokens, which should be consumed first? → A: Always consume trial credits first, then paid tokens

## Out of Scope

- Payment processing and token purchase flows
- Actual image generation logic and AI integration
- Email sending and verification mechanisms
- Image storage and CDN delivery
- Admin interfaces for user management
- Social features or sharing capabilities
- Multi-language support
- Mobile application data requirements
- Advanced analytics and reporting
- User profile customization beyond basics
