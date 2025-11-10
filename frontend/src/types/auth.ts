/**
 * Magic Link Authentication Types
 *
 * Type definitions for Supabase magic link (OTP) authentication flow
 * Based on contracts/supabase-otp-api.md
 */

/**
 * Request to send a magic link via email
 */
export interface SendMagicLinkRequest {
  email: string; // Required, validated email address
  options?: {
    emailRedirectTo?: string; // Callback URL (default: /auth/callback)
    shouldCreateUser?: boolean; // Allow new user creation (default: true)
    data?: object; // Optional user metadata
  };
}

/**
 * Response from sending a magic link
 */
export interface SendMagicLinkResponse {
  user: null; // No user object until link clicked
  session: null; // No session until link clicked
  error?: AuthError; // Error object if request fails
}

/**
 * Authentication error from Supabase
 */
export interface AuthError {
  message: string; // Human-readable error message
  status: number; // HTTP status code (400, 429, 500)
  code?: string; // Error code for programmatic handling
}

/**
 * Magic link error codes
 */
export type MagicLinkErrorCode =
  | 'otp_disabled' // Magic link auth disabled in Supabase settings
  | 'over_email_send_rate_limit' // Exceeded 3 emails/hour limit
  | 'otp_expired' // Magic link expired (> 1 hour old)
  | 'invalid_credentials'; // Token invalid or already used

/**
 * Magic link specific error
 */
export interface MagicLinkError {
  code: MagicLinkErrorCode;
  message: string; // User-friendly error message
  status: number; // HTTP status code
}

/**
 * URL parameters from magic link callback
 */
export interface MagicLinkCallbackParams {
  access_token: string; // JWT access token (1 hour validity)
  refresh_token: string; // Refresh token (30 days validity)
  expires_in: number; // Token expiration in seconds (3600)
  expires_at: number; // Unix timestamp of expiration
  token_type: 'bearer'; // OAuth 2.0 token type
  type: 'magiclink'; // Auth method identifier
}

/**
 * User session after magic link authentication
 */
export interface UserSession {
  access_token: string; // JWT token (1 hour validity)
  refresh_token: string; // Refresh token (30 days validity)
  expires_at: number; // Unix timestamp
  expires_in: number; // Seconds until expiration
  token_type: 'bearer'; // OAuth 2.0 standard
  user: {
    id: string; // User UUID
    email: string; // User email
    email_confirmed_at: string; // Email verification timestamp
    app_metadata: {
      provider: 'email'; // Auth provider identifier
      providers: ['email']; // Array of auth methods used
    };
    user_metadata: object; // Custom user data
    aud: string; // Audience (typically 'authenticated')
    created_at: string; // User creation timestamp
    updated_at: string; // Last update timestamp
  };
}
