-- Migration 013: Auth user sync trigger
-- Purpose: Automatically sync auth.users to public.users on OAuth sign-in
-- Requirements: FR-002 Google OAuth integration
-- Related: CLAUDE.md line 32 - "Database trigger auto-syncs auth.users to public.users"

-- Function to sync auth.users to public.users
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Insert or update user in public.users table
  INSERT INTO public.users (
    id,
    email,
    email_verified,
    trial_remaining,
    trial_used,
    subscription_status,
    subscription_tier,
    created_at,
    updated_at
  )
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.email_confirmed_at IS NOT NULL, false),
    3,  -- Default: 3 trial credits for new users
    0,  -- Default: 0 used
    NULL,  -- No subscription by default
    NULL,  -- No subscription tier by default
    NOW(),
    NOW()
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    email_verified = EXCLUDED.email_verified,
    updated_at = NOW();

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION public.handle_new_user IS 'Sync auth.users to public.users on OAuth sign-in';

-- Trigger to call handle_new_user on auth.users insert
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

COMMENT ON TRIGGER on_auth_user_created ON auth.users IS 'Auto-sync new OAuth users to public.users table';
