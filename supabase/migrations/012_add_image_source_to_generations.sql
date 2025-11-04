-- Migration 012: Add image_source field to generations table
-- Purpose: Track whether imagery was user-uploaded or fetched from Google Maps
-- Feature: 003-google-maps-integration
-- Date: 2025-11-04

-- Step 1: Add column with temporary nullable constraint
ALTER TABLE generations
ADD COLUMN image_source VARCHAR(50);

-- Step 2: Backfill existing records (assume all current generations used user uploads)
UPDATE generations
SET image_source = 'user_upload'
WHERE image_source IS NULL;

-- Step 3: Make column NOT NULL after backfill
ALTER TABLE generations
ALTER COLUMN image_source SET NOT NULL;

-- Step 4: Add CHECK constraint for valid values
ALTER TABLE generations
ADD CONSTRAINT check_image_source_valid
CHECK (image_source IN ('user_upload', 'google_street_view', 'google_satellite'));

-- Step 5: Add index for analytics queries
CREATE INDEX idx_generations_image_source ON generations(image_source);

-- Step 6: Add comment
COMMENT ON COLUMN generations.image_source IS 'Source of property image: user_upload, google_street_view, or google_satellite';

-- Rollback instructions (run these in reverse order if needed):
-- DROP INDEX idx_generations_image_source;
-- ALTER TABLE generations DROP CONSTRAINT check_image_source_valid;
-- ALTER TABLE generations DROP COLUMN image_source;
