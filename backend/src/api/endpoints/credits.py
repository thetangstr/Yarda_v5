"""
Credits API Endpoints

Handles credit balance inquiries and token account information.
"""

from fastapi import APIRouter, Depends, status
from uuid import UUID
from ...models.generation import CreditBalance
from ...models.token_account import TokenAccount
from ...services.credit_service import CreditService
from ..dependencies import get_supabase_client, get_current_user

router = APIRouter(prefix="/credits", tags=["credits"])


@router.get(
    "/balance",
    response_model=CreditBalance,
    summary="Get credit balance",
    description="""
    Get the authenticated user's current credit balance breakdown.

    ## Credit System Overview
    Yarda uses a two-tier credit system:

    ### 1. Trial Credits (Free)
    - **3 free credits** for new users
    - **Always consumed first** before token credits
    - Perfect for trying out the platform
    - Non-refundable, non-transferable

    ### 2. Token Credits (Purchased)
    - Purchased through the platform
    - **Only consumed after trial credits exhausted**
    - Can be purchased in various packages
    - Refunded automatically if generation fails

    ## Response Fields
    - **trial_credits**: Number of free trial credits remaining (0-3)
    - **token_balance**: Number of purchased tokens remaining
    - **total_available**: Sum of trial_credits + token_balance

    ## Example Response
    ```json
    {
      "trial_credits": 2,
      "token_balance": 10,
      "total_available": 12
    }
    ```

    ## Usage Scenarios

    ### New User (3 trial credits)
    ```json
    {
      "trial_credits": 3,
      "token_balance": 0,
      "total_available": 3
    }
    ```

    ### After Using 1 Trial Credit
    ```json
    {
      "trial_credits": 2,
      "token_balance": 0,
      "total_available": 2
    }
    ```

    ### After Purchasing 10 Tokens
    ```json
    {
      "trial_credits": 2,
      "token_balance": 10,
      "total_available": 12
    }
    ```

    ### After Exhausting Trial Credits
    ```json
    {
      "trial_credits": 0,
      "token_balance": 8,
      "total_available": 8
    }
    ```

    ### Out of Credits
    ```json
    {
      "trial_credits": 0,
      "token_balance": 0,
      "total_available": 0
    }
    ```
    When `total_available` is 0, users cannot create new generations
    and must purchase tokens to continue.

    ## Use Cases
    - Display credit balance in user dashboard
    - Check before attempting generation (prevent 402 errors)
    - Show "purchase tokens" prompt when low on credits
    - Track credit consumption over time
    """,
    responses={
        200: {
            "description": "Credit balance retrieved successfully",
            "content": {
                "application/json": {
                    "example": {
                        "trial_credits": 2,
                        "token_balance": 10,
                        "total_available": 12
                    }
                }
            }
        },
        401: {
            "description": "Not authenticated - JWT token missing or invalid",
            "content": {
                "application/json": {
                    "example": {
                        "error": "AuthenticationError",
                        "message": "Authentication required"
                    }
                }
            }
        },
        404: {
            "description": "User not found",
            "content": {
                "application/json": {
                    "example": {
                        "error": "ResourceNotFoundError",
                        "message": "User not found"
                    }
                }
            }
        },
        500: {
            "description": "Internal server error",
            "content": {
                "application/json": {
                    "example": {
                        "error": "InternalServerError",
                        "message": "An unexpected error occurred. Please try again later."
                    }
                }
            }
        }
    }
)
async def get_credit_balance(
    current_user=Depends(get_current_user),
    supabase=Depends(get_supabase_client)
):
    """
    Get current user's credit balance.

    Returns breakdown of trial credits, token balance, and total available credits.
    Service will raise ResourceNotFoundError if user not found.
    """
    credit_service = CreditService(supabase)
    user_id = UUID(current_user.id)

    # Service will raise ResourceNotFoundError if user not found
    balance = await credit_service.get_credit_balance(user_id)

    return balance


