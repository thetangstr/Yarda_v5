/**
 * GenerationResultsInline Component (Feature 005 - V2 Port)
 *
 * Displays generation results inline on the generate page.
 * Shows images and metadata for each completed area.
 *
 * Features:
 * - Image gallery per area
 * - Success/failure status indicators
 * - Download buttons for images
 * - Responsive grid layout
 * - Framer Motion animations
 *
 * User Story: US1 (P1) - Single-page generation experience
 */

'use client';

import { motion, AnimatePresence } from 'framer-motion';
import type { AreaResultWithProgress } from '@/types/generation';
import { useState, useCallback, useEffect } from 'react';
import useEmblaCarousel from 'embla-carousel-react';
import { ANIMATION_DURATION, ANIMATION_DELAY } from './shared/constants';
import { getAreaEmoji, getAreaDisplayName } from './shared/utils';

export interface GenerationResultsInlineProps {
  /** Array of completed area results */
  areas: AreaResultWithProgress[];
  /** Property address */
  address?: string;
  /** Callback when user clicks "Start New Generation" */
  onStartNew?: () => void;
  /** Optional custom className */
  className?: string;
}

/**
 * Get preferred source image based on area type
 * Front-facing areas → Street View, Back/side areas → Satellite
 */
function getPreferredSourceImage(
  area: AreaResultWithProgress
): { image_url: string; image_type: string } | null {
  if (!area.sourceImages || area.sourceImages.length === 0) return null;

  const areaId = area.areaId.toLowerCase();
  const frontFacingAreas = ['front_yard', 'patio', 'pool_area', 'front', 'entrance'];
  const isFrontFacing = frontFacingAreas.some(keyword => areaId.includes(keyword));

  const preferredType = isFrontFacing ? 'street_view' : 'satellite';
  const preferred = area.sourceImages.find(img => img.image_type === preferredType);

  if (preferred) return { image_url: preferred.image_url, image_type: preferred.image_type };

  return {
    image_url: area.sourceImages[0].image_url,
    image_type: area.sourceImages[0].image_type
  };
}

/**
 * Before/After Carousel Component
 * Shows source image (before) and generated image (after) with smooth transitions
 */
interface BeforeAfterCarouselProps {
  sourceImage: { image_url: string; image_type: string };
  generatedImage: string;
  areaName: string;
  onImageClick: (url: string) => void;
}

function BeforeAfterCarousel({
  sourceImage,
  generatedImage,
  areaName,
  onImageClick,
}: BeforeAfterCarouselProps) {
  const [emblaRef, emblaApi] = useEmblaCarousel({ loop: true });
  const [selectedIndex, setSelectedIndex] = useState(0);

  const scrollPrev = useCallback(() => {
    if (emblaApi) emblaApi.scrollPrev();
  }, [emblaApi]);

  const scrollNext = useCallback(() => {
    if (emblaApi) emblaApi.scrollNext();
  }, [emblaApi]);

  const onSelect = useCallback(() => {
    if (!emblaApi) return;
    setSelectedIndex(emblaApi.selectedScrollSnap());
  }, [emblaApi]);

  // Subscribe to carousel events
  useEffect(() => {
    if (!emblaApi) return;
    emblaApi.on('select', onSelect);
    onSelect();

    return () => {
      emblaApi.off('select', onSelect);
    };
  }, [emblaApi, onSelect]);

  return (
    <div className="relative">
      {/* Carousel Viewport */}
      <div className="overflow-hidden" ref={emblaRef}>
        <div className="flex">
          {/* BEFORE Slide - Source Image */}
          <div className="flex-[0_0_100%] min-w-0">
            <div
              className="relative aspect-video bg-gray-100 rounded-lg overflow-hidden cursor-pointer hover:opacity-90 transition-opacity"
              onClick={() => onImageClick(sourceImage.image_url)}
            >
              <img
                src={sourceImage.image_url}
                alt={`${areaName} - Before (${sourceImage.image_type.replace('_', ' ')})`}
                className="w-full h-full object-cover"
              />
              {/* BEFORE Badge */}
              <div className="absolute top-4 left-4">
                <div className="bg-blue-600 backdrop-blur-md rounded-lg px-4 py-2 shadow-lg">
                  <p className="text-sm text-white font-bold flex items-center gap-2">
                    📸 BEFORE
                  </p>
                </div>
              </div>
              {/* Image Type Badge */}
              <div className="absolute bottom-4 left-4">
                <div className="bg-black/70 backdrop-blur-md rounded-full px-3 py-1.5 border border-white/20">
                  <p className="text-xs text-white font-semibold">
                    {sourceImage.image_type === 'street_view' ? '🏠 Street View' : '🛰️ Satellite'}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* AFTER Slide - Generated Result */}
          <div className="flex-[0_0_100%] min-w-0">
            <div
              className="relative aspect-video bg-gray-100 rounded-lg overflow-hidden cursor-pointer hover:opacity-90 transition-opacity"
              onClick={() => onImageClick(generatedImage)}
            >
              <img
                src={generatedImage}
                alt={`${areaName} - After (AI Generated)`}
                className="w-full h-full object-cover"
              />
              {/* AFTER Badge */}
              <div className="absolute top-4 left-4">
                <div className="bg-gradient-to-r from-green-500 to-emerald-600 backdrop-blur-md rounded-lg px-4 py-2 shadow-lg">
                  <p className="text-sm text-white font-bold flex items-center gap-2">
                    ✨ AFTER
                  </p>
                </div>
              </div>
              {/* AI Generated Badge */}
              <div className="absolute bottom-4 left-4">
                <div className="bg-purple-600/90 backdrop-blur-md rounded-full px-3 py-1.5 border border-purple-300/20">
                  <p className="text-xs text-white font-semibold">
                    🤖 AI Generated
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Arrows */}
      <button
        onClick={scrollPrev}
        className="absolute left-2 top-1/2 -translate-y-1/2 w-10 h-10 bg-white/90 backdrop-blur-md rounded-full shadow-lg hover:bg-white transition-all flex items-center justify-center z-10"
        aria-label="Previous image"
      >
        <svg className="w-6 h-6 text-gray-800" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
      </button>
      <button
        onClick={scrollNext}
        className="absolute right-2 top-1/2 -translate-y-1/2 w-10 h-10 bg-white/90 backdrop-blur-md rounded-full shadow-lg hover:bg-white transition-all flex items-center justify-center z-10"
        aria-label="Next image"
      >
        <svg className="w-6 h-6 text-gray-800" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
      </button>

      {/* Carousel Dots */}
      <div className="flex justify-center gap-2 mt-3">
        <button
          onClick={() => emblaApi?.scrollTo(0)}
          className={`w-2 h-2 rounded-full transition-all ${
            selectedIndex === 0 ? 'bg-blue-600 w-6' : 'bg-gray-300'
          }`}
          aria-label="View before image"
        />
        <button
          onClick={() => emblaApi?.scrollTo(1)}
          className={`w-2 h-2 rounded-full transition-all ${
            selectedIndex === 1 ? 'bg-green-600 w-6' : 'bg-gray-300'
          }`}
          aria-label="View after image"
        />
      </div>
    </div>
  );
}

