/**
 * User state management using Zustand
 *
 * Manages user authentication state, profile data, and trial/token balance.
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

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

  // Token/Trial balance
  tokenBalance: TokenBalance | null;

  // Actions
  setUser: (user: User | null) => void;
  setAccessToken: (token: string | null) => void;
  setTokenBalance: (balance: TokenBalance | null) => void;
  updateTrialRemaining: (trial_remaining: number) => void;
  logout: () => void;
}

export const useUserStore = create<UserState>()(
  persist(
    (set) => ({
      // Initial state
      user: null,
      accessToken: null,
      isAuthenticated: false,
      tokenBalance: null,

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

      updateTrialRemaining: (trial_remaining) =>
        set((state) => ({
          user: state.user
            ? { ...state.user, trial_remaining }
            : null,
          tokenBalance: state.tokenBalance
            ? { ...state.tokenBalance, trial_remaining }
            : null,
        })),

      logout: () =>
        set({
          user: null,
          accessToken: null,
          isAuthenticated: false,
          tokenBalance: null,
        }),
    }),
    {
      name: 'user-storage', // localStorage key
      partialize: (state) => ({
        user: state.user,
        accessToken: state.accessToken,
        isAuthenticated: state.isAuthenticated,
        tokenBalance: state.tokenBalance,
      }),
    }
  )
);
