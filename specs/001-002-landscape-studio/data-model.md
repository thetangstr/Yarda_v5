# Data Model: AI Landscape Studio Platform

**Feature**: 001-002-landscape-studio
**Date**: 2025-11-03
**Database**: PostgreSQL (Supabase)

## Overview

This document defines the database schema for the AI Landscape Studio platform's token and subscription system. The schema is designed to support:
- Atomic financial operations (row-level locking)
- Race condition prevention (database constraints)
- Idempotent webhook processing (unique constraints)
- ACID transaction guarantees

**Key Design Principles**:
1. **Financial Integrity**: All token operations must be atomic and auditable
2. **Race Condition Prevention**: Database-level locks and constraints
3. **Idempotency**: Unique constraints on external IDs (Stripe payment intents)
4. **Performance**: Indexes on all frequently queried columns
5. **Audit Trail**: Complete transaction history (100% completeness)

---

## Entity Relationship Diagram

```
┌─────────────────────┐
│       users         │
│─────────────────────│
│ id (PK)             │
│ email (UNIQUE)      │
│ firebase_uid (UNIQUE│
│ trial_remaining     │      ┌──────────────────────────┐
│ trial_used          │      │  users_token_accounts    │
│ subscription_tier   │      │──────────────────────────│
│ subscription_status │      │ id (PK)                  │
│ stripe_customer_id  │◄─────┤ user_id (FK, UNIQUE)     │
│ stripe_subscription │      │ balance                  │
│ current_period_end  │      │ auto_reload_enabled      │
│ created_at          │      │ auto_reload_threshold    │
│ updated_at          │      │ auto_reload_amount       │
└─────────────────────┘      │ auto_reload_failure_count│
          │                  │ last_reload_at           │
          │                  │ created_at               │
          │                  │ updated_at               │
          │                  └──────────────────────────┘
          │                            │
          │                            │
          │                            ▼
          │                  ┌──────────────────────────┐
          │                  │ users_token_transactions │
          │                  │──────────────────────────│
          │                  │ id (PK)                  │
          │                  │ user_id (FK)             │
          │                  │ token_account_id (FK)    │
          │                  │ amount                   │
          │                  │ type                     │
          │                  │ description              │
          │                  │ balance_after            │
          │                  │ stripe_payment_intent_id │
          │                  │ created_at               │
          │                  └──────────────────────────┘
          │
          ▼
┌─────────────────────────┐
│     generations         │
│─────────────────────────│
│ id (PK)                 │
│ user_id (FK)            │
│ request_id (UNIQUE)     │
│ address                 │
│ area                    │
│ style                   │
│ custom_prompt           │
│ status                  │
│ image_urls (JSONB)      │
│ payment_type            │
│ tokens_deducted         │
│ error_message           │
│ created_at              │
│ completed_at            │
└─────────────────────────┘
```

---

## Entity Definitions

### 1. users

**Purpose**: Core user account with authentication credentials and subscription status

**Fields**:

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PRIMARY KEY, DEFAULT gen_random_uuid() | Unique user identifier |
| email | VARCHAR(255) | UNIQUE, NOT NULL | User email address |
| email_verified | BOOLEAN | DEFAULT false | Email verification status |
| firebase_uid | VARCHAR(255) | UNIQUE, NOT NULL | Firebase Authentication UID |
| trial_remaining | INTEGER | DEFAULT 3, CHECK (trial_remaining >= 0) | Trial credits remaining |
| trial_used | INTEGER | DEFAULT 0 | Trial credits used |
| subscription_tier | VARCHAR(50) | DEFAULT 'free' | free/7day/property/monthly_pro |
| subscription_status | VARCHAR(50) | DEFAULT 'inactive' | inactive/active/past_due/cancelled |
| stripe_customer_id | VARCHAR(255) | UNIQUE | Stripe customer ID |
| stripe_subscription_id | VARCHAR(255) | | Stripe subscription ID |
| current_period_end | TIMESTAMP | | Subscription period end date |
| created_at | TIMESTAMP | DEFAULT NOW() | Account creation timestamp |
| updated_at | TIMESTAMP | DEFAULT NOW() | Last updated timestamp |

