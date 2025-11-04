/**
 * Generate Page
 *
 * Main landscape generation page with authorization checks.
 *
 * Requirements:
 * - FR-028: Landscape generation form
 * - FR-047, FR-048: Authorization hierarchy check
 * - TC-AUTH-1.3: Block generation when trial_remaining=0
 * - TC-UI-1.2: Show TrialExhaustedModal when blocked
 */

import React, { useState, useEffect, useCallback } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { useUserStore } from '@/store/userStore';
import { generationAPI, getErrorMessage } from '@/lib/api';
import TrialExhaustedModal from '@/components/TrialExhaustedModal';
import TrialCounter from '@/components/TrialCounter';
import TokenBalance from '@/components/TokenBalance';
import TokenPurchaseModal from '@/components/TokenPurchaseModal';

const AREA_OPTIONS = [
  { value: 'front_yard', label: 'Front Yard' },
  { value: 'back_yard', label: 'Back Yard' },
  { value: 'side_yard', label: 'Side Yard' },
  { value: 'full_property', label: 'Full Property' },
];

const STYLE_OPTIONS = [
  { value: 'modern_minimalist', label: 'Modern Minimalist' },
  { value: 'tropical_paradise', label: 'Tropical Paradise' },
  { value: 'zen_garden', label: 'Zen Garden' },
  { value: 'cottage_garden', label: 'Cottage Garden' },
  { value: 'desert_landscape', label: 'Desert Landscape' },
  { value: 'formal_garden', label: 'Formal Garden' },
];

