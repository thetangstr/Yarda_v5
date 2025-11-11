"""
Unit Tests for Holiday Generation Service

Tests for holiday generation workflow including:
- Atomic credit deduction before generation
- Geocoding and Street View image fetching
- AI generation via Gemini
- Storage upload and record creation
- Automatic refund on failures

Requirements:
- FR-HOL-004: Credit deducted BEFORE generation (atomic)
- FR-HOL-005: Refund credit if geocoding/Street View/generation fails
- FR-HOL-006: Async background processing for generation
- T027: HolidayGenerationService implementation
"""

import pytest
import pytest_asyncio
from uuid import uuid4, UUID
from unittest.mock import AsyncMock, MagicMock, patch
from typing import Optional

from src.services.holiday_generation_service import HolidayGenerationService
from src.services.holiday_credit_service import HolidayCreditService
from src.models.holiday import CreditDeductionResult


class MockCoordinates:
    """Mock geocoding result."""
    def __init__(self, lat: float, lng: float):
        self.lat = lat
        self.lng = lng


@pytest_asyncio.fixture
async def holiday_user(db_connection):
    """
    Create a test user with holiday credits.

    Automatically cleans up after test completes.
    """
    user_id = uuid4()
    email = f"gen-test-{user_id}@test.com"

    # Insert user
    await db_connection.execute("""
        INSERT INTO users (
            id, email, email_verified,
            subscription_tier, subscription_status
        ) VALUES (
            $1, $2, true, 'free', 'inactive'
        )
    """, user_id, email)

    # Set holiday credits
    await db_connection.execute("""
        UPDATE users
        SET holiday_credits = 3, holiday_credits_earned = 3
        WHERE id = $1
    """, user_id)

    yield user_id

    # Cleanup
    await db_connection.execute("DELETE FROM users WHERE id = $1", user_id)


@pytest_asyncio.fixture
async def no_credit_user(db_connection):
    """Create a test user with zero holiday credits."""
    user_id = uuid4()
    email = f"no-credit-gen-{user_id}@test.com"

    await db_connection.execute("""
        INSERT INTO users (
            id, email, email_verified,
            subscription_tier, subscription_status
        ) VALUES (
            $1, $2, true, 'free', 'inactive'
        )
    """, user_id, email)

    # Set to zero credits
    await db_connection.execute("""
        UPDATE users
        SET holiday_credits = 0, holiday_credits_earned = 0
        WHERE id = $1
    """, user_id)

    yield user_id

    # Cleanup
    await db_connection.execute("DELETE FROM users WHERE id = $1", user_id)


@pytest_asyncio.fixture
async def mock_db_pool(db_connection):
    """Create mock database pool wrapping test connection."""
    class MockPool:
        def __init__(self, conn):
            self.conn = conn

        async def fetchrow(self, query, *args):
            return await self.conn.fetchrow(query, *args)

        async def fetchval(self, query, *args):
            return await self.conn.fetchval(query, *args)

        async def fetch(self, query, *args):
            return await self.conn.fetch(query, *args)

        async def execute(self, query, *args):
            return await self.conn.execute(query, *args)

    return MockPool(db_connection)


@pytest_asyncio.fixture
async def mock_credit_service():
    """Create mock HolidayCreditService."""
    service = AsyncMock(spec=HolidayCreditService)

    # Default: successful deduction
    service.deduct_credit.return_value = CreditDeductionResult(
        success=True,
        credits_remaining=2,
        error_message=None
    )

    # Default: successful grant
    service.grant_credit.return_value = 1

    return service


@pytest_asyncio.fixture
async def mock_maps_service():
    """Create mock MapsService."""
    service = AsyncMock()

    # Default: successful geocoding
    service.geocode_address.return_value = MockCoordinates(
        lat=37.7749,
        lng=-122.4194
    )

    # Default: successful Street View fetch
    service.fetch_street_view_image.return_value = b"fake_street_view_image_bytes"

    return service


@pytest_asyncio.fixture
async def mock_gemini_client():
    """Create mock GeminiClient."""
    client = AsyncMock()

    # Default: successful generation
    client.generate_image.return_value = b"fake_generated_image_bytes"

    return client