**Indexes**:
```sql
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_firebase_uid ON users(firebase_uid);
CREATE INDEX idx_users_stripe_customer_id ON users(stripe_customer_id);
CREATE INDEX idx_users_subscription_status ON users(subscription_status);
```

**Validation Rules**:
- `email`: RFC 5322 format (validated at application layer)
- `trial_remaining`: Must be >= 0 (database constraint)
- `subscription_tier`: ENUM ['free', '7day', 'property', 'monthly_pro']
- `subscription_status`: ENUM ['inactive', 'active', 'past_due', 'cancelled']

**State Transitions** (subscription_status):
```
inactive → active (on subscription purchase)
active → past_due (on renewal failure)
active → cancelled (on user cancellation, end of period)
past_due → active (on payment method update + retry)
past_due → cancelled (after 7-day grace period)
```

**Mapped Requirements**: FR-001 to FR-010 (Authentication), FR-011 to FR-016 (Trial System), FR-043 to FR-054 (Subscription)

---

### 2. users_token_accounts

**Purpose**: Token balance and auto-reload configuration for each user

**Fields**:

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PRIMARY KEY, DEFAULT gen_random_uuid() | Unique account identifier |
| user_id | UUID | FOREIGN KEY → users(id), UNIQUE, NOT NULL | User reference (1:1 relationship) |
| balance | INTEGER | DEFAULT 0, CHECK (balance >= 0) | Current token balance |
| auto_reload_enabled | BOOLEAN | DEFAULT false | Auto-reload feature enabled |
| auto_reload_threshold | INTEGER | CHECK (auto_reload_threshold >= 1 AND auto_reload_threshold <= 100) | Trigger reload when balance < threshold |
| auto_reload_amount | INTEGER | CHECK (auto_reload_amount >= 10) | Tokens to add on auto-reload |
| auto_reload_failure_count | INTEGER | DEFAULT 0 | Consecutive auto-reload failures |
| last_reload_at | TIMESTAMP | | Last auto-reload trigger timestamp |
| created_at | TIMESTAMP | DEFAULT NOW() | Account creation timestamp |
| updated_at | TIMESTAMP | DEFAULT NOW() | Last updated timestamp |

**Indexes**:
```sql
CREATE UNIQUE INDEX idx_token_accounts_user_id ON users_token_accounts(user_id);
CREATE INDEX idx_token_accounts_auto_reload ON users_token_accounts(auto_reload_enabled) WHERE auto_reload_enabled = true;
```

**Validation Rules**:
- `balance`: Must be >= 0 (prevents negative balances, critical for FR-022)
- `auto_reload_threshold`: 1-100 tokens (FR-034)
- `auto_reload_amount`: Minimum 10 tokens (FR-034)
- `auto_reload_failure_count`: Disabled after 3 failures (FR-040)

**Business Logic**:
- **Auto-Reload Trigger**: After each token deduction, check if `balance < auto_reload_threshold` AND `auto_reload_enabled = true` AND `(last_reload_at IS NULL OR NOW() - last_reload_at > INTERVAL '60 seconds')`
- **Failure Handling**: Increment `auto_reload_failure_count` on Stripe payment failure, set `auto_reload_enabled = false` when count reaches 3
- **Success Reset**: Set `auto_reload_failure_count = 0` on successful auto-reload

**Mapped Requirements**: FR-017 to FR-027 (Token System), FR-034 to FR-042 (Auto-Reload)

---

### 3. users_token_transactions

**Purpose**: Complete audit trail of all token operations (purchases, deductions, refunds, auto-reload)

**Fields**:

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PRIMARY KEY, DEFAULT gen_random_uuid() | Unique transaction identifier |
| user_id | UUID | FOREIGN KEY → users(id), NOT NULL | User reference |
| token_account_id | UUID | FOREIGN KEY → users_token_accounts(id), NOT NULL | Token account reference |
| amount | INTEGER | NOT NULL | Token amount (+positive for credit, -negative for debit) |
| type | VARCHAR(50) | NOT NULL | purchase/deduction/refund/auto_reload |
| description | TEXT | | Human-readable transaction description |
| balance_after | INTEGER | NOT NULL | Token balance after this transaction |
| stripe_payment_intent_id | VARCHAR(255) | UNIQUE (when NOT NULL) | Stripe payment intent ID (for idempotency) |
| created_at | TIMESTAMP | DEFAULT NOW() | Transaction timestamp |

