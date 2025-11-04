/**
 * Unit tests for TokenPurchaseModal component
 * Requirements: T057 [P] [US2]
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import TokenPurchaseModal from './index';

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

describe('TokenPurchaseModal Component', () => {
  const mockPackages = [
    {
      package_id: 'package_10',
      tokens: 10,
      price_usd: 9.99,
      price_cents: 999,
      price_per_token: 0.999,
      discount_percent: null,
      is_best_value: false,
      description: 'Starter pack',
    },
    {
      package_id: 'package_50',
      tokens: 50,
      price_usd: 39.99,
      price_cents: 3999,
      price_per_token: 0.7998,
      discount_percent: 20,
      is_best_value: false,
      description: 'Popular choice',
    },
    {
      package_id: 'package_100',
      tokens: 100,
      price_usd: 69.99,
      price_cents: 6999,
      price_per_token: 0.6999,
      discount_percent: 30,
      is_best_value: true,
      description: 'Best value',
    },
    {
      package_id: 'package_500',
      tokens: 500,
      price_usd: 299.99,
      price_cents: 29999,
      price_per_token: 0.59998,
      discount_percent: 40,
      is_best_value: false,
      description: 'Pro pack',
    },
  ];

  const mockOnClose = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    mockLocalStorage.getItem.mockReturnValue('mock-access-token');
    process.env.NEXT_PUBLIC_API_URL = 'http://localhost:8000';
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Modal Rendering', () => {
    it('should not render when isOpen is false', () => {
      render(<TokenPurchaseModal isOpen={false} onClose={mockOnClose} />);
      expect(screen.queryByTestId('token-purchase-modal')).not.toBeInTheDocument();
    });

    it('should render modal when isOpen is true', () => {
      global.fetch = vi.fn(() =>
        new Promise(() => {}) // Never resolves
      ) as any;

      render(<TokenPurchaseModal isOpen={true} onClose={mockOnClose} />);
      expect(screen.getByTestId('token-purchase-modal')).toBeInTheDocument();
      expect(screen.getByText('Purchase Tokens')).toBeInTheDocument();
    });

    it('should render close button', () => {
      global.fetch = vi.fn(() =>
        new Promise(() => {}) // Never resolves
      ) as any;

      render(<TokenPurchaseModal isOpen={true} onClose={mockOnClose} />);
      const closeButton = screen.getByLabelText('Close modal');
      expect(closeButton).toBeInTheDocument();
    });

    it('should call onClose when close button is clicked', () => {
      global.fetch = vi.fn(() =>
        new Promise(() => {}) // Never resolves
      ) as any;

      render(<TokenPurchaseModal isOpen={true} onClose={mockOnClose} />);
      const closeButton = screen.getByLabelText('Close modal');
      fireEvent.click(closeButton);
      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });

    it('should call onClose when clicking backdrop', () => {
      global.fetch = vi.fn(() =>
        new Promise(() => {}) // Never resolves
      ) as any;

      render(<TokenPurchaseModal isOpen={true} onClose={mockOnClose} />);
      const backdrop = screen.getByTestId('token-purchase-modal');
      fireEvent.click(backdrop);
      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });

    it('should not call onClose when clicking modal content', () => {
      global.fetch = vi.fn(() =>
        new Promise(() => {}) // Never resolves
      ) as any;

      render(<TokenPurchaseModal isOpen={true} onClose={mockOnClose} />);
      const modalContent = screen.getByText('Purchase Tokens').closest('div');
      fireEvent.click(modalContent!);
      expect(mockOnClose).not.toHaveBeenCalled();
    });
  });

  describe('Package Fetching', () => {
    it('should show loading state while fetching packages', () => {
      global.fetch = vi.fn(() =>
        new Promise(() => {}) // Never resolves
      ) as any;

      render(<TokenPurchaseModal isOpen={true} onClose={mockOnClose} />);
      expect(screen.getByText('Loading packages...')).toBeInTheDocument();
    });

    it('should fetch packages when modal opens', async () => {
      const fetchMock = vi.fn(() =>
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockPackages),
        })
      );
      global.fetch = fetchMock as any;

      render(<TokenPurchaseModal isOpen={true} onClose={mockOnClose} />);

      await waitFor(() => {
        expect(fetchMock).toHaveBeenCalledWith('http://localhost:8000/tokens/packages');
      });
    });

    it('should not fetch packages when modal is closed', () => {
      const fetchMock = vi.fn();
      global.fetch = fetchMock as any;

      render(<TokenPurchaseModal isOpen={false} onClose={mockOnClose} />);
      expect(fetchMock).not.toHaveBeenCalled();
    });

    it('should display error message when fetch fails', async () => {
      global.fetch = vi.fn(() =>
        Promise.reject(new Error('Network error'))
      ) as any;

      render(<TokenPurchaseModal isOpen={true} onClose={mockOnClose} />);

      await waitFor(() => {
        expect(screen.getByText(/Network error/)).toBeInTheDocument();
      });
    });

    it('should handle HTTP error responses', async () => {
      global.fetch = vi.fn(() =>
        Promise.resolve({
          ok: false,
          status: 500,
        })
      ) as any;

      render(<TokenPurchaseModal isOpen={true} onClose={mockOnClose} />);

      await waitFor(() => {
        expect(screen.getByText(/Failed to fetch packages/)).toBeInTheDocument();
      });
    });
  });

  describe('Package Display', () => {
    beforeEach(() => {
      global.fetch = vi.fn(() =>
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockPackages),
        })
      ) as any;
    });

    it('should display all 4 packages', async () => {
      render(<TokenPurchaseModal isOpen={true} onClose={mockOnClose} />);

      await waitFor(() => {
        expect(screen.getByText('10 tokens')).toBeInTheDocument();
        expect(screen.getByText('50 tokens')).toBeInTheDocument();
        expect(screen.getByText('100 tokens')).toBeInTheDocument();
        expect(screen.getByText('500 tokens')).toBeInTheDocument();
      });
    });

    it('should display package prices correctly', async () => {
      render(<TokenPurchaseModal isOpen={true} onClose={mockOnClose} />);

      await waitFor(() => {
        expect(screen.getByText('$9.99')).toBeInTheDocument();
        expect(screen.getByText('$39.99')).toBeInTheDocument();
        expect(screen.getByText('$69.99')).toBeInTheDocument();
        expect(screen.getByText('$299.99')).toBeInTheDocument();
      });
    });

    it('should display price per token', async () => {
      render(<TokenPurchaseModal isOpen={true} onClose={mockOnClose} />);

      await waitFor(() => {
        expect(screen.getByText('$1.00 per token')).toBeInTheDocument();
        expect(screen.getByText('$0.80 per token')).toBeInTheDocument();
        expect(screen.getByText('$0.70 per token')).toBeInTheDocument();
        expect(screen.getByText('$0.60 per token')).toBeInTheDocument();
      });
    });

    it('should display package descriptions', async () => {
      render(<TokenPurchaseModal isOpen={true} onClose={mockOnClose} />);

      await waitFor(() => {
        expect(screen.getByText('Starter pack')).toBeInTheDocument();
        expect(screen.getByText('Popular choice')).toBeInTheDocument();
        expect(screen.getByText('Best value')).toBeInTheDocument();
        expect(screen.getByText('Pro pack')).toBeInTheDocument();
      });
    });

    it('should display "BEST VALUE" badge on correct package', async () => {
      render(<TokenPurchaseModal isOpen={true} onClose={mockOnClose} />);

      await waitFor(() => {
        const badges = screen.getAllByText('BEST VALUE');
        expect(badges).toHaveLength(1);
      });
    });

    it('should display discount badges correctly', async () => {
      render(<TokenPurchaseModal isOpen={true} onClose={mockOnClose} />);

      await waitFor(() => {
        expect(screen.getByText('Save 20%')).toBeInTheDocument();
        // Note: package_100 has is_best_value=true, so it shows BEST VALUE instead
        expect(screen.getByText('Save 40%')).toBeInTheDocument();
      });
    });

    it('should apply special styling to best value package', async () => {
      render(<TokenPurchaseModal isOpen={true} onClose={mockOnClose} />);

      await waitFor(() => {
        const bestValuePackage = screen.getByTestId('package-2'); // 100 tokens
        expect(bestValuePackage).toHaveClass('border-blue-500');
        expect(bestValuePackage).toHaveClass('bg-blue-50');
      });
    });
  });

  describe('Purchase Flow', () => {
    beforeEach(() => {
      global.fetch = vi.fn((url: string) => {
        if (url.includes('/packages')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve(mockPackages),
          });
        }
        return Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              url: 'https://checkout.stripe.com/session/test123',
            }),
        });
      }) as any;
    });

    it('should show all purchase buttons', async () => {
      render(<TokenPurchaseModal isOpen={true} onClose={mockOnClose} />);

      await waitFor(() => {
        const purchaseButtons = screen.getAllByText('Purchase');
        expect(purchaseButtons).toHaveLength(4);
      });
    });

    it('should call checkout API when purchase button is clicked', async () => {
      const fetchMock = vi.fn((url: string) => {
        if (url.includes('/packages')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve(mockPackages),
          });
        }
        return Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              url: 'https://checkout.stripe.com/session/test123',
            }),
        });
      });
      global.fetch = fetchMock as any;

      render(<TokenPurchaseModal isOpen={true} onClose={mockOnClose} />);

      await waitFor(() => {
        expect(screen.getByText('10 tokens')).toBeInTheDocument();
      });

      const purchaseButtons = screen.getAllByText('Purchase');
      fireEvent.click(purchaseButtons[0]);

      await waitFor(() => {
        expect(fetchMock).toHaveBeenCalledWith(
          'http://localhost:8000/tokens/purchase/checkout',
          expect.objectContaining({
            method: 'POST',
            headers: expect.objectContaining({
              'Content-Type': 'application/json',
              Authorization: 'Bearer mock-access-token',
            }),
            body: JSON.stringify({ package_id: 'package_10' }),
          })
        );
      });
    });

    it('should show "Processing..." text while purchase is in progress', async () => {
      global.fetch = vi.fn((url: string) => {
        if (url.includes('/packages')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve(mockPackages),
          });
        }
        return new Promise(() => {}); // Never resolves
      }) as any;

      render(<TokenPurchaseModal isOpen={true} onClose={mockOnClose} />);

      await waitFor(() => {
        expect(screen.getByText('10 tokens')).toBeInTheDocument();
      });

      const purchaseButtons = screen.getAllByText('Purchase');
      fireEvent.click(purchaseButtons[0]);

      await waitFor(() => {
        expect(screen.getByText('Processing...')).toBeInTheDocument();
      });
    });

    it('should disable button while purchase is in progress', async () => {
      global.fetch = vi.fn((url: string) => {
        if (url.includes('/packages')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve(mockPackages),
          });
        }
        return new Promise(() => {}); // Never resolves
      }) as any;

      render(<TokenPurchaseModal isOpen={true} onClose={mockOnClose} />);

      await waitFor(() => {
        expect(screen.getByText('10 tokens')).toBeInTheDocument();
      });

      const purchaseButtons = screen.getAllByText('Purchase');
      fireEvent.click(purchaseButtons[0]);

      await waitFor(() => {
        const processingButton = screen.getByText('Processing...');
        expect(processingButton).toBeDisabled();
      });
    });

    it('should redirect to Stripe checkout URL on success', async () => {
      const originalLocation = window.location;
      delete (window as any).location;
      window.location = { ...originalLocation, href: '' } as any;

      render(<TokenPurchaseModal isOpen={true} onClose={mockOnClose} />);

      await waitFor(() => {
        expect(screen.getByText('10 tokens')).toBeInTheDocument();
      });

      const purchaseButtons = screen.getAllByText('Purchase');
      fireEvent.click(purchaseButtons[0]);

      await waitFor(() => {
        expect(window.location.href).toBe(
          'https://checkout.stripe.com/session/test123'
        );
      });

      window.location = originalLocation;
    });

    it('should show error message when not authenticated', async () => {
      mockLocalStorage.getItem.mockReturnValue(null);

      global.fetch = vi.fn((url: string) => {
        if (url.includes('/packages')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve(mockPackages),
          });
        }
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({}),
        });
      }) as any;

      render(<TokenPurchaseModal isOpen={true} onClose={mockOnClose} />);

      await waitFor(() => {
        expect(screen.getByText('10 tokens')).toBeInTheDocument();
      });

      const purchaseButtons = screen.getAllByText('Purchase');
      fireEvent.click(purchaseButtons[0]);

      await waitFor(() => {
        expect(screen.getByText(/Not authenticated/)).toBeInTheDocument();
      });
    });

    it('should show error message when checkout fails', async () => {
      global.fetch = vi.fn((url: string) => {
        if (url.includes('/packages')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve(mockPackages),
          });
        }
        return Promise.resolve({
          ok: false,
          status: 500,
        });
      }) as any;

      render(<TokenPurchaseModal isOpen={true} onClose={mockOnClose} />);

      await waitFor(() => {
        expect(screen.getByText('10 tokens')).toBeInTheDocument();
      });

      const purchaseButtons = screen.getAllByText('Purchase');
      fireEvent.click(purchaseButtons[0]);

      await waitFor(() => {
        expect(
          screen.getByText(/Failed to create checkout session/)
        ).toBeInTheDocument();
      });
    });

    it('should reset purchasing state after error', async () => {
      global.fetch = vi.fn((url: string) => {
        if (url.includes('/packages')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve(mockPackages),
          });
        }
        return Promise.reject(new Error('Network error'));
      }) as any;

      render(<TokenPurchaseModal isOpen={true} onClose={mockOnClose} />);

      await waitFor(() => {
        expect(screen.getByText('10 tokens')).toBeInTheDocument();
      });

      const purchaseButtons = screen.getAllByText('Purchase');
      fireEvent.click(purchaseButtons[0]);

      await waitFor(() => {
        expect(screen.getByText(/Network error/)).toBeInTheDocument();
      });

      // Button should be enabled again
      const updatedButtons = screen.getAllByText('Purchase');
      expect(updatedButtons[0]).not.toBeDisabled();
    });
  });

  describe('Information Section', () => {
    beforeEach(() => {
      global.fetch = vi.fn(() =>
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockPackages),
        })
      ) as any;
    });

    it('should display "How Token Credits Work" section', async () => {
      render(<TokenPurchaseModal isOpen={true} onClose={mockOnClose} />);

      await waitFor(() => {
        expect(screen.getByText('How Token Credits Work')).toBeInTheDocument();
      });
    });

    it('should display all information points', async () => {
      render(<TokenPurchaseModal isOpen={true} onClose={mockOnClose} />);

      await waitFor(() => {
        expect(
          screen.getByText('1 token = 1 landscape design generation')
        ).toBeInTheDocument();
        expect(
          screen.getByText('Tokens never expire - use them at your own pace')
        ).toBeInTheDocument();
        expect(
          screen.getByText(
            'If a generation fails, your token is automatically refunded'
          )
        ).toBeInTheDocument();
        expect(
          screen.getByText('Secure payment processing via Stripe')
        ).toBeInTheDocument();
      });
    });
  });

  describe('Package Features', () => {
    beforeEach(() => {
      global.fetch = vi.fn(() =>
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockPackages),
        })
      ) as any;
    });

    it('should display common features for all packages', async () => {
      render(<TokenPurchaseModal isOpen={true} onClose={mockOnClose} />);

      await waitFor(() => {
        expect(screen.getByText('10 tokens')).toBeInTheDocument();
      });

      // Each package should show these features
      expect(
        screen.getByText('10 AI-powered landscape generations')
      ).toBeInTheDocument();
      expect(
        screen.getByText('50 AI-powered landscape generations')
      ).toBeInTheDocument();
      expect(
        screen.getByText('100 AI-powered landscape generations')
      ).toBeInTheDocument();
      expect(
        screen.getByText('500 AI-powered landscape generations')
      ).toBeInTheDocument();

      // Common features
      const multipleStyles = screen.getAllByText('Multiple design styles');
      expect(multipleStyles.length).toBeGreaterThan(0);

      const neverExpire = screen.getAllByText('Tokens never expire');
      expect(neverExpire.length).toBeGreaterThan(0);
    });
  });
});
