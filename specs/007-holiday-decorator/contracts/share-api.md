# API Contract: Social Sharing Endpoints

**Service**: Holiday Decorator - Social Sharing
**Base Path**: `/v1/holiday/shares`
**Authentication**: Required (Bearer token from Supabase Auth)

---

## POST /v1/holiday/shares

Create a social media share tracking link and record share attempt.

### Request

**Headers**:
```
Authorization: Bearer <supabase-access-token>
Content-Type: application/json
```

**Body**:
```typescript
interface ShareRequest {
  generation_id: string;         // Holiday generation UUID
  platform: 'instagram' | 'facebook' | 'tiktok';
}
```

**Example**:
```json
{
  "generation_id": "gen-uuid-123",
  "platform": "instagram"
}
```

### Response

**Success (201 Created)**:
```typescript
interface ShareResponse {
  id: string;                    // Share UUID
  user_id: string;
  generation_id: string;
  platform: 'instagram' | 'facebook' | 'tiktok';
  tracking_link: string;         // Unique tracking URL
  share_url: string;             // Platform-specific share URL
  before_after_image_url: string;  // Image to share
  can_earn_credit: boolean;      // False if daily limit reached
  daily_shares_remaining: number;  // How many more shares allowed today
  created_at: string;
}
```

**Example**:
```json
{
  "id": "share-uuid-789",
  "user_id": "user-uuid-456",
  "generation_id": "gen-uuid-123",
  "platform": "instagram",
  "tracking_link": "https://yarda.com/h/abc123xyz",
  "share_url": "https://www.instagram.com/create/story?media=https://yarda.com/api/share-image/abc123xyz",
  "before_after_image_url": "https://blob.vercel-storage.com/before-after-def456.jpg",
  "can_earn_credit": true,
  "daily_shares_remaining": 2,
  "created_at": "2024-12-20T10:35:00Z"
}
```

**Error Responses**:

**400 Bad Request** - Daily limit reached:
```json
{
  "error": "DAILY_LIMIT_REACHED",
  "message": "You've reached your daily share limit (3/day). Come back tomorrow for more credits!",
  "shares_today": 3,
  "reset_at": "2024-12-21T00:00:00Z"
}
```

**404 Not Found** - Generation not found:
```json
{
  "error": "NOT_FOUND",
  "message": "Generation not found"
}
```

**403 Forbidden** - Not the user's generation:
```json
{
  "error": "FORBIDDEN",
  "message": "You can only share your own generations"
}
```

---

## GET /v1/holiday/shares/track/:tracking_code

Track when a shared link is clicked (public endpoint, no auth required).

### Request

**Path Parameters**:
- `tracking_code` (string, required): Unique tracking code from share link

**Example**:
```
GET /v1/holiday/shares/track/abc123xyz
```

### Response

**Success (302 Redirect)**:
- Redirects to Yarda homepage with UTM parameters
- Sets cookie to track referral source
- Updates `social_shares.clicked = true` in database
- **Grants 1 holiday credit** if not already granted

**Redirect URL**:
```
https://yarda.com/?utm_source=holiday_share&utm_medium=social&utm_campaign=holiday_2024&ref=abc123xyz
```

**Error Responses**:

**404 Not Found** - Invalid tracking code:
```json
{
  "error": "NOT_FOUND",
  "message": "Invalid share link"
}
```

---

## GET /v1/holiday/shares

List user's social shares (paginated).

### Request

**Headers**:
```
Authorization: Bearer <supabase-access-token>
```

**Query Parameters**:
- `limit` (number, optional): Number of results (default: 10, max: 50)
- `offset` (number, optional): Pagination offset (default: 0)

### Response

**Success (200 OK)**:
```typescript
interface ShareListResponse {
  shares: Array<{
    id: string;
    generation_id: string;
    platform: 'instagram' | 'facebook' | 'tiktok';
    tracking_link: string;
    clicked: boolean;
    credit_granted: boolean;
    credit_granted_at: string | null;
    created_at: string;
  }>;
  total: number;
  daily_shares_count: number;   // Shares in last 24 hours
  daily_shares_remaining: number;  // Remaining shares today
}
```

**Example**:
```json
{
  "shares": [
    {
      "id": "share-uuid-789",
      "generation_id": "gen-uuid-123",
      "platform": "instagram",
      "tracking_link": "https://yarda.com/h/abc123xyz",
      "clicked": true,
      "credit_granted": true,
      "credit_granted_at": "2024-12-20T10:40:00Z",
      "created_at": "2024-12-20T10:35:00Z"
    }
  ],
  "total": 1,
  "daily_shares_count": 1,
  "daily_shares_remaining": 2
}
```

---

## Backend Implementation Notes

### Endpoint: POST /v1/holiday/shares

**Processing Flow**:
1. Validate user authentication
2. Verify generation exists and belongs to user
3. **Check daily share limit** (use `check_daily_share_limit()` function)
4. Generate unique tracking code (nanoid or UUID short form)
5. Create `social_shares` record with `credit_granted = false`
6. Build platform-specific share URL
7. Return tracking link and share URL

**Platform-Specific Share URLs**:

