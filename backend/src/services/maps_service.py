"""
Google Maps Service
Feature: 003-google-maps-integration
Purpose: Integration with Google Maps Platform APIs for property image retrieval
"""

import asyncio
import os
import math
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
class GeocodeResult:
    """Geocoding result with accuracy metadata"""
    coordinates: Coordinates
    location_type: str  # ROOFTOP, RANGE_INTERPOLATED, GEOMETRIC_CENTER, APPROXIMATE
    formatted_address: str
    address_components: list
    place_id: str
    has_street_number: bool = False


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


def calculate_heading(from_coords: Coordinates, to_coords: Coordinates) -> int:
    """
    Calculate the heading (bearing) from one coordinate to another.

    Args:
        from_coords: Starting point (camera location)
        to_coords: Target point (property location)

    Returns:
        Heading in degrees (0-360), where 0=North, 90=East, 180=South, 270=West
    """
    # Convert to radians
    lat1 = math.radians(from_coords.lat)
    lat2 = math.radians(to_coords.lat)
    lng_diff = math.radians(to_coords.lng - from_coords.lng)

    # Calculate bearing using Haversine formula
    x = math.sin(lng_diff) * math.cos(lat2)
    y = math.cos(lat1) * math.sin(lat2) - math.sin(lat1) * math.cos(lat2) * math.cos(lng_diff)

    bearing_radians = math.atan2(x, y)
    bearing_degrees = math.degrees(bearing_radians)

    # Normalize to 0-360
    heading = (bearing_degrees + 360) % 360

    return int(heading)


