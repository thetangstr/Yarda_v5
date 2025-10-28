-- Fix function search paths for SECURITY DEFINER functions
-- This prevents search_path manipulation attacks
-- Reference: https://supabase.com/docs/guides/database/database-linter?lint=0011_function_search_path_mutable

-- 1. Fix consume_credit function
CREATE OR REPLACE FUNCTION consume_credit(p_user_id UUID)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
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
$$;

-- 2. Fix check_rate_limit function
CREATE OR REPLACE FUNCTION check_rate_limit(p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_count INTEGER;
BEGIN
    -- Count attempts in last 60 seconds (rolling window)
    SELECT COUNT(*) INTO v_count
    FROM rate_limits
    WHERE user_id = p_user_id
    AND attempted_at > NOW() - INTERVAL '60 seconds';

    -- Return true if under limit
    RETURN v_count < 3;
END;
$$;

-- 3. Fix refund_credit function
CREATE OR REPLACE FUNCTION refund_credit(p_generation_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
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
$$;

-- 4. Fix get_credit_balance function
CREATE OR REPLACE FUNCTION get_credit_balance(p_user_id UUID)
RETURNS TABLE(trial_credits INTEGER, token_balance INTEGER, total_available INTEGER)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
    RETURN QUERY
    SELECT
        COALESCE(u.trial_credits, 0) as trial_credits,
        COALESCE(t.balance, 0) as token_balance,
        COALESCE(u.trial_credits, 0) + COALESCE(t.balance, 0) as total_available
    FROM users u
    LEFT JOIN token_accounts t ON t.user_id = u.id
    WHERE u.id = p_user_id;
END;
$$;

-- 5. Fix handle_new_user function
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
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
$$;

-- 6. Fix cleanup_old_rate_limits function (change to SECURITY DEFINER for consistency)
CREATE OR REPLACE FUNCTION cleanup_old_rate_limits()
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
    DELETE FROM rate_limits
    WHERE attempted_at < NOW() - INTERVAL '2 minutes';
END;
$$;

-- 7. Fix update_updated_at_column trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;

-- Comment
COMMENT ON MIGRATION IS 'Security hardening: Set explicit search_path on all SECURITY DEFINER functions to prevent search_path manipulation attacks';
