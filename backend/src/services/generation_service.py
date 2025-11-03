"""
Generation service for orchestrating landscape design generation workflow.

Workflow:
1. Authorize user (check subscription > trial > tokens)
2. Deduct payment BEFORE Gemini API call
3. Process image through Gemini
4. Upload results to Vercel Blob
5. Save generation record
6. Refund payment if failure occurs

Requirements:
- FR-028: Landscape generation with Gemini 2.5 Flash
- FR-013: Refund trial on failure
- FR-066: Refund payment on generation failure
"""

import asyncio
from datetime import datetime
from typing import Optional, List, Tuple
from uuid import UUID
import io

from src.db.connection_pool import DatabasePool
from src.services.gemini_client import GeminiClient
from src.services.storage_service import BlobStorageService
from src.services.trial_service import TrialService


class GenerationService:
    """Service for orchestrating landscape generation workflow."""

    def __init__(
        self,
        db_pool: DatabasePool,
        gemini_client: GeminiClient,
        storage_service: BlobStorageService,
        trial_service: TrialService
    ):
        self.db = db_pool
        self.gemini = gemini_client
        self.storage = storage_service
        self.trial_service = trial_service

    async def process_generation(
        self,
        generation_id: UUID,
        user_id: UUID,
        input_image_bytes: bytes,
        address: str,
        area_type: str,
        style: str,
        custom_prompt: Optional[str],
        payment_method: str
    ) -> Tuple[bool, Optional[str]]:
        """
        Process complete generation workflow.

        This is the main orchestration method called asynchronously after
        the generation record is created.

        Args:
            generation_id: Generation UUID
            user_id: User UUID
            input_image_bytes: Input property image bytes
            address: Property address
            area_type: Landscape area type
            style: Design style
            custom_prompt: Optional custom instructions
            payment_method: Payment method used ('subscription', 'trial', 'token')

        Returns:
            Tuple of (success, error_message)
        """
        try:
            # Update status to 'processing'
            await self.db.execute("""
                UPDATE generations
                SET status = 'processing',
                    updated_at = NOW()
                WHERE id = $1
            """, generation_id)

            # Create generation area record
            area_id = await self.db.fetchval("""
                INSERT INTO generation_areas (
                    generation_id,
                    area_type,
                    status,
                    progress
                ) VALUES ($1, $2, 'processing', 0)
                RETURNING id
            """, generation_id, area_type)

            # Generate landscape design with Gemini
            start_time = datetime.utcnow()

            try:
                output_image_bytes = await self.gemini.generate_landscape_design(
                    input_image=input_image_bytes,
                    address=address,
                    area_type=area_type,
                    style=style,
                    custom_prompt=custom_prompt
                )
            except Exception as gemini_error:
                # Gemini API failed - refund payment
                await self._handle_failure(
                    generation_id,
                    area_id,
                    user_id,
                    payment_method,
                    f"Gemini API error: {str(gemini_error)}"
                )
                return False, str(gemini_error)

            gemini_response_time = (datetime.utcnow() - start_time).total_seconds()

            # Update progress
            await self.db.execute("""
                UPDATE generation_areas
                SET progress = 50,
                    gemini_response_time = $2
                WHERE id = $1
            """, area_id, gemini_response_time)

            # Upload output image to Vercel Blob
            try:
                filename = f"generation_{generation_id}_{area_type}.jpg"
                output_url = await self.storage.upload_image(
                    image_data=output_image_bytes,
                    filename=filename
                )
            except Exception as storage_error:
                # Storage upload failed - refund payment
                await self._handle_failure(
                    generation_id,
                    area_id,
                    user_id,
                    payment_method,
                    f"Storage upload error: {str(storage_error)}"
                )
                return False, str(storage_error)

            # Mark generation as completed
            await self.db.execute("""
                UPDATE generation_areas
                SET status = 'completed',
                    progress = 100,
                    output_image_url = $2,
                    completed_at = NOW()
                WHERE id = $1
            """, area_id, output_url)

            await self.db.execute("""
                UPDATE generations
                SET status = 'completed',
                    completed_at = NOW()
                WHERE id = $1
            """, generation_id)

            print(f"Generation {generation_id} completed successfully")
            return True, None

        except Exception as e:
            # Unexpected error - refund payment
            await self._handle_failure(
                generation_id,
                None,
                user_id,
                payment_method,
                f"Unexpected error: {str(e)}"
            )
            return False, str(e)

    async def _handle_failure(
        self,
        generation_id: UUID,
        area_id: Optional[UUID],
        user_id: UUID,
        payment_method: str,
        error_message: str
    ) -> None:
        """
        Handle generation failure.

        Requirements:
        - FR-013: Refund trial if generation fails
        - FR-066: Refund payment on generation failure

        Args:
            generation_id: Generation UUID
            area_id: Generation area UUID (if created)
            user_id: User UUID
            payment_method: Payment method to refund
            error_message: Error message to store
        """
        try:
            # Update generation status to 'failed'
            await self.db.execute("""
                UPDATE generations
                SET status = 'failed',
                    error_message = $2,
                    completed_at = NOW()
                WHERE id = $1
            """, generation_id, error_message)

            # Update area status if area was created
            if area_id:
                await self.db.execute("""
                    UPDATE generation_areas
                    SET status = 'failed',
                        error_message = $2
                    WHERE id = $1
                """, area_id, error_message)

            # Refund payment
            if payment_method == 'subscription':
                # No refund needed - subscription doesn't deduct anything
                pass

            elif payment_method == 'trial':
                # Refund trial credit
                success, remaining = await self.trial_service.refund_trial(user_id)
                if success:
                    print(f"Refunded trial credit to user {user_id}. New balance: {remaining}")

            elif payment_method == 'token':
                # Refund token
                result = await self.db.fetchrow("""
                    SELECT * FROM add_tokens($1, 1, 'refund', 'Generation failed - refund', NULL)
                """, user_id)

                if result['success']:
                    print(f"Refunded token to user {user_id}. New balance: {result['new_balance']}")

            print(f"Generation {generation_id} failed: {error_message}")

        except Exception as e:
            print(f"Error handling failure for generation {generation_id}: {e}")

    async def process_multi_area_generation(
        self,
        generation_id: UUID,
        user_id: UUID,
        input_image_bytes: bytes,
        address: str,
        areas: List[str],
        style: str,
        custom_prompt: Optional[str],
        payment_method: str
    ) -> Tuple[bool, Optional[str]]:
        """
        Process multi-area generation in parallel.

        Requirements:
        - FR-056: Generate multiple areas in parallel
        - FR-057: Each area tracked separately

        Args:
            generation_id: Generation UUID
            user_id: User UUID
            input_image_bytes: Input property image
            address: Property address
            areas: List of area types to generate
            style: Design style
            custom_prompt: Optional custom instructions
            payment_method: Payment method used

        Returns:
            Tuple of (success, error_message)
        """
        try:
            # Update status to 'processing'
            await self.db.execute("""
                UPDATE generations
                SET status = 'processing',
                    updated_at = NOW()
                WHERE id = $1
            """, generation_id)

            # Create tasks for each area
            tasks = []
            for area_type in areas:
                task = self._process_single_area(
                    generation_id=generation_id,
                    user_id=user_id,
                    input_image_bytes=input_image_bytes,
                    address=address,
                    area_type=area_type,
                    style=style,
                    custom_prompt=custom_prompt
                )
                tasks.append(task)

            # Process all areas in parallel
            results = await asyncio.gather(*tasks, return_exceptions=True)

            # Check if all succeeded
            all_succeeded = all(r[0] if isinstance(r, tuple) else False for r in results)

            if all_succeeded:
                # Mark generation as completed
                await self.db.execute("""
                    UPDATE generations
                    SET status = 'completed',
                        completed_at = NOW()
                    WHERE id = $1
                """, generation_id)

                return True, None
            else:
                # At least one area failed - mark as partial
                await self.db.execute("""
                    UPDATE generations
                    SET status = 'partial',
                        error_message = 'Some areas failed to generate',
                        completed_at = NOW()
                    WHERE id = $1
                """, generation_id)

                # Don't refund if at least one area succeeded
                return True, "Some areas failed to generate"

        except Exception as e:
            # Complete failure - refund payment
            await self._handle_failure(
                generation_id,
                None,
                user_id,
                payment_method,
                f"Multi-area generation error: {str(e)}"
            )
            return False, str(e)

    async def _process_single_area(
        self,
        generation_id: UUID,
        user_id: UUID,
        input_image_bytes: bytes,
        address: str,
        area_type: str,
        style: str,
        custom_prompt: Optional[str]
    ) -> Tuple[bool, Optional[str]]:
        """
        Process single area generation.

        Args:
            generation_id: Generation UUID
            user_id: User UUID
            input_image_bytes: Input image
            address: Property address
            area_type: Area type
            style: Design style
            custom_prompt: Custom instructions

        Returns:
            Tuple of (success, error_message)
        """
        try:
            # Create area record
            area_id = await self.db.fetchval("""
                INSERT INTO generation_areas (
                    generation_id,
                    area_type,
                    status,
                    progress
                ) VALUES ($1, $2, 'processing', 0)
                RETURNING id
            """, generation_id, area_type)

            # Generate with Gemini
            start_time = datetime.utcnow()
            output_image_bytes = await self.gemini.generate_landscape_design(
                input_image=input_image_bytes,
                address=address,
                area_type=area_type,
                style=style,
                custom_prompt=custom_prompt
            )
            gemini_response_time = (datetime.utcnow() - start_time).total_seconds()

            # Upload to storage
            filename = f"generation_{generation_id}_{area_type}.jpg"
            output_url = await self.storage.upload_image(
                image_data=output_image_bytes,
                filename=filename
            )

            # Mark area as completed
            await self.db.execute("""
                UPDATE generation_areas
                SET status = 'completed',
                    progress = 100,
                    output_image_url = $2,
                    gemini_response_time = $3,
                    completed_at = NOW()
                WHERE id = $1
            """, area_id, output_url, gemini_response_time)

            return True, None

        except Exception as e:
            # Mark area as failed
            if area_id:
                await self.db.execute("""
                    UPDATE generation_areas
                    SET status = 'failed',
                        error_message = $2
                    WHERE id = $1
                """, area_id, str(e))

            return False, str(e)


# Dependency injection helper
_generation_service_instance = None


async def get_generation_service(
    db_pool: DatabasePool = None,
    gemini_client: GeminiClient = None,
    storage_service: BlobStorageService = None,
    trial_service: TrialService = None
) -> GenerationService:
    """
    Get or create generation service instance.

    Usage in FastAPI:
        @app.post("/generate")
        async def generate(
            generation_service: GenerationService = Depends(get_generation_service)
        ):
            await generation_service.process_generation(...)
    """
    global _generation_service_instance

    if _generation_service_instance is None:
        if db_pool is None:
            from src.db.connection_pool import db_pool as default_pool
            db_pool = default_pool

        if gemini_client is None:
            gemini_client = GeminiClient()

        if storage_service is None:
            storage_service = BlobStorageService()

        if trial_service is None:
            from src.services.trial_service import get_trial_service
            trial_service = await get_trial_service(db_pool)

        _generation_service_instance = GenerationService(
            db_pool=db_pool,
            gemini_client=gemini_client,
            storage_service=storage_service,
            trial_service=trial_service
        )

    return _generation_service_instance
