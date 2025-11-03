# Quick Start Guide

## Prerequisites Check

Before starting, verify these are installed:

```bash
# Check Python version (should be 3.13.3)
python3 --version

# Check Node.js version (should be v23.11.0)
node --version

# Check npm version (should be 10.9.2)
npm --version

# Check Supabase CLI (optional, for local development)
supabase --version
```

## 1. Configure Environment Variables

### Backend Configuration

Edit `/Volumes/home/Projects_Hosted/Yarda_v5/backend/.env` and replace placeholders:

```bash
# Required: Supabase Database URL
DATABASE_URL=postgresql://postgres:[YOUR-PASSWORD]@db.[YOUR-PROJECT-ID].supabase.co:5432/postgres

# Required: Stripe Keys
STRIPE_SECRET_KEY=sk_test_[YOUR-SECRET-KEY]
STRIPE_PUBLISHABLE_KEY=pk_test_[YOUR-PUBLISHABLE-KEY]
STRIPE_WEBHOOK_SECRET=whsec_[YOUR-WEBHOOK-SECRET]

# Required: Firebase Credentials
FIREBASE_CREDENTIALS_PATH=./firebase-credentials.json

# Required: Google Gemini AI
GEMINI_API_KEY=[YOUR-GEMINI-API-KEY]

# Required: Vercel Blob Storage
BLOB_READ_WRITE_TOKEN=vercel_blob_rw_[YOUR-TOKEN]
```

### Frontend Configuration

Edit `/Volumes/home/Projects_Hosted/Yarda_v5/frontend/.env.local` and replace placeholders:

```bash
# Required: Supabase
NEXT_PUBLIC_SUPABASE_URL=https://[YOUR-PROJECT-ID].supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=[YOUR-ANON-KEY]
SUPABASE_SERVICE_ROLE_KEY=[YOUR-SERVICE-ROLE-KEY]

# Required: Stripe
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_[YOUR-PUBLISHABLE-KEY]

# Required: Backend API
NEXT_PUBLIC_API_URL=http://localhost:8000

# Required: Firebase
NEXT_PUBLIC_FIREBASE_API_KEY=AIza[YOUR-API-KEY]
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=[YOUR-PROJECT].firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=[YOUR-PROJECT-ID]
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=[YOUR-PROJECT].appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=[YOUR-SENDER-ID]
NEXT_PUBLIC_FIREBASE_APP_ID=[YOUR-APP-ID]
```

### Firebase Service Account

Place your Firebase service account JSON file at:
```
/Volumes/home/Projects_Hosted/Yarda_v5/backend/firebase-credentials.json
```

## 2. Apply Database Migrations

```bash
cd /Volumes/home/Projects_Hosted/Yarda_v5/backend
source venv/bin/activate
python scripts/apply_migrations.py
```

Expected output:
```
DATABASE MIGRATION SCRIPT
============================================================
...
✓ Successfully applied 11/11 migrations
...
MIGRATION COMPLETE
```

## 3. Start Development Servers

### Terminal 1: Backend Server

```bash
cd /Volumes/home/Projects_Hosted/Yarda_v5/backend
source venv/bin/activate
uvicorn src.main:app --reload --host 0.0.0.0 --port 8000
```

Verify backend is running:
- API: http://localhost:8000
- Docs: http://localhost:8000/docs
- Redoc: http://localhost:8000/redoc

### Terminal 2: Frontend Server

```bash
cd /Volumes/home/Projects_Hosted/Yarda_v5/frontend
npm run dev
```

Verify frontend is running:
- App: http://localhost:3000

## 4. Verify Setup

### Check Backend Health

```bash
curl http://localhost:8000/health
```

Expected: `{"status": "healthy"}`

### Check API Documentation

Open in browser: http://localhost:8000/docs

You should see the FastAPI Swagger UI with all endpoints.

### Check Frontend

Open in browser: http://localhost:3000

You should see the Yarda AI Landscape Studio homepage.

## 5. Run Tests (Optional)

### Backend Tests

```bash
cd /Volumes/home/Projects_Hosted/Yarda_v5/backend
source venv/bin/activate
pytest tests/ -v
```

### Frontend Tests

```bash
cd /Volumes/home/Projects_Hosted/Yarda_v5/frontend

# Unit tests
npm test

# E2E tests (requires servers to be running)
npm run test:e2e
```

## Common Commands

### Backend

```bash
# Activate virtual environment
cd /Volumes/home/Projects_Hosted/Yarda_v5/backend
source venv/bin/activate

# Start server
uvicorn src.main:app --reload

# Run tests
pytest tests/ -v

# Run specific test
pytest tests/test_services.py::test_user_creation -v

# Check code coverage
pytest --cov=src tests/

# Deactivate virtual environment
deactivate
```

### Frontend

```bash
cd /Volumes/home/Projects_Hosted/Yarda_v5/frontend

# Start dev server
npm run dev

# Build for production
npm run build

# Start production server
npm start

# Run tests
npm test

# Run E2E tests
npm run test:e2e

# Type check
npm run type-check

# Lint code
npm run lint
```

## Troubleshooting

### Backend won't start

1. Check virtual environment is activated:
   ```bash
   which python  # Should show venv/bin/python
   ```

2. Check environment variables are set:
   ```bash
   cd /Volumes/home/Projects_Hosted/Yarda_v5/backend
   source venv/bin/activate
   python -c "from dotenv import load_dotenv; import os; load_dotenv(); print('DATABASE_URL:', os.getenv('DATABASE_URL'))"
   ```

3. Check database connection:
   ```bash
   psql $DATABASE_URL -c "SELECT version();"
   ```

### Frontend won't start

1. Check node_modules installed:
   ```bash
   ls /Volumes/home/Projects_Hosted/Yarda_v5/frontend/node_modules
   ```

2. Clear build cache:
   ```bash
   cd /Volumes/home/Projects_Hosted/Yarda_v5/frontend
   rm -rf .next
   npm run dev
   ```

3. Reinstall dependencies:
   ```bash
   cd /Volumes/home/Projects_Hosted/Yarda_v5/frontend
   rm -rf node_modules package-lock.json
   npm install
   ```

### Port already in use

```bash
# Kill process on port 8000
lsof -ti:8000 | xargs kill -9

# Kill process on port 3000
lsof -ti:3000 | xargs kill -9
```

### Database migrations fail

1. Check DATABASE_URL is correct
2. Check database is accessible
3. Check for existing migrations:
   ```bash
   psql $DATABASE_URL -c "SELECT * FROM schema_migrations ORDER BY applied_at;"
   ```

### Firebase authentication errors

1. Verify firebase-credentials.json exists in backend directory
2. Check Firebase project settings
3. Verify Firebase Authentication is enabled

## What's Next?

1. **Test User Registration**: Create a new user account
2. **Test Authentication**: Login with the created account
3. **Test Trial Credits**: Generate a landscape design using trial credits
4. **Test Token Purchase**: Buy tokens using Stripe test cards
5. **Test Generation**: Create a landscape design with purchased tokens
6. **Review API Docs**: Explore all endpoints at http://localhost:8000/docs

## Production Deployment

For production deployment, see:
- `INFRASTRUCTURE_SETUP_COMPLETE.md` - Full infrastructure setup guide
- `DEPLOYMENT_GUIDE.md` - Production deployment instructions (if available)

---

**Quick Start Guide** | Last updated: 2025-11-03
