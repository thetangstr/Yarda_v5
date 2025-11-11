# Holiday Decorator - Test Failure Fix Guide

## Quick Reference

| Issue | File | Fix | Time |
|-------|------|-----|------|
| Credit display shows 0 | Backend missing | Create `/v1/holiday/credits` endpoint | 30 min |
| Street View shows emoji | StreetViewRotator.tsx | Render `<img>` tag with Street View | 1-2 hrs |
| localStorage key wrong | holiday-discovery.spec.ts | Change `user-store` → `user-storage` | 5 min |

---

## Fix #1: Missing Backend Endpoint (CRITICAL)

### Problem
Test expects credit balance of 1, but gets 0 because the backend endpoint doesn't exist.

### Error Details
```
Expected: "1"
Received: "🎁Holiday Credits0"
```

### Files Involved
- **Frontend:** `frontend/src/pages/holiday.tsx` (lines 67-77)
  ```typescript
  const fetchCredits = async () => {
    const response = await holidayAPI.getCredits();  // Calls API
    setCredits(response.holiday_credits);             // This never happens!
  };
  ```

- **API Client:** `frontend/src/lib/api.ts` (lines 544-546)
  ```typescript
  getCredits: async (): Promise<HolidayCreditsResponse> => {
    const response = await apiClient.get('/holiday/credits');  // 404 NOT FOUND
    return response.data;
  }
  ```

- **Backend:** `backend/src/api/endpoints/holiday_credits.py` (MISSING)

### Solution

#### Step 1: Create Database Migration

**File:** `supabase/migrations/014_add_holiday_credits.sql`

```sql
-- Add holiday credits columns to users table
ALTER TABLE users
ADD COLUMN IF NOT EXISTS holiday_credits INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS holiday_credits_earned INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS holiday_credits_used INTEGER DEFAULT 0;

-- Create audit table for holiday credit transactions
CREATE TABLE IF NOT EXISTS holiday_credit_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  amount INTEGER NOT NULL,  -- Positive for earned, negative for used
  transaction_type TEXT NOT NULL, -- 'earned_signup', 'earned_share', 'used_generation', etc.
  related_id TEXT,  -- ID of generation, share, etc.
  balance_after INTEGER NOT NULL,  -- Balance after this transaction
  created_at TIMESTAMP DEFAULT NOW(),

  INDEX (user_id),
  INDEX (created_at DESC)
);

-- Create RLS policy for audit table
ALTER TABLE holiday_credit_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own credit transactions"
ON holiday_credit_transactions
FOR SELECT
USING (auth.uid() = user_id);
```

#### Step 2: Create Backend Endpoint

**File:** `backend/src/api/endpoints/holiday_credits.py` (NEW)

```python
"""
Holiday Credits API Endpoints

Manages user holiday credit balance for the holiday decorator feature.
"""

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from decimal import Decimal

from src.db.connection_pool import Database
from src.services.auth_service import get_current_user

router = APIRouter(prefix="/v1/holiday", tags=["holiday"])


# ============================================================================
# Models
# ============================================================================

class HolidayCreditsResponse(BaseModel):
    """User's holiday credit balance and earnings breakdown"""
    holiday_credits: int
    holiday_credits_earned: int
    holiday_credits_used: int


# ============================================================================
# Endpoints
# ============================================================================

@router.get("/credits", response_model=HolidayCreditsResponse)
async def get_holiday_credits(
    user_id: str = Depends(get_current_user),
    db: Database = Depends()
) -> HolidayCreditsResponse:
    """
    Get user's holiday credit balance

    Returns:
        HolidayCreditsResponse: Current credit balance and breakdown

    Raises:
        HTTPException: 404 if user not found
    """
    # Query user credits
    user = await db.fetchrow(
        """
        SELECT
            holiday_credits,
            holiday_credits_earned,
            holiday_credits_used
        FROM users
        WHERE id = $1
        """,
        user_id
    )

    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )

    return HolidayCreditsResponse(
        holiday_credits=user['holiday_credits'] or 0,
        holiday_credits_earned=user['holiday_credits_earned'] or 0,
        holiday_credits_used=user['holiday_credits_used'] or 0
    )
```

#### Step 3: Register Router in Backend

**File:** `backend/src/main.py` (ADD this line)

```python
# Add to imports section
from src.api.endpoints import holiday_credits

# Add to app configuration (around line where other routers are included)
app.include_router(holiday_credits.router)
```

#### Verification

