-- Migration 011: Add password_hash column for email/password authentication
-- Purpose: Store hashed passwords for users (use bcrypt in production)
-- Requirements: FR-001 (Email/password registration)

-- Add password_hash column
ALTER TABLE users
ADD COLUMN password_hash VARCHAR(255);

-- Make firebase_uid nullable (some users may register with email/password only)
ALTER TABLE users
ALTER COLUMN firebase_uid DROP NOT NULL;

-- Add comment
COMMENT ON COLUMN users.password_hash IS 'Hashed password for email/password authentication (use bcrypt in production)';
