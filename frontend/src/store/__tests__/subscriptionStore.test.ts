/**
 * Subscription Store Tests
 *
 * Tests for subscription state management with Zustand.
 *
 * Requirements:
 * - T095: subscriptionStore with Zustand
 * - Test state updates
 * - Test API integration
 * - Test error handling
 */

import { renderHook, act, waitFor } from '@testing-library/react';
import { useSubscriptionStore } from '../subscriptionStore';
import { subscriptionAPI } from '@/lib/api';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';

// Mock the API
vi.mock('@/lib/api', () => ({
  subscriptionAPI: {
    getCurrentSubscription: vi.fn(),
    getPlans: vi.fn(),
    createCheckout: vi.fn(),
    cancelSubscription: vi.fn(),
    getCustomerPortal: vi.fn(),
  },
  getErrorMessage: vi.fn((err: any) => err.message || 'An error occurred'),
}));

describe('useSubscriptionStore', () => {
  beforeEach(() => {
    // Reset store state before each test
    const { result } = renderHook(() => useSubscriptionStore());
    act(() => {
      result.current.subscription = null;
      result.current.plans = [];
      result.current.isLoading = false;
      result.current.error = null;
    });

    // Clear all mocks
    vi.clearAllMocks();

    // Mock window.location.href
    delete (window as any).location;
    window.location = { href: '' } as any;
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Initial State', () => {
    it('should have correct initial state', () => {
      const { result } = renderHook(() => useSubscriptionStore());

      expect(result.current.subscription).toBeNull();
      expect(result.current.plans).toEqual([]);
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBeNull();
    });
  });

  describe('fetchSubscription', () => {
    it('should fetch subscription successfully', async () => {
      const mockSubscription = {
        subscription_id: 'sub_123',
        status: 'active' as const,
        plan_id: 'monthly_pro',
        plan_name: 'Monthly Pro',
        price_cents: 9900,
        current_period_start: '2024-01-01T00:00:00Z',
        current_period_end: '2024-02-01T00:00:00Z',
        cancel_at_period_end: false,
      };

      (subscriptionAPI.getCurrentSubscription as any).mockResolvedValue(mockSubscription);

      const { result } = renderHook(() => useSubscriptionStore());

      await act(async () => {
        await result.current.fetchSubscription();
      });

      expect(result.current.subscription).toEqual(mockSubscription);
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBeNull();
      expect(subscriptionAPI.getCurrentSubscription).toHaveBeenCalled();
    });

    it('should handle 404 as no subscription (not error)', async () => {
      const mockError = {
        response: { status: 404 },
      };

      (subscriptionAPI.getCurrentSubscription as any).mockRejectedValue(mockError);

      const { result } = renderHook(() => useSubscriptionStore());

      await act(async () => {
        await result.current.fetchSubscription();
      });

      expect(result.current.subscription).toBeNull();
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBeNull(); // 404 is not an error state
    });

    it('should handle API errors', async () => {
      const mockError = new Error('Network error');
      (subscriptionAPI.getCurrentSubscription as any).mockRejectedValue(mockError);

      const { result } = renderHook(() => useSubscriptionStore());

      await act(async () => {
        await result.current.fetchSubscription();
      });

      expect(result.current.subscription).toBeNull();
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBe('Network error');
    });

    it('should set loading state during fetch', async () => {
      let resolvePromise: any;
      const promise = new Promise((resolve) => {
        resolvePromise = resolve;
      });

      (subscriptionAPI.getCurrentSubscription as any).mockReturnValue(promise);

      const { result } = renderHook(() => useSubscriptionStore());

      act(() => {
        result.current.fetchSubscription();
      });

      // Should be loading
      expect(result.current.isLoading).toBe(true);

      // Resolve the promise
      await act(async () => {
        resolvePromise({
          subscription_id: 'sub_123',
          status: 'active' as const,
          plan_id: 'monthly_pro',
          plan_name: 'Monthly Pro',
          price_cents: 9900,
          current_period_start: '2024-01-01T00:00:00Z',
          current_period_end: '2024-02-01T00:00:00Z',
          cancel_at_period_end: false,
        });
        await promise;
      });

      // Should not be loading anymore
      expect(result.current.isLoading).toBe(false);
    });
  });

  describe('fetchPlans', () => {
    it('should fetch plans successfully', async () => {
      const mockPlans = [
        {
          plan_id: 'monthly_pro',
          name: 'Monthly Pro',
          price_cents: 9900,
          description: 'Unlimited generations',
          features: ['Unlimited generations', 'Priority processing'],
          billing_period: 'monthly' as const,
        },
      ];

      (subscriptionAPI.getPlans as any).mockResolvedValue(mockPlans);

      const { result } = renderHook(() => useSubscriptionStore());

      await act(async () => {
        await result.current.fetchPlans();
      });

      expect(result.current.plans).toEqual(mockPlans);
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBeNull();
      expect(subscriptionAPI.getPlans).toHaveBeenCalled();
    });

    it('should handle API errors', async () => {
      const mockError = new Error('Failed to load plans');
      (subscriptionAPI.getPlans as any).mockRejectedValue(mockError);

      const { result } = renderHook(() => useSubscriptionStore());

      await act(async () => {
        await result.current.fetchPlans();
      });

      expect(result.current.plans).toEqual([]);
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBe('Failed to load plans');
    });
  });

  describe('subscribe', () => {
    it('should create checkout and redirect', async () => {
      const mockCheckoutResponse = {
        url: 'https://checkout.stripe.com/session/123',
        session_id: 'cs_test123',
      };

      (subscriptionAPI.createCheckout as any).mockResolvedValue(mockCheckoutResponse);

      const { result } = renderHook(() => useSubscriptionStore());

      await act(async () => {
        await result.current.subscribe('monthly_pro');
      });

      expect(subscriptionAPI.createCheckout).toHaveBeenCalledWith(
        'monthly_pro',
        expect.stringContaining('/subscription/success'),
        expect.stringContaining('/subscription/cancel')
      );

      // Should redirect to Stripe
      expect(window.location.href).toBe(mockCheckoutResponse.url);
    });

    it('should handle API errors and throw', async () => {
      const mockError = new Error('Checkout failed');
      (subscriptionAPI.createCheckout as any).mockRejectedValue(mockError);

      const { result } = renderHook(() => useSubscriptionStore());

      let thrownError = false;
      await act(async () => {
        try {
          await result.current.subscribe('monthly_pro');
        } catch (err) {
          thrownError = true;
        }
      });

      expect(thrownError).toBe(true);
      expect(result.current.error).toBe('Checkout failed');
      expect(result.current.isLoading).toBe(false);
    });
  });

  describe('cancelSubscription', () => {
    it('should cancel subscription and refresh status', async () => {
      const mockSubscription = {
        subscription_id: 'sub_123',
        status: 'active' as const,
        plan_id: 'monthly_pro',
        plan_name: 'Monthly Pro',
        price_cents: 9900,
        current_period_start: '2024-01-01T00:00:00Z',
        current_period_end: '2024-02-01T00:00:00Z',
        cancel_at_period_end: false,
      };

      const mockCancelledSubscription = {
        ...mockSubscription,
        cancel_at_period_end: true,
      };

      (subscriptionAPI.cancelSubscription as any).mockResolvedValue({});
      (subscriptionAPI.getCurrentSubscription as any).mockResolvedValue(mockCancelledSubscription);

      const { result } = renderHook(() => useSubscriptionStore());

      // Set initial subscription
      act(() => {
        result.current.subscription = mockSubscription;
      });

      await act(async () => {
        await result.current.cancelSubscription();
      });

      expect(subscriptionAPI.cancelSubscription).toHaveBeenCalled();
      expect(subscriptionAPI.getCurrentSubscription).toHaveBeenCalled();
      expect(result.current.subscription?.cancel_at_period_end).toBe(true);
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBeNull();
    });

    it('should handle API errors and throw', async () => {
      const mockError = new Error('Cancel failed');
      (subscriptionAPI.cancelSubscription as any).mockRejectedValue(mockError);

      const { result } = renderHook(() => useSubscriptionStore());

      let thrownError = false;
      await act(async () => {
        try {
          await result.current.cancelSubscription();
        } catch (err) {
          thrownError = true;
        }
      });

      expect(thrownError).toBe(true);
      expect(result.current.error).toBe('Cancel failed');
      expect(result.current.isLoading).toBe(false);
    });
  });

  describe('openCustomerPortal', () => {
    it('should open customer portal and redirect', async () => {
      const mockPortalResponse = {
        url: 'https://billing.stripe.com/session/portal123',
      };

      (subscriptionAPI.getCustomerPortal as any).mockResolvedValue(mockPortalResponse);

      const { result } = renderHook(() => useSubscriptionStore());

      await act(async () => {
        await result.current.openCustomerPortal();
      });

      expect(subscriptionAPI.getCustomerPortal).toHaveBeenCalled();
      expect(window.location.href).toBe(mockPortalResponse.url);
    });

    it('should handle API errors and throw', async () => {
      const mockError = new Error('Portal failed');
      (subscriptionAPI.getCustomerPortal as any).mockRejectedValue(mockError);

      const { result } = renderHook(() => useSubscriptionStore());

      let thrownError = false;
      await act(async () => {
        try {
          await result.current.openCustomerPortal();
        } catch (err) {
          thrownError = true;
        }
      });

      expect(thrownError).toBe(true);
      expect(result.current.error).toBe('Portal failed');
      expect(result.current.isLoading).toBe(false);
    });
  });

  describe('clearError', () => {
    it('should clear error state', () => {
      const { result } = renderHook(() => useSubscriptionStore());

      // Set error
      act(() => {
        result.current.error = 'Test error';
      });

      expect(result.current.error).toBe('Test error');

      // Clear error
      act(() => {
        result.current.clearError();
      });

      expect(result.current.error).toBeNull();
    });
  });

  describe('State Management', () => {
    it('should maintain state across multiple operations', async () => {
      const mockPlans = [
        {
          plan_id: 'monthly_pro',
          name: 'Monthly Pro',
          price_cents: 9900,
          description: 'Unlimited generations',
          features: ['Unlimited generations'],
          billing_period: 'monthly' as const,
        },
      ];

      const mockSubscription = {
        subscription_id: 'sub_123',
        status: 'active' as const,
        plan_id: 'monthly_pro',
        plan_name: 'Monthly Pro',
        price_cents: 9900,
        current_period_start: '2024-01-01T00:00:00Z',
        current_period_end: '2024-02-01T00:00:00Z',
        cancel_at_period_end: false,
      };

      (subscriptionAPI.getPlans as any).mockResolvedValue(mockPlans);
      (subscriptionAPI.getCurrentSubscription as any).mockResolvedValue(mockSubscription);

      const { result } = renderHook(() => useSubscriptionStore());

      // Fetch plans
      await act(async () => {
        await result.current.fetchPlans();
      });

      expect(result.current.plans).toEqual(mockPlans);

      // Fetch subscription
      await act(async () => {
        await result.current.fetchSubscription();
      });

      expect(result.current.subscription).toEqual(mockSubscription);

      // Both should be maintained
      expect(result.current.plans).toEqual(mockPlans);
      expect(result.current.subscription).toEqual(mockSubscription);
    });

    it('should handle rapid successive calls correctly', async () => {
      const mockSubscription = {
        subscription_id: 'sub_123',
        status: 'active' as const,
        plan_id: 'monthly_pro',
        plan_name: 'Monthly Pro',
        price_cents: 9900,
        current_period_start: '2024-01-01T00:00:00Z',
        current_period_end: '2024-02-01T00:00:00Z',
        cancel_at_period_end: false,
      };

      (subscriptionAPI.getCurrentSubscription as any).mockResolvedValue(mockSubscription);

      const { result } = renderHook(() => useSubscriptionStore());

      // Make multiple rapid calls
      await act(async () => {
        const promises = [
          result.current.fetchSubscription(),
          result.current.fetchSubscription(),
          result.current.fetchSubscription(),
        ];
        await Promise.all(promises);
      });

      // Should end up with correct state
      expect(result.current.subscription).toEqual(mockSubscription);
      expect(result.current.isLoading).toBe(false);

      // API should have been called for each request
      expect(subscriptionAPI.getCurrentSubscription).toHaveBeenCalledTimes(3);
    });
  });

  describe('Error Recovery', () => {
    it('should allow retry after error', async () => {
      const mockError = new Error('Network error');
      const mockSubscription = {
        subscription_id: 'sub_123',
        status: 'active' as const,
        plan_id: 'monthly_pro',
        plan_name: 'Monthly Pro',
        price_cents: 9900,
        current_period_start: '2024-01-01T00:00:00Z',
        current_period_end: '2024-02-01T00:00:00Z',
        cancel_at_period_end: false,
      };

      // First call fails
      (subscriptionAPI.getCurrentSubscription as any).mockRejectedValueOnce(mockError);

      const { result } = renderHook(() => useSubscriptionStore());

      // First attempt fails
      await act(async () => {
        await result.current.fetchSubscription();
      });

      expect(result.current.error).toBe('Network error');

      // Second call succeeds
      (subscriptionAPI.getCurrentSubscription as any).mockResolvedValueOnce(mockSubscription);

      // Retry
      await act(async () => {
        await result.current.fetchSubscription();
      });

      expect(result.current.subscription).toEqual(mockSubscription);
      expect(result.current.error).toBeNull();
    });
  });

  describe('Loading States', () => {
    it('should set loading false after successful operation', async () => {
      const mockSubscription = {
        subscription_id: 'sub_123',
        status: 'active' as const,
        plan_id: 'monthly_pro',
        plan_name: 'Monthly Pro',
        price_cents: 9900,
        current_period_start: '2024-01-01T00:00:00Z',
        current_period_end: '2024-02-01T00:00:00Z',
        cancel_at_period_end: false,
      };

      (subscriptionAPI.getCurrentSubscription as any).mockResolvedValue(mockSubscription);

      const { result } = renderHook(() => useSubscriptionStore());

      await act(async () => {
        await result.current.fetchSubscription();
      });

      expect(result.current.isLoading).toBe(false);
    });

    it('should set loading false after failed operation', async () => {
      const mockError = new Error('API error');
      (subscriptionAPI.getCurrentSubscription as any).mockRejectedValue(mockError);

      const { result } = renderHook(() => useSubscriptionStore());

      await act(async () => {
        await result.current.fetchSubscription();
      });

      expect(result.current.isLoading).toBe(false);
    });
  });
});
