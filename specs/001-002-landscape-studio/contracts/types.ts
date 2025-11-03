/**
 * Shared TypeScript type definitions for Yarda AI Landscape Studio
 *
 * These types are shared between frontend and backend to ensure type safety
 * across the entire application stack.
 *
 * Generated from: specs/001-002-landscape-studio/spec.md
 * OpenAPI Spec: specs/001-002-landscape-studio/contracts/openapi.yaml
 */

// ===========================
// Authentication & User Types
// ===========================

export interface User {
  id: string;
  email: string;
  email_verified: boolean;
  created_at: string;
  trial_remaining: number;
  trial_used: number;
  subscription_tier: SubscriptionTier;
  subscription_status: SubscriptionStatus;
  stripe_customer_id?: string;
  stripe_subscription_id?: string;
}

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
  token_type: 'Bearer';
  expires_in: number;
}

export interface VerifyEmailRequest {
  token: string;
}

export interface GoogleAuthRequest {
  google_token: string;
}

// ===========================
// Token System Types
// ===========================

export interface TokenBalance {
  balance: number;
  trial_remaining: number;
}

export interface TokenPurchaseRequest {
  package_id: TokenPackageId;
}

export type TokenPackageId =
  | 'tokens_10'   // 10 tokens - $2
  | 'tokens_50'   // 50 tokens - $10
  | 'tokens_100'  // 100 tokens - $20
  | 'tokens_200'; // 200 tokens - $40

export interface TokenPurchaseResponse {
  checkout_url: string;
  session_id: string;
}

export interface TokenDeductRequest {
  description: string;
}

export interface TokenDeductResponse {
  new_balance: number;
  transaction_id: string;
}

export interface TokenRefundRequest {
  transaction_id: string;
  reason: string;
}

export interface TokenRefundResponse {
  new_balance: number;
}

// ===========================
// Transaction Types
// ===========================

export interface TokenTransaction {
  transaction_id: string;
  user_id: string;
  token_account_id: string;
  amount: number; // Positive for credits, negative for deductions
  type: TransactionType;
  description: string;
  balance_after: number; // Running balance after this transaction
  stripe_payment_intent_id?: string; // For idempotency
  created_at: string;
}

export type TransactionType =
  | 'purchase'
  | 'deduction'
  | 'refund'
  | 'auto_reload';

export interface TransactionListRequest {
  page?: number;
  limit?: number;
  type?: TransactionType;
  start_date?: string;
  end_date?: string;
}

export interface TransactionListResponse {
  transactions: TokenTransaction[];
  pagination: {
    page: number;
    limit: number;
    total: number;
  };
}

// ===========================
// Auto-Reload Types
// ===========================

export interface AutoReloadConfig {
  enabled: boolean;
  threshold: number; // 1-100
  amount: number; // Minimum 10
  failure_count: number;
  last_reload_at?: string;
}

export interface AutoReloadUpdateRequest {
  enabled: boolean;
  threshold: number;
  amount: number;
}

export interface AutoReloadCheckRequest {
  current_balance: number;
}

export interface AutoReloadCheckResponse {
  triggered: boolean;
  stripe_payment_intent_id?: string;
}

// ===========================
// Subscription Types
// ===========================

export type SubscriptionTier =
  | 'free'
  | '7day_pass'
  | 'per_property'
  | 'monthly_pro';

export type SubscriptionStatus =
  | 'inactive'
  | 'active'
  | 'past_due'
  | 'cancelled';

export interface SubscriptionPlan {
  plan_id: SubscriptionTier;
  name: string;
  price: number;
  interval: 'one_time' | 'monthly';
  features: string[];
}

export interface SubscribeRequest {
  plan_id: SubscriptionTier;
}

export interface SubscribeResponse {
  checkout_url: string;
}

export interface Subscription {
  subscription_id: string;
  plan: SubscriptionTier;
  status: SubscriptionStatus;
  current_period_start: string;
  current_period_end: string;
  cancel_at_period_end: boolean;
}

export interface CustomerPortalResponse {
  portal_url: string;
}

export interface CancelSubscriptionResponse {
  cancel_at_period_end: boolean;
  current_period_end: string;
}

// ===========================
// Generation Types
// ===========================

