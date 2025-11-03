"""
Stripe Service

Handles Stripe API interactions for token purchases.

Requirements:
- FR-017: Token purchase via Stripe Checkout
- FR-027: Webhook signature verification
- T048: Stripe checkout session creation
"""

import stripe
import os
from typing import Optional
from uuid import UUID
from ..models.token_account import TOKEN_PACKAGES, get_token_package, TokenPackage


class StripeService:
    """Service for Stripe API operations."""

    def __init__(self):
        """Initialize Stripe service with API key from environment."""
        self.api_key = os.getenv("STRIPE_SECRET_KEY")
        if not self.api_key:
            raise ValueError("STRIPE_SECRET_KEY environment variable not set")

        stripe.api_key = self.api_key

        self.webhook_secret = os.getenv("STRIPE_WEBHOOK_SECRET")
        if not self.webhook_secret:
            raise ValueError("STRIPE_WEBHOOK_SECRET environment variable not set")

        # Frontend URL for redirect
        self.frontend_url = os.getenv("FRONTEND_URL", "http://localhost:3000")

    async def create_checkout_session(
        self,
        user_id: UUID,
        user_email: str,
        package_id: str,
    ) -> dict:
        """
        Create a Stripe Checkout session for token purchase.

        Requirements:
        - FR-017: Token purchase via Stripe
        - TC-STRIPE-1.1: Create checkout session
        - TC-STRIPE-1.2: Correct pricing for all packages

        Args:
            user_id: User ID
            user_email: User's email (for receipt)
            package_id: Token package ID (e.g., "package_50")

        Returns:
            Dict with 'session_id' and 'url' for redirect

        Raises:
            ValueError: If package_id is invalid
        """
        # Get package details
        package = get_token_package(package_id)
        if package is None:
            raise ValueError(f"Invalid package_id: {package_id}")

        try:
            # Create Stripe Checkout session
            session = stripe.checkout.Session.create(
                payment_method_types=["card"],
                mode="payment",
                customer_email=user_email,
                line_items=[
                    {
                        "price_data": {
                            "currency": "usd",
                            "product_data": {
                                "name": f"{package.tokens} Tokens",
                                "description": self._get_package_description(package),
                                "images": [
                                    f"{self.frontend_url}/images/token-icon.png"
                                ],
                            },
                            "unit_amount": package.price_cents,
                        },
                        "quantity": 1,
                    }
                ],
                metadata={
                    "user_id": str(user_id),
                    "package_id": package_id,
                    "tokens": package.tokens,
                },
                success_url=f"{self.frontend_url}/purchase/success?session_id={{CHECKOUT_SESSION_ID}}",
                cancel_url=f"{self.frontend_url}/purchase/cancel",
            )

            return {"session_id": session.id, "url": session.url}

        except stripe.StripeError as e:
            raise Exception(f"Stripe API error: {str(e)}")

    def _get_package_description(self, package: TokenPackage) -> str:
        """Generate package description for Stripe checkout."""
        desc = f"{package.tokens} tokens for landscape generation"

        if package.discount_percent:
            desc += f" • Save {package.discount_percent}%"

        if package.is_best_value:
            desc += " • BEST VALUE"

        desc += f" • ${package.price_per_token} per token"

        return desc

    async def retrieve_session(self, session_id: str) -> Optional[dict]:
        """
        Retrieve a Stripe Checkout session by ID.

        Args:
            session_id: Stripe session ID

        Returns:
            Session dict or None if not found
        """
        try:
            session = stripe.checkout.Session.retrieve(session_id)
            return {
                "id": session.id,
                "payment_status": session.payment_status,
                "customer_email": session.customer_email,
                "amount_total": session.amount_total,
                "metadata": session.metadata,
            }
        except stripe.StripeError:
            return None

    def construct_webhook_event(self, payload: bytes, signature: str) -> Optional[dict]:
        """
        Construct and verify webhook event from Stripe.

        Requirements:
        - FR-027: Webhook signature verification

        Args:
            payload: Raw webhook payload (bytes)
            signature: Stripe signature header

        Returns:
            Webhook event dict or None if verification fails

        Raises:
            ValueError: If signature verification fails
        """
        try:
            event = stripe.Webhook.construct_event(
                payload, signature, self.webhook_secret
            )
            return event
        except stripe.SignatureVerificationError as e:
            raise ValueError(f"Invalid webhook signature: {str(e)}")
        except Exception as e:
            raise ValueError(f"Webhook error: {str(e)}")

    def is_checkout_completed_event(self, event: dict) -> bool:
        """
        Check if event is a successful checkout completion.

        Args:
            event: Stripe webhook event

        Returns:
            True if event is 'checkout.session.completed' with successful payment
        """
        if event.get("type") != "checkout.session.completed":
            return False

        # Check payment status
        session = event.get("data", {}).get("object", {})
        payment_status = session.get("payment_status")

        return payment_status == "paid"

    def extract_checkout_data(self, event: dict) -> Optional[dict]:
        """
        Extract relevant data from checkout.session.completed event.

        Args:
            event: Stripe webhook event

        Returns:
            Dict with user_id, tokens, payment_intent_id, amount_paid, email
            Returns None if data is invalid
        """
        if not self.is_checkout_completed_event(event):
            return None

        session = event.get("data", {}).get("object", {})
        metadata = session.get("metadata", {})

        try:
            return {
                "user_id": metadata.get("user_id"),
                "tokens": int(metadata.get("tokens")),
                "package_id": metadata.get("package_id"),
                "payment_intent_id": session.get("payment_intent"),
                "amount_paid_cents": session.get("amount_total"),
                "customer_email": session.get("customer_email"),
            }
        except (ValueError, TypeError):
            return None

    async def list_all_packages(self) -> list[dict]:
        """
        Get all available token packages.

        Returns:
            List of package dicts with all details
        """
        return [
            {
                "package_id": pkg.package_id,
                "tokens": pkg.tokens,
                "price_usd": float(pkg.price_usd),
                "price_cents": pkg.price_cents,
                "price_per_token": float(pkg.price_per_token),
                "discount_percent": pkg.discount_percent,
                "is_best_value": pkg.is_best_value,
                "description": self._get_package_description(pkg),
            }
            for pkg in TOKEN_PACKAGES
        ]

    async def verify_payment_intent(self, payment_intent_id: str) -> bool:
        """
        Verify a payment intent was successful.

        Args:
            payment_intent_id: Stripe payment intent ID

        Returns:
            True if payment succeeded, False otherwise
        """
        try:
            intent = stripe.PaymentIntent.retrieve(payment_intent_id)
            return intent.status == "succeeded"
        except stripe.StripeError:
            return False
