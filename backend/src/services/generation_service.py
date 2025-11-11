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
import json
from datetime import datetime
from typing import Optional, List, Tuple, Dict, Any
from uuid import UUID
import io

from src.db.connection_pool import DatabasePool
from src.services.gemini_client import GeminiClient
from src.services.storage_service import BlobStorageService
from src.services.trial_service import TrialService
from src.services.token_service import TokenService
from src.services.subscription_service import SubscriptionService
from src.services.debug_service import get_debug_service
from src.models.generation import PaymentType


class GenerationService:
    """Service for orchestrating landscape generation workflow."""

    def __init__(
        self,
        db_pool: DatabasePool,
        gemini_client: GeminiClient,
        storage_service: BlobStorageService,
        trial_service: TrialService,
        token_service: TokenService,
        subscription_service: SubscriptionService,
        maps_service = None
    ):
        self.db = db_pool
        self.gemini = gemini_client
        self.storage = storage_service
        self.trial_service = trial_service
        self.token_service = token_service
        self.subscription_service = subscription_service

        # Initialize MapsService if not provided
        if maps_service is None:
            from src.services.maps_service import MapsService
            self.maps_service = MapsService()
        else:
            self.maps_service = maps_service

    async def authorize_and_deduct_payment(
        self,
        user_id: UUID,
        num_areas: int = 1
    ) -> Tuple[bool, Optional[PaymentType], Optional[str], Optional[Dict[str, Any]]]:
        """
        Authorize generation request and atomically deduct payment.

        Implements payment hierarchy per FR-007:
        1. Active subscription (unlimited) - HIGHEST PRIORITY
        2. Trial credits (3 free) - SECOND PRIORITY
        3. Token balance (pay-per-use) - LOWEST PRIORITY

        Requirements:
        - FR-007: Payment hierarchy (subscription > trial > token)
        - FR-026: Atomic token deduction with row-level locking
        - FR-013: Atomic trial deduction
        - FR-060: Multi-area cost calculation (1 credit per area)

        Args:
            user_id: User UUID
            num_areas: Number of areas to generate (default 1)

        Returns:
            Tuple of (success, payment_method, error_message, payment_details)
            - success: True if authorized and payment deducted
            - payment_method: PaymentType enum value (subscription/trial/token)
            - error_message: Error message if authorization failed
            - payment_details: Dict with balance info (optional)
        """
        try:
            # Step 1: Check for active subscription (highest priority)
            subscription_status = await self.subscription_service.get_subscription_status(user_id)
            if subscription_status and subscription_status.status == 'active':
                # Active subscription - no deduction needed
                return (
                    True,
                    PaymentType.SUBSCRIPTION,
                    None,
                    {'subscription_status': 'active', 'unlimited': True}
                )

            # Step 2: Check trial credits (second priority)
            trial_balance, _ = await self.trial_service.get_trial_balance(user_id)
            if trial_balance >= num_areas:
                # Attempt to atomically deduct trial credits (one at a time for multi-area)
                for i in range(num_areas):
                    success, new_balance = await self.trial_service.deduct_trial(user_id)
                    if not success:
                        # Refund previously deducted trial credits
                        if i > 0:
                            await self._refund_trials(user_id, i)
                        return (
                            False,
                            None,
                            f"Trial credit deduction failed after {i} credits (race condition or insufficient balance)",
                            None
                        )

                return (
                    True,
                    PaymentType.TRIAL,
                    None,
                    {'trial_remaining': new_balance, 'deducted': num_areas}
                )

            # Step 3: Check token balance (lowest priority)
            token_balance, _, _ = await self.token_service.get_token_balance(user_id)
            if token_balance >= num_areas:
                # Attempt to atomically deduct tokens
                for i in range(num_areas):
                    success, new_balance, auto_reload_info = await self.token_service.deduct_token_atomic(user_id)
                    if not success:
                        # Refund previously deducted tokens
                        if i > 0:
                            await self._refund_tokens(user_id, i)
                        return (
                            False,
                            None,
                            f"Token deduction failed after {i} tokens (race condition or insufficient balance)",
                            None
                        )

                return (
                    True,
                    PaymentType.TOKEN,
                    None,
                    {
                        'tokens_remaining': new_balance,
                        'deducted': num_areas,
                        'auto_reload_triggered': auto_reload_info is not None
                    }
                )

            # No payment method available
            error_message = (
                f"Insufficient credits/tokens for {num_areas} area(s). "
                f"Available: {trial_balance} trial credits, {token_balance} tokens. "
                f"Purchase tokens or upgrade to Pro subscription for unlimited generations."
            )
            return (False, None, error_message, None)

        except Exception as e:
            return (
                False,
                None,
                f"Payment authorization error: {str(e)}",
                None
            )

    async def _refund_trials(self, user_id: UUID, amount: int) -> None:
        """
        Refund trial credits after partial deduction failure.

        Args:
            user_id: User UUID
            amount: Number of trial credits to refund
        """
        try:
            for _ in range(amount):
                await self.trial_service.refund_trial(user_id)
        except Exception as e:
            print(f"Error refunding {amount} trial credits to user {user_id}: {e}")

    async def _refund_tokens(self, user_id: UUID, amount: int) -> None:
        """
        Refund tokens after partial deduction failure.

        Args:
            user_id: User UUID
            amount: Number of tokens to refund
        """
        try:
            for _ in range(amount):
                await self.db.execute("""
                    SELECT * FROM add_tokens($1, 1, 'refund', 'Partial generation rollback', NULL)
                """, user_id)
        except Exception as e:
            print(f"Error refunding {amount} tokens to user {user_id}: {e}")

    async def create_generation(
        self,
        user_id: UUID,
        address: str,
        areas: List[Dict[str, Any]],
    ) -> Tuple[bool, Optional[UUID], Optional[str], Optional[Dict[str, Any]]]:
        """
        Create a new multi-area generation request with atomic payment deduction.

        Feature: 004-generation-flow
        User Story: US1 (single-area), US2 (multi-area)

        Requirements:
        - FR-008: Atomic payment deduction BEFORE generation
        - FR-001: Address validation and geocoding
        - FR-060: Multi-area support (1-5 areas)
        - FR-011: Automatic refund on failure

        Args:
            user_id: User UUID
            address: Property address for Street View imagery
            areas: List of area requests, each with:
                - area: YardArea enum value
                - style: DesignStyle enum value
                - custom_prompt: Optional custom prompt
                - preservation_strength: Optional float (0.0-1.0, default 0.5)

        Returns:
            Tuple of (success, generation_id, error_message, generation_data)
            - success: True if generation created and payment deducted
            - generation_id: UUID of created generation request
            - error_message: Error message if creation failed
            - generation_data: Dict with generation details (status, payment_method, areas)
        """
        try:
            num_areas = len(areas)

            # Step 1: Authorize and atomically deduct payment
            payment_success, payment_method, payment_error, payment_details = \
                await self.authorize_and_deduct_payment(user_id, num_areas)

            if not payment_success:
                return (False, None, payment_error, None)

            # Step 2: Create generation record
            generation_id = await self.db.fetchval("""
                INSERT INTO generations (
                    user_id,
                    address,
                    request_params,
                    status,
                    payment_type,
                    total_cost,
                    payment_method,
                    tokens_deducted,
                    created_at
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())
                RETURNING id
            """,
                user_id,
                address,
                json.dumps({"address": address, "areas": areas}),  # Store complete request as JSON
                "pending",
                payment_method.value,
                num_areas,
                payment_method.value,
                num_areas if payment_method == PaymentType.TOKEN else 0
            )

            # Step 3: Create generation_areas records for each area
            area_ids = []
            for area_data in areas:
                area_id = await self.db.fetchval("""
                    INSERT INTO generation_areas (
                        generation_id,
                        area_type,
                        style,
                        custom_prompt,
                        status,
                        progress,
                        created_at
                    ) VALUES ($1, $2, $3, $4, $5, $6, NOW())
                    RETURNING id
                """,
                    generation_id,
                    area_data['area'],
                    area_data['style'],
                    area_data.get('custom_prompt'),
                    'pending',  # Changed from 'not_started' to match DB constraint
                    0
                )
                area_ids.append(area_id)

            # Step 3.5: Retrieve Street View imagery for the address (T013)
            street_view_url = None
            debug_service = get_debug_service()

            try:
                # Log: About to retrieve Street View
                debug_service.log(
                    generation_id,
                    'address_validation',
                    'info',
                    f'Validating address via Google Maps API: {address}'
                )

                # Always fetch Street View for the property (needed for front_yard)
                # Each area's process_generation will determine which image type to use
                street_view_bytes, metadata, _, image_source = await self.maps_service.get_property_images(
                    address, 'front_yard'  # Always use front_yard to ensure Street View is fetched
                )

                # Log: Street View retrieved successfully
                debug_service.log(
                    generation_id,
                    'street_view_retrieved',
                    'success',
                    f'Street View image retrieved successfully (pano_id: {metadata.pano_id if metadata else "unknown"})'
                )

                # Store source image metadata in generation_source_images table
                if metadata and metadata.pano_id:
                    await self.db.execute("""
                        INSERT INTO generation_source_images (
                            generation_id,
                            image_type,
                            image_url,
                            pano_id,
                            api_cost,
                            created_at
                        ) VALUES ($1, $2, $3, $4, $5, NOW())
                    """,
                        generation_id,
                        image_source,  # 'google_street_view'
                        'pending_upload',  # Placeholder until blob upload
                        metadata.pano_id,
                        0.007  # $0.007 per Street View image
                    )

                    # Store URL for returning to client (will be uploaded to blob in background worker)
                    street_view_url = f"pano_id:{metadata.pano_id}"

                    # Log: Images displayed to user
                    debug_service.log(
                        generation_id,
                        'images_displayed',
                        'success',
                        'Street View thumbnail ready for display'
                    )

            except Exception as e:
                # Street View retrieval failed - refund payment and abort
                error_msg = f"Failed to retrieve property imagery: {str(e)}"
                debug_service.log(
                    generation_id,
                    'google_maps_api_call',
                    'error',
                    f'Street View retrieval failed: {str(e)}'
                )

                # Refund payment
                if payment_method == PaymentType.TRIAL:
                    await self._refund_trials(user_id, num_areas)
                elif payment_method == PaymentType.TOKEN:
                    await self._refund_tokens(user_id, num_areas)

                # Mark generation as failed
                await self.db.execute("""
                    UPDATE generations
                    SET status = 'failed',
                        error_message = $2,
                        completed_at = NOW()
                    WHERE id = $1
                """, generation_id, error_msg)

                return (False, None, error_msg, None)

            # Step 4: Return generation details
            generation_data = {
                'generation_id': str(generation_id),
                'status': 'pending',
                'payment_method': payment_method.value,
                'total_cost': num_areas,
                'payment_details': payment_details,
                'area_ids': [str(aid) for aid in area_ids],
                'created_at': datetime.utcnow().isoformat(),
                'street_view_bytes': street_view_bytes  # Include for background processing
            }

            return (True, generation_id, None, generation_data)

        except Exception as e:
            # If generation creation fails after payment, refund
            if payment_success:
                if payment_method == PaymentType.TRIAL:
                    await self._refund_trials(user_id, num_areas)
                elif payment_method == PaymentType.TOKEN:
                    await self._refund_tokens(user_id, num_areas)

            return (False, None, f"Generation creation failed: {str(e)}", None)

    async def process_generation(
        self,
        generation_id: UUID,
        area_id: UUID,
        user_id: UUID,
        input_image_bytes: bytes,
        address: str,
        area_type: str,
        style: str,
        custom_prompt: Optional[str],
        payment_method: str,
        preservation_strength: float = 0.5
    ) -> Tuple[bool, Optional[str]]:
        """
        Process complete generation workflow for a single area.

        This is the main orchestration method called asynchronously after
        the generation record is created.

        Args:
            generation_id: Generation UUID
            area_id: Area UUID (generation_areas record already created)
            user_id: User UUID
            input_image_bytes: Input property image bytes
            address: Property address
            area_type: Landscape area type
            style: Design style
            custom_prompt: Optional custom instructions
            payment_method: Payment method used ('subscription', 'trial', 'token')
            preservation_strength: Control transformation intensity (0.0-1.0, default 0.5)

        Returns:
            Tuple of (success, error_message)
        """
        try:
            # Update area status to 'processing'
            await self.db.execute("""
                UPDATE generation_areas
                SET status = 'processing',
                    progress = 0,
                    current_stage = 'generating_design',
                    updated_at = NOW()
                WHERE id = $1
            """, area_id)

            # Generate landscape design with Gemini
            start_time = datetime.utcnow()
            debug_service = get_debug_service()

            # Log: Starting Gemini API call
            debug_service.log(
                generation_id,
                'gemini_api_call',
                'info',
                f'Starting Gemini image generation for {area_type}'
            )

            try:
                # Generate landscape design with Gemini
                output_image_bytes = await self.gemini.generate_landscape_design(
                    input_image=input_image_bytes,
                    address=address,
                    area_type=area_type,
                    style=style,
                    custom_prompt=custom_prompt,
                    preservation_strength=preservation_strength
                )

                # Log: Gemini generation successful
                debug_service.log(
                    generation_id,
                    'image_generation_complete',
                    'success',
                    f'Successfully generated image for {area_type}'
                )

            except Exception as gemini_error:
                # Log: Gemini API failed
                debug_service.log(
                    generation_id,
                    'gemini_api_call',
                    'error',
                    f'Gemini API failed: {str(gemini_error)}'
                )

                # Gemini API failed - refund payment
                await self._handle_failure(
                    generation_id,
                    area_id,
                    user_id,
                    payment_method,
                    f"Gemini API error: {str(gemini_error)}"
                )
                return False, str(gemini_error)

            # Update progress
            await self.db.execute("""
                UPDATE generation_areas
                SET progress = 50
                WHERE id = $1
            """, area_id)

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
                    image_url = $2,
                    completed_at = NOW()
                WHERE id = $1
            """, area_id, output_url)

            await self.db.execute("""
                UPDATE generations
                SET status = 'completed',
                    completed_at = NOW()
                WHERE id = $1
            """, generation_id)

            # Log: Image displayed to user
            debug_service.log(
                generation_id,
                'image_displayed',
                'success',
                f'Generated landscape design image displayed to user'
            )

            # DEDUCT PAYMENT NOW THAT IMAGE IS SUCCESSFULLY SAVED
            # This ensures we only charge users for successful generations
            success, deduction_error = await self._deduct_payment(
                user_id,
                payment_method,
                1  # 1 area processed
            )

            if not success:
                print(f"Payment deduction failed for generation {generation_id}: {deduction_error}")
                # Continue anyway - generation succeeded even if payment deduction has issues
            else:
                print(f"Payment deducted for generation {generation_id}")

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

    async def _deduct_payment(
        self,
        user_id: UUID,
        payment_method: str,
        num_areas: int = 1
    ) -> Tuple[bool, Optional[str]]:
        """
        Deduct payment for successful generation.

        This is called AFTER the image is successfully generated and saved.
        This ensures we only charge users for successful generations.

        Requirements:
        - FR-034: No deduction for active subscriptions (unlimited)
        - FR-013: Atomic trial deduction
        - FR-026: Atomic token deduction with row-level locking

        Args:
            user_id: User UUID
            payment_method: Payment method ('subscription', 'trial', 'token')
            num_areas: Number of areas processed (default 1)

        Returns:
            Tuple of (success, error_message)
        """
        try:
            if payment_method == 'subscription':
                # No deduction needed - subscription provides unlimited
                return True, None

            elif payment_method == 'trial':
                # Deduct trial credit atomically
                success, remaining = await self.trial_service.deduct_trial(user_id)
                if not success:
                    return False, "Trial credit deduction failed"
                return True, None

            elif payment_method == 'token':
                # Deduct token(s) atomically
                result = await self.db.fetchrow("""
                    SELECT * FROM subtract_tokens($1, $2, 'generation', 'Landscape generation completed')
                """, user_id, num_areas)

                if not result or not result.get('success'):
                    return False, "Token deduction failed"

                return True, None

            else:
                return False, f"Unknown payment method: {payment_method}"

        except Exception as e:
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
        areas: List[Dict[str, Any]],
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
            areas: List of area dicts, each with 'area_type', 'style', 'custom_prompt', 'preservation_strength'
            style: Default design style (overridden by per-area style)
            custom_prompt: Default custom instructions (overridden by per-area custom_prompt)
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
            for area_data in areas:
                # Extract area-specific parameters
                area_type = area_data.get('area_type') or area_data.get('area')
                area_style = area_data.get('style', style)
                area_custom_prompt = area_data.get('custom_prompt', custom_prompt)
                area_preservation = area_data.get('preservation_strength', 0.5)

                task = self._process_single_area(
                    generation_id=generation_id,
                    user_id=user_id,
                    input_image_bytes=input_image_bytes,
                    address=address,
                    area_type=area_type,
                    style=area_style,
                    custom_prompt=area_custom_prompt,
                    preservation_strength=area_preservation
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
        custom_prompt: Optional[str],
        preservation_strength: float = 0.5
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
            preservation_strength: Control transformation intensity (0.0-1.0)

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
                custom_prompt=custom_prompt,
                preservation_strength=preservation_strength
            )
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
                    image_url = $2,
                    completed_at = NOW()
                WHERE id = $1
            """, area_id, output_url)

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
    trial_service: TrialService = None,
    token_service: TokenService = None,
    subscription_service: SubscriptionService = None
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

        if token_service is None:
            token_service = TokenService(db_pool)

        if subscription_service is None:
            subscription_service = SubscriptionService(db_pool)

        _generation_service_instance = GenerationService(
            db_pool=db_pool,
            gemini_client=gemini_client,
            storage_service=storage_service,
            trial_service=trial_service,
            token_service=token_service,
            subscription_service=subscription_service
        )

    return _generation_service_instance
