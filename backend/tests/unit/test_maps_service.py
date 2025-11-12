"""
Unit Tests: MapsService
Feature: 003-google-maps-integration
Purpose: Test Google Maps Platform API integration methods

These tests should FAIL initially (TDD approach) until implementation is complete.
"""

import pytest
from unittest.mock import AsyncMock, MagicMock, patch
from src.services.maps_service import (
    MapsService,
    Coordinates,
    StreetViewMetadata,
    MapsServiceError
)

@pytest.fixture
def maps_service():
    """Create MapsService instance with mock API key"""
    return MapsService(api_key="test_api_key_12345")

@pytest.fixture
def mock_coordinates():
    """Sample coordinates for testing"""
    return Coordinates(lat=37.4224764, lng=-122.0842499)

class TestGeocodeAddress:
    """T014: Unit tests for MapsService.geocode_address()"""

    @pytest.mark.asyncio
    async def test_geocode_valid_address_returns_geocode_result(self, maps_service):
        """Test that valid address returns GeocodeResult with ROOFTOP accuracy"""
        # Given: A valid residential address
        address = "1600 Amphitheatre Parkway, Mountain View, CA 94043"

        # Mock aiohttp response with ROOFTOP accuracy
        mock_response = {
            "status": "OK",
            "results": [{
                "geometry": {
                    "location": {
                        "lat": 37.4224764,
                        "lng": -122.0842499
                    },
                    "location_type": "ROOFTOP"
                },
                "formatted_address": "1600 Amphitheatre Pkwy, Mountain View, CA 94043, USA",
                "address_components": [
                    {"types": ["street_number"], "long_name": "1600"},
                    {"types": ["route"], "long_name": "Amphitheatre Parkway"},
                    {"types": ["locality"], "long_name": "Mountain View"}
                ],
                "place_id": "ChIJ2eUgeAK6j4ARbn5u_wAGqWA"
            }]
        }

        with patch('aiohttp.ClientSession.get') as mock_get:
            mock_get.return_value.__aenter__.return_value.json = AsyncMock(return_value=mock_response)
            mock_get.return_value.__aenter__.return_value.status = 200

            # When: Geocoding the address
            result = await maps_service.geocode_address(address)

            # Then: Should return GeocodeResult with accuracy metadata
            assert result is not None
            from src.services.maps_service import GeocodeResult
            assert isinstance(result, GeocodeResult)
            assert result.coordinates.lat == 37.4224764
            assert result.coordinates.lng == -122.0842499
            assert result.location_type == "ROOFTOP"
            assert result.has_street_number is True
            assert "1600" in result.formatted_address

    @pytest.mark.asyncio
    async def test_geocode_invalid_address_returns_none(self, maps_service):
        """Test that invalid address returns None"""
        # Given: An invalid/non-existent address
        address = "Invalid Address 99999 Nowhere Street"

        # Mock ZERO_RESULTS response
        mock_response = {
            "status": "ZERO_RESULTS",
            "results": []
        }

        with patch('aiohttp.ClientSession.get') as mock_get:
            mock_get.return_value.__aenter__.return_value.json = AsyncMock(return_value=mock_response)
            mock_get.return_value.__aenter__.return_value.status = 200

            # When: Geocoding invalid address
            result = await maps_service.geocode_address(address)

            # Then: Should return None
            assert result is None

    @pytest.mark.asyncio
    async def test_geocode_quota_exceeded_raises_error(self, maps_service):
        """Test that OVER_QUERY_LIMIT raises MapsServiceError"""
        # Given: A valid address but API quota exceeded
        address = "1600 Amphitheatre Parkway, Mountain View, CA"

        # Mock quota exceeded response
        mock_response = {
            "status": "OVER_QUERY_LIMIT",
            "error_message": "You have exceeded your daily request quota"
        }

        with patch('aiohttp.ClientSession.get') as mock_get:
            mock_get.return_value.__aenter__.return_value.json = AsyncMock(return_value=mock_response)
            mock_get.return_value.__aenter__.return_value.status = 429

            # When/Then: Should raise MapsServiceError
            with pytest.raises(MapsServiceError) as exc_info:
                await maps_service.geocode_address(address)

            assert exc_info.value.error_type == "QUOTA_EXCEEDED"

    @pytest.mark.asyncio
    async def test_geocode_network_error_raises_exception(self, maps_service):
        """Test that network errors are handled"""
        # Given: Network connection fails
        address = "1600 Amphitheatre Parkway, Mountain View, CA"

        with patch('aiohttp.ClientSession.get') as mock_get:
            mock_get.side_effect = Exception("Network error")

            # When/Then: Should raise MapsServiceError
            with pytest.raises(MapsServiceError) as exc_info:
                await maps_service.geocode_address(address)

            assert exc_info.value.error_type == "NETWORK_ERROR"

