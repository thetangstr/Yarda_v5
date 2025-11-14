# Railway Deployment Guide - Yarda API

## Overview

This document describes the automated deployment process for the Yarda AI backend (Python FastAPI) to Railway's staging and production environments.

**Project ID:** `7a8f9bcb-a265-4c34-82d2-c9c3655d26bf` (yarda-api)

## Quick Facts

| Environment | Branch | Trigger | Service |
|---|---|---|---|
| **Staging** | `001-data-model` | Push to branch | yarda-api |
| **Production** | `master` | Push to branch | yarda-api |

## Architecture

```
GitHub Repository (Push)
    ↓
GitHub Actions Workflow (deploy-staging.yml or deploy-production.yml)
    ↓
Railway CLI Authentication (using RAILWAY_TOKEN secret)
    ↓
Railway Build System (NIXPACKS)
    ↓
Python 3.11 Environment Setup
    ├─ Install Python dependencies
    ├─ Build application
    └─ Start FastAPI server
    ↓
Deployed Service (yarda-api on staging/production)
```

## Configuration Files

### 1. `nixpacks.toml` - Build Configuration
- **Location:** Project root `/Users/Kailor_1/Desktop/Projects/Yarda_v5/nixpacks.toml`
- **Purpose:** Configures how Railway builds the application
- **Key Settings:**
  - Python 3.11 runtime
  - Dependency installation from `backend/requirements.txt`
  - PostgreSQL availability
  - Start command with proper directory handling

### 2. `railway.toml` - Deployment Configuration
- **Location:** Project root `/Users/Kailor_1/Desktop/Projects/Yarda_v5/railway.toml`
- **Purpose:** Defines deployment settings and health checks
- **Environment-specific settings:**
  - Staging: 5 restart retries
  - Production: 10 restart retries
  - Health check endpoint: `/v1/credits/balance`

### 3. `backend/railway.json` - Service Configuration
- **Location:** `/Users/Kailor_1/Desktop/Projects/Yarda_v5/backend/railway.json`
- **Purpose:** Railway schema configuration for service
- **Key settings:**
  - Builder: NIXPACKS
  - Start command with proper path handling

### 4. `Procfile` - Process Definition
- **Location:** Project root `/Users/Kailor_1/Desktop/Projects/Yarda_v5/Procfile`
- **Purpose:** Alternative process definition (used as fallback)
- **Command:** `cd backend && uvicorn src.main:app --host 0.0.0.0 --port $PORT`

## Deployment Workflows

### Staging Deployment Workflow

**File:** `.github/workflows/deploy-staging.yml`

Triggers automatically when code is pushed to the `001-data-model` branch.

```yaml
Trigger: Push to 001-data-model branch
  ↓
Checkout code
  ↓
Validate configuration files (railway.toml, nixpacks.toml, requirements.txt)
  ↓
Check backend directory structure
  ↓
Install Railway CLI globally
  ↓
Authenticate with Railway (using RAILWAY_TOKEN secret)
  ↓
Link to Railway project (7a8f9bcb-a265-4c34-82d2-c9c3655d26bf)
  ↓
Deploy to staging environment (detached mode - doesn't wait for completion)
  ↓
Monitor deployment logs (waits 30 seconds for initial logs)
  ↓
Verify deployment status
  ↓
Notify results
```

**Duration:** ~10 minutes

**Success Indicators:**
- Workflow completes with green checkmark
- Railway service shows "Deployment Success"
- Logs show "Python FastAPI backend ready for deployment"

### Production Deployment Workflow

**File:** `.github/workflows/deploy-production.yml`

Triggers automatically when code is pushed to the `master` branch.

```yaml
Trigger: Push to master branch
  ↓
Validate Configuration (separate job)
  ├─ Check railway.toml exists
  ├─ Check nixpacks.toml exists
  └─ Check requirements.txt valid
  ↓
Deploy (after validation passes)
  ├─ Checkout code
  ├─ Install Railway CLI
  ├─ Authenticate with Railway
  ├─ Deploy to production (detached mode)
  ├─ Monitor logs
  ├─ Wait 30 seconds for stabilization
  ├─ Verify health
  └─ Create deployment summary
```

**Duration:** ~15 minutes

**Critical Steps:**
1. Configuration validation (prevents bad deployments)
2. Detached deployment (returns immediately)
3. Post-deployment verification
4. Manual health check notice

## Setup Instructions

### 1. Configure Railway Token (GitHub Secrets)

The workflows require `RAILWAY_TOKEN` as a GitHub secret.

**Steps:**
1. Get your Railway API token:
   ```bash
   railway login
   railway token
   ```

2. Add to GitHub repository secrets:
   - Go to: Settings → Secrets and variables → Actions
   - Create new secret: `RAILWAY_TOKEN`
   - Paste your Railway token
   - Click "Add secret"

