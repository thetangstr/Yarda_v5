# Full-Stack Deployment Command

Deploy the entire Yarda AI stack (Railway backend + Vercel frontend + Supabase migrations) with automatic error detection, fixing, and retry until complete.

## What This Command Does

1. **Deploy Backend to Railway** (staging + production)
   - Fix any Railway configuration issues
   - Deploy to staging first
   - Test staging endpoints
   - Deploy to production after validation
   - Auto-retry on failures

2. **Deploy Frontend to Vercel** (preview + production)
   - Build and deploy to Vercel
   - Test preview deployment
   - Promote to production after validation
   - Auto-fix build errors

3. **Run Supabase Migrations**
   - Apply pending database migrations
   - Verify schema changes
   - Test database connectivity

4. **End-to-End Verification**
   - Test critical endpoints
   - Verify OAuth flow works
   - Check database connectivity
   - Validate all integrations

5. **Auto-Healing**
   - Detect deployment failures
   - Analyze error logs
   - Apply fixes automatically
   - Retry until success

## Agent Task

Use the `full-stack-orchestration:deployment-engineer` agent to:

1. Check current deployment status across all platforms
2. Deploy to Railway staging environment
3. Run automated tests on staging
4. Fix any issues found
5. Deploy to Railway production
6. Deploy frontend to Vercel
7. Run database migrations
8. Verify all services are healthy
9. Test critical user journeys
10. Provide comprehensive deployment report

## Success Criteria

- ✅ Railway backend deployed to both staging and production
- ✅ Vercel frontend deployed and accessible
- ✅ All database migrations applied successfully
- ✅ Critical endpoints responding correctly (not 404)
- ✅ OAuth flow working end-to-end
- ✅ No console errors on frontend
- ✅ All health checks passing

## Error Handling

If any step fails:
1. Capture detailed error logs
2. Analyze root cause
3. Apply automatic fix
4. Retry deployment
5. Escalate if fix unsuccessful after 3 attempts

Keep retrying with fixes until ALL deployment criteria are met.
