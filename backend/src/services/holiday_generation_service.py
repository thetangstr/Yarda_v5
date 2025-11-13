"""
Holiday Generation Service

Orchestrates holiday decoration generation workflow with holiday credits.

Workflow:
1. Validate user has holiday credits
2. Deduct credit atomically BEFORE generation
3. Geocode address
4. Fetch Street View image with user-selected heading
5. Generate decorated image via Gemini
6. Create before/after comparison image
7. Upload results to storage
8. Save generation record
9. Refund credit if generation fails

Feature: 007-holiday-decorator (T027)
User Story 1: New User Discovery & First Generation
"""

import asyncio
import logging
from datetime import datetime
from typing import Optional, Tuple
from uuid import UUID, uuid4

from ..db.connection_pool import DatabasePool
from ..services.holiday_credit_service import HolidayCreditService
from ..services.token_service import TokenService
from ..services.maps_service import MapsService
from ..services.gemini_client import GeminiClient
from ..services.storage_service import BlobStorageService
from ..lib.imageComposition import create_before_after_image

logger = logging.getLogger(__name__)


class HolidayGenerationService:
    """
    Service for holiday decoration generation workflow.

    Credit hierarchy:
    1. Holiday credits (from signup bonus or social sharing)
    2. Token credits (fallback if holiday credits insufficient)
    3. Fail with insufficient credits error

    This allows users to use their purchased tokens for holiday generations
    if they run out of holiday-specific credits.
    """

    def __init__(
        self,
        db_pool: DatabasePool,
        credit_service: HolidayCreditService,
        token_service: TokenService,
        maps_service: MapsService,
        gemini_client: GeminiClient,
        storage_service: BlobStorageService,
    ):
        """
        Initialize holiday generation service.

        Args:
            db_pool: Database connection pool
            credit_service: Holiday credit service for atomic deductions
            token_service: Token service for fallback credit deductions
            maps_service: Google Maps service for geocoding/Street View
            gemini_client: Gemini AI client for image generation
            storage_service: Vercel Blob storage service
        """
        self.db = db_pool
        self.credit_service = credit_service
        self.token_service = token_service
        self.maps_service = maps_service
        self.gemini = gemini_client
        self.storage = storage_service

    # ========================================================================
    # Main Generation Workflow
    # ========================================================================

    async def create_generation(
        self,
        user_id: UUID,
        address: str,
        heading: int,
        pitch: int,
        style: str,
    ) -> Tuple[UUID, str]:
        """
        Create holiday decoration generation.

        Main entry point for generation workflow. Handles full flow from
        credit validation to final result upload.

        Args:
            user_id: User UUID
            address: Street address for decoration
            heading: Street View heading (0-359 degrees, user-selected)
            pitch: Street View pitch (-90 to 90, default 0)
            style: Decoration style ('classic', 'modern', 'over_the_top')

        Returns:
            Tuple of (generation_id, status_message)

        Raises:
            ValueError: If user has insufficient credits
            RuntimeError: If generation workflow fails
        """
        generation_id = uuid4()

        # Check if this is the 25th, 50th, 75th, etc. generation globally (easter egg)
        try:
            total_generations = await self.db.fetchval(
                "SELECT COUNT(*) FROM holiday_generations"
            )
            is_easter_egg = (total_generations + 1) % 25 == 0
        except Exception:
            is_easter_egg = False

        try:
            # Step 1: Deduct credit atomically BEFORE generation
            # CRITICAL: Deduct first to prevent free generations on failure
            # Credit hierarchy: Holiday credits -> Token credits -> Fail

            credit_type_used = None  # Track which credit type was used for refunds

            # Try holiday credits first
            deduction_result = await self.credit_service.deduct_credit(user_id)

            if deduction_result.success:
                credit_type_used = "holiday"
                logger.info(
                    f"Holiday credit deducted for generation {generation_id}. "
                    f"Remaining: {deduction_result.credits_remaining}"
                )
            else:
                # Holiday credits insufficient, try token credits as fallback
                logger.info(f"Holiday credits insufficient for user {user_id}, trying token credits")

                token_result = await self.token_service.deduct_token_atomic(user_id)
                success, token_balance, _ = token_result

                if success:
                    credit_type_used = "token"
                    logger.info(
                        f"Token credit deducted for holiday generation {generation_id}. "
                        f"Token balance: {token_balance}"
                    )
                else:
                    # Both credit types insufficient
                    raise ValueError(
                        f"Insufficient credits. "
                        f"Holiday credits: {deduction_result.credits_remaining}, "
                        f"Token balance: {token_balance}"
                    )

            # Step 2: Geocode address with accuracy validation
            geocode_result = await self.maps_service.geocode_address(address)
            if not geocode_result:
                # Refund the credit type that was used
                if credit_type_used == "holiday":
                    await self.credit_service.grant_credit(
                        user_id,
                        amount=1,
                        reason="geocoding_failure_refund"
                    )
                elif credit_type_used == "token":
                    # Refund token credit
                    await self.token_service.add_tokens(
                        user_id,
                        amount=1,
                        transaction_type="refund",
                        description="Holiday generation geocoding failure refund"
                    )
                raise RuntimeError(f"Failed to geocode address: {address}")

            coords = geocode_result.coordinates

            # Log accuracy warning for holiday decorator
            if geocode_result.location_type != "ROOFTOP":
                logger.warning(
                    "holiday_geocoding_accuracy",
                    address=address,
                    location_type=geocode_result.location_type,
                    has_street_number=geocode_result.has_street_number,
                    message="Non-ROOFTOP geocoding may affect decoration accuracy"
                )

            # Step 3: Fetch Street View image with user-selected heading
            street_view_bytes = await self.maps_service.fetch_street_view_image(
                coords,
                heading=heading,
                pitch=pitch
            )

            if not street_view_bytes:
                # Refund the credit type that was used
                if credit_type_used == "holiday":
                    await self.credit_service.grant_credit(
                        user_id,
                        amount=1,
                        reason="street_view_failure_refund"
                    )
                elif credit_type_used == "token":
                    # Refund token credit
                    await self.token_service.add_tokens(
                        user_id,
                        amount=1,
                        transaction_type="refund",
                        description="Holiday generation Street View failure refund"
                    )
                raise RuntimeError(
                    f"Street View not available for address: {address}. "
                    f"Try a different address or adjust the heading."
                )

            # Step 4: Upload original image to storage
            original_image_url = await self.storage.upload_image(
                image_data=street_view_bytes,
                filename=f"holiday/{generation_id}/original.jpg"
            )

            # Step 5: Create generation record (status: pending)
            await self._create_generation_record(
                generation_id=generation_id,
                user_id=user_id,
                address=address,
                geocoded_lat=coords.lat,
                geocoded_lng=coords.lng,
                heading=heading,
                pitch=pitch,
                style=style,
                original_image_url=original_image_url,
            )

            # Step 6: Generate decorated image (async via Gemini)
            # This will update status to 'processing' -> 'completed' or 'failed'
            asyncio.create_task(
                self._generate_decorated_image(
                    generation_id=generation_id,
                    user_id=user_id,
                    street_view_bytes=street_view_bytes,
                    style=style,
                    original_image_url=original_image_url,
                    credit_type_used=credit_type_used,
                    is_easter_egg=is_easter_egg,
                )
            )

            logger.info(f"Generation {generation_id} created and queued for processing")

            return (
                generation_id,
                f"Generation created successfully. Estimated completion: 10 seconds"
            )

        except Exception as e:
            logger.error(f"Generation creation failed for user {user_id}: {str(e)}")
            raise

    async def _generate_decorated_image(
        self,
        generation_id: UUID,
        user_id: UUID,
        street_view_bytes: bytes,
        style: str,
        original_image_url: str,
        credit_type_used: str,
        is_easter_egg: bool = False,
    ):
        """
        Generate decorated image via Gemini AI.

        Runs asynchronously after generation record is created.
        Updates status to 'processing' -> 'completed' or 'failed'.

        Args:
            generation_id: Generation UUID
            user_id: User UUID
            street_view_bytes: Original Street View image bytes
            style: Decoration style
            original_image_url: URL of original image
            credit_type_used: Type of credit used ('holiday' or 'token') for refunds
            is_easter_egg: Whether this is a special 25th+ generation easter egg
        """
        try:
            # Update status to processing
            await self.db.execute(
                """
                UPDATE holiday_generations
                SET status = 'processing', updated_at = NOW()
                WHERE id = $1
                """,
                generation_id
            )

            # Call Gemini AI to generate decorated image
            # TODO: Implement actual Gemini prompt for holiday decoration
            # For now, use placeholder
            decorated_image_bytes = await self._call_gemini_for_decoration(
                street_view_bytes,
                style,
                is_easter_egg=is_easter_egg
            )

            # Upload decorated image
            decorated_image_url = await self.storage.upload_image(
                image_data=decorated_image_bytes,
                filename=f"holiday/{generation_id}/decorated.jpg"
            )

            # Create before/after comparison image
            before_after_bytes = await create_before_after_image(
                before_image_bytes=street_view_bytes,
                after_image_bytes=decorated_image_bytes
            )

            # Upload before/after image
            before_after_url = await self.storage.upload_image(
                image_data=before_after_bytes,
                filename=f"holiday/{generation_id}/before-after.jpg"
            )

            # Update generation record with results
            await self.db.execute(
                """
                UPDATE holiday_generations
                SET
                    status = 'completed',
                    decorated_image_url = $2,
                    before_after_image_url = $3,
                    updated_at = NOW()
                WHERE id = $1
                """,
                generation_id,
                decorated_image_url,
                before_after_url
            )

            logger.info(f"Generation {generation_id} completed successfully")

        except Exception as e:
            logger.error(f"Generation {generation_id} failed: {str(e)}")

            # Update status to failed
            await self.db.execute(
                """
                UPDATE holiday_generations
                SET
                    status = 'failed',
                    error_message = $2,
                    updated_at = NOW()
                WHERE id = $1
                """,
                generation_id,
                str(e)
            )

            # Refund the credit type that was used
            if credit_type_used == "holiday":
                await self.credit_service.grant_credit(
                    user_id,
                    amount=1,
                    reason="generation_failure_refund"
                )
            elif credit_type_used == "token":
                # Refund token credit
                await self.token_service.add_tokens(
                    user_id,
                    amount=1,
                    transaction_type="refund",
                    description="Holiday generation failure refund"
                )

            logger.info(f"Refunded 1 credit to user {user_id} due to generation failure")

    async def _call_gemini_for_decoration(
        self,
        image_bytes: bytes,
        style: str,
        is_easter_egg: bool = False,
    ) -> bytes:
        """
        Call Gemini AI to generate holiday-decorated image.

        Transforms the Street View image by adding festive holiday decorations
        while preserving the house structure and architectural details.

        Special: Every 25th generation globally includes a Labubu Santa easter egg!

        Args:
            image_bytes: Original Street View image
            style: Decoration style ('classic', 'modern_minimalist', 'over_the_top')
            is_easter_egg: Whether to include Labubu Santa easter egg

        Returns:
            Decorated image bytes (JPEG)
        """
        try:
            # Map style to custom prompt
            style_prompts = {
                "classic": (
                    "Classic traditional holiday decorations: "
                    "Red and green color scheme, wreaths on doors and windows, "
                    "warm white string lights along roofline and eaves, "
                    "traditional ornaments, garland on railings, "
                    "candy canes along walkway, classic red bow accents."
                ),
                "modern_minimalist": (
                    "Modern minimalist holiday decorations: "
                    "White and silver color palette, geometric light patterns, "
                    "minimal clean-lined LED lighting, elegant simple wreath, "
                    "understated sophistication, contemporary style."
                ),
                "over_the_top": (
                    "Maximum festive decorations (Clark Griswold style): "
                    "Colorful synchronized lights covering entire house, "
                    "inflatable Santa and reindeer on lawn, "
                    "animated light displays, massive light-up snowman, "
                    "candy cane path lining, projector effects, "
                    "every surface covered in lights and decorations."
                )
            }

            custom_prompt = style_prompts.get(style, style_prompts["classic"])

            # Easter egg: Every 25th generation gets a special Labubu Santa!
            easter_egg_suffix = ""
            if is_easter_egg:
                logger.info("🎉 SPECIAL: This is a lucky 25th generation! Adding Labubu Santa easter egg!")
                easter_egg_suffix = (
                    "\n\n🎉 SPECIAL EASTER EGG:\n"
                    "Add a cute Labubu Santa character figure to the scene! "
                    "Labubu is a cute Pop Mart collectible character with a distinctive look. "
                    "Add it prominently on the lawn or porch, dressed as Santa Claus with a red suit and white fur trim. "
                    "Make it eye-catching and whimsical as a special easter egg for this lucky generation!"
                )

            logger.info(f"Calling Gemini for holiday decoration with style: {style}")

            # Use Gemini to generate decorated version
            # CRITICAL: preservation_strength=0.35 for VISIBLE decorations (0.0-0.4 = dramatic transformation)
            # With 0.8+ the AI only does subtle refinement and decorations won't be visible!
            decorated_bytes = await self.gemini.generate_landscape_design(
                input_image=image_bytes,
                address=None,  # Not needed, we have the image
                area_type="front_yard",
                style="holiday_decorator",
                custom_prompt=(
                    f"{custom_prompt}\n\n"
                    f"CRITICAL INSTRUCTIONS:\n"
                    f"1. Add VISIBLE, PROMINENT holiday decorations to the house exterior\n"
                    f"2. Make the decorations OBVIOUS and clearly visible in the image\n"
                    f"3. Keep the original house structure, walls, roof, and basic architecture intact\n"
                    f"4. Only modify the appearance by ADDING decorations on top of existing elements\n"
                    f"5. Do NOT remove or change structural elements - only ADD festive decorations\n"
                    f"6. Ensure decorations are bright, colorful, and eye-catching\n"
                    f"7. The decorated version should look dramatically more festive while keeping the same house"
                    f"{easter_egg_suffix}"
                ),
                preservation_strength=0.35  # Dramatic transformation (0.0-0.4 range) for VISIBLE decorations
            )

            logger.info("Successfully generated holiday-decorated image")
            return decorated_bytes

        except Exception as e:
            logger.error(f"Gemini decoration failed: {str(e)}")
            # Return original image on failure so user still sees something
            logger.warning("Returning original image due to Gemini failure")
            return image_bytes

    async def _create_generation_record(
        self,
        generation_id: UUID,
        user_id: UUID,
        address: str,
        geocoded_lat: float,
        geocoded_lng: float,
        heading: int,
        pitch: int,
        style: str,
        original_image_url: str,
    ):
        """
        Create holiday_generations database record.

        Args:
            generation_id: Generation UUID
            user_id: User UUID
            address: Geocoded address
            geocoded_lat: Latitude
            geocoded_lng: Longitude
            heading: Street View heading
            pitch: Street View pitch
            style: Decoration style
            original_image_url: URL of original image
        """
        await self.db.execute(
            """
            INSERT INTO holiday_generations (
                id, user_id, address,
                geocoded_lat, geocoded_lng,
                street_view_heading, street_view_pitch,
                style, original_image_url,
                status, credit_deducted
            ) VALUES (
                $1, $2, $3, $4, $5, $6, $7, $8, $9, 'pending', true
            )
            """,
            generation_id,
            user_id,
            address,
            geocoded_lat,
            geocoded_lng,
            heading,
            pitch,
            style,
            original_image_url
        )

    # ========================================================================
    # Query Methods
    # ========================================================================

    async def get_generation(self, generation_id: UUID) -> Optional[dict]:
        """
        Get generation by ID.

        Args:
            generation_id: Generation UUID

        Returns:
            Generation record dict or None if not found
        """
        row = await self.db.fetchrow(
            """
            SELECT
                id, user_id, address,
                geocoded_lat, geocoded_lng,
                street_view_heading AS heading,
                street_view_pitch AS pitch,
                style, status,
                original_image_url,
                decorated_image_url,
                before_after_image_url,
                credit_deducted,
                credit_refunded,
                error_message,
                created_at, updated_at
            FROM holiday_generations
            WHERE id = $1
            """,
            generation_id
        )

        return dict(row) if row else None

    async def list_user_generations(
        self,
        user_id: UUID,
        limit: int = 20,
        offset: int = 0
    ) -> list:
        """
        List generations for a user.

        Args:
            user_id: User UUID
            limit: Max results (default: 20)
            offset: Pagination offset (default: 0)

        Returns:
            List of generation dicts
        """
        rows = await self.db.fetch(
            """
            SELECT
                id, user_id, address,
                geocoded_lat, geocoded_lng,
                street_view_heading AS heading,
                street_view_pitch AS pitch,
                style, status,
                original_image_url,
                decorated_image_url,
                before_after_image_url,
                credit_deducted,
                credit_refunded,
                error_message,
                created_at, updated_at
            FROM holiday_generations
            WHERE user_id = $1
            ORDER BY created_at DESC
            LIMIT $2 OFFSET $3
            """,
            user_id,
            limit,
            offset
        )

        return [dict(row) for row in rows]
