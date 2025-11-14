# Deployment Guide

Complete deployment configurations and CI/CD workflows for Yarda AI Landscape Studio.

## Environment Overview

```
┌──────────────┐    ┌──────────────┐    ┌──────────────┐
│    Local     │───▶│   Staging    │───▶│  Production  │
│ Development  │    │   /Preview   │    │              │
└──────────────┘    └──────────────┘    └──────────────┘
     ↓                     ↓                     ↓
   Test               Test + Fix            Smoke Test
```

---

## Deployment IDs (CRITICAL)

**⚠️ USE THESE ONLY - DO NOT USE DEPRECATED IDs**

### Frontend (Vercel)
- **Project ID:** `prj_H82uxC9rqafgCvhSaKYEZm5GskNn`
- **Project Name:** `yarda-v5-frontend`
- **Team:** `team_VKfqq7FT5jFRbV7UQ5K1YEFR` (thetangstrs-projects)
- **Production URL:** TBD
- **Preview Pattern:** `https://yarda-v5-frontend-git-{branch}-{team}.vercel.app`

### Backend (Railway)
- **Project ID:** `7a8f9bcb-a265-4c34-82d2-c9c3655d26bf`
- **Project Name:** `yarda-api`
- **Production URL:** `https://yarda-api-production.up.railway.app`
- **Environment:** `production`

### Database (Supabase)
- **Project ID:** `gxlmnjnjvlslijiowamn`
- **Project Name:** `yarda`
- **Organization ID:** `sqrkdtcgqpzmyrcwcpqn`
- **Region:** `us-east-2`
- **URL:** `https://gxlmnjnjvlslijiowamn.supabase.co`
- **Dashboard:** `https://supabase.com/dashboard/project/gxlmnjnjvlslijiowamn`

### Payments (Stripe)
- **Account ID:** `acct_1SFRz7F7hxfSl7pF`
- **Account Name:** `Yarda (Test Mode)`
- **Dashboard:** `https://dashboard.stripe.com/test/dashboard`

---

## Environments

### Local Development

**Frontend:**
- URL: `http://localhost:3000`
- Port: 3000 (Next.js dev server)
- Hot reload: Enabled

**Backend:**
- URL: `http://localhost:8000`
- Port: 8000 (uvicorn)
- Auto-reload: Enabled with `--reload` flag

**Database:**
- Supabase hosted (shared with staging/production)
- Optional: Local Supabase instance with `supabase start`

**Setup:**
```bash
# Terminal 1 - Backend
cd backend
source venv/bin/activate  # CRITICAL: Always activate venv first!
uvicorn src.main:app --reload --port 8000

# Terminal 2 - Frontend
cd frontend
npm run dev
```

**Environment Variables:**
```bash
# frontend/.env.local
NEXT_PUBLIC_API_URL=http://localhost:8000  # CRITICAL for local development
NEXT_PUBLIC_SUPABASE_URL=https://gxlmnjnjvlslijiowamn.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
```

```bash
# backend/.env
DATABASE_URL=postgresql://postgres:...@db.gxlmnjnjvlslijiowamn.supabase.co/postgres
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
GEMINI_API_KEY=...
GOOGLE_MAPS_API_KEY=...
BLOB_READ_WRITE_TOKEN=vercel_blob_rw_...
```

---

### Staging/Preview

**Terminology:**
- **Staging (Railway backend)** = **Preview (Vercel frontend)**
- Same environment, different names per platform

**Frontend (Vercel Preview):**
- **Pattern:** `https://yarda-v5-frontend-git-{branch}-{team}.vercel.app`
- **Deploy Trigger:** Auto-deploys on push to ANY branch
- **Build Time:** ~2-3 minutes
- **Environment:** `preview`

**Backend (Railway):**
- **URL:** Matches current git branch deployment
- **Deploy Trigger:** Auto-deploys on push to current branch
- **Build Time:** ~2-3 minutes
- **Environment:** Branch name

