# Research: Holiday Decorator - Viral Marketing Feature

**Phase**: Phase 0 - Technology Research
**Date**: 2025-11-10
**Branch**: 007-holiday-decorator

## Purpose

Document technology decisions, implementation approaches, and integration patterns for the Holiday Decorator feature. Resolve all technical questions before proceeding to Phase 1 (data modeling and contracts).

---

## 1. Social Platform API Integration

### Research Question
How do we verify social media shares server-side using Facebook Graph API, Instagram Basic Display API, and TikTok Creator API?

### Decision: OAuth + Post Verification Pattern

**Approach**:
1. User initiates share → Frontend redirects to OAuth consent screen
2. User grants permissions → Platform redirects back with auth code
3. Backend exchanges code for access token
4. Backend verifies post was published using platform API
5. Backend grants Holiday Credit if verification succeeds

### Implementation Details

**Facebook Graph API**:
- **OAuth Scope**: `publish_actions` (deprecated), use `pages_manage_posts` for Pages or share dialog
- **Verification Endpoint**: `GET /{user-id}/posts` or `GET /{post-id}`
- **Rate Limits**: 200 calls per hour per user
- **Documentation**: https://developers.facebook.com/docs/graph-api

**Instagram Basic Display API**:
- **OAuth Scope**: `user_profile`, `user_media`
- **Verification Endpoint**: `GET /me/media` to list recent posts
- **Rate Limits**: 200 calls per hour per user
- **Documentation**: https://developers.facebook.com/docs/instagram-basic-display-api
- **Note**: Cannot verify stories (only feed posts)

**TikTok Creator API**:
- **OAuth Scope**: `video.list`, `video.publish`
- **Verification Endpoint**: `GET /video/list/` to check recent uploads
- **Rate Limits**: Varies by tier (need to check docs)
- **Documentation**: https://developers.tiktok.com/doc/creator-api-getting-started

**Alternative: Share Dialog Pattern** (RECOMMENDED for MVP):
- Use native share dialogs (no OAuth required)
- User shares → Gets unique tracking link → Click required to earn credit
- Simpler but less viral (no automatic credit)
- **Recommendation**: Start with share dialogs, add OAuth verification later if needed

**Selected Approach for MVP**: Share dialogs with tracking links (simpler, faster to implement, no OAuth complexity)

---

## 2. Seasonal Activation Pattern

### Research Question
How should we activate/deactivate the holiday feature based on dates (Thanksgiving - January 1st)?

### Options Evaluated

**Option A: Environment Variable**
- `HOLIDAY_FEATURE_ENABLED=true/false`
- **Pros**: Simple, no code changes to toggle
- **Cons**: Manual toggle required, not automatic on date boundaries

**Option B: Database Flag**
- `feature_flags` table with `holiday_enabled` boolean
- **Pros**: Toggle via admin UI, can enable/disable anytime
- **Cons**: Requires admin UI, adds database dependency

**Option C: Date-Based Logic (RECOMMENDED)**
```typescript
// Frontend utility
export function isHolidaySeasonActive(): boolean {
  const now = new Date();
  const year = now.getFullYear();
  const thanksgiving = getNthDayOfMonth(year, 10, 4, 4); // 4th Thursday of November
  const newYear = new Date(year + 1, 0, 1); // January 1st next year

  return now >= thanksgiving && now < newYear;
}
```
- **Pros**: Fully automatic, no manual intervention
- **Cons**: Hard to override for testing

**Selected Approach**: Date-based logic with environment variable override
```typescript
export function isHolidaySeasonActive(): boolean {
  if (process.env.NEXT_PUBLIC_HOLIDAY_OVERRIDE === 'true') return true;
  if (process.env.NEXT_PUBLIC_HOLIDAY_OVERRIDE === 'false') return false;

  // Default: date-based logic
  const now = new Date();
  const year = now.getFullYear();
  const thanksgiving = getNthDayOfMonth(year, 10, 4, 4);
  const newYear = new Date(year + 1, 0, 1);

  return now >= thanksgiving && now < newYear;
}
```

