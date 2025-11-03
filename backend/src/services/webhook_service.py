"""
Webhook Service

Handles Stripe webhook processing with idempotency.

Requirements:
- FR-018: Webhook credits tokens to user account
- FR-027: Idempotent webhook processing
- T049: Webhook service with idempotency
"""

import asyncpg
from uuid import UUID
from typing import Optional, Dict
import logging

from .stripe_service import StripeService
from .token_service import TokenService


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

        return {
            "success": True,
            "message": f"{tokens} tokens credited successfully",
            "transaction_id": transaction_id,
            "duplicate": False,
        }

    async def process_webhook_event(
        self, payload: bytes, signature: str
    ) -> Dict[str, any]:
        """
        Process incoming Stripe webhook.

        Requirements:
        - FR-027: Verify webhook signature
        - FR-018: Process checkout completed events

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

        # Process checkout.session.completed events
        if event_type == "checkout.session.completed":
            result = await self.process_checkout_completed(event)
            return {
                "success": result["success"],
                "message": result["message"],
                "event_type": event_type,
                "duplicate": result.get("duplicate", False),
                "transaction_id": result.get("transaction_id"),
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
