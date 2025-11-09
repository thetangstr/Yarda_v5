'use client';

/**
 * Google One Tap Component
 *
 * Implements modern Google One Tap sign-in experience.
 * Shows a non-intrusive prompt for returning users to sign in with one click.
 *
 * Features:
 * - Auto sign-in for returning users
 * - Non-disruptive overlay prompt
 * - Integrates with Supabase Auth
 *
 * Note: Google One Tap has strict requirements and may not display on localhost:
 * - Requires active Google session in browser
 * - Works best on HTTPS domains with registered origins
 * - May show FedCM errors in console (expected behavior)
 * - Falls back silently to "Sign in with Google" button
 */

import { useEffect } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '@/lib/supabase';
import { useUserStore } from '@/store/userStore';

interface GoogleOneTapProps {
  /**
   * Google OAuth Client ID from environment variables
   */
  clientId: string;

  /**
   * Auto-select for returning users (enables silent sign-in)
   */
  autoSelect?: boolean;

  /**
   * Cancel prompt on tap outside (dismiss on click outside)
   */
  cancelOnTapOutside?: boolean;
}

export default function GoogleOneTap({
  clientId,
  autoSelect = true,
  cancelOnTapOutside = true,
}: GoogleOneTapProps) {
  const router = useRouter();
  const { setUser, setAccessToken } = useUserStore();

  useEffect(() => {
    // Only show One Tap on login/register pages
    const currentPath = router.pathname;
    if (!['/login', '/register', '/'].includes(currentPath)) {
      return;
    }

    // Prevent multiple initializations
    let initialized = false;

    // Check if user is already logged in
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        // User already logged in, don't show One Tap
        return;
      }

      if (initialized) {
        return;
      }

      // Initialize Google One Tap
      if (window.google?.accounts?.id) {
        initialized = true;
        initializeOneTap();
      } else {
        // Wait for Google Identity Services to load
        let attempts = 0;
        const checkGoogle = setInterval(() => {
          attempts++;
          if (window.google?.accounts?.id && !initialized) {
            clearInterval(checkGoogle);
            initialized = true;
            initializeOneTap();
          }
          // Stop after 50 attempts (5 seconds)
          if (attempts >= 50) {
            clearInterval(checkGoogle);
            console.log('Google Identity Services failed to load');
          }
        }, 100);
      }
    };

    checkSession();

    // Cleanup
    return () => {
      if (window.google?.accounts?.id && initialized) {
        try {
          window.google.accounts.id.cancel();
        } catch (e) {
          // Ignore cancel errors
        }
      }
    };
  }, [router.pathname]);

  const initializeOneTap = () => {
    if (!window.google?.accounts?.id) return;

    try {
      window.google.accounts.id.initialize({
        client_id: clientId,
        callback: handleCredentialResponse,
        auto_select: autoSelect,
        cancel_on_tap_outside: cancelOnTapOutside,
        context: 'signin',
        ux_mode: 'popup',
        itp_support: true,
      });

      // Display the One Tap prompt
      // Note: The callback parameter is optional and can cause FedCM conflicts
      // One Tap will display silently if conditions are met
      window.google.accounts.id.prompt();
    } catch (error) {
      console.error('Error initializing Google One Tap:', error);
    }
  };

  const handleCredentialResponse = async (response: any) => {
    try {
      const idToken = response.credential;

      // Sign in to Supabase using Google ID token
      const { data, error } = await supabase.auth.signInWithIdToken({
        provider: 'google',
        token: idToken,
      });

      if (error) {
        console.error('Supabase sign-in error:', error);
        throw error;
      }

      if (!data.user) {
        throw new Error('No user returned from Supabase');
      }

      // Store the access token
      setAccessToken(data.session?.access_token || '');

      // Wait for database trigger to sync
      await new Promise(resolve => setTimeout(resolve, 500));

      // Fetch user data from our users table
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('*')
        .eq('id', data.user.id)
        .single();

      // Extract Google profile data
      const googleMetadata = data.user.user_metadata;
      const avatarUrl = googleMetadata?.avatar_url || googleMetadata?.picture;
      const fullName = googleMetadata?.full_name || googleMetadata?.name;

      if (userError || !userData) {
        // User might not be synced yet, use default values
        setUser({
          id: data.user.id,
          email: data.user.email!,
          email_verified: true, // Google accounts are always verified
          trial_remaining: 3,
          trial_used: 0,
          subscription_tier: 'free',
          subscription_status: 'inactive',
          created_at: data.user.created_at,
          avatar_url: avatarUrl,
          full_name: fullName,
        } as any);
      } else {
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

      // Store in localStorage for persistence
      if (data.session) {
        localStorage.setItem('access_token', data.session.access_token);
        const userStorage = localStorage.getItem('user-storage');
        if (userStorage) {
          const storage = JSON.parse(userStorage);
          storage.state.accessToken = data.session.access_token;
          localStorage.setItem('user-storage', JSON.stringify(storage));
        }
      }

      // Redirect to generate page
      router.push('/generate');
    } catch (error) {
      console.error('Error handling Google One Tap:', error);
      // Don't show error to user - One Tap should fail silently
      // User can still use the manual "Sign in with Google" button
    }
  };

  // One Tap renders nothing - it's managed by Google's library
  return null;
}