**Indexes**:
```sql
CREATE INDEX idx_token_transactions_user_created ON users_token_transactions(user_id, created_at DESC);
CREATE INDEX idx_token_transactions_type ON users_token_transactions(type);
CREATE UNIQUE INDEX idx_token_transactions_stripe_payment_intent ON users_token_transactions(stripe_payment_intent_id) WHERE stripe_payment_intent_id IS NOT NULL;
```

**Validation Rules**:
- `type`: ENUM ['purchase', 'deduction', 'refund', 'auto_reload']
- `stripe_payment_intent_id`: UNIQUE constraint for idempotency (FR-020)
- `amount`: Positive for purchases/refunds/auto_reload, negative for deductions

**Transaction Types**:

| Type | Amount | Description Example | Triggered By |
|------|--------|---------------------|--------------|
| purchase | +50 | "50 tokens purchased ($10)" | User completes Stripe checkout |
| deduction | -1 | "Design generation: Modern style" | User generates design |
| refund | +1 | "Generation failed: Timeout" | Generation fails |
| auto_reload | +100 | "Auto-reload triggered (balance was 19)" | Balance drops below threshold |

**Idempotency Logic**:
```sql
-- Before processing Stripe webhook
SELECT * FROM users_token_transactions
WHERE stripe_payment_intent_id = 'pi_xxx';

-- If exists: return success (already processed)
-- If not exists: proceed with credit + INSERT transaction
```

**Mapped Requirements**: FR-020 (Idempotency), FR-025 (Transaction Recording), FR-028 to FR-033 (Transaction History), NFR-2.2 (Data Integrity)

---

### 4. generations

**Purpose**: Track landscape design generation requests and results

**Fields**:

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PRIMARY KEY, DEFAULT gen_random_uuid() | Unique generation identifier |
| user_id | UUID | FOREIGN KEY → users(id), NOT NULL | User reference |
| request_id | VARCHAR(255) | UNIQUE, NOT NULL | Client-generated request ID (for progress tracking) |
| address | TEXT | | Property address |
| area | VARCHAR(50) | NOT NULL | Front Yard/Backyard/Walkway/Side Yard |
| style | VARCHAR(50) | NOT NULL | Modern Minimalist/California Native/etc. |
| custom_prompt | TEXT | | User's custom prompt (max 500 chars) |
| status | VARCHAR(50) | DEFAULT 'pending', NOT NULL | pending/processing/completed/failed |
| image_urls | JSONB | | Array of generated image URLs |
| payment_type | VARCHAR(50) | | trial/token/subscription |
| tokens_deducted | INTEGER | | Number of tokens deducted (0 for trial/subscription) |
| error_message | TEXT | | Error details if status='failed' |
| created_at | TIMESTAMP | DEFAULT NOW() | Request timestamp |
| completed_at | TIMESTAMP | | Completion timestamp |

**Indexes**:
```sql
CREATE INDEX idx_generations_user_created ON generations(user_id, created_at DESC);
CREATE UNIQUE INDEX idx_generations_request_id ON generations(request_id);
CREATE INDEX idx_generations_status ON generations(status);
```

**Validation Rules**:
- `area`: ENUM ['Front Yard', 'Backyard', 'Walkway', 'Side Yard'] (FR-057)
- `style`: ENUM ['Modern Minimalist', 'California Native', 'Japanese Zen', 'English Garden', 'Desert Landscape'] (FR-058)
- `status`: ENUM ['pending', 'processing', 'completed', 'failed']
- `payment_type`: ENUM ['trial', 'token', 'subscription']
- `custom_prompt`: Max 500 characters (FR-059)

**Status Transitions**:
```
pending → processing (on Gemini API call start)
processing → completed (on success, save image_urls)
processing → failed (on error, save error_message)
```

**Multi-Area Support**:
- Each area in a multi-area request creates a separate `generations` record
- All share the same `request_id` (for grouping in UI)
- Failures handled independently (failed area refunds 1 token)

