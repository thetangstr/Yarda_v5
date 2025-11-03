-- Migration 009: Create Row-Level Security (RLS) policies
-- Purpose: User data isolation and access control
-- Requirements: NFR-3.1 (Authentication & Authorization), NFR-3.2 (Data Privacy)

-- Enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE users_token_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE users_token_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE generations ENABLE ROW LEVEL SECURITY;
ALTER TABLE generation_areas ENABLE ROW LEVEL SECURITY;
ALTER TABLE rate_limits ENABLE ROW LEVEL SECURITY;

-- =====================================
-- Policy 1: users - Self-Access Only
-- =====================================

-- Users can read their own record
CREATE POLICY users_select_own ON users
    FOR SELECT
    USING (firebase_uid = current_setting('request.jwt.claim.sub', TRUE)::TEXT);

-- Users can update their own record
CREATE POLICY users_update_own ON users
    FOR UPDATE
    USING (firebase_uid = current_setting('request.jwt.claim.sub', TRUE)::TEXT);

-- =====================================
-- Policy 2: users_token_accounts - Self-Access Only
-- =====================================

-- Users can read their own token account
CREATE POLICY token_accounts_select_own ON users_token_accounts
    FOR SELECT
    USING (user_id IN (
        SELECT id FROM users WHERE firebase_uid = current_setting('request.jwt.claim.sub', TRUE)::TEXT
    ));

-- Users can update their own token account (for auto-reload config)
CREATE POLICY token_accounts_update_own ON users_token_accounts
    FOR UPDATE
    USING (user_id IN (
        SELECT id FROM users WHERE firebase_uid = current_setting('request.jwt.claim.sub', TRUE)::TEXT
    ));

-- =====================================
-- Policy 3: users_token_transactions - Read-Only for Users
-- =====================================

-- Users can read their own transactions
CREATE POLICY token_transactions_select_own ON users_token_transactions
    FOR SELECT
    USING (user_id IN (
        SELECT id FROM users WHERE firebase_uid = current_setting('request.jwt.claim.sub', TRUE)::TEXT
    ));

-- No UPDATE/DELETE policy (transactions are immutable)

-- =====================================
-- Policy 4: generations - Self-Access Only
-- =====================================

-- Users can read their own generations
CREATE POLICY generations_select_own ON generations
    FOR SELECT
    USING (user_id IN (
        SELECT id FROM users WHERE firebase_uid = current_setting('request.jwt.claim.sub', TRUE)::TEXT
    ));

-- Users can insert their own generations
CREATE POLICY generations_insert_own ON generations
    FOR INSERT
    WITH CHECK (user_id IN (
        SELECT id FROM users WHERE firebase_uid = current_setting('request.jwt.claim.sub', TRUE)::TEXT
    ));

-- Users can update their own generations
CREATE POLICY generations_update_own ON generations
    FOR UPDATE
    USING (user_id IN (
        SELECT id FROM users WHERE firebase_uid = current_setting('request.jwt.claim.sub', TRUE)::TEXT
    ));

-- Users can delete their own generations
CREATE POLICY generations_delete_own ON generations
    FOR DELETE
    USING (user_id IN (
        SELECT id FROM users WHERE firebase_uid = current_setting('request.jwt.claim.sub', TRUE)::TEXT
    ));

-- =====================================
-- Policy 5: generation_areas - Self-Access via generations
-- =====================================

-- Users can read generation areas for their own generations
CREATE POLICY generation_areas_select_own ON generation_areas
    FOR SELECT
    USING (generation_id IN (
        SELECT g.id FROM generations g
        JOIN users u ON g.user_id = u.id
        WHERE u.firebase_uid = current_setting('request.jwt.claim.sub', TRUE)::TEXT
    ));

-- Users can insert generation areas for their own generations
CREATE POLICY generation_areas_insert_own ON generation_areas
    FOR INSERT
    WITH CHECK (generation_id IN (
        SELECT g.id FROM generations g
        JOIN users u ON g.user_id = u.id
        WHERE u.firebase_uid = current_setting('request.jwt.claim.sub', TRUE)::TEXT
    ));

-- Users can update generation areas for their own generations
CREATE POLICY generation_areas_update_own ON generation_areas
    FOR UPDATE
    USING (generation_id IN (
        SELECT g.id FROM generations g
        JOIN users u ON g.user_id = u.id
        WHERE u.firebase_uid = current_setting('request.jwt.claim.sub', TRUE)::TEXT
    ));

-- =====================================
-- Policy 6: rate_limits - Self-Access Only
-- =====================================

-- Users can read their own rate limits
CREATE POLICY rate_limits_select_own ON rate_limits
    FOR SELECT
    USING (user_id IN (
        SELECT id FROM users WHERE firebase_uid = current_setting('request.jwt.claim.sub', TRUE)::TEXT
    ));

-- System can insert/update rate limits (no user-facing policy)
-- Rate limits are managed by backend service, not directly by users

-- =====================================
-- Service Role Bypass (for backend operations)
-- =====================================

-- Service role can bypass RLS for backend operations
-- This is configured at the Supabase level with service_role key
-- No additional policies needed here