**Instagram** (Stories):
```typescript
// Instagram Stories share (mobile app deep link)
const shareUrl = `instagram://story-camera?backgroundImage=${encodeURIComponent(imageUrl)}`;

// Fallback for web (copy image URL to clipboard)
const webFallback = `https://www.instagram.com/`;
```

**Facebook** (Feed Post):
```typescript
const shareUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(trackingLink)}`;
```

**TikTok** (Video Upload):
```typescript
// TikTok share (requires manual upload, provide instructions)
const shareUrl = `https://www.tiktok.com/upload`;
// User manually uploads before/after image as TikTok video
```

**Share Dialog Pattern** (Simplified MVP Approach):
Instead of OAuth verification, use native share dialogs with tracking links:
1. User clicks "Share to Instagram"
2. Frontend opens share dialog with before/after image + tracking link in caption
3. User shares → Tracking link is embedded
4. When someone clicks tracking link → Grant credit

**Service Dependencies**:
- `HolidayGenerationService.get_generation(id)` - Verify generation exists
- `SocialShareService.check_daily_limit(user_id)` - Prevent abuse
- `SocialShareService.create_share_record()` - Track share
- `SocialShareService.generate_tracking_code()` - Unique code

### Endpoint: GET /v1/holiday/shares/track/:tracking_code

**Processing Flow**:
1. Look up `social_shares` record by tracking_code
2. Update `clicked = true`
3. **Check if credit already granted** (prevent duplicate credits)
4. If not granted and clicked for first time:
   - Grant 1 holiday credit (use `grant_holiday_credit()` function)
   - Update `credit_granted = true`, `credit_granted_at = NOW()`
5. Redirect to Yarda homepage with UTM parameters

**Concurrency Handling**:
```python
# Atomic credit grant with idempotency
async def grant_credit_for_share(share_id: UUID) -> bool:
    async with db_pool.transaction() as conn:
        # Lock share record
        share = await conn.fetchrow(
            """
            SELECT credit_granted, user_id
            FROM social_shares
            WHERE id = $1
            FOR UPDATE
            """,
            share_id
        )

        if share["credit_granted"]:
            return False  # Already granted

        # Grant credit
        await conn.execute(
            "SELECT grant_holiday_credit($1, 1)",
            share["user_id"]
        )

        # Mark as granted
        await conn.execute(
            """
            UPDATE social_shares
            SET credit_granted = TRUE,
                credit_granted_at = NOW(),
                updated_at = NOW()
            WHERE id = $1
            """,
            share_id
        )

        return True
```

---

## Frontend Implementation Notes

### Share Button Component

```typescript
// src/components/ShareButtons.tsx

interface ShareButtonsProps {
  generationId: string;
  beforeAfterImageUrl: string;
  onShareSuccess: (platform: string) => void;
}

function ShareButtons({ generationId, beforeAfterImageUrl, onShareSuccess }: ShareButtonsProps) {
  const handleShare = async (platform: 'instagram' | 'facebook' | 'tiktok') => {
    try {
      // Create share record and get tracking link
      const response = await api.post('/v1/holiday/shares', {
        generation_id: generationId,
        platform
      });

      if (!response.can_earn_credit) {
        toast.error(
          `Daily share limit reached (${response.daily_shares_remaining}/3). Come back tomorrow!`
        );
        return;
      }

      // Open platform-specific share dialog
      if (platform === 'instagram') {
        // Copy image URL and tracking link to clipboard
        await navigator.clipboard.writeText(
          `Check out my AI-decorated home! 🎄 ${response.tracking_link}`
        );
        // Open Instagram app (mobile) or web
        window.open('https://www.instagram.com/', '_blank');
        toast.success('Image link copied! Paste in your Instagram story.');
      } else if (platform === 'facebook') {
        // Use Facebook share dialog
        window.open(response.share_url, '_blank', 'width=600,height=400');
      } else if (platform === 'tiktok') {
        // Provide instructions for TikTok manual upload
        toast.info('Download the before/after image and upload to TikTok with the tracking link.');
        // Trigger download of before/after image
        downloadImage(beforeAfterImageUrl, 'holiday-decoration.jpg');
      }

      onShareSuccess(platform);
    } catch (error) {
      if (error.response?.data?.error === 'DAILY_LIMIT_REACHED') {
        toast.error(error.response.data.message);
      } else {
        toast.error('Failed to create share link. Please try again.');
      }
    }
  };

  return (
    <div className="flex gap-4">
      <button onClick={() => handleShare('instagram')}>
        Share on Instagram 📸
      </button>
      <button onClick={() => handleShare('facebook')}>
        Share on Facebook 👍
      </button>
      <button onClick={() => handleShare('tiktok')}>
        Share on TikTok 🎵
      </button>
    </div>
  );
}
```

### Before/After Image Composition

```typescript
// src/lib/imageComposition.ts

