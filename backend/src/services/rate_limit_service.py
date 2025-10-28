from datetime import datetime, timedelta
from uuid import UUID
from supabase import Client
import logging
from ..exceptions import RateLimitError, DatabaseError

logger = logging.getLogger(__name__)


class RateLimitService:
    """Service for rate limiting operations"""

    # Rate limit configuration
    MAX_REQUESTS = 3
    WINDOW_SECONDS = 60

    def __init__(self, supabase_client: Client):
        """
        Initialize RateLimitService

        Args:
            supabase_client: Supabase client with service role permissions
        """
        self.supabase = supabase_client

    async def check_rate_limit(self, user_id: UUID) -> bool:
        """
        Check if user can make a request (not rate limited)

        Uses the database function check_rate_limit which implements
        a rolling 60-second window checking for 3 or fewer attempts.

        Args:
            user_id: User UUID

        Returns:
            bool: True if user can make request, False if rate limited

        Raises:
            DatabaseError: If check fails
        """
        try:
            result = self.supabase.rpc(
                'check_rate_limit',
                {'p_user_id': str(user_id)}
            ).execute()

            can_request = result.data is True
            logger.debug(f"Rate limit check for user {user_id}: {can_request}")

            return can_request

        except Exception as e:
            error_msg = str(e)
            logger.error(f"Failed to check rate limit for user {user_id}: {error_msg}")
            raise DatabaseError(f"Failed to check rate limit: {error_msg}")

    async def record_attempt(self, user_id: UUID) -> None:
        """
        Record a rate limit attempt for tracking

        Args:
            user_id: User UUID

        Raises:
            DatabaseError: If recording fails
        """
        try:
            self.supabase.table('rate_limits').insert({
                'user_id': str(user_id)
            }).execute()

            logger.debug(f"Rate limit attempt recorded for user {user_id}")

        except Exception as e:
            error_msg = str(e)
            logger.error(f"Failed to record rate limit attempt for user {user_id}: {error_msg}")
            raise DatabaseError(f"Failed to record rate limit attempt: {error_msg}")

    async def check_and_record(self, user_id: UUID) -> None:
        """
        Check rate limit and record attempt, raise error if exceeded

        This is a convenience method that combines check and record operations.

        Args:
            user_id: User UUID

        Raises:
            RateLimitError: If user is rate limited
            DatabaseError: If check or record fails
        """
        try:
            # Check if user can make request
            can_request = await self.check_rate_limit(user_id)

            if not can_request:
                # Get retry time
                retry_after = await self.get_time_until_reset(user_id)
                logger.warning(f"User {user_id} is rate limited. Retry after {retry_after}s")
                raise RateLimitError(retry_after)

            # Record attempt
            await self.record_attempt(user_id)

        except RateLimitError:
            # Re-raise rate limit errors as-is
            raise
        except Exception as e:
            error_msg = str(e)
            logger.error(f"Rate limit check and record failed for user {user_id}: {error_msg}")
            raise DatabaseError(f"Rate limit operation failed: {error_msg}")

    async def get_remaining_requests(self, user_id: UUID) -> int:
        """
        Get number of requests user has left in current window

        Args:
            user_id: User UUID

        Returns:
            int: Number of requests remaining (0-3)

        Raises:
            DatabaseError: If query fails
        """
        try:
            # Calculate window start time
            window_start = datetime.utcnow() - timedelta(seconds=self.WINDOW_SECONDS)

            # Count attempts in current window
            result = self.supabase.table('rate_limits').select(
                'id', count='exact'
            ).eq(
                'user_id', str(user_id)
            ).gte(
                'attempted_at', window_start.isoformat()
            ).execute()

            attempts_count = result.count or 0
            remaining = max(0, self.MAX_REQUESTS - attempts_count)

            logger.debug(f"User {user_id} has {remaining} requests remaining")

            return remaining

        except Exception as e:
            error_msg = str(e)
            logger.error(f"Failed to get remaining requests for user {user_id}: {error_msg}")
            raise DatabaseError(f"Failed to get remaining requests: {error_msg}")

    async def get_time_until_reset(self, user_id: UUID) -> int:
        """
        Get seconds until oldest attempt in window expires

        Args:
            user_id: User UUID

        Returns:
            int: Seconds until rate limit resets (0 if not rate limited)

        Raises:
            DatabaseError: If query fails
        """
        try:
            # Get oldest attempt in current window
            window_start = datetime.utcnow() - timedelta(seconds=self.WINDOW_SECONDS)

            result = self.supabase.table('rate_limits').select(
                'attempted_at'
            ).eq(
                'user_id', str(user_id)
            ).gte(
                'attempted_at', window_start.isoformat()
            ).order(
                'attempted_at', desc=False
            ).limit(1).execute()

            if not result.data or len(result.data) == 0:
                return 0

            # Parse oldest attempt timestamp
            oldest_attempt = datetime.fromisoformat(
                result.data[0]['attempted_at'].replace('Z', '+00:00')
            )

            # Calculate when it will expire
            expires_at = oldest_attempt + timedelta(seconds=self.WINDOW_SECONDS)
            now = datetime.utcnow()

            # Return seconds until expiration (or 0 if already expired)
            seconds_until_reset = max(0, int((expires_at - now).total_seconds()))

            logger.debug(f"Rate limit resets in {seconds_until_reset}s for user {user_id}")

            return seconds_until_reset

        except Exception as e:
            error_msg = str(e)
            logger.error(f"Failed to get time until reset for user {user_id}: {error_msg}")
            raise DatabaseError(f"Failed to get time until reset: {error_msg}")
