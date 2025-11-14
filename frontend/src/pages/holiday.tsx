'use client';

/**
 * Holiday Decorator Page
 *
 * Main entry point for holiday decoration generation feature.
 * Single-page flow: form → generation → results (no navigation).
 *
 * Components:
 * - Address search input with autocomplete
 * - StreetViewRotator for angle selection
 * - StyleSelector for decoration style choice
 * - Credit badge display
 * - Generate button with validation
 * - Inline progress tracking (polling)
 * - Inline results display with download
 *
 * Credit Management:
 * - Uses unified CreditSyncManager for automatic 15-second refresh
 * - Credits synced from userStore (automatically updated by CreditSyncManager)
 * - Manual refresh on 403 errors for immediate feedback
 * - No manual localStorage management needed
 *
 * Feature: 007-holiday-decorator (T032)
 * User Story 1: New User Discovery & First Generation
 *
 * Build: 2025-11-11 (cache bust)
 */

import React, { useState, useRef, useEffect } from 'react';
import Head from 'next/head';
import { Share2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

import { useUserStore } from '@/store/userStore';
import { holidayAPI } from '@/lib/api';
import { useCredits } from '@/lib/creditSync';
import HolidayHero from '@/components/HolidayHero';
import StreetViewRotator from '@/components/StreetViewRotator';
import StyleSelector, { HolidayStyle } from '@/components/StyleSelector';
import { AuthOptions } from '@/components/auth/AuthOptions';
import SocialShareModal from '@/components/holiday/SocialShareModal';
import BounceLoadingIcon from '@/components/BounceLoadingIcon';

/**
 * Maps generation status to user-friendly display text
 */
function getStatusDisplay(status: string | null): string {
  if (!status) return '';
  const statusMap: Record<string, string> = {
    'pending': 'Tinkering',
    'processing': 'Processing',
    'completed': 'Completed',
    'failed': 'Failed',
  };
  return statusMap[status] || status;
}

export default function HolidayDecoratorPage() {
  const { user, isAuthenticated, _hasHydrated } = useUserStore();

  // Initialize unified credit sync (auto-refreshes every 15 seconds)
  const { refresh: refreshCredits } = useCredits();

  // Form state
  const [address, setAddress] = useState<string>('');
  const [heading, setHeading] = useState<number>(180);
  const [streetOffsetFeet, setStreetOffsetFeet] = useState<number>(0);
  const [selectedStyle, setSelectedStyle] = useState<HolidayStyle | null>(null);

  // Credit state (synced from userStore via CreditSyncManager)
  const credits = user?.holiday_credits ?? 0;

  // Generation state
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationId, setGenerationId] = useState<string | null>(null);
  const [generationStatus, setGenerationStatus] = useState<string | null>(null);
  const [generationError, setGenerationError] = useState<string | null>(null);

  // Share modal state
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);

  // Results state
  const [originalImageUrl, setOriginalImageUrl] = useState<string | null>(null);
  const [decoratedImageUrl, setDecoratedImageUrl] = useState<string | null>(null);
  const [beforeAfterImageUrl, setBeforeAfterImageUrl] = useState<string | null>(null);

  // Credit animation state
  const [showCreditAnimation, setShowCreditAnimation] = useState(false);

  // Polling cleanup ref (prevent memory leak when unmounting during polling)
  const pollingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Cleanup polling timeout on unmount
  useEffect(() => {
    return () => {
      if (pollingTimeoutRef.current) {
        clearTimeout(pollingTimeoutRef.current);
      }
    };
  }, []);

  // Validation
  const canGenerate = isAuthenticated && address.trim() !== '' && selectedStyle !== null && credits > 0 && !isGenerating;

  const handleGenerate = async () => {
    if (!canGenerate) return;

    setIsGenerating(true);
    setGenerationError(null);
    setGenerationStatus('pending');

    try {
      const response = await holidayAPI.createGeneration({
        address,
        heading,
        pitch: 0,
        style: selectedStyle!,
        street_offset_feet: streetOffsetFeet || undefined, // Only include if non-zero
      });

      setGenerationId(response.id);
      setGenerationStatus(response.status);

      // Credits are automatically updated by CreditSyncManager via backend response
      // No manual sync needed - setBalances() handles everything

      // Start polling for status
      pollGenerationStatus(response.id);
    } catch (error) {
      console.error('Generation failed:', error);

      // Type-safe error handling
      const axiosError = error as any; // TODO: import AxiosError type
      // If 403 (insufficient credits), immediately refresh from backend
      if (axiosError.response?.status === 403) {
        await refreshCredits(); // Unified credit sync handles all credit types
      }

      setGenerationError(axiosError.response?.data?.detail?.message || 'Generation failed. Please try again.');
      setIsGenerating(false);
      setGenerationStatus(null);
    }
  };

  const pollGenerationStatus = async (genId: string) => {
    const maxPolls = 60; // 2 minutes max (2-second intervals)
    const pollIntervalMs = 2000;
    let pollCount = 0;

    const poll = async () => {
      try {
        const response = await holidayAPI.getGeneration(genId);

        setGenerationStatus(response.status);
        setOriginalImageUrl(response.original_image_url || null);
        setDecoratedImageUrl(response.decorated_image_url || null);
        setBeforeAfterImageUrl(response.before_after_image_url || null);

        if (response.status === 'completed') {
          // Success!
          setIsGenerating(false);
          pollingTimeoutRef.current = null;
          return;
        } else if (response.status === 'failed') {
          // Failed
          setGenerationError(response.error_message || 'Generation failed');
          setIsGenerating(false);
          pollingTimeoutRef.current = null;
          return;
        } else if (pollCount >= maxPolls) {
          // Timeout
          setGenerationError('Generation timeout. Please try again.');
          setIsGenerating(false);
          pollingTimeoutRef.current = null;
          return;
        }

        // Still processing, poll again
        pollCount++;
        pollingTimeoutRef.current = setTimeout(poll, pollIntervalMs);
      } catch (error) {
        console.error('Polling error:', error);
        setGenerationError('Failed to check generation status');
        setIsGenerating(false);
        pollingTimeoutRef.current = null;
      }
    };

    poll();
  };

  const resetForm = () => {
    setAddress('');
    setHeading(180);
    setStreetOffsetFeet(0);
    setSelectedStyle(null);
    setGenerationId(null);
    setGenerationStatus(null);
    setGenerationError(null);
    setOriginalImageUrl(null);
    setDecoratedImageUrl(null);
    setBeforeAfterImageUrl(null);
    setIsGenerating(false);
  };

  // Wait for hydration before checking auth
  if (!_hasHydrated) {
    return (
      <div className="min-h-screen bg-background-light dark:bg-background-dark flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-text-light dark:text-text-dark">Loading...</p>
        </div>
      </div>
    );
  }

  // Auth gate
  if (!isAuthenticated) {
    return (
      <>
        <Head>
          <title>Holiday Decorator | Yarda AI</title>
        </Head>

        <div className="min-h-screen bg-background-light dark:bg-background-dark">
          <HolidayHero />

          {/* Sign-in prompt */}
          <div
            id="holiday-login"
            className="max-w-md mx-auto mt-12 p-10 bg-gradient-to-br from-white to-blue-50 dark:from-gray-800 dark:to-gray-900 rounded-3xl shadow-2xl border-2 border-blue-200 dark:border-blue-700"
          >
            <AuthOptions
              redirectTo="/holiday"
              title="Sign in to Get Started"
              subtitle="Transform your home into a winter wonderland! New users get 1 free credit. 🎄"
            />
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <Head>
        <title>Holiday Decorator | Yarda AI</title>
      </Head>

      <div className="min-h-screen bg-background-light dark:bg-background-dark">
        {/* Holiday Hero - Entry Point with integrated before/after slider */}
        <AnimatePresence mode="popLayout">
          {!generationStatus && (
            <motion.div
              key="holiday-hero"
              initial={{ opacity: 1, y: 0 }}
              exit={{
                opacity: 0,
                y: -100,
                transition: { duration: 0.6, ease: 'easeIn' }
              }}
            >
              <HolidayHero />
            </motion.div>
          )}
        </AnimatePresence>

        <div className="max-w-6xl mx-auto px-4 py-12">
          {/* Main content - Form right after hero for prominence */}
          {!generationStatus && (
            <div className="space-y-8">
              {/* Premium Header Section */}
              <div className="flex items-center justify-between mb-8">
                <div>
                  <h2 className="font-display text-4xl font-bold text-text-light dark:text-text-dark mb-1 tracking-tight">
                    ✨ Create Your Holiday Design
                  </h2>
                  <p className="text-lg text-subtle-light dark:text-subtle-dark font-light">Decorate your home in seconds with AI magic</p>
                </div>

                {/* Credit badge - premium red theme */}
                <div
                  data-testid="credit-display"
                  className="px-6 py-3 bg-gradient-to-r from-red-50 to-red-100 dark:from-red-950 dark:to-red-900 rounded-full border-2 border-primary hover:border-primary/80 transition-all shadow-md dark:shadow-card-dark"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-3xl">🎁</span>
                    <div className="text-right">
                      <p className="text-xs font-semibold text-primary tracking-widest uppercase">Credits</p>
                      <p className="text-2xl font-bold text-primary">
                        {credits}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Premium Address Input - Ultra-thin design */}
              <div className="bg-gradient-to-b from-surface-light to-background-light dark:from-surface-dark dark:to-background-dark rounded-2xl p-1 shadow-card dark:shadow-card-dark border border-gray-200 dark:border-gray-700 hover:border-primary/30 transition-all">
                <div className="bg-surface-light dark:bg-surface-dark rounded-xl p-8 space-y-4">
                  <div className="flex items-baseline gap-3">
                    <span className="text-4xl">📍</span>
                    <div>
                      <label htmlFor="address" className="block text-sm font-semibold text-text-light dark:text-text-dark uppercase tracking-widest mb-1">
                        Home Address
                      </label>
                      <p className="text-xs text-subtle-light dark:text-subtle-dark">Let's find your home and add some holiday magic</p>
                    </div>
                  </div>

                  <input
                    id="address"
                    name="address"
                    type="text"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder="Enter your address..."
                    className="w-full px-6 py-3.5 border border-gray-200 dark:border-gray-700 dark:bg-surface-dark dark:text-text-dark rounded-lg focus:border-primary focus:ring-2 focus:ring-primary/10 focus:outline-none text-base font-light placeholder-subtle-light dark:placeholder-subtle-dark transition-all"
                    disabled={isGenerating}
                  />

                  <div className="flex items-center gap-2 text-xs text-subtle-light dark:text-subtle-dark font-light">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Google Street View will be pulled automatically
                  </div>
                </div>
              </div>

              {/* Street View rotator (shown after address entered) - Premium card */}
              {address && (
                <div className="bg-gradient-to-b from-surface-light to-background-light dark:from-surface-dark dark:to-background-dark rounded-2xl p-1 shadow-card dark:shadow-card-dark border border-gray-200 dark:border-gray-700 hover:border-primary/30 transition-all">
                  <div className="bg-surface-light dark:bg-surface-dark rounded-xl p-8">
                    <StreetViewRotator
                      address={address}
                      initialHeading={heading}
                      onHeadingChange={setHeading}
                      disabled={isGenerating}
                    />
                  </div>
                </div>
              )}

              {/* Style selector - Premium card */}
              <div className="bg-gradient-to-b from-surface-light to-background-light dark:from-surface-dark dark:to-background-dark rounded-2xl p-1 shadow-card dark:shadow-card-dark border border-gray-200 dark:border-gray-700 hover:border-primary/30 transition-all">
                <div className="bg-surface-light dark:bg-surface-dark rounded-xl p-8">
                  <StyleSelector
                    selectedStyle={selectedStyle}
                    onStyleChange={setSelectedStyle}
                    disabled={isGenerating}
                  />
                </div>
              </div>

              {/* Error message - Premium minimal design */}
              {generationError && (
                <div
                  data-testid="error-message"
                  className="p-4 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/50 rounded-xl backdrop-blur-sm"
                >
                  <p className="text-red-700 dark:text-red-200 font-light flex items-center gap-2">
                    <span className="text-lg">⚠️</span>
                    {generationError}
                  </p>
                </div>
              )}

              {/* Premium Generate Button - Festive Red */}
              <div className="flex justify-center pt-4">
                <button
                  onClick={handleGenerate}
                  disabled={!canGenerate}
                  className={`
                    px-16 py-4 rounded-xl text-lg font-bold tracking-wide
                    transition-all duration-300 group
                    ${
                      canGenerate
                        ? 'bg-gradient-to-r from-primary to-red-600 text-white hover:from-red-700 hover:to-red-700 shadow-lg hover:shadow-2xl hover:shadow-primary/30'
                        : 'bg-gray-300 dark:bg-gray-700 text-gray-500 dark:text-gray-400 cursor-not-allowed'
                    }
                  `}
                >
                  <span className="flex items-center justify-center gap-2">
                    <span className="text-xl group-hover:scale-110 transition-transform">
                      {isGenerating ? '⏳' : '🎄'}
                    </span>
                    {isGenerating ? 'Creating Magic...' : 'Generate Decoration'}
                  </span>
                </button>
              </div>

              {credits === 0 && (
                <div data-testid="error-message" className="p-4 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/50 rounded-xl backdrop-blur-sm text-center">
                  <p className="text-amber-700 dark:text-amber-200 font-light flex items-center justify-center gap-2">
                    <span className="text-lg">✨</span>
                    Earn more credits by sharing your decorated home!
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Progress tracking (inline) - Premium waiting experience */}
          {generationStatus && generationStatus !== 'completed' && generationStatus !== 'failed' && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              data-testid="generation-progress"
              className="w-full max-w-3xl mx-auto"
            >
              <div className="space-y-6">
                {/* Headline */}
                <div className="text-center space-y-2">
                  <h2 className="text-3xl md:text-4xl font-bold text-text-light dark:text-text-dark">
                    ✨ Decorating Your Home... 🎄
                  </h2>
                  <p className="text-subtle-light dark:text-subtle-dark font-light">
                    AI is working its magic on your home
                  </p>
                </div>

                {/* Premium Image Card with Processing Overlay */}
                <div className="relative rounded-3xl overflow-hidden shadow-2xl bg-gray-900" style={{ minHeight: '300px' }}>
                  {/* Original image displayed while waiting (if available) */}
                  {originalImageUrl && (
                    <img
                      src={originalImageUrl}
                      alt="Original before decoration"
                      className="w-full h-auto object-cover"
                      style={{ maxHeight: '500px' }}
                    />
                  )}

                  {/* Processing Overlay */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent">
                    <BounceLoadingIcon icon="🎄" className="text-8xl" />
                  </div>

                  {/* Status Badge - Bottom Right */}
                  <div className="absolute bottom-4 right-4">
                    <div className="bg-black/70 backdrop-blur-md rounded-lg px-4 py-2 border border-white/20">
                      <p className="text-sm text-white font-bold flex items-center gap-2">
                        ⚡ Generating...
                      </p>
                    </div>
                  </div>
                </div>

                {/* Status Text */}
                <div className="text-center space-y-3 border-t border-gray-200 dark:border-gray-700 pt-6">
                  <p className="text-text-light dark:text-text-dark font-medium">
                    Status: <span className="text-primary font-bold">{getStatusDisplay(generationStatus)}</span>
                  </p>
                  <p className="text-sm text-subtle-light dark:text-subtle-dark font-light">
                    Creating your decorated version... (this usually takes 10-15 seconds)
                  </p>
                </div>
              </div>
            </motion.div>
          )}

          {/* Results display (inline) - New premium card design */}
          {generationStatus === 'completed' && decoratedImageUrl && (
            <div
              data-testid="generation-results"
              className="min-h-screen flex flex-col items-center justify-center py-8"
            >
              {/* Main results card */}
              <div className="w-full max-w-2xl space-y-8">
                {/* Headline */}
                <div className="text-center space-y-2">
                  <h2 className="text-4xl md:text-5xl font-bold text-text-light dark:text-text-dark">
                    ✨ Your Holiday Decorated Home!
                  </h2>
                </div>

                {/* Image card with share button overlay */}
                <div className="relative group rounded-3xl overflow-hidden shadow-2xl">
                  {/* Main decorated image */}
                  <img
                    data-testid="decorated-image"
                    src={decoratedImageUrl}
                    alt="Your Decorated Home"
                    className="w-full h-auto rounded-3xl object-cover"
                  />

                  {/* Share button overlay - top right */}
                  <button
                    onClick={() => setIsShareModalOpen(true)}
                    className="absolute top-6 right-6 p-4 bg-white/90 hover:bg-white rounded-full shadow-lg hover:shadow-xl transition transform hover:scale-110 flex items-center justify-center backdrop-blur-sm"
                    title="Share your decorated home & earn credit"
                  >
                    <Share2 className="w-6 h-6 text-gray-800" />
                  </button>
                </div>

                {/* Before/After comparison (optional, collapsed) */}
                {beforeAfterImageUrl && (
                  <details className="w-full">
                    <summary className="cursor-pointer text-center text-text-light dark:text-text-dark font-semibold hover:text-primary transition">
                      📊 View Before & After Comparison
                    </summary>
                    <div className="mt-4 rounded-2xl overflow-hidden shadow-lg">
                      <img
                        data-testid="before-after-image"
                        src={beforeAfterImageUrl}
                        alt="Before and After Comparison"
                        className="w-full"
                      />
                    </div>
                  </details>
                )}

                {/* Action button - Primary CTA is "New Design" */}
                <button
                  onClick={resetForm}
                  className="w-full py-4 px-8 bg-gradient-to-r from-primary to-red-600 hover:from-red-700 hover:to-red-700 text-white font-bold text-lg rounded-2xl shadow-lg hover:shadow-xl transition transform hover:scale-105"
                >
                  <span className="flex items-center justify-center gap-3">
                    <span>✨</span>
                    New Design
                    <span>✨</span>
                  </span>
                </button>

                {/* Share prompt */}
                <div className="p-6 bg-gradient-to-r from-accent-light/30 to-accent-dark/30 dark:from-accent-dark/20 dark:to-accent-light/20 border-2 border-accent-light dark:border-accent-dark rounded-2xl">
                  <p className="text-center text-text-light dark:text-text-dark font-semibold text-lg">
                    💡 Share your magical home to earn more credits!
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Social Share Modal */}
      {generationId && decoratedImageUrl && (
        <SocialShareModal
          isOpen={isShareModalOpen}
          onClose={() => setIsShareModalOpen(false)}
          generationId={generationId}
          imageUrl={decoratedImageUrl}
          onShareComplete={() => {
            // Show credit animation
            setShowCreditAnimation(true);
            // Refresh credits after successful share
            refreshCredits();
            setIsShareModalOpen(false);
            // Hide animation after 2 seconds
            setTimeout(() => setShowCreditAnimation(false), 2000);
          }}
        />
      )}

      {/* Credit Animation - Floats up when credit is earned */}
      {showCreditAnimation && (
        <motion.div
          initial={{ opacity: 0, y: 100, scale: 0.5 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -100, scale: 0.5 }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
          className="fixed bottom-10 left-1/2 -translate-x-1/2 z-50"
        >
          <div className="bg-gradient-to-r from-primary to-red-500 text-white px-8 py-4 rounded-full shadow-2xl font-bold text-lg flex items-center gap-3">
            <span className="text-2xl">⭐</span>
            <span>+1 Credit</span>
            <span className="text-2xl">✨</span>
          </div>
        </motion.div>
      )}
    </>
  );
}
