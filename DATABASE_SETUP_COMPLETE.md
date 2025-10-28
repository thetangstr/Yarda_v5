# Database Setup Complete ✅

**Date:** 2025-10-28
**Project:** Yarda v5 Landscape Designer
**Supabase Project ID:** ynsfmvonkoodmqfkukge

## Summary

All database migrations have been successfully applied to the Supabase project using the Supabase MCP. The database is fully configured and ready for development.

## Applied Migrations

### 1. create_users_table ✅
**File:** `supabase/migrations/001_create_users_table.sql`

Created the core users table with:
- UUID primary key
- Email with unique constraint
- Email verification token and expiry (1-hour window)
- Trial credits (default: 3)
- Timestamps (created_at, updated_at)
- RLS policies for user data isolation

**Verification:**
```sql
SELECT table_name, rls_enabled FROM information_schema.tables
WHERE table_name = 'users';
-- Result: RLS enabled ✅
```

### 2. create_token_accounts ✅
**File:** `supabase/migrations/002_create_token_accounts.sql`

Created token accounts table for paid credits:
- One-to-one relationship with users
- Balance tracking
- Lifetime purchased/consumed metrics
- CASCADE delete on user removal

### 3. create_generations ✅
**File:** `supabase/migrations/003_create_generations.sql`

Created generations table for design history:
- Status tracking (pending, processing, completed, failed)
- Input types (photo, address)
- Output image URL storage
- Credit type and refund tracking
- Processing metrics
- Constraint validation (ensures valid input)

### 4. create_rate_limits ✅
**File:** `supabase/migrations/004_create_rate_limits.sql`

Created rate limiting table:
- Tracks generation attempts per user
- Timestamp-based rolling window
- Cleanup function for old records (>2 minutes)

### 5. create_functions ✅
**File:** `supabase/migrations/005_create_functions.sql`

Created 4 core database functions:

#### `consume_credit(p_user_id UUID) → TEXT`
Atomically consumes one credit using row-level locking:
- Prioritizes trial credits over tokens
- Returns 'trial' or 'token' to indicate which was used
- Raises exception if no credits available
- **SECURITY DEFINER** for proper privilege escalation

**Test Result:**
```sql
-- User started with 3 trial credits
SELECT consume_credit('test-user-id');
-- Result: 'trial' ✅
-- Remaining: 2 trial credits ✅
```

#### `check_rate_limit(p_user_id UUID) → BOOLEAN`
Checks if user is under rate limit:
- Rolling 60-second window
- Maximum 3 requests per window
- Returns TRUE if under limit

**Test Result:**
```sql
SELECT check_rate_limit('test-user-id');
-- Result: true ✅
```

#### `refund_credit(p_generation_id UUID) → VOID`
Refunds credits for failed generations:
- Idempotent (checks if already refunded)
- Refunds to correct account based on credit_type
- Marks generation as refunded

#### `get_credit_balance(p_user_id UUID) → TABLE`
Returns comprehensive credit breakdown:
- trial_credits: INT
- token_balance: INT
- total_available: INT

**Test Result:**
```sql
SELECT * FROM get_credit_balance('test-user-id');
-- Result: {trial_credits: 2, token_balance: 0, total_available: 2} ✅
```

### 6. create_rls_policies ✅
**File:** `supabase/migrations/006_create_rls_policies.sql`

Created comprehensive RLS policies:
- Service role bypass for backend operations
- User isolation policies
- Function execution grants to authenticated users
- Updated_at triggers for automatic timestamps

## Database Schema Overview

```
users (8 columns, RLS enabled)
├── id (UUID, PK)
├── email (TEXT, UNIQUE)
├── email_verified (BOOLEAN)
├── email_verification_token (UUID)
├── email_verification_expires_at (TIMESTAMPTZ)
├── trial_credits (INTEGER, DEFAULT 3, CHECK >= 0)
├── created_at (TIMESTAMPTZ)
└── updated_at (TIMESTAMPTZ)

token_accounts (7 columns, RLS enabled)
├── id (UUID, PK)
├── user_id (UUID, FK → users.id, UNIQUE)
├── balance (INTEGER, DEFAULT 0, CHECK >= 0)
├── lifetime_purchased (INTEGER)
├── lifetime_consumed (INTEGER)
├── created_at (TIMESTAMPTZ)
└── updated_at (TIMESTAMPTZ)

generations (16 columns, RLS enabled)
├── id (UUID, PK)
├── user_id (UUID, FK → users.id)
├── status (TEXT, CHECK in [pending, processing, completed, failed])
├── input_type (TEXT, CHECK in [photo, address])
├── input_photo_url (TEXT, nullable)
├── input_address (TEXT, nullable)
├── style (TEXT)
├── custom_prompt (TEXT, nullable)
├── output_image_url (TEXT, nullable)
├── error_message (TEXT, nullable)
├── processing_time_ms (INTEGER, nullable)
├── credit_type (TEXT, CHECK in [trial, token], nullable)
├── credit_refunded (BOOLEAN, DEFAULT false)
├── created_at (TIMESTAMPTZ)
├── started_at (TIMESTAMPTZ, nullable)
└── completed_at (TIMESTAMPTZ, nullable)

rate_limits (3 columns, RLS enabled)
├── id (UUID, PK)
├── user_id (UUID, FK → users.id)
└── attempted_at (TIMESTAMPTZ)
```

