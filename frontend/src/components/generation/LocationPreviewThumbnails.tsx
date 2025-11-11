/**
 * LocationPreviewThumbnails Component
 *
 * Shows a single preview of Street View OR Satellite image based on selected yard areas.
 * This lets users verify the location BEFORE starting generation.
 *
 * Smart Preview Selection:
 * - Front Yard selected → Street View
 * - Backyard or Walkway selected (no Front Yard) → Satellite
 *
 * Features:
 * - Direct Google Maps Static API integration (no backend call)
 * - Shows Street View and Satellite side-by-side
 * - Single unified preview (not per-area)
 */

'use client';

import React, { useMemo, useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { YardArea } from '@/types/generation';

interface LocationPreviewThumbnailsProps {
  /** Property address for geocoding */
  address: string;
  /** Google Place ID for more accurate Street View */
  placeId?: string;
  /** Latitude for precise positioning */
  lat?: number;
  /** Longitude for precise positioning */
  lng?: number;
  /** Selected yard areas to preview */
  selectedAreas: YardArea[];
  /** Optional className */
  className?: string;
}

/**
 * Calculate heading (bearing) from one coordinate to another
 * Using Haversine formula - same as backend implementation
 */
function calculateHeading(
  fromLat: number,
  fromLng: number,
  toLat: number,
  toLng: number
): number {
  // Convert to radians
  const lat1 = (fromLat * Math.PI) / 180;
  const lat2 = (toLat * Math.PI) / 180;
  const lngDiff = ((toLng - fromLng) * Math.PI) / 180;

  // Calculate bearing using Haversine formula
  const x = Math.sin(lngDiff) * Math.cos(lat2);
  const y = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(lngDiff);

  const bearingRadians = Math.atan2(x, y);
  const bearingDegrees = (bearingRadians * 180) / Math.PI;

  // Normalize to 0-360
  const heading = (bearingDegrees + 360) % 360;

  return Math.round(heading);
}

export default function LocationPreviewThumbnails({
  address,
  placeId,
  lat,
  lng,
  selectedAreas,
  className = '',
}: LocationPreviewThumbnailsProps) {
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
  const [streetViewHeading, setStreetViewHeading] = useState<number | null>(null);

  // Determine which preview to show based on selected areas
  const previewMode = useMemo(() => {
    if (selectedAreas.includes(YardArea.FrontYard)) {
      return 'street_view';
    }
    return 'satellite';
  }, [selectedAreas]);

  // Fetch Street View metadata and calculate heading to face the house
  useEffect(() => {
    if (!lat || !lng || !apiKey) {
      setStreetViewHeading(null);
      return;
    }

    const fetchStreetViewMetadata = async () => {
      try {
        const metadataUrl = `https://maps.googleapis.com/maps/api/streetview/metadata?location=${lat},${lng}&key=${apiKey}`;
        const response = await fetch(metadataUrl);
        const data = await response.json();

        if (data.status === 'OK' && data.location) {
          // Calculate heading from camera position to property
          const cameraLat = data.location.lat;
          const cameraLng = data.location.lng;
          const heading = calculateHeading(cameraLat, cameraLng, lat, lng);

          console.log('[LocationPreviewThumbnails] Street View heading calculated:');
          console.log('  Camera position:', cameraLat, cameraLng);
          console.log('  Property position:', lat, lng);
          console.log('  Calculated heading:', heading);

          setStreetViewHeading(heading);
        } else {
          console.log('[LocationPreviewThumbnails] No Street View metadata available');
          setStreetViewHeading(null);
        }
      } catch (error) {
        console.error('[LocationPreviewThumbnails] Error fetching Street View metadata:', error);
        setStreetViewHeading(null);
      }
    };

    fetchStreetViewMetadata();
  }, [lat, lng, apiKey]);

  // Build Google Maps Static API URLs
  const imageUrls = useMemo(() => {
    if (!address || !apiKey || selectedAreas.length === 0) {
      return { streetView: '', satellite: '' };
    }

    // Use lat/lng if available for maximum precision, otherwise fall back to address
    const hasCoordinates = lat !== undefined && lng !== undefined;
    const location = hasCoordinates ? `${lat},${lng}` : encodeURIComponent(address);

    // Build Street View URL with calculated heading (if available)
    // pitch=-10 for slightly downward angle (same as backend)
    let streetViewUrl = `https://maps.googleapis.com/maps/api/streetview?size=800x450&location=${location}&fov=60&pitch=-10&radius=50&source=outdoor`;
    if (streetViewHeading !== null) {
      streetViewUrl += `&heading=${streetViewHeading}`;
    }
    streetViewUrl += `&key=${apiKey}`;

    const urls = {
      // Street View (800x450 = 16:9, higher quality)
      // Using calculated heading to face the house
      streetView: streetViewUrl,
      // Satellite (800x450 = 16:9, zoom=20 for closer view)
      // Using lat/lng for exact positioning when available
      satellite: `https://maps.googleapis.com/maps/api/staticmap?center=${location}&zoom=20&size=800x450&maptype=satellite&key=${apiKey}`,
    };

    console.log('[LocationPreviewThumbnails] Generated URLs:');
    console.log('  Address:', address);
    console.log('  Coordinates:', lat && lng ? `${lat},${lng}` : 'Not available');
    console.log('  Place ID:', placeId);
    console.log('  Calculated Heading:', streetViewHeading ?? 'Not calculated yet');
    console.log('  Has API Key:', !!apiKey);
    console.log('  Street View URL:', urls.streetView);
    console.log('  Satellite URL:', urls.satellite);

    return urls;
  }, [address, lat, lng, placeId, apiKey, selectedAreas.length, streetViewHeading]);

  // Don't show if no address or areas
  if (!address || selectedAreas.length === 0 || !apiKey) {
    return null;
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.3 }}
      className={`bg-blue-50 border-2 border-blue-200 rounded-xl p-6 ${className}`}
    >
      {/* Header */}
      <div className="mb-4 text-center">
        <h3 className="text-lg font-semibold text-gray-900 mb-1">
          📍 Location Preview
        </h3>
        <p className="text-sm text-gray-600">
          Verify this image shows the correct property before generating
        </p>
      </div>

      {/* Compact Icon Grid */}
      <div className="flex justify-center gap-3">
        {/* Street View Thumbnail */}
        <div className="relative group">
          <div className="w-32 h-24 bg-gray-100 rounded-lg overflow-hidden shadow-md border-2 border-gray-200">
            <img
              src={imageUrls.streetView}
              alt="Property - Street View"
              className="w-full h-full object-cover"
              loading="lazy"
            />
          </div>
          {/* Badge */}
          <div className="absolute top-1 left-1">
            <div className="bg-blue-600/90 backdrop-blur-sm rounded px-2 py-0.5">
              <p className="text-xs text-white font-semibold">
                🏠 Street View
              </p>
            </div>
          </div>
          {/* Active Indicator */}
          {previewMode === 'street_view' && (
            <div className="absolute bottom-1 right-1">
              <div className="bg-green-500 rounded-full px-2 py-0.5">
                <p className="text-xs text-white font-bold">
                  ✓ Using this
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Satellite Thumbnail */}
        <div className="relative group">
          <div className="w-32 h-24 bg-gray-100 rounded-lg overflow-hidden shadow-md border-2 border-gray-200">
            <img
              src={imageUrls.satellite}
              alt="Property - Satellite"
              className="w-full h-full object-cover"
              loading="lazy"
            />
          </div>
          {/* Badge */}
          <div className="absolute top-1 left-1">
            <div className="bg-gray-800/90 backdrop-blur-sm rounded px-2 py-0.5">
              <p className="text-xs text-white font-semibold">
                🛰️ Satellite
              </p>
            </div>
          </div>
          {/* Active Indicator */}
          {previewMode === 'satellite' && (
            <div className="absolute bottom-1 right-1">
              <div className="bg-green-500 rounded-full px-2 py-0.5">
                <p className="text-xs text-white font-bold">
                  ✓ Using this
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Help Text */}
      <div className="mt-4 p-3 bg-blue-100 rounded-lg">
        <p className="text-xs text-blue-800">
          💡 <strong>Tip:</strong> {previewMode === 'street_view'
            ? 'Front yard uses Street View. Make sure it shows your property from the street.'
            : 'Backyard/walkway uses Satellite view. Make sure it shows the correct overhead area.'}
        </p>
      </div>
    </motion.div>
  );
}
