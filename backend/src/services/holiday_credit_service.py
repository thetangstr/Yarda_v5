"""
Holiday Credit Service

Handles all holiday credit operations including atomic deductions, grants,
and balance queries. Uses PostgreSQL functions for atomic operations to
prevent race conditions and negative balances.

Pattern: Reuses proven atomic deduction pattern from migration 013 (trial/token credits).
"""

import logging
from typing import Optional
from uuid import UUID

from ..db.connection_pool import DatabasePool
from ..models.holiday import CreditDeductionResult, HolidayCreditsResponse, EarningsBreakdown

logger = logging.getLogger(__name__)


class HolidayCreditService:
    """
    Service for managing holiday credits with atomic operations.

    Critical: Uses database-level locking (FOR UPDATE NOWAIT) to prevent
    race conditions and ensure no negative balances.
    """

    def __init__(self, db_pool: DatabasePool):
        """
        Initialize holiday credit service.

        Args:
            db_pool: Database connection pool for queries
        """
        self.db_pool = db_pool

    # ========================================================================
    # Credit Deduction (Atomic)
    # ========================================================================

    async def deduct_credit(self, user_id: UUID) -> CreditDeductionResult:
        """
        Atomically deduct 1 holiday credit from user.

        Uses PostgreSQL function deduct_holiday_credit() with row-level
        locking to prevent race conditions.

        Args:
            user_id: User UUID

        Returns:
            CreditDeductionResult with success status and remaining credits

        Example:
            ```python
            result = await service.deduct_credit(user_id)
            if result.success:
                print(f"Credit deducted. {result.credits_remaining} remaining")
            else:
                print(f"Insufficient credits: {result.error_message}")
            ```
        """
        try:
            # Call atomic database function (prevents negative balance)
            row = await self.db_pool.fetchrow(
                "SELECT * FROM deduct_holiday_credit($1)",
                user_id
            )

            if not row:
                logger.error(f"deduct_holiday_credit returned no result for user {user_id}")
                return CreditDeductionResult(
                    success=False,
                    credits_remaining=0,
                    error_message="Database error: no result returned"
                )

            success = row['success']
            credits_remaining = row['credits_remaining']

            if not success:
                logger.warning(f"Credit deduction failed for user {user_id}: insufficient credits")
                return CreditDeductionResult(
                    success=False,
                    credits_remaining=credits_remaining,
                    error_message="Insufficient holiday credits"
                )

            logger.info(f"Deducted 1 credit from user {user_id}. {credits_remaining} remaining")
            return CreditDeductionResult(
                success=True,
                credits_remaining=credits_remaining
            )

        except Exception as e:
            logger.error(f"Error deducting credit for user {user_id}: {str(e)}")
            return CreditDeductionResult(
                success=False,
                credits_remaining=0,
                error_message=f"Database error: {str(e)}"
            )

    # ========================================================================
    # Credit Grant
    # ========================================================================

    async def grant_credit(
        self,
        user_id: UUID,
        amount: int = 1,
        reason: str = "social_share"
    ) -> int:
        """
        Grant holiday credits to user.

        Used for:
        - Social share rewards (automatic)
        - Admin grants (manual)
        - Refunds (if generation fails)

        Args:
            user_id: User UUID
            amount: Number of credits to grant (default: 1)
            reason: Reason for grant (for logging)

        Returns:
            New credit balance after grant

        Raises:
            ValueError: If amount <= 0
            RuntimeError: If database operation fails
        """
        if amount <= 0:
            raise ValueError(f"Amount must be positive, got {amount}")

        try:
            # Call database function to grant credits
            new_balance = await self.db_pool.fetchval(
                "SELECT grant_holiday_credit($1, $2)",
                user_id,
                amount
            )

            if new_balance is None:
                raise RuntimeError(f"User {user_id} not found")

            logger.info(
                f"Granted {amount} credit(s) to user {user_id} "
                f"(reason: {reason}). New balance: {new_balance}"
            )
            return new_balance

        except Exception as e:
            logger.error(f"Error granting credits to user {user_id}: {str(e)}")
            raise RuntimeError(f"Failed to grant credits: {str(e)}") from e

    # ========================================================================
    # Credit Balance Query
    # ========================================================================

    async def get_balance(self, user_id: UUID) -> HolidayCreditsResponse:
        """
        Get user's current holiday credit balance and earnings breakdown.

        Args:
            user_id: User UUID

        Returns:
            HolidayCreditsResponse with balance and earnings breakdown

        Raises:
            ValueError: If user not found
        """
        try:
            # Get credit balance from users table
            row = await self.db_pool.fetchrow(
                """
                SELECT
                    holiday_credits,
                    holiday_credits_earned
                FROM users
                WHERE id = $1
                """,
                user_id
            )

            if not row:
                raise ValueError(f"User {user_id} not found")

            current_balance = row['holiday_credits']
            total_earned = row['holiday_credits_earned']

            # Calculate earnings breakdown
            # Note: This is a simplified breakdown. For detailed tracking,
            # we would query social_shares and generation tables.
            breakdown = await self._calculate_earnings_breakdown(
                user_id, total_earned
            )

            return HolidayCreditsResponse(
                holiday_credits=current_balance,
                holiday_credits_earned=total_earned,
                can_generate=current_balance > 0,
                earnings_breakdown=breakdown
            )

        except Exception as e:
            logger.error(f"Error getting balance for user {user_id}: {str(e)}")
            raise

    async def _calculate_earnings_breakdown(
        self,
        user_id: UUID,
        total_earned: int
    ) -> EarningsBreakdown:
        """
        Calculate breakdown of how credits were earned.

        Args:
            user_id: User UUID
            total_earned: Total credits earned

        Returns:
            EarningsBreakdown with signup bonus and social shares
        """
        # Count social share credits (credit_granted = true)
        social_shares = await self.db_pool.fetchval(
            """
            SELECT COUNT(*)
            FROM social_shares
            WHERE user_id = $1 AND credit_granted = true
            """,
            user_id
        ) or 0

        # Signup bonus: 1 if total_earned > 0 (assumes initial credit on signup)
        # This is simplified - in production, you might track this explicitly
        signup_bonus = 1 if total_earned > 0 else 0

        # Other credits: total - (signup + shares)
        other = max(0, total_earned - signup_bonus - social_shares)

        return EarningsBreakdown(
            signup_bonus=signup_bonus,
            social_shares=social_shares,
            other=other
        )

    # ========================================================================
    # Daily Share Limit Check
    # ========================================================================

    async def check_daily_share_limit(
        self,
        user_id: UUID,
        limit: int = 3
    ) -> bool:
        """
        Check if user can share today (max 3 shares per 24 hours).

        Args:
            user_id: User UUID
            limit: Daily share limit (default: 3)

        Returns:
            True if user can share, False if limit reached
        """
        try:
            can_share = await self.db_pool.fetchval(
                "SELECT check_daily_share_limit($1, $2)",
                user_id,
                limit
            )
            return can_share or False

        except Exception as e:
            logger.error(f"Error checking share limit for user {user_id}: {str(e)}")
            # Fail open: allow sharing if database check fails
            return True

    async def get_daily_shares_remaining(self, user_id: UUID) -> int:
        """
        Get number of shares remaining for today.

        Args:
            user_id: User UUID

        Returns:
            Number of shares remaining (0-3)
        """
        try:
            shares_today = await self.db_pool.fetchval(
                """
                SELECT COUNT(*)
                FROM social_shares
                WHERE user_id = $1
                  AND created_at >= NOW() - INTERVAL '24 hours'
                """,
                user_id
            ) or 0

            return max(0, 3 - shares_today)

        except Exception as e:
            logger.error(f"Error getting shares remaining for user {user_id}: {str(e)}")
            return 0

    # ========================================================================
    # Validation Helpers
    # ========================================================================

    async def has_sufficient_credits(self, user_id: UUID, required: int = 1) -> bool:
        """
        Check if user has sufficient credits without deducting.

        Args:
            user_id: User UUID
            required: Number of credits required (default: 1)

        Returns:
            True if user has >= required credits
        """
        try:
            balance_response = await self.get_balance(user_id)
            return balance_response.holiday_credits >= required

        except Exception as e:
            logger.error(f"Error checking credits for user {user_id}: {str(e)}")
            return False
