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

    async def deduct_trials_batch(self, user_id: UUID, amount: int) -> Tuple[bool, int]:
        """
        Atomically deduct multiple trial credits from user in a single transaction.

        This is CRITICAL for multi-area generations to prevent negative trial_remaining.
        The entire check + deduction happens in ONE atomic transaction with FOR UPDATE lock.

        Args:
            user_id: User UUID
            amount: Number of trial credits to deduct (must be >= 1)

        Returns:
            Tuple of (success, trial_remaining)
            - success: True if all credits deducted successfully, False if insufficient
            - trial_remaining: Credits remaining after deduction

        Raises:
            ValueError: If amount < 1

        Example:
            >>> # User generating 3 areas, deduct 3 trial credits atomically
            >>> success, remaining = await trial_service.deduct_trials_batch(user_id, 3)
            >>> if not success:
            >>>     raise HTTPException(403, "Insufficient trial credits")
        """
        if amount < 1:
            raise ValueError("amount must be >= 1")

        result = await self.db.fetchrow("""
            SELECT * FROM deduct_trials_batch($1, $2)
        """, user_id, amount)

        if not result:
            raise RuntimeError("deduct_trials_batch function failed")

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

    async def refund_trials_batch(self, user_id: UUID, amount: int) -> Tuple[bool, int]:
        """
        Refund multiple trial credits to user (when multi-area generation fails).

        Args:
            user_id: User UUID
            amount: Number of trial credits to refund (must be >= 1)

        Returns:
            Tuple of (success, trial_remaining)
            - success: True if refund succeeded
            - trial_remaining: Credits remaining after refund

        Raises:
            ValueError: If amount < 1

        Example:
            >>> # Multi-area generation failed, refund all 3 trial credits
            >>> success, remaining = await trial_service.refund_trials_batch(user_id, 3)
        """
        if amount < 1:
            raise ValueError("amount must be >= 1")

        result = await self.db.fetchrow("""
            SELECT * FROM refund_trials_batch($1, $2)
        """, user_id, amount)

        if not result:
            raise RuntimeError("refund_trials_batch function failed")

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


async def get_trial_service() -> TrialService:
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
        from src.db.connection_pool import db_pool
        _trial_service_instance = TrialService(db_pool)

    return _trial_service_instance
