/**
 * API Client for backend communication
 *
 * Handles all HTTP requests to the backend API with authentication.
 */

import axios, { AxiosInstance, AxiosError } from 'axios';
import type {
  CreateGenerationRequest as MultiAreaCreateRequest,
  GenerationResponse as MultiAreaResponse,
  GenerationStatusResponse as MultiAreaStatusResponse,
  GenerationStatusResponse,
  PaymentStatusResponse,
} from '@/types/generation';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

// Debug: Log API URL being used
console.log('[API Client] Using API_URL:', API_URL);

// Flag to prevent multiple simultaneous 401 redirects (race condition fix)
let is401HandlingInProgress = false;

// Create axios instance
const apiClient: AxiosInstance = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 30000, // 30 seconds
});

// Request interceptor to add auth token
apiClient.interceptors.request.use(
  (config) => {
    // Get token from localStorage
    const userStorage = localStorage.getItem('user-storage');
    if (userStorage) {
      try {
        const { state } = JSON.parse(userStorage);
        if (state?.accessToken) {
          config.headers.Authorization = `Bearer ${state.accessToken}`;
        }
      } catch (e) {
        console.error('Failed to parse user storage:', e);
      }
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor for error handling
apiClient.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    if (error.response?.status === 401) {
      // Unauthorized - redirect to login (with debounce to prevent race condition)
      if (typeof window !== 'undefined' && !is401HandlingInProgress) {
        is401HandlingInProgress = true;
        console.log('[API Client] 401 Unauthorized - clearing session and redirecting to login');
        localStorage.removeItem('user-storage');
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

// ============================================================================
// Authentication APIs
// ============================================================================

export interface RegisterRequest {
  email: string;
  password: string;
}

export interface RegisterResponse {
  user_id: string;
  email: string;
  trial_remaining: number;
  verification_sent: boolean;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  access_token: string;
  token_type: string;
  user: {
    id: string;
    email: string;
    email_verified: boolean;
    trial_remaining: number;
    trial_used: number;
    subscription_tier: string;
    subscription_status: string;
    created_at: string;
  };
}

export interface VerifyEmailRequest {
  token: string;
}

export const authAPI = {
  register: async (data: RegisterRequest): Promise<RegisterResponse> => {
    const response = await apiClient.post('/auth/register', data);
    return response.data;
  },

  login: async (data: LoginRequest): Promise<LoginResponse> => {
    const response = await apiClient.post('/auth/login', data);
    return response.data;
  },

  verifyEmail: async (data: VerifyEmailRequest): Promise<{ message: string; email: string }> => {
    const response = await apiClient.post('/auth/verify-email', data);
    return response.data;
  },

  resendVerification: async (email: string): Promise<{ message: string }> => {
    const response = await apiClient.post('/auth/resend-verification', null, {
      params: { email },
    });
    return response.data;
  },

  logout: async (): Promise<void> => {
    await apiClient.post('/auth/logout');
    localStorage.removeItem('user-storage');
  },
};

// ============================================================================
// Generation APIs
// ============================================================================

export interface CreateGenerationRequest {
  address: string;
  area: string;
  style: string;
  custom_prompt?: string;
  image?: File; // Optional - backend fetches from Google Maps if not provided
}

export interface Generation {
  id: string;
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'partial';
  payment_method: 'subscription' | 'trial' | 'token';
  message?: string;
  address: string;
  created_at: string;
  completed_at?: string;
  error_message?: string;
  // Retention policy fields
  expires_at?: string;
  retention_days?: number | null;
  retention_message?: string;
}

export const generationAPI = {
  create: async (data: CreateGenerationRequest): Promise<Generation> => {
    const formData = new FormData();
    formData.append('address', data.address);
    formData.append('area', data.area);
    formData.append('style', data.style);
    if (data.custom_prompt) {
      formData.append('custom_prompt', data.custom_prompt);
    }
    if (data.image) {
      formData.append('image', data.image);
    }

    const response = await apiClient.post('/generations/', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },

  list: async (params?: {
    page?: number;
    limit?: number;
    status?: string;
    sort?: string;
  }): Promise<{ data: Generation[]; total: number; has_more: boolean; page: number; limit: number }> => {
    const { page = 1, limit = 20, status, sort } = params || {};
    const response = await apiClient.get('/generations/', {
      params: {
        page,
        limit,
        status,
        sort,
      },
    });
    return response.data;
  },

  get: async (generationId: string): Promise<Generation> => {
    const response = await apiClient.get(`/generations/${generationId}`);
    return response.data;
  },
};

// ============================================================================
// Multi-Area Generation APIs (Feature 004-generation-flow)
// ============================================================================

/**
 * T030: Multi-area generation API for Feature 004-generation-flow
 * Supports 1-5 areas per request with atomic payment deduction
 */
export const generationsAPI = {
  /**
   * T030: Create multi-area generation request
   * POST /generations/multi
   *
   * @param request - CreateGenerationRequest with address and areas
   * @returns MultiAreaResponse with generation ID and per-area status
   */
  create: async (request: MultiAreaCreateRequest): Promise<MultiAreaResponse> => {
    // Convert areas array to AreaRequest format expected by backend
    // v2 enhancement: Include preservation_strength for each area
    const requestBody = {
      address: request.address,
      areas: request.areas.map((area) => ({
        area: area,
        style: request.style,
        custom_prompt: request.custom_prompt,
        preservation_strength: request.preservation_strength ?? 0.5, // v2 enhancement
      })),
    };

    const response = await apiClient.post('/generations/multi', requestBody);
    return response.data;
  },

  /**
   * T031: Get generation status for polling
   * GET /generations/{id}
   *
   * Frontend polls this endpoint every 2 seconds to track progress
   *
   * @param generationId - Generation UUID
   * @returns MultiAreaStatusResponse with overall status and per-area progress
   */
  getStatus: async (generationId: string): Promise<MultiAreaStatusResponse> => {
    const response = await apiClient.get(`/generations/${generationId}`);
    return response.data;
  },

  /**
   * Alias for getStatus (used by polling hook)
   */
  getGeneration: async (generationId: string): Promise<MultiAreaStatusResponse> => {
    return generationsAPI.getStatus(generationId);
  },
};

// ============================================================================
// Payment Status APIs (Feature 004-generation-flow)
// ============================================================================

/**
 * T032: Payment status API for Feature 004-generation-flow
 * Provides payment method hierarchy and user capabilities
 */
export const paymentAPI = {
  /**
   * T032: Get user's payment status and capabilities
   * GET /users/payment-status
   *
   * Returns payment hierarchy (subscription > trial > token > none)
   * and whether user can generate designs
   *
   * @returns PaymentStatusResponse with active_payment_method and balances
   */
  getStatus: async (): Promise<PaymentStatusResponse> => {
    const response = await apiClient.get('/users/payment-status');
    return response.data;
  },
};

// ============================================================================
// Token APIs
// ============================================================================

export interface TokenBalanceResponse {
  balance: number;
  total_purchased: number;
  total_spent: number;
  auto_reload_enabled: boolean;
  auto_reload_threshold: number | null;
  auto_reload_amount: number | null;
  auto_reload_failure_count: number;
}

export interface AutoReloadConfigRequest {
  enabled: boolean;
  threshold?: number;
  amount?: number;
}

export interface AutoReloadConfigResponse {
  auto_reload_enabled: boolean;
  auto_reload_threshold: number | null;
  auto_reload_amount: number | null;
  auto_reload_failure_count: number;
  last_reload_at: string | null;
}

export interface TokenTransaction {
  id: string;
  amount: number;
  transaction_type: 'purchase' | 'generation' | 'refund';
  description: string;
  price_paid_cents: number | null;
  created_at: string;
}

export interface TokenPackage {
  package_id: string;
  tokens: number;
  price_usd: string;
  price_cents: number;
  price_per_token: string;
  discount_percent: number | null;
  is_best_value: boolean;
}

export interface CreateCheckoutSessionRequest {
  package_id: string;
}

export interface CreateCheckoutSessionResponse {
  session_id: string;
  url: string;
}

export const tokenAPI = {
  getBalance: async (): Promise<TokenBalanceResponse> => {
    const response = await apiClient.get('/tokens/balance');
    return response.data;
  },

  getTransactions: async (limit = 50, offset = 0): Promise<TokenTransaction[]> => {
    const response = await apiClient.get('/tokens/transactions', {
      params: { limit, offset },
    });
    return response.data;
  },

  getPackages: async (): Promise<TokenPackage[]> => {
    const response = await apiClient.get('/tokens/packages');
    return response.data;
  },

  createCheckoutSession: async (
    data: CreateCheckoutSessionRequest
  ): Promise<CreateCheckoutSessionResponse> => {
    const response = await apiClient.post('/tokens/purchase/checkout', data);
    return response.data;
  },

  getAutoReloadConfig: async (): Promise<AutoReloadConfigResponse> => {
    const response = await apiClient.get('/tokens/auto-reload');
    return response.data;
  },

  configureAutoReload: async (
    data: AutoReloadConfigRequest
  ): Promise<AutoReloadConfigResponse> => {
    const response = await apiClient.put('/tokens/auto-reload', data);
    return response.data;
  },
};

// ============================================================================
// Subscription APIs
// ============================================================================

export interface SubscriptionPlan {
  plan_id: string;
  name: string;
  price_cents: number;
  description: string;
  features: string[];
  billing_period: 'monthly' | 'annual';
}

export interface SubscriptionStatus {
  subscription_id: string;
  status: 'active' | 'inactive' | 'past_due' | 'cancelled';
  plan_id: string;
  plan_name: string;
  price_cents: number;
  current_period_start: string;
  current_period_end: string;
  cancel_at_period_end: boolean;
  cancelled_at?: string;
}

export interface CreateSubscriptionCheckoutRequest {
  plan_id: string;
  success_url: string;
  cancel_url: string;
}

export interface CreateSubscriptionCheckoutResponse {
  session_id: string;
  url: string;
}

export interface CustomerPortalResponse {
  url: string;
}

export const subscriptionAPI = {
  /**
   * Get available subscription plans
   */
  getPlans: async (): Promise<SubscriptionPlan[]> => {
    const response = await apiClient.get('/subscriptions/plans');
    return response.data;
  },

  /**
   * Get current user's subscription status
   */
  getCurrentSubscription: async (): Promise<SubscriptionStatus> => {
    const response = await apiClient.get('/subscriptions/current');
    return response.data;
  },

  /**
   * Create Stripe checkout session for subscription
   */
  createCheckout: async (
    planId: string,
    successUrl: string,
    cancelUrl: string
  ): Promise<CreateSubscriptionCheckoutResponse> => {
    const response = await apiClient.post('/subscriptions/subscribe', {
      plan_id: planId,
      success_url: successUrl,
      cancel_url: cancelUrl,
    });
    return response.data;
  },

  /**
   * Cancel current subscription
   */
  cancelSubscription: async (): Promise<{ message: string }> => {
    const response = await apiClient.post('/subscriptions/cancel');
    return response.data;
  },

  /**
   * Get Stripe customer portal URL
   */
  getCustomerPortal: async (): Promise<CustomerPortalResponse> => {
    const response = await apiClient.get('/subscriptions/portal');
    return response.data;
  },
};

// ============================================================================
// Holiday Decorator APIs (Feature 007)
// ============================================================================

// Import types from holiday.ts
import type {
  HolidayGenerationRequest,
  HolidayGenerationResponse,
  HolidayGenerationListResponse,
  ShareRequest,
  ShareResponse,
  ShareListResponse,
  HolidayCreditsResponse,
  HolidayCreditHistoryResponse,
  EmailHDRequest,
  EmailHDResponse,
} from '@/types/holiday';

export const holidayAPI = {
  /**
   * Create a new holiday decoration generation
   * POST /v1/holiday/generations
   */
  createGeneration: async (
    data: HolidayGenerationRequest
  ): Promise<HolidayGenerationResponse> => {
    const response = await apiClient.post('/holiday/generations', data);
    return response.data;
  },

  /**
   * Get status and result of a specific generation
   * GET /v1/holiday/generations/:id
   */
  getGeneration: async (generationId: string): Promise<HolidayGenerationResponse> => {
    const response = await apiClient.get(`/holiday/generations/${generationId}`);
    return response.data;
  },

  /**
   * List user's holiday generations with pagination
   * GET /v1/holiday/generations
   */
  listGenerations: async (
    limit = 20,
    offset = 0
  ): Promise<HolidayGenerationListResponse> => {
    const response = await apiClient.get('/holiday/generations', {
      params: { limit, offset },
    });
    return response.data;
  },

  /**
   * Create a social share tracking link
   * POST /v1/holiday/shares
   */
  createShare: async (data: ShareRequest): Promise<ShareResponse> => {
    const response = await apiClient.post('/holiday/shares', data);
    return response.data;
  },

  /**
   * List user's social shares with pagination
   * GET /v1/holiday/shares
   */
  listShares: async (limit = 20, offset = 0): Promise<ShareListResponse> => {
    const response = await apiClient.get('/holiday/shares', {
      params: { limit, offset },
    });
    return response.data;
  },

  /**
   * Get user's holiday credits balance and earnings breakdown
   * GET /v1/holiday/credits
   */
  getCredits: async (): Promise<HolidayCreditsResponse> => {
    const response = await apiClient.get('/holiday/credits');
    return response.data;
  },

  /**
   * Get holiday credit transaction history
   * GET /v1/holiday/credits/history
   */
  getCreditHistory: async (
    limit = 50,
    offset = 0
  ): Promise<HolidayCreditHistoryResponse> => {
    const response = await apiClient.get('/holiday/credits/history', {
      params: { limit, offset },
    });
    return response.data;
  },

  /**
   * Request HD image delivery via email
   * POST /v1/holiday/email/request-hd
   */
  requestHDEmail: async (data: EmailHDRequest): Promise<EmailHDResponse> => {
    const response = await apiClient.post('/holiday/email/request-hd', data);
    return response.data;
  },
};

// ============================================================================
// Unified Credits API (Credit Systems Consolidation)
// ============================================================================

export interface TrialBalanceDetail {
  remaining: number;
  used: number;
  total_granted: number;
}

export interface TokenBalanceDetail {
  balance: number;
  total_purchased: number;
  total_spent: number;
  total_refunded: number;
}

export interface HolidayEarningsBreakdown {
  signup_bonus: number;
  social_shares: number;
  other: number;
}

export interface HolidayBalanceDetail {
  credits: number;
  earned: number;
  can_generate: boolean;
  earnings_breakdown: HolidayEarningsBreakdown;
}

export interface UnifiedBalanceResponse {
  trial: TrialBalanceDetail;
  token: TokenBalanceDetail;
  holiday: HolidayBalanceDetail;
}

export interface SimpleBalanceResponse {
  trial: number;
  token: number;
  holiday: number;
}

export const creditsAPI = {
  /**
   * Get unified balance for all credit types (detailed)
   * GET /v1/credits/balance
   */
  getBalance: async (): Promise<UnifiedBalanceResponse> => {
    const response = await apiClient.get('/v1/credits/balance');
    return response.data;
  },

  /**
   * Get lightweight balance (numbers only)
   * GET /v1/credits/balance/simple
   */
  getSimpleBalance: async (): Promise<SimpleBalanceResponse> => {
    const response = await apiClient.get('/v1/credits/balance/simple');
    return response.data;
  },
};

// ============================================================================
// Error handling utilities
// ============================================================================

export interface APIError {
  detail: string | { error: string; message: string; [key: string]: any };
}

export const getErrorMessage = (error: any): string => {
  if (axios.isAxiosError(error)) {
    const apiError = error.response?.data as APIError;
    if (typeof apiError?.detail === 'string') {
      return apiError.detail;
    }
    if (typeof apiError?.detail === 'object') {
      return apiError.detail.message || apiError.detail.error || 'An error occurred';
    }
    return error.message;
  }
  return 'An unexpected error occurred';
};

// ============================================================================
// Polling Utilities (Feature 005 - V2 Port)
// ============================================================================

export const POLLING_INTERVAL = 2000; // 2 seconds
export const POLLING_TIMEOUT = 300000; // 5 minutes

export interface PollingCallbacks {
  onProgress?: (response: GenerationStatusResponse) => void;
  onComplete?: (response: GenerationStatusResponse) => void;
  onError?: (error: any) => void;
  onTimeout?: () => void;
}

/**
 * Polls a generation status endpoint until completion or timeout.
 *
 * Strategy (from v2 research):
 * - Poll every 2 seconds
 * - Stop when all areas are completed or failed
 * - Timeout after 5 minutes
 * - Cancel polling on unmount via returned cleanup function
 *
 * @param generationId - Generation UUID to poll
 * @param callbacks - Event callbacks for progress, completion, error, timeout
 * @returns Cleanup function to stop polling
 */
export function pollGenerationStatus(
  generationId: string,
  callbacks: PollingCallbacks
): () => void {
  let intervalId: NodeJS.Timeout | null = null;
  let timeoutId: NodeJS.Timeout | null = null;
  let cancelled = false;

  const cleanup = () => {
    cancelled = true;
    if (intervalId) clearInterval(intervalId);
    if (timeoutId) clearTimeout(timeoutId);
  };

  const checkStatus = async () => {
    if (cancelled) return;

    try {
      const response = await generationsAPI.getStatus(generationId);

      // Call progress callback
      if (callbacks.onProgress) {
        callbacks.onProgress(response);
      }

      // Check if all areas are done (completed or failed)
      if (response.areas) {
        const allDone = response.areas.every(
          (area: any) => area.status === 'completed' || area.status === 'failed'
        );

        if (allDone) {
          cleanup();
          if (callbacks.onComplete) {
            callbacks.onComplete(response);
          }
        }
      }
    } catch (error) {
      cleanup();
      if (callbacks.onError) {
        callbacks.onError(error);
      }
    }
  };

  // Start polling
  intervalId = setInterval(checkStatus, POLLING_INTERVAL);

  // Set timeout
  timeoutId = setTimeout(() => {
    cleanup();
    if (callbacks.onTimeout) {
      callbacks.onTimeout();
    }
  }, POLLING_TIMEOUT);

  // Initial check (don't wait for first interval)
  checkStatus();

  return cleanup;
}

/**
 * Checks if a generation is complete (all areas done).
 *
 * @param response - Generation status response
 * @returns Boolean indicating if generation is complete
 */
export function isGenerationComplete(response: GenerationStatusResponse): boolean {
  if (!response.areas) return false;
  return response.areas.every(
    (area: any) => area.status === 'completed' || area.status === 'failed'
  );
}

/**
 * Gets completion statistics for a generation.
 *
 * @param response - Generation status response
 * @returns Object with completed, failed, pending, and total counts
 */
export function getGenerationStats(response: GenerationStatusResponse): {
  completed: number;
  failed: number;
  pending: number;
  total: number;
} {
  if (!response.areas) {
    return { completed: 0, failed: 0, pending: 0, total: 0 };
  }

  const completed = response.areas.filter((area: any) => area.status === 'completed').length;
  const failed = response.areas.filter((area: any) => area.status === 'failed').length;
  const pending = response.areas.filter(
    (area: any) => area.status === 'pending' || area.status === 'processing'
  ).length;

  return {
    completed,
    failed,
    pending,
    total: response.areas.length,
  };
}

// ============================================================================
// Users APIs
// ============================================================================

export interface UpdateModalStateRequest {
  modal_shown: boolean;
}

export interface UpdateModalStateResponse {
  success: boolean;
  whats_new_modal_shown: boolean;
}

export const usersAPI = {
  /**
   * Mark the "What's New" modal as shown for the current user
   *
   * @param modalShown - Whether the modal has been shown (default: true)
   * @returns Response with success status and updated modal state
   */
  async updateWhatsNewModalState(modalShown: boolean = true): Promise<UpdateModalStateResponse> {
    const response = await apiClient.patch<UpdateModalStateResponse>(
      '/v1/users/me/whats-new-modal',
      { modal_shown: modalShown }
    );
    return response.data;
  },
};

export default apiClient;
