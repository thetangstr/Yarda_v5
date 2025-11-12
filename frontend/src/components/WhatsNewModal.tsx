'use client';

/**
 * What's New Modal Component
 *
 * Announces new features (like Holiday Decorator) to existing users.
 * Shows once per user, dismissed via API call that updates database.
 *
 * Feature: 007-holiday-decorator
 * Displays when:
 * - User is authenticated
 * - Holiday season is active
 * - whats_new_modal_shown = false
 */

import React, { useState } from 'react';
import { useRouter } from 'next/router';
import { motion, AnimatePresence } from 'framer-motion';

interface WhatsNewModalProps {
  /** Callback when modal is dismissed */
  onDismiss: () => void;
  /** Show/hide modal */
  isOpen: boolean;
}

export default function WhatsNewModal({ onDismiss, isOpen }: WhatsNewModalProps) {
  const router = useRouter();
  const [isClosing, setIsClosing] = useState(false);

  const handleTryNow = () => {
    setIsClosing(true);
    onDismiss();
    router.push('/holiday');
  };

  const handleDismiss = () => {
    setIsClosing(true);
    onDismiss();
  };

  return (
    <AnimatePresence>
      {isOpen && !isClosing && (
        <>
          {/* Backdrop */}
          <motion.div
            key="modal-backdrop"
            className="fixed inset-0 bg-black bg-opacity-50 z-40"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleDismiss}
          />

          {/* Modal */}
          <motion.div
            key="modal-content"
            className="fixed inset-0 flex items-center justify-center z-50 p-4"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.2 }}
          >
            <div
              className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-8 relative"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Close button */}
              <button
                onClick={handleDismiss}
                className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors"
                aria-label="Close modal"
              >
                <svg
                  className="w-6 h-6"
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
              </button>

              {/* Content */}
              <div className="text-center space-y-6">
                {/* Icon */}
                <div className="flex justify-center">
                  <div className="w-20 h-20 bg-gradient-to-br from-red-500 to-green-500 rounded-full flex items-center justify-center text-4xl">
                    🎄
                  </div>
                </div>

                {/* Heading */}
                <div>
                  <h2 className="text-3xl font-bold text-gray-900 mb-2">
                    What's New? 🎁
                  </h2>
                  <p className="text-lg text-gray-600">
                    Holiday Decorator is here!
                  </p>
                </div>

                {/* Description */}
                <div className="space-y-4 text-left">
                  <p className="text-gray-700">
                    Transform your home with AI-powered holiday decorations! See your house dressed in festive lights, wreaths, and seasonal cheer.
                  </p>

                  <div className="bg-green-50 border-2 border-green-200 rounded-lg p-4">
                    <div className="flex items-start gap-3">
                      <span className="text-2xl">🎁</span>
                      <div>
                        <p className="font-semibold text-green-900 mb-1">
                          Earn Free Credits
                        </p>
                        <p className="text-sm text-green-700">
                          Share your decorated home on social media to earn credits. Each share gives you 1 credit (max 3/day)!
                        </p>
                      </div>
                    </div>
                  </div>

                  <ul className="space-y-2 text-gray-700">
                    <li className="flex items-start gap-2">
                      <span className="text-green-500 mt-1">✓</span>
                      <span>Choose from Classic, Modern, or Over-the-Top styles</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-green-500 mt-1">✓</span>
                      <span>See before & after comparisons</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-green-500 mt-1">✓</span>
                      <span>Share with friends and family</span>
                    </li>
                  </ul>
                </div>

                {/* CTA Buttons */}
                <div className="flex flex-col sm:flex-row gap-3 pt-4">
                  <button
                    onClick={handleTryNow}
                    className="flex-1 bg-gradient-to-r from-red-500 to-green-500 text-white px-6 py-3 rounded-lg font-semibold hover:from-red-600 hover:to-green-600 transition-all shadow-lg hover:shadow-xl transform hover:scale-105"
                  >
                    Try It Now 🎄
                  </button>
                  <button
                    onClick={handleDismiss}
                    className="flex-1 bg-gray-100 text-gray-700 px-6 py-3 rounded-lg font-semibold hover:bg-gray-200 transition-colors"
                  >
                    Maybe Later
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
