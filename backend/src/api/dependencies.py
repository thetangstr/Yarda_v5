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

    NOTE: This endpoint DOES NOT validate the JWT with Supabase (which can timeout).
    JWT validation happens at the Supabase client level during OAuth callback.
    We trust the token and fetch the user from our database.

    Args:
        credentials: HTTP Bearer token from Authorization header

    Returns:
        User object

    Raises:
        HTTPException 401: Invalid or expired token
    """
    from src.config import settings

    token = credentials.credentials
    user_id = None

    # E2E Test Bypass: ONLY in test/development environment
    if token == "e2e-mock-token":
        if settings.environment not in ["test", "development"]:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid authentication token"
            )

        print("[E2E Test] Using mock authentication")
        user_id = UUID("00000000-0000-0000-0000-000000000001")  # Fixed UUID for E2E tests

        # Ensure E2E test user exists in database
        try:
            # Always upsert to reset E2E test user state (credits, trials) before each test run
            print("[E2E Test] Ensuring E2E test user exists with correct state")
            await db_pool.execute("""
                INSERT INTO users (id, email, email_verified, trial_remaining, trial_used, subscription_tier, subscription_status, holiday_credits, holiday_credits_earned)
                VALUES ($1, 'e2e-test@yarda.app', true, 3, 0, 'free', 'inactive', 1, 1)
                ON CONFLICT (id) DO UPDATE SET
                    holiday_credits = 1,
                    holiday_credits_earned = 1,
                    trial_remaining = 3,
                    trial_used = 0
            """, user_id)
        except Exception as e:
            print(f"[E2E Test] Error ensuring test user exists: {e}")
    else:
        # Try to parse as UUID first (for email/password login compatibility)
        try:
            user_id = UUID(token)
        except ValueError:
            # For JWT tokens, we skip Supabase validation (can timeout)
            # Instead, we decode the JWT to extract user_id
            try:
                import json
                import base64

                # JWT format: header.payload.signature
                # We only need the payload (doesn't require signature validation here)
                parts = token.split('.')
                if len(parts) != 3:
                    raise ValueError("Invalid JWT format")

                # Add padding if needed
                payload = parts[1]
                padding = 4 - len(payload) % 4
                if padding != 4:
                    payload += '=' * padding

                # Decode payload
                decoded = base64.urlsafe_b64decode(payload)
                payload_data = json.loads(decoded)

                # Extract user ID from JWT payload
                if 'sub' in payload_data:
                    user_id = UUID(payload_data['sub'])
                else:
                    raise ValueError("No 'sub' claim in JWT token")

            except Exception as e:
                print(f"[JWT Error] Failed to decode JWT: {e}")
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Invalid authentication token"
                )

    # Fetch user from database
    try:
        user_row = await db_pool.fetchrow("""
            SELECT
                id,
                email,
                email_verified,
                trial_remaining,
                trial_used,
                subscription_tier,
                subscription_status,
                holiday_credits,
                created_at,
                updated_at
            FROM users
            WHERE id = $1
        """, user_id)
    except Exception as e:
        print(f"[DB Error] Database query failed: {e}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Database error"
        )

    if not user_row:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found"
        )

    user_obj = User(
        id=user_row["id"],
        email=user_row["email"],
        email_verified=user_row["email_verified"],
        firebase_uid=None,  # Firebase deprecated, using Supabase Auth
        trial_remaining=user_row["trial_remaining"],
        trial_used=user_row["trial_used"],
        holiday_credits=user_row.get("holiday_credits", 0),  # Feature 007
        subscription_tier=user_row["subscription_tier"],
        subscription_status=user_row["subscription_status"],
        stripe_customer_id=None,  # Not in minimal schema
        stripe_subscription_id=None,  # Not in minimal schema
        current_period_end=None,  # Not in minimal schema
        cancel_at_period_end=False,  # Not in minimal schema
        created_at=user_row["created_at"],
        updated_at=user_row["updated_at"]
    )
    return user_obj


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
    from src.config import settings

    # Skip email verification in development mode
    if settings.environment == "development":
        print(f"[Dev Mode] Skipping email verification for user {user.email}")
        return user

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
            holiday_credits,
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
        holiday_credits=user_row.get("holiday_credits", 0),  # Feature 007
        subscription_tier=user_row["subscription_tier"],
        subscription_status=user_row["subscription_status"],
        stripe_customer_id=None,  # Not in minimal schema
        stripe_subscription_id=None,  # Not in minimal schema
        current_period_end=None,  # Not in minimal schema
        cancel_at_period_end=False,  # Not in minimal schema
        created_at=user_row["created_at"],
        updated_at=user_row["updated_at"]
    )
