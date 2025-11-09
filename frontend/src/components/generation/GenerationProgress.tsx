/**
 * GenerationProgress Component
 *
 * Real-time generation progress display with per-area status.
 *
 * Requirements:
 * - T025: Display generation progress with status updates
 * - FR-009: Real-time progress tracking
 * - FR-010: Show per-area progress for multi-area generations
 *
 * Features:
 * - Overall progress bar
 * - Per-area status cards
 * - Processing stage indicators
 * - Completion time estimates
 * - Error handling
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { Generation } from '@/store/generationStore';
import { CameraAnimation } from './CameraAnimation';

interface GenerationProgressProps {
  /** Generation data to display */
  generation: Generation;
  /** Custom CSS classes */
  className?: string;
}

/**
 * Get progress bar color based on status
 */
const getProgressColor = (status: string, progress: number): string => {
  if (status === 'failed') return 'bg-error-500';
  if (status === 'completed') return 'bg-success-500';
  if (progress > 75) return 'bg-brand-green';
  if (progress > 50) return 'bg-blue-500';
  if (progress > 25) return 'bg-yellow-500';
  return 'bg-neutral-400';
};

/**
 * Get status badge color
 */
const getStatusBadgeColor = (status: string): string => {
  switch (status) {
    case 'completed':
      return 'bg-success-100 text-success-800 border-success-200';
    case 'processing':
      return 'bg-blue-100 text-blue-800 border-blue-200';
    case 'pending':
      return 'bg-neutral-100 text-neutral-700 border-neutral-200';
    case 'failed':
      return 'bg-error-100 text-error-800 border-error-200';
    default:
      return 'bg-neutral-100 text-neutral-700 border-neutral-200';
  }
};

/**
 * Get status icon
 */
