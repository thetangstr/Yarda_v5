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
  PaymentStatusResponse,
} from '@/types/generation';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

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
      // Unauthorized - redirect to login
      if (typeof window !== 'undefined') {
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
    const requestBody = {
      address: request.address,
      areas: request.areas.map((area) => ({
        area: area,
        style: request.style,
        custom_prompt: request.custom_prompt,
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

export default apiClient;
