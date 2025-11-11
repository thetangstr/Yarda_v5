# API Contract: Email & Lead Capture Endpoints

**Service**: Holiday Decorator - Email Lead Capture
**Base Path**: `/v1/holiday/email`
**Authentication**: Required for user-specific operations

---

## POST /v1/holiday/email/request-hd

Request high-resolution decorated image via email (lead capture).

### Request

**Headers**:
```
Authorization: Bearer <supabase-access-token>
Content-Type: application/json
```

**Body**:
```typescript
interface HDDownloadRequest {
  generation_id: string;         // Holiday generation UUID
  email: string;                 // Email address for delivery
}
```

**Example**:
```json
{
  "generation_id": "gen-uuid-123",
  "email": "user@example.com"
}
```

### Response

**Success (202 Accepted)**:
```typescript
interface HDDownloadResponse {
  success: boolean;
  message: string;
  email: string;
  generation_id: string;
  estimated_delivery_minutes: number;
  added_to_nurture_list: boolean;
  pivot_cta_url: string;         // URL to pivot CTA page
}
```

**Example**:
```json
{
  "success": true,
  "message": "Your high-resolution decorated home image will be sent to user@example.com within 1 minute.",
  "email": "user@example.com",
  "generation_id": "gen-uuid-123",
  "estimated_delivery_minutes": 1,
  "added_to_nurture_list": true,
  "pivot_cta_url": "/holiday/success?generation_id=gen-uuid-123"
}
```

**Error Responses**:

**400 Bad Request** - Invalid email:
```json
{
  "error": "INVALID_EMAIL",
  "message": "Please provide a valid email address"
}
```

**404 Not Found** - Generation not found:
```json
{
  "error": "NOT_FOUND",
  "message": "Generation not found or does not belong to you"
}
```

**400 Bad Request** - Generation not completed:
```json
{
  "error": "GENERATION_NOT_READY",
  "message": "Your decoration is still processing. Please wait until it's complete.",
  "status": "processing"
}
```

**429 Too Many Requests** - Rate limit:
```json
{
  "error": "RATE_LIMIT_EXCEEDED",
  "message": "You can only request HD downloads 5 times per day",
  "retry_after_seconds": 3600
}
```

---

## GET /v1/holiday/success

Display pivot CTA page after email submission (public endpoint).

### Request

**Query Parameters**:
- `generation_id` (string, required): Holiday generation UUID

**Example**:
```
GET /v1/holiday/success?generation_id=gen-uuid-123
```

### Response

**Success (200 OK)** - HTML page with pivot CTA:

