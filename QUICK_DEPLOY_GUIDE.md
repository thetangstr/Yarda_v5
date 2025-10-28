# Quick Deploy Guide - Yarda v5

**Status:** Ready to deploy
**Est. Time:** 2-3 hours
**Last Updated:** 2025-10-28

This is a streamlined deployment guide. For complete details, see [PRODUCTION_DEPLOYMENT_CHECKLIST.md](PRODUCTION_DEPLOYMENT_CHECKLIST.md).

---

## Prerequisites ✅

- [x] Database migrations applied (011-013)
- [x] Supabase project ready (ynsfmvonkoodmqfkukge)
- [x] Git repository initialized
- [x] Backend code complete
- [x] Frontend code complete

---

## Option 1: Deploy to Railway (Recommended - Easiest)

### Step 1: Install Railway CLI

```bash
npm install -g @railway/cli
railway login
```

### Step 2: Initialize Railway Project

```bash
# From project root
railway init

# Follow prompts:
# - Project name: yarda-api
# - Link to existing project or create new
```

### Step 3: Set Environment Variables

```bash
# Set all required variables
railway variables set SUPABASE_URL=https://ynsfmvonkoodmqfkukge.supabase.co
railway variables set SUPABASE_ANON_KEY=<your-anon-key>
railway variables set SUPABASE_SERVICE_ROLE_KEY=<your-service-role-key>
railway variables set ENVIRONMENT=production
railway variables set LOG_LEVEL=INFO
railway variables set LOG_FORMAT=json
railway variables set ALLOWED_ORIGINS=https://yourdomain.com
```

Or use the Railway dashboard:
1. Go to https://railway.app/dashboard
2. Select your project
3. Click "Variables"
4. Add each variable from `.env.production.example`

### Step 4: Deploy

```bash
# Deploy from root directory
railway up

# Railway will:
# - Detect Python app
# - Install dependencies from backend/requirements.txt
# - Run the start command from railway.json
# - Provide a public URL
```

### Step 5: Get Your API URL

```bash
railway domain
# Or check Railway dashboard for the URL
# Example: https://yarda-api.railway.app
```

### Step 6: Verify Backend

```bash
curl https://your-railway-url.railway.app/health
# Expected: {"status":"healthy","timestamp":"..."}

# Check API docs
open https://your-railway-url.railway.app/docs
```

---

## Option 2: Deploy to Render

### Step 1: Connect GitHub Repository

1. Push your code to GitHub
2. Go to https://render.com/
3. Click "New +" → "Web Service"
4. Connect your GitHub repository

### Step 2: Configure Service

Render will auto-detect `render.yaml`:

```yaml
# Already created in render.yaml
Build Command: cd backend && pip install -r requirements.txt
Start Command: cd backend && uvicorn src.main:app --host 0.0.0.0 --port $PORT
```

### Step 3: Set Environment Variables

In Render dashboard, add:
- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `ENVIRONMENT=production`
- `LOG_LEVEL=INFO`
- `LOG_FORMAT=json`

### Step 4: Deploy

Click "Create Web Service" - Render will deploy automatically.

### Step 5: Get Your API URL

Check Render dashboard for URL:
Example: `https://yarda-api.onrender.com`

---

## Option 3: Deploy to Fly.io

### Step 1: Install Fly CLI

```bash
# macOS
brew install flyctl

# Login
fly auth login
```

### Step 2: Initialize Fly App

```bash
cd backend
fly launch

# Follow prompts:
# - App name: yarda-api
# - Region: Choose closest to users
# - PostgreSQL: No (using Supabase)
# - Redis: No
```

### Step 3: Configure fly.toml

Fly will generate `fly.toml`. Update if needed:

