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

import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import { YardArea } from '@/types/generation';

interface LocationPreviewThumbnailsProps {
  /** Property address for geocoding */
  address: string;
  /** Selected yard areas to preview */
  selectedAreas: YardArea[];
  /** Optional className */
  className?: string;
}

export default function LocationPreviewThumbnails({
  address,
  selectedAreas,
  className = '',
}: LocationPreviewThumbnailsProps) {
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

  // Determine which preview to show based on selected areas
  const previewMode = useMemo(() => {
    if (selectedAreas.includes(YardArea.FrontYard)) {
      return 'street_view';
    }
    return 'satellite';
  }, [selectedAreas]);

  // Build Google Maps Static API URLs
  const imageUrls = useMemo(() => {
    if (!address || !apiKey || selectedAreas.length === 0) {
      return { streetView: '', satellite: '' };
    }

    const encodedAddress = encodeURIComponent(address);

    return {
      // Street View (800x450 = 16:9, higher quality)
      // Added heading=0 to face north, fov=80 for wider angle, pitch=-10 for slight downward tilt
      streetView: `https://maps.googleapis.com/maps/api/streetview?size=800x450&location=${encodedAddress}&fov=80&pitch=-5&heading=0&key=${apiKey}`,
      // Satellite (800x450 = 16:9, zoom=20 for closer view)
      satellite: `https://maps.googleapis.com/maps/api/staticmap?center=${encodedAddress}&zoom=20&size=800x450&maptype=satellite&key=${apiKey}`,
    };
  }, [address, apiKey, selectedAreas.length]);

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

      {/* Single Preview Canvas */}
      <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-200">
        {/* Image Grid - Street View + Satellite side-by-side */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Street View */}
          <div className="relative group">
            <div className="aspect-video bg-gray-100 rounded-lg overflow-hidden shadow-md">
              <img
                src={imageUrls.streetView}
                alt="Property - Street View"
                className="w-full h-full object-cover"
                loading="lazy"
              />
            </div>
            {/* Badge */}
            <div className="absolute top-3 left-3">
              <div className="bg-blue-600/90 backdrop-blur-sm rounded-lg px-3 py-1.5 shadow-lg">
                <p className="text-sm text-white font-semibold">
                  🏠 Street View
                </p>
              </div>
            </div>
            {/* Active Indicator */}
            {previewMode === 'street_view' && (
              <div className="absolute bottom-3 right-3">
                <div className="bg-green-500 rounded-full px-3 py-1 shadow-lg">
                  <p className="text-xs text-white font-bold">
                    ✓ Using this
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Satellite */}
          <div className="relative group">
            <div className="aspect-video bg-gray-100 rounded-lg overflow-hidden shadow-md">
              <img
                src={imageUrls.satellite}
                alt="Property - Satellite"
                className="w-full h-full object-cover"
                loading="lazy"
              />
            </div>
            {/* Badge */}
            <div className="absolute top-3 left-3">
              <div className="bg-gray-800/90 backdrop-blur-sm rounded-lg px-3 py-1.5 shadow-lg">
                <p className="text-sm text-white font-semibold">
                  🛰️ Satellite
                </p>
              </div>
            </div>
            {/* Active Indicator */}
            {previewMode === 'satellite' && (
              <div className="absolute bottom-3 right-3">
                <div className="bg-green-500 rounded-full px-3 py-1 shadow-lg">
                  <p className="text-xs text-white font-bold">
                    ✓ Using this
                  </p>
                </div>
              </div>
            )}
          </div>
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
