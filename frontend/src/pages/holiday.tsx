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

import React, { useState } from 'react';
import Head from 'next/head';
import { Share2 } from 'lucide-react';

import { useUserStore } from '@/store/userStore';
import { holidayAPI } from '@/lib/api';
import { useCredits } from '@/lib/creditSync';
import HolidayHero from '@/components/HolidayHero';
import StreetViewRotator from '@/components/StreetViewRotator';
import StyleSelector, { HolidayStyle } from '@/components/StyleSelector';
import { AuthOptions } from '@/components/auth/AuthOptions';
import SocialShareModal from '@/components/holiday/SocialShareModal';
import BeforeAfterSlider from '@/components/BeforeAfterSlider';

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
    } catch (error: any) {
      console.error('Generation failed:', error);

      // If 403 (insufficient credits), immediately refresh from backend
      if (error.response?.status === 403) {
        await refreshCredits(); // Unified credit sync handles all credit types
      }

      setGenerationError(error.response?.data?.detail?.message || 'Generation failed. Please try again.');
      setIsGenerating(false);
      setGenerationStatus(null);
    }
  };

  const pollGenerationStatus = async (genId: string) => {
    const maxPolls = 60; // 2 minutes max (2-second intervals)
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
          return;
        } else if (response.status === 'failed') {
          // Failed
          setGenerationError(response.error_message || 'Generation failed');
          setIsGenerating(false);
          return;
        } else if (pollCount >= maxPolls) {
          // Timeout
          setGenerationError('Generation timeout. Please try again.');
          setIsGenerating(false);
          return;
        }

        // Still processing, poll again
        pollCount++;
        setTimeout(poll, 2000);
      } catch (error: any) {
        console.error('Polling error:', error);
        setGenerationError('Failed to check generation status');
        setIsGenerating(false);
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
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
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

        <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50">
          <HolidayHero />

          {/* Sign-in prompt */}
          <div className="max-w-md mx-auto mt-12 p-8 bg-white rounded-xl shadow-lg">
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

      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 py-12">
        <div className="max-w-7xl mx-auto px-4">
          {/* Header with credit badge */}
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-4xl font-bold text-gray-900 mb-2">
                🎄 Holiday Decorator
              </h1>
              <p className="text-gray-600">
                Transform your home into a festive masterpiece
              </p>
            </div>

            {/* Credit badge */}
            <div
              data-testid="credit-display"
              className="px-6 py-3 bg-white rounded-full shadow-lg border-2 border-green-200"
            >
              <div className="flex items-center gap-2">
                <span className="text-2xl">🎁</span>
                <div>
                  <p className="text-xs text-gray-500">Holiday Credits</p>
                  <p className="text-2xl font-bold text-green-600">
                    {credits}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Demo: Before & After Showcase */}
          {!generationStatus && !address && (
            <div className="mb-12 bg-white rounded-xl p-8 shadow-lg border-2 border-green-200">
              <h2 className="text-2xl font-bold text-gray-900 mb-6 text-center">
                ✨ See What's Possible
              </h2>
              <p className="text-center text-gray-600 mb-6 max-w-2xl mx-auto">
                Watch how our AI transforms ordinary homes into festive holiday wonderlands.
                Start by entering your address below to create your own magical transformation!
              </p>

              {/* Demo slider - you can customize these image URLs */}
              <BeforeAfterSlider
                beforeImage="https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=800&h=600&fit=crop"
                afterImage="https://images.unsplash.com/photo-1512156260244-6ac8b4c5e8b2?w=800&h=600&fit=crop"
                beforeAlt="Example home before decoration"
                afterAlt="Example home after AI holiday decoration"
                className="max-w-2xl mx-auto"
              />
            </div>
          )}

          {/* Main content */}
          {!generationStatus && (
            <div className="space-y-8">
              {/* Address input */}
              <div className="bg-white rounded-xl p-6 shadow-lg">
                <label htmlFor="address" className="block text-lg font-semibold text-gray-900 mb-2">
                  Enter Your Home Address
                </label>
                <input
                  id="address"
                  name="address"
                  type="text"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="123 Main St, San Francisco, CA"
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-green-500 focus:outline-none text-lg"
                  disabled={isGenerating}
                />
              </div>

              {/* Street View rotator (shown after address entered) */}
              {address && (
                <StreetViewRotator
                  address={address}
                  initialHeading={heading}
                  onHeadingChange={setHeading}
                  onStreetOffsetChange={setStreetOffsetFeet}
                  disabled={isGenerating}
                />
              )}

              {/* Style selector */}
              <StyleSelector
                selectedStyle={selectedStyle}
                onStyleChange={setSelectedStyle}
                disabled={isGenerating}
              />

              {/* Error message */}
              {generationError && (
                <div
                  data-testid="error-message"
                  className="p-4 bg-red-50 border border-red-200 rounded-lg"
                >
                  <p className="text-red-800">{generationError}</p>
                </div>
              )}

              {/* Generate button */}
              <div className="flex justify-center">
                <button
                  onClick={handleGenerate}
                  disabled={!canGenerate}
                  className={`
                    px-12 py-4 rounded-xl text-xl font-bold
                    transition-all duration-200
                    ${
                      canGenerate
                        ? 'bg-gradient-to-r from-green-500 to-emerald-600 text-white hover:from-green-600 hover:to-emerald-700 shadow-lg hover:shadow-xl transform hover:scale-105'
                        : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    }
                  `}
                >
                  {isGenerating ? 'Generating...' : '🎄 Generate Decoration'}
                </button>
              </div>

              {credits === 0 && (
                <div data-testid="error-message" className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg text-center">
                  <p className="text-yellow-800 font-medium">
                    Insufficient credits! Share your decorated home to earn more. 🎁
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Progress tracking (inline) - Show before image while generating */}
          {generationStatus && generationStatus !== 'completed' && generationStatus !== 'failed' && originalImageUrl && (
            <div
              data-testid="generation-progress"
              className="bg-white rounded-xl p-8 shadow-lg"
            >
              <div className="space-y-6">
                {/* Original image displayed while waiting */}
                <div>
                  <h3 className="text-xl font-semibold text-gray-800 mb-4 text-center">
                    ✨ Decorating Your Home... 🎄
                  </h3>
                  <img
                    src={originalImageUrl}
                    alt="Original before decoration"
                    className="w-full rounded-lg shadow-lg mb-4"
                  />
                </div>

                {/* Loading indicator */}
                <div className="text-center border-t pt-6">
                  <div className="animate-spin w-12 h-12 border-4 border-green-500 border-t-transparent rounded-full mx-auto mb-3" />
                  <p className="text-gray-600 font-medium">
                    Status: <span className="capitalize">{generationStatus}</span>
                  </p>
                  <p className="text-sm text-gray-500 mt-2">
                    Creating your decorated version... (this usually takes 10-15 seconds)
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Results display (inline) - Enlarged generated image with before thumbnail */}
          {generationStatus === 'completed' && decoratedImageUrl && (
            <div
              data-testid="generation-results"
              className="bg-white rounded-xl p-8 shadow-lg"
            >
              <h2 className="text-3xl font-bold text-gray-900 mb-6 text-center">
                ✨ Your Holiday Decorated Home! ✨
              </h2>

              {/* Show before/after comparison with interactive slider */}
              <div className="mb-6">
                <h3 className="text-lg font-semibold text-gray-800 mb-3 text-center">
                  ✨ Before & After Comparison
                </h3>

                {beforeAfterImageUrl ? (
                  /* Use composite before/after image with static display */
                  <img
                    data-testid="before-after-image"
                    src={beforeAfterImageUrl}
                    alt="Before and After Comparison"
                    className="w-full rounded-lg shadow-lg"
                  />
                ) : originalImageUrl && decoratedImageUrl ? (
                  /* Use interactive slider when separate images available */
                  <BeforeAfterSlider
                    beforeImage={originalImageUrl}
                    afterImage={decoratedImageUrl}
                    beforeAlt="Original before decoration"
                    afterAlt="Your decorated home"
                    className="mb-4"
                  />
                ) : (
                  /* Fallback: Show enlarged decorated image only */
                  <img
                    data-testid="decorated-image"
                    src={decoratedImageUrl}
                    alt="Your Decorated Home"
                    className="w-full rounded-lg shadow-lg"
                  />
                )}
              </div>

              {/* Action buttons */}
              <div className="flex gap-4 justify-center items-center">
                <a
                  href={decoratedImageUrl}
                  download
                  className="px-6 py-3 bg-green-500 text-white rounded-lg font-semibold hover:bg-green-600 transition flex items-center gap-2"
                  title="Download your decorated home image"
                >
                  <span>📥</span> Download
                </a>

                {/* Share icon button */}
                <button
                  onClick={() => setIsShareModalOpen(true)}
                  className="p-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition transform hover:scale-110 flex items-center justify-center group relative"
                  title="Share & earn credit"
                  aria-label="Share on social media"
                >
                  <Share2 className="w-6 h-6" />
                  <span className="absolute bottom-full mb-2 bg-gray-900 text-white text-xs px-2 py-1 rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition pointer-events-none">
                    Share & Earn
                  </span>
                </button>

                <button
                  onClick={resetForm}
                  className="px-6 py-3 bg-gray-200 text-gray-700 rounded-lg font-semibold hover:bg-gray-300 transition flex items-center gap-2"
                >
                  <span>🎄</span> New Design
                </button>
              </div>

              {/* Share prompt */}
              <div className="mt-8 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-center text-blue-800 font-medium">
                  💡 Share your decorated home to earn more credits!
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Social Share Modal */}
      {generationId && beforeAfterImageUrl && (
        <SocialShareModal
          isOpen={isShareModalOpen}
          onClose={() => setIsShareModalOpen(false)}
          generationId={generationId}
          imageUrl={beforeAfterImageUrl}
          onShareComplete={() => {
            // Refresh credits after successful share
            refreshCredits();
            setIsShareModalOpen(false);
          }}
        />
      )}
    </>
  );
}
