/**
 * Generate Page - V2 Single-Page Flow (Feature 005)
 *
 * Implements single-page generation experience with inline progress and results.
 * No page navigation - everything happens on one page.
 *
 * User Stories:
 * - US1 (P1): Single-page generation experience
 * - US5 (P1): Backend integration with polling
 *
 * Features:
 * - Form visible at top (can be disabled during generation)
 * - Progress appears inline below form when generation starts
 * - Results appear inline when generation completes
 * - 2-second polling with 5-minute timeout
 * - Network error handling with retry
 * - localStorage recovery for interrupted generations
 */

import React, { useState, useEffect, useRef } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { motion, AnimatePresence } from 'framer-motion';
import { useUserStore } from '@/store/userStore';
import { useGenerationStore } from '@/store/generationStore';
import Navigation from '@/components/Navigation';
import GenerationFormEnhanced from '@/components/generation/GenerationFormEnhanced';
import GenerationProgressInline from '@/components/generation/GenerationProgressInline';
import GenerationResultsInline from '@/components/generation/GenerationResultsInline';
import TokenBalance from '@/components/TokenBalance';
import TrialCounter from '@/components/TrialCounter';
import DebugPanel from '@/components/DebugPanel';
import ErrorRecovery from '@/components/ErrorRecovery';
import {
  pollGenerationStatus,
  type PollingCallbacks,
} from '@/lib/api';
import type {
  AreaResultWithProgress,
} from '@/types/generation';
import { AreaGenerationStatus } from '@/types/generation';
import {
  saveGenerationToLocalStorage,
  clearGenerationFromLocalStorage,
  getGenerationFromLocalStorage,
} from '@/lib/localStorage-keys';
import { useToast } from '@/hooks/useToast';
import {
  createUserFacingError,
  type UserFacingError,
} from '@/lib/error-handling';

