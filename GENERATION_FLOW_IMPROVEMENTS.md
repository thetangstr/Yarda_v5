# Generation Flow Improvements

**Date**: 2025-11-07
**Session**: Console error fixes + New UX requirements
**Branch**: 004-generation-flow

## Executive Summary

User requested two critical UX improvements and identified console errors:

1. **Deferred Credit Deduction**: Only deduct credits AFTER user successfully views generated image
2. **Progress Thumbnails**: Display source images (Street View/Satellite) during generation
3. **Image Retention Policy**: 90-day retention for non-trial generated images with user notification

Additionally, fixing frontend live updates issue where progress page shows "pending 0%" despite backend completion.

## Current Issues

### 1. Frontend Live Updates Not Refreshing
**Symptom**: Progress page shows "pending 0%" even after generation completes
**Backend**: Verified working - generation completes successfully
**Database**: status=completed, progress=100%, has image_url
**Root Cause**: Unknown - needs frontend debugging

### 2. Style Button Disabled After Area Selection
**Symptom**: Cannot click "Modern Minimalist" after selecting "Back Yard"
**Impact**: Prevents form completion
**Location**: [GenerationFormEnhanced.tsx](frontend/src/components/generation/GenerationFormEnhanced.tsx)

### 3. Console Warnings (Low Priority)
- Google Maps Autocomplete deprecation warnings (not blocking)
- Missing favicon (not blocking)
- Google Sign-In warnings (not blocking)

## New Requirements

### Requirement 1: Deferred Credit Deduction ⚠️ HIGH PRIORITY

**Current Behavior**:
```
User submits form → Credits deducted → Generation starts → Image generated
```

**New Behavior**:
```
User submits form → Reserve generation → Generation starts → Image generated → User views image → Credits deducted
```

**Implementation Plan**:

1. **Backend Changes** ([backend/src/api/endpoints/generations.py](backend/src/api/endpoints/generations.py))
   - Add `payment_status` field to `generations` table: `{reserved, deducted, refunded}`
   - Modify `create_multi_area_generation()`:
     - Mark payment as "reserved" instead of deducting
     - Store reservation details in `payment_reservation` table
   - Create new endpoint: `POST /generations/{id}/confirm-view`
     - Called when frontend successfully displays image
     - Deducts credits at that point
     - Marks payment_status as "deducted"

2. **Database Migration**:
```sql
-- Add payment_status to track deduction lifecycle
ALTER TABLE generations ADD COLUMN payment_status TEXT DEFAULT 'reserved';
ALTER TABLE generations ADD COLUMN payment_reserved_at TIMESTAMPTZ;
ALTER TABLE generations ADD COLUMN payment_deducted_at TIMESTAMPTZ;

-- Create payment reservations table
CREATE TABLE payment_reservations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    generation_id UUID NOT NULL REFERENCES generations(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id),
    payment_method TEXT NOT NULL, -- 'trial', 'token', 'subscription'
    amount INTEGER NOT NULL, -- Number of credits/tokens reserved
    status TEXT NOT NULL DEFAULT 'reserved', -- 'reserved', 'deducted', 'refunded', 'expired'
    reserved_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMPTZ NOT NULL, -- 24 hours from reservation
    deducted_at TIMESTAMPTZ,
    refunded_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_payment_reservations_user ON payment_reservations(user_id);
CREATE INDEX idx_payment_reservations_generation ON payment_reservations(generation_id);
CREATE INDEX idx_payment_reservations_status ON payment_reservations(status);
```

3. **Frontend Changes**:
   - Modify [useGenerationProgress.ts](frontend/src/hooks/useGenerationProgress.ts):
     - When status becomes "completed", call `POST /generations/{id}/confirm-view`
     - Show toast notification: "Image generated! Credits deducted successfully."
   - Update [GenerationProgress.tsx](frontend/src/components/generation/GenerationProgress.tsx):
     - Display "Reserving credits..." during generation
     - Display "Credits deducted!" when image is viewed

4. **Reservation Expiry Cron Job**:
   - Background job runs every hour
   - Finds `payment_reservations` where `status='reserved'` and `expires_at < NOW()`
   - Refunds expired reservations
   - Updates generation status to "expired"

**Benefits**:
- Users only pay for successful generations they can actually see
- Builds trust by showing we only charge for delivered value
- Automatic refund for backend failures

**Edge Cases**:
- User closes browser before viewing: Reservation expires in 24h, automatic refund
- Backend failure: No deduction, reservation expired automatically
- Multiple tabs viewing same generation: Deduct only once (idempotency check)

---

