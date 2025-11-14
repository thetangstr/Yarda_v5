# Deployment Quick Start Guide

## The Simple Path to Deployment

### Deploy to Staging (Test Environment)
```bash
# 1. Make changes to code
git add .
git commit -m "feature: add new endpoint"

# 2. Push to staging branch (automatic deployment)
git push origin 001-data-model

# ✓ Automatic deployment starts!
# Go to: https://github.com/Kailor_1/Yarda_v5/actions
# Watch the "Deploy to Staging" workflow
```

### Deploy to Production (Live)
```bash
# 1. Merge to master (after staging is tested)
git checkout master
git merge 001-data-model

# 2. Push to master (automatic deployment)
git push origin master

# ✓ Automatic deployment starts!
# Go to: https://github.com/Kailor_1/Yarda_v5/actions
# Watch the "Deploy to Production" workflow
```

## What Gets Deployed?

| Component | Location | Environment |
|---|---|---|
| Python Backend | `/backend` directory | Railway (yarda-api service) |
| FastAPI Server | `uvicorn src.main:app` | Port $PORT (Railway assigned) |
| Database | Supabase PostgreSQL | Read-only in staging, full access in production |

## Monitoring Deployments

### Option 1: GitHub Actions (Easiest)
```
1. Go to: https://github.com/Kailor_1/Yarda_v5/actions
2. Find your workflow (Deploy to Staging/Production)
3. Click to see detailed logs
4. Green checkmark = Success ✓
5. Red X = Failed ✗
```

### Option 2: Railway Dashboard
```
1. Go to: https://railway.app/dashboard
2. Select project: "yarda-api"
3. Select service: "yarda-api"
4. See real-time logs and status
```

### Option 3: Command Line
```bash
# View recent deployments
railway deployments --lines 5

# View logs (last 50 lines)
railway logs --environment staging --lines 50

# View live logs
railway logs --environment production --follow
```

## Common Deployment Scenarios

### Scenario 1: Quick Hotfix
```bash
# 1. Fix the bug
vim backend/src/main.py

# 2. Test locally
cd backend && python -m pytest tests/ -v

# 3. Deploy to staging first
git add .
git commit -m "fix: resolve critical bug"
git push origin 001-data-model

# 4. Monitor deployment (GitHub Actions)
# 5. Once tested, merge to master
git checkout master && git merge 001-data-model
git push origin master
```

### Scenario 2: New Feature Development
```bash
# 1. Create feature branch (optional)
git checkout -b feature/new-endpoint

# 2. Develop and commit
git add .
git commit -m "feat: add new endpoint"

# 3. Push to 001-data-model
git push origin feature/new-endpoint
git checkout 001-data-model
git merge feature/new-endpoint

# 4. Deploy to staging automatically
git push origin 001-data-model

# 5. Test in staging
# ... manual testing ...

# 6. Merge to master when ready
git checkout master
git merge 001-data-model
git push origin master

# 7. Deploy to production automatically
```

### Scenario 3: Rollback from Production
```bash
# Option A: Revert last commit
git revert HEAD
git push origin master
# Automatically redeploys with reverted code

# Option B: Redeploy previous version
railway deployments --lines 10
railway redeploy <deployment-id> --environment production

# Option C: Manual fix
git add . && git commit -m "fix: resolve production issue"
git push origin master
```

## Deployment Checklist

Before pushing to production (`master`), verify:

```bash
# 1. Code compiles and tests pass
cd backend
pip install -r requirements.txt
python -m pytest tests/ -v

# 2. No console errors or warnings
# Review logs for ERROR or CRITICAL messages

# 3. Environment variables set
# Check Railway dashboard: Settings → Environment Variables

# 4. Database migrations applied
# Check Supabase: SQL Editor → View migrations

# 5. API endpoints responding
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:8000/v1/credits/balance

# 6. No secrets in code
git diff HEAD~1 | grep -i "secret\|password\|key\|token"
# (should return nothing)

# 7. All tests pass
pytest tests/ --tb=short
# Should see: passed X, failed 0
```