**Mapped Requirements**: FR-055 to FR-070 (Design Generation), FR-071 to FR-079 (Gallery)

---

### 5. rate_limits (Optional - May use existing Firestore)

**Purpose**: Track API rate limiting per user per endpoint

**Fields**:

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PRIMARY KEY, DEFAULT gen_random_uuid() | Unique rate limit record |
| user_id | UUID | FOREIGN KEY → users(id), NOT NULL | User reference |
| endpoint | VARCHAR(255) | NOT NULL | API endpoint path |
| request_count | INTEGER | DEFAULT 0 | Requests in current window |
| window_start | TIMESTAMP | NOT NULL | Rate limit window start |
| window_end | TIMESTAMP | NOT NULL | Rate limit window end |

**Indexes**:
```sql
CREATE UNIQUE INDEX idx_rate_limits_user_endpoint_window ON rate_limits(user_id, endpoint, window_start);
```

**Rate Limit Rules** (from FR-088):

| Endpoint | Limit | Window |
|----------|-------|--------|
| `/api/design/complete-landscape` | 10 requests | 1 minute |
| `/api/v1/tokens?action=purchase` | 5 requests | 1 hour |
| `/api/auth/login` | 5 requests | 15 minutes |
| `/api/auth/register` | 3 requests | 1 hour |
| `/api/subscription/webhook` | No limit | - |

**Mapped Requirements**: FR-088 (Rate Limiting), NFR-3.3 (Security Measures)

---

## Database Functions

### Function 1: get_token_balance

**Purpose**: Fetch current token balance for a user (fast lookup)

```sql
CREATE OR REPLACE FUNCTION get_token_balance(p_user_id UUID)
RETURNS INTEGER AS $$
BEGIN
    RETURN (
        SELECT balance
        FROM users_token_accounts
        WHERE user_id = p_user_id
    );
END;
$$ LANGUAGE plpgsql STABLE;
```

**Usage**: Called by `/api/v1/tokens?action=balance` endpoint

---

### Function 2: deduct_token_atomic

**Purpose**: Atomically deduct token with row-level locking

```sql
CREATE OR REPLACE FUNCTION deduct_token_atomic(p_user_id UUID, p_description TEXT)
RETURNS BOOLEAN AS $$
DECLARE
    v_account_id UUID;
    v_balance INTEGER;
    v_new_balance INTEGER;
BEGIN
    -- Lock row for update
    SELECT id, balance INTO v_account_id, v_balance
    FROM users_token_accounts
    WHERE user_id = p_user_id
    FOR UPDATE;

    IF v_balance < 1 THEN
        RETURN FALSE;  -- Insufficient tokens
    END IF;

    v_new_balance := v_balance - 1;

    -- Deduct token
    UPDATE users_token_accounts
    SET balance = v_new_balance, updated_at = NOW()
    WHERE id = v_account_id;

    -- Record transaction
    INSERT INTO users_token_transactions (user_id, token_account_id, amount, type, description, balance_after)
    VALUES (p_user_id, v_account_id, -1, 'deduction', p_description, v_new_balance);

    RETURN TRUE;
END;
$$ LANGUAGE plpgsql;
```

**Usage**: Called by generation service before Gemini API call

---

### Function 3: check_auto_reload_trigger

**Purpose**: Check if auto-reload should be triggered after token deduction

```sql
CREATE OR REPLACE FUNCTION check_auto_reload_trigger(p_user_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
    v_account RECORD;
    v_should_trigger BOOLEAN;
BEGIN
    SELECT * INTO v_account
    FROM users_token_accounts
    WHERE user_id = p_user_id;

    IF NOT v_account.auto_reload_enabled THEN
        RETURN FALSE;
    END IF;

    IF v_account.balance >= v_account.auto_reload_threshold THEN
        RETURN FALSE;  -- Balance still above threshold
    END IF;

    -- Check throttle (60 seconds)
    IF v_account.last_reload_at IS NOT NULL THEN
        IF EXTRACT(EPOCH FROM (NOW() - v_account.last_reload_at)) < 60 THEN
            RETURN FALSE;  -- Throttled
        END IF;
    END IF;

    RETURN TRUE;
END;
$$ LANGUAGE plpgsql STABLE;
```

