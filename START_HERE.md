# START HERE - Quick Setup Guide

Welcome! Your environment is **90% configured**. This guide will get you to 100% in about 9 minutes.

## Current Status

- ✅ All dependencies installed (Python 3.13.3, Node v23.11.0)
- ✅ Environment files created and partially configured
- ✅ Database migrations ready (11 files)
- ✅ Automation scripts created
- ⚠️ 4 credentials needed (takes 5 minutes to get)

## Step 1: Get Missing Credentials (5 minutes)

Run the credential helper to see detailed instructions:

```bash
cd /Volumes/home/Projects_Hosted/Yarda_v5/backend
python scripts/get_credentials.py
```

Or follow these quick links:

### 1. Supabase Database Password (15 seconds)
- Visit: https://app.supabase.com/project/srktllgrxvgwjlbxmpeh/settings/database
- Copy password from connection string
- Update `DATABASE_URL` in `backend/.env`

### 2. Supabase Service Role Key (15 seconds)
- Visit: https://app.supabase.com/project/srktllgrxvgwjlbxmpeh/settings/api
- Copy "service_role" key
- Update `SUPABASE_SERVICE_ROLE_KEY` in `frontend/.env.local`

### 3. Firebase Service Account (2 minutes)
- Visit: https://console.firebase.google.com
- Project Settings > Service accounts > Generate new private key
- Save as `backend/firebase-credentials.json`

### 4. Firebase Web Config (2 minutes)
- Visit: https://console.firebase.google.com
- Project Settings > General > Your apps
- Copy config values to `frontend/.env.local`

## Step 2: Apply Database Migrations (2 minutes)

```bash
cd /Volumes/home/Projects_Hosted/Yarda_v5/backend
source venv/bin/activate
python scripts/apply_migrations.py
```

Expected output:
- ✓ Connected successfully
- ✓ 11/11 migrations applied
- ✓ Tables and functions created

## Step 3: Verify Setup (1 minute)

```bash
python scripts/verify_setup.py
```

Expected: All checks should PASS

## Step 4: Start Development (1 minute)

**Terminal 1 - Backend:**
```bash
cd /Volumes/home/Projects_Hosted/Yarda_v5/backend
source venv/bin/activate
uvicorn src.main:app --reload
```

**Terminal 2 - Frontend:**
```bash
cd /Volumes/home/Projects_Hosted/Yarda_v5/frontend
npm run dev
```

## Step 5: Open Application

- Frontend: http://localhost:3000
- Backend API Docs: http://localhost:8000/docs
- Backend Health: http://localhost:8000/health

## Need Help?

- **Detailed Status**: Read `ENVIRONMENT_SETUP_STATUS.md`
- **Checklist**: Read `SETUP_CHECKLIST.md`
- **Full Report**: Read `DEVOPS_COMPLETION_REPORT.md`

## File Locations

### Environment Files
- Backend: `/Volumes/home/Projects_Hosted/Yarda_v5/backend/.env`
- Frontend: `/Volumes/home/Projects_Hosted/Yarda_v5/frontend/.env.local`

### Scripts
- Get Credentials: `/Volumes/home/Projects_Hosted/Yarda_v5/backend/scripts/get_credentials.py`
- Apply Migrations: `/Volumes/home/Projects_Hosted/Yarda_v5/backend/scripts/apply_migrations.py`
- Verify Setup: `/Volumes/home/Projects_Hosted/Yarda_v5/backend/scripts/verify_setup.py`

### Documentation
- This Guide: `/Volumes/home/Projects_Hosted/Yarda_v5/START_HERE.md`
- Setup Status: `/Volumes/home/Projects_Hosted/Yarda_v5/ENVIRONMENT_SETUP_STATUS.md`
- Checklist: `/Volumes/home/Projects_Hosted/Yarda_v5/SETUP_CHECKLIST.md`
- Full Report: `/Volumes/home/Projects_Hosted/Yarda_v5/DEVOPS_COMPLETION_REPORT.md`

## Quick Reference

- **Supabase Project**: srktllgrxvgwjlbxmpeh
- **Dashboard**: https://app.supabase.com/project/srktllgrxvgwjlbxmpeh
- **Firebase**: https://console.firebase.google.com
- **Stripe**: https://dashboard.stripe.com

## Time Estimate

- Get credentials: 5 minutes
- Apply migrations: 2 minutes
- Verify: 1 minute
- Start servers: 1 minute
- **Total: ~9 minutes**

---

**Ready?** Start with Step 1 above or run `python scripts/get_credentials.py` for detailed instructions.
