/**
 * TrialCounter Component
 *
 * Displays user's remaining trial credits with real-time updates.
 *
 * Requirements:
 * - TC-UI-1.1: Real-time trial counter display
 * - FR-015: Display trial_remaining in UI
 *
 * Features:
 * - Shows trial_remaining count
 * - Updates in real-time when credits are used
 * - Visual indicator when credits are low (≤1)
 * - Links to purchase page when exhausted
 */

import React from 'react';
import { useUserStore } from '@/store/userStore';

interface TrialCounterProps {
  /** Display variant: 'compact' for navbar, 'full' for dashboard */
  variant?: 'compact' | 'full';
  /** Custom CSS classes */
  className?: string;
}

export const TrialCounter: React.FC<TrialCounterProps> = ({
  variant = 'compact',
  className = ''
}) => {
  const { user } = useUserStore();

  // Don't show if user not authenticated
  if (!user) {
    return null;
  }

  const trialRemaining = user.trial_remaining || 0;
  const trialUsed = user.trial_used || 0;

  // Determine status color
  const getStatusColor = () => {
    if (trialRemaining === 0) return 'text-red-600 bg-red-50';
    if (trialRemaining === 1) return 'text-orange-600 bg-orange-50';
    return 'text-green-600 bg-green-50';
  };

  // Compact variant for navbar
  if (variant === 'compact') {
    return (
      <div
        data-testid="trial-counter"
        className={`flex items-center gap-2 px-3 py-1.5 rounded-full ${getStatusColor()} ${className}`}
      >
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
            d="M12 8v13m0-13V6a2 2 0 112 2h-2zm0 0V5.5A2.5 2.5 0 109.5 8H12zm-7 4h14M5 12a2 2 0 110-4h14a2 2 0 110 4M5 12v7a2 2 0 002 2h10a2 2 0 002-2v-7"
          />
        </svg>
        <span className="text-sm font-medium">
          {trialRemaining} {trialRemaining === 1 ? 'trial credit' : 'trial credits'}
        </span>
      </div>
    );
  }

  // Full variant for dashboard/profile
  return (
    <div
      data-testid="trial-counter"
      className={`p-6 rounded-lg border ${getStatusColor()} ${className}`}
    >
      <div className="flex items-start justify-between">
        <div>
          <h3 className="text-lg font-semibold mb-1">Trial Credits</h3>
          <p className="text-sm opacity-75">
            Free landscape design generations
          </p>
        </div>
        <svg
          className="w-8 h-8"
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

      <div className="mt-4">
        <div className="flex items-baseline gap-2">
          <span className="text-4xl font-bold">{trialRemaining}</span>
          <span className="text-lg opacity-75">remaining</span>
        </div>

        <div className="mt-2 flex items-center gap-2 text-sm opacity-75">
          <span>{trialUsed} used</span>
          <span>•</span>
          <span>3 total</span>
        </div>
      </div>

      {/* Progress bar */}
      <div className="mt-4 h-2 bg-gray-200 rounded-full overflow-hidden">
        <div
          className={`h-full transition-all duration-300 ${
            trialRemaining === 0
              ? 'bg-red-500'
              : trialRemaining === 1
              ? 'bg-orange-500'
              : 'bg-green-500'
          }`}
          style={{ width: `${(trialRemaining / 3) * 100}%` }}
        />
      </div>

      {/* Status message */}
      {trialRemaining === 0 && (
        <div className="mt-4 p-3 bg-white rounded border border-red-200">
          <p className="text-sm font-medium text-red-700">
            Your trial credits are exhausted
          </p>
          <p className="text-xs text-red-600 mt-1">
            Purchase tokens or subscribe to continue generating designs
          </p>
          <a
            href="/purchase"
            className="inline-block mt-2 text-sm font-medium text-red-600 hover:text-red-700 underline"
          >
            Purchase Tokens →
          </a>
        </div>
      )}

      {trialRemaining === 1 && (
        <div className="mt-4 p-3 bg-white rounded border border-orange-200">
          <p className="text-sm font-medium text-orange-700">
            Only 1 trial credit remaining
          </p>
          <p className="text-xs text-orange-600 mt-1">
            Consider purchasing tokens for future generations
          </p>
        </div>
      )}
    </div>
  );
};

export default TrialCounter;
