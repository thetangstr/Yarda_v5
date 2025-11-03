-- Migration 005: Create generation_areas table
-- Purpose: Support multi-area generations (up to 5 areas per generation)
-- Requirements: FR-060 (Multi-area selection), FR-070 (Parallel processing)

-- Drop table if exists (for development only)
DROP TABLE IF EXISTS generation_areas CASCADE;

-- Create generation_areas table
CREATE TABLE generation_areas (
    -- Identity
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    generation_id UUID NOT NULL REFERENCES generations(id) ON DELETE CASCADE,

    -- Area Configuration
    area_type VARCHAR(50) NOT NULL CHECK (
        area_type IN ('front_yard', 'backyard', 'walkway', 'side_yard')
    ),
    style VARCHAR(50) NOT NULL CHECK (
        style IN ('modern_minimalist', 'california_native', 'japanese_zen', 'english_garden', 'desert_landscape')
    ),
    custom_prompt TEXT CHECK (LENGTH(custom_prompt) <= 500),

    -- Status Tracking
    status VARCHAR(50) DEFAULT 'pending' NOT NULL CHECK (
        status IN ('pending', 'processing', 'completed', 'failed')
    ),
    progress INTEGER DEFAULT 0 NOT NULL CHECK (progress >= 0 AND progress <= 100),

    -- Results
    image_urls JSONB, -- Array of generated image URLs
    error_message TEXT,

    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Create indexes
CREATE INDEX idx_generation_areas_generation_id ON generation_areas(generation_id);
CREATE INDEX idx_generation_areas_status ON generation_areas(status) WHERE status IN ('pending', 'processing');

-- Add comments
COMMENT ON TABLE generation_areas IS 'Individual areas within a multi-area generation request';
COMMENT ON COLUMN generation_areas.area_type IS 'Type of yard area: front_yard, backyard, walkway, side_yard';
COMMENT ON COLUMN generation_areas.style IS 'Landscape style: modern_minimalist, california_native, etc.';
COMMENT ON COLUMN generation_areas.custom_prompt IS 'User custom prompt (max 500 characters)';
COMMENT ON COLUMN generation_areas.progress IS 'Generation progress percentage (0-100)';
COMMENT ON COLUMN generation_areas.image_urls IS 'Array of generated image URLs (multiple for backyard angles)';
