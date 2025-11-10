# Feature Specification: Magic Link Authentication

**Feature Branch**: `006-magic-link-auth`
**Created**: 2025-11-09
**Status**: Draft
**Input**: User description: "implement magic link so the user can authenticate once (per device) from a link in their browser or text msg"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Send and Authenticate with Email Magic Link (Priority: P1)

User receives a one-time authentication link via email, clicks it, and is immediately signed in to Yarda without entering a password. This provides the core passwordless authentication experience.

**Why this priority**: This is the MVP - the fundamental value proposition of magic link authentication. Without this, the feature has no value.

**Independent Test**: Can be fully tested by entering an email address, clicking "Send Magic Link", receiving the email, clicking the link, and being redirected to `/generate` as an authenticated user. This delivers immediate value as a frictionless alternative to password login.

**Acceptance Scenarios**:

1. **Given** user is on `/login` page, **When** user enters email and clicks "Send Magic Link", **Then** success message "Check your email for a magic link!" appears
2. **Given** magic link email is sent, **When** email arrives within 60 seconds, **Then** email contains clickable "Sign in to Yarda" button
3. **Given** user receives magic link email, **When** user clicks the link, **Then** user is authenticated and redirected to `/generate` page
4. **Given** user is authenticated via magic link, **When** user closes and reopens browser, **Then** user remains authenticated (session persists)
5. **Given** magic link is clicked once, **When** same link is clicked again, **Then** error message "This link has already been used" appears

---

### User Story 2 - Handle Expired Magic Links (Priority: P2)

User receives clear feedback when clicking an expired magic link (after 1 hour) and can easily request a new one.

**Why this priority**: Critical for user experience and security. Without this, users clicking old links would be confused and potentially locked out.

**Independent Test**: Request a magic link, wait 61 minutes (or manipulate token timestamp in test environment), click the link, and verify "This link has expired. Please request a new one." message appears with a "Request New Magic Link" button that works correctly.

**Acceptance Scenarios**:

1. **Given** magic link was sent 61 minutes ago, **When** user clicks the link, **Then** error page shows "This link has expired. Please request a new one."
2. **Given** user sees expired link error, **When** user clicks "Request New Magic Link" button, **Then** user is redirected to `/login` with email pre-filled
3. **Given** user requests new magic link after expiration, **When** new link is sent, **Then** new link works correctly and old link remains invalid

---

### User Story 3 - Rate Limiting Protection (Priority: P3)

System prevents magic link abuse by limiting requests to 3 per hour per email address, with clear messaging when limit is exceeded.

**Why this priority**: Important for system security and cost control, but not essential for MVP. Users can still authenticate via password if rate limited.

**Independent Test**: Request 4 magic links within 1 hour for the same email address. First 3 succeed, 4th shows error "Too many requests. Please try again in a few minutes." After 1 hour, can request again successfully.

**Acceptance Scenarios**:

1. **Given** user has requested 3 magic links in past hour, **When** user requests 4th magic link, **Then** error message "Too many requests. Please try again in a few minutes." appears
2. **Given** user hit rate limit, **When** 1 hour has passed, **Then** user can successfully request new magic link
3. **Given** user hit rate limit, **When** user tries password login instead, **Then** password login works normally (not blocked)
4. **Given** rate limit error appears, **When** user sees the message, **Then** alternative authentication option (password login) is clearly visible

---

### Edge Cases

- What happens when user's email provider blocks/delays the magic link email?
  - Display: "Email sent! Check your inbox and spam folder. Didn't receive it? Try again in a few minutes."
  - User can request another link after waiting (subject to rate limits)

- What happens when user clicks magic link on different device than requested?
  - Magic link works on any device (device-independent authentication)
  - Session is created on the device where link was clicked

- What happens when user clicks magic link while already authenticated?
  - If same user: Refresh session and redirect to `/generate`
  - If different user: Sign out current user, sign in as link user, redirect to `/generate`

- What happens when Supabase email service is down?
  - API returns error, frontend shows: "Unable to send email at this time. Please try password login or try again later."
  - Fallback to password authentication remains available

- What happens when user enters invalid/malformed email?
  - Frontend validates email format before sending
  - Error message: "Please enter a valid email address"
  - Magic link request is not sent

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST send one-time authentication link to user's email address using Supabase `signInWithOtp()` method
- **FR-002**: System MUST validate email format before sending magic link
- **FR-003**: System MUST expire magic links after 1 hour (Supabase default)
- **FR-004**: System MUST limit magic link requests to 3 per hour per email address (Supabase default rate limit)
- **FR-005**: System MUST authenticate user when valid magic link is clicked
- **FR-006**: System MUST redirect authenticated user to `/generate` page after magic link authentication
- **FR-007**: System MUST persist user session after magic link authentication (localStorage + httpOnly cookies)
- **FR-008**: System MUST invalidate magic link after first use (prevent replay attacks)
- **FR-009**: System MUST display clear error messages for expired, invalid, or rate-limited magic links
- **FR-010**: System MUST allow magic links to work across any device (device-independent)
- **FR-011**: System MUST maintain password authentication as alternative when magic link unavailable
- **FR-012**: System MUST sync authenticated user from `auth.users` to `public.users` using existing database trigger

### Key Entities *(include if feature involves data)*

- **Magic Link Token**: Secure one-time token generated by Supabase Auth
  - Attributes: email, token hash, expiration timestamp (1 hour)
  - Managed entirely by Supabase (no database schema changes required)

- **User Session**: Authenticated session created upon successful magic link validation
  - Attributes: access_token, refresh_token, user_id, expiration
  - Persisted in localStorage (Zustand) and httpOnly cookies (Supabase)

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Magic link success rate >95% (% of sent links that result in successful authentication)
- **SC-002**: Time to authentication <2 minutes from magic link request to successful login
- **SC-003**: Email delivery rate >98% (Supabase SLA for email delivery)
- **SC-004**: User adoption rate >30% of logins use magic link within first month post-launch
- **SC-005**: Link expiration rate <5% (% of magic links that expire before user clicks)
- **SC-006**: Rate limit encounter rate <1% (% of users who hit rate limit)
- **SC-007**: Zero cost increase (magic links included in existing Supabase MAU pricing at $0.00325/MAU)
- **SC-008**: Error rate <2% (% of magic link requests that result in system errors)
