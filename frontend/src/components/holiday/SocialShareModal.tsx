'use client';

/**
 * Social Share Modal Component - Redesigned
 *
 * Modern, polished UI for sharing holiday decorations across social platforms.
 * Features improved visual hierarchy, better button styling, and enhanced UX.
 *
 * Features:
 * - Modern card-based platform selection
 * - Smooth animations and transitions
 * - Real-time credit feedback
 * - Improved error and success messaging
 * - Responsive design
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Share2, Check, AlertCircle, Zap, Copy, Download } from 'lucide-react';
import { holidayAPI } from '@/lib/api';
import { addWatermarkToImage, copyImageToClipboard, downloadImage } from '@/lib/watermark';
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
  description: string;
  icon: JSX.Element;
  gradient: string;
  lightGradient: string;
}

const platforms: PlatformConfig[] = [
  {
    id: 'x' as SharePlatform,
    name: 'X',
    description: 'Share your design',
    icon: (
      <svg viewBox="0 0 24 24" className="w-8 h-8" fill="currentColor">
        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
      </svg>
    ),
    gradient: 'bg-black',
    lightGradient: 'bg-slate-100',
  },
  {
    id: 'facebook' as SharePlatform,
    name: 'Facebook',
    description: 'Reach your network',
    icon: (
      <svg viewBox="0 0 24 24" className="w-8 h-8" fill="currentColor">
        <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
      </svg>
    ),
    gradient: 'bg-blue-600',
    lightGradient: 'bg-blue-50',
  },
  {
    id: 'instagram' as SharePlatform,
    name: 'Instagram',
    description: 'Share with stories',
    icon: (
      <svg viewBox="0 0 24 24" className="w-8 h-8" fill="currentColor">
        <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zM5.838 12a6.162 6.162 0 1112.324 0 6.162 6.162 0 01-12.324 0zM12 16a4 4 0 110-8 4 4 0 010 8zm4.965-10.405a1.44 1.44 0 112.881.001 1.44 1.44 0 01-2.881-.001z" />
      </svg>
    ),
    gradient: 'bg-gradient-to-br from-purple-600 to-pink-600',
    lightGradient: 'bg-gradient-to-br from-purple-50 to-pink-50',
  },
  {
    id: 'pinterest' as SharePlatform,
    name: 'Pinterest',
    description: 'Pin your creation',
    icon: (
      <svg viewBox="0 0 24 24" className="w-8 h-8" fill="currentColor">
        <path d="M12.017 0C5.396 0 .029 5.367.029 11.987c0 5.079 3.158 9.417 7.618 11.162-.105-.949-.199-2.403.041-3.439.219-.937 1.406-5.957 1.406-5.957s-.359-.72-.359-1.781c0-1.663.967-2.911 2.168-2.911 1.024 0 1.518.769 1.518 1.688 0 1.029-.653 2.567-.992 3.992-.285 1.193.6 2.165 1.775 2.165 2.128 0 3.768-2.245 3.768-5.487 0-2.861-2.063-4.869-5.008-4.869-3.41 0-5.409 2.562-5.409 5.199 0 1.033.394 2.143.889 2.741.099.12.112.225.085.345-.09.375-.293 1.199-.334 1.363-.053.225-.172.271-.401.165-1.495-.697-2.436-2.878-2.436-4.649 0-3.785 2.75-7.262 7.929-7.262 4.163 0 7.398 2.967 7.398 6.931 0 4.136-2.607 7.464-6.227 7.464-1.216 0-2.359-.631-2.75-1.378l-.748 2.853c-.271 1.043-1.002 2.35-1.492 3.146C9.57 23.812 10.763 24 12.017 24c6.623 0 11.99-5.367 11.99-11.987C24.007 5.367 18.641 0 12.017 0z" />
      </svg>
    ),
    gradient: 'bg-red-600',
    lightGradient: 'bg-red-50',
  },
  {
    id: 'tiktok' as SharePlatform,
    name: 'TikTok',
    description: 'Go viral',
    icon: (
      <svg viewBox="0 0 24 24" className="w-8 h-8" fill="currentColor">
        <path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z" />
      </svg>
    ),
    gradient: 'bg-black',
    lightGradient: 'bg-slate-100',
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
  const [watermarkedImageUrl, setWatermarkedImageUrl] = useState<string | null>(null);
  const [isGeneratingWatermark, setIsGeneratingWatermark] = useState(false);
  const [copySuccess, setCopySuccess] = useState(false);

  // Generate watermarked image when modal opens
  useEffect(() => {
    if (isOpen && imageUrl && !watermarkedImageUrl) {
      setIsGeneratingWatermark(true);
      addWatermarkToImage(imageUrl)
        .then((url) => {
          setWatermarkedImageUrl(url);
        })
        .catch((err) => {
          console.error('Failed to generate watermark:', err);
          // Fallback to original image if watermark fails
          setWatermarkedImageUrl(imageUrl);
        })
        .finally(() => {
          setIsGeneratingWatermark(false);
        });
    }
  }, [isOpen, imageUrl, watermarkedImageUrl]);

  // Reset states when modal closes
  useEffect(() => {
    if (!isOpen) {
      setWatermarkedImageUrl(null);
      setSelectedPlatform(null);
      setShareResponse(null);
      setError(null);
      setCopySuccess(false);
    }
  }, [isOpen]);

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

  // Reset copy success state after 2 seconds
  useEffect(() => {
    if (copySuccess) {
      const timer = setTimeout(() => setCopySuccess(false), 2000);
      return () => clearTimeout(timer);
    }
  }, [copySuccess]);

  const handlePlatformSelect = async (platform: PlatformConfig) => {
    setSelectedPlatform(platform);
    setError(null);
    setIsLoading(true);

    try {
      // Auto-copy watermarked image to clipboard
      if (watermarkedImageUrl) {
        try {
          await copyImageToClipboard(watermarkedImageUrl);
          setCopySuccess(true);
        } catch (clipboardErr) {
          console.warn('Could not copy to clipboard, continuing anyway:', clipboardErr);
        }
      }

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

  const handleCopyImage = async () => {
    if (!watermarkedImageUrl) return;

    try {
      await copyImageToClipboard(watermarkedImageUrl);
      setCopySuccess(true);
    } catch (err) {
      console.error('Failed to copy image:', err);
      setError('Failed to copy image to clipboard. Try downloading instead.');
    }
  };

  const handleDownloadImage = () => {
    if (!watermarkedImageUrl) return;

    downloadImage(watermarkedImageUrl, 'yarda-decorated-holiday.jpg');
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
            className="fixed inset-0 bg-black bg-opacity-40 z-50 backdrop-blur-sm"
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: 'spring', damping: 20, stiffness: 300 }}
            className="fixed inset-0 flex items-center justify-center z-50 p-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="bg-white rounded-3xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              {/* Gradient Header */}
              <div className="relative bg-gradient-to-br from-emerald-500 to-emerald-600 px-8 py-10">
                <button
                  onClick={onClose}
                  className="absolute right-6 top-6 p-2 rounded-full hover:bg-white hover:bg-opacity-20 transition-colors"
                >
                  <X className="w-6 h-6 text-white" />
                </button>

                {/* Header Content */}
                <div className="flex items-start gap-4">
                  <div className="p-3 rounded-2xl bg-white bg-opacity-20">
                    <Share2 className="w-8 h-8 text-white" />
                  </div>
                  <div>
                    <h2 className="text-3xl font-bold text-white">Share & Earn</h2>
                    <p className="mt-2 text-emerald-50 text-lg">
                      Share your holiday creation and get 1 free credit per share
                    </p>
                  </div>
                </div>
              </div>

              {/* Content */}
              <div className="p-8">
                {/* Success Message */}
                <AnimatePresence>
                  {showSuccess && shareResponse && (
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className="mb-6 p-4 bg-emerald-50 border-l-4 border-emerald-500 rounded-lg"
                    >
                      <div className="flex items-start gap-3">
                        <motion.div
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          transition={{ delay: 0.1 }}
                        >
                          <Check className="w-6 h-6 text-emerald-600 flex-shrink-0" />
                        </motion.div>
                        <div>
                          <p className="font-bold text-emerald-900">Share link created!</p>
                          <p className="text-sm text-emerald-700 mt-2">
                            {shareResponse.can_earn_credit ? (
                              <span className="flex items-center gap-2">
                                <Zap className="w-4 h-4" />
                                You'll earn 1 credit when someone clicks your link.{' '}
                                <strong>{shareResponse.daily_shares_remaining}</strong> shares
                                remaining today.
                              </span>
                            ) : (
                              'Daily share limit reached. Share anyway to spread the joy!'
                            )}
                          </p>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Error Message */}
                <AnimatePresence>
                  {error && (
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className="mb-6 p-4 bg-red-50 border-l-4 border-red-500 rounded-lg"
                    >
                      <div className="flex items-start gap-3">
                        <AlertCircle className="w-6 h-6 text-red-600 flex-shrink-0" />
                        <div>
                          <p className="font-bold text-red-900">Share failed</p>
                          <p className="text-sm text-red-700 mt-1">{error}</p>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Preview Image with Watermark + Download/Copy Buttons */}
                <div className="mb-8">
                  <div className="relative rounded-2xl overflow-hidden shadow-lg bg-gray-100">
                    {isGeneratingWatermark ? (
                      <div className="w-full h-64 flex items-center justify-center bg-gray-200 animate-pulse">
                        <p className="text-slate-600">Adding watermark...</p>
                      </div>
                    ) : (
                      <img
                        src={watermarkedImageUrl || imageUrl}
                        alt="Holiday decoration with watermark"
                        className="w-full h-64 object-cover"
                      />
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent opacity-0 hover:opacity-20 transition-opacity" />
                  </div>
                  <p className="mt-2 text-sm text-slate-600 text-center font-medium">
                    ✨ Watermarked image ready for sharing
                  </p>

                  {/* Image Action Buttons */}
                  <div className="mt-4 flex gap-3">
                    <button
                      onClick={handleCopyImage}
                      disabled={isGeneratingWatermark || !watermarkedImageUrl}
                      className={`flex-1 py-3 px-4 rounded-xl font-semibold transition-all flex items-center justify-center gap-2 ${
                        copySuccess
                          ? 'bg-emerald-500 text-white'
                          : 'bg-slate-100 hover:bg-slate-200 text-slate-900 disabled:opacity-50 disabled:cursor-not-allowed'
                      }`}
                    >
                      <Copy className="w-4 h-4" />
                      {copySuccess ? 'Copied!' : 'Copy Image'}
                    </button>

                    <button
                      onClick={handleDownloadImage}
                      disabled={isGeneratingWatermark || !watermarkedImageUrl}
                      className="flex-1 py-3 px-4 rounded-xl font-semibold transition-all bg-slate-100 hover:bg-slate-200 text-slate-900 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                      <Download className="w-4 h-4" />
                      Download
                    </button>
                  </div>
                </div>

                {/* Platform Selection Header */}
                <div className="mb-5">
                  <h3 className="text-lg font-bold text-slate-900">Choose your platform</h3>
                  <p className="text-sm text-slate-500 mt-1">
                    Pick one to share and earn your credit
                  </p>
                </div>

                {/* Platform Cards Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
                  {platforms.map((platform, index) => (
                    <motion.button
                      key={platform.id}
                      onClick={() => handlePlatformSelect(platform)}
                      disabled={isLoading}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.05 }}
                      whileHover={!isLoading ? { y: -4, boxShadow: '0 12px 24px rgba(0,0,0,0.1)' } : {}}
                      whileTap={!isLoading ? { scale: 0.98 } : {}}
                      className={`
                        relative p-5 rounded-2xl border-2 transition-all duration-300
                        ${
                          isLoading && selectedPlatform?.id === platform.id
                            ? `${platform.gradient} text-white border-transparent`
                            : `border-slate-200 ${platform.lightGradient} hover:border-slate-300`
                        }
                        ${isLoading && selectedPlatform?.id !== platform.id ? 'opacity-50' : ''}
                        ${isLoading ? 'cursor-not-allowed' : 'cursor-pointer'}
                      `}
                    >
                      <div className="flex items-center gap-4">
                        <div
                          className={`p-3 rounded-xl transition-colors ${
                            isLoading && selectedPlatform?.id === platform.id
                              ? 'bg-white bg-opacity-20'
                              : `${platform.gradient} text-white`
                          }`}
                        >
                          {isLoading && selectedPlatform?.id === platform.id ? (
                            <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1 }}>
                              {platform.icon}
                            </motion.div>
                          ) : (
                            platform.icon
                          )}
                        </div>
                        <div className="text-left flex-1">
                          <p className={`font-bold text-base ${
                            isLoading && selectedPlatform?.id === platform.id
                              ? 'text-white'
                              : 'text-slate-900'
                          }`}>
                            {platform.name}
                          </p>
                          <p className={`text-xs mt-1 ${
                            isLoading && selectedPlatform?.id === platform.id
                              ? 'text-white text-opacity-80'
                              : 'text-slate-500'
                          }`}>
                            {platform.description}
                          </p>
                        </div>
                        {isLoading && selectedPlatform?.id === platform.id && (
                          <motion.div
                            animate={{ scale: [1, 1.2, 1] }}
                            transition={{ repeat: Infinity, duration: 1.5 }}
                            className="text-white"
                          >
                            <Zap className="w-5 h-5" />
                          </motion.div>
                        )}
                      </div>
                    </motion.button>
                  ))}
                </div>

                {/* Info Banner */}
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.3 }}
                  className="space-y-4"
                >
                  <div className="p-4 bg-blue-50 rounded-2xl border border-blue-200">
                    <p className="text-xs text-blue-900 leading-relaxed">
                      <strong className="text-blue-900">📸 How to share (3 simple steps!):</strong>
                      <ol className="list-decimal list-inside mt-2 space-y-1">
                        <li>Click a platform below (image auto-copied to clipboard!)</li>
                        <li>Paste the image in your post</li>
                        <li>Add your caption and post!</li>
                      </ol>
                    </p>
                  </div>

                  <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-200">
                    <p className="text-xs text-emerald-900 leading-relaxed">
                      <strong className="text-emerald-900">✨ What happens next:</strong> When someone clicks your share link and generates their own decoration, you'll earn 1 free credit! Max 3 credits per day.
                    </p>
                  </div>
                </motion.div>

                {/* Footer Info */}
                <div className="mt-6 pt-6 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
                  <div className="flex items-center gap-2">
                    <Zap className="w-4 h-4 text-emerald-600" />
                    Max 3 credits per day
                  </div>
                  <button
                    onClick={onClose}
                    className="px-4 py-2 rounded-lg hover:bg-slate-100 transition-colors text-slate-700 font-medium"
                  >
                    Done
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