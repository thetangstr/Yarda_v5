-- Migration 003: Create users_token_transactions table
-- Purpose: Complete audit trail of all token operations
-- Requirements: FR-020 (Idempotency), FR-025 (Transaction Recording), FR-028 to FR-033 (Transaction History)

-- Drop table if exists (for development only)
DROP TABLE IF EXISTS users_token_transactions CASCADE;

-- Create token transactions table
CREATE TABLE users_token_transactions (
    -- Identity
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_account_id UUID NOT NULL REFERENCES users_token_accounts(id) ON DELETE CASCADE,

    -- Transaction Details
    amount INTEGER NOT NULL, -- Positive for credits, negative for deductions
    type VARCHAR(50) NOT NULL CHECK (
        type IN ('purchase', 'deduction', 'refund', 'auto_reload')
    ),
    description TEXT,
    balance_after INTEGER NOT NULL CHECK (balance_after >= 0),

    -- Idempotency (FR-020)
    stripe_payment_intent_id VARCHAR(255), -- UNIQUE when NOT NULL

    -- Timestamp
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Create indexes
CREATE INDEX idx_token_transactions_user_created ON users_token_transactions(user_id, created_at DESC);
CREATE INDEX idx_token_transactions_type ON users_token_transactions(type);

-- Create unique index on stripe_payment_intent_id (only for non-NULL values)
CREATE UNIQUE INDEX idx_token_transactions_stripe_payment_intent
    ON users_token_transactions(stripe_payment_intent_id)
    WHERE stripe_payment_intent_id IS NOT NULL;

-- Add comments
COMMENT ON TABLE users_token_transactions IS 'Immutable audit trail of all token operations';
COMMENT ON COLUMN users_token_transactions.amount IS 'Token amount: positive for credits (purchase/refund/auto_reload), negative for deductions';
COMMENT ON COLUMN users_token_transactions.type IS 'Transaction type: purchase, deduction, refund, auto_reload';
COMMENT ON COLUMN users_token_transactions.balance_after IS 'Token balance after this transaction (running balance)';
COMMENT ON COLUMN users_token_transactions.stripe_payment_intent_id IS 'Stripe payment intent ID for idempotency (prevents duplicate credits)';
