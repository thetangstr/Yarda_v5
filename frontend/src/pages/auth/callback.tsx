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

export default function AuthCallback() {
  const router = useRouter();
  const { setUser, setAccessToken } = useUserStore();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const handleCallback = async () => {
      try {
        // Listen for auth state changes - this is the proper way to handle OAuth callbacks
        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
          console.log('Auth state change:', event, session);

          if (event === 'SIGNED_IN' && session) {
            // Store the access token
            setAccessToken(session.access_token);

            // Fetch user data from our users table
            if (session.user) {
              // Wait a moment for the database trigger to sync the user
              await new Promise(resolve => setTimeout(resolve, 500));

              const { data: userData, error: userError } = await supabase
                .from('users')
                .select('*')
                .eq('id', session.user.id)
                .single();

              // Extract Google profile data
              const googleMetadata = session.user.user_metadata;
              const avatarUrl = googleMetadata?.avatar_url || googleMetadata?.picture;
              const fullName = googleMetadata?.full_name || googleMetadata?.name;

              if (userError) {
                console.error('Error fetching user data:', userError);
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
              localStorage.setItem('access_token', session.access_token);
              const userStorage = localStorage.getItem('user-storage');
              if (userStorage) {
                const storage = JSON.parse(userStorage);
                storage.state.accessToken = session.access_token;
                localStorage.setItem('user-storage', JSON.stringify(storage));
              }
            }

            // Clean up subscription
            subscription.unsubscribe();

            // Redirect to the generate page or intended destination
            const redirectTo = router.query.redirect as string || '/generate';
            router.push(redirectTo);
          } else if (event === 'SIGNED_OUT' || event === 'USER_DELETED') {
            subscription.unsubscribe();
            setError('Authentication failed');
            setTimeout(() => {
              router.push('/login');
            }, 2000);
          }
        });

        // Also try to get existing session (for page refreshes)
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          // Trigger the same logic
          setAccessToken(session.access_token);

          const { data: userData } = await supabase
            .from('users')
            .select('*')
            .eq('id', session.user.id)
            .single();

          if (userData) {
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
          }

          const redirectTo = router.query.redirect as string || '/generate';
          router.push(redirectTo);
        }

        // Cleanup function
        return () => {
          subscription?.unsubscribe();
        };
      } catch (err: any) {
        console.error('OAuth callback error:', err);
        setError(err.message || 'Authentication failed');

        // Redirect to login after a delay
        setTimeout(() => {
          router.push('/login');
        }, 3000);
      }
    };

    handleCallback();
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
