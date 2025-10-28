import asyncio
from datetime import datetime
from typing import Optional
from uuid import UUID
from supabase import Client
import logging
from ..models.generation import (
    Generation,
    GenerationCreate,
    GenerationStatus,
    CreditType,
    GenerationListResponse
)
from .credit_service import CreditService
from ..exceptions import (
    InsufficientCreditsError,
    ResourceNotFoundError,
    DatabaseError,
    ValidationError
)

logger = logging.getLogger(__name__)


class GenerationService:
    """Service for design generation operations"""

    def __init__(self, supabase_client: Client):
        """
        Initialize GenerationService

        Args:
            supabase_client: Supabase client with service role permissions
        """
        self.supabase = supabase_client
        self.credit_service = CreditService(supabase_client)

    async def create_generation(
        self,
        user_id: UUID,
        generation_data: GenerationCreate
    ) -> Generation:
        """
        Create a new design generation and consume credit

        This method:
        1. Consumes a credit atomically
        2. Creates a generation record with the credit type used
        3. Returns the generation object
        4. Refunds credit if generation creation fails

        Args:
            user_id: User UUID
            generation_data: Generation creation data

        Returns:
            Generation: Created generation object

        Raises:
            InsufficientCreditsError: If no credits available
            ValidationError: If generation data is invalid
            DatabaseError: If creation fails
        """
        credit_type = None

        try:
            # Step 1: Consume credit atomically first
            credit_type = await self.credit_service.consume_credit(user_id)
            logger.info(f"Credit consumed for user {user_id}: {credit_type.value}")

        except InsufficientCreditsError:
            # Re-raise insufficient credits error
            logger.warning(f"User {user_id} has insufficient credits")
            raise

        try:
            # Step 2: Create generation record
            generation_dict = generation_data.model_dump()
            generation_dict['user_id'] = str(user_id)
            generation_dict['status'] = GenerationStatus.PENDING.value
            generation_dict['credit_type'] = credit_type.value
            generation_dict['credit_refunded'] = False

            result = self.supabase.table('generations').insert(
                generation_dict
            ).execute()

            if not result.data or len(result.data) == 0:
                logger.error(f"Failed to create generation record for user {user_id}")
                # Refund credit on failure
                await self.credit_service.refund_credit(None, user_id, credit_type)
                raise DatabaseError("Failed to create generation record")

            generation = Generation(**result.data[0])
            logger.info(f"Generation created: {generation.id}")

            # Step 3: Trigger async processing (in background)
            asyncio.create_task(self._process_generation(generation.id))

            return generation

        except (InsufficientCreditsError, ResourceNotFoundError, ValidationError):
            # Re-raise custom exceptions as-is
            raise
        except DatabaseError as e:
            # Database error after credit consumed - try to refund
            if credit_type:
                await self.credit_service.refund_credit(None, user_id, credit_type)
            raise
        except Exception as e:
            # Unexpected error - refund credit and wrap in DatabaseError
            error_msg = str(e)
            logger.error(f"Unexpected error creating generation: {error_msg}")

            if credit_type:
                await self.credit_service.refund_credit(None, user_id, credit_type)

            raise DatabaseError(f"Failed to create generation: {error_msg}")

    async def get_generation(self, generation_id: UUID, user_id: UUID) -> Generation:
        """
        Get a single generation by ID

        Args:
            generation_id: Generation UUID
            user_id: User UUID (for authorization check)

        Returns:
            Generation: Generation object

        Raises:
            ResourceNotFoundError: If generation not found or not owned by user
            DatabaseError: If query fails
        """
        try:
            result = self.supabase.table('generations').select('*').eq(
                'id', str(generation_id)
            ).eq(
                'user_id', str(user_id)
            ).maybe_single().execute()

            if not result.data:
                logger.warning(f"Generation {generation_id} not found for user {user_id}")
                raise ResourceNotFoundError("Generation")

            return Generation(**result.data)

        except ResourceNotFoundError:
            # Re-raise custom exceptions as-is
            raise
        except Exception as e:
            error_msg = str(e)
            logger.error(f"Failed to get generation {generation_id}: {error_msg}")
            raise DatabaseError(f"Failed to retrieve generation: {error_msg}")

    async def list_user_generations(
        self,
        user_id: UUID,
        limit: int = 20,
        offset: int = 0,
        status_filter: Optional[GenerationStatus] = None
    ) -> GenerationListResponse:
        """
        List user's generations with pagination and optional status filtering

        Args:
            user_id: User UUID
            limit: Maximum number of results (default 20)
            offset: Number of results to skip (default 0)
            status_filter: Optional status filter

        Returns:
            GenerationListResponse: List of generations with metadata

        Raises:
            ValidationError: If pagination parameters are invalid
            DatabaseError: If query fails
        """
        try:
            # Validate pagination parameters
            if limit < 1 or limit > 100:
                raise ValidationError("Limit must be between 1 and 100")
            if offset < 0:
                raise ValidationError("Offset must be non-negative")

            # Build query
            query = self.supabase.table('generations').select(
                '*', count='exact'
            ).eq(
                'user_id', str(user_id)
            )

            # Add status filter if provided
            if status_filter:
                query = query.eq('status', status_filter.value)

            # Execute query with pagination
            result = query.order(
                'created_at', desc=True
            ).range(offset, offset + limit - 1).execute()

            generations = [Generation(**item) for item in result.data]
            total = result.count or 0

            logger.info(f"Listed {len(generations)} generations for user {user_id}")

            return GenerationListResponse(
                items=generations,
                total=total,
                limit=limit,
                offset=offset
            )

        except ValidationError:
            # Re-raise validation errors
            raise
        except Exception as e:
            error_msg = str(e)
            logger.error(f"Failed to list generations for user {user_id}: {error_msg}")
            raise DatabaseError(f"Failed to list generations: {error_msg}")

    async def update_generation_status(
        self,
        generation_id: UUID,
        status: GenerationStatus,
        output_url: Optional[str] = None,
        error_message: Optional[str] = None,
        processing_time_ms: Optional[int] = None
    ) -> Generation:
        """
        Update generation status and related fields

        Args:
            generation_id: Generation UUID
            status: New status
            output_url: Output image URL (for completed status)
            error_message: Error message (for failed status)
            processing_time_ms: Processing time in milliseconds

        Returns:
            Generation: Updated generation object

        Raises:
            ResourceNotFoundError: If generation not found
            DatabaseError: If update fails
        """
        try:
            update_data = {'status': status.value}

            if status == GenerationStatus.PROCESSING:
                update_data['started_at'] = datetime.utcnow().isoformat()

            if status in [GenerationStatus.COMPLETED, GenerationStatus.FAILED]:
                update_data['completed_at'] = datetime.utcnow().isoformat()

            if output_url:
                update_data['output_image_url'] = output_url

            if error_message:
                update_data['error_message'] = error_message

            if processing_time_ms is not None:
                update_data['processing_time_ms'] = processing_time_ms

            result = self.supabase.table('generations').update(
                update_data
            ).eq('id', str(generation_id)).execute()

            if not result.data or len(result.data) == 0:
                logger.error(f"Generation {generation_id} not found for status update")
                raise ResourceNotFoundError("Generation")

            logger.info(f"Generation {generation_id} status updated to {status.value}")
            return Generation(**result.data[0])

        except ResourceNotFoundError:
            # Re-raise custom exceptions as-is
            raise
        except Exception as e:
            error_msg = str(e)
            logger.error(f"Failed to update generation {generation_id} status: {error_msg}")
            raise DatabaseError(f"Failed to update generation status: {error_msg}")

    async def handle_generation_failure(
        self,
        generation_id: UUID,
        error_message: str
    ) -> Generation:
        """
        Handle generation failure by updating status and refunding credit

        Args:
            generation_id: Generation UUID
            error_message: Error message describing the failure

        Returns:
            Generation: Updated generation object

        Raises:
            DatabaseError: If handling failure fails
        """
        try:
            # Update status to failed
            generation = await self.update_generation_status(
                generation_id=generation_id,
                status=GenerationStatus.FAILED,
                error_message=error_message
            )

            # Refund credit (idempotent)
            await self.credit_service.refund_credit(generation_id)
            logger.info(f"Generation {generation_id} marked as failed and credit refunded")

            return generation

        except Exception as e:
            error_msg = str(e)
            logger.error(f"Failed to handle generation failure for {generation_id}: {error_msg}")
            raise DatabaseError(f"Failed to handle generation failure: {error_msg}")

    async def _process_generation(self, generation_id: UUID) -> None:
        """
        Internal method to process generation asynchronously

        This is a placeholder implementation that simulates AI generation.
        In production, this would call actual AI services.

        Args:
            generation_id: Generation UUID
        """
        try:
            # Update status to processing
            await self.update_generation_status(
                generation_id=generation_id,
                status=GenerationStatus.PROCESSING
            )

            # Simulate AI processing delay
            start_time = datetime.utcnow()
            await asyncio.sleep(1)  # Simulate 1 second processing time
            end_time = datetime.utcnow()

            processing_time_ms = int((end_time - start_time).total_seconds() * 1000)

            # Mock successful generation
            # TODO: Replace with actual AI generation service call
            placeholder_image_url = "https://placehold.co/800x600/png?text=Yarda+Generated+Design"

            # Update status to completed
            await self.update_generation_status(
                generation_id=generation_id,
                status=GenerationStatus.COMPLETED,
                output_url=placeholder_image_url,
                processing_time_ms=processing_time_ms
            )

            logger.info(f"Generation {generation_id} completed successfully")

        except Exception as e:
            # Handle failure and refund credit
            error_msg = str(e)
            logger.error(f"Generation {generation_id} processing failed: {error_msg}")

            await self.handle_generation_failure(
                generation_id=generation_id,
                error_message=f"Processing failed: {error_msg}"
            )
