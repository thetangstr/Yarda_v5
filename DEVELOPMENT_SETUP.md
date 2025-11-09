# Development Setup Guide

This guide helps you configure your local development environment for Yarda v5.

## Prerequisites

- Node.js 18+ and npm
- Python 3.11+
- PostgreSQL client (for database access)
- Git

## Quick Start

### 1. Clone and Install Dependencies

```bash
# Clone repository
git clone <repo-url>
cd Yarda_v5

# Install frontend dependencies
cd frontend
npm install

# Install backend dependencies
cd ../backend
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
```

### 2. Environment Configuration

#### Backend Configuration

Copy the example environment file:

```bash
cd backend
cp .env.example .env
```

Update `backend/.env` with your credentials:

```bash
# Database
DATABASE_URL=postgresql://postgres:[PASSWORD]@db.gxlmnjnjvlslijiowamn.supabase.co:5432/postgres

# Supabase
SUPABASE_URL=https://gxlmnjnjvlslijiowamn.supabase.co
SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...

# Stripe
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...

# AI & Maps
GEMINI_API_KEY=...
GOOGLE_MAPS_API_KEY=...

# Storage
BLOB_READ_WRITE_TOKEN=vercel_blob_rw_...
```

#### Frontend Configuration

Copy the example environment file:

```bash
cd frontend
cp .env.local.example .env.local
```

**CRITICAL:** Configure `frontend/.env.local` based on your development scenario:

##### For Local E2E Testing (Default)

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://gxlmnjnjvlslijiowamn.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...

# Stripe
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_51SFRz...

# API Configuration - USE LOCALHOST FOR LOCAL TESTING
NEXT_PUBLIC_API_URL=http://localhost:8000

# Production backend (use when testing against production)
# NEXT_PUBLIC_API_URL=https://yarda-api-production.up.railway.app

# Maps & OAuth
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=AIza...
NEXT_PUBLIC_GOOGLE_CLIENT_ID=467342722284-...
```

##### For Testing Against Production Backend

```bash
# Comment out localhost and use production
# NEXT_PUBLIC_API_URL=http://localhost:8000
NEXT_PUBLIC_API_URL=https://yarda-api-production.up.railway.app
```

### 3. Start Development Servers

#### Start Backend (Port 8000)

**Recommended Method (Clean Environment):**
```bash
cd backend
./start_backend_clean.sh
```

This script automatically:
- Cleans environment variables that might override `.env` config
- Activates virtual environment
- Starts uvicorn on port 8000

**Alternative (Manual):**
```bash
cd backend
source venv/bin/activate
uvicorn src.main:app --reload --port 8000
```

You should see:
```
🧹 Cleaning environment variables...
✅ Environment cleaned
📂 Loading configuration from backend/.env
🚀 Starting Yarda AI Landscape Studio API...
INFO:     Uvicorn running on http://127.0.0.1:8000
INFO:     Application startup complete.
```

#### Start Frontend (Port 3000)

```bash
cd frontend
npm run dev
```

You should see:
```
- Local:        http://localhost:3000
- Network:      http://192.168.x.x:3000
```

### 4. Verify Setup

Open your browser console at `http://localhost:3000` and check for:

```
[LOG] [API Client] Using API_URL: http://localhost:8000
```

If you see a different URL or CORS errors, check your `frontend/.env.local` configuration.

## Common Issues

### CORS Errors During Local Development

**Problem:** API calls blocked with CORS error:
```
Access to XMLHttpRequest at 'https://yarda-api-production.up.railway.app/...'
from origin 'http://localhost:3000' has been blocked by CORS policy
```

**Cause:** `frontend/.env.local` is pointing to production Railway URL instead of localhost

**Solution:** Update `frontend/.env.local`:
```bash
# Change from:
NEXT_PUBLIC_API_URL=https://yarda-api-production.up.railway.app

# To:
NEXT_PUBLIC_API_URL=http://localhost:8000
```

Then restart the frontend server:
```bash
# Kill existing process
lsof -ti:3000 | xargs kill -9

# Restart
npm run dev
```

### Port Already in Use

**Backend (Port 8000):**
```bash
lsof -ti:8000 | xargs kill -9
```

**Frontend (Port 3000):**
```bash
lsof -ti:3000 | xargs kill -9
```

### Database Connection Issues

**Problem:** Backend fails to start with error:
```
asyncpg.exceptions.InternalServerError: Tenant or user not found
ERROR:    Application startup failed. Exiting.
```

**Cause:** DATABASE_URL contains special characters in password that aren't URL-encoded

**Solution:** URL-encode special characters in the password portion of DATABASE_URL:

```bash
# WRONG - Special characters not encoded
DATABASE_URL=postgresql://postgres.gxlmnjnjvlslijiowamn:yarda456$%^@aws-1-us-east-2.pooler.supabase.com:6543/postgres

# CORRECT - Special characters encoded
DATABASE_URL=postgresql://postgres.gxlmnjnjvlslijiowamn:yarda456%24%25%5E@aws-1-us-east-2.pooler.supabase.com:6543/postgres
```

Common character encodings:
- `$` → `%24`
- `%` → `%25`
- `^` → `%5E`
- `@` → `%40`
- `#` → `%23`

After fixing, restart the backend:
```bash
cd backend
lsof -ti:8000 | xargs kill -9  # Kill any broken processes
source venv/bin/activate
uvicorn src.main:app --reload --port 8000
```

**Other Database Issues:**

Verify your `DATABASE_URL` in `backend/.env`:
- Check password is correct and properly URL-encoded
- Ensure IP is whitelisted in Supabase Dashboard → Project Settings → Database → Connection Pooling
- Test connection: `psql $DATABASE_URL -c "SELECT 1;"`

## Running Tests

### Backend Unit Tests

```bash
cd backend
pytest tests/ -v
```

### Frontend E2E Tests

Requires both backend and frontend running:

```bash
# Terminal 1: Start backend
cd backend && uvicorn src.main:app --reload --port 8000

# Terminal 2: Start frontend
cd frontend && npm run dev

# Terminal 3: Run tests
cd frontend
npx playwright test --headed
```

## Environment Checklist

Before running E2E tests, verify:

- [ ] Backend running on port 8000
- [ ] Frontend running on port 3000
- [ ] `frontend/.env.local` has `NEXT_PUBLIC_API_URL=http://localhost:8000`
- [ ] Browser console shows: `[API Client] Using API_URL: http://localhost:8000`
- [ ] No CORS errors in browser console
- [ ] Database connection working (check backend logs)

## Deployment Environments

### Local Development
- Frontend: `http://localhost:3000`
- Backend: `http://localhost:8000`
- Database: Supabase (shared)

### Production
- Frontend: Vercel (auto-deploy from main)
- Backend: Railway (auto-deploy from main)
- Database: Supabase (shared)

## Getting Help

- Check [CLAUDE.md](./CLAUDE.md) for architecture patterns
- Review [TEST_PLAN.md](./TEST_PLAN.md) for testing strategy
- Check recent test sessions in `TEST_SESSION_*.md` files

## Recent Updates

**2025-11-06:** Added CORS troubleshooting section after discovering environment configuration issue during E2E testing
