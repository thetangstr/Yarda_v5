-- Migration: Whitelist thetangstr003@gmail.com email
-- Description: Set email_verified=true for thetangstr003@gmail.com
-- Date: 2025-11-04

-- Update email_verified if user exists
UPDATE users
SET email_verified = true, updated_at = NOW()
WHERE email = 'thetangstr003@gmail.com';

-- If user doesn't exist, this won't fail - just won't update anything
