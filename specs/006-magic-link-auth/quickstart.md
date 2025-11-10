# Quickstart Guide: Magic Link Authentication

**Feature**: 006-magic-link-auth
**Date**: 2025-11-09
**Audience**: Developers implementing or testing magic link authentication

## Overview

This guide helps you set up, develop, and test magic link authentication locally. Magic links provide passwordless authentication via email using Supabase Auth's built-in OTP (One-Time Password) functionality.

**Prerequisites**:
- Node.js 18+ and npm installed
- Supabase project configured (already done for Yarda)
- Access to email account for testing
- Frontend and backend repositories cloned

---

## Developer Setup

### Step 1: Verify Supabase Configuration

**Check Email Auth Status** (Supabase Dashboard):

1. Navigate to: https://supabase.com/dashboard/project/gxlmnjnjvlslijiowamn/auth/providers
2. Verify "Email" provider is enabled: ✅
3. Confirm settings:
   - **Enable Email provider**: ON
   - **Confirm email**: OFF (for testing, ON for production)
   - **Secure email change**: ON
   - **Email OTP**: ON (default, required for magic links)

**Supabase Configuration** (No changes needed):
```
Project: yarda
Project ID: gxlmnjnjvlslijiowamn
Region: us-east-2
Email Auth: Enabled ✅
OTP Auth: Enabled ✅
Rate Limit: 3 emails/hour (default)
Token Expiration: 1 hour (default)
```

### Step 2: Environment Variables

**Frontend** (`frontend/.env.local`):

Verify these variables exist (should already be configured):

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://gxlmnjnjvlslijiowamn.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ... # From Supabase Dashboard

# API
NEXT_PUBLIC_API_URL=http://localhost:8000  # For local dev

# Stripe
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
```

**⚠️ Important**: For local development, `NEXT_PUBLIC_API_URL` MUST point to `http://localhost:8000`, not the production Railway URL. Otherwise, CORS errors will occur.

**Backend** (`backend/.env`):

Verify these variables exist (should already be configured):

```bash
# Database
DATABASE_URL=postgresql://postgres:...@db.gxlmnjnjvlslijiowamn.supabase.co/postgres

# Supabase (not needed for magic links - handled by frontend SDK)
# Magic links use frontend Supabase client only

# Other services
STRIPE_SECRET_KEY=sk_test_...
GEMINI_API_KEY=...
GOOGLE_MAPS_API_KEY=...
BLOB_READ_WRITE_TOKEN=vercel_blob_rw_...
```

**Getting Supabase Keys**:

1. Go to: https://supabase.com/dashboard/project/gxlmnjnjvlslijiowamn/settings/api
2. Copy **Project URL** → `NEXT_PUBLIC_SUPABASE_URL`
3. Copy **anon public** key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`

### Step 3: Start Development Servers

**Terminal 1 - Backend** (Optional for magic links, but needed for full app):

```bash
cd backend

# CRITICAL: Activate virtual environment
source venv/bin/activate  # macOS/Linux
# OR
venv\Scripts\activate  # Windows

# Start backend server
uvicorn src.main:app --reload --port 8000
```

**Verify backend running**: http://localhost:8000/health should return `{"status":"healthy"}`

**Terminal 2 - Frontend**:

```bash
cd frontend

# Install dependencies (first time only)
npm install

# Start development server
npm run dev
```

**Verify frontend running**: http://localhost:3000 should load the Yarda homepage

### Step 4: Verify Existing Auth Callback

**Check callback handler** (`frontend/src/pages/auth/callback.tsx`):

The existing callback handler already supports magic links via `onAuthStateChange` listener. No modifications needed.

```typescript
// This code already exists and handles magic links:
const { data } = supabase.auth.onAuthStateChange(async (event, session) => {
  if (event === 'SIGNED_IN' && session) {
    // Works for both Google OAuth and magic links
    setAccessToken(session.access_token);
    // ... fetch user data and redirect
  }
});
```

---

## Testing Magic Links Locally

### Option 1: Real Email Testing (Recommended)

**Step 1: Implement Magic Link UI**

Add magic link form to [login.tsx](../../../frontend/src/pages/login.tsx):

```typescript
import { useState } from 'react';
import { supabase } from '@/lib/supabase';

