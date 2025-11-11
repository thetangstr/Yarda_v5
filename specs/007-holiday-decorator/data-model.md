# Data Model: Holiday Decorator - Viral Marketing Feature

**Phase**: Phase 1 - Data Modeling
**Date**: 2025-11-10
**Branch**: 007-holiday-decorator

## Overview

This document defines the database schema, entities, and relationships for the Holiday Decorator feature. The design extends the existing Yarda database schema while maintaining compatibility with the current trial/token/subscription credit system.

---

## 1. Database Schema Changes

### 1.1 Extend Users Table

**Table**: `users` (existing table)

**New Columns**:
```sql
-- Add holiday credits column to existing users table
ALTER TABLE users ADD COLUMN holiday_credits INTEGER DEFAULT 0 CHECK (holiday_credits >= 0);
ALTER TABLE users ADD COLUMN holiday_credits_earned INTEGER DEFAULT 0;
ALTER TABLE users ADD COLUMN whats_new_modal_shown BOOLEAN DEFAULT FALSE;
```

**Why Extend Instead of New Table**:
- Holiday credits are a user attribute (like trial_remaining, token balance)
- Simplifies credit checking queries (no JOIN required)
- Consistent with existing credit system architecture
- Enables atomic row-level locking for credit deduction

---

### 1.2 Holiday Generations Table

**Table**: `holiday_generations`

**Purpose**: Track each holiday decoration generation request, status, and results.

```sql
CREATE TABLE holiday_generations (
    -- Primary Key
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- User Reference
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

    -- Location Details
    address TEXT NOT NULL,
    geocoded_lat DECIMAL(10, 8) NOT NULL,
    geocoded_lng DECIMAL(11, 8) NOT NULL,
    street_view_heading INTEGER NOT NULL CHECK (street_view_heading >= 0 AND street_view_heading < 360),
    street_view_pitch INTEGER DEFAULT 0 CHECK (street_view_pitch >= -90 AND street_view_pitch <= 90),

    -- Style Selection
    style VARCHAR(50) NOT NULL CHECK (style IN ('classic', 'modern', 'over_the_top')),

    -- Image URLs (Vercel Blob)
    original_image_url TEXT NOT NULL,
    decorated_image_url TEXT,  -- NULL until generation completes
    before_after_image_url TEXT,  -- NULL until composition completes

    -- Generation Status
    status VARCHAR(50) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
    error_message TEXT,

    -- Credit Tracking
    credit_deducted BOOLEAN DEFAULT FALSE,
    credit_refunded BOOLEAN DEFAULT FALSE,

    -- Processing Metadata
    gemini_prompt TEXT,
    generation_duration_seconds INTEGER,  -- Track performance

    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE
);

-- Indexes for common queries
CREATE INDEX idx_holiday_generations_user_id ON holiday_generations(user_id);
CREATE INDEX idx_holiday_generations_status ON holiday_generations(status);
CREATE INDEX idx_holiday_generations_created_at ON holiday_generations(created_at DESC);
```

**Row-Level Security**:
```sql
-- Enable RLS
ALTER TABLE holiday_generations ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only view their own generations
CREATE POLICY holiday_generations_select_own ON holiday_generations
    FOR SELECT
    USING (auth.uid() = user_id);

-- Policy: Users can only insert their own generations
CREATE POLICY holiday_generations_insert_own ON holiday_generations
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);
```

---

### 1.3 Social Shares Table

**Table**: `social_shares`

**Purpose**: Track social media shares for credit rewards and abuse prevention.

```sql
CREATE TABLE social_shares (
    -- Primary Key
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- User & Generation Reference
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    generation_id UUID NOT NULL REFERENCES holiday_generations(id) ON DELETE CASCADE,

    -- Share Details
    platform VARCHAR(50) NOT NULL CHECK (platform IN ('instagram', 'facebook', 'tiktok')),
    tracking_link TEXT NOT NULL,  -- Unique tracking URL for this share
    clicked BOOLEAN DEFAULT FALSE,  -- Track if link was clicked

    -- Credit Reward
    credit_granted BOOLEAN DEFAULT FALSE,
    credit_granted_at TIMESTAMP WITH TIME ZONE,

    -- Verification (Future: OAuth-based verification)
    verification_method VARCHAR(50) DEFAULT 'tracking_link' CHECK (verification_method IN ('tracking_link', 'oauth_api')),
    verified BOOLEAN DEFAULT FALSE,
    verified_at TIMESTAMP WITH TIME ZONE,

    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for common queries
CREATE INDEX idx_social_shares_user_id ON social_shares(user_id);
CREATE INDEX idx_social_shares_created_at ON social_shares(created_at DESC);
CREATE INDEX idx_social_shares_tracking_link ON social_shares(tracking_link);

-- Composite index for daily share limit check
CREATE INDEX idx_social_shares_user_daily ON social_shares(user_id, created_at DESC);
```

