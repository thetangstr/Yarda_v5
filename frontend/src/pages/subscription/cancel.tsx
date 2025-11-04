/**
 * Subscription Cancel Page
 *
 * Displayed when user cancels subscription checkout.
 *
 * Features:
 * - Information about cancelled checkout
 * - Links back to pricing or token purchase
 */

import React from 'react';
import { useRouter } from 'next/router';

export default function SubscriptionCancelPage() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="max-w-2xl w-full">
        <div className="bg-white rounded-lg shadow-lg p-8 text-center">
          {/* Icon */}
          <div className="flex justify-center mb-6">
            <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center">
              <svg
                className="w-10 h-10 text-gray-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </div>
          </div>

          {/* Title */}
          <h1 className="text-3xl font-bold text-gray-900 mb-4">
            Checkout Cancelled
          </h1>

          {/* Description */}
          <p className="text-lg text-gray-700 mb-8">
            Your subscription checkout was cancelled. No charges have been made to your
            account.
          </p>

          {/* Info Box */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-8 text-left">
            <h2 className="text-sm font-semibold text-blue-900 mb-2">
              Still want to use Yarda AI?
            </h2>
            <p className="text-sm text-blue-800">
              You can start with our pay-as-you-go token packages if you're not ready for
              a subscription. Tokens never expire and give you full access to all features.
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-6">
            <button
              onClick={() => router.push('/pricing')}
              className="px-8 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-semibold"
            >
              View Pricing Options
            </button>
            <button
              onClick={() => router.push('/purchase')}
              className="px-8 py-3 bg-white text-gray-700 border-2 border-gray-300 rounded-lg hover:bg-gray-50 transition font-semibold"
            >
              Buy Tokens Instead
            </button>
          </div>

          {/* Back Link */}
          <button
            onClick={() => router.push('/')}
            className="text-sm text-gray-600 hover:text-gray-900 underline"
          >
            ← Back to Home
          </button>
        </div>
      </div>
    </div>
  );
}
