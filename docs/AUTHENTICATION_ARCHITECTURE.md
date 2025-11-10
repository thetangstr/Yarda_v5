# Yarda v5 Authentication Architecture

## Overview

Yarda v5 now supports **three authentication methods**, each with different verification flows:

1. **Google OAuth** (existing)
2. **Email/Password** (existing)
3. **Magic Link** (NEW - Feature 006)

## Authentication Methods Comparison

| Method | Password Required | Email Verification | Account Creation | Security |
|--------|------------------|-------------------|------------------|----------|
| **Google OAuth** | ❌ No | ✅ Verified by Google | Auto-created on first login | High (delegated to Google) |
| **Email/Password** | ✅ Yes | ⚠️ Required (separate step) | Manual registration | Medium (user-managed password) |
| **Magic Link** | ❌ No | ✅ Automatic | Auto-created on first use | High (no password to leak) |

---

## How Magic Link Replaces Email Verification

### **Old Flow: Email/Password Registration**

```
User Flow:
1. User visits /register
2. User enters email + password
3. Supabase creates account (email_verified = false)
4. Supabase sends verification email
5. User clicks verification link
6. Email is verified (email_verified = true)
7. User can now log in with email/password

Total Steps: 7
Security Risk: Password can be weak, leaked, or forgotten
```

### **New Flow: Magic Link Authentication**

```
User Flow:
1. User visits /login
2. User enters email (no password!)
3. Supabase sends magic link
4. User clicks magic link in email
5. ✅ User is authenticated + email verified + account created (if needed)

Total Steps: 5
Security Risk: None (no password, single-use token, 1-hour expiration)
```

---

## Key Insight: Magic Link = Registration + Verification + Login

When a user clicks a magic link:

### **If Account Exists:**
- ✅ Authenticates the user
- ✅ Email is already verified
- ✅ User redirected to `/generate`

### **If Account Does NOT Exist:**
- ✅ Supabase auto-creates account in `auth.users`
- ✅ Email is automatically verified (they proved they own it!)
- ✅ Database trigger creates record in `public.users`
- ✅ User gets 3 trial credits
- ✅ User redirected to `/generate`

**Result:** New users go from "no account" to "authenticated with verified email" in ONE click!

---

## Architecture Details

### **1. Supabase Magic Link Flow**

```typescript
// User requests magic link
await supabase.auth.signInWithOtp({
  email: 'user@example.com',
  options: {
    emailRedirectTo: 'https://yarda.app/auth/callback'
  }
});

// Supabase sends email with link:
// https://yarda.app/auth/callback?token=<one-time-token>&type=magiclink

// When user clicks:
// 1. Supabase validates token (single-use, 1-hour expiration)
// 2. Creates session if valid
// 3. Redirects to callback URL with session
```

### **2. Callback Handler** (`/auth/callback`)

The existing callback handler already supports magic links via `onAuthStateChange`:

```typescript
// frontend/src/pages/auth/callback.tsx
supabase.auth.onAuthStateChange(async (event, session) => {
  if (event === 'SIGNED_IN' && session) {
    // Works for Google OAuth AND Magic Link!
    setAccessToken(session.access_token);

    // Fetch user from public.users
    const { data: userData } = await supabase
      .from('users')
      .select('*')
      .eq('id', session.user.id)
      .single();

    if (userData) {
      setUser(userData);
    }

    router.push('/generate');
  }
});
```

**No changes needed!** Magic links use the same callback as Google OAuth.

### **3. Database Trigger** (`auth.users` → `public.users`)

```sql
-- Automatically creates public.users record when auth.users is created
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_user();

-- handle_new_user() function:
-- 1. Creates record in public.users
-- 2. Sets trial_remaining = 3
-- 3. Sets email_verified = true (from auth.users.email_confirmed_at)
```

---

## Security Comparison

### **Password-Based Authentication Risks:**
- ❌ Weak passwords (user chooses "password123")
- ❌ Password reuse across sites
- ❌ Phishing (user enters password on fake site)
- ❌ Credential stuffing attacks
- ❌ Password reset vulnerabilities

