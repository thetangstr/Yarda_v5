-- ============================================================================
-- MIGRATION 011: Performance Optimization
-- ============================================================================
-- Add indexes for common query patterns to optimize generation history
-- and rate limit queries at scale (100+ records)

-- Index for generation history queries (user_id + created_at DESC)
-- Optimizes: SELECT * FROM generations WHERE user_id = ? ORDER BY created_at DESC
CREATE INDEX IF NOT EXISTS idx_generations_user_created
ON generations(user_id, created_at DESC);

-- Index for generation status filtering
-- Optimizes: SELECT * FROM generations WHERE user_id = ? AND status = ?
CREATE INDEX IF NOT EXISTS idx_generations_user_status
ON generations(user_id, status)
WHERE status IN ('pending', 'processing', 'completed', 'failed');

-- Index for rate limit queries (user_id + attempted_at)
-- Optimizes: SELECT * FROM rate_limits WHERE user_id = ? AND attempted_at > ?
CREATE INDEX IF NOT EXISTS idx_rate_limits_user_attempted
ON rate_limits(user_id, attempted_at DESC);

-- Partial index for active rate limits only (within 2 minutes)
-- Significantly reduces index size by only indexing recent records
-- Optimizes: Rate limit window checks (only need last 2 minutes)
CREATE INDEX IF NOT EXISTS idx_rate_limits_active
ON rate_limits(user_id, attempted_at)
WHERE attempted_at > NOW() - INTERVAL '2 minutes';

-- Analyze tables to update query planner statistics
-- This helps PostgreSQL choose the most efficient query plans
ANALYZE generations;
ANALYZE rate_limits;
ANALYZE users;
ANALYZE token_accounts;

-- Add comments for documentation
COMMENT ON INDEX idx_generations_user_created IS 'Optimizes generation history queries ordered by created_at DESC';
COMMENT ON INDEX idx_generations_user_status IS 'Optimizes status filtering in generation history';
COMMENT ON INDEX idx_rate_limits_user_attempted IS 'Optimizes rate limit window queries';
COMMENT ON INDEX idx_rate_limits_active IS 'Partial index for active rate limits only (last 2 minutes) - reduces index size significantly';
