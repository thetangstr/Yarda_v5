"""
Generation endpoints for landscape design creation.

Endpoints:
- POST /generations: Create new landscape generation
- GET /generations: List user's generation history
- GET /generations/{id}: Get specific generation details

Requirements:
- FR-034: Unlimited generations for active subscribers
- FR-047: Authorization hierarchy checks subscription FIRST
- T092: Update generation authorization hierarchy
"""

from uuid import UUID
from typing import List, Optional, Dict, Any, Tuple

from fastapi import APIRouter, HTTPException, Depends, status, UploadFile, File, Form
from fastapi.responses import JSONResponse

from src.models.user import User
from src.api.dependencies import get_current_user, require_verified_email
from src.services.trial_service import get_trial_service, TrialService
from src.services.token_service import TokenService
from src.services.maps_service import MapsService, MapsServiceError
from src.models.generation import ImageSource
from src.db.connection_pool import db_pool
import structlog

logger = structlog.get_logger()

router = APIRouter(prefix="/generations", tags=["generations"])


async def check_authorization_hierarchy(user: User, trial_service: TrialService) -> str:
    """
    Check authorization hierarchy for generation.

    Authorization Order (FR-034, FR-047, FR-048):
    1. Check subscription_status='active' FIRST (unlimited generations) ← NEW!
    2. Check trial_remaining > 0 SECOND (if no active subscription)
    3. Check token balance > 0 THIRD (if no trial and no subscription)

    This ensures that Monthly Pro subscribers get unlimited generations
    without deducting trial or token balances.

    Args:
        user: Current authenticated user
        trial_service: Trial service for checking trial balance

    Returns:
        Payment method: 'subscription', 'trial', or 'token'

    Raises:
        HTTPException 403: No payment method available
    """
    # Check 1: Active Subscription (FR-034, FR-047) - PRIORITY #1
    # Statuses 'active' and 'past_due' allow unlimited generations
    # past_due = grace period (user gets 3 days to update payment)
    if user.subscription_status in ['active', 'past_due']:
        return 'subscription'

    # Check 2: Trial Credits (FR-016) - PRIORITY #2
    trial_remaining, _ = await trial_service.get_trial_balance(user.id)
    if trial_remaining > 0:
        return 'trial'

    # Check 3: Token Balance (FR-024) - PRIORITY #3
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
            "message": "No payment method available. Please purchase tokens or subscribe to Monthly Pro.",
            "trial_remaining": trial_remaining,
            "token_balance": token_balance or 0,
            "subscription_status": user.subscription_status,
            "subscription_tier": user.subscription_tier
        }
    )


async def deduct_payment(
    user_id: UUID,
    payment_method: str,
    trial_service: TrialService,
    token_service: TokenService,
    description: str = "Landscape generation"
) -> Tuple[bool, Optional[str], Optional[Dict[str, Any]]]:
    """
    Deduct payment for generation based on payment method.

    This is called BEFORE Gemini API call to ensure payment upfront.

    Requirements:
    - FR-034: No deduction for active subscriptions (unlimited)
    - T053: Token deduction integrated with generation flow
    - T072: Auto-reload trigger integration
    - T092: Subscription payment method support

    Args:
        user_id: User UUID
        payment_method: 'subscription', 'trial', or 'token'
        trial_service: Trial service
        token_service: Token service
        description: Transaction description

    Returns:
        Tuple of (success, error_message, auto_reload_info)
        - auto_reload_info: Dict with trigger info if auto-reload should happen (token payment only)

    Raises:
        HTTPException 500: Payment deduction failed
    """
    try:
        if payment_method == 'subscription':
            # No deduction needed - subscription allows unlimited generations
            # This is the core value proposition of Monthly Pro
            return True, None, None

        elif payment_method == 'trial':
            # Deduct trial credit atomically
            success, remaining = await trial_service.deduct_trial(user_id)
            if not success:
                return False, "Trial credit deduction failed - insufficient credits", None
            return True, None, None

        elif payment_method == 'token':
            # Deduct token atomically with FOR UPDATE lock
            # Returns auto_reload_info if balance drops below threshold
            success, new_balance, auto_reload_info = await token_service.deduct_token_atomic(user_id)
            if not success:
                return False, "Token deduction failed - insufficient balance", None

            # Log auto-reload trigger if applicable
            if auto_reload_info and auto_reload_info.get("should_trigger"):
                print(f"Auto-reload triggered for user {user_id}: {auto_reload_info}")

            return True, None, auto_reload_info

        else:
            return False, f"Invalid payment method: {payment_method}", None

    except Exception as e:
        print(f"Payment deduction error: {e}")
        return False, str(e), None


