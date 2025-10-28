-- Additional RLS policies for comprehensive security

-- Service role bypass for backend operations
CREATE POLICY service_role_all ON users
    FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY service_role_all ON token_accounts
    FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY service_role_all ON generations
    FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY service_role_all ON rate_limits
    FOR ALL USING (auth.role() = 'service_role');

-- Allow users to insert their own generations (for tracking)
CREATE POLICY generations_update_own ON generations
    FOR UPDATE USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id AND credit_refunded = FALSE);

-- Grant execute permissions on functions
GRANT EXECUTE ON FUNCTION consume_credit(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION check_rate_limit(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION refund_credit(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_credit_balance(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION cleanup_old_rate_limits() TO service_role;

-- Create trigger for updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_token_accounts_updated_at BEFORE UPDATE ON token_accounts
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Comments
COMMENT ON POLICY service_role_all ON users IS 'Backend service full access';
COMMENT ON POLICY service_role_all ON token_accounts IS 'Backend service full access';
COMMENT ON POLICY service_role_all ON generations IS 'Backend service full access';
COMMENT ON POLICY service_role_all ON rate_limits IS 'Backend service full access';