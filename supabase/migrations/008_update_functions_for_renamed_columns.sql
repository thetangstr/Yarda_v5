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

-- Comments
COMMENT ON FUNCTION consume_credit(UUID) IS 'Atomically consumes one credit (trial first, then token) - Updated to use total_consumed';
COMMENT ON FUNCTION refund_credit(UUID) IS 'Refunds credit for failed generation - Updated to use total_consumed';
