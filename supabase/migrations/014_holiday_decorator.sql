-- ============================================================================
-- Migration: 014_holiday_decorator.sql
-- Feature: Holiday Decorator - Viral Marketing Feature
-- Date: 2025-11-10
-- Branch: 007-holiday-decorator
-- ============================================================================
-- Description: Add holiday credit system, generation tracking, social sharing,
--              and email nurture list for holiday-themed viral marketing.
-- ============================================================================

-- ============================================================================
-- SECTION 1: Extend Users Table
-- ============================================================================

-- Add holiday credits tracking to existing users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS holiday_credits INTEGER DEFAULT 0 CHECK (holiday_credits >= 0);
ALTER TABLE users ADD COLUMN IF NOT EXISTS holiday_credits_earned INTEGER DEFAULT 0;
ALTER TABLE users ADD COLUMN IF NOT EXISTS whats_new_modal_shown BOOLEAN DEFAULT FALSE;

-- Add index for credit balance queries
CREATE INDEX IF NOT EXISTS idx_users_holiday_credits ON users(holiday_credits) WHERE holiday_credits > 0;

COMMENT ON COLUMN users.holiday_credits IS 'Current holiday credit balance (atomic deductions via function)';
COMMENT ON COLUMN users.holiday_credits_earned IS 'Total holiday credits earned (lifetime counter)';
COMMENT ON COLUMN users.whats_new_modal_shown IS 'Track if "What''s New?" modal has been shown to existing users';

-- ============================================================================
-- SECTION 2: Holiday Generations Table
-- ============================================================================

CREATE TABLE IF NOT EXISTS holiday_generations (
    -- Primary Key
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- User Reference
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

    -- Location Details
    address TEXT NOT NULL,
    geocoded_lat DECIMAL(10, 8) NOT NULL,
    geocoded_lng DECIMAL(11, 8) NOT NULL,
    street_view_heading INTEGER NOT NULL CHECK (street_view_heading >= 0 AND street_view_heading < 360),
    street_view_pitch INTEGER DEFAULT 0 CHECK (street_view_pitch >= -90 AND street_view_pitch <= 90),

    -- Style Selection
    style VARCHAR(50) NOT NULL CHECK (style IN ('classic', 'modern', 'over_the_top')),

    -- Image URLs (Vercel Blob)
    original_image_url TEXT NOT NULL,
    decorated_image_url TEXT,  -- NULL until generation completes
    before_after_image_url TEXT,  -- NULL until composition completes

    -- Generation Status
    status VARCHAR(50) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
    error_message TEXT,

    -- Credit Tracking
    credit_deducted BOOLEAN DEFAULT FALSE,
    credit_refunded BOOLEAN DEFAULT FALSE,

    -- Processing Metadata
    gemini_prompt TEXT,
    generation_duration_seconds INTEGER,  -- Track performance

    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE
);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_holiday_generations_user_id ON holiday_generations(user_id);
CREATE INDEX IF NOT EXISTS idx_holiday_generations_status ON holiday_generations(status);
CREATE INDEX IF NOT EXISTS idx_holiday_generations_created_at ON holiday_generations(created_at DESC);

-- Composite index for user's recent generations
CREATE INDEX IF NOT EXISTS idx_holiday_generations_user_recent ON holiday_generations(user_id, created_at DESC);

COMMENT ON TABLE holiday_generations IS 'Track each holiday decoration generation request, status, and results';

-- Row-Level Security
ALTER TABLE holiday_generations ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only view their own generations
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'holiday_generations' AND policyname = 'holiday_generations_select_own'
    ) THEN
        CREATE POLICY holiday_generations_select_own ON holiday_generations
            FOR SELECT
            USING (auth.uid() = user_id);
    END IF;
END $$;

-- Policy: Users can only insert their own generations
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'holiday_generations' AND policyname = 'holiday_generations_insert_own'
    ) THEN
        CREATE POLICY holiday_generations_insert_own ON holiday_generations
            FOR INSERT
            WITH CHECK (auth.uid() = user_id);
    END IF;
END $$;

-- Policy: Users can update their own generations (for status polling)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'holiday_generations' AND policyname = 'holiday_generations_update_own'
    ) THEN
        CREATE POLICY holiday_generations_update_own ON holiday_generations
            FOR UPDATE
            USING (auth.uid() = user_id);
    END IF;
END $$;

-- ============================================================================
-- SECTION 3: Social Shares Table
-- ============================================================================

