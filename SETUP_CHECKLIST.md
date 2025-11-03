# Environment Setup Checklist

Quick action checklist to complete the setup. Check off items as you complete them.

## Prerequisites Check

- [x] Python 3.13.3 installed
- [x] Node.js v23.11.0 installed
- [x] Virtual environment created
- [x] Backend dependencies installed
- [x] Frontend dependencies installed
- [x] Migration scripts created

## Credentials to Add (4 items)

### 1. Supabase Database Password

- [ ] Go to https://app.supabase.com/project/srktllgrxvgwjlbxmpeh/settings/database
- [ ] Copy database password from connection string
- [ ] Update `DATABASE_URL` in `/Volumes/home/Projects_Hosted/Yarda_v5/backend/.env`
  ```bash
  DATABASE_URL=postgresql://postgres.srktllgrxvgwjlbxmpeh:[PASTE_PASSWORD_HERE]@aws-1-us-east-1.pooler.supabase.com:6543/postgres
  ```

### 2. Supabase Service Role Key

- [ ] Go to https://app.supabase.com/project/srktllgrxvgwjlbxmpeh/settings/api
- [ ] Copy the `service_role` key (NOT anon key)
- [ ] Update `SUPABASE_SERVICE_ROLE_KEY` in `/Volumes/home/Projects_Hosted/Yarda_v5/frontend/.env.local`
  ```bash
  SUPABASE_SERVICE_ROLE_KEY=eyJ[PASTE_KEY_HERE]
  ```

### 3. Firebase Service Account JSON

- [ ] Go to https://console.firebase.google.com
- [ ] Select your project (or create new)
- [ ] Go to Project Settings > Service accounts
- [ ] Click "Generate new private key"
- [ ] Save JSON file as `/Volumes/home/Projects_Hosted/Yarda_v5/backend/firebase-credentials.json`

### 4. Firebase Web App Config

- [ ] Go to https://console.firebase.google.com
- [ ] Go to Project Settings > General
- [ ] Scroll to "Your apps" > Select/Add web app
- [ ] Copy config values
- [ ] Update these in `/Volumes/home/Projects_Hosted/Yarda_v5/frontend/.env.local`:
  ```bash
  NEXT_PUBLIC_FIREBASE_API_KEY=[YOUR_KEY]
  NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=[YOUR_PROJECT].firebaseapp.com
  NEXT_PUBLIC_FIREBASE_PROJECT_ID=[YOUR_PROJECT_ID]
  NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=[YOUR_PROJECT].appspot.com
  NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=[YOUR_ID]
  NEXT_PUBLIC_FIREBASE_APP_ID=[YOUR_APP_ID]
  ```

## Database Setup

- [ ] Run credential helper to verify what's configured:
  ```bash
  cd /Volumes/home/Projects_Hosted/Yarda_v5/backend
  python scripts/get_credentials.py
  ```

- [ ] Apply database migrations:
  ```bash
  cd /Volumes/home/Projects_Hosted/Yarda_v5/backend
  source venv/bin/activate
  python scripts/apply_migrations.py
  ```

- [ ] Verify setup is complete:
  ```bash
  python scripts/verify_setup.py
  ```

## Start Development

- [ ] Start backend server:
  ```bash
  cd /Volumes/home/Projects_Hosted/Yarda_v5/backend
  source venv/bin/activate
  uvicorn src.main:app --reload
  ```

- [ ] Start frontend server (in new terminal):
  ```bash
  cd /Volumes/home/Projects_Hosted/Yarda_v5/frontend
  npm run dev
  ```

- [ ] Open application:
  - Frontend: http://localhost:3000
  - Backend API: http://localhost:8000
  - API Docs: http://localhost:8000/docs

## Verification Tests

- [ ] Backend health check: curl http://localhost:8000/health
- [ ] Database connection works (check verify_setup.py output)
- [ ] All 11 migrations applied successfully
- [ ] Frontend loads without errors
- [ ] Can access API documentation

## Optional: Run Tests

- [ ] Backend tests:
  ```bash
  cd /Volumes/home/Projects_Hosted/Yarda_v5/backend
  pytest tests/ -v
  ```

- [ ] Frontend tests:
  ```bash
  cd /Volumes/home/Projects_Hosted/Yarda_v5/frontend
  npm test
  ```

## Quick Commands Reference

```bash
# View credential instructions
cd /Volumes/home/Projects_Hosted/Yarda_v5/backend
python scripts/get_credentials.py

# Apply migrations
python scripts/apply_migrations.py

# Verify setup
python scripts/verify_setup.py

# Start backend
uvicorn src.main:app --reload

# Start frontend (new terminal)
cd ../frontend && npm run dev

# Run tests
pytest tests/ -v  # backend
npm test          # frontend
```

## Troubleshooting

If you encounter issues:

1. Check the detailed status report: `ENVIRONMENT_SETUP_STATUS.md`
2. Review logs in terminal where servers are running
3. Verify all environment variables are set (no [YOUR_*] placeholders remaining)
4. Ensure Supabase project is active and accessible
5. Check that ports 3000 and 8000 are not already in use

## Support Links

- Supabase Dashboard: https://app.supabase.com/project/srktllgrxvgwjlbxmpeh
- Firebase Console: https://console.firebase.google.com
- Stripe Dashboard: https://dashboard.stripe.com

---

**Estimated Time to Complete:** 8-10 minutes
**Current Progress:** 90% complete (4 credentials needed)