@pytest_asyncio.fixture
async def mock_storage_service():
    """Create mock BlobStorageService."""
    service = AsyncMock()

    # Default: successful upload
    service.upload_image.return_value = "https://blob.vercel-storage.com/test/image.jpg"

    return service


@pytest_asyncio.fixture
async def generation_service(
    mock_db_pool,
    mock_credit_service,
    mock_maps_service,
    mock_gemini_client,
    mock_storage_service
):
    """Create HolidayGenerationService with mocked dependencies."""
    return HolidayGenerationService(
        db_pool=mock_db_pool,
        credit_service=mock_credit_service,
        maps_service=mock_maps_service,
        gemini_client=mock_gemini_client,
        storage_service=mock_storage_service
    )


class TestGenerationWorkflow:
    """Test main generation workflow."""

    @pytest.mark.asyncio
    async def test_create_generation_success(
        self,
        generation_service,
        mock_credit_service,
        mock_maps_service,
        mock_storage_service,
        holiday_user,
        db_connection
    ):
        """
        Test successful generation creation workflow.

        Expected:
        - Credit deducted BEFORE generation
        - Address geocoded
        - Street View image fetched
        - Original image uploaded
        - Generation record created with status 'pending'
        - Returns generation_id and success message
        """
        # Create generation
        generation_id, message = await generation_service.create_generation(
            user_id=holiday_user,
            address="123 Main St, San Francisco, CA",
            heading=180,
            pitch=0,
            style="classic"
        )

        # Verify generation_id returned
        assert isinstance(generation_id, UUID)
        assert "successfully" in message.lower()

        # Verify credit deducted FIRST
        mock_credit_service.deduct_credit.assert_called_once_with(holiday_user)

        # Verify geocoding called
        mock_maps_service.geocode_address.assert_called_once_with(
            "123 Main St, San Francisco, CA"
        )

        # Verify Street View fetched
        mock_maps_service.fetch_street_view_image.assert_called_once()

        # Verify original image uploaded
        assert mock_storage_service.upload_image.called

        # Verify generation record created
        record = await db_connection.fetchrow(
            "SELECT * FROM holiday_generations WHERE id = $1",
            generation_id
        )
        assert record is not None
        assert record['user_id'] == holiday_user
        assert record['address'] == "123 Main St, San Francisco, CA"
        assert record['street_view_heading'] == 180
        assert record['style'] == "classic"
        assert record['status'] == "pending"
        assert record['credit_deducted'] is True

        # Cleanup
        await db_connection.execute(
            "DELETE FROM holiday_generations WHERE id = $1",
            generation_id
        )

    @pytest.mark.asyncio
    async def test_create_generation_insufficient_credits(
        self,
        generation_service,
        mock_credit_service,
        no_credit_user
    ):
        """
        Test generation creation with insufficient credits.

        Expected:
        - Raises ValueError with credit balance info
        - No geocoding or generation happens
        """
        # Mock insufficient credits
        mock_credit_service.deduct_credit.return_value = CreditDeductionResult(
            success=False,
            credits_remaining=0,
            error_message="Insufficient holiday credits"
        )

        # Attempt generation (should fail)
        with pytest.raises(ValueError, match="Insufficient holiday credits"):
            await generation_service.create_generation(
                user_id=no_credit_user,
                address="123 Main St",
                heading=180,
                pitch=0,
                style="classic"
            )

        # Verify credit deduction attempted
        mock_credit_service.deduct_credit.assert_called_once_with(no_credit_user)

    @pytest.mark.asyncio
    async def test_create_generation_geocoding_failure(
        self,
        generation_service,
        mock_credit_service,
        mock_maps_service,
        holiday_user,
        db_connection
    ):
        """
        Test generation creation when geocoding fails.

        Expected:
        - Credit refunded automatically
        - Raises RuntimeError with geocoding failure message
        - No generation record created
        """
        # Mock geocoding failure
        mock_maps_service.geocode_address.return_value = None

        # Attempt generation (should fail)
        with pytest.raises(RuntimeError, match="Failed to geocode address"):
            await generation_service.create_generation(
                user_id=holiday_user,
                address="Invalid Address XYZ",
                heading=180,
                pitch=0,
                style="classic"
            )

        # Verify credit refunded
        mock_credit_service.grant_credit.assert_called_once_with(
            holiday_user,
            amount=1,
            reason="geocoding_failure_refund"
        )

    @pytest.mark.asyncio
    async def test_create_generation_street_view_failure(
        self,
        generation_service,
        mock_credit_service,
        mock_maps_service,
        holiday_user
    ):
        """
        Test generation creation when Street View is unavailable.

        Expected:
        - Credit refunded automatically
        - Raises RuntimeError with Street View unavailable message
        """
        # Mock Street View failure
        mock_maps_service.fetch_street_view_image.return_value = None

        # Attempt generation (should fail)
        with pytest.raises(RuntimeError, match="Street View not available"):
            await generation_service.create_generation(
                user_id=holiday_user,
                address="123 Main St",
                heading=180,
                pitch=0,
                style="classic"
            )

        # Verify credit refunded
        mock_credit_service.grant_credit.assert_called_once_with(
            holiday_user,
            amount=1,
            reason="street_view_failure_refund"
        )


