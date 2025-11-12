"""
Holiday Decorator endpoints for festive home decoration generation.

Endpoints:
- POST /holiday/generations: Create new holiday decoration generation
- GET /holiday/generations: List user's holiday generation history
- GET /holiday/generations/{id}: Get specific generation details
- GET /holiday/credits: Get user's holiday credit balance

Requirements:
- FR-HOL-001: 1 free holiday credit on signup during season
- FR-HOL-002: Atomic credit deduction with row-level locking
- FR-HOL-003: Earn 1 credit per share (max 3/day)
- T030: Holiday generation API endpoints
"""

from uuid import UUID
from typing import List, Optional

from fastapi import APIRouter, HTTPException, Depends, status
from fastapi.responses import JSONResponse
from pydantic import BaseModel

from src.models.user import User
from src.models.holiday import (
    HolidayGenerationRequest,
    HolidayGenerationResponse,
    HolidayGenerationListResponse,
    HolidayCreditsResponse,
    SharePlatform,
    ShareRequest,
    ShareResponse,
    ShareListResponse
)
from src.api.dependencies import get_current_user, require_verified_email
from src.services.holiday_credit_service import HolidayCreditService
from src.services.holiday_generation_service import HolidayGenerationService
from src.services.token_service import TokenService
from src.services.maps_service import MapsService
from src.services.gemini_client import GeminiClient
from src.services.storage_service import BlobStorageService
from src.services.share_service import ShareService
from src.db.connection_pool import db_pool
import structlog

logger = structlog.get_logger()

router = APIRouter(prefix="/holiday", tags=["holiday"])


# ============================================================================
# Dependency Injection
# ============================================================================

def get_credit_service() -> HolidayCreditService:
    """Get holiday credit service instance."""
    return HolidayCreditService(db_pool)


def get_maps_service() -> MapsService:
    """Get maps service instance."""
    return MapsService()


def get_generation_service() -> HolidayGenerationService:
    """Get holiday generation service instance with all dependencies."""
    credit_service = HolidayCreditService(db_pool)
    token_service = TokenService(db_pool)
    maps_service = MapsService()
    gemini_client = GeminiClient()
    storage_service = BlobStorageService()

    return HolidayGenerationService(
        db_pool=db_pool,
        credit_service=credit_service,
        token_service=token_service,
        maps_service=maps_service,
        gemini_client=gemini_client,
        storage_service=storage_service
    )


def get_share_service() -> ShareService:
    """Get share service instance."""
    credit_service = HolidayCreditService(db_pool)
    return ShareService(
        db_pool=db_pool,
        credit_service=credit_service,
        base_url="https://yarda.pro"
    )


# ============================================================================
# Generation Endpoints
# ============================================================================

@router.post("/generations", response_model=HolidayGenerationResponse)
async def create_holiday_generation(
    request: HolidayGenerationRequest,
    current_user: User = Depends(require_verified_email),
    generation_service: HolidayGenerationService = Depends(get_generation_service)
):
    """
    Create new holiday decoration generation.

    Workflow:
    1. Validate user has holiday credits (atomic check)
    2. Deduct credit BEFORE generation (prevent free generations on failure)
    3. Geocode address and fetch Street View image
    4. Create generation record (status: pending)
    5. Queue async Gemini AI generation task
    6. Return generation ID immediately for polling

    Args:
        request: Generation request with address, heading, pitch, style
        current_user: Authenticated user (injected by dependency)
        generation_service: Holiday generation service (injected)

    Returns:
        Generation response with ID and status message

    Raises:
        HTTPException 403: Insufficient holiday credits
        HTTPException 500: Geocoding or Street View failure
    """
    try:
        logger.info(
            "creating_holiday_generation",
            user_id=str(current_user.id),
            address=request.address,
            style=request.style
        )

        # Create generation (atomic credit deduction happens inside)
        generation_id, message = await generation_service.create_generation(
            user_id=current_user.id,
            address=request.address,
            heading=request.heading,
            pitch=request.pitch,
            style=request.style
        )

        logger.info(
            "holiday_generation_created",
            user_id=str(current_user.id),
            generation_id=str(generation_id)
        )

        # Fetch complete generation record for response
        generation = await generation_service.get_generation(generation_id)
        if not generation:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail={
                    "error": "generation_not_found",
                    "message": "Generation was created but could not be retrieved"
                }
            )

        # Get user's updated credit balance
        user_credits = await db_pool.fetchval(
            "SELECT holiday_credits FROM users WHERE id = $1",
            current_user.id
        )

        # Return complete generation response
        return HolidayGenerationResponse(
            id=str(generation['id']),
            user_id=str(generation['user_id']),
            address=generation['address'],
            location={
                "lat": float(generation['geocoded_lat']),
                "lng": float(generation['geocoded_lng'])
            },
            street_view_heading=generation['heading'],
            street_view_pitch=generation['pitch'],
            style=generation['style'],
            status=generation['status'],
            original_image_url=generation['original_image_url'],
            decorated_image_url=generation.get('decorated_image_url'),
            before_after_image_url=generation.get('before_after_image_url'),
            credits_remaining=user_credits or 0,
            created_at=generation['created_at'],
            estimated_completion_seconds=10,
            error_message=generation.get('error_message')
        )

    except ValueError as e:
        # Insufficient credits
        logger.warning(
            "insufficient_holiday_credits",
            user_id=str(current_user.id),
            error=str(e)
        )
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail={
                "error": "insufficient_credits",
                "message": str(e)
            }
        )
    except RuntimeError as e:
        # Geocoding or Street View failure
        logger.error(
            "generation_failed",
            user_id=str(current_user.id),
            error=str(e)
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={
                "error": "generation_failed",
                "message": str(e)
            }
        )
    except Exception as e:
        # Unexpected error
        logger.error(
            "unexpected_error",
            user_id=str(current_user.id),
            error=str(e)
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={
                "error": "internal_server_error",
                "message": "An unexpected error occurred. Please try again."
            }
        )


