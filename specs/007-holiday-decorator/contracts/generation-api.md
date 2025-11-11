# API Contract: Holiday Generation Endpoints

**Service**: Holiday Decorator
**Base Path**: `/v1/holiday/generations`
**Authentication**: Required (Bearer token from Supabase Auth)

---

## POST /v1/holiday/generations

Create a new holiday decoration generation request.

### Request

**Headers**:
```
Authorization: Bearer <supabase-access-token>
Content-Type: application/json
```

**Body**:
```typescript
interface HolidayGenerationRequest {
  address: string;               // User-entered address (e.g., "123 Main St, San Francisco, CA")
  heading: number;               // Street View heading (0-359 degrees)
  pitch?: number;                // Street View pitch (-90 to 90, default: 0)
  style: 'classic' | 'modern' | 'over_the_top';
}
```

**Example**:
```json
{
  "address": "1600 Amphitheatre Parkway, Mountain View, CA",
  "heading": 180,
  "pitch": 0,
  "style": "classic"
}
```

### Response

**Success (201 Created)**:
```typescript
interface HolidayGenerationResponse {
  id: string;                    // Generation UUID
  user_id: string;               // User UUID
  address: string;               // Geocoded address
  location: {
    lat: number;
    lng: number;
  };
  street_view_heading: number;
  street_view_pitch: number;
  style: 'classic' | 'modern' | 'over_the_top';
  status: 'pending' | 'processing' | 'completed' | 'failed';
  original_image_url: string;    // Vercel Blob URL (Street View image)
  decorated_image_url: string | null;  // NULL until completed
  before_after_image_url: string | null;  // NULL until completed
  credits_remaining: number;     // Holiday credits after deduction
  created_at: string;            // ISO 8601 timestamp
  estimated_completion_seconds: number;  // Estimated time (e.g., 10)
}
```

**Example**:
```json
{
  "id": "gen-uuid-123",
  "user_id": "user-uuid-456",
  "address": "1600 Amphitheatre Parkway, Mountain View, CA 94043",
  "location": {
    "lat": 37.4220936,
    "lng": -122.0852992
  },
  "street_view_heading": 180,
  "street_view_pitch": 0,
  "style": "classic",
  "status": "pending",
  "original_image_url": "https://blob.vercel-storage.com/original-abc123.jpg",
  "decorated_image_url": null,
  "before_after_image_url": null,
  "credits_remaining": 0,
  "created_at": "2024-12-20T10:30:00Z",
  "estimated_completion_seconds": 10
}
```

**Error Responses**:

**400 Bad Request** - Invalid input:
```json
{
  "error": "INVALID_ADDRESS",
  "message": "Street View not available for this location"
}
```

**400 Bad Request** - Insufficient credits:
```json
{
  "error": "INSUFFICIENT_CREDITS",
  "message": "You need 1 Holiday Credit to generate. Share your design to earn more!",
  "credits_available": 0
}
```

**401 Unauthorized** - No auth token:
```json
{
  "error": "UNAUTHORIZED",
  "message": "Authentication required"
}
```

**422 Unprocessable Entity** - Validation errors:
```json
{
  "error": "VALIDATION_ERROR",
  "details": [
    {
      "field": "heading",
      "message": "must be between 0 and 359"
    },
    {
      "field": "style",
      "message": "must be one of: classic, modern, over_the_top"
    }
  ]
}
```

---

## GET /v1/holiday/generations/:id

Get the status and results of a holiday generation.

### Request

**Headers**:
```
Authorization: Bearer <supabase-access-token>
```

**Path Parameters**:
- `id` (string, required): Generation UUID

### Response

**Success (200 OK)**:
```typescript
interface HolidayGenerationStatusResponse {
  id: string;
  user_id: string;
  address: string;
  location: {
    lat: number;
    lng: number;
  };
  street_view_heading: number;
  street_view_pitch: number;
  style: 'classic' | 'modern' | 'over_the_top';
  status: 'pending' | 'processing' | 'completed' | 'failed';
  original_image_url: string;
  decorated_image_url: string | null;
  before_after_image_url: string | null;
  error_message: string | null;  // Only present if status === 'failed'
  created_at: string;
  updated_at: string;
  completed_at: string | null;
  generation_duration_seconds: number | null;  // Performance tracking
}
```

