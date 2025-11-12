/**
 * Magic Link Form Component
 *
 * Allows users to request a magic link authentication email.
 * Implements passwordless authentication via email.
 *
 * Features:
 * - Email validation
 * - Loading states
 * - Success/error messaging
 * - Rate limit handling
 */

'use client';

import { useState, FormEvent } from 'react';
import { sendMagicLink } from '@/lib/supabase';
import { validateEmail, getEmailError } from '@/lib/validators';
import { useToast } from '@/hooks/useToast';

interface MagicLinkFormProps {
  redirectTo?: string;
}

export function MagicLinkForm({ redirectTo }: MagicLinkFormProps) {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const toast = useToast();

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    // Validate email format
    if (!validateEmail(email)) {
      const errorMessage = getEmailError(email);
      toast.error(errorMessage);
      return;
    }

    setLoading(true);

    try {
      await sendMagicLink(email, redirectTo);

      // Success - show success message
      setSent(true);
      toast.success('Check your email for a magic link!', 5000);
    } catch (err: any) {
      console.error('Magic link error:', err);

      // Handle specific error codes
      if (err.message?.includes('rate limit')) {
        toast.error(
          'Too many requests. Please wait a few minutes and try again, or use password login.',
          6000
        );
      } else if (err.message?.includes('disabled')) {
        toast.error('Magic link authentication is currently disabled. Please use password login.', 6000);
      } else {
        toast.error('Unable to send magic link. Please try password login or try again later.', 6000);
      }
    } finally {
      setLoading(false);
    }
  };

  if (sent) {
    return (
      <div className="bg-green-50 border border-green-200 rounded-lg p-4" data-testid="success-message">
        <p className="text-green-800 font-medium mb-2">✅ Check your email for a magic link!</p>
        <p className="text-sm text-green-700 mb-3">
          We sent you an email with a link to sign in. The link expires in 1 hour.
        </p>
        <button
          onClick={() => setSent(false)}
          className="text-green-600 underline text-sm hover:text-green-700"
        >
          Send another link
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label htmlFor="magic-link-email" className="block text-sm font-medium text-gray-700 mb-1">
          Email Address
        </label>
        <input
          id="magic-link-email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Enter your email"
          required
          autoComplete="email"
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
          disabled={loading}
        />
      </div>

      <button
        type="submit"
        disabled={loading || !email}
        className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg font-semibold hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition shadow-md hover:shadow-lg"
      >
        {loading ? (
          <span className="flex items-center justify-center">
            <svg
              className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
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
              ></circle>
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              ></path>
            </svg>
            Sending...
          </span>
        ) : (
          'Send Magic Link'
        )}
      </button>

      <p className="text-xs text-gray-500 text-center">
        You'll receive an email with a link to sign in. Check your spam folder if you don't see it.
      </p>
    </form>
  );
}
