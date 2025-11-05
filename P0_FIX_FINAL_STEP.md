# 🔴 P0 Fix - Final Step Required

**Status:** Code deployed ✅ | Environment variable INCORRECT ❌
**Date:** 2025-11-05
**Blocker:** Wrong Supabase service role key in Railway

---

## Problem Identified

The new Supabase Auth code is deployed and running, but using the **WRONG Supabase project credentials**:

### Current Railway Environment Variables:
```
SUPABASE_URL=https://gxlmnjnjvlslijiowamn.supabase.co  ✅ CORRECT
SUPABASE_SERVICE_ROLE_KEY=eyJhbGc...  ❌ WRONG PROJECT (ynsfmvonkoodmqfkukge)
```

**Evidence:**
- Decoded service role key shows project ref: `ynsfmvonkoodmqfkukge`
- Correct project ref should be: `gxlmnjnjvlslijiowamn`
- Registration succeeds but users don't appear in database
- Supabase Auth calls are hitting wrong project

---

## Required Action: Update Railway Environment Variable

### Step 1: Get Correct Service Role Key

1. Go to [Supabase Dashboard](https://supabase.com/dashboard/project/gxlmnjnjvlslijiowamn)
2. Navigate to **Project Settings** (gear icon) → **API**
3. Scroll to **Project API keys** section
4. Copy the **`service_role` key** (NOT the `anon` key)
5. **Verify** the key starts with `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd4bG1uam5qdmxzbGlqaW93YW1uIi...`
   - Check that decoded JWT contains `"ref":"gxlmnjnjvlslijiowamn"`

### Step 2: Update Railway Variable

**Option A: Railway Dashboard** (Recommended)
1. Go to https://railway.app/project/7a8f9bcb-a265-4c34-82d2-c9c3655d26bf
2. Click `yarda-api` service
3. Go to **Variables** tab
4. Find `SUPABASE_SERVICE_ROLE_KEY`
5. Click **Edit** and paste new service role key
6. Click **Save** → Railway will auto-redeploy

**Option B: Railway CLI**
```bash
cd backend
railway variables set SUPABASE_SERVICE_ROLE_KEY="[paste new service_role key]"
```

---

## Verification After Update

### 1. Check Deployment Logs
```bash
railway logs --follow
```
Look for: "Database connection pool initialized" (no errors)

### 2. Test Registration API
```bash
curl -X POST https://yarda-api-production.up.railway.app/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email": "final-test@yarda.ai", "password": "TestPassword123"}'
```

Expected: `{"user_id": "...", "email": "final-test@yarda.ai", ...}`

### 3. **CRITICAL: Verify User in Database**
```sql
-- Should return 1 row in auth.users
SELECT id, email FROM auth.users WHERE email = 'final-test@yarda.ai';

-- Should return 1 row in public.users (synced by trigger)
SELECT id, email, trial_remaining FROM public.users WHERE email = 'final-test@yarda.ai';
```

**Expected:** User appears in BOTH tables ✅

### 4. Test Login
```bash
curl -X POST https://yarda-api-production.up.railway.app/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "final-test@yarda.ai", "password": "TestPassword123"}'
```

Expected: Returns access token and user profile

### 5. Test Generation (After Manual Email Verification)
```sql
-- Bypass email verification for testing
UPDATE users SET email_verified = true WHERE email = 'final-test@yarda.ai';
```

```bash
curl -X POST https://yarda-api-production.up.railway.app/generations/ \
  -H "Authorization: Bearer [user_id from login]" \
  -F "address=1600 Amphitheatre Parkway, Mountain View, CA" \
  -F "area=front_yard" \
  -F "style=modern_minimalist"
```

**Expected:** Generation starts (NOT "User not found") ✅

---

## Why This Fix Works

### Before Fix:
```
User Registration Request
  ↓
Backend /auth/register (NEW CODE)
  ↓
supabase.auth.admin.create_user()
  ↓
❌ WRONG Supabase project (ynsfmvonkoodmqfkukge)
  ↓
User created in WRONG project's auth.users
  ↓
Trigger doesn't fire in CORRECT project
  ↓
User not in correct database
  ↓
All API calls fail: "User not found"
```

### After Fix:
```
User Registration Request
  ↓
Backend /auth/register (NEW CODE)
  ↓
supabase.auth.admin.create_user()
  ↓
✅ CORRECT Supabase project (gxlmnjnjvlslijiowamn)
  ↓
User created in CORRECT project's auth.users
  ↓
Database trigger fires: on_auth_user_created
  ↓
User synced to public.users with trial_remaining=3
  ↓
All API calls work: User found in database ✅
```

---

## Code Changes Already Deployed

**Commit:** 0c80366 ✅ DEPLOYED
**Deployment:** 1361a307-a79a-4c9e-add1-4b6da669cabf (SUCCESS)

- ✅ Added `supabase==2.23.2` SDK
- ✅ Added Supabase Auth config to settings
- ✅ Updated `/auth/register` to use `supabase.auth.admin.create_user()`
- ✅ Updated `/auth/login` to use `supabase.auth.sign_in_with_password()`
- ✅ Railway deployment successful

**Only remaining step:** Update SUPABASE_SERVICE_ROLE_KEY to correct project

---

## Expected Impact After Fix

### Immediate:
- ✅ Users properly created in auth.users
- ✅ Database trigger syncs to public.users
- ✅ No more "User not found" errors
- ✅ Generation API unblocked
- ✅ Token purchase unblocked

### Testing:
- ✅ Can complete full E2E test suite
- ✅ Can validate trial flow (3 credits)
- ✅ Can test token purchase with Stripe
- ✅ Can verify all CUJs (Critical User Journeys)

---

## Rollback Plan (If Issues)

If the new service role key causes problems:

1. Revert environment variable:
```bash
railway variables set SUPABASE_SERVICE_ROLE_KEY="[old key]"
```

2. Or revert entire deployment:
```bash
git revert 0c80366
git push origin 003-google-maps-integration
```

---

## Current Test Results

**Test User:** `test-supabase-fix@yarda.ai`
**Registration:** ✅ Returns 201 with user_id
**Database Check:**
- ❌ NOT in auth.users (wrong project)
- ❌ NOT in public.users (trigger didn't fire)

**This confirms the service role key is pointing to the wrong Supabase project.**

---

## Next Steps After Fix

1. ✅ Update SUPABASE_SERVICE_ROLE_KEY in Railway
2. ✅ Wait for auto-redeploy (~2 minutes)
3. ✅ Test registration → verify user in database
4. ✅ Test login → verify returns token
5. ✅ Test generation → verify works (after email verification)
6. ✅ Update CORE_FEATURE_TEST_REPORT.md with RESOLVED status
7. ✅ Run complete E2E test suite
8. ✅ Mark P0 blocker as FIXED

---

**Last Updated:** 2025-11-05 17:15 UTC
**Action Required:** Update Railway environment variable
**ETA to Resolution:** 5 minutes (after variable update)

---

## Quick Reference

**Railway Project:** https://railway.app/project/7a8f9bcb-a265-4c34-82d2-c9c3655d26bf
**Supabase Dashboard:** https://supabase.com/dashboard/project/gxlmnjnjvlslijiowamn/settings/api
**Correct Project Ref:** `gxlmnjnjvlslijiowamn`
**Current (Wrong) Project Ref in Key:** `ynsfmvonkoodmqfkukge`
