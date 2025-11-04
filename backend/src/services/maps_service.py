"""
Google Maps Service
Feature: 003-google-maps-integration
Purpose: Integration with Google Maps Platform APIs for property image retrieval
"""

import asyncio
import os
from typing import Optional, Tuple
from dataclasses import dataclass
import aiohttp
import structlog

logger = structlog.get_logger(__name__)


@dataclass
class Coordinates:
    """Geographic coordinates"""
    lat: float
    lng: float


@dataclass
class StreetViewMetadata:
    """Metadata from Street View availability check"""
    status: str  # OK, ZERO_RESULTS, NOT_FOUND, ERROR
    pano_id: Optional[str] = None
    date: Optional[str] = None
    location: Optional[Coordinates] = None


class MapsServiceError(Exception):
    """Base exception for Maps Service errors"""
    def __init__(self, error_type: str, message: str, retry_after: Optional[int] = None):
        self.error_type = error_type
        self.message = message
        self.retry_after = retry_after
        super().__init__(message)


class MapsService:
    """
    Google Maps Platform integration service for property image retrieval.

    All methods are async to support FastAPI's async request handling.
    """

    # Google Maps API endpoints
    GEOCODING_URL = "https://maps.googleapis.com/maps/api/geocode/json"
    STREET_VIEW_METADATA_URL = "https://maps.googleapis.com/maps/api/streetview/metadata"
    STREET_VIEW_IMAGE_URL = "https://maps.googleapis.com/maps/api/streetview"
    STATIC_MAP_URL = "https://maps.googleapis.com/maps/api/staticmap"

    def __init__(self, api_key: Optional[str] = None):
        """
        Initialize MapsService with Google Maps API key.

        Args:
            api_key: Google Maps Platform API key (from environment variable if not provided)
        """
        self.api_key = api_key or os.getenv("GOOGLE_MAPS_API_KEY")
        if not self.api_key:
            raise ValueError("GOOGLE_MAPS_API_KEY environment variable not set")

    async def geocode_address(self, address: str) -> Optional[Coordinates]:
        """
        Convert address to coordinates using Geocoding API.

        Args:
            address: Full street address

        Returns:
            Coordinates object with lat/lng, or None if address invalid

        Raises:
            MapsServiceError: If API quota exceeded or network error
        """
        start_time = asyncio.get_event_loop().time()

        try:
            params = {
                "address": address,
                "key": self.api_key
            }

            async with aiohttp.ClientSession() as session:
                async with session.get(self.GEOCODING_URL, params=params) as response:
                    duration_ms = int((asyncio.get_event_loop().time() - start_time) * 1000)
                    data = await response.json()

                    status = data.get("status")

                    # Log API call
                    logger.info(
                        "google_maps_api_call",
                        api="geocoding",
                        address=address,
                        status=status,
                        duration_ms=duration_ms
                    )

                    # Handle different status codes
                    if status == "OK":
                        results = data.get("results", [])
                        if results:
                            location = results[0]["geometry"]["location"]
                            return Coordinates(lat=location["lat"], lng=location["lng"])
                        return None

                    elif status == "ZERO_RESULTS":
                        return None

                    elif status == "OVER_QUERY_LIMIT":
                        raise MapsServiceError(
                            error_type="QUOTA_EXCEEDED",
                            message="Google Maps API quota exceeded",
                            retry_after=60
                        )

                    elif status == "REQUEST_DENIED":
                        raise MapsServiceError(
                            error_type="API_ERROR",
                            message=f"API request denied: {data.get('error_message', 'Invalid API key or API not enabled')}"
                        )

                    elif status == "INVALID_REQUEST":
                        raise MapsServiceError(
                            error_type="API_ERROR",
                            message=f"Invalid request: {data.get('error_message', 'Missing or malformed parameters')}"
                        )

                    else:
                        raise MapsServiceError(
                            error_type="API_ERROR",
                            message=f"Unexpected status: {status}"
                        )

        except aiohttp.ClientError as e:
            logger.error("google_maps_api_error", api="geocoding", error=str(e))
            raise MapsServiceError(
                error_type="NETWORK_ERROR",
                message=f"Network error during geocoding: {str(e)}"
            )
        except Exception as e:
            if isinstance(e, MapsServiceError):
                raise
            logger.exception("google_maps_api_unexpected_error", api="geocoding")
            raise MapsServiceError(
                error_type="NETWORK_ERROR",
                message=f"Unexpected error during geocoding: {str(e)}"
            )

    async def get_street_view_metadata(
        self,
        coords: Coordinates,
        radius: int = 50
    ) -> StreetViewMetadata:
        """
        Check if Street View imagery is available (FREE request).

        Always call this before fetch_street_view_image() to avoid
        wasting paid requests.

        Args:
            coords: Property coordinates
            radius: Search radius in meters (default 50, recommend 50-100)

        Returns:
            StreetViewMetadata with status and panorama info

        Raises:
            MapsServiceError: If API quota exceeded or network error
        """
        start_time = asyncio.get_event_loop().time()

        try:
            params = {
                "location": f"{coords.lat},{coords.lng}",
                "radius": radius,
                "key": self.api_key
            }

            async with aiohttp.ClientSession() as session:
                async with session.get(self.STREET_VIEW_METADATA_URL, params=params) as response:
                    duration_ms = int((asyncio.get_event_loop().time() - start_time) * 1000)
                    data = await response.json()

                    status = data.get("status")

                    # Log API call (FREE request)
                    logger.info(
                        "google_maps_api_call",
                        api="street_view_metadata",
                        lat=coords.lat,
                        lng=coords.lng,
                        radius=radius,
                        status=status,
                        duration_ms=duration_ms,
                        cost="FREE"
                    )

                    # Handle different status codes
                    if status == "OK":
                        location_data = data.get("location", {})
                        return StreetViewMetadata(
                            status="OK",
                            pano_id=data.get("pano_id"),
                            date=data.get("date"),
                            location=Coordinates(
                                lat=location_data.get("lat", coords.lat),
                                lng=location_data.get("lng", coords.lng)
                            ) if location_data else None
                        )

                    elif status == "ZERO_RESULTS":
                        return StreetViewMetadata(status="ZERO_RESULTS")

                    elif status == "NOT_FOUND":
                        return StreetViewMetadata(status="NOT_FOUND")

                    elif status == "OVER_QUERY_LIMIT":
                        raise MapsServiceError(
                            error_type="QUOTA_EXCEEDED",
                            message="Street View metadata API quota exceeded",
                            retry_after=60
                        )

                    else:
                        return StreetViewMetadata(status="ERROR")

        except aiohttp.ClientError as e:
            logger.error("google_maps_api_error", api="street_view_metadata", error=str(e))
            raise MapsServiceError(
                error_type="NETWORK_ERROR",
                message=f"Network error during Street View metadata check: {str(e)}"
            )
        except Exception as e:
            if isinstance(e, MapsServiceError):
                raise
            logger.exception("google_maps_api_unexpected_error", api="street_view_metadata")
            raise MapsServiceError(
                error_type="NETWORK_ERROR",
                message=f"Unexpected error during Street View metadata check: {str(e)}"
            )

    async def fetch_street_view_image(
        self,
        coords: Coordinates,
        size: str = "600x400",
        fov: int = 90,
        heading: int = 0,
        pitch: int = 0
    ) -> Optional[bytes]:
        """
        Fetch Street View image (PAID: $0.007/image).

        Args:
            coords: Property coordinates
            size: Image dimensions "WIDTHxHEIGHT" (max 640x640)
            fov: Horizontal field of view 0-120 degrees (default 90)
            heading: Compass direction 0-360 (0=N, 90=E, 180=S, 270=W)
            pitch: Vertical angle -90 to 90 (0=straight, positive=up, negative=down)

        Returns:
            Image bytes (JPEG), or None if not available

        Raises:
            MapsServiceError: If API quota exceeded or network error
        """
        start_time = asyncio.get_event_loop().time()

        try:
            params = {
                "location": f"{coords.lat},{coords.lng}",
                "size": size,
                "fov": fov,
                "heading": heading,
                "pitch": pitch,
                "key": self.api_key,
                "return_error_code": "true"  # Return 404 instead of gray placeholder
            }

            async with aiohttp.ClientSession() as session:
                async with session.get(self.STREET_VIEW_IMAGE_URL, params=params) as response:
                    duration_ms = int((asyncio.get_event_loop().time() - start_time) * 1000)

                    # Log API call (PAID request)
                    logger.info(
                        "google_maps_api_call",
                        api="street_view_image",
                        lat=coords.lat,
                        lng=coords.lng,
                        size=size,
                        fov=fov,
                        heading=heading,
                        pitch=pitch,
                        status_code=response.status,
                        duration_ms=duration_ms,
                        cost="PAID ($0.007)"
                    )

                    if response.status == 200:
                        # Successfully retrieved image
                        image_bytes = await response.read()
                        logger.info(
                            "street_view_image_retrieved",
                            lat=coords.lat,
                            lng=coords.lng,
                            size_bytes=len(image_bytes)
                        )
                        return image_bytes

                    elif response.status == 404:
                        # No imagery available at this location
                        logger.warning(
                            "street_view_image_not_found",
                            lat=coords.lat,
                            lng=coords.lng
                        )
                        return None

                    elif response.status == 429:
                        raise MapsServiceError(
                            error_type="QUOTA_EXCEEDED",
                            message="Street View image API quota exceeded",
                            retry_after=60
                        )

                    elif response.status == 403:
                        raise MapsServiceError(
                            error_type="API_ERROR",
                            message="Street View API access denied - check API key restrictions"
                        )

                    else:
                        raise MapsServiceError(
                            error_type="API_ERROR",
                            message=f"Unexpected status code: {response.status}"
                        )

        except aiohttp.ClientError as e:
            logger.error("google_maps_api_error", api="street_view_image", error=str(e))
            raise MapsServiceError(
                error_type="NETWORK_ERROR",
                message=f"Network error during Street View image fetch: {str(e)}"
            )
        except Exception as e:
            if isinstance(e, MapsServiceError):
                raise
            logger.exception("google_maps_api_unexpected_error", api="street_view_image")
            raise MapsServiceError(
                error_type="NETWORK_ERROR",
                message=f"Unexpected error during Street View image fetch: {str(e)}"
            )

    async def fetch_satellite_image(
        self,
        coords: Coordinates,
        zoom: int = 18,
        size: str = "600x400",
        maptype: str = "satellite"
    ) -> Optional[bytes]:
        """
        Fetch satellite image (PAID: $0.002/image).

        Args:
            coords: Property coordinates
            zoom: Zoom level 0-21 (17-18 recommended for residential)
            size: Image dimensions "WIDTHxHEIGHT" (max 640x640)
            maptype: Map type (satellite, hybrid, roadmap, terrain)

        Returns:
            Image bytes (JPEG)

        Raises:
            MapsServiceError: If API quota exceeded or network error
        """
        # TODO: Implement in T031
        raise NotImplementedError("To be implemented in T031")

    async def get_property_images(
        self,
        address: str,
        area: str
    ) -> Tuple[Optional[bytes], Optional[bytes], str]:
        """
        Main method: Get property images with automatic fallback.

        Workflow:
        1. Geocode address → coordinates
        2. Check Street View metadata (FREE)
        3. If Street View available → fetch Street View (PAID)
        4. Always fetch satellite as fallback (PAID)

        For front_yard: Prioritize Street View
        For other areas: Prioritize Satellite

        Args:
            address: Full street address
            area: Landscape area (front_yard, back_yard, side_yard, full_property)

        Returns:
            Tuple of (street_view_bytes | None, satellite_bytes | None, image_source)
            At least one will be non-None, or raises error

        Raises:
            MapsServiceError: If no imagery available or API error
        """
        # TODO: Implement in T042
        raise NotImplementedError("To be implemented in T042")

    async def _retry_with_backoff(self, func, max_retries: int = 3, base_delay: int = 2):
        """
        Retry API call with exponential backoff.

        Args:
            func: Async function to retry
            max_retries: Maximum number of retry attempts
            base_delay: Base delay in seconds (will be doubled each retry)

        Returns:
            Result from func()

        Raises:
            MapsServiceError: If all retries exhausted
        """
        last_error = None

        for attempt in range(max_retries):
            try:
                return await func()

            except MapsServiceError as e:
                last_error = e

                # Don't retry these errors
                if e.error_type in ["API_ERROR", "NETWORK_ERROR"]:
                    # These are not transient - immediate failure
                    if "REQUEST_DENIED" in e.message or "INVALID_REQUEST" in e.message:
                        raise

                # Retry QUOTA_EXCEEDED with backoff
                if e.error_type == "QUOTA_EXCEEDED":
                    if attempt < max_retries - 1:
                        delay = base_delay * (2 ** attempt)  # 2s, 4s, 8s
                        logger.warning(
                            "google_maps_quota_exceeded_retry",
                            attempt=attempt + 1,
                            max_retries=max_retries,
                            delay_seconds=delay
                        )
                        await asyncio.sleep(delay)
                        continue
                    else:
                        # Final attempt failed
                        logger.error("google_maps_quota_exceeded_max_retries")
                        raise

                # For other errors, raise immediately
                raise

        # All retries exhausted
        if last_error:
            raise last_error
        raise MapsServiceError(
            error_type="API_ERROR",
            message="Max retries exhausted"
        )
