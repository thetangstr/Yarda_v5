/**
 * Holiday Decorator Feature Types
 *
 * TypeScript type definitions for the Holiday Decorator viral marketing feature.
 * Based on API contracts from specs/007-holiday-decorator/contracts/
 *
 * @module types/holiday
 */

// ============================================================================
// Enums & Constants
// ============================================================================

/**
 * Holiday decoration style options
 * Supports 7 styles: classic, modern, over_the_top, pop_culture, glam_gold, cyber_christmas, cozy_rustic
 */
export type HolidayStyle = 'classic' | 'modern' | 'over_the_top' | 'pop_culture' | 'glam_gold' | 'cyber_christmas' | 'cozy_rustic';

/**
 * Generation status lifecycle
 */
export type GenerationStatus = 'pending' | 'processing' | 'completed' | 'failed';

/**
 * Social media platforms supported for sharing
 */
export type SharePlatform = 'instagram' | 'facebook' | 'tiktok';

// ============================================================================
// Generation API Types (contracts/generation-api.md)
// ============================================================================

/**
 * Request body for creating a new holiday generation
 * POST /v1/holiday/generations
 */
export interface HolidayGenerationRequest {
  address: string;               // User-entered address (e.g., "123 Main St, San Francisco, CA")
  heading: number;               // Street View heading (0-359 degrees)
  pitch?: number;                // Street View pitch (-90 to 90, default: 0)
  style: HolidayStyle;
  street_offset_feet?: number;   // Optional: offset camera position left/right along street (in feet)
}

/**
 * Response from creating/fetching a holiday generation
 * POST /v1/holiday/generations
 * GET /v1/holiday/generations/:id
 */
export interface HolidayGenerationResponse {
  id: string;                    // Generation UUID
  user_id: string;               // User UUID
  address: string;               // Geocoded address
  location: {
    lat: number;
    lng: number;
  };
  street_view_heading: number;
  street_view_pitch: number;
  style: HolidayStyle;
  status: GenerationStatus;
  original_image_url: string;    // Vercel Blob URL (Street View image)
  decorated_image_url: string | null;  // NULL until completed
  before_after_image_url: string | null;  // NULL until completed
  credits_remaining: number;     // Holiday credits after deduction
  created_at: string;            // ISO 8601 timestamp
  estimated_completion_seconds: number;  // Estimated time (e.g., 10)
  error_message?: string;        // Only present if status === 'failed'
}

/**
 * Response from listing user's generations
 * GET /v1/holiday/generations
 */
export interface HolidayGenerationListResponse {
  generations: HolidayGenerationResponse[];
  total: number;
  limit: number;
  offset: number;
}

// ============================================================================
// Sharing API Types (contracts/share-api.md)
// ============================================================================

/**
 * Request body for creating a share tracking link
 * POST /v1/holiday/shares
 */
export interface ShareRequest {
  generation_id: string;         // Holiday generation UUID
  platform: SharePlatform;
}

/**
 * Response from creating a share
 * POST /v1/holiday/shares
 */
export interface ShareResponse {
  id: string;                    // Share UUID
  user_id: string;
  generation_id: string;
  platform: SharePlatform;
  tracking_link: string;         // Unique tracking URL (e.g., https://yarda.com/h/abc123xyz)
  share_url: string;             // Platform-specific share URL
  before_after_image_url: string;  // Image to share
  can_earn_credit: boolean;      // False if daily limit reached
  daily_shares_remaining: number;  // How many more shares allowed today
  created_at: string;
}

/**
 * Response from listing user's shares
 * GET /v1/holiday/shares
 */
export interface ShareListResponse {
  shares: ShareResponse[];
  total: number;
  limit: number;
  offset: number;
}

/**
 * Response from tracking a share click
 * GET /v1/holiday/shares/track/:code
 */
export interface ShareTrackResponse {
  success: boolean;
  credit_granted: boolean;       // True if this was first click and credit was granted
  credits_remaining: number;     // New balance if credit granted
  message: string;
}

// ============================================================================
// Credits API Types (contracts/credits-api.md)
// ============================================================================

/**
 * Response from getting holiday credits balance
 * GET /v1/holiday/credits
 */
