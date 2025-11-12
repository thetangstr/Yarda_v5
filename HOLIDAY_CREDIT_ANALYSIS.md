# Holiday Credit System Analysis & Issues

**Date:** 2025-11-11
**Status:** 🔴 Critical - Stale credit display causing user confusion

---

## Executive Summary

The holiday credit system has **stale credit display** issues. Users see incorrect credit balances in the UI because:
1. Credits are cached in localStorage and not synced with backend
2. Failed generations don't trigger credit refresh
3. No automatic credit sync on page load

**Impact:** Users see "1 credit" in UI but backend shows "0 credits", causing confusion when generation fails with "insufficient credits" error.

---

## Current Architecture (As Implemented)

### Backend Credit Logic ✅ SOLID

**Database Functions (Atomic Operations):**
```sql
-- File: supabase/migrations/014_holiday_decorator.sql

1. deduct_holiday_credit(user_id) - Lines 331-356
   - Uses FOR UPDATE NOWAIT (row-level locking)
   - Prevents race conditions
   - Prevents negative balance
   - Returns: {success: BOOLEAN, credits_remaining: INTEGER}

2. grant_holiday_credit(user_id, amount) - Lines 375-389
   - Grants credits with atomic increment
   - Updates holiday_credits_earned counter
   - Used for: social shares, refunds, admin grants

3. check_daily_share_limit(user_id, limit) - Lines 404-408
   - Max 3 shares per 24 hours
   - Returns: BOOLEAN

4. Signup Trigger: grant_initial_holiday_credit() - Lines 423-432
   - Grants 1 credit during holiday season (Nov 1 - Jan 1)
   - Runs BEFORE INSERT on users table
```

**Service Layer:**
```python
# File: backend/src/services/holiday_credit_service.py

class HolidayCreditService:
    async def deduct_credit(user_id) -> CreditDeductionResult
    async def grant_credit(user_id, amount, reason) -> int
    async def get_balance(user_id) -> HolidayCreditsResponse
    async def check_daily_share_limit(user_id, limit=3) -> bool
    async def has_sufficient_credits(user_id, required=1) -> bool
```

**API Endpoints:**
```python
# File: backend/src/api/endpoints/holiday.py

POST /holiday/generations - Deducts credit BEFORE generation
GET /holiday/credits - Returns current balance + earnings breakdown
```

### Frontend Credit Logic ❌ HAS ISSUES

**Current Implementation:**
```tsx
// File: frontend/src/pages/holiday.tsx

const [credits, setCredits] = useState<number>(user?.holiday_credits ?? 0);

// Sync from localStorage on mount
useEffect(() => {
  if (user?.holiday_credits !== undefined) {
    setCredits(user.holiday_credits);
  }
}, [user]);

// Update after successful generation
const response = await holidayAPI.createGeneration(...)
if (response.credits_remaining !== undefined) {
  setCredits(response.credits_remaining); // ❌ Only updates local state, not userStore
}
```

---

## Issues Found

### Issue 1: Stale Credit Display 🔴 CRITICAL

**Problem:**
- Frontend shows credits from localStorage (userStore)
- Backend has different credit balance
- No automatic sync on page load

**Example Scenario:**
```
1. User creates account → Backend grants 1 credit (Nov 11, 2025 is in holiday season)
2. User navigates to /holiday → Frontend shows 1 credit (from localStorage)
3. User clicks Generate → Backend checks database: 0 credits (old test account)
4. Backend returns 403 Forbidden: "Insufficient credits. Current balance: 0"
5. Frontend still shows 1 credit (stale localStorage data)
```

**Root Cause:**
Test account `test-holiday-manual@yarda.app` (ID: 4bcacbff-cef7-4150-a44e-812452772cbf) was created BEFORE migration 014 ran, so it has 0 credits in database but localStorage shows 1 credit.

**Evidence from Logs:**
```
Line 106: Credit deduction failed for user 4bcacbff-cef7-4150-a44e-812452772cbf: insufficient credits
Line 107: Generation creation failed for user 4bcacbff-cef7-4150-a44e-812452772cbf: Insufficient holiday credits. Current balance: 0
Line 109: INFO: 127.0.0.1:49581 - "POST /holiday/generations HTTP/1.1" 403 Forbidden
```

### Issue 2: No Credit Sync on Error ⚠️

**Problem:**
When generation fails with 403 Forbidden, the frontend doesn't fetch latest credits from backend.

**Current Behavior:**
```tsx
catch (error: any) {
  setGenerationError(error.response?.data?.detail?.message || '...');
  // ❌ No credit refresh here
}
```

**Expected Behavior:**
On 403 error, fetch latest credits from `/holiday/credits` endpoint and update both local state and userStore.

### Issue 3: No Periodic Credit Refresh ⚠️

**Problem:**
Credits are only synced:
1. On page load (from localStorage)
2. After successful generation (from API response)

**Missing:**
- Automatic refresh on page mount (fetch from backend)
- Periodic refresh while page is active (optional, but recommended)
- Refresh after failed generation attempts

---

## Comprehensive Fix Plan

