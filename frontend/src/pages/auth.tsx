/**
 * Auth Page - Simplified Sign Up/Login
 *
 * Mobile-first authentication page matching the new UI design.
 * Combines sign up and login in one clean interface.
 */

import React, { useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import dynamic from 'next/dynamic';
import { authAPI, getErrorMessage } from '@/lib/api';
import { useUserStore } from '@/store/userStore';

const GoogleSignInButton = dynamic(() => import('@/components/GoogleSignInButton'), {
  ssr: false,
  loading: () => (
    <button
      type="button"
      disabled
      className="w-full flex items-center justify-center gap-3 px-4 py-3 rounded-lg bg-white border-2 border-gray-300 opacity-50 cursor-wait font-medium text-gray-700"
    >
      <span>Loading...</span>
    </button>
  ),
});

type PasswordStrength = 'weak' | 'medium' | 'strong' | null;

export default function AuthPage() {
  const router = useRouter();
  const { setUser, setAccessToken } = useUserStore();
  const [activeTab, setActiveTab] = useState<'signup' | 'login'>('signup');
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [passwordStrength, setPasswordStrength] = useState<PasswordStrength>(null);
  const [validationErrors, setValidationErrors] = useState<{
    email?: string;
    password?: string;
  }>({});

  const checkPasswordStrength = (pwd: string): PasswordStrength => {
    if (pwd.length < 6) return 'weak';
    if (pwd.length < 10 || !/[A-Z]/.test(pwd) || !/[0-9]/.test(pwd)) return 'medium';
    return 'strong';
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    setError(null);
    setValidationErrors({});

    // Update password strength indicator for signup
    if (name === 'password' && activeTab === 'signup') {
      setPasswordStrength(checkPasswordStrength(value));
    }
  };

  const validateForm = (): boolean => {
    const errors: typeof validationErrors = {};

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!formData.email) {
      errors.email = 'Email is required';
    } else if (!emailRegex.test(formData.email)) {
      errors.email = 'Please enter a valid email address';
    }

    // Password validation
    if (!formData.password) {
      errors.password = 'Password is required';
    } else if (activeTab === 'signup' && formData.password.length < 6) {
      errors.password = 'Password must be at least 6 characters';
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setValidationErrors({});

    // Validate form before submission
    if (!validateForm()) {
      return;
    }

    setIsLoading(true);

    try {
      if (activeTab === 'signup') {
        // Register only creates the user, then redirect to login
        await authAPI.register({
          email: formData.email,
          password: formData.password,
        });
        // Switch to login tab after successful registration
        setActiveTab('login');
        setError(null);
        setPasswordStrength(null);
        setFormData({ email: formData.email, password: '' }); // Clear password but keep email
        setIsLoading(false);
        return;
      } else {
        // Login returns access_token and user
        const response = await authAPI.login({
          email: formData.email,
          password: formData.password,
        });

        // Save access token and user data using Zustand (it handles localStorage automatically)
        setAccessToken(response.access_token);
        setUser(response.user as any); // API response type differs from store type

        // Check if there's a pending address
        try {
          const pendingAddress = sessionStorage.getItem('pending_address');
          if (pendingAddress) {
            sessionStorage.removeItem('pending_address');
          }
        } catch (storageError) {
          console.warn('SessionStorage unavailable:', storageError);
        }

        // Redirect
        const redirect = (router.query.redirect as string) || '/generate';
        router.push(redirect);
      }
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-brand-sage to-brand-cream flex items-center justify-center p-4">
      <Head>
        <title>{activeTab === 'signup' ? 'Sign Up' : 'Log In'} - Yarda AI Landscape Studio</title>
        <meta name="description" content="Create an account to save your design and unlock more possibilities" />
      </Head>

      <div className="w-full max-w-md">
        {/* Logo Header */}
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2 mb-6">
            <svg
              className="h-10 w-10 text-brand-green"
              viewBox="0 0 40 40"
              fill="currentColor"
            >
              <path d="M20 5L5 15v10l15 10 15-10V15L20 5zm0 3.5L31 18v7l-11 7.5L9 25v-7l11-9.5z" />
              <circle cx="20" cy="20" r="4" />
            </svg>
            <span className="text-2xl font-bold text-brand-dark-green">Yarda</span>
          </Link>

          <div className="w-64 mx-auto aspect-video bg-gradient-to-br from-brand-green to-brand-dark-green rounded-xl mb-6 flex items-center justify-center shadow-lg">
            <div className="text-center text-white">
              <svg className="w-16 h-16 mx-auto mb-2 opacity-90" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
              </svg>
              <p className="text-sm font-semibold">Yarda AI Landscape Studio</p>
            </div>
          </div>

          <p className="text-sm text-neutral-700">
            Create an account to save your design and unlock more possibilities.
          </p>
        </div>

        {/* Auth Card */}
        <div className="bg-white rounded-2xl shadow-xl p-6 md:p-8">
          {/* Tabs */}
          <div className="flex gap-2 mb-6 bg-gray-100 p-1 rounded-lg" role="tablist" aria-label="Authentication options">
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'signup'}
              aria-controls="auth-form-content"
              onClick={() => {
                setActiveTab('signup');
                setError(null);
                setValidationErrors({});
                setPasswordStrength(null);
              }}
              className={`flex-1 py-2 px-4 rounded-md font-semibold text-sm transition-all ${
                activeTab === 'signup'
                  ? 'bg-white text-brand-green shadow'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Sign Up
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'login'}
              aria-controls="auth-form-content"
              onClick={() => {
                setActiveTab('login');
                setError(null);
                setValidationErrors({});
                setPasswordStrength(null);
              }}
              className={`flex-1 py-2 px-4 rounded-md font-semibold text-sm transition-all ${
                activeTab === 'login'
                  ? 'bg-white text-brand-green shadow'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Log In
            </button>
          </div>

          {/* Social Sign In */}
          <div className="mb-6">
            <GoogleSignInButton />
          </div>

          {/* Divider */}
          <div className="relative mb-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-200"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-white text-gray-500">or</span>
            </div>
          </div>

          {/* Email/Password Form */}
          <form
            id="auth-form-content"
            role="tabpanel"
            aria-label={activeTab === 'signup' ? 'Sign up form' : 'Log in form'}
            onSubmit={handleSubmit}
            className="space-y-4"
          >
            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                {error}
              </div>
            )}

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1.5">
                Email Address
              </label>
              <input
                type="email"
                id="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                required
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-brand-green focus:border-transparent text-base"
                placeholder="Enter your email"
                aria-invalid={validationErrors.email ? 'true' : 'false'}
                aria-describedby={validationErrors.email ? 'email-error' : undefined}
                autoComplete="email"
              />
              {/* Validation Error */}
              {validationErrors.email && (
                <p id="email-error" role="alert" className="text-xs text-red-600 mt-1">
                  {validationErrors.email}
                </p>
              )}
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1.5">
                Password {activeTab === 'signup' && '(min. 6 characters)'}
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  id="password"
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  required
                  minLength={activeTab === 'signup' ? 6 : undefined}
                  className="w-full px-4 py-3 pr-12 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-brand-green focus:border-transparent text-base"
                  placeholder={activeTab === 'signup' ? 'Create a secure password' : 'Enter your password'}
                  aria-invalid={validationErrors.password ? 'true' : 'false'}
                  aria-describedby={validationErrors.password ? 'password-error' : activeTab === 'signup' && passwordStrength ? 'password-strength' : undefined}
                  autoComplete={activeTab === 'signup' ? 'new-password' : 'current-password'}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 focus:outline-none focus:ring-2 focus:ring-brand-green rounded"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                    </svg>
                  ) : (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  )}
                </button>
              </div>

              {/* Password Strength Indicator (Signup only) */}
              {activeTab === 'signup' && formData.password && passwordStrength && (
                <div id="password-strength" className="mt-2">
                  <div className="flex gap-1">
                    <div className={`h-1 flex-1 rounded transition-colors ${
                      passwordStrength === 'weak' ? 'bg-red-500' :
                      passwordStrength === 'medium' ? 'bg-yellow-500' :
                      'bg-green-500'
                    }`} />
                    <div className={`h-1 flex-1 rounded transition-colors ${
                      passwordStrength === 'medium' || passwordStrength === 'strong' ?
                        passwordStrength === 'medium' ? 'bg-yellow-500' : 'bg-green-500'
                        : 'bg-gray-200'
                    }`} />
                    <div className={`h-1 flex-1 rounded transition-colors ${
                      passwordStrength === 'strong' ? 'bg-green-500' : 'bg-gray-200'
                    }`} />
                  </div>
                  <p className="text-xs text-gray-600 mt-1">
                    {passwordStrength === 'weak' && 'Password is too weak'}
                    {passwordStrength === 'medium' && 'Password strength: Medium'}
                    {passwordStrength === 'strong' && 'Strong password!'}
                  </p>
                </div>
              )}

              {/* Validation Error */}
              {validationErrors.password && (
                <p id="password-error" role="alert" className="text-xs text-red-600 mt-1">
                  {validationErrors.password}
                </p>
              )}
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-amber-600 hover:bg-amber-700 text-white font-semibold py-3 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-md hover:shadow-lg text-base"
            >
              {isLoading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  {activeTab === 'signup' ? 'Creating Account...' : 'Signing In...'}
                </span>
              ) : (
                activeTab === 'signup' ? 'Create Account' : 'Sign In'
              )}
            </button>
          </form>

          {/* Terms */}
          {activeTab === 'signup' && (
            <p className="mt-4 text-xs text-center text-gray-500">
              By continuing, you agree to Yarda's{' '}
              <Link href="/terms" className="text-brand-green hover:underline">
                Terms of Service
              </Link>{' '}
              and{' '}
              <Link href="/privacy" className="text-brand-green hover:underline">
                Privacy Policy
              </Link>
              .
            </p>
          )}
        </div>

        {/* Back to Home */}
        <div className="text-center mt-6">
          <Link href="/" className="text-sm text-neutral-600 hover:text-brand-green">
            ← Back to Home
          </Link>
        </div>
      </div>
    </div>
  );
}
