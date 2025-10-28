-- Create rate limits table for tracking generation attempts
CREATE TABLE IF NOT EXISTS rate_limits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    attempted_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_rate_limits_user_attempted ON rate_limits(user_id, attempted_at DESC);

-- Enable RLS (restricted - only backend can access)
ALTER TABLE rate_limits ENABLE ROW LEVEL SECURITY;

-- No RLS policies for users - only backend service can manage rate limits

-- Cleanup function for old records
CREATE OR REPLACE FUNCTION cleanup_old_rate_limits()
RETURNS void AS $$
BEGIN
    DELETE FROM rate_limits
    WHERE attempted_at < NOW() - INTERVAL '2 minutes';
END;
$$ LANGUAGE plpgsql;

-- Comment
COMMENT ON TABLE rate_limits IS 'Tracks generation attempts for rolling window rate limiting';
COMMENT ON FUNCTION cleanup_old_rate_limits() IS 'Removes rate limit records older than 2 minutes';