## Deployment Failures? Fix It Here

### Python Not Detected
```
Error: "Node.js buildpack detected..."
Fix: nixpacks.toml exists and has python311 in nixPkgs
```

### Dependencies Not Installing
```
Error: "ModuleNotFoundError: No module named..."
Fix: Add missing dependency to backend/requirements.txt
Re-run: git push origin 001-data-model (to retrigger)
```

### Endpoint Returns 404
```
Error: "/v1/credits/balance returns 404"
Fix:
  1. Check endpoint exists: backend/src/api/endpoints/
  2. Check endpoint registered in backend/src/main.py
  3. Check database connection: railway logs | grep -i database
```

### Service Keeps Restarting
```
Error: "Restart policy exceeded"
Fix:
  1. Check logs: railway logs --lines 100
  2. Look for CRITICAL errors
  3. Common issues: missing DB_URL, import errors, syntax errors
```

## Environment Variables (Must Be Set!)

Go to Railway dashboard → project → service → Settings → Variables

```
DATABASE_URL=postgresql://user:pass@host/db
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_KEY=eyJxx...
GOOGLE_MAPS_API_KEY=AIza...
GOOGLE_GENAI_API_KEY=AIza...
STRIPE_API_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
```

## Key Files

| File | Purpose | Critical? |
|---|---|---|
| `backend/requirements.txt` | Python dependencies | YES |
| `nixpacks.toml` | Build configuration | YES |
| `railway.toml` | Deployment config | YES |
| `Procfile` | Start command (fallback) | NO (but helpful) |
| `.env.example` | Template for variables | NO (reference only) |

## Branching Strategy

```
PRODUCTION          STAGING             DEVELOPMENT
    ↑                   ↑                     ↓
  master ← approved ← 001-data-model ← feature branches
   (live)    (tested)     (staging)     (in development)
```

**Push flow:**
1. Commit to feature branch
2. Push to `001-data-model` (deploys to staging)
3. Test and verify in staging
4. Merge to `master` when ready
5. Automatic deployment to production

## Getting Help

**GitHub Actions Failed?**
1. Go to: Actions → Failed workflow
2. Expand each step to see logs
3. Look for "ERROR" or "FAILED" messages
4. Check Troubleshooting section in [RAILWAY_DEPLOYMENT.md](docs/RAILWAY_DEPLOYMENT.md)

**Service Not Responding?**
1. Go to Railway dashboard
2. Check service status (should be "Running")
3. View logs for errors
4. Check environment variables are set
5. Check database connection in logs

**Quick Debug:**
```bash
# SSH into running service
railway shell --environment production

# Check if app is running
ps aux | grep uvicorn

# Check logs from inside
tail -f /proc/self/fd/2
```

## Success Indicators

After pushing to master, you should see:

```
✓ GitHub Actions workflow started
  ├─ Validation step passed
  ├─ Deployment step passed
  └─ Logs show "Deployment completed successfully"

✓ Railway dashboard shows
  ├─ New deployment in progress
  ├─ Build logs appearing
  ├─ Service status changing to "Running"
  └─ No critical errors in logs

✓ API responding
  ├─ curl https://api.example.com/health → 200 OK
  ├─ curl /v1/credits/balance → valid response
  └─ No 404 or 500 errors
```

## Next Steps

Once deployed, remember to:

1. **Test the API:** Hit the health endpoint and critical endpoints
2. **Monitor logs:** Watch for errors in first 5 minutes
3. **Verify data:** Check that data is flowing correctly
4. **Alert on issues:** Set up monitoring if not already done

---

**TL;DR:**
- Push to `001-data-model` for staging
- Push to `master` for production
- Check GitHub Actions for status
- Review Railway logs if anything breaks

For detailed docs, see [docs/RAILWAY_DEPLOYMENT.md](docs/RAILWAY_DEPLOYMENT.md)