async def refund_payment(
    user_id: UUID,
    payment_method: str,
    trial_service: TrialService,
    token_service: TokenService
) -> None:
    """
    Refund payment when generation fails.

    Requirements:
    - FR-013: Refund trial if generation fails
    - FR-066: Refund payment on generation failure
    - T053: Token refund integrated with generation flow
    - T092: No refund needed for subscriptions

    Args:
        user_id: User UUID
        payment_method: 'subscription', 'trial', or 'token'
        trial_service: Trial service
        token_service: Token service
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
            success, new_balance = await token_service.refund_token(user_id)
            if success:
                print(f"Refunded token to user {user_id}. New balance: {new_balance}")

    except Exception as e:
        print(f"Payment refund error: {e}")
        # Log but don't raise - refund failure shouldn't block error response


@router.post("/", status_code=status.HTTP_201_CREATED)
async def create_generation(
    address: str = Form(...),
    area: str = Form(...),
    style: str = Form(...),
    custom_prompt: Optional[str] = Form(None),
    image: Optional[UploadFile] = File(None),
    user: User = Depends(require_verified_email),
    trial_service: TrialService = Depends(get_trial_service)
):
    """
    Create new landscape generation.

    Authorization Hierarchy (FR-034, FR-047, FR-048):
    1. Active subscription → unlimited generations (NO DEDUCTION)
    2. Trial credits → limited generations (DEDUCT 1 TRIAL)
    3. Token balance → pay-per-use (DEDUCT 1 TOKEN)

    Payment Flow:
    1. Check authorization (hierarchy)
    2. Deduct payment BEFORE Gemini API call (if not subscription)
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
    # Initialize token service
    token_service = TokenService(db_pool)

    try:
        # Step 1: Check authorization hierarchy (subscription FIRST)
        payment_method = await check_authorization_hierarchy(user, trial_service)
        print(f"User {user.email} authorized with payment_method={payment_method}")

        # Step 2: Deduct payment BEFORE Gemini API call (unless subscription)
        success, error_msg, auto_reload_info = await deduct_payment(
            user.id,
            payment_method,
            trial_service,
            token_service,
            f"Landscape generation for {address}"
        )

        if not success:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=error_msg
            )

        if payment_method == 'subscription':
            print(f"Subscription user {user.email} - no payment deducted (unlimited)")
        else:
            print(f"Payment deducted successfully for user {user.email}")

        # TODO (T073): Handle auto-reload trigger
        # If auto_reload_info is not None, we should:
        # 1. Create Stripe Payment Intent for auto-reload amount
        # 2. Process payment automatically (requires saved payment method)
        # 3. Webhook will credit tokens when payment succeeds
        # For now, we just log it - actual Stripe integration pending
        if auto_reload_info:
            print(f"Auto-reload would be triggered: {auto_reload_info}")
            # NOTE: In production, this would initiate a Stripe charge
            # using the user's saved payment method

        # Step 3: Handle image source (user upload OR Google Maps retrieval)
        image_source = ImageSource.USER_UPLOAD  # Default
        image_url = None

        if image is not None:
            # User uploaded an image - use it directly
            image_source = ImageSource.USER_UPLOAD
            logger.info(
                "image_source_selected",
                source="user_upload",
                user_id=str(user.id),
                address=address
            )
            # TODO: Upload to storage and get URL
            # For now, we'll store the file temporarily
            # In production: Upload to S3/GCS and store image_url

        elif area == 'front_yard':
            # No image uploaded AND front_yard - retrieve from Google Street View
            try:
                logger.info(
                    "attempting_google_maps_retrieval",
                    area=area,
                    address=address,
                    user_id=str(user.id)
                )

                # Initialize MapsService
                maps_service = MapsService()

                # Step 3a: Geocode address to get coordinates
                coords = await maps_service.geocode_address(address)

                if coords is None:
                    # Address could not be geocoded - refund and return error
                    await refund_payment(user.id, payment_method, trial_service, token_service)
                    logger.error(
                        "geocoding_failed",
                        address=address,
                        user_id=str(user.id)
                    )
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail=f"Could not find address: {address}. Please verify the address or upload an image manually."
                    )

                # Step 3b: Check Street View metadata (FREE request)
                metadata = await maps_service.get_street_view_metadata(coords)

                if metadata.status != "OK":
                    # No Street View available - refund and return error
                    await refund_payment(user.id, payment_method, trial_service, token_service)
                    logger.warning(
                        "street_view_unavailable",
                        address=address,
                        coords={"lat": coords.lat, "lng": coords.lng},
                        metadata_status=metadata.status,
                        user_id=str(user.id)
                    )
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail=f"Street View imagery not available for this address. Please upload an image manually."
                    )

                # Step 3c: Fetch Street View image (PAID request - $0.007)
                image_bytes = await maps_service.fetch_street_view_image(
                    coords,
                    size="600x400",
                    fov=90,
                    heading=0,  # Front-facing view
                    pitch=-10   # Slightly downward angle
                )

                if image_bytes is None:
                    # Image fetch failed - refund and return error
                    await refund_payment(user.id, payment_method, trial_service, token_service)
                    logger.error(
                        "street_view_fetch_failed",
                        address=address,
                        pano_id=metadata.pano_id,
                        user_id=str(user.id)
                    )
                    raise HTTPException(
                        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                        detail="Failed to retrieve Street View image. Please try again or upload an image manually."
                    )

                # Success! Set image_source
                image_source = ImageSource.GOOGLE_STREET_VIEW

                logger.info(
                    "google_street_view_retrieved",
                    address=address,
                    pano_id=metadata.pano_id,
                    date=metadata.date,
                    user_id=str(user.id),
                    cost="$0.007"
                )

                # TODO: Upload image_bytes to storage and get URL
                # For now, we'll store it temporarily
                # In production: Upload to S3/GCS and store image_url

            except MapsServiceError as e:
                # Google Maps API error - refund and return error
                await refund_payment(user.id, payment_method, trial_service, token_service)
                logger.error(
                    "maps_service_error",
                    error_type=e.error_type,
                    message=e.message,
                    address=address,
                    user_id=str(user.id)
                )
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Failed to retrieve property image: {e.message}"
                )
        else:
            # No image uploaded AND not front_yard - require manual upload
            await refund_payment(user.id, payment_method, trial_service, token_service)
            logger.warning(
                "image_required_for_area",
                area=area,
                user_id=str(user.id)
            )
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Image upload required for {area}. Automatic image retrieval is only available for front_yard."
            )

        # Step 4: Create generation record with status='pending'
        generation_id = await db_pool.fetchval("""
            INSERT INTO generations (
                user_id,
                status,
                payment_type,
                tokens_deducted,
                address,
                request_params,
                image_source
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
                ),
                $8
            ) RETURNING id
        """, user.id, payment_method, 1 if payment_method == 'token' else 0, address, area, style, custom_prompt, image_source.value)

        # Step 4: Process generation asynchronously (TODO: Use background task)
        # For now, we'll return pending status and process later
        # In production: Use Celery, Redis Queue, or FastAPI BackgroundTasks

        return {
            "id": generation_id,
            "status": "pending",
            "payment_method": payment_method,
            "image_source": image_source.value,
            "message": "Generation started. This may take 30-60 seconds."
        }

    except HTTPException:
        raise
    except Exception as e:
        # Refund payment if generation setup failed
        await refund_payment(user.id, payment_method, trial_service, token_service)

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
            image_source,
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
            image_source,
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
