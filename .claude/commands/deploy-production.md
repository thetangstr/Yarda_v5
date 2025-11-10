---
description: Promote staging to production after all validations pass (deprecated - use /test-smart instead)
---

# Deploy to Production

Promote staging to production after all validations pass.

**Prerequisites (MUST be complete):**
- ✅ All staging tests passed (100%)
- ✅ User explicitly approved deployment
- ✅ No console errors in staging
- ✅ Performance metrics within SLA

**Workflow:**
1. Confirm user approval
2. Merge feature branch to main
3. Deploy frontend to Vercel Production
4. Deploy backend to Railway Production
5. Run production smoke tests (@smoke tagged)
6. Monitor error rates for 15 minutes
7. Report success or rollback if issues detected

**Agent:** `full-stack-orchestration:deployment-engineer`

**Rollback triggers:**
- Any smoke test fails
- Error rate > 1%
- Performance degradation > 20%
- Health check failures

**Monitoring:**
- Error tracking
- Performance metrics
- User feedback
- Server health

**On success:** Update CLAUDE.md with deployment details
**On failure:** Automatic rollback + incident report