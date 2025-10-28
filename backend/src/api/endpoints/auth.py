"""
Authentication API Endpoints

Handles user registration, email verification, and user information retrieval.
"""

from fastapi import APIRouter, Depends, status, Body
from typing import Optional
from uuid import UUID
from ...models.user import UserCreate, UserWithCredits, EmailVerificationRequest, EmailVerificationResponse
from ...services.auth_service import AuthService
from ..dependencies import get_supabase_client, get_current_user

router = APIRouter(prefix="/auth", tags=["authentication"])


@router.post(
    "/register",
    response_model=UserWithCredits,
    status_code=status.HTTP_201_CREATED,
    summary="Register new user account",
    description="""
    Register a new user account with email and password.

    ## What Happens on Registration
    1. **User account created** in the database
    2. **3 free trial credits** automatically granted
    3. **Token account created** with zero balance (ready for purchases)
    4. **Email verification token** generated (valid for 1 hour)
    5. **Verification email sent** to the provided address

    ## Trial Credits
    - Every new user receives **3 free trial credits**
    - Trial credits are used for your first 3 landscape design generations
    - Trial credits are consumed before purchased tokens
    - Perfect for trying out the platform before purchasing

    ## Email Verification
    - Email must be verified before creating generations
    - Verification token expires after **1 hour**
    - Use `/auth/verify-email` endpoint with the token
    - Can request new token via `/auth/resend-verification`

    ## Password Requirements
    - Minimum length: 8 characters
    - Must contain at least one uppercase letter
    - Must contain at least one lowercase letter
    - Must contain at least one number

    ## Example Request
    ```json
    {
      "email": "user@example.com",
      "password": "SecurePass123",
      "full_name": "John Doe"
    }
    ```

    ## Example Response
    ```json
    {
      "id": "123e4567-e89b-12d3-a456-426614174000",
      "email": "user@example.com",
      "full_name": "John Doe",
      "email_verified": false,
      "trial_credits": 3,
      "token_balance": 0,
      "created_at": "2025-10-28T12:00:00Z"
    }
    ```

    ## Next Steps After Registration
    1. Check email for verification link
    2. Click verification link or copy token
    3. Call `/auth/verify-email` with the token
    4. Start creating landscape designs!
    """,
    responses={
        201: {
            "description": "User registered successfully",
            "content": {
                "application/json": {
                    "example": {
                        "id": "123e4567-e89b-12d3-a456-426614174000",
                        "email": "user@example.com",
                        "full_name": "John Doe",
                        "email_verified": False,
                        "trial_credits": 3,
                        "token_balance": 0,
                        "created_at": "2025-10-28T12:00:00Z"
                    }
                }
            }
        },
        409: {
            "description": "Email already registered",
            "content": {
                "application/json": {
                    "example": {
                        "error": "ValidationError",
                        "message": "Email already registered"
                    }
                }
            }
        },
        422: {
            "description": "Validation error - invalid input",
            "content": {
                "application/json": {
                    "example": {
                        "error": "ValidationError",
                        "message": "Invalid request data",
                        "details": [
                            {
                                "loc": ["body", "email"],
                                "msg": "value is not a valid email address",
                                "type": "value_error.email"
                            }
                        ]
                    }
                }
            }
        },
        500: {
            "description": "Internal server error",
            "content": {
                "application/json": {
                    "example": {
                        "error": "InternalServerError",
                        "message": "An unexpected error occurred. Please try again later."
                    }
                }
            }
        }
    }
)
async def register(
    user_data: UserCreate,
    supabase=Depends(get_supabase_client)
):
    """
    Register a new user account.

    Creates user with 3 trial credits and sends verification email.
    Service will raise ValidationError if email already exists.
    """
    auth_service = AuthService(supabase)

    # Service will raise ValidationError if email exists
    # Global exception handler will convert to appropriate HTTP response
    user = await auth_service.register_user(user_data)

    return user


@router.post(
    "/verify-email",
    response_model=EmailVerificationResponse,
    summary="Verify user email address",
    description="""
    Verify a user's email address using the verification token.

    ## Verification Process
    1. User receives email with verification link after registration
    2. Link contains unique verification token
    3. Token is submitted to this endpoint
    4. Email is marked as verified in database
    5. User can now create landscape design generations

    ## Token Validity
    - Tokens are **valid for 1 hour** after generation
    - After expiration, request a new token via `/auth/resend-verification`
    - Each token can only be used once

    ## Why Email Verification?
    - Prevents abuse and spam
    - Ensures contact information is valid
    - Required before creating any generations
    - Helps maintain platform quality

    ## Example Request
    ```json
    {
      "token": "550e8400-e29b-41d4-a716-446655440000"
    }
    ```

    ## Example Response (Success)
    ```json
    {
      "success": true,
      "message": "Email verified successfully"
    }
    ```

    ## Example Response (Expired)
    ```json
    {
      "success": false,
      "message": "Verification token expired"
    }
    ```
    """,
    responses={
        200: {
            "description": "Email verified successfully",
            "content": {
                "application/json": {
                    "example": {
                        "success": True,
                        "message": "Email verified successfully"
                    }
                }
            }
        },
        422: {
            "description": "Invalid or expired token",
            "content": {
                "application/json": {
                    "example": {
                        "error": "ValidationError",
                        "message": "Invalid or expired verification token"
                    }
                }
            }
        },
        500: {
            "description": "Internal server error",
            "content": {
                "application/json": {
                    "example": {
                        "error": "InternalServerError",
                        "message": "An unexpected error occurred. Please try again later."
                    }
                }
            }
        }
    }
)
async def verify_email(
    request: EmailVerificationRequest,
    supabase=Depends(get_supabase_client)
):
    """
    Verify user email address.

    Validates verification token and marks email as verified.
    Service will raise ValidationError if token is invalid or expired.
    """
    auth_service = AuthService(supabase)

    # Service will raise ValidationError if token invalid/expired
    result = await auth_service.verify_email(request.token)

    return EmailVerificationResponse(
        success=result["success"],
        message=result["message"]
    )


