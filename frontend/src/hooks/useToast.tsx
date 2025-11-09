/**
 * useToast Hook
 *
 * Global toast notification management
 * Implements PRD UX-R2 Pattern 5: Toast Notifications
 */

'use client';

import { create} from 'zustand';
import type { Toast, ToastType } from '@/components/Toast';

interface ToastStore {
  toasts: Toast[];
  addToast: (type: ToastType, message: string, duration?: number) => void;
  removeToast: (id: string) => void;
  clearAll: () => void;
}

/**
 * Global toast store
 */
export const useToastStore = create<ToastStore>((set) => ({
  toasts: [],

  addToast: (type: ToastType, message: string, duration?: number) => {
    const id = `toast-${Date.now()}-${Math.random()}`;
    const toast: Toast = { id, type, message, duration };

    set((state) => ({
      toasts: [toast, ...state.toasts], // Newest on top
    }));
  },

  removeToast: (id: string) => {
    set((state) => ({
      toasts: state.toasts.filter((t) => t.id !== id),
    }));
  },

  clearAll: () => {
    set({ toasts: [] });
  },
}));

/**
 * Convenience hook for toast notifications
 */
export function useToast() {
  const { addToast } = useToastStore();

  return {
    success: (message: string, duration?: number) => addToast('success', message, duration),
    error: (message: string, duration?: number) => addToast('error', message, duration),
    warning: (message: string, duration?: number) => addToast('warning', message, duration),
    info: (message: string, duration?: number) => addToast('info', message, duration),
  };
}
