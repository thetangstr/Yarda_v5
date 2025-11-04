/**
 * Subscription Success Page
 *
 * Displayed after successful subscription checkout via Stripe.
 *
 * Features:
 * - Success confirmation message
 * - Display subscription details
 * - Links to generate page and account
 */

import React, { useEffect } from 'react';
import { useRouter } from 'next/router';
import { useSubscriptionStore } from '@/store/subscriptionStore';

export default function SubscriptionSuccessPage() {
  const router = useRouter();
  const { fetchSubscription } = useSubscriptionStore();

  useEffect(() => {
    // Refresh subscription data
    fetchSubscription();
  }, [fetchSubscription]);

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="max-w-2xl w-full">
        <div className="bg-white rounded-lg shadow-lg p-8 text-center">
          {/* Success Icon */}
          <div className="flex justify-center mb-6">
            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center">
              <svg
                className="w-10 h-10 text-green-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 13l4 4L19 7"
                />
              </svg>
            </div>
          </div>

          {/* Title */}
          <h1 className="text-3xl font-bold text-gray-900 mb-4">
            Welcome to Monthly Pro!
          </h1>

          {/* Description */}
          <p className="text-lg text-gray-700 mb-6">
            Your subscription has been activated successfully. You now have unlimited
            access to landscape design generations.
          </p>

          {/* Features Box */}
          <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-6 mb-8 text-left">
            <h2 className="text-lg font-semibold text-blue-900 mb-4">
              What's included in your Monthly Pro subscription:
            </h2>
            <ul className="space-y-3">
              <li className="flex items-start gap-3">
                <svg
                  className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
                <span className="text-blue-900">
                  <strong>Unlimited generations</strong> - Create as many designs as you need
                </span>
              </li>
              <li className="flex items-start gap-3">
                <svg
                  className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
                <span className="text-blue-900">
                  <strong>Priority processing</strong> - Faster generation times
                </span>
              </li>
              <li className="flex items-start gap-3">
                <svg
                  className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
                <span className="text-blue-900">
                  <strong>All design styles</strong> - Access to all current and future styles
                </span>
              </li>
              <li className="flex items-start gap-3">
                <svg
                  className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
                <span className="text-blue-900">
                  <strong>Premium support</strong> - Priority customer service
                </span>
              </li>
            </ul>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button
              onClick={() => router.push('/generate')}
              className="px-8 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-semibold text-lg shadow-lg"
            >
              Start Creating Designs
            </button>
            <button
              onClick={() => router.push('/account?tab=subscription')}
              className="px-8 py-3 bg-white text-gray-700 border-2 border-gray-300 rounded-lg hover:bg-gray-50 transition font-semibold"
            >
              View Subscription Details
            </button>
          </div>

          {/* Additional Info */}
          <p className="text-sm text-gray-600 mt-8">
            You will receive a confirmation email with your subscription details shortly.
          </p>
        </div>
      </div>
    </div>
  );
}
