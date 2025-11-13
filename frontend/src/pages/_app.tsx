'use client';

import type { AppProps } from 'next/app';
import { useState, useEffect } from 'react';
import { Analytics } from '@vercel/analytics/react';
import { SpeedInsights } from '@vercel/speed-insights/react';
import '@/styles/globals.css';
import ToastContainer from '@/components/Toast';
import { useToastStore } from '@/hooks/useToast';
import WhatsNewModal from '@/components/WhatsNewModal';
import { useUserStore } from '@/store/userStore';
import { isHolidaySeasonActive } from '@/lib/seasonalFeatures';
import { usersAPI } from '@/lib/api';

export default function App({ Component, pageProps }: AppProps) {
  const { toasts, removeToast } = useToastStore();
  const { user, isAuthenticated, _hasHydrated, setUser } = useUserStore();
  const [showWhatsNewModal, setShowWhatsNewModal] = useState(false);

  // Check if "What's New" modal should be shown
  useEffect(() => {
    if (!_hasHydrated) return; // Wait for Zustand to hydrate from localStorage

    const shouldShow =
      isAuthenticated &&
      user &&
      isHolidaySeasonActive() &&
      user.whats_new_modal_shown === false;

    setShowWhatsNewModal(Boolean(shouldShow));
  }, [isAuthenticated, user, _hasHydrated]);

  // Handle modal dismissal
  const handleDismissModal = async () => {
    setShowWhatsNewModal(false);

    try {
      // Call API to mark modal as shown
      await usersAPI.updateWhatsNewModalState(true);

      // Update user state in store
      if (user) {
        setUser({
          ...user,
          whats_new_modal_shown: true,
        });
      }
    } catch (error) {
      console.error('Failed to update modal state:', error);
      // Non-critical error - modal already dismissed in UI
    }
  };

  return (
    <>
      {/* Vercel Web Analytics - Tracks pageviews and user interactions */}
      <Analytics />

      {/* Vercel Speed Insights - Monitors Core Web Vitals (LCP, FID, CLS) */}
      <SpeedInsights />

      {/* Global Toast Notifications */}
      <ToastContainer toasts={toasts} onDismiss={removeToast} />

      {/* What's New Modal (Holiday Feature Announcement) */}
      <WhatsNewModal isOpen={showWhatsNewModal} onDismiss={handleDismissModal} />

      {/* Page Content */}
      <Component {...pageProps} />
    </>
  );
}
