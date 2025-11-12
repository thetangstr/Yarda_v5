/**
 * Authentication Options Component
 *
 * Provides all authentication methods in a single component:
 * - Magic Link (primary)
 * - Google OAuth
 * - Email/Password (toggle option)
 *
 * Used for sign-in modals and auth gates throughout the app.
 */

import React, { useState } from 'react';
import { useRouter } from 'next/router';
import GoogleSignInButton from '@/components/GoogleSignInButton';
import { MagicLinkForm } from '@/components/auth/MagicLinkForm';
import { authAPI, getErrorMessage } from '@/lib/api';
import { useUserStore } from '@/store/userStore';

interface AuthOptionsProps {
  redirectTo?: string;
  title?: string;
  subtitle?: string;
}

export function AuthOptions({
  redirectTo = '/generate',
  title = 'Sign in to Get Started',
  subtitle = 'Choose your preferred sign-in method'
}: AuthOptionsProps) {
  const router = useRouter();
  const { setUser, setAccessToken } = useUserStore();
  const [showPasswordLogin, setShowPasswordLogin] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });
  const [errors, setErrors] = useState<{
    email?: string;
    password?: string;
    general?: string;
  }>({});

  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    setErrors((prev) => ({ ...prev, [name]: undefined, general: undefined }));
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    if (!validateEmail(formData.email)) {
      setErrors((prev) => ({
        ...prev,
        email: 'Please enter a valid email address',
      }));
      return;
    }

    if (!formData.password) {
      setErrors((prev) => ({
        ...prev,
        password: 'Password is required',
      }));
      return;
    }

    setIsLoading(true);

    try {
      const response = await authAPI.login({
        email: formData.email,
        password: formData.password,
      });

      setAccessToken(response.access_token);
      setUser(response.user as any);

      const userStorage = localStorage.getItem('user-storage');
      if (userStorage) {
        const storage = JSON.parse(userStorage);
        storage.state.accessToken = response.access_token;
        localStorage.setItem('user-storage', JSON.stringify(storage));
      }

      localStorage.setItem('access_token', response.access_token);
      router.push(redirectTo);
    } catch (error) {
      const errorMessage = getErrorMessage(error);
      setErrors({ general: errorMessage });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">{title}</h2>
        <p className="text-gray-600">{subtitle}</p>
      </div>

      {/* Magic Link Form */}
      <MagicLinkForm redirectTo={redirectTo} />

      {/* Divider */}
      <div className="relative my-6">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-gray-300" />
        </div>
        <div className="relative flex justify-center text-sm">
          <span className="px-4 bg-white text-gray-500">Or continue with</span>
        </div>
      </div>

      {/* Google Sign In */}
      <GoogleSignInButton redirectTo={redirectTo} />

      {/* Password Login Toggle */}
      {!showPasswordLogin && (
        <div className="text-center">
          <button
            type="button"
            onClick={() => setShowPasswordLogin(true)}
            className="text-sm text-gray-600 hover:text-gray-900 underline"
          >
            Sign in with password instead
          </button>
        </div>
      )}

      {/* Password Login Form */}
      {showPasswordLogin && (
        <form onSubmit={handlePasswordSubmit} className="space-y-4 pt-4 border-t">
          {errors.general && (
            <div className="p-3 bg-red-50 border border-red-200 rounded text-sm text-red-700">
              {errors.general}
            </div>
          )}

          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
              Email
            </label>
            <input
              type="email"
              id="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              required
              autoComplete="email"
              className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                errors.email ? 'border-red-500' : 'border-gray-300'
              }`}
              placeholder="you@example.com"
            />
            {errors.email && (
              <p className="mt-1 text-sm text-red-600">{errors.email}</p>
            )}
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
              Password
            </label>
            <input
              type="password"
              id="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              required
              autoComplete="current-password"
              className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                errors.password ? 'border-red-500' : 'border-gray-300'
              }`}
              placeholder="••••••••"
            />
            {errors.password && (
              <p className="mt-1 text-sm text-red-600">{errors.password}</p>
            )}
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-2 px-4 bg-gradient-to-r from-green-500 to-green-600 text-white font-semibold rounded-lg hover:from-green-600 hover:to-green-700 transition-all disabled:opacity-50"
          >
            {isLoading ? 'Signing in...' : 'Sign In with Password'}
          </button>

          <button
            type="button"
            onClick={() => setShowPasswordLogin(false)}
            className="w-full text-sm text-gray-600 hover:text-gray-900"
          >
            Back to other options
          </button>
        </form>
      )}
    </div>
  );
}