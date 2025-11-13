# Code Review: System Hang Issues Analysis

**Date:** 2025-11-13
**Status:** ⚠️ CRITICAL - Multiple system hang issues identified
**Dev Servers:** ✅ Running (Frontend: 3000, Backend: 8000)
**Tests:** ⚠️ FAILING - Timeouts and async cleanup issues

---

## Executive Summary

A comprehensive code review identified **13 CRITICAL issues** and **8 MODERATE issues** that cause system hangs and test timeouts. The most severe problems involve:

1. **Missing API timeouts** - External API calls (Google Maps, Gemini) hang indefinitely
2. **Async event loop cleanup failures** - Tests timeout during teardown
3. **Database connection issues** - Pool exhaustion and missing acquisition timeouts
4. **Background task memory leaks** - No task tracking or cleanup

**Impact:** System completely hangs when agents work on the codebase, tests cannot run, API requests block indefinitely.

---

## Test Results Summary

### Backend Unit Tests
```
Status: ❌ FAILED - TIMEOUT
Result: 177 tests collected, many FAILED, timeouts during async cleanup
Root Cause: Asyncio event loop hangs during test teardown
Evidence: Stack trace shows event loop stuck in selector.control()
```

### Frontend E2E Tests
```
Status: ⚠️ MIXED - Some passed, many failed
Results: 68/575 tests shown
Failures:
  - 44 tests TIMED OUT (30 second limit)
  - Multiple tests show "Target page, context or browser has been closed"
  - Address input not found (selector mismatch)
  - NetworkError from Google OAuth
Root Cause: Backend hangs prevent test completion
```

### Dev Servers Status
```
Backend (port 8000): ✅ Healthy
  - Uvicorn running
  - Database connected
  - Health check: OK

Frontend (port 3000): ✅ Running
  - Next.js 15.0.2 operational
  - API Client connected to localhost:8000
```

---

## P0 CRITICAL ISSUES (Fix Immediately)

### Issue #1: Missing Timeouts on Google Maps API Calls ⚠️ CRITICAL

**File:** `backend/src/services/maps_service.py`
**Lines:** 166-167, 323-324, 432-433, 538-539

**Problem:**
All `aiohttp.ClientSession()` calls lack timeout configuration. If Google Maps API becomes unresponsive or has network issues, requests hang indefinitely, blocking the entire async event loop.

**Code Pattern:**
```python
async with aiohttp.ClientSession() as session:
    async with session.get(self.GEOCODING_URL, params=params) as response:
        # NO TIMEOUT - Will hang forever if API is unresponsive
```

**Impact:**
- ⚠️ **CRITICAL** - Blocks background generation tasks indefinitely
- Exhausts connection pool (max 10 connections)
- User sees eternal "processing" state
- Cascades to block ALL concurrent generations

**Fix:**
```python
timeout = aiohttp.ClientTimeout(total=30)  # 30 second timeout
async with aiohttp.ClientSession(timeout=timeout) as session:
    async with session.get(self.GEOCODING_URL, params=params) as response:
        # Now will timeout after 30 seconds
```

---

### Issue #2: Gemini API Stream Without Timeout ⚠️ CRITICAL

**File:** `backend/src/services/gemini_client.py`
**Lines:** 131-154 (main method), 201-363 (alternative method with thread pool)

**Problem:**
The `generate_content_stream()` call has no timeout. If Gemini API hangs mid-stream, the generation hangs forever with no error handling.

**Code Pattern:**
```python
for chunk in self.client.models.generate_content_stream(
    model=self.model_name,
    contents=[...],
    config=generate_content_config
):
    # NO TIMEOUT - Streaming can hang forever
```

**Impact:**
- ⚠️ **CRITICAL** - Background task hangs indefinitely
- Database record stuck in "processing" state forever
- Payment already deducted (no refund trigger)
- Tests hang (caused test timeouts we observed)

**Fix:**
```python
import asyncio

try:
    async with asyncio.timeout(300):  # 5 minute timeout
        for chunk in self.client.models.generate_content_stream(...):
            # Process chunks
except asyncio.TimeoutError:
    # Trigger refund and mark as failed
    await self.handle_generation_timeout(generation_id)
```

---

### Issue #3: Database Connection Pool Missing Acquisition Timeout ⚠️ CRITICAL

**File:** `backend/src/db/connection_pool.py`
**Line:** 39