function MagicLinkSection() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSendMagicLink = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { error } = await supabase.auth.signInWithOtp({
        email: email,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        }
      });

      if (error) throw error;

      setSent(true);
      console.log('Magic link sent to:', email);
    } catch (err: any) {
      console.error('Error sending magic link:', err);
      alert(err.message || 'Failed to send magic link');
    } finally {
      setLoading(false);
    }
  };

  if (sent) {
    return (
      <div className="bg-green-50 border border-green-200 rounded p-4">
        <p className="text-green-800">
          ✅ Check your email for a magic link!
        </p>
        <button
          onClick={() => setSent(false)}
          className="text-green-600 underline mt-2"
        >
          Send another link
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSendMagicLink} className="space-y-4">
      <div>
        <label className="block text-sm font-medium mb-1">
          Email Address
        </label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Enter your email"
          required
          className="w-full px-3 py-2 border rounded"
        />
      </div>
      <button
        type="submit"
        disabled={loading}
        className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700 disabled:opacity-50"
      >
        {loading ? 'Sending...' : 'Send Magic Link'}
      </button>
    </form>
  );
}
```

**Step 2: Test with your email**

1. Go to http://localhost:3000/login
2. Enter your real email address
3. Click "Send Magic Link"
4. Check your inbox (and spam folder)
5. Click the magic link in the email
6. You should be redirected to http://localhost:3000/auth/callback
7. Then automatically redirected to http://localhost:3000/generate as authenticated user

**Step 3: Verify authentication**

- Check browser console for: `[Auth Callback] User ID: ...`
- Check Zustand store: Open React DevTools → Components → UserStore
- Verify `user` and `accessToken` are populated

### Option 2: Supabase Dashboard Testing

If you don't want to use a real email during development, you can view magic link URLs directly in Supabase dashboard.

**Steps**:

1. Send magic link via your local app (http://localhost:3000/login)
2. Go to Supabase Dashboard: https://supabase.com/dashboard/project/gxlmnjnjvlslijiowamn/auth/users
3. Find the user by email (or create test user if doesn't exist)
4. Click user → View details → **Email OTP** tab
5. Copy the magic link URL
6. Paste into browser to test authentication flow

**Limitation**: This only works if email was sent (so you'll see the generated token). It doesn't work for testing email delivery itself.

### Option 3: Email Capture Services (Optional)

For automated testing without real email accounts, use email capture services:

**Mailtrap.io** (Free tier: 100 emails/month):

1. Sign up at https://mailtrap.io
2. Get SMTP credentials
3. Configure custom SMTP in Supabase: https://supabase.com/dashboard/project/gxlmnjnjvlslijiowamn/auth/settings
   - SMTP Host: `sandbox.smtp.mailtrap.io`
   - SMTP Port: `2525`
   - SMTP User: (from Mailtrap)
   - SMTP Pass: (from Mailtrap)
4. Send magic link to `anything@example.com`
5. View email in Mailtrap inbox

**Note**: Custom SMTP setup is optional and not required for MVP. Supabase default SMTP works fine for development.

---

## Email Template Customization (Optional)

### Default Email Template

Supabase sends a basic email with this structure:

**Subject**: Magic Link - Yarda

**Body**:
```
Click the link below to sign in to Yarda:

[Sign In] (button)

Or copy and paste this URL into your browser:
https://yarda.app/auth/callback?token=...

