-- Migration 021: Fix ambiguous column references in deduct_trials_batch() and refund_trials_batch()
-- Purpose: Fix SQL error "column reference 'trial_remaining' is ambiguous" in batch functions
-- Bug: Same bug as migration 020, but in the BATCH deduction functions
-- Date: 2025-11-13
-- Status: CRITICAL FIX - This is the function actually being called by generation endpoint!

-- Root Cause:
-- The generation endpoint uses deduct_trials_batch() (not deduct_trial_atomic())
-- for multi-area generations. This function has the same ambiguous column bug.

-- Function: deduct_trials_batch (FIXED)
-- Purpose: Atomically deduct multiple trial credits from user
CREATE OR REPLACE FUNCTION deduct_trials_batch(
    p_user_id UUID,
    p_amount INTEGER
)
RETURNS TABLE(success BOOLEAN, trial_remaining INTEGER) AS $$
DECLARE
    v_trial_remaining INTEGER;
BEGIN
    -- Validate amount
    IF p_amount < 1 THEN
        RAISE EXCEPTION 'p_amount must be >= 1, got %', p_amount;
    END IF;

    -- Lock the user row with FOR UPDATE
    SELECT u.trial_remaining INTO v_trial_remaining
    FROM users u
    WHERE u.id = p_user_id
    FOR UPDATE;

    -- Check if user exists
    IF v_trial_remaining IS NULL THEN
        RETURN QUERY SELECT FALSE, 0::INTEGER;
        RETURN;
    END IF;

    -- Check if sufficient trial credits remaining
    IF v_trial_remaining < p_amount THEN
        RETURN QUERY SELECT FALSE, v_trial_remaining::INTEGER;
        RETURN;
    END IF;

    -- Deduct all trial credits at once (FIXED: Added table alias 'u')
    UPDATE users u
    SET trial_remaining = u.trial_remaining - p_amount,
        trial_used = u.trial_used + p_amount,
        updated_at = NOW()
    WHERE u.id = p_user_id;

    RETURN QUERY SELECT TRUE, (v_trial_remaining - p_amount)::INTEGER;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION deduct_trials_batch IS 'Atomically deduct multiple trial credits (FIXED: ambiguous column references)';

-- Function: refund_trials_batch (FIXED)
-- Purpose: Refund multiple trial credits to user
CREATE OR REPLACE FUNCTION refund_trials_batch(
    p_user_id UUID,
    p_amount INTEGER
)
RETURNS TABLE(success BOOLEAN, trial_remaining INTEGER) AS $$
DECLARE
    v_trial_remaining INTEGER;
BEGIN
    -- Validate amount
    IF p_amount < 1 THEN
        RAISE EXCEPTION 'p_amount must be >= 1, got %', p_amount;
    END IF;

    -- Refund trial credits (FIXED: Added table alias 'u')
    UPDATE users u
    SET trial_remaining = u.trial_remaining + p_amount,
        trial_used = u.trial_used - p_amount,
        updated_at = NOW()
    WHERE u.id = p_user_id
    RETURNING u.trial_remaining INTO v_trial_remaining;

    -- Check if user exists
    IF v_trial_remaining IS NULL THEN
        RETURN QUERY SELECT FALSE, 0::INTEGER;
        RETURN;
    END IF;

    RETURN QUERY SELECT TRUE, v_trial_remaining::INTEGER;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION refund_trials_batch IS 'Refund multiple trial credits (FIXED: ambiguous column references)';

-- Verification: Test the batch functions
-- SELECT * FROM deduct_trials_batch('00000000-0000-0000-0000-000000000001', 1);
-- SELECT * FROM refund_trials_batch('00000000-0000-0000-0000-000000000001', 1);
