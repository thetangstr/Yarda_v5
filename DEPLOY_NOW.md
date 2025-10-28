# Deploy Yarda v5 to Production (Render + Vercel)

**Status:** Ready to deploy
**GitHub Repository:** https://github.com/thetangstr/Yarda_v5
**Estimated Time:** 30-45 minutes

---

## Step 1: Deploy Backend to Render (15-20 minutes)

### 1.1 Create Render Account & Connect GitHub

1. Go to: https://render.com/
2. Click "Get Started for Free"
3. Sign up with GitHub account (thetangstr)
4. Authorize Render to access your repositories

### 1.2 Create New Web Service

1. Click "New +" button → "Web Service"
2. Connect to repository: `thetangstr/Yarda_v5`
3. Click "Connect" next to the repository

### 1.3 Configure Service (Auto-detected from render.yaml)

Render will auto-detect these settings from [render.yaml](render.yaml):

```yaml
Name: yarda-api
Environment: Python
Region: Oregon
Plan: Free (can upgrade later)
Build Command: cd backend && pip install -r requirements.txt
Start Command: cd backend && uvicorn src.main:app --host 0.0.0.0 --port $PORT
Health Check Path: /health
```

**IMPORTANT:** Click "Advanced" and verify these settings match.

### 1.4 Set Environment Variables

In the Render dashboard, add these environment variables:

**Required Variables** (from [backend/.env](backend/.env)):

```bash
SUPABASE_URL=https://ynsfmvonkoodmqfkukge.supabase.co

SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inluc2Ztdm9ua29vZG1xZmt1a2dlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE2NzQwODQsImV4cCI6MjA3NzI1MDA4NH0.91W3UqE2KDLCpsfoxZGGN9yeB-r66woW1qhsduarlQo

SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inluc2Ztdm9ua29vZG1xZmt1a2dlIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MTY3NDA4NCwiZXhwIjoyMDc3MjUwMDg0fQ.ktqKYYMsN8USwI1ULkIhsgnZxE61zI4Lk703IQ14HAc
```

**Already configured in render.yaml** (will be auto-set):
- ENVIRONMENT=production
- LOG_LEVEL=INFO
- LOG_FORMAT=json
- ALLOWED_ORIGINS=* (will update after frontend deployment)

### 1.5 Deploy

1. Click "Create Web Service"
2. Render will start building (3-5 minutes)
3. Watch the build logs for any errors
4. Wait for deployment to complete

### 1.6 Get Backend URL

Once deployed, your backend will be at:
```
https://yarda-api.onrender.com
```

Or similar (Render will provide the exact URL).

### 1.7 Verify Backend

```bash
# Test health endpoint
curl https://yarda-api.onrender.com/health

# Expected response:
{"status":"healthy","timestamp":"2025-10-28T..."}

# View API documentation
open https://yarda-api.onrender.com/docs
```

---

## Step 2: Deploy Frontend to Vercel (10-15 minutes)

### 2.1 Install Vercel CLI (if not already installed)

```bash
npm install -g vercel
```

### 2.2 Login to Vercel

```bash
vercel login
```

### 2.3 Deploy Frontend

```bash
cd frontend
vercel
```