export default function GenerationResultsInline({
  areas,
  address,
  onStartNew,
  className = '',
}: GenerationResultsInlineProps) {
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  // Count successful and failed areas
  const successCount = areas.filter((a) => a.status === 'completed').length;
  const failedCount = areas.filter((a) => a.status === 'failed').length;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: ANIMATION_DURATION.fast }}
      className={`w-full max-w-6xl mx-auto ${className}`}
      data-testid="generation-results"
    >
      {/* Header */}
      <div key="results-header" className="mb-8">
        {/* Success Banner */}
        <div className="bg-gradient-to-r from-green-50 to-blue-50 border-2 border-green-200 rounded-lg p-6 mb-6">
          <h2 className="text-4xl font-bold text-gray-900 mb-3 text-center">
            {successCount === areas.length
              ? '🎉 All Designs Created Successfully!'
              : failedCount === areas.length
                ? '❌ Design Creation Failed'
                : '⚠️ Partial Results'}
          </h2>
          {address && <p className="text-gray-700 text-xl text-center mb-3">{address}</p>}

          {/* Stats Bar */}
          <div className="flex items-center justify-center gap-6 mt-4 flex-wrap">
            <div className="bg-white px-6 py-3 rounded-lg shadow-sm border border-gray-200">
              <div className="text-2xl font-bold text-gray-900">{areas.length}</div>
              <div className="text-sm text-gray-600">Total Areas</div>
            </div>
            <div className="bg-white px-6 py-3 rounded-lg shadow-sm border border-green-200">
              <div className="text-2xl font-bold text-green-600">{successCount}</div>
              <div className="text-sm text-gray-600">Successful</div>
            </div>
            {failedCount > 0 && (
              <div className="bg-white px-6 py-3 rounded-lg shadow-sm border border-red-200">
                <div className="text-2xl font-bold text-red-600">{failedCount}</div>
                <div className="text-sm text-gray-600">Failed</div>
              </div>
            )}
          </div>
        </div>

        {/* Section Title */}
        <h3 className="text-2xl font-bold text-gray-900 mb-4 text-center">
          Your Landscape Designs
        </h3>
      </div>

      {/* Results Grid - Enhanced for Multiple Areas */}
      <div key="results-grid" className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 mb-8">
        <AnimatePresence mode="popLayout">
          {areas.map((area, index) => (
            <motion.div
              key={area.areaId}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ delay: index * ANIMATION_DELAY.short, duration: ANIMATION_DURATION.fast }}
              className={`bg-white rounded-lg shadow-lg overflow-hidden border-2 ${
                area.status === 'completed'
                  ? 'border-green-300'
                  : area.status === 'failed'
                    ? 'border-red-300'
                    : 'border-gray-200'
              }`}
              data-testid={`result-area-${area.areaId}`}
            >
              {/* Area Header */}
              <div key={`${area.areaId}-header`} className="bg-gradient-to-r from-blue-50 to-purple-50 p-4 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <span className="text-3xl">{getAreaEmoji(area.areaId)}</span>
                    <div>
                      <h3 className="text-lg font-bold text-gray-900">
                        {getAreaDisplayName(area.areaId)}
                      </h3>
                      <p
                        className={`text-sm font-medium ${
                          area.status === 'completed'
                            ? 'text-green-600'
                            : area.status === 'failed'
                              ? 'text-red-600'
                              : 'text-gray-600'
                        }`}
                      >
                        {area.status === 'completed' ? 'Success' : 'Failed'}
                      </p>
                    </div>
                  </div>

                  {/* Status Icon */}
                  {area.status === 'completed' ? (
                    <svg
                      className="w-8 h-8 text-green-500"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path
                        fillRule="evenodd"
                        d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                        clipRule="evenodd"
                      />
                    </svg>
                  ) : area.status === 'failed' ? (
                    <svg
                      className="w-8 h-8 text-red-500"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path
                        fillRule="evenodd"
                        d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                        clipRule="evenodd"
                      />
                    </svg>
                  ) : null}
                </div>
              </div>

              {/* Result Content */}
              <div key={`${area.areaId}-content`} className="p-6">
                {area.status === 'completed' && area.imageUrl ? (
                  <div className="space-y-4">
                    {/* Before/After Carousel or Single Result Image */}
                    {(() => {
                      const sourceImage = getPreferredSourceImage(area);

                      // Show carousel if we have source images (before/after comparison)
                      if (sourceImage) {
                        return (
                          <BeforeAfterCarousel
                            sourceImage={sourceImage}
                            generatedImage={area.imageUrl}
                            areaName={getAreaDisplayName(area.areaId)}
                            onImageClick={setSelectedImage}
                          />
                        );
                      }

                      // Fallback: Just show generated result
                      return (
                        <div
                          className="relative aspect-video bg-gray-100 rounded-lg overflow-hidden cursor-pointer hover:opacity-90 transition-opacity"
                          onClick={() => setSelectedImage(area.imageUrl!)}
                          data-testid={`result-image-${area.areaId}`}
                        >
                          <img
                            src={area.imageUrl}
                            alt={`${getAreaDisplayName(area.areaId)} design`}
                            className="w-full h-full object-cover"
                          />
                        </div>
                      );
                    })()}

                    {/* Action Buttons */}
                    <div className="flex space-x-3">
                      <a
                        href={area.imageUrl}
                        download={`${area.areaId}-design.jpg`}
                        className="flex-1 px-4 py-2 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg hover:from-blue-700 hover:to-blue-800 transition-all shadow-md hover:shadow-lg text-center font-medium"
                      >
                        💾 Download
                      </a>
                      <button
                        onClick={() => setSelectedImage(area.imageUrl!)}
                        className="flex-1 px-4 py-2 bg-gradient-to-r from-gray-600 to-gray-700 text-white rounded-lg hover:from-gray-700 hover:to-gray-800 transition-all shadow-md hover:shadow-lg font-medium"
                      >
                        🔍 View Full Size
                      </button>
                    </div>
                  </div>
                ) : (
                  /* Error State */
                  <div className="text-center py-8">
                    <svg
                      className="w-16 h-16 text-red-300 mx-auto mb-4"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path
                        fillRule="evenodd"
                        d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                        clipRule="evenodd"
                      />
                    </svg>
                    <p className="text-gray-600 font-medium mb-2">Generation Failed</p>
                    {area.error && (
                      <p className="text-sm text-red-600 bg-red-50 p-3 rounded-md">
                        {area.error}
                      </p>
                    )}
                  </div>
                )}
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Action Button */}
      {onStartNew && (
        <motion.div
          key="action-button"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: ANIMATION_DELAY.button }}
          className="text-center"
        >
          <button
            onClick={onStartNew}
            className="px-8 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:from-blue-700 hover:to-purple-700 transition-all shadow-lg hover:shadow-xl font-semibold text-lg"
          >
            Create New Design
          </button>
        </motion.div>
      )}

      {/* Image Modal */}
      <AnimatePresence>
        {selectedImage && (
          <motion.div
            key="image-modal"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-75 p-4"
            onClick={() => setSelectedImage(null)}
          >
            <motion.div
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.9 }}
              className="relative max-w-6xl max-h-[90vh]"
              onClick={(e) => e.stopPropagation()}
            >
              <img
                src={selectedImage}
                alt="Full size result"
                className="max-w-full max-h-[90vh] rounded-lg shadow-2xl"
              />
              <button
                onClick={() => setSelectedImage(null)}
                className="absolute top-4 right-4 w-10 h-10 bg-white rounded-full shadow-lg hover:bg-gray-100 transition-colors flex items-center justify-center"
              >
                <svg
                  className="w-6 h-6 text-gray-800"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