**Database:**
- Supabase (same as production)
- Optional: Separate schema/namespace for isolation

**Purpose:** Full E2E testing before production

**Access:**
```bash
# Get preview URL from Vercel
vercel inspect {deployment-url}

# Or check latest preview
vercel ls --environment preview
```

---

### Production

**Frontend (Vercel):**
- **URL:** `https://yarda.app` (or configured custom domain)
- **Deploy Trigger:** Auto-deploys on push to `main` branch
- **Build Time:** ~2-3 minutes
- **Environment:** `production`

**Backend (Railway):**
- **URL:** `https://yarda-api-production.up.railway.app`
- **Deploy Trigger:** Auto-deploys on push to `main` branch
- **Build Time:** ~2-3 minutes
- **Environment:** `production`

**Database:**
- Supabase (production instance)
- Daily automated backups
- Point-in-time recovery enabled

**Monitoring:**
- Vercel Analytics: Frontend performance, errors
- Railway Logs: Backend errors, API latency
- Supabase Dashboard: Database performance, query stats
- Stripe Dashboard: Payment webhooks, failed charges

---

## Environment Variables

### Frontend (Vercel)

**Set via Vercel Dashboard:**
```bash
cd frontend
vercel env add VARIABLE_NAME production
```

**Required Variables:**
```bash
NEXT_PUBLIC_SUPABASE_URL=https://gxlmnjnjvlslijiowamn.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_51SFRz... # or pk_live_...
NEXT_PUBLIC_API_URL=https://yarda-api-production.up.railway.app
```

**Environment-Specific:**
- `preview`: `NEXT_PUBLIC_API_URL` points to staging Railway URL
- `production`: `NEXT_PUBLIC_API_URL` points to production Railway URL

---

### Backend (Railway)

**Set via Railway Dashboard:**
1. Go to Railway project
2. Select service
3. Variables tab
4. Add variable

**Required Variables:**
```bash
DATABASE_URL=postgresql://postgres:{password}@db.gxlmnjnjvlslijiowamn.supabase.co/postgres
STRIPE_SECRET_KEY=sk_test_... # or sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
GEMINI_API_KEY=...
GOOGLE_MAPS_API_KEY=...
BLOB_READ_WRITE_TOKEN=vercel_blob_rw_...
```

**⚠️ CRITICAL: DATABASE_URL Encoding**
Special characters in password MUST be URL-encoded:
- `$` → `%24`
- `%` → `%25`
- `^` → `%5E`
- `&` → `%26`

Otherwise asyncpg will fail with "Tenant or user not found" error.

---

## CI/CD Workflow: `/test-smart`

### Overview

Single command that handles the **entire pipeline** from local development to production deployment.

```
Local → Staging/Preview → Production
  ↓         ↓                ↓
Test      Test          Smoke Test
  ↓         ↓                ↓
Auto-Fix  Auto-Fix      Monitor
  ↓         ↓                ↓
Pass      Pass          Done ✅
  ↓         ↓
Deploy    Approve
```

### Usage

```bash
# Make code changes
# Edit files in local development

# Run the fully automated pipeline
/test-smart
```

### Pipeline Phases

#### PHASE 1: LOCAL TESTING & AUTO-FIX (2-5 min)

```
✅ Analyze changed files
✅ Run affected tests (smart selection)
✅ Auto-fix failures (up to 3 attempts)
✅ Report: "✅ 10/10 tests passed"
```

**Auto-Fix Examples:**
- Race conditions → Add explicit waits
- Selector changes → Update test selectors
- Timeouts → Increase timeout values
- Network issues → Add retry logic

**Max 3 attempts per failure.** If unable to fix, escalates to human.

---

#### PHASE 2: AUTO-DEPLOY TO STAGING (2-3 min)