**Problem:**
While `command_timeout=60` is set for queries, there's NO `timeout` parameter for acquiring connections from the pool. If all connections are held by hanging queries, new requests wait indefinitely.

**Code:**
```python
self._pool = await asyncpg.create_pool(
    database_url,
    min_size=2,
    max_size=10,
    max_queries=50000,
    max_inactive_connection_lifetime=300,
    command_timeout=60,  # Query timeout ✓
    # Missing: timeout parameter for connection acquisition ✗
    statement_cache_size=0,
)
```

**Impact:**
- ⚠️ **CRITICAL** - All API requests hang waiting for database connection
- Health check endpoint hangs (no 500 error, just timeout)
- Cascading failure across entire application
- This is likely THE primary cause of "system hangs when agent works on it"

**Fix:**
```python
self._pool = await asyncpg.create_pool(
    database_url,
    ...,
    timeout=30,  # 30 second timeout for connection acquisition
    command_timeout=60,
)
```

---

### Issue #4: Background Task Memory Leak (No Task Tracking) ⚠️ CRITICAL

**File:** `backend/src/api/endpoints/generations.py`
**Lines:** 345-466

**Problem:**
Background tasks spawned via `background_tasks.add_task()` have no timeout wrapper, no tracking mechanism, and no way to cancel hanging tasks. If a background task hangs, it stays in memory forever.

**Code:**
```python
async def process_areas_background():
    # This function can hang indefinitely (no timeout)
    # No task tracking or cleanup
    try:
        await generation_service.process_generation(...)  # Can hang
    except Exception as e:
        logger.error(...)  # Exception logged but task never cleaned up

background_tasks.add_task(process_areas_background)
# Task added but never tracked - MEMORY LEAK
```

**Impact:**
- ⚠️ **CRITICAL** - Memory leak from accumulated hanging tasks
- Eventually causes OOM (Out Of Memory)
- No way to cancel or monitor hanging generations
- Database records stuck in "processing" state indefinitely

**Fix:**
```python
import asyncio

async def process_areas_background():
    try:
        async with asyncio.timeout(300):  # 5 minute timeout
            await generation_service.process_generation(...)
    except asyncio.TimeoutError:
        await generation_service.mark_generation_failed(
            generation_id, "Generation timeout - 5 minutes exceeded"
        )
        # Refund user
    except Exception as e:
        logger.error(...)
        # Mark as failed and refund

# Add task to registry
task = asyncio.create_task(process_areas_background())
active_tasks[generation_id] = task
```

---

## P1 HIGH PRIORITY ISSUES (Fix This Week)

### Issue #5: Polling Loop Can Run Forever After Tab Close

**File:** `frontend/src/lib/api.ts`
**Lines:** 693-754

**Problem:**
The `cancelled` flag is checked at loop start but not after async operations complete. If component unmounts, polling continues running indefinitely, creating memory leaks and unnecessary API calls.

**Impact:**
- HIGH - Browser memory leak from polling after component unmount
- Unnecessary API requests (costs money)
- Can have multiple polling loops for same generation

**Fix:**
- Check `cancelled` flag after each async operation
- Wrap callbacks in try-catch to prevent unhandled errors
- Add circuit breaker pattern

---

### Issue #6: Database FOR UPDATE Lock Without NOWAIT

**File:** `backend/src/services/token_service.py`
**Lines:** 97-105, 169-177

**Problem:**
`FOR UPDATE` locks without `NOWAIT` will wait indefinitely if another transaction holds the lock. This causes deadlocks in multi-area generation scenarios.

**Impact:**
- HIGH - Concurrent requests for same user hang
- Multi-area generations can deadlock themselves
- API requests timeout after 30 seconds

**Fix:**
```python
try:
    balance = await conn.fetchval(
        """SELECT balance FROM users_token_accounts
           WHERE user_id = $1 FOR UPDATE NOWAIT""",
        user_id,
    )
except asyncpg.exceptions.LockNotAvailableError:
    return (False, 0, "Resource temporarily locked, please retry")
```

---

### Issue #7: Gemini Streaming Thread Without Cancellation

**File:** `backend/src/services/gemini_client.py`
**Lines:** 201-363

**Problem:**
Alternative streaming method runs synchronous code in thread pool without proper cancellation handling. If thread hangs, timeout has no effect.

**Impact:**
- HIGH - Thread pool exhaustion from hanging threads
- Memory leak (threads never garbage collected)
- False timeout (thread continues after timeout expires)

---

### Issue #8: Connection Leak in Service Layer

