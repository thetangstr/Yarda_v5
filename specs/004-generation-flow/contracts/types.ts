/**
 * TypeScript Types for Generation Flow API
 *
 * Feature: Generation Flow Interface
 * Feature Branch: 004-generation-flow
 * Generated from: openapi.yaml
 * Created: 2025-11-06
 *
 * These types mirror the OpenAPI specification and provide type safety
 * for frontend API calls.
 */

// ============================================================================
// Enums
// ============================================================================

/**
 * Yard area types available for landscape generation
 */
export enum YardArea {
  FrontYard = 'front_yard',
  Backyard = 'backyard',
  Walkway = 'walkway',
  SideYard = 'side_yard',
  Patio = 'patio',
  PoolArea = 'pool_area',
}

/**
 * Design styles available for landscape generation
 */
export enum DesignStyle {
  ModernMinimalist = 'modern_minimalist',
  CaliforniaNative = 'california_native',
  JapaneseZen = 'japanese_zen',
  EnglishGarden = 'english_garden',
  DesertLandscape = 'desert_landscape',
  Mediterranean = 'mediterranean',
  Tropical = 'tropical',
  CottageGarden = 'cottage_garden',
}

/**
 * Overall generation request status
 */
export enum GenerationStatus {
  Pending = 'pending',
  Processing = 'processing',
  Completed = 'completed',
  PartialFailed = 'partial_failed',
  Failed = 'failed',
}

/**
 * Individual area generation status
 */
export enum AreaGenerationStatus {
  Pending = 'pending',
  Processing = 'processing',
  Completed = 'completed',
  Failed = 'failed',
}

/**
 * Processing stages for area generation
 */
export enum ProcessingStage {
  Queued = 'queued',
  RetrievingImagery = 'retrieving_imagery',
  AnalyzingProperty = 'analyzing_property',
  GeneratingDesign = 'generating_design',
  ApplyingStyle = 'applying_style',
  Finalizing = 'finalizing',
  Complete = 'complete',
}

/**
 * Payment methods used for generation
 */
export enum PaymentMethod {
  Subscription = 'subscription',
  Trial = 'trial',
  Token = 'token',
  None = 'none',
}

/**
 * Subscription tiers
 */
export enum SubscriptionTier {
  MonthlyPro = 'monthly_pro',
  AnnualPro = 'annual_pro',
}

/**
 * Subscription status
 */
export enum SubscriptionStatus {
  Active = 'active',
  PastDue = 'past_due',
  Canceled = 'canceled',
  Trialing = 'trialing',
  Incomplete = 'incomplete',
}

// ============================================================================
// Request Types
// ============================================================================

/**
 * Request body for creating a generation
 *
 * POST /v1/generations
 *
 * **Either `address` OR `image` must be provided (mutually exclusive)**
 *
 * @example
 * ```typescript
 * // Address-based generation
 * const requestAddress: CreateGenerationRequest = {
 *   address: "1600 Amphitheatre Parkway, Mountain View, CA",
 *   areas: [YardArea.FrontYard, YardArea.Backyard],
 *   style: DesignStyle.ModernMinimalist,
 *   custom_prompt: "Include drought-tolerant plants"
 * };
 *
 * // Image-based generation
 * const requestImage: CreateGenerationRequest = {
 *   image: fileObject,
 *   areas: [YardArea.FrontYard],
 *   style: DesignStyle.CaliforniaNative
 * };
 * ```
 */
export interface CreateGenerationRequest {
  /**
   * Property address for Street View imagery
   * Required if `image` not provided
   * Max length: 500 characters
   */
  address?: string;

  /**
   * User-uploaded property image
   * Required if `address` not provided
   * Format: JPEG or PNG
   * Max size: 10MB
   */
  image?: File | Blob;

  /**
   * Yard areas to generate designs for
   * Min: 1 area, Max: 4 areas
   * Cost: 1 token/credit per area
   */
  areas: YardArea[];

  /**
   * Design style to apply to all areas
   */
  style: DesignStyle;

  /**
   * Optional custom instructions for AI
   * Max length: 500 characters
   */
  custom_prompt?: string;
}

// ============================================================================
// Response Types
// ============================================================================

/**
 * Response after creating a generation request
 *
 * Status 201 Created from POST /v1/generations
 *
 * @example
 * ```typescript
 * const response: GenerationResponse = {
 *   id: "a1b2c3d4-e5f6-4a5b-8c7d-9e8f7a6b5c4d",
 *   status: GenerationStatus.Pending,
 *   total_cost: 2,
 *   payment_method: PaymentMethod.Trial,
 *   areas: [
 *     { area: YardArea.FrontYard, status: AreaGenerationStatus.Pending, progress_percentage: 0 },
 *     { area: YardArea.Backyard, status: AreaGenerationStatus.Pending, progress_percentage: 0 }
 *   ],
 *   created_at: "2025-11-06T12:00:00Z",
 *   estimated_completion: "2025-11-06T12:01:30Z"
 * };
 * ```
 */