### Requirement 2: Progress Thumbnails 🎨 MEDIUM PRIORITY

**Goal**: Show users the source imagery (Street View/Satellite) while generation is in progress.

**Implementation Plan**:

1. **Backend Changes** ([backend/src/api/endpoints/generations.py](backend/src/api/endpoints/generations.py)):
   - Store Street View and Satellite URLs in `generation_source_images` table
   - Include in `MultiAreaGenerationResponse`:
```python
class AreaSourceImages(BaseModel):
    street_view_url: Optional[str] = None
    satellite_url: Optional[str] = None

class AreaStatusResponse(BaseModel):
    # ... existing fields ...
    source_images: Optional[AreaSourceImages] = None
```

2. **Frontend Changes** ([GenerationProgress.tsx](frontend/src/components/generation/GenerationProgress.tsx)):
   - Add thumbnail display to area cards:
```tsx
{/* Source Image Thumbnail (While Processing) */}
{(area.status === 'pending' || area.status === 'processing') && area.source_images && (
  <div className="mt-3">
    <p className="text-xs text-neutral-600 mb-2">Source Image:</p>
    <img
      src={
        area.area_type === 'frontyard'
          ? area.source_images.street_view_url
          : area.source_images.satellite_url
      }
      alt="Source imagery"
      className="w-full h-32 object-cover rounded-lg border border-neutral-300"
    />
  </div>
)}
```

**Logic**:
- **Frontyard**: Show Street View (eye-level perspective)
- **Backyard/Walkway**: Show Satellite (overhead view)

**Benefits**:
- Users see immediate visual feedback
- Confirms correct property is being processed
- Reduces perceived wait time

---

### Requirement 3: 90-Day Retention Policy 📅 MEDIUM PRIORITY

**Goal**: Retain non-trial generated images for 90 days and notify users.

**Implementation Plan**:

1. **Database Migration**:
```sql
-- Add retention tracking to generations
ALTER TABLE generations ADD COLUMN image_expires_at TIMESTAMPTZ;
ALTER TABLE generations ADD COLUMN retention_notified BOOLEAN DEFAULT FALSE;

-- Set expiry for existing non-trial generations
UPDATE generations
SET image_expires_at = created_at + INTERVAL '90 days'
WHERE payment_type != 'trial' AND status = 'completed';
```

2. **Backend Changes**:
   - Update `create_multi_area_generation()`:
```python
# Set expiry date for non-trial generations
if payment_method != 'trial':
    image_expires_at = datetime.utcnow() + timedelta(days=90)
    await db_pool.execute("""
        UPDATE generations
        SET image_expires_at = $1
        WHERE id = $2
    """, image_expires_at, generation_id)
```

3. **Retention Cron Job** ([backend/src/services/retention_service.py](backend/src/services/retention_service.py)):
```python
async def notify_expiring_images():
    """
    Notify users 7 days before image expiration.
    Runs daily via cron job.
    """
    # Find generations expiring in 7 days
    expiring = await db_pool.fetch("""
        SELECT g.id, g.user_id, u.email, g.address, g.created_at
        FROM generations g
        JOIN users u ON g.user_id = u.id
        WHERE g.image_expires_at BETWEEN NOW() AND NOW() + INTERVAL '7 days'
          AND g.retention_notified = FALSE
          AND g.payment_type != 'trial'
    """)

    for record in expiring:
        # Send email notification
        await send_email(
            to=record['email'],
            subject="Your Yarda designs will expire soon",
            body=f"Your landscape design for {record['address']} will be deleted on {record['expires_at'].strftime('%B %d, %Y')}. Download it now!"
        )

        # Mark as notified
        await db_pool.execute("""
            UPDATE generations
            SET retention_notified = TRUE
            WHERE id = $1
        """, record['id'])

async def delete_expired_images():
    """
    Delete images that have passed retention period.
    Runs daily via cron job.
    """
    expired = await db_pool.fetch("""
        SELECT id, image_urls
        FROM generations
        WHERE image_expires_at < NOW()
          AND status = 'completed'
          AND payment_type != 'trial'
    """)

    for record in expired:
        # Delete from Vercel Blob storage
        for image_url in record['image_urls']:
            await delete_blob(image_url)

        # Clear image_urls in database
        await db_pool.execute("""
            UPDATE generations
            SET image_urls = '[]'::jsonb,
                status = 'expired'
            WHERE id = $1
        """, record['id'])
```

