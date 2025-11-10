# API Contracts: Supabase Magic Link Authentication

**Feature**: 006-magic-link-auth
**Date**: 2025-11-09
**Provider**: Supabase Auth SDK

## Overview

Magic link authentication uses Supabase's built-in OTP (One-Time Password) authentication flow via the `signInWithOtp()` SDK method. All token generation, validation, and email delivery is handled by Supabase internally. Our frontend only needs to call the SDK method and handle the callback.

**Key Characteristics**:
- No backend API endpoints required (Supabase SDK handles everything)
- Frontend → Supabase direct communication
- Callback handled by existing `/auth/callback` route
- Zero cost (included in Supabase MAU pricing)

---

## Frontend → Supabase Auth

### Send Magic Link

**SDK Method**: `supabase.auth.signInWithOtp()`

**Request**:
```typescript
interface SendMagicLinkRequest {
  email: string;  // Required, validated email address
  options?: {
    emailRedirectTo?: string;  // Optional callback URL (default: /auth/callback)
    shouldCreateUser?: boolean;  // Optional, allow new user creation (default: true)
    data?: object;  // Optional user metadata
  };
}
```

**Example Usage**:
```typescript
const { data, error } = await supabase.auth.signInWithOtp({
  email: 'user@example.com',
  options: {
    emailRedirectTo: `${window.location.origin}/auth/callback`,
  }
});
```

**Response**:
```typescript
interface SendMagicLinkResponse {
  user: null;  // No user object until link clicked
  session: null;  // No session until link clicked
  error?: AuthError;  // Error object if request fails
}

interface AuthError {
  message: string;  // Human-readable error message
  status: number;  // HTTP status code (400, 429, 500)
  code?: string;  // Error code for programmatic handling
}
```

**Success Response** (200 OK):
```typescript
{
  user: null,
  session: null
}
```

**Error Responses**:

**Invalid Email** (400 Bad Request):
```typescript
{
  user: null,
  session: null,
  error: {
    message: "Unable to validate email address: invalid format",
    status: 400
  }
}
```

**Rate Limit Exceeded** (429 Too Many Requests):
```typescript
{
  user: null,
  session: null,
  error: {
    message: "Email rate limit exceeded",
    status: 429,
    code: "over_email_send_rate_limit"
  }
}
```

**OTP Disabled** (400 Bad Request):
```typescript
{
  user: null,
  session: null,
  error: {
    message: "Email login is disabled",
    status: 400,
    code: "otp_disabled"
  }
}
```

**Internal Server Error** (500):
```typescript
{
  user: null,
  session: null,
  error: {
    message: "Unable to process request",
    status: 500
  }
}
```

---

## Supabase → Frontend (Callback)

### Magic Link Click (Callback URL)

**Route**: `GET /auth/callback`

**URL Parameters**:
```typescript
interface MagicLinkCallbackParams {
  access_token: string;  // JWT access token (1 hour validity)
  refresh_token: string;  // Refresh token (30 days validity)
  expires_in: number;  // Token expiration in seconds (3600)
  expires_at: number;  // Unix timestamp of expiration
  token_type: 'bearer';  // OAuth 2.0 token type
  type: 'magiclink';  // Auth method identifier
}
```

**Example Callback URL**:
```
https://yarda.app/auth/callback?
  access_token=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
  &refresh_token=v1.MXB5dGhvbiBhcGkgdGVzdA...
  &expires_in=3600
  &expires_at=1699564800
  &token_type=bearer
  &type=magiclink
```

**Callback Handler Flow**:
1. Extract tokens from URL parameters
2. Supabase SDK automatically exchanges tokens for session
3. Fetch user data from `public.users` table
4. Store session in Zustand + localStorage
5. Redirect to `/generate` page

**Existing Implementation** (No Changes Required):
```typescript
// frontend/src/pages/auth/callback.tsx
// Already handles magic link callbacks via onAuthStateChange listener
const { data } = supabase.auth.onAuthStateChange(async (event, session) => {
  if (event === 'SIGNED_IN' && session) {
    setAccessToken(session.access_token);
    // ... fetch user data and redirect
  }
});
```

---

## Error Handling

### Error Codes

