/**
 * GenerationForm Component
 *
 * Main generation form integrating address, area, and style inputs.
 *
 * Requirements:
 * - T021: Integrate AddressInput, AreaSelector, StyleSelector
 * - T022: Form validation (address, area, style required)
 * - T023: API integration using generationsAPI.create()
 * - T024: Store in generationStore and navigate to progress page
 * - FR-015: Validate all inputs before submission
 *
 * Features:
 * - Complete generation workflow
 * - Payment authorization check
 * - Form validation with error messages
 * - API error handling
 * - Progress navigation
 * - Payment method display
 */

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { useUserStore } from '@/store/userStore';
import { useGenerationStore } from '@/store/generationStore';
import { generationsAPI, paymentAPI, getErrorMessage } from '@/lib/api';
import { YardArea, DesignStyle, type LandscapeStyle } from '@/types/generation';

import AddressInput from './AddressInput';
import AreaSelector from './AreaSelector';
import StyleSelector from './StyleSelector';

interface GenerationFormProps {
  /** Whether to show trial exhausted modal callback */
  onShowTrialExhausted?: () => void;
  /** Custom CSS classes */
  className?: string;
}

interface FormErrors {
  address?: string;
  area?: string;
  style?: string;
  submit?: string;
}

export const GenerationForm: React.FC<GenerationFormProps> = ({
  onShowTrialExhausted,
  className = '',
}) => {
  const router = useRouter();
  const { user, setUser } = useUserStore();
  const { setCurrentGeneration } = useGenerationStore();

  // Form state
  const [address, setAddress] = useState('');
  const [selectedArea, setSelectedArea] = useState<YardArea>(YardArea.FrontYard);
  const [selectedStyle, setSelectedStyle] = useState<LandscapeStyle>(DesignStyle.ModernMinimalist);
  const [customPrompt, setCustomPrompt] = useState('');

  // UI state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<FormErrors>({});
  const [paymentStatus, setPaymentStatus] = useState<any>(null);
  const [isLoadingPayment, setIsLoadingPayment] = useState(true);

  // Image preview state
  const [streetViewUrl, setStreetViewUrl] = useState<string>('');
  const [satelliteUrl, setSatelliteUrl] = useState<string>('');
  const [isLoadingImages, setIsLoadingImages] = useState(false);

  // Fetch payment status on mount
  useEffect(() => {
    const fetchPaymentStatus = async () => {
      if (!user) return;

      try {
        setIsLoadingPayment(true);
        const status = await paymentAPI.getStatus();
        setPaymentStatus(status);
      } catch (err) {
        console.error('Failed to fetch payment status:', err);
      } finally {
        setIsLoadingPayment(false);
      }
    };

    fetchPaymentStatus();
  }, [user]);

  // Load preview images when address changes
  useEffect(() => {
    if (!address || address.length < 5) {
      setStreetViewUrl('');
      setSatelliteUrl('');
      return;
    }

    const loadPreviewImages = async () => {
      setIsLoadingImages(true);

      // Generate Street View and Satellite URLs
      const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

      // Street View URL
      const streetView = `https://maps.googleapis.com/maps/api/streetview?size=400x300&location=${encodeURIComponent(address)}&key=${apiKey}`;
      setStreetViewUrl(streetView);

      // Satellite View URL
      const satellite = `https://maps.googleapis.com/maps/api/staticmap?center=${encodeURIComponent(address)}&zoom=20&size=400x300&maptype=satellite&key=${apiKey}`;
      setSatelliteUrl(satellite);

      setIsLoadingImages(false);
    };

    // Debounce image loading
    const timeout = setTimeout(loadPreviewImages, 500);
    return () => clearTimeout(timeout);
  }, [address]);

  /**
   * Validate form inputs
   */
  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};

    // Address validation
    if (!address || address.trim().length < 5) {
      newErrors.address = 'Please enter a valid property address';
    }

    // Area validation (should always be selected due to default)
    if (!selectedArea) {
      newErrors.area = 'Please select a landscape area';
    }

    // Style validation (should always be selected due to default)
    if (!selectedStyle) {
      newErrors.style = 'Please select a design style';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  /**
   * Check if user can generate
   */
  const canGenerate = (): boolean => {
    if (!paymentStatus) return false;
    return paymentStatus.can_generate;
  };

  /**
   * Get payment method display text
   */
  const getPaymentMethodText = (): string => {
    if (!paymentStatus) return 'Loading...';

    const method = paymentStatus.active_payment_method;

    if (method === 'subscription') {
      return 'Unlimited (Subscription)';
    } else if (method === 'trial') {
      return `Trial Credit (${paymentStatus.trial_remaining} remaining)`;
    } else if (method === 'token') {
      return `1 Token (${paymentStatus.token_balance} available)`;
    } else {
      return 'No payment method';
    }
  };

  /**
   * Handle form submission
   */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    // Validate form
    if (!validateForm()) {
      return;
    }

    // Check payment authorization
    if (!canGenerate()) {
      setErrors({
        submit: 'You have no credits or tokens available. Please purchase tokens or subscribe.',
      });
      if (onShowTrialExhausted) {
        onShowTrialExhausted();
      }
      return;
    }

    setIsSubmitting(true);

    try {
      // Call multi-area generation API (with single area for US1)
      const response = await generationsAPI.create({
        address: address.trim(),
        areas: [selectedArea], // Single area for US1
        style: selectedStyle,
        custom_prompt: customPrompt.trim() || undefined,
      });

      // Store generation in Zustand store (will persist to localStorage)
      setCurrentGeneration({
        generation_id: response.id,
        user_id: user!.id,
        status: response.status,
        progress: 0,
        payment_type: response.payment_method,
        tokens_deducted: response.total_cost,
        address: address.trim(),
        areas: response.areas.map((area) => ({
          area_id: area.id,
          area_type: area.area,
          style: area.style,
          custom_prompt: area.custom_prompt,
          status: area.status,
          progress: area.progress || 0,
          image_urls: area.image_url ? [area.image_url] : undefined,
          error_message: area.error_message,
        })),
        created_at: response.created_at,
      });

      // Update user balance if trial was used
      if (response.payment_method === 'trial' && user) {
        setUser({
          ...user,
          trial_remaining: user.trial_remaining - response.total_cost,
          trial_used: user.trial_used + response.total_cost,
        });
      }

      // Navigate to progress page
      router.push(`/generate/progress/${response.id}`);
    } catch (err) {
      const errorMessage = getErrorMessage(err);
      setErrors({ submit: errorMessage });

      // Show trial exhausted modal if payment error
      if (
        errorMessage.toLowerCase().includes('insufficient') ||
        errorMessage.toLowerCase().includes('no payment')
      ) {
        if (onShowTrialExhausted) {
          onShowTrialExhausted();
        }
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const isDisabled = isSubmitting || isLoadingPayment || !canGenerate();

  return (
    <form onSubmit={handleSubmit} className={`space-y-8 ${className}`}>
      {/* Submit error message */}
      {errors.submit && (
        <div
          className="p-4 bg-error-50 border border-error-200 rounded-lg"
          role="alert"
          data-testid="submit-error"
        >
          <div className="flex items-start gap-3">
            <svg
              className="w-5 h-5 text-error-600 flex-shrink-0 mt-0.5"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fillRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 9.586 8.707 8.293z"
                clipRule="evenodd"
              />
            </svg>
            <div>
              <p className="text-sm font-semibold text-error-800">Generation Failed</p>
              <p className="text-sm text-error-700 mt-1">{errors.submit}</p>
            </div>
          </div>
        </div>
      )}

      {/* Payment status indicator */}
      {paymentStatus && (
        <div
          className={`p-4 rounded-lg border-2 ${
            canGenerate()
              ? 'bg-brand-sage border-brand-green'
              : 'bg-warning-50 border-warning-300'
          }`}
          data-testid="payment-status"
        >
          <div className="flex items-center gap-3">
            <div
              className={`w-10 h-10 rounded-full flex items-center justify-center ${
                canGenerate() ? 'bg-brand-green' : 'bg-warning-500'
              }`}
            >
              <svg
                className="w-6 h-6 text-white"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                {canGenerate() ? (
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 13l4 4L19 7"
                  />
                ) : (
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                  />
                )}
              </svg>
            </div>
            <div>
              <p
                className={`text-sm font-semibold ${
                  canGenerate() ? 'text-brand-dark-green' : 'text-warning-800'
                }`}
              >
                {canGenerate() ? 'Ready to Generate' : 'No Credits Available'}
              </p>
              <p
                className={`text-xs ${
                  canGenerate() ? 'text-brand-dark-green' : 'text-warning-700'
                }`}
              >
                {getPaymentMethodText()}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Address Input */}
      <AddressInput
        value={address}
        onChange={(value) => {
          setAddress(value);
          if (errors.address) {
            setErrors((prev) => ({ ...prev, address: undefined }));
          }
        }}
        disabled={isDisabled}
        error={errors.address}
      />

      {/* Image Previews */}
      {(streetViewUrl || satelliteUrl) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Street View Thumbnail */}
          {streetViewUrl && (
            <div className="relative rounded-lg overflow-hidden border-2 border-neutral-200 bg-neutral-50">
              <div className="absolute top-2 left-2 z-10">
                <span className="px-2 py-1 text-xs font-semibold bg-white/90 text-neutral-700 rounded shadow">
                  Street View
                </span>
              </div>
              {isLoadingImages ? (
                <div className="aspect-[4/3] flex items-center justify-center bg-neutral-100">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-green"></div>
                </div>
              ) : (
                <img
                  src={streetViewUrl}
                  alt="Street View Preview"
                  className="w-full aspect-[4/3] object-cover"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    target.style.display = 'none';
                  }}
                />
              )}
            </div>
          )}

          {/* Satellite View Thumbnail */}
          {satelliteUrl && (
            <div className="relative rounded-lg overflow-hidden border-2 border-neutral-200 bg-neutral-50">
              <div className="absolute top-2 left-2 z-10">
                <span className="px-2 py-1 text-xs font-semibold bg-white/90 text-neutral-700 rounded shadow">
                  Satellite View
                </span>
              </div>
              {isLoadingImages ? (
                <div className="aspect-[4/3] flex items-center justify-center bg-neutral-100">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-green"></div>
                </div>
              ) : (
                <img
                  src={satelliteUrl}
                  alt="Satellite View Preview"
                  className="w-full aspect-[4/3] object-cover"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    target.style.display = 'none';
                  }}
                />
              )}
            </div>
          )}
        </div>
      )}

      {/* Area Selector */}
      <AreaSelector
        value={selectedArea}
        onChange={(value) => {
          setSelectedArea(value as YardArea);
          if (errors.area) {
            setErrors((prev) => ({ ...prev, area: undefined }));
          }
        }}
        mode="single"
        disabled={isDisabled}
        error={errors.area}
      />

      {/* Style Selector */}
      <StyleSelector
        value={selectedStyle}
        onChange={(value) => {
          setSelectedStyle(value);
          if (errors.style) {
            setErrors((prev) => ({ ...prev, style: undefined }));
          }
        }}
        customPrompt={customPrompt}
        onCustomPromptChange={setCustomPrompt}
        disabled={isDisabled}
        error={errors.style}
      />

      {/* Submit Button */}
      <button
        type="submit"
        disabled={isDisabled}
        className={`w-full py-4 px-6 rounded-lg font-semibold text-lg
          transition-all duration-200
          ${isDisabled
            ? 'bg-neutral-300 text-neutral-500 cursor-not-allowed'
            : 'bg-brand-green hover:bg-brand-dark-green text-white shadow-lg hover:shadow-xl'
          }
          focus:outline-none focus:ring-4 focus:ring-brand-green focus:ring-opacity-50
        `}
        data-testid="generate-button"
      >
        {isSubmitting ? (
          <div className="flex items-center justify-center gap-3">
            <svg
              className="animate-spin h-5 w-5 text-white"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
            </svg>
            Creating Your Design...
          </div>
        ) : isLoadingPayment ? (
          'Loading...'
        ) : canGenerate() ? (
          'Generate Landscape Design'
        ) : (
          'Purchase Tokens to Generate'
        )}
      </button>

      {/* Helper text */}
      {!errors.submit && canGenerate() && (
        <p className="text-xs text-center text-neutral-500">
          Your design will be ready in 30-60 seconds
        </p>
      )}
    </form>
  );
};

export default GenerationForm;
