/**
 * TrialExhaustedModal Component
 *
 * Modal displayed when user tries to generate with 0 trial credits.
 *
 * Requirements:
 * - TC-UI-1.2: Display modal when trial_remaining=0
 * - FR-016: Block generation when trial_remaining=0
 *
 * Features:
 * - Explains trial credits are exhausted
 * - Provides options: Purchase Tokens or Subscribe
 * - Links to pricing pages
 * - Can be dismissed
 */

import React from 'react';
import { useRouter } from 'next/router';

interface TrialExhaustedModalProps {
  /** Whether modal is visible */
  isOpen: boolean;
  /** Callback when modal is closed */
  onClose: () => void;
  /** Optional callback when "Purchase Tokens" is clicked */
  onPurchaseTokens?: () => void;
}

export const TrialExhaustedModal: React.FC<TrialExhaustedModalProps> = ({
  isOpen,
  onClose,
  onPurchaseTokens
}) => {
  const router = useRouter();

  if (!isOpen) return null;

  const handlePurchaseTokens = () => {
    if (onPurchaseTokens) {
      // Use callback if provided (e.g., to show TokenPurchaseModal)
      onPurchaseTokens();
      onClose();
    } else {
      // Otherwise navigate to purchase page
      router.push('/purchase');
      onClose();
    }
  };

  const handleLearnSubscriptions = () => {
    router.push('/pricing');
    onClose();
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black bg-opacity-50 z-40 transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal */}
      <div
        data-testid="trial-exhausted-modal"
        className="fixed inset-0 z-50 flex items-center justify-center p-4"
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
      >
        <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6 relative">
          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition"
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

          {/* Icon */}
          <div className="flex justify-center mb-4">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center">
              <svg
                className="w-8 h-8 text-red-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8v13m0-13V6a2 2 0 112 2h-2zm0 0V5.5A2.5 2.5 0 109.5 8H12zm-7 4h14M5 12a2 2 0 110-4h14a2 2 0 110 4M5 12v7a2 2 0 002 2h10a2 2 0 002-2v-7"
                />
              </svg>
            </div>
          </div>

          {/* Title */}
          <h2
            id="modal-title"
            className="text-2xl font-bold text-center text-gray-900 mb-2"
          >
            Your trial credits are exhausted
          </h2>

          {/* Description */}
          <p className="text-center text-gray-600 mb-6">
            You've used all 3 free trial credits. To continue generating
            beautiful landscape designs, please choose one of the following
            options:
          </p>

          {/* Options */}
          <div className="space-y-3 mb-6">
            {/* Purchase Tokens */}
            <button
              onClick={handlePurchaseTokens}
              className="w-full px-6 py-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition flex items-center justify-between group"
            >
              <div className="text-left">
                <div className="font-semibold">Purchase Tokens</div>
                <div className="text-sm text-blue-100">
                  Pay-per-use, starting at $1 per generation
                </div>
              </div>
              <svg
                className="w-5 h-5 group-hover:translate-x-1 transition-transform"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 5l7 7-7 7"
                />
              </svg>
            </button>

            {/* Learn About Subscriptions */}
            <button
              onClick={handleLearnSubscriptions}
              className="w-full px-6 py-4 bg-gray-100 text-gray-900 rounded-lg hover:bg-gray-200 transition flex items-center justify-between group"
            >
              <div className="text-left">
                <div className="font-semibold">Learn About Subscriptions</div>
                <div className="text-sm text-gray-600">
                  Unlimited generations with monthly plans
                </div>
              </div>
              <svg
                className="w-5 h-5 group-hover:translate-x-1 transition-transform"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 5l7 7-7 7"
                />
              </svg>
            </button>
          </div>

          {/* Footer */}
          <div className="text-center">
            <button
              onClick={onClose}
              className="text-sm text-gray-500 hover:text-gray-700 underline"
            >
              Not now
            </button>
          </div>
        </div>
      </div>
    </>
  );
};

export default TrialExhaustedModal;
