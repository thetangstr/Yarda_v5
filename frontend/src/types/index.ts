/**
 * TypeScript interfaces for Landscape Design Platform
 * Generated from OpenAPI specification
 */

// ============================================
// User & Authentication Types
// ============================================

export interface User {
  id: string;
  email: string;
  email_verified: boolean;
  trial_credits: number;
  created_at: string;
  updated_at: string;
}

export interface TokenAccount {
  id: string;
  user_id: string;
  balance: number;
  total_purchased: number;
  total_consumed: number;
  created_at: string;
  updated_at: string;
}

export interface UserWithCredits extends User {
  token_account: TokenAccount;
}

export interface RegisterRequest {
  email: string;
  password: string;
}

export interface VerifyEmailRequest {
  token: string;
}

// ============================================
// Credit Management Types
// ============================================

export interface CreditBalance {
  trial_credits: number;
  token_balance: number;
  total_credits: number;
}

export type CreditType = 'trial' | 'token';

// ============================================
// Generation Types
// ============================================

export type GenerationStatus = 'pending' | 'processing' | 'completed' | 'failed';
export type InputType = 'photo' | 'address';
export type DesignStyle = 'modern' | 'traditional' | 'tropical' | 'minimalist' | 'contemporary' | 'japanese' | 'desert';

export interface Generation {
  id: string;
  user_id: string;
  status: GenerationStatus;

  // Input data
  input_type: InputType;
  input_photo_url?: string;
  input_address?: string;
  style: DesignStyle;
  custom_prompt?: string;

  // Output data
  output_image_url?: string;
  error_message?: string;

  // Metrics
  processing_time_ms?: number;
  credit_type?: CreditType;
  credit_refunded: boolean;

  // Timestamps
  created_at: string;
  started_at?: string;
  completed_at?: string;
}

export interface CreateGenerationRequest {
  input_type: InputType;
  input_photo_url?: string; // Required if input_type is 'photo'
  input_address?: string;    // Required if input_type is 'address'
  style: DesignStyle;
  custom_prompt?: string;
}

export interface GenerationHistoryResponse {
  generations: Generation[];
  total: number;
  limit: number;
  offset: number;
}

export interface GenerationHistoryParams {
  limit?: number;  // 1-100, default 20
  offset?: number; // default 0
  status?: GenerationStatus;
}

// ============================================
// Rate Limiting Types
// ============================================

export interface RateLimit {
  id: string;
  user_id: string;
  attempted_at: string;
}

export interface RateLimitStatus {
  is_limited: boolean;
  attempts_in_window: number;
  max_attempts: number;
  window_seconds: number;
  retry_after?: number; // Seconds until next request allowed
}

// ============================================
// Error Types
// ============================================

export interface ApiError {
  error: string;
  message: string;
  details?: Record<string, unknown>;
}

export interface RateLimitError extends ApiError {
  retry_after: number;
  limit: number;
  remaining: number;
}

// ============================================
// API Response Wrappers
// ============================================

export interface SuccessResponse<T> {
  success: true;
  data: T;
}

export interface ErrorResponse {
  success: false;
  error: ApiError;
}

export type ApiResponse<T> = SuccessResponse<T> | ErrorResponse;

// ============================================
// Utility Types
// ============================================

export interface PaginationParams {
  limit?: number;
  offset?: number;
}

export interface TimeRange {
  start_date?: string;
  end_date?: string;
}

// ============================================
// State Management Types (Zustand)
// ============================================

export interface UserState {
  user: UserWithCredits | null;
  isAuthenticated: boolean;
  isLoading: boolean;

  // Actions
  setUser: (user: UserWithCredits | null) => void;
  updateCredits: (credits: CreditBalance) => void;
  logout: () => void;
}

export interface GenerationState {
  generations: Generation[];
  activeGeneration: Generation | null;
  isGenerating: boolean;

  // Actions
  addGeneration: (generation: Generation) => void;
  updateGeneration: (id: string, updates: Partial<Generation>) => void;
  setGenerations: (generations: Generation[]) => void;
  setActiveGeneration: (generation: Generation | null) => void;
}

// ============================================
// Validation Schemas (for runtime validation)
// ============================================

export const ValidationPatterns = {
  email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  uuid: /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
  url: /^https?:\/\/.+/,
} as const;

export const ValidationLimits = {
  customPromptMaxLength: 500,
  minPassword: 8,
  maxGenerationsPerMinute: 3,
  emailVerificationHours: 1,
  maxHistoryPageSize: 100,
} as const;