export interface HolidayCreditsResponse {
  holiday_credits: number;       // Current balance
  holiday_credits_earned: number;  // Total earned (lifetime)
  can_generate: boolean;         // true if credits > 0
  earnings_breakdown: {
    signup_bonus: number;        // 1 (or 0 if not during holiday season)
    social_shares: number;       // Credits earned from shares
    other: number;               // Future: referrals, promotions, etc.
  };
}

/**
 * Single credit transaction record
 */
export interface HolidayCreditTransaction {
  id: string;
  user_id: string;
  amount: number;                // +1 (earned) or -1 (spent)
  transaction_type: 'signup_bonus' | 'social_share' | 'generation' | 'admin_grant' | 'refund';
  balance_after: number;         // Balance after transaction
  related_generation_id?: string;  // If type === 'generation'
  related_share_id?: string;       // If type === 'social_share'
  created_at: string;
}

/**
 * Response from getting credit transaction history
 * GET /v1/holiday/credits/history
 */
export interface HolidayCreditHistoryResponse {
  transactions: HolidayCreditTransaction[];
  total: number;
  limit: number;
  offset: number;
}

// ============================================================================
// Email API Types (contracts/email-api.md)
// ============================================================================

/**
 * Request body for requesting HD image via email
 * POST /v1/holiday/email/request-hd
 */
export interface EmailHDRequest {
  generation_id: string;
  email: string;
}

/**
 * Response from email HD request
 * POST /v1/holiday/email/request-hd
 */
export interface EmailHDResponse {
  success: boolean;
  message: string;
  email_sent_to: string;
  subscribed_to_nurture: boolean;
}

// ============================================================================
// Frontend-Specific Types (UI State)
// ============================================================================

/**
 * Form state for holiday generation page
 */
export interface HolidayGenerationFormState {
  address: string;
  heading: number;
  pitch: number;
  style: HolidayStyle;
  isValid: boolean;
}

/**
 * Polling state for generation status
 */
export interface GenerationPollingState {
  isPolling: boolean;
  generationId: string | null;
  pollCount: number;
  startTime: number | null;
  estimatedCompletion: number | null;
}

/**
 * Share modal state
 */
export interface ShareModalState {
  isOpen: boolean;
  generation: HolidayGenerationResponse | null;
  selectedPlatform: SharePlatform | null;
  trackingLink: string | null;
  shareUrl: string | null;
}

/**
 * What's New modal state for existing users
 */
export interface WhatsNewModalState {
  isOpen: boolean;
  hasSeenModal: boolean;
}

/**
 * Festive UI mode (feature flag)
 */
export interface FestiveUIConfig {
  enabled: boolean;              // Toggle festive enhancements on/off
  snowflakesEnabled: boolean;    // Animated snowflakes
  twinklingLightsEnabled: boolean;  // Twinkling lights on buttons
  festiveFontsEnabled: boolean;  // Holiday fonts
  animationsEnabled: boolean;    // Reveal animations, sparkles, etc.
}

// ============================================================================
// API Error Types
// ============================================================================

/**
 * Standard API error response
 */
export interface HolidayAPIError {
  error: string;                 // Error code (e.g., "INSUFFICIENT_CREDITS")
  message: string;               // Human-readable message
  details?: Record<string, any>; // Additional error details
}

/**
 * Specific error codes for holiday feature
 */
export type HolidayErrorCode =
  | 'INSUFFICIENT_CREDITS'
  | 'INVALID_ADDRESS'
  | 'STREET_VIEW_UNAVAILABLE'
  | 'GENERATION_FAILED'
  | 'DAILY_LIMIT_REACHED'
  | 'INVALID_GENERATION_ID'
  | 'UNAUTHORIZED'
  | 'RATE_LIMITED'
  | 'FEATURE_DISABLED';

// ============================================================================
// Utility Types
// ============================================================================

/**
 * Helper type for async API calls
 */
export type AsyncResult<T> = {
  data: T | null;
  error: HolidayAPIError | null;
  isLoading: boolean;
};

/**
 * Helper type for paginated responses
 */
export type PaginatedResponse<T> = {
  items: T[];
  total: number;
  limit: number;
  offset: number;
  hasMore: boolean;
};