CREATE TABLE IF NOT EXISTS social_shares (
    -- Primary Key
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- User & Generation Reference
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    generation_id UUID NOT NULL REFERENCES holiday_generations(id) ON DELETE CASCADE,

    -- Share Details
    platform VARCHAR(50) NOT NULL CHECK (platform IN ('instagram', 'facebook', 'tiktok')),
    tracking_link TEXT NOT NULL,  -- Unique tracking URL for this share
    tracking_code VARCHAR(50) UNIQUE NOT NULL,  -- Short code for tracking URL
    clicked BOOLEAN DEFAULT FALSE,  -- Track if link was clicked

    -- Credit Reward
    credit_granted BOOLEAN DEFAULT FALSE,
    credit_granted_at TIMESTAMP WITH TIME ZONE,

    -- Verification (Future: OAuth-based verification)
    verification_method VARCHAR(50) DEFAULT 'tracking_link' CHECK (verification_method IN ('tracking_link', 'oauth_api')),
    verified BOOLEAN DEFAULT FALSE,
    verified_at TIMESTAMP WITH TIME ZONE,

    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_social_shares_user_id ON social_shares(user_id);
CREATE INDEX IF NOT EXISTS idx_social_shares_created_at ON social_shares(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_social_shares_tracking_code ON social_shares(tracking_code);

-- Composite index for daily share limit check
CREATE INDEX IF NOT EXISTS idx_social_shares_user_daily ON social_shares(user_id, created_at DESC);

COMMENT ON TABLE social_shares IS 'Track social media shares for credit rewards and abuse prevention';

-- Row-Level Security
ALTER TABLE social_shares ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only view their own shares
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'social_shares' AND policyname = 'social_shares_select_own'
    ) THEN
        CREATE POLICY social_shares_select_own ON social_shares
            FOR SELECT
            USING (auth.uid() = user_id);
    END IF;
END $$;

-- Policy: Users can only insert their own shares
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'social_shares' AND policyname = 'social_shares_insert_own'
    ) THEN
        CREATE POLICY social_shares_insert_own ON social_shares
            FOR INSERT
            WITH CHECK (auth.uid() = user_id);
    END IF;
END $$;

-- Policy: Users can update their own shares (for tracking clicks)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'social_shares' AND policyname = 'social_shares_update_own'
    ) THEN
        CREATE POLICY social_shares_update_own ON social_shares
            FOR UPDATE
            USING (auth.uid() = user_id);
    END IF;
END $$;

-- ============================================================================
-- SECTION 4: Email Nurture List Table
-- ============================================================================

CREATE TABLE IF NOT EXISTS email_nurture_list (
    -- Primary Key
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- User Reference (nullable for non-authenticated users)
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,

    -- Email Details
    email VARCHAR(255) NOT NULL,
    source VARCHAR(50) DEFAULT 'holiday_decorator',  -- Track where email came from

    -- Opt-in Status
    opted_in BOOLEAN DEFAULT TRUE,
    opted_out_at TIMESTAMP WITH TIME ZONE,

    -- Campaign Tracking
    campaign_tag VARCHAR(100) DEFAULT 'holiday_to_spring_2025',
    email_sent_count INTEGER DEFAULT 0,
    last_email_sent_at TIMESTAMP WITH TIME ZONE,

    -- Conversion Tracking
    converted_to_landscape BOOLEAN DEFAULT FALSE,
    converted_at TIMESTAMP WITH TIME ZONE,

    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_email_nurture_list_email ON email_nurture_list(email);
CREATE INDEX IF NOT EXISTS idx_email_nurture_list_user_id ON email_nurture_list(user_id);
CREATE INDEX IF NOT EXISTS idx_email_nurture_list_campaign_tag ON email_nurture_list(campaign_tag);

-- Unique constraint: One entry per email per campaign
CREATE UNIQUE INDEX IF NOT EXISTS idx_email_nurture_unique ON email_nurture_list(email, campaign_tag);

COMMENT ON TABLE email_nurture_list IS 'Track users who requested HD downloads for email marketing campaigns';

-- Row-Level Security
ALTER TABLE email_nurture_list ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only view their own email entries
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'email_nurture_list' AND policyname = 'email_nurture_list_select_own'
    ) THEN
        CREATE POLICY email_nurture_list_select_own ON email_nurture_list
            FOR SELECT
            USING (auth.uid() = user_id OR user_id IS NULL);
    END IF;
END $$;

-- Policy: Users can insert their own email entries
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'email_nurture_list' AND policyname = 'email_nurture_list_insert_own'
    ) THEN
        CREATE POLICY email_nurture_list_insert_own ON email_nurture_list
            FOR INSERT
            WITH CHECK (auth.uid() = user_id OR user_id IS NULL);
    END IF;
