'use client';

/**
 * BeforeAfterSlider Component
 *
 * Interactive before/after image comparison slider
 * Used on /start page hero section to showcase AI transformation capability
 *
 * Features:
 * - Smooth drag interaction
 * - Responsive sizing
 * - Keyboard accessible
 * - Touch device support
 * - Loading states
 * - Error handling with fallback
 */

import { ReactCompareSlider, ReactCompareSliderImage } from 'react-compare-slider';
import { useState } from 'react';

interface BeforeAfterSliderProps {
  beforeImage: string;
  afterImage: string;
  beforeAlt?: string;
  afterAlt?: string;
  className?: string;
}

export default function BeforeAfterSlider({
  beforeImage,
  afterImage,
  beforeAlt = 'Before landscaping',
  afterAlt = 'After AI landscaping',
  className = ''
}: BeforeAfterSliderProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  return (
    <div className={`relative rounded-2xl overflow-hidden shadow-2xl ${className}`}>
      {/* Loading State */}
      {isLoading && (
        <div className="absolute inset-0 bg-gray-100 flex items-center justify-center z-10">
          <div className="text-center">
            <svg className="animate-spin h-8 w-8 mx-auto text-green-500 mb-2" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <p className="text-sm text-gray-700">Loading comparison...</p>
          </div>
        </div>
      )}

      {/* Error Fallback */}
      {hasError ? (
        <div className="aspect-[4/3] bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center">
          <div className="text-center p-8">
            <svg className="h-24 w-24 mx-auto text-green-500 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <p className="text-gray-800 font-medium">Before & After Comparison</p>
            <p className="text-sm text-gray-600 mt-2">See the transformation</p>
          </div>
        </div>
      ) : (
        <>
          <ReactCompareSlider
            itemOne={
              <ReactCompareSliderImage
                src={beforeImage}
                alt={beforeAlt}
                onLoad={() => setIsLoading(false)}
                onError={() => { setHasError(true); setIsLoading(false); }}
              />
            }
            itemTwo={
              <ReactCompareSliderImage
                src={afterImage}
                alt={afterAlt}
              />
            }
            position={50}
            className="aspect-[4/3] [&_.rcs-divider]:bg-white [&_.rcs-divider]:w-1 [&_.rcs-handle]:h-12 [&_.rcs-handle]:w-12"
            handle={
              <div className="flex items-center justify-center w-12 h-12 bg-white rounded-full shadow-xl border-4 border-green-500 hover:scale-110 transition-transform">
                <svg className="w-6 h-6 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                <svg className="w-6 h-6 text-green-500 -ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
            }
          />

          {/* Before/After Labels */}
          {!isLoading && (
            <>
              <div className="absolute top-4 left-4 bg-black/40 backdrop-blur-sm px-3 py-1 rounded-full">
                <p className="text-sm font-bold text-white">BEFORE</p>
              </div>
              <div className="absolute top-4 right-4 bg-black/40 backdrop-blur-sm px-3 py-1 rounded-full">
                <p className="text-sm font-bold text-white">AFTER</p>
              </div>
            </>
          )}

          {/* Instructional Text Overlay */}
          {!isLoading && (
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-white/90 backdrop-blur-sm px-4 py-2 rounded-full shadow-lg">
              <p className="text-xs text-gray-700 font-medium flex items-center gap-2">
                <svg className="w-4 h-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
                </svg>
                Drag the slider to compare
              </p>
            </div>
          )}
        </>
      )}
    </div>
  );
}
