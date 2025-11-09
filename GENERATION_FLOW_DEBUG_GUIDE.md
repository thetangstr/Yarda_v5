# Image Generation Flow - Debug Integration Guide

This document outlines where debug logging should be added to track the 5-step image generation process.

## Steps and Debug Points

### Step 1: Address Validation (Google Maps API)
**File:** `backend/src/services/generation_service.py` → `create_generation()`

```python
debug_service.log(generation_id, 'address_validation', 'info', 'Validating address via Google Maps API...')
# After validation succeeds:
debug_service.log(generation_id, 'address_validation', 'success', f'Address validated: {address}')
```

### Step 2: Fetch Street View Image

**File:** `backend/src/services/generation_service.py` → `create_generation()`

```python
debug_service.log(generation_id, 'google_maps_api_call', 'info', 'Fetching Street View image...')
# After successful retrieval:
debug_service.log(generation_id, 'street_view_retrieved', 'success', 'Street View image retrieved')
# For satellite/backyard:
debug_service.log(generation_id, 'satellite_image_retrieved', 'success', 'Satellite image retrieved')
```

### Step 3: Display Thumbnails

**File:** `frontend/src/components/generation/GenerationProgress.tsx`

```typescript
debug_service.log(generation_id, 'images_displayed', 'success', 'Street View and Satellite thumbnails displayed')
```

### Step 4: Call Gemini API for Image Generation

**File:** `backend/src/services/generation_service.py` → `process_generation()`

```python
debug_service.log(generation_id, 'gemini_api_call', 'info', f'Calling Gemini for {area_type} with style {style}')
# After gemini_client.generate_landscape_design():
debug_service.log(generation_id, 'image_generation_complete', 'success', 'Generated image from Gemini')
```

### Step 5: Display Generated Image

**File:** `frontend/src/components/generation/GenerationProgress.tsx`

```typescript
debug_service.log(generation_id, 'image_displayed', 'success', 'Generated image displayed to user')
```

## Current Issues to Debug

1. **Error Message:** "Could not establish connection. Receiving end does not exist."
   - This appears to be a content script connection error from browser extension
   - Check: Is the backend API properly responding to generation requests?

2. **Missing Logging**
   - No way to track where in the 5-step flow the generation is failing
   - Debug panel will show step progress once logging is added

## How to Test

1. Navigate to /generate page
2. You should see a "DEBUG PANEL" button in the bottom-right corner
3. Click to expand it
4. Submit a generation request
5. Watch the step progress bar and logs appear in real-time

## Next Steps

1. Add `debug_service` import to generation endpoints and services
2. Add log calls at each step
3. Test end-to-end generation with debug panel open
4. Identify where the flow breaks (which step fails)
