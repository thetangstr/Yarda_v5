/**
 * Supabase Client Configuration
 *
 * Initializes Supabase client for authentication and database access.
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

// Create Supabase client with maximized session persistence
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    // Auto-refresh access token before expiry (default: 1 hour)
    autoRefreshToken: true,

    // Persist session in localStorage (survives browser close)
    persistSession: true,

    // Detect session from URL callback (for OAuth/magic link redirects)
    detectSessionInUrl: true,

    // Use PKCE flow (more secure and reliable than implicit flow)
    // PKCE uses query parameters instead of hash fragments
    flowType: 'pkce',

    // Use localStorage for maximum persistence (default, but being explicit)
    storage: typeof window !== 'undefined' ? window.localStorage : undefined,

    // Custom storage key for session isolation
    storageKey: 'yarda-auth-session',
  },
});

/**
 * Sign in with Google OAuth
 *
 * Redirects user to Google OAuth flow.
 * After authentication, Google redirects back to your app with the session.
 *
 * @param redirectTo - Optional redirect URL after successful authentication
 */
export async function signInWithGoogle(redirectTo?: string) {
  // Determine the correct origin for production vs development
  // IMPORTANT: Use explicit production URL to avoid Supabase redirecting to localhost
  const getOrigin = () => {
    if (typeof window === 'undefined') return 'https://yarda.pro';

    // Check if we're on Vercel preview or production
    const hostname = window.location.hostname;
    if (hostname.includes('.vercel.app')) {
      // On Vercel preview deployment
      return window.location.origin;
    } else if (hostname === 'yarda.pro' || hostname === 'www.yarda.pro') {
      // Production - use canonical URL
      return 'https://yarda.pro';
    } else if (hostname === 'localhost' || hostname === '127.0.0.1') {
      // Local development
      return window.location.origin;
    } else {
      // Fallback to production
      return 'https://yarda.pro';
    }
  };

  const origin = getOrigin();
  let callbackUrl = `${origin}/auth/callback`;

  // Add the redirect parameter if provided
  if (redirectTo) {
    const url = new URL(callbackUrl);
    url.searchParams.set('redirect', redirectTo);
    callbackUrl = url.toString();
  }

  // Log for debugging OAuth issues in production
  if (typeof window !== 'undefined') {
    console.log('[signInWithGoogle] Detected hostname:', window.location.hostname);
    console.log('[signInWithGoogle] Using origin:', origin);
    console.log('[signInWithGoogle] Callback URL:', callbackUrl);
    console.log('[signInWithGoogle] Redirect to:', redirectTo);
  }

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: callbackUrl,
      queryParams: {
        access_type: 'offline',
        prompt: 'consent',
      },
      // Use PKCE flow instead of hash flow for better reliability
      // PKCE uses query parameters instead of hash fragments
      skipBrowserRedirect: false,
    },
  });

  if (error) {
    console.error('[signInWithGoogle] OAuth error:', error);
    throw error;
  }

  console.log('[signInWithGoogle] OAuth initiated successfully');
  return data;
}

/**
 * Sign in with Apple OAuth
 *
 * Redirects user to Apple Sign In OAuth flow.
 * After authentication, Apple redirects back to your app with the session.
 *
 * @param redirectTo - Optional redirect URL after successful authentication
 */
export async function signInWithApple(redirectTo?: string) {
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'apple',
    options: {
      redirectTo: redirectTo || (typeof window !== 'undefined' ? `${window.location.origin}/auth/callback` : '/auth/callback'),
      scopes: 'name email',
    },
  });

  if (error) {
    throw error;
  }

  return data;
}

/**
 * Sign out current user
 */
export async function signOut() {
  const { error } = await supabase.auth.signOut();
  if (error) {
    throw error;
  }
}

/**
 * Get current session
 */
export async function getSession() {
  const { data: { session }, error } = await supabase.auth.getSession();
  if (error) {
    throw error;
  }
  return session;
}

/**
 * Get current user
 */
export async function getUser() {
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error) {
    throw error;
  }
  return user;
}

/**
 * Send magic link authentication email
 *
 * Sends a one-time authentication link to the user's email address.
 * User clicks the link in their email to authenticate without a password.
 *
 * @param email - User's email address (validated before calling)
 * @param redirectTo - Optional redirect URL after successful authentication (default: /auth/callback)
 * @returns Promise with user and session (both null until link is clicked)
 * @throws Error if rate limited (3 requests/hour) or email invalid
 *
 * @example
 * await sendMagicLink('user@example.com');
 * // User receives email with magic link
 * // Clicking link authenticates and redirects to /auth/callback
 */
export async function sendMagicLink(email: string, redirectTo?: string) {
  // Build callback URL with redirect parameter (similar to Google OAuth flow)
  let emailRedirectTo = typeof window !== 'undefined'
    ? `${window.location.origin}/auth/callback`
    : '/auth/callback';

  // Add the redirect parameter if provided
  if (redirectTo && typeof window !== 'undefined') {
    const url = new URL(emailRedirectTo, window.location.origin);
    url.searchParams.set('redirect', redirectTo);
    emailRedirectTo = url.toString();
  }

  const { data, error } = await supabase.auth.signInWithOtp({
    email: email,
    options: {
      emailRedirectTo: emailRedirectTo,
    },
  });

  if (error) {
    throw error;
  }

  return data;
}
