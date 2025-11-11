-- Migration 013: Add batch deduction functions
--
-- BUGFIX-2025-11-10: Prevent negative balances when deducting multiple credits/tokens
-- for multi-area generations.
--
-- The previous approach called single-credit deduction functions in a loop,
-- which allowed race conditions resulting in negative balances.
--
-- This migration adds batch deduction functions that check and deduct
-- ALL credits/tokens in ONE atomic transaction.

-- ==============================================================================
-- FUNCTION: deduct_trials_batch
-- ==============================================================================
-- Atomically deduct multiple trial credits from user.
--
-- This is CRITICAL for multi-area generations to prevent negative trial_remaining.
-- The entire check + deduction happens in ONE atomic transaction with FOR UPDATE lock.
--
-- Args:
--   p_user_id: User UUID
--   p_amount: Number of trial credits to deduct (must be >= 1)
--
-- Returns:
--   success: TRUE if all credits deducted successfully, FALSE if insufficient
--   trial_remaining: Credits remaining after deduction
--
-- Example:
--   SELECT * FROM deduct_trials_batch('user-uuid', 3);
--   => { success: TRUE, trial_remaining: 0 }
-- ==============================================================================
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
    SELECT users.trial_remaining INTO v_trial_remaining
    FROM users
    WHERE id = p_user_id
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

    -- Deduct all trial credits at once
    UPDATE users
    SET trial_remaining = trial_remaining - p_amount,
        trial_used = trial_used + p_amount,
        updated_at = NOW()
    WHERE id = p_user_id;

    RETURN QUERY SELECT TRUE, (v_trial_remaining - p_amount)::INTEGER;
END;
$$ LANGUAGE plpgsql;

-- ==============================================================================
-- FUNCTION: refund_trials_batch
-- ==============================================================================
-- Refund multiple trial credits to user (when multi-area generation fails).
--
-- Args:
--   p_user_id: User UUID
--   p_amount: Number of trial credits to refund
--
-- Returns:
--   success: TRUE if refund succeeded
--   trial_remaining: Credits remaining after refund
--
-- Example:
--   SELECT * FROM refund_trials_batch('user-uuid', 3);
-- ==============================================================================
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

    -- Refund trial credits
    UPDATE users
    SET trial_remaining = trial_remaining + p_amount,
        trial_used = trial_used - p_amount,
        updated_at = NOW()
    WHERE id = p_user_id
    RETURNING trial_remaining INTO v_trial_remaining;

    -- Check if user exists
    IF v_trial_remaining IS NULL THEN
        RETURN QUERY SELECT FALSE, 0::INTEGER;
        RETURN;
    END IF;

    RETURN QUERY SELECT TRUE, v_trial_remaining::INTEGER;
END;
$$ LANGUAGE plpgsql;

-- ==============================================================================
-- CONSTRAINT: Enforce non-negative trial_remaining
-- ==============================================================================
-- This constraint MUST exist to prevent negative balances.
-- If it doesn't exist, add it. If it was disabled, re-enable it.
-- ==============================================================================
DO $$
BEGIN
    -- Drop existing constraint if it exists
    ALTER TABLE users DROP CONSTRAINT IF EXISTS users_trial_remaining_check;

    -- Add constraint to prevent negative trial_remaining
    ALTER TABLE users ADD CONSTRAINT users_trial_remaining_check
        CHECK (trial_remaining >= 0);

    RAISE NOTICE 'Added constraint: users_trial_remaining_check';
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Constraint already exists or error: %', SQLERRM;
END $$;

-- ==============================================================================
-- CONSTRAINT: Enforce non-negative token balance
-- ==============================================================================
-- This constraint should already exist from migration 002, but we'll verify it.
-- ==============================================================================
DO $$
BEGIN
    -- Drop existing constraint if it exists
    ALTER TABLE users_token_accounts DROP CONSTRAINT IF EXISTS users_token_accounts_balance_check;

    -- Add constraint to prevent negative balance
    ALTER TABLE users_token_accounts ADD CONSTRAINT users_token_accounts_balance_check
        CHECK (balance >= 0);

    RAISE NOTICE 'Added constraint: users_token_accounts_balance_check';
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Constraint already exists or error: %', SQLERRM;
END $$;

-- ==============================================================================
-- DATA FIX: Reset any existing negative balances to 0
-- ==============================================================================
-- If negative balances exist in staging/production, reset them to 0.
-- Log these users for investigation.
-- ==============================================================================

-- Fix negative trial_remaining
UPDATE users
SET trial_remaining = 0,
    updated_at = NOW()
WHERE trial_remaining < 0
RETURNING id, email, trial_remaining;

-- Fix negative token balances
UPDATE users_token_accounts
SET balance = 0,
    updated_at = NOW()
WHERE balance < 0
RETURNING user_id, balance;

-- Log completion
DO $$
BEGIN
    RAISE NOTICE 'Migration 013 completed: Added batch deduction functions and fixed negative balances';
END $$;
