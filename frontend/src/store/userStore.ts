/**
 * User state management using Zustand
 *
 * Manages user authentication state, profile data, and trial/token balance.
 *
 * Credit Systems Consolidation (2025-11-11):
 * - Added unified `balances` field for all credit types
 * - Maintains backward compatibility with existing `tokenBalance` and user fields
 * - Use CreditSyncManager for automatic sync with backend
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { UnifiedBalanceResponse } from '@/lib/api';

export interface User {
  id: string;
  email: string;
  email_verified: boolean;
  created_at: string;
  trial_remaining: number;
  trial_used: number;
  subscription_tier: 'free' | '7day_pass' | 'per_property' | 'monthly_pro';
  subscription_status: 'inactive' | 'active' | 'past_due' | 'cancelled';
  stripe_customer_id?: string;
  stripe_subscription_id?: string;
  avatar_url?: string;
  full_name?: string;

  // Holiday Decorator credits (Feature 007)
  holiday_credits?: number;           // Current balance (default: 0)
  holiday_credits_earned?: number;    // Total earned (lifetime)
  whats_new_modal_shown?: boolean;    // Has user seen Holiday feature modal
}

export interface TokenBalance {
  balance: number;
  trial_remaining: number;
}

interface UserState {
  // Authentication state
  user: User | null;
  accessToken: string | null;
  isAuthenticated: boolean;
  _hasHydrated: boolean; // Track if store has loaded from localStorage

  // Token/Trial balance (legacy, for backward compatibility)
  tokenBalance: TokenBalance | null;

  // Unified credit balances (Credit Systems Consolidation)
  balances: UnifiedBalanceResponse | null;

  // Actions
  setUser: (user: User | null) => void;
  setAccessToken: (token: string | null) => void;
  setTokenBalance: (balance: TokenBalance | null) => void;
  setBalances: (balances: UnifiedBalanceResponse | null) => void;
  updateTrialRemaining: (trial_remaining: number) => void;
  updateHolidayCredits: (holiday_credits: number, holiday_credits_earned?: number) => void;
  markWhatsNewModalShown: () => void;
  logout: () => void;
  setHasHydrated: (hasHydrated: boolean) => void;
}

export const useUserStore = create<UserState>()(
  persist(
    (set) => ({
      // Initial state
      user: null,
      accessToken: null,
      isAuthenticated: false,
      _hasHydrated: false,
      tokenBalance: null,
      balances: null,

      // Actions
      setUser: (user) =>
        set({
          user,
          isAuthenticated: !!user,
        }),

      setAccessToken: (token) =>
        set({
          accessToken: token,
          isAuthenticated: !!token,
        }),

      setTokenBalance: (balance) =>
        set({
          tokenBalance: balance,
        }),

      setBalances: (balances) =>
        set((state) => {
          // Update both unified balances and legacy fields for backward compatibility
          const updates: Partial<UserState> = {
            balances,
          };

          // Update user object with credit balances from unified response
          if (balances && state.user) {
            updates.user = {
              ...state.user,
              trial_remaining: balances.trial.remaining,
              trial_used: balances.trial.used,
              holiday_credits: balances.holiday.credits,
              holiday_credits_earned: balances.holiday.earned,
            };

            // Update legacy tokenBalance for backward compatibility
            updates.tokenBalance = {
              balance: balances.token.balance,
              trial_remaining: balances.trial.remaining,
            };
          }

          return updates;
        }),

      updateTrialRemaining: (trial_remaining) =>
        set((state) => ({
          user: state.user
            ? { ...state.user, trial_remaining }
            : null,
          tokenBalance: state.tokenBalance
            ? { ...state.tokenBalance, trial_remaining }
            : null,
        })),

      updateHolidayCredits: (holiday_credits, holiday_credits_earned) =>
        set((state) => ({
          user: state.user
            ? {
                ...state.user,
                holiday_credits,
                holiday_credits_earned:
                  holiday_credits_earned ?? state.user.holiday_credits_earned ?? 0,
              }
            : null,
        })),

      markWhatsNewModalShown: () =>
        set((state) => ({
          user: state.user
            ? { ...state.user, whats_new_modal_shown: true }
            : null,
        })),

      logout: () =>
        set({
          user: null,
          accessToken: null,
          isAuthenticated: false,
          tokenBalance: null,
          balances: null,
        }),

      setHasHydrated: (hasHydrated) =>
        set({
          _hasHydrated: hasHydrated,
        }),
    }),
    {
      name: 'user-storage', // localStorage key
      partialize: (state) => ({
        user: state.user,
        accessToken: state.accessToken,
        isAuthenticated: state.isAuthenticated,
        tokenBalance: state.tokenBalance,
        balances: state.balances, // Include unified balances in localStorage
      }),
      onRehydrateStorage: () => (state) => {
        // Called when store finishes rehydrating from localStorage
        state?.setHasHydrated(true);
      },
    }
  )
);