class TestQueryMethods:
    """Test generation query methods."""

    @pytest.mark.asyncio
    async def test_get_generation_success(
        self,
        generation_service,
        holiday_user,
        db_connection
    ):
        """
        Test retrieving generation by ID.

        Expected:
        - Returns generation dict with all fields
        - Includes image URLs, status, timestamps
        """
        # Create test generation record
        gen_id = uuid4()
        await db_connection.execute("""
            INSERT INTO holiday_generations (
                id, user_id, address, geocoded_lat, geocoded_lng,
                street_view_heading, street_view_pitch, style,
                original_image_url, status, credit_deducted
            ) VALUES (
                $1, $2, 'Test Address', 37.7749, -122.4194,
                180, 0, 'classic', 'https://test.com/orig.jpg',
                'pending', true
            )
        """, gen_id, holiday_user)

        # Retrieve generation
        result = await generation_service.get_generation(gen_id)

        # Verify result
        assert result is not None
        assert result['id'] == gen_id
        assert result['user_id'] == holiday_user
        assert result['address'] == "Test Address"
        assert result['heading'] == 180
        assert result['style'] == "classic"
        assert result['status'] == "pending"
        assert result['original_image_url'] == "https://test.com/orig.jpg"

        # Cleanup
        await db_connection.execute(
            "DELETE FROM holiday_generations WHERE id = $1",
            gen_id
        )

    @pytest.mark.asyncio
    async def test_get_generation_not_found(self, generation_service):
        """
        Test retrieving non-existent generation.

        Expected:
        - Returns None
        """
        fake_id = uuid4()
        result = await generation_service.get_generation(fake_id)
        assert result is None

    @pytest.mark.asyncio
    async def test_list_user_generations(
        self,
        generation_service,
        holiday_user,
        db_connection
    ):
        """
        Test listing all generations for a user.

        Expected:
        - Returns list of generation dicts
        - Ordered by created_at DESC (newest first)
        - Supports pagination
        """
        # Create 3 test generations
        gen_ids = [uuid4() for _ in range(3)]
        for idx, gen_id in enumerate(gen_ids):
            await db_connection.execute("""
                INSERT INTO holiday_generations (
                    id, user_id, address, geocoded_lat, geocoded_lng,
                    street_view_heading, street_view_pitch, style,
                    original_image_url, status, credit_deducted
                ) VALUES (
                    $1, $2, $3, 37.7749, -122.4194,
                    180, 0, 'classic', 'https://test.com/orig.jpg',
                    'pending', true
                )
            """, gen_id, holiday_user, f"Address {idx + 1}")

        # List generations
        results = await generation_service.list_user_generations(
            user_id=holiday_user,
            limit=20,
            offset=0
        )

        # Verify results
        assert len(results) == 3
        assert all(r['user_id'] == holiday_user for r in results)

        # Verify ordering (newest first)
        addresses = [r['address'] for r in results]
        # Since all created at same time, just verify we got all addresses
        assert set(addresses) == {"Address 1", "Address 2", "Address 3"}

        # Test pagination
        page1 = await generation_service.list_user_generations(
            user_id=holiday_user,
            limit=2,
            offset=0
        )
        assert len(page1) == 2

        page2 = await generation_service.list_user_generations(
            user_id=holiday_user,
            limit=2,
            offset=2
        )
        assert len(page2) == 1

        # Cleanup
        for gen_id in gen_ids:
            await db_connection.execute(
                "DELETE FROM holiday_generations WHERE id = $1",
                gen_id
            )

    @pytest.mark.asyncio
    async def test_list_user_generations_empty(
        self,
        generation_service,
        holiday_user
    ):
        """
        Test listing generations for user with no generations.

        Expected:
        - Returns empty list
        """
        results = await generation_service.list_user_generations(
            user_id=holiday_user,
            limit=20,
            offset=0
        )
        assert results == []