```
✅ Commit auto-fixes
✅ Push to current branch
✅ Wait for Vercel preview + Railway deployment
✅ Report: "🚀 Deployed to staging/preview"
```

**Deployment Process:**
1. Git commit with auto-fixes
2. Push to remote branch
3. Vercel detects push → triggers preview build
4. Railway detects push → triggers branch deployment
5. Wait for both deployments to complete
6. Verify health endpoints

---

#### PHASE 3: STAGING TESTING & AUTO-FIX (7-10 min)

```
✅ Run FULL test suite (50+ tests) on staging
✅ Auto-fix staging-specific failures
✅ Report: "✅ 50/50 tests passed"
```

**Staging-Specific Tests:**
- API integration with real backend
- Database operations (real queries)
- Stripe webhook simulation
- Google Maps API integration
- Gemini AI generation

---

#### PHASE 4: HUMAN APPROVAL GATE ⏸️

```
⏸️ Show summary of all tests
⏸️ Show preview URL for manual review (optional)
⏸️ Ask: "Deploy to production? (yes/no/review)"
```

**You review and decide:**
- ✅ `yes` → Proceed to production deployment
- ❌ `no` → Stop pipeline, do not deploy
- 👀 `review` → Open preview URL for manual inspection

---

#### PHASE 5: PRODUCTION DEPLOYMENT (2-3 min)

```
✅ Merge to main branch
✅ Push (triggers auto-deploy)
✅ Run production smoke tests
✅ Monitor for errors
✅ Report: "✅ Production deployment successful!"
```

**Production Deployment:**
1. Merge current branch to `main`
2. Push `main` to remote
3. Vercel auto-deploys to production
4. Railway auto-deploys to production
5. Run smoke tests:
   - Health endpoints respond 200
   - Database queries succeed
   - Critical user journeys work
6. Monitor for 5 minutes:
   - No error spikes
   - No performance degradation
   - No failed API calls

---

### Error Handling

**Local tests fail (after 3 auto-fix attempts):**
```
❌ Unable to fix automatically.
Manual intervention required.

Run /test-smart again after fixing.
```

**Staging tests fail (after 3 auto-fix attempts):**
```
❌ Staging environment issues detected.
Check: environment variables, database state, API keys

Fix and run /test-smart again.
```

**Production smoke tests fail:**
```
❌ Production deployment failed smoke tests!
Rolling back to previous version...

Check logs and fix issues.
```

### Time Estimates

| Phase | Time | What Happens |
|-------|------|--------------|
| Local Testing | 2-5 min | Smart test selection, auto-fix |
| Deploy to Staging | 2-3 min | Push + Vercel/Railway deployment |
| Staging Testing | 7-10 min | Full suite (50+ tests), auto-fix |
| Human Approval | 0-∞ min | You review and approve |
| Production Deploy | 2-3 min | Merge, push, smoke tests |
| **Total** | **15-25 min** | Fully automated except approval |

**Compare to manual workflow:** 2-3 hours (testing, fixing, deploying manually)

---

## Manual Deployment (Alternative)

### Frontend (Vercel)

**Auto-Deploy (Recommended):**
```bash
# Commit and push to main
git add .
git commit -m "feat: add new feature"
git push origin main

# Vercel auto-deploys
```

**Manual Deploy:**
```bash
cd frontend
vercel --prod
```

**Preview Deploy:**
```bash
cd frontend
vercel
```

---

### Backend (Railway)

**Auto-Deploy (Recommended):**
```bash
# Push to main branch
git push origin main

# Railway auto-deploys
```

**Manual Deploy:**
```bash
railway up
```

**View Logs:**
```bash
railway logs
```

---

### Database (Supabase)

**Migrations:**
```bash
# Apply migration manually
psql $DATABASE_URL -f supabase/migrations/XXX_migration.sql

# Or via Supabase dashboard SQL editor
```

**Always test migrations locally first:**
```bash
# Local Supabase
supabase db reset
supabase db push
```

