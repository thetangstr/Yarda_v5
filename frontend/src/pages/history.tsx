/**
 * History Page
 *
 * Displays the user's generation history with status and details.
 * Shows authentication-gated content.
 */

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import { useUserStore } from '@/store/userStore';
import { generationAPI, Generation, getErrorMessage } from '@/lib/api';
import Navigation from '@/components/Navigation';
import Footer from '@/components/Footer';

export default function HistoryPage() {
  const router = useRouter();
  const { isAuthenticated } = useUserStore();
  const [generations, setGenerations] = useState<Generation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [total, setTotal] = useState(0);

  // Redirect if not authenticated
  useEffect(() => {
    if (!loading && !isAuthenticated) {
      router.push('/login?redirect=/history');
    }
  }, [isAuthenticated, loading, router]);

  // Fetch generation history
  useEffect(() => {
    const fetchHistory = async () => {
      if (!isAuthenticated) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const response = await generationAPI.list(50, 0);
        setGenerations(response.generations);
        setTotal(response.total);
      } catch (err) {
        const errorMessage = getErrorMessage(err);
        setError(errorMessage);
      } finally {
        setLoading(false);
      }
    };

    fetchHistory();
  }, [isAuthenticated]);

  // Show loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-brand-cream">
        <Head>
          <title>History - Yarda AI Landscape Studio</title>
        </Head>
        <Navigation />
        <div className="container mx-auto px-4 py-12">
          <div className="flex items-center justify-center py-20">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-green"></div>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  // Don't render if not authenticated (will redirect)
  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="min-h-screen bg-brand-cream">
      <Head>
        <title>Generation History - Yarda AI Landscape Studio</title>
        <meta name="description" content="View your AI-powered landscape design generation history" />
      </Head>

      <Navigation />

      <main className="container mx-auto px-4 py-12">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Generation History</h1>
          <p className="text-gray-600">
            View all your AI-powered landscape design generations
          </p>
        </div>

        {/* Error State */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-red-700">{error}</p>
          </div>
        )}

        {/* Empty State */}
        {!loading && generations.length === 0 && (
          <div className="card text-center py-12">
            <svg
              className="mx-auto h-16 w-16 text-gray-400 mb-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
              />
            </svg>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              No generations yet
            </h3>
            <p className="text-gray-600 mb-6">
              Start creating beautiful landscape designs with AI
            </p>
            <button
              onClick={() => router.push('/generate')}
              className="btn-primary"
            >
              Create Your First Design
            </button>
          </div>
        )}

        {/* Generations List */}
        {generations.length > 0 && (
          <div className="space-y-4">
            {generations.map((generation) => (
              <div
                key={generation.id}
                className="card hover:shadow-lg transition-shadow cursor-pointer"
                onClick={() => router.push(`/generate?id=${generation.id}`)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      {/* Status Badge */}
                      <span
                        className={`badge ${
                          generation.status === 'completed'
                            ? 'badge-success'
                            : generation.status === 'failed'
                            ? 'badge-error'
                            : generation.status === 'processing'
                            ? 'badge-warning'
                            : 'badge-default'
                        }`}
                      >
                        {generation.status}
                      </span>

                      {/* Payment Method Badge */}
                      <span className="badge badge-default">
                        {generation.payment_method === 'subscription'
                          ? 'Pro'
                          : generation.payment_method === 'trial'
                          ? 'Trial'
                          : 'Token'}
                      </span>
                    </div>

                    <h3 className="text-lg font-semibold text-gray-900 mb-1">
                      {generation.address}
                    </h3>

                    <p className="text-sm text-gray-600">
                      Created: {new Date(generation.created_at).toLocaleString()}
                    </p>

                    {generation.completed_at && (
                      <p className="text-sm text-gray-600">
                        Completed: {new Date(generation.completed_at).toLocaleString()}
                      </p>
                    )}

                    {generation.error_message && (
                      <p className="text-sm text-red-600 mt-2">
                        Error: {generation.error_message}
                      </p>
                    )}

                    {generation.message && (
                      <p className="text-sm text-gray-700 mt-2">
                        {generation.message}
                      </p>
                    )}
                  </div>

                  {/* View Arrow */}
                  <div className="flex-shrink-0 ml-4">
                    <svg
                      className="h-6 w-6 text-brand-green"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 5l7 7-7 7"
                      />
                    </svg>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Total Count */}
        {total > 0 && (
          <div className="mt-8 text-center text-gray-600">
            Showing {generations.length} of {total} generation{total !== 1 ? 's' : ''}
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}
