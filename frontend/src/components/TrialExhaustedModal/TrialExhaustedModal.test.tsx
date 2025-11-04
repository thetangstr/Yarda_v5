/**
 * TrialExhaustedModal Component Unit Tests
 *
 * Test Coverage:
 * - TC-UI-1.2: Display modal when trial_remaining=0
 * - FR-016: Block generation when trial_remaining=0
 * - User interaction flows
 * - Navigation and callback behavior
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { TrialExhaustedModal } from './index';
import { useRouter } from 'next/router';

// Mock Next.js router
jest.mock('next/router', () => ({
  useRouter: jest.fn(),
}));

const mockPush = jest.fn();
const mockRouter = {
  push: mockPush,
  pathname: '/generate',
  query: {},
  asPath: '/generate',
};

describe('TrialExhaustedModal Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (useRouter as jest.Mock).mockReturnValue(mockRouter);
  });

  describe('Visibility', () => {
    it('should not render when isOpen is false', () => {
      const { container } = render(
        <TrialExhaustedModal
          isOpen={false}
          onClose={jest.fn()}
        />
      );

      expect(container.firstChild).toBeNull();
    });

    it('should render when isOpen is true', () => {
      render(
        <TrialExhaustedModal
          isOpen={true}
          onClose={jest.fn()}
        />
      );

      expect(screen.getByTestId('trial-exhausted-modal')).toBeInTheDocument();
    });

    it('should have proper ARIA attributes for accessibility', () => {
      render(
        <TrialExhaustedModal
          isOpen={true}
          onClose={jest.fn()}
        />
      );

      const modal = screen.getByRole('dialog');
      expect(modal).toHaveAttribute('aria-modal', 'true');
      expect(modal).toHaveAttribute('aria-labelledby', 'modal-title');
    });
  });

  describe('Content Display', () => {
    beforeEach(() => {
      render(
        <TrialExhaustedModal
          isOpen={true}
          onClose={jest.fn()}
        />
      );
    });

    it('should display the title', () => {
      expect(screen.getByText(/your trial credits are exhausted/i)).toBeInTheDocument();
    });

    it('should display descriptive text explaining the situation', () => {
      expect(screen.getByText(/you've used all 3 free trial credits/i)).toBeInTheDocument();
    });

    it('should display Purchase Tokens button', () => {
      expect(screen.getByText('Purchase Tokens')).toBeInTheDocument();
      expect(screen.getByText(/pay-per-use, starting at \$1 per generation/i)).toBeInTheDocument();
    });

    it('should display Learn About Subscriptions button', () => {
      expect(screen.getByText('Learn About Subscriptions')).toBeInTheDocument();
      expect(screen.getByText(/unlimited generations with monthly plans/i)).toBeInTheDocument();
    });

    it('should display close button', () => {
      const closeButton = screen.getByLabelText('Close modal');
      expect(closeButton).toBeInTheDocument();
    });

    it('should display "Not now" dismiss link', () => {
      expect(screen.getByText('Not now')).toBeInTheDocument();
    });
  });

  describe('User Interactions', () => {
    it('should call onClose when backdrop is clicked', () => {
      const onClose = jest.fn();
      render(
        <TrialExhaustedModal
          isOpen={true}
          onClose={onClose}
        />
      );

      const backdrop = screen.getByTestId('trial-exhausted-modal').previousSibling;
      fireEvent.click(backdrop as Element);

      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('should call onClose when close button is clicked', () => {
      const onClose = jest.fn();
      render(
        <TrialExhaustedModal
          isOpen={true}
          onClose={onClose}
        />
      );

      const closeButton = screen.getByLabelText('Close modal');
      fireEvent.click(closeButton);

      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('should call onClose when "Not now" is clicked', () => {
      const onClose = jest.fn();
      render(
        <TrialExhaustedModal
          isOpen={true}
          onClose={onClose}
        />
      );

      const notNowButton = screen.getByText('Not now');
      fireEvent.click(notNowButton);

      expect(onClose).toHaveBeenCalledTimes(1);
    });
  });

  describe('Purchase Tokens Flow', () => {
    it('should navigate to /purchase when Purchase Tokens is clicked (no callback)', async () => {
      const onClose = jest.fn();
      render(
        <TrialExhaustedModal
          isOpen={true}
          onClose={onClose}
        />
      );

      const purchaseButton = screen.getByText('Purchase Tokens');
      fireEvent.click(purchaseButton);

      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith('/purchase');
        expect(onClose).toHaveBeenCalled();
      });
    });

    it('should call onPurchaseTokens callback when provided', async () => {
      const onClose = jest.fn();
      const onPurchaseTokens = jest.fn();

      render(
        <TrialExhaustedModal
          isOpen={true}
          onClose={onClose}
          onPurchaseTokens={onPurchaseTokens}
        />
      );

      const purchaseButton = screen.getByText('Purchase Tokens');
      fireEvent.click(purchaseButton);

      await waitFor(() => {
        expect(onPurchaseTokens).toHaveBeenCalledTimes(1);
        expect(onClose).toHaveBeenCalled();
        expect(mockPush).not.toHaveBeenCalled(); // Callback used instead
      });
    });
  });

  describe('Learn About Subscriptions Flow', () => {
    it('should navigate to /pricing when Learn About Subscriptions is clicked', async () => {
      const onClose = jest.fn();
      render(
        <TrialExhaustedModal
          isOpen={true}
          onClose={onClose}
        />
      );

      const subscriptionsButton = screen.getByText('Learn About Subscriptions');
      fireEvent.click(subscriptionsButton);

      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith('/pricing');
        expect(onClose).toHaveBeenCalled();
      });
    });
  });

  describe('Visual Elements', () => {
    it('should render icon in the modal', () => {
      render(
        <TrialExhaustedModal
          isOpen={true}
          onClose={jest.fn()}
        />
      );

      // Check for SVG icon (gift/ticket icon)
      const svgs = document.querySelectorAll('svg');
      expect(svgs.length).toBeGreaterThan(0);
    });

    it('should have proper styling classes', () => {
      render(
        <TrialExhaustedModal
          isOpen={true}
          onClose={jest.fn()}
        />
      );

      const modal = screen.getByTestId('trial-exhausted-modal');
      expect(modal).toHaveClass('fixed');
      expect(modal).toHaveClass('inset-0');
      expect(modal).toHaveClass('z-50');
    });
  });

  describe('Keyboard Accessibility', () => {
    it('should have focusable close button', () => {
      render(
        <TrialExhaustedModal
          isOpen={true}
          onClose={jest.fn()}
        />
      );

      const closeButton = screen.getByLabelText('Close modal');
      expect(closeButton).toHaveAttribute('aria-label', 'Close modal');
    });

    it('should have focusable action buttons', () => {
      render(
        <TrialExhaustedModal
          isOpen={true}
          onClose={jest.fn()}
        />
      );

      const purchaseButton = screen.getByText('Purchase Tokens');
      const subscriptionsButton = screen.getByText('Learn About Subscriptions');

      expect(purchaseButton.tagName).toBe('BUTTON');
      expect(subscriptionsButton.tagName).toBe('BUTTON');
    });
  });

  describe('Edge Cases', () => {
    it('should handle rapid clicks gracefully', async () => {
      const onClose = jest.fn();
      render(
        <TrialExhaustedModal
          isOpen={true}
          onClose={onClose}
        />
      );

      const closeButton = screen.getByLabelText('Close modal');

      // Rapidly click multiple times
      fireEvent.click(closeButton);
      fireEvent.click(closeButton);
      fireEvent.click(closeButton);

      // onClose should still be called for each click
      expect(onClose).toHaveBeenCalledTimes(3);
    });

    it('should handle router navigation failures gracefully', async () => {
      const onClose = jest.fn();
      const consoleError = jest.spyOn(console, 'error').mockImplementation();

      // Mock router.push to throw error
      mockPush.mockRejectedValueOnce(new Error('Navigation failed'));

      render(
        <TrialExhaustedModal
          isOpen={true}
          onClose={onClose}
        />
      );

      const purchaseButton = screen.getByText('Purchase Tokens');
      fireEvent.click(purchaseButton);

      await waitFor(() => {
        expect(onClose).toHaveBeenCalled();
      });

      consoleError.mockRestore();
    });
  });
});
