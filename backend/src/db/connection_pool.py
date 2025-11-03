"""
Database connection pool using asyncpg for PostgreSQL.

Provides connection pool management for all database operations.
Uses environment variables for configuration.
"""

import asyncpg
import os
from typing import Optional
from contextlib import asynccontextmanager


class DatabasePool:
    """Manages PostgreSQL connection pool using asyncpg."""

    def __init__(self):
        self._pool: Optional[asyncpg.Pool] = None

    async def connect(self):
        """Initialize the connection pool."""
        if self._pool is not None:
            return

        database_url = os.getenv("DATABASE_URL")
        if not database_url:
            raise ValueError("DATABASE_URL environment variable is required")

        # Create connection pool with optimized settings
        self._pool = await asyncpg.create_pool(
            database_url,
            min_size=2,  # Minimum connections
            max_size=10,  # Maximum connections
            max_queries=50000,  # Max queries per connection
            max_inactive_connection_lifetime=300,  # 5 minutes
            command_timeout=60,  # 60 second timeout
        )

    async def disconnect(self):
        """Close the connection pool."""
        if self._pool is not None:
            await self._pool.close()
            self._pool = None

    @asynccontextmanager
    async def acquire(self):
        """
        Acquire a connection from the pool.

        Usage:
            async with db_pool.acquire() as conn:
                result = await conn.fetch("SELECT * FROM users")
        """
        if self._pool is None:
            raise RuntimeError("Database pool not initialized. Call connect() first.")

        async with self._pool.acquire() as connection:
            yield connection

    async def execute(self, query: str, *args):
        """
        Execute a query that doesn't return results (INSERT, UPDATE, DELETE).

        Args:
            query: SQL query with $1, $2, etc. placeholders
            *args: Query parameters

        Returns:
            Status string from the database
        """
        async with self.acquire() as conn:
            return await conn.execute(query, *args)

    async def fetch(self, query: str, *args):
        """
        Fetch multiple rows from the database.

        Args:
            query: SQL query with $1, $2, etc. placeholders
            *args: Query parameters

        Returns:
            List of Record objects
        """
        async with self.acquire() as conn:
            return await conn.fetch(query, *args)

    async def fetchrow(self, query: str, *args):
        """
        Fetch a single row from the database.

        Args:
            query: SQL query with $1, $2, etc. placeholders
            *args: Query parameters

        Returns:
            Record object or None
        """
        async with self.acquire() as conn:
            return await conn.fetchrow(query, *args)

    async def fetchval(self, query: str, *args):
        """
        Fetch a single value from the database.

        Args:
            query: SQL query with $1, $2, etc. placeholders
            *args: Query parameters

        Returns:
            Single value or None
        """
        async with self.acquire() as conn:
            return await conn.fetchval(query, *args)


# Global database pool instance
db_pool = DatabasePool()


async def get_db():
    """
    Dependency for FastAPI endpoints to access the database pool.

    Usage in FastAPI:
        @app.get("/users")
        async def get_users(db = Depends(get_db)):
            users = await db.fetch("SELECT * FROM users")
            return users
    """
    if db_pool._pool is None:
        await db_pool.connect()
    return db_pool