---

## Deployment Checklist

Before deploying to production:

- [ ] All automated tests pass (100%)
- [ ] All CUJs verified working
- [ ] No known bugs or issues
- [ ] Type check passes (frontend + backend)
- [ ] Linting passes (no errors)
- [ ] Environment variables configured correctly
- [ ] Database migrations applied (if any)
- [ ] Stripe webhooks configured (production keys)
- [ ] Monitoring alerts configured
- [ ] Rollback plan documented

**After deployment:**

- [ ] Smoke tests pass
- [ ] Health endpoints respond 200
- [ ] Monitor logs for 15 minutes
- [ ] Check error tracking (Vercel, Railway)
- [ ] Verify Stripe webhooks deliver successfully
- [ ] Test critical user journeys manually

---

## Rollback Procedures

### Frontend (Vercel)

**Via Dashboard:**
1. Go to Vercel dashboard
2. Deployments tab
3. Find previous working deployment
4. Click "Promote to Production"

**Via CLI:**
```bash
vercel rollback
```

### Backend (Railway)

**Via Dashboard:**
1. Go to Railway project
2. Deployments tab
3. Find previous working deployment
4. Click "Redeploy"

**Via CLI:**
```bash
railway rollback
```

### Database (Supabase)

**Restore from Backup:**
1. Go to Supabase dashboard
2. Database → Backups
3. Select backup timestamp
4. Click "Restore"

**⚠️ WARNING:** Database rollback affects ALL services!

---

## Monitoring & Alerts

### Frontend (Vercel)

- **Analytics:** Real-time traffic, errors, performance
- **Logs:** Build logs, runtime logs
- **Alerts:** Email on build failures

**Dashboard:** `https://vercel.com/dashboard`

### Backend (Railway)

- **Logs:** Real-time API logs, errors
- **Metrics:** CPU, memory, request latency
- **Alerts:** Email on deployment failures

**Dashboard:** `https://railway.app/project/{project-id}`

### Database (Supabase)

- **Performance:** Query performance, slow queries
- **Connections:** Active connections, connection pool
- **Backups:** Automated daily backups

**Dashboard:** `https://supabase.com/dashboard/project/gxlmnjnjvlslijiowamn`

### Payments (Stripe)

- **Webhooks:** Delivery status, failed webhooks
- **Charges:** Failed charges, disputes
- **Subscriptions:** Churn, cancellations

**Dashboard:** `https://dashboard.stripe.com`

---

## Troubleshooting

### Deployment Fails

**Vercel:**
```bash
# Check build logs
vercel logs {deployment-url}

# Check environment variables
vercel env ls
```

**Railway:**
```bash
# Check deployment logs
railway logs

# Check environment variables
railway variables
```

### CORS Errors (Local Development)

**Problem:** Frontend can't call backend API

**Solution:**
```bash
# frontend/.env.local
NEXT_PUBLIC_API_URL=http://localhost:8000  # NOT the production URL!
```

### Database Connection Errors

**Problem:** `Tenant or user not found`

**Solution:** URL-encode special characters in `DATABASE_URL`:
```bash
# WRONG
DATABASE_URL=postgresql://postgres:pa$$word@...

# CORRECT
DATABASE_URL=postgresql://postgres:pa%24%24word@...
```

### Stripe Webhook Signature Mismatch

**Problem:** Webhooks failing verification

**Solution:** Verify `STRIPE_WEBHOOK_SECRET` matches:
```bash
# Get webhook signing secret from Stripe dashboard
# Webhooks → Select endpoint → Signing secret

# Update Railway environment variable
railway variables set STRIPE_WEBHOOK_SECRET=whsec_...
```

---

For architecture details, see [ARCHITECTURE.md](ARCHITECTURE.md).
For testing strategies, see [TESTING.md](TESTING.md).
For development setup, see [DEVELOPMENT.md](DEVELOPMENT.md).
