# Environment Variables Cleanup - Complete Summary

**Date:** 2025-11-06
**Status:** ✅ 90% Complete (Railway needs manual verification)

---

## 🎯 Root Cause Identified

**The Issue:** System environment variables pointing to OLD Supabase project were overriding `.env` files:
- System had: `srktllgrxvgwjlbxmpeh.supabase.co` (OLD project)
- Should use: `gxlmnjnjvlslijiowamn.supabase.co` (CORRECT project)

This was causing JWT validation to fail because tokens from the new project couldn't be validated against the old project's keys.

---

## ✅ Audit Results

### Local Environment - ALL CORRECT ✅

**Backend `/Volumes/home/Projects_Hosted/Yarda_v5/backend/.env`:**
```bash
✅ SUPABASE_URL=https://gxlmnjnjvlslijiowamn.supabase.co
✅ SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd4bG1uam5qdmxzbGlqaW93YW1uIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjIyODY2NzksImV4cCI6MjA3Nzg2MjY3OX0.74lCmbHcF9PZJu6LTHa7KtO3-rwCDAxpA4R6bIGF-m8
✅ SUPABASE_SERVICE_ROLE_KEY=[correct key for gxlmnjnjvlslijiowamn]
```

**Frontend `/Volumes/home/Projects_Hosted/Yarda_v5/frontend/.env.local`:**
```bash
✅ NEXT_PUBLIC_SUPABASE_URL=https://gxlmnjnjvlslijiowamn.supabase.co
✅ NEXT_PUBLIC_SUPABASE_ANON_KEY=[correct key for gxlmnjnjvlslijiowamn]
✅ NEXT_PUBLIC_API_URL=https://yarda-api-production.up.railway.app
```

### System Environment - ISSUE IDENTIFIED ⚠️

**Problem Variables (currently set in system):**
```bash
❌ SUPABASE_URL=https://srktllgrxvgwjlbxmpeh.supabase.co
❌ SUPABASE_DB_USER=postgres.srktllgrxvgwjlbxmpeh
❌ VITE_SUPABASE_ANON_KEY=[old project key]
```

**Source:** NOT in shell profile files (checked ~/.zshrc, ~/.bashrc, ~/.profile, ~/.zprofile)
- Likely set by parent process or IDE/terminal session
- **Current Workaround:** Using `backend/start_backend.sh` which unsets these before starting

### Vercel Production - ALL CORRECT ✅

**Verified via `vercel env pull`:**
```bash
✅ NEXT_PUBLIC_SUPABASE_URL="https://gxlmnjnjvlslijiowamn.supabase.co"
✅ NEXT_PUBLIC_SUPABASE_ANON_KEY=[correct key for gxlmnjnjvlslijiowamn]
✅ NEXT_PUBLIC_API_URL="https://yarda-api-production.up.railway.app"
```

All environments (Production, Preview, Development) are correctly configured.

### Railway Production - NEEDS MANUAL VERIFICATION ⏳

**Project:** yarda-api
**ID:** `7a8f9bcb-a265-4c34-82d2-c9c3655d26bf`
**URL:** https://yarda-api-production.up.railway.app

**Action Required:** Manual verification via Railway Dashboard

**To Verify:**
1. Go to: https://railway.app/project/7a8f9bcb-a265-4c34-82d2-c9c3655d26bf
2. Click on "yarda-api" service
3. Navigate to "Variables" tab
4. Check these variables:
   ```
   SUPABASE_URL (should be: https://gxlmnjnjvlslijiowamn.supabase.co)
   SUPABASE_ANON_KEY (should match the correct project key)
   SUPABASE_SERVICE_ROLE_KEY (should match the correct project key)
   DATABASE_URL (should point to gxlmnjnjvlslijiowamn.supabase.co)
   ```

---

## 🔧 Fixes Implemented

### 1. Backend JWT Validation Fix ✅
**Files Modified:**
- [/backend/src/api/dependencies.py](backend/src/api/dependencies.py) (lines 71-117)
- [/backend/src/config.py](backend/src/config.py) (line 24)
- [/backend/.env](backend/.env) (line 27)

**Changes:**
- Changed JWT validation to use `SUPABASE_ANON_KEY` instead of `SUPABASE_SERVICE_ROLE_KEY`
- Added detailed debug logging for JWT validation
- Added `supabase_anon_key` field to Settings class

### 2. Startup Script to Handle System Env Override ✅
**Created:** [/backend/start_backend.sh](backend/start_backend.sh)