```toml
app = "yarda-api"
primary_region = "sjc"

[build]
  builder = "paketobuildpacks/builder:base"

[env]
  PORT = "8000"
  ENVIRONMENT = "production"

[http_service]
  internal_port = 8000
  force_https = true
  auto_stop_machines = false
  auto_start_machines = true
  min_machines_running = 1

[[http_service.checks]]
  grace_period = "10s"
  interval = "30s"
  method = "GET"
  timeout = "5s"
  path = "/health"
```

### Step 4: Set Secrets

```bash
fly secrets set SUPABASE_URL=https://ynsfmvonkoodmqfkukge.supabase.co
fly secrets set SUPABASE_ANON_KEY=<your-anon-key>
fly secrets set SUPABASE_SERVICE_ROLE_KEY=<your-service-role-key>
```

### Step 5: Deploy

```bash
fly deploy
```

### Step 6: Get Your API URL

```bash
fly info
# Or: https://yarda-api.fly.dev
```

---

## Frontend Deployment (Vercel)

### Step 1: Install Vercel CLI

```bash
npm install -g vercel
vercel login
```

### Step 2: Deploy Frontend

```bash
cd frontend
vercel

# Follow prompts:
# - Set up and deploy? Yes
# - Scope: Your account
# - Link to existing project? No
# - Project name: yarda-landscape
# - Directory: ./ (current directory)
# - Override settings? No (Next.js auto-detected)
```

### Step 3: Set Environment Variables