END $$;

-- ============================================================================
-- SECTION 5: Discount Codes Table (Optional)
-- ============================================================================

CREATE TABLE IF NOT EXISTS discount_codes (
    -- Primary Key
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Code Details
    code VARCHAR(50) NOT NULL UNIQUE,
    discount_percentage INTEGER NOT NULL CHECK (discount_percentage > 0 AND discount_percentage <= 100),
    discount_type VARCHAR(50) DEFAULT 'percentage' CHECK (discount_type IN ('percentage', 'fixed')),

    -- Validity
    active BOOLEAN DEFAULT TRUE,
    valid_from TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    valid_until TIMESTAMP WITH TIME ZONE,

    -- Usage Limits
    max_uses INTEGER,
    current_uses INTEGER DEFAULT 0,
    max_uses_per_user INTEGER DEFAULT 1,

    -- Source Tracking
    source VARCHAR(100) DEFAULT 'holiday_decorator',

    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_discount_codes_code ON discount_codes(code);
CREATE INDEX IF NOT EXISTS idx_discount_codes_active ON discount_codes(active, valid_until);

COMMENT ON TABLE discount_codes IS 'Promotional codes for discounts (e.g., 25% off spring landscaping)';

-- Insert holiday discount code (idempotent)
INSERT INTO discount_codes (code, discount_percentage, source, valid_from, valid_until)
VALUES ('SPRING2026-25', 25, 'holiday_decorator', '2024-11-01'::TIMESTAMP WITH TIME ZONE, '2026-05-01'::TIMESTAMP WITH TIME ZONE)
ON CONFLICT (code) DO NOTHING;

-- ============================================================================
-- SECTION 6: Database Functions
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Function: deduct_holiday_credit
-- Purpose: Atomically deduct 1 holiday credit from user (prevents negative balance)
-- Usage: SELECT * FROM deduct_holiday_credit('user-uuid');
-- Returns: TABLE(success BOOLEAN, credits_remaining INTEGER)
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION deduct_holiday_credit(
    p_user_id UUID
)
RETURNS TABLE(success BOOLEAN, credits_remaining INTEGER) AS $$
DECLARE
    v_credits INTEGER;
BEGIN
    -- Lock the user row with FOR UPDATE NOWAIT (fail fast if locked)
    SELECT users.holiday_credits INTO v_credits
    FROM users
    WHERE id = p_user_id
    FOR UPDATE NOWAIT;

    -- Check if user exists
    IF v_credits IS NULL THEN
        RETURN QUERY SELECT FALSE, 0::INTEGER;
        RETURN;
    END IF;

    -- Check if sufficient credits
    IF v_credits < 1 THEN
        RETURN QUERY SELECT FALSE, v_credits::INTEGER;
        RETURN;
    END IF;

    -- Deduct 1 credit atomically
    UPDATE users
    SET holiday_credits = holiday_credits - 1,
        updated_at = NOW()
    WHERE id = p_user_id;

    RETURN QUERY SELECT TRUE, (v_credits - 1)::INTEGER;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION deduct_holiday_credit IS 'Atomically deduct 1 holiday credit (prevents negative balance, row-level locking)';

-- ----------------------------------------------------------------------------
-- Function: grant_holiday_credit
-- Purpose: Grant holiday credits to user (for social sharing rewards)
-- Usage: SELECT grant_holiday_credit('user-uuid', 1);
-- Returns: INTEGER (new balance)
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION grant_holiday_credit(
    p_user_id UUID,
    p_amount INTEGER DEFAULT 1
)
RETURNS INTEGER AS $$
DECLARE
    v_new_balance INTEGER;
BEGIN
    UPDATE users
    SET holiday_credits = holiday_credits + p_amount,
        holiday_credits_earned = holiday_credits_earned + p_amount,
        updated_at = NOW()
    WHERE id = p_user_id
    RETURNING holiday_credits INTO v_new_balance;

    RETURN v_new_balance;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION grant_holiday_credit IS 'Grant holiday credits to user (for sharing rewards, admin grants)';

-- ----------------------------------------------------------------------------
-- Function: check_daily_share_limit
-- Purpose: Check if user can share today (max 3 shares per 24 hours)
-- Usage: SELECT check_daily_share_limit('user-uuid', 3);
-- Returns: BOOLEAN (true = can share, false = limit reached)
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION check_daily_share_limit(
    p_user_id UUID,
    p_limit INTEGER DEFAULT 3
)
RETURNS BOOLEAN AS $$
DECLARE
    v_share_count INTEGER;
BEGIN
    SELECT COUNT(*)
    INTO v_share_count
    FROM social_shares
    WHERE user_id = p_user_id
      AND created_at >= NOW() - INTERVAL '24 hours';

    RETURN v_share_count < p_limit;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION check_daily_share_limit IS 'Check if user can share (max 3 shares per 24 hours)';

-- ============================================================================
-- SECTION 7: Database Triggers
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Trigger: grant_initial_holiday_credit
-- Purpose: Grant 1 holiday credit to new users during holiday season
-- Timing: BEFORE INSERT on users table
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION grant_initial_holiday_credit()
RETURNS TRIGGER AS $$
BEGIN
    -- Grant 1 holiday credit to new users during holiday season
    -- Holiday season: November 1st - January 1st
    IF EXTRACT(MONTH FROM NOW()) IN (11, 12) OR
       (EXTRACT(MONTH FROM NOW()) = 1 AND EXTRACT(DAY FROM NOW()) = 1) THEN
        NEW.holiday_credits := 1;
        NEW.holiday_credits_earned := 1;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS grant_initial_holiday_credit_trigger ON users;
CREATE TRIGGER grant_initial_holiday_credit_trigger
    BEFORE INSERT ON users
    FOR EACH ROW
    EXECUTE FUNCTION grant_initial_holiday_credit();

COMMENT ON FUNCTION grant_initial_holiday_credit IS 'Auto-grant 1 holiday credit to new users during holiday season (Nov 1 - Jan 1)';

-- ----------------------------------------------------------------------------
-- Trigger: update_updated_at_column (shared trigger function)
-- Purpose: Automatically update updated_at timestamp on row modification
-- ----------------------------------------------------------------------------
-- Check if update_updated_at_column function exists (may be from previous migrations)
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply update_updated_at trigger to holiday tables
DROP TRIGGER IF EXISTS update_holiday_generations_updated_at ON holiday_generations;
CREATE TRIGGER update_holiday_generations_updated_at
    BEFORE UPDATE ON holiday_generations
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_social_shares_updated_at ON social_shares;
CREATE TRIGGER update_social_shares_updated_at
    BEFORE UPDATE ON social_shares
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_email_nurture_list_updated_at ON email_nurture_list;
CREATE TRIGGER update_email_nurture_list_updated_at
    BEFORE UPDATE ON email_nurture_list
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_discount_codes_updated_at ON discount_codes;
CREATE TRIGGER update_discount_codes_updated_at
    BEFORE UPDATE ON discount_codes
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- SECTION 8: Migration Verification
-- ============================================================================

-- Verify users table columns
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'users' AND column_name = 'holiday_credits'
    ) THEN
        RAISE EXCEPTION 'Migration failed: holiday_credits column not created';
    END IF;

    RAISE NOTICE 'Migration 014_holiday_decorator.sql completed successfully';
