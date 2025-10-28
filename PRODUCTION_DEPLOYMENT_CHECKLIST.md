# Production Deployment Checklist - Yarda v5

**Last Updated:** 2025-10-28
**Version:** 1.0.0
**Project:** Yarda Landscape Designer Platform

This comprehensive checklist ensures a smooth, secure, and reliable production deployment.

---

## Pre-Deployment Overview

**Deployment Architecture:**
- **Frontend:** Next.js 14 on Vercel
- **Backend:** FastAPI on Railway/Render/Fly.io
- **Database:** Supabase (PostgreSQL + Auth)
- **AI Service:** OpenAI API
- **Payments:** Stripe (when implemented)

**Estimated Deployment Time:** 2-4 hours

---

## Phase 1: Database Preparation ✓ CRITICAL

### 1.1 Apply All Migrations

**Status:** Ready to apply
**Location:** `supabase/migrations/`

```bash
# Apply via Supabase SQL Editor (recommended)
# https://app.supabase.com/project/ynsfmvonkoodmqfkukge/sql

# Or via CLI
supabase link --project-ref ynsfmvonkoodmqfkukge
supabase db push
```

**Migrations to Apply (in order):**
- [x] 001-006: User Stories 1-4 (already applied)
- [x] 007-010: User Story 5 (already applied)
- [ ] 011: Performance indexes ⭐ **APPLY BEFORE LAUNCH**
- [ ] 012: Function search paths (security) ⭐ **APPLY BEFORE LAUNCH**
- [ ] 013: Revoke anon permissions (security) ⭐ **APPLY BEFORE LAUNCH**
- [ ] 014: Optimize RLS policies (performance)
- [ ] 015: Remove duplicate indexes (performance)

**Verification:**
```sql
-- Check all migrations applied
SELECT * FROM supabase_migrations.schema_migrations ORDER BY version;

-- Should see versions: 001-015

-- Verify critical trigger exists
SELECT trigger_name FROM information_schema.triggers
WHERE trigger_name = 'on_auth_user_created';
```

### 1.2 Verify Database Functions

```sql
-- Test all critical functions
SELECT * FROM get_credit_balance('<test-user-id>');
SELECT consume_credit('<test-user-id>');
SELECT check_rate_limit('<test-user-id>');
```

**Expected Results:**
- `get_credit_balance()`: Returns `{trial_credits, token_balance, total_credits}`
- `consume_credit()`: Returns `'trial'` or `'token'`
- `check_rate_limit()`: Returns `true` or `false`

### 1.3 RLS Policy Verification

```sql
-- Verify RLS enabled on all tables
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
AND tablename IN ('users', 'token_accounts', 'generations', 'rate_limits');

-- All should show rowsecurity = true
```

### 1.4 Database Backups

- [ ] Enable automatic backups in Supabase (Settings > Database > Backups)
- [ ] Set backup frequency: Daily at minimum
- [ ] Set backup retention: 7 days minimum
- [ ] Test backup restoration process
- [ ] Document backup restoration procedure

---

## Phase 2: Environment Configuration

### 2.1 Supabase Configuration

**Navigate to:** https://app.supabase.com/project/ynsfmvonkoodmqfkukge/settings

#### API Settings
- [ ] Copy **Project URL**: `https://ynsfmvonkoodmqfkukge.supabase.co`
- [ ] Copy **anon (public) key**: For frontend
- [ ] Copy **service_role key**: For backend (keep SECRET)
- [ ] Verify JWT Secret is set (auto-generated)

#### Auth Settings
- [ ] Enable email confirmations: Settings > Auth > Email Auth
- [ ] Set email templates (welcome, password reset, magic link)
- [ ] Configure allowed redirect URLs:
  - Production frontend URL: `https://yourdomain.com/*`
  - Localhost for development: `http://localhost:3000/*`
- [ ] Set JWT expiry: 3600 seconds (1 hour) recommended
- [ ] Enable refresh token rotation: Yes
- [ ] **Security hardening:**
  - [ ] Enable leaked password protection
  - [ ] Enable MFA (optional but recommended)
  - [ ] Set rate limits: 30 requests per hour for auth endpoints

