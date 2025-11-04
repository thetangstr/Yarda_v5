"""
Subscription models for Monthly Pro subscription system.

Pydantic models for subscription request/response validation and Stripe integration.

Requirements:
- FR-033: Monthly Pro subscription at $99/month
- FR-034: Unlimited generations for active subscribers
- FR-035: Subscription webhooks update user status
- FR-036: Cancel subscription at period end
- FR-037: Customer portal for subscription management
- T084: Create subscription Pydantic models
"""

from pydantic import BaseModel, Field, field_validator
from typing import Optional, List
from datetime import datetime
from decimal import Decimal
from uuid import UUID


class SubscriptionPlan(BaseModel):
    """
    Subscription plan definition.

    Represents an available subscription tier with pricing and features.
    """
    plan_id: str = Field(..., description="Unique plan identifier (e.g., 'monthly_pro')")
    name: str = Field(..., description="Human-readable plan name")
    description: str = Field(..., description="Plan description")
    price_monthly: Decimal = Field(..., description="Monthly price in USD")
    price_cents: int = Field(..., description="Monthly price in cents")
    features: List[str] = Field(..., description="List of plan features")
    stripe_price_id: str = Field(..., description="Stripe Price ID for checkout")
    is_popular: bool = Field(default=False, description="Whether to highlight as popular")

    model_config = {"from_attributes": True}


class SubscriptionStatus(BaseModel):
    """
    Current subscription status for a user.

    Returned when querying user's subscription state.
    """
    is_active: bool = Field(..., description="Whether subscription is currently active")
    plan: Optional[SubscriptionPlan] = Field(None, description="Current subscription plan")
    current_period_start: Optional[datetime] = Field(None, description="Current billing period start")
    current_period_end: Optional[datetime] = Field(None, description="Current billing period end")
    cancel_at_period_end: bool = Field(default=False, description="Whether subscription will cancel at period end")
    status: str = Field(..., description="Subscription status: inactive, active, past_due, cancelled")

    model_config = {"from_attributes": True}


class CreateSubscriptionRequest(BaseModel):
    """
    Request to create a new subscription checkout session.

    Used when user initiates subscription purchase.
    """
    plan_id: str = Field(..., description="Plan to subscribe to (e.g., 'monthly_pro')")
    success_url: str = Field(..., description="URL to redirect on successful subscription")
    cancel_url: str = Field(..., description="URL to redirect if user cancels")

    @field_validator('plan_id')
    @classmethod
    def validate_plan_id(cls, v):
        """Validate plan_id is supported."""
        valid_plans = ['monthly_pro']  # Can expand to include other tiers
        if v not in valid_plans:
            raise ValueError(f'Invalid plan_id. Must be one of: {", ".join(valid_plans)}')
        return v

    @field_validator('success_url', 'cancel_url')
    @classmethod
    def validate_urls(cls, v):
        """Validate URLs are not empty."""
        if not v or not v.strip():
            raise ValueError('URL cannot be empty')
        return v.strip()


class CreateSubscriptionResponse(BaseModel):
    """
    Response after creating subscription checkout session.

    Contains Stripe session ID and redirect URL.
    """
    session_id: str = Field(..., description="Stripe Checkout Session ID")
    url: str = Field(..., description="Stripe Checkout URL to redirect user")


class CancelSubscriptionRequest(BaseModel):
    """
    Request to cancel subscription.

    Subscription will remain active until end of current period.
    """
    cancel_immediately: bool = Field(
        default=False,
        description="If true, cancel immediately. If false, cancel at period end."
    )


class CancelSubscriptionResponse(BaseModel):
    """
    Response after canceling subscription.
    """
    success: bool
    message: str
    cancel_at_period_end: bool
    current_period_end: Optional[datetime] = None


class CustomerPortalResponse(BaseModel):
    """
    Response with Stripe Customer Portal URL.

    Customer portal allows users to manage their subscription, payment methods, etc.
    """
    url: str = Field(..., description="Stripe Customer Portal URL")


class SubscriptionWebhookData(BaseModel):
    """
    Data extracted from Stripe subscription webhooks.

    Used internally for webhook processing.
    """
    user_id: UUID
    subscription_id: str
    customer_id: str
    status: str  # active, past_due, canceled, etc.
    current_period_start: datetime
    current_period_end: datetime
    cancel_at_period_end: bool
    plan_id: str


# Subscription tier and status enums (matches database schema)
SUBSCRIPTION_TIERS = ['free', '7day_pass', 'per_property', 'monthly_pro']
SUBSCRIPTION_STATUSES = ['inactive', 'active', 'past_due', 'cancelled']


# Monthly Pro plan configuration
MONTHLY_PRO_PLAN = SubscriptionPlan(
    plan_id="monthly_pro",
    name="Monthly Pro",
    description="Unlimited landscape generations with priority processing",
    price_monthly=Decimal("99.00"),
    price_cents=9900,
    features=[
        "Unlimited landscape generations",
        "Priority processing",
        "Advanced AI models",
        "Early access to new features",
        "Premium support",
        "No per-generation costs"
    ],
    stripe_price_id="",  # Will be set from environment variable
    is_popular=True
)


def get_subscription_plan(plan_id: str) -> Optional[SubscriptionPlan]:
    """
    Get subscription plan by ID.

    Args:
        plan_id: Plan identifier

    Returns:
        SubscriptionPlan or None if not found
    """
    if plan_id == "monthly_pro":
        return MONTHLY_PRO_PLAN
    return None