export default function GeneratePage() {
  const router = useRouter();
  const { user, isAuthenticated, updateTrialRemaining } = useUserStore();

  const [formData, setFormData] = useState({
    address: '',
    area: 'front_yard',
    style: 'modern_minimalist',
    custom_prompt: '',
    image: null as File | null,
  });

  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showTrialExhaustedModal, setShowTrialExhaustedModal] = useState(false);
  const [showTokenPurchaseModal, setShowTokenPurchaseModal] = useState(false);
  const [generationStatus, setGenerationStatus] = useState<string | null>(null);
  const [tokenBalance, setTokenBalance] = useState<number | null>(null);

  // Redirect if not authenticated
  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/login');
    }
  }, [isAuthenticated, router]);

  // Fetch token balance
  const fetchTokenBalance = useCallback(async () => {
    if (!isAuthenticated) return;

    try {
      // Get token from Zustand persisted state
      const userStorage = localStorage.getItem('user-storage');
      if (!userStorage) return;

      const { state } = JSON.parse(userStorage);
      if (!state?.accessToken) return;

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/tokens/balance`,
        {
          headers: {
            Authorization: `Bearer ${state.accessToken}`,
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        setTokenBalance(data.balance);
      }
    } catch (err) {
      console.error('Error fetching token balance:', err);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    fetchTokenBalance();
  }, [fetchTokenBalance]);

  const canGenerate = (): boolean => {
    if (!user) return false;

    // Check authorization hierarchy
    // 1. Active subscription → unlimited
    if (user.subscription_status === 'active') {
      return true;
    }

    // 2. Trial credits available
    if (user.trial_remaining > 0) {
      return true;
    }

    // 3. Token balance > 0
    if (tokenBalance !== null && tokenBalance > 0) {
      return true;
    }

    return false;
  };

  const getDisabledReason = (): string | null => {
    if (!user) return 'You must be logged in';

    if (user.subscription_status === 'active') {
      return null; // Can generate
    }

    if (user.trial_remaining > 0) {
      return null; // Can generate
    }

    if (tokenBalance !== null && tokenBalance > 0) {
      return null; // Can generate
    }

    return 'You have no credits available. Purchase tokens to continue.';
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        setError('Please upload an image file');
        return;
      }

      // Validate file size (max 10MB)
      if (file.size > 10 * 1024 * 1024) {
        setError('Image must be less than 10MB');
        return;
      }

      setFormData((prev) => ({ ...prev, image: file }));

      // Create preview
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);

      setError(null);
    }
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Check if user can generate
    if (!canGenerate()) {
      setShowTrialExhaustedModal(true);
      return;
    }

    // Validate form
    if (!formData.address.trim()) {
      setError('Please enter a property address');
      return;
    }

    // Image upload is now OPTIONAL - backend will fetch from Google Maps if not provided
    // (especially for front_yard which uses Street View API)

    setIsGenerating(true);
    setGenerationStatus('pending');

    try {
      const response = await generationAPI.create({
        address: formData.address,
        area: formData.area,
        style: formData.style,
        custom_prompt: formData.custom_prompt || undefined,
        image: formData.image ?? undefined, // Optional - backend fetches from Google Maps if not provided
      });

      setGenerationStatus(response.status);

      // Update trial counter if payment method was trial
      if (response.payment_method === 'trial' && user) {
        updateTrialRemaining(user.trial_remaining - 1);
      }

      // Refresh token balance if payment method was token
      if (response.payment_method === 'token') {
        fetchTokenBalance();
      }

      // Redirect to generation details page (or poll for completion)
      setTimeout(() => {
        router.push(`/generations/${response.id}`);
      }, 2000);
    } catch (err) {
      const errorMessage = getErrorMessage(err);
      setError(errorMessage);

      // Check if error is due to insufficient payment
      if (errorMessage.includes('insufficient') || errorMessage.includes('No payment method')) {
        setShowTrialExhaustedModal(true);
      }

      setGenerationStatus(null);
    } finally {
      setIsGenerating(false);
    }
  };

  if (!isAuthenticated || !user) {
    return null; // Will redirect
  }

  const disabledReason = getDisabledReason();
  const isDisabled = !canGenerate() || isGenerating;

  return (
    <div className="min-h-screen bg-gray-50">
      <Head>
        <title>Generate Landscape Design - Yarda</title>
        <meta
          name="description"
          content="Create AI-powered landscape design for your property"
        />
      </Head>

      {/* Navbar */}
      <nav className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900">Yarda</h1>
          <div className="flex items-center gap-4">
            <TokenBalance variant="compact" autoRefresh={true} />
            <div data-testid="navbar-trial-counter">
              <TrialCounter variant="compact" />
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-6 py-12">
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-gray-900 mb-2">
            Generate Landscape Design
          </h2>
          <p className="text-gray-600">
            Upload a photo of your property and let AI create stunning landscape designs
          </p>
        </div>

        {/* Trial Counter Card */}
        <div className="mb-8">
          <TrialCounter variant="full" />
        </div>

        {/* Generation Form */}
        <div className="bg-white rounded-lg shadow p-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Error Message */}
            {error && (
              <div className="p-4 bg-red-50 border border-red-200 rounded text-sm text-red-700">
                {error}
              </div>
            )}

            {/* Generation Status */}
            {generationStatus && (
              <div
                data-testid="generation-status"
                className="p-4 bg-blue-50 border border-blue-200 rounded text-sm text-blue-700"
              >
                Status: {generationStatus}
                {generationStatus === 'pending' && (
                  <p className="mt-1">Starting your generation...</p>
                )}
              </div>
            )}

            {/* Address Field */}
            <div>
              <label htmlFor="address" className="block text-sm font-medium text-gray-700 mb-2">
                Property Address
              </label>
              <input
                type="text"
                id="address"
                name="address"
                value={formData.address}
                onChange={handleChange}
                required
                disabled={isDisabled}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
                placeholder="123 Main Street, San Francisco, CA"
              />
            </div>

            {/* Image Upload */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Property Image
              </label>
              <div className="flex items-center gap-4">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageChange}
                  disabled={isDisabled}
                  className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 disabled:opacity-50 disabled:cursor-not-allowed"
                />
              </div>
              {imagePreview && (
                <div className="mt-4">
                  <img
                    src={imagePreview}
                    alt="Property preview"
                    className="w-full h-64 object-cover rounded-lg"
                  />
                </div>
              )}
            </div>

            {/* Area Selection */}
            <div>
              <label htmlFor="area" className="block text-sm font-medium text-gray-700 mb-2">
                Landscape Area
              </label>
              <select
                id="area"
                name="area"
                value={formData.area}
                onChange={handleChange}
                disabled={isDisabled}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
              >
                {AREA_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Style Selection */}
            <div>
              <label htmlFor="style" className="block text-sm font-medium text-gray-700 mb-2">
                Design Style
              </label>
              <select
                id="style"
                name="style"
                value={formData.style}
                onChange={handleChange}
                disabled={isDisabled}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
              >
                {STYLE_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Custom Prompt */}
            <div>
              <label
                htmlFor="custom_prompt"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                Custom Instructions (Optional)
              </label>
              <textarea
                id="custom_prompt"
                name="custom_prompt"
                value={formData.custom_prompt}
                onChange={handleChange}
                disabled={isDisabled}
                rows={3}
                maxLength={500}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
                placeholder="Add any specific requirements or preferences..."
              />
              <p className="mt-1 text-xs text-gray-500">
                {formData.custom_prompt.length}/500 characters
              </p>
            </div>

            {/* Disabled Reason */}
            {disabledReason && (
              <div data-testid="disabled-reason" className="p-3 bg-yellow-50 border border-yellow-200 rounded text-sm text-yellow-800">
                {disabledReason}
                {!canGenerate() && (
                  <button
                    onClick={() => setShowTokenPurchaseModal(true)}
                    className="ml-2 text-blue-600 hover:text-blue-700 underline font-medium"
                  >
                    Purchase Tokens
                  </button>
                )}
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isDisabled}
              className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isGenerating ? 'Generating Design...' : 'Generate Design'}
            </button>
          </form>
        </div>
      </div>

      {/* Trial Exhausted Modal */}
      <TrialExhaustedModal
        isOpen={showTrialExhaustedModal}
        onClose={() => setShowTrialExhaustedModal(false)}
        onPurchaseTokens={() => setShowTokenPurchaseModal(true)}
      />

      {/* Token Purchase Modal */}
      <TokenPurchaseModal
        isOpen={showTokenPurchaseModal}
        onClose={() => {
          setShowTokenPurchaseModal(false);
          fetchTokenBalance(); // Refresh balance when modal closes
        }}
      />
    </div>
  );
}
