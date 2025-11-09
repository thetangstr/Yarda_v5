/**
 * Error Recovery Component
 *
 * Implements PRD UX-R6: Error Prevention and Recovery
 * - User-friendly error display
 * - Manual retry button
 * - Recovery suggestions
 * - Optional technical details (collapsed)
 */

'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { UserFacingError } from '@/lib/error-handling';

interface ErrorRecoveryProps {
  error: UserFacingError;
  onRetry?: () => void;
  retrying?: boolean;
}

export default function ErrorRecovery({ error, onRetry, retrying = false }: ErrorRecoveryProps) {
  const [showTechnical, setShowTechnical] = useState(false);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="bg-red-50 border-l-4 border-red-500 rounded-lg p-6 shadow-md"
    >
      {/* Error Header */}
      <div className="flex items-start">
        <div className="flex-shrink-0">
          <svg
            className="h-6 w-6 text-red-500"
            fill="currentColor"
            viewBox="0 0 20 20"
            aria-hidden="true"
          >
            <path
              fillRule="evenodd"
              d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
              clipRule="evenodd"
            />
          </svg>
        </div>
        <div className="ml-3 flex-1">
          <h3 className="text-lg font-semibold text-red-800">Something went wrong</h3>
          <p className="mt-2 text-sm text-red-700">{error.message}</p>

          {/* Recovery Suggestions */}
          {error.suggestions.length > 0 && (
            <div className="mt-4">
              <p className="text-sm font-medium text-red-800">What you can do:</p>
              <ul className="mt-2 space-y-1">
                {error.suggestions.map((suggestion, index) => (
                  <li key={index} className="text-sm text-red-700 flex items-start">
                    <span className="mr-2">•</span>
                    <span>{suggestion}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Retry Button */}
          {error.isRetryable && onRetry && (
            <div className="mt-4">
              <button
                onClick={onRetry}
                disabled={retrying}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-lg shadow-sm text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {retrying ? (
                  <>
                    <svg
                      className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      />
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      />
                    </svg>
                    Retrying...
                  </>
                ) : (
                  <>
                    <svg
                      className="-ml-1 mr-2 h-4 w-4"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                      />
                    </svg>
                    Try Again
                  </>
                )}
              </button>
            </div>
          )}

          {/* Technical Details (Collapsible) */}
          {error.technicalDetails && (
            <div className="mt-4">
              <button
                onClick={() => setShowTechnical(!showTechnical)}
                className="text-sm text-red-600 hover:text-red-800 font-medium flex items-center"
              >
                {showTechnical ? 'Hide' : 'Show'} technical details
                <svg
                  className={`ml-1 h-4 w-4 transform transition-transform ${showTechnical ? 'rotate-180' : ''}`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 9l-7 7-7-7"
                  />
                </svg>
              </button>
              <AnimatePresence>
                {showTechnical && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="mt-2 p-3 bg-red-100 rounded-md"
                  >
                    <p className="text-xs text-red-700 font-mono">{error.technicalDetails}</p>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}
