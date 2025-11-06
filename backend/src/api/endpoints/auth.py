"""
Authentication endpoints for user registration, login, and email verification.

Endpoints:
- POST /auth/register: Register new user with 3 trial credits
- POST /auth/verify-email: Verify email with token
- POST /auth/resend-verification: Resend verification email (rate limited)
- POST /auth/login: User login
- POST /auth/logout: User logout
"""

from datetime import datetime, timedelta
from typing import Optional
from uuid import UUID
import secrets
import hashlib

from fastapi import APIRouter, HTTPException, Depends, status
from fastapi.responses import JSONResponse
from supabase import create_client, Client

from src.models.user import (
    UserRegisterRequest,
    UserRegisterResponse,
    VerifyEmailRequest,
    LoginRequest,
    LoginResponse,
    User
)
from src.services.trial_service import get_trial_service, TrialService
from src.db.connection_pool import db_pool
from src.config import settings

# Initialize Supabase Admin client (service role has full access)
supabase: Client = create_client(
    settings.supabase_url,
    settings.supabase_service_role_key
)

router = APIRouter(prefix="/auth", tags=["authentication"])


# In-memory store for verification tokens (replace with Redis in production)
verification_tokens = {}
resend_rate_limit = {}  # Track resend attempts per email


def generate_verification_token() -> str:
    """Generate secure random verification token."""
    return secrets.token_urlsafe(32)


def hash_password(password: str) -> str:
    """Hash password using SHA-256 (use bcrypt in production)."""
    return hashlib.sha256(password.encode()).hexdigest()


async def send_verification_email(email: str, token: str) -> None:
    """
    Send verification email to user.

    In production, integrate with email service (SendGrid, AWS SES, etc.).
    For now, just log the token.
    """
    verification_link = f"{settings.frontend_url}/verify-email?token={token}"
    print(f"\n{'='*60}")
    print(f"VERIFICATION EMAIL")
    print(f"To: {email}")
    print(f"Link: {verification_link}")
    print(f"Token: {token}")
    print(f"Expires: 24 hours")
    print(f"{'='*60}\n")

    # TODO: Integrate with email service
    # await email_service.send(
    #     to=email,
    #     subject="Verify your Yarda account",
    #     html=render_template("verification_email.html", link=verification_link)
    # )


@router.post("/register", response_model=UserRegisterResponse, status_code=status.HTTP_201_CREATED)
async def register(
    request: UserRegisterRequest,
    trial_service: TrialService = Depends(get_trial_service)
):
    """
    Register new user with email/password.

    Requirements:
    - FR-001: Email/password registration
    - FR-002: Email format validation (handled by Pydantic EmailStr)
    - FR-003: Password minimum 8 characters (handled by Pydantic validator)
    - FR-004: Prevent duplicate email registration
    - FR-010: Initialize trial_remaining=3, trial_used=0
    - FR-006: Send verification email

    Returns:
        UserRegisterResponse with user_id, email, trial_remaining=3

    Raises:
        HTTPException 400: Email already exists
        HTTPException 500: Database error
    """
    try:
        # Create user in Supabase Auth (auth.users table)
        # This will automatically trigger the database sync to public.users
        try:
            auth_response = supabase.auth.admin.create_user({
                "email": request.email,
                "password": request.password,
                "email_confirm": True,  # Auto-confirm for development (set to False with proper email service)
                "user_metadata": {
                    "registration_source": "email_password"
                }
            })

            if not auth_response.user:
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail="Failed to create user in authentication system"
                )

            user_id = auth_response.user.id

        except Exception as e:
            error_message = str(e)
            # Check if it's a duplicate email error
            if "already registered" in error_message.lower() or "already exists" in error_message.lower():
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="An account with this email already exists"
                )
            # Re-raise other errors
            print(f"Supabase Auth error: {e}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to register user"
            )

        # Generate verification token
        token = generate_verification_token()
        expiry = datetime.utcnow() + timedelta(hours=24)

        # Store token (replace with Redis in production)
        verification_tokens[token] = {
            "email": request.email,
            "user_id": str(user_id),
            "expiry": expiry
        }

        # Send verification email
        await send_verification_email(request.email, token)

        # Initialize resend rate limit tracking
        resend_rate_limit[request.email] = {
            "count": 0,
            "reset_at": datetime.utcnow() + timedelta(hours=1)
        }

        return UserRegisterResponse(
            user_id=user_id,
            email=request.email,
            trial_remaining=3,
            verification_sent=True
        )

    except HTTPException:
        raise
    except Exception as e:
        print(f"Registration error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to register user"
        )


