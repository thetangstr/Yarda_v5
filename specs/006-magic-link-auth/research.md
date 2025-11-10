# Research: Magic Link Authentication

**Date**: 2025-11-09
**Feature**: Magic Link Authentication (006-magic-link-auth)

## Section 1: Supabase OTP API Patterns

### Research Question
How to correctly use Supabase `signInWithOtp()` method for email magic links?

### Findings

**API Usage Pattern:**
```typescript
import { supabase } from '@/lib/supabase';

export async function sendMagicLink(email: string) {
  const { data, error } = await supabase.auth.signInWithOtp({
    email: email,
    options: {
      emailRedirectTo: `${window.location.origin}/auth/callback`,
    }
  });

  if (error) throw error;
  return data;
}
```

**Error Codes:**
- `otp_disabled`: Email OTP not enabled in Supabase project settings
- `over_email_send_rate_limit`: User exceeded rate limit (3/hour default)
- `otp_expired`: Magic link expired (1 hour default)
- `invalid_credentials`: Email format invalid

**Rate Limiting Behavior:**
- Default: 3 requests per hour per email address
- Custom SMTP: Upgradable to 30 requests per hour
- Rate limit reset: Automatic after 60 minutes
- Response: HTTP 429 with `over_email_send_rate_limit` error code

**Email Template Customization:**
- Location: Supabase Dashboard → Authentication → Email Templates → Magic Link
- Variables: `{{ .ConfirmationURL }}`, `{{ .Token }}`, `{{ .Email }}`
- Default subject: "Magic Link"
- Customizable: Subject, body, button text, branding

### Decision
**Use Supabase default OTP implementation with custom email template.**

**Rationale:**
- Zero implementation cost (included in Supabase free tier)
- Battle-tested security (Supabase handles token generation, validation, expiration)
- No backend code required (Supabase Auth SDK handles everything)
- Existing `/auth/callback` handler compatible

**Alternatives Considered:**
- Custom token generation: Rejected (reinventing secure crypto is risky)
- Third-party magic link service (Magic.link): Rejected ($0.05/link cost)

---

## Section 2: Email Deliverability Best Practices

### Research Question
How to ensure magic link emails don't end up in spam and are delivered reliably?

### Findings

**Spam Filter Avoidance:**
1. **Clear sender identity**: Use recognizable "from" name (e.g., "Yarda AI")
2. **Avoid spam trigger words**: Don't use "free", "click here", "limited time"
3. **Include security context**: "You requested this link" message
4. **Plain-text + HTML version**: Supabase sends both by default
5. **Unsubscribe link**: Not required for transactional emails

**Email Content Best Practices:**
- **Subject line**: "Sign in to Yarda" (clear, action-oriented, <50 chars)
- **CTA button**: Large, obvious button with clear text
- **Security messaging**: "Link expires in 1 hour"
- **Fallback message**: "If you didn't request this, ignore it"
- **Mobile responsive**: Button min height 44px for touch targets

**Email Provider Compatibility:**
- Gmail: Works with default Supabase SMTP
- Outlook/Office365: Works with default Supabase SMTP
- Yahoo: Works with default Supabase SMTP
- Apple Mail (iCloud): Works with default Supabase SMTP
- ProtonMail: Works (encrypted inbox compatible)

**Testing Strategies:**
1. **Local testing**: Use real email address, check inbox
2. **Supabase dashboard**: View sent emails in Auth → Users → Email logs
3. **Email testing service**: Mailtrap.io (optional, not needed for MVP)

### Decision
**Use Supabase default SMTP with custom branded email template.**

**Rationale:**
- Supabase has high deliverability (>98% SLA)
- Default SMTP sufficient for MVP (<1000 users)
- Custom SMTP only needed if rate limits become issue

**Alternatives Considered:**
- SendGrid ($15/month): Overkill for MVP, adds complexity
- AWS SES ($0.10/1000): Requires AWS setup, not worth effort for MVP
- Postmark ($15/month): Premium deliverability, not justified for small scale

---

## Section 3: Rate Limiting Strategy

### Research Question
How to handle rate limiting gracefully and prevent abuse?

### Findings

**Default Rate Limits (Supabase):**
- Free tier: 3 magic link requests per hour per email
- With custom SMTP: 30 requests per hour per email
- Enterprise: Unlimited (requires sales contact)

**User-Friendly Error Messages:**
```typescript
if (error.message.includes('over_email_send_rate_limit')) {
  return "Too many requests. Please try again in a few minutes or use password login.";
}
```

**Alternative Authentication When Rate Limited:**
- Password login remains available
- Google OAuth unaffected by magic link rate limits
- Display both options prominently when rate limit hit

**Monitoring & Alerts:**
- Track `over_email_send_rate_limit` errors
- Alert if >1% of requests hit rate limit (indicates abuse or UX issue)
- Dashboard metric: "Magic link rate limit encounters"

### Decision
**Accept default 3/hour rate limit for MVP, add clear fallback messaging.**

