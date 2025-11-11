"""
User endpoints for profile and payment status.

Feature: 004-generation-flow
Endpoints:
- GET /users/payment-status: Get user's payment capabilities
- PATCH /users/me/whats-new-modal: Mark What's New modal as shown
"""

from uuid import UUID
from fastapi import APIRouter, HTTPException, Depends, status
from pydantic import BaseModel

from src.models.user import PaymentStatusResponse, User
from src.services.trial_service import TrialService, get_trial_service
from src.services.token_service import TokenService
from src.services.subscription_service import SubscriptionService
from src.db.connection_pool import db_pool
from src.api.dependencies import get_current_user

router = APIRouter(prefix="/users", tags=["users"])


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
