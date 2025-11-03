/**
 * API Client for backend communication
 *
 * Handles all HTTP requests to the backend API with authentication.
 */

import axios, { AxiosInstance, AxiosError } from 'axios';

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
  image: File;
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
    formData.append('image', data.image);

    const response = await apiClient.post('/generations/', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },

  list: async (limit = 20, offset = 0): Promise<{ generations: Generation[]; total: number }> => {
    const response = await apiClient.get('/generations/', {
      params: { limit, offset },
    });
    return response.data;
  },

  get: async (generationId: string): Promise<Generation> => {
    const response = await apiClient.get(`/generations/${generationId}`);
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