@router.post(
    "/resend-verification",
    summary="Resend verification email",
    description="""
    Generate a new verification token and resend the verification email.

    ## When to Use
    - Original verification email was not received
    - Verification token expired (after 1 hour)
    - User deleted the verification email
    - Email ended up in spam folder

    ## What Happens
    1. Old verification token is invalidated
    2. New verification token generated (valid for 1 hour)
    3. New verification email sent to user
    4. User can verify with new token

    ## Rate Limiting
    - To prevent abuse, there may be a cooldown between resend requests
    - Typically limited to once per minute per email

    ## Example Request
    ```json
    {
      "email": "user@example.com"
    }
    ```

    ## Example Response
    ```json
    {
      "message": "Verification email sent successfully"
    }
    ```

    ## Troubleshooting
    - Check spam/junk folder for verification email
    - Ensure email address is typed correctly
    - Wait a few minutes before requesting again
    - Contact support if issues persist
    """,
    responses={
        200: {
            "description": "Verification email sent successfully",
            "content": {
                "application/json": {
                    "example": {
                        "message": "Verification email sent successfully"
                    }
                }
            }
        },
        404: {
            "description": "User not found with provided email",
            "content": {
                "application/json": {
                    "example": {
                        "error": "ResourceNotFoundError",
                        "message": "User not found"
                    }
                }
            }
        },
        500: {
            "description": "Internal server error",
            "content": {
                "application/json": {
                    "example": {
                        "error": "InternalServerError",
                        "message": "An unexpected error occurred. Please try again later."
                    }
                }
            }
        }
    }
)
async def resend_verification(
    email: str = Body(..., embed=True, description="Email address to resend verification"),
    supabase=Depends(get_supabase_client)
):
    """
    Resend email verification.

    Generates new verification token and sends verification email.
    Service will raise ResourceNotFoundError if user not found.
    """
    auth_service = AuthService(supabase)

    # Service will raise ResourceNotFoundError if user not found
    result = await auth_service.resend_verification_email(email)

    return result


@router.get(
    "/me",
    response_model=UserWithCredits,
    summary="Get current user information",
    description="""
    Retrieve the authenticated user's account information and credit balance.

    ## Authentication Required
    This endpoint requires a valid JWT token in the Authorization header:
    ```
    Authorization: Bearer <your-jwt-token>
    ```

    ## Response Includes
    - **User profile**: ID, email, name
    - **Email verification status**: Whether email is verified
    - **Trial credits**: Remaining free trial credits
    - **Token balance**: Remaining purchased tokens
    - **Account timestamps**: Created and updated dates

    ## Use Cases
    - Display user profile in app
    - Check credit balance before creating generation
    - Verify email verification status
    - Show account details page

    ## Example Response
    ```json
    {
      "id": "123e4567-e89b-12d3-a456-426614174000",
      "email": "user@example.com",
      "full_name": "John Doe",
      "email_verified": true,
      "trial_credits": 2,
      "token_balance": 10,
      "created_at": "2025-10-28T12:00:00Z",
      "updated_at": "2025-10-28T13:00:00Z"
    }
    ```

    ## Credit Types
    - **trial_credits**: Free credits (3 for new users, consumed first)
    - **token_balance**: Purchased tokens (used after trial credits exhausted)
    - **Total available**: trial_credits + token_balance

    ## Next Steps
    - If trial_credits and token_balance are both 0, user needs to purchase tokens
    - If email_verified is false, user needs to verify email first
    """,
    responses={
        200: {
            "description": "User information retrieved successfully",
            "content": {
                "application/json": {
                    "example": {
                        "id": "123e4567-e89b-12d3-a456-426614174000",
                        "email": "user@example.com",
                        "full_name": "John Doe",
                        "email_verified": True,
                        "trial_credits": 2,
                        "token_balance": 10,
                        "created_at": "2025-10-28T12:00:00Z",
                        "updated_at": "2025-10-28T13:00:00Z"
                    }
                }
            }
        },
        401: {
            "description": "Not authenticated - JWT token missing or invalid",
            "content": {
                "application/json": {
                    "example": {
                        "error": "AuthenticationError",
                        "message": "Authentication required"
                    }
                }
            }
        },
        404: {
            "description": "User not found",
            "content": {
                "application/json": {
                    "example": {
                        "error": "ResourceNotFoundError",
                        "message": "User not found"
                    }
                }
            }
        },
        500: {
            "description": "Internal server error",
            "content": {
                "application/json": {
                    "example": {
                        "error": "InternalServerError",
                        "message": "An unexpected error occurred. Please try again later."
                    }
                }
            }
        }
    }
)
async def get_current_user_info(
    current_user=Depends(get_current_user),
    supabase=Depends(get_supabase_client)
):
    """
    Get current user information.

    Returns user data including trial and token credits.
    Service will raise ResourceNotFoundError if user not found.
    """
    auth_service = AuthService(supabase)

    # Service will raise ResourceNotFoundError if user not found
    user = await auth_service.get_user_with_credits(UUID(current_user.id))

    return user
