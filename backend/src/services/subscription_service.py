"""
Subscription Service

Handles Monthly Pro subscription operations with Stripe integration.

Requirements:
- FR-033: Monthly Pro subscription at $99/month
- FR-034: Unlimited generations for active subscribers
- FR-035: Subscription webhooks update user status
- FR-036: Cancel subscription at period end
- FR-037: Customer portal for subscription management
- T085: Implement subscription service
"""

import stripe
import asyncpg
from uuid import UUID
from typing import Optional, Dict, Tuple
from datetime import datetime, timezone
import logging

from ..models.subscription import (
    SubscriptionPlan,
    SubscriptionStatus,
    CreateSubscriptionResponse,
    CancelSubscriptionResponse,
    CustomerPortalResponse,
    MONTHLY_PRO_PLAN,
    get_subscription_plan
)

logger = logging.getLogger(__name__)


class SubscriptionService:
    """Service for subscription management with Stripe integration."""

    def __init__(self, db_pool: asyncpg.Pool):
        """
        Initialize subscription service.

        Args:
            db_pool: Database connection pool
        """
        self.db_pool = db_pool

        from ..config import settings
        self.stripe_secret_key = settings.stripe_secret_key
        self.frontend_url = settings.frontend_url
        stripe.api_key = self.stripe_secret_key

        # Get Stripe price ID from environment
        self.monthly_pro_price_id = self._get_stripe_price_id()

    def _get_stripe_price_id(self) -> str:
        """
        Get Stripe Price ID for Monthly Pro from environment.

        Returns:
            Stripe Price ID or raises ValueError if not configured
        """
        import os
        price_id = os.getenv("STRIPE_MONTHLY_PRO_PRICE_ID", "")

        if not price_id:
            logger.warning(
                "STRIPE_MONTHLY_PRO_PRICE_ID not set in environment. "
                "Subscription checkout will fail. Please configure in Stripe Dashboard."
            )
            # Use placeholder for development
            return "price_placeholder_monthly_pro"

        return price_id

    async def create_checkout_session(
        self,
        user_id: UUID,
        user_email: str,
        plan_id: str,
        success_url: str,
        cancel_url: str
    ) -> CreateSubscriptionResponse:
        """
        Create Stripe Checkout session for subscription.

        Requirements:
        - FR-033: Monthly Pro subscription checkout
        - TC-SUB-1.1: Create checkout session with correct pricing

        Args:
            user_id: User UUID
            user_email: User's email for receipt
            plan_id: Plan to subscribe to (e.g., 'monthly_pro')
            success_url: Redirect URL on success
            cancel_url: Redirect URL on cancel

        Returns:
            CreateSubscriptionResponse with session_id and url

        Raises:
            ValueError: If plan_id is invalid
            Exception: If Stripe API call fails
        """
        # Get plan configuration
        plan = get_subscription_plan(plan_id)
        if plan is None:
            raise ValueError(f"Invalid plan_id: {plan_id}")

        try:
            # Get or create Stripe customer
            customer_id = await self._get_or_create_stripe_customer(user_id, user_email)

            # Create Stripe Checkout session for subscription
            session = stripe.checkout.Session.create(
                customer=customer_id,
                payment_method_types=["card"],
                mode="subscription",
                line_items=[
                    {
                        "price": self.monthly_pro_price_id,
                        "quantity": 1,
                    }
                ],
                metadata={
                    "user_id": str(user_id),
                    "plan_id": plan_id,
                },
                subscription_data={
                    "metadata": {
                        "user_id": str(user_id),
                        "plan_id": plan_id,
                    }
                },
                success_url=success_url,
                cancel_url=cancel_url,
                allow_promotion_codes=True,  # Allow promo codes
            )

            logger.info(
                f"Created subscription checkout session for user {user_id}: "
                f"session_id={session.id}, customer_id={customer_id}"
            )

            return CreateSubscriptionResponse(
                session_id=session.id,
                url=session.url
            )

        except stripe.StripeError as e:
            logger.error(f"Stripe API error creating checkout session: {e}")
            raise Exception(f"Failed to create checkout session: {str(e)}")

    async def _get_or_create_stripe_customer(
        self,
        user_id: UUID,
        user_email: str
    ) -> str:
        """
        Get existing Stripe customer ID or create new customer.

        Args:
            user_id: User UUID
            user_email: User's email

        Returns:
            Stripe customer ID
        """
        # Check if user already has a Stripe customer ID
        async with self.db_pool.acquire() as conn:
            customer_id = await conn.fetchval(
                "SELECT stripe_customer_id FROM users WHERE id = $1",
                user_id
            )

        if customer_id:
            logger.info(f"Using existing Stripe customer: {customer_id}")
            return customer_id

        # Create new Stripe customer
        try:
            customer = stripe.Customer.create(
                email=user_email,
                metadata={
                    "user_id": str(user_id),
                }
            )

            # Save customer ID to database
            async with self.db_pool.acquire() as conn:
                await conn.execute(
                    """
                    UPDATE users
                    SET stripe_customer_id = $1, updated_at = NOW()
                    WHERE id = $2
                    """,
                    customer.id,
                    user_id
                )

            logger.info(f"Created new Stripe customer: {customer.id}")
            return customer.id

        except stripe.StripeError as e:
            logger.error(f"Failed to create Stripe customer: {e}")
            raise Exception(f"Failed to create customer: {str(e)}")

    async def get_subscription_status(
        self,
        user_id: UUID
    ) -> SubscriptionStatus:
        """
        Get current subscription status for user.

        Requirements:
        - FR-034: Check if user has active subscription

        Args:
            user_id: User UUID

        Returns:
            SubscriptionStatus with current state
        """
        async with self.db_pool.acquire() as conn:
            user = await conn.fetchrow(
                """
                SELECT
                    subscription_tier,
                    subscription_status,
                    stripe_subscription_id,
                    current_period_end,
                    cancel_at_period_end
                FROM users
                WHERE id = $1
                """,
                user_id
            )

        if not user:
            raise ValueError(f"User not found: {user_id}")

        # Check if subscription is active
        is_active = user['subscription_status'] in ['active', 'past_due']

        # Get plan details if subscribed
        plan = None
        if user['subscription_tier'] != 'free':
            plan = get_subscription_plan(user['subscription_tier'])

        # Get period start from Stripe if we have subscription ID
        current_period_start = None
        if user['stripe_subscription_id']:
            try:
                stripe_sub = stripe.Subscription.retrieve(user['stripe_subscription_id'])
                current_period_start = datetime.fromtimestamp(
                    stripe_sub.current_period_start,
                    tz=timezone.utc
                )
            except stripe.StripeError as e:
                logger.warning(f"Failed to retrieve Stripe subscription: {e}")

        return SubscriptionStatus(
            is_active=is_active,
            plan=plan,
            current_period_start=current_period_start,
            current_period_end=user['current_period_end'],
            cancel_at_period_end=user['cancel_at_period_end'],
            status=user['subscription_status']
        )

    async def cancel_subscription(
        self,
        user_id: UUID,
        cancel_immediately: bool = False
    ) -> CancelSubscriptionResponse:
        """
        Cancel subscription (at period end by default).

        Requirements:
        - FR-036: Cancel subscription at period end
        - TC-SUB-3.1: User keeps access until period end

        Args:
            user_id: User UUID
            cancel_immediately: If True, cancel immediately. If False, at period end.

        Returns:
            CancelSubscriptionResponse with cancellation details

        Raises:
            ValueError: If user has no active subscription
        """
        async with self.db_pool.acquire() as conn:
            user = await conn.fetchrow(
                """
                SELECT
                    stripe_subscription_id,
                    subscription_status,
                    current_period_end
                FROM users
                WHERE id = $1
                """,
                user_id
            )

        if not user or not user['stripe_subscription_id']:
            raise ValueError("No active subscription found")

        if user['subscription_status'] not in ['active', 'past_due']:
            raise ValueError("Subscription is not active")

        try:
            # Cancel subscription in Stripe
            subscription = stripe.Subscription.modify(
                user['stripe_subscription_id'],
                cancel_at_period_end=not cancel_immediately
            )

            if cancel_immediately:
                # Delete immediately
                subscription = stripe.Subscription.delete(user['stripe_subscription_id'])

            # Update database
            async with self.db_pool.acquire() as conn:
                await conn.execute(
                    """
                    UPDATE users
                    SET
                        cancel_at_period_end = $1,
                        subscription_status = CASE
                            WHEN $2 THEN 'cancelled'
                            ELSE subscription_status
                        END,
                        updated_at = NOW()
                    WHERE id = $3
                    """,
                    not cancel_immediately,  # cancel_at_period_end
                    cancel_immediately,      # update status if immediate
                    user_id
                )

            logger.info(
                f"Subscription cancelled for user {user_id}: "
                f"immediate={cancel_immediately}, subscription_id={user['stripe_subscription_id']}"
            )

            return CancelSubscriptionResponse(
                success=True,
                message=(
                    "Subscription cancelled immediately"
                    if cancel_immediately
                    else "Subscription will cancel at end of billing period"
                ),
                cancel_at_period_end=not cancel_immediately,
                current_period_end=user['current_period_end'] if not cancel_immediately else None
            )

        except stripe.StripeError as e:
            logger.error(f"Failed to cancel subscription: {e}")
            raise Exception(f"Failed to cancel subscription: {str(e)}")

    async def get_customer_portal_url(
        self,
        user_id: UUID,
        return_url: str
    ) -> CustomerPortalResponse:
        """
        Get Stripe Customer Portal URL for subscription management.

        Requirements:
        - FR-037: Customer portal for self-service subscription management

        Args:
            user_id: User UUID
            return_url: URL to return to after portal session

        Returns:
            CustomerPortalResponse with portal URL

        Raises:
            ValueError: If user has no Stripe customer ID
        """
        async with self.db_pool.acquire() as conn:
            customer_id = await conn.fetchval(
                "SELECT stripe_customer_id FROM users WHERE id = $1",
                user_id
            )

        if not customer_id:
            raise ValueError("User has no Stripe customer ID. Please purchase tokens or subscribe first.")

        try:
            # Create customer portal session
            session = stripe.billing_portal.Session.create(
                customer=customer_id,
                return_url=return_url
            )

            logger.info(f"Created customer portal session for user {user_id}")

            return CustomerPortalResponse(url=session.url)

        except stripe.StripeError as e:
            logger.error(f"Failed to create customer portal session: {e}")
            raise Exception(f"Failed to create portal session: {str(e)}")

    async def activate_subscription(
        self,
        user_id: UUID,
        subscription_id: str,
        customer_id: str,
        plan_id: str,
        current_period_start: datetime,
        current_period_end: datetime
    ) -> bool:
        """
        Activate subscription after successful payment.

        Called by webhook handler when subscription is created/activated.

        Args:
            user_id: User UUID
            subscription_id: Stripe subscription ID
            customer_id: Stripe customer ID
            plan_id: Plan tier (e.g., 'monthly_pro')
            current_period_start: Billing period start
            current_period_end: Billing period end

        Returns:
            True if activation successful
        """
        async with self.db_pool.acquire() as conn:
            await conn.execute(
                """
                UPDATE users
                SET
                    subscription_tier = $1,
                    subscription_status = 'active',
                    stripe_customer_id = $2,
                    stripe_subscription_id = $3,
                    current_period_end = $4,
                    cancel_at_period_end = false,
                    updated_at = NOW()
                WHERE id = $5
                """,
                plan_id,
                customer_id,
                subscription_id,
                current_period_end,
                user_id
            )

        logger.info(
            f"Activated subscription for user {user_id}: "
            f"plan={plan_id}, subscription_id={subscription_id}"
        )

        return True

    async def update_subscription_status(
        self,
        user_id: UUID,
        status: str,
        current_period_end: Optional[datetime] = None,
        cancel_at_period_end: Optional[bool] = None
    ) -> bool:
        """
        Update subscription status.

        Called by webhook handler when subscription status changes.

        Args:
            user_id: User UUID
            status: New status (active, past_due, cancelled, etc.)
            current_period_end: Updated period end (optional)
            cancel_at_period_end: Updated cancellation flag (optional)

        Returns:
            True if update successful
        """
        # Map Stripe statuses to our schema
        status_map = {
            'active': 'active',
            'past_due': 'past_due',
            'canceled': 'cancelled',
            'cancelled': 'cancelled',
            'unpaid': 'cancelled',
            'incomplete': 'inactive',
            'incomplete_expired': 'inactive',
            'trialing': 'active',  # Treat trial as active
        }

        mapped_status = status_map.get(status, 'inactive')

        async with self.db_pool.acquire() as conn:
            query_parts = ["UPDATE users SET subscription_status = $1, updated_at = NOW()"]
            params = [mapped_status]
            param_idx = 2

            if current_period_end is not None:
                query_parts.append(f"current_period_end = ${param_idx}")
                params.append(current_period_end)
                param_idx += 1

            if cancel_at_period_end is not None:
                query_parts.append(f"cancel_at_period_end = ${param_idx}")
                params.append(cancel_at_period_end)
                param_idx += 1

            # Add WHERE clause
            query_parts.append(f"WHERE id = ${param_idx}")
            params.append(user_id)

            query = ", ".join(query_parts[1:])
            full_query = f"{query_parts[0]}, {query}"

            await conn.execute(full_query, *params)

        logger.info(f"Updated subscription status for user {user_id}: status={mapped_status}")

        return True

    async def deactivate_subscription(
        self,
        user_id: UUID
    ) -> bool:
        """
        Deactivate subscription.

        Called by webhook handler when subscription is deleted/cancelled.

        Args:
            user_id: User UUID

        Returns:
            True if deactivation successful
        """
        async with self.db_pool.acquire() as conn:
            await conn.execute(
                """
                UPDATE users
                SET
                    subscription_tier = 'free',
                    subscription_status = 'cancelled',
                    stripe_subscription_id = NULL,
                    current_period_end = NULL,
                    cancel_at_period_end = false,
                    updated_at = NOW()
                WHERE id = $1
                """,
                user_id
            )

        logger.info(f"Deactivated subscription for user {user_id}")

        return True

    async def get_user_id_by_subscription_id(
        self,
        subscription_id: str
    ) -> Optional[UUID]:
        """
        Get user ID by Stripe subscription ID.

        Used by webhook handlers to find user from subscription events.

        Args:
            subscription_id: Stripe subscription ID

        Returns:
            User UUID or None if not found
        """
        async with self.db_pool.acquire() as conn:
            user_id = await conn.fetchval(
                "SELECT id FROM users WHERE stripe_subscription_id = $1",
                subscription_id
            )

        return user_id

    async def get_user_id_by_customer_id(
        self,
        customer_id: str
    ) -> Optional[UUID]:
        """
        Get user ID by Stripe customer ID.

        Used by webhook handlers to find user from customer events.

        Args:
            customer_id: Stripe customer ID

        Returns:
            User UUID or None if not found
        """
        async with self.db_pool.acquire() as conn:
            user_id = await conn.fetchval(
                "SELECT id FROM users WHERE stripe_customer_id = $1",
                customer_id
            )

        return user_id
