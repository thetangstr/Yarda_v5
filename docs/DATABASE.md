# Database Documentation

Schema, migrations, and query patterns for Yarda AI Landscape Studio.

## Database Provider

**Platform:** Supabase (managed PostgreSQL 17)
**Project ID:** `gxlmnjnjvlslijiowamn`
**Region:** `us-east-2`
**Dashboard:** `https://supabase.com/dashboard/project/gxlmnjnjvlslijiowamn`

---

## Key Tables

### users

User profiles synced from Supabase Auth.

**Schema:**
```sql
CREATE TABLE users (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email VARCHAR(255) UNIQUE NOT NULL,
    email_verified BOOLEAN DEFAULT FALSE,
    trial_remaining INT DEFAULT 3 NOT NULL,
    trial_used INT DEFAULT 0 NOT NULL,
    token_balance INT DEFAULT 0 NOT NULL,
    holiday_credits INT DEFAULT 0 NOT NULL,
    subscription_tier VARCHAR(50),
    subscription_status VARCHAR(50),
    stripe_customer_id VARCHAR(255),
    stripe_subscription_id VARCHAR(255),
    current_period_end TIMESTAMP WITH TIME ZONE,
    cancel_at_period_end BOOLEAN DEFAULT FALSE,
    preferred_language VARCHAR(10) DEFAULT 'en' NOT NULL CHECK (
        preferred_language IN ('en', 'es', 'zh')
    ),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

**Indexes:**
```sql
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_stripe_customer_id ON users(stripe_customer_id);
CREATE INDEX idx_users_preferred_language ON users(preferred_language);
```

**Row-Level Security (RLS):**
```sql
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Users can view only their own record
CREATE POLICY "Users can view own profile"
    ON users FOR SELECT
    USING (auth.uid() = id);

-- Users can update only their own record
CREATE POLICY "Users can update own profile"
    ON users FOR UPDATE
    USING (auth.uid() = id);
```

**Key Fields:**
- `trial_remaining` - Free credits remaining (starts at 3)
- `token_balance` - Purchased tokens remaining
- `holiday_credits` - Holiday decorator credits
- `subscription_status` - `active`, `canceled`, `past_due`, or `null`
- `preferred_language` - UI language: `en`, `es`, or `zh`

---

### generations

AI generation requests and results.

**Schema:**
```sql
CREATE TABLE generations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    address TEXT NOT NULL,
    geocoded_lat DECIMAL(10, 7) NOT NULL,
    geocoded_lng DECIMAL(10, 7) NOT NULL,
    areas TEXT[] NOT NULL,
    prompt TEXT NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'pending',
    image_urls JSONB DEFAULT '{}'::jsonb,
    metadata JSONB DEFAULT '{}'::jsonb,
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE
);
```

**Indexes:**
```sql
CREATE INDEX idx_generations_user_id ON generations(user_id);
CREATE INDEX idx_generations_status ON generations(status);
CREATE INDEX idx_generations_created_at ON generations(created_at DESC);
```

**RLS:**
```sql
ALTER TABLE generations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own generations"
    ON generations FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own generations"
    ON generations FOR INSERT
    WITH CHECK (auth.uid() = user_id);
```

**Status Values:**
- `pending` - Queued, not started
- `processing` - AI generation in progress
- `completed` - Success
- `failed` - Error occurred

**image_urls JSON Structure:**
```json
{
  "front_yard": {
    "original": "https://blob.vercel-storage.com/...",
    "transformed": "https://blob.vercel-storage.com/..."
  },
  "backyard": {
    "original": "https://blob.vercel-storage.com/...",
    "transformed": "https://blob.vercel-storage.com/..."
  }
}
```

---

### tokens

Token transaction history.

**Schema:**
```sql
CREATE TABLE tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    amount INT NOT NULL,
    transaction_type VARCHAR(50) NOT NULL,
    balance_after INT NOT NULL,
    stripe_payment_intent_id VARCHAR(255),
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

**Indexes:**
```sql
CREATE INDEX idx_tokens_user_id ON tokens(user_id);
CREATE INDEX idx_tokens_created_at ON tokens(created_at DESC);
CREATE INDEX idx_tokens_stripe_payment_intent ON tokens(stripe_payment_intent_id);
```

**Transaction Types:**
- `purchase` - Token package purchased
- `deduction` - Tokens used for generation
- `refund` - Payment refunded

---

### subscriptions

Subscription records (legacy table, data now in `users`).