export interface GenerationResponse {
  /**
   * Unique generation request identifier
   * Use this ID for status polling
   */
  id: string;

  /**
   * Overall generation status
   */
  status: GenerationStatus;

  /**
   * Total tokens/credits deducted
   * Equals number of areas selected
   */
  total_cost: number;

  /**
   * Payment method used
   */
  payment_method: PaymentMethod;

  /**
   * List of areas being generated
   */
  areas: AreaStatus[];

  /**
   * Request creation timestamp (ISO 8601)
   */
  created_at: string;

  /**
   * Estimated completion time (ISO 8601)
   * Based on 60 seconds per area
   */
  estimated_completion?: string;
}

/**
 * Status and progress for a specific yard area
 *
 * @example
 * ```typescript
 * const areaStatus: AreaStatus = {
 *   area: YardArea.FrontYard,
 *   status: AreaGenerationStatus.Processing,
 *   progress_percentage: 65,
 *   status_message: "Generating landscape design...",
 *   current_stage: ProcessingStage.GeneratingDesign
 * };
 * ```
 */
export interface AreaStatus {
  /**
   * Yard area identifier
   */
  area: YardArea;

  /**
   * Current status
   */
  status: AreaGenerationStatus;

  /**
   * Progress percentage (0-100)
   */
  progress_percentage: number;

  /**
   * Human-readable status message
   * Max length: 200 characters
   */
  status_message?: string;

  /**
   * Current processing stage
   * Only present when status = 'processing'
   */
  current_stage?: ProcessingStage;

  /**
   * URL of generated image
   * Only present when status = 'completed'
   */
  image_url?: string;

  /**
   * Completion timestamp (ISO 8601)
   * Only present when status = 'completed'
   */
  completed_at?: string;

  /**
   * Error details
   * Only present when status = 'failed'
   */
  error_message?: string;
}

/**
 * Current status and progress of a generation request
 *
 * Response from GET /v1/generations/{id}
 * Poll this endpoint every 2 seconds until status = 'completed' or 'failed'
 *
 * @example
 * ```typescript
 * // Poll for status updates
 * const pollStatus = async (requestId: string) => {
 *   const interval = setInterval(async () => {
 *     const status: GenerationStatusResponse = await api.get(`/generations/${requestId}`);
 *
 *     if (status.status === GenerationStatus.Completed ||
 *         status.status === GenerationStatus.Failed) {
 *       clearInterval(interval);
 *       handleCompletion(status);
 *     }
 *   }, 2000);
 * };
 * ```
 */
export interface GenerationStatusResponse {
  /**
   * Generation request identifier
   */
  id: string;

  /**
   * Overall status
   */
  status: GenerationStatus;

  /**
   * Status for each area
   */
  areas: AreaStatus[];

  /**
   * Request creation timestamp (ISO 8601)
   */
  created_at: string;

  /**
   * Last update timestamp (ISO 8601)
   */
  updated_at: string;

  /**
   * Completion timestamp (ISO 8601)
   * Only present when status = 'completed'
   */
  completed_at?: string;

  /**
   * Total processing time in seconds
   * Only present when status = 'completed'
   */
  total_duration_seconds?: number;

  /**
   * Estimated completion time (ISO 8601)
   * Only present when status = 'processing'
   */
  estimated_completion?: string;

  /**
   * Number of credits/tokens refunded
   * Only present if any areas failed
   */
  refunded_amount?: number;
}

/**
 * User's current payment capabilities
 *
 * Response from GET /v1/users/payment-status
 *
 * @example
 * ```typescript
 * const paymentStatus: PaymentStatusResponse = {
 *   active_payment_method: PaymentMethod.Trial,
 *   trial_remaining: 3,
 *   trial_used: 0,
 *   token_balance: 0,
 *   subscription_status: null,
 *   can_generate: true
 * };
 *
 * // Check if user can generate
 * if (!paymentStatus.can_generate) {
 *   window.location.href = paymentStatus.upgrade_url;
 * }
 * ```
 */
export interface PaymentStatusResponse {
  /**
   * Currently active payment method
   * Hierarchy: subscription > trial > token > none
   */
  active_payment_method: PaymentMethod;

  /**
   * Trial credits remaining (0-3)
   */
  trial_remaining: number;

  /**
   * Trial credits used
   */
  trial_used: number;

  /**
   * Purchased tokens available
   */
  token_balance: number;

  /**
   * Subscription tier
   * Only present if subscribed
   */
  subscription_tier?: SubscriptionTier;

  /**
   * Subscription status
   * Only present if subscribed
   */
  subscription_status?: SubscriptionStatus | null;

  /**
   * Next subscription renewal date (ISO 8601)
   * Only present if subscribed
   */
  subscription_renewal_date?: string;