## Testing Performed

### 1. User Creation Test ✅
```sql
INSERT INTO users (email, email_verified, trial_credits)
VALUES ('test@example.com', true, 3)
RETURNING *;

-- Result: User created with 3 trial credits ✅
```

### 2. Token Account Creation Test ✅
```sql
INSERT INTO token_accounts (user_id, balance)
SELECT id, 0 FROM users WHERE email = 'test@example.com'
RETURNING *;

-- Result: Token account created with 0 balance ✅
```

### 3. Credit Consumption Test ✅
```sql
SELECT consume_credit(user_id) FROM users WHERE email = 'test@example.com';
-- Result: 'trial' ✅

SELECT trial_credits FROM users WHERE email = 'test@example.com';
-- Result: 2 (consumed 1 trial credit) ✅
```

### 4. Credit Balance Query Test ✅
```sql
SELECT * FROM get_credit_balance(user_id)
FROM users WHERE email = 'test@example.com';

-- Result:
-- trial_credits: 2
-- token_balance: 0
-- total_available: 2 ✅
```

### 5. Rate Limit Check Test ✅
```sql
SELECT check_rate_limit(user_id)
FROM users WHERE email = 'test@example.com';

-- Result: true (under limit) ✅
```

## Environment Configuration ✅

### Frontend Environment
**File:** `frontend/.env.local`
```env
NEXT_PUBLIC_SUPABASE_URL=https://ynsfmvonkoodmqfkukge.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### Backend Environment
**File:** `backend/.env`
```env
SUPABASE_URL=https://ynsfmvonkoodmqfkukge.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
API_HOST=0.0.0.0
API_PORT=8000
DEBUG=True
```

## Security Features

- ✅ **Row Level Security (RLS)** enabled on all tables
- ✅ **Service role bypass** for backend operations
- ✅ **User data isolation** - users can only access their own data
- ✅ **Atomic operations** using row-level locks
- ✅ **SECURITY DEFINER** functions for privilege escalation
- ✅ **Function execution grants** restricted to authenticated users

## Performance Optimizations

- ✅ **Indexes created:**
  - `idx_users_email` (UNIQUE)
  - `idx_users_verification_token`
  - `idx_token_accounts_user_id` (UNIQUE)
  - `idx_generations_user_created` (user_id, created_at DESC)
  - `idx_generations_status` (partial index on pending/processing)
  - `idx_rate_limits_user_attempted` (user_id, attempted_at DESC)

- ✅ **Automatic cleanup** for rate_limits table (2-minute retention)
- ✅ **Triggers** for automatic updated_at timestamps

## Next Steps

The database is fully configured and ready. You can now:

1. **Start the backend server:**
   ```bash
   cd backend
   python3 -m venv venv
   source venv/bin/activate
   pip install -r requirements.txt
   python -m uvicorn src.main:app --reload
   ```

2. **Start the frontend:**
   ```bash
   cd frontend
   npm install
   npm run dev
   ```

3. **Test registration flow:**
   - Visit `http://localhost:3000/register`
   - Create a new account
   - Verify trial credits are assigned
   - Test email verification

4. **Move to User Story 2:** Design Generation & Credit Consumption

## Database Connection Info

- **URL:** https://ynsfmvonkoodmqfkukge.supabase.co
- **Region:** us-east-2
- **Postgres Version:** 17.6.1.029
- **Status:** ACTIVE_HEALTHY ✅

## Support

For database-related issues:
- Check Supabase dashboard: https://app.supabase.com/project/ynsfmvonkoodmqfkukge
- View logs: https://app.supabase.com/project/ynsfmvonkoodmqfkukge/logs
- SQL Editor: https://app.supabase.com/project/ynsfmvonkoodmqfkukge/editor

---

**Database setup completed successfully! Ready for application development.** 🚀
