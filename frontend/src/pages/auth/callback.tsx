/**
 * OAuth Callback Handler
 *
 * Handles the OAuth redirect from Supabase after Google authentication.
 * Exchanges the code for a session and redirects to the app.
 */

import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '@/lib/supabase';
import { useUserStore } from '@/store/userStore';
import { creditsAPI } from '@/lib/api';

export default function AuthCallback() {
  const router = useRouter();
  const { setUser, setAccessToken, setBalances } = useUserStore();
  const [error, setError] = useState<string | null>(null);

  /**
   * Fetch and sync ALL credits (trial, token, holiday) after user login
   * Uses unified credit API endpoint for atomic balance retrieval
   * This ensures the frontend Zustand store always has current credit balances
   */
  const syncAllCredits = async () => {
    try {
      console.log('[Auth Callback] Fetching unified credit balances...');
      const balances = await creditsAPI.getBalance();
      console.log('[Auth Callback] Unified balances response:', balances);

      // Update store with all credit balances (automatically updates user and tokenBalance)
      setBalances(balances);
      console.log('[Auth Callback] Updated store with all credit balances');
    } catch (err) {
      // Non-fatal error - user can still use app, just without updated credits
      // If this fails, credit fields will come from localStorage
      console.warn('[Auth Callback] Failed to fetch unified balances:', err);
    }
  };

  useEffect(() => {
    let authSubscription: { unsubscribe: () => void } | null = null;
    let processed = false; // Prevent double-processing

    const handleCallback = async () => {
      try {
        console.log('[Auth Callback] Starting OAuth callback handler');
        console.log('[Auth Callback] URL:', window.location.href);
        console.log('[Auth Callback] Search params:', window.location.search);
        console.log('[Auth Callback] Hash:', window.location.hash);

        // Listen for auth state changes - this is the proper way to handle OAuth callbacks
        const { data } = supabase.auth.onAuthStateChange(async (event, session) => {
          console.log('[Auth Callback] Auth state change:', event);
          console.log('[Auth Callback] Session exists:', !!session);

          if (event === 'SIGNED_IN' && session && !processed) {
            processed = true;
            console.log('[Auth Callback] Processing SIGNED_IN event');
            console.log('[Auth Callback] User ID:', session.user.id);
            console.log('[Auth Callback] User email:', session.user.email);

            // Store the access token
            setAccessToken(session.access_token);

            // Fetch user data from our users table
            if (session.user) {
              // Wait a moment for the database trigger to sync the user
              console.log('[Auth Callback] Waiting for database sync...');
              await new Promise(resolve => setTimeout(resolve, 1000));

              console.log('[Auth Callback] Querying users table...');
              const { data: userData, error: userError } = await supabase
                .from('users')
                .select('*')
                .eq('id', session.user.id)
                .single();

              // User not found in database - this is expected for new users
              // The database trigger will sync them within 1-2 seconds
              if (userError && userError.code === 'PGRST116') {
                console.log('[Auth Callback] User not yet in database (PGRST116) - will use default values and proceed');
                // Continue with default values below - don't block
              }

              // Extract Google profile data
              const googleMetadata = session.user.user_metadata;
              const avatarUrl = googleMetadata?.avatar_url || googleMetadata?.picture;
              const fullName = googleMetadata?.full_name || googleMetadata?.name;

              if (userError) {
                console.error('[Auth Callback] Error fetching user data:', userError);
                console.log('[Auth Callback] Using default user data (user will be synced by trigger)');
                // User might not be synced yet, use default values
                setUser({
                  id: session.user.id,
                  email: session.user.email!,
                  email_verified: session.user.email_confirmed_at !== null,
                  trial_remaining: 3,
                  trial_used: 0,
                  subscription_tier: 'free',
                  subscription_status: 'inactive',
                  created_at: session.user.created_at,
                  avatar_url: avatarUrl,
                  full_name: fullName,
                } as any);
              } else {
                console.log('[Auth Callback] Successfully fetched user data from database');
                // Use data from our users table + Google profile data
                setUser({
                  id: userData.id,
                  email: userData.email,
                  email_verified: userData.email_verified,
                  trial_remaining: userData.trial_remaining,
                  trial_used: userData.trial_used,
                  subscription_tier: userData.subscription_tier,
                  subscription_status: userData.subscription_status,
                  created_at: userData.created_at,
                  avatar_url: avatarUrl,
                  full_name: fullName,
                } as any);
              }

              // CRITICAL: Sync all credits after user is set
              // This ensures the frontend always has current credit balances (trial, token, holiday)
              await syncAllCredits();

              // Store in localStorage for persistence
              localStorage.setItem('access_token', session.access_token);
              const userStorage = localStorage.getItem('user-storage');
              if (userStorage) {
                const storage = JSON.parse(userStorage);
                storage.state.accessToken = session.access_token;
                localStorage.setItem('user-storage', JSON.stringify(storage));
              }
            }

            // Redirect to the home page or intended destination
            const redirectTo = router.query.redirect as string || '/';
            console.log('[Auth Callback] Redirecting to:', redirectTo);
            router.push(redirectTo);
          } else if (event === 'SIGNED_OUT') {
            console.log('[Auth Callback] User signed out');
          } else if (event === 'TOKEN_REFRESHED') {
            console.log('[Auth Callback] Token refreshed');
          }
        });

        authSubscription = data.subscription;

        // Also try to get existing session (for page refreshes or direct navigation with existing session)
        console.log('[Auth Callback] Checking for existing session...');
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();

        if (sessionError) {
          console.error('[Auth Callback] Error getting session:', sessionError);
        }

        if (session && !processed) {
          processed = true;
          console.log('[Auth Callback] Found existing session');
          // Already have a session, process it
          setAccessToken(session.access_token);

          const { data: userData, error: userError } = await supabase
            .from('users')
            .select('*')
            .eq('id', session.user.id)
            .single();

          // User not found in database - expected for new users
          // The database trigger will sync them within 1-2 seconds
          if (userError && userError.code === 'PGRST116') {
            console.log('[Auth Callback] User not yet in database for existing session - will create with default values');
            // Continue below with default values - don't block
            // Create user with default values while database trigger syncs
            const googleMetadata = session.user.user_metadata;
            setUser({
              id: session.user.id,
              email: session.user.email!,
              email_verified: session.user.email_confirmed_at !== null,
              trial_remaining: 3,
              trial_used: 0,
              subscription_tier: 'free',
              subscription_status: 'inactive',
              created_at: session.user.created_at,
              avatar_url: googleMetadata?.avatar_url || googleMetadata?.picture,
              full_name: googleMetadata?.full_name || googleMetadata?.name,
            } as any);
            await syncAllCredits();
            const redirectTo = router.query.redirect as string || '/';
            console.log('[Auth Callback] Redirecting to:', redirectTo);
            router.push(redirectTo);
            return;
          }

          if (userError) {
            console.error('[Auth Callback] Error fetching user for existing session:', userError);
          }

          if (userData) {
            console.log('[Auth Callback] Setting user data from existing session');
            const googleMetadata = session.user.user_metadata;
            setUser({
              id: userData.id,
              email: userData.email,
              email_verified: userData.email_verified,
              trial_remaining: userData.trial_remaining,
              trial_used: userData.trial_used,
              subscription_tier: userData.subscription_tier,
              subscription_status: userData.subscription_status,
              created_at: userData.created_at,
              avatar_url: googleMetadata?.avatar_url || googleMetadata?.picture,
              full_name: googleMetadata?.full_name || googleMetadata?.name,
            } as any);

            // CRITICAL: Sync all credits for existing session
            // This ensures the frontend always has current credit balances (trial, token, holiday)
            await syncAllCredits();
          }

          const redirectTo = router.query.redirect as string || '/';
          console.log('[Auth Callback] Redirecting to:', redirectTo);
          router.push(redirectTo);
        } else if (!window.location.hash && !window.location.search.includes('code=') && !window.location.search.includes('error=')) {
          // No session and no OAuth callback parameters - redirect to login after waiting
          console.log('[Auth Callback] No session or OAuth params found, will redirect to login in 3 seconds');
          setTimeout(() => {
            if (!processed) {
              console.log('[Auth Callback] No auth event received, redirecting to login');
              router.push('/login');
            }
          }, 3000);
        } else if (window.location.search.includes('error=')) {
          const urlParams = new URLSearchParams(window.location.search);
          const error = urlParams.get('error');
          const errorDescription = urlParams.get('error_description');
          console.error('[Auth Callback] OAuth error:', error, errorDescription);
          setError(errorDescription || error || 'Authentication failed');
          setTimeout(() => {
            router.push('/login');
          }, 3000);
        } else {
          console.log('[Auth Callback] Waiting for auth state change event...');
        }
      } catch (err: any) {
        console.error('[Auth Callback] Unexpected error:', err);
        console.error('[Auth Callback] Error stack:', err.stack);
        setError(err.message || 'Authentication failed');

        // Redirect to login after a delay
        setTimeout(() => {
          router.push('/login');
        }, 3000);
      }
    };

    handleCallback();

    // Cleanup function - MUST be returned directly from useEffect
    return () => {
      if (authSubscription) {
        authSubscription.unsubscribe();
      }
    };
  }, [router, setUser, setAccessToken]);

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="max-w-md w-full bg-white rounded-lg shadow-xl p-8">
          <div className="text-center">
            <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100 mb-4">
              <svg
                className="h-6 w-6 text-red-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              Authentication Failed
            </h2>
            <p className="text-gray-600 mb-4">{error}</p>
            <p className="text-sm text-gray-500">
              Redirecting to login page...
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full bg-white rounded-lg shadow-xl p-8">
        <div className="text-center">
          <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-blue-100 mb-4">
            <svg
              className="animate-spin h-6 w-6 text-blue-600"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              ></circle>
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              ></path>
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            Completing sign in...
          </h2>
          <p className="text-gray-600">
            Please wait while we set up your account
          </p>
        </div>
      </div>
    </div>
  );
}
