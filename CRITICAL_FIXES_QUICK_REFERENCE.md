# Critical Fixes Quick Reference

## P0 Issues - Exact Fixes Required

### Fix #1: Google Maps API Timeouts

**File:** `backend/src/services/maps_service.py`

**Add this import at the top:**
```python
import aiohttp
```

**Find all these sections and add timeout:**

```python
# BEFORE (Lines 166-167):
async with aiohttp.ClientSession() as session:
    async with session.get(self.GEOCODING_URL, params=params) as response:

# AFTER:
timeout = aiohttp.ClientTimeout(total=30)
async with aiohttp.ClientSession(timeout=timeout) as session:
    async with session.get(self.GEOCODING_URL, params=params) as response:
```

**Locations to fix:**
- Line ~166 (geocoding)
- Line ~323 (Street View metadata)
- Line ~432 (Street View image)
- Line ~538 (static map)

---

### Fix #2: Gemini API Streaming Timeout

**File:** `backend/src/services/gemini_client.py`

**Method 1 - Main streaming method (RECOMMENDED):**

```python
# Add import at top:
import asyncio

# BEFORE (lines 131-154):
def generate_landscape_design_streaming(
    self,
    original_image_base64: str,
    style: str,
    custom_prompt: Optional[str] = None,
    area: Optional[str] = None,
    address: Optional[str] = None,
):
    """Generate landscape design with real-time streaming."""

    # Build prompt
    if area:
        area_prefix = self._get_area_prefix(area)
    else:
        area_prefix = ""

    # ... rest of method ...

    for chunk in self.client.models.generate_content_stream(
        model=self.model_name,
        contents=[...],
        config=generate_content_config
    ):
        # Process chunks...

# AFTER:
def generate_landscape_design_streaming(
    self,
    original_image_base64: str,
    style: str,
    custom_prompt: Optional[str] = None,
    area: Optional[str] = None,
    address: Optional[str] = None,
    timeout: int = 300,  # 5 minute timeout
):
    """Generate landscape design with real-time streaming."""

    async def stream_with_timeout():
        try:
            async with asyncio.timeout(timeout):
                for chunk in self.client.models.generate_content_stream(
                    model=self.model_name,
                    contents=[...],
                    config=generate_content_config
                ):
                    yield chunk
        except asyncio.TimeoutError:
            logger.error(f"Generation timeout after {timeout} seconds")
            raise TimeoutError(f"Image generation exceeded {timeout} second timeout")

    return stream_with_timeout()
```

---

### Fix #3: Database Connection Pool Timeout

**File:** `backend/src/db/connection_pool.py`

**BEFORE (Line 39):**
```python
self._pool = await asyncpg.create_pool(
    database_url,
    min_size=2,
    max_size=10,
    max_queries=50000,
    max_inactive_connection_lifetime=300,
    command_timeout=60,
    statement_cache_size=0,
)
```

**AFTER:**
```python
self._pool = await asyncpg.create_pool(
    database_url,
    min_size=2,
    max_size=10,
    max_queries=50000,
    max_inactive_connection_lifetime=300,
    timeout=30,  # ← ADD THIS LINE (30 second timeout for acquiring connection)
    command_timeout=60,
    statement_cache_size=0,
)
```

---

### Fix #4: Background Task Timeout Wrapper

**File:** `backend/src/api/endpoints/generations.py`

**BEFORE (Lines 345-466):**
```python
async def process_areas_background():
    # Long running task
    try:
        for area in generation_request.areas:
            # ... processing ...
            await generation_service.process_generation(
                generation_id,
                request_id,
                area,
                area_index
            )
    except Exception as e:
        logger.error(f"Background generation failed: {e}")

background_tasks.add_task(process_areas_background)
```

**AFTER:**
```python
async def process_areas_background():
    """Process generation with timeout wrapper."""
    generation_id = str(generation_request.generation_id)

    try:
        # 5 minute timeout for entire generation process
        async with asyncio.timeout(300):
            for area in generation_request.areas:
                # ... processing ...
                await generation_service.process_generation(
                    generation_id,
                    request_id,
                    area,
                    area_index
                )
    except asyncio.TimeoutError:
        logger.error(f"Generation {generation_id} timeout - exceeded 5 minutes")
        # Mark as failed
        try:
            await generation_service.update_generation_status(
                generation_id,
                "failed",
                error_message="Generation timeout - exceeded 5 minute limit"
            )
            # Refund user
            await trial_service.refund_trial_credit(user_id)
        except Exception as refund_error:
            logger.error(f"Failed to refund user {user_id}: {refund_error}")
    except Exception as e:
        logger.error(f"Background generation failed: {e}")
        # Mark as failed and refund
        try:
            await generation_service.update_generation_status(
                generation_id,
                "failed",
                error_message=str(e)
            )
            await trial_service.refund_trial_credit(user_id)
        except Exception as refund_error:
            logger.error(f"Failed to refund user {user_id}: {refund_error}")

# Add task to background
background_tasks.add_task(process_areas_background)
```

---

## Implementation Order

1. **Fix #3 first** (connection pool) - Most impactful, simplest change
2. **Fix #1 second** (Maps API timeouts) - Critical for preventing hangs
3. **Fix #2 third** (Gemini timeout) - Critical for preventing test hangs
4. **Fix #4 fourth** (background task wrapper) - Prevents memory leaks

---

## Testing After Each Fix

```bash
# After Fix #3 (Connection Pool):
curl http://localhost:8000/health
# Should return: {"status":"healthy","database":"connected",...}

# After Fix #1 (Maps Timeout):
# Run a single generation test - should timeout gracefully after 30s

# After Fix #2 (Gemini Timeout):
pytest tests/unit/test_maps_service.py -v

# After Fix #4 (Background Timeout):
pytest tests/integration/ -v --timeout=60
```

---

## Estimated Implementation Time

- **Fix #1:** 5 minutes (4 locations to update)
- **Fix #2:** 10 minutes (wrap streaming call)
- **Fix #3:** 1 minute (add one line)
- **Fix #4:** 15 minutes (add try-except and refund logic)

**Total:** ~30 minutes for all P0 fixes

---

## Verification Checklist

After implementing all 4 fixes:

- [ ] Backend tests run without timeout errors
- [ ] E2E tests run without hanging
- [ ] Forced API timeout is handled gracefully
- [ ] Database connection doesn't exhaust on concurrent requests
- [ ] Background tasks complete or timeout properly
- [ ] No memory leaks from hanging connections
- [ ] Health check endpoint responds within 5 seconds
- [ ] Generation requests have proper error messages on timeout

---

## Rollback Plan

If issues occur during implementation:

```bash
# Rollback to previous version
git checkout backend/src/services/maps_service.py
git checkout backend/src/services/gemini_client.py
git checkout backend/src/db/connection_pool.py
git checkout backend/src/api/endpoints/generations.py

# Restart servers
pkill -f uvicorn
pkill -f "npm run dev"
```

---

**Critical:** These 4 fixes must be implemented together for full effectiveness.
Each fix addresses a different hang scenario, and all 4 are needed to prevent system hangs.
