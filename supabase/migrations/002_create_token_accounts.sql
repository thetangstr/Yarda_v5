-- Migration 002: Create users_token_accounts table
-- Purpose: Token balance and auto-reload configuration for each user
-- Requirements: FR-017 to FR-027 (Token System), FR-034 to FR-042 (Auto-Reload)

-- Drop table if exists (for development only)
DROP TABLE IF EXISTS users_token_accounts CASCADE;

-- Create token accounts table
CREATE TABLE users_token_accounts (
    -- Identity
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,

    -- Token Balance (FR-017 to FR-027)
    balance INTEGER DEFAULT 0 NOT NULL CHECK (balance >= 0),

    -- Auto-Reload Configuration (FR-034 to FR-042)
    auto_reload_enabled BOOLEAN DEFAULT false NOT NULL,
    auto_reload_threshold INTEGER CHECK (
        auto_reload_threshold IS NULL OR
        (auto_reload_threshold >= 1 AND auto_reload_threshold <= 100)
    ),
    auto_reload_amount INTEGER CHECK (
        auto_reload_amount IS NULL OR
        auto_reload_amount >= 10
    ),
    auto_reload_failure_count INTEGER DEFAULT 0 NOT NULL CHECK (auto_reload_failure_count >= 0),
    last_reload_at TIMESTAMP WITH TIME ZONE,

    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Create indexes
CREATE UNIQUE INDEX idx_token_accounts_user_id ON users_token_accounts(user_id);
CREATE INDEX idx_token_accounts_auto_reload ON users_token_accounts(auto_reload_enabled)
    WHERE auto_reload_enabled = true;

-- Add comments
COMMENT ON TABLE users_token_accounts IS 'Token balance and auto-reload configuration (1:1 with users)';
COMMENT ON COLUMN users_token_accounts.balance IS 'Current token balance (must be >= 0, enforced by CHECK constraint)';
COMMENT ON COLUMN users_token_accounts.auto_reload_enabled IS 'Whether auto-reload is enabled (disabled after 3 failures)';
COMMENT ON COLUMN users_token_accounts.auto_reload_threshold IS 'Trigger auto-reload when balance drops below this value (1-100)';
COMMENT ON COLUMN users_token_accounts.auto_reload_amount IS 'Number of tokens to add on auto-reload (minimum 10)';
COMMENT ON COLUMN users_token_accounts.auto_reload_failure_count IS 'Consecutive auto-reload payment failures (disabled at 3)';
COMMENT ON COLUMN users_token_accounts.last_reload_at IS 'Last auto-reload trigger timestamp (for 60-second throttle)';