**Row-Level Security**:
```sql
-- Enable RLS
ALTER TABLE social_shares ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only view their own shares
CREATE POLICY social_shares_select_own ON social_shares
    FOR SELECT
    USING (auth.uid() = user_id);

-- Policy: Users can only insert their own shares
CREATE POLICY social_shares_insert_own ON social_shares
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);
```

---

### 1.4 Email Nurture List Table

**Table**: `email_nurture_list`

**Purpose**: Track users who requested HD downloads for email marketing campaigns.

```sql
CREATE TABLE email_nurture_list (
    -- Primary Key
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- User Reference (nullable for non-authenticated users)
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,

    -- Email Details
    email VARCHAR(255) NOT NULL,
    source VARCHAR(50) DEFAULT 'holiday_decorator',  -- Track where email came from

    -- Opt-in Status
    opted_in BOOLEAN DEFAULT TRUE,
    opted_out_at TIMESTAMP WITH TIME ZONE,

    -- Campaign Tracking
    campaign_tag VARCHAR(100) DEFAULT 'holiday_to_spring_2025',
    email_sent_count INTEGER DEFAULT 0,
    last_email_sent_at TIMESTAMP WITH TIME ZONE,

    -- Conversion Tracking
    converted_to_landscape BOOLEAN DEFAULT FALSE,
    converted_at TIMESTAMP WITH TIME ZONE,

    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_email_nurture_list_email ON email_nurture_list(email);
CREATE INDEX idx_email_nurture_list_user_id ON email_nurture_list(user_id);
CREATE INDEX idx_email_nurture_list_campaign_tag ON email_nurture_list(campaign_tag);

-- Unique constraint: One entry per email per campaign
CREATE UNIQUE INDEX idx_email_nurture_unique ON email_nurture_list(email, campaign_tag);
```

**Row-Level Security**:
```sql
-- Enable RLS
ALTER TABLE email_nurture_list ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only view their own email entries
CREATE POLICY email_nurture_list_select_own ON email_nurture_list
    FOR SELECT
    USING (auth.uid() = user_id OR user_id IS NULL);
```

---

### 1.5 Discount Codes Table (Optional)

**Table**: `discount_codes` (may already exist)

**Purpose**: Track promotional codes for the pivot CTA (25% off spring landscaping).

```sql
CREATE TABLE IF NOT EXISTS discount_codes (
    -- Primary Key
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Code Details
    code VARCHAR(50) NOT NULL UNIQUE,
    discount_percentage INTEGER NOT NULL CHECK (discount_percentage > 0 AND discount_percentage <= 100),
    discount_type VARCHAR(50) DEFAULT 'percentage' CHECK (discount_type IN ('percentage', 'fixed')),

    -- Validity
    active BOOLEAN DEFAULT TRUE,
    valid_from TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    valid_until TIMESTAMP WITH TIME ZONE,

    -- Usage Limits
    max_uses INTEGER,
    current_uses INTEGER DEFAULT 0,
    max_uses_per_user INTEGER DEFAULT 1,

    -- Source Tracking
    source VARCHAR(100) DEFAULT 'holiday_decorator',

    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_discount_codes_code ON discount_codes(code);
CREATE INDEX idx_discount_codes_active ON discount_codes(active, valid_until);

-- Insert holiday discount code
INSERT INTO discount_codes (code, discount_percentage, source, valid_from, valid_until)
VALUES ('SPRING2026-25', 25, 'holiday_decorator', '2024-11-01', '2026-05-01')
ON CONFLICT (code) DO NOTHING;
```

---

## 2. Database Functions

### 2.1 Atomic Holiday Credit Deduction