```typescript
type MagicLinkErrorCode =
  | 'otp_disabled'  // Magic link auth disabled in Supabase settings
  | 'over_email_send_rate_limit'  // Exceeded 3 emails/hour limit
  | 'otp_expired'  // Magic link expired (> 1 hour old)
  | 'invalid_credentials';  // Token invalid or already used

interface MagicLinkError {
  code: MagicLinkErrorCode;
  message: string;  // User-friendly error message
  status: number;  // HTTP status code
}
```

### Error Mapping (Frontend)

**Rate Limit Exceeded**:
```typescript
if (error?.code === 'over_email_send_rate_limit') {
  showToast({
    type: 'error',
    message: 'Too many requests. Please wait a few minutes and try again, or use password login.',
  });
}
```

**Expired Token**:
```typescript
if (error?.code === 'otp_expired') {
  showToast({
    type: 'error',
    message: 'This magic link has expired. Please request a new one.',
  });
  router.push('/login?email=' + encodeURIComponent(email));
}
```

**Invalid Token**:
```typescript
if (error?.code === 'invalid_credentials') {
  showToast({
    type: 'error',
    message: 'This magic link is invalid or has already been used. Please request a new one.',
  });
  router.push('/login');
}
```

**Generic Error**:
```typescript
if (error && !error.code) {
  showToast({
    type: 'error',
    message: 'Unable to send magic link. Please try password login or try again later.',
  });
}
```

---

## Session Management

### Session Object

**Type Definition**:
```typescript
interface UserSession {
  access_token: string;  // JWT token (1 hour validity)
  refresh_token: string;  // Refresh token (30 days validity)
  expires_at: number;  // Unix timestamp
  expires_in: number;  // Seconds until expiration
  token_type: 'bearer';  // OAuth 2.0 standard
  user: {
    id: string;  // User UUID
    email: string;  // User email
    email_confirmed_at: string;  // Email verification timestamp
    app_metadata: {
      provider: 'email';  // Auth provider identifier
      providers: ['email'];  // Array of auth methods used
    };
    user_metadata: object;  // Custom user data
    aud: string;  // Audience (typically 'authenticated')
    created_at: string;  // User creation timestamp
    updated_at: string;  // Last update timestamp
  };
}
```

### Session Storage

**Primary Storage**: httpOnly cookies (Supabase automatic)
- Secure, HTTP-only, SameSite=Lax
- Automatically sent with API requests
- Not accessible via JavaScript (XSS protection)

**Secondary Storage**: localStorage (via Zustand)
```typescript
// frontend/src/store/userStore.ts
interface UserStore {
  user: User | null;
  accessToken: string | null;
  setUser: (user: User) => void;
  setAccessToken: (token: string) => void;
  logout: () => void;
}
```

**localStorage Key**: `user-storage` (Zustand automatic)

**Storage Format**:
```json
{
  "state": {
    "user": {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "email": "user@example.com",
      "email_verified": true,
      "trial_remaining": 2,
      "trial_used": 1,
      "subscription_tier": "free",
      "subscription_status": "inactive"
    },
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  },
  "version": 0
}
```

### Auto-Refresh Behavior

**Supabase SDK Automatic**:
- Checks token expiration every 60 seconds
- Refreshes token when < 60 seconds remaining
- Uses refresh token to get new access token
- Updates session in cookies + triggers `onAuthStateChange` event

**Frontend Handling**:
```typescript
// No manual refresh required - Supabase SDK handles automatically
supabase.auth.onAuthStateChange((event, session) => {
  if (event === 'TOKEN_REFRESHED' && session) {
    setAccessToken(session.access_token);
  }
});
```

---

## Validation Rules

### Email Validation (Frontend)

**Pattern**:
```typescript
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function validateEmail(email: string): boolean {
  if (!email) return false;
  if (email.length > 254) return false;  // RFC 5321 max length
  if (!EMAIL_REGEX.test(email)) return false;
  return true;
}
```

**Error Messages**:
- Empty email: "Please enter your email address"
- Invalid format: "Please enter a valid email address"
- Too long: "Email address is too long (max 254 characters)"

### Rate Limiting (Supabase-Enforced)

**Limit**: 3 requests per hour per email address

**Window**: Rolling 60-minute window
- First request at 10:00 AM → Window ends 11:00 AM
- Second request at 10:15 AM → Window ends 11:15 AM
- Third request at 10:30 AM → Window ends 11:30 AM
- Fourth request at 10:45 AM → **BLOCKED** (429 error)

