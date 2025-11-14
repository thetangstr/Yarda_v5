# ADR 001: Connection Pool Pattern

**Status:** Accepted
**Date:** 2025-11-06
**Author:** Backend Team
**Deciders:** Engineering Team

---

## Context

FastAPI applications need efficient database connection management for high-performance async operations. Multiple approaches exist:

1. **Per-request connections:** Create new connection for each request
2. **Global connection pool:** Single pool shared across all requests
3. **Connection-per-worker:** Each Uvicorn worker has its own pool
4. **ORM-based:** Use SQLAlchemy async session management

### Requirements

- Support async/await operations (asyncpg)
- Handle concurrent requests efficiently
- Minimize connection overhead
- Graceful startup/shutdown
- Transaction support for atomic operations

---

## Decision

We will use a **single global connection pool** managed via FastAPI lifespan context.

**Implementation:**
```python
# backend/src/db/connection_pool.py
import asyncpg

class DatabasePool:
    def __init__(self, dsn: str):
        self.dsn = dsn
        self._pool = None

    async def initialize(self):
        self._pool = await asyncpg.create_pool(
            dsn=self.dsn,
            min_size=10,
            max_size=20,
            command_timeout=60
        )

    async def close(self):
        await self._pool.close()

    async def transaction(self):
        return self._pool.acquire()

# Global instance
db_pool = DatabasePool(DATABASE_URL)
```

```python
# backend/src/main.py
from contextlib import asynccontextmanager

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    await db_pool.initialize()
    yield
    # Shutdown
    await db_pool.close()

app = FastAPI(lifespan=lifespan)
```

---

## Consequences

### Positive

1. **Performance:** Connection pooling reduces overhead of creating new connections
2. **Resource efficiency:** Reuses existing connections instead of opening/closing constantly
3. **Scalability:** Handles concurrent requests by maintaining pool of ready connections
4. **Simple API:** Services use `async with db_pool.transaction()` consistently
5. **Lifespan management:** FastAPI ensures proper initialization and cleanup

### Negative

1. **Global state:** Single global pool instance (anti-pattern in some contexts)
2. **Configuration complexity:** Pool size tuning required based on load
3. **Connection limits:** Must stay within Supabase connection limits (100 free tier)

### Neutral

1. **Learning curve:** Developers must understand connection pool behavior
2. **Testing:** Requires separate test pool or mocking for unit tests

---

## Alternatives Considered

### Alternative 1: Per-Request Connections

**Approach:**
```python
async def get_db():
    conn = await asyncpg.connect(DATABASE_URL)
    try:
        yield conn
    finally:
        await conn.close()
```

**Rejected because:**
- High overhead of opening/closing connections
- Poor performance under load
- Wastes resources

### Alternative 2: SQLAlchemy Async

**Approach:**
```python
from sqlalchemy.ext.asyncio import create_async_engine

engine = create_async_engine(DATABASE_URL)
```

**Rejected because:**
- Unnecessary abstraction layer (ORM not needed)
- Adds complexity and dependencies
- Slower than raw asyncpg
- Team prefers raw SQL for clarity

### Alternative 3: Connection-Per-Worker

**Approach:**
Each Uvicorn worker process maintains its own connection pool.

**Rejected because:**
- More complex setup
- Harder to monitor total connections
- Risk of exceeding connection limits with multiple workers

---

## Related Decisions

- [ADR 002: Single-Page Flow](002-single-page-flow.md) - Uses connection pool for polling
- [ADR 003: Atomic Operations](003-atomic-operations-with-locking.md) - Transaction pattern

---

## Implementation

**Files:**
- `backend/src/db/connection_pool.py` - Pool class and global instance
- `backend/src/main.py` - Lifespan context manager
- `backend/src/services/*.py` - Services using pool via dependency injection

**Service Usage Example:**
```python
class TrialService:
    def __init__(self, db_pool: DatabasePool):
        self.db_pool = db_pool

    async def use_trial_credit(self, user_id: str):
        async with self.db_pool.transaction() as conn:
            user = await conn.fetchrow(
                "SELECT trial_remaining FROM users WHERE id = $1 FOR UPDATE NOWAIT",
                user_id
            )
            # ... business logic
```

---

## Monitoring

**Metrics to track:**
- Active connections in pool
- Connection acquisition time
- Query execution time
- Connection errors/timeouts

**Logging:**
```python
import logging
logger = logging.getLogger(__name__)

# Log pool status
logger.info(f"Pool size: {pool._pool._holders}")
```

---

## Future Considerations

1. **Connection pool tuning:** Adjust min/max size based on production metrics
2. **Read replicas:** Consider separate pool for read-only queries
3. **Connection retries:** Add retry logic for transient connection failures
4. **Monitoring dashboard:** Integrate with DataDog or similar for real-time monitoring

---

## References

- [asyncpg documentation](https://magicstack.github.io/asyncpg/)
- [FastAPI lifespan events](https://fastapi.tiangolo.com/advanced/events/)
- [PostgreSQL connection limits](https://www.postgresql.org/docs/current/runtime-config-connection.html)
