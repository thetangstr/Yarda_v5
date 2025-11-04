"""
Auto-Reload Service

Handles automatic token reload triggers with throttling and failure tracking.

Requirements:
- FR-034 to FR-042: Auto-reload configuration and triggers
- T067: check_and_trigger() logic
- T068: 60-second throttle
- T069: Failure count tracking and disable after 3 failures
"""

import asyncpg
from uuid import UUID
from typing import Optional, Dict, Any
from datetime import datetime, timedelta
import logging

logger = logging.getLogger(__name__)


class AutoReloadService:
    """Service for managing automatic token reload."""

    def __init__(self, db_pool: asyncpg.Pool):
        """
        Initialize auto-reload service.

        Args:
            db_pool: Database connection pool
        """
        self.db_pool = db_pool

    async def get_auto_reload_config(self, user_id: UUID) -> Optional[Dict[str, Any]]:
        """
        Get user's auto-reload configuration.

        Args:
            user_id: User ID

        Returns:
            Dict with auto_reload configuration or None if not found
        """
        async with self.db_pool.acquire() as conn:
            row = await conn.fetchrow(
                """
                SELECT
                    auto_reload_enabled,
                    auto_reload_threshold,
                    auto_reload_amount,
                    auto_reload_failure_count,
                    last_reload_at,
                    balance
                FROM users_token_accounts
                WHERE user_id = $1
            """,
                user_id,
            )

            if not row:
                return None

            return {
                "auto_reload_enabled": row["auto_reload_enabled"],
                "auto_reload_threshold": row["auto_reload_threshold"],
                "auto_reload_amount": row["auto_reload_amount"],
                "auto_reload_failure_count": row["auto_reload_failure_count"],
                "last_reload_at": row["last_reload_at"],
                "balance": row["balance"],
            }

    async def configure_auto_reload(
        self,
        user_id: UUID,
        enabled: bool,
        threshold: Optional[int] = None,
        amount: Optional[int] = None,
    ) -> bool:
        """
        Configure auto-reload settings for a user.

        Args:
            user_id: User ID
            enabled: Whether to enable auto-reload
            threshold: Balance threshold to trigger reload (1-100)
            amount: Amount of tokens to reload (minimum 10)

        Returns:
            True if configuration succeeded

        Raises:
            ValueError: If validation fails
        """
        # Validate inputs
        if enabled:
            if threshold is None or amount is None:
                raise ValueError(
                    "Both threshold and amount required when enabling auto-reload"
                )
            if not (1 <= threshold <= 100):
                raise ValueError("Threshold must be between 1 and 100")
            if amount < 10:
                raise ValueError("Amount must be at least 10 tokens")

        async with self.db_pool.acquire() as conn:
            # Ensure token account exists
            account = await conn.fetchrow(
                "SELECT id FROM users_token_accounts WHERE user_id = $1", user_id
            )

            if not account:
                # Create token account if it doesn't exist
                await conn.execute(
                    """
                    INSERT INTO users_token_accounts (user_id, balance)
                    VALUES ($1, 0)
                """,
                    user_id,
                )

            # Update configuration
            await conn.execute(
                """
                UPDATE users_token_accounts
                SET
                    auto_reload_enabled = $2,
                    auto_reload_threshold = $3,
                    auto_reload_amount = $4,
                    updated_at = NOW()
                WHERE user_id = $1
            """,
                user_id,
                enabled,
                threshold if enabled else None,
                amount if enabled else None,
            )

            logger.info(
                f"Auto-reload configured for user {user_id}: "
                f"enabled={enabled}, threshold={threshold}, amount={amount}"
            )
            return True

    async def check_and_trigger(self, user_id: UUID) -> Optional[Dict[str, Any]]:
        """
        Check if auto-reload should be triggered and return configuration.

        This method checks:
        1. Auto-reload is enabled
        2. Balance is below threshold
        3. 60-second throttle has passed since last reload
        4. Failure count is below 3

        Args:
            user_id: User ID

        Returns:
            Dict with reload info if should trigger, None otherwise
            {
                "should_trigger": bool,
                "amount": int,
                "balance": int,
                "threshold": int
            }
        """
        config = await self.get_auto_reload_config(user_id)

        if not config:
            logger.debug(f"No token account found for user {user_id}")
            return None

        # Check if auto-reload is enabled
        if not config["auto_reload_enabled"]:
            logger.debug(f"Auto-reload disabled for user {user_id}")
            return None

        # Check failure count
        if config["auto_reload_failure_count"] >= 3:
            logger.warning(
                f"Auto-reload disabled for user {user_id} due to 3 failures"
            )
            return None

        # Check balance threshold
        balance = config["balance"]
        threshold = config["auto_reload_threshold"]

        if balance >= threshold:
            logger.debug(
                f"Balance {balance} >= threshold {threshold} for user {user_id}"
            )
            return None

        # Check 60-second throttle
        last_reload = config["last_reload_at"]
        if last_reload:
            time_since_last = datetime.now(last_reload.tzinfo) - last_reload
            if time_since_last < timedelta(seconds=60):
                logger.info(
                    f"Auto-reload throttled for user {user_id}: "
                    f"only {time_since_last.total_seconds():.1f}s since last reload"
                )
                return None

        # All checks passed - should trigger auto-reload
        amount = config["auto_reload_amount"]
        logger.info(
            f"Auto-reload trigger for user {user_id}: "
            f"balance={balance}, threshold={threshold}, amount={amount}"
        )

        return {
            "should_trigger": True,
            "amount": amount,
            "balance": balance,
            "threshold": threshold,
            "user_id": str(user_id),
        }

    async def record_reload_attempt(self, user_id: UUID) -> None:
        """
        Record that an auto-reload attempt was made (update last_reload_at).

        Args:
            user_id: User ID
        """
        async with self.db_pool.acquire() as conn:
            await conn.execute(
                """
                UPDATE users_token_accounts
                SET last_reload_at = NOW()
                WHERE user_id = $1
            """,
                user_id,
            )
            logger.debug(f"Recorded reload attempt for user {user_id}")

    async def record_reload_success(self, user_id: UUID) -> None:
        """
        Record successful auto-reload (reset failure count).

        Args:
            user_id: User ID
        """
        async with self.db_pool.acquire() as conn:
            await conn.execute(
                """
                UPDATE users_token_accounts
                SET
                    auto_reload_failure_count = 0,
                    updated_at = NOW()
                WHERE user_id = $1
            """,
                user_id,
            )
            logger.info(f"Auto-reload success for user {user_id}, reset failure count")

    async def record_reload_failure(self, user_id: UUID) -> bool:
        """
        Record failed auto-reload attempt and disable if >= 3 failures.

        Args:
            user_id: User ID

        Returns:
            True if auto-reload was disabled due to failures
        """
        async with self.db_pool.acquire() as conn:
            result = await conn.fetchrow(
                """
                UPDATE users_token_accounts
                SET
                    auto_reload_failure_count = auto_reload_failure_count + 1,
                    auto_reload_enabled = CASE
                        WHEN auto_reload_failure_count + 1 >= 3 THEN false
                        ELSE auto_reload_enabled
                    END,
                    updated_at = NOW()
                WHERE user_id = $1
                RETURNING auto_reload_failure_count, auto_reload_enabled
            """,
                user_id,
            )

            if result:
                failure_count = result["auto_reload_failure_count"]
                still_enabled = result["auto_reload_enabled"]

                if not still_enabled:
                    logger.warning(
                        f"Auto-reload DISABLED for user {user_id} "
                        f"after {failure_count} failures"
                    )
                    return True
                else:
                    logger.info(
                        f"Auto-reload failure #{failure_count} for user {user_id}"
                    )
                    return False

            return False
