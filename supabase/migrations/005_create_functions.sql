-- Function to consume credit atomically
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
            lifetime_consumed = lifetime_consumed + 1,
            updated_at = NOW()
        WHERE user_id = p_user_id;
        RETURN 'token';
    END IF;

    -- No credits available
    RAISE EXCEPTION 'Insufficient credits';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check rate limit
CREATE OR REPLACE FUNCTION check_rate_limit(p_user_id UUID)
RETURNS BOOLEAN AS $$
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to refund credit
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
            lifetime_consumed = lifetime_consumed - 1,
            updated_at = NOW()
        WHERE user_id = v_user_id;
    END IF;

    -- Mark as refunded
    UPDATE generations SET
        credit_refunded = TRUE
    WHERE id = p_generation_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get credit balance
CREATE OR REPLACE FUNCTION get_credit_balance(p_user_id UUID)
RETURNS TABLE(trial_credits INTEGER, token_balance INTEGER, total_available INTEGER) AS $$
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Comments
COMMENT ON FUNCTION consume_credit(UUID) IS 'Atomically consumes one credit (trial first, then token)';
COMMENT ON FUNCTION check_rate_limit(UUID) IS 'Checks if user is under rate limit (3 per minute)';
COMMENT ON FUNCTION refund_credit(UUID) IS 'Refunds credit for failed generation';
COMMENT ON FUNCTION get_credit_balance(UUID) IS 'Gets user credit balance breakdown';