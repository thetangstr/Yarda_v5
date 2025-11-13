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
import asyncio

from fastapi import APIRouter, HTTPException, Depends, status, UploadFile, File, Form, BackgroundTasks
from fastapi.responses import JSONResponse

from src.models.user import User
from src.api.dependencies import get_current_user, require_verified_email
from src.services.trial_service import get_trial_service, TrialService
from src.services.token_service import TokenService
from src.services.subscription_service import SubscriptionService
from src.services.generation_service import GenerationService
from src.services.gemini_client import GeminiClient
from src.services.storage_service import BlobStorageService
from src.services.maps_service import MapsService, MapsServiceError
from src.services.credit_service import CreditService
from src.models.generation import (
    ImageSource,
    CreateGenerationRequest,
    MultiAreaGenerationResponse,
    AreaStatusResponse,
    GenerationStatus,
    AreaStatus
)
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


@router.post("/multi", response_model=MultiAreaGenerationResponse, status_code=status.HTTP_201_CREATED)
async def create_multi_area_generation(
    request: CreateGenerationRequest,
    background_tasks: BackgroundTasks,
    user: User = Depends(require_verified_email),
    trial_service: TrialService = Depends(get_trial_service)
):
    """
    Create multi-area landscape generation request (Feature 004-generation-flow).

    This endpoint implements the new generation flow that supports 1-5 areas per request.
    Payment is deducted atomically BEFORE Street View retrieval.

    **Payment Hierarchy** (FR-007):
    1. Active subscription → unlimited generations (NO DEDUCTION)
    2. Trial credits → limited generations (DEDUCT N TRIALS, N = number of areas)
    3. Token balance → pay-per-use (DEDUCT N TOKENS)

    **Workflow**:
    1. Validate request (address, areas uniqueness, 1-5 areas)
    2. Authorize and deduct payment atomically
    3. Create generation record + generation_areas records
    4. Retrieve Street View imagery (if available)
    5. Store source image metadata in generation_source_images
    6. Return generation ID with status='pending'
    7. Background worker processes generation asynchronously

    **Requirements**:
    - FR-008: Atomic payment deduction BEFORE generation
    - FR-001: Address validation via Google Maps Geocoding API
    - FR-060: Multi-area support (1-5 areas, 1 credit each)
    - FR-011: Automatic refund on failure
    - FR-010: Progress persists across page refresh (via polling)

    Args:
        request: CreateGenerationRequest with address and areas list
        user: Current authenticated user
        trial_service: Trial service for checking trial balance

    Returns:
        MultiAreaGenerationResponse with generation ID, status, and area details

    Raises:
        HTTPException 400: Invalid address, duplicate areas, or validation error
        HTTPException 403: Insufficient payment (no trial/token/subscription)
        HTTPException 500: Generation creation failed
    """
    try:
        # DEBUG: Log generation request start
        print(f"\n{'='*80}")
        print(f"🚀 CREATE MULTI-AREA GENERATION STARTED")
        print(f"{'='*80}")
        print(f"User: {user.email}")
        print(f"Address: {request.address}")
        print(f"Number of areas: {len(request.areas)}")
        for i, area in enumerate(request.areas):
            print(f"  Area {i+1}: {area.area.value} - {area.style.value}")

        # Step 1: Convert AreaRequest models to dicts for GenerationService
        areas_data = [
            {
                'area': area.area.value,
                'style': area.style.value,
                'custom_prompt': area.custom_prompt,
                'preservation_strength': area.preservation_strength
            }
            for area in request.areas
        ]

        # Step 2: Initialize services
        print(f"✅ STEP 1: Initializing services...")
        token_service = TokenService(db_pool)
        subscription_service = SubscriptionService(db_pool)
        credit_service = CreditService(db_pool)
        gemini_client = GeminiClient()
        storage_service = BlobStorageService()

        generation_service = GenerationService(
            db_pool=db_pool,
            gemini_client=gemini_client,
            storage_service=storage_service,
            trial_service=trial_service,
            token_service=token_service,
            subscription_service=subscription_service
        )

        # Step 2.5: Geocode address to capture geocoding accuracy info for user
        print(f"✅ STEP 2a: Capturing geocoding information...")
        geocoded_address = None
        geocoding_accuracy = None
        try:
            geocode_result = await generation_service.maps_service.geocode_address(request.address)
            if geocode_result:
                geocoded_address = geocode_result.formatted_address
                geocoding_accuracy = geocode_result.location_type
                print(f"   ✅ Geocoded to: {geocoded_address}")
                print(f"   ✅ Accuracy: {geocoding_accuracy}")
        except Exception as e:
            print(f"   ⚠️  Geocoding capture failed (non-fatal): {str(e)}")
            # Non-fatal - continue with generation even if geocoding info capture fails

        # Step 3: Call GenerationService.create_generation() - handles payment + Street View
        print(f"✅ STEP 2: Calling generation_service.create_generation()...")
        success, generation_id, error_message, generation_data = await generation_service.create_generation(
            user_id=user.id,
            address=request.address,
            areas=areas_data
        )
        print(f"   Result - Success: {success}, Generation ID: {generation_id}")
        print(f"   Error: {error_message}")
        if generation_data:
            print(f"   Generation data keys: {list(generation_data.keys())}")
            if 'street_view_bytes' in generation_data:
                print(f"   Street View bytes: {len(generation_data['street_view_bytes'])} bytes")

        if not success:
            print(f"❌ STEP 2 FAILED: {error_message}")
            # Generation creation failed (payment or Street View retrieval)
            logger.error(
                "generation_creation_failed",
                user_id=str(user.id),
                address=request.address,
                error=error_message
            )
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=error_message
            )

        # Step 3.5: Start background task to process generation (Gemini API call)
        # This runs async so we can return immediately with status='pending'
        async def process_areas_background():
            """Background task to process all areas for this generation"""
            try:
                logger.info(
                    "background_generation_started",
                    generation_id=str(generation_id),
                    num_areas=len(generation_data['area_ids'])
                )

                # Get Street View bytes from generation_data
                street_view_bytes = generation_data.get('street_view_bytes')
                if not street_view_bytes:
                    logger.error("No street_view_bytes available for processing")
                    return

                # Upload Street View image to Vercel Blob storage
                try:
                    street_view_url = await storage_service.upload_image(
                        image_data=street_view_bytes,
                        filename=f"streetview_{generation_id}.jpg",
                        content_type="image/jpeg"
                    )

                    # Update generation_source_images with actual URL
                    await db_pool.execute("""
                        UPDATE generation_source_images
                        SET image_url = $1
                        WHERE generation_id = $2 AND image_type = 'street_view'
                    """, street_view_url, generation_id)

                    logger.info(
                        "street_view_uploaded",
                        generation_id=str(generation_id),
                        url=street_view_url
                    )
                except Exception as e:
                    logger.error(
                        "street_view_upload_failed",
                        generation_id=str(generation_id),
                        error=str(e)
                    )
                    # Continue processing even if Street View upload fails

                # Process each area sequentially
                for area_id_str in generation_data['area_ids']:
                    area_id = UUID(area_id_str)

                    # Fetch area details from database
                    area_record = await db_pool.fetchrow("""
                        SELECT area_type, style, custom_prompt
                        FROM generation_areas
                        WHERE id = $1
                    """, area_id)

                    if not area_record:
                        logger.error(f"Area {area_id} not found")
                        continue

                    # Fetch the appropriate image for this area type
                    # Front yard uses Street View, backyard/walkway use Satellite
                    area_type = area_record['area_type']

                    # Get area-specific image from maps service
                    try:
                        area_image_bytes, _, _, image_source = await generation_service.maps_service.get_property_images(
                            address=request.address,
                            area=area_type
                        )
                        logger.info(
                            "area_image_retrieved",
                            area_id=str(area_id),
                            area_type=area_type,
                            image_source=image_source,
                            size_bytes=len(area_image_bytes) if area_image_bytes else 0
                        )
                    except Exception as e:
                        logger.error(
                            "area_image_retrieval_failed",
                            area_id=str(area_id),
                            area_type=area_type,
                            error=str(e)
                        )
                        # Fallback to street_view_bytes if area-specific image fails
                        area_image_bytes = street_view_bytes

                    # Call process_generation for this area with area-specific image
                    success, error = await generation_service.process_generation(
                        generation_id=generation_id,
                        area_id=area_id,
                        user_id=user.id,
                        input_image_bytes=area_image_bytes,  # Use area-specific image
                        address=request.address,
                        area_type=area_type,
                        style=area_record['style'],
                        custom_prompt=area_record['custom_prompt'],
                        payment_method=generation_data['payment_method'],
                        preservation_strength=0.5  # Default for now
                    )

                    if not success:
                        logger.error(
                            "area_generation_failed",
                            area_id=str(area_id),
                            error=error
                        )
                    else:
                        logger.info(
                            "area_generation_completed",
                            area_id=str(area_id)
                        )

                logger.info(
                    "background_generation_completed",
                    generation_id=str(generation_id)
                )
            except Exception as e:
                logger.error(
                    "background_generation_error",
                    generation_id=str(generation_id),
                    error=str(e),
                    exc_info=True
                )

        # Spawn background task using FastAPI's BackgroundTasks
        logger.info(
            "about_to_spawn_background_task",
            generation_id=str(generation_id),
            has_street_view=bool(generation_data.get('street_view_bytes')),
            num_areas=len(generation_data['area_ids'])
        )
        background_tasks.add_task(process_areas_background)
        logger.info("background_task_added_to_fastapi_queue")

        # Step 4: Fetch created generation_areas for response
        areas_response = []
        for area_id in generation_data['area_ids']:
            area_record = await db_pool.fetchrow("""
                SELECT
                    id,
                    area_type,
                    style,
                    status,
                    progress,
                    current_stage,
                    status_message,
                    image_url,
                    error_message,
                    completed_at
                FROM generation_areas
                WHERE id = $1
            """, UUID(area_id))

            if area_record:
                areas_response.append(AreaStatusResponse(
                    id=area_record['id'],
                    area=area_record['area_type'],
                    style=area_record['style'],
                    status=AreaStatus(area_record['status']),
                    progress=area_record['progress'],
                    current_stage=area_record['current_stage'],
                    status_message=area_record['status_message'],
                    image_url=area_record['image_url'],
                    error_message=area_record['error_message'],
                    completed_at=area_record['completed_at']
                ))

        # Step 5: Fetch remaining credits after payment deduction
        # This allows frontend to update credit display immediately without separate API call
        try:
            credits_remaining = await credit_service.get_all_balances(user.id)
        except Exception as e:
            logger.warning(
                "failed_to_fetch_credits_remaining",
                user_id=str(user.id),
                error=str(e)
            )
            credits_remaining = None

        # Step 6: Return MultiAreaGenerationResponse
        return MultiAreaGenerationResponse(
            id=generation_id,
            status=GenerationStatus.PENDING,
            address=request.address,
            geocoded_address=geocoded_address,
            geocoding_accuracy=geocoding_accuracy,
            total_cost=generation_data['total_cost'],
            payment_method=generation_data['payment_method'],
            credits_remaining=credits_remaining,
            areas=areas_response,
            created_at=generation_data['created_at'],
            start_processing_at=None,
            completed_at=None,
            estimated_completion=None,
            error_message=None
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(
            "unexpected_generation_error",
            user_id=str(user.id),
            address=request.address,
            error=str(e),
            exc_info=True
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create generation: {str(e)}"
        )


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
        # DEBUG: Log generation request start
        print(f"\n{'='*80}")
        print(f"🚀 GENERATION REQUEST STARTED")
        print(f"{'='*80}")
        print(f"User: {user.email}")
        print(f"Address: {address}")
        print(f"Area: {area}")
        print(f"Style: {style}")
        print(f"Has custom image: {image is not None}")

        # Step 1: Check authorization hierarchy (subscription FIRST)
        # NOTE: This only validates that user HAS credits - does not deduct yet
        payment_method = await check_authorization_hierarchy(user, trial_service)
        print(f"✅ STEP 1: Authorization Check")
        print(f"   Payment Method: {payment_method}")

        # Step 2: Payment is now deducted in background task AFTER image is successfully saved
        # This ensures we don't charge users for failed generations
        # (See process_areas_background task below)

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

                # Step 3a: Geocode address to get coordinates with accuracy validation
                print(f"✅ STEP 3a: Geocoding address...")
                print(f"   Address: {address}")
                geocode_result = await maps_service.geocode_address(address)

                if geocode_result is None:
                    print(f"❌ STEP 3a FAILED: Address could not be geocoded")
                    # Address could not be geocoded - no payment deducted yet, so no refund needed
                    logger.error(
                        "geocoding_failed",
                        address=address,
                        user_id=str(user.id)
                    )
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail=f"Could not find address: {address}. Please verify the address or upload an image manually."
                    )

                coords = geocode_result.coordinates

                # Log geocoding accuracy
                print(f"   Location type: {geocode_result.location_type}")
                print(f"   Has street number: {geocode_result.has_street_number}")
                if geocode_result.location_type != "ROOFTOP":
                    logger.warning(
                        "generation_geocoding_accuracy",
                        address=address,
                        location_type=geocode_result.location_type,
                        has_street_number=geocode_result.has_street_number,
                        message="Non-ROOFTOP geocoding may affect image accuracy"
                    )

                # Step 3b: Check Street View metadata (FREE request)
                print(f"✅ STEP 3b: Getting Street View metadata...")
                print(f"   Coords: lat={coords.lat}, lng={coords.lng}")
                metadata = await maps_service.get_street_view_metadata(coords)
                print(f"   Metadata status: {metadata.status}")
                print(f"   Pano ID: {metadata.pano_id}")

                if metadata.status != "OK":
                    print(f"❌ STEP 3b FAILED: No Street View available")
                    # No Street View available - no payment deducted yet, so no refund needed
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
                print(f"✅ STEP 3c: Fetching Street View image...")
                image_bytes = await maps_service.fetch_street_view_image(
                    coords,
                    size="600x400",
                    fov=90,
                    heading=0,  # Front-facing view
                    pitch=-10   # Slightly downward angle
                )
                print(f"   Image bytes received: {len(image_bytes) if image_bytes else 0} bytes")

                if image_bytes is None:
                    print(f"❌ STEP 3c FAILED: Could not fetch Street View image")
                    # Image fetch failed - no payment deducted yet, so no refund needed
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
                # Google Maps API error - no payment deducted yet, so no refund needed
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
            # No payment deducted yet, so no refund needed
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
        print(f"✅ STEP 4: Creating generation record...")
        # Build request_params as JSONB outside query to avoid type inference issues
        import json
        request_params_json = json.dumps({
            'area': area,
            'style': style,
            'custom_prompt': custom_prompt
        })

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
                $5::jsonb
            ) RETURNING id
        """, user.id, payment_method, 1 if payment_method == 'token' else 0, address, request_params_json)
        print(f"   Generation ID: {generation_id}")
        print(f"   Image source: {image_source.value}")
        print(f"   Image bytes: {len(image_bytes) if image_bytes else 0} bytes")

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
        # No payment deducted yet, so no refund needed if generation setup fails
        print(f"Generation creation error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create generation"
        )


@router.get("/")
async def list_generations(
    limit: int = 20,
    page: int = 1,
    status: Optional[str] = None,
    sort: Optional[str] = None,
    user: User = Depends(get_current_user)
):
    """
    List user's generation history with pagination.

    Requirements:
    - FR-041: View generation history
    - Feature 008: Proper history implementation with pagination

    Args:
        limit: Maximum number of generations to return (default: 20, max: 50)
        page: Page number for pagination (1-indexed, default: 1)
        status: Optional status filter (pending, processing, completed, failed)
        sort: Optional sort field (default: created_at DESC)
        user: Current authenticated user

    Returns:
        Paginated list of generations with metadata
    """
    # Validate and normalize parameters
    limit = min(int(limit), 50)  # Max 50 per page
    page = max(int(page), 1)  # Minimum page 1
    offset = (page - 1) * limit

    # Build query filters
    where_clause = "WHERE user_id = $1"
    params: list = [user.id]

    if status:
        where_clause += f" AND status = ${len(params) + 1}"
        params.append(status)

    # Build sort clause (default: created_at DESC)
    sort_clause = "created_at DESC"
    if sort in ['oldest', 'name_asc', 'name_desc']:
        if sort == 'oldest':
            sort_clause = "created_at ASC"
        elif sort == 'name_asc':
            sort_clause = "address ASC"
        elif sort == 'name_desc':
            sort_clause = "address DESC"

    # Get total count
    total_result = await db_pool.fetchval(f"""
        SELECT COUNT(*)
        FROM generations
        {where_clause}
    """, *params)
    total = total_result or 0

    # Get paginated results
    generations = await db_pool.fetch(f"""
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
        {where_clause}
        ORDER BY {sort_clause}
        LIMIT ${len(params) + 1} OFFSET ${len(params) + 2}
    """, *params, limit, offset)

    return {
        "data": [dict(g) for g in generations],
        "total": total,
        "page": page,
        "limit": limit,
        "has_more": offset + len(generations) < total
    }


@router.get("/{generation_id}", response_model=MultiAreaGenerationResponse)
async def get_generation(
    generation_id: UUID,
    user: User = Depends(get_current_user)
):
    """
    Get generation status and details (Feature 004-generation-flow).

    This endpoint is polled by the frontend to track generation progress.
    Returns complete generation state including per-area progress.

    **Polling Strategy** (FR-010):
    - Frontend polls every 2 seconds while status is 'pending' or 'processing'
    - Stops polling when status is 'completed', 'partial_failed', or 'failed'
    - Progress persists in localStorage via Zustand store

    **Status Values**:
    - pending: Payment deducted, generation queued
    - processing: Background worker is generating designs
    - completed: All areas completed successfully
    - partial_failed: Some areas completed, some failed
    - failed: All areas failed or Street View retrieval failed

    **Requirements**:
    - FR-010: Progress persists across page refresh
    - FR-014: Background processing continues during page refresh
    - Credit Systems Consolidation: Returns credits_remaining for frontend sync

    Args:
        generation_id: Generation UUID
        user: Current authenticated user

    Returns:
        MultiAreaGenerationResponse with generation status and area details

    Raises:
        HTTPException 404: Generation not found
        HTTPException 403: Not authorized to view generation
    """
    # Initialize credit service for fetching remaining balances
    credit_service = CreditService(db_pool)
    # Fetch generation
    generation = await db_pool.fetchrow("""
        SELECT
            id,
            user_id,
            status,
            payment_type AS payment_method,
            tokens_deducted AS total_cost,
            address,
            request_params,
            error_message,
            created_at,
            start_processing_at,
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

    # Fetch generation areas with complete details
    areas_records = await db_pool.fetch("""
        SELECT
            id,
            area_type,
            style,
            status,
            progress,
            current_stage,
            status_message,
            image_url,
            error_message,
            completed_at
        FROM generation_areas
        WHERE generation_id = $1
        ORDER BY created_at
    """, generation_id)

    # Convert to AreaStatusResponse models
    areas_response = []
    for area_record in areas_records:
        # Convert image_url to image_urls array for frontend compatibility
        image_urls = []
        if area_record['image_url']:
            image_urls.append(area_record['image_url'])

        areas_response.append(AreaStatusResponse(
            id=area_record['id'],
            area=area_record['area_type'],
            style=area_record['style'],
            status=AreaStatus(area_record['status']),
            progress=area_record['progress'],
            current_stage=area_record['current_stage'],
            status_message=area_record['status_message'],
            image_url=area_record['image_url'],
            image_urls=image_urls if image_urls else None,  # Add image_urls array for frontend
            error_message=area_record['error_message'],
            completed_at=area_record['completed_at']
        ))

    # Fetch source images (Street View/Satellite)
    print(f"🔍 GET /generations/{generation_id}")
    source_images_records = await db_pool.fetch("""
        SELECT image_type, image_url, pano_id
        FROM generation_source_images
        WHERE generation_id = $1
        ORDER BY created_at
    """, generation_id)

    source_images = []
    for record in source_images_records:
        # Include all source images - even pending_upload
        # For pending_upload, return placeholder that will auto-update when blob upload completes
        image_url = record['image_url']
        if image_url == 'pending_upload':
            # Placeholder image while Street View uploads to Vercel Blob
            # Client will re-poll and get the real URL once upload completes
            image_url = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="600" height="400"%3E%3Crect width="600" height="400" fill="%23e5e7eb"/%3E%3Ctext x="50%25" y="50%25" dominant-baseline="middle" text-anchor="middle" fill="%236b7280" font-size="16"%3ELoading Street View...%3C/text%3E%3C/svg%3E'

        if image_url:
            source_images.append({
                'image_type': record['image_type'],
                'image_url': image_url,
                'pano_id': record['pano_id']
            })

    print(f"   DB Records: {len(source_images_records)} source_images found")
    print(f"   Returning: {len(source_images)} source_images in response")
    if source_images:
        for img in source_images:
            print(f"     - {img['image_type']}: {img['image_url'][:50]}...")

    # Fetch remaining credits for frontend sync (optional, non-blocking)
    try:
        credits_remaining = await credit_service.get_all_balances(user.id)
    except Exception as e:
        logger.warning(
            "failed_to_fetch_credits_remaining_on_polling",
            user_id=str(user.id),
            generation_id=str(generation_id),
            error=str(e)
        )
        credits_remaining = None

    # Return MultiAreaGenerationResponse with source_images
    response = MultiAreaGenerationResponse(
        id=generation['id'],
        user_id=generation['user_id'],
        status=GenerationStatus(generation['status']),
        address=generation.get('address'),
        total_cost=generation['total_cost'] if generation['total_cost'] else len(areas_response),
        payment_method=generation['payment_method'],
        credits_remaining=credits_remaining,
        areas=areas_response,
        source_images=source_images if source_images else None,
        created_at=generation['created_at'],
        start_processing_at=generation['start_processing_at'],
        completed_at=generation['completed_at'],
        estimated_completion=None,  # TODO: Calculate based on average processing time
        error_message=generation['error_message']
    )

    # DEBUG: Log the actual response being sent to frontend
    import json
    try:
        response_dict = response.model_dump(mode='json')
        print(f"   ✅ RETURNING RESPONSE with source_images count: {len(response_dict.get('source_images') or [])}")
        if response_dict.get('source_images'):
            print(f"      Sample: {json.dumps(response_dict['source_images'][0], indent=2)}")
    except Exception as e:
        print(f"   ❌ Error serializing response: {e}")

    return response
