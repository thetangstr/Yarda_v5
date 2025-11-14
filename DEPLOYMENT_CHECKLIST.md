# Production Deployment Checklist
**Version:** 1.0.0
**Last Updated:** 2025-11-13

---

## Pre-Deployment Checklist

### 1. Code Quality ✅
- [ ] All linting errors resolved (`npm run lint`)
- [ ] Type checking passes (`npm run type-check`)
- [ ] No console.log statements in production code
- [ ] Code reviewed and approved by team member

### 2. Testing ✅
- [ ] **Unit tests passing** (`npm run test:unit`)
- [ ] **E2E tests passing** (`npm run test:e2e`)
- [ ] **CUJ tests passing** (`npm run test:cuj:all`)
  - [ ] CUJ1: Registration & Trial Flow ✅
  - [ ] CUJ2: Language Selection ✅
  - [ ] CUJ3: Single-Page Generation ✅
  - [ ] CUJ6: Trial Exhaustion ✅
  - [ ] CUJ7: Holiday Decorator ✅
- [ ] **Backend integration tests passing** (`pytest tests/`)
- [ ] Test coverage > 70%

### 3. Database Migrations ✅
- [ ] All migrations tested locally
- [ ] Migration rollback plan documented
- [ ] Migrations applied to staging successfully
- [ ] Database backup created before production migration

### 4. Environment Configuration ✅
- [ ] All environment variables configured on Vercel
- [ ] All environment variables configured on Railway
- [ ] API keys rotated if needed
- [ ] Secrets updated in deployment platforms

### 5. Third-Party Integrations ✅
- [ ] **Stripe:** Test mode disabled, live keys configured
- [ ] **Stripe Webhooks:** Endpoint registered and verified
- [ ] **Google Maps API:** Production quota sufficient
- [ ] **Gemini AI API:** Rate limits checked
- [ ] **Supabase:** Connection pool configured correctly

---

## Deployment Steps

### Step 1: Staging Deployment
1. **Deploy to Vercel Preview**
   ```bash
   git push origin feature/your-branch
   # Vercel automatically creates preview deployment
   ```

2. **Deploy to Railway Staging**
   ```bash
   cd backend
   railway up
   ```

3. **Run Full Test Suite on Staging**
   ```bash
   npm run test:e2e:staging
   ```

4. **Manual Smoke Test on Staging**
   - [ ] Test authentication (Google OAuth)
   - [ ] Test generation flow (Front Yard + Style)
   - [ ] Test credit deduction (3 → 2 → 1)
   - [ ] Test language switching (EN → ES → ZH)
   - [ ] Test holiday decorator

### Step 2: Production Deployment

1. **Merge to Main Branch**
   ```bash
   git checkout main
   git merge develop
   git push origin main
   ```

2. **Vercel Auto-Deploy** (Triggers automatically)
   - Monitor deployment logs: https://vercel.com/dashboard
   - Verify deployment success (✅ green checkmark)

3. **Railway Auto-Deploy** (Triggers automatically)
   - Monitor deployment logs: https://railway.app/project/[project-id]
   - Verify health check: `https://yarda-api-production.up.railway.app/health`

4. **Apply Database Migrations** (If Any)
   ```bash
   psql $DATABASE_URL -f supabase/migrations/XXX_migration.sql
   ```

5. **Verify Production Deployment**
   - [ ] Health check endpoint returns 200 OK
   - [ ] Frontend loads successfully
   - [ ] API responds to requests
   - [ ] Database connection working

### Step 3: Post-Deployment Verification

1. **Run Production Smoke Tests**
   ```bash
   npm run test:prod:smoke
   ```

2. **Manual Production Verification**
   - [ ] Homepage loads correctly
   - [ ] User can sign in with Google
   - [ ] Generation flow works end-to-end
   - [ ] Trial credits deduct correctly
   - [ ] Language switching works
   - [ ] Holiday decorator functional

3. **Monitor Application Logs**
   - [ ] Check Vercel logs for frontend errors
   - [ ] Check Railway logs for backend errors
   - [ ] Check Supabase logs for database issues
   - [ ] Check Stripe dashboard for webhook deliveries

---

## Post-Deployment Monitoring (First 24 Hours)

### Hour 1: Critical Monitoring
- [ ] Monitor error rates (target: < 1%)
- [ ] Monitor response times (target: < 500ms)
- [ ] Check webhook success rate (target: 100%)
- [ ] Verify trial credit deductions working

### Hour 6: Performance Check
- [ ] Review generation completion times
- [ ] Check database query performance
- [ ] Monitor API rate limits (Gemini, Google Maps)
- [ ] Review Stripe payment success rate

### Hour 24: Full System Health
- [ ] Review all error logs
- [ ] Check user feedback (if any)
- [ ] Verify all CUJs still working
- [ ] Plan hotfix if needed

---

## Rollback Plan

### Emergency Rollback (If Critical Issue Found)

1. **Revert Frontend (Vercel)**
   ```bash
   # Via Vercel Dashboard
   # 1. Go to Deployments
   # 2. Find last working deployment
   # 3. Click "Promote to Production"
   ```

2. **Revert Backend (Railway)**
   ```bash
   # Via Railway Dashboard
   # 1. Go to Deployments
   # 2. Find last working deployment
   # 3. Click "Redeploy"
   ```

3. **Rollback Database Migration** (If Applied)
   ```bash
   # Run rollback migration
   psql $DATABASE_URL -f supabase/migrations/XXX_rollback.sql
   ```

4. **Notify Users** (If Needed)
   - Post status update
   - Send email notification (if critical)
   - Update status page

---

## Success Criteria

### Deployment Considered Successful If:
✅ All automated tests passing (CI/CD green)
✅ All CUJs verified working in production
✅ Error rate < 1% after 1 hour
✅ Response time < 500ms (p95)
✅ No critical bugs reported by users
✅ Stripe webhooks delivering successfully (100%)
✅ Database migrations applied without issues

### Deployment Considered Failed If:
❌ Error rate > 5% after 15 minutes
❌ Any CUJ completely broken
❌ Database connection failures
❌ Stripe webhook failures > 10%
❌ Critical user-facing bug discovered

---

## CI/CD Pipeline Status

### Current Automation Coverage:
- ✅ **Automated E2E Tests** - 26 tests across 5 browsers
- ✅ **CUJ Automation** - 5/7 CUJs fully automated (81% pass rate)
- ✅ **GitHub Actions** - E2E tests run on every push
- ✅ **Auto-Deploy** - Vercel (frontend) + Railway (backend)
- ⏭️ **Stripe Tests** - Pending test mode configuration

### Manual Steps Still Required:
- ⚠️ Database migration application (manual psql command)
- ⚠️ Production smoke test (manual verification recommended)
- ⚠️ Stripe webhook verification (check dashboard)

---

## Emergency Contacts

**Development Team:**
- Lead Developer: [Your Name]
- Backend Lead: [Name]
- Frontend Lead: [Name]

**Service Providers:**
- Vercel Support: https://vercel.com/support
- Railway Support: https://railway.app/help
- Supabase Support: https://supabase.com/support
- Stripe Support: https://stripe.com/support

**On-Call Rotation:**
- Week of [Date]: [Name]
- Escalation: [Name]

---

**Template Version:** 1.0.0
**Last Deployment:** [Date]
**Next Review:** [Date + 1 month]
