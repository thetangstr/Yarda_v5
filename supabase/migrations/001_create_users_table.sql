-- Migration 001: Create users table with trial and subscription fields
-- Purpose: Core user account with authentication credentials and subscription status
-- Requirements: FR-001 to FR-010 (Authentication), FR-011 to FR-016 (Trial), FR-043 to FR-054 (Subscription)

-- Drop table if exists (for development only - remove in production)
DROP TABLE IF EXISTS users CASCADE;

-- Create users table
CREATE TABLE users (
    -- Identity
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    email_verified BOOLEAN DEFAULT false NOT NULL,
    firebase_uid VARCHAR(255) UNIQUE NOT NULL,

    -- Trial Credits (FR-011 to FR-016)
    trial_remaining INTEGER DEFAULT 3 NOT NULL CHECK (trial_remaining >= 0),
    trial_used INTEGER DEFAULT 0 NOT NULL CHECK (trial_used >= 0),

    -- Subscription (FR-043 to FR-054)
    subscription_tier VARCHAR(50) DEFAULT 'free' NOT NULL CHECK (
        subscription_tier IN ('free', '7day_pass', 'per_property', 'monthly_pro')
    ),
    subscription_status VARCHAR(50) DEFAULT 'inactive' NOT NULL CHECK (
        subscription_status IN ('inactive', 'active', 'past_due', 'cancelled')
    ),
    stripe_customer_id VARCHAR(255) UNIQUE,
    stripe_subscription_id VARCHAR(255),
    current_period_end TIMESTAMP WITH TIME ZONE,
    cancel_at_period_end BOOLEAN DEFAULT false NOT NULL,

    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Create indexes for fast lookups
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_firebase_uid ON users(firebase_uid);
CREATE INDEX idx_users_stripe_customer_id ON users(stripe_customer_id) WHERE stripe_customer_id IS NOT NULL;
CREATE INDEX idx_users_subscription_status ON users(subscription_status) WHERE subscription_status != 'inactive';

-- Add comments for documentation
COMMENT ON TABLE users IS 'Core user accounts with authentication, trial credits, and subscription status';
COMMENT ON COLUMN users.trial_remaining IS 'Number of free trial credits remaining (initialized to 3)';
COMMENT ON COLUMN users.trial_used IS 'Number of trial credits used (for analytics)';
COMMENT ON COLUMN users.subscription_tier IS 'Current subscription plan: free, 7day_pass, per_property, monthly_pro';
COMMENT ON COLUMN users.subscription_status IS 'Subscription state: inactive, active, past_due, cancelled';
COMMENT ON COLUMN users.stripe_customer_id IS 'Stripe customer ID for payment processing';
COMMENT ON COLUMN users.cancel_at_period_end IS 'Whether subscription will cancel at end of current period';
