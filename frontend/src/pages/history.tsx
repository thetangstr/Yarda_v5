/**
 * History Page
 *
 * Displays the user's generation history with pagination, filtering, and sorting.
 * Shows authentication-gated content with enhanced UI and features.
 *
 * Features:
 * - Paginated history list (default 20 per page)
 * - Filter by status (completed, failed, processing, etc.)
 * - Sort by date or name
 * - Enhanced generation cards with metadata
 * - Responsive grid layout
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

  // Pagination and filtering state
  const [currentPage, setCurrentPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [sortBy, setSortBy] = useState<string>('');

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
        const response = await generationAPI.list({
          limit,
          page: currentPage,
          status: statusFilter || undefined,
          sort: sortBy || undefined
        });
        setGenerations(response.data);
        setTotal(response.total);
      } catch (err) {
        const errorMessage = getErrorMessage(err);
        setError(errorMessage);
      } finally {
        setLoading(false);
      }
    };

    fetchHistory();
  }, [isAuthenticated, currentPage, limit, statusFilter, sortBy]);

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

  const totalPages = Math.ceil(total / limit);

  return (
    <div className="min-h-screen bg-brand-cream">
      <Head>
        <title>Generation History - Yarda AI Landscape Studio</title>
        <meta name="description" content="View your AI-powered landscape design generation history" />
      </Head>

      <Navigation />

      <main className="max-w-6xl mx-auto px-4 py-12">
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
            <button
              onClick={() => {
                setError(null);
                setCurrentPage(1);
              }}
              className="mt-2 text-sm text-red-600 hover:text-red-800 font-medium"
            >
              Try Again
            </button>
          </div>
        )}

        {/* Filters and Controls */}
        {!loading && generations.length > 0 && (
          <div className="mb-8 bg-white rounded-lg border border-gray-200 p-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Status Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Filter by Status
                </label>
                <select
                  value={statusFilter}
                  onChange={(e) => {
                    setStatusFilter(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-green focus:border-brand-green"
                >
                  <option value="">All Statuses</option>
                  <option value="completed">Completed</option>
                  <option value="processing">Processing</option>
                  <option value="failed">Failed</option>
                  <option value="pending">Pending</option>
                </select>
              </div>

              {/* Sort By */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Sort By
                </label>
                <select
                  value={sortBy}
                  onChange={(e) => {
                    setSortBy(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-green focus:border-brand-green"
                >
                  <option value="">Newest First</option>
                  <option value="oldest">Oldest First</option>
                  <option value="name_asc">Address A-Z</option>
                  <option value="name_desc">Address Z-A</option>
                </select>
              </div>

              {/* Items Per Page */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Items Per Page
                </label>
                <select
                  value={limit}
                  onChange={(e) => {
                    setLimit(parseInt(e.target.value));
                    setCurrentPage(1);
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-green focus:border-brand-green"
                >
                  <option value="10">10</option>
                  <option value="20">20</option>
                  <option value="50">50</option>
                </select>
              </div>
            </div>
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
              No generations found
            </h3>
            <p className="text-gray-600 mb-6">
              {statusFilter ? 'No generations match your filter' : 'Start creating beautiful landscape designs with AI'}
            </p>
            <button
              onClick={() => router.push('/generate')}
              className="btn-primary"
            >
              Create Your First Design
            </button>
          </div>
        )}

        {/* Generations Grid */}
        {generations.length > 0 && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
              {generations.map((generation) => (
                <div
                  key={generation.id}
                  className="bg-white rounded-lg border border-gray-200 overflow-hidden hover:shadow-lg transition-shadow"
                >
                  {/* Card Header with Status */}
                  <div className="p-4 border-b border-gray-200 bg-gray-50">
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-semibold ${
                          generation.status === 'completed'
                            ? 'bg-green-100 text-green-800'
                            : generation.status === 'failed'
                            ? 'bg-red-100 text-red-800'
                            : generation.status === 'processing'
                            ? 'bg-yellow-100 text-yellow-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}
                      >
                        {generation.status}
                      </span>
                      <span className="px-3 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-800">
                        {generation.payment_method === 'subscription'
                          ? 'Pro'
                          : generation.payment_method === 'trial'
                          ? 'Trial'
                          : 'Token'}
                      </span>
                    </div>
                  </div>

                  {/* Card Content */}
                  <div className="p-4">
                    <h3 className="text-lg font-semibold text-gray-900 mb-1 truncate">
                      {generation.address}
                    </h3>

                    <div className="space-y-2 text-sm text-gray-600 mb-4">
                      <p>Created: {new Date(generation.created_at).toLocaleDateString()}</p>
                      {generation.completed_at && (
                        <p>Completed: {new Date(generation.completed_at).toLocaleDateString()}</p>
                      )}
                      {generation.error_message && (
                        <p className="text-red-600">Error: {generation.error_message.substring(0, 50)}...</p>
                      )}
                    </div>

                    {/* Action Buttons */}
                    <div className="flex gap-2">
                      <button
                        onClick={() => router.push(`/generate?id=${generation.id}`)}
                        className="flex-1 px-3 py-2 text-sm font-medium text-white bg-brand-green hover:bg-brand-dark-green rounded-lg transition"
                      >
                        View Details
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-2 mb-8">
                <button
                  onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                  disabled={currentPage === 1}
                  className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Previous
                </button>

                {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                  <button
                    key={page}
                    onClick={() => setCurrentPage(page)}
                    className={`px-3 py-2 rounded-lg transition ${
                      currentPage === page
                        ? 'bg-brand-green text-white'
                        : 'border border-gray-300 text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    {page}
                  </button>
                ))}

                <button
                  onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                  disabled={currentPage === totalPages}
                  className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Next
                </button>
              </div>
            )}

            {/* Info */}
            <div className="text-center text-sm text-gray-600">
              Showing {(currentPage - 1) * limit + 1} to {Math.min(currentPage * limit, total)} of {total} generation{total !== 1 ? 's' : ''}
            </div>
          </>
        )}
      </main>

      <Footer />
    </div>
  );
}