@router.post("/verify-email", status_code=status.HTTP_200_OK)
async def verify_email(request: VerifyEmailRequest):
    """
    Verify user email with verification token.

    Requirements:
    - FR-007: Email verification within 30 seconds
    - FR-008: Verification link valid for 24 hours
    - FR-009: Set email_verified=true after verification

    Returns:
        Success message

    Raises:
        HTTPException 400: Invalid or expired token
        HTTPException 500: Database error
    """
    try:
        # Check if token exists
        token_data = verification_tokens.get(request.token)

        if not token_data:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid verification token"
            )

        # Check if token expired
        if datetime.utcnow() > token_data["expiry"]:
            # Remove expired token
            del verification_tokens[request.token]
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Verification link has expired. Please request a new one."
            )

        # Update user email_verified status
        updated_rows = await db_pool.execute("""
            UPDATE users
            SET email_verified = true,
                updated_at = NOW()
            WHERE email = $1 AND email_verified = false
        """, token_data["email"])

        if updated_rows == "UPDATE 0":
            # Email already verified or user not found
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email already verified or user not found"
            )

        # Remove used token
        del verification_tokens[request.token]

        return {
            "message": "Email verified successfully",
            "email": token_data["email"]
        }

    except HTTPException:
        raise
    except Exception as e:
        print(f"Email verification error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to verify email"
        )


@router.post("/resend-verification", status_code=status.HTTP_200_OK)
async def resend_verification(email: str):
    """
    Resend verification email.

    Requirements:
    - Rate limit: 3 emails per hour per email address

    Returns:
        Success message

    Raises:
        HTTPException 429: Too many requests
        HTTPException 400: Email not found or already verified
        HTTPException 500: Server error
    """
    try:
        # Check rate limit
        rate_limit = resend_rate_limit.get(email)

        if rate_limit:
            # Reset counter if hour has passed
            if datetime.utcnow() > rate_limit["reset_at"]:
                resend_rate_limit[email] = {
                    "count": 0,
                    "reset_at": datetime.utcnow() + timedelta(hours=1)
                }
                rate_limit = resend_rate_limit[email]

            # Check if limit exceeded
            if rate_limit["count"] >= 3:
                minutes_remaining = int((rate_limit["reset_at"] - datetime.utcnow()).total_seconds() / 60)
                raise HTTPException(
                    status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                    detail=f"Too many requests. Please try again in {minutes_remaining} minutes."
                )
        else:
            # Initialize rate limit for this email
            resend_rate_limit[email] = {
                "count": 0,
                "reset_at": datetime.utcnow() + timedelta(hours=1)
            }
            rate_limit = resend_rate_limit[email]

        # Check if user exists and is not verified
        user = await db_pool.fetchrow("""
            SELECT id, email_verified FROM users WHERE email = $1
        """, email)

        if not user:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="User not found"
            )

        if user["email_verified"]:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email already verified"
            )

        # Generate new token
        token = generate_verification_token()
        expiry = datetime.utcnow() + timedelta(hours=24)

        # Store token
        verification_tokens[token] = {
            "email": email,
            "user_id": str(user["id"]),
            "expiry": expiry
        }

        # Send verification email
        await send_verification_email(email, token)

        # Increment rate limit counter
        resend_rate_limit[email]["count"] += 1

        return {
            "message": "Verification email sent",
            "email": email
        }

    except HTTPException:
        raise
    except Exception as e:
        print(f"Resend verification error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to resend verification email"
        )


@router.post("/login", response_model=LoginResponse)
async def login(request: LoginRequest):
    """
    User login with email/password.

    Returns:
        LoginResponse with access_token and user profile

    Raises:
        HTTPException 401: Invalid credentials
        HTTPException 500: Database error
    """
    try:
        # Authenticate with Supabase Auth
        try:
            auth_response = supabase.auth.sign_in_with_password({
                "email": request.email,
                "password": request.password
            })

            if not auth_response.user:
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Invalid email or password"
                )

            user_id = auth_response.user.id

        except Exception as e:
            error_message = str(e)
            # Check for invalid credentials error
            if "invalid" in error_message.lower() or "credentials" in error_message.lower():
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Invalid email or password"
                )
            print(f"Supabase Auth login error: {e}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to login"
            )

        # Fetch user profile from public.users table (synced by trigger)
        user = await db_pool.fetchrow("""
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

        if not user:
            # User authenticated but profile not synced yet (edge case)
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="User profile not found. Please try again."
            )

        # Use user_id as access token (since get_current_user expects UUID)
        # TODO: Use proper JWT tokens in production
        access_token = str(user["id"])

        return LoginResponse(
            access_token=access_token,
            token_type="bearer",
            user=User(
                id=user["id"],
                email=user["email"],
                email_verified=user["email_verified"],
                trial_remaining=user["trial_remaining"],
                trial_used=user["trial_used"],
                subscription_tier=user["subscription_tier"],
                subscription_status=user["subscription_status"],
                created_at=user["created_at"]
            )
        )

    except HTTPException:
        raise
    except Exception as e:
        print(f"Login error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to login"
        )


@router.post("/logout", status_code=status.HTTP_200_OK)
async def logout():
    """
    User logout (client-side token removal).

    Returns:
        Success message
    """
    return {"message": "Logged out successfully"}
