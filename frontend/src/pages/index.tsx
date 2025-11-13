/**
 * Homepage - Main Yarda App
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
import BeforeAfterSlider from '@/components/BeforeAfterSlider';
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

export default function Home() {
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
  const [geocodedAddress, setGeocodedAddress] = useState<string | undefined>(undefined);
  const [geocodingAccuracy, setGeocodingAccuracy] = useState<string | undefined>(undefined);

  // Showcase examples state
  const [activeExample, setActiveExample] = useState(0);
  const examples = [
    {
      title: 'Front Yard',
      before: '/images/yarda_main_before.jpeg',
      after: '/images/yarda_main_after.png',
      description: 'Modern landscaping with native plants'
    },
    {
      title: 'Backyard',
      before: '/images/backyard_before.jpeg',
      after: '/images/backyard_after.png',
      description: 'Complete backyard transformation'
    },
    {
      title: 'Entryway',
      before: '/images/entryway_before.jpeg',
      after: '/images/entryway_after.png',
      description: 'Professional walkway design'
    }
  ];

  // Refs for cleanup and scrolling
  const cleanupRef = useRef<(() => void) | null>(null);
  const progressRef = useRef<HTMLDivElement>(null);
  const resultsRef = useRef<HTMLDivElement>(null);

  // No auth guard on home page - show marketing to everyone, app to authenticated users
  // Home page is public landing page for all users

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
      console.log('[Home] Recovering generation:', recovery.requestId);
      handleGenerationStart(recovery.requestId);
    }
  }, [_hasHydrated]);

  /**
   * Handle generation start
   * Called from form submission
   */
  const handleGenerationStart = (generationId: string) => {
    console.log('[Home] Starting generation:', generationId);

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
        console.log('[Home] Polling progress update:', response);

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
        console.log('[Home] Generation completed:', response);

        if (!response.areas) return;

        // Capture geocoding information
        setGeocodedAddress(response.geocoded_address);
        setGeocodingAccuracy(response.geocoding_accuracy);

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
        console.error('[Home] Polling error:', err);

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
        console.warn('[Home] Polling timeout after 5 minutes');

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

    console.log('[Home] Retrying generation:', pollingRequestId);

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
    console.log('[Home] Starting new generation');

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
    setGeocodedAddress(undefined);
    setGeocodingAccuracy(undefined);
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

  const isGenerating = generationPhase === 'progress';
  const hasResults = generationPhase === 'results';

  return (
    <div className="min-h-screen bg-gradient-to-br from-sage-50 via-white to-earth-50">
      <Head>
        <title>Yarda AI Landscape Studio - Transform Your Yard with AI</title>
        <meta
          name="description"
          content="Create professional AI-powered landscape designs in minutes. Get unlimited designs with subscription or pay per generation."
        />
        <meta property="og:title" content="Yarda AI Landscape Studio" />
        <meta property="og:description" content="Transform your landscape with AI-powered design in minutes" />
      </Head>

      {/* Navigation with user profile icon */}
      <Navigation transparent={!isGenerating && !hasResults} />

      {/* Credits/Balance Bar - Only show to authenticated users */}
      {isAuthenticated && (
        <div className="bg-white/80 backdrop-blur border-b border-gray-200 px-6 py-3 mt-16 sticky top-16 z-40">
          <div className="max-w-7xl mx-auto flex items-center justify-end gap-4">
            <TokenBalance variant="compact" autoRefresh={true} />
            <div data-testid="trial-counter">
              <TrialCounter variant="compact" />
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="relative overflow-hidden">
        {/* Background decorations */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -top-40 -right-32 w-80 h-80 bg-sage-200 rounded-full opacity-20 blur-3xl"></div>
          <div className="absolute -bottom-40 -left-32 w-80 h-80 bg-earth-200 rounded-full opacity-20 blur-3xl"></div>
        </div>

        {/* Main content wrapper */}
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 space-y-12">
          {/* HERO SECTION - Only show to non-authenticated users or when not generating */}
          {!isGenerating && !hasResults && !isAuthenticated && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8 }}
              className="text-center space-y-8 mb-16 pt-8"
            >
              {/* Badge */}
              <div className="inline-flex items-center space-x-2 bg-sage-100 text-sage-700 px-4 py-2 rounded-full text-sm font-medium mx-auto">
                <span>✨ AI-Powered Landscape Design</span>
              </div>

              {/* Main heading */}
              <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold text-sage-800 leading-tight">
                Transform Your
                <span className="block gradient-text">
                  Outdoor Space
                </span>
              </h1>

              {/* Subtitle */}
              <p className="text-xl md:text-2xl text-sage-600 max-w-3xl mx-auto leading-relaxed">
                Professional landscape visualization powered by advanced AI.
                See your property's potential with stunning before and after transformations.
              </p>

              {/* Features */}
              <motion.div
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 0.2 }}
                className="flex flex-wrap justify-center gap-6 mt-12"
              >
                {[
                  { icon: '⚡', text: 'Instant Results', desc: '2-3 minutes' },
                  { icon: '🎨', text: 'Multiple Styles', desc: '3 design options' },
                  { icon: '✨', text: 'AI Powered', desc: 'Professional quality' },
                ].map((feature, index) => (
                  <div
                    key={index}
                    className="flex items-center space-x-3 bg-white/60 backdrop-blur-sm px-4 py-3 rounded-lg border border-sage-200"
                  >
                    <span className="text-xl">{feature.icon}</span>
                    <div className="text-left">
                      <p className="font-semibold text-sage-800 text-sm">{feature.text}</p>
                      <p className="text-sage-600 text-xs">{feature.desc}</p>
                    </div>
                  </div>
                ))}
              </motion.div>

              {/* CTA Buttons */}
              <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
                <a
                  href="/register"
                  className="px-8 py-4 bg-sage-600 hover:bg-sage-700 text-white font-semibold rounded-lg transition-all transform hover:scale-105 shadow-lg"
                >
                  Get Started Free →
                </a>
                <a
                  href="/pricing"
                  className="px-8 py-4 bg-white hover:bg-sage-50 text-sage-600 font-semibold rounded-lg border-2 border-sage-200 transition"
                >
                  View Pricing
                </a>
              </div>
            </motion.div>
          )}

        {/* SHOWCASE SECTION - Before/After Slider */}
        {!isGenerating && !hasResults && (
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, delay: 0.4 }}
            className="mt-16"
          >
            {isAuthenticated ? (
              <div className="mb-8 text-center">
                <h2 className="text-3xl sm:text-4xl font-bold text-sage-800 mb-3">
                  See the Transformation
                </h2>
                <p className="text-lg text-sage-600 max-w-2xl mx-auto">
                  Explore what AI can do with your landscape
                </p>
              </div>
            ) : null}

            {/* Example selector tabs */}
            <div className="flex justify-center gap-4 mb-8">
              {examples.map((example, index) => (
                <button
                  key={index}
                  onClick={() => setActiveExample(index)}
                  className={`px-6 py-3 rounded-lg font-medium transition-all ${
                    activeExample === index
                      ? 'bg-sage-600 text-white shadow-lg scale-105'
                      : 'bg-white text-sage-600 hover:bg-sage-50 border border-sage-200'
                  }`}
                >
                  {example.title}
                </button>
              ))}
            </div>

            <div className="max-w-4xl mx-auto">
              <div className="bg-white rounded-2xl shadow-2xl border border-sage-200 p-4 sm:p-6 overflow-hidden">
                <div className="aspect-video rounded-lg overflow-hidden relative">
                  <BeforeAfterSlider
                    beforeImage={examples[activeExample].before}
                    afterImage={examples[activeExample].after}
                    beforeAlt={`${examples[activeExample].title} before AI transformation`}
                    afterAlt={`${examples[activeExample].title} after AI transformation`}
                  />

                  {/* BEFORE/AFTER labels */}
                  <div className="absolute top-4 left-4 bg-red-500 text-white px-3 py-1 rounded-md text-xs font-bold shadow-lg z-10 pointer-events-none">
                    BEFORE
                  </div>
                  <div className="absolute top-4 right-4 bg-sage-600 text-white px-3 py-1 rounded-md text-xs font-bold shadow-lg z-10 pointer-events-none">
                    AFTER
                  </div>
                </div>

                <div className="mt-6 text-center space-y-2">
                  <p className="text-sage-800 font-semibold text-lg">
                    {examples[activeExample].title} Transformation
                  </p>
                  <p className="text-sage-600 text-sm">
                    {examples[activeExample].description}
                  </p>
                  <p className="text-xs text-sage-500 mt-2">
                    💡 Drag the slider to compare before and after
                  </p>
                </div>
              </div>
            </div>

            {!isAuthenticated && (
              <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-6">
                <motion.div
                  whileHover={{ y: -5 }}
                  className="bg-white/60 backdrop-blur-sm rounded-xl p-8 border border-sage-200 shadow-lg hover:shadow-xl transition"
                >
                  <div className="text-4xl font-bold mb-3">⚡</div>
                  <h3 className="text-xl font-semibold text-sage-800 mb-2">Instant Results</h3>
                  <p className="text-sage-600">Advanced AI generates professional landscape designs in 2-3 minutes</p>
                </motion.div>
                <motion.div
                  whileHover={{ y: -5 }}
                  className="bg-white/60 backdrop-blur-sm rounded-xl p-8 border border-sage-200 shadow-lg hover:shadow-xl transition"
                >
                  <div className="text-4xl font-bold mb-3">🎨</div>
                  <h3 className="text-xl font-semibold text-sage-800 mb-2">Multiple Styles</h3>
                  <p className="text-sage-600">Get 3 different design options to compare and choose your favorite</p>
                </motion.div>
                <motion.div
                  whileHover={{ y: -5 }}
                  className="bg-white/60 backdrop-blur-sm rounded-xl p-8 border border-sage-200 shadow-lg hover:shadow-xl transition"
                >
                  <div className="text-4xl font-bold mb-3">✨</div>
                  <h3 className="text-xl font-semibold text-sage-800 mb-2">AI Powered</h3>
                  <p className="text-sage-600">Professional quality designs powered by advanced artificial intelligence</p>
                </motion.div>
              </div>
            )}
          </motion.div>
        )}

        {/* FORM SECTION - Only visible to authenticated users */}
        {isAuthenticated && (
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
        )}

        {/* Sign In Prompt - Show to unauthenticated users after showcase */}
        {!isAuthenticated && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.2 }}
            className="bg-gradient-to-r from-sage-600 to-sage-700 rounded-2xl p-12 sm:p-16 text-center text-white shadow-2xl my-16"
          >
            <h2 className="text-4xl sm:text-5xl font-bold mb-4 leading-tight">
              Start Designing Your Dream Landscape Today
            </h2>
            <p className="text-lg sm:text-xl mb-8 opacity-90 max-w-2xl mx-auto">
              Get 3 free trial credits and start transforming your outdoor space with AI in minutes.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <a
                href="/register"
                className="px-8 py-4 bg-white hover:bg-gray-100 text-sage-600 font-bold rounded-lg transition-all transform hover:scale-105 inline-block"
              >
                Get Started Free
              </a>
              <a
                href="/login"
                className="px-8 py-4 bg-white/20 hover:bg-white/30 text-white font-bold rounded-lg border-2 border-white transition backdrop-blur"
              >
                Sign In
              </a>
            </div>
            <p className="text-sm opacity-75 mt-6">No credit card required • 3 free generations included</p>
          </motion.div>
        )}

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
                geocodedAddress={geocodedAddress}
                geocodingAccuracy={geocodingAccuracy}
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
      </div>

      {/* Debug Panel (Admin Only) */}
      <DebugPanel isAdmin={true} generationId={pollingRequestId || undefined} />
    </div>
  );
}
