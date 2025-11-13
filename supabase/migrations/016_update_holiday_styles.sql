-- ============================================================================
-- Migration: 016_update_holiday_styles.sql
-- Feature: Update holiday decoration styles to include all 7 options
-- Date: 2025-11-13
-- ============================================================================
-- Description: Update the style constraint on holiday_generations table
--              to include all 7 decoration styles added to the UI:
--              - classic
--              - modern
--              - over_the_top
--              - pop_culture
--              - glam_gold
--              - cyber_christmas
--              - cozy_rustic
-- ============================================================================

-- Drop the old constraint and add new one with all 7 styles
ALTER TABLE holiday_generations
DROP CONSTRAINT IF EXISTS holiday_generations_style_check;

ALTER TABLE holiday_generations
ADD CONSTRAINT holiday_generations_style_check CHECK (
    style IN (
        'classic',
        'modern',
        'over_the_top',
        'pop_culture',
        'glam_gold',
        'cyber_christmas',
        'cozy_rustic'
    )
);

COMMENT ON CONSTRAINT holiday_generations_style_check ON holiday_generations IS
'Valid holiday decoration styles: classic, modern, over_the_top, pop_culture, glam_gold, cyber_christmas, cozy_rustic';

-- ============================================================================
-- Migration verification
-- ============================================================================

DO $$
BEGIN
    RAISE NOTICE 'Migration 016_update_holiday_styles.sql completed successfully';
    RAISE NOTICE 'Updated holiday_generations style constraint to include 7 styles';
END $$;
