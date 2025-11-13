/**
 * Unit tests for AutoReloadConfig component
 * Requirements: T075 [US3]
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import AutoReloadConfig from './index';
import * as api from '@/lib/api';

// Mock the API module
vi.mock('@/lib/api', () => ({
  tokenAPI: {
    getAutoReloadConfig: vi.fn(),
    configureAutoReload: vi.fn(),
  },
  getErrorMessage: vi.fn((error) => error.message || 'An error occurred'),
}));

describe('AutoReloadConfig Component', () => {
  const mockConfig = {
    auto_reload_enabled: false,
    auto_reload_threshold: 20,
    auto_reload_amount: 100,
    auto_reload_failure_count: 0,
    last_reload_at: null,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    (api.tokenAPI.getAutoReloadConfig as any).mockResolvedValue(mockConfig);
  });

  describe('Initial Loading and Rendering', () => {
    it('should show loading state initially', () => {
      (api.tokenAPI.getAutoReloadConfig as any).mockImplementation(
        () => new Promise(() => {}) // Never resolves
      );

      render(<AutoReloadConfig />);

      // Check for skeleton loader elements
      expect(document.querySelector('.animate-pulse')).toBeInTheDocument();
    });

    it('should fetch and display config on mount', async () => {
      render(<AutoReloadConfig />);

      await waitFor(() => {
        expect(api.tokenAPI.getAutoReloadConfig).toHaveBeenCalledTimes(1);
      });

      // Check that form is rendered with config values
      const thresholdInput = screen.getByTestId('auto-reload-threshold') as HTMLInputElement;
      const amountInput = screen.getByTestId('auto-reload-amount') as HTMLInputElement;

      expect(thresholdInput.value).toBe('20');
      expect(amountInput.value).toBe('100');
    });

    it('should display error when config fetch fails', async () => {
      const error = new Error('Failed to fetch config');
      (api.tokenAPI.getAutoReloadConfig as any).mockRejectedValue(error);
      (api.getErrorMessage as any).mockReturnValue('Failed to fetch config');

      render(<AutoReloadConfig />);

      await waitFor(() => {
        expect(screen.getByTestId('auto-reload-error')).toBeInTheDocument();
        expect(screen.getByText('Failed to fetch config')).toBeInTheDocument();
      });
    });
  });

  describe('Enable/Disable Toggle', () => {
    it('should toggle auto-reload enabled state', async () => {
      render(<AutoReloadConfig />);

      await waitFor(() => {
        expect(screen.getByTestId('auto-reload-enabled')).toBeInTheDocument();
      });

      const toggle = screen.getByTestId('auto-reload-enabled') as HTMLInputElement;

      // Initially disabled
      expect(toggle.checked).toBe(false);

      // Click to enable
      fireEvent.click(toggle);
      expect(toggle.checked).toBe(true);

      // Click again to disable
      fireEvent.click(toggle);
      expect(toggle.checked).toBe(false);
    });

    it('should disable inputs when auto-reload is disabled', async () => {
      render(<AutoReloadConfig />);

      await waitFor(() => {
        expect(screen.getByTestId('auto-reload-threshold')).toBeInTheDocument();
      });

      const thresholdInput = screen.getByTestId('auto-reload-threshold') as HTMLInputElement;
      const amountInput = screen.getByTestId('auto-reload-amount') as HTMLInputElement;

      // Inputs should be disabled when auto-reload is off
      expect(thresholdInput.disabled).toBe(true);
      expect(amountInput.disabled).toBe(true);
    });

    it('should enable inputs when auto-reload is enabled', async () => {
      render(<AutoReloadConfig />);

      await waitFor(() => {
        expect(screen.getByTestId('auto-reload-enabled')).toBeInTheDocument();
      });

      const toggle = screen.getByTestId('auto-reload-enabled');
      const thresholdInput = screen.getByTestId('auto-reload-threshold') as HTMLInputElement;
      const amountInput = screen.getByTestId('auto-reload-amount') as HTMLInputElement;

      // Enable auto-reload
      fireEvent.click(toggle);

      // Inputs should now be enabled
      expect(thresholdInput.disabled).toBe(false);
      expect(amountInput.disabled).toBe(false);
    });
  });

  describe('Threshold Input Validation', () => {
    it('should show error when threshold is below 1', async () => {
      render(<AutoReloadConfig />);

      await waitFor(() => {
        expect(screen.getByTestId('auto-reload-enabled')).toBeInTheDocument();
      });

      // Enable auto-reload
      const toggle = screen.getByTestId('auto-reload-enabled');
      fireEvent.click(toggle);

      // Set threshold to 0
      const thresholdInput = screen.getByTestId('auto-reload-threshold');
      fireEvent.change(thresholdInput, { target: { value: '0' } });

      // Try to save
      const saveButton = screen.getByTestId('save-auto-reload');
      fireEvent.click(saveButton);

      await waitFor(() => {
        expect(screen.getByTestId('threshold-error')).toBeInTheDocument();
        expect(screen.getByText('Threshold must be between 1 and 100')).toBeInTheDocument();
      });

      // API should not be called
      expect(api.tokenAPI.configureAutoReload).not.toHaveBeenCalled();
    });

    it('should show error when threshold is above 100', async () => {
      render(<AutoReloadConfig />);

      await waitFor(() => {
        expect(screen.getByTestId('auto-reload-enabled')).toBeInTheDocument();
      });

      // Enable auto-reload
      const toggle = screen.getByTestId('auto-reload-enabled');
      fireEvent.click(toggle);

      // Set threshold to 101
      const thresholdInput = screen.getByTestId('auto-reload-threshold');
      fireEvent.change(thresholdInput, { target: { value: '101' } });

      // Try to save
      const saveButton = screen.getByTestId('save-auto-reload');
      fireEvent.click(saveButton);

      await waitFor(() => {
        expect(screen.getByTestId('threshold-error')).toBeInTheDocument();
      });

      expect(api.tokenAPI.configureAutoReload).not.toHaveBeenCalled();
    });

    it('should accept valid threshold values', async () => {
      (api.tokenAPI.configureAutoReload as any).mockResolvedValue({
        ...mockConfig,
        auto_reload_enabled: true,
        auto_reload_threshold: 50,
      });

      render(<AutoReloadConfig />);

      await waitFor(() => {
        expect(screen.getByTestId('auto-reload-enabled')).toBeInTheDocument();
      });

      // Enable auto-reload
      const toggle = screen.getByTestId('auto-reload-enabled');
      fireEvent.click(toggle);

      // Set valid threshold
      const thresholdInput = screen.getByTestId('auto-reload-threshold');
      fireEvent.change(thresholdInput, { target: { value: '50' } });

      // Save
      const saveButton = screen.getByTestId('save-auto-reload');
      fireEvent.click(saveButton);

      await waitFor(() => {
        expect(api.tokenAPI.configureAutoReload).toHaveBeenCalledWith({
          enabled: true,
          threshold: 50,
          amount: 100,
        });
      });

      expect(screen.queryByTestId('threshold-error')).not.toBeInTheDocument();
    });
  });

  describe('Amount Input Validation', () => {
    it('should show error when amount is below 10', async () => {
      render(<AutoReloadConfig />);

      await waitFor(() => {
        expect(screen.getByTestId('auto-reload-enabled')).toBeInTheDocument();
      });

      // Enable auto-reload
      const toggle = screen.getByTestId('auto-reload-enabled');
      fireEvent.click(toggle);

      // Set amount to 5
      const amountInput = screen.getByTestId('auto-reload-amount');
      fireEvent.change(amountInput, { target: { value: '5' } });

      // Try to save
      const saveButton = screen.getByTestId('save-auto-reload');
      fireEvent.click(saveButton);

      await waitFor(() => {
        expect(screen.getByTestId('amount-error')).toBeInTheDocument();
        expect(screen.getByText('Amount must be at least 10 tokens')).toBeInTheDocument();
      });

      expect(api.tokenAPI.configureAutoReload).not.toHaveBeenCalled();
    });

    it('should accept valid amount values', async () => {
      (api.tokenAPI.configureAutoReload as any).mockResolvedValue({
        ...mockConfig,
        auto_reload_enabled: true,
        auto_reload_amount: 50,
      });

      render(<AutoReloadConfig />);

      await waitFor(() => {
        expect(screen.getByTestId('auto-reload-enabled')).toBeInTheDocument();
      });

      // Enable auto-reload
      const toggle = screen.getByTestId('auto-reload-enabled');
      fireEvent.click(toggle);

      // Set valid amount
      const amountInput = screen.getByTestId('auto-reload-amount');
      fireEvent.change(amountInput, { target: { value: '50' } });

      // Save
      const saveButton = screen.getByTestId('save-auto-reload');
      fireEvent.click(saveButton);

      await waitFor(() => {
        expect(api.tokenAPI.configureAutoReload).toHaveBeenCalledWith({
          enabled: true,
          threshold: 20,
          amount: 50,
        });
      });

      expect(screen.queryByTestId('amount-error')).not.toBeInTheDocument();
    });
  });

  describe('Save Configuration', () => {
    it('should save configuration when enabled', async () => {
      const updatedConfig = {
        ...mockConfig,
        auto_reload_enabled: true,
        auto_reload_threshold: 30,
        auto_reload_amount: 200,
      };
      (api.tokenAPI.configureAutoReload as any).mockResolvedValue(updatedConfig);

      render(<AutoReloadConfig />);

      await waitFor(() => {
        expect(screen.getByTestId('auto-reload-enabled')).toBeInTheDocument();
      });

      // Enable and configure
      fireEvent.click(screen.getByTestId('auto-reload-enabled'));
      fireEvent.change(screen.getByTestId('auto-reload-threshold'), { target: { value: '30' } });
      fireEvent.change(screen.getByTestId('auto-reload-amount'), { target: { value: '200' } });

      // Save
      fireEvent.click(screen.getByTestId('save-auto-reload'));

      await waitFor(() => {
        expect(api.tokenAPI.configureAutoReload).toHaveBeenCalledWith({
          enabled: true,
          threshold: 30,
          amount: 200,
        });
      });

      // Check success message
      await waitFor(() => {
        expect(screen.getByTestId('auto-reload-success')).toBeInTheDocument();
        expect(screen.getByText('Auto-reload enabled successfully!')).toBeInTheDocument();
      });
    });

    it('should save configuration when disabled', async () => {
      const enabledConfig = {
        ...mockConfig,
        auto_reload_enabled: true,
      };
      (api.tokenAPI.getAutoReloadConfig as any).mockResolvedValue(enabledConfig);
      (api.tokenAPI.configureAutoReload as any).mockResolvedValue({
        ...enabledConfig,
        auto_reload_enabled: false,
      });

      render(<AutoReloadConfig />);

      await waitFor(() => {
        const toggle = screen.getByTestId('auto-reload-enabled') as HTMLInputElement;
        expect(toggle.checked).toBe(true);
      });

      // Disable
      fireEvent.click(screen.getByTestId('auto-reload-enabled'));

      // Save
      fireEvent.click(screen.getByTestId('save-auto-reload'));

      await waitFor(() => {
        expect(api.tokenAPI.configureAutoReload).toHaveBeenCalledWith({
          enabled: false,
          threshold: undefined,
          amount: undefined,
        });
      });

      await waitFor(() => {
        expect(screen.getByText('Auto-reload disabled successfully.')).toBeInTheDocument();
      });
    });

    it('should show error when save fails', async () => {
      const error = new Error('Payment method required');
      (api.tokenAPI.configureAutoReload as any).mockRejectedValue(error);
      (api.getErrorMessage as any).mockReturnValue('Payment method required');

      render(<AutoReloadConfig />);

      await waitFor(() => {
        expect(screen.getByTestId('auto-reload-enabled')).toBeInTheDocument();
      });

      // Enable and try to save
      fireEvent.click(screen.getByTestId('auto-reload-enabled'));
      fireEvent.click(screen.getByTestId('save-auto-reload'));

      await waitFor(() => {
        expect(screen.getByTestId('auto-reload-error')).toBeInTheDocument();
        expect(screen.getByText('Payment method required')).toBeInTheDocument();
      });
    });

    it('should disable save button while saving', async () => {
      (api.tokenAPI.configureAutoReload as any).mockImplementation(
        () => new Promise((resolve) => setTimeout(resolve, 1000))
      );

      render(<AutoReloadConfig />);

      await waitFor(() => {
        expect(screen.getByTestId('auto-reload-enabled')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByTestId('auto-reload-enabled'));

      const saveButton = screen.getByTestId('save-auto-reload') as HTMLButtonElement;
      fireEvent.click(saveButton);

      // Button should be disabled and show "Saving..."
      expect(saveButton.disabled).toBe(true);
      expect(saveButton.textContent).toBe('Saving...');
    });
  });

  describe('Failure Count Warnings', () => {
    it('should show warning when failure count is 1 or 2', async () => {
      const configWithFailures = {
        ...mockConfig,
        auto_reload_enabled: true,
        auto_reload_failure_count: 2,
      };
      (api.tokenAPI.getAutoReloadConfig as any).mockResolvedValue(configWithFailures);

      render(<AutoReloadConfig />);

      await waitFor(() => {
        expect(screen.getByText('Payment Failure Warning')).toBeInTheDocument();
        expect(screen.getByText(/2 consecutive payment failure/)).toBeInTheDocument();
      });
    });

    it('should show disabled warning when failure count is 3', async () => {
      const configDisabledByFailures = {
        ...mockConfig,
        auto_reload_enabled: false,
        auto_reload_failure_count: 3,
      };
      (api.tokenAPI.getAutoReloadConfig as any).mockResolvedValue(configDisabledByFailures);

      render(<AutoReloadConfig />);

      await waitFor(() => {
        expect(screen.getByTestId('auto-reload-failure-warning')).toBeInTheDocument();
        expect(screen.getByText('Auto-Reload Disabled Due to Payment Failures')).toBeInTheDocument();
      });
    });

    it('should not show warning when failure count is 0', async () => {
      render(<AutoReloadConfig />);

      await waitFor(() => {
        expect(screen.getByTestId('auto-reload-enabled')).toBeInTheDocument();
      });

      expect(screen.queryByText('Payment Failure Warning')).not.toBeInTheDocument();
      expect(screen.queryByTestId('auto-reload-failure-warning')).not.toBeInTheDocument();
    });
  });

  describe('Price Preview', () => {
    it('should show price preview when enabled', async () => {
      render(<AutoReloadConfig />);

      await waitFor(() => {
        expect(screen.getByTestId('auto-reload-enabled')).toBeInTheDocument();
      });

      // Enable auto-reload
      fireEvent.click(screen.getByTestId('auto-reload-enabled'));

      await waitFor(() => {
        expect(screen.getByText('Auto-Reload Summary')).toBeInTheDocument();
        expect(screen.getByText(/20 tokens/)).toBeInTheDocument();
        expect(screen.getByText(/100 tokens/)).toBeInTheDocument();
      });
    });

    it('should not show price preview when disabled', async () => {
      render(<AutoReloadConfig />);

      await waitFor(() => {
        expect(screen.getByTestId('auto-reload-enabled')).toBeInTheDocument();
      });

      expect(screen.queryByText('Auto-Reload Summary')).not.toBeInTheDocument();
    });

    it('should update price preview when values change', async () => {
      render(<AutoReloadConfig />);

      await waitFor(() => {
        expect(screen.getByTestId('auto-reload-enabled')).toBeInTheDocument();
      });

      // Enable auto-reload
      fireEvent.click(screen.getByTestId('auto-reload-enabled'));

      // Change values
      fireEvent.change(screen.getByTestId('auto-reload-threshold'), { target: { value: '50' } });
      fireEvent.change(screen.getByTestId('auto-reload-amount'), { target: { value: '200' } });

      await waitFor(() => {
        expect(screen.getByText(/50 tokens/)).toBeInTheDocument();
        expect(screen.getByText(/200 tokens/)).toBeInTheDocument();
      });
    });
  });

  describe('Reset Functionality', () => {
    it('should reset form to current config when reset is clicked', async () => {
      render(<AutoReloadConfig />);

      await waitFor(() => {
        expect(screen.getByTestId('auto-reload-enabled')).toBeInTheDocument();
      });

      // Enable and change values
      fireEvent.click(screen.getByTestId('auto-reload-enabled'));
      fireEvent.change(screen.getByTestId('auto-reload-threshold'), { target: { value: '50' } });
      fireEvent.change(screen.getByTestId('auto-reload-amount'), { target: { value: '200' } });

      let thresholdInput = screen.getByTestId('auto-reload-threshold') as HTMLInputElement;
      expect(thresholdInput.value).toBe('50');

      // Click reset
      const resetButton = screen.getByText('Reset');
      fireEvent.click(resetButton);

      await waitFor(() => {
        expect(api.tokenAPI.getAutoReloadConfig).toHaveBeenCalledTimes(2); // Initial + reset
      });

      // Re-query the input element after reset (component may have re-rendered during loading)
      thresholdInput = screen.getByTestId('auto-reload-threshold') as HTMLInputElement;

      // Values should be reset
      await waitFor(() => {
        expect(thresholdInput.value).toBe('20');
      });
    });
  });

  describe('Callback Functionality', () => {
    it('should call onConfigured callback after successful save', async () => {
      const onConfigured = vi.fn();
      const updatedConfig = {
        ...mockConfig,
        auto_reload_enabled: true,
      };
      (api.tokenAPI.configureAutoReload as any).mockResolvedValue(updatedConfig);

      render(<AutoReloadConfig onConfigured={onConfigured} />);

      await waitFor(() => {
        expect(screen.getByTestId('auto-reload-enabled')).toBeInTheDocument();
      });

      // Enable and save
      fireEvent.click(screen.getByTestId('auto-reload-enabled'));
      fireEvent.click(screen.getByTestId('save-auto-reload'));

      await waitFor(() => {
        expect(onConfigured).toHaveBeenCalledTimes(1);
      });
    });

    it('should not call onConfigured callback when save fails', async () => {
      const onConfigured = vi.fn();
      (api.tokenAPI.configureAutoReload as any).mockRejectedValue(new Error('Failed'));

      render(<AutoReloadConfig onConfigured={onConfigured} />);

      await waitFor(() => {
        expect(screen.getByTestId('auto-reload-enabled')).toBeInTheDocument();
      });

      // Enable and try to save
      fireEvent.click(screen.getByTestId('auto-reload-enabled'));
      fireEvent.click(screen.getByTestId('save-auto-reload'));

      await waitFor(() => {
        expect(screen.getByTestId('auto-reload-error')).toBeInTheDocument();
      });

      expect(onConfigured).not.toHaveBeenCalled();
    });
  });
});