**Example (Pending)**:
```json
{
  "id": "gen-uuid-123",
  "user_id": "user-uuid-456",
  "address": "1600 Amphitheatre Parkway, Mountain View, CA 94043",
  "location": {
    "lat": 37.4220936,
    "lng": -122.0852992
  },
  "street_view_heading": 180,
  "street_view_pitch": 0,
  "style": "classic",
  "status": "processing",
  "original_image_url": "https://blob.vercel-storage.com/original-abc123.jpg",
  "decorated_image_url": null,
  "before_after_image_url": null,
  "error_message": null,
  "created_at": "2024-12-20T10:30:00Z",
  "updated_at": "2024-12-20T10:30:05Z",
  "completed_at": null,
  "generation_duration_seconds": null
}
```

**Example (Completed)**:
```json
{
  "id": "gen-uuid-123",
  "user_id": "user-uuid-456",
  "address": "1600 Amphitheatre Parkway, Mountain View, CA 94043",
  "location": {
    "lat": 37.4220936,
    "lng": -122.0852992
  },
  "street_view_heading": 180,
  "street_view_pitch": 0,
  "style": "classic",
  "status": "completed",
  "original_image_url": "https://blob.vercel-storage.com/original-abc123.jpg",
  "decorated_image_url": "https://blob.vercel-storage.com/decorated-xyz789.jpg",
  "before_after_image_url": "https://blob.vercel-storage.com/before-after-def456.jpg",
  "error_message": null,
  "created_at": "2024-12-20T10:30:00Z",
  "updated_at": "2024-12-20T10:30:08Z",
  "completed_at": "2024-12-20T10:30:08Z",
  "generation_duration_seconds": 8
}
```

**Error Responses**:

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
  "message": "You do not have access to this generation"
}
```

---

## GET /v1/holiday/generations

List user's holiday generations (paginated).

### Request

**Headers**:
```
Authorization: Bearer <supabase-access-token>
```

**Query Parameters**:
- `limit` (number, optional): Number of results (default: 10, max: 50)
- `offset` (number, optional): Pagination offset (default: 0)
- `status` (string, optional): Filter by status ('completed', 'failed', etc.)

**Example**:
```
GET /v1/holiday/generations?limit=10&offset=0&status=completed
```

### Response

**Success (200 OK)**:
```typescript
interface HolidayGenerationListResponse {
  generations: HolidayGenerationStatusResponse[];
  total: number;
  limit: number;
  offset: number;
}
```

**Example**:
```json
{
  "generations": [
    {
      "id": "gen-uuid-123",
      "status": "completed",
      "decorated_image_url": "https://blob.vercel-storage.com/decorated-xyz789.jpg",
      "created_at": "2024-12-20T10:30:00Z"
    }
  ],
  "total": 1,
  "limit": 10,
  "offset": 0
}
```

---

## Backend Implementation Notes

### Endpoint: POST /v1/holiday/generations

**Processing Flow**:
1. Validate request (address, heading, style)
2. Check user authentication
3. **Deduct 1 holiday credit atomically** (use `deduct_holiday_credit()` function)
4. Geocode address using Google Maps Geocoding API
5. Fetch Street View image from Google Maps API (with heading/pitch)
6. Upload Street View image to Vercel Blob
7. Create `holiday_generations` record with status='pending'
8. **Queue async Gemini generation task**
9. Return generation ID immediately (don't wait for completion)

**Service Dependencies**:
- `HolidayCreditService.deduct_credit(user_id)` - Atomic deduction
- `MapsService.geocode(address)` - Address to lat/lng
- `MapsService.get_street_view_image(lat, lng, heading, pitch)` - Fetch image
- `BlobService.upload(image, filename)` - Upload to Vercel Blob
- `HolidayGenerationService.create_generation()` - Create DB record
- `GeminiClient.generate_decorated_image()` - Async AI transformation

### Endpoint: GET /v1/holiday/generations/:id

**Processing Flow**:
1. Validate user authentication
2. Fetch generation record from database
3. **Check ownership** (user_id matches authenticated user)
4. Return generation status and results

**Polling Pattern** (Frontend):
```typescript
// Poll every 2 seconds until completed or failed
const pollGenerationStatus = async (generationId: string) => {
  const maxAttempts = 150; // 5 minutes max (2s × 150 = 300s)
  let attempts = 0;

  while (attempts < maxAttempts) {
    const response = await api.get(`/v1/holiday/generations/${generationId}`);

    if (response.status === 'completed' || response.status === 'failed') {
      return response;
    }

    await sleep(2000);
    attempts++;
  }

  throw new Error('Generation timeout');
};
```

---

## Frontend TypeScript Types

```typescript
// src/types/holiday.ts

