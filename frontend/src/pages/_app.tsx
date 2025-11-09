import type { AppProps } from 'next/app';
import '@/styles/globals.css';
import ToastContainer from '@/components/Toast';
import { useToastStore } from '@/hooks/useToast';

export default function App({ Component, pageProps }: AppProps) {
  const { toasts, removeToast } = useToastStore();

  return (
    <>
      {/* Global Toast Notifications */}
      <ToastContainer toasts={toasts} onDismiss={removeToast} />

      {/* Page Content */}
      <Component {...pageProps} />
    </>
  );
}
