/**
 * Subscription state management using Zustand
 *
 * Manages subscription state, plan selection, and subscription lifecycle.
 *
 * Requirements:
 * - T095: subscriptionStore with Zustand
 * - Fetch current subscription status
 * - Subscribe to plan
 * - Cancel subscription
 * - Open customer portal
 * - Loading and error states
 */

import { create } from 'zustand';
import { subscriptionAPI, getErrorMessage } from '@/lib/api';

export interface SubscriptionPlan {
  plan_id: string;
  name: string;
  price_cents: number;
  description: string;
  features: string[];
  billing_period: 'monthly' | 'annual';
}

export interface SubscriptionStatus {
  subscription_id: string;
  status: 'active' | 'inactive' | 'past_due' | 'cancelled';
  plan_id: string;
  plan_name: string;
  price_cents: number;
  current_period_start: string;
  current_period_end: string;
  cancel_at_period_end: boolean;
  cancelled_at?: string;
}

interface SubscriptionStore {
  // State
  subscription: SubscriptionStatus | null;
  plans: SubscriptionPlan[];
  isLoading: boolean;
  error: string | null;

  // Actions
  fetchSubscription: () => Promise<void>;
  fetchPlans: () => Promise<void>;
  subscribe: (planId: string) => Promise<void>;
  cancelSubscription: () => Promise<void>;
  openCustomerPortal: () => Promise<void>;
  clearError: () => void;
}

export const useSubscriptionStore = create<SubscriptionStore>((set, get) => ({
  // Initial state
  subscription: null,
  plans: [],
  isLoading: false,
  error: null,

  // Fetch current subscription status
  fetchSubscription: async () => {
    set({ isLoading: true, error: null });
    try {
      const subscription = await subscriptionAPI.getCurrentSubscription();
      set({ subscription, isLoading: false });
    } catch (err: any) {
      // If 404, user has no subscription (not an error)
      if (err.response?.status === 404) {
        set({ subscription: null, isLoading: false, error: null });
      } else {
        const errorMessage = getErrorMessage(err);
        set({ error: errorMessage, isLoading: false });
      }
    }
  },

  // Fetch available subscription plans
  fetchPlans: async () => {
    set({ isLoading: true, error: null });
    try {
      const plans = await subscriptionAPI.getPlans();
      set({ plans, isLoading: false });
    } catch (err) {
      const errorMessage = getErrorMessage(err);
      set({ error: errorMessage, isLoading: false });
    }
  },

  // Subscribe to a plan
  subscribe: async (planId: string) => {
    set({ isLoading: true, error: null });
    try {
      // Create checkout session
      const { url } = await subscriptionAPI.createCheckout(
        planId,
        `${window.location.origin}/subscription/success`,
        `${window.location.origin}/subscription/cancel`
      );

      // Redirect to Stripe Checkout
      window.location.href = url;
    } catch (err) {
      const errorMessage = getErrorMessage(err);
      set({ error: errorMessage, isLoading: false });
      throw err;
    }
  },

  // Cancel subscription
  cancelSubscription: async () => {
    set({ isLoading: true, error: null });
    try {
      await subscriptionAPI.cancelSubscription();

      // Refresh subscription status
      await get().fetchSubscription();
    } catch (err) {
      const errorMessage = getErrorMessage(err);
      set({ error: errorMessage, isLoading: false });
      throw err;
    }
  },

  // Open Stripe customer portal
  openCustomerPortal: async () => {
    set({ isLoading: true, error: null });
    try {
      const { url } = await subscriptionAPI.getCustomerPortal();
      window.location.href = url;
    } catch (err) {
      const errorMessage = getErrorMessage(err);
      set({ error: errorMessage, isLoading: false });
      throw err;
    }
  },

  // Clear error
  clearError: () => {
    set({ error: null });
  },
}));