#### Database Settings
- [ ] Enable connection pooling: Supavisor enabled by default
- [ ] Set connection limit based on plan
- [ ] Enable slow query logging
- [ ] Set statement timeout: 30000ms (30 seconds)

### 2.2 Backend Environment Variables

Create `.env` in `backend/` directory:

```env
# Supabase
SUPABASE_URL=https://ynsfmvonkoodmqfkukge.supabase.co
SUPABASE_ANON_KEY=<your-anon-key>
SUPABASE_SERVICE_ROLE_KEY=<your-service-role-key>  # ⚠️ KEEP SECRET

# API Configuration
API_HOST=0.0.0.0
API_PORT=8000
ENVIRONMENT=production

# CORS
ALLOWED_ORIGINS=https://yourdomain.com,https://www.yourdomain.com

# Performance
MAX_PAGE_SIZE=100
DEFAULT_PAGE_SIZE=20

# Rate Limiting
RATE_LIMIT_WINDOW=60
RATE_LIMIT_MAX_REQUESTS=3

# Logging
LOG_LEVEL=INFO
LOG_FORMAT=json

# AI Service (when implemented)
OPENAI_API_KEY=<your-openai-api-key>  # ⚠️ KEEP SECRET

# Stripe (when implemented)
STRIPE_SECRET_KEY=<your-stripe-secret-key>  # ⚠️ KEEP SECRET
STRIPE_WEBHOOK_SECRET=<your-stripe-webhook-secret>  # ⚠️ KEEP SECRET
```

**Security Checklist:**
- [ ] All secret keys are in environment variables (NOT in code)
- [ ] `.env` file is in `.gitignore`
- [ ] No secrets committed to version control
- [ ] Service role key only used in backend (never frontend)

### 2.3 Frontend Environment Variables

Create `.env.local` in `frontend/` directory:

```env
# Supabase (public keys only)
NEXT_PUBLIC_SUPABASE_URL=https://ynsfmvonkoodmqfkukge.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<your-anon-key>

# Backend API
NEXT_PUBLIC_API_URL=https://api.yourdomain.com

# Environment
NEXT_PUBLIC_ENVIRONMENT=production

# Analytics (when implemented)
NEXT_PUBLIC_GA_ID=<your-google-analytics-id>
```

**Vercel Deployment:**
- [ ] Add all environment variables in Vercel dashboard
- [ ] Set for Production environment
- [ ] Optionally set for Preview environments
- [ ] Never commit `.env.local` to git

---

## Phase 3: Backend Deployment

### 3.1 Choose Hosting Provider

**Recommended Options:**

| Provider | Pros | Cons | Cost |
|----------|------|------|------|
| **Railway** | Easy deployment, auto-scaling | Limited free tier | $5-20/month |
| **Render** | Free tier, good DX | Cold starts on free tier | Free - $25/month |
| **Fly.io** | Global edge network, fast | Steeper learning curve | $0-10/month |
| **Google Cloud Run** | Serverless, auto-scaling | More complex setup | Pay per use |

**Selected:** _________

### 3.2 Deployment Steps (Railway Example)

```bash
# Install Railway CLI
npm install -g @railway/cli

# Login
railway login

# Initialize project
cd backend
railway init

# Set environment variables
railway variables set SUPABASE_URL=https://...
railway variables set SUPABASE_ANON_KEY=...
railway variables set SUPABASE_SERVICE_ROLE_KEY=...
# ... (set all variables from section 2.2)

# Deploy
railway up
```

### 3.3 Backend Health Checks

After deployment, verify:

```bash
# Health endpoint
curl https://api.yourdomain.com/health

# Expected: {"status": "healthy", "timestamp": "..."}

# API documentation
curl https://api.yourdomain.com/docs

# Should return Swagger UI HTML

# Test authentication
curl -X POST https://api.yourdomain.com/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"TestPass123!"}'
```

### 3.4 Backend Monitoring

- [ ] Set up error tracking (Sentry, Rollbar)
- [ ] Configure log aggregation (Logtail, Papertrail)
- [ ] Set up uptime monitoring (UptimeRobot, Pingdom)
- [ ] Configure alerts for:
  - [ ] API errors (5xx responses)
  - [ ] High response times (>2 seconds)
  - [ ] Database connection failures
  - [ ] Rate limit violations

---

## Phase 4: Frontend Deployment

