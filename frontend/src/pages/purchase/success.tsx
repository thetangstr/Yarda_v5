/**
 * Token Purchase Success Page
 *
 * Displays success message after Stripe checkout completion.
 *
 * Requirements:
 * - T058: Create /purchase/success page
 * - FR-018: Webhook credits tokens after payment
 * - TC-TOK-3.1: Purchase success flow
 */

import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useUserStore } from '@/store/userStore';
import TokenBalance from '@/components/TokenBalance';

interface SessionData {
  session_id: string;
  amount_paid_cents: number;
  tokens_purchased: number;
  customer_email: string;
  payment_status: string;
}

export default function PurchaseSuccessPage() {
  const router = useRouter();
  const { isAuthenticated, _hasHydrated } = useUserStore();
  const [sessionData, setSessionData] = useState<SessionData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [redirectCountdown, setRedirectCountdown] = useState(5);

  // Extract session_id from URL
  const sessionId = router.query.session_id as string;

  // Redirect if not authenticated (only after store has hydrated from localStorage)
  useEffect(() => {
    // Wait for store to hydrate before checking authentication
    if (!_hasHydrated) return;

    if (!isAuthenticated) {
      router.push('/login?redirect=/purchase/success');
    }
  }, [isAuthenticated, _hasHydrated, router]);

  // Fetch session details
  useEffect(() => {
    if (!sessionId || !isAuthenticated) return;

    const fetchSessionDetails = async () => {
      try {
        const response = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/tokens/purchase/success?session_id=${sessionId}`,
          {
            headers: {
              Authorization: `Bearer ${localStorage.getItem('access_token')}`,
            },
          }
        );

        if (!response.ok) {
          throw new Error('Failed to fetch session details');
        }

        const data = await response.json();
        setSessionData(data);
        setError(null);
      } catch (err) {
        console.error('Error fetching session:', err);
        setError('Unable to verify your purchase. Please check your email for confirmation.');
      } finally {
        setLoading(false);
      }
    };

    fetchSessionDetails();
  }, [sessionId, isAuthenticated]);

  // Countdown and auto-redirect to /generate
  useEffect(() => {
    if (!sessionData || redirectCountdown <= 0) return;

    const intervalId = setInterval(() => {
      setRedirectCountdown((prev) => {
        if (prev <= 1) {
          router.push('/generate');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(intervalId);
  }, [sessionData, redirectCountdown, router]);

  // Show loading while store is hydrating or session data is being fetched
  if (!_hasHydrated || !isAuthenticated || loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-green-50 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
          <p className="mt-4 text-gray-600">Verifying your purchase...</p>
        </div>
      </div>
    );
  }

  if (error || !sessionData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-green-50">
        <Head>
          <title>Purchase Verification - Yarda AI Landscape Studio</title>
        </Head>

        {/* Navbar */}
        <nav className="bg-white border-b border-gray-200 px-6 py-4">
          <div className="max-w-7xl mx-auto flex items-center justify-between">
            <Link href="/" className="text-2xl font-bold text-gray-900">
              Yarda
            </Link>
            <TokenBalance variant="compact" autoRefresh={true} />
          </div>
        </nav>

        {/* Error Content */}
        <div className="max-w-2xl mx-auto px-6 py-16">
          <div className="bg-white rounded-lg shadow-lg p-8 text-center">
            <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <svg
                className="w-8 h-8 text-yellow-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
              </svg>
            </div>

            <h1 className="text-2xl font-bold text-gray-900 mb-4">
              Unable to Verify Purchase
            </h1>

            <p className="text-gray-600 mb-6">
              {error ||
                "We couldn't verify your purchase details at this time. Don't worry - if your payment was successful, your tokens will be credited shortly."}
            </p>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6 text-left">
              <h3 className="font-semibold text-blue-900 mb-2">
                What happens next?
              </h3>
              <ul className="space-y-2 text-sm text-blue-800">
                <li className="flex items-start gap-2">
                  <svg
                    className="w-5 h-5 flex-shrink-0 mt-0.5"
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
                  <span>
                    If your payment was successful, tokens will appear in your
                    account within 1-2 minutes
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <svg
                    className="w-5 h-5 flex-shrink-0 mt-0.5"
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
                  <span>
                    You'll receive a confirmation email from Stripe with your
                    receipt
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <svg
                    className="w-5 h-5 flex-shrink-0 mt-0.5"
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
                  <span>
                    Check your token balance on the generate page or in your
                    profile
                  </span>
                </li>
              </ul>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Link
                href="/generate"
                className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition"
              >
                Go to Generate Page
              </Link>
              <Link
                href="/transactions"
                className="px-6 py-3 bg-gray-200 hover:bg-gray-300 text-gray-900 font-semibold rounded-lg transition"
              >
                View Transaction History
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-green-50">
      <Head>
        <title>Purchase Successful - Yarda AI Landscape Studio</title>
        <meta name="description" content="Your token purchase was successful" />
      </Head>

      {/* Navbar */}
      <nav className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <Link href="/" className="text-2xl font-bold text-gray-900">
            Yarda
          </Link>
          <TokenBalance variant="compact" autoRefresh={true} />
        </div>
      </nav>

      {/* Success Content */}
      <div className="max-w-2xl mx-auto px-6 py-16">
        <div className="bg-white rounded-lg shadow-lg p-8">
          {/* Success Icon with Animation */}
          <div className="text-center mb-8">
            <div className="inline-block relative">
              {/* Animated checkmark */}
              <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4 animate-bounce">
                <svg
                  className="w-10 h-10 text-green-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={3}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
              </div>

              {/* Confetti effect */}
              <div className="absolute inset-0 pointer-events-none">
                <div className="absolute top-0 left-1/4 w-2 h-2 bg-blue-500 rounded-full animate-ping"></div>
                <div className="absolute top-1/4 right-1/4 w-2 h-2 bg-green-500 rounded-full animate-ping" style={{ animationDelay: '0.2s' }}></div>
                <div className="absolute bottom-1/4 left-1/3 w-2 h-2 bg-purple-500 rounded-full animate-ping" style={{ animationDelay: '0.4s' }}></div>
                <div className="absolute top-1/3 right-1/3 w-2 h-2 bg-yellow-500 rounded-full animate-ping" style={{ animationDelay: '0.6s' }}></div>
              </div>
            </div>

            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              Purchase Successful!
            </h1>
            <p className="text-gray-600">
              Your tokens have been added to your account
            </p>
          </div>

          {/* Purchase Details */}
          <div className="bg-gray-50 rounded-lg p-6 mb-6">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="text-sm text-gray-500 mb-1">Tokens Purchased</div>
                <div className="text-2xl font-bold text-gray-900">
                  {sessionData.tokens_purchased} tokens
                </div>
              </div>
              <div>
                <div className="text-sm text-gray-500 mb-1">Amount Paid</div>
                <div className="text-2xl font-bold text-gray-900">
                  ${(sessionData.amount_paid_cents / 100).toFixed(2)}
                </div>
              </div>
            </div>

            <div className="mt-4 pt-4 border-t border-gray-200">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-500">Payment Status</span>
                <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 text-green-800 rounded-full font-medium">
                  <svg
                    className="w-4 h-4"
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
                  {sessionData.payment_status}
                </span>
              </div>
              <div className="flex items-center justify-between text-sm mt-2">
                <span className="text-gray-500">Receipt Email</span>
                <span className="text-gray-900">{sessionData.customer_email}</span>
              </div>
            </div>
          </div>

          {/* Current Balance */}
          <div className="mb-6">
            <TokenBalance variant="full" autoRefresh={true} />
          </div>

          {/* Next Steps */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
            <h3 className="font-semibold text-blue-900 mb-2">
              Ready to create amazing designs?
            </h3>
            <p className="text-sm text-blue-800 mb-3">
              Your tokens are ready to use! Head to the generate page to start
              creating AI-powered landscape designs.
            </p>
            <div className="text-sm text-blue-700">
              Redirecting in{' '}
              <span className="font-bold text-blue-900">{redirectCountdown}</span>{' '}
              seconds...
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-3">
            <Link
              href="/generate"
              className="flex-1 text-center px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition"
            >
              Start Generating Now
            </Link>
            <Link
              href="/transactions"
              className="flex-1 text-center px-6 py-3 bg-gray-200 hover:bg-gray-300 text-gray-900 font-semibold rounded-lg transition"
            >
              View Transactions
            </Link>
          </div>
        </div>

        {/* Additional Info */}
        <div className="mt-8 text-center text-sm text-gray-600">
          <p>
            A receipt has been sent to your email. If you have any questions,
            please{' '}
            <a href="/support" className="text-blue-600 hover:text-blue-700">
              contact support
            </a>
            .
          </p>
        </div>
      </div>
    </div>
  );
}
