-- Migration: Add Subscription Columns to Users Table
-- Date: 2025-11-06
-- Feature: Subscription service support
-- 
-- Context: These columns were added to support SubscriptionService.get_subscription_status()
-- which was causing "column does not exist" errors in production.
--
-- Bug Fix: This migration documents the schema changes that were applied manually
-- during E2E testing session on 2025-11-06.

-- Add subscription-related columns to users table
ALTER TABLE users
ADD COLUMN IF NOT EXISTS stripe_subscription_id TEXT,
ADD COLUMN IF NOT EXISTS current_period_end TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS cancel_at_period_end BOOLEAN DEFAULT false;

-- Add indexes for subscription queries
CREATE INDEX IF NOT EXISTS idx_users_stripe_subscription_id 
ON users(stripe_subscription_id) 
WHERE stripe_subscription_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_users_current_period_end 
ON users(current_period_end) 
WHERE current_period_end IS NOT NULL;

-- Add comment to document the columns
COMMENT ON COLUMN users.stripe_subscription_id IS 'Stripe subscription ID for active subscriptions';
COMMENT ON COLUMN users.current_period_end IS 'End date of current subscription billing period';
COMMENT ON COLUMN users.cancel_at_period_end IS 'Whether subscription will cancel at period end';
