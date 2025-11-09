/**
 * Start Page - Dual-Mode Landing and Generation
 *
 * Shows marketing landing for unauthenticated users,
 * and full generation flow for authenticated users.
 *
 * Mobile-first design matching the new UI mockups.
 */

import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { useUserStore } from '@/store/userStore';
import GenerationFormEnhanced from '@/components/generation/GenerationFormEnhanced';
import TokenBalance from '@/components/TokenBalance';
import TrialCounter from '@/components/TrialCounter';

const BeforeAfterSlider = dynamic(() => import('@/components/BeforeAfterSlider'), {
  ssr: false,
  loading: () => (
    <div className="aspect-[4/3] bg-brand-sage flex items-center justify-center rounded-2xl">
      <div className="text-center">
        <svg className="animate-spin h-8 w-8 mx-auto text-brand-green mb-2" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
        <p className="text-sm text-brand-dark-green">Loading comparison...</p>
      </div>
    </div>
  ),
});

export default function StartPage() {
  const router = useRouter();
  const { isAuthenticated, _hasHydrated } = useUserStore();
  const [address, setAddress] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitTimeout, setSubmitTimeout] = useState<NodeJS.Timeout | null>(null);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (submitTimeout) clearTimeout(submitTimeout);
    };
  }, [submitTimeout]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!address.trim()) {
      setError('Please enter a valid address');
      return;
    }

    // Basic address validation (street number + street name)
    const addressPattern = /\d+.*[a-zA-Z]/;
    if (!addressPattern.test(address)) {
      setError('Please enter a complete street address (e.g., 123 Main St, Anytown, USA)');
      return;
    }

    setIsLoading(true);

    // Add timeout protection (30 seconds)
    const timeout = setTimeout(() => {
      setIsLoading(false);
      setError('Request timed out. Please try again.');
    }, 30000);

    setSubmitTimeout(timeout);

    try {
      // Store address safely with try-catch
      try {
        sessionStorage.setItem('pending_address', address);
      } catch (storageError) {
        console.warn('SessionStorage unavailable:', storageError);
        // Continue anyway, address can be re-entered
      }

      // Redirect to auth with redirect param, or directly to generate if authenticated
      router.push('/auth?redirect=/generate');
    } catch (err) {
      if (submitTimeout) clearTimeout(submitTimeout);
      setError('Something went wrong. Please try again.');
      console.error('Submit error:', err);
    } finally {
      setIsLoading(false);
      if (submitTimeout) clearTimeout(submitTimeout);
    }
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

  // If authenticated, show the full generation flow (same as /generate)
  if (isAuthenticated) {
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
          <div className="mb-8">
            <h2 className="text-3xl font-bold text-gray-900 mb-2">
              Generate Landscape Design
            </h2>
            <p className="text-gray-600">
              Enter your property address and choose your design preferences to generate stunning AI-powered landscape designs
            </p>
          </div>

          {/* Generation Form Component */}
          <GenerationFormEnhanced />
        </div>
      </div>
    );
  }

  // If not authenticated, show marketing landing page
  return (
    <div className="min-h-screen bg-gradient-to-br from-brand-sage to-brand-cream">
      <Head>
        <title>Get Your Free Landscape Design - Yarda AI</title>
        <meta name="description" content="Transform your outdoor space with AI-powered landscape design. Enter your address and get 3 free professional yard designs in minutes. No credit card required." />

        {/* Open Graph (Facebook, LinkedIn) */}
        <meta property="og:title" content="Get Your Free Landscape Design - Yarda AI" />
        <meta property="og:description" content="AI-powered landscape design in minutes. Start with 3 free designs." />
        <meta property="og:type" content="website" />
        <meta property="og:image" content="/images/yellow-house-after.jpg" />

        {/* Twitter Card */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="Get Your Free Landscape Design - Yarda AI" />
        <meta name="twitter:description" content="AI-powered landscape design in minutes" />
        <meta name="twitter:image" content="/images/yellow-house-after.jpg" />

        {/* Preload critical images for better performance */}
        <link rel="preload" as="image" href="/images/yellow-house-before.jpg" />
        <link rel="preload" as="image" href="/images/yellow-house-after.jpg" />
      </Head>

      {/* Simple Header */}
      <div className="px-4 py-4">
        <Link href="/" className="flex items-center gap-2">
          <svg
            className="h-8 w-8 text-brand-green"
            viewBox="0 0 40 40"
            fill="currentColor"
          >
            <path d="M20 5L5 15v10l15 10 15-10V15L20 5zm0 3.5L31 18v7l-11 7.5L9 25v-7l11-9.5z" />
            <circle cx="20" cy="20" r="4" />
          </svg>
          <span className="text-xl font-bold text-brand-dark-green">Yarda AI</span>
        </Link>
      </div>

      {/* Main Content */}
      <div className="max-w-lg mx-auto px-4 py-12">
        {/* Hero Section */}
        <div className="text-center mb-8">
          <div className="mb-6">
            <BeforeAfterSlider
              beforeImage="/images/yellow-house-before.jpg"
              afterImage="/images/yellow-house-after.jpg"
              beforeAlt="Yellow house with basic landscaping"
              afterAlt="Yellow house with enhanced colorful flower beds and landscaping"
              className="w-full"
            />
          </div>

          <h1 className="text-4xl md:text-5xl font-bold text-brand-dark-green mb-4">
            Reimagine Your Yard<br />In Seconds
          </h1>

          <p className="text-lg text-neutral-700 mb-2">
            AI-powered landscape design for your home.
          </p>
          <p className="text-sm text-neutral-600">
            Get a free visualization instantly.
          </p>
        </div>

        {/* Address Input Form */}
        <div className="bg-white rounded-2xl shadow-xl p-6 mb-6">
          <form onSubmit={handleSubmit} aria-label="Property address form">
            {/* Error Display */}
            {error && (
              <div
                id="address-error"
                role="alert"
                className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700 flex items-start gap-2"
              >
                <svg className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>{error}</span>
              </div>
            )}

            <div className="mb-4">
              <label htmlFor="address" className="block text-sm font-medium text-neutral-700 mb-2">
                Your Property Address:
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" aria-hidden="true">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </span>
                <input
                  type="text"
                  id="address"
                  value={address}
                  onChange={(e) => {
                    setAddress(e.target.value);
                    setError(null); // Clear error on input
                  }}
                  placeholder="123 Main Street, Anytown, USA 12345"
                  className="w-full pl-10 pr-4 py-3 border-2 border-neutral-200 rounded-xl focus:ring-2 focus:ring-brand-green focus:border-transparent text-base"
                  required
                  aria-required="true"
                  aria-invalid={error ? 'true' : 'false'}
                  aria-describedby={error ? 'address-error' : undefined}
                  autoComplete="street-address"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading || !address.trim()}
              className="w-full bg-brand-green hover:bg-brand-dark-green text-white font-semibold py-4 rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl text-base"
              aria-busy={isLoading}
              aria-label="Generate free landscape design"
            >
              {isLoading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Processing...
                </span>
              ) : (
                'Generate Free Design'
              )}
            </button>
          </form>
        </div>

        {/* Featured In */}
        <div className="text-center mb-8">
          <p className="text-xs text-neutral-500 mb-3">Featured In</p>
          <div className="flex items-center justify-center gap-6 text-neutral-400">
            <span className="text-sm font-semibold">Forbes</span>
            <span className="text-sm font-semibold">ArchDigest</span>
            <span className="text-sm font-semibold">Wired</span>
          </div>
        </div>

        {/* How It Works */}
        <div className="bg-white/50 rounded-2xl p-6 backdrop-blur-sm">
          <h2 className="text-xl font-bold text-brand-dark-green mb-4 text-center">
            How It Works
          </h2>
          <p className="text-sm text-neutral-600 text-center mb-6">
            Get your dream yard in three simple steps.
          </p>

          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-brand-green text-white flex items-center justify-center font-bold text-sm">
                1
              </div>
              <div>
                <h3 className="font-semibold text-brand-dark-green mb-1">Enter Address</h3>
                <p className="text-sm text-neutral-600">
                  Simply type in your property address to give our AI a starting point.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-brand-green text-white flex items-center justify-center font-bold text-sm">
                2
              </div>
              <div>
                <h3 className="font-semibold text-brand-dark-green mb-1">AI Generates</h3>
                <p className="text-sm text-neutral-600">
                  Our intelligent system analyzes your space and generates stunning landscape concepts.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-brand-green text-white flex items-center justify-center font-bold text-sm">
                3
              </div>
              <div>
                <h3 className="font-semibold text-brand-dark-green mb-1">Explore Designs</h3>
                <p className="text-sm text-neutral-600">
                  Browse, customize, and save your favorite AI-generated yard designs.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
