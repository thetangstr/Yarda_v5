"""
User endpoints for profile and payment status.

Feature: 004-generation-flow
Endpoints:
- GET /v1/users/payment-status: Get user's payment capabilities
- PATCH /v1/users/me/whats-new-modal: Mark What's New modal as shown
- GET /v1/users/me/profile: Get full user profile including language preference
- PUT /v1/users/preferences/language: Update user's language preference
"""

from uuid import UUID
from fastapi import APIRouter, HTTPException, Depends, status
from pydantic import BaseModel, Field

from src.models.user import PaymentStatusResponse, User, UserProfile
from src.services.trial_service import TrialService, get_trial_service
from src.services.token_service import TokenService
from src.services.subscription_service import SubscriptionService
from src.db.connection_pool import db_pool
from src.api.dependencies import get_current_user

router = APIRouter(prefix="/v1/users", tags=["users"])


@router.get("/payment-status", response_model=PaymentStatusResponse)
async def get_payment_status(
    current_user: User = Depends(get_current_user),
) -> PaymentStatusResponse:
    """
    Get user's current payment capabilities.

    Returns payment status including trial credits, token balance, and subscription info.

    **Payment Hierarchy** (FR-007):
    1. Subscription (unlimited if active) - HIGHEST PRIORITY
    2. Trial credits (3 free on registration) - SECOND PRIORITY
    3. Token balance (purchased via Stripe) - LOWEST PRIORITY

    **UI Display** (FR-019):
    - Show trial credits remaining prominently if user has them
    - Show token balance if no trial credits
    - Show "Active Subscription" badge if subscribed
    - Show "Purchase Required" CTA if none available

    Requirements:
    - FR-007: Implement payment hierarchy
    - FR-019: Display active payment method in generate button
    - FR-020: Show trial credits remaining prominently
    """
    user_id = current_user.id

    # Fetch trial balance directly from user record
    trial_remaining = current_user.trial_remaining
    trial_used = current_user.trial_used

    # Default values for now
    token_balance = 0
    subscription_tier = None
    subscription_status = None

    # Determine active payment method (hierarchy: subscription > trial > token > none)
    active_payment_method = "none"
    can_generate = False

    if trial_remaining > 0:
        active_payment_method = "trial"
        can_generate = True

    return PaymentStatusResponse(
        active_payment_method=active_payment_method,
        trial_remaining=trial_remaining,
        trial_used=trial_used,
        token_balance=token_balance,
        subscription_tier=subscription_tier,
        subscription_status=subscription_status,
        can_generate=can_generate
    )


# ============================================================================
# What's New Modal Management
# ============================================================================

class UpdateModalStateRequest(BaseModel):
    """Request to mark What's New modal as shown"""
    modal_shown: bool = True


class UpdateModalStateResponse(BaseModel):
    """Response after updating modal state"""
    success: bool
    whats_new_modal_shown: bool


@router.patch("/me/whats-new-modal", response_model=UpdateModalStateResponse)
async def update_whats_new_modal_state(
    request: UpdateModalStateRequest,
    current_user: User = Depends(get_current_user)
):
    """
    Mark the What's New modal as shown for the current user.

    This endpoint is called when the user dismisses the holiday feature announcement modal.
    Ensures the modal is only shown once per user.

    **Authentication:** Required

    **Request Body:**
    - modal_shown: Boolean to set modal state (default: true)

    **Response:**
    - success: Whether the update was successful
    - whats_new_modal_shown: New state of the modal flag

    **Example:**
    ```bash
    curl -X PATCH https://api.yarda.app/v1/users/me/whats-new-modal \
      -H "Authorization: Bearer YOUR_TOKEN" \
      -H "Content-Type: application/json" \
      -d '{"modal_shown": true}'
    ```
    """
    try:
        # Update user's modal state
        await db_pool.execute(
            """
            UPDATE users
            SET whats_new_modal_shown = $1,
                updated_at = NOW()
            WHERE id = $2
            """,
            request.modal_shown,
            current_user.id
        )

        return UpdateModalStateResponse(
            success=True,
            whats_new_modal_shown=request.modal_shown
        )

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={
                "error": "update_failed",
                "message": f"Failed to update modal state: {str(e)}"
            }
        )


