# Environment Variable Fix Guide

**Issue:** System environment variables from old Supabase project (`srktllgrxvgwjlbxmpeh`) were overriding configuration files, causing authentication failures.

**Solution:** Environment cleanup implemented via startup script.

---

## ✅ What Was Fixed

### 1. Root `.env.local` Updated
- ✅ `SUPABASE_DB_USER` → Updated to new project
- ✅ `VITE_SUPABASE_ANON_KEY` → Updated to new project key
- ✅ `SUPABASE_URL` → Already correct

### 2. Clean Startup Script Created
**File:** `backend/start_backend_clean.sh`

This script:
- Unsets all Supabase environment variables before startup
- Ensures backend loads config from `backend/.env` only
- Prevents system environment variables from interfering

---

## 🚀 How to Start Backend (New Method)

### Option 1: Use Clean Startup Script (Recommended)
```bash
cd backend
./start_backend_clean.sh
```

This automatically:
- Cleans environment variables
- Activates virtual environment
- Loads config from .env
- Starts uvicorn on port 8000

### Option 2: Manual Start with Cleanup
```bash
cd backend
unset SUPABASE_URL SUPABASE_DB_USER VITE_SUPABASE_ANON_KEY
source venv/bin/activate
uvicorn src.main:app --reload --port 8000
```

---

## 🔍 Verification

### 1. Check Backend Logs
After starting, backend logs should show:
```
[JWT Debug] Supabase URL: https://gxlmnjnjvlslijiowamn.supabase.co
```

NOT:
```
[JWT Debug] Supabase URL: https://srktllgrxvgwjlbxmpeh.supabase.co  # ❌ WRONG
```

### 2. Test Authentication
```bash
# In browser at http://localhost:3000
1. Sign in with Google OAuth
2. Check browser console - should see successful API calls
3. Navigate to /generate page
4. Verify no 401 errors
```

### 3. Check System Environment (Optional)
```bash
# These should return EMPTY or show new project only
env | grep -i supabase
```

---

## 🛠️ Troubleshooting

### Issue: Still seeing old project URL in logs

**Cause:** IDE/VSCode might be caching environment variables

**Fix:**
1. Completely close and reopen your IDE/VSCode
2. Kill all backend processes: `lsof -ti:8000 | xargs kill -9`
3. Start backend using the clean script: `./backend/start_backend_clean.sh`

### Issue: Backend won't start

**Error:** `venv: not found`

**Fix:**
```bash
cd backend
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

**Error:** `.env: not found`

**Fix:**
```bash
cd backend
cp .env.example .env
# Edit .env and add your credentials
```

---

## 📋 Quick Reference

### Old Project (DO NOT USE)
- ID: `srktllgrxvgwjlbxmpeh`
- URL: `https://srktllgrxvgwjlbxmpeh.supabase.co`

### New Project (CORRECT)
- ID: `gxlmnjnjvlslijiowamn`
- URL: `https://gxlmnjnjvlslijiowamn.supabase.co`
- Anon Key: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd4bG1uam5qdmxzbGlqaW93YW1uIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjIyODY2NzksImV4cCI6MjA3Nzg2MjY3OX0.74lCmbHcF9PZJu6LTHa7KtO3-rwCDAxpA4R6bIGF-m8`

---

## ✅ Permanent Solution Applied

The `start_backend_clean.sh` script ensures that:
1. Old environment variables are always unset before startup
2. Configuration is loaded from `backend/.env` only
3. No manual cleanup is needed each time

**Recommendation:** Always use `./backend/start_backend_clean.sh` to start the backend from now on.

---

**Last Updated:** 2025-11-06
**Issue Resolution:** Complete ✅
**Testing:** Verified working with Google OAuth authentication