export type YardAreaType =
  | 'front_yard'
  | 'backyard'
  | 'walkway'
  | 'side_yard';

export type LandscapeStyle =
  | 'modern_minimalist'
  | 'california_native'
  | 'japanese_zen'
  | 'english_garden'
  | 'desert_landscape';

export type GenerationStatus =
  | 'pending'
  | 'processing'
  | 'completed'
  | 'failed';

export type PaymentType =
  | 'trial'
  | 'token'
  | 'subscription';

export interface GenerationAreaInput {
  area_type: YardAreaType;
  style: LandscapeStyle;
  custom_prompt?: string;
}

export interface GenerationRequest {
  image?: File | Blob; // For multipart/form-data
  address?: string;
  areas: GenerationAreaInput[];
}

export interface GenerationAreaResult {
  area_id: string;
  area_type: YardAreaType;
  style: LandscapeStyle;
  custom_prompt?: string;
  status: GenerationStatus;
  progress?: number; // 0-100
  image_urls?: string[];
  error_message?: string;
}

export interface Generation {
  generation_id: string;
  user_id: string;
  status: GenerationStatus;
  progress: number; // 0-100
  payment_type: PaymentType;
  tokens_deducted?: number;
  address?: string;
  areas: GenerationAreaResult[];
  created_at: string;
  completed_at?: string;
}

export interface GenerationResponse {
  generation_id: string;
  status: GenerationStatus;
  areas: GenerationAreaResult[];
}

// ===========================
// Gallery Types
// ===========================

export interface GalleryItem {
  generation_id: string;
  thumbnail_url: string;
  area: YardAreaType;
  style: LandscapeStyle;
  address?: string;
  created_at: string;
}

export interface GalleryListRequest {
  page?: number;
  limit?: number;
  style?: LandscapeStyle;
  area?: YardAreaType;
  search?: string; // Fuzzy search by address
}

export interface GalleryListResponse {
  designs: GalleryItem[];
  pagination: {
    page: number;
    limit: number;
    total: number;
  };
}

// ===========================
// Account & Preferences Types
// ===========================

export interface UserProfile {
  user_id: string;
  email: string;
  email_verified: boolean;
  created_at: string;
  trial_remaining: number;
  trial_used: number;
}

export interface UpdateProfileRequest {
  current_password?: string; // Required for password or email change
  new_password?: string;
  new_email?: string;
}

export interface UsageStatistics {
  tokens_used_week: number;
  tokens_used_month: number;
  tokens_used_lifetime: number;
  designs_generated_week: number;
  designs_generated_month: number;
  designs_generated_lifetime: number;
}

export type DownloadQuality = 'standard' | 'high';

export interface NotificationPreferences {
  generation_complete: boolean;
  token_low: boolean;
  auto_reload: boolean;
  subscription_events: boolean;
}

export interface UserPreferences {
  download_quality: DownloadQuality;
  notifications: NotificationPreferences;
}

// ===========================
// Error Types
// ===========================

export interface ApiError {
  error: string;
  message: string;
  code: string;
}

export interface ValidationError extends ApiError {
  fields?: Record<string, string[]>;
}

// ===========================
// Webhook Types (Internal)
// ===========================

export interface StripeWebhookEvent {
  id: string;
  type: StripeEventType;
  data: {
    object: any;
  };
}

export type StripeEventType =
  | 'checkout.session.completed'
  | 'customer.subscription.updated'
  | 'customer.subscription.deleted'
  | 'payment_intent.succeeded'
  | 'payment_intent.payment_failed';

// ===========================
// Database Entity Types (Backend)
// ===========================

export interface UserEntity {
  id: string;
  firebase_uid: string;
  email: string;
  email_verified: boolean;
  trial_remaining: number;
  trial_used: number;
  subscription_tier: SubscriptionTier;
  subscription_status: SubscriptionStatus;
  stripe_customer_id?: string;
  stripe_subscription_id?: string;
  current_period_end?: string;
  cancel_at_period_end: boolean;
  created_at: string;
  updated_at: string;
}

export interface TokenAccountEntity {
  id: string;
  user_id: string;
  balance: number;
  auto_reload_enabled: boolean;
  auto_reload_threshold?: number;
  auto_reload_amount?: number;
  auto_reload_failure_count: number;
  last_reload_at?: string;
  created_at: string;
  updated_at: string;
}

