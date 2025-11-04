/**
 * TrialCounter Component Unit Tests
 *
 * Test Coverage:
 * - TC-UI-1.1: Real-time trial counter display
 * - FR-015: Display trial_remaining in UI
 * - Visual states based on remaining credits
 * - Compact and full variants
 */

import { render, screen } from '@testing-library/react';
import { TrialCounter } from './index';
import { useUserStore } from '@/store/userStore';

// Mock the userStore
jest.mock('@/store/userStore');
const mockUseUserStore = useUserStore as jest.MockedFunction<typeof useUserStore>;

describe('TrialCounter Component', () => {
  const mockUser = {
    id: 'test-user-id',
    email: 'test@example.com',
    email_verified: true,
    created_at: '2025-01-01T00:00:00Z',
    trial_remaining: 3,
    trial_used: 0,
    subscription_tier: 'free' as const,
    subscription_status: 'inactive' as const,
  };

  beforeEach(() => {
    // Reset mock before each test
    jest.clearAllMocks();
  });

  describe('Authentication State', () => {
    it('should not render when user is not authenticated', () => {
      mockUseUserStore.mockReturnValue({
        user: null,
        accessToken: null,
        isAuthenticated: false,
        tokenBalance: null,
        setUser: jest.fn(),
        setAccessToken: jest.fn(),
        setTokenBalance: jest.fn(),
        updateTrialRemaining: jest.fn(),
        logout: jest.fn(),
      });

      const { container } = render(<TrialCounter />);
      expect(container.firstChild).toBeNull();
    });

    it('should render when user is authenticated', () => {
      mockUseUserStore.mockReturnValue({
        user: mockUser,
        accessToken: 'test-token',
        isAuthenticated: true,
        tokenBalance: null,
        setUser: jest.fn(),
        setAccessToken: jest.fn(),
        setTokenBalance: jest.fn(),
        updateTrialRemaining: jest.fn(),
        logout: jest.fn(),
      });

      render(<TrialCounter />);
      expect(screen.getByTestId('trial-counter')).toBeInTheDocument();
    });
  });

  describe('Compact Variant', () => {
    beforeEach(() => {
      mockUseUserStore.mockReturnValue({
        user: mockUser,
        accessToken: 'test-token',
        isAuthenticated: true,
        tokenBalance: null,
        setUser: jest.fn(),
        setAccessToken: jest.fn(),
        setTokenBalance: jest.fn(),
        updateTrialRemaining: jest.fn(),
        logout: jest.fn(),
      });
    });

    it('should display trial_remaining count', () => {
      render(<TrialCounter variant="compact" />);
      expect(screen.getByText(/3 trial credits/i)).toBeInTheDocument();
    });

    it('should use singular form when remaining=1', () => {
      mockUseUserStore.mockReturnValue({
        user: { ...mockUser, trial_remaining: 1, trial_used: 2 },
        accessToken: 'test-token',
        isAuthenticated: true,
        tokenBalance: null,
        setUser: jest.fn(),
        setAccessToken: jest.fn(),
        setTokenBalance: jest.fn(),
        updateTrialRemaining: jest.fn(),
        logout: jest.fn(),
      });

      render(<TrialCounter variant="compact" />);
      expect(screen.getByText(/1 trial credit$/i)).toBeInTheDocument();
    });

    it('should display green color when remaining > 1', () => {
      render(<TrialCounter variant="compact" />);
      const counter = screen.getByTestId('trial-counter');
      expect(counter).toHaveClass('text-green-600');
      expect(counter).toHaveClass('bg-green-50');
    });

    it('should display orange color when remaining = 1', () => {
      mockUseUserStore.mockReturnValue({
        user: { ...mockUser, trial_remaining: 1, trial_used: 2 },
        accessToken: 'test-token',
        isAuthenticated: true,
        tokenBalance: null,
        setUser: jest.fn(),
        setAccessToken: jest.fn(),
        setTokenBalance: jest.fn(),
        updateTrialRemaining: jest.fn(),
        logout: jest.fn(),
      });

      render(<TrialCounter variant="compact" />);
      const counter = screen.getByTestId('trial-counter');
      expect(counter).toHaveClass('text-orange-600');
      expect(counter).toHaveClass('bg-orange-50');
    });

    it('should display red color when remaining = 0', () => {
      mockUseUserStore.mockReturnValue({
        user: { ...mockUser, trial_remaining: 0, trial_used: 3 },
        accessToken: 'test-token',
        isAuthenticated: true,
        tokenBalance: null,
        setUser: jest.fn(),
        setAccessToken: jest.fn(),
        setTokenBalance: jest.fn(),
        updateTrialRemaining: jest.fn(),
        logout: jest.fn(),
      });

      render(<TrialCounter variant="compact" />);
      const counter = screen.getByTestId('trial-counter');
      expect(counter).toHaveClass('text-red-600');
      expect(counter).toHaveClass('bg-red-50');
    });
  });

  describe('Full Variant', () => {
    beforeEach(() => {
      mockUseUserStore.mockReturnValue({
        user: mockUser,
        accessToken: 'test-token',
        isAuthenticated: true,
        tokenBalance: null,
        setUser: jest.fn(),
        setAccessToken: jest.fn(),
        setTokenBalance: jest.fn(),
        updateTrialRemaining: jest.fn(),
        logout: jest.fn(),
      });
    });

    it('should display trial_remaining count prominently', () => {
      render(<TrialCounter variant="full" />);
      expect(screen.getByText('3')).toBeInTheDocument();
      expect(screen.getByText('remaining')).toBeInTheDocument();
    });

    it('should display trial_used count', () => {
      render(<TrialCounter variant="full" />);
      expect(screen.getByText('0 used')).toBeInTheDocument();
    });

    it('should display total trial credits', () => {
      render(<TrialCounter variant="full" />);
      expect(screen.getByText('3 total')).toBeInTheDocument();
    });

    it('should display progress bar at 100% when all credits remain', () => {
      render(<TrialCounter variant="full" />);
      const progressBar = screen.getByTestId('trial-counter').querySelector('[style*="width"]');
      expect(progressBar).toHaveStyle({ width: '100%' });
    });

    it('should display progress bar at 33% when 1 credit remains', () => {
      mockUseUserStore.mockReturnValue({
        user: { ...mockUser, trial_remaining: 1, trial_used: 2 },
        accessToken: 'test-token',
        isAuthenticated: true,
        tokenBalance: null,
        setUser: jest.fn(),
        setAccessToken: jest.fn(),
        setTokenBalance: jest.fn(),
        updateTrialRemaining: jest.fn(),
        logout: jest.fn(),
      });

      render(<TrialCounter variant="full" />);
      const progressBar = screen.getByTestId('trial-counter').querySelector('[style*="width"]');
      expect(progressBar).toHaveStyle({ width: '33.33333333333333%' });
    });

    it('should display exhausted message when remaining = 0', () => {
      mockUseUserStore.mockReturnValue({
        user: { ...mockUser, trial_remaining: 0, trial_used: 3 },
        accessToken: 'test-token',
        isAuthenticated: true,
        tokenBalance: null,
        setUser: jest.fn(),
        setAccessToken: jest.fn(),
        setTokenBalance: jest.fn(),
        updateTrialRemaining: jest.fn(),
        logout: jest.fn(),
      });

      render(<TrialCounter variant="full" />);
      expect(screen.getByText(/your trial credits are exhausted/i)).toBeInTheDocument();
      expect(screen.getByText(/purchase tokens/i)).toBeInTheDocument();
    });

    it('should display low credit warning when remaining = 1', () => {
      mockUseUserStore.mockReturnValue({
        user: { ...mockUser, trial_remaining: 1, trial_used: 2 },
        accessToken: 'test-token',
        isAuthenticated: true,
        tokenBalance: null,
        setUser: jest.fn(),
        setAccessToken: jest.fn(),
        setTokenBalance: jest.fn(),
        updateTrialRemaining: jest.fn(),
        logout: jest.fn(),
      });

      render(<TrialCounter variant="full" />);
      expect(screen.getByText(/only 1 trial credit remaining/i)).toBeInTheDocument();
    });

    it('should have link to purchase page when exhausted', () => {
      mockUseUserStore.mockReturnValue({
        user: { ...mockUser, trial_remaining: 0, trial_used: 3 },
        accessToken: 'test-token',
        isAuthenticated: true,
        tokenBalance: null,
        setUser: jest.fn(),
        setAccessToken: jest.fn(),
        setTokenBalance: jest.fn(),
        updateTrialRemaining: jest.fn(),
        logout: jest.fn(),
      });

      render(<TrialCounter variant="full" />);
      const purchaseLink = screen.getByRole('link', { name: /purchase tokens/i });
      expect(purchaseLink).toHaveAttribute('href', '/purchase');
    });
  });

  describe('Edge Cases', () => {
    it('should handle null trial_remaining gracefully', () => {
      mockUseUserStore.mockReturnValue({
        user: { ...mockUser, trial_remaining: undefined as any, trial_used: undefined as any },
        accessToken: 'test-token',
        isAuthenticated: true,
        tokenBalance: null,
        setUser: jest.fn(),
        setAccessToken: jest.fn(),
        setTokenBalance: jest.fn(),
        updateTrialRemaining: jest.fn(),
        logout: jest.fn(),
      });

      render(<TrialCounter variant="compact" />);
      expect(screen.getByText(/0 trial credits/i)).toBeInTheDocument();
    });

    it('should accept custom className', () => {
      mockUseUserStore.mockReturnValue({
        user: mockUser,
        accessToken: 'test-token',
        isAuthenticated: true,
        tokenBalance: null,
        setUser: jest.fn(),
        setAccessToken: jest.fn(),
        setTokenBalance: jest.fn(),
        updateTrialRemaining: jest.fn(),
        logout: jest.fn(),
      });

      render(<TrialCounter className="custom-class" />);
      const counter = screen.getByTestId('trial-counter');
      expect(counter).toHaveClass('custom-class');
    });
  });
});
