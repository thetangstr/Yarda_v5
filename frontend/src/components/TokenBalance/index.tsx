/**
 * TokenBalance Component
 *
 * Displays user's token balance with auto-refresh.
 * Updated with yarda.pro design system.
 *
 * Requirements:
 * - T054: TokenBalance component
 * - FR-015: Display token balance in UI
 * - TC-TOK-2.1: Auto-refresh every 10 seconds
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useUserStore } from '@/store/userStore';

interface TokenBalanceProps {
  variant?: 'compact' | 'full';
  autoRefresh?: boolean;
  refreshInterval?: number; // milliseconds
}

interface TokenBalanceData {
  balance: number;
  total_purchased: number;
  total_spent: number;
}

export default function TokenBalance({
  variant = 'full',
  autoRefresh = true,
  refreshInterval = 10000, // 10 seconds default
}: TokenBalanceProps) {
  const { isAuthenticated } = useUserStore();
  const [balance, setBalance] = useState<TokenBalanceData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchBalance = useCallback(async () => {
    // Don't make API calls if not authenticated
    if (!isAuthenticated) {
      setLoading(false);
      setBalance(null);
      setError(null);
      return;
    }

    try {
      setLoading(true);
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/tokens/balance`,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('access_token')}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error('Failed to fetch token balance');
      }

      const data = await response.json();
      setBalance(data);
      setError(null);
    } catch (err) {
      console.error('Error fetching token balance:', err);
      setError('Failed to load balance');
      // Set balance to 0 on error
      setBalance({ balance: 0, total_purchased: 0, total_spent: 0 });
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated]);

  // Initial fetch - only when authenticated
  useEffect(() => {
    if (isAuthenticated) {
      fetchBalance();
    } else {
      // Clear state when not authenticated
      setBalance(null);
      setLoading(false);
      setError(null);
    }
  }, [isAuthenticated, fetchBalance]);

  // Auto-refresh every 10 seconds - only when authenticated
  useEffect(() => {
    if (!autoRefresh || !isAuthenticated) return;

    const intervalId = setInterval(() => {
      fetchBalance();
    }, refreshInterval);

    return () => clearInterval(intervalId);
  }, [autoRefresh, refreshInterval, isAuthenticated, fetchBalance]);

  // Don't render anything if not authenticated
  if (!isAuthenticated) {
    return null;
  }

  if (loading && !balance) {
    return (
      <div
        data-testid="token-balance"
        className={variant === 'compact' ? 'text-sm' : ''}
      >
        Loading...
      </div>
    );
  }

  if (error && !balance) {
    return (
      <div
        data-testid="token-balance"
        className="text-error-600 text-sm"
      >
        {error}
      </div>
    );
  }

  const tokenBalance = balance?.balance ?? 0;

  // Compact variant (for navbar)
  if (variant === 'compact') {
    return (
      <div
        data-testid="token-balance"
        className="flex items-center gap-2 px-3 py-1.5 bg-brand-sage text-brand-dark-green rounded-full text-sm font-medium"
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
            d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
        <span>{tokenBalance} tokens</span>
      </div>
    );
  }

  // Full variant (for dashboard)
  return (
    <div
      data-testid="token-balance"
      className="bg-white rounded-xl border-2 border-brand-sage p-6 shadow-md"
    >
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-neutral-900">Token Balance</h3>
        <div className="w-12 h-12 bg-brand-sage rounded-full flex items-center justify-center">
          <svg
            className="w-6 h-6 text-brand-green"
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
        </div>
      </div>

      <div className="space-y-3">
        {/* Current Balance */}
        <div className="flex items-baseline gap-2">
          <span className="text-4xl font-bold text-brand-green">
            {tokenBalance}
          </span>
          <span className="text-neutral-600">available tokens</span>
        </div>

        {/* Statistics */}
        {balance && (
          <div className="grid grid-cols-2 gap-4 pt-4 border-t border-brand-sage">
            <div>
              <div className="text-xs text-neutral-500 mb-1">Total Purchased</div>
              <div className="text-lg font-semibold text-neutral-900">
                {balance.total_purchased}
              </div>
            </div>
            <div>
              <div className="text-xs text-neutral-500 mb-1">Total Spent</div>
              <div className="text-lg font-semibold text-neutral-900">
                {balance.total_spent}
              </div>
            </div>
          </div>
        )}

        {/* Low Balance Warning */}
        {tokenBalance < 5 && tokenBalance > 0 && (
          <div className="mt-4 p-3 bg-warning-50 border border-warning-200 rounded-lg">
            <p className="text-sm text-warning-800">
              Your token balance is running low. Consider purchasing more tokens.
            </p>
          </div>
        )}

        {/* Zero Balance */}
        {tokenBalance === 0 && (
          <div className="mt-4 p-3 bg-error-50 border border-error-200 rounded-lg">
            <p className="text-sm text-error-800 font-medium">
              You're out of tokens! Purchase tokens to continue generating designs.
            </p>
          </div>
        )}

        {/* Purchase Button */}
        <button
          onClick={() => {
            window.location.href = '/purchase';
          }}
          className="w-full mt-4 py-3 px-4 bg-brand-green hover:bg-brand-dark-green text-white font-medium rounded-lg transition-colors duration-200"
        >
          Purchase Tokens
        </button>
      </div>

      {/* Auto-refresh indicator */}
      {autoRefresh && (
        <div className="mt-4 text-xs text-neutral-400 text-center">
          Auto-refreshes every 10 seconds
        </div>
      )}
    </div>
  );
}