### **Magic Link Authentication Benefits:**
- ✅ No password to leak or forget
- ✅ Single-use tokens (can't be replayed)
- ✅ 1-hour expiration (short attack window)
- ✅ Email ownership proof (you must have access to inbox)
- ✅ Supabase manages all crypto/validation
- ✅ Immune to password attacks

---

## What Happened to Email/Password Registration?

### **Current State:**
- Email/password authentication still works
- Users can still register via `/register`
- Email verification still required for password accounts

### **Why Keep It?**
Some users prefer traditional login:
- Corporate users with password managers
- Users without email access during signup
- Testing/development convenience

### **Recommendation:**
Yarda should prioritize magic link as the **primary** authentication method:
- Simpler UX (no password to create/remember)
- Better security (no password to leak)
- Faster onboarding (one-click authentication)

Email/password can remain as a **fallback option** for edge cases.

---

## User Flows After Implementation

### **Scenario 1: New User Signs Up**

```
User sees login page with 3 options:
1. [Sign in with Google]         ← OAuth
2. [Email + Password fields]     ← Traditional
3. [Magic Link email field]      ← NEW (recommended)

User chooses Magic Link:
→ Enters email: user@example.com
→ Clicks "Send Magic Link"
→ Sees success message: "Check your email for a magic link!"
→ Opens email, clicks link
→ ✅ Redirected to /generate
→ ✅ Account created automatically
→ ✅ Email verified automatically
→ ✅ 3 trial credits granted
```

### **Scenario 2: Returning User Logs In**

```
User sees login page:
→ Enters email in Magic Link field
→ Clicks "Send Magic Link"
→ Opens email, clicks link
→ ✅ Authenticated immediately (no password!)
→ ✅ Redirected to /generate
```

### **Scenario 3: User Tries Same Link Twice**

```
User clicks magic link:
→ ✅ Authenticated, redirected to /generate

User clicks SAME link again:
→ ❌ Supabase rejects (already used)
→ Error shown: "This link has already been used"
→ User must request a new magic link
```

---

## Rate Limiting

Supabase enforces rate limits to prevent abuse:

- **3 magic links per hour** per email address
- If limit exceeded:
  ```
  Error: "over_email_send_rate_limit"
  User Message: "Too many requests. Please wait a few minutes
                 and try again, or use password login."
  ```

---

## Email Verification Status

### **Magic Link Users:**
```sql
-- auth.users table:
email_confirmed_at: 2025-11-10T12:00:00Z  -- ✅ Set when magic link clicked
email_verified: true                       -- ✅ Always true

-- public.users table:
email_verified: true  -- Synced from auth.users
```

### **Password Users (Before Verification):**
```sql
-- auth.users table:
email_confirmed_at: null  -- ❌ Not verified yet
email_verified: false     -- ❌ Must click verification email

-- public.users table:
email_verified: false  -- Must verify before full access
```

---

## Migration Strategy

### **Existing Users:**
- Users with password accounts can start using magic links
- No migration needed (same email, different auth method)
- Both methods work independently

### **New Users:**
- Encourage magic link via UI placement (top option)
- Show benefits: "No password to remember!"
- Keep password option below as alternative

### **Future:**
- Could deprecate password registration entirely
- Keep password login for existing accounts only
- All new users → Google OAuth or Magic Link only

---

## Implementation Files

| File | Purpose |
|------|---------|
| [frontend/src/lib/supabase.ts](../frontend/src/lib/supabase.ts#L124-L137) | `sendMagicLink()` function |
| [frontend/src/components/auth/MagicLinkForm.tsx](../frontend/src/components/auth/MagicLinkForm.tsx) | Magic link UI component |
| [frontend/src/lib/validators.ts](../frontend/src/lib/validators.ts) | Email validation (RFC 5322) |
| [frontend/src/types/auth.ts](../frontend/src/types/auth.ts) | TypeScript types |
| [frontend/src/pages/login.tsx](../frontend/src/pages/login.tsx#L307-L310) | Integration into login page |
| [frontend/src/pages/auth/callback.tsx](../frontend/src/pages/auth/callback.tsx) | OAuth + Magic Link callback handler |

---

## Testing

### **Automated E2E Tests:**
- ✅ Meta-test: Implementation exists
- ⏭️ Skipped: Integration tests (require real Supabase infrastructure)

### **Manual Testing Required:**
1. Request magic link for new email
2. Check email inbox (or Supabase logs)
3. Click magic link
4. Verify:
   - Redirected to /generate
   - Account created in `public.users`
   - `trial_remaining = 3`
   - `email_verified = true`
5. Sign out, request new magic link
6. Verify login works for existing account

---

## Summary

### **Question: Does Magic Link Replace Email Verification?**

**Answer: YES! ✅**

Magic link authentication **combines three steps into one**:
1. ✅ Account creation (if needed)
2. ✅ Email verification (proves ownership)
3. ✅ Authentication (logs user in)

When a user clicks a magic link, their email is **automatically verified** because they proved they have access to it. No separate verification step needed!

### **For Yarda v5:**
- **Google OAuth:** Email verified by Google
- **Magic Link:** Email verified by clicking link
- **Password:** Still requires separate verification email (legacy flow)

**Recommendation:** Promote magic link as the primary authentication method for the best user experience and security.