export type HolidayStyle = 'classic' | 'modern' | 'over_the_top';

export type HolidayGenerationStatus = 'pending' | 'processing' | 'completed' | 'failed';

export interface HolidayGenerationRequest {
  address: string;
  heading: number;
  pitch?: number;
  style: HolidayStyle;
}

export interface HolidayGeneration {
  id: string;
  user_id: string;
  address: string;
  location: {
    lat: number;
    lng: number;
  };
  street_view_heading: number;
  street_view_pitch: number;
  style: HolidayStyle;
  status: HolidayGenerationStatus;
  original_image_url: string;
  decorated_image_url: string | null;
  before_after_image_url: string | null;
  error_message: string | null;
  created_at: string;
  updated_at: string;
  completed_at: string | null;
  generation_duration_seconds: number | null;
}

export interface HolidayGenerationCreateResponse extends HolidayGeneration {
  credits_remaining: number;
  estimated_completion_seconds: number;
}
```

---

## Testing

### Unit Tests (Backend - pytest)

```python
# tests/unit/test_holiday_generation_service.py

async def test_create_generation_success(test_pool, mock_maps_service, mock_gemini_client):
    """Test successful generation creation with credit deduction."""
    service = HolidayGenerationService(test_pool, mock_maps_service, mock_gemini_client)

    # Setup: User has 1 holiday credit
    await test_pool.execute("UPDATE users SET holiday_credits = 1 WHERE id = $1", user_id)

    # Act
    generation = await service.create_generation(
        user_id=user_id,
        address="1600 Amphitheatre Parkway, Mountain View, CA",
        heading=180,
        style="classic"
    )

    # Assert
    assert generation["status"] == "pending"
    assert generation["credits_remaining"] == 0

    # Verify credit deducted
    credits = await test_pool.fetchval("SELECT holiday_credits FROM users WHERE id = $1", user_id)
    assert credits == 0


async def test_create_generation_insufficient_credits(test_pool):
    """Test generation fails when user has no credits."""
    service = HolidayGenerationService(test_pool)

    # Setup: User has 0 holiday credits
    await test_pool.execute("UPDATE users SET holiday_credits = 0 WHERE id = $1", user_id)

    # Act & Assert
    with pytest.raises(InsufficientCreditsError):
        await service.create_generation(user_id, "123 Main St", 0, "classic")
```

### E2E Tests (Frontend - Playwright)

```typescript
// tests/e2e/holiday-discovery.spec.ts

test('P1: New user generates first holiday decoration', async ({ page }) => {
  // Navigate to holiday page
  await page.goto('/holiday');

  // Verify initial state
  await expect(page.locator('text=Holiday Credits: 1')).toBeVisible();

  // Enter address
  await page.fill('input[name="address"]', '1600 Amphitheatre Parkway, Mountain View, CA');
  await page.click('button:has-text("Search")');

  // Wait for Street View to load
  await expect(page.locator('.street-view-container img')).toBeVisible();

  // Rotate Street View
  await page.click('button:has-text("Rotate Right")');
  await page.waitForTimeout(500);

  // Select style
  await page.click('[data-testid="style-classic"]');

  // Generate
  await page.click('button:has-text("Generate")');

  // Verify credit confirmation modal
  await expect(page.locator('text=This will use your 1 free credit')).toBeVisible();
  await page.click('button:has-text("Generate")');

  // Wait for generation to complete (poll until status=completed)
  await expect(page.locator('.decorated-image')).toBeVisible({ timeout: 15000 });

  // Verify credits updated
  await expect(page.locator('text=Holiday Credits: 0')).toBeVisible();

  // Verify before/after toggle works
  await page.click('button:has-text("Before")');
  await expect(page.locator('.original-image')).toBeVisible();
  await page.click('button:has-text("After")');
  await expect(page.locator('.decorated-image')).toBeVisible();
});
```