4. **Frontend Notification** ([GenerationProgress.tsx](frontend/src/components/generation/GenerationProgress.tsx)):
```tsx
{/* Retention Notice for Non-Trial Generations */}
{generation.payment_type !== 'trial' && generation.image_expires_at && (
  <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
    <p className="text-xs text-blue-800">
      📅 <strong>Retention Policy:</strong> Your generated images will be available for 90 days
      (until {new Date(generation.image_expires_at).toLocaleDateString()}).
      Download them if you want to keep them longer!
    </p>
  </div>
)}
```

**Benefits**:
- Clear user expectations about data retention
- Reduces storage costs for old images
- Encourages users to download and save their designs

---

## Implementation Priority

### Phase 1: Critical Fixes (Day 1)
1. Fix frontend live updates (progress page not refreshing)
2. Fix style button disabled issue

### Phase 2: Deferred Credit Deduction (Day 2-3)
1. Database migration for payment_reservations
2. Backend: Reserve credits instead of deducting
3. Backend: Add confirm-view endpoint
4. Frontend: Call confirm-view when image displays
5. Cron job: Handle expired reservations

### Phase 3: Progress Thumbnails (Day 4)
1. Backend: Add source_images to API response
2. Frontend: Display thumbnails during progress

### Phase 4: Retention Policy (Day 5)
1. Database migration for retention tracking
2. Backend: Retention cron jobs (notify + delete)
3. Frontend: Display retention notice
4. Email templates for expiry notifications

## Testing Strategy

### Unit Tests
- [ ] Payment reservation creation
- [ ] Credit deduction on confirm-view
- [ ] Reservation expiry logic
- [ ] Image deletion after 90 days

### E2E Tests
- [ ] Full generation flow with deferred deduction
- [ ] Thumbnail display during progress
- [ ] Retention notice display
- [ ] Multi-tab idempotency (deduct only once)

### Manual Testing
- [ ] Submit generation → close browser → reopen → verify reservation expires
- [ ] Complete generation → view image → verify credit deducted
- [ ] Check source thumbnails display correctly for frontyard vs backyard

---

## API Changes Summary

### New Endpoints

**POST /generations/{id}/confirm-view**
```json
// Request: (empty body)
// Response:
{
  "success": true,
  "payment_deducted": true,
  "payment_method": "trial",
  "balance_remaining": 2
}
```

### Modified Responses

**GET /generations/{id}** (add source_images)
```json
{
  "areas": [
    {
      "id": "uuid",
      "area": "frontyard",
      "status": "processing",
      "source_images": {
        "street_view_url": "https://...",
        "satellite_url": "https://..."
      }
    }
  ]
}
```

**POST /generations/multi** (add payment_status)
```json
{
  "generation_id": "uuid",
  "status": "pending",
  "payment_status": "reserved",  // NEW
  "payment_reserved_at": "2025-11-07T08:00:00Z"  // NEW
}
```

---

## Database Schema Changes

```sql
-- migrations/015_deferred_payment.sql
ALTER TABLE generations ADD COLUMN payment_status TEXT DEFAULT 'reserved';
ALTER TABLE generations ADD COLUMN payment_reserved_at TIMESTAMPTZ;
ALTER TABLE generations ADD COLUMN payment_deducted_at TIMESTAMPTZ;
ALTER TABLE generations ADD COLUMN image_expires_at TIMESTAMPTZ;
ALTER TABLE generations ADD COLUMN retention_notified BOOLEAN DEFAULT FALSE;

CREATE TABLE payment_reservations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    generation_id UUID NOT NULL REFERENCES generations(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id),
    payment_method TEXT NOT NULL,
    amount INTEGER NOT NULL,
    status TEXT NOT NULL DEFAULT 'reserved',
    reserved_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMPTZ NOT NULL,
    deducted_at TIMESTAMPTZ,
    refunded_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_payment_reservations_user ON payment_reservations(user_id);
CREATE INDEX idx_payment_reservations_generation ON payment_reservations(generation_id);
CREATE INDEX idx_payment_reservations_status ON payment_reservations(status);
CREATE INDEX idx_payment_reservations_expires ON payment_reservations(expires_at) WHERE status = 'reserved';
```

---

## Related Documentation

- [IMAGE_GENERATION_BACKGROUND_TASK_FIX.md](IMAGE_GENERATION_BACKGROUND_TASK_FIX.md) - Previous fix for background task execution
- [TEST_PLAN.md](TEST_PLAN.md) - CUJ-7: Generation Flow UI Components
- [CLAUDE.md](CLAUDE.md) - Project architecture and patterns

---

**Status**: ⏳ Planning Complete - Ready for Implementation
**Estimated Effort**: 5 days
**Risk Level**: Medium (payment logic changes require careful testing)
