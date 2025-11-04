# Quick Start Guide: Google Maps Property Image Integration

**Feature**: 003-google-maps-integration
**Date**: 2025-11-04
**Audience**: Developers implementing this feature

## Overview

This guide walks through implementing the Google Maps integration feature step-by-step, from setup to testing. Follow these instructions to add automatic property image retrieval to the landscape generation system.

**Time to Complete**: ~4-6 hours (including testing)

---

## Prerequisites

Before starting implementation:

- [ ] Read [spec.md](spec.md) - Feature specification
- [ ] Read [research.md](research.md) - Google Maps API research
- [ ] Read [data-model.md](data-model.md) - Database schema changes
- [ ] Read [contracts/maps-service.yaml](contracts/maps-service.yaml) - Service interface
- [ ] Google Cloud Platform account with billing enabled
- [ ] Backend running locally (`uvicorn src.main:app --port 8000`)
- [ ] Frontend running locally (`npm run dev`)
- [ ] PostgreSQL database accessible

---

## Step 1: Google Cloud Setup (30 minutes)

### 1.1 Create Google Cloud Project

```bash
# Using gcloud CLI
gcloud projects create yarda-maps-dev --name="Yarda Maps Development"
gcloud config set project yarda-maps-dev

# Enable billing (required for API usage)
# Visit: https://console.cloud.google.com/billing
```

### 1.2 Enable Required APIs

```bash
# Enable Geocoding API
gcloud services enable geocoding-backend.googleapis.com

# Enable Street View Static API
gcloud services enable street-view-image-backend.googleapis.com

# Enable Maps Static API
gcloud services enable static-maps-backend.googleapis.com
```

### 1.3 Create API Key

```bash
# Create API key
gcloud alpha services api-keys create \
  --display-name="Yarda Maps API Key - Development" \
  --api-target=service=geocoding-backend.googleapis.com \
  --api-target=service=street-view-image-backend.googleapis.com \
  --api-target=service=static-maps-backend.googleapis.com

# Get the key value
gcloud alpha services api-keys list
```