export async function createBeforeAfterImage(
  originalUrl: string,
  decoratedUrl: string
): Promise<string> {
  // Load both images
  const [original, decorated] = await Promise.all([
    loadImage(originalUrl),
    loadImage(decoratedUrl)
  ]);

  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d')!;

  // Canvas dimensions (side-by-side with gap and watermark space)
  const gap = 20;
  const watermarkHeight = 80;
  canvas.width = (original.width * 2) + (gap * 3);
  canvas.height = original.height + watermarkHeight + (gap * 2);

  // White background
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Draw images
  ctx.drawImage(original, gap, gap);
  ctx.drawImage(decorated, original.width + (gap * 2), gap);

  // Add "BEFORE" and "AFTER" labels
  ctx.font = 'bold 32px Arial';
  ctx.fillStyle = '#000000';
  ctx.textAlign = 'center';
  ctx.fillText('BEFORE', original.width / 2 + gap, gap + original.height + 40);
  ctx.fillText('AFTER', original.width * 1.5 + (gap * 2), gap + original.height + 40);

  // Add watermark
  ctx.font = '20px Arial';
  ctx.fillStyle = '#666666';
  const watermark = '🎄 Created with Yarda.com - AI Holiday Decorator';
  ctx.fillText(watermark, canvas.width / 2, canvas.height - 25);

  // Convert to blob
  return new Promise(resolve => {
    canvas.toBlob(blob => {
      const url = URL.createObjectURL(blob!);
      resolve(url);
    }, 'image/jpeg', 0.9);
  });
}
```

---

## Testing

### Unit Tests (Backend - pytest)

```python
# tests/unit/test_social_share_service.py

async def test_create_share_within_daily_limit(test_pool):
    """Test share creation succeeds when under daily limit."""
    service = SocialShareService(test_pool)

    # Setup: User has shared 2 times today (limit is 3)
    await test_pool.execute(
        """
        INSERT INTO social_shares (user_id, generation_id, platform, tracking_link)
        VALUES ($1, $2, 'instagram', 'link1'), ($1, $2, 'facebook', 'link2')
        """,
        user_id, generation_id
    )

    # Act
    share = await service.create_share(user_id, generation_id, 'tiktok')

    # Assert
    assert share["can_earn_credit"] is True
    assert share["daily_shares_remaining"] == 0


async def test_create_share_exceeds_daily_limit(test_pool):
    """Test share creation fails when daily limit reached."""
    service = SocialShareService(test_pool)

    # Setup: User has shared 3 times today (limit is 3)
    await test_pool.execute(
        """
        INSERT INTO social_shares (user_id, generation_id, platform, tracking_link)
        VALUES
          ($1, $2, 'instagram', 'link1'),
          ($1, $2, 'facebook', 'link2'),
          ($1, $2, 'tiktok', 'link3')
        """,
        user_id, generation_id
    )

    # Act & Assert
    with pytest.raises(DailyLimitExceededError):
        await service.create_share(user_id, generation_id, 'instagram')


async def test_track_share_grants_credit_once(test_pool):
    """Test tracking link grants credit only once."""
    service = SocialShareService(test_pool)

    # Setup: Create share record
    share_id = await test_pool.fetchval(
        """
        INSERT INTO social_shares (user_id, generation_id, platform, tracking_link)
        VALUES ($1, $2, 'instagram', 'abc123')
        RETURNING id
        """,
        user_id, generation_id
    )

    # Act: Track share (first time)
    granted1 = await service.track_share_click('abc123')
    assert granted1 is True

    # Verify credit granted
    credits = await test_pool.fetchval(
        "SELECT holiday_credits FROM users WHERE id = $1",
        user_id
    )
    assert credits == 1

    # Act: Track share again (second time)
    granted2 = await service.track_share_click('abc123')
    assert granted2 is False  # No duplicate credit

    # Verify credit not doubled
    credits = await test_pool.fetchval(
        "SELECT holiday_credits FROM users WHERE id = $1",
        user_id
    )
    assert credits == 1  # Still 1, not 2
```

### E2E Tests (Frontend - Playwright)

```typescript
// tests/e2e/holiday-sharing.spec.ts

test('P2: User shares decorated home and earns credit', async ({ page, context }) => {
  // Setup: User has completed a generation
  await page.goto('/holiday');
  // ... generate decoration (see generation-api.md tests)

  // Verify initial credits
  await expect(page.locator('text=Holiday Credits: 0')).toBeVisible();

  // Click share button
  await page.click('button:has-text("Share on Instagram")');

  // Verify share dialog opened (new tab)
  const [shareTab] = await Promise.all([
    context.waitForEvent('page'),
    // Share button triggers new tab
  ]);

  // Verify tracking link copied to clipboard
  const clipboardText = await page.evaluate(() => navigator.clipboard.readText());
  expect(clipboardText).toContain('yarda.com/h/');

  // Simulate clicking tracking link (in separate test or manual verification)
  // In reality, this would be done by a real user clicking the shared link
  const trackingCode = clipboardText.match(/yarda\.com\/h\/([a-zA-Z0-9]+)/)?.[1];
  await page.goto(`/h/${trackingCode}`);

  // Verify redirect to homepage
  await expect(page).toHaveURL(/\?utm_source=holiday_share/);

  // Navigate back to holiday page
  await page.goto('/holiday');

  // Verify credit granted
  await expect(page.locator('text=Holiday Credits: 1')).toBeVisible();
});
```
