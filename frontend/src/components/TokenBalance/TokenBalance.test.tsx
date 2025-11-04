/**
 * Unit tests for TokenBalance component
 * Requirements: T056 [P] [US2]
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import TokenBalance from './index';
import { useUserStore } from '@/store/userStore';

// Mock the userStore
vi.mock('@/store/userStore', () => ({
  useUserStore: vi.fn(),
}));

// Mock localStorage
const mockLocalStorage = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
};
Object.defineProperty(window, 'localStorage', {
  value: mockLocalStorage,
});

describe('TokenBalance Component', () => {
  const mockBalanceData = {
    balance: 50,
    total_purchased: 100,
    total_spent: 50,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockLocalStorage.getItem.mockReturnValue('mock-token');
    process.env.NEXT_PUBLIC_API_URL = 'http://localhost:8000';

    // Mock authenticated user by default
    (useUserStore as any).mockReturnValue({
      user: { id: 'user-123', email: 'test@example.com' },
      isAuthenticated: true,
    });
  });

  afterEach(() => {
    vi.clearAllTimers();
  });

  describe('Rendering', () => {
    it('should render nothing when user is not authenticated', () => {
      (useUserStore as any).mockReturnValue({
        user: null,
        isAuthenticated: false,
      });

      const { container } = render(<TokenBalance />);
      expect(container.firstChild).toBeNull();
    });

    it('should show loading state initially', () => {
      global.fetch = vi.fn(() =>
        new Promise(() => {}) // Never resolves to keep loading state
      ) as any;

      render(<TokenBalance />);
      expect(screen.getByText('Loading...')).toBeInTheDocument();
    });

    it('should render error message when fetch fails', async () => {
      global.fetch = vi.fn(() =>
        Promise.reject(new Error('Network error'))
      ) as any;

      render(<TokenBalance />);

      await waitFor(() => {
        expect(screen.getByText('Failed to load balance')).toBeInTheDocument();
      });
    });

    it('should fetch and display balance on mount', async () => {
      global.fetch = vi.fn(() =>
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockBalanceData),
        })
      ) as any;

      render(<TokenBalance />);

      await waitFor(() => {
        expect(screen.getByText('50')).toBeInTheDocument();
        expect(screen.getByText('available tokens')).toBeInTheDocument();
      });
    });
  });

  describe('Compact Variant', () => {
    it('should render compact variant correctly', async () => {
      global.fetch = vi.fn(() =>
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockBalanceData),
        })
      ) as any;

      render(<TokenBalance variant="compact" />);

      await waitFor(() => {
        expect(screen.getByText('50 tokens')).toBeInTheDocument();
      });

      const container = screen.getByTestId('token-balance');
      expect(container).toHaveClass('rounded-full');
    });

    it('should not show statistics in compact variant', async () => {
      global.fetch = vi.fn(() =>
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockBalanceData),
        })
      ) as any;

      render(<TokenBalance variant="compact" />);

      await waitFor(() => {
        expect(screen.getByText('50 tokens')).toBeInTheDocument();
      });

      expect(screen.queryByText('Total Purchased')).not.toBeInTheDocument();
      expect(screen.queryByText('Total Spent')).not.toBeInTheDocument();
    });
  });

  describe('Full Variant', () => {
    it('should render full variant with statistics', async () => {
      global.fetch = vi.fn(() =>
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockBalanceData),
        })
      ) as any;

      render(<TokenBalance variant="full" />);

      await waitFor(() => {
        expect(screen.getByText('50')).toBeInTheDocument();
        expect(screen.getByText('Total Purchased')).toBeInTheDocument();
        expect(screen.getByText('100')).toBeInTheDocument();
        expect(screen.getByText('Total Spent')).toBeInTheDocument();
      });
    });

    it('should show purchase button in full variant', async () => {
      global.fetch = vi.fn(() =>
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockBalanceData),
        })
      ) as any;

      render(<TokenBalance variant="full" />);

      await waitFor(() => {
        expect(screen.getByText('Purchase Tokens')).toBeInTheDocument();
      });
    });

    it('should show auto-refresh indicator when enabled', async () => {
      global.fetch = vi.fn(() =>
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockBalanceData),
        })
      ) as any;

      render(<TokenBalance variant="full" autoRefresh={true} />);

      await waitFor(() => {
        expect(
          screen.getByText('Auto-refreshes every 10 seconds')
        ).toBeInTheDocument();
      });
    });

    it('should not show auto-refresh indicator when disabled', async () => {
      global.fetch = vi.fn(() =>
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockBalanceData),
        })
      ) as any;

      render(<TokenBalance variant="full" autoRefresh={false} />);

      await waitFor(() => {
        expect(screen.getByText('50')).toBeInTheDocument();
      });

      expect(
        screen.queryByText('Auto-refreshes every 10 seconds')
      ).not.toBeInTheDocument();
    });
  });

  describe('Balance Warnings', () => {
    it('should show low balance warning when balance < 5 and > 0', async () => {
      global.fetch = vi.fn(() =>
        Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              balance: 3,
              total_purchased: 100,
              total_spent: 97,
            }),
        })
      ) as any;

      render(<TokenBalance variant="full" />);

      await waitFor(() => {
        expect(
          screen.getByText(/Your token balance is running low/)
        ).toBeInTheDocument();
      });
    });

    it('should show zero balance alert when balance is 0', async () => {
      global.fetch = vi.fn(() =>
        Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              balance: 0,
              total_purchased: 100,
              total_spent: 100,
            }),
        })
      ) as any;

      render(<TokenBalance variant="full" />);

      await waitFor(() => {
        expect(screen.getByText(/You're out of tokens!/)).toBeInTheDocument();
      });
    });

    it('should not show warnings when balance >= 5', async () => {
      global.fetch = vi.fn(() =>
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockBalanceData),
        })
      ) as any;

      render(<TokenBalance variant="full" />);

      await waitFor(() => {
        expect(screen.getByText('50')).toBeInTheDocument();
      });

      expect(
        screen.queryByText(/Your token balance is running low/)
      ).not.toBeInTheDocument();
      expect(screen.queryByText(/You're out of tokens!/)).not.toBeInTheDocument();
    });
  });

  describe('Auto-refresh Functionality', () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.restoreAllMocks();
    });

    it('should auto-refresh balance every 10 seconds by default', async () => {
      const fetchMock = vi.fn(() =>
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockBalanceData),
        })
      );
      global.fetch = fetchMock as any;

      render(<TokenBalance autoRefresh={true} />);

      // Initial fetch
      await waitFor(() => {
        expect(fetchMock).toHaveBeenCalledTimes(1);
      });

      // Advance timer by 10 seconds
      vi.advanceTimersByTime(10000);

      await waitFor(() => {
        expect(fetchMock).toHaveBeenCalledTimes(2);
      });

      // Advance timer by another 10 seconds
      vi.advanceTimersByTime(10000);

      await waitFor(() => {
        expect(fetchMock).toHaveBeenCalledTimes(3);
      });
    });

    it('should respect custom refresh interval', async () => {
      const fetchMock = vi.fn(() =>
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockBalanceData),
        })
      );
      global.fetch = fetchMock as any;

      render(<TokenBalance autoRefresh={true} refreshInterval={5000} />);

      // Initial fetch
      await waitFor(() => {
        expect(fetchMock).toHaveBeenCalledTimes(1);
      });

      // Advance timer by 5 seconds
      vi.advanceTimersByTime(5000);

      await waitFor(() => {
        expect(fetchMock).toHaveBeenCalledTimes(2);
      });
    });

    it('should not auto-refresh when autoRefresh is false', async () => {
      const fetchMock = vi.fn(() =>
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockBalanceData),
        })
      );
      global.fetch = fetchMock as any;

      render(<TokenBalance autoRefresh={false} />);

      // Initial fetch
      await waitFor(() => {
        expect(fetchMock).toHaveBeenCalledTimes(1);
      });

      // Advance timer by 10 seconds
      vi.advanceTimersByTime(10000);

      // Should still only have been called once
      expect(fetchMock).toHaveBeenCalledTimes(1);
    });

    it('should clean up interval on unmount', async () => {
      const fetchMock = vi.fn(() =>
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockBalanceData),
        })
      );
      global.fetch = fetchMock as any;

      const { unmount } = render(<TokenBalance autoRefresh={true} />);

      // Initial fetch
      await waitFor(() => {
        expect(fetchMock).toHaveBeenCalledTimes(1);
      });

      // Unmount component
      unmount();

      // Advance timer by 10 seconds
      vi.advanceTimersByTime(10000);

      // Should still only have been called once (no refresh after unmount)
      expect(fetchMock).toHaveBeenCalledTimes(1);
    });
  });

  describe('API Integration', () => {
    it('should call correct API endpoint with auth token', async () => {
      const fetchMock = vi.fn(() =>
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockBalanceData),
        })
      );
      global.fetch = fetchMock as any;
      mockLocalStorage.getItem.mockReturnValue('test-token-123');

      render(<TokenBalance />);

      await waitFor(() => {
        expect(fetchMock).toHaveBeenCalledWith(
          'http://localhost:8000/tokens/balance',
          expect.objectContaining({
            headers: {
              Authorization: 'Bearer test-token-123',
            },
          })
        );
      });
    });

    it('should handle HTTP error responses', async () => {
      global.fetch = vi.fn(() =>
        Promise.resolve({
          ok: false,
          status: 401,
        })
      ) as any;

      render(<TokenBalance />);

      await waitFor(() => {
        expect(screen.getByText('Failed to load balance')).toBeInTheDocument();
      });
    });

    it('should set balance to 0 on error', async () => {
      global.fetch = vi.fn(() =>
        Promise.reject(new Error('Network error'))
      ) as any;

      render(<TokenBalance variant="full" />);

      await waitFor(() => {
        expect(screen.getByText('0')).toBeInTheDocument();
      });
    });
  });
});