### 4.1 Vercel Deployment

```bash
# Install Vercel CLI
npm install -g vercel

# Login
vercel login

# Deploy from frontend directory
cd frontend
vercel

# Follow prompts:
# - Link to existing project or create new
# - Set project name
# - Confirm build settings

# Set environment variables in Vercel dashboard
# Settings > Environment Variables
```

### 4.2 Build Configuration

**`vercel.json`** (if needed):
```json
{
  "buildCommand": "npm run build",
  "outputDirectory": ".next",
  "framework": "nextjs",
  "regions": ["sfo1"],
  "env": {
    "NEXT_PUBLIC_SUPABASE_URL": "@supabase-url",
    "NEXT_PUBLIC_SUPABASE_ANON_KEY": "@supabase-anon-key",
    "NEXT_PUBLIC_API_URL": "@api-url"
  }
}
```

### 4.3 Domain Configuration

- [ ] Add custom domain in Vercel: Settings > Domains
- [ ] Add domain: `yourdomain.com`
- [ ] Add www subdomain: `www.yourdomain.com`
- [ ] Configure DNS records:
  ```
  A     @       76.76.21.21
  CNAME www     cname.vercel-dns.com
  ```
- [ ] Enable SSL/TLS (automatic with Vercel)
- [ ] Redirect www to apex (or vice versa)

### 4.4 Frontend Health Checks

After deployment:

- [ ] Visit production URL: `https://yourdomain.com`
- [ ] Test registration flow
- [ ] Test login flow
- [ ] Test design generation
- [ ] Test all user journeys from integration guide
- [ ] Check browser console for errors
- [ ] Test on mobile devices

---

## Phase 5: Security Hardening

### 5.1 Apply Security Migrations

```bash
# Apply migrations 012 and 013 (CRITICAL)
# Run in Supabase SQL Editor

# Migration 012: Fix function search paths
# Migration 013: Revoke anon function permissions
```

### 5.2 Supabase Auth Hardening

Navigate to: Settings > Auth

- [ ] Enable leaked password protection
- [ ] Set minimum password length: 8 characters
- [ ] Require uppercase + lowercase + numbers
- [ ] Enable email rate limiting: 30/hour
- [ ] Enable captcha for signup (optional)
- [ ] Disable public user registration if needed (business requirement)

### 5.3 CORS Configuration

**Backend `main.py`:**
```python
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "https://yourdomain.com",
        "https://www.yourdomain.com"
    ],
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE"],
    allow_headers=["*"],
)
```

- [ ] Remove `http://localhost:3000` from production CORS
- [ ] Only allow production frontend domain
- [ ] Set `allow_credentials=True` for auth cookies

### 5.4 API Rate Limiting

**Already implemented in code**, verify:
- [ ] 3 requests per 60 seconds for generations
- [ ] Rate limits stored in database
- [ ] Rate limit errors return 429 status with retry_after

### 5.5 Security Headers

Add to backend responses:
```python
@app.middleware("http")
async def add_security_headers(request: Request, call_next):
    response = await call_next(request)
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["X-XSS-Protection"] = "1; mode=block"
    response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
    return response
```

### 5.6 Secrets Management

- [ ] Rotate all API keys before launch
- [ ] Use secret management service (AWS Secrets Manager, Vercel Secrets)
- [ ] Never log sensitive data (passwords, tokens, keys)
- [ ] Implement secret scanning in CI/CD

---

## Phase 6: Performance Optimization

### 6.1 Apply Performance Migrations

```bash
# Apply migrations 011, 014, 015
# Run in Supabase SQL Editor

# Migration 011: Performance indexes (10x improvement)
# Migration 014: Optimize RLS policies
# Migration 015: Remove duplicate indexes
```

### 6.2 Database Connection Pooling

**Already configured in code via Supabase client**

Verify:
- [ ] Connection pooling enabled in Supabase (Supavisor)
- [ ] Backend uses connection pooling (httpx in Supabase client)
- [ ] No connection leaks (check Supabase dashboard)

### 6.3 Frontend Performance

- [ ] Enable Next.js image optimization
- [ ] Use `next/image` for all images
- [ ] Enable static generation where possible
- [ ] Lazy load components with `next/dynamic`
- [ ] Minimize bundle size (check with `npm run build`)
- [ ] Enable compression (automatic with Vercel)