### Fix 1: Add Credit Sync on Page Mount ✅

**File:** `frontend/src/pages/holiday.tsx`

```tsx
// Add at top level with other state
const [isLoadingCredits, setIsLoadingCredits] = useState(true);

// Fetch latest credits from backend on mount
useEffect(() => {
  const fetchCredits = async () => {
    if (!isAuthenticated) return;

    try {
      setIsLoadingCredits(true);
      const response = await holidayAPI.getCredits();
      setCredits(response.holiday_credits);

      // ✅ UPDATE USERSTORE TOO
      useUserStore.getState().setUser({
        ...user,
        holiday_credits: response.holiday_credits
      });
    } catch (error) {
      console.error('Failed to fetch credits:', error);
    } finally {
      setIsLoadingCredits(false);
    }
  };

  fetchCredits();
}, [isAuthenticated]);
```

### Fix 2: Add Credit Sync on 403 Error ✅

**File:** `frontend/src/pages/holiday.tsx`

```tsx
catch (error: any) {
  console.error('Generation failed:', error);

  // ✅ If 403, fetch latest credits to show accurate balance
  if (error.response?.status === 403) {
    try {
      const creditResponse = await holidayAPI.getCredits();
      setCredits(creditResponse.holiday_credits);

      // Update userStore
      useUserStore.getState().setUser({
        ...user,
        holiday_credits: creditResponse.holiday_credits
      });
    } catch (creditError) {
      console.error('Failed to fetch credits after 403:', creditError);
    }
  }

  setGenerationError(error.response?.data?.detail?.message || 'Generation failed...');
  setIsGenerating(false);
  setGenerationStatus(null);
}
```

### Fix 3: Add holidayAPI.getCredits() Method ✅

**File:** `frontend/src/lib/api.ts`

```tsx
export const holidayAPI = {
  // ... existing methods ...

  /**
   * Get user's holiday credit balance
   * GET /holiday/credits
   */
  getCredits: async (): Promise<HolidayCreditsResponse> => {
    const response = await apiClient.get('/holiday/credits');
    return response.data;
  },
};
```

### Fix 4: Update userStore When Credits Change ✅

**File:** `frontend/src/pages/holiday.tsx`

```tsx
// After successful generation
if (response.credits_remaining !== undefined) {
  setCredits(response.credits_remaining);

  // ✅ UPDATE USERSTORE
  useUserStore.getState().setUser({
    ...user,
    holiday_credits: response.credits_remaining
  });
}
```

### Fix 5: Grant Credits to Existing Test Accounts (One-Time Migration) ✅

**Run SQL on Supabase Dashboard:**
```sql
-- Grant 1 holiday credit to test accounts that have 0 credits
-- (Assuming they were created during holiday season)
UPDATE users
SET
  holiday_credits = 1,
  holiday_credits_earned = 1,
  updated_at = NOW()
WHERE
  email LIKE '%test%@yarda.app'
  AND holiday_credits = 0
  AND created_at >= '2024-11-01'  -- Created during holiday season
  AND created_at < '2025-01-02';

-- Verify
SELECT
  id,
  email,
  holiday_credits,
  holiday_credits_earned,
  created_at
FROM users
WHERE email LIKE '%test%@yarda.app';
```

---

## Testing Checklist

After implementing fixes:

- [ ] Test 1: Fresh page load fetches credits from backend
- [ ] Test 2: Credits display matches backend database value
- [ ] Test 3: Generation with 0 credits shows correct error message
- [ ] Test 4: After 403 error, credits are refreshed automatically
- [ ] Test 5: After successful generation, credits decrement correctly
- [ ] Test 6: userStore in localStorage stays in sync with backend
- [ ] Test 7: Reload page after generation shows updated credits
- [ ] Test 8: Multiple rapid generations don't cause race conditions (backend handles atomically)

---

## Question 3: Social Media Sharing Feature

**Status:** 🟡 NOT IMPLEMENTED YET

**Current State:**
- UI shows message: "Share your decorated home to earn more credits!"
- No actual sharing functionality exists
- Backend has `social_shares` table and credit grant logic ready
- Frontend has no share buttons or social SDK integration

**Required Implementation:**

### Backend (✅ Already Ready):
```python
# social_shares table exists in migration 014_holiday_decorator.sql
# Lines 109-123

# Grant credit function exists:
async def grant_credit(user_id, amount=1, reason="social_share")

# Daily limit check exists:
async def check_daily_share_limit(user_id, limit=3) -> bool
```

### Frontend (❌ Missing):

**Needed:**
1. Share buttons (Facebook, Twitter, Instagram, Copy Link)
2. Web Share API integration (for mobile)
3. API endpoint to record share and grant credit
4. Social platform SDK integration (optional)

