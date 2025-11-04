# Research & Technical Decisions: Google Maps Property Image Integration

**Feature**: 003-google-maps-integration
**Date**: 2025-11-04
**Status**: Complete

## Overview

This document captures the research findings and technical decisions for implementing automatic property image retrieval from Google Maps Platform APIs. All decisions are informed by the functional requirements in [spec.md](./spec.md) and aligned with constitution principles.

---

## Decision 1: Google Maps Platform APIs for Automatic Property Image Fetching

**Context**: When users don't upload their own property images, the system needs to automatically fetch property imagery from Google Maps Platform APIs based on the provided address.

**Decision**: Use a three-API approach: Geocoding API for address validation, Street View Static API for ground-level imagery (primary), and Maps Static API (satellite view) as fallback when Street View is unavailable.

**Rationale**:
1. **Complete Coverage**: Street View for most addresses, satellite as universal fallback
2. **Cost-Effective**: Metadata endpoint is free, preventing wasted requests
3. **Production-Ready**: Official Google APIs with SLA guarantees
4. **Quality**: High-resolution imagery suitable for landscape design context
5. **Async Integration**: Native support for Python async/await patterns (FastAPI)

### API Component 1: Geocoding API

**Purpose**: Validate and standardize addresses, convert to coordinates

**Request Format**:
```
GET https://maps.googleapis.com/maps/api/geocode/json?address=ADDRESS&key=API_KEY
```

**Key Parameters**:
- `address` (string): Full street address (e.g., "1600 Amphitheatre Parkway, Mountain View, CA")
- `key` (string): Your API key

**Response Structure**:
```json
{
  "results": [
    {
      "formatted_address": "1600 Amphitheatre Pkwy, Mountain View, CA 94043, USA",
      "geometry": {
        "location": {
          "lat": 37.4224764,
          "lng": -122.0842499
        }
      },
      "address_components": [...],
      "place_id": "ChIJ2eUgeAK6j4ARbn5u_wAGqWA"
    }
  ],
  "status": "OK"
}
```

**Status Codes**:
- `OK`: Valid address found
- `ZERO_RESULTS`: No results for address
- `OVER_QUERY_LIMIT`: Quota exceeded
- `REQUEST_DENIED`: API not enabled or invalid key
- `INVALID_REQUEST`: Missing address parameter

**Rate Limits**:
- 3,000 requests per minute
- 50 requests per second (per project)

**Pricing** (2024-2025):
- $5 per 1,000 requests
- $200 monthly credit (until Feb 28, 2025) = ~40,000 free requests/month
- Volume discounts available for 500,000+ monthly requests

### API Component 2: Street View Static API

**Purpose**: Fetch ground-level property images for context-rich landscape design

**Metadata Endpoint** (Check Availability - FREE):
```
GET https://maps.googleapis.com/maps/api/streetview/metadata?location=LAT,LNG&key=API_KEY
```

**Metadata Response**:
```json
{
  "status": "OK",
  "pano_id": "tu510ie_z4ptBZYo2BGEJg",
  "location": {
    "lat": 40.457375,
    "lng": -80.009353
  },
  "date": "2021-05",
  "copyright": "© 2021 Google"
}
```

**Metadata Status Codes**:
- `OK`: Imagery available (proceed with image request)
- `ZERO_RESULTS`: No panorama near location (use satellite fallback)
- `NOT_FOUND`: Address couldn't be resolved
- `OVER_QUERY_LIMIT`: Quota exceeded

**Image Request** (After Metadata Confirms Availability):
```
GET https://maps.googleapis.com/maps/api/streetview?size=600x400&location=LAT,LNG&fov=90&heading=0&pitch=0&key=API_KEY
```

**Key Parameters**:
- `location` (required): Lat/lng coordinates or address string
- `size` (required): Image dimensions, format `{width}x{height}` (max 640x640 standard)
- `key` (required): Your API key
- `fov` (optional): Horizontal field of view in degrees, 0-120 (default: 90)
  - Smaller values = more zoom
  - 90° = natural human vision
  - 120° = wide-angle view