@router.get("/generations/{generation_id}", response_model=HolidayGenerationResponse)
async def get_holiday_generation(
    generation_id: UUID,
    current_user: User = Depends(require_verified_email),
    generation_service: HolidayGenerationService = Depends(get_generation_service)
):
    """
    Get specific holiday generation by ID.

    Used for polling generation status and retrieving results.
    Frontend polls this endpoint every 2 seconds to check if generation completed.

    Args:
        generation_id: Generation UUID
        current_user: Authenticated user (injected by dependency)
        generation_service: Holiday generation service (injected)

    Returns:
        Generation response with full details

    Raises:
        HTTPException 404: Generation not found
        HTTPException 403: User doesn't own this generation
    """
    generation = await generation_service.get_generation(generation_id)

    if not generation:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"error": "not_found", "message": "Generation not found"}
        )

    # Verify ownership
    if generation['user_id'] != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail={"error": "forbidden", "message": "Access denied"}
        )

    # Get user's current credit balance
    user_credits = await db_pool.fetchval(
        "SELECT holiday_credits FROM users WHERE id = $1",
        current_user.id
    )

    # Return complete generation response
    return HolidayGenerationResponse(
        id=str(generation['id']),
        user_id=str(generation['user_id']),
        address=generation['address'],
        location={
            "lat": float(generation['geocoded_lat']),
            "lng": float(generation['geocoded_lng'])
        },
        street_view_heading=generation['heading'],
        street_view_pitch=generation['pitch'],
        style=generation['style'],
        status=generation['status'],
        original_image_url=generation['original_image_url'],
        decorated_image_url=generation.get('decorated_image_url'),
        before_after_image_url=generation.get('before_after_image_url'),
        credits_remaining=user_credits or 0,
        created_at=generation['created_at'],
        estimated_completion_seconds=10,
        error_message=generation.get('error_message')
    )


@router.get("/generations", response_model=HolidayGenerationListResponse)
async def list_holiday_generations(
    limit: int = 20,
    offset: int = 0,
    current_user: User = Depends(require_verified_email),
    generation_service: HolidayGenerationService = Depends(get_generation_service)
):
    """
    List user's holiday generation history.

    Returns paginated list of all generations for the current user,
    ordered by creation date (newest first).

    Args:
        limit: Max results per page (default: 20, max: 100)
        offset: Pagination offset (default: 0)
        current_user: Authenticated user (injected by dependency)
        generation_service: Holiday generation service (injected)

    Returns:
        List of generation responses
    """
    # Validate pagination params
    if limit < 1 or limit > 100:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"error": "invalid_limit", "message": "Limit must be between 1 and 100"}
        )

    if offset < 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"error": "invalid_offset", "message": "Offset must be >= 0"}
        )

    generations = await generation_service.list_user_generations(
        user_id=current_user.id,
        limit=limit,
        offset=offset
    )

    # Get user's current credit balance
    user_credits = await db_pool.fetchval(
        "SELECT holiday_credits FROM users WHERE id = $1",
        current_user.id
    )

    return HolidayGenerationListResponse(
        generations=[
            HolidayGenerationResponse(
                id=str(gen['id']),
                user_id=str(gen['user_id']),
                address=gen['address'],
                location={
                    "lat": float(gen['geocoded_lat']),
                    "lng": float(gen['geocoded_lng'])
                },
                street_view_heading=gen['heading'],
                street_view_pitch=gen['pitch'],
                style=gen['style'],
                status=gen['status'],
                original_image_url=gen['original_image_url'],
                decorated_image_url=gen.get('decorated_image_url'),
                before_after_image_url=gen.get('before_after_image_url'),
                credits_remaining=user_credits or 0,
                created_at=gen['created_at'],
                estimated_completion_seconds=10,
                error_message=gen.get('error_message')
            )
            for gen in generations
        ],
        total=len(generations),
        limit=limit,
        offset=offset
    )


