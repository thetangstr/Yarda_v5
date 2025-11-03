"""
Token Purchase API Endpoints

Endpoints for token purchase and balance management.

Requirements:
- T050: Token purchase endpoint (create checkout session)
- T051: Token balance endpoint (<100ms)
"""

from fastapi import APIRouter, Depends, HTTPException
from typing import List
from uuid import UUID

from ...models.token_account import (
    CreateCheckoutSessionRequest,
    CreateCheckoutSessionResponse,
    TokenAccountResponse,
    TokenTransactionResponse,
    TokenPackage,
)
from ...models.user import User
from ...services.stripe_service import StripeService
from ...services.token_service import TokenService
from ..dependencies import get_current_user, get_db_pool

import asyncpg


router = APIRouter(prefix="/tokens", tags=["tokens"])


@router.get("/packages", response_model=List[dict])
async def list_token_packages():
    """
    Get all available token packages.

    Requirements:
    - FR-021 to FR-024: All 4 token packages
    - FR-025: Token package selection UI

    Returns:
        List of token packages with pricing
    """
    stripe_service = StripeService()
    packages = await stripe_service.list_all_packages()
    return packages


@router.post("/purchase/checkout", response_model=CreateCheckoutSessionResponse)
async def create_checkout_session(
    request: CreateCheckoutSessionRequest,
    user: User = Depends(get_current_user),
):
    """
    Create Stripe Checkout session for token purchase.

    Requirements:
    - T050: Token purchase endpoint
    - FR-017: Token purchase via Stripe

    Workflow:
    1. Validate package_id
    2. Create Stripe Checkout session
    3. Return session URL for redirect

    Args:
        request: CreateCheckoutSessionRequest with package_id
        user: Current authenticated user

    Returns:
        CreateCheckoutSessionResponse with session_id and URL

    Raises:
        HTTPException 400: Invalid package_id
        HTTPException 500: Stripe API error
    """
    stripe_service = StripeService()

    try:
        session_data = await stripe_service.create_checkout_session(
            user_id=user.id,
            user_email=user.email,
            package_id=request.package_id,
        )

        return CreateCheckoutSessionResponse(
            session_id=session_data["session_id"],
            url=session_data["url"],
        )

    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to create checkout session: {str(e)}",
        )


@router.get("/balance", response_model=TokenAccountResponse)
async def get_token_balance(
    user: User = Depends(get_current_user),
    db_pool: asyncpg.Pool = Depends(get_db_pool),
):
    """
    Get user's current token balance.

    Requirements:
    - T051: Token balance endpoint (<100ms)
    - FR-015: Display token balance in UI

    Performance:
    - Single database query
    - Target response time: <100ms
    - Future optimization: Redis caching

    Args:
        user: Current authenticated user
        db_pool: Database connection pool

    Returns:
        TokenAccountResponse with balance, total_purchased, total_spent

    Raises:
        HTTPException 500: Database error
    """
    token_service = TokenService(db_pool)

    try:
        balance, total_purchased, total_spent = await token_service.get_token_balance(
            user.id
        )

        return TokenAccountResponse(
            balance=balance,
            total_purchased=total_purchased,
            total_spent=total_spent,
        )

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to fetch token balance: {str(e)}",
        )


@router.get("/transactions", response_model=List[TokenTransactionResponse])
async def get_transaction_history(
    limit: int = 50,
    offset: int = 0,
    user: User = Depends(get_current_user),
    db_pool: asyncpg.Pool = Depends(get_db_pool),
):
    """
    Get user's token transaction history.

    Args:
        limit: Number of transactions to return (default: 50, max: 100)
        offset: Pagination offset (default: 0)
        user: Current authenticated user
        db_pool: Database connection pool

    Returns:
        List of TokenTransactionResponse

    Raises:
        HTTPException 400: Invalid pagination parameters
        HTTPException 500: Database error
    """
    if limit < 1 or limit > 100:
        raise HTTPException(
            status_code=400, detail="limit must be between 1 and 100"
        )

    if offset < 0:
        raise HTTPException(status_code=400, detail="offset must be >= 0")

    token_service = TokenService(db_pool)

    try:
        transactions = await token_service.get_transaction_history(
            user_id=user.id,
            limit=limit,
            offset=offset,
        )

        return [
            TokenTransactionResponse(
                id=tx["id"],
                amount=tx["amount"],
                transaction_type=tx["transaction_type"],
                description=tx["description"],
                price_paid_cents=tx.get("price_paid_cents"),
                created_at=tx["created_at"],
            )
            for tx in transactions
        ]

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to fetch transaction history: {str(e)}",
        )


@router.get("/purchase/success")
async def purchase_success(
    session_id: str,
    user: User = Depends(get_current_user),
):
    """
    Handle successful purchase redirect from Stripe.

    This endpoint is called when user returns from Stripe after successful payment.
    The actual token crediting happens via webhook.

    Args:
        session_id: Stripe checkout session ID
        user: Current authenticated user

    Returns:
        Success message with session details
    """
    stripe_service = StripeService()

    try:
        session = await stripe_service.retrieve_session(session_id)

        if session is None:
            raise HTTPException(status_code=404, detail="Session not found")

        return {
            "success": True,
            "message": "Purchase successful! Your tokens will be credited shortly.",
            "session_id": session_id,
            "payment_status": session.get("payment_status"),
            "metadata": session.get("metadata"),
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to retrieve session: {str(e)}",
        )