@router.get(
    "/token-account",
    response_model=TokenAccount,
    summary="Get token account details",
    description="""
    Get detailed information about the user's token account.

    ## Token Account Overview
    Every user has a token account that tracks:
    - Current balance (available tokens)
    - Total tokens purchased (lifetime)
    - Total tokens consumed (lifetime)
    - Account creation and update timestamps

    ## Response Fields
    - **id**: Unique token account identifier (UUID)
    - **user_id**: Associated user identifier (UUID)
    - **balance**: Current available token balance
    - **total_purchased**: Cumulative tokens purchased (all time)
    - **total_consumed**: Cumulative tokens consumed (all time)
    - **created_at**: Account creation timestamp
    - **updated_at**: Last modification timestamp

    ## Example Response
    ```json
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "user_id": "123e4567-e89b-12d3-a456-426614174000",
      "balance": 8,
      "total_purchased": 20,
      "total_consumed": 12,
      "created_at": "2025-10-28T12:00:00Z",
      "updated_at": "2025-10-28T14:30:00Z"
    }
    ```

    ## Understanding the Numbers

    ### Example 1: New Account
    ```json
    {
      "balance": 0,
      "total_purchased": 0,
      "total_consumed": 0
    }
    ```
    User just registered, hasn't purchased tokens yet.

    ### Example 2: After First Purchase (10 tokens)
    ```json
    {
      "balance": 10,
      "total_purchased": 10,
      "total_consumed": 0
    }
    ```
    User purchased 10 tokens, hasn't used any yet.

    ### Example 3: After Using 3 Tokens
    ```json
    {
      "balance": 7,
      "total_purchased": 10,
      "total_consumed": 3
    }
    ```
    balance = total_purchased - total_consumed

    ### Example 4: After Purchasing More (20 tokens)
    ```json
    {
      "balance": 27,
      "total_purchased": 30,
      "total_consumed": 3
    }
    ```
    User purchased another 20 tokens (total 30 purchased).

    ## Use Cases
    - Display lifetime statistics in user dashboard
    - Show purchase history analytics
    - Calculate usage patterns
    - Verify account integrity (balance = purchased - consumed)
    - Generate usage reports

    ## Note on Trial Credits
    Trial credits are separate and tracked in the users table,
    not in the token account. Use `/credits/balance` for combined view.
    """,
    responses={
        200: {
            "description": "Token account details retrieved successfully",
            "content": {
                "application/json": {
                    "example": {
                        "id": "550e8400-e29b-41d4-a716-446655440000",
                        "user_id": "123e4567-e89b-12d3-a456-426614174000",
                        "balance": 8,
                        "total_purchased": 20,
                        "total_consumed": 12,
                        "created_at": "2025-10-28T12:00:00Z",
                        "updated_at": "2025-10-28T14:30:00Z"
                    }
                }
            }
        },
        401: {
            "description": "Not authenticated - JWT token missing or invalid",
            "content": {
                "application/json": {
                    "example": {
                        "error": "AuthenticationError",
                        "message": "Authentication required"
                    }
                }
            }
        },
        404: {
            "description": "Token account not found",
            "content": {
                "application/json": {
                    "example": {
                        "error": "ResourceNotFoundError",
                        "message": "Token account not found"
                    }
                }
            }
        },
        500: {
            "description": "Internal server error",
            "content": {
                "application/json": {
                    "example": {
                        "error": "InternalServerError",
                        "message": "An unexpected error occurred. Please try again later."
                    }
                }
            }
        }
    }
)
async def get_token_account(
    current_user=Depends(get_current_user),
    supabase=Depends(get_supabase_client)
):
    """
    Get current user's token account details.

    Returns complete token account information including lifetime statistics.
    Database errors will be converted to appropriate HTTP responses by global handlers.
    """
    from ...exceptions import ResourceNotFoundError, DatabaseError

    try:
        user_id = current_user.id

        # Query token account for current user
        result = supabase.table('token_accounts').select('*').eq(
            'user_id', user_id
        ).single().execute()

        if not result.data:
            raise ResourceNotFoundError("Token account")

        return TokenAccount(**result.data)

    except ResourceNotFoundError:
        # Re-raise custom exceptions - will be handled by global handler
        raise
    except Exception as e:
        error_msg = str(e)
        raise DatabaseError(f"Failed to retrieve token account: {error_msg}")
