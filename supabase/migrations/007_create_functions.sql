-- Migration 007: Create database functions
-- Purpose: Atomic operations for token/trial management with row-level locking
-- Requirements: FR-011 (Atomic trial deduction), FR-021 (Atomic token deduction), FR-036 (Auto-reload trigger)

-- Function 1: get_token_balance
-- Purpose: Get current token balance for a user
CREATE OR REPLACE FUNCTION get_token_balance(p_user_id UUID)
RETURNS INTEGER AS $$
DECLARE
    v_balance INTEGER;
BEGIN
    SELECT balance INTO v_balance
    FROM users_token_accounts
    WHERE user_id = p_user_id;

    RETURN COALESCE(v_balance, 0);
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION get_token_balance IS 'Get current token balance for a user';

-- Function 2: deduct_token_atomic
-- Purpose: Atomically deduct 1 token with row-level locking (prevents race conditions)
-- Returns: TRUE if successful, FALSE if insufficient balance
CREATE OR REPLACE FUNCTION deduct_token_atomic(
    p_user_id UUID,
    p_description TEXT
)
RETURNS TABLE(success BOOLEAN, new_balance INTEGER, transaction_id UUID) AS $$
DECLARE
    v_account_id UUID;
    v_balance INTEGER;
    v_new_balance INTEGER;
    v_transaction_id UUID;
BEGIN
    -- Lock the token account row (prevents concurrent deductions)
    SELECT id, balance INTO v_account_id, v_balance
    FROM users_token_accounts
    WHERE user_id = p_user_id
    FOR UPDATE;

    -- Check if account exists
    IF v_account_id IS NULL THEN
        RETURN QUERY SELECT FALSE, 0::INTEGER, NULL::UUID;
        RETURN;
    END IF;

    -- Check if sufficient balance
    IF v_balance < 1 THEN
        RETURN QUERY SELECT FALSE, v_balance, NULL::UUID;
        RETURN;
    END IF;

    -- Deduct token
    v_new_balance := v_balance - 1;

    UPDATE users_token_accounts
    SET balance = v_new_balance,
        updated_at = NOW()
    WHERE user_id = p_user_id;

    -- Record transaction
    INSERT INTO users_token_transactions (
        user_id,
        token_account_id,
        amount,
        type,
        description,
        balance_after
    ) VALUES (
        p_user_id,
        v_account_id,
        -1,
        'deduction',
        p_description,
        v_new_balance
    ) RETURNING id INTO v_transaction_id;

    RETURN QUERY SELECT TRUE, v_new_balance, v_transaction_id;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION deduct_token_atomic IS 'Atomically deduct 1 token with FOR UPDATE lock (race condition safe)';

-- Function 3: add_tokens
-- Purpose: Add tokens to account (for purchases, refunds, auto-reload)
CREATE OR REPLACE FUNCTION add_tokens(
    p_user_id UUID,
    p_amount INTEGER,
    p_type VARCHAR(50),
    p_description TEXT,
    p_stripe_payment_intent_id VARCHAR(255) DEFAULT NULL
)
RETURNS TABLE(success BOOLEAN, new_balance INTEGER, transaction_id UUID) AS $$
DECLARE
    v_account_id UUID;
    v_balance INTEGER;
    v_new_balance INTEGER;
    v_transaction_id UUID;
    v_existing_transaction UUID;
BEGIN
    -- Check for idempotency (prevent duplicate credits)
    IF p_stripe_payment_intent_id IS NOT NULL THEN
        SELECT id INTO v_existing_transaction
        FROM users_token_transactions
        WHERE stripe_payment_intent_id = p_stripe_payment_intent_id;

        IF v_existing_transaction IS NOT NULL THEN
            -- Already processed, return existing transaction
            SELECT balance_after INTO v_new_balance
            FROM users_token_transactions
            WHERE id = v_existing_transaction;

            RETURN QUERY SELECT TRUE, v_new_balance, v_existing_transaction;
            RETURN;
        END IF;
    END IF;

    -- Lock the token account row
    SELECT id, balance INTO v_account_id, v_balance
    FROM users_token_accounts
    WHERE user_id = p_user_id
    FOR UPDATE;

    -- Check if account exists
    IF v_account_id IS NULL THEN
        RETURN QUERY SELECT FALSE, 0::INTEGER, NULL::UUID;
        RETURN;
    END IF;

    -- Add tokens
    v_new_balance := v_balance + p_amount;

    UPDATE users_token_accounts
    SET balance = v_new_balance,
        updated_at = NOW()
    WHERE user_id = p_user_id;

    -- Record transaction
    INSERT INTO users_token_transactions (
        user_id,
        token_account_id,
        amount,
        type,
        description,
        balance_after,
        stripe_payment_intent_id
    ) VALUES (
        p_user_id,
        v_account_id,
        p_amount,
        p_type,
        p_description,
        v_new_balance,
        p_stripe_payment_intent_id
    ) RETURNING id INTO v_transaction_id;

    RETURN QUERY SELECT TRUE, v_new_balance, v_transaction_id;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION add_tokens IS 'Add tokens to account (idempotent with stripe_payment_intent_id)';