**Files to Create**:
- `frontend/src/lib/seasonalFeatures.ts` - Utility functions
- Add to homepage: `{isHolidaySeasonActive() && <HolidayHero />}`

---

## 3. Street View Rotation Controls

### Research Question
How do we implement 360° Street View rotation controls similar to Google Maps?

### Existing Implementation Analysis

**Current Maps Service** (`backend/src/services/maps_service.py`):
```python
def get_street_view_url(lat: float, lng: float, heading: int = 0, pitch: int = 0) -> str:
    """
    Generate Street View Static API URL
    heading: 0-360 degrees (0=North, 90=East, 180=South, 270=West)
    pitch: -90 to 90 degrees (0=horizontal, positive=up, negative=down)
    """
```

**Already supports heading parameter!** We just need to:
1. Add rotation UI controls in frontend
2. Update request to include user-selected heading
3. Preview Street View before generation

### Implementation Approach

**Frontend Component: StreetViewRotator.tsx**:
```typescript
interface StreetViewRotatorProps {
  location: { lat: number; lng: number };
  onHeadingChange: (heading: number) => void;
}

function StreetViewRotator({ location, onHeadingChange }: StreetViewRotatorProps) {
  const [heading, setHeading] = useState(0);

  const streetViewUrl = `https://maps.googleapis.com/maps/api/streetview?size=800x600&location=${location.lat},${location.lng}&heading=${heading}&pitch=0&key=${API_KEY}`;

  const rotate = (degrees: number) => {
    const newHeading = (heading + degrees + 360) % 360;
    setHeading(newHeading);
    onHeadingChange(newHeading);
  };

  return (
    <div>
      <img src={streetViewUrl} alt="Street View Preview" />
      <button onClick={() => rotate(-45)}>← Rotate Left</button>
      <button onClick={() => rotate(45)}>Rotate Right →</button>
      <p>Heading: {heading}°</p>
    </div>
  );
}
```

**No backend changes needed** - MapsService already supports heading parameter.

---

## 4. Before/After Image Composition

### Research Question
How do we create side-by-side before/after comparison images for social sharing?

### Implementation Approach

**Option A: Client-Side Canvas Composition** (RECOMMENDED)
```typescript
async function createBeforeAfterImage(
  originalUrl: string,
  decoratedUrl: string
): Promise<Blob> {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d')!;

  // Load both images
  const [original, decorated] = await Promise.all([
    loadImage(originalUrl),
    loadImage(decoratedUrl)
  ]);

  // Set canvas size (side-by-side layout)
  canvas.width = original.width * 2 + 40; // 20px gap
  canvas.height = original.height + 120; // 120px for watermark

  // Draw white background
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Draw images side-by-side
  ctx.drawImage(original, 0, 60);
  ctx.drawImage(decorated, original.width + 40, 60);

  // Add labels
  ctx.font = '24px Arial';
  ctx.fillStyle = '#000000';
  ctx.fillText('Before', 20, 40);
  ctx.fillText('After', original.width + 60, 40);

  // Add watermark
  ctx.font = '18px Arial';
  ctx.fillStyle = '#666666';
  const watermark = 'Created with Yarda.com 🎄';
  const textWidth = ctx.measureText(watermark).width;
  ctx.fillText(watermark, (canvas.width - textWidth) / 2, canvas.height - 30);

  return new Promise(resolve => {
    canvas.toBlob(blob => resolve(blob!), 'image/jpeg', 0.9);
  });
}
```

**Option B: Server-Side Composition (Python PIL)**
- More complex, requires backend dependency
- Better for consistent quality across devices
- **Defer unless client-side has issues**

**Selected Approach**: Client-side canvas composition (simpler, no backend changes)

---

## 5. Holiday Credit System Database Design

### Research Question
How should we structure the Holiday Credit system to prevent negative balances?

### Design Decision

**Reuse existing atomic deduction pattern** from TrialService (migration 013):

```sql
-- Table: users (extend existing table)
ALTER TABLE users ADD COLUMN holiday_credits INTEGER DEFAULT 0 CHECK (holiday_credits >= 0);