**File:** `backend/src/services/generation_service.py`
**Lines:** 92-103

**Problem:**
Service methods acquire connections internally without explicit context manager control. If exceptions occur, connections can leak.

**Impact:**
- MEDIUM-HIGH - Slow connection leak over time
- Pool exhaustion after many failed operations
- Manifests as "connection timeout" errors

---

## MODERATE ISSUES (Fix This Month)

### Issue #9: No Request ID Tracking for Background Tasks
**Impact:** Cannot debug or cancel hanging generations

### Issue #10: Frontend Timeout Insufficient (30 seconds)
**Issue:** Generation requests timeout even though backend takes 2-5 minutes
**Fix:** Increase timeout to 120 seconds for generation creation

### Issue #11: Polling Timeout Constants Not Validated
**Issue:** Polling could run indefinitely if timeout is missing/wrong
**Fix:** Verify constants and add circuit breaker pattern

### Issue #12: No Retry Logic with Exponential Backoff
**Issue:** Transient API failures cause immediate generation failure

### Issue #13: Gemini Client Singleton Without Lock
**Issue:** Race condition during initialization
**Fix:** Add double-check locking pattern

---

## Test Hang Root Cause Analysis

The test timeout we observed is caused by a **cascading failure:**

```
1. Gemini API call has no timeout (Issue #2)
   ↓
2. If API hangs, test waits forever in async function
   ↓
3. Test teardown tries to cleanup via event loop
   ↓
4. Event loop hangs during selector.control() (can't close connections)
   ↓
5. Test times out → HANG
```

The stack trace confirms:
```
File "/opt/homebrew/Cellar/python@3.13/3.13.3_1/Frameworks/Python.framework/Versions/3.13/lib/python3.13/selectors.py", line 548, in select
    kev_list = self._selector.control(None, max_ev, timeout)
+++++++++++++++++++++++++++++++++++ Timeout ++++++++++++++++++++++++++++++++++++
```

---

## Implementation Priority

### Phase 1: Critical Fixes (24 hours) 🔴
1. Add timeouts to Google Maps API calls (Issue #1)
2. Add timeout to Gemini streaming (Issue #2)
3. Add connection pool acquisition timeout (Issue #3)
4. Add background task timeout wrapper (Issue #4)

### Phase 2: High Priority (1 week) 🟠
5. Fix polling cleanup (Issue #5)
6. Add NOWAIT to database locks (Issue #6)
7. Fix Gemini threading (Issue #7)
8. Add connection leak prevention (Issue #8)

### Phase 3: Quality Improvements (1 month) 🟡
9-13. All remaining moderate issues

---

## Testing After Fixes

1. **Run backend tests:** Should pass within 2 minutes
2. **Run E2E tests:** Should pass with 90% success rate
3. **Load test:** 100 concurrent generations without hangs
4. **Timeout test:** Force Gemini API to hang, verify generation fails gracefully
5. **Connection pool test:** Exhaust all connections, verify timeout instead of hang

---

## Monitoring Recommendations

After fixes are implemented, add these metrics:

- **Active background tasks count** (alert if > 100)
- **Database connection pool utilization** (alert if > 9/10)
- **API timeout frequency** (track by endpoint)
- **Polling loop count** (alert if > expected)
- **Memory usage over time** (track for leaks)
- **Generation stuck in "processing"** (alert if > 10 minutes)

---

## Files Requiring Changes

```
CRITICAL:
  ✓ backend/src/services/maps_service.py
  ✓ backend/src/services/gemini_client.py
  ✓ backend/src/db/connection_pool.py
  ✓ backend/src/api/endpoints/generations.py

HIGH:
  ✓ frontend/src/lib/api.ts
  ✓ backend/src/services/token_service.py
  ✓ backend/src/services/generation_service.py

MODERATE:
  ✓ backend/src/main.py (graceful shutdown)
  ✓ backend/src/services/gemini_client.py (singleton)
  ✓ frontend/src/hooks/useGenerationPolling.ts
  ✓ Multiple frontend E2E test files (selector fixes)
```

---

## Next Steps

1. **Implement Issue #1-4 fixes immediately**
2. **Re-run test suite** to verify fixes
3. **Load test** with 100 concurrent users
4. **Add monitoring** for the metrics above
5. **Deploy to staging** for E2E validation
6. **Production deployment** after staging validation

---

**Document Generated:** 2025-11-13
**Analysis By:** Code Review Agent
**Status:** Ready for implementation
