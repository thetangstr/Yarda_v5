-- Migration 006: Create rate_limits table
-- Purpose: Track API rate limiting per user per endpoint
-- Requirements: Rate limiting for API protection

-- Drop table if exists (for development only)
DROP TABLE IF EXISTS rate_limits CASCADE;

-- Create rate_limits table
CREATE TABLE rate_limits (
    -- Identity
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

    -- Rate Limit Details
    endpoint VARCHAR(255) NOT NULL,
    request_count INTEGER DEFAULT 0 NOT NULL,
    window_start TIMESTAMP WITH TIME ZONE NOT NULL,
    window_end TIMESTAMP WITH TIME ZONE NOT NULL,

    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,

    -- Ensure one record per user per endpoint per window
    UNIQUE(user_id, endpoint, window_start)
);

-- Create indexes
CREATE INDEX idx_rate_limits_user_endpoint ON rate_limits(user_id, endpoint);
CREATE INDEX idx_rate_limits_window ON rate_limits(window_end) WHERE window_end > NOW();

-- Add comments
COMMENT ON TABLE rate_limits IS 'API rate limiting tracking per user per endpoint';
COMMENT ON COLUMN rate_limits.endpoint IS 'API endpoint path (e.g., /generations/create)';
COMMENT ON COLUMN rate_limits.request_count IS 'Number of requests in current window';
COMMENT ON COLUMN rate_limits.window_start IS 'Rate limit window start time';
COMMENT ON COLUMN rate_limits.window_end IS 'Rate limit window end time';