-- Function: Atomic deduction
CREATE OR REPLACE FUNCTION deduct_holiday_credits(
  p_user_id UUID,
  p_amount INTEGER
)
RETURNS TABLE(success BOOLEAN, credits_remaining INTEGER) AS $$
DECLARE
  v_credits INTEGER;
BEGIN
  -- Lock row and get current credits
  SELECT holiday_credits INTO v_credits
  FROM users
  WHERE id = p_user_id
  FOR UPDATE NOWAIT;

  -- Check sufficient credits
  IF v_credits < p_amount THEN
    RETURN QUERY SELECT FALSE, v_credits::INTEGER;
    RETURN;
  END IF;

  -- Deduct
  UPDATE users
  SET holiday_credits = holiday_credits - p_amount,
      updated_at = NOW()
  WHERE id = p_user_id;

  RETURN QUERY SELECT TRUE, (v_credits - p_amount)::INTEGER;
END;
$$ LANGUAGE plpgsql;
```

**Backend Service Pattern**:
```python
class HolidayCreditService:
    async def deduct_credit(self, user_id: UUID) -> Tuple[bool, int]:
        """Atomically deduct 1 holiday credit. Returns (success, remaining)."""
        result = await self.db.fetchrow(
            "SELECT * FROM deduct_holiday_credits($1, $2)",
            user_id, 1
        )
        return result['success'], result['credits_remaining']

    async def grant_credit(self, user_id: UUID, reason: str) -> int:
        """Grant 1 holiday credit. Returns new balance."""
        # ...
```

**Same pattern as trial/token credits** - proven to prevent negative balances.

---

## 6. Gemini Prompt Engineering for Holiday Decorations

### Research Question
What prompts should we use to transform Street View images into holiday-decorated versions?

### Prompt Strategy

**Base Prompt Template**:
```
Transform this residential house image by adding festive holiday decorations while preserving the home's architecture and structural elements.

Style: {CLASSIC | MODERN | OVER_THE_TOP}

CLASSIC Style Guidelines:
- Traditional string lights along rooflines and windows (warm white)
- Wreaths on doors and windows
- Garland on railings
- Subtle, elegant appearance

MODERN Style Guidelines:
- LED lights in geometric patterns (cool white or multicolor)
- Minimalist wreath designs
- Contemporary color schemes
- Clean, sophisticated look

OVER_THE_TOP Style Guidelines:
- Maximum light coverage (rooflines, windows, landscaping, yard)
- Multiple inflatables (Santa, snowman, reindeer)
- Projector effects on house facade
- Elaborate yard displays

CRITICAL REQUIREMENTS:
- DO NOT alter the house structure, shape, or color
- DO NOT change landscaping features (trees, bushes, lawn)
- DO NOT modify driveways, sidewalks, or hardscaping
- ONLY ADD decorative elements (lights, wreaths, inflatables)
- Maintain realistic lighting and shadows
- Ensure decorations look professionally installed

Output: High-resolution decorated house image maintaining original architecture
```

**Testing Plan**: Create 3 test prompts (one per style), validate with sample Street View images before launch.

---

## 7. Email Service Integration for HD Downloads

### Research Question
How do we send HD images via email for lead capture?

### Existing Infrastructure

**EmailService** already exists (`backend/src/services/email_service.py`):
```python
class EmailService:
    async def send_email(
        self,
        to: str,
        subject: str,
        html_body: str,
        attachments: Optional[List[EmailAttachment]] = None
    ) -> bool:
