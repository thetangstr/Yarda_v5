'use client';

/**
 * Social Share Modal Component
 *
 * Displays social media sharing options for holiday decorations.
 * Allows users to share their decorated images and earn credits.
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Share2, Check, AlertCircle } from 'lucide-react';
import { holidayAPI } from '@/lib/api';
import type { ShareRequest, ShareResponse, SharePlatform } from '@/types/holiday';

interface SocialShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  generationId: string;
  imageUrl: string;
  onShareComplete?: () => void;
}

interface PlatformConfig {
  id: SharePlatform;
  name: string;
  icon: JSX.Element;
  color: string;
  hoverColor: string;
}

const platforms: PlatformConfig[] = [
  {
    id: 'x' as SharePlatform,
    name: 'X (Twitter)',
    icon: (
      <svg viewBox="0 0 24 24" className="w-6 h-6" fill="currentColor">
        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
      </svg>
    ),
    color: 'bg-black',
    hoverColor: 'hover:bg-gray-800',
  },
  {
    id: 'facebook' as SharePlatform,
    name: 'Facebook',
    icon: (
      <svg viewBox="0 0 24 24" className="w-6 h-6" fill="currentColor">
        <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
      </svg>
    ),
    color: 'bg-blue-600',
    hoverColor: 'hover:bg-blue-700',
  },
  {
    id: 'instagram' as SharePlatform,
    name: 'Instagram',
    icon: (
      <svg viewBox="0 0 24 24" className="w-6 h-6" fill="currentColor">
        <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zM5.838 12a6.162 6.162 0 1112.324 0 6.162 6.162 0 01-12.324 0zM12 16a4 4 0 110-8 4 4 0 010 8zm4.965-10.405a1.44 1.44 0 112.881.001 1.44 1.44 0 01-2.881-.001z" />
      </svg>
    ),
    color: 'bg-gradient-to-br from-purple-600 to-pink-600',
    hoverColor: 'hover:from-purple-700 hover:to-pink-700',
  },
  {
    id: 'pinterest' as SharePlatform,
    name: 'Pinterest',
    icon: (
      <svg viewBox="0 0 24 24" className="w-6 h-6" fill="currentColor">
        <path d="M12.017 0C5.396 0 .029 5.367.029 11.987c0 5.079 3.158 9.417 7.618 11.162-.105-.949-.199-2.403.041-3.439.219-.937 1.406-5.957 1.406-5.957s-.359-.72-.359-1.781c0-1.663.967-2.911 2.168-2.911 1.024 0 1.518.769 1.518 1.688 0 1.029-.653 2.567-.992 3.992-.285 1.193.6 2.165 1.775 2.165 2.128 0 3.768-2.245 3.768-5.487 0-2.861-2.063-4.869-5.008-4.869-3.41 0-5.409 2.562-5.409 5.199 0 1.033.394 2.143.889 2.741.099.12.112.225.085.345-.09.375-.293 1.199-.334 1.363-.053.225-.172.271-.401.165-1.495-.697-2.436-2.878-2.436-4.649 0-3.785 2.75-7.262 7.929-7.262 4.163 0 7.398 2.967 7.398 6.931 0 4.136-2.607 7.464-6.227 7.464-1.216 0-2.359-.631-2.75-1.378l-.748 2.853c-.271 1.043-1.002 2.35-1.492 3.146C9.57 23.812 10.763 24 12.017 24c6.623 0 11.99-5.367 11.99-11.987C24.007 5.367 18.641 0 12.017 0z" />
      </svg>
    ),
    color: 'bg-red-600',
    hoverColor: 'hover:bg-red-700',
  },
  {
    id: 'tiktok' as SharePlatform,
    name: 'TikTok',
    icon: (
      <svg viewBox="0 0 24 24" className="w-6 h-6" fill="currentColor">
        <path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z" />
      </svg>
    ),
    color: 'bg-black',
    hoverColor: 'hover:bg-gray-800',
  },
];

export default function SocialShareModal({
  isOpen,
  onClose,
  generationId,
  imageUrl,
  onShareComplete,
}: SocialShareModalProps) {
  const [selectedPlatform, setSelectedPlatform] = useState<PlatformConfig | null>(null);
  const [shareResponse, setShareResponse] = useState<ShareResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showSuccess, setShowSuccess] = useState(false);

  useEffect(() => {
    if (showSuccess) {
      const timer = setTimeout(() => {
        setShowSuccess(false);
        setShareResponse(null);
        setSelectedPlatform(null);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [showSuccess]);

  const handlePlatformSelect = async (platform: PlatformConfig) => {
    setSelectedPlatform(platform);
    setError(null);
    setIsLoading(true);

    try {
      // Create share tracking link
      const shareRequest: ShareRequest = {
        generation_id: generationId,
        platform: platform.id,
      };

      const response = await holidayAPI.createShare(shareRequest);
      setShareResponse(response);

      // Open share URL in new window
      window.open(response.share_url, '_blank', 'width=600,height=600');

      // Show success message
      setShowSuccess(true);

      // Notify parent component
      if (onShareComplete) {
        onShareComplete();
      }
    } catch (err: any) {
      console.error('Share creation failed:', err);
      setError(err.response?.data?.message || 'Failed to create share link');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black bg-opacity-50 z-50"
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="fixed inset-0 flex items-center justify-center z-50 p-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="bg-white rounded-2xl shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
              {/* Header */}
              <div className="relative p-6 border-b">
                <button
                  onClick={onClose}
                  className="absolute right-4 top-4 p-2 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
                <div className="flex items-center gap-3">
                  <Share2 className="w-6 h-6 text-green-600" />
                  <h2 className="text-2xl font-bold text-gray-900">Share Your Creation</h2>
                </div>
                <p className="mt-2 text-gray-600">
                  Share your holiday decoration and earn 1 free credit!
                  <span className="text-sm block mt-1">
                    (Max 3 credits per day from sharing)
                  </span>
                </p>
              </div>

              {/* Content */}
              <div className="p-6">
                {/* Success Message */}
                {showSuccess && shareResponse && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg"
                  >
                    <div className="flex items-start gap-3">
                      <Check className="w-5 h-5 text-green-600 mt-0.5" />
                      <div>
                        <p className="font-medium text-green-900">Share link created!</p>
                        <p className="text-sm text-green-700 mt-1">
                          {shareResponse.can_earn_credit
                            ? `You'll earn 1 credit when someone clicks your link. ${shareResponse.daily_shares_remaining} shares remaining today.`
                            : 'Daily share limit reached. Share anyway to spread the joy!'}
                        </p>
                      </div>
                    </div>
                  </motion.div>
                )}

                {/* Error Message */}
                {error && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg"
                  >
                    <div className="flex items-start gap-3">
                      <AlertCircle className="w-5 h-5 text-red-600 mt-0.5" />
                      <div>
                        <p className="font-medium text-red-900">Share failed</p>
                        <p className="text-sm text-red-700 mt-1">{error}</p>
                      </div>
                    </div>
                  </motion.div>
                )}

                {/* Preview Image */}
                <div className="mb-6">
                  <img
                    src={imageUrl}
                    alt="Holiday decoration preview"
                    className="w-full rounded-lg shadow-md"
                  />
                </div>

                {/* Platform Buttons */}
                <div className="space-y-3">
                  <p className="text-sm font-medium text-gray-700">Choose a platform:</p>
                  <div className="grid grid-cols-2 gap-3">
                    {platforms.map((platform) => (
                      <button
                        key={platform.id}
                        onClick={() => handlePlatformSelect(platform)}
                        disabled={isLoading}
                        className={`
                          relative flex items-center gap-3 px-4 py-3 rounded-lg text-white
                          transition-all duration-200 transform hover:scale-105
                          disabled:opacity-50 disabled:cursor-not-allowed
                          ${platform.color} ${platform.hoverColor}
                        `}
                      >
                        {platform.icon}
                        <span className="font-medium">{platform.name}</span>
                        {isLoading && selectedPlatform?.id === platform.id && (
                          <motion.div
                            animate={{ rotate: 360 }}
                            transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
                            className="absolute right-3"
                          >
                            <svg
                              className="w-4 h-4"
                              viewBox="0 0 24 24"
                              fill="none"
                              xmlns="http://www.w3.org/2000/svg"
                            >
                              <circle
                                cx="12"
                                cy="12"
                                r="10"
                                stroke="currentColor"
                                strokeWidth="4"
                                strokeLinecap="round"
                                strokeDasharray="31.415"
                                strokeDashoffset="15.7"
                              />
                            </svg>
                          </motion.div>
                        )}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Info Box */}
                <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <p className="text-sm text-blue-800">
                    <strong>Tip:</strong> Your post will include the message:{' '}
                    <em className="block mt-1 italic">
                      "Transform Your Yard with AI, and decorate it this holiday season. Check out www.yarda.pro"
                    </em>
                  </p>
                </div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}