**Reset Behavior**:
- At 11:01 AM, user can send 1 request (oldest expired)
- At 11:16 AM, user can send 2 requests (two oldest expired)
- At 11:31 AM, user can send 3 requests (all expired)

**Bypass Option**: Upgrade to custom SMTP provider
- SendGrid: 30 emails/hour ($15/month)
- AWS SES: No hard limit ($0.10/1000 emails)
- Mailgun: 100 emails/hour ($15/month)

### Token Expiration (Supabase-Enforced)

**Validity Period**: 1 hour (3600 seconds) from generation

**Check Timing**: On token validation attempt
- Token generated: 10:00:00 AM → Expires: 11:00:00 AM
- Click at 10:59:59 AM → ✅ Valid
- Click at 11:00:01 AM → ❌ Expired

**Grace Period**: None (strict cutoff)

**Timezone**: UTC (server time)
- Immune to client clock manipulation
- Consistent across all devices globally

### Single-Use Enforcement (Supabase-Enforced)

**Mechanism**: Token marked as "used" in database after first validation

**First Click**:
1. Validate token hash → ✅ Valid
2. Mark token as used in `auth.one_time_tokens`
3. Create user session
4. Return access/refresh tokens

**Second Click**:
1. Validate token hash → ❌ Already used
2. Return error: `invalid_credentials`
3. No session created

**Concurrency Handling**: Database transaction with row-level lock
- Prevents race condition if link clicked twice simultaneously
- Atomic check-and-mark operation

---

## Performance Characteristics

### Request Latency

**Send Magic Link** (Frontend → Supabase):
- Network latency: ~50-100ms (CDN proximity)
- Supabase processing: ~10-50ms (rate limit check + token generation)
- Email queue: ~5-10ms (async, non-blocking)
- **Total**: ~65-160ms

**Email Delivery** (Supabase → User Inbox):
- Supabase SMTP: ~5-30 seconds (default provider)
- Custom SMTP: ~2-10 seconds (SendGrid, AWS SES)
- Spam filter delay: +0-60 seconds (varies by provider)
- **Total**: ~5-90 seconds

**Magic Link Click** (User → Frontend Callback):
- Token validation: ~20-50ms (Supabase lookup + hash verification)
- Session creation: ~10-30ms (database write)
- User data fetch: ~15-40ms (`public.users` query)
- **Total**: ~45-120ms

**End-to-End Time** (Request → Authenticated):
- Ideal: ~10 seconds (fast email delivery)
- Typical: ~30-60 seconds (normal email delivery)
- Worst case: ~90-120 seconds (spam filter delay)

### Caching Strategy

**No Caching Required**:
- Magic link tokens are single-use (cannot be cached)
- Session tokens cached automatically by Supabase SDK
- User data cached in Zustand store (localStorage)

**Session Cache Invalidation**:
- On logout: Clear Zustand store + Supabase session
- On token refresh: Update access token in store
- On 30 days inactivity: Supabase auto-invalidates refresh token

---

## Security Considerations

### Token Security

**Generation**:
- Cryptographically secure random (32 bytes entropy)
- Unpredictable (not based on user ID, email, or timestamp)
- Collision resistance (probability < 1 in 2^256)

**Storage**:
- Stored as HMAC SHA-256 hash (one-way, cannot reverse)
- Only hash stored in database (original token never persisted)
- Transmitted via HTTPS only (TLS 1.3)

**Validation**:
- Constant-time comparison (prevents timing attacks)
- Rate limited (3 attempts/hour per email)
- Single-use enforced (replay attack prevention)
- Time-limited (1 hour expiration reduces attack window)

### Email Security

**Transport Security**:
- Supabase → Email provider: TLS 1.3
- Email provider → User inbox: TLS (varies by provider)
- Magic link URL: HTTPS only (enforced by redirect URL)

**Phishing Mitigation**:
- Email sender: `noreply@mail.supabase.io` (verifiable SPF/DKIM)
- Link domain: `yarda.app` (user can verify)
- Clear branding: Yarda logo and colors in email template

**Link Interception Risk**:
- ⚠️ Email in transit could be intercepted (MITM attack)
- Mitigation: HTTPS required for callback URL
- Mitigation: 1-hour expiration limits exposure
- Mitigation: Single-use prevents replay if intercepted

