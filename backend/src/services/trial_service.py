"""
Trial credit service for atomic trial operations.

Uses database functions with FOR UPDATE locks to prevent race conditions.
All operations are atomic and safe for concurrent requests.
"""

from uuid import UUID
from typing import Tuple
from src.db.connection_pool import DatabasePool


class TrialService:
    """Service for managing trial credits."""

    def __init__(self, db_pool: DatabasePool):
        self.db = db_pool

    async def get_trial_balance(self, user_id: UUID) -> Tuple[int, int]:
        """
        Get current trial balance for user.

        Args:
            user_id: User UUID

        Returns:
            Tuple of (trial_remaining, trial_used)
        """
        result = await self.db.fetchrow("""
            SELECT trial_remaining, trial_used
            FROM users
            WHERE id = $1
        """, user_id)

        if not result:
            raise ValueError(f"User not found: {user_id}")

        return result['trial_remaining'], result['trial_used']

    async def deduct_trial(self, user_id: UUID) -> Tuple[bool, int]:
        """
        Atomically deduct one trial credit from user.

        Uses database function with FOR UPDATE lock to prevent race conditions.
        Safe for concurrent requests - only N credits can be deducted if user has N.

        Args:
            user_id: User UUID

        Returns:
            Tuple of (success, trial_remaining)
            - success: True if deduction succeeded, False if insufficient credits
            - trial_remaining: Credits remaining after deduction

        Example:
            >>> success, remaining = await trial_service.deduct_trial(user_id)
            >>> if not success:
            >>>     raise HTTPException(403, "No trial credits remaining")
        """
        result = await self.db.fetchrow("""
            SELECT * FROM deduct_trial_atomic($1)
        """, user_id)

        if not result:
            raise RuntimeError("deduct_trial_atomic function failed")

        return result['success'], result['trial_remaining']

    async def refund_trial(self, user_id: UUID) -> Tuple[bool, int]:
        """
        Refund one trial credit to user (when generation fails).

        Args:
            user_id: User UUID

        Returns:
            Tuple of (success, trial_remaining)
            - success: True if refund succeeded
            - trial_remaining: Credits remaining after refund

        Example:
            >>> # Generation failed, refund the trial credit
            >>> success, remaining = await trial_service.refund_trial(user_id)
        """
        result = await self.db.fetchrow("""
            SELECT * FROM refund_trial($1)
        """, user_id)

        if not result:
            raise RuntimeError("refund_trial function failed")

        return result['success'], result['trial_remaining']

    async def check_trial_authorization(self, user_id: UUID) -> bool:
        """
        Check if user is authorized to generate using trial credits.

        Args:
            user_id: User UUID

        Returns:
            True if user has trial credits available, False otherwise
        """
        trial_remaining, _ = await self.get_trial_balance(user_id)
        return trial_remaining > 0

    async def initialize_trial_credits(self, user_id: UUID, credits: int = 3) -> None:
        """
        Initialize trial credits for new user.

        Called during registration to set trial_remaining=3.

        Args:
            user_id: User UUID
            credits: Number of trial credits to initialize (default: 3)
        """
        await self.db.execute("""
            UPDATE users
            SET trial_remaining = $2,
                trial_used = 0,
                updated_at = NOW()
            WHERE id = $1
        """, user_id, credits)


# Dependency injection helper
_trial_service_instance = None


async def get_trial_service(db_pool: DatabasePool = None) -> TrialService:
    """
    Get or create trial service instance.

    Usage in FastAPI:
        @app.get("/trial-balance")
        async def get_balance(
            user_id: UUID,
            trial_service: TrialService = Depends(get_trial_service)
        ):
            remaining, used = await trial_service.get_trial_balance(user_id)
            return {"remaining": remaining, "used": used}
    """
    global _trial_service_instance

    if _trial_service_instance is None:
        if db_pool is None:
            from src.db.connection_pool import db_pool as default_pool
            db_pool = default_pool

        _trial_service_instance = TrialService(db_pool)

    return _trial_service_instance
