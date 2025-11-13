-- Migration 016: Add language preference to users table
-- Purpose: Store user's preferred language for localization (Feature: Multi-language Support)
-- Supported languages: 'en' (English), 'es' (Spanish), 'zh' (Chinese Simplified)

-- Add language column to users table with default value
ALTER TABLE users
ADD COLUMN preferred_language VARCHAR(10) DEFAULT 'en' NOT NULL CHECK (
    preferred_language IN ('en', 'es', 'zh')
);

-- Create index for faster language-based queries
CREATE INDEX idx_users_preferred_language ON users(preferred_language);

-- Add comment for documentation
COMMENT ON COLUMN users.preferred_language IS 'User''s preferred language for the UI: en (English), es (Spanish), zh (Chinese Simplified)';
