# Environment Variables Audit
**Date:** 2025-11-06
**Purpose:** Comprehensive audit to ensure all environments use correct Supabase project

---

## Correct Configuration (Target)

**Supabase Project:** `gxlmnjnjvlslijiowamn`
- URL: `https://gxlmnjnjvlslijiowamn.supabase.co`
- Project ID: `gxlmnjnjvlslijiowamn`
- Region: us-east-2
- Anon Key: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd4bG1uam5qdmxzbGlqaW93YW1uIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjIyODY2NzksImV4cCI6MjA3Nzg2MjY3OX0.74lCmbHcF9PZJu6LTHa7KtO3-rwCDAxpA4R6bIGF-m8`

---

## Local Environment Audit

### ✅ Backend `.env` - CORRECT
```bash
SUPABASE_URL=https://gxlmnjnjvlslijiowamn.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd4bG1uam5qdmxzbGlqaW93YW1uIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjIyODY2NzksImV4cCI6MjA3Nzg2MjY3OX0.74lCmbHcF9PZJu6LTHa7KtO3-rwCDAxpA4R6bIGF-m8
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd4bG1uam5qdmxzbGlqaW93YW1uIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MjI4NjY3OSwiZXhwIjoyMDc3ODYyNjc5fQ.DkFyykR5GWVvwAR2jNh-42pnO43X1TBbm89bmFYFG94
```

**Status:** ✅ Using correct project

### ✅ Frontend `.env.local` - CORRECT
```bash
NEXT_PUBLIC_SUPABASE_URL=https://gxlmnjnjvlslijiowamn.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd4bG1uam5qdmxzbGlqaW93YW1uIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjIyODY2NzksImV4cCI6MjA3Nzg2MjY3OX0.74lCmbHcF9PZJu6LTHa7KtO3-rwCDAxpA4R6bIGF-m8
NEXT_PUBLIC_API_URL=https://yarda-api-production.up.railway.app
```

**Status:** ✅ Using correct project

### ❌ System Environment Variables - INCORRECT
```bash
SUPABASE_URL=https://srktllgrxvgwjlbxmpeh.supabase.co  # ❌ OLD PROJECT
SUPABASE_DB_HOST=aws-1-us-east-1.pooler.supabase.com
SUPABASE_DB_NAME=postgres
SUPABASE_DB_PORT=6543
SUPABASE_DB_USER=postgres.srktllgrxvgwjlbxmpeh  # ❌ OLD PROJECT
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNya3RsbGdyeHZnd2psYnhtcGVoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MTYxNDE5NzcsImV4cCI6MjAzMTcxNzk3N30.Z0hc4DFJwNfkkwcW7MiqYpQmA0TLyEyaPrT8rqEhqE4  # ❌ OLD PROJECT KEY
```

**Issue:** System environment variables are pointing to OLD Supabase project `srktllgrxvgwjlbxmpeh`

**Impact:** These override `.env` files when processes start, causing backend to connect to wrong Supabase project

**Fix Required:** Unset or update these system environment variables

---

## Railway Production - TO BE AUDITED

**Project:** `yarda-api` (ID: `7a8f9bcb-a265-4c34-82d2-c9c3655d26bf`)
**URL:** https://yarda-api-production.up.railway.app

**Variables to Check:**
- SUPABASE_URL
- SUPABASE_ANON_KEY (if used)
- SUPABASE_SERVICE_ROLE_KEY
- DATABASE_URL (should point to correct Supabase project)

**Status:** ⏳ Pending - Need to link service via Railway Dashboard

---

## Vercel Production - TO BE AUDITED

**Project:** `yarda-v5-frontend` (ID: `prj_H82uxC9rqafgCvhSaKYEZm5GskNn`)
**Team:** `team_VKfqq7FT5jFRbV7UQ5K1YEFR`
**Production URL:** TBD

**Variables to Check:**
- NEXT_PUBLIC_SUPABASE_URL
- NEXT_PUBLIC_SUPABASE_ANON_KEY
- NEXT_PUBLIC_API_URL

**Status:** ⏳ Pending audit

---

## Action Items

### Priority 1: Fix System Environment Variables (CRITICAL)
These are overriding local `.env` files and causing OAuth failures.

**Options:**
1. **Unset permanently** in shell profile (~/.zshrc, ~/.bashrc, ~/.profile):
   ```bash
   unset SUPABASE_URL
   unset SUPABASE_DB_HOST
   unset SUPABASE_DB_NAME
   unset SUPABASE_DB_PORT
   unset SUPABASE_DB_USER
   unset VITE_SUPABASE_ANON_KEY
   ```

2. **Update to correct project**:
   ```bash
   export SUPABASE_URL=https://gxlmnjnjvlslijiowamn.supabase.co
   export SUPABASE_DB_USER=postgres.gxlmnjnjvlslijiowamn
   ```

3. **Use startup script** (current workaround):
   - `backend/start_backend.sh` unsets these before starting

**Recommended:** Remove from shell profile permanently

### Priority 2: Audit Railway Production
1. Access Railway Dashboard: https://railway.app/project/7a8f9bcb-a265-4c34-82d2-c9c3655d26bf
2. Navigate to Environment Variables
3. Verify `SUPABASE_URL` and `DATABASE_URL` point to correct project
4. Update if needed

### Priority 3: Audit Vercel Production
1. Use Vercel MCP to list environment variables
2. Verify all `NEXT_PUBLIC_SUPABASE_*` variables
3. Update if needed

### Priority 4: Test End-to-End
1. Clear all browser storage
2. Test Google OAuth flow
3. Verify token validation works
4. Check API calls succeed

---

## Shell Profile Locations to Check

**macOS/Linux:**
- `~/.zshrc` (if using zsh - default on macOS)
- `~/.bashrc` (if using bash)
- `~/.bash_profile`
- `~/.profile`
- `~/.zprofile`

**Look for these lines:**
```bash
export SUPABASE_URL=...
export SUPABASE_DB_*=...
export VITE_SUPABASE_ANON_KEY=...
```

---

## Verification Steps

After fixes, verify:

```bash
# 1. Check system environment is clean
env | grep SUPABASE

# 2. Start backend (should use .env file)
cd backend
source venv/bin/activate
python -c "from src.config import settings; print(f'URL: {settings.supabase_url}')"
# Expected: https://gxlmnjnjvlslijiowamn.supabase.co

# 3. Test OAuth flow
# - Sign in with Google at http://localhost:3000
# - Should redirect to /generate without 401 errors
# - Check backend logs for "[JWT Debug] Successfully validated JWT"
```

---

## Current Workaround

**Backend:** Using `start_backend.sh` which unsets system env vars before starting:
```bash
cd /Volumes/home/Projects_Hosted/Yarda_v5/backend
./start_backend.sh
```

This ensures backend uses `.env` file instead of system environment.