In Vercel dashboard (https://vercel.com/dashboard):

1. Go to your project → Settings → Environment Variables
2. Add for **Production**:

```
NEXT_PUBLIC_SUPABASE_URL=https://ynsfmvonkoodmqfkukge.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<your-anon-key>
NEXT_PUBLIC_API_URL=<your-backend-url>
NEXT_PUBLIC_ENVIRONMENT=production
```

### Step 4: Redeploy with Environment Variables

```bash
vercel --prod
```

### Step 5: Add Custom Domain (Optional)

In Vercel dashboard:
1. Go to Settings → Domains
2. Add your domain: `yourdomain.com`
3. Configure DNS records as instructed
4. Wait for SSL certificate (automatic)

---

## Post-Deployment Configuration

### 1. Update Supabase Auth URLs

Go to: https://app.supabase.com/project/ynsfmvonkoodmqfkukge/auth/url-configuration

Add to **Redirect URLs**:
```
https://yourdomain.com/*
https://yourdomain.com/auth/callback
```

### 2. Update Backend CORS

Update `ALLOWED_ORIGINS` environment variable:

**Railway:**
```bash
railway variables set ALLOWED_ORIGINS=https://yourdomain.com,https://www.yourdomain.com
```

**Render:**
Update in dashboard: Environment → `ALLOWED_ORIGINS`

**Fly.io:**
```bash
fly secrets set ALLOWED_ORIGINS=https://yourdomain.com,https://www.yourdomain.com
```

### 3. Enable Supabase Security Features

Go to: https://app.supabase.com/project/ynsfmvonkoodmqfkukge/auth/providers

- [ ] Enable leaked password protection
- [ ] Set minimum password strength
- [ ] Enable rate limiting (30 requests/hour for auth)
- [ ] Enable email confirmations

---

## Smoke Tests

### Test Backend Health

```bash
curl https://your-backend-url/health
# Expected: {"status":"healthy"}
```

### Test Backend API Docs

```bash
open https://your-backend-url/docs
# Should show Swagger UI
```

### Test Frontend

```bash
open https://your-frontend-url
# Should load homepage
```

### Test Complete Flow

1. Visit frontend URL
2. Click "Sign Up"
3. Create account with real email
4. Check email for verification link
5. Click verification link
6. Login
7. Navigate to /generate
8. Verify shows: Trial: 3, Tokens: 0
9. Generate a design (will be placeholder)
10. Verify credits decrease to 2

---

## Monitoring Setup

### 1. Sentry (Error Tracking)

```bash
# Install
npm install @sentry/nextjs @sentry/python

# Configure in Vercel dashboard
# Add SENTRY_DSN environment variable

# Configure in Railway/Render
railway variables set SENTRY_DSN=<your-sentry-dsn>
```

### 2. UptimeRobot (Uptime Monitoring)

1. Go to https://uptimerobot.com
2. Add monitor for backend: `https://your-backend-url/health`
3. Add monitor for frontend: `https://your-frontend-url`
4. Set check interval: 5 minutes
5. Set up email alerts

### 3. Logtail (Log Aggregation)

**Railway:**
- Enable Railway logs in dashboard
- Or integrate with Logtail/Papertrail

**Render:**
- Logs available in dashboard
- Or integrate with external service

---

## Troubleshooting

### Backend won't start

**Check logs:**
```bash
# Railway
railway logs

# Render
# Check dashboard logs

# Fly.io
fly logs
```

**Common issues:**
- Missing environment variables
- Wrong Python version (needs 3.12)
- Port binding error (use $PORT variable)

### Frontend shows connection errors

**Check:**
1. Backend health endpoint is accessible
2. CORS is configured correctly
3. Frontend has correct API_URL set
4. Supabase anon key is correct

### Database connection fails

**Check:**
1. SUPABASE_SERVICE_ROLE_KEY is correct
2. Supabase project is active
3. Network connection to Supabase

### Authentication doesn't work

**Check:**
1. Supabase redirect URLs include your domain
2. Email verification is enabled
3. SUPABASE_ANON_KEY is correct in frontend

---

## Rollback Procedure

### Backend Rollback

**Railway:**
```bash
railway rollback
```

**Render:**
Dashboard → Deployments → Previous deployment → Redeploy

**Fly.io:**
```bash
fly releases list
fly releases rollback <version>
```

### Frontend Rollback

**Vercel:**
```bash
vercel rollback
# Or in dashboard: Deployments → Previous → Promote to Production
```

---

## Success Checklist

- [ ] Backend deployed and health check passing
- [ ] Frontend deployed and loading
- [ ] Can register new user
- [ ] Receive verification email
- [ ] Can login after verification
- [ ] See correct credit balance (3 trial credits)
- [ ] Can generate design (placeholder)
- [ ] Credits decrease correctly
- [ ] Rate limiting works (3 requests/60s)
- [ ] Error tracking configured (Sentry)
- [ ] Uptime monitoring configured (UptimeRobot)
- [ ] CORS configured for production domain
- [ ] Supabase auth URLs updated

---

## URLs Checklist

Update these in your documentation:

- **Backend API:** https://_________________
- **Frontend:** https://_________________
- **API Docs:** https://_________________/docs
- **Supabase Dashboard:** https://app.supabase.com/project/ynsfmvonkoodmqfkukge
- **Hosting Dashboard:** https://_________________

---

## Next Steps After Launch

1. **Monitor for 2 hours** - Watch error logs, check metrics
2. **Gather user feedback** - First real users
3. **Plan Phase 9** - Stripe payment integration
4. **Add features:**
   - Email notifications
   - Admin dashboard
   - Real AI generation (OpenAI DALL-E)
   - Analytics tracking

---

## Support

**Issues during deployment?**

1. Check logs on hosting platform
2. Review [PRODUCTION_DEPLOYMENT_CHECKLIST.md](PRODUCTION_DEPLOYMENT_CHECKLIST.md)
3. Review [SECURITY_AUDIT_REPORT.md](SECURITY_AUDIT_REPORT.md)
4. Check Supabase status: https://status.supabase.com

**Quick commands:**

```bash
# Railway
railway logs
railway status
railway restart

# Vercel
vercel logs
vercel inspect

# Fly.io
fly logs
fly status
```

---

**Deployment Ready:** YES ✅
**Estimated Time:** 2-3 hours
**Difficulty:** Easy (Railway) to Medium (Fly.io)

**Choose Railway for fastest deployment!**
