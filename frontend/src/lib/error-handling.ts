/**
 * Error Handling Utilities
 *
 * Implements PRD UX-R6: Error Prevention and Recovery
 * - User-friendly error messages (no technical jargon)
 * - Automatic retry for transient failures
 * - Graceful degradation
 */

import axios, { AxiosError } from 'axios';

/**
 * Error types based on PRD requirements
 */
export enum ErrorCategory {
  NETWORK = 'network', // Network connectivity issues
  AUTHENTICATION = 'authentication', // Auth failures
  VALIDATION = 'validation', // Input validation errors
  PAYMENT = 'payment', // Payment/subscription issues
  GENERATION = 'generation', // AI generation failures
  RATE_LIMIT = 'rate_limit', // API rate limiting
  SERVER = 'server', // Backend server errors (5xx)
  UNKNOWN = 'unknown', // Unexpected errors
}

/**
 * User-friendly error messages (PRD requirement: no technical jargon)
 */
const ERROR_MESSAGES: Record<ErrorCategory, string> = {
  [ErrorCategory.NETWORK]:
    'Connection lost. Please check your internet connection and try again.',
  [ErrorCategory.AUTHENTICATION]:
    'Your session has expired. Please log in again to continue.',
  [ErrorCategory.VALIDATION]:
    'Please check your input and make sure all required fields are filled out correctly.',
  [ErrorCategory.PAYMENT]:
    'Unable to process payment. Please check your payment method or contact support.',
  [ErrorCategory.GENERATION]:
    'We could not generate your design. Please try again or contact support if the problem persists.',
  [ErrorCategory.RATE_LIMIT]:
    'Too many requests. Please wait a moment and try again.',
  [ErrorCategory.SERVER]:
    'Something went wrong on our end. We are working to fix it. Please try again in a few moments.',
  [ErrorCategory.UNKNOWN]:
    'An unexpected error occurred. Please try again or contact support if the problem persists.',
};

/**
 * Categorizes an error based on axios error response
 */
export function categorizeError(error: any): ErrorCategory {
  if (!axios.isAxiosError(error)) {
    return ErrorCategory.UNKNOWN;
  }

  const axiosError = error as AxiosError;

  // Network errors (no response)
  if (!axiosError.response) {
    return ErrorCategory.NETWORK;
  }

  const status = axiosError.response.status;

  // Authentication errors
  if (status === 401 || status === 403) {
    return ErrorCategory.AUTHENTICATION;
  }

  // Validation errors
  if (status === 400 || status === 422) {
    return ErrorCategory.VALIDATION;
  }

  // Payment errors
  if (status === 402) {
    return ErrorCategory.PAYMENT;
  }

  // Rate limiting
  if (status === 429) {
    return ErrorCategory.RATE_LIMIT;
  }

  // Server errors
  if (status >= 500) {
    return ErrorCategory.SERVER;
  }

  return ErrorCategory.UNKNOWN;
}

/**
 * Gets user-friendly error message from an error
 * PRD requirement: Clear error messages without technical jargon
 */
export function getUserFriendlyErrorMessage(error: any): string {
  const category = categorizeError(error);
  let message = ERROR_MESSAGES[category];

  // Try to extract backend error message if available and user-friendly
  if (axios.isAxiosError(error)) {
    const apiError = error.response?.data as any;
    if (apiError?.detail && typeof apiError.detail === 'string') {
      // Only use backend message if it doesn't look too technical
      if (!apiError.detail.includes('Exception') && !apiError.detail.includes('Traceback')) {
        message = apiError.detail;
      }
    } else if (apiError?.message && typeof apiError.message === 'string') {
      message = apiError.message;
    }
  }

  return message;
}

/**
 * Determines if an error is retryable
 * PRD requirement: Automatic retry for transient failures
 */
export function isRetryableError(error: any): boolean {
  const category = categorizeError(error);

  // Retryable errors: network, rate limit, server errors
  return (
    category === ErrorCategory.NETWORK ||
    category === ErrorCategory.RATE_LIMIT ||
    category === ErrorCategory.SERVER
  );
}