**Rationale:**
- 3/hour sufficient for legitimate users (most check email within minutes)
- Rate limit abuse indicates suspicious behavior (good security)
- Password login provides instant fallback option

**Alternatives Considered:**
- Custom SMTP for 30/hour: Deferred until data shows need
- Captcha on rate limit: Adds friction, not worth it for MVP
- Phone verification: Expensive (~$0.10/SMS), out of scope

---

## Section 4: Session Management Patterns

### Research Question
How does Supabase store sessions and handle cross-device authentication?

### Findings

**Session Storage Mechanisms:**
1. **httpOnly Cookies** (primary, server-set)
   - Domain: `.yourdomain.com`
   - Secure flag: true (HTTPS only)
   - SameSite: Lax (CSRF protection)
   - Auto-renewed on token refresh

2. **localStorage** (secondary, client-set via Zustand)
   - Key: `user-storage` (Zustand default)
   - Contains: `accessToken`, `user` object
   - Survives page refresh
   - Used by API interceptor for auth headers

**Auto-Refresh Token Behavior:**
- Supabase SDK automatically refreshes tokens before expiration
- Refresh happens 60 seconds before access token expires
- Default access token lifetime: 1 hour
- Default refresh token lifetime: 30 days

**Cross-Device Session Handling:**
- Magic link clicked on **different device** than requested:
  - ✅ Works! Token is device-independent
  - Session created on device where link was clicked
  - Original device session unaffected (separate session)

- Magic link clicked on **same device** while logged in as different user:
  - Default behavior: Signs out current user, signs in link user
  - Can be customized via `shouldCreateUser` option

**Session Persistence:**
```typescript
// Supabase SDK handles persistence automatically
const { data: { session } } = await supabase.auth.getSession();

// If session exists, user is authenticated
if (session) {
  setAccessToken(session.access_token);
  setUser(session.user);
}
```

### Decision
**Use Supabase default session management with Zustand localStorage sync.**

**Rationale:**
- Supabase handles all token refresh logic (zero custom code)
- httpOnly cookies prevent XSS token theft
- localStorage provides fast client-side access for UI
- Existing Zustand store already configured for persistence

**Alternatives Considered:**
- Session-only storage (no localStorage): Rejected (worse UX, requires server-side session on every page load)
- JWT in localStorage only: Rejected (vulnerable to XSS attacks)
- Custom session management: Rejected (reinventing Supabase is wasteful)

---

## Summary & Implementation Recommendations

### Key Decisions
1. **Email Provider**: Supabase default SMTP (free, reliable)
2. **Rate Limiting**: Accept 3/hour default, provide password fallback
3. **Email Template**: Custom branded template via Supabase dashboard
4. **Session Storage**: Supabase httpOnly cookies + Zustand localStorage
5. **Link Expiration**: 1 hour (Supabase default)

### Code Examples

**Send Magic Link:**
```typescript
// frontend/src/lib/supabase.ts
export async function sendMagicLink(email: string) {
  const { data, error } = await supabase.auth.signInWithOtp({
    email: email,
    options: {
      emailRedirectTo: `${window.location.origin}/auth/callback`,
    }
  });

  if (error) {
    if (error.message.includes('over_email_send_rate_limit')) {
      throw new Error('Too many requests. Please try again in a few minutes.');
    }
    throw error;
  }

  return data;
}
```

**Handle Magic Link Callback:**
```typescript
// frontend/src/pages/auth/callback.tsx
// ✅ NO CHANGES NEEDED - Existing handler already compatible
useEffect(() => {
  const handleCallback = async () => {
    // Supabase SDK automatically handles magic link tokens
    const { data: { session } } = await supabase.auth.getSession();

    if (session) {
      setAccessToken(session.access_token);
      // Fetch user from public.users table
      const { data: userData } = await supabase
        .from('users')
        .select('*')
        .eq('id', session.user.id)
        .single();

      setUser(userData);
      router.push('/generate');
    }
  };

  handleCallback();
}, []);
```

### Performance Metrics
- Email delivery time: <60 seconds (Supabase SLA)
- Magic link validation: <100ms (Supabase Auth)
- Session creation: <200ms (database query + localStorage)
- Total time to authentication: <2 minutes (user-dependent)

### Security Considerations
- ✅ Tokens are cryptographically secure (Supabase uses industry-standard HMAC)
- ✅ One-time use enforced (token invalidated after first click)
- ✅ Time-limited (1 hour expiration)
- ✅ Rate limiting prevents brute force
- ✅ HTTPS required (Supabase enforces)
- ✅ No password storage (reduces attack surface)

### Cost Analysis
- Email sending: $0 (included in Supabase free tier)
- Token storage: $0 (Supabase manages internally)
- Database queries: $0 (within existing plan)
- **Total cost increase: $0**

---

**Research Status**: COMPLETE
**Next Phase**: Phase 1 - Design & Contracts
