/**
 * Generation Progress Page
 *
 * Real-time progress tracking page for landscape generation.
 *
 * Requirements:
 * - T027: Display real-time generation progress
 * - T028: localStorage progress recovery on page refresh
 * - T029: Display completed design with image_url
 * - FR-009: Real-time progress tracking
 * - FR-012: Progress persists across page refresh
 *
 * Features:
 * - Real-time polling with 2-second intervals
 * - Progress recovery from localStorage
 * - Per-area status display
 * - Completed design preview
 * - Error handling and refund notifications
 */

import React, { useEffect, useState } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { useUserStore } from '@/store/userStore';
import { useGenerationStore } from '@/store/generationStore';
import { useGenerationProgress } from '@/hooks/useGenerationProgress';
import GenerationProgress from '@/components/generation/GenerationProgress';

export default function GenerationProgressPage() {
  const router = useRouter();
  const { id } = router.query;
  const { isAuthenticated } = useUserStore();
  const { currentGeneration, clearCurrentGeneration } = useGenerationStore();

  const [showCompletionMessage, setShowCompletionMessage] = useState(false);
  const [showErrorMessage, setShowErrorMessage] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Get generation ID from URL or localStorage
  const generationId = (id as string) || currentGeneration?.generation_id;

  // Use polling hook
  const { generation, isPolling, error } = useGenerationProgress({
    generationId: generationId || '',
    enabled: !!generationId,
    onComplete: () => {
      setShowCompletionMessage(true);
    },
    onError: (err) => {
      setShowErrorMessage(true);
      setErrorMessage(err);
    },
  });

  // Redirect if not authenticated
  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/login');
    }
  }, [isAuthenticated, router]);

  // Redirect if no generation ID
  useEffect(() => {
    if (!generationId) {
      router.push('/generate');
    }
  }, [generationId, router]);

  // Handle page unload - keep generation in localStorage
  useEffect(() => {
    // Don't clear on page refresh - that's the whole point of persistence!
    // Only clear when user explicitly navigates away after completion
  }, []);

  if (!isAuthenticated || !generationId) {
    return null; // Will redirect
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Head>
        <title>Generating Design - Yarda</title>
        <meta name="description" content="Your landscape design is being generated" />
      </Head>

      {/* Navbar */}
      <nav className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <Link href="/" className="text-2xl font-bold text-gray-900">
            Yarda
          </Link>
          <div className="flex items-center gap-4">
            <Link
              href="/generate"
              className="text-sm text-neutral-600 hover:text-brand-green transition-colors"
            >
              New Generation
            </Link>
            <Link
              href="/history"
              className="text-sm text-neutral-600 hover:text-brand-green transition-colors"
            >
              History
            </Link>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-6 py-12">
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
                onClick={() => {
                  clearCurrentGeneration();
                  router.push('/generate');
                }}
                className="px-6 py-3 bg-brand-green hover:bg-brand-dark-green text-white font-semibold rounded-lg transition-colors"
              >
                Generate Another Design
              </button>
              <Link
                href="/history"
                className="px-6 py-3 bg-white border-2 border-neutral-300 hover:border-brand-green text-neutral-900 font-semibold rounded-lg transition-colors"
              >
                View All Designs
              </Link>
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
                onClick={() => {
                  clearCurrentGeneration();
                  router.push('/generate');
                }}
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
      </div>
    </div>
  );
}
