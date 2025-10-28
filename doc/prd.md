# Phase 1.1: Data Model

**Date**: 2025-10-28
**Feature**: 001-trial-generation
**Database**: Supabase PostgreSQL

---

## Overview

The data model supports user registration, trial credit tracking, design generation history, and rate limiting. The schema emphasizes atomic operations for trial consumption and isolation via Row Level Security (RLS).

---

## Entities

### 1. Users

**Purpose**: Core user account with trial tracking

**SQL Definition**:
```sql
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  auth_user_id UUID NOT NULL REFERENCES auth.users(id),
  trial_remaining INT DEFAULT 3 CHECK (trial_remaining >= 0),
  trial_used INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT now(),
  email_verified_at TIMESTAMP,
  updated_at TIMESTAMP DEFAULT now(),
  UNIQUE(auth_user_id),
  INDEX (email)
);
```

**Attributes**:
- `id` (UUID): Primary key, unique user identifier
- `email` (TEXT): User's email, unique, used for login
- `auth_user_id` (UUID): Foreign key to Supabase Auth user
- `trial_remaining` (INT 0-3): Remaining free trial credits (NOT NULL, default 3)
- `trial_used` (INT ≥0): Count of trials already consumed
- `created_at` (TIMESTAMP): Registration timestamp
- `email_verified_at` (TIMESTAMP): When user verified email (NULL until verified)
- `updated_at` (TIMESTAMP): Last update timestamp

**Validation Rules**:
- `trial_remaining` ≥ 0 (check constraint prevents negative)
- `trial_remaining` ≤ 3 (enforced by application logic)
- `email` unique (database constraint)
- `auth_user_id` unique (one-to-one with Supabase Auth)

**State Transitions**:
- **Created**: `trial_remaining=3, email_verified_at=NULL`
- **Email Verified**: `email_verified_at={timestamp}`
- **Trial Used**: `trial_remaining--`, `trial_used++` (via trigger/function)
- **Exhausted**: `trial_remaining=0` (prompts purchase)

**Row Level Security**:
```sql
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users see own profile"
  ON users FOR SELECT
  USING (auth.uid() = auth_user_id);

CREATE POLICY "Authenticated users can update own email"
  ON users FOR UPDATE
  USING (auth.uid() = auth_user_id)
  WITH CHECK (auth.uid() = auth_user_id);
```

**Relationships**:
- ← `token_accounts` (1:1): User's token balance
- ← `generations` (1:N): User's design generations
- → `auth.users` (1:1): Supabase Auth user

**Indexes**:
- `email` (UNIQUE for login)
- `created_at` (for analytics queries)

---

### 2. TokenAccounts

**Purpose**: Track paid token balance (for future token purchases)

**SQL Definition**:
```sql
CREATE TABLE token_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  balance INT DEFAULT 0 CHECK (balance >= 0),
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now()
);
```

**Attributes**:
- `id` (UUID): Primary key
- `user_id` (UUID): Foreign key to users (1:1 unique)
- `balance` (INT ≥0): Available paid tokens
- `created_at` (TIMESTAMP): When account created (on user signup)
- `updated_at` (TIMESTAMP): Last balance change

**Validation Rules**:
- `balance` ≥ 0 (check constraint)
- `user_id` unique (1:1 with user)
- `user_id` NOT NULL

**State Transitions**:
- **Created**: `balance=0` (on user signup)
- **Token Purchase**: `balance += quantity` (via Stripe webhook)
- **Generation Paid**: `balance--` (if trials exhausted, future Phase 2)

**Row Level Security**:
```sql
ALTER TABLE token_accounts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users see own token account"
  ON token_accounts FOR SELECT
  USING (user_id = (SELECT id FROM users WHERE auth_user_id = auth.uid()));
```

**Relationships**:
- → `users` (N:1): Owner user

**Indexes**:
- `user_id` (for queries by user)

**Future Extension** (Phase 2):
```sql
-- Add audit trail for token changes
CREATE TABLE token_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  token_account_id UUID NOT NULL REFERENCES token_accounts(id),
  change_amount INT NOT NULL,  -- Positive (purchase) or negative (consumption)
  reason TEXT,  -- 'purchase' | 'generation' | 'refund'
  created_at TIMESTAMP DEFAULT now()
);
```

---

### 3. Generations

**Purpose**: Track every design generation (for history, analytics, debugging)

**SQL Definition**:
```sql
CREATE TABLE generations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  property_photo_url TEXT,
  property_address TEXT,
  style_selected TEXT NOT NULL,
  custom_prompt TEXT,
  generated_image_url TEXT,
  status TEXT NOT NULL CHECK (status IN ('pending', 'success', 'failed')),
  error_message TEXT,
  created_at TIMESTAMP DEFAULT now(),
  completed_at TIMESTAMP,
  generation_time_ms INT,
  trial_used BOOLEAN NOT NULL DEFAULT TRUE,
  INDEX (user_id, created_at),
  INDEX (status, created_at)
);
```

