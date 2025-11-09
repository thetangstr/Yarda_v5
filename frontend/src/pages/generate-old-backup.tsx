// @ts-nocheck
/**
 * OLD BACKUP FILE - Replaced by generate.tsx with Feature 005 single-page flow
 *
 * Generate Page
 *
 * Main landscape generation page with inline progress tracking.
 *
 * Requirements:
 * - Feature 004: Generation Flow UI Components
 * - T018-T029: Frontend components for generation flow
 * - FR-028: Landscape generation form
 * - FR-047, FR-048: Authorization hierarchy check
 * - TC-AUTH-1.3: Block generation when trial_remaining=0
 * - TC-UI-1.2: Show TrialExhaustedModal when blocked
 * - UX Enhancement: Show progress inline (no page navigation)
 */

import React, { useState, useRef } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { motion, AnimatePresence } from 'framer-motion';
import { useUserStore } from '@/store/userStore';
import { useGenerationStore } from '@/store/generationStore';
import { useGenerationProgress } from '@/hooks/useGenerationProgress';
import GenerationFormEnhanced from '@/components/generation/GenerationFormEnhanced';
import GenerationProgress from '@/components/generation/GenerationProgress';
import TokenBalance from '@/components/TokenBalance';
import TrialCounter from '@/components/TrialCounter';
import DebugPanel from '@/components/DebugPanel';

