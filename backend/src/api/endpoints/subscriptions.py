"""
Subscription endpoints for Monthly Pro subscription management.

Endpoints:
- GET /subscriptions/plans: List available subscription plans
- POST /subscriptions/subscribe: Create subscription checkout session
- GET /subscriptions/current: Get current subscription status
- POST /subscriptions/cancel: Cancel subscription
- GET /subscriptions/portal: Get customer portal URL

Requirements:
- FR-033: Monthly Pro subscription at $99/month
- FR-034: Unlimited generations for active subscribers
- FR-036: Cancel subscription at period end
- FR-037: Customer portal for subscription management
- T087-T091: Subscription API endpoints
"""

from uuid import UUID
from typing import List

from fastapi import APIRouter, HTTPException, Depends, status
from fastapi.responses import JSONResponse

from src.models.user import User
from src.models.subscription import (
    SubscriptionPlan,
    SubscriptionStatus,
    CreateSubscriptionRequest,
    CreateSubscriptionResponse,
    CancelSubscriptionRequest,
    CancelSubscriptionResponse,
    CustomerPortalResponse,
    MONTHLY_PRO_PLAN,
)
from src.api.dependencies import get_current_user, require_verified_email
from src.services.subscription_service import SubscriptionService
from src.db.connection_pool import db_pool


router = APIRouter(prefix="/subscriptions", tags=["subscriptions"])


def get_subscription_service() -> SubscriptionService:
    """Dependency to get subscription service instance."""
    return SubscriptionService(db_pool)


@router.get("/plans", response_model=List[SubscriptionPlan])
async def list_subscription_plans():
    """
    List available subscription plans.

    Requirements:
    - FR-033: Show Monthly Pro plan details
    - T087: GET /subscriptions/plans endpoint

    Returns:
        List of available subscription plans with pricing and features
    """
    # For now, we only have Monthly Pro
    # Future: Can add more tiers (weekly, annual, etc.)
    plans = [MONTHLY_PRO_PLAN]

    # Set Stripe price ID from environment
    import os
    price_id = os.getenv("STRIPE_MONTHLY_PRO_PRICE_ID", "")
    if price_id:
        plans[0].stripe_price_id = price_id

    return plans


@router.post("/subscribe", response_model=CreateSubscriptionResponse, status_code=status.HTTP_201_CREATED)
async def create_subscription(
    request: CreateSubscriptionRequest,
    user: User = Depends(require_verified_email),
    subscription_service: SubscriptionService = Depends(get_subscription_service)
):
    """
    Create Stripe Checkout session for subscription.

    Requirements:
    - FR-033: Monthly Pro subscription checkout
    - T088: POST /subscriptions/subscribe endpoint

    Workflow:
    1. Validate plan_id
    2. Create Stripe customer (if needed)
    3. Create Stripe Checkout session
    4. Return session_id and redirect URL

    Args:
        request: CreateSubscriptionRequest with plan_id and redirect URLs
        user: Current authenticated user (verified email required)
        subscription_service: Subscription service

    Returns:
        CreateSubscriptionResponse with Stripe Checkout session URL

    Raises:
        HTTPException 400: Invalid plan_id
        HTTPException 409: User already has active subscription
        HTTPException 500: Stripe API error
    """
    try:
        # Check if user already has active subscription
        current_status = await subscription_service.get_subscription_status(user.id)
        if current_status.is_active and not current_status.cancel_at_period_end:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail={
                    "error": "subscription_already_active",
                    "message": "You already have an active subscription",
                    "current_plan": current_status.plan.plan_id if current_status.plan else None,
                    "current_period_end": current_status.current_period_end,
                }
            )

        # Create checkout session
        response = await subscription_service.create_checkout_session(
            user_id=user.id,
            user_email=user.email,
            plan_id=request.plan_id,
            success_url=request.success_url,
            cancel_url=request.cancel_url
        )

        return response

    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create subscription checkout: {str(e)}"
        )


@router.get("/current", response_model=SubscriptionStatus)
async def get_current_subscription(
    user: User = Depends(get_current_user),
    subscription_service: SubscriptionService = Depends(get_subscription_service)
):
    """
    Get current subscription status for authenticated user.

    Requirements:
    - FR-034: Check if user has active subscription
    - T089: GET /subscriptions/current endpoint

    Args:
        user: Current authenticated user
        subscription_service: Subscription service

    Returns:
        SubscriptionStatus with current subscription details

    Raises:
        HTTPException 500: Database error
    """
    try:
        status = await subscription_service.get_subscription_status(user.id)
        return status

    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e)
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get subscription status: {str(e)}"
        )


@router.post("/cancel", response_model=CancelSubscriptionResponse)
async def cancel_subscription(
    request: CancelSubscriptionRequest,
    user: User = Depends(get_current_user),
    subscription_service: SubscriptionService = Depends(get_subscription_service)
):
    """
    Cancel subscription (at period end by default).

    Requirements:
    - FR-036: Cancel subscription at period end
    - T090: POST /subscriptions/cancel endpoint

    Workflow:
    1. Verify user has active subscription
    2. Cancel in Stripe (at period end or immediately)
    3. Update database
    4. Return cancellation details

    Args:
        request: CancelSubscriptionRequest with cancel_immediately flag
        user: Current authenticated user
        subscription_service: Subscription service

    Returns:
        CancelSubscriptionResponse with cancellation details

    Raises:
        HTTPException 400: No active subscription
        HTTPException 500: Stripe API error
    """
    try:
        response = await subscription_service.cancel_subscription(
            user_id=user.id,
            cancel_immediately=request.cancel_immediately
        )

        return response

    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to cancel subscription: {str(e)}"
        )


@router.get("/portal", response_model=CustomerPortalResponse)
async def get_customer_portal(
    return_url: str,
    user: User = Depends(get_current_user),
    subscription_service: SubscriptionService = Depends(get_subscription_service)
):
    """
    Get Stripe Customer Portal URL for subscription management.

    Requirements:
    - FR-037: Customer portal for self-service subscription management
    - T091: GET /subscriptions/portal endpoint

    The customer portal allows users to:
    - Update payment method
    - View invoices
    - Download receipts
    - Update billing information
    - Cancel subscription

    Args:
        return_url: URL to return to after portal session (query param)
        user: Current authenticated user
        subscription_service: Subscription service

    Returns:
        CustomerPortalResponse with portal URL

    Raises:
        HTTPException 400: User has no Stripe customer ID
        HTTPException 500: Stripe API error
    """
    try:
        response = await subscription_service.get_customer_portal_url(
            user_id=user.id,
            return_url=return_url
        )

        return response

    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create customer portal session: {str(e)}"
        )
