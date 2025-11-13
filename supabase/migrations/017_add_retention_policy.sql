-- Migration 017: Add retention policy for generations
-- Purpose: Implement data retention rules
--   - Trial generations: Deleted immediately (never saved)
--   - Token generations: Deleted after 7 days
--   - Subscription generations: Kept indefinitely
--
-- Feature: Retention Policy
-- Task: Implement generation retention based on payment type

-- Add columns to track retention
ALTER TABLE generations ADD COLUMN IF NOT EXISTS expires_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE generations ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT FALSE;

-- Add comment explaining retention policy
COMMENT ON COLUMN generations.expires_at IS 'When this generation expires and will be automatically deleted. NULL = never expires (subscription/trial not saved).';
COMMENT ON COLUMN generations.is_deleted IS 'Soft delete flag. Deleted generations still exist in DB but are hidden from UI.';

-- Create function to calculate expiry based on payment type
CREATE OR REPLACE FUNCTION calculate_generation_expiry(
    payment_type VARCHAR,
    created_at TIMESTAMP WITH TIME ZONE
) RETURNS TIMESTAMP WITH TIME ZONE AS $$
BEGIN
    CASE payment_type
        WHEN 'trial' THEN
            -- Trial generations are deleted immediately (set to creation time)
            -- They won't be saved/accessible via API
            RETURN created_at;
        WHEN 'token' THEN
            -- Token generations expire after 7 days
            RETURN created_at + INTERVAL '7 days';
        WHEN 'subscription' THEN
            -- Subscription generations never expire
            RETURN NULL;
        ELSE
            -- Default: 7 days
            RETURN created_at + INTERVAL '7 days';
    END CASE;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Update existing generations to set expiry based on payment type
UPDATE generations
SET expires_at = calculate_generation_expiry(payment_type, created_at)
WHERE expires_at IS NULL;

-- Create index for cleanup queries
CREATE INDEX IF NOT EXISTS idx_generations_expires_at
ON generations(expires_at)
WHERE is_deleted = FALSE AND expires_at IS NOT NULL;

-- Create function to soft-delete expired generations
CREATE OR REPLACE FUNCTION soft_delete_expired_generations()
RETURNS TABLE(deleted_count INT) AS $$
DECLARE
    v_deleted_count INT;
BEGIN
    UPDATE generations
    SET is_deleted = TRUE
    WHERE expires_at IS NOT NULL
        AND expires_at <= NOW()
        AND is_deleted = FALSE;

    GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
    RETURN QUERY SELECT v_deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Update generations list query to exclude deleted generations
-- This will be handled in the API layer (WHERE is_deleted = FALSE)

-- Add helpful comments
COMMENT ON FUNCTION calculate_generation_expiry(VARCHAR, TIMESTAMP WITH TIME ZONE)
IS 'Calculate expiry timestamp based on payment type. Trial = immediate, Token = 7 days, Subscription = never.';

COMMENT ON FUNCTION soft_delete_expired_generations()
IS 'Soft-delete all expired generations. Call this periodically or on demand. Returns count of deleted records.';
