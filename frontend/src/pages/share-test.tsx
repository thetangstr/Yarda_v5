'use client';

/**
 * Holiday Decorator Share Testing Page
 *
 * Allows testing social media sharing functionality without needing to generate new images.
 * Uses previously generated holiday decorations for share testing.
 *
 * Purpose:
 * - Test social sharing across all 5 platforms (X, Facebook, Instagram, Pinterest, TikTok)
 * - Avoid wasting generation credits during development
 * - Quick platform verification and debugging
 *
 * Features:
 * - Loads user's generation history
 * - Tests all sharing platforms simultaneously
 * - Shows share link generation status for each platform
 * - Displays platform-specific share URLs
 * - Real-time credit feedback
 */

import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { useUserStore } from '@/store/userStore';
import { holidayAPI } from '@/lib/api';
import { SharePlatform } from '@/types/holiday';
import { AlertCircle, Check, Loader, Share2, Copy } from 'lucide-react';

interface TestResult {
  platform: SharePlatform;
  success: boolean;
  shareUrl?: string;
  trackingLink?: string;
  error?: string;
  loading: boolean;
  copied: boolean;
}

export default function ShareTestPage() {
  const router = useRouter();
  const { user, isAuthenticated, _hasHydrated } = useUserStore();

  // Page state
  const [generations, setGenerations] = useState<any[]>([]);
  const [selectedGeneration, setSelectedGeneration] = useState<any | null>(null);
  const [loadingGenerations, setLoadingGenerations] = useState(true);
  const [generationsError, setGenerationsError] = useState<string | null>(null);

  // Share testing state
  const [testResults, setTestResults] = useState<Record<SharePlatform, TestResult>>({
    facebook: { platform: 'facebook', success: false, loading: false, copied: false },
    instagram: { platform: 'instagram', success: false, loading: false, copied: false },
    tiktok: { platform: 'tiktok', success: false, loading: false, copied: false },
  });

  // Load user's generations on mount
  useEffect(() => {
    if (!_hasHydrated) return;

    if (!isAuthenticated) {
      router.push('/login');
      return;
    }

    loadGenerations();
  }, [_hasHydrated, isAuthenticated, router]);

  const loadGenerations = async () => {
    try {
      setLoadingGenerations(true);
      const response = await holidayAPI.listGenerations({ limit: 50, offset: 0 });

      // Filter to only completed generations with before/after images
      const completed = response.data.generations.filter(
        (gen: any) => gen.status === 'completed' && gen.before_after_image_url
      );

      setGenerations(completed);

      if (completed.length > 0) {
        setSelectedGeneration(completed[0]);
      }
    } catch (error: any) {
      console.error('Failed to load generations:', error);
      setGenerationsError('Failed to load your generations. Please try again.');
    } finally {
      setLoadingGenerations(false);
    }
  };

  const testAllPlatforms = async () => {
    if (!selectedGeneration) return;

    // Reset results
    setTestResults({
      x: { platform: 'x', success: false, loading: true, copied: false },
      facebook: { platform: 'facebook', success: false, loading: true, copied: false },
      instagram: { platform: 'instagram', success: false, loading: true, copied: false },
      pinterest: { platform: 'pinterest', success: false, loading: true, copied: false },
      tiktok: { platform: 'tiktok', success: false, loading: true, copied: false },
    });

    // Test each platform
    const platforms: SharePlatform[] = ['x', 'facebook', 'instagram', 'pinterest', 'tiktok'];

    for (const platform of platforms) {
      try {
        const response = await holidayAPI.createShare({
          generation_id: selectedGeneration.id,
          platform,
        });

        setTestResults(prev => ({
          ...prev,
          [platform]: {
            platform,
            success: true,
            shareUrl: response.data.share_url,
            trackingLink: response.data.tracking_link,
            loading: false,
            copied: false,
          },
        }));
      } catch (error: any) {
        const errorMsg = error.response?.data?.detail?.message || error.message || 'Unknown error';
        setTestResults(prev => ({
          ...prev,
          [platform]: {
            platform,
            success: false,
            error: errorMsg,
            loading: false,
            copied: false,
          },
        }));
      }
    }
  };

  const copyToClipboard = (text: string, platform: SharePlatform) => {
    navigator.clipboard.writeText(text);
    setTestResults(prev => ({
      ...prev,
      [platform]: { ...prev[platform], copied: true },
    }));
    setTimeout(() => {
      setTestResults(prev => ({
        ...prev,
        [platform]: { ...prev[platform], copied: false },
      }));
    }, 2000);
  };

  const openShareUrl = (url: string) => {
    window.open(url, '_blank', 'width=600,height=600');
  };

  if (!_hasHydrated) {
    return null;
  }

  if (!isAuthenticated) {
    return null;
  }

  return (
    <>
      <Head>
        <title>Share Testing - Yarda Holiday Decorator</title>
        <meta name="description" content="Test social media sharing functionality" />
      </Head>

      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-8">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-4xl font-bold text-slate-900 mb-2">
              Share Testing Dashboard
            </h1>
            <p className="text-slate-600">
              Test social media sharing without generating new images. Supports X, Facebook, Instagram, Pinterest, and TikTok.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Left Column: Generations List */}
            <div className="lg:col-span-1">
              <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6">
                <h2 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
                  <Share2 className="w-5 h-5" />
                  Your Generations
                </h2>

                {loadingGenerations ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader className="w-5 h-5 animate-spin text-slate-400" />
                  </div>
                ) : generationsError ? (
                  <div className="p-4 bg-red-50 border border-red-200 rounded-lg flex gap-3">
                    <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                    <p className="text-sm text-red-700">{generationsError}</p>
                  </div>
                ) : generations.length === 0 ? (
                  <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg">
                    <p className="text-sm text-slate-600">
                      No completed generations found. Generate one first.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2 max-h-[600px] overflow-y-auto">
                    {generations.map((gen: any) => (
                      <button
                        key={gen.id}
                        onClick={() => setSelectedGeneration(gen)}
                        className={`w-full text-left p-3 rounded-lg border-2 transition-all ${
                          selectedGeneration?.id === gen.id
                            ? 'border-emerald-500 bg-emerald-50'
                            : 'border-slate-200 bg-slate-50 hover:border-slate-300'
                        }`}
                      >
                        <p className="font-medium text-sm text-slate-900">{gen.address}</p>
                        <p className="text-xs text-slate-500 mt-1">
                          {gen.style} • {new Date(gen.created_at).toLocaleDateString()}
                        </p>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Right Column: Share Testing */}
            <div className="lg:col-span-2">
              {selectedGeneration ? (
                <>
                  {/* Generation Preview */}
                  <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6 mb-6">
                    <h3 className="font-semibold text-slate-900 mb-4">Selected Generation</h3>
                    <div className="aspect-video bg-slate-100 rounded-lg overflow-hidden mb-4">
                      <img
                        src={selectedGeneration.before_after_image_url}
                        alt="Before/After"
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <p className="text-sm text-slate-600 mb-4">{selectedGeneration.address}</p>
                    <button
                      onClick={testAllPlatforms}
                      className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-medium py-3 rounded-lg transition-colors flex items-center justify-center gap-2"
                    >
                      <Share2 className="w-4 h-4" />
                      Test All Platforms
                    </button>
                  </div>

                  {/* Platform Results */}
                  <div className="space-y-3">
                    <h3 className="font-semibold text-slate-900 mb-4">Platform Results</h3>
                    {Object.entries(testResults).map(([, result]) => (
                      <div
                        key={result.platform}
                        className={`p-4 rounded-lg border-2 transition-all ${
                          result.loading
                            ? 'border-slate-200 bg-slate-50'
                            : result.success
                            ? 'border-emerald-200 bg-emerald-50'
                            : 'border-red-200 bg-red-50'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-3 mb-3">
                          <div className="flex items-center gap-3 flex-1">
                            {result.loading ? (
                              <Loader className="w-5 h-5 animate-spin text-slate-400 flex-shrink-0" />
                            ) : result.success ? (
                              <Check className="w-5 h-5 text-emerald-600 flex-shrink-0" />
                            ) : (
                              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
                            )}
                            <div>
                              <p className="font-medium text-slate-900 capitalize">{result.platform}</p>
                              {result.error && (
                                <p className="text-xs text-red-700 mt-1">{result.error}</p>
                              )}
                            </div>
                          </div>
                        </div>

                        {result.success && result.shareUrl && (
                          <div className="space-y-2 mt-3">
                            <div className="flex gap-2">
                              <button
                                onClick={() => openShareUrl(result.shareUrl!)}
                                className="flex-1 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-medium rounded transition-colors"
                              >
                                Open Share URL
                              </button>
                              <button
                                onClick={() => copyToClipboard(result.shareUrl!, result.platform)}
                                className="flex-1 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-medium rounded transition-colors flex items-center justify-center gap-2"
                              >
                                <Copy className="w-4 h-4" />
                                {result.copied ? 'Copied!' : 'Copy'}
                              </button>
                            </div>
                            {result.trackingLink && (
                              <div className="bg-white rounded p-2 border border-slate-200">
                                <p className="text-xs text-slate-500 mb-1">Tracking Link:</p>
                                <p className="text-xs font-mono text-slate-700 truncate cursor-pointer hover:text-slate-900"
                                   onClick={() => copyToClipboard(result.trackingLink!, result.platform)}
                                >
                                  {result.trackingLink}
                                </p>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>

                  {/* Credit Info */}
                  <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                    <p className="text-sm text-blue-800">
                      <strong>Current Credits:</strong> {user?.holiday_credits || 0}
                    </p>
                    <p className="text-xs text-blue-700 mt-2">
                      Sharing is free! You only spend credits when generating new decorations.
                    </p>
                  </div>
                </>
              ) : (
                <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-12 flex items-center justify-center">
                  <p className="text-slate-500">Select a generation to test sharing</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
