/**
 * Token state management using Zustand
 *
 * Manages token balance, packages, and purchase flow with automatic refresh.
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import {
  getTokenBalance,
  getTokenPackages,
  purchaseTokens,
  TokenBalanceResponse,
  TokenPackage
} from '../services/api';

interface TokenState {
  // Balance data
  balance: number;
  total_purchased: number;
  total_spent: number;

  // Available packages
  packages: TokenPackage[];

  // Loading states
  isLoadingBalance: boolean;
  isLoadingPackages: boolean;
  isPurchasing: boolean;

  // Errors
  balanceError: string | null;
  packagesError: string | null;
  purchaseError: string | null;

  // Last fetch timestamp for auto-refresh logic
  lastBalanceFetch: number | null;

  // Actions
  fetchBalance: () => Promise<void>;
  fetchPackages: () => Promise<void>;
  initiatePurchase: (packageId: string) => Promise<string | null>; // Returns checkout URL or null on error
  clearErrors: () => void;
  resetStore: () => void;
}

export const useTokenStore = create<TokenState>()(
  persist(
    (set, get) => ({
      // Initial state
      balance: 0,
      total_purchased: 0,
      total_spent: 0,
      packages: [],
      isLoadingBalance: false,
      isLoadingPackages: false,
      isPurchasing: false,
      balanceError: null,
      packagesError: null,
      purchaseError: null,
      lastBalanceFetch: null,

      // Fetch token balance from API
      fetchBalance: async () => {
        set({ isLoadingBalance: true, balanceError: null });

        try {
          const balanceData: TokenBalanceResponse = await getTokenBalance();

          set({
            balance: balanceData.balance,
            total_purchased: balanceData.total_purchased,
            total_spent: balanceData.total_spent,
            isLoadingBalance: false,
            balanceError: null,
            lastBalanceFetch: Date.now(),
          });
        } catch (error) {
          console.error('Failed to fetch token balance:', error);
          set({
            isLoadingBalance: false,
            balanceError: error instanceof Error ? error.message : 'Failed to fetch balance',
          });
        }
      },

      // Fetch available token packages
      fetchPackages: async () => {
        set({ isLoadingPackages: true, packagesError: null });

        try {
          const packagesData = await getTokenPackages();

          set({
            packages: packagesData,
            isLoadingPackages: false,
            packagesError: null,
          });
        } catch (error) {
          console.error('Failed to fetch token packages:', error);
          set({
            isLoadingPackages: false,
            packagesError: error instanceof Error ? error.message : 'Failed to fetch packages',
          });
        }
      },

      // Initiate token purchase flow
      initiatePurchase: async (packageId: string) => {
        set({ isPurchasing: true, purchaseError: null });

        try {
          const checkoutSession = await purchaseTokens(packageId);

          set({
            isPurchasing: false,
            purchaseError: null,
          });

          // Return checkout URL for redirect
          return checkoutSession.url;
        } catch (error) {
          console.error('Failed to create checkout session:', error);
          set({
            isPurchasing: false,
            purchaseError: error instanceof Error ? error.message : 'Failed to initiate purchase',
          });
          return null;
        }
      },

      // Clear all errors
      clearErrors: () => {
        set({
          balanceError: null,
          packagesError: null,
          purchaseError: null,
        });
      },

      // Reset store to initial state
      resetStore: () => {
        set({
          balance: 0,
          total_purchased: 0,
          total_spent: 0,
          packages: [],
          isLoadingBalance: false,
          isLoadingPackages: false,
          isPurchasing: false,
          balanceError: null,
          packagesError: null,
          purchaseError: null,
          lastBalanceFetch: null,
        });
      },
    }),
    {
      name: 'token-storage', // localStorage key
      partialize: (state) => ({
        balance: state.balance,
        total_purchased: state.total_purchased,
        total_spent: state.total_spent,
        lastBalanceFetch: state.lastBalanceFetch,
      }),
    }
  )
);