### Session Security

**Access Token**:
- JWT format (standard, verifiable)
- 1-hour expiration (short-lived, reduces risk if stolen)
- Signed with Supabase secret (cannot be forged)
- Contains minimal claims (id, email, role)

**Refresh Token**:
- Opaque token (not JWT, cannot be decoded)
- 30-day expiration (long-lived, requires rotation)
- Stored in httpOnly cookie (XSS protection)
- Invalidated on logout (immediate revocation)

**Cross-Site Request Forgery (CSRF)**:
- Supabase cookies have `SameSite=Lax` (CSRF protection)
- State parameter in OAuth flow (additional CSRF protection)

---

## Integration Examples

### Frontend Implementation (login.tsx)

```typescript
import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/useToast';

export function MagicLinkForm() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const { showToast } = useToast();

  const handleSendMagicLink = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate email
    if (!validateEmail(email)) {
      showToast({
        type: 'error',
        message: 'Please enter a valid email address',
      });
      return;
    }

    setLoading(true);

    try {
      const { error } = await supabase.auth.signInWithOtp({
        email: email,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        }
      });

      if (error) {
        // Handle rate limiting
        if (error.message.includes('rate limit')) {
          showToast({
            type: 'error',
            message: 'Too many requests. Please try again in a few minutes or use password login.',
          });
          return;
        }

        // Generic error
        throw error;
      }

      // Success
      showToast({
        type: 'success',
        message: 'Check your email for a magic link!',
      });
    } catch (err: any) {
      console.error('Magic link error:', err);
      showToast({
        type: 'error',
        message: 'Unable to send magic link. Please try password login or try again later.',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSendMagicLink}>
      <input
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="Enter your email"
        required
      />
      <button type="submit" disabled={loading}>
        {loading ? 'Sending...' : 'Send Magic Link'}
      </button>
    </form>
  );
}
```

### Callback Handler (auth/callback.tsx)

```typescript
// Existing implementation already handles magic links via onAuthStateChange
// NO CHANGES REQUIRED

useEffect(() => {
  const { data } = supabase.auth.onAuthStateChange(async (event, session) => {
    if (event === 'SIGNED_IN' && session) {
      // Magic link authentication successful
      console.log('Magic link auth successful');
      setAccessToken(session.access_token);

      // Fetch user data from public.users
      const { data: userData } = await supabase
        .from('users')
        .select('*')
        .eq('id', session.user.id)
        .single();

      if (userData) {
        setUser(userData);
      }

      // Redirect to generate page
      router.push('/generate');
    }
  });

  return () => data.subscription.unsubscribe();
}, []);
```

---

## Testing Considerations

### Unit Tests (Frontend)

**Email Validation**:
```typescript
describe('validateEmail', () => {
  it('should accept valid email', () => {
    expect(validateEmail('user@example.com')).toBe(true);
  });

  it('should reject empty email', () => {
    expect(validateEmail('')).toBe(false);
  });

  it('should reject invalid format', () => {
    expect(validateEmail('not-an-email')).toBe(false);
  });

  it('should reject email exceeding max length', () => {
    const longEmail = 'a'.repeat(255) + '@example.com';
    expect(validateEmail(longEmail)).toBe(false);
  });
});
```

### E2E Tests (Playwright)

**Happy Path**:
```typescript
test('magic link authentication flow', async ({ page }) => {
  // Navigate to login page
  await page.goto('/login');

  // Enter email and send magic link
  await page.fill('input[type="email"]', 'test@example.com');
  await page.click('button:has-text("Send Magic Link")');

  // Verify success message
  await expect(page.locator('.toast-success')).toContainText('Check your email for a magic link!');

  // Note: Actual email delivery and link clicking tested manually
  // In E2E, we can mock the callback URL directly
});
```

**Rate Limiting**:
```typescript
test('rate limit error handling', async ({ page }) => {
  // Send 4 magic links rapidly
  for (let i = 0; i < 4; i++) {
    await page.fill('input[type="email"]', 'test@example.com');
    await page.click('button:has-text("Send Magic Link")');
    await page.waitForTimeout(100);
  }

  // Verify rate limit error on 4th attempt
  await expect(page.locator('.toast-error')).toContainText('Too many requests');
});
```

---

**Contract Status**: COMPLETE
**Next Artifact**: Quickstart Guide
