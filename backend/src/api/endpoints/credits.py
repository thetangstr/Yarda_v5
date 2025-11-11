"""
Unified Credits API endpoints.

Provides consolidated balance information for all credit types
(trial, token, holiday) in a single atomic query.

Endpoints:
- GET /v1/credits/balance: Get all credit balances (detailed)

Feature: Credit Systems Consolidation (2025-11-11)
"""

from fastapi import APIRouter, Depends, HTTPException, status
import structlog

from src.models.user import User
from src.models.credits import UnifiedBalanceResponse, SimpleBalanceResponse
from src.api.dependencies import get_current_user
from src.services.credit_service import CreditService
from src.db.connection_pool import db_pool

logger = structlog.get_logger()

router = APIRouter(prefix="/v1/credits", tags=["credits"])


# ============================================================================
# Dependency Injection
# ============================================================================

def get_credit_service() -> CreditService:
    """Get unified credit service instance."""
    return CreditService(db_pool)


# ============================================================================
# Balance Endpoints
# ============================================================================

@router.get("/balance", response_model=UnifiedBalanceResponse)
async def get_unified_balance(
    current_user: User = Depends(get_current_user),
    credit_service: CreditService = Depends(get_credit_service)
):
    """
    Get unified balance for all credit types.

    Returns detailed balance information for trial, token, and holiday credits
    in a single atomic database query. Replaces individual balance endpoints
    for better performance and consistency.

    **Performance:** Target <100ms response time with optimized LEFT JOIN query.

    **Response:**
    ```json
    {
        "trial": {
            "remaining": 2,
            "used": 1,
            "total_granted": 3
        },
        "token": {
            "balance": 50,
            "total_purchased": 100,
            "total_spent": 48,
            "total_refunded": 2
        },
        "holiday": {
            "credits": 3,
            "earned": 5,
            "can_generate": true,
            "earnings_breakdown": {
                "signup_bonus": 1,
                "social_shares": 3,
                "other": 1
            }
        }
    }
    ```

    **Use Cases:**
    - Frontend credit display components
    - Credit status checks before operations
    - Admin dashboard balance views
    - Generation eligibility checks

    Args:
        current_user: Authenticated user (injected by dependency)
        credit_service: Unified credit service (injected)

    Returns:
        UnifiedBalanceResponse with detailed balances for all credit types

    Raises:
        HTTPException 404: User not found in database
        HTTPException 500: Database query error
    """
    try:
        # Fetch all balances with full details in single query
        detailed_balances = await credit_service.get_all_balances_detailed(current_user.id)

        # Structure response according to Pydantic model
        return UnifiedBalanceResponse(
            trial=detailed_balances["trial"],
            token=detailed_balances["token"],
            holiday=detailed_balances["holiday"]
        )

    except ValueError as e:
        # User not found
        logger.error(
            "user_not_found_for_balance",
            user_id=str(current_user.id),
            error=str(e)
        )
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"User {current_user.id} not found"
        )

    except Exception as e:
        # Database or unexpected error
        logger.error(
            "balance_fetch_error",
            user_id=str(current_user.id),
            error=str(e),
            error_type=type(e).__name__
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to fetch credit balances"
        )


@router.get("/balance/simple", response_model=SimpleBalanceResponse)
async def get_simple_balance(
    current_user: User = Depends(get_current_user),
    credit_service: CreditService = Depends(get_credit_service)
):
    """
    Get lightweight balance (numbers only, no metadata).

    Optimized endpoint for cases where only current balances are needed
    without detailed metadata. Uses single LEFT JOIN query for optimal performance.

    **Performance:** Target <50ms response time (faster than detailed endpoint).

    **Response:**
    ```json
    {
        "trial": 2,
        "token": 50,
        "holiday": 3
    }
    ```

    **Use Cases:**
    - Quick balance checks in middleware
    - Pre-flight checks before operations
    - High-frequency polling scenarios

    Args:
        current_user: Authenticated user (injected by dependency)
        credit_service: Unified credit service (injected)

    Returns:
        SimpleBalanceResponse with just the balance numbers

    Raises:
        HTTPException 404: User not found in database
        HTTPException 500: Database query error
    """
    try:
        # Fetch balances without metadata (faster)
        balances = await credit_service.get_all_balances(current_user.id)

        return SimpleBalanceResponse(
            trial=balances["trial"],
            token=balances["token"],
            holiday=balances["holiday"]
        )

    except ValueError as e:
        logger.error(
            "user_not_found_for_simple_balance",
            user_id=str(current_user.id),
            error=str(e)
        )
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"User {current_user.id} not found"
        )

    except Exception as e:
        logger.error(
            "simple_balance_fetch_error",
            user_id=str(current_user.id),
            error=str(e),
            error_type=type(e).__name__
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to fetch credit balances"
        )
