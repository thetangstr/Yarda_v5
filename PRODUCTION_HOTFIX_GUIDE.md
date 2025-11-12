# Production Hotfix Guide - November 12, 2025

## Status Summary

### ✅ FIXED - Issues 1 & 2
1. **Before/After Photos Not Displaying** - RESOLVED
   - Root cause: BeforeAfterSlider component used non-existent Tailwind CSS classes (brand-sage, brand-green, brand-cream, brand-dark-green)
   - Fix: Replaced with standard Tailwind utility classes (gray-100, green-500, etc.)
   - Commits: 4d6a998, f7a2e16
   - Status: Deployed to production ✅

2. **"See What's Possible" Demo Section** - RESOLVED
   - Root cause: Same CSS class issue as above
   - Fix: Fixed by correcting BeforeAfterSlider component
   - Status: Should now display correctly ✅

### ⚠️ IN PROGRESS - Issue 3
3. **Google Sign-In Redirecting to localhost** - ROOT CAUSE IDENTIFIED
   - Root cause: Supabase OAuth redirect URIs not configured for production domain
   - Status: Requires manual Supabase console configuration (see below)
   - Frontend code is correct - using `window.location.origin` which should resolve to production domain

---

## How to Fix Google Sign-In Localhost Redirect

### Problem Explanation
When users click "Sign in with Google", they're redirected to `http://localhost:3000/auth/callback` instead of the production domain. This happens because:

1. The Supabase OAuth provider (Google) tries to redirect back to the allowed redirect URIs configured in Supabase console
2. If the production domain is not in that list, Supabase may reject it and use a fallback URL
3. Supabase console needs to be updated with the production domain

### Solution: Add Production Domain to Supabase OAuth Settings

#### Step 1: Identify Your Production Domain
- Frontend production URL: Check your Vercel dashboard for the production domain
  - Likely: `https://yarda-v5-frontend.vercel.app` (or custom domain if configured)
  - Check: Open the holiday page in production and note the full URL

#### Step 2: Go to Supabase Console
1. Navigate to: https://supabase.com/dashboard
2. Select project: `yarda` (Project ID: `gxlmnjnjvlslijiowamn`)
3. Go to: **Authentication** → **Providers** → **Google**

#### Step 3: Update Redirect URIs
In the Google OAuth provider settings, you'll see "Redirect URLs" or similar field.

Add ALL of these redirect URIs:
```
http://localhost:3000/auth/callback
http://localhost:3000/auth/callback?redirect=/holiday
https://yarda-v5-frontend.vercel.app/auth/callback
https://yarda-v5-frontend.vercel.app/auth/callback?redirect=/holiday
https://your-custom-domain.com/auth/callback (if using custom domain)
https://your-custom-domain.com/auth/callback?redirect=/holiday (if using custom domain)
```

**IMPORTANT:** Include BOTH versions:
- Without `?redirect=...` (for Google OAuth flow)
- With `?redirect=/holiday` (for holiday page sign-in)

#### Step 4: Save and Test
1. Click "Save" in Supabase console
2. Wait 30-60 seconds for changes to propagate
3. Test the sign-in flow:
   - Open production holiday page in new browser window
   - Click "Sign in with Google"
   - Should redirect to production domain (not localhost)
   - After sign-in, should redirect to `/holiday` page

### Debugging Tips

If redirect still goes to localhost after fixing Supabase:

1. **Clear browser cache:**
   - Hard refresh: Cmd+Shift+R (Mac) or Ctrl+Shift+R (Windows)
   - Clear cookies for localhost

2. **Check browser console (F12):**
   - Look for logs starting with `[signInWithGoogle]`
   - Verify `Window origin` shows production domain (not localhost)
   - Check for any OAuth errors

3. **Verify environment variables:**
   - Vercel dashboard → Project settings → Environment variables
   - `NEXT_PUBLIC_SUPABASE_URL` should be `https://gxlmnjnjvlslijiowamn.supabase.co`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` should be set to valid key

4. **Check Vercel deployment:**
   - Verify latest commit (f7a2e16) is deployed
   - Check deployment logs for any errors

---

## Additional Verification

### To Verify All Three Issues Are Fixed:

1. **Check CSS classes** (Issue 1 & 2):
   - Go to production holiday page
   - Scroll down to see "✨ See What's Possible" section
   - Should see before/after slider with images
   - Slider handle should be visible and draggable

2. **Check Google Sign-In** (Issue 3):
   - Click "Sign in with Google"
   - Verify redirect URL in address bar is production (not localhost)
   - Complete sign-in flow
   - Should redirect to `/holiday` page (not `/generate`)

3. **Check Magic Link** (Bonus):
   - Click "Sign in with Magic Link"
   - Enter email
   - Check email for magic link
   - Link should contain production domain

---

## Production Commits

| Commit | Message | Changes |
|--------|---------|---------|
| 4d6a998 | Fix BeforeAfterSlider CSS classes | Replaced brand-* with standard Tailwind |
| f7a2e16 | Add OAuth debugging logs | Added console logging to diagnose OAuth issues |

---

## Next Steps

1. **Immediate (Now):**
   - ✅ CSS fixes deployed to production
   - ⏳ Update Supabase OAuth settings (manual step)
   - ⏳ Test sign-in flow

2. **Short Term (Today):**
   - Verify all three issues are resolved
   - Monitor error logs for any regressions
   - Test full CUJ: Sign-in → Holiday page → Generate

3. **Long Term:**
   - Document OAuth configuration in CLAUDE.md
   - Create automated checks for CSS class usage
   - Consider pre-deploy testing against production Supabase

---

## Contact / Support

If issues persist after following this guide:

1. Check the console logs with timestamps
2. Verify Supabase settings were saved correctly
3. Try incognito/private browser mode (bypasses cache)
4. Check Vercel build logs for deployment errors
5. Verify environment variables in Vercel match expected values