Follow the prompts:
- Set up and deploy? **Y**
- Which scope? Choose your account
- Link to existing project? **N**
- Project name? **yarda-v5** (or your preference)
- Directory? **./** (current directory)
- Override settings? **N**

Wait for initial deployment to complete (~2-3 minutes).

### 2.4 Set Environment Variables in Vercel

Go to Vercel dashboard: https://vercel.com/dashboard

Navigate to your project → Settings → Environment Variables

Add these variables:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://ynsfmvonkoodmqfkukge.supabase.co

NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inluc2Ztdm9ua29vZG1xZmt1a2dlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE2NzQwODQsImV4cCI6MjA3NzI1MDA4NH0.91W3UqE2KDLCpsfoxZGGN9yeB-r66woW1qhsduarlQo

NEXT_PUBLIC_API_URL=https://yarda-api.onrender.com
# ↑ Use YOUR actual Render backend URL from Step 1.6

NEXT_PUBLIC_ENVIRONMENT=production
```

**Important:** For each variable:
- Select "All" environments (Production, Preview, Development)
- Click "Save"

### 2.5 Redeploy with Environment Variables

```bash
# Still in frontend directory
vercel --prod
```

Wait for production deployment (~2-3 minutes).

Your frontend will be at:
```
https://yarda-v5.vercel.app
```

Or your custom domain if configured.

---

## Step 3: Final Configuration (5-10 minutes)

### 3.1 Update Supabase Auth URLs

Go to: https://app.supabase.com/project/ynsfmvonkoodmqfkukge/auth/url-configuration

Add these redirect URLs (replace with YOUR Vercel URL):

```
https://yarda-v5.vercel.app/*
https://yarda-v5.vercel.app/auth/callback
```

Click "Save".

### 3.2 Update Backend CORS

In Render dashboard, update the ALLOWED_ORIGINS environment variable:

**Old value:**
```
ALLOWED_ORIGINS=*
```

**New value** (replace with YOUR Vercel URL):
```
ALLOWED_ORIGINS=https://yarda-v5.vercel.app
```

Save and wait for automatic redeploy (~1-2 minutes).

---

## Step 4: Verification & Testing (5 minutes)

### 4.1 Backend Health Check

```bash
curl https://yarda-api.onrender.com/health
```

Expected: `{"status":"healthy",...}`

### 4.2 Test User Registration

1. Visit your frontend: https://yarda-v5.vercel.app
2. Click "Sign Up"
3. Enter email and password
4. Check email for verification link
5. Click verification link
6. Login with verified account

### 4.3 Test Design Generation

1. Navigate to `/generate` (or design creation page)
2. Verify credits display: "Trial: 3, Tokens: 0"
3. Create a design (placeholder AI generation)
4. Verify credits decrease to "Trial: 2, Tokens: 0"
5. Check generation appears in history

### 4.4 Test Rate Limiting

1. Create 3 designs rapidly
2. Attempt 4th design
3. Should see rate limit error: "Too many requests. Please wait 60 seconds."

---

## Success Criteria

Deployment is successful when all of these pass:

- ✅ Backend health endpoint returns 200
- ✅ API docs accessible at `/docs`
- ✅ Frontend loads without console errors
- ✅ User can register and receive verification email
- ✅ User can login after email verification
- ✅ Credits display correctly (3 trial credits)
- ✅ Design generation works (placeholder)
- ✅ Credits decrease after generation
- ✅ Rate limiting triggers after 3 requests/60s
- ✅ Generation history displays correctly
- ✅ No 500 errors in backend logs

---

## Deployment URLs

After completion, you'll have:

| Service | URL | Purpose |
|---------|-----|---------|
| **Frontend** | https://yarda-v5.vercel.app | Next.js application |
| **Backend API** | https://yarda-api.onrender.com | FastAPI REST API |
| **API Docs** | https://yarda-api.onrender.com/docs | Interactive API documentation |
| **Database** | https://app.supabase.com/project/ynsfmvonkoodmqfkukge | Supabase PostgreSQL |
| **GitHub** | https://github.com/thetangstr/Yarda_v5 | Source code |

---

## Cost Breakdown

### Render (Backend)
- **Free Tier:** $0/month
  - 750 hours/month free
  - Spins down after 15 min inactivity
  - ~30-60s cold start time

- **Starter Plan:** $7/month (recommended for production)
  - Always on (no cold starts)
  - 512 MB RAM
  - Auto-scaling

### Vercel (Frontend)
- **Hobby:** $0/month
  - 100 GB bandwidth
  - Unlimited websites
  - Perfect for this app

### Supabase (Database)
- **Free Tier:** $0/month
  - 500 MB database
  - 50,000 monthly active users
  - Already configured and running

**Total Cost:** $0-7/month depending on Render plan choice

---

## Monitoring & Logs

### Backend Logs (Render)
https://dashboard.render.com → Select service → Logs

### Frontend Logs (Vercel)
https://vercel.com/dashboard → Select project → Logs

### Database Logs (Supabase)
https://app.supabase.com/project/ynsfmvonkoodmqfkukge/logs/explorer

---

## Troubleshooting

### Backend Build Fails
- Check Python version in logs (should be 3.12)
- Verify all dependencies install successfully
- Check [backend/requirements.txt](backend/requirements.txt) for issues

### Frontend Build Fails
- Check Node version (should be 18+)
- Verify environment variables are set in Vercel
- Check console for TypeScript errors

### Database Connection Errors
- Verify SUPABASE_URL and keys are correct
- Check Supabase project status: https://status.supabase.com
- Verify service role key has proper permissions

### CORS Errors
- Verify ALLOWED_ORIGINS matches frontend URL exactly
- No trailing slash in URLs
- Wait ~1 minute for Render redeploy after changing env vars

### Authentication Not Working
- Check Supabase redirect URLs include frontend domain
- Verify NEXT_PUBLIC_SUPABASE_URL and ANON_KEY are set
- Check browser console for auth errors

---

## Next Steps After Deployment

### Immediate (First Hour)
- [ ] Run all smoke tests above
- [ ] Monitor error logs for issues
- [ ] Test complete user journey
- [ ] Share with 2-3 beta testers

### First Day
- [ ] Set up error tracking (Sentry recommended)
- [ ] Set up uptime monitoring (UptimeRobot)
- [ ] Enable Supabase leaked password protection
- [ ] Configure custom domain (optional)

### First Week
- [ ] Daily error log review
- [ ] Gather user feedback
- [ ] Monitor performance metrics
- [ ] Plan next feature additions

---

## Support

### Service Status Pages
- **Render:** https://status.render.com
- **Vercel:** https://www.vercel-status.com
- **Supabase:** https://status.supabase.com

### Documentation
- [DEPLOYMENT_READY.md](DEPLOYMENT_READY.md) - Pre-deployment checklist
- [QUICK_DEPLOY_GUIDE.md](QUICK_DEPLOY_GUIDE.md) - Alternative deployment guide
- [SECURITY_AUDIT_REPORT.md](SECURITY_AUDIT_REPORT.md) - Security details
- [backend/README.md](backend/README.md) - Backend documentation
- [frontend/README.md](frontend/README.md) - Frontend documentation

---

**Ready to deploy?** Start with Step 1 above! 🚀

The entire process should take 30-45 minutes for someone following this guide.