def validate_address_components(address_components: list) -> dict:
    """
    Validate that geocoding result includes key address components.

    Args:
        address_components: List of address component dicts from Geocoding API

    Returns:
        dict with:
            - has_street_number: bool - Whether street number component exists
            - street_number: Optional[str] - The street number if present
            - route: Optional[str] - The street/route name if present
            - locality: Optional[str] - The city/locality if present
    """
    component_map = {}

    for component in address_components:
        types = component.get("types", [])
        long_name = component.get("long_name")

        if "street_number" in types:
            component_map["street_number"] = long_name
        elif "route" in types:
            component_map["route"] = long_name
        elif "locality" in types:
            component_map["locality"] = long_name

    return {
        "has_street_number": "street_number" in component_map,
        "street_number": component_map.get("street_number"),
        "route": component_map.get("route"),
        "locality": component_map.get("locality")
    }


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

    async def geocode_address(self, address: str) -> Optional[GeocodeResult]:
        """
        Convert address to coordinates using Geocoding API with accuracy validation.

        Prefers ROOFTOP results (building-level precision) over APPROXIMATE results.
        Returns GeocodeResult with location_type for accuracy tracking.

        Args:
            address: Full street address

        Returns:
            GeocodeResult with coordinates and accuracy metadata, or None if address invalid

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
                        if not results:
                            return None

                        # CRITICAL FIX: Prefer ROOFTOP results for building-level precision
                        # Try to find ROOFTOP result first (most accurate)
                        rooftop_result = None
                        for result in results:
                            location_type = result.get("geometry", {}).get("location_type")
                            if location_type == "ROOFTOP":
                                rooftop_result = result
                                break

                        # Use ROOFTOP if available, otherwise fall back to first result
                        best_result = rooftop_result if rooftop_result else results[0]

                        # Extract location and metadata
                        location = best_result["geometry"]["location"]
                        location_type = best_result["geometry"].get("location_type", "UNKNOWN")
                        formatted_address = best_result.get("formatted_address", "")
                        address_components = best_result.get("address_components", [])
                        place_id = best_result.get("place_id", "")

                        # Validate address components
                        validation = validate_address_components(address_components)

                        # Log accuracy level for monitoring
                        logger.info(
                            "geocoding_accuracy",
                            address=address,
                            location_type=location_type,
                            has_street_number=validation["has_street_number"],
                            formatted_address=formatted_address,
                            result_count=len(results),
                            rooftop_available=rooftop_result is not None
                        )

                        # Warn if accuracy is poor
                        if location_type in ["APPROXIMATE", "GEOMETRIC_CENTER"]:
                            logger.warning(
                                "geocoding_low_accuracy",
                                address=address,
                                location_type=location_type,
                                has_street_number=validation["has_street_number"],
                                message="Low geocoding accuracy - Street View may show wrong house"
                            )

                        # Warn if street number is missing
                        if not validation["has_street_number"]:
                            logger.warning(
                                "missing_street_number",
                                address=address,
                                location_type=location_type,
                                formatted_address=formatted_address,
                                message="Street number not found in geocoding result"
                            )

                        return GeocodeResult(
                            coordinates=Coordinates(lat=location["lat"], lng=location["lng"]),
                            location_type=location_type,
                            formatted_address=formatted_address,
                            address_components=address_components,
                            place_id=place_id,
                            has_street_number=validation["has_street_number"]
                        )

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

                        # Only create Coordinates if API returned actual camera position data
                        # that differs from the target coordinates
                        camera_location = None
                        if location_data:
                            camera_lat = location_data.get("lat")
                            camera_lng = location_data.get("lng")
                            if camera_lat is not None and camera_lng is not None:
                                # Check if camera position is different from target
                                if camera_lat != coords.lat or camera_lng != coords.lng:
                                    camera_location = Coordinates(lat=camera_lat, lng=camera_lng)

                        return StreetViewMetadata(
                            status="OK",
                            pano_id=data.get("pano_id"),
                            date=data.get("date"),
                            location=camera_location
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
        start_time = asyncio.get_event_loop().time()

        try:
            params = {
                "center": f"{coords.lat},{coords.lng}",
                "zoom": zoom,
                "size": size,
                "maptype": maptype,
                "key": self.api_key
            }

            async with aiohttp.ClientSession() as session:
                async with session.get(self.STATIC_MAP_URL, params=params) as response:
                    duration_ms = int((asyncio.get_event_loop().time() - start_time) * 1000)

                    if response.status != 200:
                        error_text = await response.text()
                        logger.error(
                            "google_maps_api_call",
                            api="satellite_image",
                            lat=coords.lat,
                            lng=coords.lng,
                            zoom=zoom,
                            size=size,
                            status_code=response.status,
                            error=error_text,
                            duration_ms=duration_ms,
                            cost="PAID ($0.002)"
                        )
                        raise MapsServiceError(
                            error_type="API_ERROR",
                            message=f"Satellite image request failed: HTTP {response.status} - {error_text}"
                        )

                    image_bytes = await response.read()

                    # Log successful API call
                    logger.info(
                        "google_maps_api_call",
                        api="satellite_image",
                        lat=coords.lat,
                        lng=coords.lng,
                        zoom=zoom,
                        size=size,
                        status_code=response.status,
                        duration_ms=duration_ms,
                        cost="PAID ($0.002)"
                    )

                    logger.info(
                        "satellite_image_retrieved",
                        lat=coords.lat,
                        lng=coords.lng,
                        size_bytes=len(image_bytes)
                    )

                    return image_bytes

        except aiohttp.ClientError as e:
            raise MapsServiceError(
                error_type="NETWORK_ERROR",
                message=f"Network error fetching satellite image: {str(e)}"
            )
        except Exception as e:
            raise MapsServiceError(
                error_type="NETWORK_ERROR",
                message=f"Unexpected error during satellite image fetch: {str(e)}"
            )

    async def get_property_images(
        self,
        address: str,
        area: str,
        custom_heading: Optional[int] = None,
        custom_pitch: Optional[int] = None
    ) -> Tuple[Optional[bytes], Optional[StreetViewMetadata], Optional[bytes], str]:
        """
        Main method: Get property images with automatic fallback.

        Feature: 004-generation-flow (T011)
        Extended for: 007-holiday-decorator (T017)

        Workflow:
        1. Geocode address → coordinates
        2. Check Street View metadata (FREE)
        3. If Street View available → fetch Street View (PAID)
        4. Always fetch satellite as fallback (PAID)

        For front_yard: Prioritize Street View
        For other areas: Prioritize Satellite

        Args:
            address: Full street address
            area: Landscape area (front_yard, backyard, walkway, side_yard, patio, pool_area)
            custom_heading: Optional Street View heading (0-359 degrees) - overrides automatic calculation
            custom_pitch: Optional Street View pitch (-90 to 90 degrees) - overrides default 0

        Returns:
            Tuple of (street_view_bytes, street_view_metadata, satellite_bytes, image_source)
            - street_view_bytes: Street View image bytes or None
            - street_view_metadata: Metadata with pano_id or None
            - satellite_bytes: Satellite image bytes or None
            - image_source: 'google_street_view', 'google_satellite', or 'user_upload'
            At least one image will be non-None, or raises error

        Raises:
            MapsServiceError: If no imagery available or API error
        """
        logger.info("get_property_images_start", address=address, area=area)

        # Step 1: Geocode address with accuracy validation
        geocode_result = await self.geocode_address(address)
        if not geocode_result:
            raise MapsServiceError(
                "invalid_address",
                f"Unable to geocode address: {address}"
            )

        coords = geocode_result.coordinates

        logger.info(
            "address_geocoded",
            lat=coords.lat,
            lng=coords.lng,
            location_type=geocode_result.location_type,
            has_street_number=geocode_result.has_street_number,
            formatted_address=geocode_result.formatted_address
        )

        # Log accuracy warning if geocoding is not precise
        if geocode_result.location_type != "ROOFTOP":
            logger.warning(
                "street_view_accuracy_warning",
                address=address,
                location_type=geocode_result.location_type,
                has_street_number=geocode_result.has_street_number,
                message=f"Geocoding accuracy is {geocode_result.location_type} (not ROOFTOP) - Street View may show wrong house"
            )

        street_view_bytes = None
        street_view_metadata = None
        satellite_bytes = None
        image_source = "google_satellite"  # Default fallback

        # Step 2: Check Street View metadata (FREE API call)
        try:
            metadata = await self.get_street_view_metadata(coords)

            # Step 3: Fetch Street View if available (PAID: $0.007)
            if metadata.status == "OK":
                street_view_metadata = metadata

                # Use the Street View camera location from metadata for accurate positioning
                camera_coords = metadata.location if metadata.location else coords

                # Determine heading: use custom_heading if provided, otherwise auto-calculate
                if custom_heading is not None:
                    # Holiday Decorator: Use user-selected heading from Street View preview
                    heading = custom_heading
                    logger.info(
                        "street_view_custom_heading",
                        heading=heading,
                        source="user_selected"
                    )
                elif metadata.location:
                    # Auto-calculate heading to ensure camera points at the target
                    heading = calculate_heading(camera_coords, coords)
                    logger.info(
                        "street_view_heading_calculated",
                        camera_lat=camera_coords.lat,
                        camera_lng=camera_coords.lng,
                        target_lat=coords.lat,
                        target_lng=coords.lng,
                        heading=heading,
                        source="auto_calculated"
                    )
                else:
                    # If no metadata location and no custom heading, use default
                    heading = 0

                # Determine pitch: use custom_pitch if provided, otherwise default to 0
                pitch = custom_pitch if custom_pitch is not None else 0

                street_view_bytes = await self.fetch_street_view_image(
                    camera_coords,
                    heading=heading,
                    pitch=pitch
                )

                if street_view_bytes:
                    image_source = "street_view"  # Changed from "google_street_view" to match DB constraint
                    logger.info(
                        "street_view_image_retrieved",
                        address=address,
                        pano_id=metadata.pano_id,
                        camera_lat=camera_coords.lat,
                        camera_lng=camera_coords.lng,
                        heading=heading,
                        size_bytes=len(street_view_bytes)
                    )

        except MapsServiceError as e:
            logger.warning(
                "street_view_retrieval_failed",
                address=address,
                error=str(e)
            )

        # Step 4: Fetch satellite image (PAID: $0.002)
        # Always fetch satellite for backyard/walkway areas
        try:
            satellite_bytes = await self.fetch_satellite_image(
                coords,
                zoom=20,  # Close-up view for residential properties
                size="600x400",
                maptype="satellite"
            )

            if satellite_bytes:
                logger.info(
                    "satellite_image_retrieved",
                    address=address,
                    lat=coords.lat,
                    lng=coords.lng,
                    size_bytes=len(satellite_bytes)
                )

        except MapsServiceError as e:
            logger.warning(
                "satellite_retrieval_failed",
                address=address,
                error=str(e)
            )

        # Step 5: Determine which image to return based on area type
        # Front yard: Prioritize Street View
        # Other areas (backyard, walkway, side_yard): Prioritize Satellite
        if area == "front_yard":
            # Front yard uses Street View
            if street_view_bytes:
                image_source = "street_view"
                return (street_view_bytes, street_view_metadata, satellite_bytes, image_source)
            elif satellite_bytes:
                # Fallback to satellite if Street View unavailable
                image_source = "google_satellite"
                logger.warning(
                    "street_view_unavailable_fallback_to_satellite",
                    address=address,
                    area=area
                )
                return (satellite_bytes, street_view_metadata, satellite_bytes, image_source)
        else:
            # Backyard, walkway, side_yard use Satellite
            if satellite_bytes:
                image_source = "google_satellite"
                return (satellite_bytes, street_view_metadata, satellite_bytes, image_source)
            elif street_view_bytes:
                # Fallback to Street View if satellite unavailable
                image_source = "street_view"
                logger.warning(
                    "satellite_unavailable_fallback_to_street_view",
                    address=address,
                    area=area
                )
                return (street_view_bytes, street_view_metadata, satellite_bytes, image_source)

        # If we get here, no imagery is available
        raise MapsServiceError(
            "no_imagery_available",
            f"No imagery available for address: {address}. "
            "Please try a different address or upload a photo manually."
        )

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