After implementing, test:
```bash
# 1. Apply migration
psql $DATABASE_URL -f supabase/migrations/014_add_holiday_credits.sql

# 2. Run backend
cd backend && python -m uvicorn src.main:app --reload --port 8000

# 3. Test endpoint with curl
curl -H "Authorization: Bearer YOUR_TOKEN" \
  http://localhost:8000/v1/holiday/credits

# Expected response:
# {
#   "holiday_credits": 1,
#   "holiday_credits_earned": 1,
#   "holiday_credits_used": 0
# }
```

---

## Fix #2: Street View Image Not Rendering (CRITICAL)

### Problem
Component renders emoji "🏠" instead of actual Street View image. Test expects `<img>` tag.

### Error Details
```
Error: element(s) not found
Locator: locator('[data-testid="street-view-rotator"]').locator('img')
```

### Root Cause
Component has TODO comment at line 49:
```typescript
// TODO: Replace with actual Google Street View API call
```

Currently renders placeholder div instead of `<img>` tag.

### Solution: Implement Street View API

#### Step 1: Create Backend Endpoint

**File:** `backend/src/api/endpoints/street_view.py` (NEW)

```python
"""
Street View Preview API

Fetches Google Street View preview images for user-specified locations and headings.
"""

from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel

import httpx

router = APIRouter(prefix="/v1/holiday", tags=["holiday"])

GOOGLE_MAPS_API_KEY = os.getenv("GOOGLE_MAPS_API_KEY")


class StreetViewPreviewRequest(BaseModel):
    address: str
    heading: int  # 0-359 degrees
    pitch: int = 0  # -90 to 90 degrees


class StreetViewPreviewResponse(BaseModel):
    image_url: str
    heading: int
    pitch: int


@router.post("/street-view/preview", response_model=StreetViewPreviewResponse)
async def get_street_view_preview(
    request: StreetViewPreviewRequest
) -> StreetViewPreviewResponse:
    """
    Get Street View preview image for specified location and heading

    Args:
        request: Address, heading (0-359), pitch (-90 to 90)

    Returns:
        StreetViewPreviewResponse: URL to Street View image

    Raises:
        HTTPException: 400 if address geocoding fails
    """

    # First: Geocode address to get lat/lng
    geocoding_url = "https://maps.googleapis.com/maps/api/geocode/json"
    geocoding_params = {
        "address": request.address,
        "key": GOOGLE_MAPS_API_KEY
    }

    async with httpx.AsyncClient() as client:
        # Geocode the address
        response = await client.get(geocoding_url, params=geocoding_params)
        geocoding_data = response.json()

        if not geocoding_data.get("results"):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Could not find address: {request.address}"
            )

        location = geocoding_data["results"][0]["geometry"]["location"]
        latitude = location["lat"]
        longitude = location["lng"]

        # Second: Get Street View image URL
        street_view_url = "https://maps.googleapis.com/maps/api/streetview"
        street_view_params = {
            "size": "600x400",
            "location": f"{latitude},{longitude}",
            "heading": request.heading,
            "pitch": request.pitch,
            "key": GOOGLE_MAPS_API_KEY
        }

        # Return signed URL (no need to fetch image, just return URL)
        image_url = f"{street_view_url}?" + "&".join(
            f"{k}={v}" for k, v in street_view_params.items()
        )

        return StreetViewPreviewResponse(
            image_url=image_url,
            heading=request.heading,
            pitch=request.pitch
        )
```

#### Step 2: Update Frontend Component

**File:** `frontend/src/components/StreetViewRotator.tsx`

Replace lines 49-62 with:

```typescript
// Fetch Street View preview when heading changes
useEffect(() => {
  if (!address) return;

  const fetchPreview = async () => {
    setIsLoading(true);
    setError(null);

    try {
      // Call backend to get Street View image
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/v1/holiday/street-view/preview`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('user-storage')?.split('"accessToken":"')[1]?.split('"')[0] || ''}`,
          },
          body: JSON.stringify({
            address,
            heading,
            pitch: 0,
          }),
        }
      );

      if (!response.ok) {
        throw new Error('Failed to fetch Street View');
      }

      const data = await response.json();
      setPreviewUrl(data.image_url);
    } catch (err: any) {
      console.error('Street View preview error:', err);
      setError('Failed to load Street View preview');
    } finally {
      setIsLoading(false);
    }
  };

  fetchPreview();
}, [address, heading]);
```

Replace lines 134-146 with:

```typescript
{/* Preview Image */}
{previewUrl && !error && (
  <div className="relative w-full h-full">
    <img
      src={previewUrl}
      alt="Street View Preview"
      className="w-full h-full object-cover"
      onError={() => setError('Failed to load image')}
    />
  </div>
)}
```

#### Step 3: Update Frontend API Client

**File:** `frontend/src/lib/api.ts`

