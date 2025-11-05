# P0 Fix Deployment Instructions

**Date:** 2025-11-05
**Issue:** User database synchronization blocker (CORE_FEATURE_TEST_REPORT.md)
**Status:** Code fixed, awaiting environment variable configuration

---

## Critical Environment Variables Required

The backend code has been updated to use Supabase Auth, but requires two new environment variables to be set in Railway:

### 1. SUPABASE_URL
**Value:** `https://gxlmnjnjvlslijiowamn.supabase.co`
**Status:** ✅ Set in Railway

### 2. SUPABASE_SERVICE_ROLE_KEY
**Value:** Get from Supabase Dashboard
**Status:** ⚠️ **NEEDS TO BE SET**

---

## How to Get SUPABASE_SERVICE_ROLE_KEY

1. Go to [Supabase Dashboard](https://supabase.com/dashboard/project/gxlmnjnjvlslijiowamn)
2. Navigate to **Project Settings** (gear icon) > **API**
3. Scroll to **Project API keys** section
4. Copy the **`service_role` key** (secret key with full access)
5. **IMPORTANT:** This is NOT the `anon` key - it's the `service_role` key

---

## Setting Environment Variables in Railway

### Option 1: Railway Dashboard (Recommended)
1. Go to https://railway.app/project/7a8f9bcb-a265-4c34-82d2-c9c3655d26bf
2. Click on `yarda-api` service
3. Go to **Variables** tab
4. Add variable:
   - Name: `SUPABASE_SERVICE_ROLE_KEY`
   - Value: `[paste service_role key from Supabase]`
5. Click **Deploy** to restart with new variable

### Option 2: Railway CLI
```bash
cd backend
railway variables set SUPABASE_SERVICE_ROLE_KEY="eyJhbGc..."
```

---

## Verification Steps

After setting the environment variables:

### 1. Check Railway Deployment Logs
```bash
railway logs --follow
```

Look for:
- ✅ "Starting Yarda AI Landscape Studio API..."
- ✅ "Database connection pool initialized"
- ❌ No errors about missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY

### 2. Test Registration API
```bash
curl -X POST https://yarda-api-production.up.railway.app/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test-fix-verification@yarda.ai",
    "password": "TestPassword123"
  }'
```

**Expected Response:**
```json
{
  "user_id": "uuid-here",
  "email": "test-fix-verification@yarda.ai",
  "trial_remaining": 3,
  "verification_sent": true
}
```

### 3. Verify User in Database
```sql
-- Check auth.users (Supabase Auth)
SELECT id, email, created_at FROM auth.users
WHERE email = 'test-fix-verification@yarda.ai';

-- Check public.users (Application - should be synced by trigger)
SELECT id, email, trial_remaining, created_at FROM public.users
WHERE email = 'test-fix-verification@yarda.ai';
```

**Expected:** User appears in BOTH tables

### 4. Test Login API
```bash
curl -X POST https://yarda-api-production.up.railway.app/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test-fix-verification@yarda.ai",
    "password": "TestPassword123"
  }'
```

**Expected Response:**
```json
{
  "access_token": "user-uuid",
  "token_type": "bearer",
  "user": {
    "id": "user-uuid",
    "email": "test-fix-verification@yarda.ai",
    "email_verified": false,
    "trial_remaining": 3,
    "trial_used": 0,
    "subscription_tier": "free",
    "subscription_status": "inactive",
    "created_at": "2025-11-05T..."
  }
}
```

### 5. Test Generation API (After Manual Email Verification)
```sql
-- Manually verify email for testing
UPDATE users SET email_verified = true
WHERE email = 'test-fix-verification@yarda.ai';
```

```bash
curl -X POST https://yarda-api-production.up.railway.app/generations/ \
  -H "Authorization: Bearer [user-uuid-from-login]" \
  -F "address=1600 Amphitheatre Parkway, Mountain View, CA" \
  -F "area=front_yard" \
  -F "style=modern_minimalist"
```

**Expected:** Generation starts processing (not "User not found")

---

## Changes Made in Code

### backend/requirements.txt
- Added `supabase==2.23.2` SDK

### backend/src/config.py
- Added `supabase_url` and `supabase_service_role_key` settings

### backend/src/api/endpoints/auth.py
- **Registration:** Now uses `supabase.auth.admin.create_user()`
  - Creates user in `auth.users` table
  - Trigger automatically syncs to `public.users`
- **Login:** Now uses `supabase.auth.sign_in_with_password()`
  - Authenticates against Supabase Auth
  - Fetches profile from `public.users` after auth

---

## Expected Impact

### Before Fix:
- ❌ Users created via `/auth/register` disappeared from database
- ❌ All API calls returned "User not found"
- ❌ Generation API blocked
- ❌ Token purchase blocked
- ❌ All core features unusable

### After Fix:
- ✅ Users properly synced to database via trigger
- ✅ Authentication works correctly
- ✅ Generation API unblocked
- ✅ Token purchase unblocked
- ✅ All core features functional

---

## Rollback Plan (If Issues Occur)

If the fix causes problems:

1. Revert to previous commit:
```bash
git revert 0c80366
git push origin 003-google-maps-integration
```

2. Railway will auto-deploy previous version

3. Previous registration flow will resume (broken, but stable)

---

## Next Steps After Deployment

1. ✅ Verify environment variables set
2. ✅ Monitor Railway deployment logs
3. ✅ Test registration API
4. ✅ Verify users sync to database
5. ✅ Test login API
6. ✅ Test generation API
7. ✅ Update CORE_FEATURE_TEST_REPORT.md with results
8. ✅ Run complete E2E test suite
9. ✅ Mark P0 blocker as RESOLVED

---

**Commit:** 0c80366
**Branch:** 003-google-maps-integration
**Railway Project:** yarda-api (7a8f9bcb-a265-4c34-82d2-c9c3655d26bf)
