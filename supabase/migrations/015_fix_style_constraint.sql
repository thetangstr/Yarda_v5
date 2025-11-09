-- Migration 015: Fix style constraint to include all design styles
-- Purpose: Add missing styles (mediterranean, tropical_resort) to generation_areas check constraint
-- Date: 2025-11-07
-- Issue: Backend allows 7 styles but database only validates 5

-- Drop the old constraint
ALTER TABLE generation_areas DROP CONSTRAINT IF EXISTS generation_areas_style_check;

-- Add updated constraint with all 7 styles
ALTER TABLE generation_areas ADD CONSTRAINT generation_areas_style_check CHECK (
    style IN (
        'modern_minimalist',
        'california_native',
        'japanese_zen',
        'english_garden',
        'desert_landscape',
        'mediterranean',
        'tropical_resort'
    )
);

-- Add comment for documentation
COMMENT ON CONSTRAINT generation_areas_style_check ON generation_areas IS
    'Validates landscape design style (updated 2025-11-07 to include mediterranean and tropical_resort)';
