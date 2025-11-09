# Deployment Checklist: Feature 004 - Generation Flow

**Feature:** Multi-area landscape generation with trial credit system
**Status:** Production Ready ✅
**Testing:** 11/11 tests passed (100%)
**Date Prepared:** 2025-11-06
**Target Branch:** `004-generation-flow` → `001-data-model` (main)

## Pre-Deployment Verification

### Code Quality
- [x] All E2E tests passing (11/11 tests passed)
- [x] No TypeScript errors in frontend
- [x] No Python type errors in backend
- [x] All debug logging removed or set to appropriate levels
- [x] Git branch is up to date with main branch

### Documentation
- [x] Migration file created: `supabase/migrations/014_add_subscription_columns.sql`
- [x] CLAUDE.md updated with schema changes
- [x] TEST_PLAN.md updated with test results
- [x] DEVELOPMENT_SETUP.md created for team

### Environment Variables

#### Production Frontend (Vercel)
- [ ] `NEXT_PUBLIC_API_URL` set to production Railway URL
- [ ] `NEXT_PUBLIC_SUPABASE_URL` verified
- [ ] `NEXT_PUBLIC_SUPABASE_ANON_KEY` verified
- [ ] `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` verified
- [ ] `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` verified
- [ ] `NEXT_PUBLIC_GOOGLE_CLIENT_ID` verified

#### Production Backend (Railway)
- [ ] `DATABASE_URL` points to production Supabase
- [ ] `STRIPE_SECRET_KEY` set (production or test)
- [ ] `STRIPE_WEBHOOK_SECRET` set
- [ ] `GEMINI_API_KEY` set
- [ ] `GOOGLE_MAPS_API_KEY` set
- [ ] `BLOB_READ_WRITE_TOKEN` set

## Deployment Steps

### Phase 1: Database Migration

**Estimated Time:** 5 minutes
**Risk Level:** Low (additive changes only)

1. **Backup Database** (Safety First!)
   ```bash
   # Via Supabase Dashboard
   # Project → Database → Backups → Create backup
   ```
   - [ ] Database backup created
   - [ ] Backup timestamp recorded: `________________`

2. **Apply Migration**

   **Option A: Via Supabase MCP**
   ```bash
   mcp__supabase__apply_migration \
     --project_id gxlmnjnjvlslijiowamn \
     --name "add_subscription_columns" \
     --query "$(cat supabase/migrations/014_add_subscription_columns.sql)"
   ```

   **Option B: Via psql**
   ```bash
   psql $DATABASE_URL -f supabase/migrations/014_add_subscription_columns.sql
   ```

3. **Verify Migration**
   ```sql
   -- Check columns exist
   SELECT column_name, data_type, is_nullable
   FROM information_schema.columns
   WHERE table_name = 'users'
     AND column_name IN ('stripe_subscription_id', 'current_period_end', 'cancel_at_period_end');

   -- Check indexes exist
   SELECT indexname, indexdef
   FROM pg_indexes
   WHERE tablename = 'users'
     AND indexname LIKE 'idx_users_%subscription%';
   ```

   - [ ] All 3 columns created successfully
   - [ ] Both indexes created successfully
   - [ ] Column comments added successfully

### Phase 2: Backend Deployment

**Estimated Time:** 10 minutes
**Risk Level:** Low (additive changes, backwards compatible)

1. **Pre-Deployment Health Check**
   ```bash
   curl https://yarda-api-production.up.railway.app/health
   # Expected: {"status": "healthy"}
   ```
   - [ ] Current production backend responding

2. **Merge to Main Branch**
   ```bash
   git checkout 001-data-model
   git pull origin 001-data-model
   git merge 004-generation-flow
   git push origin 001-data-model
   ```
   - [ ] Branch merged without conflicts
   - [ ] Changes pushed to main

3. **Monitor Railway Deployment**

   Railway will auto-deploy from main branch. Monitor:
   - [ ] Build starts (check Railway dashboard)
   - [ ] Build completes successfully
   - [ ] Deployment health check passes
   - [ ] No error logs in Railway console

4. **Post-Deployment Backend Verification**
   ```bash
   # Test payment-status endpoint (critical endpoint)
   curl -H "Authorization: Bearer <test-user-token>" \
        https://yarda-api-production.up.railway.app/v1/users/payment-status

   # Expected: JSON with trial_remaining, token_balance, etc.
   ```
   - [ ] `/v1/users/payment-status` endpoint working
   - [ ] No 500 errors in logs
   - [ ] Database queries executing successfully

### Phase 3: Frontend Deployment

**Estimated Time:** 5 minutes
**Risk Level:** Low (UI changes only)

1. **Verify Environment Variables**

   Via Vercel Dashboard or CLI:
   ```bash
   cd frontend
   vercel env ls
   ```
   - [ ] All required environment variables present
   - [ ] `NEXT_PUBLIC_API_URL` points to production Railway URL

2. **Deploy to Production**

   Vercel will auto-deploy from main branch:
   - [ ] Frontend build starts
   - [ ] Build completes without errors
   - [ ] Deployment URL generated