**Usage**: Called after every token deduction to check if auto-reload should trigger

---

## Database Triggers

### Trigger 1: update_updated_at

**Purpose**: Automatically update `updated_at` timestamp on row modification

```sql
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_token_accounts_updated_at
    BEFORE UPDATE ON users_token_accounts
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
```

---

### Trigger 2: validate_token_balance

**Purpose**: Ensure token balance never goes negative (additional safety check)

```sql
CREATE OR REPLACE FUNCTION validate_token_balance()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.balance < 0 THEN
        RAISE EXCEPTION 'Token balance cannot be negative: %', NEW.balance;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER check_token_balance
    BEFORE INSERT OR UPDATE ON users_token_accounts
    FOR EACH ROW
    EXECUTE FUNCTION validate_token_balance();
```

---

## Row-Level Security (RLS) Policies

### Policy 1: users - Self-Access Only

```sql
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Users can only read/update their own record
CREATE POLICY users_select_own ON users
    FOR SELECT
    USING (firebase_uid = current_setting('request.jwt.claim.sub')::TEXT);

CREATE POLICY users_update_own ON users
    FOR UPDATE
    USING (firebase_uid = current_setting('request.jwt.claim.sub')::TEXT);
```

---

### Policy 2: users_token_accounts - Self-Access Only

```sql
ALTER TABLE users_token_accounts ENABLE ROW LEVEL SECURITY;

CREATE POLICY token_accounts_select_own ON users_token_accounts
    FOR SELECT
    USING (user_id IN (
        SELECT id FROM users WHERE firebase_uid = current_setting('request.jwt.claim.sub')::TEXT
    ));

CREATE POLICY token_accounts_update_own ON users_token_accounts
    FOR UPDATE
    USING (user_id IN (
        SELECT id FROM users WHERE firebase_uid = current_setting('request.jwt.claim.sub')::TEXT
    ));
```

---

### Policy 3: users_token_transactions - Read-Only for Users

```sql
ALTER TABLE users_token_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY token_transactions_select_own ON users_token_transactions
    FOR SELECT
    USING (user_id IN (
        SELECT id FROM users WHERE firebase_uid = current_setting('request.jwt.claim.sub')::TEXT
    ));

-- No UPDATE/DELETE policy (transactions are immutable)
```

---

### Policy 4: generations - Self-Access Only

```sql
ALTER TABLE generations ENABLE ROW LEVEL SECURITY;

CREATE POLICY generations_select_own ON generations
    FOR SELECT
    USING (user_id IN (
        SELECT id FROM users WHERE firebase_uid = current_setting('request.jwt.claim.sub')::TEXT
    ));

CREATE POLICY generations_insert_own ON generations
    FOR INSERT
    WITH CHECK (user_id IN (
        SELECT id FROM users WHERE firebase_uid = current_setting('request.jwt.claim.sub')::TEXT
    ));

CREATE POLICY generations_update_own ON generations
    FOR UPDATE
    USING (user_id IN (
        SELECT id FROM users WHERE firebase_uid = current_setting('request.jwt.claim.sub')::TEXT
    ));
```

---

## Data Integrity Checks

### Daily Audit Queries

**1. Token Balance Reconciliation**:
```sql
-- Verify that balance = sum of transactions for all users
SELECT
    ta.user_id,
    ta.balance AS current_balance,
    COALESCE(SUM(tt.amount), 0) AS calculated_balance,
    ta.balance - COALESCE(SUM(tt.amount), 0) AS discrepancy
FROM users_token_accounts ta
LEFT JOIN users_token_transactions tt ON ta.user_id = tt.user_id
GROUP BY ta.user_id, ta.balance
HAVING ta.balance != COALESCE(SUM(tt.amount), 0);

-- Expected result: 0 rows (no discrepancies)
```

**2. Negative Balance Check**:
```sql
-- Verify no negative balances exist (should be prevented by CHECK constraint)
SELECT * FROM users_token_accounts WHERE balance < 0;

-- Expected result: 0 rows
```