END $$;

-- ============================================================================
-- ROLLBACK SCRIPT (for reference, do not execute)
-- ============================================================================
--
-- -- Drop triggers
-- DROP TRIGGER IF EXISTS grant_initial_holiday_credit_trigger ON users;
-- DROP TRIGGER IF EXISTS update_holiday_generations_updated_at ON holiday_generations;
-- DROP TRIGGER IF EXISTS update_social_shares_updated_at ON social_shares;
-- DROP TRIGGER IF EXISTS update_email_nurture_list_updated_at ON email_nurture_list;
-- DROP TRIGGER IF EXISTS update_discount_codes_updated_at ON discount_codes;
--
-- -- Drop functions
-- DROP FUNCTION IF EXISTS deduct_holiday_credit(UUID);
-- DROP FUNCTION IF EXISTS grant_holiday_credit(UUID, INTEGER);
-- DROP FUNCTION IF EXISTS check_daily_share_limit(UUID, INTEGER);
-- DROP FUNCTION IF EXISTS grant_initial_holiday_credit();
--
-- -- Drop tables (cascade will remove RLS policies)
-- DROP TABLE IF EXISTS email_nurture_list CASCADE;
-- DROP TABLE IF EXISTS social_shares CASCADE;
-- DROP TABLE IF EXISTS holiday_generations CASCADE;
-- DROP TABLE IF EXISTS discount_codes CASCADE;
--
-- -- Remove columns from users
-- ALTER TABLE users DROP COLUMN IF EXISTS holiday_credits;
-- ALTER TABLE users DROP COLUMN IF EXISTS holiday_credits_earned;
-- ALTER TABLE users DROP COLUMN IF EXISTS whats_new_modal_shown;
--
-- ============================================================================
-- END OF MIGRATION
-- ============================================================================