3. **Post-Deployment Frontend Verification**

   Open production URL in browser:
   - [ ] `/generate` page loads without errors
   - [ ] Google Maps integration working
   - [ ] Address autocomplete working
   - [ ] Area selection buttons clickable
   - [ ] Browser console shows no errors
   - [ ] API calls going to production backend (check Network tab)

## Post-Deployment Testing

### Smoke Tests (Critical Paths)

**User Flow 1: Trial Credit Generation**
1. [ ] Log in with Google OAuth
2. [ ] Navigate to `/generate`
3. [ ] Payment status shows trial credits
4. [ ] Fill address: "1600 Amphitheatre Parkway, Mountain View, CA"
5. [ ] Select "Front Yard" area
6. [ ] Click "Generate Design"
7. [ ] Redirects to `/generate/progress/[id]`
8. [ ] Trial credits decrement by 1
9. [ ] Progress page shows "pending" status

**User Flow 2: Trial Exhaustion**
1. [ ] Continue generating until `trial_remaining = 0`
2. [ ] "Trial exhausted" modal appears
3. [ ] Modal shows "Purchase Tokens" option
4. [ ] Clicking modal button redirects to `/purchase`

**User Flow 3: Token Purchase** (if Stripe configured)
1. [ ] Navigate to `/purchase`
2. [ ] Select token package
3. [ ] Complete Stripe checkout
4. [ ] Webhook receives payment confirmation
5. [ ] Token balance updates correctly
6. [ ] Can generate with tokens

### Performance Testing
- [ ] Page load time < 3 seconds
- [ ] API response time < 500ms
- [ ] Google Maps loads without delay
- [ ] No memory leaks in browser console

### Error Monitoring
- [ ] Check Vercel logs for frontend errors
- [ ] Check Railway logs for backend errors
- [ ] Check Supabase logs for database errors
- [ ] Set up alerts for critical errors (if not already configured)

## Rollback Plan

### If Critical Issues Detected

**Severity: High (P0) - Immediate Rollback**
- Database errors (e.g., column not found)
- Authentication failures
- Payment processing failures
- Complete feature breakdown

**Severity: Medium (P1) - Rollback within 1 hour**
- UI rendering issues
- Non-critical API errors
- Performance degradation

**Severity: Low (P2) - Fix forward**
- Minor UI glitches
- Non-critical console warnings
- Edge case bugs

### Rollback Procedure

#### Frontend Rollback (Vercel)
1. Go to Vercel Dashboard → Deployments
2. Find previous working deployment
3. Click "Promote to Production"
4. Verify rollback successful

#### Backend Rollback (Railway)
1. Go to Railway Dashboard → Deployments
2. Find previous working deployment
3. Click "Redeploy"
4. Verify rollback successful

#### Database Rollback (If Required)
```sql
-- Only if migration causes issues
ALTER TABLE users
DROP COLUMN IF EXISTS stripe_subscription_id,
DROP COLUMN IF EXISTS current_period_end,
DROP COLUMN IF EXISTS cancel_at_period_end;

DROP INDEX IF EXISTS idx_users_stripe_subscription_id;
DROP INDEX IF EXISTS idx_users_current_period_end;
```

**Note:** Database rollback should be last resort, as these columns are additive and don't affect existing functionality.

## Success Criteria

Feature 004 deployment is considered successful when:

- [x] All database migrations applied without errors
- [ ] Backend deployed and health check passing
- [ ] Frontend deployed and accessible
- [ ] All 3 smoke test flows working end-to-end
- [ ] No P0 or P1 errors in logs
- [ ] Trial credit system working atomically
- [ ] No CORS errors in production
- [ ] Performance metrics within acceptable range

## Post-Deployment Tasks

### Documentation
- [ ] Update production deployment record in CLAUDE.md
- [ ] Update feature status to "Deployed" in project tracker
- [ ] Document any deployment issues encountered

### Monitoring Setup
- [ ] Set up error alerts for critical endpoints
- [ ] Configure performance monitoring
- [ ] Set up Stripe webhook monitoring

### Team Communication
- [ ] Notify team of successful deployment
- [ ] Share production URL
- [ ] Document any known limitations or edge cases

## Emergency Contacts

- **Backend Issues:** Check Railway logs, Railway dashboard
- **Frontend Issues:** Check Vercel logs, Vercel dashboard
- **Database Issues:** Check Supabase logs, Supabase dashboard
- **Payment Issues:** Check Stripe dashboard, webhook logs

## Deployment Sign-Off

- **Prepared by:** Claude Code
- **Reviewed by:** `________________`
- **Approved by:** `________________`
- **Deployment Date:** `________________`
- **Deployment Time:** `________________`
- **Deployed by:** `________________`

## Notes

_Use this section to document any issues, workarounds, or observations during deployment:_

---

**Reference Documents:**
- Feature Specification: `docs/features/004-generation-flow-spec.md`
- Test Plan: [TEST_PLAN.md](./TEST_PLAN.md)
- Test Session Report: [TEST_SESSION_2025-11-06.md](./TEST_SESSION_2025-11-06.md)
- Architecture Guide: [CLAUDE.md](./CLAUDE.md)
- Development Setup: [DEVELOPMENT_SETUP.md](./DEVELOPMENT_SETUP.md)