### 2. Verify Branch Protection (Optional but Recommended)

Protect the `master` branch to prevent accidental deployments:

1. Go to: Settings → Branches
2. Add branch protection rule for `master`
3. Require pull request reviews
4. Require status checks to pass (GitHub Actions workflows)

### 3. Verify Railway Environments

Ensure both `staging` and `production` environments exist in Railway:

```bash
railway environment:list
```

Expected output:
```
✓ production (linked)
✓ staging
```

If missing, create them:
```bash
railway environment:create staging
```

## Manual Deployment (If Needed)

If automatic deployment fails, manually trigger from GitHub:

### Via GitHub UI

1. Go to repository → Actions
2. Select workflow:
   - "Deploy to Staging" for staging environment
   - "Deploy to Production" for production environment
3. Click "Run workflow"
4. Select branch (should auto-select correct branch)
5. Click green "Run workflow" button

### Via Command Line

```bash
# Deploy staging
gh workflow run deploy-staging.yml

# Deploy production
gh workflow run deploy-production.yml
```

### Via Railway CLI (Direct)

```bash
# Link to project
railway link

# Deploy to staging
railway deploy --environment staging --service yarda-api

# Deploy to production
railway deploy --environment production --service yarda-api
```

## Monitoring Deployments

### Real-Time Logs in Railway Dashboard

