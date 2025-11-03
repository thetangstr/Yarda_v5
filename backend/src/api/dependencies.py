"""
FastAPI dependencies for authentication, authorization, and service injection.

Dependencies:
- get_current_user: Extract and validate JWT token from Authorization header
- require_verified_email: Ensure user has verified email
- get_trial_service: Inject trial service
"""

from typing import Optional
from uuid import UUID

from fastapi import Depends, HTTPException, status, Header
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

from src.models.user import User
from src.db.connection_pool import db_pool

# HTTP Bearer token security scheme
security = HTTPBearer()


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security)
) -> User:
    """
    Extract and validate current user from JWT token.

    In production, validate JWT signature and expiry.
    For now, we'll use a simple token lookup.

    Args:
        credentials: HTTP Bearer token from Authorization header

    Returns:
        User object

    Raises:
        HTTPException 401: Invalid or expired token
    """
    token = credentials.credentials

    # TODO: Validate JWT token in production
    # For now, do simple database lookup by token (stored during login)
    # In production: decode JWT, verify signature, check expiry

    # Placeholder: Assume token is user_id (replace with JWT validation)
    try:
        user_id = UUID(token)
    except ValueError:
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
            created_at
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
        trial_remaining=user_row["trial_remaining"],
        trial_used=user_row["trial_used"],
        subscription_tier=user_row["subscription_tier"],
        subscription_status=user_row["subscription_status"],
        created_at=user_row["created_at"]
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
            created_at
        FROM users
        WHERE id = $1
    """, user_id)

    if not user_row:
        return None

    return User(
        id=user_row["id"],
        email=user_row["email"],
        email_verified=user_row["email_verified"],
        trial_remaining=user_row["trial_remaining"],
        trial_used=user_row["trial_used"],
        subscription_tier=user_row["subscription_tier"],
        subscription_status=user_row["subscription_status"],
        created_at=user_row["created_at"]
    )