**3. Duplicate Stripe Payment Intent Check**:
```sql
-- Verify no duplicate stripe_payment_intent_id (should be prevented by UNIQUE constraint)
SELECT stripe_payment_intent_id, COUNT(*)
FROM users_token_transactions
WHERE stripe_payment_intent_id IS NOT NULL
GROUP BY stripe_payment_intent_id
HAVING COUNT(*) > 1;

-- Expected result: 0 rows
```

**4. Orphaned Token Accounts Check**:
```sql
-- Verify all token accounts have corresponding users
SELECT ta.*
FROM users_token_accounts ta
LEFT JOIN users u ON ta.user_id = u.id
WHERE u.id IS NULL;

-- Expected result: 0 rows
```

---

## Performance Considerations

### Query Optimization

**1. Token Balance Fetch (Target: <100ms)**:
```sql
-- Optimized with index on user_id (UNIQUE constraint)
SELECT balance FROM users_token_accounts WHERE user_id = $1;
```

**2. Transaction History with Pagination (Target: <200ms)**:
```sql
-- Optimized with composite index (user_id, created_at DESC)
SELECT * FROM users_token_transactions
WHERE user_id = $1
ORDER BY created_at DESC
LIMIT 20 OFFSET $2;
```

**3. Generation History (Target: <200ms)**:
```sql
-- Optimized with composite index (user_id, created_at DESC)
SELECT * FROM generations
WHERE user_id = $1
ORDER BY created_at DESC
LIMIT 20;
```

### Connection Pooling

**Configuration** (psycopg2):
```python
connection_pool = psycopg2.pool.SimpleConnectionPool(
    minconn=5,
    maxconn=20,
    host=os.getenv('POSTGRES_HOST'),
    database=os.getenv('POSTGRES_DB'),
    user=os.getenv('POSTGRES_USER'),
    password=os.getenv('POSTGRES_PASSWORD')
)
```

- **Min Connections**: 5 (always warm)
- **Max Connections**: 20 (prevent exhaustion)
- **Timeout**: 5 seconds (fail fast)
- **Monitoring**: Alert when >90% pool utilization

---

## Migration Strategy

### Migration Files

All migrations in `supabase/migrations/` directory, applied sequentially:

1. `001_create_users_table.sql` - Existing users table + subscription fields
2. `002_create_token_accounts.sql` - NEW token balance and auto-reload
3. `003_create_token_transactions.sql` - NEW transaction audit trail
4. `004_create_subscriptions.sql` - Subscription lifecycle tracking (if separate table needed)
5. `005_extend_generations.sql` - Extend existing generations table for multi-area
6. `006_create_rate_limits.sql` - Existing rate limits table
7. `007_create_functions.sql` - Database functions (get_balance, deduct_atomic, etc.)
8. `008_create_indexes.sql` - Performance indexes
9. `009_create_rls_policies.sql` - Row-level security policies
10. `010_create_triggers.sql` - Auto-update triggers

### Migration Validation

After each migration:
```sql
-- Verify all tables exist
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public'
ORDER BY table_name;

-- Verify all indexes exist
SELECT indexname FROM pg_indexes
WHERE schemaname = 'public'
ORDER BY indexname;

-- Verify all constraints exist
SELECT conname, contype FROM pg_constraint
WHERE connamespace = 'public'::regnamespace
ORDER BY conname;
```

---

## Mapped Requirements

This data model supports the following functional requirements from [spec.md](./spec.md):

**Authentication & User Management**: FR-001 to FR-010
**Trial System**: FR-011 to FR-016
**Token System**: FR-017 to FR-027
**Transaction History**: FR-028 to FR-033
**Auto-Reload**: FR-034 to FR-042
**Subscription System**: FR-043 to FR-054
**Design Generation**: FR-055 to FR-070
**Gallery**: FR-071 to FR-079
**Account Management**: FR-080 to FR-088

**Non-Functional Requirements**:
- NFR-1.1: Performance (<100ms token operations)
- NFR-2.2: Data Integrity (ACID transactions, row-level locking)
- NFR-3.1: Authentication & Authorization (RLS policies)
- NFR-3.2: Data Privacy (user data isolation)

---

**Document Status**: ✅ Complete | Schema ready for implementation
**Next Phase**: API Contracts (contracts/openapi.yaml)