**Schema:**
```sql
CREATE TABLE subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    stripe_subscription_id VARCHAR(255) UNIQUE NOT NULL,
    status VARCHAR(50) NOT NULL,
    plan_type VARCHAR(50) NOT NULL,
    current_period_start TIMESTAMP WITH TIME ZONE,
    current_period_end TIMESTAMP WITH TIME ZONE,
    cancel_at_period_end BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

**Note:** Subscription data migrated to `users` table. This table may be deprecated in future.

---

### holiday_generations

Holiday decorator generations (Feature 007).

**Schema:**
```sql
CREATE TABLE holiday_generations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    address TEXT NOT NULL,
    geocoded_lat DECIMAL(10, 7) NOT NULL,
    geocoded_lng DECIMAL(10, 7) NOT NULL,
    heading DECIMAL(5, 2) NOT NULL,
    pitch DECIMAL(5, 2) NOT NULL,
    style VARCHAR(50) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'pending',
    original_image_url TEXT,
    decorated_image_url TEXT,
    before_after_image_url TEXT,
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE
);
```

**Indexes:**
```sql
CREATE INDEX idx_holiday_generations_user_id ON holiday_generations(user_id);
CREATE INDEX idx_holiday_generations_status ON holiday_generations(status);
```

**Style Values:**
- `christmas` - Christmas decorations
- `halloween` - Halloween decorations
- `thanksgiving` - Thanksgiving decorations

---

## Migrations

### Migration Workflow

**1. Create Migration File**
```bash
# Naming: NNN_description.sql
touch supabase/migrations/018_add_new_feature.sql
```

**2. Write Migration**
```sql
-- Migration 018: Add new feature
-- Purpose: Description of what this migration does
-- Author: Your Name
-- Date: 2025-11-13

-- Your SQL here
CREATE TABLE ...;
CREATE INDEX ...;

-- Comments for documentation
COMMENT ON TABLE ... IS 'Description';
```

**3. Apply Migration**
```bash
# Via psql
psql $DATABASE_URL -f supabase/migrations/018_add_new_feature.sql

# Or via Supabase dashboard SQL editor
# Copy/paste migration and execute
```

**4. Verify Migration**
```sql
-- Check table exists
\dt table_name

-- Check indexes
\di

-- Check data
SELECT * FROM table_name LIMIT 5;
```

---

### Migration Best Practices

**DO:**
- Add comments explaining purpose
- Include author and date
- Use `IF NOT EXISTS` for idempotency
- Add indexes for foreign keys
- Enable RLS for user tables
- Test locally before applying to production

**DON'T:**
- Hardcode IDs or UUIDs in migrations
- Drop tables without CASCADE consideration
- Forget to add indexes on frequently queried columns
- Skip RLS policies on user-facing tables

---

## Query Patterns

### Atomic Credit Deduction

**CRITICAL:** Always use `FOR UPDATE NOWAIT` to prevent race conditions.

```sql
-- ✅ CORRECT: Atomic deduction with row-level lock
BEGIN;

SELECT trial_remaining FROM users
WHERE id = $1
FOR UPDATE NOWAIT;

UPDATE users
SET trial_remaining = trial_remaining - 1,
    trial_used = trial_used + 1
WHERE id = $1;

COMMIT;
```

**Why `FOR UPDATE NOWAIT`:**
- Acquires exclusive lock on row
- Prevents concurrent requests from reading same balance
- `NOWAIT` fails immediately if row locked (prevents deadlocks)

---

### Efficient Pagination

```sql
-- ✅ CORRECT: Use OFFSET/LIMIT with ORDER BY
SELECT * FROM generations
WHERE user_id = $1
ORDER BY created_at DESC
LIMIT $2 OFFSET $3;
```

**Performance Tips:**
- Always include `ORDER BY` for consistent results
- Use covering indexes for better performance
- Consider cursor-based pagination for large datasets

---

### Complex Joins

```sql
-- Get user with token balance and generation count
SELECT
    u.id,
    u.email,
    u.token_balance,
    COUNT(g.id) as generation_count
FROM users u
LEFT JOIN generations g ON g.user_id = u.id
WHERE u.id = $1
GROUP BY u.id, u.email, u.token_balance;
```

---

### JSON Queries

```sql
-- Query generation by area
SELECT * FROM generations
WHERE image_urls ? 'front_yard'
AND user_id = $1;

-- Extract specific JSON field
SELECT
    id,
    image_urls->'front_yard'->>'transformed' as front_yard_url