- `heading` (optional): Compass direction 0-360 (default: calculated)
  - 0/360 = North, 90 = East, 180 = South, 270 = West
- `pitch` (optional): Vertical angle -90 to 90 (default: 0)
  - 0 = straight ahead
  - Positive = looking up
  - Negative = looking down
- `radius` (optional): Search radius in meters (default: 50)
- `return_error_code` (optional): Return 404 instead of gray placeholder (default: false)
- `source` (optional): Limit to "default" or "outdoor" imagery

**Best Practices for Residential Addresses**:
1. **Always check metadata first** (free, prevents wasted requests)
2. **Use coordinates over addresses** for faster, more accurate results
3. **Set `return_error_code=true`** to avoid gray placeholder images
4. **Set `radius=50-100`** for residential areas (default 50m may miss some houses)
5. **Calculate heading** to face the property (use coordinates + address components)
6. **Use `fov=90-100`** for balanced property view
7. **Keep `pitch=0` or slightly negative** (-10 to 0) to show more ground/landscape

**Rate Limits**:
- 30,000 requests per minute
- Unsigned requests limited (sign requests for production)

**Pricing** (2024-2025):
- $0.007 per panorama (Standard tier: 0-100,000 requests/month)
- $0.0056 per panorama (Volume tier: 100,001+ requests/month)
- $200 monthly credit (until Mar 1, 2025)
- Maximum image size: 640x640 pixels (standard), higher with Premium Plan

### API Component 3: Maps Static API (Satellite View - Fallback)

**Purpose**: Satellite imagery when Street View unavailable (universal coverage)

**Request Format**:
```
GET https://maps.googleapis.com/maps/api/staticmap?center=LAT,LNG&zoom=ZOOM&size=600x400&maptype=satellite&key=API_KEY
```

**Key Parameters**:
- `center` (required): Lat/lng coordinates or address
- `zoom` (required): Zoom level 0-21+ (higher = more detail)
- `size` (required): Image dimensions `{width}x{height}` (max 640x640 standard)
- `maptype` (required): "satellite" or "hybrid" (satellite + road overlay)
- `key` (required): Your API key
- `scale` (optional): 1, 2, or 4 for high-DPI displays

**Zoom Level Recommendations for Residential Property**:
- **17-18**: Individual buildings clearly visible (recommended for most properties)
- **19-20**: Maximum detail in well-covered areas (US, Europe)
- **21**: Street-level detail (available in major cities)
- **15-16**: Neighborhood context (too far for landscape design)

**Quality Considerations**:
- Satellite imagery quality varies by location
- Best coverage: US, Europe, major cities worldwide
- Rural/remote areas may have lower max zoom
- Imagery age varies (updated every 1-3 years)

**Map Types**:
- `satellite`: Pure satellite imagery
- `hybrid`: Satellite + transparent road/label overlay (recommended for context)
- `roadmap`: Vector map (not useful for landscape design)
- `terrain`: Topographic map

**Rate Limits**:
- Same as Maps JavaScript API (varies by plan)
- Default: 28,500 requests per day

**Pricing** (2024-2025):
- $2 per 1,000 requests (Static Maps SKU)
- $200 monthly credit (until Mar 1, 2025)

### Authentication & Security

**API Key Management**:
```bash
# Environment variable (never commit to git)
GOOGLE_MAPS_API_KEY=AIzaSy...
```

**Application Restrictions** (Required for Production):
```
IP addresses (server-side): Restrict to production server IPs
- e.g., 34.123.45.67, 34.123.45.68
```

**API Restrictions** (Principle of Least Privilege):
```
Restrict key to only required APIs:
- Geocoding API
- Street View Static API
- Maps Static API
```