export interface TokenTransactionEntity {
  id: string;
  user_id: string;
  token_account_id: string;
  amount: number;
  type: TransactionType;
  description: string;
  balance_after: number;
  stripe_payment_intent_id?: string;
  created_at: string;
}

export interface GenerationEntity {
  id: string;
  user_id: string;
  status: GenerationStatus;
  payment_type: PaymentType;
  tokens_deducted?: number;
  address?: string;
  image_url?: string;
  request_params: Record<string, any>;
  created_at: string;
  completed_at?: string;
}

export interface GenerationAreaEntity {
  id: string;
  generation_id: string;
  area_type: YardAreaType;
  style: LandscapeStyle;
  custom_prompt?: string;
  status: GenerationStatus;
  progress: number;
  image_urls?: string[];
  error_message?: string;
  created_at: string;
  updated_at: string;
}

export interface RateLimitEntity {
  id: string;
  user_id: string;
  endpoint: string;
  request_count: number;
  window_start: string;
  window_end: string;
  created_at: string;
  updated_at: string;
}

// ===========================
// Type Guards
// ===========================

export function isTokenPackageId(value: string): value is TokenPackageId {
  return ['tokens_10', 'tokens_50', 'tokens_100', 'tokens_200'].includes(value);
}

export function isTransactionType(value: string): value is TransactionType {
  return ['purchase', 'deduction', 'refund', 'auto_reload'].includes(value);
}

export function isYardAreaType(value: string): value is YardAreaType {
  return ['front_yard', 'backyard', 'walkway', 'side_yard'].includes(value);
}

export function isLandscapeStyle(value: string): value is LandscapeStyle {
  return [
    'modern_minimalist',
    'california_native',
    'japanese_zen',
    'english_garden',
    'desert_landscape'
  ].includes(value);
}

export function isGenerationStatus(value: string): value is GenerationStatus {
  return ['pending', 'processing', 'completed', 'failed'].includes(value);
}

export function isSubscriptionTier(value: string): value is SubscriptionTier {
  return ['free', '7day_pass', 'per_property', 'monthly_pro'].includes(value);
}

export function isSubscriptionStatus(value: string): value is SubscriptionStatus {
  return ['inactive', 'active', 'past_due', 'cancelled'].includes(value);
}

// ===========================
// Constants
// ===========================

export const TOKEN_PACKAGES = {
  tokens_10: { tokens: 10, price: 2.00 },
  tokens_50: { tokens: 50, price: 10.00 },
  tokens_100: { tokens: 100, price: 20.00 },
  tokens_200: { tokens: 200, price: 40.00 },
} as const;

export const SUBSCRIPTION_PLANS = {
  '7day_pass': { name: '7-Day Pass', price: 49.00, interval: 'one_time' as const },
  'per_property': { name: 'Per-Property', price: 29.00, interval: 'one_time' as const },
  'monthly_pro': { name: 'Monthly Pro', price: 99.00, interval: 'monthly' as const },
} as const;

export const TRIAL_CREDITS = 3;

export const AUTO_RELOAD_MIN_AMOUNT = 10;
export const AUTO_RELOAD_MIN_THRESHOLD = 1;
export const AUTO_RELOAD_MAX_THRESHOLD = 100;
export const AUTO_RELOAD_MAX_FAILURES = 3;
export const AUTO_RELOAD_THROTTLE_SECONDS = 60;

export const MAX_IMAGE_SIZE_MB = 10;
export const MAX_CUSTOM_PROMPT_LENGTH = 500;
export const MAX_AREAS_PER_GENERATION = 5;

export const GENERATION_TIMEOUT_SECONDS = 300; // 5 minutes

export const YARD_AREA_LABELS: Record<YardAreaType, string> = {
  front_yard: 'Front Yard',
  backyard: 'Backyard',
  walkway: 'Walkway',
  side_yard: 'Side Yard',
};

export const LANDSCAPE_STYLE_LABELS: Record<LandscapeStyle, string> = {
  modern_minimalist: 'Modern Minimalist',
  california_native: 'California Native',
  japanese_zen: 'Japanese Zen',
  english_garden: 'English Garden',
  desert_landscape: 'Desert Landscape',
};
