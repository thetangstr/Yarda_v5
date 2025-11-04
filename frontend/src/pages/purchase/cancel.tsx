/**
 * Token Purchase Cancel Page
 *
 * Displayed when user cancels Stripe checkout.
 *
 * Requirements:
 * - T059: Create /purchase/cancel page
 * - Offer to retry purchase
 * - Link back to purchase page
 */

import React, { useEffect } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useUserStore } from '@/store/userStore';
import TokenBalance from '@/components/TokenBalance';

export default function PurchaseCancelPage() {
  const router = useRouter();
  const { isAuthenticated } = useUserStore();

  // Redirect if not authenticated
  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/login?redirect=/purchase');
    }
  }, [isAuthenticated, router]);

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-green-50">
      <Head>
        <title>Purchase Cancelled - Yarda AI Landscape Studio</title>
        <meta
          name="description"
          content="Your token purchase was cancelled"
        />
      </Head>

      {/* Navbar */}
      <nav className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <Link href="/" className="text-2xl font-bold text-gray-900">
            Yarda
          </Link>
          <div className="flex items-center gap-4">
            <TokenBalance variant="compact" autoRefresh={false} />
            <Link
              href="/generate"
              className="text-sm text-gray-600 hover:text-gray-900"
            >
              Back to Generate
            </Link>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <div className="max-w-2xl mx-auto px-6 py-16">
        <div className="bg-white rounded-lg shadow-lg p-8">
          {/* Cancel Icon */}
          <div className="text-center mb-8">
            <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
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

            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              Purchase Cancelled
            </h1>
            <p className="text-gray-600">
              Your token purchase was not completed
            </p>
          </div>

          {/* Information */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
            <h3 className="font-semibold text-blue-900 mb-2">
              What happened?
            </h3>
            <p className="text-sm text-blue-800">
              You cancelled the payment process before it was completed. Don't
              worry - no charges were made to your account.
            </p>
          </div>

          {/* Current Balance */}
          <div className="mb-6">
            <TokenBalance variant="full" autoRefresh={true} />
          </div>

          {/* Options */}
          <div className="space-y-4 mb-6">
            <div className="border border-gray-200 rounded-lg p-4">
              <h3 className="font-semibold text-gray-900 mb-2">
                Ready to try again?
              </h3>
              <p className="text-sm text-gray-600 mb-3">
                You can return to the purchase page to select a token package
                and complete your purchase.
              </p>
              <Link
                href="/purchase"
                className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition"
              >
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                View Token Packages
              </Link>
            </div>

            <div className="border border-gray-200 rounded-lg p-4">
              <h3 className="font-semibold text-gray-900 mb-2">
                Still have trial credits?
              </h3>
              <p className="text-sm text-gray-600 mb-3">
                If you still have trial credits available, you can use them to
                generate designs without purchasing tokens.
              </p>
              <Link
                href="/generate"
                className="inline-flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white font-medium rounded-lg transition"
              >
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M13 10V3L4 14h7v7l9-11h-7z"
                  />
                </svg>
                Generate Design
              </Link>
            </div>

            <div className="border border-gray-200 rounded-lg p-4">
              <h3 className="font-semibold text-gray-900 mb-2">
                Questions or concerns?
              </h3>
              <p className="text-sm text-gray-600 mb-3">
                If you encountered any issues during checkout or have questions
                about our token packages, we're here to help.
              </p>
              <a
                href="/support"
                className="inline-flex items-center gap-2 px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-900 font-medium rounded-lg transition"
              >
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192l-3.536 3.536M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-5 0a4 4 0 11-8 0 4 4 0 018 0z"
                  />
                </svg>
                Contact Support
              </a>
            </div>
          </div>

          {/* FAQ */}
          <div className="border-t border-gray-200 pt-6">
            <h3 className="font-semibold text-gray-900 mb-4">
              Common Questions
            </h3>
            <div className="space-y-3">
              <details className="text-sm">
                <summary className="font-medium text-gray-900 cursor-pointer hover:text-blue-600">
                  Was I charged for this cancelled purchase?
                </summary>
                <p className="mt-2 text-gray-600 pl-4">
                  No. When you cancel during the checkout process, no payment
                  is processed and no charges are made to your payment method.
                </p>
              </details>

              <details className="text-sm">
                <summary className="font-medium text-gray-900 cursor-pointer hover:text-blue-600">
                  Why did I cancel?
                </summary>
                <p className="mt-2 text-gray-600 pl-4">
                  You may have clicked the back button, closed the checkout
                  window, or clicked the "Cancel" link during the Stripe
                  checkout process.
                </p>
              </details>

              <details className="text-sm">
                <summary className="font-medium text-gray-900 cursor-pointer hover:text-blue-600">
                  Can I complete my purchase now?
                </summary>
                <p className="mt-2 text-gray-600 pl-4">
                  Yes! Simply click "View Token Packages" above to return to
                  the purchase page and select the package you want.
                </p>
              </details>

              <details className="text-sm">
                <summary className="font-medium text-gray-900 cursor-pointer hover:text-blue-600">
                  What payment methods do you accept?
                </summary>
                <p className="mt-2 text-gray-600 pl-4">
                  We accept all major credit and debit cards through our secure
                  payment processor, Stripe. This includes Visa, Mastercard,
                  American Express, and more.
                </p>
              </details>

              <details className="text-sm">
                <summary className="font-medium text-gray-900 cursor-pointer hover:text-blue-600">
                  Are my payment details secure?
                </summary>
                <p className="mt-2 text-gray-600 pl-4">
                  Absolutely. All payments are processed securely through
                  Stripe, a PCI-compliant payment processor. We never store
                  your credit card information on our servers.
                </p>
              </details>
            </div>
          </div>
        </div>

        {/* Bottom Links */}
        <div className="mt-8 flex flex-col sm:flex-row gap-4 justify-center text-sm">
          <Link
            href="/"
            className="text-gray-600 hover:text-gray-900 text-center"
          >
            Back to Home
          </Link>
          <span className="hidden sm:inline text-gray-400">•</span>
          <Link
            href="/transactions"
            className="text-gray-600 hover:text-gray-900 text-center"
          >
            View Transaction History
          </Link>
          <span className="hidden sm:inline text-gray-400">•</span>
          <Link
            href="/profile"
            className="text-gray-600 hover:text-gray-900 text-center"
          >
            My Profile
          </Link>
        </div>
      </div>
    </div>
  );
}
