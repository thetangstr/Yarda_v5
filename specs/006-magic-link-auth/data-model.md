# Data Model: Magic Link Authentication

**Feature**: 006-magic-link-auth
**Date**: 2025-11-09

## Overview

Magic link authentication leverages existing Supabase Auth infrastructure. **No database schema changes required** - all token management is handled internally by Supabase.

## Entities

### User (Existing - No Changes)

**Table**: `public.users`

**Attributes**:
```sql
CREATE TABLE users (
  id UUID PRIMARY KEY REFERENCES auth.users(id),
  email TEXT NOT NULL,
  email_verified BOOLEAN DEFAULT false,
  trial_remaining INTEGER DEFAULT 3,
  trial_used INTEGER DEFAULT 0,
  subscription_tier TEXT DEFAULT 'free',
  subscription_status TEXT DEFAULT 'inactive',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

**Magic Link Impact**:
- No schema changes required
- Existing `auth.users` → `public.users` sync trigger handles new users
- Email verified set to `true` after magic link authentication (Supabase automatic)

**Relationships**:
- One user → many generations
- One user → many token transactions
- One user → zero or one active subscription

---

### Magic Link Token (Supabase-Managed - Not Exposed)

**Internal Table**: `auth.one_time_tokens` (Supabase managed)

**Attributes** (internal, not directly accessible):
```typescript
interface MagicLinkToken {
  id: string;                    // UUID
  user_id: string | null;        // Null until link clicked
  email: string;                 // Recipient email
  token_hash: string;            // HMAC SHA-256 hash
  token_type: 'magiclink';       // Auth method identifier
  created_at: timestamp;         // Token generation time
  updated_at: timestamp;         // Last update time
  relates_to: string | null;     // Related auth object
  email_otp: string | null;      // OTP code (for email)
}
```

**Token Lifecycle**:
1. **Creation**: User requests magic link → Token generated with random secure hash
2. **Delivery**: Email sent with link containing token in URL
3. **Validation**: User clicks link → Token verified against hash
4. **Invalidation**: First use → Token marked as used (cannot be reused)
5. **Expiration**: 1 hour → Token expires regardless of use

**Security Properties**:
- Cryptographically secure random generation (32 bytes entropy)
- HMAC SHA-256 hashing (one-way, cannot reverse)
- Single-use enforcement (replay attack prevention)
- Time-limited validity (reduces attack window)

---

### User Session (Existing Pattern - No Changes)

**Storage**: httpOnly cookies + localStorage (Zustand)

**Attributes**:
```typescript
interface UserSession {
  access_token: string;          // JWT token (1 hour validity)
  refresh_token: string;         // Refresh token (30 days validity)
  expires_at: number;            // Unix timestamp
  expires_in: number;            // Seconds until expiration
  token_type: 'bearer';          // OAuth 2.0 token type
  user: {
    id: string;                  // User UUID
    email: string;               // User email
    email_confirmed_at: string;  // Email verification timestamp
    app_metadata: object;        // System metadata
    user_metadata: object;       // Custom user data
  };
}
```

**Session Management**:
- **Creation**: Magic link clicked → Supabase validates token → Session created
- **Storage**: httpOnly cookie (primary) + localStorage (secondary via Zustand)
- **Refresh**: Auto-refresh 60 seconds before expiration
- **Invalidation**: User logout or 30 days of inactivity

**Cross-Device Behavior**:
- Magic link can be clicked on any device
- Session created on device where link was clicked
- Original request device session unaffected (separate sessions)

---

## State Transitions

### Magic Link Authentication Flow

```
┌─────────────────┐
│ User Anonymous  │
└────────┬────────┘
         │
         │ 1. Enters email on /login
         ▼
┌─────────────────────────┐
│ Magic Link Requested    │
│ - Email validated       │
│ - Token generated       │
│ - Rate limit checked    │
└────────┬────────────────┘
         │
         │ 2. Email sent (async)
         ▼
┌─────────────────────────┐
│ Email Delivered         │
│ - Inbox/spam folder     │
│ - Link valid 1 hour     │
└────────┬────────────────┘
         │
         │ 3. User clicks link
         ▼
┌─────────────────────────┐
│ Token Validation        │
│ - Hash verified         │
│ - Expiration checked    │
│ - Single-use enforced   │
└────────┬────────────────┘
         │
         │ 4. Success
         ▼
┌─────────────────────────┐
│ Session Created         │
│ - Access token issued   │
│ - Refresh token issued  │
│ - User authenticated    │
└────────┬────────────────┘
         │
         │ 5. Redirect to /generate
         ▼
┌─────────────────────────┐
│ User Authenticated      │
│ - Full app access       │
│ - Session persisted     │
└─────────────────────────┘
```

### Error States

**Rate Limit Exceeded:**
```
User Requests Magic Link
    ↓