**Security Best Practices**:
1. **Never expose API key in frontend code** (server-side only)
2. **Use separate keys for dev/staging/prod** environments
3. **Set daily quota limits** in Cloud Console (e.g., 10,000 req/day)
4. **Enable billing alerts** (notify at 50%, 90%, 100% of budget)
5. **Monitor usage daily** via Google Cloud Console
6. **Rotate keys quarterly** or after security incidents
7. **Use request signing** for additional security (optional)

**Monitoring Usage**:
```python
# Log every API call for debugging and quota tracking
import structlog
logger = structlog.get_logger()

async def fetch_street_view(lat: float, lng: float):
    logger.info("google_maps_api_call",
                api="street_view_metadata",
                lat=lat,
                lng=lng)
    # ... API call
```

### Error Handling

**Common Error Codes**:

| Error Code | API | Meaning | Retry Strategy |
|------------|-----|---------|----------------|
| `OVER_QUERY_LIMIT` | All | Quota exceeded | Exponential backoff (2s, 4s, 8s), check quota type |
| `OVER_DAILY_LIMIT` | All | Daily quota exhausted | Don't retry, alert admin, graceful degradation |
| `REQUEST_DENIED` | All | API not enabled or invalid key | Don't retry, check API configuration |
| `INVALID_REQUEST` | All | Missing parameters | Don't retry, fix request parameters |
| `ZERO_RESULTS` | Geocoding, Street View | No data for location | Don't retry, try fallback API |
| `UNKNOWN_ERROR` | All | Server error | Retry up to 3 times with exponential backoff |
| `NOT_FOUND` | Street View | Address couldn't be resolved | Use Geocoding API first |
| 429 | All | Rate limit (too many req/sec) | Exponential backoff, reduce request rate |
| 404 | Street View | No imagery (if `return_error_code=true`) | Use satellite fallback |

**Quota Determination** (When `OVER_QUERY_LIMIT` Occurs):
```python
# As per Google documentation:
# 1. Wait 2 seconds, retry same request
# 2. If still OVER_QUERY_LIMIT: Daily limit exceeded
# 3. If success: Per-second rate limit (slow down requests)
```

**Exponential Backoff Implementation**:
```python
import asyncio
from typing import Optional

async def retry_with_backoff(func, max_retries=3, base_delay=2):
    """Retry API call with exponential backoff"""
    for attempt in range(max_retries):
        try:
            return await func()
        except QuotaExceededError as e:
            if attempt == max_retries - 1:
                raise  # Final attempt failed

            delay = base_delay * (2 ** attempt)  # 2s, 4s, 8s
            logger.warning(f"Quota exceeded, retrying in {delay}s",
                         attempt=attempt + 1)
            await asyncio.sleep(delay)

    raise MaxRetriesExceededError("API call failed after retries")
```

**Graceful Degradation**:
```python
async def fetch_property_image(address: str) -> Optional[bytes]:
    """Fetch property image with fallback chain"""
    try:
        # 1. Geocode address
        coords = await geocode_address(address)

        # 2. Try Street View (check metadata first - FREE)
        metadata = await get_street_view_metadata(coords)
        if metadata.status == "OK":
            return await fetch_street_view_image(coords)

        # 3. Fallback to satellite
        logger.info("Street View unavailable, using satellite fallback")
        return await fetch_satellite_image(coords)

    except DailyQuotaExceeded:
        logger.error("Google Maps quota exhausted, degrading gracefully")
        return None  # Display placeholder or user upload prompt

    except Exception as e:
        logger.exception("Failed to fetch property image", error=str(e))
        return None
```

### Python Integration with aiohttp (FastAPI)

**Recommended Libraries**:
1. **aiohttp** (async HTTP client) - Primary choice for FastAPI
2. **googlemaps** (official Google client) - Sync only, not ideal for FastAPI
3. **async_googlemaps** (community async wrapper) - Alternative

**Installation**:
```bash
pip install aiohttp
```

**Complete Implementation Example**: See full code in research document lines 924-1137

### Production Checklist