**Attributes**:
- `id` (UUID): Primary key
- `user_id` (UUID): Foreign key to users
- `property_photo_url` (TEXT, optional): Path to input photo in Supabase Storage
- `property_address` (TEXT, optional): Address if user provided text address instead of photo
- `style_selected` (TEXT, required): Design style name (e.g., "Modern Minimalist", "California Native")
- `custom_prompt` (TEXT, optional): User's custom guidance text
- `generated_image_url` (TEXT): Path to output design in Supabase Storage
- `status` (TEXT): 'pending' | 'success' | 'failed'
- `error_message` (TEXT): Reason if failed (Gemini timeout, invalid image, etc.)
- `created_at` (TIMESTAMP): When generation was requested
- `completed_at` (TIMESTAMP): When generation completed (NULL if still pending)
- `generation_time_ms` (INT): Duration in milliseconds (NULL if pending)
- `trial_used` (BOOLEAN): Whether this consumed a trial credit (vs paid token)

**Validation Rules**:
- `status` IN ('pending', 'success', 'failed') (enum check)
- `generated_image_url` NOT NULL if `status='success'`
- `error_message` NOT NULL if `status='failed'`
- `completed_at` NOT NULL if `status != 'pending'`
- At least one of `property_photo_url` or `property_address` must be provided

**State Transitions**:
- **Created**: `status='pending', created_at={now}`
- **Success**: `status='success', completed_at={now}, generated_image_url={path}, generation_time_ms={duration}`
- **Failed**: `status='failed', error_message={reason}, completed_at={now}`

**Row Level Security**:
```sql
ALTER TABLE generations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users see own generations"
  ON generations FOR SELECT
  USING (user_id = (SELECT id FROM users WHERE auth_user_id = auth.uid()));

CREATE POLICY "Users insert own generations"
  ON generations FOR INSERT
  WITH CHECK (user_id = (SELECT id FROM users WHERE auth_user_id = auth.uid()));
```

**Relationships**:
- → `users` (N:1): Owner user

**Indexes**:
- `(user_id, created_at)`: Query user's recent generations
- `(status, created_at)`: Find pending/failed generations for cleanup jobs

**Future Queries**:
- "How many designs has this user generated?" → COUNT(*) WHERE user_id = ?
- "What styles are popular?" → SELECT style_selected, COUNT(*) GROUP BY style_selected
- "What's the average generation time?" → SELECT AVG(generation_time_ms) WHERE status='success'

---

### 4. GenerationAttempts (Rate Limiting)

**Purpose**: Track generation attempts for rate limiting (3 per minute per user)

**SQL Definition** (or use Redis alternative):
```sql
CREATE TABLE generation_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  attempted_at TIMESTAMP DEFAULT now(),
  INDEX (user_id, attempted_at)
);

-- Auto-cleanup old records (>1 minute old)
CREATE OR REPLACE FUNCTION cleanup_old_attempts() RETURNS void AS $$
BEGIN
  DELETE FROM generation_attempts
  WHERE attempted_at < now() - INTERVAL '2 minutes';
END;
$$ LANGUAGE plpgsql;

-- Run cleanup on a schedule (via pg_cron or application job)
-- SELECT cron.schedule('cleanup-attempts', '*/5 * * * *', 'SELECT cleanup_old_attempts()');
```

**Attributes**:
- `id` (UUID): Primary key
- `user_id` (UUID): Foreign key to users
- `attempted_at` (TIMESTAMP): When generation was attempted

**Validation Rules**:
- `user_id` NOT NULL
- Records older than 2 minutes can be deleted (window is 1 minute, +1 for cleanup)

**Rate Limiting Logic**:
```python
async def is_generation_allowed(user_id: str) -> bool:
    """Check if user can generate (max 3 per minute)"""
    # Count recent attempts (last 60 seconds)
    count = supabase.table("generation_attempts")\
        .select("count", count="exact")\
        .eq("user_id", user_id)\
        .gt("attempted_at", (now - 60 seconds).isoformat())\
        .execute()

    return count.count < 3

# If allowed, insert attempt record
if is_generation_allowed(user_id):
    supabase.table("generation_attempts").insert({
        "user_id": user_id,
        "attempted_at": now()
    }).execute()
```

**Alternative**: Use Redis for faster rate limiting (see research.md)

---

## Critical Operations

### Atomic Trial Consumption

**Challenge**: Prevent double-generation if user clicks "Generate" twice rapidly

**Solution**: Use PostgreSQL function with transaction isolation

```sql
-- Create function for atomic trial consumption
CREATE FUNCTION consume_trial(p_user_id UUID)
  RETURNS TABLE(success BOOLEAN, trials_remaining INT) AS $$
DECLARE
  v_trials INT;
BEGIN
  -- Check and decrement atomically
  UPDATE users
  SET trial_remaining = trial_remaining - 1,
      trial_used = trial_used + 1,
      updated_at = now()
  WHERE id = p_user_id
    AND trial_remaining > 0;

  -- Return result
  SELECT trial_remaining INTO v_trials FROM users WHERE id = p_user_id;

  RETURN QUERY SELECT
    CASE WHEN FOUND THEN true ELSE false END,
    COALESCE(v_trials, 0);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Backend call
result = supabase.rpc("consume_trial", {"p_user_id": user_id}).execute()
if result.data[0]['success']:
    # Proceed with generation
else:
    # Trial exhausted or error
    raise HTTPException(status_code=402, detail="No trials remaining")
```

