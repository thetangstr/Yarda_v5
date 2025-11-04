/**
 * AutoReloadConfig Component
 *
 * Allows users to configure automatic token reload settings.
 *
 * Requirements:
 * - T074: AutoReloadConfig component with threshold and amount inputs
 * - FR-034: Enable auto-reload with threshold (1-100) and amount (min 10)
 * - FR-035: Validate payment method on file
 * - FR-040: Display failure count and disabled state
 */

import React, { useState, useEffect } from 'react';
import { tokenAPI, AutoReloadConfigResponse, getErrorMessage } from '@/lib/api';

interface AutoReloadConfigProps {
  onConfigured?: () => void;
}

export default function AutoReloadConfig({ onConfigured }: AutoReloadConfigProps) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Form state
  const [enabled, setEnabled] = useState(false);
  const [threshold, setThreshold] = useState<number>(20);
  const [amount, setAmount] = useState<number>(100);

  // Current config from server
  const [currentConfig, setCurrentConfig] = useState<AutoReloadConfigResponse | null>(null);

  // Validation errors
  const [thresholdError, setThresholdError] = useState<string | null>(null);
  const [amountError, setAmountError] = useState<string | null>(null);

  // Fetch current configuration on mount
  useEffect(() => {
    fetchConfig();
  }, []);

  const fetchConfig = async () => {
    setLoading(true);
    setError(null);
    try {
      const config = await tokenAPI.getAutoReloadConfig();
      setCurrentConfig(config);
      setEnabled(config.auto_reload_enabled);
      setThreshold(config.auto_reload_threshold || 20);
      setAmount(config.auto_reload_amount || 100);
    } catch (err) {
      console.error('Failed to fetch auto-reload config:', err);
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const validateInputs = (): boolean => {
    let valid = true;
    setThresholdError(null);
    setAmountError(null);

    if (enabled) {
      // Validate threshold (1-100)
      if (threshold < 1 || threshold > 100) {
        setThresholdError('Threshold must be between 1 and 100');
        valid = false;
      }

      // Validate amount (min 10)
      if (amount < 10) {
        setAmountError('Amount must be at least 10 tokens');
        valid = false;
      }
    }

    return valid;
  };

  const handleSave = async () => {
    if (!validateInputs()) {
      return;
    }

    setSaving(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const config = await tokenAPI.configureAutoReload({
        enabled,
        threshold: enabled ? threshold : undefined,
        amount: enabled ? amount : undefined,
      });

      setCurrentConfig(config);
      setSuccessMessage(
        enabled
          ? 'Auto-reload enabled successfully!'
          : 'Auto-reload disabled successfully.'
      );

      if (onConfigured) {
        onConfigured();
      }

      // Clear success message after 3 seconds
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err) {
      console.error('Failed to configure auto-reload:', err);
      setError(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="h-4 bg-gray-200 rounded w-2/3 mb-6"></div>
          <div className="h-10 bg-gray-200 rounded mb-4"></div>
          <div className="h-10 bg-gray-200 rounded mb-4"></div>
        </div>
      </div>
    );
  }

  const isDisabledDueToFailures =
    currentConfig &&
    currentConfig.auto_reload_failure_count >= 3 &&
    !currentConfig.auto_reload_enabled;

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">
            Auto-Reload Settings
          </h3>
          <p className="text-sm text-gray-600 mt-1">
            Automatically purchase tokens when your balance runs low
          </p>
        </div>
        <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
          <svg
            className="w-6 h-6 text-green-600"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
            />
          </svg>
        </div>
      </div>

      {/* Failure Warning */}
      {isDisabledDueToFailures && (
        <div
          data-testid="auto-reload-failure-warning"
          className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg"
        >
          <div className="flex items-start gap-3">
            <svg
              className="w-5 h-5 text-red-600 mt-0.5"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fillRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                clipRule="evenodd"
              />
            </svg>
            <div>
              <p className="text-sm font-medium text-red-800">
                Auto-Reload Disabled Due to Payment Failures
              </p>
              <p className="text-sm text-red-700 mt-1">
                Auto-reload has been disabled after 3 consecutive payment failures.
                Please update your payment method and re-enable auto-reload.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Failure Count Display (if > 0 and still enabled) */}
      {currentConfig &&
        currentConfig.auto_reload_failure_count > 0 &&
        currentConfig.auto_reload_failure_count < 3 &&
        enabled && (
          <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <div className="flex items-start gap-3">
              <svg
                className="w-5 h-5 text-yellow-600 mt-0.5"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                  clipRule="evenodd"
                />
              </svg>
              <div>
                <p className="text-sm font-medium text-yellow-800">
                  Payment Failure Warning
                </p>
                <p className="text-sm text-yellow-700 mt-1">
                  {currentConfig.auto_reload_failure_count} consecutive payment
                  failure(s). Auto-reload will be disabled after 3 failures.
                </p>
              </div>
            </div>
          </div>
        )}

      {/* Error Message */}
      {error && (
        <div
          data-testid="auto-reload-error"
          className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg"
        >
          <p className="text-sm text-red-800">{error}</p>
        </div>
      )}

      {/* Success Message */}
      {successMessage && (
        <div
          data-testid="auto-reload-success"
          className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg"
        >
          <p className="text-sm text-green-800">{successMessage}</p>
        </div>
      )}

      {/* Enable/Disable Toggle */}
      <div className="mb-6">
        <label className="flex items-center gap-3 cursor-pointer">
          <div className="relative">
            <input
              type="checkbox"
              data-testid="auto-reload-enabled"
              checked={enabled}
              onChange={(e) => setEnabled(e.target.checked)}
              disabled={saving}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
          </div>
          <div>
            <span className="text-sm font-medium text-gray-900">
              Enable Auto-Reload
            </span>
            <p className="text-xs text-gray-500">
              Automatically purchase tokens when balance is low
            </p>
          </div>
        </label>
      </div>

      {/* Threshold Input */}
      <div className="mb-6">
        <label
          htmlFor="threshold"
          className="block text-sm font-medium text-gray-700 mb-2"
        >
          Trigger Threshold
        </label>
        <div className="relative">
          <input
            type="number"
            id="threshold"
            data-testid="auto-reload-threshold"
            value={threshold}
            onChange={(e) => setThreshold(parseInt(e.target.value) || 0)}
            disabled={!enabled || saving}
            min={1}
            max={100}
            className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed ${
              thresholdError ? 'border-red-500' : 'border-gray-300'
            }`}
          />
          <span className="absolute right-4 top-2.5 text-gray-500 text-sm">
            tokens
          </span>
        </div>
        <p className="text-xs text-gray-500 mt-1">
          Reload will trigger when balance drops below this amount (1-100)
        </p>
        {thresholdError && (
          <p
            data-testid="threshold-error"
            className="text-xs text-red-600 mt-1"
          >
            {thresholdError}
          </p>
        )}
      </div>

      {/* Amount Input */}
      <div className="mb-6">
        <label
          htmlFor="amount"
          className="block text-sm font-medium text-gray-700 mb-2"
        >
          Reload Amount
        </label>
        <div className="relative">
          <input
            type="number"
            id="amount"
            data-testid="auto-reload-amount"
            value={amount}
            onChange={(e) => setAmount(parseInt(e.target.value) || 0)}
            disabled={!enabled || saving}
            min={10}
            step={10}
            className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed ${
              amountError ? 'border-red-500' : 'border-gray-300'
            }`}
          />
          <span className="absolute right-4 top-2.5 text-gray-500 text-sm">
            tokens
          </span>
        </div>
        <p className="text-xs text-gray-500 mt-1">
          Number of tokens to purchase when reloading (minimum 10)
        </p>
        {amountError && (
          <p
            data-testid="amount-error"
            className="text-xs text-red-600 mt-1"
          >
            {amountError}
          </p>
        )}
      </div>

      {/* Price Preview (if enabled) */}
      {enabled && (
        <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-center gap-2 mb-2">
            <svg
              className="w-5 h-5 text-blue-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <span className="text-sm font-medium text-blue-900">
              Auto-Reload Summary
            </span>
          </div>
          <p className="text-sm text-blue-800">
            When your balance drops below <strong>{threshold} tokens</strong>,
            we'll automatically purchase <strong>{amount} tokens</strong> for
            approximately <strong>${(amount * 0.9).toFixed(2)}</strong>
          </p>
          <p className="text-xs text-blue-700 mt-2">
            Note: Actual price depends on the closest token package. Standard
            token pricing applies.
          </p>
        </div>
      )}

      {/* Save Button */}
      <div className="flex gap-3">
        <button
          onClick={handleSave}
          disabled={saving}
          data-testid="save-auto-reload"
          className="flex-1 py-2 px-4 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-medium rounded-lg transition"
        >
          {saving ? 'Saving...' : 'Save Settings'}
        </button>
        <button
          onClick={fetchConfig}
          disabled={saving}
          className="py-2 px-4 bg-gray-100 hover:bg-gray-200 disabled:bg-gray-50 text-gray-700 font-medium rounded-lg transition"
        >
          Reset
        </button>
      </div>

      {/* Info Footer */}
      <div className="mt-6 p-4 bg-gray-50 rounded-lg">
        <p className="text-xs text-gray-600">
          <strong>How it works:</strong> When your token balance drops below the
          threshold during generation, we'll automatically charge your payment
          method on file and credit tokens to your account. You'll receive an
          email confirmation for each auto-reload.
        </p>
        <p className="text-xs text-gray-600 mt-2">
          <strong>Throttling:</strong> Auto-reload can only trigger once every 60
          seconds to prevent duplicate charges.
        </p>
      </div>
    </div>
  );
}
