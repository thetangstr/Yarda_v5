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
  // Always redirect to /auth/callback for OAuth handling
  // Pass the intended final destination as a query parameter
  let callbackUrl = typeof window !== 'undefined'
    ? `${window.location.origin}/auth/callback`
    : '/auth/callback';

  // Add the redirect parameter if provided
  if (redirectTo) {
    const url = new URL(callbackUrl, window.location.origin);
    url.searchParams.set('redirect', redirectTo);
    callbackUrl = url.toString();
  }

  // Log for debugging OAuth issues in production
  if (typeof window !== 'undefined') {
    console.log('[signInWithGoogle] Window origin:', window.location.origin);
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