This script unsets the problematic system environment variables before starting the backend:
```bash
#!/bin/bash
unset SUPABASE_URL
unset VITE_SUPABASE_ANON_KEY
unset SUPABASE_DB_HOST
unset SUPABASE_DB_NAME
unset SUPABASE_DB_PORT
unset SUPABASE_DB_USER

source venv/bin/activate
uvicorn src.main:app --reload --port 8000
```

**Usage:**
```bash
cd /Volumes/home/Projects_Hosted/Yarda_v5/backend
./start_backend.sh
```

---

## 🧪 Testing Status

### Backend Verification ✅
```bash
# Verified backend is using correct Supabase project:
cd backend
source venv/bin/activate
python -c "from src.config import settings; print(f'URL: {settings.supabase_url}')"
# Output: https://gxlmnjnjvlslijiowamn.supabase.co ✅
```

### JWT Validation Logging ✅
Backend now logs detailed JWT validation info:
```
[JWT Debug] Attempting to validate JWT token
[JWT Debug] Token length: 208
[JWT Debug] Token starts with: eyJhbGciOiJIUzI1NiIs...
[JWT Debug] Supabase URL: https://gxlmnjnjvlslijiowamn.supabase.co
[JWT Debug] Using anon key: eyJhbGciOiJIUzI1NiIs...
[JWT Debug] Supabase client created successfully
```

### OAuth Flow - READY FOR TESTING ⏳
**Next Step:** Test Google OAuth login at http://localhost:3000

**Expected Behavior:**
1. Sign in with Google
2. Redirect to `/auth/callback`
3. Frontend stores JWT token
4. Backend validates JWT successfully
5. Redirect to `/generate` page
6. API calls work without 401 errors

---

## 📋 Remaining Actions

### For You (Now):
1. **Test OAuth Flow**
   - Open http://localhost:3000
   - Sign in with Google
   - Check if you can access `/generate` without 401 errors
   - Check backend logs for successful JWT validation

2. **Verify Railway Production** (Manual - 2 minutes)
   - Visit: https://railway.app/project/7a8f9bcb-a265-4c34-82d2-c9c3655d26bf
   - Check `SUPABASE_URL` and related variables
   - Update if needed to use `gxlmnjnjvlslijiowamn.supabase.co`

### For Later (Optional):
1. **Find Source of System Environment Variables**
   - Check VS Code settings/launch configs
   - Check terminal app settings
   - Consider adding unset commands to shell profile as permanent fix

2. **Remove Debug Logging** (after OAuth confirmed working)
   - Remove verbose JWT debug prints from `dependencies.py`
   - Keep error logging for production

---

## 🔑 Key Configuration Reference

**Correct Supabase Project:**
- Project ID: `gxlmnjnjvlslijiowamn`
- URL: `https://gxlmnjnjvlslijiowamn.supabase.co`
- Dashboard: https://supabase.com/dashboard/project/gxlmnjnjvlslijiowamn
- Region: us-east-2

**Anon Key (Public - Safe to Commit):**
```
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd4bG1uam5qdmxzbGlqaW93YW1uIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjIyODY2NzksImV4cCI6MjA3Nzg2MjY3OX0.74lCmbHcF9PZJu6LTHa7KtO3-rwCDAxpA4R6bIGF-m8
```

**Old Project (DO NOT USE):**
- ❌ `srktllgrxvgwjlbxmpeh.supabase.co`

---

## 📝 Files Created/Modified

### Created:
- ✅ `/backend/start_backend.sh` - Startup script with env cleanup
- ✅ `/ENVIRONMENT_AUDIT.md` - Detailed audit report
- ✅ `/ENVIRONMENT_CLEANUP_SUMMARY.md` - This file

### Modified:
- ✅ `/backend/src/api/dependencies.py` - JWT validation fix
- ✅ `/backend/src/config.py` - Added `supabase_anon_key` field
- ✅ `/backend/.env` - Added `SUPABASE_ANON_KEY` variable

---

## 🎉 Summary

**What Was Wrong:**
- System environment variables pointing to old Supabase project
- Backend using service role key instead of anon key for JWT validation
- Caused OAuth tokens from new project to fail validation

**What's Fixed:**
- ✅ Local backend `.env` correct
- ✅ Local frontend `.env.local` correct
- ✅ Vercel production environment correct
- ✅ Backend JWT validation logic fixed
- ✅ Startup script created to handle system env override
- ✅ Detailed debug logging added

**What's Left:**
- ⏳ Verify Railway production variables (manual check needed)
- ⏳ Test OAuth flow end-to-end

**Current State:**
- Backend running with correct configuration (via `start_backend.sh`)
- Ready for OAuth testing
- Should work locally now!

Try signing in with Google at http://localhost:3000 and let me know if you see any 401 errors!
