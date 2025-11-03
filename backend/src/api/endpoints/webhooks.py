"""
Webhook API Endpoints

Endpoints for processing Stripe webhooks.

Requirements:
- T052: Stripe webhook endpoint
- FR-018: Credit tokens via webhook
- FR-027: Idempotent webhook processing
"""

from fastapi import APIRouter, Request, HTTPException, Depends, Header
import logging

from ...services.webhook_service import WebhookService
from ..dependencies import get_db_pool
import asyncpg


logger = logging.getLogger(__name__)
router = APIRouter(prefix="/webhooks", tags=["webhooks"])


@router.post("/stripe")
async def stripe_webhook(
    request: Request,
    stripe_signature: str = Header(None, alias="Stripe-Signature"),
    db_pool: asyncpg.Pool = Depends(get_db_pool),
):
    """
    Handle Stripe webhook events.

    Requirements:
    - T052: Stripe webhook endpoint
    - FR-018: Credit tokens after successful payment
    - FR-027: Idempotent webhook processing (prevents duplicate credits)

    Supported Events:
    - checkout.session.completed: Credit tokens after successful purchase

    Workflow:
    1. Verify webhook signature (security)
    2. Parse event
    3. Process event based on type
    4. Return 200 immediately (Stripe expects fast response)

    Args:
        request: FastAPI request with raw body
        stripe_signature: Stripe signature header for verification
        db_pool: Database connection pool

    Returns:
        200 OK with processing result

    Raises:
        HTTPException 400: Invalid signature or payload
        HTTPException 500: Processing error (Stripe will retry)
    """
    if not stripe_signature:
        logger.error("Missing Stripe-Signature header")
        raise HTTPException(
            status_code=400, detail="Missing Stripe-Signature header"
        )

    try:
        # Get raw body (required for signature verification)
        payload = await request.body()

        # Process webhook
        webhook_service = WebhookService(db_pool)
        result = await webhook_service.process_webhook_event(
            payload=payload,
            signature=stripe_signature,
        )

        # Log result
        if result["success"]:
            logger.info(
                f"Webhook processed successfully: event_type={result.get('event_type')}, "
                f"duplicate={result.get('duplicate', False)}"
            )
        else:
            logger.error(
                f"Webhook processing failed: event_type={result.get('event_type')}, "
                f"message={result.get('message')}"
            )

        # Return 200 immediately (Stripe expects fast response)
        # Even if processing failed, we return 200 to prevent retries
        # (unless it's a transient error like database connection issue)
        return {
            "received": True,
            "event_type": result.get("event_type"),
            "message": result.get("message"),
        }

    except ValueError as e:
        # Signature verification failed
        logger.error(f"Webhook signature verification failed: {e}")
        raise HTTPException(
            status_code=400,
            detail=f"Invalid webhook signature: {str(e)}",
        )

    except Exception as e:
        # Unexpected error - Stripe will retry
        logger.exception(f"Unexpected webhook processing error: {e}")
        raise HTTPException(
            status_code=500,
            detail="Webhook processing error",
        )


@router.get("/stripe/test")
async def test_webhook_endpoint():
    """
    Test endpoint to verify webhook endpoint is reachable.

    This is NOT a real webhook - just for testing connectivity.

    Returns:
        200 OK with message
    """
    return {
        "success": True,
        "message": "Webhook endpoint is reachable",
        "endpoint": "/webhooks/stripe",
    }