This link expires in 1 hour.
```

### Customizing the Email (Optional)

**Access Email Templates**:

1. Go to: https://supabase.com/dashboard/project/gxlmnjnjvlslijiowamn/auth/templates
2. Select **Magic Link** template
3. Edit HTML template

**Example Customization**:

```html
<!DOCTYPE html>
<html>
<head>
  <style>
    body {
      font-family: 'Inter', sans-serif;
      background-color: #f9fafb;
      margin: 0;
      padding: 20px;
    }
    .container {
      max-width: 600px;
      margin: 0 auto;
      background-color: white;
      border-radius: 8px;
      padding: 40px;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
    }
    .logo {
      text-align: center;
      margin-bottom: 30px;
    }
    .button {
      display: inline-block;
      background-color: #3b82f6;
      color: white;
      text-decoration: none;
      padding: 12px 24px;
      border-radius: 6px;
      font-weight: 600;
      margin: 20px 0;
    }
    .footer {
      margin-top: 30px;
      font-size: 12px;
      color: #6b7280;
      text-align: center;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="logo">
      <img src="https://yarda.app/logo.png" alt="Yarda" width="120" />
    </div>

    <h2>Sign in to Yarda</h2>
    <p>Click the button below to sign in to your Yarda account:</p>

    <a href="{{ .ConfirmationURL }}" class="button">
      Sign in to Yarda
    </a>

    <p style="color: #6b7280; font-size: 14px;">
      Or copy and paste this URL into your browser:<br>
      <a href="{{ .ConfirmationURL }}">{{ .ConfirmationURL }}</a>
    </p>

    <div class="footer">
      <p>This link expires in 1 hour.</p>
      <p>If you didn't request this email, you can safely ignore it.</p>
    </div>
  </div>
</body>
</html>
```

**Available Variables**:
- `{{ .ConfirmationURL }}` - Magic link URL with token
- `{{ .Token }}` - OTP token (if you want to display it separately)
- `{{ .SiteURL }}` - Your app URL (configured in Supabase settings)

**Testing Email Template**:

1. Save template in Supabase dashboard
2. Send test email: `Send test email` button
3. Check inbox to verify styling and links work

---

## Common Development Tasks

### Task 1: Test Rate Limiting

**Goal**: Verify rate limiting (3 requests/hour) works correctly.

**Steps**:

1. Go to http://localhost:3000/login
2. Enter email: `test+1@example.com`
3. Click "Send Magic Link" → Should succeed
4. Wait 5 seconds
5. Enter email: `test+1@example.com` (same email)
6. Click "Send Magic Link" → Should succeed
7. Wait 5 seconds
8. Repeat step 6 → Should succeed
9. Wait 5 seconds
10. Repeat step 6 → Should fail with "Email rate limit exceeded" error

**Expected Error**:
```typescript
{
  message: "Email rate limit exceeded",
  status: 429,
  code: "over_email_send_rate_limit"
}
```

**Reset**: Wait 1 hour, or use different email addresses (`test+2@example.com`, etc.)

### Task 2: Test Link Expiration

**Goal**: Verify magic links expire after 1 hour.

**Steps**:

1. Send magic link to your email
2. Wait 61 minutes (or mock expiration in test environment)
3. Click the magic link
4. Should see error: "This link has expired. Please request a new one."

**Mock Expiration** (for faster testing):

Temporarily modify Supabase Auth settings:
- Go to: https://supabase.com/dashboard/project/gxlmnjnjvlslijiowamn/auth/settings
- Change "Magic Link Expiry" from 3600 to 60 seconds
- Test expiration after 61 seconds
- **Important**: Change back to 3600 after testing!

### Task 3: Test Single-Use Enforcement

**Goal**: Verify magic link can only be used once.

**Steps**:

1. Send magic link to your email
2. Copy the magic link URL from email
3. Paste URL in browser → Should authenticate successfully
4. Sign out from the app
5. Paste same URL again → Should fail with "Invalid link" error

**Expected Behavior**:
- First use: ✅ Authentication successful
- Second use: ❌ Error: "This link has expired or has already been used"

### Task 4: Test Cross-Device Authentication

**Goal**: Verify magic link works on different device than requested.

**Steps**:

1. On Device A (laptop): Go to http://localhost:3000/login
2. Enter your email and send magic link
3. On Device B (phone): Open email app
4. Click magic link in email
5. Should open browser on Device B and authenticate
6. Device A should remain unauthenticated (separate sessions)

**Expected Behavior**:
- Device B: ✅ Authenticated, session created
- Device A: ❌ Not authenticated (unless you log in separately)

---

## Debugging Tips

### Issue 1: "Email rate limit exceeded" on first request

**Symptom**: Getting rate limit error even though you haven't sent any magic links.

**Causes**:
- You sent 3+ magic links in the past hour from previous testing
- Rate limit is per email address, not per session

**Solutions**:
1. Wait 1 hour for rate limit to reset
2. Use different email address (`yourname+1@gmail.com`, `yourname+2@gmail.com`, etc.)
3. Temporarily increase rate limit in Supabase dashboard (not recommended for production)

### Issue 2: Magic link email not arriving

**Symptom**: "Check your email" message appears, but email never arrives.

**Causes**:
1. Email in spam folder
2. Supabase SMTP delay (can take up to 60 seconds)
3. Invalid email address
4. Supabase email service outage

**Solutions**:
1. Check spam/junk folder
2. Wait 2-3 minutes before assuming failure
3. Verify email address is valid (use email validator)
4. Check Supabase status: https://status.supabase.com
5. View email in Supabase Dashboard (Option 2 above)

### Issue 3: "Invalid link" error when clicking magic link

**Symptom**: Clicking magic link shows "Invalid link" error immediately.

**Causes**:
1. Link already used (single-use enforcement)
2. Link expired (> 1 hour old)
3. Malformed URL (missing token parameter)

**Solutions**:
1. Request new magic link (old one is consumed)
2. Check email timestamp - if > 1 hour old, request new link
3. Copy entire URL including `?token=...` parameter

### Issue 4: Infinite redirect loop after magic link click

**Symptom**: After clicking magic link, browser keeps redirecting between `/auth/callback` and `/login`.

**Causes**:
1. User not synced to `public.users` table (database trigger issue)
2. Maintenance mode blocking new users (callback.tsx lines 56-70)

**Solutions**:
1. Check database: `SELECT * FROM users WHERE email = 'your@email.com'`
2. If user missing, manually create:
   ```sql
   INSERT INTO users (id, email, email_verified, trial_remaining)
   VALUES ('auth-uuid-here', 'your@email.com', true, 3);
   ```
3. Temporarily disable maintenance mode check in callback.tsx (comment out lines 57-70)

### Issue 5: CORS errors in browser console

**Symptom**: `Access to fetch at 'http://localhost:8000' from origin 'http://localhost:3000' has been blocked by CORS policy`

**Causes**:
1. Backend not running (port 8000 not responding)
2. Backend virtual environment not activated
3. Frontend `.env.local` pointing to production Railway URL instead of localhost

**Solutions**:
1. Start backend: `cd backend && source venv/bin/activate && uvicorn src.main:app --reload --port 8000`
2. Verify venv activated: `which python` should show `backend/venv/bin/python`
3. Edit `frontend/.env.local`: Change `NEXT_PUBLIC_API_URL` to `http://localhost:8000`

---

## Testing Checklist

Before marking magic link feature as complete, verify:

- [ ] Send magic link succeeds with valid email
- [ ] Send magic link fails with invalid email format
- [ ] Success message appears: "Check your email for a magic link!"
- [ ] Email arrives within 60 seconds
- [ ] Email contains clickable magic link button
- [ ] Clicking magic link authenticates user
- [ ] User redirected to `/generate` page after authentication
- [ ] User session persists after browser refresh
- [ ] Clicking same magic link twice shows "already used" error
- [ ] Clicking expired magic link (> 1 hour) shows "expired" error
- [ ] Sending 4 magic links in 1 hour shows rate limit error
- [ ] Rate limit error message suggests using password login
- [ ] Magic link works on different device than requested
- [ ] Browser console has zero errors during flow
- [ ] User data appears in Zustand store (`useUserStore.getState()`)
- [ ] Access token stored in localStorage: `localStorage.getItem('access_token')`

---

## Next Steps

After local development and testing:

1. **Write E2E tests** (`frontend/tests/e2e/magic-link-auth.spec.ts`):
   - Test magic link send flow
   - Test rate limiting behavior
   - Test callback authentication
   - Test error states

2. **Update UI/UX**:
   - Add magic link section to login page
   - Style success/error messages
   - Add loading states
   - Add "Resend magic link" functionality

3. **Production deployment**:
   - Merge to `main` branch
   - Verify email template in production Supabase
   - Test with real email addresses
   - Monitor Supabase email logs for delivery issues

4. **Custom SMTP** (Optional, future):
   - Upgrade to SendGrid or AWS SES for higher rate limits
   - Customize email branding (logo, colors, copy)
   - Set up email analytics (open rates, click rates)

---

## Resources

- **Supabase Auth Docs**: https://supabase.com/docs/guides/auth/auth-magic-link
- **Supabase Dashboard**: https://supabase.com/dashboard/project/gxlmnjnjvlslijiowamn
- **Email Templates**: https://supabase.com/dashboard/project/gxlmnjnjvlslijiowamn/auth/templates
- **Rate Limits**: https://supabase.com/docs/guides/auth/auth-rate-limits
- **SMTP Settings**: https://supabase.com/docs/guides/auth/auth-smtp

---

**Quickstart Status**: COMPLETE
**Last Updated**: 2025-11-09