### 6.4 CDN & Caching

**Vercel automatically provides:**
- [ ] Global CDN for static assets
- [ ] Edge caching for pages
- [ ] Brotli compression

**Backend caching:**
- [ ] Cache static data (if applicable)
- [ ] Set appropriate `Cache-Control` headers
- [ ] Use Redis for session caching (future enhancement)

### 6.5 Monitoring Performance

- [ ] Set up Core Web Vitals monitoring (Vercel Analytics)
- [ ] Monitor API response times (avg <500ms)
- [ ] Monitor database query times (avg <100ms)
- [ ] Set alerts for slow queries (>1 second)

---

## Phase 7: Data & Seed Setup

### 7.1 Clear Test Data

```sql
-- Remove all seed/test data from production database
DELETE FROM rate_limits WHERE user_id IN (
    SELECT id FROM auth.users WHERE email LIKE 'seed-%@yarda.test'
);
DELETE FROM generations WHERE user_id IN (
    SELECT id FROM auth.users WHERE email LIKE 'seed-%@yarda.test'
);
DELETE FROM token_accounts WHERE user_id IN (
    SELECT id FROM auth.users WHERE email LIKE 'seed-%@yarda.test'
);
DELETE FROM users WHERE email LIKE 'seed-%@yarda.test';
DELETE FROM auth.users WHERE email LIKE 'seed-%@yarda.test';

-- Also remove any other test users
DELETE FROM auth.users WHERE email LIKE '%test%' OR email LIKE '%example.com';
```

### 7.2 Create Admin Account (Optional)

```sql
-- Create admin user manually if needed
-- Or use the registration flow
```

### 7.3 Initial Data (if needed)

- [ ] Create pricing tiers (if not in code)
- [ ] Set up initial token packages
- [ ] Configure system settings

---

## Phase 8: Testing in Production

### 8.1 Smoke Tests

Run these tests immediately after deployment:

**1. Health Check**
```bash
curl https://api.yourdomain.com/health
# Expected: {"status": "healthy"}
```

**2. Registration Flow**
- [ ] Visit `https://yourdomain.com/register`
- [ ] Create new account with real email
- [ ] Check email for verification link
- [ ] Click verification link
- [ ] Verify redirects to dashboard/generate page

**3. Credit Display**
- [ ] Login with verified account
- [ ] Navigate to `/generate`
- [ ] Verify displays: Trial: 3, Tokens: 0, Total: 3

**4. Design Generation**
- [ ] Enter valid address
- [ ] Select style
- [ ] Click "Generate Design"
- [ ] Verify generation starts
- [ ] Verify credits decrease to Trial: 2
- [ ] Wait for generation to complete
- [ ] Verify design displays

**5. Rate Limiting**
- [ ] Generate 3 designs rapidly
- [ ] Verify 4th attempt shows rate limit error
- [ ] Verify countdown timer displays

**6. Token Account**
- [ ] Navigate to `/profile`
- [ ] Verify token account section displays
- [ ] Verify shows: Balance: 0, Purchased: 0, Consumed: 0

**7. Generation History**
- [ ] Navigate to `/history`
- [ ] Verify shows 3 generations
- [ ] Click on one generation
- [ ] Verify modal opens with details

### 8.2 Error Handling Tests

**Test all error scenarios:**
- [ ] Invalid email format
- [ ] Weak password
- [ ] Duplicate email registration
- [ ] Invalid login credentials
- [ ] Expired verification link
- [ ] Insufficient credits
- [ ] Rate limit exceeded
- [ ] Network timeout
- [ ] API errors (500, 503)

**Expected:** All errors show user-friendly messages

### 8.3 Cross-Browser Testing

Test on:
- [ ] Chrome (latest)
- [ ] Safari (latest)
- [ ] Firefox (latest)
- [ ] Edge (latest)
- [ ] Mobile Safari (iOS)
- [ ] Mobile Chrome (Android)

### 8.4 Load Testing (Optional)

Use tools like:
- Apache Bench (ab)
- k6
- Artillery

```bash
# Example with ab
ab -n 100 -c 10 https://api.yourdomain.com/health

# 100 requests, 10 concurrent
# Should handle without errors
```

---