**Manual Alternative**: Visit [Google Cloud Console API Keys](https://console.cloud.google.com/apis/credentials)

### 1.4 Restrict API Key (Security)

**For Development**:
```bash
# Restrict to localhost IP
gcloud alpha services api-keys update YOUR_KEY_ID \
  --allowed-ips=127.0.0.1,::1
```

**For Production**:
```bash
# Restrict to server IPs
gcloud alpha services api-keys update YOUR_KEY_ID \
  --allowed-ips=YOUR_SERVER_IP_1,YOUR_SERVER_IP_2
```

### 1.5 Set Environment Variable

```bash
# Add to backend/.env.local
echo "GOOGLE_MAPS_API_KEY=YOUR_API_KEY_HERE" >> backend/.env.local

# Verify
grep GOOGLE_MAPS_API_KEY backend/.env.local
```

**⚠️ Security**: Never commit `.env.local` to git. Verify `.gitignore` includes it.

---

## Step 2: Database Migration (15 minutes)

### 2.1 Create Migration File

```bash
cd backend

# Create new migration
alembic revision -m "add_image_source_to_generations"

# This creates: alembic/versions/XXXXX_add_image_source_to_generations.py
```

### 2.2 Write Migration Script

Edit the created migration file:

```python
"""add_image_source_to_generations

Revision ID: 003_add_image_source
Revises: [previous_revision_id]
Create Date: 2025-11-04

"""
from alembic import op
import sqlalchemy as sa

# revision identifiers
revision = '003_add_image_source'
down_revision = '[previous_revision_id]'  # Update this
branch_labels = None
depends_on = None

def upgrade():
    # Step 1: Add column (nullable initially for backfill)
    op.add_column('generations',
                  sa.Column('image_source', sa.VARCHAR(50), nullable=True))

    # Step 2: Backfill existing records (assume all were user uploads)
    op.execute("""
        UPDATE generations
        SET image_source = 'user_upload'
        WHERE image_source IS NULL
    """)

    # Step 3: Make NOT NULL
    op.alter_column('generations', 'image_source', nullable=False)

    # Step 4: Add CHECK constraint
    op.create_check_constraint(
        'check_image_source_valid',
        'generations',
        "image_source IN ('user_upload', 'google_street_view', 'google_satellite')"
    )

    # Step 5: Add index for analytics queries
    op.create_index('idx_generations_image_source',
                    'generations',
                    ['image_source'])

def downgrade():
    op.drop_index('idx_generations_image_source', 'generations')
    op.drop_constraint('check_image_source_valid', 'generations')
    op.drop_column('generations', 'image_source')
```

### 2.3 Run Migration

```bash
# Preview migration
alembic upgrade --sql head

# Apply migration
alembic upgrade head

# Verify
psql $DATABASE_URL -c "\d generations"
# Should see image_source column with CHECK constraint
```

---

## Step 3: Implement MapsService (2 hours)

### 3.1 Create Service File

```bash
cd backend/src/services
touch maps_service.py
```

### 3.2 Implement Basic Structure

```python
# backend/src/services/maps_service.py

import aiohttp
import asyncio
from typing import Optional, Tuple
from dataclasses import dataclass
import structlog
import os

logger = structlog.get_logger()

@dataclass
class Coordinates:
    lat: float
    lng: float

@dataclass
class StreetViewMetadata:
    status: str  # OK, ZERO_RESULTS, NOT_FOUND, ERROR
    pano_id: Optional[str] = None
    date: Optional[str] = None

class MapsServiceError(Exception):
    """Base exception for Maps Service errors"""
    pass

class MapsService:
    """
    Google Maps Platform integration for property image retrieval.

    Supports:
    - Address geocoding
    - Street View imagery (ground-level)
    - Satellite imagery (aerial view)
    """

    def __init__(self, api_key: Optional[str] = None):
        self.api_key = api_key or os.getenv("GOOGLE_MAPS_API_KEY")
        if not self.api_key:
            raise ValueError("GOOGLE_MAPS_API_KEY environment variable not set")

        self.base_url_geocoding = "https://maps.googleapis.com/maps/api/geocode/json"
        self.base_url_streetview = "https://maps.googleapis.com/maps/api/streetview"
        self.base_url_staticmap = "https://maps.googleapis.com/maps/api/staticmap"

    # TODO: Implement async def geocode_address(...)
    # TODO: Implement async def get_street_view_metadata(...)
    # TODO: Implement async def fetch_street_view_image(...)
    # TODO: Implement async def fetch_satellite_image(...)
    # TODO: Implement async def get_property_images(...)
```

### 3.3 Implement Each Method

Copy the full implementation from [research.md lines 924-1137](research.md#python-integration-with-aiohttp-fastapi)

**Key Points**:
- All methods are `async`
- Use `aiohttp.ClientSession()` for HTTP requests
- Implement exponential backoff for retries
- Log all API calls with `structlog`
- Handle errors gracefully (return `None` instead of crashing)

### 3.4 Add to Config

```python
# backend/src/config.py

from pydantic import BaseSettings

class Settings(BaseSettings):
    # ... existing settings ...

    # Google Maps Platform
    google_maps_api_key: str

    class Config:
        env_file = ".env.local"
        case_sensitive = False

settings = Settings()
```

---

## Step 4: Update Generation Endpoint (1 hour)

### 4.1 Make Image Parameter Optional

```python
# backend/src/api/endpoints/generations.py

from typing import Optional
from fastapi import UploadFile, File

@router.post("/", status_code=status.HTTP_201_CREATED)
async def create_generation(
    address: str = Form(...),
    area: str = Form(...),
    style: str = Form(...),
    custom_prompt: Optional[str] = Form(None),
    image: Optional[UploadFile] = File(None),  # ← NOW OPTIONAL
    user: User = Depends(require_verified_email),
    trial_service: TrialService = Depends(get_trial_service)
):
    """
    Create new landscape generation.

    Image upload is now OPTIONAL. If not provided, system will
    automatically fetch imagery from Google Maps Platform APIs.
    """
    # ... existing code ...
```

### 4.2 Add Image Retrieval Logic

```python
# Inside create_generation() function, after payment deduction

from src.services.maps_service import MapsService

# Initialize Maps Service
maps_service = MapsService()

# Determine image source and get image bytes
image_bytes: Optional[bytes] = None
image_source: str = "user_upload"

if image:
    # User uploaded an image - use it
    image_bytes = await image.read()
    image_source = "user_upload"
    logger.info("Using user-uploaded image", user_id=str(user.id))
else:
    # No image uploaded - fetch from Google Maps
    logger.info("No image uploaded, fetching from Google Maps",
                user_id=str(user.id),
                address=address,
                area=area)

    try:
        street_view, satellite = await maps_service.get_property_images(address, area)

        # Prioritize Street View for front_yard, Satellite for other areas
        if area == "front_yard" and street_view:
            image_bytes = street_view
            image_source = "google_street_view"
            logger.info("Using Street View imagery", address=address)
        elif satellite:
            image_bytes = satellite
            image_source = "google_satellite"
            logger.info("Using Satellite imagery", area=area, address=address)
        else:
            # No imagery available - refund and error
            await refund_payment(user.id, payment_method, trial_service, token_service)
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"No imagery available for address: {address}. Please upload an image manually."
            )

    except Exception as e:
        # Refund payment on any error
        logger.exception("Failed to fetch Google Maps imagery", error=str(e))
        await refund_payment(user.id, payment_method, trial_service, token_service)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to retrieve property imagery: {str(e)}"
        )

# Continue with generation using image_bytes...
# Make sure to save image_source to database!
```

### 4.3 Save Image Source to Database

```python
# When creating generation record
generation_id = await db_pool.fetchval("""
    INSERT INTO generations (
        user_id,
        status,
        payment_type,
        tokens_deducted,
        address,
        request_params,
        image_source  -- NEW FIELD
    ) VALUES (
        $1, 'pending', $2, $3, $4,
        jsonb_build_object('area', $5, 'style', $6, 'custom_prompt', $7),
        $8  -- NEW PARAMETER
    ) RETURNING id
""", user.id, payment_method, tokens_deducted, address,
     area, style, custom_prompt,
     image_source)  # ← Add this parameter
```

---

## Step 5: Write Tests (1 hour)

### 5.1 Unit Tests for MapsService

```bash
# Create test file
touch backend/tests/unit/test_maps_service.py
```

```python
# backend/tests/unit/test_maps_service.py

import pytest
from unittest.mock import Mock, patch, AsyncMock
from src.services.maps_service import MapsService, Coordinates

@pytest.mark.asyncio
async def test_geocode_address_valid():
    """Test geocoding valid address returns coordinates"""
    service = MapsService(api_key="test_key")

    with patch('aiohttp.ClientSession.get') as mock_get:
        mock_response = AsyncMock()
        mock_response.status = 200
        mock_response.json = AsyncMock(return_value={
            "status": "OK",
            "results": [{
                "geometry": {
                    "location": {"lat": 37.4224764, "lng": -122.0842499}
                }
            }]
        })
        mock_get.return_value.__aenter__.return_value = mock_response

        coords = await service.geocode_address("1600 Amphitheatre Parkway, Mountain View, CA")

        assert coords is not None
        assert coords.lat == 37.4224764
        assert coords.lng == -122.0842499

@pytest.mark.asyncio
async def test_geocode_address_invalid():
    """Test geocoding invalid address returns None"""
    service = MapsService(api_key="test_key")

    with patch('aiohttp.ClientSession.get') as mock_get:
        mock_response = AsyncMock()
        mock_response.status = 200
        mock_response.json = AsyncMock(return_value={
            "status": "ZERO_RESULTS",
            "results": []
        })
        mock_get.return_value.__aenter__.return_value = mock_response

        coords = await service.geocode_address("Invalid Address 12345")

        assert coords is None

# Add more tests for other methods...
```

### 5.2 Integration Test

```python
# backend/tests/integration/test_maps_integration.py

import pytest
import os
from src.services.maps_service import MapsService

@pytest.mark.integration
@pytest.mark.asyncio
async def test_full_property_image_retrieval():
    """Integration test: Full property image retrieval workflow"""
    api_key = os.getenv("GOOGLE_MAPS_API_KEY")
    if not api_key:
        pytest.skip("GOOGLE_MAPS_API_KEY not set")

    service = MapsService(api_key=api_key)

    # Test with known address (Google headquarters)
    address = "1600 Amphitheatre Parkway, Mountain View, CA"

    street_view, satellite = await service.get_property_images(address, "front_yard")

    # At least one should be available
    assert street_view is not None or satellite is not None

    # Images should be JPEG bytes
    if street_view:
        assert street_view[:4] == b'\xff\xd8\xff\xe0'  # JPEG magic bytes
    if satellite:
        assert satellite[:4] == b'\xff\xd8\xff\xe0'
```

### 5.3 E2E Test with Playwright

```typescript
// frontend/tests/e2e/google-maps-integration.spec.ts

import { test, expect } from '@playwright/test';

test.describe('Google Maps Integration', () => {
  test('should generate front yard design without image upload', async ({ page }) => {
    // Login
    await page.goto('http://localhost:3002/login');
    await page.fill('input[name="email"]', 'e2etest@yarda.ai');
    await page.fill('input[name="password"]', 'TestPass123!');
    await page.click('button:has-text("Sign in")');

    // Wait for redirect to generate page
    await page.waitForURL('**/generate');

    // Fill form WITHOUT uploading image
    await page.fill('input[name="address"]', '1600 Amphitheatre Parkway, Mountain View, CA');
    await page.selectOption('select[name="area"]', 'front_yard');
    await page.selectOption('select[name="style"]', 'modern_minimalist');

    // Submit (should trigger Google Maps fetch)
    await page.click('button:has-text("Generate")');

    // Wait for generation to complete
    await page.waitForSelector('text=/Generation complete/i', { timeout: 90000 });

    // Verify result displayed
    const resultImage = page.locator('img[alt*="landscape"]');
    await expect(resultImage).toBeVisible();
  });

  test('should show error when no imagery available', async ({ page }) => {
    // Login
    await page.goto('http://localhost:3002/login');
    // ... login steps ...

    // Try address with no coverage (fictional)
    await page.fill('input[name="address"]', 'Middle of Nowhere, Antarctica');
    await page.selectOption('select[name="area"]', 'front_yard');
    await page.selectOption('select[name="style"]', 'modern_minimalist');
    await page.click('button:has-text("Generate")');

    // Should show error message
    await expect(page.locator('text=/No imagery available/i')).toBeVisible({ timeout: 15000 });

    // Form should retain values for manual upload retry
    await expect(page.locator('input[name="address"]')).toHaveValue('Middle of Nowhere, Antarctica');
  });
});
```

---

## Step 6: Manual Testing (30 minutes)

### 6.1 Test with Real Addresses

```bash
# Start backend
cd backend
uvicorn src.main:app --port 8000

# Start frontend
cd frontend
npm run dev

# Open browser
open http://localhost:3002
```

**Test Cases**:
1. **Front yard with Street View available**:
   - Address: `1600 Amphitheatre Parkway, Mountain View, CA`
   - Area: `front_yard`
   - Expected: Street View image fetched

2. **Back yard (should use satellite)**:
   - Address: `1 Apple Park Way, Cupertino, CA`
   - Area: `back_yard`
   - Expected: Satellite image fetched

3. **Rural address (limited coverage)**:
   - Address: `123 Remote Lane, Rural Town, MT` (use actual rural address)
   - Expected: May fallback to satellite or show error

4. **Invalid address**:
   - Address: `Not A Real Address 12345`
   - Expected: Error message, credit refunded

### 6.2 Monitor Logs

```bash
# Watch backend logs
tail -f backend/logs/app.log | grep google_maps

# Expected log entries:
# google_maps_api_call api=geocoding address="..." lat=... lng=...
# google_maps_api_call api=street_view_metadata status=OK
# google_maps_api_call api=street_view_image size=...
```

### 6.3 Verify Database

```sql
-- Check generations table
SELECT
    id,
    address,
    image_source,
    status,
    created_at
FROM generations
WHERE created_at > NOW() - INTERVAL '1 hour'
ORDER BY created_at DESC
LIMIT 10;

-- Should see mix of 'user_upload', 'google_street_view', 'google_satellite'
```

---

## Step 7: Monitoring & Cost Tracking (15 minutes)

### 7.1 Set Up Billing Alerts

Visit [Google Cloud Billing Budgets](https://console.cloud.google.com/billing/budgets):

1. Create budget: `$20/month` (well below $200 free tier)
2. Set alerts at:
   - 50% ($10)
   - 90% ($18)
   - 100% ($20)

### 7.2 Monitor API Usage

```bash
# View usage in Cloud Console
# https://console.cloud.google.com/apis/dashboard

# Or use gcloud CLI
gcloud services quota list \
  --service=geocoding-backend.googleapis.com \
  --consumer=projects/YOUR_PROJECT_ID
```

### 7.3 Add Usage Dashboard

Create analytics query in your monitoring tool:

```sql
-- Daily Google Maps API costs
SELECT
    DATE_TRUNC('day', created_at) as day,
    COUNT(CASE WHEN image_source = 'google_street_view' THEN 1 END) * 0.007 as street_view_cost,
    COUNT(CASE WHEN image_source = 'google_satellite' THEN 1 END) * 0.002 as satellite_cost,
    COUNT(CASE WHEN image_source IN ('google_street_view', 'google_satellite') THEN 1 END) * 0.005 as geocoding_cost,
    SUM(
        CASE
            WHEN image_source = 'google_street_view' THEN 0.007 + 0.005
            WHEN image_source = 'google_satellite' THEN 0.002 + 0.005
            ELSE 0
        END
    ) as total_daily_cost
FROM generations
WHERE created_at >= NOW() - INTERVAL '30 days'
GROUP BY DATE_TRUNC('day', created_at)
ORDER BY day DESC;
```

---

## Common Issues & Troubleshooting

### Issue 1: "API key not valid"

**Cause**: API key not enabled for required APIs or restrictions too strict

**Fix**:
```bash
# Verify APIs are enabled
gcloud services list --enabled | grep -E "(geocoding|street-view|static-maps)"

# Update API restrictions
gcloud alpha services api-keys update YOUR_KEY_ID \
  --api-target=service=geocoding-backend.googleapis.com \
  --api-target=service=street-view-image-backend.googleapis.com \
  --api-target=service=static-maps-backend.googleapis.com
```

### Issue 2: "OVER_QUERY_LIMIT" errors

**Cause**: Hitting rate limits (50 req/sec for Geocoding API)

**Fix**:
- Implement rate limiting in application
- Use exponential backoff (already in MapsService)
- Consider caching geocoded addresses

### Issue 3: No Street View imagery for valid address

**Cause**: Not all addresses have Street View coverage

**Fix**:
- This is expected behavior
- System should automatically fallback to satellite
- Check metadata endpoint first to verify availability

### Issue 4: Gray placeholder images

**Cause**: Not using `return_error_code=true` parameter

**Fix**:
```python
# In fetch_street_view_image()
params = {
    # ... other params ...
    'return_error_code': 'true'  # Returns 404 instead of gray image
}
```

---

## Performance Optimization

### Cache Geocoded Addresses

```python
# Add Redis cache for geocoded addresses
from redis import asyncio as aioredis

class MapsService:
    def __init__(self, api_key: str):
        # ... existing init ...
        self.redis = aioredis.from_url("redis://localhost:6379")

    async def geocode_address(self, address: str) -> Optional[Coordinates]:
        # Check cache first
        cache_key = f"geocode:{address}"
        cached = await self.redis.get(cache_key)
        if cached:
            lat, lng = cached.split(",")
            return Coordinates(lat=float(lat), lng=float(lng))

        # Geocode and cache
        coords = await self._geocode_from_api(address)
        if coords:
            await self.redis.setex(
                cache_key,
                86400,  # 24 hour TTL
                f"{coords.lat},{coords.lng}"
            )
        return coords
```

### Parallel Metadata Checks

If generating multiple areas, check metadata in parallel:

```python
# For multi-area generation
metadata_tasks = [
    maps_service.get_street_view_metadata(coords)
    for coords in all_property_coords
]
metadata_results = await asyncio.gather(*metadata_tasks)
```

---

## Next Steps

After completing this implementation:

1. **Run All Tests**: `pytest backend/tests/ && npm test`
2. **Code Review**: Create PR for review
3. **Deployment**:
   - Set `GOOGLE_MAPS_API_KEY` in production environment
   - Restrict API key to production server IPs
   - Enable monitoring and alerts
4. **Documentation**: Update CLAUDE.md with new Google Maps dependency

---

## Resources

- [Google Maps Platform Documentation](https://developers.google.com/maps/documentation)
- [Research Document](research.md) - Full API details
- [Data Model](data-model.md) - Database schema
- [Service Contract](contracts/maps-service.yaml) - API interface spec

**Estimated Total Time**: 4-6 hours (setup to testing complete)
