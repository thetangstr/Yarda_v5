/**
 * TokenPurchaseModal Component
 *
 * Modal for selecting and purchasing token packages.
 *
 * Requirements:
 * - T055: TokenPurchaseModal component
 * - FR-021 to FR-024: 4 token packages
 * - FR-025: Token package selection UI
 * - TC-TOK-5.1: Display all 4 packages with pricing
 */

import React, { useState, useEffect } from 'react';
import { getErrorMessage } from '@/lib/api';

interface TokenPackage {
  package_id: string;
  tokens: number;
  price_usd: number;
  price_cents: number;
  price_per_token: number;
  discount_percent: number | null;
  is_best_value: boolean;
  description: string;
}

interface TokenPurchaseModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function TokenPurchaseModal({
  isOpen,
  onClose,
}: TokenPurchaseModalProps) {
  const [packages, setPackages] = useState<TokenPackage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedPackage, setSelectedPackage] = useState<string | null>(null);
  const [purchasing, setPurchasing] = useState(false);

  // Fetch packages when modal opens
  useEffect(() => {
    if (isOpen) {
      fetchPackages();
    }
  }, [isOpen]);

  const fetchPackages = async () => {
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/tokens/packages`
      );

      if (!response.ok) {
        throw new Error('Failed to fetch packages');
      }

      const data = await response.json();
      setPackages(data);
      setError(null);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const handlePurchase = async (packageId: string) => {
    setSelectedPackage(packageId);
    setPurchasing(true);

    try {
      const accessToken = localStorage.getItem('access_token');
      if (!accessToken) {
        throw new Error('Not authenticated');
      }

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/tokens/purchase/checkout`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${accessToken}`,
          },
          body: JSON.stringify({ package_id: packageId }),
        }
      );

      if (!response.ok) {
        throw new Error('Failed to create checkout session');
      }

      const data = await response.json();

      // Redirect to Stripe Checkout
      window.location.href = data.url;
    } catch (err) {
      setError(getErrorMessage(err));
      setPurchasing(false);
      setSelectedPackage(null);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      data-testid="token-purchase-modal"
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <h2 className="text-2xl font-bold text-gray-900">Purchase Tokens</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition"
            aria-label="Close modal"
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
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {/* Error Message */}
          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
              {error}
            </div>
          )}

          {/* Loading State */}
          {loading && (
            <div className="text-center py-12">
              <div className="inline-block w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
              <p className="mt-4 text-gray-600">Loading packages...</p>
            </div>
          )}

          {/* Packages Grid */}
          {!loading && packages.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {packages.map((pkg, index) => (
                <div
                  key={pkg.package_id}
                  data-testid={`package-${index}`}
                  className={`relative border-2 rounded-lg p-6 transition ${
                    pkg.is_best_value
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 bg-white hover:border-gray-300'
                  }`}
                >
                  {/* Best Value Badge */}
                  {pkg.is_best_value && (
                    <div className="absolute top-0 right-0 bg-blue-600 text-white text-xs font-bold px-3 py-1 rounded-bl-lg rounded-tr-lg">
                      BEST VALUE
                    </div>
                  )}

                  {/* Discount Badge */}
                  {pkg.discount_percent && !pkg.is_best_value && (
                    <div className="absolute top-0 right-0 bg-green-600 text-white text-xs font-bold px-3 py-1 rounded-bl-lg rounded-tr-lg">
                      Save {pkg.discount_percent}%
                    </div>
                  )}

                  {/* Package Content */}
                  <div className="mb-4">
                    <h3 className="text-3xl font-bold text-gray-900 mb-1">
                      {pkg.tokens} tokens
                    </h3>
                    <p className="text-gray-600 text-sm">{pkg.description}</p>
                  </div>

                  {/* Pricing */}
                  <div className="mb-4">
                    <div className="flex items-baseline gap-2">
                      <span className="text-4xl font-bold text-gray-900">
                        ${pkg.price_usd.toFixed(2)}
                      </span>
                    </div>
                    <div className="text-sm text-gray-600 mt-1">
                      ${pkg.price_per_token.toFixed(2)} per token
                    </div>
                  </div>

                  {/* Features */}
                  <ul className="space-y-2 mb-6">
                    <li className="flex items-start gap-2 text-sm text-gray-700">
                      <svg
                        className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5"
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
                      <span>{pkg.tokens} AI-powered landscape generations</span>
                    </li>
                    <li className="flex items-start gap-2 text-sm text-gray-700">
                      <svg
                        className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5"
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
                      <span>Multiple design styles</span>
                    </li>
                    <li className="flex items-start gap-2 text-sm text-gray-700">
                      <svg
                        className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5"
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
                      <span>Tokens never expire</span>
                    </li>
                    {pkg.discount_percent && (
                      <li className="flex items-start gap-2 text-sm font-semibold text-green-700">
                        <svg
                          className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5"
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
                        <span>Save {pkg.discount_percent}%</span>
                      </li>
                    )}
                  </ul>

                  {/* Purchase Button */}
                  <button
                    onClick={() => handlePurchase(pkg.package_id)}
                    disabled={purchasing && selectedPackage === pkg.package_id}
                    className={`w-full py-3 px-4 rounded-lg font-semibold transition ${
                      pkg.is_best_value
                        ? 'bg-blue-600 hover:bg-blue-700 text-white'
                        : 'bg-gray-900 hover:bg-gray-800 text-white'
                    } disabled:opacity-50 disabled:cursor-not-allowed`}
                  >
                    {purchasing && selectedPackage === pkg.package_id
                      ? 'Processing...'
                      : 'Purchase'}
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Info Section */}
          <div className="mt-8 p-4 bg-gray-50 rounded-lg">
            <h4 className="font-semibold text-gray-900 mb-2">
              How Token Credits Work
            </h4>
            <ul className="space-y-2 text-sm text-gray-700">
              <li className="flex items-start gap-2">
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
                    d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                <span>1 token = 1 landscape design generation</span>
              </li>
              <li className="flex items-start gap-2">
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
                    d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                <span>Tokens never expire - use them at your own pace</span>
              </li>
              <li className="flex items-start gap-2">
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
                    d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                <span>
                  If a generation fails, your token is automatically refunded
                </span>
              </li>
              <li className="flex items-start gap-2">
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
                    d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                <span>Secure payment processing via Stripe</span>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
