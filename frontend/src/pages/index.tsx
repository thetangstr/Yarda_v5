/**
 * Homepage
 *
 * Marketing homepage matching yarda.pro design.
 *
 * Features:
 * - Hero section with "Transform Your Outdoor Space"
 * - Before/after comparison
 * - Feature highlights
 * - Benefits section
 * - 3-step process
 * - CTA sections
 */

import React from 'react';
import Head from 'next/head';
import Link from 'next/link';
import Navigation from '@/components/Navigation';
import Footer from '@/components/Footer';

export default function Home() {
  return (
    <>
      <Head>
        <title>Yarda AI Landscape Studio - AI-Powered Landscape Design</title>
        <meta name="description" content="Get professional landscape designs in minutes. Upload a photo of your yard and watch AI create stunning transformations." />
      </Head>
      <div className="min-h-screen bg-white">
      <Navigation transparent={true} />

      {/* Hero Section */}
      <section className="relative bg-brand-cream pt-24 pb-16 overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            {/* Left Column: Text Content */}
            <div className="text-center lg:text-left animate-slide-up">
              <div className="inline-flex items-center space-x-2 bg-brand-sage px-4 py-2 rounded-full mb-6">
                <svg className="h-4 w-4 text-brand-green" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                </svg>
                <span className="text-sm font-medium text-brand-dark-green">AI-Powered Landscape Design</span>
              </div>

              <h1 className="text-5xl md:text-6xl font-extrabold text-neutral-900 mb-6 leading-tight">
                Transform Your{' '}
                <span className="text-brand-green">Outdoor Space</span>
              </h1>

              <p className="text-xl text-neutral-600 mb-8 leading-relaxed">
                Get professional landscape designs in minutes. Upload a photo of your yard and watch AI create stunning transformations tailored to your vision.
              </p>

              <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
                <Link
                  href="/start"
                  className="btn-primary text-center text-lg px-8 py-4"
                >
                  Start Free Trial
                </Link>
                <Link
                  href="/pricing"
                  className="btn-outline text-center text-lg px-8 py-4"
                >
                  View Pricing
                </Link>
              </div>

              <p className="mt-6 text-sm text-neutral-500">
                3 free trial designs • No credit card required
              </p>
            </div>

            {/* Right Column: Hero Image */}
            <div className="relative animate-fade-in">
              <div className="relative rounded-2xl overflow-hidden shadow-2xl">
                <div className="aspect-[4/3] bg-gradient-to-br from-brand-sage to-brand-cream flex items-center justify-center">
                  <div className="text-center p-8">
                    <svg className="h-24 w-24 mx-auto text-brand-green mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    <p className="text-brand-dark-green font-medium">Before & After Comparison</p>
                    <p className="text-sm text-neutral-600 mt-2">Upload your yard photo to see the transformation</p>
                  </div>
                </div>
              </div>

              {/* Floating badges */}
              <div className="absolute -top-4 -right-4 bg-white px-4 py-2 rounded-xl shadow-lg border-2 border-brand-sage animate-scale-in">
                <div className="flex items-center space-x-2">
                  <svg className="h-5 w-5 text-brand-green" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3zM6 8a2 2 0 11-4 0 2 2 0 014 0zM16 18v-3a5.972 5.972 0 00-.75-2.906A3.005 3.005 0 0119 15v3h-3zM4.75 12.094A5.973 5.973 0 004 15v3H1v-3a3 3 0 013.75-2.906z" />
                  </svg>
                  <span className="text-sm font-semibold text-neutral-900">10,000+ Happy Users</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Decorative elements */}
        <div className="absolute top-0 right-0 -z-10 opacity-20">
          <svg width="400" height="400" viewBox="0 0 400 400" fill="none">
            <circle cx="200" cy="200" r="200" fill="url(#gradient1)" />
            <defs>
              <radialGradient id="gradient1">
                <stop offset="0%" stopColor="#5A6C4D" />
                <stop offset="100%" stopColor="#E8EDE5" />
              </radialGradient>
            </defs>
          </svg>
        </div>
      </section>

      {/* Feature Highlights */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-neutral-900 mb-4">
              Why Choose Yarda?
            </h2>
            <p className="text-xl text-neutral-600 max-w-3xl mx-auto">
              Professional landscape design made accessible and affordable with AI technology
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Feature 1 */}
            <div className="feature-card text-center">
              <div className="w-16 h-16 bg-brand-sage rounded-full flex items-center justify-center mx-auto mb-6">
                <svg className="h-8 w-8 text-brand-green" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <h3 className="text-2xl font-bold text-neutral-900 mb-3">Lightning Fast</h3>
              <p className="text-neutral-600">
                Get professional designs in under 2 minutes. No waiting for consultations or quotes.
              </p>
            </div>

            {/* Feature 2 */}
            <div className="feature-card text-center">
              <div className="w-16 h-16 bg-brand-sage rounded-full flex items-center justify-center mx-auto mb-6">
                <svg className="h-8 w-8 text-brand-green" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              <h3 className="text-2xl font-bold text-neutral-900 mb-3">Multiple Styles</h3>
              <p className="text-neutral-600">
                Choose from modern, cottage, zen, Mediterranean, and more design styles.
              </p>
            </div>

            {/* Feature 3 */}
            <div className="feature-card text-center">
              <div className="w-16 h-16 bg-brand-sage rounded-full flex items-center justify-center mx-auto mb-6">
                <svg className="h-8 w-8 text-brand-green" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                </svg>
              </div>
              <h3 className="text-2xl font-bold text-neutral-900 mb-3">AI-Powered</h3>
              <p className="text-neutral-600">
                Advanced AI understands your space and creates realistic, implementable designs.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="py-20 section-cream">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-neutral-900 mb-4">
              Transform Your Vision Into Reality
            </h2>
            <p className="text-xl text-neutral-600 max-w-3xl mx-auto">
              Everything you need to design the perfect outdoor space
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Benefit 1 */}
            <div className="bg-white p-8 rounded-xl shadow-md">
              <div className="text-4xl font-bold text-brand-green mb-2">$1000s</div>
              <h3 className="text-xl font-bold text-neutral-900 mb-3">Save Thousands</h3>
              <p className="text-neutral-600">
                Professional landscape consultations cost $500-$2000. Get unlimited designs for a fraction of the price.
              </p>
            </div>

            {/* Benefit 2 */}
            <div className="bg-white p-8 rounded-xl shadow-md">
              <div className="text-4xl font-bold text-brand-green mb-2">2 min</div>
              <h3 className="text-xl font-bold text-neutral-900 mb-3">Save Time</h3>
              <p className="text-neutral-600">
                No scheduling consultations or waiting weeks for designs. Get results instantly.
              </p>
            </div>

            {/* Benefit 3 */}
            <div className="bg-white p-8 rounded-xl shadow-md">
              <div className="text-4xl font-bold text-brand-green mb-2">100%</div>
              <h3 className="text-xl font-bold text-neutral-900 mb-3">Professional Quality</h3>
              <p className="text-neutral-600">
                AI trained on thousands of professional landscape designs ensures stunning results every time.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-neutral-900 mb-4">
              How It Works
            </h2>
            <p className="text-xl text-neutral-600">
              Three simple steps to your dream landscape
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
            {/* Step 1 */}
            <div className="text-center">
              <div className="w-20 h-20 bg-brand-green text-white rounded-full flex items-center justify-center mx-auto mb-6 text-3xl font-bold">
                1
              </div>
              <h3 className="text-2xl font-bold text-neutral-900 mb-4">Upload Your Photo</h3>
              <p className="text-neutral-600">
                Take a photo of your yard or outdoor space and upload it to Yarda.
              </p>
            </div>

            {/* Step 2 */}
            <div className="text-center">
              <div className="w-20 h-20 bg-brand-green text-white rounded-full flex items-center justify-center mx-auto mb-6 text-3xl font-bold">
                2
              </div>
              <h3 className="text-2xl font-bold text-neutral-900 mb-4">Choose Your Style</h3>
              <p className="text-neutral-600">
                Select from modern, cottage, zen, Mediterranean, or other design styles.
              </p>
            </div>

            {/* Step 3 */}
            <div className="text-center">
              <div className="w-20 h-20 bg-brand-green text-white rounded-full flex items-center justify-center mx-auto mb-6 text-3xl font-bold">
                3
              </div>
              <h3 className="text-2xl font-bold text-neutral-900 mb-4">Get Your Design</h3>
              <p className="text-neutral-600">
                Receive your professional landscape design in under 2 minutes.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 hero-gradient text-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-4xl md:text-5xl font-bold mb-6">
            Ready to Transform Your Yard?
          </h2>
          <p className="text-xl text-brand-cream mb-8">
            Start with 3 free trial designs. No credit card required.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/start"
              className="bg-white text-brand-green hover:bg-brand-cream font-bold text-lg px-8 py-4 rounded-lg transition-colors duration-200 text-center"
            >
              Get Started Free
            </Link>
            <Link
              href="/pricing"
              className="border-2 border-white text-white hover:bg-white hover:text-brand-green font-bold text-lg px-8 py-4 rounded-lg transition-all duration-200 text-center"
            >
              View Pricing
            </Link>
          </div>
          <p className="mt-6 text-brand-cream text-sm">
            Join 10,000+ homeowners who've transformed their outdoor spaces
          </p>
        </div>
      </section>

      <Footer />
      </div>
    </>
  );
}
