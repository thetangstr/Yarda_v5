/**
 * GenerationProgressInline Component (Feature 005 - V2 Port)
 *
 * Displays real-time generation progress inline on the generate page.
 * Updates every 2 seconds via polling from parent component.
 *
 * Features:
 * - Per-area progress indicators
 * - Status messages (pending, processing, completed, failed)
 * - Visual progress bars (0-100%)
 * - Framer Motion animations
 *
 * User Story: US1 (P1) - Single-page generation experience
 */

'use client';

import { motion, AnimatePresence } from 'framer-motion';
import type { AreaResultWithProgress } from '@/types/generation';
import { ANIMATION_DURATION, ANIMATION_DELAY } from './shared/constants';
import {
  getAreaEmoji,
  getAreaDisplayName,
  getStatusText,
  getStatusColor,
} from './shared/utils';

export interface GenerationProgressInlineProps {
  /** Array of area results with progress information */
  areas: AreaResultWithProgress[];
  /** Overall generation status */
  overallStatus: 'pending' | 'processing' | 'completed' | 'failed' | 'partial';
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

export default function GenerationProgressInline({
  areas,
  overallStatus,
  className = '',
}: GenerationProgressInlineProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: ANIMATION_DURATION.fast }}
      className={`w-full max-w-4xl mx-auto ${className}`}
      data-testid="generation-progress"
    >
      {/* Header */}
      <div key="progress-header" className="mb-6 text-center">
        <h2 className="text-3xl md:text-4xl font-bold text-text-light dark:text-text-dark mb-2">
          Creating Your Landscape Design
        </h2>
        <p className="text-subtle-light dark:text-subtle-dark font-light" data-testid="progress-status">
          {overallStatus === 'processing'
            ? 'This may take 1-2 minutes...'
            : overallStatus === 'completed'
              ? 'Design complete!'
              : overallStatus === 'failed'
                ? 'Design creation failed'
                : 'Starting design creation...'}
        </p>
      </div>

      {/* Progress Cards */}
      <div className="space-y-4">
        <AnimatePresence mode="popLayout">
          {areas.map((area, index) => (
            <motion.div
              key={area.areaId}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={{ delay: index * ANIMATION_DELAY.short, duration: ANIMATION_DURATION.fast }}
              className="bg-surface-light dark:bg-surface-dark rounded-lg shadow-card dark:shadow-card-dark p-6 border border-gray-200 dark:border-gray-700"
              data-testid={`progress-area-${area.areaId}`}
            >
              {/* Area Header */}
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-3">
                  <span className="text-3xl">{getAreaEmoji(area.areaId)}</span>
                  <div>
                    <h3 className="text-lg font-semibold text-text-light dark:text-text-dark">
                      {getAreaDisplayName(area.areaId)}
                    </h3>
                    <p className={`text-sm font-medium ${getStatusColor(area.status)}`}>
                      {getStatusText(area.status)}
                    </p>
                  </div>
                </div>

                {/* Status Icon */}
                <div>
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
                  ) : area.status === 'processing' ? (
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ repeat: Infinity, duration: ANIMATION_DURATION.spinner, ease: 'linear' }}
                    >
                      <svg
                        className="w-8 h-8 text-blue-500"
                        fill="none"
                        viewBox="0 0 24 24"
                      >
                        <circle
                          className="opacity-25"
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          strokeWidth="4"
                        />
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                        />
                      </svg>
                    </motion.div>
                  ) : null}
                </div>
              </div>

              {/* Progress Bar */}
              {area.status !== 'failed' && (
                <div key={`progress-bar-${area.areaId}`} className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2.5">
                  <motion.div
                    key={`progress-fill-${area.areaId}`}
                    className={`h-2.5 rounded-full ${
                      area.status === 'completed'
                        ? 'bg-green-600 dark:bg-green-500'
                        : area.status === 'processing'
                          ? 'bg-blue-600 dark:bg-blue-500'
                          : 'bg-gray-400 dark:bg-gray-600'
                    }`}
                    initial={{ width: 0 }}
                    animate={{ width: `${area.progress}%` }}
                    transition={{ duration: ANIMATION_DURATION.fast }}
                  />
                </div>
              )}

              {/* HERO SOURCE IMAGE - Show Google Maps source FIRST while generating */}
              {(() => {
                const sourceImage = getPreferredSourceImage(area);

                // Show source image if available, otherwise show generated result
                if (sourceImage) {
                  return (
                    <motion.div
                      key={`source-image-${area.areaId}`}
                      initial={{ opacity: 0, scale: 0.98 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ duration: ANIMATION_DURATION.fast }}
                      className="mt-4"
                    >
                      <div className="relative bg-gray-900 rounded-xl overflow-hidden shadow-2xl">
                        {/* Hero Image - BIG! */}
                        <img
                          src={sourceImage.image_url}
                          alt={`${getAreaDisplayName(area.areaId)} - ${sourceImage.image_type.replace('_', ' ')}`}
                          className="w-full h-96 object-cover"
                          style={{ maxHeight: '500px' }}
                        />

                        {/* Processing Overlay with Bouncing Camera */}
                        {area.status === 'processing' && (
                          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent">
                            <div className="absolute inset-0 flex items-center justify-center">
                              {/* 📷 BOUNCING CAMERA ANIMATION 📷 */}
                              <motion.div
                                animate={{
                                  y: [0, -20, 0],
                                  scale: [1, 1.1, 1],
                                }}
                                transition={{
                                  repeat: Infinity,
                                  duration: 1.5,
                                  ease: 'easeInOut',
                                }}
                                className="text-8xl drop-shadow-2xl filter"
                                style={{
                                  filter: 'drop-shadow(0 0 30px rgba(255,255,255,0.8))',
                                }}
                              >
                                📷
                              </motion.div>
                            </div>

                            {/* Animated Processing Dots */}
                            <div className="absolute bottom-6 left-0 right-0 flex justify-center gap-2">
                              <motion.div
                                key="pulse-dot-1"
                                animate={{ scale: [1, 1.5, 1], opacity: [1, 0.5, 1] }}
                                transition={{ repeat: Infinity, duration: 1, delay: 0 }}
                                className="w-3 h-3 bg-white rounded-full"
                              />
                              <motion.div
                                key="pulse-dot-2"
                                animate={{ scale: [1, 1.5, 1], opacity: [1, 0.5, 1] }}
                                transition={{ repeat: Infinity, duration: 1, delay: 0.2 }}
                                className="w-3 h-3 bg-white rounded-full"
                              />
                              <motion.div
                                key="pulse-dot-3"
                                animate={{ scale: [1, 1.5, 1], opacity: [1, 0.5, 1] }}
                                transition={{ repeat: Infinity, duration: 1, delay: 0.4 }}
                                className="w-3 h-3 bg-white rounded-full"
                              />
                            </div>
                          </div>
                        )}

                        {/* Image Type Badge */}
                        <div className="absolute top-4 left-4">
                          <div className="bg-black/70 backdrop-blur-md rounded-full px-4 py-2 border border-white/20">
                            <p className="text-sm text-white font-semibold flex items-center gap-2">
                              {sourceImage.image_type === 'street_view' ? (
                                <>🏠 Street View</>
                              ) : (
                                <>🛰️ Satellite</>
                              )}
                            </p>
                          </div>
                        </div>

                        {/* Status Badge - Bottom Right */}
                        <div className="absolute bottom-4 right-4">
                          <div className="bg-black/70 backdrop-blur-md rounded-lg px-4 py-2 border border-white/20">
                            <p className="text-sm text-white font-bold">
                              {area.status === 'completed' ? (
                                <span className="flex items-center gap-2">
                                  ✅ Complete
                                </span>
                              ) : area.status === 'processing' ? (
                                <span className="flex items-center gap-2">
                                  ⚡ Generating...
                                </span>
                              ) : (
                                <span className="flex items-center gap-2">
                                  ⏳ Queued
                                </span>
                              )}
                            </p>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  );
                } else if (area.imageUrl) {
                  // Fallback: Show generated result if no source image
                  return (
                    <motion.div
                      key={`generated-image-${area.areaId}`}
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ duration: ANIMATION_DURATION.fast }}
                      className="mt-4"
                    >
                      <div className="relative aspect-video bg-gray-100 dark:bg-gray-800 rounded-lg overflow-hidden border-2 border-gray-200 dark:border-gray-700">
                        <img
                          src={area.imageUrl}
                          alt={`${getAreaDisplayName(area.areaId)} result`}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    </motion.div>
                  );
                }
                return null;
              })()}

              {/* Error Message */}
              {area.error && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  className="mt-3 p-3 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/50 rounded-md"
                >
                  <p className="text-sm text-red-800 dark:text-red-200">{area.error}</p>
                </motion.div>
              )}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Loading Indicator */}
      {(overallStatus === 'pending' || overallStatus === 'processing') && (
        <motion.div
          key="loading-indicator"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="mt-6 text-center"
        >
          <div className="inline-flex items-center space-x-2 text-subtle-light dark:text-subtle-dark">
            <motion.div
              key="loading-dot-1"
              animate={{ scale: [1, 1.2, 1] }}
              transition={{ repeat: Infinity, duration: ANIMATION_DURATION.pulse }}
              className="w-2 h-2 bg-blue-600 dark:bg-blue-400 rounded-full"
            />
            <motion.div
              key="loading-dot-2"
              animate={{ scale: [1, 1.2, 1] }}
              transition={{ repeat: Infinity, duration: ANIMATION_DURATION.pulse, delay: ANIMATION_DELAY.medium }}
              className="w-2 h-2 bg-blue-600 dark:bg-blue-400 rounded-full"
            />
            <motion.div
              key="loading-dot-3"
              animate={{ scale: [1, 1.2, 1] }}
              transition={{ repeat: Infinity, duration: ANIMATION_DURATION.pulse, delay: ANIMATION_DELAY.long }}
              className="w-2 h-2 bg-blue-600 dark:bg-blue-400 rounded-full"
            />
          </div>
        </motion.div>
      )}
    </motion.div>
  );
}