**Before Launch**:
- [ ] API keys created and restricted (IP + API restrictions)
- [ ] Environment variables configured (`GOOGLE_MAPS_API_KEY`)
- [ ] Billing account enabled with payment method
- [ ] Daily quota limits set (e.g., 10,000 requests/day)
- [ ] Billing alerts configured (50%, 90%, 100%)
- [ ] Error logging implemented (structlog or similar)
- [ ] Retry logic with exponential backoff tested
- [ ] Graceful degradation tested (quota exhausted scenario)
- [ ] Image caching implemented (avoid re-fetching same address)
- [ ] Metadata pre-check implemented (free, prevents wasted requests)
- [ ] Rate limiting per user (prevent abuse)

**Cost Estimation** (Example: 1,000 property lookups/month):
```
Scenario: User provides address, system fetches image automatically

1. Geocoding: 1,000 requests × $0.005 = $5.00
2. Street View Metadata: 1,000 requests × $0 = $0 (FREE)
3. Street View Images (80% availability): 800 × $0.007 = $5.60
4. Satellite Fallback (20% unavailable): 200 × $0.002 = $0.40

Total: $11.00/month (within $200 free tier)

At scale (10,000 properties/month): ~$110/month
```

### Alternatives Considered

**Alternative 1: Mapbox Static Images API**
- ❌ Lower street-level imagery coverage than Google
- ❌ No Street View equivalent (only satellite/map tiles)
- ✅ Better satellite imagery quality in some regions
- ✅ $0.50 per 1,000 requests (cheaper than Google)

**Alternative 2: Bing Maps Static API**
- ❌ Lower global coverage than Google
- ❌ Inferior Street View (Streetside) availability
- ✅ Similar pricing to Google
- ❌ Less mature Python SDK ecosystem

**Alternative 3: Apple Maps API**
- ❌ No static image API (requires MapKit JS, client-side only)
- ❌ iOS-centric, poor server-side support
- ❌ Limited street-level imagery

**Alternative 4: OpenStreetMap + Custom Imagery**
- ❌ No street-level imagery (only map tiles)
- ❌ Would require separate imagery source
- ✅ Free and open-source
- ❌ Complex setup for satellite imagery

**Decision**: Google Maps Platform is the clear winner for this use case due to:
1. Best global Street View coverage (billions of images)
2. High-quality satellite imagery
3. Mature Python ecosystem (aiohttp integration)
4. Reliable SLA and support
5. Reasonable pricing with $200 monthly credit

### Test Coverage

**Unit Tests**:
- TC-GMAPS-1.1: Geocoding valid address → returns coordinates
- TC-GMAPS-1.2: Geocoding invalid address → returns None, status=ZERO_RESULTS
- TC-GMAPS-2.1: Street View metadata for covered address → status=OK
- TC-GMAPS-2.2: Street View metadata for uncovered address → status=ZERO_RESULTS
- TC-GMAPS-3.1: Street View image fetch → returns JPEG bytes
- TC-GMAPS-4.1: Satellite image fetch → returns JPEG bytes
- TC-GMAPS-5.1: Full property image fetch (with Street View) → returns Street View image
- TC-GMAPS-5.2: Full property image fetch (without Street View) → falls back to satellite

**Integration Tests**:
- TC-GMAPS-INT-1: Quota exceeded (429) → exponential backoff, retry succeeds
- TC-GMAPS-INT-2: Daily quota exhausted → graceful degradation, returns None
- TC-GMAPS-INT-3: Network timeout → retry with backoff, eventually fails
- TC-GMAPS-INT-4: Invalid API key → REQUEST_DENIED, don't retry

**Load Tests**:
- TC-GMAPS-LOAD-1: 100 parallel address lookups → all complete successfully
- TC-GMAPS-LOAD-2: Rate limit stress test → backoff prevents 429 errors

---

**Document Status**: ✅ Complete | All technical decisions finalized
**Next Phase**: Data Model Design (data-model.md)