1. Go to [Railway Dashboard](https://railway.app/dashboard)
2. Select project: "yarda-api"
3. Select service: "yarda-api"
4. Select environment: "staging" or "production"
5. Click "Logs" tab
6. View real-time deployment logs

### GitHub Actions Workflow Log

1. Go to repository → Actions
2. Select the workflow run
3. Click on "Deploy Backend to Staging" or "Deploy to Production" job
4. Expand each step to see detailed output
5. Check "Deploy to staging/production environment" step for deployment details

### Check Service Status

```bash
# View service details
railway service --environment staging --service yarda-api

# View recent deployments
railway deployments --lines 20

# View logs
railway logs --service yarda-api --environment staging --lines 100
```

## Troubleshooting

### Issue: Node.js Detected Instead of Python

**Symptoms:**
- Deployment fails with "Node.js" buildpack error
- Error mentions missing `package.json`

**Solution:**
1. Verify `nixpacks.toml` exists in project root
2. Ensure it specifies `python311` in nixPkgs section
3. Check that `backend/requirements.txt` exists
4. Redeploy: `railway deploy --detach`

**Prevention:**
- Never delete or rename `nixpacks.toml`
- Keep `backend/requirements.txt` in sync with actual dependencies

### Issue: Deployment Hangs or Times Out

**Symptoms:**
- Workflow runs for >30 minutes
- No logs appear in Railway dashboard
- Service shows "In Progress" for long time

**Solution:**
1. Check build logs:
   ```bash
   railway logs --service yarda-api --environment staging --lines 200
   ```

2. Look for common issues:
   - Large file downloads (pip packages)
   - Network timeouts
   - Missing environment variables

3. Cancel deployment:
   ```bash
   railway redeploy --detach
   ```

### Issue: `/v1/credits/balance` Returns 404

**Symptoms:**
- Endpoint gives 404 error
- API works locally but not on Railway

**Diagnosis:**
```bash
# Check if service is running
railway service --environment production

# View logs for errors
railway logs --environment production --lines 100 | grep -i error

# Try accessing health endpoint
curl https://yarda-api.railway.app/health || echo "Service unavailable"
```

**Solutions:**
1. **Missing environment variables:**
   - Check Railway environment variables match `.env.example`
   - Required: `DATABASE_URL`, `SUPABASE_*`, `GOOGLE_*`, `STRIPE_*`

2. **Database connection issues:**
   - Verify `DATABASE_URL` is correct
   - Check database is accessible from Railway network
   - Test connection: `psql $DATABASE_URL -c "SELECT 1"`

3. **API endpoint not exposed:**
   - Check `backend/src/api/endpoints/` directory
   - Verify endpoint is registered in `backend/src/main.py`
   - Check endpoint path matches exactly: `/v1/credits/balance`

### Issue: High Memory/CPU Usage

**Symptoms:**
- Service keeps restarting
- "Restart policy exceeded" message
- Application takes >10s to start

**Solutions:**
1. Reduce number of workers (already set to 1 in production)
2. Increase Railway plan resources
3. Profile application:
   ```bash
   railway logs --environment production --lines 500 | grep -i memory
   ```

### Issue: Cannot Connect to Database

**Symptoms:**
- Logs show "connection refused" or "timeout"
- API returns 500 errors
- Service crashes immediately

**Solutions:**
1. Verify DATABASE_URL is set:
   ```bash
   railway variable
   ```

2. Check database is running:
   - Log into Supabase dashboard
   - Verify project is active (not paused)
   - Check connection pooler status

3. Test connection from Railway environment:
   ```bash
   railway shell
   python -c "import psycopg2; psycopg2.connect('$DATABASE_URL')"
   ```

## Deployment Checklist

Before pushing to `master` (production), verify:

- [ ] Code committed and tested locally
- [ ] All tests pass: `npm run test:e2e` (frontend) and `pytest tests/` (backend)
- [ ] Environment variables match `.env.example`
- [ ] Database migrations applied successfully
- [ ] No console errors in browser (frontend)
- [ ] API responds on localhost:8000
- [ ] `/v1/credits/balance` endpoint tested and working
- [ ] No security secrets in code
- [ ] Git branch is `001-data-model` (staging) or `master` (production)
- [ ] GitHub Actions workflows visible in Actions tab

## Post-Deployment Verification

After deployment completes:

1. **Check deployment status:**
   ```bash
   railway deployments --lines 5
   ```

2. **View recent logs:**
   ```bash
   railway logs --lines 50
   ```

3. **Test health endpoint:**
   ```bash
   # Staging
   curl https://yarda-staging.railway.app/health

   # Production
   curl https://yarda-api.railway.app/health
   ```

4. **Test core endpoint:**
   ```bash
   # Staging
   curl -H "Authorization: Bearer $TOKEN" \
     https://yarda-staging.railway.app/v1/credits/balance

   # Production
   curl -H "Authorization: Bearer $TOKEN" \
     https://yarda-api.railway.app/v1/credits/balance
   ```

5. **Monitor for errors:**
   - Check error logs every minute for 5 minutes
   - Monitor response times and success rates
   - Alert if error rate exceeds 1%

## Environment Variables

Both staging and production environments require these variables:

### Database
- `DATABASE_URL` - PostgreSQL connection string (from Supabase)

### Supabase
- `SUPABASE_URL` - Project URL
- `SUPABASE_KEY` - Service role key
- `SUPABASE_JWT_SECRET` - JWT signing secret

### Google Cloud
- `GOOGLE_MAPS_API_KEY` - Maps API key
- `GOOGLE_GENAI_API_KEY` - Gemini API key

### Stripe
- `STRIPE_API_KEY` - Secret key for payments
- `STRIPE_WEBHOOK_SECRET` - Webhook signing secret

### Application
- `ENVIRONMENT` - "staging" or "production"
- `LOG_LEVEL` - "INFO" for production, "DEBUG" for staging
- `CORS_ORIGINS` - Comma-separated list of allowed origins

## Git Branch Strategy

```
master (production)
  ↑
  ├─ PR from 001-data-model (tested in staging)
  ├─ PR from hotfix branches
  └─ Only stable, tested code

001-data-model (staging)
  ├─ Feature development
  ├─ Testing ground for new features
  └─ Merges to master after validation
```

## Rollback Procedure

If production deployment has critical issues:

### Option 1: Redeploy Previous Version

```bash
# View recent deployments
railway deployments --lines 10

# Redeploy specific deployment
railway redeploy <deployment-id> --environment production
```

### Option 2: Revert Git and Push

```bash
# Revert last commit
git revert HEAD

# Push to master (triggers automatic redeployment)
git push origin master
```

### Option 3: Manual Fix and Redeploy

```bash
# Fix the issue in code
# Commit fix
git commit -am "fix: production issue"

# Push to master
git push origin master

# Monitor deployment
railway logs --environment production --lines 100
```

## Performance Optimization

### Build Optimization
- Caching enabled by default in NIXPACKS
- First build: ~5 minutes
- Subsequent builds with no dependency changes: ~2 minutes

### Startup Optimization
- Single worker mode (no multiprocessing overhead)
- Connection pooling enabled in database layer
- Uvicorn startup typically <5 seconds

### Monitoring
- Check startup time in deployment logs
- Alert if startup exceeds 10 seconds
- Profile with: `time curl https://api.example.com/health`

## References

- [Railway Documentation](https://docs.railway.app)
- [NIXPACKS Python Support](https://nixpacks.com/docs/languages/python)
- [FastAPI Deployment](https://fastapi.tiangolo.com/deployment/)
- [GitHub Actions Documentation](https://docs.github.com/en/actions)

## Support

For deployment issues:

1. Check troubleshooting section above
2. Review Railway logs in dashboard
3. Check GitHub Actions workflow logs
4. Review this document for configuration details
5. Contact DevOps team or refer to team Slack channel

---

**Last Updated:** 2025-11-14
**Configuration Version:** 1.0
**Status:** Active and tested