const getStatusIcon = (status: string): React.ReactNode => {
  switch (status) {
    case 'completed':
      return (
        <svg className="w-5 h-5 text-success-600" fill="currentColor" viewBox="0 0 20 20">
          <path
            fillRule="evenodd"
            d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
            clipRule="evenodd"
          />
        </svg>
      );
    case 'processing':
      return (
        <svg className="w-5 h-5 text-blue-600 animate-spin" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
          />
        </svg>
      );
    case 'pending':
      return (
        <svg className="w-5 h-5 text-neutral-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      );
    case 'failed':
      return (
        <svg className="w-5 h-5 text-error-600" fill="currentColor" viewBox="0 0 20 20">
          <path
            fillRule="evenodd"
            d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 9.586 8.707 8.293z"
            clipRule="evenodd"
          />
        </svg>
      );
    default:
      return null;
  }
};

/**
 * Format area type for display
 */
const formatAreaType = (areaType: string): string => {
  return areaType
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
};

export const GenerationProgress: React.FC<GenerationProgressProps> = ({ generation, className = '' }) => {
  const { status, progress, areas, address, created_at } = generation;
  const [generationTime, setGenerationTime] = useState<number | null>(null);
  const [startTime] = useState<number>(() => created_at ? new Date(created_at).getTime() : Date.now());

  // Calculate generation time when completed
  useEffect(() => {
    if (status === 'completed') {
      const endTime = Date.now();
      const timeInSeconds = (endTime - startTime) / 1000;
      setGenerationTime(timeInSeconds);
    }
  }, [status, startTime]);

  // Calculate completion time estimate (30-60 seconds per spec)
  const estimatedSeconds = Math.max(30, 60 - (progress / 100) * 60);

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Overall Status Header */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-2xl font-bold text-neutral-900">Your Landscape Design</h2>
            {address && <p className="text-sm text-neutral-600 mt-1">{address}</p>}
          </div>
          <div className={`px-4 py-2 rounded-full border-2 ${getStatusBadgeColor(status)}`}>
            <div className="flex items-center gap-2">
              {getStatusIcon(status)}
              <span className="font-semibold text-sm capitalize">{status}</span>
            </div>
          </div>
        </div>

        {/* Overall Progress Bar */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="font-medium text-neutral-700">Overall Progress</span>
            <span className="font-bold text-brand-green">{progress}%</span>
          </div>
          <div className="h-3 bg-neutral-200 rounded-full overflow-hidden">
            <div
              className={`h-full transition-all duration-500 ${getProgressColor(status, progress)}`}
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* Status Message */}
        {status === 'processing' && (
          <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-sm text-blue-800">
              🎨 Generating your design... Estimated time: <strong>{estimatedSeconds}s</strong>
            </p>
          </div>
        )}

        {status === 'completed' && (
          <div className="mt-4 p-3 bg-success-50 border border-success-200 rounded-lg">
            <p className="text-sm text-success-800 font-semibold">
              ✨ Your design is ready! Scroll down to view the results.
            </p>
          </div>
        )}

        {status === 'failed' && (
          <div className="mt-4 p-3 bg-error-50 border border-error-200 rounded-lg">
            <p className="text-sm text-error-800 font-semibold">
              ⚠️ Generation failed. Your credits/tokens have been refunded.
            </p>
          </div>
        )}
      </div>

      {/* Camera Animation - Only show during processing */}
      {status === 'processing' && (
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.9 }}
          className="flex flex-col items-center justify-center py-8 bg-white rounded-lg shadow-md"
        >
          <CameraAnimation className="mb-6" />
          <div className="text-center space-y-2">
            <p className="text-lg font-semibold text-gray-900">
              Capturing Your Landscape
            </p>
            <p className="text-sm text-gray-600">
              AI is analyzing your property and generating designs...
            </p>
          </div>
        </motion.div>
      )}

      {/* Source Images (Street View / Satellite) Thumbnails */}
      {generation.source_images && generation.source_images.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-lg shadow-md p-6"
        >
          <h3 className="text-lg font-semibold text-neutral-900 mb-4 flex items-center gap-2">
            <svg className="w-5 h-5 text-brand-green" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            Source Images
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {generation.source_images.map((sourceImage, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: index * 0.1 }}
                className="relative rounded-lg overflow-hidden border-2 border-neutral-200"
              >
                <img
                  src={sourceImage.image_url}
                  alt={`${sourceImage.image_type} view`}
                  className="w-full h-48 object-cover"
                  onError={(e) => {
                    // Fallback for failed image loads
                    e.currentTarget.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="400" height="300"%3E%3Crect width="400" height="300" fill="%23f3f4f6"/%3E%3Ctext x="50%25" y="50%25" dominant-baseline="middle" text-anchor="middle" fill="%236b7280"%3EImage Loading...%3C/text%3E%3C/svg%3E';
                  }}
                />
                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent px-3 py-2">
                  <span className="text-white text-sm font-medium capitalize">
                    {sourceImage.image_type.replace('_', ' ')}
                  </span>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>
      )}

      {/* Per-Area Progress Cards */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-neutral-900">Area Progress</h3>

        <AnimatePresence>
          {areas.map((area, index) => (
            <motion.div
              key={area.area_id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3, delay: index * 0.1 }}
              className="bg-white rounded-lg shadow-md p-5 border-2 border-neutral-200"
              data-testid={`area-progress-${area.area_id}`}
            >
              <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                  area.status === 'completed'
                    ? 'bg-success-100'
                    : area.status === 'processing'
                    ? 'bg-blue-100'
                    : area.status === 'failed'
                    ? 'bg-error-100'
                    : 'bg-neutral-100'
                }`}>
                  {getStatusIcon(area.status)}
                </div>
                <div>
                  <h4 className="font-semibold text-neutral-900">{formatAreaType(area.area_type)}</h4>
                  <p className="text-xs text-neutral-600 capitalize">{area.style.replace(/_/g, ' ')}</p>
                </div>
              </div>
              <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusBadgeColor(area.status)}`}>
                {area.status}
              </span>
            </div>

            {/* Area Progress Bar */}
            {area.status !== 'failed' && (
              <div className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-neutral-600">Progress</span>
                  <span className="font-semibold text-brand-green">{area.progress || 0}%</span>
                </div>
                <div className="h-2 bg-neutral-200 rounded-full overflow-hidden">
                  <div
                    className={`h-full transition-all duration-300 ${getProgressColor(area.status, area.progress || 0)}`}
                    style={{ width: `${area.progress || 0}%` }}
                  />
                </div>
              </div>
            )}

            {/* Error Message */}
            {area.error_message && (
              <div className="mt-3 p-2 bg-error-50 border border-error-200 rounded text-xs text-error-700">
                {area.error_message}
              </div>
            )}

              {/* Completed Image Preview */}
              {area.status === 'completed' && area.image_urls && area.image_urls.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.4, delay: 0.2 }}
                  className="mt-4"
                >
                  <img
                    src={area.image_urls[0]}
                    alt={`${formatAreaType(area.area_type)} design`}
                    className="w-full h-48 object-cover rounded-lg border-2 border-success-300 shadow-lg"
                  />
                </motion.div>
              )}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Generation Time Display (v2 feature) */}
      {generationTime && status === 'completed' && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="flex items-center justify-center gap-2 text-neutral-600 bg-white rounded-lg shadow-md p-4"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span className="font-medium">
            Generated in {generationTime.toFixed(1)} seconds
          </span>
        </motion.div>
      )}
    </div>
  );
};

export default GenerationProgress;
