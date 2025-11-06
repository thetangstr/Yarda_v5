"""
User endpoints for profile and payment status.

Feature: 004-generation-flow
Endpoints:
- GET /users/payment-status: Get user's payment capabilities
"""

from uuid import UUID
from fastapi import APIRouter, HTTPException, Depends, status

from src.models.user import PaymentStatusResponse
from src.services.trial_service import TrialService, get_trial_service
from src.services.token_service import TokenService
from src.services.subscription_service import SubscriptionService
from src.db.connection_pool import db_pool
from src.api.dependencies import get_current_user

router = APIRouter(prefix="/users", tags=["users"])


@router.get("/payment-status", response_model=PaymentStatusResponse)
async def get_payment_status(
    current_user: dict = Depends(get_current_user),
    trial_service: TrialService = Depends(get_trial_service),
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
    user_id = current_user["id"]

    try:
        # Initialize services
        token_service = TokenService(db_pool)
        subscription_service = SubscriptionService(db_pool)

        # Get trial balance
        trial_remaining, trial_used = await trial_service.get_trial_balance(user_id)

        # Get token balance
        token_balance, _, _ = await token_service.get_token_balance(user_id)

        # Get subscription status
        subscription_info = await subscription_service.get_subscription_status(user_id)

        # Determine active payment method (hierarchy: subscription > trial > token > none)
        active_payment_method = "none"
        can_generate = False

        if subscription_info and subscription_info.status == 'active':
            active_payment_method = "subscription"
            can_generate = True
        elif trial_remaining > 0:
            active_payment_method = "trial"
            can_generate = True
        elif token_balance > 0:
            active_payment_method = "token"
            can_generate = True

        return PaymentStatusResponse(
            active_payment_method=active_payment_method,
            trial_remaining=trial_remaining,
            trial_used=trial_used,
            token_balance=token_balance,
            subscription_tier=subscription_info.tier if subscription_info else None,
            subscription_status=subscription_info.status if subscription_info else None,
            can_generate=can_generate
        )

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to retrieve payment status: {str(e)}"
        )