## Phase 9: Monitoring & Observability

### 9.1 Error Tracking

**Recommended: Sentry**

```bash
# Install Sentry
npm install @sentry/nextjs @sentry/python

# Frontend: Add to next.config.js
# Backend: Add to main.py
```

**Configure:**
- [ ] Set up Sentry project
- [ ] Add Sentry DSN to environment variables
- [ ] Test error reporting
- [ ] Set up error alerts (email, Slack)

### 9.2 Logging

**Backend logging already configured** (python-json-logger)

**Log aggregation options:**
- [ ] Logtail (recommended, free tier)
- [ ] Papertrail
- [ ] CloudWatch (if on AWS)
- [ ] Google Cloud Logging

**Set up:**
- [ ] Configure log shipping from Railway/Render
- [ ] Set up log retention (30 days minimum)
- [ ] Create log alerts for errors
- [ ] Create dashboard for log visualization

### 9.3 Uptime Monitoring

**Recommended: UptimeRobot (free)**

- [ ] Monitor frontend: `https://yourdomain.com`
- [ ] Monitor backend health: `https://api.yourdomain.com/health`
- [ ] Set check interval: 5 minutes
- [ ] Set up alerts: email, SMS
- [ ] Monitor from multiple regions

### 9.4 Database Monitoring

**Supabase Dashboard provides:**
- [ ] Query performance
- [ ] Active connections
- [ ] Slow queries
- [ ] Table sizes
- [ ] Replication lag

**Set up alerts for:**
- [ ] Connection pool exhaustion
- [ ] Slow queries (>1 second)
- [ ] High CPU usage (>80%)
- [ ] High memory usage (>80%)

### 9.5 Application Metrics

**Track:**
- [ ] Total users
- [ ] Active users (DAU, MAU)
- [ ] Generations per day
- [ ] Credit consumption rate
- [ ] Trial to paid conversion rate (when payments implemented)
- [ ] Average response time
- [ ] Error rate

**Tools:**
- Vercel Analytics (frontend)
- Custom API endpoint (`/api/metrics`)
- Google Analytics (optional)

---

## Phase 10: Documentation & Runbooks

### 10.1 Production Documentation

Create internal docs for:
- [ ] Deployment process (this checklist)
- [ ] Rollback procedure
- [ ] Database migration process
- [ ] Incident response plan
- [ ] On-call rotation (if team)

### 10.2 Incident Response Runbooks

**Scenario: Database is down**
1. Check Supabase status: https://status.supabase.com
2. Check database connections in Supabase dashboard
3. Restart backend service if connection pool issue
4. Contact Supabase support if persistent

**Scenario: Backend API is down**
1. Check hosting provider status
2. Check backend logs for errors
3. Check database connectivity
4. Restart backend service
5. If persistent, rollback to previous deployment

**Scenario: Frontend is down**
1. Check Vercel status
2. Check build logs in Vercel dashboard
3. Check for failed deployment
4. Rollback to previous deployment if needed

**Scenario: Rate limit issues**
1. Check if legitimate traffic spike or attack
2. Temporarily increase rate limits if legitimate
3. Block IPs if attack
4. Review rate limit settings

### 10.3 Rollback Procedures

**Frontend rollback (Vercel):**
```bash
# Via Vercel dashboard
# Deployments > Previous deployment > Promote to Production

# Or via CLI
vercel rollback
```

**Backend rollback (Railway):**
```bash
# Via Railway dashboard
# Deployments > Previous deployment > Redeploy

# Or via CLI
railway rollback
```

**Database rollback:**
```sql
-- Run reverse migration SQL
-- Should have written down migration for each change
```

---

## Phase 11: Launch Checklist

### Pre-Launch (Day Before)

- [ ] All migrations applied and verified
- [ ] All environment variables set
- [ ] Backend deployed and health check passing
- [ ] Frontend deployed and accessible
- [ ] All smoke tests passed
- [ ] Error tracking configured and tested
- [ ] Logging configured and tested
- [ ] Uptime monitoring configured
- [ ] Backups enabled and tested
- [ ] Security hardening complete
- [ ] Performance optimizations applied
- [ ] Documentation complete
- [ ] Team trained on incident response

### Launch Day

