-- Migration 020: Fix ambiguous column references in deduct_trial_atomic() and refund_trial()
-- Purpose: Fix SQL error "column reference 'trial_remaining' is ambiguous"
-- Bug: https://github.com/anthropics/claude-code/issues/XXX
-- Date: 2025-11-13
-- Status: CRITICAL FIX - Blocks CUJ3, CUJ1, CUJ4, CUJ5, CUJ6

-- Root Cause:
-- The UPDATE statement in deduct_trial_atomic() uses column names directly in the SET clause,
-- which creates ambiguity with the declared variable v_trial_remaining.
-- PostgreSQL cannot determine if "trial_remaining" refers to:
--   1. The column users.trial_remaining
--   2. The variable v_trial_remaining
--
-- Solution: Add table alias 'u' to disambiguate column references

-- Function 5: deduct_trial_atomic (FIXED)
-- Purpose: Atomically deduct 1 trial credit with row-level locking
-- Returns: TRUE if successful, FALSE if no trial remaining
CREATE OR REPLACE FUNCTION deduct_trial_atomic(p_user_id UUID)
RETURNS TABLE(success BOOLEAN, trial_remaining INTEGER) AS $$
DECLARE
    v_trial_remaining INTEGER;
BEGIN
    -- Lock the user row
    SELECT u.trial_remaining INTO v_trial_remaining
    FROM users u
    WHERE u.id = p_user_id
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

    -- Deduct trial credit (FIXED: Added table alias 'u' to disambiguate)
    UPDATE users u
    SET trial_remaining = u.trial_remaining - 1,
        trial_used = u.trial_used + 1,
        updated_at = NOW()
    WHERE u.id = p_user_id;

    RETURN QUERY SELECT TRUE, (v_trial_remaining - 1)::INTEGER;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION deduct_trial_atomic IS 'Atomically deduct 1 trial credit with FOR UPDATE lock (FIXED: ambiguous column references)';

-- Function 6: refund_trial (FIXED)
-- Purpose: Refund trial credit when generation fails
CREATE OR REPLACE FUNCTION refund_trial(p_user_id UUID)
RETURNS TABLE(success BOOLEAN, trial_remaining INTEGER) AS $$
DECLARE
    v_trial_remaining INTEGER;
BEGIN
    -- Lock the user row
    SELECT u.trial_remaining INTO v_trial_remaining
    FROM users u
    WHERE u.id = p_user_id
    FOR UPDATE;

    -- Check if user exists
    IF v_trial_remaining IS NULL THEN
        RETURN QUERY SELECT FALSE, 0::INTEGER;
        RETURN;
    END IF;

    -- Refund trial credit (FIXED: Added table alias 'u' to disambiguate)
    UPDATE users u
    SET trial_remaining = u.trial_remaining + 1,
        trial_used = GREATEST(u.trial_used - 1, 0),
        updated_at = NOW()
    WHERE u.id = p_user_id;

    RETURN QUERY SELECT TRUE, (v_trial_remaining + 1)::INTEGER;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION refund_trial IS 'Refund trial credit when generation fails (FIXED: ambiguous column references)';

-- Verification: Test the functions
-- SELECT * FROM deduct_trial_atomic('00000000-0000-0000-0000-000000000001');
-- SELECT * FROM refund_trial('00000000-0000-0000-0000-000000000001');
