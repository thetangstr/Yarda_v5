// @ts-nocheck
/**
 * ⚠️ REFERENCE FILE - NOT CURRENTLY USED ⚠️
 *
 * This file is kept as a reference from Yarda v2 implementation.
 * The actual polling hook in use is: useGenerationProgress.ts
 *
 * Hook for polling generation progress (v2 enhancement)
 *
 * Features:
 * - 2-second polling interval (v2 standard)
 * - Automatic stop when completed/failed
 * - Incremental result display as areas complete
 * - Result recovery on page load
 *
 * Based on Yarda v2's CompleteDesignEnhanced.tsx polling implementation
 */

import { useEffect, useRef, useCallback } from 'react';
import { useGenerationStore } from '@/store/generationStore';
import { generationsAPI } from '@/lib/api';

interface UseGenerationPollingOptions {
  generationId: string | null;
  enabled?: boolean;
  onComplete?: (generation: any) => void;
  onError?: (error: string) => void;
}

export function useGenerationPolling({
  generationId,
  enabled = true,
  onComplete,
  onError,
}: UseGenerationPollingOptions) {
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const {
    currentGeneration,
    setCurrentGeneration,
    updateAreaStatus,
  } = useGenerationStore();

  const stopPolling = useCallback(() => {
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current);
      pollIntervalRef.current = null;
    }
  }, []);

  const pollProgress = useCallback(async () => {
    if (!generationId) return;

    try {
      // Fetch generation status from API
      const progressData = await generationsAPI.getGeneration(generationId);

      // Update store with latest data
      setCurrentGeneration({
        generation_id: progressData.id,
        user_id: progressData.user_id || '',
        status: progressData.status,
        progress: progressData.progress || 0,
        payment_type: progressData.payment_method,
        tokens_deducted: progressData.total_cost,
        address: progressData.address,
        areas: progressData.areas.map((area: any) => ({
          area_id: area.id,
          area_type: area.area,
          style: area.style,
          custom_prompt: area.custom_prompt,
          preservation_strength: area.preservation_strength,
          status: area.status,
          progress: area.progress || 0,
          current_stage: area.current_stage,
          status_message: area.status_message,
          image_urls: area.image_url ? [area.image_url] : [],
          error_message: area.error_message,
        })),
        created_at: progressData.created_at,
        completed_at: progressData.completed_at,
      });

      // Check if generation is complete
      const isComplete =
        progressData.status === 'completed' ||
        progressData.status === 'failed' ||
        progressData.status === 'partial_failed';

      if (isComplete) {
        stopPolling();

        if (progressData.status === 'completed' && onComplete) {
          onComplete(progressData);
        } else if (
          (progressData.status === 'failed' ||
            progressData.status === 'partial_failed') &&
          onError
        ) {
          onError(progressData.error_message || 'Generation failed');
        }
      }

      // Update individual area statuses (incremental display)
      progressData.areas.forEach((area: any) => {
        if (area.status === 'completed' && area.image_url) {
          // Area completed - show result immediately (v2 behavior)
          updateAreaStatus(generationId, area.id, area.status, area.progress);
        }
      });
    } catch (error) {
      console.error('Polling error:', error);
      stopPolling();
      if (onError) {
        onError(
          error instanceof Error ? error.message : 'Failed to fetch progress'
        );
      }
    }
  }, [
    generationId,
    setCurrentGeneration,
    updateAreaStatus,
    stopPolling,
    onComplete,
    onError,
  ]);

  // Start polling when enabled and generationId exists
  useEffect(() => {
    if (!enabled || !generationId) {
      stopPolling();
      return;
    }

    // Initial fetch
    pollProgress();

    // Set up 2-second polling interval (v2 standard)
    pollIntervalRef.current = setInterval(pollProgress, 2000);

    // Cleanup on unmount
    return () => {
      stopPolling();
    };
  }, [enabled, generationId, pollProgress, stopPolling]);

  return {
    isPolling: !!pollIntervalRef.current,
    stopPolling,
    currentGeneration,
  };
}

/**
 * Hook for automatic result recovery on page load (v2 enhancement)
 *
 * Checks localStorage for active generation and resumes polling.
 * This allows users to refresh the page without losing progress.
 */
export function useGenerationRecovery() {
  const { currentGeneration, clearCurrentGeneration } = useGenerationStore();

  useEffect(() => {
    // Check if there's an active generation in localStorage
    if (currentGeneration && currentGeneration.status !== 'completed') {
      console.log(
        'Recovered active generation from localStorage:',
        currentGeneration.generation_id
      );
      // The useGenerationPolling hook will automatically start polling
      // when it detects a currentGeneration with a non-completed status
    }
  }, []); // Run once on mount

  const clearRecoveredGeneration = useCallback(() => {
    clearCurrentGeneration();
  }, [clearCurrentGeneration]);

  return {
    recoveredGeneration: currentGeneration,
    hasRecoveredGeneration:
      !!currentGeneration && currentGeneration.status !== 'completed',
    clearRecoveredGeneration,
  };
}