```sql
CREATE OR REPLACE FUNCTION deduct_holiday_credit(
    p_user_id UUID
)
RETURNS TABLE(success BOOLEAN, credits_remaining INTEGER) AS $$
DECLARE
    v_credits INTEGER;
BEGIN
    -- Lock the user row with FOR UPDATE NOWAIT
    SELECT users.holiday_credits INTO v_credits
    FROM users
    WHERE id = p_user_id
    FOR UPDATE NOWAIT;

    -- Check if user exists
    IF v_credits IS NULL THEN
        RETURN QUERY SELECT FALSE, 0::INTEGER;
        RETURN;
    END IF;

    -- Check if sufficient credits
    IF v_credits < 1 THEN
        RETURN QUERY SELECT FALSE, v_credits::INTEGER;
        RETURN;
    END IF;

    -- Deduct 1 credit
    UPDATE users
    SET holiday_credits = holiday_credits - 1,
        updated_at = NOW()
    WHERE id = p_user_id;

    RETURN QUERY SELECT TRUE, (v_credits - 1)::INTEGER;
END;
$$ LANGUAGE plpgsql;
```

### 2.2 Grant Holiday Credit

```sql
CREATE OR REPLACE FUNCTION grant_holiday_credit(
    p_user_id UUID,
    p_amount INTEGER DEFAULT 1
)
RETURNS INTEGER AS $$
DECLARE
    v_new_balance INTEGER;
BEGIN
    UPDATE users
    SET holiday_credits = holiday_credits + p_amount,
        holiday_credits_earned = holiday_credits_earned + p_amount,
        updated_at = NOW()
    WHERE id = p_user_id
    RETURNING holiday_credits INTO v_new_balance;

    RETURN v_new_balance;
END;
$$ LANGUAGE plpgsql;
```

### 2.3 Check Daily Share Limit

```sql
CREATE OR REPLACE FUNCTION check_daily_share_limit(
    p_user_id UUID,
    p_limit INTEGER DEFAULT 3
)
RETURNS BOOLEAN AS $$
DECLARE
    v_share_count INTEGER;
BEGIN
    SELECT COUNT(*)
    INTO v_share_count
    FROM social_shares
    WHERE user_id = p_user_id
      AND created_at >= NOW() - INTERVAL '24 hours';

    RETURN v_share_count < p_limit;
END;
$$ LANGUAGE plpgsql;
```

---

## 3. Database Triggers

### 3.1 Grant Holiday Credit on User Creation

```sql
CREATE OR REPLACE FUNCTION grant_initial_holiday_credit()
RETURNS TRIGGER AS $$
BEGIN
    -- Grant 1 holiday credit to new users during holiday season
    -- Check if current date is between Thanksgiving and New Year
    IF EXTRACT(MONTH FROM NOW()) IN (11, 12) OR
       (EXTRACT(MONTH FROM NOW()) = 1 AND EXTRACT(DAY FROM NOW()) = 1) THEN
        NEW.holiday_credits := 1;
        NEW.holiday_credits_earned := 1;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER grant_initial_holiday_credit_trigger
    BEFORE INSERT ON users
    FOR EACH ROW
    EXECUTE FUNCTION grant_initial_holiday_credit();
```

### 3.2 Update Timestamps

```sql
-- Trigger for holiday_generations
CREATE TRIGGER update_holiday_generations_updated_at
    BEFORE UPDATE ON holiday_generations
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Trigger for social_shares
CREATE TRIGGER update_social_shares_updated_at
    BEFORE UPDATE ON social_shares
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Trigger for email_nurture_list
CREATE TRIGGER update_email_nurture_list_updated_at
    BEFORE UPDATE ON email_nurture_list
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
```

---

## 4. Entity Relationships

```
┌─────────────────────────────────────────────────────────────────┐
│                            users                                 │
├─────────────────────────────────────────────────────────────────┤
│ id (PK)                                                          │
│ email                                                            │
│ holiday_credits (NEW)                                            │
│ holiday_credits_earned (NEW)                                     │
│ whats_new_modal_shown (NEW)                                      │
│ trial_remaining (existing)                                       │
│ subscription_status (existing)                                   │
└──────────────────┬──────────────────────────────────────────────┘
                   │
                   │ 1:N
                   │
         ┌─────────┴─────────┬──────────────────┐
         │                   │                  │
         ▼                   ▼                  ▼
┌────────────────────┐  ┌──────────────┐  ┌──────────────────┐
│ holiday_generations│  │social_shares │  │email_nurture_list│
├────────────────────┤  ├──────────────┤  ├──────────────────┤
│ id (PK)            │  │ id (PK)      │  │ id (PK)          │
│ user_id (FK)       │  │ user_id (FK) │  │ user_id (FK)     │
│ address            │  │ generation_id│  │ email            │
│ geocoded_lat       │  │ platform     │  │ campaign_tag     │
│ geocoded_lng       │  │ tracking_link│  │ opted_in         │
│ street_view_heading│  │ clicked      │  │ converted        │
│ style              │  │ credit_granted│ └──────────────────┘
│ original_image_url │  │ verified     │
│ decorated_image_url│  └──────────────┘
│ before_after_url   │         │
│ status             │         │
│ credit_deducted    │         │ N:1
│ created_at         │         │
└────────────────────┘         │
         │                     │
         └─────────────────────┘
```