Renders a success page with:
1. Thank you message ("Your HD image is on its way!")
2. Before/after comparison (user's holiday house vs. AI spring landscape preview)
3. Pivot CTA: "Love your holiday look? Wait 'til you see what we can do for your landscape."
4. Call to action: "Get 25% Off Your First Landscape Plan. Join the Spring 2026 Waitlist."
5. Discount code pre-applied: `SPRING2026-25`

**Error Responses**:

**404 Not Found** - Invalid generation ID:
```json
{
  "error": "NOT_FOUND",
  "message": "Generation not found"
}
```

---

## Backend Implementation Notes

### Endpoint: POST /v1/holiday/email/request-hd

**Processing Flow**:
1. Validate user authentication
2. Validate email format (basic regex check)
3. Fetch generation record and verify ownership
4. **Check generation status** (must be 'completed')
5. **Rate limit check** (max 5 HD requests per day per user)
6. Download decorated image from Vercel Blob
7. **Send email with HD image attachment** (use existing EmailService)
8. **Add email to nurture list** (if not already present)
9. Return success response with pivot CTA URL

**Email Template** (`backend/src/templates/emails/holiday_hd_download.html`):

```html
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Your AI-Decorated Home 🎄</title>
</head>
<body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
  <h1 style="color: #2D5016;">Your Holiday Decorated Home 🎄</h1>

  <p>Thanks for using Yarda's AI Holiday Decorator!</p>

  <p>Your high-resolution decorated home image is attached to this email. Feel free to use it for:</p>
  <ul>
    <li>Holiday cards 🎅</li>
    <li>Social media posts 📸</li>
    <li>Sharing with friends and family 🎁</li>
  </ul>

  <hr style="border: 1px solid #e0e0e0; margin: 30px 0;">

  <h2 style="color: #2D5016;">Love This? Imagine Your Spring Landscape</h2>

  <p>Our AI didn't just decorate your home for the holidays—it can transform your entire yard for spring!</p>

  <p><strong>Get 25% off your first landscape design plan</strong> when you join our Spring 2026 Waitlist.</p>

  <p>
    <a href="https://yarda.com/signup?discount=SPRING2026-25&utm_source=holiday_email&utm_medium=email&utm_campaign=holiday_to_spring"
       style="display: inline-block; background-color: #2D5016; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; font-weight: bold;">
      Get 25% Off Spring Landscaping →
    </a>
  </p>

  <p style="font-size: 12px; color: #666; margin-top: 40px;">
    You're receiving this email because you requested a download from Yarda's AI Holiday Decorator.
    We'll send you occasional updates about our Spring 2026 landscape design service.
    <a href="https://yarda.com/unsubscribe?email={{email}}" style="color: #666;">Unsubscribe</a>
  </p>
</body>
</html>
```

**Service Dependencies**:
- `HolidayGenerationService.get_generation(id)` - Verify generation exists and is complete
- `EmailService.send_email()` - Send email with attachment
- `EmailNurtureService.add_to_list()` - Add to "Holiday-to-Spring" campaign
- `BlobService.download(url)` - Download HD image from Vercel Blob

**Rate Limiting**:
```python
# Redis-based rate limiting (or database-based if Redis not available)
async def check_hd_request_rate_limit(user_id: UUID) -> bool:
    """Check if user has exceeded HD request limit (5/day)."""
    count = await db.fetchval(
        """
        SELECT COUNT(*)
        FROM email_nurture_list
        WHERE user_id = $1
          AND created_at >= NOW() - INTERVAL '24 hours'
        """,
        user_id
    )
    return count < 5
```

### Endpoint: GET /v1/holiday/success

**Processing Flow**:
1. Fetch generation record by ID
2. **Generate spring landscape preview** (optional: cache this for performance)
3. Render success page with:
   - Holiday decorated image
   - Spring landscape preview (same location)
   - Pivot CTA messaging
   - Pre-filled discount code link

**Spring Landscape Preview Generation** (Optional):
```python
async def generate_spring_preview(generation: HolidayGeneration) -> str:
    """
    Generate a spring landscape preview for the same location.
    This is optional—can use a generic spring landscape placeholder instead.
    """
    # Use same location as holiday generation
    lat, lng = generation.geocoded_lat, generation.geocoded_lng

    # Fetch satellite imagery
    satellite_image = await maps_service.get_satellite_image(lat, lng)

    # Generate spring landscape with Gemini
    spring_prompt = "Transform this yard into a beautiful spring landscape with flowers, green lawn, and seasonal plantings."
    spring_image_url = await gemini_client.generate_landscape(satellite_image, spring_prompt)

    return spring_image_url
```

**Fallback**: Use a generic "spring landscape example" placeholder image if generation is too slow/expensive.

---

## Frontend Implementation Notes

### HD Download Request Component

```typescript
// src/components/HDDownloadButton.tsx

interface HDDownloadButtonProps {
  generationId: string;
  onSuccess: () => void;
}

function HDDownloadButton({ generationId, onSuccess }: HDDownloadButtonProps) {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await api.post('/v1/holiday/email/request-hd', {
        generation_id: generationId,
        email
      });

      toast.success(response.message);
      setModalOpen(false);

      // Redirect to pivot CTA page
      router.push(response.pivot_cta_url);

      onSuccess();
    } catch (error) {
      if (error.response?.data?.error === 'RATE_LIMIT_EXCEEDED') {
        toast.error('You've reached the daily limit for HD downloads. Try again tomorrow!');
      } else if (error.response?.data?.error === 'INVALID_EMAIL') {
        toast.error('Please enter a valid email address');
      } else {
        toast.error('Failed to send email. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <button
        onClick={() => setModalOpen(true)}
        className="btn-secondary"
      >
        📧 Email My Design
      </button>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)}>
        <h2>Get Your HD Image</h2>
        <p>Enter your email to receive the high-resolution image, for free.</p>

        <form onSubmit={handleSubmit}>
          <input
            type="email"
            placeholder="your@email.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <button type="submit" disabled={loading}>
            {loading ? 'Sending...' : 'Send HD Image'}
          </button>
        </form>
      </Modal>
    </>
  );
}
```

### Pivot CTA Success Page

```typescript
// src/pages/holiday/success.tsx

export default function HolidaySuccessPage() {
  const router = useRouter();
  const { generation_id } = router.query;
  const [generation, setGeneration] = useState<HolidayGeneration | null>(null);

  useEffect(() => {
    if (generation_id) {
      fetchGeneration(generation_id as string);
    }
  }, [generation_id]);

  const fetchGeneration = async (id: string) => {
    const data = await api.get(`/v1/holiday/generations/${id}`);
    setGeneration(data);
  };

  if (!generation) return <Loading />;

  return (
    <div className="success-page">
      <h1>Success! 🎉</h1>
      <p>Your high-resolution decorated home image is on its way to your inbox!</p>

      <div className="pivot-cta">
        <h2>Love your holiday look? Wait 'til you see what we can do for your landscape.</h2>

        <div className="comparison">
          <div className="image-container">
            <img src={generation.decorated_image_url} alt="Holiday decoration" />
            <p>Your AI Holiday Decoration</p>
          </div>

          <div className="arrow">→</div>

          <div className="image-container">
            <img src="/images/spring-landscape-example.jpg" alt="Spring landscape" />
            <p>Your AI Spring Landscape (Preview)</p>
          </div>
        </div>

        <a
          href="/signup?discount=SPRING2026-25&utm_source=holiday_success&utm_medium=web&utm_campaign=holiday_to_spring"
          className="btn-primary"
        >
          Get 25% Off Your First Landscape Plan
          <br />
          <span className="subtitle">Join the Spring 2026 Waitlist</span>
        </a>

        <p className="disclaimer">
          Limited time offer. Discount applied automatically at checkout.
        </p>
      </div>

      <button onClick={() => router.push('/holiday')} className="btn-secondary">
        ← Back to Holiday Decorator
      </button>
    </div>
  );
}
```

---

## Testing

### Unit Tests (Backend - pytest)

```python
# tests/unit/test_email_service.py

async def test_send_hd_email_success(test_pool, mock_email_service):
    """Test HD email sending with attachment."""
    service = EmailService()

    # Setup: Generation is completed
    generation = await create_test_generation(test_pool, status='completed')

    # Act
    success = await service.send_hd_download_email(
        email="user@example.com",
        generation_id=generation["id"],
        decorated_image_url=generation["decorated_image_url"]
    )

    # Assert
    assert success is True
    mock_email_service.send_email.assert_called_once()

    # Verify attachment
    call_args = mock_email_service.send_email.call_args
    assert len(call_args.kwargs["attachments"]) == 1
    assert call_args.kwargs["attachments"][0].filename == "holiday-decoration.jpg"


async def test_add_to_nurture_list(test_pool):
    """Test adding email to nurture list."""
    service = EmailNurtureService(test_pool)

    # Act
    added = await service.add_to_list(
        email="user@example.com",
        user_id=user_id,
        campaign_tag="holiday_to_spring_2025"
    )

    # Assert
    assert added is True

    # Verify database record
    record = await test_pool.fetchrow(
        "SELECT * FROM email_nurture_list WHERE email = $1",
        "user@example.com"
    )
    assert record is not None
    assert record["campaign_tag"] == "holiday_to_spring_2025"


async def test_add_to_nurture_list_duplicate(test_pool):
    """Test adding duplicate email to nurture list (should be idempotent)."""
    service = EmailNurtureService(test_pool)

    # Setup: Email already in list
    await test_pool.execute(
        """
        INSERT INTO email_nurture_list (email, campaign_tag)
        VALUES ($1, $2)
        """,
        "user@example.com", "holiday_to_spring_2025"
    )

    # Act: Try to add again
    added = await service.add_to_list(
        email="user@example.com",
        user_id=user_id,
        campaign_tag="holiday_to_spring_2025"
    )

    # Assert: Should succeed but not create duplicate
    assert added is False  # Already exists

    # Verify only one record
    count = await test_pool.fetchval(
        "SELECT COUNT(*) FROM email_nurture_list WHERE email = $1",
        "user@example.com"
    )
    assert count == 1
```

### E2E Tests (Frontend - Playwright)

```typescript
// tests/e2e/holiday-lead-capture.spec.ts

test('P4: User requests HD download and sees pivot CTA', async ({ page }) => {
  // Setup: User has completed a generation
  await page.goto('/holiday');
  // ... generate decoration (see generation-api.md tests)

  // Click "Email My Design" button
  await page.click('button:has-text("Email My Design")');

  // Verify modal appears
  await expect(page.locator('text=Get Your HD Image')).toBeVisible();

  // Enter email
  await page.fill('input[type="email"]', 'testuser@example.com');

  // Submit
  await page.click('button:has-text("Send HD Image")');

  // Verify success message
  await expect(page.locator('text=on its way to your inbox')).toBeVisible();

  // Verify redirect to success page with pivot CTA
  await expect(page).toHaveURL(/\/holiday\/success/);
  await expect(page.locator('text=Love your holiday look?')).toBeVisible();

  // Verify comparison images
  await expect(page.locator('img[alt="Holiday decoration"]')).toBeVisible();
  await expect(page.locator('img[alt="Spring landscape"]')).toBeVisible();

  // Verify discount CTA
  await expect(page.locator('text=Get 25% Off')).toBeVisible();
  await expect(page.locator('a[href*="discount=SPRING2026-25"]')).toBeVisible();

  // Click CTA
  await page.click('a:has-text("Get 25% Off")');

  // Verify redirect to signup with discount code
  await expect(page).toHaveURL(/\/signup\?discount=SPRING2026-25/);
});
```
