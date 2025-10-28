-- Create generations table for design history
CREATE TABLE IF NOT EXISTS generations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    status TEXT NOT NULL CHECK (status IN ('pending', 'processing', 'completed', 'failed')),

    -- Input data
    input_type TEXT NOT NULL CHECK (input_type IN ('photo', 'address')),
    input_photo_url TEXT,
    input_address TEXT,
    style TEXT NOT NULL,
    custom_prompt TEXT,

    -- Output data
    output_image_url TEXT,
    error_message TEXT,

    -- Metrics
    processing_time_ms INTEGER,
    credit_type TEXT CHECK (credit_type IN ('trial', 'token')),
    credit_refunded BOOLEAN DEFAULT FALSE NOT NULL,

    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,

    -- Ensure at least one input is provided
    CONSTRAINT valid_input CHECK (
        (input_type = 'photo' AND input_photo_url IS NOT NULL) OR
        (input_type = 'address' AND input_address IS NOT NULL)
    )
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_generations_user_created ON generations(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_generations_status ON generations(status)
    WHERE status IN ('pending', 'processing');

-- Enable RLS
ALTER TABLE generations ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY generations_select_own ON generations
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY generations_insert_own ON generations
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Comment
COMMENT ON TABLE generations IS 'Complete history of all design generation attempts';