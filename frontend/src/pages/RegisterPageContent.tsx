/**
 * Registration Page
 *
 * User registration with email/password and trial credit messaging.
 *
 * Requirements:
 * - FR-001: Email/password registration
 * - FR-002: Email format validation
 * - FR-003: Password minimum 8 characters
 * - FR-010: Initialize trial_remaining=3
 * - TC-REG-1.1: Display trial credit messaging
 */

import React from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import { useLanguage } from '@/context/LanguageContext';
import LanguageSwitcher from '@/components/LanguageSwitcher';

export default function RegisterPage() {
  const router = useRouter();
  const { t } = useLanguage();

  // MAINTENANCE MODE: Block all new registrations
  return (
    <div className="min-h-screen bg-gradient-to-br from-yellow-50 to-orange-50 flex items-center justify-center p-4">
      <Head>
        <title>Registration Temporarily Disabled - Yarda</title>
        <meta
          name="description"
          content="New user registration is temporarily disabled"
        />
      </Head>

      {/* Language Switcher - Top Right */}
      <div className="absolute top-4 right-4">
        <LanguageSwitcher />
      </div>

      <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-8">
        {/* Maintenance Icon */}
        <div className="text-center mb-6">
          <div className="w-20 h-20 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg
              className="w-10 h-10 text-orange-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
          </div>

          <h1 className="text-3xl font-bold text-gray-900 mb-3">
            {t('auth.registrationDisabled')}
          </h1>

          <p className="text-gray-700 mb-4 leading-relaxed">
            {t('auth.registrationMessage')}
          </p>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
            <p className="text-sm text-blue-800 font-medium mb-2">
              {t('auth.existingUsers')}
            </p>
            <p className="text-xs text-blue-700">
              {t('auth.existingUsersDetail')}
            </p>
          </div>

          <div className="space-y-3">
            <button
              onClick={() => router.push('/login')}
              className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition shadow-md"
            >
              {t('auth.goToLogin')}
            </button>

            <button
              onClick={() => router.push('/')}
              className="w-full py-3 px-4 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold rounded-lg transition"
            >
              {t('auth.backToHome')}
            </button>
          </div>

          <p className="text-xs text-gray-500 mt-6">
            {t('auth.comingBack')}
          </p>
        </div>
      </div>
    </div>
  );
}