class TestStreetViewMetadata:
    """T015: Unit tests for MapsService.get_street_view_metadata()"""

    @pytest.mark.asyncio
    async def test_metadata_returns_ok_for_available_location(self, maps_service, mock_coordinates):
        """Test that available location returns OK status"""
        # Given: Coordinates with Street View coverage
        coords = mock_coordinates

        # Mock Street View metadata response
        mock_response = {
            "status": "OK",
            "pano_id": "tu510ie_z4ptBZYo2BGEJg",
            "location": {
                "lat": 37.4224764,
                "lng": -122.0842499
            },
            "date": "2021-05"
        }

        with patch('aiohttp.ClientSession.get') as mock_get:
            mock_get.return_value.__aenter__.return_value.json = AsyncMock(return_value=mock_response)
            mock_get.return_value.__aenter__.return_value.status = 200

            # When: Checking metadata
            result = await maps_service.get_street_view_metadata(coords)

            # Then: Should return OK status
            assert isinstance(result, StreetViewMetadata)
            assert result.status == "OK"
            assert result.pano_id == "tu510ie_z4ptBZYo2BGEJg"
            assert result.date == "2021-05"

    @pytest.mark.asyncio
    async def test_metadata_returns_zero_results_for_unavailable_location(self, maps_service):
        """Test that unavailable location returns ZERO_RESULTS"""
        # Given: Coordinates with no Street View coverage
        coords = Coordinates(lat=0.0, lng=0.0)  # Middle of ocean

        # Mock ZERO_RESULTS response
        mock_response = {
            "status": "ZERO_RESULTS"
        }

        with patch('aiohttp.ClientSession.get') as mock_get:
            mock_get.return_value.__aenter__.return_value.json = AsyncMock(return_value=mock_response)
            mock_get.return_value.__aenter__.return_value.status = 200

            # When: Checking metadata
            result = await maps_service.get_street_view_metadata(coords)

            # Then: Should return ZERO_RESULTS status
            assert result.status == "ZERO_RESULTS"
            assert result.pano_id is None

    @pytest.mark.asyncio
    async def test_metadata_free_request_no_charge(self, maps_service, mock_coordinates):
        """Test that metadata request is free (cost optimization)"""
        # This is a documentation test - metadata endpoint should be called
        # before paid image requests to avoid wasting money

        # Given: Any coordinates
        coords = mock_coordinates

        # Mock metadata response
        mock_response = {"status": "OK", "pano_id": "test123"}

        with patch('aiohttp.ClientSession.get') as mock_get:
            mock_get.return_value.__aenter__.return_value.json = AsyncMock(return_value=mock_response)
            mock_get.return_value.__aenter__.return_value.status = 200

            # When: Checking metadata
            await maps_service.get_street_view_metadata(coords)

            # Then: Verify correct endpoint called (metadata, not image)
            called_url = mock_get.call_args[0][0]
            assert 'streetview/metadata' in called_url
            assert 'streetview?' not in called_url  # NOT the paid image endpoint

    @pytest.mark.asyncio
    async def test_metadata_with_custom_radius(self, maps_service, mock_coordinates):
        """Test metadata check with custom search radius"""
        # Given: Coordinates and custom radius
        coords = mock_coordinates
        radius = 100  # meters

        mock_response = {"status": "OK", "pano_id": "test123"}

        with patch('aiohttp.ClientSession.get') as mock_get:
            mock_get.return_value.__aenter__.return_value.json = AsyncMock(return_value=mock_response)
            mock_get.return_value.__aenter__.return_value.status = 200

            # When: Checking metadata with radius
            await maps_service.get_street_view_metadata(coords, radius=radius)

            # Then: Verify radius parameter passed
            called_url = mock_get.call_args[0][0]
            assert f'radius={radius}' in called_url or 'radius' in str(mock_get.call_args)

class TestFetchStreetViewImage:
    """T016 (partial): Unit tests for MapsService.fetch_street_view_image()"""

    @pytest.mark.asyncio
    async def test_fetch_image_returns_bytes(self, maps_service, mock_coordinates):
        """Test that fetch returns image bytes"""
        # Given: Coordinates with available Street View
        coords = mock_coordinates

        # Mock image response (JPEG bytes)
        mock_image_bytes = b'\xff\xd8\xff\xe0\x00\x10JFIF'  # JPEG header

        with patch('aiohttp.ClientSession.get') as mock_get:
            mock_get.return_value.__aenter__.return_value.read = AsyncMock(return_value=mock_image_bytes)
            mock_get.return_value.__aenter__.return_value.status = 200

            # When: Fetching image
            result = await maps_service.fetch_street_view_image(coords)

            # Then: Should return bytes
            assert result is not None
            assert isinstance(result, bytes)
            assert result.startswith(b'\xff\xd8')  # JPEG signature

    @pytest.mark.asyncio
    async def test_fetch_image_with_parameters(self, maps_service, mock_coordinates):
        """Test fetch with custom heading, pitch, fov"""
        # Given: Coordinates and custom view parameters
        coords = mock_coordinates
        size = "600x400"
        fov = 90
        heading = 180  # South
        pitch = -10  # Looking slightly down

        mock_image_bytes = b'\xff\xd8\xff\xe0\x00\x10JFIF'

        with patch('aiohttp.ClientSession.get') as mock_get:
            mock_get.return_value.__aenter__.return_value.read = AsyncMock(return_value=mock_image_bytes)
            mock_get.return_value.__aenter__.return_value.status = 200

            # When: Fetching with parameters
            await maps_service.fetch_street_view_image(
                coords,
                size=size,
                fov=fov,
                heading=heading,
                pitch=pitch
            )

            # Then: Verify parameters in URL
            called_url = mock_get.call_args[0][0]
            assert f'size={size}' in called_url or 'size' in str(mock_get.call_args)
            assert f'heading={heading}' in called_url or 'heading' in str(mock_get.call_args)
            assert f'pitch={pitch}' in called_url or 'pitch' in str(mock_get.call_args)

    @pytest.mark.asyncio
    async def test_fetch_image_unavailable_returns_none(self, maps_service, mock_coordinates):
        """Test that unavailable image returns None"""
        # Given: Coordinates with no Street View
        coords = Coordinates(lat=0.0, lng=0.0)

        with patch('aiohttp.ClientSession.get') as mock_get:
            mock_get.return_value.__aenter__.return_value.status = 404

            # When: Fetching unavailable image
            result = await maps_service.fetch_street_view_image(coords)

            # Then: Should return None
            assert result is None