export default function GeneratePageV2() {
  const router = useRouter();
  const toast = useToast();
  const { isAuthenticated, _hasHydrated } = useUserStore();
  const {
    address,
    selectedAreas,
    pollingRequestId,
    startPolling,
    updatePollingProgress,
    setPollingError,
    setPollingTimeout,
    stopPolling,
    resetPolling,
    resetForm,
  } = useGenerationStore();

  // Local state for UI phases
  const [generationPhase, setGenerationPhase] = useState<
    'form' | 'progress' | 'results'
  >('form');
  const [areaResults, setAreaResults] = useState<AreaResultWithProgress[]>([]);
  const [overallStatus, setOverallStatus] = useState<'pending' | 'processing' | 'completed' | 'failed' | 'partial'>('pending');
  const [error, setError] = useState<UserFacingError | null>(null);

  // Refs for cleanup and scrolling
  const cleanupRef = useRef<(() => void) | null>(null);
  const progressRef = useRef<HTMLDivElement>(null);
  const resultsRef = useRef<HTMLDivElement>(null);

  // Redirect if not authenticated (but wait for hydration first)
  // Skip redirect in E2E test mode to prevent test flakiness
  useEffect(() => {
    // Check if we're in Playwright E2E test mode (check both window and localStorage)
    const isE2ETest = typeof window !== 'undefined' && (
      (window as any).__PLAYWRIGHT_E2E__ ||
      localStorage.getItem('__PLAYWRIGHT_E2E__') === 'true'
    );

    // Debug logging for E2E tests
    if (isE2ETest) {
      console.log('[generate.tsx] E2E test mode detected, skipping auth redirect');
      console.log('[generate.tsx] Auth state:', {
        _hasHydrated,
        isAuthenticated,
        isE2ETest,
        windowFlag: (window as any).__PLAYWRIGHT_E2E__,
        localStorageFlag: localStorage.getItem('__PLAYWRIGHT_E2E__')
      });
    }

    if (!isE2ETest && _hasHydrated && !isAuthenticated) {
      console.log('[generate.tsx] Redirecting to login:', { isE2ETest, _hasHydrated, isAuthenticated });
      router.push('/login');
    }
  }, [isAuthenticated, _hasHydrated, router]);

  // Cleanup polling on unmount
  useEffect(() => {
    return () => {
      if (cleanupRef.current) {
        cleanupRef.current();
      }
    };
  }, []);

  // Check for recovery on mount
  useEffect(() => {
    if (!_hasHydrated) return;

    const recovery = getGenerationFromLocalStorage();
    if (recovery.requestId && recovery.areas && recovery.address) {
      console.log('[Generate] Recovering generation:', recovery.requestId);
      handleGenerationStart(recovery.requestId);
    }
  }, [_hasHydrated]);

  /**
   * Handle generation start
   * Called from form submission
   */
  const handleGenerationStart = (generationId: string) => {
    console.log('[Generate] Starting generation:', generationId);

    // Save to localStorage for recovery
    saveGenerationToLocalStorage(generationId, selectedAreas, address);

    // Update state
    setGenerationPhase('progress');
    setError(null);
    startPolling(generationId);

    // Show success toast
    toast.success('Generation started! Track progress below.');

    // Initialize area results
    const initialResults: AreaResultWithProgress[] = selectedAreas.map((areaId) => ({
      areaId,
      status: AreaGenerationStatus.Processing,
      imageUrl: null,
      error: null,
      progress: 0,
    }));
    setAreaResults(initialResults);
    setOverallStatus('processing');

    // Scroll to progress section
    setTimeout(() => {
      if (progressRef.current) {
        progressRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }, 100);

    // Setup polling callbacks
    const callbacks: PollingCallbacks = {
      onProgress: (response) => {
        console.log('[Generate] Polling progress update:', response);

        if (!response.areas) return;

        // Update area results
        const updatedResults: AreaResultWithProgress[] = response.areas.map((result: any) => ({
          areaId: result.area_id,
          status: result.status,
          imageUrl: result.image_url,
          sourceImages: result.source_images, // Include source images for hero display
          error: result.error,
          progress: result.status === 'completed' ? 100 : result.status === 'processing' ? 50 : 0,
        }));

        setAreaResults(updatedResults);
        setOverallStatus(response.status as any);

        // Update store
        response.areas.forEach((result: any) => {
          updatePollingProgress(
            result.area_id,
            result.status,
            result.image_url || undefined,
            result.status === 'completed' ? 100 : 50
          );
        });

        // Clear error if recovered
        if (error) {
          setError(null);
        }
      },

      onComplete: (response) => {
        console.log('[Generate] Generation completed:', response);

        if (!response.areas) return;

        // Update to final state
        const finalResults: AreaResultWithProgress[] = response.areas.map((result: any) => ({
          areaId: result.area_id,
          status: result.status,
          imageUrl: result.image_url,
          sourceImages: result.source_images, // Include source images for display
          error: result.error,
          progress: result.status === 'completed' ? 100 : 0,
        }));

        setAreaResults(finalResults);
        setOverallStatus(response.status as any);
        setGenerationPhase('results');

        // Clear localStorage
        clearGenerationFromLocalStorage();
        stopPolling();

        // Show completion toast
        const completedCount = finalResults.filter(r => r.status === 'completed').length;
        const failedCount = finalResults.filter(r => r.status === 'failed').length;

        if (failedCount === 0) {
          toast.success(`Design complete! ${completedCount} area${completedCount > 1 ? 's' : ''} generated.`);
        } else if (completedCount > 0) {
          toast.warning(`Partial success: ${completedCount} completed, ${failedCount} failed.`);
        } else {
          toast.error('Generation failed for all areas.');
        }

        // Scroll to results
        setTimeout(() => {
          if (resultsRef.current) {
            resultsRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }
        }, 100);
      },

      onError: (err) => {
        console.error('[Generate] Polling error:', err);

        // Create user-friendly error
        const userError = createUserFacingError(err);
        setError(userError);
        setPollingError(userError.message);

        // Show toast for network errors (auto-retry happening)
        if (userError.category === 'network') {
          toast.warning('Connection lost. Retrying automatically...');
        } else {
          toast.error(userError.message);
        }

        // Don't stop polling - let timeout handle it
      },

      onTimeout: () => {
        console.warn('[Generate] Polling timeout after 5 minutes');

        setPollingTimeout(true);
        setOverallStatus('failed');
        stopPolling();
        clearGenerationFromLocalStorage();

        // Show timeout toast
        toast.error('Generation took too long. Please try again.');

        // Set timeout error
        setError({
          category: 'unknown' as any,
          message: 'Generation timed out after 5 minutes',
          suggestions: [
            'Try again with a simpler prompt',
            'Select fewer areas to generate',
            'Contact support if this keeps happening',
          ],
          isRetryable: true,
        });
      },
    };

    // Start polling
    const cleanup = pollGenerationStatus(generationId, callbacks);
    cleanupRef.current = cleanup;
  };

  /**
   * Handle retry button on error
   * Restarts polling from current generation ID
   */
  const handleRetry = () => {
    if (!pollingRequestId) return;

    console.log('[Generate] Retrying generation:', pollingRequestId);

    // Clear error state
    setError(null);

    // Show retry toast
    toast.info('Retrying...');

    // Restart polling with current request ID
    handleGenerationStart(pollingRequestId);
  };

  /**
   * Handle "Start New Generation" button
   * Resets everything without page reload
   */
  const handleStartNew = () => {
    console.log('[Generate] Starting new generation');

    // Cleanup polling if still active
    if (cleanupRef.current) {
      cleanupRef.current();
      cleanupRef.current = null;
    }

    // Reset all state
    setGenerationPhase('form');
    setAreaResults([]);
    setOverallStatus('pending');
    setError(null);
    resetPolling();
    resetForm();
    clearGenerationFromLocalStorage();

    // Scroll to top
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Show loading while hydrating from localStorage
  if (!_hasHydrated) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null; // Will redirect
  }

  const isGenerating = generationPhase === 'progress';
  const hasResults = generationPhase === 'results';

  return (
    <div className="min-h-screen bg-gray-50">
      <Head>
        <title>Create Your Design - Yarda</title>
        <meta
          name="description"
          content="Create AI-powered landscape design for your property"
        />
      </Head>

      {/* Navigation with user profile icon */}
      <Navigation />

      {/* Credits/Balance Bar */}
      <div className="bg-white border-b border-gray-200 px-6 py-3 mt-16">
        <div className="max-w-7xl mx-auto flex items-center justify-end gap-4">
          <TokenBalance variant="compact" autoRefresh={true} />
          <div data-testid="trial-counter">
            <TrialCounter variant="compact" />
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-6 py-12 space-y-12">
        {/* FORM SECTION - Always visible, disabled during generation */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <div className="mb-6">
            <h2 className="text-3xl font-bold text-gray-900 mb-2">
              Create Your Landscape Design
            </h2>
            <p className="text-gray-600">
              Enter your property address and choose your design preferences
            </p>
          </div>

          <GenerationFormEnhanced
            onGenerationStart={handleGenerationStart}
          />

          {isGenerating && (
            <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg text-center">
              <p className="text-sm text-blue-800">
                ℹ️ Design creation in progress. Results will appear below.
              </p>
            </div>
          )}
        </motion.div>

        {/* PROGRESS SECTION - Visible during generation */}
        <AnimatePresence>
          {isGenerating && (
            <motion.div
              key="progress-section"
              ref={progressRef}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
            >
              {/* Error Recovery UI */}
              {error && (
                <div className="mb-6">
                  <ErrorRecovery
                    error={error}
                    onRetry={error.isRetryable ? handleRetry : undefined}
                  />
                </div>
              )}

              <GenerationProgressInline
                key="progress-inline"
                areas={areaResults}
                overallStatus={overallStatus as 'pending' | 'processing' | 'completed' | 'failed' | 'partial'}
              />
            </motion.div>
          )}
        </AnimatePresence>

        {/* RESULTS SECTION - Visible when complete */}
        <AnimatePresence>
          {hasResults && (
            <motion.div
              key="results-section"
              ref={resultsRef}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
            >
              <GenerationResultsInline
                areas={areaResults}
                address={address}
                onStartNew={handleStartNew}
              />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Helper Text - Always visible */}
        <div className="text-center text-sm text-gray-500">
          {isGenerating && (
            <p>
              💡 <strong>Tip:</strong> You can safely refresh this page - your progress is
              saved!
            </p>
          )}
          {!isGenerating && !hasResults && (
            <p>Fill out the form above to start generating your landscape design</p>
          )}
        </div>
      </div>

      {/* Debug Panel (Admin Only) */}
      <DebugPanel isAdmin={true} generationId={pollingRequestId || undefined} />
    </div>
  );
}
