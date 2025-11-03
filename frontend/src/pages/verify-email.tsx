/**
 * Email Verification Page
 *
 * Handles email verification with token from URL query parameter.
 *
 * Requirements:
 * - FR-007: Email verification within 30 seconds
 * - FR-008: Verification link valid for 24 hours
 * - FR-009: Set email_verified=true
 */

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Link from 'next/link';
import { authAPI, getErrorMessage } from '@/lib/api';

export default function VerifyEmailPage() {
  const router = useRouter();
  const { token } = router.query;

  const [status, setStatus] = useState<'verifying' | 'success' | 'error'>('verifying');
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [email, setEmail] = useState<string>('');

  useEffect(() => {
    if (token && typeof token === 'string') {
      verifyEmail(token);
    }
  }, [token]);

  const verifyEmail = async (verificationToken: string) => {
    try {
      const response = await authAPI.verifyEmail({ token: verificationToken });
      setEmail(response.email);
      setStatus('success');

      // Redirect to login after 3 seconds
      setTimeout(() => {
        router.push('/login');
      }, 3000);
    } catch (error) {
      const message = getErrorMessage(error);
      setErrorMessage(message);
      setStatus('error');
    }
  };

  const handleResendVerification = async () => {
    if (!email) {
      setErrorMessage('Email address not found');
      return;
    }

    try {
      await authAPI.resendVerification(email);
      setErrorMessage('');
      alert('Verification email sent! Please check your inbox.');
    } catch (error) {
      const message = getErrorMessage(error);
      setErrorMessage(message);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-green-50 flex items-center justify-center p-4">
      <Head>
        <title>Verify Email - Yarda</title>
      </Head>

      <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-8 text-center">
        {/* Verifying State */}
        {status === 'verifying' && (
          <>
            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4 animate-pulse">
              <svg
                className="w-8 h-8 text-blue-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              Verifying your email...
            </h1>
            <p className="text-gray-600">Please wait a moment</p>
          </>
        )}

        {/* Success State */}
        {status === 'success' && (
          <>
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg
                className="w-8 h-8 text-green-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 13l4 4L19 7"
                />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              Email verified successfully!
            </h1>
            <p className="text-gray-600 mb-4">
              Your email <span className="font-semibold">{email}</span> has been verified.
            </p>
            <p className="text-sm text-gray-500">
              Redirecting to login page...
            </p>
          </>
        )}

        {/* Error State */}
        {status === 'error' && (
          <>
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg
                className="w-8 h-8 text-red-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              Verification failed
            </h1>
            <div
              data-testid="error-message"
              className="text-gray-600 mb-6 p-3 bg-red-50 rounded border border-red-200"
            >
              {errorMessage}
            </div>

            {errorMessage.includes('expired') && (
              <button
                onClick={handleResendVerification}
                className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition mb-4"
              >
                Resend Verification
              </button>
            )}

            <Link
              href="/login"
              className="inline-block text-sm text-gray-600 hover:text-gray-800 underline"
            >
              Go to login
            </Link>
          </>
        )}
      </div>
    </div>
  );
}
