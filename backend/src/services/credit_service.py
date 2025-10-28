from uuid import UUID
from supabase import Client
import logging
from ..models.generation import CreditBalance, CreditType
from ..exceptions import (
    InsufficientCreditsError,
    DatabaseError,
    ResourceNotFoundError
)

logger = logging.getLogger(__name__)


class CreditService:
    """Service for credit consumption and management operations"""

    def __init__(self, supabase_client: Client):
        """
        Initialize CreditService

        Args:
            supabase_client: Supabase client with service role permissions
        """
        self.supabase = supabase_client

    async def consume_credit(self, user_id: UUID) -> CreditType:
        """
        Atomically consume one credit for a user (trial first, then token)

        This method calls the database function which handles:
        - Row-level locking to prevent race conditions
        - Trial credit consumption (priority)
        - Token credit consumption (if no trial credits)
        - Error if no credits available

        Args:
            user_id: User UUID

        Returns:
            CreditType: Type of credit consumed ('trial' or 'token')

        Raises:
            InsufficientCreditsError: If no credits available
            DatabaseError: If database operation fails
        """
        try:
            result = self.supabase.rpc(
                'consume_credit',
                {'p_user_id': str(user_id)}
            ).execute()

            if not result.data:
                raise InsufficientCreditsError()

            credit_type = result.data
            if credit_type == 'trial':
                return CreditType.TRIAL
            elif credit_type == 'token':
                return CreditType.TOKEN
            else:
                logger.error(f"Unexpected credit type returned: {credit_type}")
                raise DatabaseError(f"Unexpected credit type: {credit_type}")

        except InsufficientCreditsError:
            # Re-raise custom exceptions as-is
            raise
        except Exception as e:
            error_msg = str(e)
            logger.error(f"Failed to consume credit for user {user_id}: {error_msg}")

            # Check for specific error messages from database
            if 'Insufficient credits' in error_msg or 'insufficient credits' in error_msg.lower():
                raise InsufficientCreditsError()

            raise DatabaseError(f"Failed to consume credit: {error_msg}")

    async def refund_credit(self, generation_id: UUID, user_id: UUID = None, credit_type: CreditType = None) -> None:
        """
        Refund credit for a failed generation

        This method is idempotent - calling it multiple times for the same
        generation will only refund once.

        Args:
            generation_id: Generation UUID to refund (if using DB function)
            user_id: User UUID (for manual refund)
            credit_type: Credit type to refund (for manual refund)

        Raises:
            DatabaseError: If refund operation fails
        """
        try:
            if generation_id:
                # Use database function for automatic refund
                self.supabase.rpc(
                    'refund_credit',
                    {'p_generation_id': str(generation_id)}
                ).execute()
                logger.info(f"Credit refunded for generation {generation_id}")
            elif user_id and credit_type:
                # Manual refund (fallback)
                logger.warning(f"Manual refund for user {user_id}, credit_type {credit_type}")
                # This would need additional implementation based on credit type
                pass

        except Exception as e:
            error_msg = str(e)
            logger.error(f"Failed to refund credit: {error_msg}")
            # Don't raise exception for refund failures to avoid blocking main flow
            # but log the error for monitoring

    async def get_credit_balance(self, user_id: UUID) -> CreditBalance:
        """
        Get credit balance breakdown for a user

        Returns:
            CreditBalance: Object containing:
                - trial_credits: Number of trial credits remaining
                - token_balance: Number of purchased tokens remaining
                - total_available: Sum of trial and token credits

        Raises:
            ResourceNotFoundError: If user not found
            DatabaseError: If query fails
        """
        try:
            result = self.supabase.rpc(
                'get_credit_balance',
                {'p_user_id': str(user_id)}
            ).execute()

            if not result.data or len(result.data) == 0:
                logger.error(f"User not found: {user_id}")
                raise ResourceNotFoundError("User")

            balance_data = result.data[0]
            return CreditBalance(
                trial_credits=balance_data['trial_credits'],
                token_balance=balance_data['token_balance'],
                total_available=balance_data['total_available']
            )

        except ResourceNotFoundError:
            # Re-raise custom exceptions as-is
            raise
        except Exception as e:
            error_msg = str(e)
            logger.error(f"Failed to get credit balance for user {user_id}: {error_msg}")

            if "User not found" in error_msg or "user not found" in error_msg.lower():
                raise ResourceNotFoundError("User")

            raise DatabaseError(f"Failed to get credit balance: {error_msg}")
