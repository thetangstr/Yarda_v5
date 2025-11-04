"""
Webhook Service

Handles Stripe webhook processing with idempotency.

Requirements:
- FR-018: Webhook credits tokens to user account
- FR-027: Idempotent webhook processing
- FR-035: Subscription webhooks update user status
- FR-038: Email confirmation on successful auto-reload
- FR-039: Increment failure_count on auto-reload failure
- FR-040: Disable auto-reload after 3 failures
- FR-042: Reset failure_count on successful auto-reload
- T049: Webhook service with idempotency
- T073: Auto-reload payment processing
- T086: Extend webhook service for subscriptions
"""

import asyncpg
from uuid import UUID
from typing import Optional, Dict
from datetime import datetime, timezone
import logging

from .stripe_service import StripeService
from .token_service import TokenService
from .auto_reload_service import AutoReloadService
from .subscription_service import SubscriptionService


logger = logging.getLogger(__name__)


class WebhookService:
    """Service for processing Stripe webhooks."""

    def __init__(self, db_pool: asyncpg.Pool):
        """
        Initialize webhook service.

        Args:
            db_pool: Database connection pool
        """
        self.db_pool = db_pool
        self.stripe_service = StripeService()
        self.token_service = TokenService(db_pool)
        self.auto_reload_service = AutoReloadService(db_pool)
        self.subscription_service = SubscriptionService(db_pool)

    async def process_checkout_completed(
        self, event: dict
    ) -> Dict[str, any]:
        """
        Process checkout.session.completed webhook event.

        Requirements:
        - FR-018: Credit tokens after successful payment
        - FR-027: Idempotent processing (prevents duplicate credits)
        - TC-WEBHOOK-1.1: Duplicate webhook prevented

        Workflow:
        1. Extract checkout data (user_id, tokens, payment_intent_id)
        2. Validate payment intent
        3. Add tokens with idempotency (UNIQUE constraint on payment_intent_id)
        4. If duplicate, return success (already processed)

        Args:
            event: Stripe webhook event dict

        Returns:
            Dict with:
            - success: bool
            - message: str
            - transaction_id: UUID (if tokens credited)
            - duplicate: bool (if already processed)
        """
        # Extract data from event
        checkout_data = self.stripe_service.extract_checkout_data(event)

        if checkout_data is None:
            logger.error("Failed to extract checkout data from webhook event")
            return {
                "success": False,
                "message": "Invalid checkout data",
                "duplicate": False,
            }

        user_id_str = checkout_data.get("user_id")
        tokens = checkout_data.get("tokens")
        payment_intent_id = checkout_data.get("payment_intent_id")
        amount_paid_cents = checkout_data.get("amount_paid_cents")
        customer_email = checkout_data.get("customer_email")

        # Validate required fields
        if not all([user_id_str, tokens, payment_intent_id]):
            logger.error(
                f"Missing required fields in webhook: user_id={user_id_str}, "
                f"tokens={tokens}, payment_intent_id={payment_intent_id}"
            )
            return {
                "success": False,
                "message": "Missing required fields",
                "duplicate": False,
            }

        try:
            user_id = UUID(user_id_str)
        except (ValueError, TypeError) as e:
            logger.error(f"Invalid user_id format: {user_id_str}, error: {e}")
            return {
                "success": False,
                "message": "Invalid user_id format",
                "duplicate": False,
            }

        # Verify payment intent is successful
        payment_verified = await self.stripe_service.verify_payment_intent(
            payment_intent_id
        )
        if not payment_verified:
            logger.error(f"Payment intent {payment_intent_id} not successful")
            return {
                "success": False,
                "message": "Payment not verified",
                "duplicate": False,
            }

        # Create token account if it doesn't exist
        await self.token_service.create_token_account(user_id, initial_balance=0)

        # Add tokens with idempotency
        # UNIQUE constraint on stripe_payment_intent_id prevents duplicates
        success, transaction_id = await self.token_service.add_tokens(
            user_id=user_id,
            tokens=tokens,
            transaction_type="purchase",
            description=f"Purchased {tokens} tokens",
            stripe_payment_intent_id=payment_intent_id,
            price_paid_cents=amount_paid_cents,
        )

        if not success:
            # Duplicate payment_intent_id - webhook already processed
            logger.info(
                f"Webhook already processed for payment_intent_id={payment_intent_id}"
            )
            return {
                "success": True,  # Return success to Stripe (idempotent)
                "message": "Webhook already processed (idempotent)",
                "duplicate": True,
            }

        # Tokens credited successfully
        logger.info(
            f"Tokens credited: user_id={user_id}, tokens={tokens}, "
            f"payment_intent_id={payment_intent_id}, transaction_id={transaction_id}"
        )

        # Check if this was an auto-reload purchase (FR-042)
        is_auto_reload = checkout_data.get("auto_reload", False)
        if is_auto_reload:
            # Reset failure count on successful auto-reload
            await self.auto_reload_service.record_reload_success(user_id)
            logger.info(f"Auto-reload successful for user {user_id}, failure count reset")
            # TODO (FR-038): Send email confirmation on successful auto-reload

        return {
            "success": True,
            "message": f"{tokens} tokens credited successfully",
            "transaction_id": transaction_id,
            "duplicate": False,
            "auto_reload": is_auto_reload,
        }

    async def process_payment_failed(self, event: dict) -> Dict[str, any]:
        """
        Process payment_intent.payment_failed webhook event for auto-reload.

        Requirements:
        - FR-039: Increment failure_count on auto-reload payment failure
        - FR-040: Disable auto_reload_enabled after 3 consecutive failures
        - FR-041: Send email notification on auto-reload failure

        Args:
            event: Stripe webhook event dict

        Returns:
            Dict with success status and message
        """
        payment_intent = event.get("data", {}).get("object", {})
        metadata = payment_intent.get("metadata", {})

        # Check if this was an auto-reload payment
        is_auto_reload = metadata.get("auto_reload") == "true"
        if not is_auto_reload:
            logger.info("Payment failure was not for auto-reload, ignoring")
            return {
                "success": True,
                "message": "Payment failure acknowledged (not auto-reload)",
            }

        # Extract user_id from metadata
        user_id_str = metadata.get("user_id")
        if not user_id_str:
            logger.error("No user_id in payment_intent metadata")
            return {
                "success": False,
                "message": "Missing user_id in metadata",
            }

        try:
            user_id = UUID(user_id_str)
        except (ValueError, TypeError) as e:
            logger.error(f"Invalid user_id format: {user_id_str}, error: {e}")
            return {
                "success": False,
                "message": "Invalid user_id format",
            }

        # Record auto-reload failure
        disabled = await self.auto_reload_service.record_reload_failure(user_id)

        if disabled:
            logger.warning(
                f"Auto-reload DISABLED for user {user_id} after 3 consecutive failures"
            )
            # TODO (FR-041): Send email notification about auto-reload disabled
            return {
                "success": True,
                "message": "Auto-reload disabled after 3 failures",
                "auto_reload_disabled": True,
            }
        else:
            logger.info(f"Auto-reload failure recorded for user {user_id}")
            # TODO (FR-041): Send email notification about payment failure
            return {
                "success": True,
                "message": "Auto-reload failure recorded",
                "auto_reload_disabled": False,
            }

    async def process_subscription_created(self, event: dict) -> Dict[str, any]:
        """
        Process customer.subscription.created webhook event.

        Requirements:
        - FR-035: Subscription webhooks update user status
        - T086: Activate subscription on creation

        Args:
            event: Stripe webhook event dict

        Returns:
            Dict with success status and message
        """
        subscription = event.get("data", {}).get("object", {})

        # Extract subscription data
        subscription_id = subscription.get("id")
        customer_id = subscription.get("customer")
        status = subscription.get("status")
        current_period_start = subscription.get("current_period_start")
        current_period_end = subscription.get("current_period_end")
        metadata = subscription.get("metadata", {})

        # Get user_id from metadata or lookup by customer_id
        user_id_str = metadata.get("user_id")
        if user_id_str:
            try:
                user_id = UUID(user_id_str)
            except (ValueError, TypeError):
                user_id = None
        else:
            user_id = None

        if not user_id:
            # Lookup user by customer_id
            user_id = await self.subscription_service.get_user_id_by_customer_id(customer_id)

        if not user_id:
            logger.error(f"Could not find user for subscription {subscription_id}")
            return {
                "success": False,
                "message": "User not found for subscription",
            }

        # Get plan_id from metadata (default to monthly_pro)
        plan_id = metadata.get("plan_id", "monthly_pro")

        # Convert timestamps
        period_start = datetime.fromtimestamp(current_period_start, tz=timezone.utc)
        period_end = datetime.fromtimestamp(current_period_end, tz=timezone.utc)

        # Activate subscription
        await self.subscription_service.activate_subscription(
            user_id=user_id,
            subscription_id=subscription_id,
            customer_id=customer_id,
            plan_id=plan_id,
            current_period_start=period_start,
            current_period_end=period_end
        )

        logger.info(f"Subscription created and activated: user={user_id}, subscription={subscription_id}")

        return {
            "success": True,
            "message": "Subscription activated",
            "user_id": str(user_id),
            "subscription_id": subscription_id,
        }

    async def process_subscription_updated(self, event: dict) -> Dict[str, any]:
        """
        Process customer.subscription.updated webhook event.

        Requirements:
        - FR-035: Subscription webhooks update user status
        - T086: Update subscription status on changes

        Args:
            event: Stripe webhook event dict

        Returns:
            Dict with success status and message
        """
        subscription = event.get("data", {}).get("object", {})

        subscription_id = subscription.get("id")
        status = subscription.get("status")
        current_period_end = subscription.get("current_period_end")
        cancel_at_period_end = subscription.get("cancel_at_period_end", False)

        # Find user by subscription_id
        user_id = await self.subscription_service.get_user_id_by_subscription_id(subscription_id)

        if not user_id:
            logger.error(f"Could not find user for subscription {subscription_id}")
            return {
                "success": False,
                "message": "User not found for subscription",
            }

        # Convert timestamp
        period_end = datetime.fromtimestamp(current_period_end, tz=timezone.utc)

        # Update subscription status
        await self.subscription_service.update_subscription_status(
            user_id=user_id,
            status=status,
            current_period_end=period_end,
            cancel_at_period_end=cancel_at_period_end
        )

        logger.info(
            f"Subscription updated: user={user_id}, subscription={subscription_id}, "
            f"status={status}, cancel_at_period_end={cancel_at_period_end}"
        )

        return {
            "success": True,
            "message": "Subscription status updated",
            "user_id": str(user_id),
            "status": status,
        }

    async def process_subscription_deleted(self, event: dict) -> Dict[str, any]:
        """
        Process customer.subscription.deleted webhook event.

        Requirements:
        - FR-035: Subscription webhooks update user status
        - T086: Deactivate subscription on deletion

        Args:
            event: Stripe webhook event dict

        Returns:
            Dict with success status and message
        """
        subscription = event.get("data", {}).get("object", {})

        subscription_id = subscription.get("id")

        # Find user by subscription_id
        user_id = await self.subscription_service.get_user_id_by_subscription_id(subscription_id)

        if not user_id:
            logger.error(f"Could not find user for subscription {subscription_id}")
            return {
                "success": False,
                "message": "User not found for subscription",
            }

        # Deactivate subscription
        await self.subscription_service.deactivate_subscription(user_id)

        logger.info(f"Subscription deleted and deactivated: user={user_id}, subscription={subscription_id}")

        return {
            "success": True,
            "message": "Subscription deactivated",
            "user_id": str(user_id),
        }

    async def process_invoice_payment_succeeded(self, event: dict) -> Dict[str, any]:
        """
        Process invoice.payment_succeeded webhook event.

        Requirements:
        - FR-035: Confirm subscription payment
        - T086: Ensure subscription remains active after successful payment

        Args:
            event: Stripe webhook event dict

        Returns:
            Dict with success status and message
        """
        invoice = event.get("data", {}).get("object", {})

        subscription_id = invoice.get("subscription")
        customer_id = invoice.get("customer")

        if not subscription_id:
            # Not a subscription invoice, ignore
            logger.info("Invoice payment succeeded but not for subscription")
            return {
                "success": True,
                "message": "Non-subscription invoice acknowledged",
            }

        # Find user by subscription_id
        user_id = await self.subscription_service.get_user_id_by_subscription_id(subscription_id)

        if not user_id:
            logger.warning(f"Could not find user for subscription {subscription_id}")
            return {
                "success": True,
                "message": "User not found but invoice acknowledged",
            }

        # Ensure subscription is active
        await self.subscription_service.update_subscription_status(
            user_id=user_id,
            status='active'
        )

        logger.info(f"Invoice payment succeeded: user={user_id}, subscription={subscription_id}")

        return {
            "success": True,
            "message": "Subscription payment confirmed",
            "user_id": str(user_id),
        }

    async def process_invoice_payment_failed(self, event: dict) -> Dict[str, any]:
        """
        Process invoice.payment_failed webhook event.

        Requirements:
        - FR-035: Handle failed subscription payment
        - T086: Update subscription to past_due status

        Args:
            event: Stripe webhook event dict

        Returns:
            Dict with success status and message
        """
        invoice = event.get("data", {}).get("object", {})

        subscription_id = invoice.get("subscription")

        if not subscription_id:
            # Not a subscription invoice, ignore
            logger.info("Invoice payment failed but not for subscription")
            return {
                "success": True,
                "message": "Non-subscription invoice acknowledged",
            }

        # Find user by subscription_id
        user_id = await self.subscription_service.get_user_id_by_subscription_id(subscription_id)

        if not user_id:
            logger.warning(f"Could not find user for subscription {subscription_id}")
            return {
                "success": True,
                "message": "User not found but invoice acknowledged",
            }

        # Update subscription to past_due (grace period)
        await self.subscription_service.update_subscription_status(
            user_id=user_id,
            status='past_due'
        )

        logger.warning(f"Invoice payment failed: user={user_id}, subscription={subscription_id}")
        # TODO: Send email notification about failed payment

        return {
            "success": True,
            "message": "Subscription marked as past_due",
            "user_id": str(user_id),
        }

    async def process_webhook_event(
        self, payload: bytes, signature: str
    ) -> Dict[str, any]:
        """
        Process incoming Stripe webhook.

        Requirements:
        - FR-027: Verify webhook signature
        - FR-018: Process checkout completed events
        - FR-035: Process subscription events
        - T073: Process auto-reload payment failures
        - T086: Process subscription webhooks

        Args:
            payload: Raw webhook payload (bytes)
            signature: Stripe signature header

        Returns:
            Dict with:
            - success: bool
            - message: str
            - event_type: str
        """
        # Construct and verify webhook event
        try:
            event = self.stripe_service.construct_webhook_event(payload, signature)
        except ValueError as e:
            logger.error(f"Webhook signature verification failed: {e}")
            return {
                "success": False,
                "message": str(e),
                "event_type": None,
            }

        event_type = event.get("type")
        logger.info(f"Processing webhook event: {event_type}")

        # Process checkout.session.completed events (token purchases)
        if event_type == "checkout.session.completed":
            result = await self.process_checkout_completed(event)
            return {
                "success": result["success"],
                "message": result["message"],
                "event_type": event_type,
                "duplicate": result.get("duplicate", False),
                "transaction_id": result.get("transaction_id"),
                "auto_reload": result.get("auto_reload", False),
            }

        # Process payment_intent.payment_failed events (for auto-reload)
        elif event_type == "payment_intent.payment_failed":
            result = await self.process_payment_failed(event)
            return {
                "success": result["success"],
                "message": result["message"],
                "event_type": event_type,
                "auto_reload_disabled": result.get("auto_reload_disabled", False),
            }

        # Process subscription events
        elif event_type == "customer.subscription.created":
            result = await self.process_subscription_created(event)
            return {
                "success": result["success"],
                "message": result["message"],
                "event_type": event_type,
                "user_id": result.get("user_id"),
            }

        elif event_type == "customer.subscription.updated":
            result = await self.process_subscription_updated(event)
            return {
                "success": result["success"],
                "message": result["message"],
                "event_type": event_type,
                "user_id": result.get("user_id"),
            }

        elif event_type == "customer.subscription.deleted":
            result = await self.process_subscription_deleted(event)
            return {
                "success": result["success"],
                "message": result["message"],
                "event_type": event_type,
                "user_id": result.get("user_id"),
            }

        elif event_type == "invoice.payment_succeeded":
            result = await self.process_invoice_payment_succeeded(event)
            return {
                "success": result["success"],
                "message": result["message"],
                "event_type": event_type,
                "user_id": result.get("user_id"),
            }

        elif event_type == "invoice.payment_failed":
            result = await self.process_invoice_payment_failed(event)
            return {
                "success": result["success"],
                "message": result["message"],
                "event_type": event_type,
                "user_id": result.get("user_id"),
            }

        # Other event types - acknowledge but don't process
        logger.info(f"Webhook event type '{event_type}' acknowledged but not processed")
        return {
            "success": True,
            "message": f"Event type '{event_type}' acknowledged",
            "event_type": event_type,
        }

    async def get_user_id_from_email(self, email: str) -> Optional[UUID]:
        """
        Get user ID from email address.

        Used as fallback if user_id not in webhook metadata.

        Args:
            email: User's email address

        Returns:
            User ID or None if not found
        """
        async with self.db_pool.acquire() as conn:
            user_id = await conn.fetchval(
                """
                SELECT id FROM users WHERE email = $1
            """,
                email,
            )
            return user_id

    async def get_webhook_processing_status(
        self, payment_intent_id: str
    ) -> Optional[dict]:
        """
        Check if a webhook has already been processed.

        Args:
            payment_intent_id: Stripe payment intent ID

        Returns:
            Dict with transaction details or None if not processed
        """
        async with self.db_pool.acquire() as conn:
            tx = await conn.fetchrow(
                """
                SELECT
                    id,
                    user_id,
                    amount,
                    transaction_type,
                    created_at
                FROM users_token_transactions
                WHERE stripe_payment_intent_id = $1
            """,
                payment_intent_id,
            )

            if tx is None:
                return None

            return dict(tx)