**Recommended Implementation:**
```tsx
// File: frontend/src/components/SocialShareButtons.tsx (NEW)

import { useState } from 'react';
import { holidayAPI } from '@/lib/api';

export default function SocialShareButtons({
  imageUrl,
  generationId
}: {
  imageUrl: string;
  generationId: string;
}) {
  const [isSharing, setIsSharing] = useState(false);

  const shareUrl = `https://yarda.app/holiday/share/${generationId}`;
  const shareText = "Check out my AI-decorated home for the holidays! 🎄✨";

  const handleShare = async (platform: string) => {
    setIsSharing(true);

    try {
      // Record share in backend (grants credit if within daily limit)
      const result = await holidayAPI.recordShare(generationId, platform);

      if (result.credit_granted) {
        // Show toast: "Credit earned! X shares remaining today"
        alert(`Credit earned! ${result.shares_remaining_today} shares remaining today`);
      } else {
        // Show toast: "Share recorded! Daily limit reached (max 3/day)"
        alert('Share recorded! Daily limit reached (max 3/day)');
      }

      // Open share URL based on platform
      switch (platform) {
        case 'facebook':
          window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`);
          break;
        case 'twitter':
          window.open(`https://twitter.com/intent/tweet?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(shareText)}`);
          break;
        case 'copy':
          await navigator.clipboard.writeText(shareUrl);
          alert('Link copied!');
          break;
        case 'web-share':
          if (navigator.share) {
            await navigator.share({
              title: 'My Holiday Decorated Home',
              text: shareText,
              url: shareUrl
            });
          }
          break;
      }
    } catch (error) {
      console.error('Share failed:', error);
      alert('Failed to record share. Please try again.');
    } finally {
      setIsSharing(false);
    }
  };

  return (
    <div className="flex gap-3 justify-center">
      <button onClick={() => handleShare('facebook')} disabled={isSharing}>
        📘 Facebook
      </button>
      <button onClick={() => handleShare('twitter')} disabled={isSharing}>
        🐦 Twitter
      </button>
      <button onClick={() => handleShare('copy')} disabled={isSharing}>
        🔗 Copy Link
      </button>
      {navigator.share && (
        <button onClick={() => handleShare('web-share')} disabled={isSharing}>
          📤 Share
        </button>
      )}
    </div>
  );
}
```

**New API Endpoint Needed:**
```python
# File: backend/src/api/endpoints/holiday.py

@router.post("/share")
async def record_social_share(
    generation_id: UUID,
    platform: str,
    current_user: User = Depends(require_verified_email),
    credit_service: HolidayCreditService = Depends(get_credit_service)
):
    """
    Record social share and grant credit (max 3/day).

    Args:
        generation_id: Generation being shared
        platform: Social platform ('facebook', 'twitter', 'instagram', 'copy')
        current_user: Authenticated user
        credit_service: Holiday credit service

    Returns:
        Share result with credit_granted status
    """
    # Check daily limit
    can_share = await credit_service.check_daily_share_limit(current_user.id)

    # Record share in social_shares table
    await db_pool.execute(
        """
        INSERT INTO social_shares (user_id, generation_id, platform, credit_granted)
        VALUES ($1, $2, $3, $4)
        """,
        current_user.id,
        generation_id,
        platform,
        can_share  # Only grant credit if within daily limit
    )

    # Grant credit if within limit
    if can_share:
        await credit_service.grant_credit(
            current_user.id,
            amount=1,
            reason="social_share"
        )

    # Get remaining shares for today
    shares_remaining = await credit_service.get_daily_shares_remaining(current_user.id)

    return {
        "success": True,
        "credit_granted": can_share,
        "shares_remaining_today": shares_remaining
    }
```

---

## Priority Implementation Order

1. **HIGH PRIORITY** - Fix stale credit display (Fixes 1-4)
2. **HIGH PRIORITY** - Grant credits to existing test accounts (Fix 5)
3. **MEDIUM PRIORITY** - Implement social sharing feature
4. **LOW PRIORITY** - Add periodic credit refresh (optional)

---

## Security Considerations

✅ **Already Implemented:**
- Atomic credit deduction (prevents race conditions)
- Row-level locking (FOR UPDATE NOWAIT)
- Daily share limit (max 3/day)
- Credit validation before generation
- No negative balance possible

⚠️ **Additional Security Needed for Social Sharing:**
- Rate limiting on share endpoint (prevent spam)
- Verify generation belongs to user before allowing share
- Track platform to prevent duplicate shares
- Consider adding CAPTCHA for share verification (prevents bot abuse)

---

## Performance Considerations

**Current Performance:**
- Atomic functions are fast (~5ms)
- Geocoding adds ~100ms per preview request (acceptable)
- Credit checks are lightweight (single row query)

**Optimization Opportunities:**
- Cache credit balance in Redis (60-second TTL) to reduce DB queries
- Batch credit refreshes if multiple users on same page
- Consider WebSocket for real-time credit updates (overkill for MVP)

---

## Conclusion

**Backend credit logic is solid ✅** - Atomic operations, proper locking, no race conditions.

**Frontend credit sync needs fixes ❌** - Stale localStorage data, no error handling, no periodic refresh.

**Social sharing not implemented yet 🟡** - Backend ready, frontend missing.

**Recommended Action:**
1. Implement Fixes 1-5 immediately (15-30 minutes)
2. Test with fresh account + existing account
3. Implement social sharing feature (2-3 hours)
4. Deploy and monitor