export default function GeneratePage() {
  const router = useRouter();
  const { isAuthenticated, _hasHydrated } = useUserStore();
  const { currentGeneration, clearCurrentGeneration } = useGenerationStore();
  const progressRef = useRef<HTMLDivElement>(null);

  // Track if we're showing progress inline
  const [activeGenerationId, setActiveGenerationId] = useState<string | null>(null);
  const [showCompletionMessage, setShowCompletionMessage] = useState(false);
  const [showErrorMessage, setShowErrorMessage] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Use polling hook when we have an active generation
  const { generation, isPolling, error } = useGenerationProgress({
    generationId: activeGenerationId || '',
    enabled: !!activeGenerationId,
    onComplete: () => {
      console.log('[GeneratePage] Generation completed');
      setShowCompletionMessage(true);
    },
    onError: (err) => {
      console.log('[GeneratePage] Generation failed:', err);
      setShowErrorMessage(true);
      setErrorMessage(err);
    },
  });

  // Redirect if not authenticated (but wait for hydration first)
  React.useEffect(() => {
    if (_hasHydrated && !isAuthenticated) {
      router.push('/login');
    }
  }, [isAuthenticated, _hasHydrated, router]);

  // Handle generation start (called from form instead of navigation)
  const handleGenerationStart = (generationId: string) => {
    console.log('[GeneratePage] Starting inline progress for generation:', generationId);
    setActiveGenerationId(generationId);
    setShowCompletionMessage(false);
    setShowErrorMessage(false);
    setErrorMessage(null);

    // Smooth scroll to progress section after state updates
    setTimeout(() => {
      if (progressRef.current) {
        progressRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }, 100);
  };

  // Handle return to form
  const handleReturnToForm = () => {
    console.log('[GeneratePage] Returning to form');
    setActiveGenerationId(null);
    setShowCompletionMessage(false);
    setShowErrorMessage(false);
    setErrorMessage(null);
    clearCurrentGeneration();
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

  // Determine if we're in progress mode
  const isShowingProgress = !!activeGenerationId && !!generation;

  return (
    <div className="min-h-screen bg-gray-50">
      <Head>
        <title>Generate Landscape Design - Yarda</title>
        <meta
          name="description"
          content="Create AI-powered landscape design for your property"
        />
      </Head>

      {/* Navbar */}
      <nav className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900">Yarda</h1>
          <div className="flex items-center gap-4">
            <TokenBalance variant="compact" autoRefresh={true} />
            <div data-testid="trial-counter">
              <TrialCounter variant="compact" />
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-6 py-12">
        <AnimatePresence mode="wait">
          {!isShowingProgress ? (
            // FORM MODE
            <motion.div
              key="form"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
            >
              <div className="mb-8">
                <h2 className="text-3xl font-bold text-gray-900 mb-2">
                  Generate Landscape Design
                </h2>
                <p className="text-gray-600">
                  Enter your property address and choose your design preferences to generate stunning AI-powered landscape designs
                </p>
              </div>

              {/* Generation Form Component */}
              <GenerationFormEnhanced onGenerationStart={handleGenerationStart} />
            </motion.div>
          ) : (
            // PROGRESS MODE
            <motion.div
              ref={progressRef}
              key="progress"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
            >
              <div className="mb-8">
                <h2 className="text-3xl font-bold text-gray-900 mb-2">
                  Generating Your Design
                </h2>
                <p className="text-gray-600">
                  Please wait while we create your AI-powered landscape design
                </p>
              </div>

              {/* Polling Status Indicator */}
              {isPolling && (
                <div className="mb-4 flex items-center justify-center gap-2 text-sm text-neutral-600">
                  <div className="w-2 h-2 bg-brand-green rounded-full animate-pulse" />
                  <span>Live updates enabled</span>
                </div>
              )}

              {/* Error Message (Network/API errors) */}
              {error && !showErrorMessage && (
                <div className="mb-6 p-4 bg-warning-50 border border-warning-200 rounded-lg">
                  <div className="flex items-start gap-3">
                    <svg
                      className="w-5 h-5 text-warning-600 flex-shrink-0 mt-0.5"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path
                        fillRule="evenodd"
                        d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                        clipRule="evenodd"
                      />
                    </svg>
                    <div>
                      <p className="text-sm font-semibold text-warning-800">Connection Issue</p>
                      <p className="text-sm text-warning-700 mt-1">
                        {error}. Still trying to fetch updates...
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Generation Progress Component */}
              {generation ? (
                <GenerationProgress generation={generation} />
              ) : (
                <div className="bg-white rounded-lg shadow-md p-12 text-center">
                  <div className="inline-block">
                    <svg
                      className="animate-spin h-12 w-12 text-brand-green mx-auto"
                      xmlns="http://www.w3.org/2000/svg"
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
                  </div>
                  <p className="text-neutral-600 mt-4">Loading generation status...</p>
                </div>
              )}

              {/* Completion Message */}
              {showCompletionMessage && generation?.status === 'completed' && (
                <div className="mt-8 bg-success-50 border-2 border-success-300 rounded-lg p-6">
                  <div className="flex items-center gap-4 mb-4">
                    <div className="w-12 h-12 bg-success-500 rounded-full flex items-center justify-center flex-shrink-0">
                      <svg className="w-7 h-7 text-white" fill="currentColor" viewBox="0 0 20 20">
                        <path
                          fillRule="evenodd"
                          d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                          clipRule="evenodd"
                        />
                      </svg>
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-success-900">Design Complete!</h3>
                      <p className="text-success-700">Your landscape design is ready to view.</p>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-3">
                    <button
                      onClick={handleReturnToForm}
                      className="px-6 py-3 bg-brand-green hover:bg-brand-dark-green text-white font-semibold rounded-lg transition-colors"
                    >
                      Generate Another Design
                    </button>
                  </div>
                </div>
              )}

              {/* Error Message (Generation failed) */}
              {showErrorMessage && generation?.status === 'failed' && (
                <div className="mt-8 bg-error-50 border-2 border-error-300 rounded-lg p-6">
                  <div className="flex items-center gap-4 mb-4">
                    <div className="w-12 h-12 bg-error-500 rounded-full flex items-center justify-center flex-shrink-0">
                      <svg className="w-7 h-7 text-white" fill="currentColor" viewBox="0 0 20 20">
                        <path
                          fillRule="evenodd"
                          d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 9.586 8.707 8.293z"
                          clipRule="evenodd"
                        />
                      </svg>
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-error-900">Generation Failed</h3>
                      <p className="text-error-700">
                        {errorMessage || 'Your credits/tokens have been automatically refunded.'}
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-3">
                    <button
                      onClick={handleReturnToForm}
                      className="px-6 py-3 bg-brand-green hover:bg-brand-dark-green text-white font-semibold rounded-lg transition-colors"
                    >
                      Try Again
                    </button>
                  </div>
                </div>
              )}

              {/* Helper Text */}
              {generation?.status === 'processing' && (
                <div className="mt-8 p-4 bg-blue-50 border border-blue-200 rounded-lg text-center">
                  <p className="text-sm text-blue-800">
                    💡 <strong>Tip:</strong> You can safely refresh this page - your progress is saved!
                  </p>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Debug Panel (Admin Only) */}
      <DebugPanel isAdmin={true} generationId={activeGenerationId || undefined} />
    </div>
  );
}