Rate Limit Check (3/hour)
    ↓ (exceeded)
Error: "Too many requests. Try password login or wait."
    ↓
User Sees Error Message + Password Login Option
```

**Expired Token:**
```
User Clicks Magic Link (after 1 hour)
    ↓
Token Validation
    ↓ (expired)
Error: "Link expired. Request a new one."
    ↓
Redirect to /login with Pre-filled Email
```

**Invalid Token:**
```
User Clicks Tampered Link
    ↓
Token Validation
    ↓ (hash mismatch)
Error: "Invalid link. Request a new one."
    ↓
Redirect to /login
```

---

## Validation Rules

### Email Validation
```typescript
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function validateEmail(email: string): boolean {
  if (!email) return false;
  if (email.length > 254) return false;  // RFC 5321 max length
  if (!emailRegex.test(email)) return false;
  return true;
}
```

### Rate Limiting
- **Limit**: 3 requests per hour per email address
- **Window**: Rolling 60-minute window
- **Reset**: Automatic after oldest request > 60 minutes
- **Enforcement**: Supabase Auth (server-side, cannot be bypassed)

### Token Expiration
- **Validity Period**: 1 hour from generation
- **Check Timing**: On token validation attempt
- **Grace Period**: None (strict 1-hour cutoff)
- **Timezone**: UTC (server time, immune to client clock manipulation)

### Single-Use Enforcement
- **Mechanism**: Token marked as "used" in database after first validation
- **Reuse Attempt**: Returns error "Token already used"
- **Concurrency**: Database transaction ensures atomic check-and-mark

---

## Index Strategy

**No custom indexes required** - Supabase Auth handles all queries internally.

Existing indexes on `public.users`:
```sql
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_created_at ON users(created_at);
```

These indexes support:
- Fast user lookup by email after magic link authentication
- User creation timestamp queries (for analytics)

---

## Migration Plan

**Schema Changes**: NONE required

**Data Migration**: NONE required

**Rollback Plan**: N/A (no schema changes)

---

## Performance Considerations

### Database Queries

**Magic Link Send** (1 query):
```sql
-- Supabase internal: Check rate limit
SELECT COUNT(*) FROM auth.one_time_tokens
WHERE email = $1 AND created_at > NOW() - INTERVAL '1 hour';
```
**Expected Time**: <10ms

**Magic Link Validation** (2 queries):
```sql
-- Supabase internal: Validate token
SELECT * FROM auth.one_time_tokens
WHERE token_hash = $1 AND created_at > NOW() - INTERVAL '1 hour';

-- Our app: Fetch user data
SELECT * FROM public.users WHERE id = $1;
```
**Expected Time**: <50ms combined

**Session Creation** (1 write):
```sql
-- Supabase internal: Create session
INSERT INTO auth.sessions (user_id, access_token, refresh_token, ...)
VALUES (...);
```
**Expected Time**: <20ms

### Caching Strategy

**No caching required** for magic link flow:
- One-time use tokens cannot be cached
- Session tokens cached automatically by Supabase SDK
- User data cached in Zustand store (localStorage)

---

## Security Analysis

### Threat Model

**Threats Mitigated**:
- ✅ Password theft: No passwords stored
- ✅ Credential stuffing: No password to reuse
- ✅ Phishing: Users verify email sender, not typing password
- ✅ Replay attacks: Single-use tokens
- ✅ Token prediction: Cryptographically random generation
- ✅ Brute force: Rate limiting (3/hour)

**Remaining Risks**:
- ⚠️ Email account compromise: If attacker controls email, can request magic links
  - Mitigation: Encourage 2FA on email accounts
- ⚠️ Link interception: MITM can steal magic link from email
  - Mitigation: HTTPS required, email provider TLS
- ⚠️ Device compromise: If device stolen with active session
  - Mitigation: 1-hour access token, 30-day refresh token, remote logout capability

### Compliance

**GDPR**:
- ✅ Email stored with consent (registration flow)
- ✅ Right to delete (user deletion removes all data)
- ✅ Data minimization (only email stored, no password)

**SOC 2**:
- ✅ Secure transmission (HTTPS only)
- ✅ Access logging (Supabase Auth logs all attempts)
- ✅ Session management (industry-standard JWT)

---

## Summary

**Database Impact**: Zero schema changes, zero migrations, zero risk

**Storage**: Supabase manages all token storage internally

**Performance**: <100ms total authentication latency

**Security**: Industry-standard cryptographic practices, multiple threat mitigations

**Scalability**: Supabase Auth scales to millions of users by default

**Cost**: $0 (included in existing Supabase plan)

---

**Data Model Status**: COMPLETE
**Next Artifact**: API Contracts
