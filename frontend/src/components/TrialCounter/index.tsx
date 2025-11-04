/**
 * TrialCounter Component
 *
 * Displays user's remaining trial credits with real-time updates.
 * Updated with yarda.pro design system.
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
 * - Sage green for active, warning/error for low/exhausted
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

  // Determine status color using yarda.pro palette
  const getStatusColor = () => {
    if (trialRemaining === 0) return 'text-error-700 bg-error-50 border-error-200';
    if (trialRemaining === 1) return 'text-warning-700 bg-warning-50 border-warning-200';
    return 'text-brand-dark-green bg-brand-sage border-brand-sage';
  };

  const getProgressColor = () => {
    if (trialRemaining === 0) return 'bg-error-500';
    if (trialRemaining === 1) return 'bg-warning-500';
    return 'bg-brand-green';
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
      className={`p-6 rounded-xl border-2 bg-white shadow-md ${className}`}
    >
      <div className="flex items-start justify-between">
        <div>
          <h3 className="text-lg font-semibold mb-1 text-neutral-900">Trial Credits</h3>
          <p className="text-sm text-neutral-600">
            Free landscape design generations
          </p>
        </div>
        <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
          trialRemaining === 0
            ? 'bg-error-50'
            : trialRemaining === 1
            ? 'bg-warning-50'
            : 'bg-brand-sage'
        }`}>
          <svg
            className={`w-6 h-6 ${
              trialRemaining === 0
                ? 'text-error-600'
                : trialRemaining === 1
                ? 'text-warning-600'
                : 'text-brand-green'
            }`}
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

      <div className="mt-4">
        <div className="flex items-baseline gap-2">
          <span className={`text-4xl font-bold ${
            trialRemaining === 0
              ? 'text-error-600'
              : trialRemaining === 1
              ? 'text-warning-600'
              : 'text-brand-green'
          }`}>
            {trialRemaining}
          </span>
          <span className="text-lg text-neutral-600">remaining</span>
        </div>

        <div className="mt-2 flex items-center gap-2 text-sm text-neutral-500">
          <span>{trialUsed} used</span>
          <span>•</span>
          <span>3 total</span>
        </div>
      </div>

      {/* Progress bar */}
      <div className="mt-4 h-2 bg-neutral-200 rounded-full overflow-hidden">
        <div
          className={`h-full transition-all duration-300 ${getProgressColor()}`}
          style={{ width: `${(trialRemaining / 3) * 100}%` }}
        />
      </div>

      {/* Status message */}
      {trialRemaining === 0 && (
        <div className="mt-4 p-4 bg-error-50 border border-error-200 rounded-lg">
          <p className="text-sm font-semibold text-error-800">
            Your trial credits are exhausted
          </p>
          <p className="text-xs text-error-700 mt-1">
            Purchase tokens or subscribe to continue generating designs
          </p>
          <a
            href="/purchase"
            className="inline-block mt-3 px-4 py-2 bg-error-600 hover:bg-error-700 text-white text-sm font-medium rounded-lg transition-colors duration-200"
          >
            Purchase Tokens →
          </a>
        </div>
      )}

      {trialRemaining === 1 && (
        <div className="mt-4 p-4 bg-warning-50 border border-warning-200 rounded-lg">
          <p className="text-sm font-semibold text-warning-800">
            Only 1 trial credit remaining
          </p>
          <p className="text-xs text-warning-700 mt-1">
            Consider purchasing tokens for future generations
          </p>
        </div>
      )}

      {trialRemaining > 1 && (
        <div className="mt-4 p-4 bg-brand-sage border border-brand-sage rounded-lg">
          <p className="text-sm text-brand-dark-green">
            You have <strong>{trialRemaining} free designs</strong> remaining. Try different styles!
          </p>
        </div>
      )}
    </div>
  );
};

export default TrialCounter;