FROM generations
WHERE id = $1;
```

---

## Triggers

### User Sync Trigger

Automatically sync new users from `auth.users` to `public.users`.

```sql
-- Function
CREATE OR REPLACE FUNCTION sync_user_to_public()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.users (id, email, email_verified)
    VALUES (NEW.id, NEW.email, NEW.email_verified)
    ON CONFLICT (id) DO UPDATE
    SET email = NEW.email,
        email_verified = NEW.email_verified;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger
CREATE TRIGGER on_auth_user_created
    AFTER INSERT OR UPDATE ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION sync_user_to_public();
```

**Purpose:** Ensure every auth user has a profile in public.users

---

### Updated At Trigger

Automatically update `updated_at` timestamp.

```sql
-- Function
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger on users table
CREATE TRIGGER update_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at();

-- Trigger on generations table
CREATE TRIGGER update_generations_updated_at
    BEFORE UPDATE ON generations
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at();
```

---

## Indexing Strategy

### Primary Keys
All tables use UUID primary keys with `gen_random_uuid()` default.

### Foreign Key Indexes
```sql
-- ✅ ALWAYS index foreign keys
CREATE INDEX idx_generations_user_id ON generations(user_id);
CREATE INDEX idx_tokens_user_id ON tokens(user_id);
CREATE INDEX idx_holiday_generations_user_id ON holiday_generations(user_id);
```

### Query-Specific Indexes
```sql
-- For status filtering
CREATE INDEX idx_generations_status ON generations(status);

-- For date range queries
CREATE INDEX idx_generations_created_at ON generations(created_at DESC);

-- Composite index for complex queries
CREATE INDEX idx_generations_user_status ON generations(user_id, status);
```

### Covering Indexes
```sql
-- Include frequently accessed columns
CREATE INDEX idx_generations_user_created
    ON generations(user_id, created_at DESC)
    INCLUDE (status, address);
```

**Performance Tip:** Run `EXPLAIN ANALYZE` to verify index usage.

---

## Row-Level Security (RLS)

### Why RLS?

- Enforce access control at database level
- Protect against bugs in application code
- Comply with data privacy regulations
- Prevent unauthorized data access

### Standard Policies

**SELECT Policy:**
```sql
CREATE POLICY "Users can view own records"
    ON table_name FOR SELECT
    USING (auth.uid() = user_id);
```

**INSERT Policy:**
```sql
CREATE POLICY "Users can insert own records"
    ON table_name FOR INSERT
    WITH CHECK (auth.uid() = user_id);
```

**UPDATE Policy:**
```sql
CREATE POLICY "Users can update own records"
    ON table_name FOR UPDATE
    USING (auth.uid() = user_id);
```

**DELETE Policy:**
```sql
CREATE POLICY "Users can delete own records"
    ON table_name FOR DELETE
    USING (auth.uid() = user_id);
```

---

## Backups

### Automated Backups

**Frequency:** Daily (Supabase managed)
**Retention:** 7 days (free tier), 30+ days (paid tiers)
**Location:** Same region as database

### Manual Backup

```bash
# Full database dump
pg_dump $DATABASE_URL > backup-$(date +%Y%m%d).sql

# Specific table
pg_dump $DATABASE_URL -t users > users-backup.sql

# Restore
psql $DATABASE_URL < backup-20251113.sql
```

---

## Performance Monitoring

### Slow Query Logging

Enable via Supabase dashboard:
1. Settings → Database
2. Enable slow query logging
3. Set threshold (e.g., 1000ms)

### Query Analysis

```sql
-- View slow queries
SELECT * FROM pg_stat_statements
ORDER BY mean_exec_time DESC
LIMIT 10;

-- Active queries
SELECT * FROM pg_stat_activity
WHERE state = 'active';

-- Table sizes
SELECT
    schemaname,
    tablename,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
```

---

## Connection Pooling

### Backend (asyncpg)

```python
# backend/src/db/connection_pool.py
pool = await asyncpg.create_pool(
    dsn=DATABASE_URL,
    min_size=10,
    max_size=20,
    command_timeout=60
)
```

**Settings:**
- `min_size`: Minimum connections kept open
- `max_size`: Maximum concurrent connections
- `command_timeout`: Query timeout in seconds

### Connection Limits

**Supabase Free Tier:** 100 concurrent connections
**Supabase Pro Tier:** 200+ concurrent connections

---

For API details, see [API.md](API.md).
For architecture patterns, see [ARCHITECTURE.md](ARCHITECTURE.md).
For migration examples, see `supabase/migrations/`.
