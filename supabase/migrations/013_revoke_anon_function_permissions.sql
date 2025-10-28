-- Revoke EXECUTE permissions from anon role on sensitive functions
-- Unauthenticated users should not be able to call credit and rate limit functions
-- Reference: Security best practice - restrict function access to authenticated users only

-- Revoke from anon role (unauthenticated users)
REVOKE EXECUTE ON FUNCTION consume_credit(UUID) FROM anon;
REVOKE EXECUTE ON FUNCTION check_rate_limit(UUID) FROM anon;
REVOKE EXECUTE ON FUNCTION refund_credit(UUID) FROM anon;
REVOKE EXECUTE ON FUNCTION get_credit_balance(UUID) FROM anon;

-- Ensure authenticated role still has access (should already be granted, but explicit is better)
GRANT EXECUTE ON FUNCTION consume_credit(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION check_rate_limit(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION refund_credit(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_credit_balance(UUID) TO authenticated;

-- Service role should retain full access
GRANT EXECUTE ON FUNCTION consume_credit(UUID) TO service_role;
GRANT EXECUTE ON FUNCTION check_rate_limit(UUID) TO service_role;
GRANT EXECUTE ON FUNCTION refund_credit(UUID) TO service_role;
GRANT EXECUTE ON FUNCTION get_credit_balance(UUID) TO service_role;
GRANT EXECUTE ON FUNCTION cleanup_old_rate_limits() TO service_role;

-- Comment
COMMENT ON MIGRATION IS 'Security hardening: Revoke function EXECUTE permissions from anon role to prevent unauthenticated function calls';