/**
 * Gets retry delay in milliseconds based on error type
 * Implements exponential backoff for rate limits
 */
export function getRetryDelay(error: any, attempt: number): number {
  const category = categorizeError(error);

  switch (category) {
    case ErrorCategory.NETWORK:
      return 1000; // 1 second for network errors

    case ErrorCategory.RATE_LIMIT:
      // Exponential backoff: 2s, 4s, 8s
      return Math.min(2000 * Math.pow(2, attempt), 8000);

    case ErrorCategory.SERVER:
      return 5000; // 5 seconds for server errors

    default:
      return 1000;
  }
}

/**
 * Retry configuration
 */
export interface RetryConfig {
  maxRetries?: number; // Default: 3
  onRetry?: (attempt: number, error: any) => void;
}

/**
 * Retries a function with exponential backoff
 * PRD requirement: Automatic retry for transient failures
 *
 * @param fn - Async function to retry
 * @param config - Retry configuration
 * @returns Promise resolving to function result
 */
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  config: RetryConfig = {}
): Promise<T> {
  const maxRetries = config.maxRetries ?? 3;
  let lastError: any;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;

      // Don't retry if error is not retryable
      if (!isRetryableError(error)) {
        throw error;
      }

      // Don't retry if max retries reached
      if (attempt === maxRetries) {
        throw error;
      }

      // Notify caller of retry
      if (config.onRetry) {
        config.onRetry(attempt + 1, error);
      }

      // Wait before retrying
      const delay = getRetryDelay(error, attempt);
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  throw lastError;
}

/**
 * Error recovery suggestions based on error category
 * PRD requirement: Support contact for persistent issues
 */
export function getRecoverySuggestions(error: any): string[] {
  const category = categorizeError(error);

  switch (category) {
    case ErrorCategory.NETWORK:
      return [
        'Check your internet connection',
        'Try refreshing the page',
        'Disable any VPN or proxy',
      ];

    case ErrorCategory.AUTHENTICATION:
      return ['Log in again', 'Clear your browser cache and cookies', 'Try a different browser'];

    case ErrorCategory.VALIDATION:
      return [
        'Review your input for typos',
        'Make sure all required fields are filled',
        'Try a different value',
      ];

    case ErrorCategory.PAYMENT:
      return [
        'Verify your payment method is valid',
        'Check if your card has sufficient funds',
        'Contact your bank if the issue persists',
        'Try a different payment method',
      ];

    case ErrorCategory.GENERATION:
      return [
        'Try a simpler prompt',
        'Select a different style or area',
        'Wait a moment and try again',
        'Contact support if this keeps happening',
      ];

    case ErrorCategory.RATE_LIMIT:
      return ['Wait a few minutes', 'Try again later', 'Contact support to increase your limit'];

    case ErrorCategory.SERVER:
      return [
        'Wait a few minutes and try again',
        'Check our status page',
        'Contact support if the issue persists',
      ];

    case ErrorCategory.UNKNOWN:
      return [
        'Refresh the page',
        'Clear your browser cache',
        'Try again in a few moments',
        'Contact support if you continue to see this error',
      ];

    default:
      return ['Try again', 'Contact support if the problem persists'];
  }
}

/**
 * Creates a structured error object with user-friendly information
 */
export interface UserFacingError {
  category: ErrorCategory;
  message: string;
  suggestions: string[];
  isRetryable: boolean;
  technicalDetails?: string; // For debugging (not shown to user by default)
}

export function createUserFacingError(error: any): UserFacingError {
  const category = categorizeError(error);

  return {
    category,
    message: getUserFriendlyErrorMessage(error),
    suggestions: getRecoverySuggestions(error),
    isRetryable: isRetryableError(error),
    technicalDetails: axios.isAxiosError(error) ? error.message : String(error),
  };
}