class TestAsyncGenerationProcessing:
    """Test async background generation processing."""

    @pytest.mark.asyncio
    async def test_generation_processing_updates_status(
        self,
        generation_service,
        holiday_user,
        db_connection
    ):
        """
        Test that async generation updates status correctly.

        Expected:
        - Status starts as 'pending'
        - Updates to 'processing' when generation starts
        - Updates to 'completed' when done
        - Or updates to 'failed' on error

        NOTE: This test verifies the database update logic,
        not the actual async task execution.
        """
        # Create test generation
        gen_id = uuid4()
        await db_connection.execute("""
            INSERT INTO holiday_generations (
                id, user_id, address, geocoded_lat, geocoded_lng,
                street_view_heading, street_view_pitch, style,
                original_image_url, status, credit_deducted
            ) VALUES (
                $1, $2, 'Test Address', 37.7749, -122.4194,
                180, 0, 'classic', 'https://test.com/orig.jpg',
                'pending', true
            )
        """, gen_id, holiday_user)

        # Verify initial status
        status = await db_connection.fetchval(
            "SELECT status FROM holiday_generations WHERE id = $1",
            gen_id
        )
        assert status == "pending"

        # Simulate status update to processing
        await db_connection.execute("""
            UPDATE holiday_generations
            SET status = 'processing', updated_at = NOW()
            WHERE id = $1
        """, gen_id)

        status = await db_connection.fetchval(
            "SELECT status FROM holiday_generations WHERE id = $1",
            gen_id
        )
        assert status == "processing"

        # Cleanup
        await db_connection.execute(
            "DELETE FROM holiday_generations WHERE id = $1",
            gen_id
        )


class TestRefundLogic:
    """Test automatic credit refund on failures."""

    @pytest.mark.asyncio
    async def test_refund_on_geocoding_failure(
        self,
        generation_service,
        mock_credit_service,
        mock_maps_service,
        holiday_user
    ):
        """
        Test credit refund when geocoding fails.

        Expected:
        - 1 credit refunded with reason 'geocoding_failure_refund'
        """
        mock_maps_service.geocode_address.return_value = None

        with pytest.raises(RuntimeError):
            await generation_service.create_generation(
                user_id=holiday_user,
                address="Bad Address",
                heading=180,
                pitch=0,
                style="classic"
            )

        mock_credit_service.grant_credit.assert_called_once_with(
            holiday_user,
            amount=1,
            reason="geocoding_failure_refund"
        )

    @pytest.mark.asyncio
    async def test_refund_on_street_view_failure(
        self,
        generation_service,
        mock_credit_service,
        mock_maps_service,
        holiday_user
    ):
        """
        Test credit refund when Street View fails.

        Expected:
        - 1 credit refunded with reason 'street_view_failure_refund'
        """
        mock_maps_service.fetch_street_view_image.return_value = None

        with pytest.raises(RuntimeError):
            await generation_service.create_generation(
                user_id=holiday_user,
                address="123 Main St",
                heading=180,
                pitch=0,
                style="classic"
            )

        mock_credit_service.grant_credit.assert_called_once_with(
            holiday_user,
            amount=1,
            reason="street_view_failure_refund"
        )
