"""
Generation endpoints for landscape design creation.

Endpoints:
- POST /generations: Create new landscape generation
- GET /generations: List user's generation history
- GET /generations/{id}: Get specific generation details
"""

from uuid import UUID
from typing import List, Optional

from fastapi import APIRouter, HTTPException, Depends, status, UploadFile, File, Form
from fastapi.responses import JSONResponse

from src.models.user import User
from src.api.dependencies import get_current_user, require_verified_email
from src.services.trial_service import get_trial_service, TrialService
from src.db.connection_pool import db_pool

router = APIRouter(prefix="/generations", tags=["generations"])


async def check_authorization_hierarchy(user: User, trial_service: TrialService) -> str:
    """
    Check authorization hierarchy for generation.

    Authorization Order (FR-047, FR-048):
    1. Check subscription_status='active' FIRST (unlimited generations)
    2. Check trial_remaining > 0 SECOND (if no active subscription)
    3. Check token balance > 0 THIRD (if no trial and no subscription)

    Args:
        user: Current authenticated user
        trial_service: Trial service for checking trial balance

    Returns:
        Payment method: 'subscription', 'trial', or 'token'

    Raises:
        HTTPException 403: No payment method available
    """
    # Check 1: Active Subscription (FR-047, FR-048)
    if user.subscription_status == 'active':
        return 'subscription'

    # Check 2: Trial Credits (FR-016)
    trial_remaining, _ = await trial_service.get_trial_balance(user.id)
    if trial_remaining > 0:
        return 'trial'

    # Check 3: Token Balance (FR-024)
    token_balance = await db_pool.fetchval("""
        SELECT COALESCE(balance, 0)
        FROM users_token_accounts
        WHERE user_id = $1
    """, user.id)

    if token_balance and token_balance > 0:
        return 'token'

    # No payment method available
    raise HTTPException(
        status_code=status.HTTP_403_FORBIDDEN,
        detail={
            "error": "insufficient_payment",
            "message": "No payment method available. Please purchase tokens or subscribe.",
            "trial_remaining": trial_remaining,
            "token_balance": token_balance or 0,
            "subscription_status": user.subscription_status
        }
    )


async def deduct_payment(
    user_id: UUID,
    payment_method: str,
    trial_service: TrialService,
    description: str = "Landscape generation"
) -> tuple[bool, str]:
    """
    Deduct payment for generation based on payment method.

    This is called BEFORE Gemini API call to ensure payment upfront.

    Args:
        user_id: User UUID
        payment_method: 'subscription', 'trial', or 'token'
        trial_service: Trial service
        description: Transaction description

    Returns:
        Tuple of (success, error_message)

    Raises:
        HTTPException 500: Payment deduction failed
    """
    try:
        if payment_method == 'subscription':
            # No deduction needed - subscription allows unlimited generations
            return True, None

        elif payment_method == 'trial':
            # Deduct trial credit atomically
            success, remaining = await trial_service.deduct_trial(user_id)
            if not success:
                return False, "Trial credit deduction failed - insufficient credits"
            return True, None

        elif payment_method == 'token':
            # Deduct token atomically
            result = await db_pool.fetchrow("""
                SELECT * FROM deduct_token_atomic($1, $2)
            """, user_id, description)

            if not result['success']:
                return False, "Token deduction failed - insufficient balance"
            return True, None

        else:
            return False, f"Invalid payment method: {payment_method}"

    except Exception as e:
        print(f"Payment deduction error: {e}")
        return False, str(e)


async def refund_payment(
    user_id: UUID,
    payment_method: str,
    trial_service: TrialService
) -> None:
    """
    Refund payment when generation fails.

    Requirements:
    - FR-013: Refund trial if generation fails
    - FR-066: Refund payment on generation failure

    Args:
        user_id: User UUID
        payment_method: 'subscription', 'trial', or 'token'
        trial_service: Trial service
    """
    try:
        if payment_method == 'subscription':
            # No refund needed - subscription doesn't deduct anything
            pass

        elif payment_method == 'trial':
            # Refund trial credit
            success, remaining = await trial_service.refund_trial(user_id)
            if success:
                print(f"Refunded trial credit to user {user_id}. New balance: {remaining}")

        elif payment_method == 'token':
            # Refund token
            result = await db_pool.fetchrow("""
                SELECT * FROM add_tokens($1, 1, 'refund', 'Generation failed - refund', NULL)
            """, user_id)

            if result['success']:
                print(f"Refunded token to user {user_id}. New balance: {result['new_balance']}")

    except Exception as e:
        print(f"Payment refund error: {e}")
        # Log but don't raise - refund failure shouldn't block error response


