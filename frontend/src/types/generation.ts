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
  TropicalResort = 'tropical_resort',
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

  /**
   * Preservation strength (v2 enhancement)
   * Controls transformation intensity
   * 0.0-0.4: Dramatic transformation
   * 0.4-0.6: Balanced transformation (default)
   * 0.6-1.0: Subtle refinement
   * Default: 0.5
   */
  preservation_strength?: number;
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
   * Area record ID
   */
  id: string;

  /**
   * Yard area identifier
   */
  area: YardArea;

  /**
   * Design style for this area
   */
  style: DesignStyle;

  /**
   * Custom prompt for this area
   */
  custom_prompt?: string;

  /**
   * Preservation strength for this area (v2 enhancement)
   * 0.0-1.0, default 0.5
   */
  preservation_strength?: number;

  /**
   * Current status
   */
  status: AreaGenerationStatus;

  /**
   * Progress percentage (0-100)
   */
  progress?: number;

  /**
   * Legacy field name for progress
   * @deprecated Use progress instead
   */
  progress_percentage?: number;

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
   * User ID who created this generation
   */
  user_id?: string;

  /**
   * Overall status
   */
  status: GenerationStatus;

  /**
   * Property address
   */
  address?: string;

  /**
   * Payment method used
   */
  payment_method: PaymentMethod;

  /**
   * Total cost in tokens/credits
   */
  total_cost: number;

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
  updated_at?: string;

  /**
   * Processing start timestamp (ISO 8601)
   */
  start_processing_at?: string;

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
   * Error message if generation failed
   */
  error_message?: string;

  /**
   * Number of credits/tokens refunded
   * Only present if any areas failed
   */
  refunded_amount?: number;

  /**
   * Source images (Street View/Satellite) for the property
   * Used to display reference imagery while generation is in progress
   */
  source_images?: Array<{
    image_type: 'street_view' | 'satellite' | 'user_upload';
    image_url: string;
    pano_id?: string;
  }>;
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

// ============================================================================
// Type Aliases for Backwards Compatibility
// ============================================================================

/**
 * Alias for DesignStyle (used in some components)
 */
export type LandscapeStyle = DesignStyle;

// ============================================================================
// V2 Generation Flow Types (Feature 005)
// ============================================================================

/**
 * Suggested prompt option for a yard area
 *
 * @example
 * ```typescript
 * const prompt: SuggestedPrompt = {
 *   id: 'front_yard_1',
 *   text: 'colorful flower beds with seasonal blooms',
 *   emoji: '🌸',
 *   selected: false,
 *   areaId: 'front_yard'
 * };
 * ```
 */
export interface SuggestedPrompt {
  /**
   * Unique identifier: {area_id}_{index}
   */
  id: string;

  /**
   * Prompt suggestion text (20-80 characters)
   */
  text: string;

  /**
   * Emoji indicator based on keywords
   */
  emoji: string;

  /**
   * Whether this prompt is currently selected
   */
  selected: boolean;

  /**
   * Parent yard area ID
   */
  areaId: string;
}

/**
 * Yard area with suggested prompts and custom prompt state
 * Used in v2-style SuperMinimal components
 *
 * @example
 * ```typescript
 * const area: YardAreaWithPrompts = {
 *   id: 'front_yard',
 *   name: 'Front Yard',
 *   emoji: '🏠',
 *   selected: true,
 *   customPrompt: 'colorful flower beds, modern minimalist landscaping',
 *   suggestedPrompts: [...]
 * };
 * ```
 */
export interface YardAreaWithPrompts {
  /**
   * Area identifier
   */
  id: string;

  /**
   * Display name
   */
  name: string;

  /**
   * Emoji visual identifier
   */
  emoji: string;

  /**
   * Whether user has selected this area
   */
  selected: boolean;

  /**
   * User's custom prompt (comma-separated if from suggested prompts)
   */
  customPrompt: string;

  /**
   * Available prompt suggestions (5 per area)
   */
  suggestedPrompts: SuggestedPrompt[];
}

/**
 * Design style with selection order tracking
 * Used in v2-style numbered selection indicators
 *
 * @example
 * ```typescript
 * const style: StyleWithSelection = {
 *   id: 'modern_minimalist',
 *   name: 'Modern Minimalist',
 *   description: 'Clean lines, simple plantings',
 *   emoji: '🏠',
 *   selected: true,
 *   selectionOrder: 1
 * };
 * ```
 */
export interface StyleWithSelection {
  /**
   * Style identifier (snake_case)
   */
  id: string;

  /**
   * Display name
   */
  name: string;

  /**
   * Brief description (50-150 chars)
   */
  description: string;

  /**
   * Emoji visual identifier
   */
  emoji: string;

  /**
   * Whether user has selected this style
   */
  selected: boolean;

  /**
   * Selection order number (1-3), null if not selected
   */
  selectionOrder: number | null;
}

/**
 * Area result with progress tracking
 * Extended from AreaStatus for v2 polling
 *
 * @example
 * ```typescript
 * const result: AreaResultWithProgress = {
 *   areaId: 'front_yard',
 *   status: 'completed',
 *   imageUrl: 'https://vercel-blob.com/abc123.jpg',
 *   error: null,
 *   progress: 100
 * };
 * ```
 */
export interface AreaResultWithProgress {
  /**
   * Reference to yard area
   */
  areaId: string;

  /**
   * Individual area status
   */
  status: AreaGenerationStatus;

  /**
   * Generated image URL (null until completed)
   */
  imageUrl: string | null;

  /**
   * Source images (Street View/Satellite) - shown while generating
   */
  sourceImages?: Array<{
    image_type: 'street_view' | 'satellite' | 'user_upload';
    image_url: string;
    pano_id?: string;
  }>;

  /**
   * Failure reason (null if successful)
   */
  error: string | null;

  /**
   * Percentage complete (0-100)
   */
  progress: number;
}

/**
 * localStorage recovery data structure
 * Minimal data to recover interrupted generations
 *
 * @example
 * ```typescript
 * // Save on generation start
 * const recovery: LocalStorageRecovery = {
 *   requestId: 'uuid',
 *   areas: ['front_yard', 'back_yard'],
 *   address: '123 Main St',
 *   savedAt: new Date().toISOString()
 * };
 * localStorage.setItem('yarda_active_request_id', recovery.requestId);
 * ```
 */
export interface LocalStorageRecovery {
  /**
   * UUID of active generation
   */
  requestId: string;

  /**
   * Selected area IDs
   */
  areas: string[];

  /**
   * Property address
   */
  address: string;

  /**
   * ISO timestamp when saved
   */
  savedAt: string;
}
