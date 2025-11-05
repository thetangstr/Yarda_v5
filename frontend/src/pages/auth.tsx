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
import GoogleSignInButton from '@/components/GoogleSignInButton';
import { authAPI, getErrorMessage } from '@/lib/api';
import { useUserStore } from '@/store/userStore';

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

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      let response;

      if (activeTab === 'signup') {
        response = await authAPI.register({
          email: formData.email,
          password: formData.password,
        });
      } else {
        response = await authAPI.login({
          email: formData.email,
          password: formData.password,
        });
      }

      // Save access token and user data
      setAccessToken(response.access_token);
      setUser(response.user as any);

      // Save to localStorage
      const userStorage = localStorage.getItem('user-storage');
      if (userStorage) {
        const storage = JSON.parse(userStorage);
        storage.state.accessToken = response.access_token;
        localStorage.setItem('user-storage', JSON.stringify(storage));
      }
      localStorage.setItem('access_token', response.access_token);

      // Check if there's a pending address
      const pendingAddress = sessionStorage.getItem('pending_address');
      if (pendingAddress) {
        sessionStorage.removeItem('pending_address');
      }

      // Redirect
      const redirect = (router.query.redirect as string) || '/generate';
      router.push(redirect);
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
          <div className="flex gap-2 mb-6 bg-gray-100 p-1 rounded-lg">
            <button
              onClick={() => setActiveTab('signup')}
              className={`flex-1 py-2 px-4 rounded-md font-semibold text-sm transition-all ${
                activeTab === 'signup'
                  ? 'bg-white text-brand-green shadow'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Sign Up
            </button>
            <button
              onClick={() => setActiveTab('login')}
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
          <div className="space-y-3 mb-6">
            <GoogleSignInButton />

            {/* Apple Sign In - Placeholder */}
            <button
              type="button"
              disabled
              className="w-full flex items-center justify-center gap-3 px-4 py-3 rounded-lg bg-black text-white font-medium opacity-50 cursor-not-allowed"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09l.01-.01zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"/>
              </svg>
              Sign {activeTab === 'signup' ? 'up' : 'in'} with Apple
            </button>
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
          <form onSubmit={handleSubmit} className="space-y-4">
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
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1.5">
                Password
              </label>
              <div className="relative">
                <input
                  type="password"
                  id="password"
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-brand-green focus:border-transparent text-base"
                  placeholder="Create a password"
                />
                <button
                  type="button"
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  aria-label="Toggle password visibility"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                </button>
              </div>
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
