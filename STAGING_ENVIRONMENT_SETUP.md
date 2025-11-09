# Staging & Preview Environment Setup

**Created:** 2025-11-06
**Status:** Ready to implement
**Goal:** Set up staging/preview environments for Railway (backend) + Vercel (frontend) + local testing

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                     Testing Environments                      │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  Production:                                                  │
│  ├─ Backend:  Railway (main branch)                         │
│  │            https://yarda-api-production.up.railway.app    │
│  ├─ Frontend: Vercel (001-data-model branch)               │
│  │            https://yarda-v5-frontend.vercel.app          │
│  └─ Database: Supabase Production                           │
│                                                               │
│  Staging (PR Previews):                                     │
│  ├─ Backend:  Railway PR deployments                        │
│  │            https://yarda-api-staging-{pr}.up.railway.app │
│  ├─ Frontend: Vercel Preview deployments                    │
│  │            https://yarda-v5-frontend-{hash}.vercel.app  │
│  └─ Database: Supabase Production (shared)                 │
│                                                               │
│  Local Testing:                                              │
│  ├─ Backend:  http://localhost:8000                         │
│  ├─ Frontend: http://localhost:3000                         │
│  └─ Database: Supabase Production (shared)                 │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

---

## Step 1: Railway PR-Based Deployments

### Current Setup
- Project: `yarda-api` (ID: `7a8f9bcb-a265-4c34-82d2-c9c3655d26bf`)
- Environment: `production` (deploys from main branch)
- Service: `yarda-api`

### Enable PR Deployments

