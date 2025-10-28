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

-- Comment
COMMENT ON FUNCTION get_credit_balance(UUID) IS 'Gets user credit balance breakdown (trial_credits, token_balance, total_credits)';
