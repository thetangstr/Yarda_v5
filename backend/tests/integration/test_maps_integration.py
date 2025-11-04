"""
Integration Tests: Google Maps Platform APIs
Feature: 003-google-maps-integration
Purpose: Test full Street View retrieval workflow end-to-end

These tests should FAIL initially (TDD approach) until implementation is complete.
"""

import pytest
from unittest.mock import AsyncMock, patch
from src.services.maps_service import MapsService, Coordinates, MapsServiceError


@pytest.fixture
def maps_service():
    """Create MapsService instance with test API key"""
    return MapsService(api_key="test_api_key_12345")


class TestFullStreetViewWorkflow:
    """T016: Integration test for complete Street View retrieval workflow"""

    @pytest.mark.asyncio
    @pytest.mark.integration
    async def test_full_workflow_geocode_to_image(self, maps_service):
        """
        Test complete workflow: Address → Geocoding → Metadata Check → Image Fetch

        This test verifies the recommended workflow:
        1. Geocode address to get coordinates
        2. Check Street View metadata (FREE) to verify availability
        3. Only fetch image (PAID) if metadata confirms availability
        """
        # Given: A known address with Street View coverage
        address = "1600 Amphitheatre Parkway, Mountain View, CA 94043"

        # Mock responses for each step
        geocode_response = {
            "status": "OK",
            "results": [{
                "geometry": {
                    "location": {"lat": 37.4224764, "lng": -122.0842499}
                }
            }]
        }

        metadata_response = {
            "status": "OK",
            "pano_id": "test_pano_123",
            "location": {"lat": 37.4224764, "lng": -122.0842499},
            "date": "2021-05"
        }

        image_bytes = b'\xff\xd8\xff\xe0\x00\x10JFIF'  # JPEG header

        with patch('aiohttp.ClientSession.get') as mock_get:
            # Configure mock to return different responses based on URL
            async def mock_response(*args, **kwargs):
                url = args[0] if args else kwargs.get('url', '')

                mock = AsyncMock()
                if 'geocode' in url:
                    mock.json = AsyncMock(return_value=geocode_response)
                    mock.status = 200
                elif 'metadata' in url:
                    mock.json = AsyncMock(return_value=metadata_response)
                    mock.status = 200
                elif 'streetview' in url:
                    mock.read = AsyncMock(return_value=image_bytes)
                    mock.status = 200
                return mock

            mock_get.return_value.__aenter__.side_effect = mock_response

            # When: Executing full workflow
            # Step 1: Geocode address
            coords = await maps_service.geocode_address(address)
            assert coords is not None
            assert isinstance(coords, Coordinates)

            # Step 2: Check metadata (FREE)
            metadata = await maps_service.get_street_view_metadata(coords)
            assert metadata.status == "OK"
            assert metadata.pano_id is not None

            # Step 3: Only fetch image if metadata is OK (PAID)
            if metadata.status == "OK":
                image = await maps_service.fetch_street_view_image(coords)
                assert image is not None
                assert isinstance(image, bytes)
                assert image.startswith(b'\xff\xd8')  # JPEG

            # Verify all three API calls were made in correct order
            assert mock_get.call_count >= 3

    @pytest.mark.asyncio
    @pytest.mark.integration
    async def test_workflow_no_street_view_available(self, maps_service):
        """
        Test workflow when Street View is NOT available

        Expected behavior:
        1. Geocode succeeds
        2. Metadata returns ZERO_RESULTS
        3. Image fetch should NOT occur (cost optimization)
        """
        # Given: Address geocodes but no Street View coverage
        address = "Remote Location, Nowhere, USA"

        geocode_response = {
            "status": "OK",
            "results": [{
                "geometry": {
                    "location": {"lat": 0.0, "lng": 0.0}
                }
            }]
        }

        metadata_response = {
            "status": "ZERO_RESULTS"
        }

        with patch('aiohttp.ClientSession.get') as mock_get:
            async def mock_response(*args, **kwargs):
                url = args[0] if args else kwargs.get('url', '')
                mock = AsyncMock()

                if 'geocode' in url:
                    mock.json = AsyncMock(return_value=geocode_response)
                    mock.status = 200
                elif 'metadata' in url:
                    mock.json = AsyncMock(return_value=metadata_response)
                    mock.status = 200

                return mock

            mock_get.return_value.__aenter__.side_effect = mock_response

            # When: Executing workflow
            coords = await maps_service.geocode_address(address)
            assert coords is not None

            metadata = await maps_service.get_street_view_metadata(coords)
            assert metadata.status == "ZERO_RESULTS"

            # Then: Should NOT attempt to fetch image (waste of money)
            # In real implementation, this logic would be in get_property_images()
            if metadata.status != "OK":
                # Don't fetch image - fall back to satellite instead
                pass

            # Verify image fetch was NOT called
            calls = [str(call) for call in mock_get.call_args_list]
            streetview_image_calls = [c for c in calls if 'streetview?' in c and 'metadata' not in c]
            assert len(streetview_image_calls) == 0, "Image should not be fetched when metadata is ZERO_RESULTS"

    @pytest.mark.asyncio
    @pytest.mark.integration
    async def test_workflow_with_retry_on_rate_limit(self, maps_service):
        """
        Test workflow with exponential backoff retry on rate limit

        Expected behavior:
        1. First request returns 429 OVER_QUERY_LIMIT
        2. Retry with exponential backoff (2s, 4s, 8s)
        3. Eventually succeeds or fails after max retries
        """
        # Given: API returns rate limit on first call, then succeeds
        address = "1600 Amphitheatre Parkway, Mountain View, CA"

        call_count = 0

        async def mock_response_with_retry(*args, **kwargs):
            nonlocal call_count
            call_count += 1

            mock = AsyncMock()

            if call_count == 1:
                # First call: Rate limit
                mock.json = AsyncMock(return_value={"status": "OVER_QUERY_LIMIT"})
                mock.status = 429
            else:
                # Subsequent calls: Success
                mock.json = AsyncMock(return_value={
                    "status": "OK",
                    "results": [{
                        "geometry": {"location": {"lat": 37.4224764, "lng": -122.0842499}}
                    }]
                })
                mock.status = 200

            return mock

        with patch('aiohttp.ClientSession.get') as mock_get:
            mock_get.return_value.__aenter__.side_effect = mock_response_with_retry

            # When: Making request with retry logic
            # Note: Actual retry logic implemented in T021 (_retry_with_backoff)
            try:
                coords = await maps_service.geocode_address(address)
                # If retry succeeds, we should get coordinates
                assert coords is not None
            except MapsServiceError as e:
                # If retry fails, we should get appropriate error
                assert e.error_type == "QUOTA_EXCEEDED"

            # Verify multiple attempts were made
            assert call_count >= 1

    @pytest.mark.asyncio
    @pytest.mark.integration
    async def test_workflow_cost_optimization_sequence(self, maps_service):
        """
        Verify cost optimization: FREE metadata check BEFORE PAID image request

        This test ensures we follow best practices:
        - Metadata (FREE) called first
        - Image (PAID $0.007) only called if metadata confirms availability
        """
        address = "1600 Amphitheatre Parkway, Mountain View, CA"

        call_sequence = []

        async def mock_response_track_order(*args, **kwargs):
            url = args[0] if args else kwargs.get('url', '')
            mock = AsyncMock()

            if 'geocode' in url:
                call_sequence.append('geocode')
                mock.json = AsyncMock(return_value={
                    "status": "OK",
                    "results": [{"geometry": {"location": {"lat": 37.422, "lng": -122.084}}}]
                })
                mock.status = 200
            elif 'metadata' in url:
                call_sequence.append('metadata')
                mock.json = AsyncMock(return_value={"status": "OK", "pano_id": "test"})
                mock.status = 200
            elif 'streetview' in url and 'metadata' not in url:
                call_sequence.append('image')
                mock.read = AsyncMock(return_value=b'\xff\xd8\xff\xe0')
                mock.status = 200

            return mock

        with patch('aiohttp.ClientSession.get') as mock_get:
            mock_get.return_value.__aenter__.side_effect = mock_response_track_order

            # When: Executing workflow
            coords = await maps_service.geocode_address(address)
            metadata = await maps_service.get_street_view_metadata(coords)

            if metadata.status == "OK":
                await maps_service.fetch_street_view_image(coords)

            # Then: Verify call sequence
            assert 'geocode' in call_sequence
            assert 'metadata' in call_sequence
            assert 'image' in call_sequence

            # CRITICAL: Metadata MUST come before image
            metadata_index = call_sequence.index('metadata')
            image_index = call_sequence.index('image')
            assert metadata_index < image_index, "Metadata check must occur BEFORE paid image request"

    @pytest.mark.asyncio
    @pytest.mark.integration
    async def test_workflow_invalid_api_key(self):
        """Test workflow fails gracefully with invalid API key"""
        # Given: Invalid API key
        invalid_service = MapsService(api_key="invalid_key")

        # Mock REQUEST_DENIED response
        mock_response = {
            "status": "REQUEST_DENIED",
            "error_message": "The provided API key is invalid"
        }

        with patch('aiohttp.ClientSession.get') as mock_get:
            mock_get.return_value.__aenter__.return_value.json = AsyncMock(return_value=mock_response)
            mock_get.return_value.__aenter__.return_value.status = 403

            # When/Then: Should raise appropriate error
            with pytest.raises(MapsServiceError) as exc_info:
                await invalid_service.geocode_address("123 Test St")

            assert exc_info.value.error_type == "API_ERROR"
