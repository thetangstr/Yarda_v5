/**
 * Enhanced Generation Form Component
 *
 * Beautiful three-section layout matching Yarda v2 experience.
 * Integrates enhanced address, area, and style selectors.
 */

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useRouter } from 'next/router';
import { Sparkles } from 'lucide-react';
import { useUserStore } from '@/store/userStore';
import { useGenerationStore } from '@/store/generationStore';
import { generationsAPI, paymentAPI, getErrorMessage } from '@/lib/api';
import { YardArea, DesignStyle, type LandscapeStyle } from '@/types/generation';

import AddressInput from './AddressInput';
import AreaSelectorEnhanced from './AreaSelectorEnhanced';
import StyleSelectorEnhanced from './StyleSelectorEnhanced';
import { PreservationStrengthSlider } from './PreservationStrengthSlider';

interface GenerationFormEnhancedProps {
  /** Whether to show trial exhausted modal callback */
  onShowTrialExhausted?: () => void;
  /** Custom CSS classes */
  className?: string;
  /** Callback when generation starts (optional - for inline progress) */
  onGenerationStart?: (generationId: string) => void;
}

interface YardAreaState {
  area: YardArea;
  selected: boolean;
  customPrompt: string;
}

export const GenerationFormEnhanced: React.FC<GenerationFormEnhancedProps> = ({
  onShowTrialExhausted,
  className = '',
  onGenerationStart,
}) => {
  const router = useRouter();
  const { user, setUser, accessToken } = useUserStore();
  const {
    setCurrentGeneration,
    address: storeAddress,
    placeId: storePlaceId,
    setAddress: setStoreAddress,
    toggleArea: toggleStoreArea,
    setAreaPrompt: setStoreAreaPrompt
  } = useGenerationStore();

  // Use store state as single source of truth for address
  const address = storeAddress;
  const placeId = storePlaceId;
  const [yardAreas, setYardAreas] = useState<YardAreaState[]>([
    { area: YardArea.FrontYard, selected: false, customPrompt: '' },
    { area: YardArea.Backyard, selected: false, customPrompt: '' },
    { area: YardArea.Walkway, selected: false, customPrompt: '' }
  ]);
  const [selectedStyle, setSelectedStyle] = useState<LandscapeStyle>(DesignStyle.ModernMinimalist);
  const [customPrompt, setCustomPrompt] = useState('');
  const [preservationStrength, setPreservationStrength] = useState(0.5); // v2 enhancement: default balanced transformation

  // UI state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<{
    address?: string;
    area?: string;
    style?: string;
    submit?: string;
  }>({});
  const [paymentStatus, setPaymentStatus] = useState<any>(null);
  const [isLoadingPayment, setIsLoadingPayment] = useState(true);

  // Fetch payment status on mount
  useEffect(() => {
    const fetchPaymentStatus = async () => {
      // Don't fetch if user is not authenticated or accessToken is missing
      if (!user || !accessToken) {
        console.log('[GenerationFormEnhanced] Skipping payment status fetch - no user or accessToken');
        setPaymentStatus(null);
        setIsLoadingPayment(false);
        return;
      }

      try {
        setIsLoadingPayment(true);
        console.log('[GenerationFormEnhanced] → Fetching payment status...');
        const status = await paymentAPI.getStatus();
        console.log('[GenerationFormEnhanced] ✓ Payment status received:', {
          canGenerate: status.can_generate,
          activePaymentMethod: status.active_payment_method,
          trialRemaining: status.trial_remaining,
          tokenBalance: status.token_balance,
        });
        setPaymentStatus(status);

        // Clear submit error if payment is now available
        if (status.can_generate && errors.submit) {
          console.log('[GenerationFormEnhanced] ✓ Payment now available - clearing previous errors');
          setErrors(prev => ({...prev, submit: undefined}));
        }
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : String(err);
        console.error('[GenerationFormEnhanced] ✗ Failed to fetch payment status:', {
          message: errorMsg,
          error: err,
        });

        // Gracefully handle missing endpoint - default to trial mode
        console.log('[GenerationFormEnhanced] → Using fallback trial mode based on user trial_remaining');
        setPaymentStatus({
          can_generate: user.trial_remaining > 0,
          active_payment_method: 'trial',
          trial_remaining: user.trial_remaining,
          token_balance: 0
        });
      } finally {
        setIsLoadingPayment(false);
      }
    };

    fetchPaymentStatus();
  }, [user, accessToken]);

  /**
   * Validate form inputs
   */
  const validateForm = (): boolean => {
    const newErrors: typeof errors = {};

    // Address validation
    if (!address || address.trim().length < 5) {
      newErrors.address = 'Please enter a valid property address';
    }

    // Area validation
    const selectedAreas = yardAreas.filter(a => a.selected);
    if (selectedAreas.length === 0) {
      newErrors.area = 'Please select at least one landscape area';
    }

    // Style validation
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
   * Handle yard area toggle
   */
  const handleAreaToggle = (area: YardArea) => {
    setYardAreas(prev =>
      prev.map(a => (a.area === area ? { ...a, selected: !a.selected } : a))
    );
    // Sync to store for v2 single-page flow
    toggleStoreArea(area);
    if (errors.area) {
      setErrors(prev => ({ ...prev, area: undefined }));
    }
  };

  /**
   * Handle yard area prompt change
   */
  const handleAreaPromptChange = (area: YardArea, prompt: string) => {
    setYardAreas(prev =>
      prev.map(a => (a.area === area ? { ...a, customPrompt: prompt } : a))
    );
    // Sync to store for v2 single-page flow
    setStoreAreaPrompt(area, prompt);
  };

  /**
   * Handle form submission
   */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    // Validate form
    if (!validateForm()) {
      console.warn('[GenerationFormEnhanced] Form validation failed');
      return;
    }

    // Check payment authorization
    if (!canGenerate()) {
      console.warn('[GenerationFormEnhanced] User cannot generate - no payment method available');
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
      // Get selected areas with their custom prompts
      const selectedAreas = yardAreas.filter(a => a.selected);

      console.log('[GenerationFormEnhanced] ✓ Form validation passed');
      console.log('[GenerationFormEnhanced] ✓ Payment authorization verified');
      console.log('[GenerationFormEnhanced] → Submitting form:', {
        address: address.trim(),
        areas: selectedAreas.map(a => a.area),
        style: selectedStyle,
        preservationStrength,
        customPrompt: customPrompt.trim() ? customPrompt.trim().substring(0, 50) + '...' : '(none)',
      });

      // Call multi-area generation API (v2 enhancement: includes preservation_strength)
      console.log('[GenerationFormEnhanced] → Calling generationsAPI.create()...');
      const response = await generationsAPI.create({
        address: address.trim(),
        areas: selectedAreas.map(a => a.area),
        style: selectedStyle,
        custom_prompt: customPrompt.trim() || undefined,
        preservation_strength: preservationStrength, // v2 enhancement
      });

      console.log('[GenerationFormEnhanced] ✓ API response received');
      console.log('[GenerationFormEnhanced] → Response details:', {
        generationId: response.id,
        status: response.status,
        paymentMethod: response.payment_method,
        totalCost: response.total_cost,
        areasCount: response.areas.length,
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

      console.log('[GenerationFormEnhanced] ✓ Stored generation in Zustand');

      // Update user balance if trial was used
      if (response.payment_method === 'trial' && user) {
        console.log('[GenerationFormEnhanced] → Deducting trial credits:', {
          before: user.trial_remaining,
          after: user.trial_remaining - response.total_cost,
          cost: response.total_cost,
        });
        setUser({
          ...user,
          trial_remaining: user.trial_remaining - response.total_cost,
          trial_used: user.trial_used + response.total_cost,
        });
        console.log('[GenerationFormEnhanced] ✓ Trial credits deducted');
      }

      // Call callback if provided (inline progress), otherwise navigate to progress page
      if (onGenerationStart) {
        console.log('[GenerationFormEnhanced] ✓ Calling onGenerationStart callback (inline progress mode)');
        onGenerationStart(response.id);
      } else {
        console.log('[GenerationFormEnhanced] → Navigating to progress page (fallback mode)');
        router.push(`/generate/progress/${response.id}`);
      }
    } catch (err) {
      const errorMessage = getErrorMessage(err);
      console.error('[GenerationFormEnhanced] ✗ Form submission error:', {
        message: errorMessage,
        error: err instanceof Error ? err.message : String(err),
        errorType: err instanceof Error ? err.constructor.name : typeof err,
      });

      if (err instanceof Error) {
        console.error('[GenerationFormEnhanced] Error stack:', err.stack);
      }

      setErrors({ submit: errorMessage });

      // Show trial exhausted modal if payment error
      if (
        errorMessage.toLowerCase().includes('insufficient') ||
        errorMessage.toLowerCase().includes('no payment')
      ) {
        console.warn('[GenerationFormEnhanced] Payment error detected - showing trial exhausted modal');
        if (onShowTrialExhausted) {
          onShowTrialExhausted();
        }
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // Form fields should only be disabled during submission
  const isFormDisabled = isSubmitting;

  // Submit button should be disabled if form is submitting, payment is loading, or can't generate
  const isSubmitDisabled = isSubmitting || isLoadingPayment || !canGenerate();

  const selectedAreas = yardAreas.filter(a => a.selected);

  return (
    <form onSubmit={handleSubmit} className={`space-y-16 ${className}`}>
      {/* Submit error message */}
      {errors.submit && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
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
        </motion.div>
      )}

      {/* Payment status indicator */}
      {paymentStatus && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
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
        </motion.div>
      )}

      {/* Section 1: Address Input */}
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.1 }}
        className="max-w-2xl mx-auto"
      >
        <div className="text-center mb-8">
          <h3 className="text-2xl font-bold text-gray-900 mb-2">Property Address</h3>
          <p className="text-gray-600">Start by entering your property address</p>
        </div>
        <AddressInput
          value={address}
          onChange={(value, newPlaceId) => {
            console.log('[GenerationFormEnhanced] Address change:', { value, newPlaceId, currentPlaceId: placeId });
            // Store is single source of truth
            // Use newPlaceId if provided (autocomplete), otherwise keep existing placeId
            setStoreAddress(value, newPlaceId || placeId);
            if (errors.address) {
              setErrors((prev) => ({ ...prev, address: undefined }));
            }
          }}
          disabled={isFormDisabled}
          error={errors.address}
        />
      </motion.div>

      {/* Section 2: Area Selection */}
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.2 }}
      >
        <AreaSelectorEnhanced
          areas={yardAreas}
          onToggle={handleAreaToggle}
          onPromptChange={handleAreaPromptChange}
          mode="multi"
          disabled={isFormDisabled}
          error={errors.area}
        />
      </motion.div>

      {/* Section 3: Style Selection (v2 enhancement: passes first selected area for suggested prompts) */}
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.3 }}
      >
        <StyleSelectorEnhanced
          value={selectedStyle}
          onChange={(value) => {
            setSelectedStyle(value);
            if (errors.style) {
              setErrors((prev) => ({ ...prev, style: undefined }));
            }
          }}
          customPrompt={customPrompt}
          onCustomPromptChange={setCustomPrompt}
          selectedArea={selectedAreas.length > 0 ? selectedAreas[0].area : undefined}
          disabled={isFormDisabled}
          error={errors.style}
        />
      </motion.div>

      {/* Section 4: Transformation Intensity (v2 enhancement) */}
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.4 }}
        className="max-w-2xl mx-auto"
      >
        <div className="text-center mb-8">
          <h3 className="text-2xl font-bold text-gray-900 mb-2">Transformation Intensity</h3>
          <p className="text-gray-600">
            Control how dramatically we transform your landscape
          </p>
        </div>
        <PreservationStrengthSlider
          value={preservationStrength}
          onChange={setPreservationStrength}
          disabled={isFormDisabled}
        />
      </motion.div>

      {/* Submit Button */}
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.5 }}
        className="text-center mt-16 mb-16"
      >
        <div className="max-w-md mx-auto">
          <button
            type="submit"
            disabled={isSubmitDisabled}
            data-testid="generate-button"
            className={`
              w-full py-6 px-8 rounded-2xl text-lg font-semibold transition-all duration-300
              ${isSubmitDisabled
                ? 'bg-gray-200 text-gray-500 cursor-not-allowed'
                : 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-xl hover:shadow-2xl hover:from-blue-700 hover:to-indigo-700 transform hover:scale-105 hover:-translate-y-1'
              }
            `}
          >
            {isSubmitting ? (
              <div className="flex items-center justify-center space-x-3">
                <div className="animate-spin w-6 h-6 border-3 border-gray-400 border-t-transparent rounded-full"></div>
                <span>Creating Your Design...</span>
              </div>
            ) : (
              <div className="flex items-center justify-center space-x-3">
                <Sparkles className="w-6 h-6" />
                <span>Generate Landscape Design</span>
              </div>
            )}
          </button>

          {/* Helpful text below button */}
          <p className="text-sm text-gray-500 mt-4">
            {!address.trim()
              ? 'Please enter an address to continue'
              : selectedAreas.length === 0
                ? 'Please select at least one area'
                : !selectedStyle
                  ? 'Please select a design style'
                  : !canGenerate()
                    ? 'Purchase tokens or subscribe to generate'
                    : 'Ready to transform your landscape!'}
          </p>
        </div>
      </motion.div>
    </form>
  );
};

export default GenerationFormEnhanced;