- [ ] Send launch announcement to team
- [ ] Monitor logs continuously for first 2 hours
- [ ] Monitor error tracking dashboard
- [ ] Monitor database performance
- [ ] Test all critical user journeys
- [ ] Verify email delivery working
- [ ] Verify no errors in production logs
- [ ] Check response times are acceptable
- [ ] Verify backups running

### Post-Launch (First Week)

- [ ] Daily error log review
- [ ] Daily performance metrics review
- [ ] Monitor user feedback
- [ ] Track key metrics (signups, generations, errors)
- [ ] Address any issues immediately
- [ ] Create post-launch report

---

## Phase 12: Post-Deployment

### 12.1 Continuous Monitoring

**Daily:**
- [ ] Check error tracking dashboard
- [ ] Review critical alerts
- [ ] Monitor key metrics

**Weekly:**
- [ ] Review performance trends
- [ ] Analyze slow queries
- [ ] Check disk usage growth
- [ ] Review security logs

**Monthly:**
- [ ] Rotate API keys and secrets
- [ ] Review and update dependencies
- [ ] Security audit
- [ ] Performance optimization review

### 12.2 Backup Verification

**Weekly backup test:**
```sql
-- Verify latest backup exists
-- Test restoration to staging environment
```

### 12.3 Scaling Preparation

**Monitor for scaling needs:**
- [ ] Database size approaching limits
- [ ] Connection pool exhaustion
- [ ] High CPU/memory usage
- [ ] Slow response times

**Scaling options:**
- [ ] Upgrade Supabase plan
- [ ] Upgrade backend hosting plan
- [ ] Add read replicas (Supabase Pro)
- [ ] Implement caching layer (Redis)
- [ ] Optimize queries and indexes

---

## Deployment Contacts

**Emergency Contacts:**
- **Supabase Support:** support@supabase.io
- **Vercel Support:** support@vercel.com
- **Railway Support:** team@railway.app
- **Team Lead:** [Your contact]
- **On-Call Engineer:** [Your contact]

**Service Status Pages:**
- Supabase: https://status.supabase.com
- Vercel: https://www.vercel-status.com
- Railway: https://railway.statuspage.io

---

## Success Criteria

Deployment is successful when:

- ✅ All health checks passing
- ✅ All smoke tests passed
- ✅ No errors in production logs for 1 hour
- ✅ Response times under 500ms (p95)
- ✅ Database queries under 100ms (p95)
- ✅ All user journeys working
- ✅ Email delivery working
- ✅ Monitoring and alerts configured
- ✅ Backups verified
- ✅ Team notified

**You are clear to launch!** 🚀

---

## Rollback Triggers

Immediately rollback if:

- Database migrations fail
- Critical errors in production logs
- Response times exceed 5 seconds
- Error rate exceeds 5%
- Security vulnerability discovered
- Data loss or corruption detected

---

## Notes

**Deployment Date:** __________
**Deployed By:** __________
**Deployment Duration:** __________ hours
**Issues Encountered:** __________
**Rollbacks Required:** __________
**Post-Launch Notes:** __________

---

## Appendix: Quick Reference

### Environment Variables Summary

**Backend (Secret):**
```
SUPABASE_URL
SUPABASE_SERVICE_ROLE_KEY  # ⚠️ SECRET
OPENAI_API_KEY  # ⚠️ SECRET
STRIPE_SECRET_KEY  # ⚠️ SECRET
```

**Frontend (Public):**
```
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY  # Public is OK
NEXT_PUBLIC_API_URL
```

### Critical Migrations

| Migration | Priority | Purpose |
|-----------|----------|---------|
| 011 | HIGH | Performance indexes (10x improvement) |
| 012 | CRITICAL | Function security (search paths) |
| 013 | HIGH | Anon permission revocation |
| 014 | MEDIUM | RLS policy optimization |
| 015 | LOW | Remove duplicate indexes |

### Monitoring Dashboard URLs

- **Supabase Dashboard:** https://app.supabase.com/project/ynsfmvonkoodmqfkukge
- **Vercel Dashboard:** https://vercel.com/dashboard
- **Backend Dashboard:** [Your hosting provider]
- **Error Tracking:** [Your Sentry URL]
- **Logs:** [Your logging service URL]

---

**Last Updated:** 2025-10-28
**Next Review:** After first week of production operation