**Option A: Manual Dashboard Setup (Recommended)**
1. Go to [Railway Dashboard](https://railway.app/project/7a8f9bcb-a265-4c34-82d2-c9c3655d26bf)
2. Navigate to **Settings → Deployments**
3. Enable **"Create deployments for pull requests"**
4. Configure:
   - Base Branch: `001-data-model` (or `main`)
   - Auto-deploy: ✅ Enabled
   - Auto-merge: ❌ Disabled (manual approval)

**Option B: CLI Setup**
```bash
cd backend
railway environment:new staging
railway service:link yarda-api
railway up -e staging
```

### PR Deployment Workflow
```bash
# Create feature branch
git checkout -b feature/my-feature

# Make changes, commit
git add .
git commit -m "feat: my feature"

# Push and create PR
git push origin feature/my-feature
# Create PR on GitHub → Railway auto-deploys

# Get staging URL
railway status -e pr-123
# Example: https://yarda-api-pr-123.up.railway.app
```

---

## Step 2: Vercel Preview Deployments (Already Set Up)

### Current Setup
- Project: `yarda-v5-frontend` (ID: `prj_H82uxC9rqafgCvhSaKYEZm5GskNn`)
- Team: `team_VKfqq7FT5jFRbV7UQ5K1YEFR`
- Preview deployments: ✅ Already enabled

### How Vercel Previews Work
1. Push to any branch → Vercel auto-deploys preview
2. Every commit gets unique URL: `https://yarda-v5-frontend-git-{branch}-{hash}.vercel.app`
3. Comment added to PR with preview URL

### Configure Preview Environment Variables

**Add staging backend URL:**
```bash
cd frontend

# Add preview environment variable
vercel env add NEXT_PUBLIC_API_URL preview

# When prompted, enter:
# Value: https://yarda-api-staging.up.railway.app
# (Replace with actual Railway staging URL)
```

---

## Step 3: Connect Local Testing to Staging

### Current Configuration
**Frontend** (`frontend/.env.local`):
```bash
# Currently points to production
NEXT_PUBLIC_API_URL=https://yarda-api-production.up.railway.app

# Change to local or staging as needed:
# Local backend:
# NEXT_PUBLIC_API_URL=http://localhost:8000

# Staging backend:
# NEXT_PUBLIC_API_URL=https://yarda-api-staging.up.railway.app
```

### Testing Workflow

**Option 1: Full Local (Recommended for Development)**
```bash
# Terminal 1: Start local backend
cd backend
source venv/bin/activate
uvicorn src.main:app --reload --port 8000

# Terminal 2: Start frontend (pointing to local backend)
cd frontend
# Edit .env.local to use http://localhost:8000
npm run dev

# Access: http://localhost:3000
# Backend: http://localhost:8000
```

**Option 2: Local Frontend + Staging Backend**
```bash
# Frontend only
cd frontend
# Edit .env.local to use Railway staging URL
npm run dev

# Access: http://localhost:3000
# Backend: https://yarda-api-staging.up.railway.app
```

**Option 3: Local Frontend + Production Backend**
```bash
# Current setup - already configured
cd frontend
npm run dev

# Access: http://localhost:3000
# Backend: https://yarda-api-production.up.railway.app
```

---

## Step 4: E2E Testing with Different Environments

### Playwright Configuration

Update `frontend/playwright.config.ts`:

```typescript
export default defineConfig({
  use: {
    // Base URL for tests
    baseURL: process.env.TEST_BASE_URL || 'http://localhost:3000',

    // API endpoint for backend calls
    extraHTTPHeaders: {
      'X-API-URL': process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000',
    },
  },

  // Test environments
  projects: [
    {
      name: 'local',
      use: {
        baseURL: 'http://localhost:3000',
      },
    },
    {
      name: 'staging',
      use: {
        baseURL: process.env.VERCEL_PREVIEW_URL,
      },
    },
    {
      name: 'production',
      use: {
        baseURL: 'https://yarda-v5-frontend.vercel.app',
      },
    },
  ],
});
```

### Running E2E Tests

```bash
cd frontend

# Test against local
npm run test:e2e

# Test against staging (requires Vercel preview URL)
NEXT_PUBLIC_API_URL=https://yarda-api-staging.up.railway.app \
TEST_BASE_URL=https://yarda-v5-frontend-git-staging-xxx.vercel.app \
npm run test:e2e

# Test against production
NEXT_PUBLIC_API_URL=https://yarda-api-production.up.railway.app \
TEST_BASE_URL=https://yarda-v5-frontend.vercel.app \
npm run test:e2e
```

---

## Step 5: Environment Variable Management

### Railway Environment Variables

**Set staging-specific variables:**
```bash
cd backend

# Switch to staging environment
railway environment staging

# Set environment-specific variables
railway variables set DATABASE_URL="postgresql://..."
railway variables set ENVIRONMENT="staging"
railway variables set CORS_ORIGINS="https://yarda-v5-frontend-git-*.vercel.app,http://localhost:3000"

# View variables
railway variables
```

### Vercel Environment Variables

**Configure per environment:**
```bash
cd frontend

# Production
vercel env add NEXT_PUBLIC_API_URL production
# Value: https://yarda-api-production.up.railway.app

# Preview (staging)
vercel env add NEXT_PUBLIC_API_URL preview
# Value: https://yarda-api-staging.up.railway.app

# Development (local)
vercel env add NEXT_PUBLIC_API_URL development
# Value: http://localhost:8000
```

---

## Step 6: CI/CD Workflow

### GitHub Actions Workflow (Optional)

Create `.github/workflows/staging-deployment.yml`:

```yaml
name: Staging Deployment

on:
  pull_request:
    branches: [001-data-model, main]

jobs:
  test-and-deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      # Backend tests
      - name: Test Backend
        run: |
          cd backend
          pip install -r requirements.txt
          pytest

      # Frontend tests
      - name: Test Frontend
        run: |
          cd frontend
          npm ci
          npm run type-check
          npm run test:e2e:ci
        env:
          NEXT_PUBLIC_API_URL: ${{ secrets.RAILWAY_STAGING_URL }}

      # Railway deployment happens automatically
      # Vercel deployment happens automatically

      - name: Comment PR with URLs
        uses: actions/github-script@v6
        with:
          script: |
            github.rest.issues.createComment({
              issue_number: context.issue.number,
              owner: context.repo.owner,
              repo: context.repo.repo,
              body: '✅ Staging deployed!\n\n' +
                    '- Backend: Check Railway PR comment\n' +
                    '- Frontend: Check Vercel PR comment'
            })
```

---

## Step 7: Testing the Setup

### Verification Checklist

- [ ] **Railway PR Deployments**
  ```bash
  # Create test PR
  git checkout -b test/staging-setup
  git commit --allow-empty -m "test: staging deployment"
  git push origin test/staging-setup
  # Check Railway dashboard for PR deployment
  ```

- [ ] **Vercel Preview Deployments**
  ```bash
  # Push triggers Vercel preview automatically
  # Check PR for Vercel bot comment with preview URL
  ```

- [ ] **Local + Staging Backend**
  ```bash
  cd frontend
  # Edit .env.local: NEXT_PUBLIC_API_URL=https://yarda-api-staging.up.railway.app
  npm run dev
  # Test: http://localhost:3000
  ```

- [ ] **Full Local Stack**
  ```bash
  # Terminal 1
  cd backend && uvicorn src.main:app --reload --port 8000

  # Terminal 2
  cd frontend && npm run dev
  # Test: http://localhost:3000
  ```

- [ ] **E2E Tests Against Staging**
  ```bash
  cd frontend
  NEXT_PUBLIC_API_URL=https://yarda-api-staging.up.railway.app \
  npm run test:e2e
  ```

---

## Quick Reference

### Environment URLs

| Environment | Backend                                      | Frontend                                  |
|-------------|---------------------------------------------|-------------------------------------------|
| Production  | https://yarda-api-production.up.railway.app | https://yarda-v5-frontend.vercel.app     |
| Staging     | https://yarda-api-staging.up.railway.app    | https://yarda-v5-frontend-git-*.vercel.app|
| Local       | http://localhost:8000                        | http://localhost:3000                     |

### Common Commands

```bash
# Railway
railway status                    # Check current environment
railway environment staging       # Switch to staging
railway logs                      # View logs
railway variables                 # List variables
railway open                      # Open dashboard

# Vercel
vercel                           # Deploy preview
vercel --prod                    # Deploy production
vercel logs                      # View logs
vercel env ls                    # List variables
```

---

## Next Steps

1. **Enable Railway PR deployments** (5 min)
   - Dashboard → Settings → Enable PR deployments

2. **Configure Vercel preview variables** (5 min)
   - Add staging backend URL to preview environment

3. **Update local .env files** (2 min)
   - Add staging URLs as comments for easy switching

4. **Test the workflow** (10 min)
   - Create test PR
   - Verify auto-deployments
   - Run E2E tests

5. **Document team workflow** (5 min)
   - Add to README
   - Share with team

---

## Troubleshooting

### Railway deployment fails
```bash
# Check logs
railway logs -e staging

# Check service status
railway status -e staging

# Re-deploy
railway up -e staging
```

### Vercel preview not building
```bash
# Check build logs in Vercel dashboard
# Verify environment variables are set for preview

# Manual redeploy
vercel --force
```

### CORS errors between environments
```bash
# Ensure Railway CORS_ORIGINS includes:
# - https://yarda-v5-frontend-git-*.vercel.app (for Vercel previews)
# - http://localhost:3000 (for local)

# Update backend .env or Railway variables:
railway variables set CORS_ORIGINS="https://yarda-v5-frontend-git-*.vercel.app,http://localhost:3000"
```

---

## Additional Resources

- [Railway Environments Docs](https://docs.railway.app/reference/environments)
- [Vercel Preview Deployments](https://vercel.com/docs/deployments/preview-deployments)
- [Playwright Testing Docs](https://playwright.dev/docs/test-configuration)
