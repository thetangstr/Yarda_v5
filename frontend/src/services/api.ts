/**
 * Centralized API service for backend communication
 *
 * Handles all HTTP requests to the backend API with proper error handling,
 * authentication, and timeout management.
 */

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
const API_TIMEOUT = 300000; // 5 minutes for generation requests

/**
 * Token package interface
 */
export interface TokenPackage {
  package_id: string;
  tokens: number;
  price_usd: number;
  price_cents: number;
  price_per_token: number;
  discount_percent: number | null;
  is_best_value: boolean;
  description: string;
}

/**
 * Token balance response
 */
export interface TokenBalanceResponse {
  balance: number;
  total_purchased: number;
  total_spent: number;
}

/**
 * Checkout session response
 */
export interface CheckoutSessionResponse {
  session_id: string;
  url: string;
}

/**
 * API error class
 */
export class APIError extends Error {
  constructor(
    message: string,
    public status?: number,
    public data?: any
  ) {
    super(message);
    this.name = 'APIError';
  }
}

/**
 * Make an authenticated API request
 */
async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {},
  timeout: number = API_TIMEOUT
): Promise<T> {
  const token = localStorage.getItem('accessToken');

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(token && { Authorization: `Bearer ${token}` }),
        ...options.headers,
      },
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new APIError(
        errorData.detail || `HTTP ${response.status}: ${response.statusText}`,
        response.status,
        errorData
      );
    }

    return await response.json();
  } catch (error) {
    clearTimeout(timeoutId);

    if (error instanceof APIError) {
      throw error;
    }

    if (error instanceof Error) {
      if (error.name === 'AbortError') {
        throw new APIError('Request timeout', 408);
      }
      throw new APIError(error.message);
    }

    throw new APIError('Unknown error occurred');
  }
}

/**
 * Get all available token packages
 */
export async function getTokenPackages(): Promise<TokenPackage[]> {
  return apiRequest<TokenPackage[]>('/tokens/packages', {
    method: 'GET',
  });
}

/**
 * Get user's token balance
 */
export async function getTokenBalance(): Promise<TokenBalanceResponse> {
  return apiRequest<TokenBalanceResponse>('/tokens/balance', {
    method: 'GET',
  });
}

/**
 * Purchase tokens - create Stripe checkout session
 */
export async function purchaseTokens(
  packageId: string
): Promise<CheckoutSessionResponse> {
  return apiRequest<CheckoutSessionResponse>('/tokens/purchase/checkout', {
    method: 'POST',
    body: JSON.stringify({ package_id: packageId }),
  });
}

/**
 * Health check
 */
export async function healthCheck(): Promise<{ status: string; database: string }> {
  return apiRequest('/health', {
    method: 'GET',
  }, 10000); // 10 second timeout for health check
}
