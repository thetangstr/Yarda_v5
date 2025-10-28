from fastapi import Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from supabase import create_client, Client
import os
import logging
from typing import Optional
from uuid import UUID
from ..exceptions import (
    AuthenticationError,
    AuthorizationError,
    DatabaseError
)

logger = logging.getLogger(__name__)

# Security scheme
security = HTTPBearer()


def get_supabase_client() -> Client:
    """
    Get Supabase client instance

    Returns:
        Client: Supabase client with service role key

    Raises:
        DatabaseError: If Supabase configuration is missing
    """
    url = os.getenv("SUPABASE_URL")
    key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")

    if not url or not key:
        logger.error("Supabase configuration missing")
        raise DatabaseError("Database configuration missing")

    return create_client(url, key)


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    supabase: Client = Depends(get_supabase_client)
):
    """
    Get current authenticated user from JWT token

    Args:
        credentials: Bearer token from request header
        supabase: Supabase client

    Returns:
        User object from Supabase auth

    Raises:
        AuthenticationError: If token is invalid or user not found
    """
    try:
        # Verify JWT token with Supabase
        user = supabase.auth.get_user(credentials.credentials)

        if not user or not user.user:
            logger.warning("Invalid token - no user found")
            raise AuthenticationError("Invalid authentication credentials")

        logger.debug(f"User authenticated: {user.user.id}")
        return user.user

    except AuthenticationError:
        # Re-raise custom exceptions as-is
        raise
    except Exception as e:
        error_msg = str(e)
        logger.error(f"Authentication failed: {error_msg}")

        # Check for specific error messages
        if "invalid" in error_msg.lower() or "expired" in error_msg.lower():
            raise AuthenticationError("Invalid or expired token")

        raise AuthenticationError("Could not validate credentials")


async def get_verified_user(
    current_user=Depends(get_current_user),
    supabase: Client = Depends(get_supabase_client)
):
    """
    Get current user and verify email is confirmed

    Args:
        current_user: Current authenticated user
        supabase: Supabase client

    Returns:
        User object

    Raises:
        AuthorizationError: If email is not verified
        DatabaseError: If database query fails
    """
    try:
        # Get user data from database
        user_response = supabase.table('users').select(
            'email_verified'
        ).eq(
            'id', current_user.id
        ).single().execute()

        if not user_response.data:
            logger.error(f"User {current_user.id} not found in database")
            raise AuthenticationError("User not found")

        if not user_response.data.get('email_verified'):
            logger.warning(f"User {current_user.id} email not verified")
            raise AuthorizationError(
                "Email verification required. Please verify your email first."
            )

        logger.debug(f"User {current_user.id} verified")
        return current_user

    except (AuthenticationError, AuthorizationError):
        # Re-raise custom exceptions as-is
        raise
    except Exception as e:
        error_msg = str(e)
        logger.error(f"Failed to verify user: {error_msg}")
        raise DatabaseError(f"Failed to verify user: {error_msg}")


def get_rate_limit_service(supabase: Client = Depends(get_supabase_client)):
    """
    Get RateLimitService instance

    Args:
        supabase: Supabase client

    Returns:
        RateLimitService instance
    """
    from ..services.rate_limit_service import RateLimitService
    return RateLimitService(supabase)


async def check_user_rate_limit(
    current_user=Depends(get_verified_user),
    rate_limit_service=Depends(get_rate_limit_service)
):
    """
    Check if user is rate limited before allowing generation

    This dependency should be used on endpoints that need rate limiting.
    It checks if the user has exceeded their rate limit and raises an
    error if they have. If the check passes, it records the attempt.

    Args:
        current_user: Current verified user
        rate_limit_service: Rate limit service instance

    Raises:
        RateLimitError: If user is rate limited
        DatabaseError: If check or record fails

    Returns:
        None (passes through if rate limit check passes)
    """
    user_id = UUID(current_user.id)

    # This will raise RateLimitError if exceeded, or record attempt if ok
    await rate_limit_service.check_and_record(user_id)

    logger.debug(f"Rate limit check passed for user {user_id}")
