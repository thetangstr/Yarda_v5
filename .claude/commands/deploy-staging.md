---
description: Deploy the current branch to staging environment and run validation tests (deprecated - use /test-smart instead)
---

# Deploy to Staging

Deploy the current branch to staging environment and run validation tests.

**Workflow:**
1. Run all local tests first (must pass 100%)
2. Deploy frontend to Vercel Preview
3. Deploy backend to Railway Staging
4. Run database migrations (if any)
5. Execute staging E2E test suite
6. Report deployment status

**Agent:** `full-stack-orchestration:deployment-engineer`

**Environments:**
- Frontend: Vercel Preview URL
- Backend: Railway Staging (staging environment)
- Database: Supabase (staging branch)

**Validation:**
- All E2E tests pass in staging
- Performance metrics within SLA
- No console errors
- Health checks passing

**On success:** Ask user if ready to promote to production
**On failure:** Launch debugging agent to fix issues