# ============================================================================
# Credit Endpoints
# ============================================================================

@router.get("/credits", response_model=HolidayCreditsResponse)
async def get_holiday_credits(
    current_user: User = Depends(require_verified_email),
    credit_service: HolidayCreditService = Depends(get_credit_service)
):
    """
    Get user's holiday credit balance.

    Returns current balance, total earned, and earnings breakdown.
    Frontend displays this in the credit badge UI component.

    Args:
        current_user: Authenticated user (injected by dependency)
        credit_service: Holiday credit service (injected)

    Returns:
        Credit balance response
    """
    return await credit_service.get_balance(current_user.id)


# ============================================================================
# Preview Endpoint
# ============================================================================

class PreviewRequest(BaseModel):
    """Street View preview request."""
    address: str
    heading: int = 180
    pitch: int = 0


@router.post("/preview")
async def get_street_view_preview(
    request: PreviewRequest,
    maps_service: MapsService = Depends(get_maps_service),
):
    """
    Get Street View preview URL with geocoded coordinates.

    Returns the EXACT same Street View image that will be used for generation,
    so frontend preview matches what Gemini will receive.

    Args:
        request: Preview request with address, heading, pitch
        maps_service: Maps service (injected)

    Returns:
        JSON with geocoded lat/lng and Street View URL
    """
    address = request.address
    heading = request.heading
    pitch = request.pitch
    try:
        # Geocode address (same as generation does)
        geocode_result = await maps_service.geocode_address(address)
        if not geocode_result:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Unable to geocode address: {address}"
            )

        coords = geocode_result.coordinates

        # Build Street View URL with geocoded coordinates (same as generation)
        import os
        api_key = os.getenv("GOOGLE_MAPS_API_KEY")

        street_view_url = (
            f"https://maps.googleapis.com/maps/api/streetview?"
            f"size=800x450&"
            f"location={coords.lat},{coords.lng}&"
            f"heading={heading}&"
            f"pitch={pitch}&"
            f"fov=90&"
            f"key={api_key}"
        )

        return {
            "street_view_url": street_view_url,
            "lat": coords.lat,
            "lng": coords.lng,
            "formatted_address": geocode_result.formatted_address
        }

    except Exception as e:
        logger.error(f"Preview fetch failed: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to fetch Street View preview"
        )


# ============================================================================
# Social Sharing Endpoints
# ============================================================================

@router.post("/shares", response_model=ShareResponse)
async def create_share(
    request: ShareRequest,
    current_user: User = Depends(require_verified_email),
    share_service: ShareService = Depends(get_share_service)
):
    """
    Create a trackable social media share link.

    Generates a unique tracking link for sharing decorated images on social media.
    When someone clicks the shared link, user can earn 1 credit (max 3/day).

    Args:
        request: Share request with generation_id and platform
        current_user: Authenticated user
        share_service: Share service instance

    Returns:
        Share response with tracking link and platform share URL

    Raises:
        HTTPException 404: Generation not found
        HTTPException 403: User doesn't own this generation
    """
    try:
        # Verify generation exists and user owns it
        generation = await db_pool.fetchrow("""
            SELECT id, user_id, before_after_image_url
            FROM holiday_generations
            WHERE id = $1
        """, request.generation_id)

        if not generation:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail={"error": "not_found", "message": "Generation not found"}
            )

        if generation['user_id'] != current_user.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail={"error": "forbidden", "message": "Access denied"}
            )

        if not generation['before_after_image_url']:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail={"error": "not_ready", "message": "Generation not complete yet"}
            )

        # Create share
        share_data = await share_service.create_share(
            user_id=current_user.id,
            generation_id=request.generation_id,
            platform=request.platform,
            before_after_image_url=generation['before_after_image_url']
        )

        return ShareResponse(**share_data)

    except HTTPException:
        raise
    except Exception as e:
        logger.error(
            "share_creation_failed",
            user_id=str(current_user.id),
            error=str(e)
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={"error": "internal_error", "message": "Failed to create share"}
        )


@router.get("/shares", response_model=ShareListResponse)
async def list_shares(
    limit: int = 20,
    offset: int = 0,
    current_user: User = Depends(require_verified_email),
    share_service: ShareService = Depends(get_share_service)
):
    """
    List user's social media shares.

    Returns paginated list of all shares created by the user,
    including click status and credit earned information.

    Args:
        limit: Max results per page (default: 20, max: 100)
        offset: Pagination offset (default: 0)
        current_user: Authenticated user
        share_service: Share service instance

    Returns:
        List of share responses
    """
    # Validate pagination params
    if limit < 1 or limit > 100:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"error": "invalid_limit", "message": "Limit must be between 1 and 100"}
        )

    if offset < 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"error": "invalid_offset", "message": "Offset must be >= 0"}
        )

    shares_data = await share_service.get_user_shares(
        user_id=current_user.id,
        limit=limit,
        offset=offset
    )

    return ShareListResponse(**shares_data)
