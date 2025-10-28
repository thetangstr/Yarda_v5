-- Remove duplicate indexes
-- UNIQUE constraints already create indexes automatically, so explicit indexes are redundant
-- This saves storage space and improves write performance

-- Drop duplicate index on token_accounts.user_id
-- (token_accounts_user_id_key is created by UNIQUE constraint, idx_token_accounts_user_id is redundant)
DROP INDEX IF EXISTS idx_token_accounts_user_id;

-- Drop duplicate index on users.email
-- (users_email_key is created by UNIQUE constraint, idx_users_email is redundant)
DROP INDEX IF EXISTS idx_users_email;

-- Comment
COMMENT ON MIGRATION IS 'Performance optimization: Remove duplicate indexes that are already covered by UNIQUE constraint indexes';
