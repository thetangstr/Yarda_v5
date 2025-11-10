# Implementation Plan: Magic Link Authentication

**Branch**: `006-magic-link-auth` | **Date**: 2025-11-09 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/006-magic-link-auth/spec.md`

## Summary

Implement passwordless email authentication using Supabase Auth magic links. Users enter their email address, receive a one-time authentication link via email, click the link, and are immediately signed in without a password. This provides a frictionless alternative to traditional password-based login while maintaining security through time-limited (1 hour) single-use tokens.

**Technical Approach** (from research):
- Use Supabase `signInWithOtp()` SDK method - already integrated in existing project
- No database schema changes - Supabase manages tokens internally
- Existing `/auth/callback` handler compatible with magic link flow
- Zero cost - included in Supabase MAU pricing ($0.00325/MAU)

## Technical Context

**Language/Version**: TypeScript 5.6.3 (Frontend), Next.js 15.0.2
**Primary Dependencies**:
- Supabase Auth SDK (`@supabase/supabase-js`)
- React 18
- Zustand (state management)
- Framer Motion (animations)
- Tailwind CSS (styling)

**Storage**:
- Supabase Auth (token management - internal)
- PostgreSQL via Supabase (user sync via existing trigger)
- localStorage (session persistence via Zustand)

**Testing**:
- Playwright for E2E tests
- Manual testing for email deliverability

**Target Platform**: Web (Next.js SSR/CSR hybrid), responsive (mobile-first)

**Project Type**: Web application (frontend + backend architecture)

**Performance Goals**:
- Email delivery time: <60 seconds
- Time to authentication: <2 minutes from link request to successful login
- Email delivery rate: >98% (Supabase SLA)

**Constraints**:
- Link expiration: 1 hour (Supabase default)
- Rate limiting: 3 requests/hour per email (Supabase default, upgradable to 30 with custom SMTP)
- Zero cost increase (must use existing Supabase plan)

**Scale/Scope**:
- Existing user base (~100-1000 users)
- Target 30% adoption within first month
- Email provider compatibility: Gmail, Outlook, Yahoo, iCloud

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

### Pre-Design Gate Results

✅ **I. Component-Based Architecture**
- Will create `MagicLinkForm` component for email input and send logic
- Existing `/auth/callback` handler reused (already modular)
- Clear props interfaces for all components

✅ **II. Type Safety (NON-NEGOTIABLE)**
- TypeScript interfaces for Supabase OTP responses
- Shared types in `types/auth.ts` (if needed)
- Path aliases `@/*` already configured
- Zero `any` types (Supabase SDK provides full type coverage)

✅ **III. Test-First Development (NON-NEGOTIABLE)**
- E2E tests required in `frontend/tests/e2e/magic-link-auth.spec.ts`
- Critical user journey: Request link → Receive email → Click → Authenticated
- Red-Green-Refactor cycle: Write test → Fail → Implement → Pass

✅ **V. State Management**
- Uses existing Zustand `userStore` for session persistence
- No new state slices required (reuses `setUser`, `setAccessToken`)
- Magic link UI state local to component (no global persistence needed)

✅ **VI. API Integration**
- Centralized via `frontend/src/lib/supabase.ts` (existing)
- New function: `sendMagicLink(email: string)` added to existing file
- Error handling for rate limits, email failures
- No timeout needed (Supabase SDK handles)

✅ **VII. Responsive Design**
- Tailwind CSS mobile-first
- Touch-friendly button sizing
- Email input works on mobile keyboards

⚠️ **VIII. Authentication & Authorization**
**CONSTITUTION MISMATCH DETECTED:**
- Constitution states: "Firebase Auth with whitelist enforcement"
- **Actual Implementation**: Supabase Auth (already in production)
- **Resolution**: Magic link extends existing Supabase Auth - NO BLOCKING ISSUE
- Existing `auth.users` → `public.users` sync trigger handles user creation
- New user blocking (maintenance mode) already implemented in `/auth/callback`

✅ **IX. CI/CD Pipeline (NON-NEGOTIABLE)**
- Automated testing via GitHub Actions (existing)
- Playwright E2E tests will run on PR preview
- Vercel preview deployment for manual UAT
- Production deployment on merge to `main`

### Post-Design Gate Results

**Evaluation Date**: 2025-11-09 (Phase 1 Complete)

✅ **I. Component-Based Architecture**
- Created reusable `MagicLinkForm` component pattern (contracts/supabase-otp-api.md)
- Modular email validation function (data-model.md line 205-214)
- Existing `/auth/callback` remains unchanged (single responsibility)
- Clear separation: UI → Supabase SDK → Callback handler
- **Status**: PASS ✅

✅ **II. Type Safety (NON-NEGOTIABLE)**
- Full TypeScript interfaces defined in contracts/supabase-otp-api.md:
  - `SendMagicLinkRequest`, `SendMagicLinkResponse`
  - `MagicLinkCallbackParams`, `MagicLinkError`
  - `UserSession` with complete type definitions
- Zero `any` types - all Supabase SDK responses typed
- Path aliases `@/*` used consistently
- **Status**: PASS ✅

✅ **III. Test-First Development (NON-NEGOTIABLE)**
- E2E test patterns documented in contracts/supabase-otp-api.md (lines 451-498)
- Test cases defined:
  - Happy path (send → click → authenticate)
  - Rate limiting (4 requests in 1 hour)
  - Expired tokens (> 1 hour)
  - Invalid tokens (already used)
  - Cross-device authentication
- Red-Green-Refactor cycle planned in tasks.md (next phase)
- **Status**: PASS ✅

✅ **V. State Management**
- Uses existing Zustand `userStore` (no new state slices)
- Session stored in localStorage + httpOnly cookies (data-model.md lines 99-103)
- Transient UI state (loading, sent) scoped to component
- No global magic link state pollution
- **Status**: PASS ✅

✅ **VI. API Integration**
- Centralized via `supabase.auth.signInWithOtp()` SDK method
- Error handling for all error codes: `over_email_send_rate_limit`, `otp_expired`, `invalid_credentials`
- No timeout needed (Supabase SDK handles retries)
- User-friendly error messages defined (contracts/supabase-otp-api.md lines 378-419)
- **Status**: PASS ✅

✅ **VII. Responsive Design**
- Email input optimized for mobile keyboards (type="email")
- Touch-friendly button sizing (quickstart.md line 61-77)
- Loading states prevent double-clicks
- Success message responsive layout
- **Status**: PASS ✅

⚠️ **VIII. Authentication & Authorization**
- **Constitution Mismatch**: References "Firebase Auth" but project uses "Supabase Auth"
- **Actual Implementation**: Magic links extend existing Supabase Auth (correct)
- **User Sync**: Existing `auth.users` → `public.users` trigger handles new users
- **Maintenance Mode**: New user blocking already implemented in `/auth/callback`
- **Recommendation**: Update constitution.md to reflect Supabase Auth (non-blocking)
- **Status**: PASS with NOTE ⚠️

✅ **IX. CI/CD Pipeline (NON-NEGOTIABLE)**
- GitHub Actions workflow exists (no changes needed)
- Playwright E2E tests will run automatically on PR
- Vercel preview deployments for manual testing
- Production deployment on merge to `main`
- Zero infrastructure changes required
- **Status**: PASS ✅

---

**Overall Gate Status**: **PASS** ✅

**Summary**:
- 8/9 principles: PASS ✅
- 1/9 principles: PASS with NOTE ⚠️ (outdated documentation, not blocking)
- Zero violations requiring justification
- Zero architectural compromises
- Feature fully aligned with constitution principles

**Recommendation**: Proceed to Phase 2 (Implementation). Optional follow-up: Update constitution.md to replace "Firebase Auth" references with "Supabase Auth" (estimated 5 minutes, non-blocking).

## Project Structure

### Documentation (this feature)

```text
specs/006-magic-link-auth/
├── plan.md              # This file (/speckit.plan command output)
├── research.md          # Phase 0: Supabase OTP best practices, email deliverability
├── data-model.md        # Phase 1: User entity updates (none needed)
├── quickstart.md        # Phase 1: Developer setup guide
├── contracts/           # Phase 1: Supabase Auth API contracts
│   └── supabase-otp-api.md
└── tasks.md             # Phase 2: Implementation tasks (/speckit.tasks command)
```

### Source Code (repository root)

```text
frontend/
├── src/
│   ├── lib/
│   │   └── supabase.ts              # ✏️ MODIFY: Add sendMagicLink() function
│   ├── pages/
│   │   ├── login.tsx                 # ✏️ MODIFY: Add magic link UI section
│   │   └── auth/
│   │       └── callback.tsx          # ✅ NO CHANGE: Already handles magic links
│   ├── store/
│   │   └── userStore.ts              # ✅ NO CHANGE: Existing session management
│   └── types/
│       └── auth.ts                   # 🆕 CREATE: Magic link types (optional)
└── tests/
    └── e2e/
        └── magic-link-auth.spec.ts    # 🆕 CREATE: E2E tests

backend/
└── [NO CHANGES REQUIRED - Supabase handles backend]

supabase/
└── [NO SCHEMA CHANGES - Auth tables managed by Supabase]
```

**Structure Decision**:
Web application pattern (Option 2 from template). Frontend-only changes since Supabase Auth SDK handles all backend logic including token generation, email sending, and validation. Existing authentication callback infrastructure at `/auth/callback` is compatible with magic links.

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

**No violations requiring justification.**

**Note on Constitution Mismatch:**
- Constitution references "Firebase Auth" but project uses "Supabase Auth"
- This is not a violation of principles - just outdated documentation
- Magic link feature follows all architectural principles (component-based, type-safe, tested, etc.)
- Recommend constitution update as follow-up task (not blocking)

---

## Phase 0: Research & Investigation

**Objective**: Resolve all "NEEDS CLARIFICATION" items and gather implementation best practices.

### Research Tasks

1. **Supabase OTP API Patterns**
   - Research: How to use `signInWithOtp()` method correctly
   - Research: Error codes and rate limiting behavior
   - Research: Email template customization options
   - **Output**: `research.md` - Section 1

2. **Email Deliverability Best Practices**
   - Research: How to avoid spam filters
   - Research: Required email content for trust/security
   - Research: Testing email delivery (Mailtrap, MailHog alternatives)
   - **Output**: `research.md` - Section 2

3. **Rate Limiting Strategy**
   - Research: Default vs custom SMTP rate limits
   - Research: User-friendly error messages for rate limits
   - Research: Alternative auth methods when rate limited
   - **Output**: `research.md` - Section 3

4. **Session Management Patterns**
   - Research: How Supabase stores session (cookies vs localStorage)
   - Research: Auto-refresh token behavior
   - Research: Cross-device session handling
   - **Output**: `research.md` - Section 4

### Research Deliverable

File: `research.md` containing:
- Decision: Use Supabase default SMTP (free tier) for MVP
- Rationale: Zero cost, 3/hour rate limit sufficient for MVP testing
- Alternatives considered: SendGrid ($15/month), AWS SES ($0.10/1000)
- Decision: 1-hour link expiration (Supabase default)
- Rationale: Balance between security and user convenience
- Implementation patterns: Code examples for `signInWithOtp()` usage

---

## Phase 1: Design & Contracts

**Prerequisites:** `research.md` complete

### Data Model

**File**: `data-model.md`

**Entities**:
- **User** (existing entity - NO CHANGES)
  - Magic link authentication uses same user record
  - Supabase `auth.users` → `public.users` sync via existing trigger

- **Magic Link Token** (Supabase-managed - NO DATABASE CHANGES)
  - Managed entirely by Supabase Auth internally
  - Attributes: email, token_hash, expires_at (1 hour)
  - Not exposed in our database schema

- **User Session** (existing pattern - NO CHANGES)
  - Attributes: access_token, refresh_token, expires_at
  - Stored in localStorage + httpOnly cookies (Supabase default)

**State Transitions**:
```
[User enters email] → [Magic link sent] → [Email delivered]
                                        ↓
                            [User clicks link] → [Token validated]
                                                        ↓
                                          [Session created] → [Authenticated]
```

**Validation Rules**:
- Email format: RFC 5322 compliant
- Rate limit: Max 3 requests/hour per email
- Link validity: 1 hour from generation
- Single use: Token invalidated after first use

### API Contracts

**Directory**: `contracts/`

**File**: `supabase-otp-api.md`

```typescript
// Frontend → Supabase Auth
interface SendMagicLinkRequest {
  email: string;  // Required, validated
  options?: {
    emailRedirectTo?: string;  // Callback URL (default: /auth/callback)
  };
}

interface SendMagicLinkResponse {
  user: null;  // No user object until link clicked
  session: null;  // No session until link clicked
  error?: {
    message: string;
    status: 400 | 429;  // 400: Invalid email, 429: Rate limited
  };
}

// Supabase → Frontend (via /auth/callback URL)
interface MagicLinkCallbackParams {
  access_token: string;  // JWT token
  refresh_token: string;  // Refresh token
  expires_in: number;  // Token expiration (seconds)
  token_type: 'bearer';
  type: 'magiclink';  // Identifies auth method
}

// Error Responses
interface MagicLinkError {
  code: 'otp_disabled' | 'over_email_send_rate_limit' | 'otp_expired';
  message: string;
}
```

**Existing Endpoint (No Changes)**:
- `GET /auth/callback` - Already handles magic link tokens via Supabase SDK

### Quickstart Guide

**File**: `quickstart.md`

**Developer Setup**:
1. Ensure Supabase project has email auth enabled (already configured)
2. Configure email template in Supabase dashboard (optional - defaults work)
3. Set environment variables (already set):
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
4. Run frontend: `npm run dev`
5. Test magic link: Enter email → Check inbox → Click link

**Testing Magic Links Locally**:
- Option 1: Use real email address (recommended for E2E)
- Option 2: Supabase dashboard → Auth → Users → View sent emails
- Option 3: Mailtrap.io for email capture (not needed for MVP)

**Email Template Customization** (optional):
- Supabase Dashboard → Authentication → Email Templates → Magic Link
- Customize subject, body, button text
- Include Yarda branding (logo, colors)

### Agent Context Update

**Command**: `.specify/scripts/bash/update-agent-context.sh claude`

**New Technology Added**:
- Supabase Magic Link authentication via `signInWithOtp()`
- Email-based passwordless auth pattern
- One-time use token validation

**Preserved Manual Additions**: All existing CLAUDE.md content maintained

---

## Next Steps

After completing Phase 1 (/speckit.plan):
1. **Review generated artifacts**: research.md, data-model.md, contracts/, quickstart.md
2. **Run /speckit.tasks**: Generate actionable implementation tasks
3. **Execute tasks**: Implement features following TDD (tests first)
4. **Manual UAT**: Test email delivery and user flow end-to-end
5. **Production deployment**: Merge to main after all tests pass

---

**Plan Status**: Phase 0-1 Ready for Execution
**Estimated Implementation Time**: 4-6 hours (including testing)
**Risk Level**: LOW (leverages existing Supabase Auth infrastructure)