**Why This Works**:
- SQL UPDATE is atomic (database-level guarantee)
- Check constraint prevents negative balance
- No race condition possible (database lock during update)
- Single round-trip to database

---

## Migrations

**Migration File**: `backend/migrations/001_initial_schema.sql`

```sql
-- Create auth schema reference
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  auth_user_id UUID NOT NULL REFERENCES auth.users(id),
  trial_remaining INT DEFAULT 3 CHECK (trial_remaining >= 0),
  trial_used INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT now(),
  email_verified_at TIMESTAMP,
  updated_at TIMESTAMP DEFAULT now(),
  UNIQUE(auth_user_id)
);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_created ON users(created_at);

-- Token accounts
CREATE TABLE token_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  balance INT DEFAULT 0 CHECK (balance >= 0),
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now()
);

-- Generations
CREATE TABLE generations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  property_photo_url TEXT,
  property_address TEXT,
  style_selected TEXT NOT NULL,
  custom_prompt TEXT,
  generated_image_url TEXT,
  status TEXT NOT NULL CHECK (status IN ('pending', 'success', 'failed')),
  error_message TEXT,
  created_at TIMESTAMP DEFAULT now(),
  completed_at TIMESTAMP,
  generation_time_ms INT,
  trial_used BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE INDEX idx_generations_user ON generations(user_id, created_at);
CREATE INDEX idx_generations_status ON generations(status, created_at);

-- Generation attempts (rate limiting)
CREATE TABLE generation_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  attempted_at TIMESTAMP DEFAULT now()
);

CREATE INDEX idx_gen_attempts_user_time ON generation_attempts(user_id, attempted_at);

-- RLS Policies
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE token_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE generations ENABLE ROW LEVEL SECURITY;
ALTER TABLE generation_attempts ENABLE ROW LEVEL SECURITY;

-- [Copy RLS policy definitions from above]
```

---

## Diagram

```
┌─────────────────────────────────────────────────────┐
│ auth.users (Supabase Auth)                          │
│ ├─ id (UUID)                                        │
│ ├─ email                                            │
│ └─ [email_confirmed_at, etc.]                       │
└──────────────────┬──────────────────────────────────┘
                   │ 1:1
                   │
                   ↓
┌─────────────────────────────────────────────────────┐
│ users                                               │
│ ├─ id (UUID) ◄──────┐                              │
│ ├─ auth_user_id ◄──┤ references                     │
│ ├─ email            │                               │
│ ├─ trial_remaining  │                               │
│ ├─ trial_used       │                               │
│ └─ created_at       │                               │
└─────┬──────────┬────┼─────────┬──────────────────┬──┘
      │          │    │         │                  │
    1:1          │    │         │                  │
      │          │    │         │                  │
      ↓          │    │       1:N               1:N
┌─────────────┐  │    │         │                  │
│ token_      │  │    │         │                  │
│ accounts    │  │    │         ↓                  ↓
│ ├─ id       │  │    │    ┌──────────────┐ ┌──────────────────┐
│ ├─ user_id ◄──┘    │    │ generations  │ │ gen_attempts     │
│ ├─ balance │       │    │ ├─ id         │ │ ├─ id            │
│ └─ ...     │       │    │ ├─ user_id ◄─┼─┤ ├─ user_id ◄─────┤
└───────────┘       │    │ ├─ status     │ │ ├─ attempted_at   │
                    │    │ ├─ ...        │ │ └─ ...            │
                    └────┤ └──────────────┘ └──────────────────┘
                        └─ (1:N)
```

---

## Constraints Summary

| Constraint | Type | Justification |
|---|---|---|
| `trial_remaining >= 0` | CHECK | Prevent negative balance |
| `balance >= 0` | CHECK | Prevent negative tokens |
| `status IN (...)` | CHECK | Valid state enumeration |
| `email UNIQUE` | UNIQUE | Prevent duplicate accounts |
| `auth_user_id UNIQUE` | UNIQUE | 1:1 with Supabase Auth |
| `user_id UNIQUE` (token_accounts) | UNIQUE | 1:1 with user |
| RLS policies | Security | User isolation |

---

## Performance Considerations

- **Atomic Trial Decrement**: O(1) via SQL function, no N+1 queries
- **Rate Limiting Lookup**: O(log N) index scan on `(user_id, attempted_at)`
- **Generation History**: Efficient pagination via `(user_id, created_at)` index
- **Cleanup Jobs**: Run periodically via cron to archive/delete old attempts

---

## Revision History

| Date | Change | Author |
|---|---|---|
| 2025-10-28 | Initial data model | AI |