@router.post("/", status_code=status.HTTP_201_CREATED)
async def create_generation(
    address: str = Form(...),
    area: str = Form(...),
    style: str = Form(...),
    custom_prompt: Optional[str] = Form(None),
    image: UploadFile = File(...),
    user: User = Depends(require_verified_email),
    trial_service: TrialService = Depends(get_trial_service)
):
    """
    Create new landscape generation.

    Authorization Hierarchy (FR-047, FR-048):
    1. Active subscription → unlimited generations
    2. Trial credits → limited generations
    3. Token balance → pay-per-use

    Payment Flow:
    1. Check authorization (hierarchy)
    2. Deduct payment BEFORE Gemini API call
    3. Call Gemini API
    4. If success: save results, return generation
    5. If failure: refund payment, return error

    Args:
        address: Property address
        area: Landscape area (front_yard, back_yard, side_yard, full_property)
        style: Design style (modern_minimalist, tropical_paradise, etc.)
        custom_prompt: Optional custom design instructions
        image: Uploaded property image
        user: Current authenticated user
        trial_service: Trial service

    Returns:
        Generation object with status='pending'

    Raises:
        HTTPException 403: No payment method available
        HTTPException 400: Invalid input
        HTTPException 500: Generation failed
    """
    try:
        # Step 1: Check authorization hierarchy
        payment_method = await check_authorization_hierarchy(user, trial_service)
        print(f"User {user.email} authorized with payment_method={payment_method}")

        # Step 2: Deduct payment BEFORE Gemini API call
        success, error_msg = await deduct_payment(
            user.id,
            payment_method,
            trial_service,
            f"Landscape generation for {address}"
        )

        if not success:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=error_msg
            )

        print(f"Payment deducted successfully for user {user.email}")

        # Step 3: Create generation record with status='pending'
        generation_id = await db_pool.fetchval("""
            INSERT INTO generations (
                user_id,
                status,
                payment_type,
                tokens_deducted,
                address,
                request_params
            ) VALUES (
                $1,
                'pending',
                $2,
                $3,
                $4,
                jsonb_build_object(
                    'area', $5,
                    'style', $6,
                    'custom_prompt', $7
                )
            ) RETURNING id
        """, user.id, payment_method, 1 if payment_method == 'token' else 0, address, area, style, custom_prompt)

        # Step 4: Process generation asynchronously (TODO: Use background task)
        # For now, we'll return pending status and process later
        # In production: Use Celery, Redis Queue, or FastAPI BackgroundTasks

        return {
            "id": generation_id,
            "status": "pending",
            "payment_method": payment_method,
            "message": "Generation started. This may take 30-60 seconds."
        }

    except HTTPException:
        raise
    except Exception as e:
        # Refund payment if generation setup failed
        await refund_payment(user.id, payment_method, trial_service)

        print(f"Generation creation error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create generation"
        )


@router.get("/")
async def list_generations(
    limit: int = 20,
    offset: int = 0,
    user: User = Depends(get_current_user)
):
    """
    List user's generation history.

    Requirements:
    - FR-041: View generation history

    Args:
        limit: Maximum number of generations to return (default: 20)
        offset: Pagination offset (default: 0)
        user: Current authenticated user

    Returns:
        List of generations with metadata
    """
    generations = await db_pool.fetch("""
        SELECT
            id,
            status,
            payment_type,
            tokens_deducted,
            address,
            request_params,
            error_message,
            created_at,
            completed_at
        FROM generations
        WHERE user_id = $1
        ORDER BY created_at DESC
        LIMIT $2 OFFSET $3
    """, user.id, limit, offset)

    return {
        "generations": [dict(g) for g in generations],
        "total": len(generations),
        "limit": limit,
        "offset": offset
    }


@router.get("/{generation_id}")
async def get_generation(
    generation_id: UUID,
    user: User = Depends(get_current_user)
):
    """
    Get specific generation details.

    Args:
        generation_id: Generation UUID
        user: Current authenticated user

    Returns:
        Generation object with areas and images

    Raises:
        HTTPException 404: Generation not found
        HTTPException 403: Not authorized to view generation
    """
    # Fetch generation
    generation = await db_pool.fetchrow("""
        SELECT
            id,
            user_id,
            status,
            payment_type,
            tokens_deducted,
            address,
            request_params,
            error_message,
            created_at,
            completed_at
        FROM generations
        WHERE id = $1
    """, generation_id)

    if not generation:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Generation not found"
        )

    # Check authorization
    if generation["user_id"] != user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to view this generation"
        )

    # Fetch generation areas
    areas = await db_pool.fetch("""
        SELECT
            id,
            area_type,
            status,
            progress,
            gemini_response_time,
            output_image_url,
            error_message
        FROM generation_areas
        WHERE generation_id = $1
        ORDER BY created_at
    """, generation_id)

    return {
        **dict(generation),
        "areas": [dict(a) for a in areas]
    }
