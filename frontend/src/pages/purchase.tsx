/**
 * Token Purchase Page
 *
 * Main page for purchasing token packages.
 *
 * Requirements:
 * - T057: Create /purchase page
 * - FR-025: Token package selection UI
 */

import React, { useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useUserStore } from '@/store/userStore';
import TokenBalance from '@/components/TokenBalance';
import TokenPurchaseModal from '@/components/TokenPurchaseModal';

export default function PurchasePage() {
  const router = useRouter();
  const { user, isAuthenticated } = useUserStore();
  const [showModal, setShowModal] = useState(false);

  // Redirect if not authenticated
  React.useEffect(() => {
    if (!isAuthenticated) {
      router.push('/login?redirect=/purchase');
    } else {
      // Auto-open modal when page loads
      setShowModal(true);
    }
  }, [isAuthenticated, router]);

  if (!isAuthenticated || !user) {
    return null; // Will redirect
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-green-50">
      <Head>
        <title>Purchase Tokens - Yarda AI Landscape Studio</title>
        <meta
          name="description"
          content="Purchase token packages for AI-powered landscape design generation"
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
      <div className="max-w-7xl mx-auto px-6 py-12">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Choose Your Token Package
          </h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Select the package that fits your needs. All tokens never expire and
            failed generations are automatically refunded.
          </p>
        </div>

        {/* Current Balance Card */}
        <div className="max-w-md mx-auto mb-12">
          <TokenBalance variant="full" autoRefresh={true} />
        </div>

        {/* Info Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
            <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mb-4">
              <svg
                className="w-6 h-6 text-green-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
            <h3 className="font-semibold text-gray-900 mb-2">Never Expire</h3>
            <p className="text-sm text-gray-600">
              Your tokens stay in your account forever. Use them at your own pace.
            </p>
          </div>

          <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
            <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mb-4">
              <svg
                className="w-6 h-6 text-blue-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                />
              </svg>
            </div>
            <h3 className="font-semibold text-gray-900 mb-2">Auto Refund</h3>
            <p className="text-sm text-gray-600">
              If a generation fails, your token is automatically refunded to your
              account.
            </p>
          </div>

          <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
            <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center mb-4">
              <svg
                className="w-6 h-6 text-purple-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                />
              </svg>
            </div>
            <h3 className="font-semibold text-gray-900 mb-2">Secure Payment</h3>
            <p className="text-sm text-gray-600">
              All transactions are processed securely through Stripe with bank-level
              encryption.
            </p>
          </div>
        </div>

        {/* View Packages Button */}
        <div className="text-center">
          <button
            onClick={() => setShowModal(true)}
            className="inline-flex items-center gap-2 px-8 py-4 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg text-lg transition shadow-lg"
          >
            <svg
              className="w-6 h-6"
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
          </button>
        </div>

        {/* FAQ Section */}
        <div className="mt-16 max-w-3xl mx-auto">
          <h2 className="text-2xl font-bold text-gray-900 mb-6 text-center">
            Frequently Asked Questions
          </h2>
          <div className="space-y-4">
            <details className="bg-white rounded-lg p-6 border border-gray-200">
              <summary className="font-semibold text-gray-900 cursor-pointer">
                How do token credits work?
              </summary>
              <p className="mt-2 text-gray-600">
                1 token = 1 AI-powered landscape design generation. Tokens never
                expire and can be used at your own pace.
              </p>
            </details>

            <details className="bg-white rounded-lg p-6 border border-gray-200">
              <summary className="font-semibold text-gray-900 cursor-pointer">
                What happens if a generation fails?
              </summary>
              <p className="mt-2 text-gray-600">
                If a generation fails for any reason, your token is automatically
                refunded to your account within seconds. You won't lose any credits.
              </p>
            </details>

            <details className="bg-white rounded-lg p-6 border border-gray-200">
              <summary className="font-semibold text-gray-900 cursor-pointer">
                Can I get a refund?
              </summary>
              <p className="mt-2 text-gray-600">
                Since tokens never expire and failed generations are automatically
                refunded, we generally don't offer refunds. However, if you have
                concerns, please contact our support team.
              </p>
            </details>

            <details className="bg-white rounded-lg p-6 border border-gray-200">
              <summary className="font-semibold text-gray-900 cursor-pointer">
                Which package should I choose?
              </summary>
              <p className="mt-2 text-gray-600">
                It depends on your needs! The 500-token package offers the best
                value at 20% off. If you're just starting, the 10-token package is
                perfect for testing. Heavy users love the 100 or 500 token packages.
              </p>
            </details>

            <details className="bg-white rounded-lg p-6 border border-gray-200">
              <summary className="font-semibold text-gray-900 cursor-pointer">
                Is my payment information secure?
              </summary>
              <p className="mt-2 text-gray-600">
                Yes! All payments are processed through Stripe, a PCI-compliant
                payment processor trusted by millions of businesses. We never store
                your credit card information.
              </p>
            </details>
          </div>
        </div>
      </div>

      {/* Token Purchase Modal */}
      <TokenPurchaseModal isOpen={showModal} onClose={() => setShowModal(false)} />
    </div>
  );
}