# ============================================================================
# Language Preference Management
# ============================================================================

class UpdateLanguagePreferenceRequest(BaseModel):
    """Request to update user's language preference"""
    language: str = Field(
        ...,
        pattern="^(en|es|zh)$",
        description="Preferred language code: en (English), es (Spanish), zh (Chinese Simplified)"
    )


class UpdateLanguagePreferenceResponse(BaseModel):
    """Response after updating language preference"""
    success: bool
    preferred_language: str


@router.get("/me/profile", response_model=UserProfile)
async def get_user_profile(
    current_user: User = Depends(get_current_user)
) -> UserProfile:
    """
    Get current user's full profile including language preference.

    This endpoint returns the user's complete profile with all available information
    including email, subscription status, trial balance, and language preference.

    **Authentication:** Required

    **Response:**
    - user_id: User's unique identifier
    - email: User's email address
    - email_verified: Whether email is verified
    - trial_remaining: Trial credits remaining
    - trial_used: Trial credits used
    - subscription_tier: Current subscription tier (if any)
    - subscription_status: Subscription status (active/inactive/past_due)
    - preferred_language: User's preferred language (en/es/zh)
    - created_at: Account creation timestamp

    **Example:**
    ```bash
    curl https://api.yarda.app/v1/users/me/profile \
      -H "Authorization: Bearer YOUR_TOKEN"
    ```
    """
    return UserProfile(
        user_id=current_user.id,
        email=current_user.email,
        email_verified=current_user.email_verified,
        trial_remaining=current_user.trial_remaining,
        trial_used=current_user.trial_used,
        subscription_tier=current_user.subscription_tier or "free",
        subscription_status=current_user.subscription_status,
        preferred_language=current_user.preferred_language,
        created_at=current_user.created_at
    )


@router.put("/preferences/language", response_model=UpdateLanguagePreferenceResponse)
async def update_language_preference(
    request: UpdateLanguagePreferenceRequest,
    current_user: User = Depends(get_current_user)
) -> UpdateLanguagePreferenceResponse:
    """
    Update user's preferred language.

    This endpoint allows users to set their preferred language for the UI.
    The preference is persisted in the database and returned in user profile responses.

    **Authentication:** Required

    **Supported Languages:**
    - en: English
    - es: Spanish (Español)
    - zh: Chinese Simplified (简体中文)

    **Request Body:**
    - language: Language code (en, es, or zh)

    **Response:**
    - success: Whether the update was successful
    - preferred_language: The new language preference

    **Example:**
    ```bash
    curl -X PUT https://api.yarda.app/v1/users/preferences/language \
      -H "Authorization: Bearer YOUR_TOKEN" \
      -H "Content-Type: application/json" \
      -d '{"language": "es"}'
    ```

    **Error Responses:**
    - 400: Invalid language code (must be en, es, or zh)
    - 401: Unauthorized (missing or invalid token)
    - 500: Server error
    """
    if request.language not in ["en", "es", "zh"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={
                "error": "invalid_language",
                "message": "Language must be one of: en, es, zh",
                "supported": ["en", "es", "zh"]
            }
        )

    try:
        # Update user's language preference
        await db_pool.execute(
            """
            UPDATE users
            SET preferred_language = $1,
                updated_at = NOW()
            WHERE id = $2
            """,
            request.language,
            current_user.id
        )

        return UpdateLanguagePreferenceResponse(
            success=True,
            preferred_language=request.language
        )

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={
                "error": "update_failed",
                "message": f"Failed to update language preference: {str(e)}"
            }
        )
