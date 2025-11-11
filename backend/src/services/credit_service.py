"""
Unified Credit Service

Provides consistent interface for all credit types (trial, token, holiday).
Centralizes credit operations and enables atomic multi-credit queries.

Pattern: Facade/Adapter pattern over existing specialized services.
Feature: Credit Systems Consolidation (2025-11-11)
"""

from enum import Enum
from typing import Dict, Tuple, Optional
from uuid import UUID
import logging

from ..db.connection_pool import DatabasePool
from ..services.trial_service import TrialService
from ..services.token_service import TokenService
from ..services.holiday_credit_service import HolidayCreditService

logger = logging.getLogger(__name__)


class CreditType(Enum):
    """Supported credit types."""
    TRIAL = "trial"
    TOKEN = "token"
    HOLIDAY = "holiday"


class CreditService:
    """
    Unified service for all credit types.

    Provides consistent interface for:
    - Balance queries (individual and atomic multi-fetch)
    - Atomic deduction with row-level locking
    - Batch operations
    - Refunds

    Usage:
        ```python
        service = CreditService(db_pool)

        # Get all balances atomically
        balances = await service.get_all_balances(user_id)

        # Deduct any credit type
        success, balance = await service.deduct(user_id, CreditType.HOLIDAY, amount=1)
        ```
    """

    def __init__(self, db_pool: DatabasePool):
        """
        Initialize unified credit service.

        Args:
            db_pool: Database connection pool
        """
        self.db_pool = db_pool

        # Delegate to specialized services (no duplication, just composition)
        self.trial_service = TrialService(db_pool)
        self.token_service = TokenService(db_pool)
        self.holiday_service = HolidayCreditService(db_pool)

    # ========================================================================
    # Balance Queries
    # ========================================================================

    async def get_balance(
        self,
        user_id: UUID,
        credit_type: CreditType
    ) -> int:
        """
        Get balance for a specific credit type.

        Args:
            user_id: User UUID
            credit_type: Type of credit to query

        Returns:
            Current balance (integer)

        Raises:
            ValueError: If user not found
        """
        match credit_type:
            case CreditType.TRIAL:
                remaining, _ = await self.trial_service.get_trial_balance(user_id)
                return remaining
            case CreditType.TOKEN:
                balance, _, _ = await self.token_service.get_token_balance(user_id)
                return balance
            case CreditType.HOLIDAY:
                response = await self.holiday_service.get_balance(user_id)
                return response.holiday_credits

    async def get_all_balances(self, user_id: UUID) -> Dict[str, int]:
        """
        Get all credit balances in a single atomic query.

        Optimized: Single database query with LEFT JOIN (fast, consistent snapshot).

        Args:
            user_id: User UUID

        Returns:
            Dict with keys: 'trial', 'token', 'holiday'

        Example:
            ```python
            balances = await service.get_all_balances(user_id)
            # {'trial': 2, 'token': 50, 'holiday': 3}
            ```
        """
        try:
            # Single query with LEFT JOIN for optimal performance
            row = await self.db_pool.fetchrow(
                """
                SELECT
                    u.trial_remaining,
                    u.holiday_credits,
                    COALESCE(uta.balance, 0) as token_balance
                FROM users u
                LEFT JOIN users_token_accounts uta ON uta.user_id = u.id
                WHERE u.id = $1
                """,
                user_id
            )

            if not row:
                raise ValueError(f"User {user_id} not found")

            return {
                "trial": row['trial_remaining'],
                "token": row['token_balance'],
                "holiday": row['holiday_credits']
            }

        except Exception as e:
            logger.error(f"Error fetching all balances for user {user_id}: {str(e)}")
            raise

    async def get_all_balances_detailed(self, user_id: UUID) -> Dict[str, Dict]:
        """
        Get detailed balance information for all credit types.

        Includes additional metadata like total purchased, earned, etc.

        Args:
            user_id: User UUID

        Returns:
            Dict with detailed balance info for each credit type

        Example:
            ```python
            {
                'trial': {'remaining': 2, 'used': 1},
                'token': {'balance': 50, 'total_purchased': 100, 'total_spent': 50},
                'holiday': {'credits': 3, 'earned': 5}
            }
            ```
        """
        try:
            # Trial balance
            trial_remaining, trial_used = await self.trial_service.get_trial_balance(user_id)

            # Token balance
            token_balance, total_purchased, total_spent = await self.token_service.get_token_balance(user_id)

            # Holiday balance
            holiday_response = await self.holiday_service.get_balance(user_id)

            return {
                "trial": {
                    "remaining": trial_remaining,
                    "used": trial_used
                },
                "token": {
                    "balance": token_balance,
                    "total_purchased": total_purchased,
                    "total_spent": total_spent
                },
                "holiday": {
                    "credits": holiday_response.holiday_credits,
                    "earned": holiday_response.holiday_credits_earned,
                    "can_generate": holiday_response.can_generate,
                    "earnings_breakdown": {
                        "signup_bonus": holiday_response.earnings_breakdown.signup_bonus,
                        "social_shares": holiday_response.earnings_breakdown.social_shares,
                        "other": holiday_response.earnings_breakdown.other
                    }
                }
            }

        except Exception as e:
            logger.error(f"Error fetching detailed balances for user {user_id}: {str(e)}")
            raise

    # ========================================================================
    # Credit Deduction (Atomic)
    # ========================================================================

    async def deduct(
        self,
        user_id: UUID,
        credit_type: CreditType,
        amount: int = 1
    ) -> Tuple[bool, int]:
        """
        Atomically deduct credits of any type.

        Uses row-level locking to prevent race conditions.

        Args:
            user_id: User UUID
            credit_type: Type of credit to deduct
            amount: Number of credits to deduct (default: 1)

        Returns:
            Tuple of (success, new_balance)

        Example:
            ```python
            success, balance = await service.deduct(user_id, CreditType.HOLIDAY, 1)
            if not success:
                raise ValueError(f"Insufficient credits. Balance: {balance}")
            ```
        """
        try:
            match credit_type:
                case CreditType.TRIAL:
                    if amount == 1:
                        return await self.trial_service.deduct_trial(user_id)
                    else:
                        return await self.trial_service.deduct_trials_batch(user_id, amount)

                case CreditType.TOKEN:
                    if amount == 1:
                        success, balance, _ = await self.token_service.deduct_token_atomic(user_id)
                        return (success, balance)
                    else:
                        success, balance, _ = await self.token_service.deduct_tokens_batch(user_id, amount)
                        return (success, balance)

                case CreditType.HOLIDAY:
                    if amount != 1:
                        raise ValueError("Holiday credits only support single deduction")
                    result = await self.holiday_service.deduct_credit(user_id)
                    return (result.success, result.credits_remaining)

        except Exception as e:
            logger.error(f"Error deducting {credit_type.value} credits for user {user_id}: {str(e)}")
            raise

    # ========================================================================
    # Credit Refund
    # ========================================================================

    async def refund(
        self,
        user_id: UUID,
        credit_type: CreditType,
        amount: int = 1,
        reason: str = "generation_failure"
    ) -> Tuple[bool, int]:
        """
        Refund credits of any type.

        Args:
            user_id: User UUID
            credit_type: Type of credit to refund
            amount: Number of credits to refund (default: 1)
            reason: Reason for refund (for logging/audit)

        Returns:
            Tuple of (success, new_balance)
        """
        try:
            match credit_type:
                case CreditType.TRIAL:
                    if amount == 1:
                        return await self.trial_service.refund_trial(user_id)
                    else:
                        return await self.trial_service.refund_trials_batch(user_id, amount)

                case CreditType.TOKEN:
                    if amount == 1:
                        success, balance, _ = await self.token_service.refund_token(user_id)
                        return (success, balance)
                    else:
                        # Token service doesn't have batch refund yet
                        # Implement as loop (can optimize later)
                        for _ in range(amount):
                            success, balance, _ = await self.token_service.refund_token(user_id)
                            if not success:
                                return (False, balance)
                        return (True, balance)

                case CreditType.HOLIDAY:
                    new_balance = await self.holiday_service.grant_credit(
                        user_id,
                        amount=amount,
                        reason=reason
                    )
                    return (True, new_balance)

        except Exception as e:
            logger.error(f"Error refunding {credit_type.value} credits for user {user_id}: {str(e)}")
            raise

    # ========================================================================
    # Validation Helpers
    # ========================================================================

    async def has_sufficient_credits(
        self,
        user_id: UUID,
        credit_type: CreditType,
        required: int = 1
    ) -> bool:
        """
        Check if user has sufficient credits without deducting.

        Args:
            user_id: User UUID
            credit_type: Type of credit to check
            required: Number of credits required (default: 1)

        Returns:
            True if user has >= required credits
        """
        try:
            balance = await self.get_balance(user_id, credit_type)
            return balance >= required
        except Exception as e:
            logger.error(f"Error checking credits for user {user_id}: {str(e)}")
            return False
