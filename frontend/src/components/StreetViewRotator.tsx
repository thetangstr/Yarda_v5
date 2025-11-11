'use client';

/**
 * Street View Rotator Component
 *
 * Interactive control for adjusting Street View camera heading (0-359 degrees).
 * Allows users to find the perfect angle of their home for holiday decoration.
 *
 * Features:
 * - 360° rotation controls (left/right arrows or slider)
 * - Live preview of Street View at current heading
 * - Visual heading display with compass indicator
 * - Loading states while fetching images
 *
 * Feature: 007-holiday-decorator (T025)
 * User Story 1: New User Discovery & First Generation
 */

import React, { useState, useEffect } from 'react';
import Image from 'next/image';

interface StreetViewRotatorProps {
  address: string;
  initialHeading?: number;
  onHeadingChange: (heading: number) => void;
  disabled?: boolean;
}

export default function StreetViewRotator({
  address,
  initialHeading = 180,
  onHeadingChange,
  disabled = false,
}: StreetViewRotatorProps) {
  const [heading, setHeading] = useState(initialHeading);
  const [isLoading, setIsLoading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Fetch Street View preview when heading changes
  useEffect(() => {
    if (!address) return;

    const fetchPreview = async () => {
      setIsLoading(true);
      setError(null);

      try {
        // Simulate slight delay for loading state
        await new Promise((resolve) => setTimeout(resolve, 300));

        // Build Google Maps Street View Static API URL
        const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
        if (!apiKey) {
          throw new Error('Google Maps API key not configured');
        }

        const streetViewUrl = `https://maps.googleapis.com/maps/api/streetview?` +
          `size=800x450` +
          `&location=${encodeURIComponent(address)}` +
          `&heading=${heading}` +
          `&fov=90` +
          `&pitch=0` +
          `&key=${apiKey}`;

        setPreviewUrl(streetViewUrl);
      } catch (err: any) {
        console.error('Street View preview error:', err);
        setError('Failed to load Street View preview');
      } finally {
        setIsLoading(false);
      }
    };

    fetchPreview();
  }, [address, heading]);

  // Handle rotation
  const rotateLeft = () => {
    const newHeading = (heading - 45 + 360) % 360;
    setHeading(newHeading);
    onHeadingChange(newHeading);
  };

  const rotateRight = () => {
    const newHeading = (heading + 45) % 360;
    setHeading(newHeading);
    onHeadingChange(newHeading);
  };

  // Handle slider change
  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newHeading = parseInt(e.target.value, 10);
    setHeading(newHeading);
    onHeadingChange(newHeading);
  };

  // Get compass direction label
  const getDirectionLabel = (deg: number): string => {
    const directions = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
    const index = Math.round(deg / 45) % 8;
    return directions[index];
  };

  return (
    <div
      data-testid="street-view-rotator"
      className={`
        w-full max-w-3xl mx-auto p-6 rounded-xl
        bg-white border-2 border-gray-200
        shadow-lg
        ${disabled ? 'opacity-50 pointer-events-none' : ''}
      `}
    >
      {/* Header */}
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-gray-900 mb-1">
          Adjust Street View Angle
        </h3>
        <p className="text-sm text-gray-600">
          Rotate to find the best view of your home for decoration
        </p>
      </div>

      {/* Street View Preview */}
      <div className="relative aspect-video rounded-lg overflow-hidden bg-gray-100 mb-4">
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-900/10 backdrop-blur-sm">
            <div className="flex flex-col items-center gap-2">
              <div className="w-12 h-12 border-4 border-green-500 border-t-transparent rounded-full animate-spin" />
              <span className="text-sm text-gray-700 font-medium">Loading preview...</span>
            </div>
          </div>
        )}

        {error && (
          <div className="absolute inset-0 flex items-center justify-center bg-red-50">
            <div className="text-center p-4">
              <span className="text-4xl mb-2">⚠️</span>
              <p className="text-sm text-red-600">{error}</p>
            </div>
          </div>
        )}

        {/* Preview Image */}
        {previewUrl && !error && (
          <Image
            src={previewUrl}
            alt={`Street View of ${address} at ${heading}° heading`}
            fill
            className="object-cover"
            priority
            unoptimized // Google Maps API doesn't support Next.js image optimization
          />
        )}

        {/* Heading overlay */}
        <div className="absolute top-4 right-4 px-3 py-1 rounded-full bg-black/70 backdrop-blur-sm text-white text-sm font-bold">
          {heading}° {getDirectionLabel(heading)}
        </div>
      </div>

      {/* Rotation Controls */}
      <div className="space-y-4">
        {/* Button Controls */}
        <div className="flex items-center justify-center gap-4">
          {/* Rotate Left */}
          <button
            data-testid="rotate-left"
            onClick={rotateLeft}
            disabled={disabled}
            className="
              flex items-center justify-center
              w-12 h-12 rounded-full
              bg-gray-100 hover:bg-gray-200
              border-2 border-gray-300 hover:border-gray-400
              disabled:opacity-50 disabled:cursor-not-allowed
              transition-colors duration-200
              group
            "
            title="Rotate left 45°"
          >
            <svg
              className="w-6 h-6 text-gray-700 group-hover:text-gray-900 transition-colors"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 19l-7-7 7-7"
              />
            </svg>
          </button>

          {/* Heading Display with Compass */}
          <div
            data-testid="heading-display"
            className="
              relative flex flex-col items-center justify-center
              w-32 h-32 rounded-full
              bg-gradient-to-br from-blue-500 to-indigo-600
              shadow-lg
            "
          >
            {/* Compass needle */}
            <div
              className="absolute inset-0 flex items-center justify-center"
              style={{ transform: `rotate(${heading}deg)` }}
            >
              <div className="w-1 h-16 bg-white rounded-full shadow-lg" />
              <div className="absolute top-2 w-0 h-0 border-l-4 border-r-4 border-b-8 border-l-transparent border-r-transparent border-b-red-500" />
            </div>

            {/* Center circle */}
            <div className="relative z-10 w-16 h-16 rounded-full bg-white flex flex-col items-center justify-center shadow-inner">
              <span className="text-2xl font-bold text-gray-900">{heading}°</span>
              <span className="text-xs text-gray-600 font-medium">{getDirectionLabel(heading)}</span>
            </div>
          </div>

          {/* Rotate Right */}
          <button
            data-testid="rotate-right"
            onClick={rotateRight}
            disabled={disabled}
            className="
              flex items-center justify-center
              w-12 h-12 rounded-full
              bg-gray-100 hover:bg-gray-200
              border-2 border-gray-300 hover:border-gray-400
              disabled:opacity-50 disabled:cursor-not-allowed
              transition-colors duration-200
              group
            "
            title="Rotate right 45°"
          >
            <svg
              className="w-6 h-6 text-gray-700 group-hover:text-gray-900 transition-colors"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 5l7 7-7 7"
              />
            </svg>
          </button>
        </div>

        {/* Slider Control */}
        <div className="px-4">
          <label htmlFor="heading-slider" className="block text-sm font-medium text-gray-700 mb-2">
            Fine-tune angle:
          </label>
          <input
            id="heading-slider"
            type="range"
            min="0"
            max="359"
            value={heading}
            onChange={handleSliderChange}
            disabled={disabled}
            className="
              w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer
              accent-green-500
            "
          />
          <div className="flex justify-between text-xs text-gray-500 mt-1">
            <span>0° (N)</span>
            <span>90° (E)</span>
            <span>180° (S)</span>
            <span>270° (W)</span>
            <span>359° (N)</span>
          </div>
        </div>

        {/* Tips */}
        <div className="mt-4 p-3 rounded-lg bg-blue-50 border border-blue-200">
          <div className="flex items-start gap-2">
            <span className="text-lg">💡</span>
            <div className="text-sm text-blue-800">
              <strong>Tip:</strong> Rotate to show your home's front entrance for the best decoration results.
              The AI will add festive elements while preserving your home's structure.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