-- Function 4: check_auto_reload_trigger
-- Purpose: Check if auto-reload should trigger after a token deduction
-- Returns: TRUE if auto-reload should trigger, FALSE otherwise
CREATE OR REPLACE FUNCTION check_auto_reload_trigger(p_user_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
    v_account RECORD;
BEGIN
    -- Get account configuration
    SELECT * INTO v_account
    FROM users_token_accounts
    WHERE user_id = p_user_id;

    -- Account not found
    IF v_account IS NULL THEN
        RETURN FALSE;
    END IF;

    -- Auto-reload not enabled
    IF NOT v_account.auto_reload_enabled THEN
        RETURN FALSE;
    END IF;

    -- Check if disabled due to failures (3 strikes rule)
    IF v_account.auto_reload_failure_count >= 3 THEN
        RETURN FALSE;
    END IF;

    -- Balance still above threshold
    IF v_account.balance >= v_account.auto_reload_threshold THEN
        RETURN FALSE;
    END IF;

    -- Check throttle (60 seconds since last reload)
    IF v_account.last_reload_at IS NOT NULL THEN
        IF EXTRACT(EPOCH FROM (NOW() - v_account.last_reload_at)) < 60 THEN
            RETURN FALSE; -- Throttled
        END IF;
    END IF;

    RETURN TRUE;
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION check_auto_reload_trigger IS 'Check if auto-reload should trigger (with 60s throttle)';

-- Function 5: deduct_trial_atomic
-- Purpose: Atomically deduct 1 trial credit with row-level locking
-- Returns: TRUE if successful, FALSE if no trial remaining
CREATE OR REPLACE FUNCTION deduct_trial_atomic(p_user_id UUID)
RETURNS TABLE(success BOOLEAN, trial_remaining INTEGER) AS $$
DECLARE
    v_trial_remaining INTEGER;
BEGIN
    -- Lock the user row
    SELECT users.trial_remaining INTO v_trial_remaining
    FROM users
    WHERE id = p_user_id
    FOR UPDATE;

    -- Check if user exists
    IF v_trial_remaining IS NULL THEN
        RETURN QUERY SELECT FALSE, 0::INTEGER;
        RETURN;
    END IF;

    -- Check if trial credits remaining
    IF v_trial_remaining < 1 THEN
        RETURN QUERY SELECT FALSE, 0::INTEGER;
        RETURN;
    END IF;

    -- Deduct trial credit
    UPDATE users
    SET trial_remaining = trial_remaining - 1,
        trial_used = trial_used + 1,
        updated_at = NOW()
    WHERE id = p_user_id;

    RETURN QUERY SELECT TRUE, (v_trial_remaining - 1)::INTEGER;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION deduct_trial_atomic IS 'Atomically deduct 1 trial credit with FOR UPDATE lock';

-- Function 6: refund_trial
-- Purpose: Refund trial credit when generation fails
CREATE OR REPLACE FUNCTION refund_trial(p_user_id UUID)
RETURNS TABLE(success BOOLEAN, trial_remaining INTEGER) AS $$
DECLARE
    v_trial_remaining INTEGER;
BEGIN
    -- Lock the user row
    SELECT users.trial_remaining INTO v_trial_remaining
    FROM users
    WHERE id = p_user_id
    FOR UPDATE;

    -- Check if user exists
    IF v_trial_remaining IS NULL THEN
        RETURN QUERY SELECT FALSE, 0::INTEGER;
        RETURN;
    END IF;

    -- Refund trial credit
    UPDATE users
    SET trial_remaining = trial_remaining + 1,
        trial_used = GREATEST(trial_used - 1, 0),
        updated_at = NOW()
    WHERE id = p_user_id;

    RETURN QUERY SELECT TRUE, (v_trial_remaining + 1)::INTEGER;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION refund_trial IS 'Refund trial credit when generation fails';
