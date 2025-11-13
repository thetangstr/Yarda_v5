'use client';

/**
 * Holiday Hero Component
 *
 * Festive hero section displayed on homepage during holiday season (Nov 1 - Jan 1).
 * Features auto-playing before/after comparison, compelling headline, and CTA button.
 *
 * Feature: 007-holiday-decorator (T024)
 * User Story 1: New User Discovery & First Generation
 */

import React from 'react';
import Link from 'next/link';
import BeforeAfterSlider from '@/components/BeforeAfterSlider';

export default function HolidayHero() {
  return (
    <section
      data-testid="holiday-hero"
      className="relative overflow-hidden bg-gradient-to-br from-blue-900 via-purple-900 to-indigo-900 animate-fade-in"
    >
      {/* Background decorative elements - More Christmas vibes */}
      <div className="absolute inset-0 opacity-30">
        <div className="absolute top-10 left-10 text-7xl animate-bounce">❄️</div>
        <div className="absolute top-20 right-20 text-6xl animate-pulse">✨</div>
        <div className="absolute bottom-10 left-1/4 text-7xl animate-bounce delay-150">🎄</div>
        <div className="absolute bottom-20 right-1/3 text-6xl animate-pulse delay-300">⭐</div>
        <div className="absolute top-1/3 right-10 text-6xl animate-spin-slow">🎅</div>
        <div className="absolute bottom-1/4 left-1/3 text-5xl animate-bounce delay-500">🎁</div>
      </div>

      {/* Hero content container */}
      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 md:py-28">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          {/* Left column: Headline & CTA */}
          <div className="text-center lg:text-left">
            {/* Seasonal badge */}
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 backdrop-blur-sm border border-white/20 mb-6">
              <span className="text-2xl">🎁</span>
              <span className="text-sm font-medium text-white">
                Limited Time: Holiday Season Special
              </span>
            </div>

            {/* Headline */}
            <h1
              data-testid="hero-headline"
              className="font-display text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-6 leading-tight drop-shadow-lg"
            >
              Transform Your Home into a{' '}
              <span className="bg-gradient-to-r from-yellow-200 via-orange-200 to-red-200 bg-clip-text text-transparent">
                Christmas Masterpiece
              </span>
              <span className="text-5xl ml-2">🎄</span>
            </h1>

            {/* Subheadline */}
            <p className="text-xl md:text-2xl text-blue-100 mb-8 max-w-2xl mx-auto lg:mx-0 font-medium">
              AI decorates your home with festive lights, decorations & holiday magic!
              Get decorated instantly. Share & earn more credits! 🎅✨
            </p>

            {/* Value props */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start mb-10 text-white">
              <div className="flex items-center gap-2">
                <span className="text-2xl">⚡</span>
                <span className="text-sm font-medium">10-Second Generation</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-2xl">🎁</span>
                <span className="text-sm font-medium">1 Free Credit</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-2xl">📱</span>
                <span className="text-sm font-medium">Share & Earn More</span>
              </div>
            </div>

            {/* CTA buttons */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
              {/* Primary CTA */}
              <Link
                href="/holiday"
                className="
                  group relative inline-flex items-center justify-center
                  px-8 py-4 rounded-xl
                  bg-gradient-to-r from-green-400 to-emerald-500
                  hover:from-green-500 hover:to-emerald-600
                  text-white font-bold text-lg
                  shadow-lg shadow-green-500/50
                  hover:shadow-xl hover:shadow-green-500/60
                  transform hover:scale-105
                  transition-all duration-200
                "
              >
                <span className="mr-2">🎄</span>
                Get Started Free
                <svg
                  className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M13 7l5 5m0 0l-5 5m5-5H6"
                  />
                </svg>
              </Link>
            </div>

            {/* Social proof */}
            <div className="mt-8 flex items-center justify-center lg:justify-start gap-2 text-sm text-blue-100">
              <div className="flex -space-x-2">
                {[1, 2, 3, 4].map((i) => (
                  <div
                    key={i}
                    className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 border-2 border-white"
                  />
                ))}
              </div>
              <span>Join <strong className="text-white">1,000+</strong> homeowners celebrating</span>
            </div>
          </div>

          {/* Right column: Before/After visual */}
          <div className="relative">
            {/* Interactive before/after slider */}
            <div
              data-testid="hero-animation"
              className="
                relative rounded-2xl overflow-hidden
                shadow-2xl shadow-purple-900/50
                border-4 border-white/20
              "
            >
              <BeforeAfterSlider
                beforeImage="/images/holiday_before.jpg"
                afterImage="/images/holiday_after.jpg"
              />

              {/* Floating badge */}
              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 px-4 py-2 rounded-full bg-gradient-to-r from-yellow-400 to-orange-500 text-white font-bold text-sm shadow-lg animate-bounce z-10">
                ⚡ Generated in 10 seconds
              </div>
            </div>

            {/* Decorative sparkles */}
            <div className="absolute -top-4 -right-4 text-4xl animate-spin-slow">✨</div>
            <div className="absolute -bottom-4 -left-4 text-4xl animate-spin-slow delay-500">⭐</div>
          </div>
        </div>
      </div>

      {/* Bottom wave decoration */}
      <div className="absolute bottom-0 left-0 right-0">
        <svg
          viewBox="0 0 1440 120"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="w-full h-auto"
        >
          <path
            d="M0 0L60 10C120 20 240 40 360 46.7C480 53 600 47 720 43.3C840 40 960 40 1080 46.7C1200 53 1320 67 1380 73.3L1440 80V120H1380C1320 120 1200 120 1080 120C960 120 840 120 720 120C600 120 480 120 360 120C240 120 120 120 60 120H0V0Z"
            fill="currentColor"
            className="text-white"
          />
        </svg>
      </div>
    </section>
  );
}
