/**
 * Toast Notification Component
 *
 * Implements PRD UX-R2 Pattern 5: Toast Notifications
 * - Success, Error, Warning, Info types
 * - Auto-dismiss after 3-5 seconds
 * - Slide-down animation
 * - Stacking support (max 3 visible)
 */

'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { useEffect } from 'react';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface Toast {
  id: string;
  type: ToastType;
  message: string;
  duration?: number; // milliseconds (default: 4000)
}

interface ToastProps {
  toast: Toast;
  onDismiss: (id: string) => void;
}

const TOAST_CONFIG: Record<ToastType, { icon: string; borderColor: string; bgColor: string }> = {
  success: {
    icon: '✅',
    borderColor: 'border-l-green-500',
    bgColor: 'bg-green-50',
  },
  error: {
    icon: '❌',
    borderColor: 'border-l-red-500',
    bgColor: 'bg-red-50',
  },
  warning: {
    icon: '⚠️',
    borderColor: 'border-l-orange-500',
    bgColor: 'bg-orange-50',
  },
  info: {
    icon: 'ℹ️',
    borderColor: 'border-l-blue-500',
    bgColor: 'bg-blue-50',
  },
};

function ToastItem({ toast, onDismiss }: ToastProps) {
  const config = TOAST_CONFIG[toast.type];
  const duration = toast.duration || 4000;

  useEffect(() => {
    const timer = setTimeout(() => {
      onDismiss(toast.id);
    }, duration);

    return () => clearTimeout(timer);
  }, [toast.id, duration, onDismiss]);

  return (
    <motion.div
      initial={{ opacity: 0, y: -50, scale: 0.9 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -20, scale: 0.95 }}
      transition={{ duration: 0.2, ease: 'easeOut' }}
      className={`relative w-full max-w-sm ${config.bgColor} rounded-lg shadow-lg border-l-4 ${config.borderColor} p-4 mb-3`}
      role="alert"
    >
      <div className="flex items-start">
        <span className="text-2xl mr-3 flex-shrink-0">{config.icon}</span>
        <div className="flex-1">
          <p className="text-sm text-gray-800 font-medium">{toast.message}</p>
        </div>
        <button
          onClick={() => onDismiss(toast.id)}
          className="ml-3 text-gray-400 hover:text-gray-600 transition-colors flex-shrink-0"
          aria-label="Dismiss notification"
        >
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
            <path
              fillRule="evenodd"
              d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
              clipRule="evenodd"
            />
          </svg>
        </button>
      </div>
    </motion.div>
  );
}

interface ToastContainerProps {
  toasts: Toast[];
  onDismiss: (id: string) => void;
}

export default function ToastContainer({ toasts, onDismiss }: ToastContainerProps) {
  // Show max 3 toasts at once (PRD requirement)
  const visibleToasts = toasts.slice(0, 3);

  return (
    <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 w-full max-w-sm px-4">
      <AnimatePresence mode="popLayout">
        {visibleToasts.map((toast) => (
          <ToastItem key={toast.id} toast={toast} onDismiss={onDismiss} />
        ))}
      </AnimatePresence>
    </div>
  );
}
