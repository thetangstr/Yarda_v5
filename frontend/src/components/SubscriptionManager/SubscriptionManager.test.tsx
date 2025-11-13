/**
 * SubscriptionManager Component Tests
 *
 * Tests for the SubscriptionManager component.
 *
 * Requirements:
 * - T094: Unit test for SubscriptionManager
 * - Test rendering of subscription status
 * - Test cancel button for active subscriptions
 * - Test confirmation modal
 * - Test error handling
 * - Test loading states
 */

import React from 'react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { SubscriptionManager, SubscriptionStatus } from './index';
import { useSubscriptionStore } from '@/store/subscriptionStore';
import { subscriptionAPI } from '@/lib/api';

// Mock the subscription store
vi.mock('@/store/subscriptionStore');
const mockUseSubscriptionStore = useSubscriptionStore as ReturnType<typeof vi.fn>;

// Mock the API
vi.mock('@/lib/api', () => ({
  subscriptionAPI: {
    getCustomerPortal: vi.fn(),
  },
  getErrorMessage: vi.fn((err: any) => err.message || 'An error occurred'),
}));

describe('SubscriptionManager', () => {
  const mockFetchSubscription = vi.fn();
  const mockCancelSubscription = vi.fn();

  const mockActiveSubscription: SubscriptionStatus = {
    subscription_id: 'sub_123',
    status: 'active',
    plan_id: 'monthly_pro',
    plan_name: 'Monthly Pro',
    price_cents: 9900,
    current_period_start: '2024-01-01T00:00:00Z',
    current_period_end: '2024-02-01T00:00:00Z',
    cancel_at_period_end: false,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Loading State', () => {
    it('should display loading spinner when isLoading is true', () => {
      mockUseSubscriptionStore.mockReturnValue({
        subscription: null,
        isLoading: true,
        error: null,
        fetchSubscription: mockFetchSubscription,
        cancelSubscription: mockCancelSubscription,
        subscribe: vi.fn(),
        openCustomerPortal: vi.fn(),
      });

      render(<SubscriptionManager />);

      expect(screen.getByText(/loading subscription/i)).toBeInTheDocument();
      expect(screen.getByRole('status', { hidden: true })).toBeInTheDocument();
    });
  });

  describe('Error State', () => {
    it('should display error message when error exists', () => {
      const errorMessage = 'Failed to load subscription';
      mockUseSubscriptionStore.mockReturnValue({
        subscription: null,
        isLoading: false,
        error: errorMessage,
        fetchSubscription: mockFetchSubscription,
        cancelSubscription: mockCancelSubscription,
        subscribe: vi.fn(),
        openCustomerPortal: vi.fn(),
      });

      render(<SubscriptionManager />);

      expect(screen.getByText(/error loading subscription/i)).toBeInTheDocument();
      expect(screen.getByText(errorMessage)).toBeInTheDocument();
    });

    it('should allow retry when error occurs', async () => {
      mockUseSubscriptionStore.mockReturnValue({
        subscription: null,
        isLoading: false,
        error: 'Network error',
        fetchSubscription: mockFetchSubscription,
        cancelSubscription: mockCancelSubscription,
        subscribe: vi.fn(),
        openCustomerPortal: vi.fn(),
      });

      render(<SubscriptionManager />);

      const retryButton = screen.getByText(/try again/i);
      fireEvent.click(retryButton);

      expect(mockFetchSubscription).toHaveBeenCalled();
    });
  });

  describe('No Subscription State', () => {
    it('should display message when no subscription exists', () => {
      mockUseSubscriptionStore.mockReturnValue({
        subscription: null,
        isLoading: false,
        error: null,
        fetchSubscription: mockFetchSubscription,
        cancelSubscription: mockCancelSubscription,
        subscribe: vi.fn(),
        openCustomerPortal: vi.fn(),
      });

      render(<SubscriptionManager />);

      expect(screen.getByText(/no active subscription/i)).toBeInTheDocument();
      expect(screen.getByText(/view plans/i)).toBeInTheDocument();
    });

    it('should have link to pricing page', () => {
      mockUseSubscriptionStore.mockReturnValue({
        subscription: null,
        isLoading: false,
        error: null,
        fetchSubscription: mockFetchSubscription,
        cancelSubscription: mockCancelSubscription,
        subscribe: vi.fn(),
        openCustomerPortal: vi.fn(),
      });

      render(<SubscriptionManager />);

      const pricingLink = screen.getByRole('link', { name: /view plans/i });
      expect(pricingLink).toHaveAttribute('href', '/pricing');
    });
  });

  describe('Active Subscription Display', () => {
    it('should display subscription details correctly', () => {
      mockUseSubscriptionStore.mockReturnValue({
        subscription: mockActiveSubscription,
        isLoading: false,
        error: null,
        fetchSubscription: mockFetchSubscription,
        cancelSubscription: mockCancelSubscription,
        subscribe: vi.fn(),
        openCustomerPortal: vi.fn(),
      });

      render(<SubscriptionManager />);

      expect(screen.getByText('Monthly Pro')).toBeInTheDocument();
      expect(screen.getByText('$99')).toBeInTheDocument();
      expect(screen.getByText('per month')).toBeInTheDocument();
      expect(screen.getByText('Active')).toBeInTheDocument();
    });

    it('should display current period dates', () => {
      mockUseSubscriptionStore.mockReturnValue({
        subscription: mockActiveSubscription,
        isLoading: false,
        error: null,
        fetchSubscription: mockFetchSubscription,
        cancelSubscription: mockCancelSubscription,
        subscribe: vi.fn(),
        openCustomerPortal: vi.fn(),
      });

      render(<SubscriptionManager />);

      expect(screen.getByText(/current period start/i)).toBeInTheDocument();
      expect(screen.getByText(/current period end/i)).toBeInTheDocument();
      expect(screen.getByText(/january 1, 2024/i)).toBeInTheDocument();
      expect(screen.getByText(/february 1, 2024/i)).toBeInTheDocument();
    });

    it('should show cancel button for active subscription', () => {
      mockUseSubscriptionStore.mockReturnValue({
        subscription: mockActiveSubscription,
        isLoading: false,
        error: null,
        fetchSubscription: mockFetchSubscription,
        cancelSubscription: mockCancelSubscription,
        subscribe: vi.fn(),
        openCustomerPortal: vi.fn(),
      });

      render(<SubscriptionManager />);

      expect(screen.getByText(/cancel subscription/i)).toBeInTheDocument();
    });

    it('should show manage subscription button', () => {
      mockUseSubscriptionStore.mockReturnValue({
        subscription: mockActiveSubscription,
        isLoading: false,
        error: null,
        fetchSubscription: mockFetchSubscription,
        cancelSubscription: mockCancelSubscription,
        subscribe: vi.fn(),
        openCustomerPortal: vi.fn(),
      });

      render(<SubscriptionManager />);

      expect(screen.getByText(/manage subscription/i)).toBeInTheDocument();
    });
  });

  describe('Status Badges', () => {
    it('should display active status badge with green color', () => {
      mockUseSubscriptionStore.mockReturnValue({
        subscription: mockActiveSubscription,
        isLoading: false,
        error: null,
        fetchSubscription: mockFetchSubscription,
        cancelSubscription: mockCancelSubscription,
        subscribe: vi.fn(),
        openCustomerPortal: vi.fn(),
      });

      render(<SubscriptionManager />);

      const badge = screen.getByText('Active');
      expect(badge).toHaveClass('text-green-800');
      expect(badge).toHaveClass('bg-green-100');
    });

    it('should display past_due status badge with yellow color', () => {
      const pastDueSubscription = {
        ...mockActiveSubscription,
        status: 'past_due' as const,
      };

      mockUseSubscriptionStore.mockReturnValue({
        subscription: pastDueSubscription,
        isLoading: false,
        error: null,
        fetchSubscription: mockFetchSubscription,
        cancelSubscription: mockCancelSubscription,
        subscribe: vi.fn(),
        openCustomerPortal: vi.fn(),
      });

      render(<SubscriptionManager />);

      const badge = screen.getByText('Past Due');
      expect(badge).toHaveClass('text-yellow-800');
      expect(badge).toHaveClass('bg-yellow-100');
    });

    it('should display cancelled status badge with red color', () => {
      const cancelledSubscription = {
        ...mockActiveSubscription,
        status: 'cancelled' as const,
      };

      mockUseSubscriptionStore.mockReturnValue({
        subscription: cancelledSubscription,
        isLoading: false,
        error: null,
        fetchSubscription: mockFetchSubscription,
        cancelSubscription: mockCancelSubscription,
        subscribe: vi.fn(),
        openCustomerPortal: vi.fn(),
      });

      render(<SubscriptionManager />);

      const badge = screen.getByText('Cancelled');
      expect(badge).toHaveClass('text-red-800');
      expect(badge).toHaveClass('bg-red-100');
    });
  });

  describe('Cancel at Period End', () => {
    it('should display notice when cancel_at_period_end is true', () => {
      const cancellingSubscription = {
        ...mockActiveSubscription,
        cancel_at_period_end: true,
      };

      mockUseSubscriptionStore.mockReturnValue({
        subscription: cancellingSubscription,
        isLoading: false,
        error: null,
        fetchSubscription: mockFetchSubscription,
        cancelSubscription: mockCancelSubscription,
        subscribe: vi.fn(),
        openCustomerPortal: vi.fn(),
      });

      render(<SubscriptionManager />);

      expect(
        screen.getByText(/subscription will cancel at the end of the billing period/i)
      ).toBeInTheDocument();
    });

    it('should not show cancel button when cancel_at_period_end is true', () => {
      const cancellingSubscription = {
        ...mockActiveSubscription,
        cancel_at_period_end: true,
      };

      mockUseSubscriptionStore.mockReturnValue({
        subscription: cancellingSubscription,
        isLoading: false,
        error: null,
        fetchSubscription: mockFetchSubscription,
        cancelSubscription: mockCancelSubscription,
        subscribe: vi.fn(),
        openCustomerPortal: vi.fn(),
      });

      render(<SubscriptionManager />);

      expect(screen.queryByText(/cancel subscription/i)).not.toBeInTheDocument();
    });
  });

  describe('Cancel Confirmation Modal', () => {
    it('should show confirmation modal when cancel button is clicked', async () => {
      mockUseSubscriptionStore.mockReturnValue({
        subscription: mockActiveSubscription,
        isLoading: false,
        error: null,
        fetchSubscription: mockFetchSubscription,
        cancelSubscription: mockCancelSubscription,
        subscribe: vi.fn(),
        openCustomerPortal: vi.fn(),
      });

      render(<SubscriptionManager />);

      const cancelButton = screen.getByText(/cancel subscription/i);
      fireEvent.click(cancelButton);

      await waitFor(() => {
        expect(screen.getByTestId('cancel-confirmation-modal')).toBeInTheDocument();
        expect(screen.getByText(/cancel subscription\?/i)).toBeInTheDocument();
      });
    });

    it('should close modal when "Keep Subscription" is clicked', async () => {
      mockUseSubscriptionStore.mockReturnValue({
        subscription: mockActiveSubscription,
        isLoading: false,
        error: null,
        fetchSubscription: mockFetchSubscription,
        cancelSubscription: mockCancelSubscription,
        subscribe: vi.fn(),
        openCustomerPortal: vi.fn(),
      });

      render(<SubscriptionManager />);

      const cancelButton = screen.getByText(/cancel subscription/i);
      fireEvent.click(cancelButton);

      await waitFor(() => {
        expect(screen.getByTestId('cancel-confirmation-modal')).toBeInTheDocument();
      });

      const keepButton = screen.getByText(/keep subscription/i);
      fireEvent.click(keepButton);

      await waitFor(() => {
        expect(screen.queryByTestId('cancel-confirmation-modal')).not.toBeInTheDocument();
      });
    });

    it('should call cancelSubscription when confirmed', async () => {
      mockCancelSubscription.mockResolvedValue(undefined);
      mockUseSubscriptionStore.mockReturnValue({
        subscription: mockActiveSubscription,
        isLoading: false,
        error: null,
        fetchSubscription: mockFetchSubscription,
        cancelSubscription: mockCancelSubscription,
        subscribe: vi.fn(),
        openCustomerPortal: vi.fn(),
      });

      render(<SubscriptionManager />);

      const cancelButton = screen.getByText(/cancel subscription/i);
      fireEvent.click(cancelButton);

      await waitFor(() => {
        expect(screen.getByTestId('cancel-confirmation-modal')).toBeInTheDocument();
      });

      const confirmButton = screen.getByText(/yes, cancel/i);
      fireEvent.click(confirmButton);

      await waitFor(() => {
        expect(mockCancelSubscription).toHaveBeenCalled();
      });
    });

    it('should display success toast after cancellation', async () => {
      mockCancelSubscription.mockResolvedValue(undefined);
      mockUseSubscriptionStore.mockReturnValue({
        subscription: mockActiveSubscription,
        isLoading: false,
        error: null,
        fetchSubscription: mockFetchSubscription,
        cancelSubscription: mockCancelSubscription,
        subscribe: vi.fn(),
        openCustomerPortal: vi.fn(),
      });

      render(<SubscriptionManager />);

      const cancelButton = screen.getByText(/cancel subscription/i);
      fireEvent.click(cancelButton);

      await waitFor(() => {
        expect(screen.getByTestId('cancel-confirmation-modal')).toBeInTheDocument();
      });

      const confirmButton = screen.getByText(/yes, cancel/i);
      fireEvent.click(confirmButton);

      await waitFor(() => {
        expect(
          screen.getByText(/subscription cancelled/i)
        ).toBeInTheDocument();
      });
    });
  });

  describe('Manage Subscription', () => {
    it('should open customer portal when manage button is clicked', async () => {
      const mockPortalUrl = 'https://billing.stripe.com/session/123';
      (subscriptionAPI.getCustomerPortal as jest.Mock).mockResolvedValue({
        url: mockPortalUrl,
      });

      // Mock window.location.href
      delete (window as any).location;
      window.location = { href: '' } as any;

      mockUseSubscriptionStore.mockReturnValue({
        subscription: mockActiveSubscription,
        isLoading: false,
        error: null,
        fetchSubscription: mockFetchSubscription,
        cancelSubscription: mockCancelSubscription,
        subscribe: vi.fn(),
        openCustomerPortal: vi.fn(),
      });

      render(<SubscriptionManager />);

      const manageButton = screen.getByText(/manage subscription/i);
      fireEvent.click(manageButton);

      await waitFor(() => {
        expect(subscriptionAPI.getCustomerPortal).toHaveBeenCalled();
      });
    });
  });

  describe('Component Lifecycle', () => {
    it('should fetch subscription on mount', () => {
      mockUseSubscriptionStore.mockReturnValue({
        subscription: null,
        isLoading: false,
        error: null,
        fetchSubscription: mockFetchSubscription,
        cancelSubscription: mockCancelSubscription,
        subscribe: vi.fn(),
        openCustomerPortal: vi.fn(),
      });

      render(<SubscriptionManager />);

      expect(mockFetchSubscription).toHaveBeenCalled();
    });

    it('should call onStatusChange callback after successful cancellation', async () => {
      const onStatusChange = vi.fn();
      mockCancelSubscription.mockResolvedValue(undefined);
      mockUseSubscriptionStore.mockReturnValue({
        subscription: mockActiveSubscription,
        isLoading: false,
        error: null,
        fetchSubscription: mockFetchSubscription,
        cancelSubscription: mockCancelSubscription,
        subscribe: vi.fn(),
        openCustomerPortal: vi.fn(),
      });

      render(<SubscriptionManager onStatusChange={onStatusChange} />);

      const cancelButton = screen.getByText(/cancel subscription/i);
      fireEvent.click(cancelButton);

      await waitFor(() => {
        expect(screen.getByTestId('cancel-confirmation-modal')).toBeInTheDocument();
      });

      const confirmButton = screen.getByText(/yes, cancel/i);
      fireEvent.click(confirmButton);

      await waitFor(() => {
        expect(onStatusChange).toHaveBeenCalled();
      });
    });
  });
});
