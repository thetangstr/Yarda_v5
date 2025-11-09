/**
 * useGenerationProgress Hook
 *
 * Real-time generation progress polling with localStorage recovery.
 *
 * Requirements:
 * - T026: 2-second polling interval per research.md
 * - T028: localStorage progress recovery on page refresh
 * - FR-009: Real-time progress tracking
 * - FR-012: Progress persists across page refresh
 *
 * Features:
 * - Polls GET /generations/{id} every 2 seconds
 * - Updates generationStore with latest status
 * - Automatically stops polling when completed/failed
 * - Recovers in-progress generation from localStorage
 * - Cleans up on unmount
 */

import { useEffect, useRef, useCallback, useState } from 'react';
import { useGenerationStore, type Generation } from '@/store/generationStore';
import { generationsAPI } from '@/lib/api';
import type { GenerationStatus } from '@/types/generation';

interface UseGenerationProgressOptions {
  /** Generation ID to poll */
  generationId: string;
  /** Whether to enable polling (default: true) */
  enabled?: boolean;
  /** Polling interval in milliseconds (default: 2000) */
  interval?: number;
  /** Callback when generation completes */
  onComplete?: () => void;
  /** Callback when generation fails */
  onError?: (error: string) => void;
}

interface UseGenerationProgressReturn {
  /** Current generation state from store */
  generation: Generation | null;
  /** Whether currently polling */
  isPolling: boolean;
  /** Error message if polling failed */
  error: string | null;
  /** Manually trigger a refresh */
  refresh: () => Promise<void>;
}

/**
 * Hook to poll generation progress and update store
 */
export const useGenerationProgress = ({
  generationId,
  enabled = true,
  interval = 2000,
  onComplete,
  onError,
}: UseGenerationProgressOptions): UseGenerationProgressReturn => {
  const { currentGeneration, setCurrentGeneration, updateGenerationProgress, updateAreaStatus } =
    useGenerationStore();

  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const isMountedRef = useRef(true);
  const lastStatusRef = useRef<GenerationStatus | null>(null);
  const isPollingRef = useRef(false);

  // Local state for error
  const [error, setError] = useState<string | null>(null);
  const [isPolling, setIsPolling] = useState(false);

  /**
   * Fetch generation status from API and update store
   */
  const fetchGenerationStatus = useCallback(async () => {
    if (!isMountedRef.current || isPollingRef.current) {
      console.log('[useGenerationProgress] Skipping fetch - mounted:', isMountedRef.current, 'already polling:', isPollingRef.current);
      return;
    }

    isPollingRef.current = true;
    console.log('[useGenerationProgress] Fetching status for generation:', generationId);

    try {
      const response = await generationsAPI.getStatus(generationId);
      console.log('[useGenerationProgress] Received response:', response);
      console.log('[useGenerationProgress] Response keys:', Object.keys(response));
      console.log('[useGenerationProgress] source_images field:', response.source_images);
      console.log('[useGenerationProgress] Full response JSON:', JSON.stringify(response, null, 2).substring(0, 500));

      // Only update if component is still mounted
      if (!isMountedRef.current) {
        return;
      }

      // Calculate overall progress (average of all areas)
      const totalProgress = response.areas.reduce((sum, area) => sum + (area.progress || 0), 0);
      const overallProgress = Math.round(totalProgress / response.areas.length);

      // Update store with latest data
      if (currentGeneration?.generation_id === generationId) {
        // Update existing generation
        updateGenerationProgress(generationId, overallProgress);

        // Update each area's status
        response.areas.forEach((area) => {
          updateAreaStatus(generationId, area.id, area.status, area.progress);
        });
      } else {
        // Set as current generation (recovery scenario)
        // v2 enhancement: Include preservation_strength, current_stage, status_message
        console.log('[useGenerationProgress] API Response received:', {
          generationId,
          status: response.status,
          source_images: response.source_images,
          num_source_images: response.source_images?.length || 0,
          areas_count: response.areas?.length || 0,
        });

        setCurrentGeneration({
          generation_id: generationId,
          user_id: response.user_id || '',
          status: response.status,
          progress: overallProgress,
          payment_type: response.payment_method,
          tokens_deducted: response.total_cost,
          address: response.address || '',
          areas: response.areas.map((area) => ({
            area_id: area.id,
            area_type: area.area,
            style: area.style,
            custom_prompt: area.custom_prompt,
            preservation_strength: area.preservation_strength, // v2 enhancement
            status: area.status,
            progress: area.progress || 0,
            current_stage: area.current_stage, // v2 enhancement
            status_message: area.status_message, // v2 enhancement
            image_urls: area.image_url ? [area.image_url] : undefined,
            error_message: area.error_message,
          })),
          source_images: response.source_images, // Include Street View/Satellite images
          created_at: response.created_at,
          completed_at: response.completed_at,
        });

        console.log('[useGenerationProgress] Generation state set with source_images:', response.source_images);
      }

      // Check if status changed to completed or failed
      if (lastStatusRef.current !== response.status) {
        lastStatusRef.current = response.status;

        if (response.status === 'completed') {
          // Stop polling and call onComplete callback
          if (pollIntervalRef.current) {
            clearInterval(pollIntervalRef.current);
            pollIntervalRef.current = null;
            setIsPolling(false);
          }
          if (onComplete) {
            onComplete();
          }
        } else if (response.status === 'failed' || response.status === 'partial_failed') {
          // Stop polling and call onError callback
          if (pollIntervalRef.current) {
            clearInterval(pollIntervalRef.current);
            pollIntervalRef.current = null;
            setIsPolling(false);
          }
          const errorMsg = response.error_message || 'Generation failed';
          setError(errorMsg);
          if (onError) {
            onError(errorMsg);
          }
        }
      }
    } catch (err) {
      console.error('Error fetching generation status:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch generation status';
      setError(errorMessage);

      // Don't stop polling on network errors - keep retrying
      // Only stop if explicitly failed
    } finally {
      isPollingRef.current = false;
    }
  }, [
    generationId,
    currentGeneration,
    setCurrentGeneration,
    updateGenerationProgress,
    updateAreaStatus,
    onComplete,
    onError,
  ]);

  /**
   * Start polling
   */
  const startPolling = useCallback(() => {
    // Don't start if already polling or disabled
    if (pollIntervalRef.current || !enabled) {
      return;
    }

    // Fetch immediately
    fetchGenerationStatus();

    // Then poll every interval
    pollIntervalRef.current = setInterval(() => {
      fetchGenerationStatus();
    }, interval);

    setIsPolling(true);
  }, [enabled, interval, fetchGenerationStatus]);

  /**
   * Stop polling
   */
  const stopPolling = useCallback(() => {
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current);
      pollIntervalRef.current = null;
      setIsPolling(false);
    }
  }, []);

  /**
   * Start polling on mount
   */
  useEffect(() => {
    // Reset mounted state on mount (critical for React StrictMode)
    isMountedRef.current = true;
    startPolling();

    // Cleanup on unmount
    return () => {
      isMountedRef.current = false;
      stopPolling();
    };
  }, [startPolling, stopPolling]);

  /**
   * Stop polling if status is terminal
   */
  useEffect(() => {
    if (currentGeneration?.status === 'completed' || currentGeneration?.status === 'failed') {
      stopPolling();
    }
  }, [currentGeneration?.status, stopPolling]);

  return {
    generation: currentGeneration,
    isPolling,
    error,
    refresh: fetchGenerationStatus,
  };
};

export default useGenerationProgress;
