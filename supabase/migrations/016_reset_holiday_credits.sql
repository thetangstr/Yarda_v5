-- ============================================================================
-- Migration: 016_reset_holiday_credits.sql
-- Purpose: Reset all non-admin users to 1 holiday credit
-- Date: 2025-11-11
-- ============================================================================
-- Description: Reset holiday credit balance to 1 for all non-admin users.
--              Admin users (specified by email) are excluded from the reset.
-- ============================================================================

-- Update all non-admin users to have 1 holiday credit
UPDATE users
SET
    holiday_credits = 1,
    updated_at = NOW()
WHERE
    email NOT IN (
        'thetangstr@gmail.com'
    );

-- Log the update with count
SELECT
    COUNT(*) as users_updated,
    MIN(updated_at) as update_time
FROM users
WHERE
    email NOT IN (
        'thetangstr@gmail.com'
    );

COMMENT ON TABLE users IS 'Core user accounts - holiday credits reset to 1 on 2025-11-11';
