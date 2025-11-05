/**
 * Start Page - Simplified Free Design Flow
 *
 * Mobile-first design matching the new UI mockups.
 * Shows address input and generates free design.
 */

import React, { useState } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import Link from 'next/link';

export default function StartPage() {
  const router = useRouter();
  const [address, setAddress] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!address.trim()) {
      return;
    }

    setIsLoading(true);

    // Store address and redirect to generate page
    sessionStorage.setItem('pending_address', address);

    // Redirect to login if not authenticated, otherwise to generate
    router.push('/login?redirect=/generate');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-brand-sage to-brand-cream">
      <Head>
        <title>Get Your Free Design - Yarda AI</title>
        <meta name="description" content="Get your free landscape design in seconds" />
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
          <div className="mb-6 rounded-2xl overflow-hidden shadow-2xl">
            <img
              src="/images/hero-yard.jpg"
              alt="Beautiful landscaped yard"
              className="w-full h-64 object-cover"
              onError={(e) => {
                // Fallback if image doesn't exist
                e.currentTarget.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="400" height="300"%3E%3Crect fill="%234F8B62" width="400" height="300"/%3E%3Ctext x="50%25" y="50%25" text-anchor="middle" fill="white" font-size="24" font-family="sans-serif"%3EYour Dream Yard%3C/text%3E%3C/svg%3E';
              }}
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
          <form onSubmit={handleSubmit}>
            <div className="mb-4">
              <label htmlFor="address" className="block text-sm font-medium text-neutral-700 mb-2">
                Your Property Address:
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </span>
                <input
                  type="text"
                  id="address"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="123 Main Street, Anytown, USA 12345"
                  className="w-full pl-10 pr-4 py-3 border-2 border-neutral-200 rounded-xl focus:ring-2 focus:ring-brand-green focus:border-transparent text-base"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading || !address.trim()}
              className="w-full bg-brand-green hover:bg-brand-dark-green text-white font-semibold py-4 rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl text-base"
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