Add to `holidayAPI` object (around line 545):

```typescript
/**
 * Get Street View preview image
 * POST /v1/holiday/street-view/preview
 */
getStreetViewPreview: async (
  address: string,
  heading: number
): Promise<{ image_url: string; heading: number; pitch: number }> => {
  const response = await apiClient.post('/holiday/street-view/preview', {
    address,
    heading,
    pitch: 0,
  });
  return response.data;
},
```

### Verification

After implementing:
```bash
# 1. Backend should be running
# 2. Frontend should load Street View images
# 3. Test should pass:
cd frontend && npx playwright test tests/e2e/holiday-discovery.spec.ts \
  -g "should complete full generation flow"
```

---

## Fix #3: localStorage Key Mismatch (MINOR)

### Problem
Test setup uses `user-store` but API client expects `user-storage`.

### Error Details
localStorage key mismatch prevents authentication token from being injected.

### Solution

**File:** `frontend/tests/e2e/holiday-discovery.spec.ts` (line 51)

Change:
```typescript
localStorage.setItem('user-store', JSON.stringify({
```

To:
```typescript
localStorage.setItem('user-storage', JSON.stringify({
```

This makes the test consistent with the API client expectation.

---

## Testing Plan

### 1. Apply Database Migration
```bash
psql $DATABASE_URL -f supabase/migrations/014_add_holiday_credits.sql
```

### 2. Run Backend with New Endpoints
```bash
cd backend
source venv/bin/activate  # IMPORTANT!
python -m uvicorn src.main:app --reload --port 8000
```

### 3. Run Frontend Dev Server
```bash
cd frontend
npm run dev  # Port 3003 or 3000 depending on config
```

### 4. Run E2E Tests
```bash
cd frontend
npx playwright test tests/e2e/holiday-discovery.spec.ts --project=chromium --reporter=list
```

### Expected Results
```
Running 6 tests using 6 workers

  ✓  1 [chromium] › ... should show holiday hero on homepage during season (1.4s)
  ✓  2 [chromium] › ... should navigate to holiday page when CTA clicked (1.7s)
  ✓  3 [chromium] › ... should prevent generation when user has 0 credits (3.5s)
  ✓  4 [chromium] › ... should render holiday page with all components (7.0s)  ← FIXED
  ✓  5 [chromium] › ... should complete full generation flow... (8.6s)         ← FIXED
  ✓  6 [chromium] › ... meta-test: verify holiday page implementation exists (1.5s)

  6 passed (9.9s)
```

---

## Common Issues During Implementation

### Issue: Backend venv not activated
**Symptom:** `ModuleNotFoundError: No module named 'stripe'`
**Solution:**
```bash
cd backend
source venv/bin/activate  # macOS/Linux
# or: venv\Scripts\activate  # Windows
```

### Issue: CORS errors from frontend
**Symptom:** "Access to XMLHttpRequest blocked by CORS policy"
**Solution:** Ensure backend CORS middleware is configured in `src/main.py`:
```python
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3003", "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

### Issue: Google Maps API key invalid
**Symptom:** Geocoding fails with "API key not valid"
**Solution:**
1. Get valid API key from Google Cloud Console
2. Enable Street View API
3. Set environment variable:
   ```bash
   export GOOGLE_MAPS_API_KEY="your-key-here"
   ```

### Issue: Tests still failing after fixes
**Solution:**
1. Verify all files were modified correctly
2. Check backend is running: `curl http://localhost:8000/health`
3. Check frontend can reach API: Check browser console for network errors
4. Run tests with --headed flag for debugging:
   ```bash
   npx playwright test --headed
   ```

---

## Summary

| Fix | File | Lines | Status |
|-----|------|-------|--------|
| #1: Backend endpoint | `backend/src/api/endpoints/holiday_credits.py` | NEW | ✅ Required |
| #1: Database migration | `supabase/migrations/014_add_holiday_credits.sql` | NEW | ✅ Required |
| #1: Register router | `backend/src/main.py` | +1 line | ✅ Required |
| #2: Street View backend | `backend/src/api/endpoints/street_view.py` | NEW | ✅ Required |
| #2: Update component | `frontend/src/components/StreetViewRotator.tsx` | 49-146 | ✅ Required |
| #2: API client | `frontend/src/lib/api.ts` | +8 lines | ✅ Required |
| #3: Fix test key | `frontend/tests/e2e/holiday-discovery.spec.ts` | 51 | ✅ Required |

**Estimated Total Time:** 2-2.5 hours (30 min + 90 min + 5 min)

Once all fixes are applied, all 6 tests should pass and the Holiday Decorator feature will be ready for production deployment.
