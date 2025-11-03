-- Migration 010: Create performance indexes
-- Purpose: Optimize query performance for frequent operations
-- Requirements: NFR-1.1 (Performance <100ms token operations, <200ms history queries)

-- =====================================
-- Additional Performance Indexes
-- =====================================
-- Note: Basic indexes are already created in entity creation migrations
-- This file adds additional composite indexes for complex queries

-- Index for generation gallery queries (filter by style, area, date)
CREATE INDEX idx_generations_style ON generations((request_params->>'style'))
    WHERE status = 'completed';

CREATE INDEX idx_generations_area ON generations((request_params->>'area'))
    WHERE status = 'completed';

-- Index for generation areas by style (for gallery filtering)
CREATE INDEX idx_generation_areas_style ON generation_areas(style)
    WHERE status = 'completed';

CREATE INDEX idx_generation_areas_area_type ON generation_areas(area_type)
    WHERE status = 'completed';

-- Index for transaction history with type filter
CREATE INDEX idx_token_transactions_user_type_created ON users_token_transactions(user_id, type, created_at DESC);

-- Index for subscription status queries (active subscriptions)
CREATE INDEX idx_users_subscription_active ON users(subscription_status, current_period_end)
    WHERE subscription_status = 'active';

-- Index for auto-reload checks (users with auto-reload enabled below threshold)
CREATE INDEX idx_token_accounts_auto_reload_check ON users_token_accounts(user_id, balance, auto_reload_threshold)
    WHERE auto_reload_enabled = true;

-- Partial index for pending/processing generations (for monitoring)
CREATE INDEX idx_generations_incomplete ON generations(created_at DESC)
    WHERE status IN ('pending', 'processing');

-- Index for searching generations by address (for gallery search)
CREATE INDEX idx_generations_address_search ON generations USING gin(to_tsvector('english', COALESCE(address, '')))
    WHERE address IS NOT NULL;

-- =====================================
-- Vacuum and Analyze for Statistics
-- =====================================

-- Analyze all tables to update query planner statistics
ANALYZE users;
ANALYZE users_token_accounts;
ANALYZE users_token_transactions;
ANALYZE generations;
ANALYZE generation_areas;
ANALYZE rate_limits;
