-- Create token accounts table for future paid credits
CREATE TABLE IF NOT EXISTS token_accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    balance INTEGER DEFAULT 0 NOT NULL CHECK (balance >= 0),
    lifetime_purchased INTEGER DEFAULT 0 NOT NULL,
    lifetime_consumed INTEGER DEFAULT 0 NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    UNIQUE(user_id)
);

-- Create indexes
CREATE UNIQUE INDEX IF NOT EXISTS idx_token_accounts_user_id ON token_accounts(user_id);

-- Enable RLS
ALTER TABLE token_accounts ENABLE ROW LEVEL SECURITY;

-- RLS Policy - users can only see their own token account
CREATE POLICY token_accounts_select_own ON token_accounts
    FOR SELECT USING (auth.uid() = user_id);

-- Comment
COMMENT ON TABLE token_accounts IS 'Manages paid token balances for users';