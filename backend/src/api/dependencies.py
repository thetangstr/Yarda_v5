"""
FastAPI dependencies for authentication, authorization, and service injection.

Dependencies:
- get_current_user: Extract and validate JWT token from Authorization header
- require_verified_email: Ensure user has verified email
- get_trial_service: Inject trial service
"""

from typing import Optional
from uuid import UUID

import asyncpg
from fastapi import Depends, HTTPException, status, Header
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

from src.models.user import User
from src.db.connection_pool import db_pool

# HTTP Bearer token security scheme
security = HTTPBearer()


async def get_db_pool() -> asyncpg.Pool:
    """
    Dependency for injecting database connection pool.

    Returns:
        asyncpg.Pool instance

    Usage:
        @app.get("/endpoint")
        async def endpoint(db_pool: asyncpg.Pool = Depends(get_db_pool)):
            ...
    """
    if db_pool._pool is None:
        await db_pool.connect()
    return db_pool._pool


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security)
) -> User:
    """
    Extract and validate current user from JWT token or user ID.

    Supports two token types:
    1. UUID tokens (for email/password login - returns user_id as token)
    2. Supabase JWT tokens (for Google OAuth - returns JWT access_token)

    Args:
        credentials: HTTP Bearer token from Authorization header

    Returns:
        User object

    Raises:
        HTTPException 401: Invalid or expired token
    """
    token = credentials.credentials
    user_id = None

    # Try to parse as UUID first (for email/password login compatibility)
    try:
        user_id = UUID(token)
    except ValueError:
        # Not a UUID, try to validate as Supabase JWT token
        from supabase import create_client
        from src.config import settings

        try:
            # Initialize Supabase client to validate JWT
            supabase = create_client(settings.supabase_url, settings.supabase_service_role_key)

            # Verify JWT and get user
            user_response = supabase.auth.get_user(token)

            if user_response and user_response.user:
                user_id = UUID(user_response.user.id)
            else:
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Invalid authentication token"
                )
        except Exception as e:
            print(f"JWT validation error: {e}")
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid authentication token"
            )

    # Fetch user from database
    user_row = await db_pool.fetchrow("""
        SELECT
            id,
            email,
            email_verified,
            trial_remaining,
            trial_used,
            subscription_tier,
            subscription_status,
            created_at,
            updated_at
        FROM users
        WHERE id = $1
    """, user_id)

    if not user_row:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found"
        )

    return User(
        id=user_row["id"],
        email=user_row["email"],
        email_verified=user_row["email_verified"],
        firebase_uid=None,  # Firebase deprecated, using Supabase Auth
        trial_remaining=user_row["trial_remaining"],
        trial_used=user_row["trial_used"],
        subscription_tier=user_row["subscription_tier"],
        subscription_status=user_row["subscription_status"],
        stripe_customer_id=None,  # Not in minimal schema
        stripe_subscription_id=None,  # Not in minimal schema
        current_period_end=None,  # Not in minimal schema
        cancel_at_period_end=False,  # Not in minimal schema
        created_at=user_row["created_at"],
        updated_at=user_row["updated_at"]
    )


async def require_verified_email(
    user: User = Depends(get_current_user)
) -> User:
    """
    Ensure user has verified their email.

    Args:
        user: Current authenticated user

    Returns:
        User object

    Raises:
        HTTPException 403: Email not verified
    """
    if not user.email_verified:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Email verification required. Please check your email."
        )

    return user


async def get_optional_user(
    authorization: Optional[str] = Header(None)
) -> Optional[User]:
    """
    Get current user if authenticated, otherwise return None.

    Useful for endpoints that work with or without authentication.

    Args:
        authorization: Optional Authorization header

    Returns:
        User object if authenticated, None otherwise
    """
    if not authorization or not authorization.startswith("Bearer "):
        return None

    token = authorization.replace("Bearer ", "")

    try:
        user_id = UUID(token)
    except ValueError:
        return None

    # Fetch user
    user_row = await db_pool.fetchrow("""
        SELECT
            id,
            email,
            email_verified,
            trial_remaining,
            trial_used,
            subscription_tier,
            subscription_status,
            created_at,
            updated_at
        FROM users
        WHERE id = $1
    """, user_id)

    if not user_row:
        return None

    return User(
        id=user_row["id"],
        email=user_row["email"],
        email_verified=user_row["email_verified"],
        firebase_uid=None,  # Firebase deprecated, using Supabase Auth
        trial_remaining=user_row["trial_remaining"],
        trial_used=user_row["trial_used"],
        subscription_tier=user_row["subscription_tier"],
        subscription_status=user_row["subscription_status"],
        stripe_customer_id=None,  # Not in minimal schema
        stripe_subscription_id=None,  # Not in minimal schema
        current_period_end=None,  # Not in minimal schema
        cancel_at_period_end=False,  # Not in minimal schema
        created_at=user_row["created_at"],
        updated_at=user_row["updated_at"]
    )
