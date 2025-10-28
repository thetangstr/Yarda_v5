-- ============================================================================
-- User Story 5: Token Account Management - Combined Migrations
-- ============================================================================
-- This script combines migrations 007-010 for easy application
-- Run this in Supabase SQL Editor:
-- https://app.supabase.com/project/ynsfmvonkoodmqfkukge/sql
-- ============================================================================

-- ============================================================================
-- MIGRATION 007: Rename token account columns
-- ============================================================================
-- Rename token account columns to match API expectations

ALTER TABLE token_accounts
  RENAME COLUMN lifetime_purchased TO total_purchased;

ALTER TABLE token_accounts
  RENAME COLUMN lifetime_consumed TO total_consumed;

COMMENT ON TABLE token_accounts IS 'Manages paid token balances for users. total_purchased tracks cumulative purchases, total_consumed tracks cumulative usage.';

-- ============================================================================
-- MIGRATION 008: Update functions for renamed columns
-- ============================================================================

-- Update consume_credit function to use renamed columns
CREATE OR REPLACE FUNCTION consume_credit(p_user_id UUID)
RETURNS TEXT AS $$
DECLARE
    v_trial_credits INTEGER;
    v_token_balance INTEGER;
BEGIN
    -- Lock user row for update
    SELECT trial_credits INTO v_trial_credits
    FROM users WHERE id = p_user_id FOR UPDATE;

    -- Check trial credits first (priority)
    IF v_trial_credits > 0 THEN
        UPDATE users SET
            trial_credits = trial_credits - 1,
            updated_at = NOW()
        WHERE id = p_user_id;
        RETURN 'trial';
    END IF;

    -- Check token balance
    SELECT balance INTO v_token_balance
    FROM token_accounts WHERE user_id = p_user_id FOR UPDATE;

    IF v_token_balance > 0 THEN
        UPDATE token_accounts SET
            balance = balance - 1,
            total_consumed = total_consumed + 1,
            updated_at = NOW()
        WHERE user_id = p_user_id;
        RETURN 'token';
    END IF;

    -- No credits available
    RAISE EXCEPTION 'Insufficient credits';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update refund_credit function to use renamed columns
CREATE OR REPLACE FUNCTION refund_credit(p_generation_id UUID)
RETURNS VOID AS $$
DECLARE
    v_user_id UUID;
    v_credit_type TEXT;
    v_already_refunded BOOLEAN;
BEGIN
    -- Get generation details
    SELECT user_id, credit_type, credit_refunded
    INTO v_user_id, v_credit_type, v_already_refunded
    FROM generations
    WHERE id = p_generation_id;

    -- Check if already refunded
    IF v_already_refunded THEN
        RETURN;
    END IF;

    -- Refund based on credit type
    IF v_credit_type = 'trial' THEN
        UPDATE users SET
            trial_credits = trial_credits + 1,
            updated_at = NOW()
        WHERE id = v_user_id;
    ELSIF v_credit_type = 'token' THEN
        UPDATE token_accounts SET
            balance = balance + 1,
            total_consumed = total_consumed - 1,
            updated_at = NOW()
        WHERE user_id = v_user_id;
    END IF;

    -- Mark as refunded
    UPDATE generations SET
        credit_refunded = TRUE
    WHERE id = p_generation_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION consume_credit(UUID) IS 'Atomically consumes one credit (trial first, then token) - Updated to use total_consumed';
COMMENT ON FUNCTION refund_credit(UUID) IS 'Refunds credit for failed generation - Updated to use total_consumed';

-- ============================================================================
-- MIGRATION 009: Update get_credit_balance function
-- ============================================================================

-- Update get_credit_balance function to return total_credits instead of total_available
CREATE OR REPLACE FUNCTION get_credit_balance(p_user_id UUID)
RETURNS TABLE(trial_credits INTEGER, token_balance INTEGER, total_credits INTEGER) AS $$
BEGIN
    RETURN QUERY
    SELECT
        COALESCE(u.trial_credits, 0) as trial_credits,
        COALESCE(t.balance, 0) as token_balance,
        COALESCE(u.trial_credits, 0) + COALESCE(t.balance, 0) as total_credits
    FROM users u
    LEFT JOIN token_accounts t ON t.user_id = u.id
    WHERE u.id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION get_credit_balance(UUID) IS 'Gets user credit balance breakdown (trial_credits, token_balance, total_credits)';

-- ============================================================================
-- MIGRATION 010: Create token account trigger
-- ============================================================================

-- Function to automatically create token account when user is created in auth.users
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    -- Create user record in public.users table
    INSERT INTO public.users (id, email)
    VALUES (NEW.id, NEW.email)
    ON CONFLICT (id) DO NOTHING;

    -- Create token account for new user
    INSERT INTO public.token_accounts (user_id, balance, total_purchased, total_consumed)
    VALUES (NEW.id, 0, 0, 0)
    ON CONFLICT (user_id) DO NOTHING;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger on auth.users table
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION handle_new_user();

COMMENT ON FUNCTION handle_new_user() IS 'Automatically creates user record and token account when new auth user is created';

-- ============================================================================
-- VERIFICATION QUERIES (optional - uncomment to test)
-- ============================================================================

-- Verify columns renamed
-- SELECT column_name, data_type
-- FROM information_schema.columns
-- WHERE table_name = 'token_accounts'
-- ORDER BY ordinal_position;

-- Test get_credit_balance function
-- SELECT * FROM get_credit_balance('<your-user-id>');

-- Verify trigger created
-- SELECT trigger_name, event_manipulation, event_object_table
-- FROM information_schema.triggers
-- WHERE trigger_name = 'on_auth_user_created';

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================
-- All User Story 5 database changes have been applied
-- Next steps:
-- 1. Test user registration to verify automatic token account creation
-- 2. Run integration tests in backend/tests/integration/test_token_account.py
-- 3. Verify API endpoints: GET /api/credits/balance and /api/credits/token-account
-- ============================================================================