---

## 5. Data Access Patterns

### 5.1 Credit Check & Deduction

**Query**: Check if user has holiday credits before generation
```sql
-- Single atomic operation (no race conditions)
SELECT * FROM deduct_holiday_credit('user-uuid');
-- Returns: { success: true, credits_remaining: 0 }
```

### 5.2 Generation Status Tracking

**Query**: Get user's generation history
```sql
SELECT id, address, style, status, decorated_image_url, created_at
FROM holiday_generations
WHERE user_id = 'user-uuid'
ORDER BY created_at DESC
LIMIT 10;
```

### 5.3 Daily Share Limit Check

**Query**: Check if user can share today
```sql
SELECT check_daily_share_limit('user-uuid', 3);
-- Returns: true (can share) or false (limit reached)
```

### 5.4 Email Nurture List Export

**Query**: Get all opted-in emails for campaign
```sql
SELECT email, created_at, email_sent_count
FROM email_nurture_list
WHERE campaign_tag = 'holiday_to_spring_2025'
  AND opted_in = TRUE
  AND converted_to_landscape = FALSE
ORDER BY created_at DESC;
```

---

## 6. Migration Strategy

**File**: `supabase/migrations/014_holiday_decorator.sql`

**Migration Steps**:
1. Add columns to `users` table (holiday_credits, holiday_credits_earned, whats_new_modal_shown)
2. Create `holiday_generations` table with indexes and RLS policies
3. Create `social_shares` table with indexes and RLS policies
4. Create `email_nurture_list` table with indexes and RLS policies
5. Create `discount_codes` table (if not exists)
6. Create database functions (deduct_holiday_credit, grant_holiday_credit, check_daily_share_limit)
7. Create triggers (grant_initial_holiday_credit, update_updated_at)
8. Insert default discount code (SPRING2026-25)

**Rollback Plan**:
```sql
-- Drop triggers
DROP TRIGGER IF EXISTS grant_initial_holiday_credit_trigger ON users;

-- Drop functions
DROP FUNCTION IF EXISTS deduct_holiday_credit(UUID);
DROP FUNCTION IF EXISTS grant_holiday_credit(UUID, INTEGER);
DROP FUNCTION IF EXISTS check_daily_share_limit(UUID, INTEGER);

-- Drop tables
DROP TABLE IF EXISTS email_nurture_list;
DROP TABLE IF EXISTS social_shares;
DROP TABLE IF EXISTS holiday_generations;

-- Remove columns from users
ALTER TABLE users DROP COLUMN IF EXISTS holiday_credits;
ALTER TABLE users DROP COLUMN IF EXISTS holiday_credits_earned;
ALTER TABLE users DROP COLUMN IF EXISTS whats_new_modal_shown;
```

---

## 7. Performance Considerations

### Indexes
- All foreign keys have indexes for JOIN performance
- `created_at DESC` indexes for recent generations/shares queries
- Composite index on `social_shares(user_id, created_at DESC)` for daily limit checks
- Unique index on `email_nurture_list(email, campaign_tag)` prevents duplicates

### Query Optimization
- Use `FOR UPDATE NOWAIT` locks to prevent deadlocks (fail fast if row locked)
- Limit queries use `created_at DESC` indexes (no full table scans)
- RLS policies use equality on `user_id` (indexed, fast)

### Expected Load
- **Holiday Generations**: 1,000 users × 2 generations/user = 2,000 rows (negligible)
- **Social Shares**: 1,000 users × 40% share rate × 1.5 shares/user = 600 rows (negligible)
- **Email Nurture**: 1,000 emails (negligible)

**Conclusion**: Database performance is not a concern for this feature's expected scale.

---

## Summary

**Database changes**:
- ✅ 3 new columns in `users` table
- ✅ 3 new tables: `holiday_generations`, `social_shares`, `email_nurture_list`
- ✅ 1 optional table: `discount_codes` (if not exists)
- ✅ 3 database functions for atomic operations
- ✅ 2 triggers for automation
- ✅ Full RLS policies for security
- ✅ Optimized indexes for query performance

**No breaking changes** to existing schema. All additions are backward-compatible.