  /**
   * Whether user can generate designs
   * False if no payment method available
   */
  can_generate: boolean;

  /**
   * URL to purchase tokens or subscribe
   * Only present if can_generate = false
   */
  upgrade_url?: string;
}

/**
 * API error response
 *
 * @example
 * ```typescript
 * const error: ApiError = {
 *   error: "insufficient_payment",
 *   message: "No payment method available. Purchase tokens or subscribe to Monthly Pro.",
 *   details: {
 *     trial_remaining: 0,
 *     token_balance: 0,
 *     upgrade_url: "https://yarda.ai/pricing"
 *   }
 * };
 * ```
 */
export interface ApiError {
  /**
   * Error code (machine-readable)
   */
  error: string;

  /**
   * Human-readable error message
   */
  message: string;

  /**
   * Additional error context
   */
  details?: Record<string, unknown>;
}

// ============================================================================
// UI Helper Types
// ============================================================================

/**
 * Payment indicator for UI display
 * Based on payment hierarchy logic
 *
 * @example
 * ```typescript
 * const getPaymentIndicator = (user: PaymentStatusResponse): PaymentIndicator => {
 *   if (user.subscription_status === SubscriptionStatus.Active) {
 *     return { method: PaymentMethod.Subscription, label: 'Unlimited', color: 'purple' };
 *   }
 *   if (user.trial_remaining > 0) {
 *     return { method: PaymentMethod.Trial, label: 'Trial Credit', color: 'green' };
 *   }
 *   if (user.token_balance > 0) {
 *     return { method: PaymentMethod.Token, label: '1 Token', color: 'blue' };
 *   }
 *   return { method: PaymentMethod.None, label: 'Purchase Required', color: 'gray' };
 * };
 * ```
 */
export interface PaymentIndicator {
  /**
   * Payment method type
   */
  method: PaymentMethod;

  /**
   * Display label for UI
   */
  label: string;

  /**
   * Color for UI theming
   */
  color: 'purple' | 'green' | 'blue' | 'gray';
}

/**
 * Progress state for localStorage persistence
 * Enables recovery after page refresh
 *
 * @example
 * ```typescript
 * // Store on generation start
 * const progressState: GenerationProgressState = {
 *   requestId: response.id,
 *   timestamp: Date.now(),
 *   areas: [YardArea.FrontYard, YardArea.Backyard]
 * };
 * localStorage.setItem('activeGeneration', JSON.stringify(progressState));
 *
 * // Restore on page load
 * const saved = localStorage.getItem('activeGeneration');
 * if (saved) {
 *   const state: GenerationProgressState = JSON.parse(saved);
 *
 *   // Only restore if < 10 minutes old
 *   if (Date.now() - state.timestamp < 600000) {
 *     resumePolling(state.requestId);
 *   } else {
 *     localStorage.removeItem('activeGeneration');
 *   }
 * }
 * ```
 */
export interface GenerationProgressState {
  /**
   * Generation request ID
   */
  requestId: string;

  /**
   * Timestamp when generation started (milliseconds since epoch)
   */
  timestamp: number;

  /**
   * Areas being generated
   */
  areas: YardArea[];
}

/**
 * Form state for generation request
 * Tracks user input before submission
 *
 * @example
 * ```typescript
 * const [formState, setFormState] = useState<GenerationFormState>({
 *   address: '',
 *   selectedAreas: [],
 *   style: null,
 *   customPrompt: ''
 * });
 *
 * const isValid = formState.address &&
 *                 formState.selectedAreas.length > 0 &&
 *                 formState.style;
 * ```
 */
export interface GenerationFormState {
  /**
   * Property address input
   */
  address: string;

  /**
   * Uploaded image (alternative to address)
   */
  image?: File;

  /**
   * Selected yard areas (1-4)
   */
  selectedAreas: YardArea[];

  /**
   * Selected design style
   */
  style: DesignStyle | null;

  /**
   * Optional custom prompt
   */
  customPrompt: string;
}

// ============================================================================
// Type Guards
// ============================================================================

/**
 * Type guard to check if generation is complete
 */
export const isGenerationComplete = (status: GenerationStatus): boolean => {
  return status === GenerationStatus.Completed ||
         status === GenerationStatus.Failed;
};

/**
 * Type guard to check if area is complete
 */
export const isAreaComplete = (status: AreaGenerationStatus): boolean => {
  return status === AreaGenerationStatus.Completed ||
         status === AreaGenerationStatus.Failed;
};

/**
 * Type guard to check if user can generate
 */
export const canUserGenerate = (payment: PaymentStatusResponse): boolean => {
  return payment.can_generate;
};

/**
 * Type guard to check if subscription is active
 */
export const hasActiveSubscription = (payment: PaymentStatusResponse): boolean => {
  return payment.subscription_status === SubscriptionStatus.Active;
};
