-- Migration 004: Create generations table
-- Purpose: Track landscape design generation requests and results
-- Requirements: FR-055 to FR-070 (Design Generation), FR-071 to FR-079 (Gallery)

-- Drop table if exists (for development only)
DROP TABLE IF EXISTS generations CASCADE;

-- Create generations table
CREATE TABLE generations (
    -- Identity
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

    -- Request Details
    address TEXT,
    image_url TEXT, -- Original uploaded image URL

    -- Generation Configuration
    request_params JSONB NOT NULL, -- Store complete request for reproducibility

    -- Status Tracking
    status VARCHAR(50) DEFAULT 'pending' NOT NULL CHECK (
        status IN ('pending', 'processing', 'completed', 'failed')
    ),

    -- Payment
    payment_type VARCHAR(50) NOT NULL CHECK (
        payment_type IN ('trial', 'token', 'subscription')
    ),
    tokens_deducted INTEGER DEFAULT 0 NOT NULL,

    -- Error Handling
    error_message TEXT,

    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    completed_at TIMESTAMP WITH TIME ZONE
);

-- Create indexes
CREATE INDEX idx_generations_user_created ON generations(user_id, created_at DESC);
CREATE INDEX idx_generations_status ON generations(status) WHERE status IN ('pending', 'processing');

-- Add comments
COMMENT ON TABLE generations IS 'Landscape design generation requests and results';
COMMENT ON COLUMN generations.request_params IS 'Complete request configuration as JSONB (areas, styles, prompts)';
COMMENT ON COLUMN generations.status IS 'Generation status: pending, processing, completed, failed';
COMMENT ON COLUMN generations.payment_type IS 'Payment method: trial, token, subscription';
COMMENT ON COLUMN generations.tokens_deducted IS 'Number of tokens deducted (0 for trial/subscription)';
