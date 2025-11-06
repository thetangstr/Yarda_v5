-- Migration: Generation Flow Interface Enhancements
-- Feature: 004-generation-flow
-- Purpose: Add enums, extend existing tables, and create generation_source_images
-- Date: 2025-11-06

-- ====================================================================================
-- PART 1: Create ENUMs for type safety
-- ====================================================================================

-- Add generation status enum (extends existing VARCHAR checks)
DO $$ BEGIN
    CREATE TYPE generation_status AS ENUM (
        'pending',
        'processing',
        'completed',
        'partial_failed',
        'failed'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Add area generation status enum
DO $$ BEGIN
    CREATE TYPE area_status AS ENUM (
        'not_started',
        'pending',
        'processing',
        'completed',
        'failed'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Add processing stage enum for detailed progress tracking
DO $$ BEGIN
    CREATE TYPE processing_stage AS ENUM (
        'queued',
        'retrieving_imagery',
        'analyzing_property',
        'generating_design',
        'applying_style',
        'finalizing',
        'complete'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- ====================================================================================
-- PART 2: Extend existing generations table
-- ====================================================================================

-- Add missing columns to generations table (if they don't exist)
DO $$
BEGIN
    -- Add total_cost column for multi-area pricing
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'generations' AND column_name = 'total_cost'
    ) THEN
        ALTER TABLE generations ADD COLUMN total_cost INTEGER DEFAULT 1 NOT NULL;
    END IF;

    -- Add payment_method column (complement to existing payment_type)
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'generations' AND column_name = 'payment_method'
    ) THEN
        ALTER TABLE generations ADD COLUMN payment_method VARCHAR(20);
    END IF;

    -- Add start_processing_at for performance tracking
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'generations' AND column_name = 'start_processing_at'
    ) THEN
        ALTER TABLE generations ADD COLUMN start_processing_at TIMESTAMPTZ;
    END IF;
END $$;

-- ====================================================================================
-- PART 3: Extend existing generation_areas table
-- ====================================================================================

-- Add missing columns to generation_areas table
DO $$
BEGIN
    -- Rename area_type to area for consistency (if needed)
    -- Note: Keeping area_type as-is to avoid breaking changes

    -- Add status_message for user-facing progress updates
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'generation_areas' AND column_name = 'status_message'
    ) THEN
        ALTER TABLE generation_areas ADD COLUMN status_message TEXT;
    END IF;

    -- Add current_stage for detailed progress tracking
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'generation_areas' AND column_name = 'current_stage'
    ) THEN
        ALTER TABLE generation_areas ADD COLUMN current_stage processing_stage;
    END IF;

    -- Add image_url as single URL (complement to existing image_urls JSONB)
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'generation_areas' AND column_name = 'image_url'
    ) THEN
        ALTER TABLE generation_areas ADD COLUMN image_url TEXT;
    END IF;

    -- Add completed_at timestamp
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'generation_areas' AND column_name = 'completed_at'
    ) THEN
        ALTER TABLE generation_areas ADD COLUMN completed_at TIMESTAMPTZ;
    END IF;

    -- Rename progress to progress_percentage for clarity (if needed)
    -- Note: Keeping progress as-is to avoid breaking changes
END $$;

-- ====================================================================================
-- PART 4: Create generation_source_images table
-- ====================================================================================

-- Create generation_source_images table for Street View imagery tracking
CREATE TABLE IF NOT EXISTS generation_source_images (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    generation_id UUID NOT NULL REFERENCES generations(id) ON DELETE CASCADE,

    -- Image metadata
    image_type VARCHAR(20) NOT NULL CHECK (
        image_type IN ('street_view', 'satellite', 'user_upload')
    ),
    image_url TEXT NOT NULL,
    image_width INTEGER,
    image_height INTEGER,
    image_size_bytes BIGINT,

    -- Google Maps metadata
    pano_id VARCHAR(100), -- Street View panorama ID
    api_cost DECIMAL(10, 4), -- Track API costs ($0.007 per Street View image)

    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_generation_source_images_generation_id
    ON generation_source_images(generation_id);

-- Add table comment
COMMENT ON TABLE generation_source_images IS
    'Source imagery for generation requests (Street View, satellite, user uploads)';

-- ====================================================================================
-- PART 5: Update existing trigger for updated_at
-- ====================================================================================

-- Ensure trigger function exists
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Ensure trigger exists on generation_areas
DROP TRIGGER IF EXISTS update_generation_areas_updated_at ON generation_areas;
CREATE TRIGGER update_generation_areas_updated_at
    BEFORE UPDATE ON generation_areas
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ====================================================================================
-- VERIFICATION QUERIES (Run manually to verify migration success)
-- ====================================================================================

-- Verify enums created
-- SELECT typname FROM pg_type WHERE typname IN ('generation_status', 'area_status', 'processing_stage');

-- Verify generations table columns
-- SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'generations' ORDER BY ordinal_position;

-- Verify generation_areas table columns
-- SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'generation_areas' ORDER BY ordinal_position;

-- Verify generation_source_images table created
-- SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'generation_source_images' ORDER BY ordinal_position;