```

**We can reuse this!** Just need to:
1. Create new email template for holiday HD download
2. Attach decorated image (download from Vercel Blob)
3. Add recipient to "Holiday-to-Spring" email list (Mailchimp/SendGrid)

**New Template**: `backend/src/templates/emails/holiday_hd_download.html`
```html
<h1>Your Holiday Decorated Home 🎄</h1>
<p>Thanks for using Yarda's AI Holiday Decorator!</p>
<p>Your high-resolution decorated home image is attached.</p>
<p><strong>Love this?</strong> Imagine what we can do for your landscape in the spring...</p>
<a href="https://yarda.com?utm_source=holiday_email">Get 25% Off Spring Landscaping</a>
```

**Email List Integration**:
- Use existing Mailchimp/SendGrid API integration
- Add tag: `holiday_decorator_2025`
- Nurture campaign: Send spring landscaping offers starting February

---

## 8. Testing Strategy

### Approach

**Test Pyramid**:
1. **Unit Tests (pytest)**: Test each service independently
   - `test_holiday_credit_service.py` - Atomic deduction, race conditions
   - `test_social_share_service.py` - Share tracking, daily limits
   - `test_holiday_generation_service.py` - Orchestration logic

2. **E2E Tests (Playwright)**: Test user flows
   - `holiday-discovery.spec.ts` - P1 user story
   - `holiday-sharing.spec.ts` - P2 user story
   - `holiday-existing-user.spec.ts` - P3 user story
   - `holiday-lead-capture.spec.ts` - P4 user story
   - `holiday-pivot.spec.ts` - P5 user story

**Test Data**:
- Mock social API responses (no real OAuth during tests)
- Test Street View locations with known availability
- Test date overrides for seasonal activation

---

## 9. Performance Considerations

### Image Generation Performance

**Target**: <10 seconds (95th percentile)

**Optimization Strategies**:
1. Reuse existing Gemini client (already optimized)
2. Single image transformation (Street View → Decorated)
3. Use lower resolution for preview, HD for email download
4. Cache Street View images (avoid repeated Maps API calls)

**Monitoring**:
- Track generation times in database
- Alert if p95 > 15 seconds
- Same infrastructure as landscape generation (proven to handle load)

### Database Performance

**Queries to Optimize**:
- Holiday credit check: Index on `users.holiday_credits`
- Share verification: Index on `social_shares(user_id, created_at)`
- Daily share count: `WHERE created_at > NOW() - INTERVAL '1 day'`

**Expected Load**:
- Target: 1,000 new users during holiday season
- Assume: 40% share rate = 400 share verifications
- Peak: 50 concurrent generations (same as current landscape load)

---

## 10. Security Considerations

### OAuth Security
- Store access tokens encrypted in database
- Expire tokens after 30 days
- Never expose tokens to frontend
- Use state parameter to prevent CSRF

### Share Verification Security
- Rate limit: 3 shares per day per user
- Validate share timestamp (within last 5 minutes)
- Check for duplicate shares (same post ID)
- Log all share attempts for abuse detection

### Credit System Security
- Use `FOR UPDATE NOWAIT` locks (prevent race conditions)
- Database constraints: `CHECK (holiday_credits >= 0)`
- Log all credit transactions for audit trail

---

## Summary

All research questions resolved. Ready to proceed to Phase 1 (data modeling and contracts).

**Key Decisions**:
1. ✅ Social sharing: Share dialogs with tracking links (defer OAuth for v2)
2. ✅ Seasonal activation: Date-based logic with environment variable override
3. ✅ Street View rotation: Reuse existing heading parameter, add UI controls
4. ✅ Before/after images: Client-side canvas composition
5. ✅ Holiday credits: Reuse atomic deduction pattern from migration 013
6. ✅ Gemini prompts: Style-specific templates with strict architecture preservation
7. ✅ Email integration: Reuse existing EmailService, add new template
8. ✅ Testing: Playwright for E2E, pytest for backend unit tests
9. ✅ Performance: <10 second target, reuse existing infrastructure
10. ✅ Security: Rate limiting, atomic operations, encrypted token storage

**No blockers.** All technology decisions align with existing Yarda architecture.
