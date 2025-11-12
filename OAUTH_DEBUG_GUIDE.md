# OAuth Sign-In Debug Guide - Critical Issue

## Symptom
User updated Supabase OAuth settings but single sign-on loops back to sign-in page instead of authenticating.

---

## Root Cause Analysis

The issue is in the OAuth callback chain. When you update Supabase OAuth settings, the redirect URL must match **EXACTLY** including query parameters.

### What Should Happen
```
1. User clicks "Sign in with Google"
   ↓
2. Redirects to Google auth
   ↓
3. Google redirects back to: https://production-domain.com/auth/callback?code=XXX&state=YYY
   ↓
4. Supabase auth listener detects SIGNED_IN event
   ↓
5. Frontend fetches user from database
   ↓
6. Frontend stores user + token in Zustand + localStorage
   ↓
7. Frontend redirects to /holiday
```

### What's Likely Happening
```
1. User clicks "Sign in with Google"
   ↓
2. Redirects to Google auth
   ↓
3. Google redirects back to callback
   ↓
4. ❌ SIGNED_IN event NEVER fires
   ↓
5. Timeout (3 seconds) → Redirects to /login
   ↓
   User sees sign-in page again
```

---

## Debugging Steps

### Step 1: Check Browser Console During Sign-In

1. Open production page
2. Open DevTools (F12)
3. Click "Sign in with Google"
4. Watch Console tab for logs starting with `[Auth Callback]` or `[signInWithGoogle]`

**What to look for:**
- `[signInWithGoogle] Window origin:` - Should show production domain (not localhost)
- `[Auth Callback] Starting OAuth callback handler` - Should appear after Google redirect
- `[Auth Callback] Auth state change: SIGNED_IN` - **CRITICAL** - If this doesn't appear, session not detected
- `[Auth Callback] Session exists: true` - Should be true
- `[Auth Callback] User ID:` and `[Auth Callback] User email:` - Should show actual user data

**If these logs don't appear:**
→ Go to Step 2

---

### Step 2: Verify OAuth Redirect URL Matches

The redirect URL configured in Supabase **MUST match exactly** what's being sent by the frontend.

**Frontend sends:**
```
https://your-production-domain.com/auth/callback?redirect=/holiday
```

**Supabase configured redirect URIs might be:**
```
https://your-production-domain.com/auth/callback  ✅ CORRECT
https://your-production-domain.com/auth/callback?redirect=/holiday  ✅ ALSO CORRECT
```

**Common mistakes:**
- ❌ `https://your-production-domain.com/auth/callback/` (trailing slash)
- ❌ `https://your-production-domain.com/` (missing /auth/callback)
- ❌ `http://` instead of `https://`
- ❌ Wrong domain name

**To verify in Supabase:**
1. Go to https://supabase.com/dashboard
2. Select project: `yarda`
3. Go to: **Authentication** → **Providers** → **Google**
4. Look at "Redirect URLs" field
5. Copy one URL from the list
6. Compare with what's in browser console log `[signInWithGoogle] Callback URL:`

They should match (or at least the base should match without query params).

---

### Step 3: Check if User Exists in Database

If logs show `SIGNED_IN` but you still get redirected to sign-in, the issue is database-related.

**Check the logs for:**
```
[Auth Callback] Processing SIGNED_IN event
[Auth Callback] User ID: abc-123
[Auth Callback] Waiting for database sync...
[Auth Callback] Querying users table...
```

If you see this error next:
```
❌ New user detected - registration blocked during maintenance
```

**The issue:** User exists in Supabase Auth (`auth.users` table) but NOT in `public.users` table.

**Fix:**
- Check if database trigger is working
- Run: `SELECT id, email FROM users WHERE id = 'USER_ID_FROM_LOGS'`
- If no result, user wasn't synced from auth.users

---

### Step 4: Check Session Detection Issue

If you don't see `[Auth Callback] Auth state change:` logs at all:

The `onAuthStateChange` listener isn't firing. This could mean:

1. **Supabase client not initialized correctly**
   - Check: `NEXT_PUBLIC_SUPABASE_URL` environment variable is correct
   - Check: `NEXT_PUBLIC_SUPABASE_ANON_KEY` is correct
   - Verify in browser console: `console.log(supabase.auth)`

2. **Session not created by OAuth provider**
   - Redirect URL mismatch (see Step 2)
   - OAuth provider settings missing
   - Network issue during OAuth flow

3. **detectSessionInUrl not working**
   - `supabase.ts` has `detectSessionInUrl: true` (should work)
   - Check URL after redirect - should have `#access_token=` or `?code=`

---

### Step 5: Manual Session Recovery

If OAuth is completely broken, user can manually recover:

1. Go to production page
2. Open DevTools Console
3. Run:
```javascript
// Check if any session exists
const { data } = await supabase.auth.getSession();
console.log('Existing session:', data.session);

// If no session, sign out
if (!data.session) {
  await supabase.auth.signOut();
  window.location.href = '/login';
}
```

---

## Step-by-Step Fix Checklist

- [ ] **1. Browser Console Debug**
  - [ ] Sign in with Google
  - [ ] Check console for `[Auth Callback]` logs
  - [ ] Look for `SIGNED_IN` event
  - [ ] Note any errors

- [ ] **2. Verify Redirect URL**
  - [ ] Check Supabase OAuth config
  - [ ] Compare with console logs
  - [ ] URLs match exactly (or base without params)

- [ ] **3. Database Check**
  - [ ] Run: `SELECT COUNT(*) FROM users`
  - [ ] Verify user email exists in table
  - [ ] Check if trigger is syncing new auth.users

- [ ] **4. Environment Variable Check**
  - [ ] Verify `NEXT_PUBLIC_SUPABASE_URL` in Vercel dashboard
  - [ ] Verify `NEXT_PUBLIC_SUPABASE_ANON_KEY` is set
  - [ ] Redeploy if changed recently

- [ ] **5. Clear Browser Cache**
  - [ ] Hard refresh: Cmd+Shift+R (Mac) or Ctrl+Shift+R (Windows)
  - [ ] Clear cookies for production domain
  - [ ] Close all tabs for app
  - [ ] Open fresh tab and retry

---

## If Issue Persists

If you've checked all of the above and sign-in still loops back:

1. **Temporarily disable maintenance mode check**
   - Edit: `frontend/src/pages/auth/callback.tsx` line 78-91
   - Comment out the PGRST116 check
   - This will let users proceed even if not in database
   - Deploy and test

2. **Check network requests**
   - DevTools → Network tab
   - Look for request to `supabase.co`
   - Check if status is 200, 401, or other
   - Check if response has `access_token`

3. **Verify Google OAuth credentials**
   - In Supabase, check Google OAuth is enabled
   - Check credentials are valid (not expired)
   - Check redirect URIs include your production domain

4. **Contact Support**
   - Provide:
     - Production domain URL
     - Console log output from callback
     - Supabase OAuth redirect URIs list
     - Expected vs actual user email

---

## Prevention: URL Configuration Checklist

For future deployments, ensure:

**Supabase OAuth Redirect URIs should include:**
```
https://yourdomain.com/auth/callback
https://yourdomain.com/auth/callback?redirect=/holiday
https://yourdomain.com/auth/callback?redirect=/generate
```

**Frontend code is:**
- ✅ Using `window.location.origin` (auto-detects domain)
- ✅ Appending query params for redirects
- ✅ Handling both success and error cases

**Environment setup is:**
- ✅ `NEXT_PUBLIC_SUPABASE_URL` matches Supabase project URL
- ✅ `NEXT_PUBLIC_SUPABASE_ANON_KEY` is current anon key
- ✅ Redeploy after changing environment variables
