# Database Setup Guide

This directory contains PostgreSQL migrations for the Yarda AI Landscape Studio platform.

## Prerequisites

1. **Supabase Project**: Create a project at [app.supabase.com](https://app.supabase.com)
2. **Database Connection**: Get your database URL from Supabase project settings

## Migration Files

Migrations are applied sequentially in order:

1. `001_create_users_table.sql` - Core users table with trial and subscription fields
2. `002_create_token_accounts.sql` - Token balance and auto-reload configuration
3. `003_create_token_transactions.sql` - Transaction audit trail with idempotency
4. `004_create_generations.sql` - Generation requests tracking
5. `005_create_generation_areas.sql` - Multi-area generation support
6. `006_create_rate_limits.sql` - API rate limiting
7. `007_create_functions.sql` - Database functions (atomic operations)
8. `008_create_triggers.sql` - Auto-update triggers and validation
9. `009_create_rls_policies.sql` - Row-level security policies
10. `010_create_indexes.sql` - Performance optimization indexes

## Applying Migrations

### Method 1: Supabase Dashboard (Recommended for first-time setup)

1. Go to your Supabase project
2. Navigate to **SQL Editor**
3. Copy and paste each migration file content in order
4. Run each migration sequentially

### Method 2: Command Line (psql)

```bash
# Set your database URL
export DATABASE_URL="postgresql://postgres:[password]@db.[project].supabase.co:5432/postgres"

# Apply all migrations in order
for file in supabase/migrations/*.sql; do
  echo "Applying $file..."
  psql $DATABASE_URL < "$file"
done
```

### Method 3: Python Script

```bash
cd backend
python scripts/apply_migrations.py
```

## Verification

After applying all migrations, verify the setup:

```sql
-- Check all tables exist
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public'
ORDER BY table_name;

-- Expected tables:
-- - users
-- - users_token_accounts
-- - users_token_transactions
-- - generations
-- - generation_areas
-- - rate_limits

-- Check all functions exist
SELECT routine_name FROM information_schema.routines
WHERE routine_schema = 'public'
ORDER BY routine_name;

-- Expected functions:
-- - get_token_balance
-- - deduct_token_atomic
-- - add_tokens
-- - check_auto_reload_trigger
-- - deduct_trial_atomic
-- - refund_trial

-- Verify constraints (should return 0 rows if valid)
SELECT * FROM users_token_accounts WHERE balance < 0;
SELECT * FROM users WHERE trial_remaining < 0;
```

## Testing Atomic Operations

### Test 1: Token Deduction
```sql
-- Create test user
INSERT INTO users (email, firebase_uid) VALUES ('test@example.com', 'test-uid-123');

-- Create token account
INSERT INTO users_token_accounts (user_id, balance)
SELECT id, 100 FROM users WHERE email = 'test@example.com';

-- Test atomic deduction
SELECT * FROM deduct_token_atomic(
  (SELECT id FROM users WHERE email = 'test@example.com'),
  'Test deduction'
);

-- Verify balance decreased
SELECT balance FROM users_token_accounts
WHERE user_id = (SELECT id FROM users WHERE email = 'test@example.com');
```

### Test 2: Trial Deduction
```sql
-- Test trial deduction
SELECT * FROM deduct_trial_atomic(
  (SELECT id FROM users WHERE email = 'test@example.com')
);

-- Verify trial_remaining decreased
SELECT trial_remaining FROM users WHERE email = 'test@example.com';
```

### Test 3: Idempotency Check
```sql
-- Try adding tokens twice with same payment_intent_id
SELECT * FROM add_tokens(
  (SELECT id FROM users WHERE email = 'test@example.com'),
  50,
  'purchase',
  'Test purchase',
  'pi_test_123'
);

-- Second call with same payment_intent_id should return same result (no duplicate)
SELECT * FROM add_tokens(
  (SELECT id FROM users WHERE email = 'test@example.com'),
  50,
  'purchase',
  'Test purchase',
  'pi_test_123'
);

-- Verify only ONE transaction exists with this payment_intent_id
SELECT COUNT(*) FROM users_token_transactions
WHERE stripe_payment_intent_id = 'pi_test_123';
-- Expected: 1
```

## Environment Variables

Add to your `.env.local`:

```bash
# Database (Backend)
DATABASE_URL=postgresql://postgres:[password]@db.[project].supabase.co:5432/postgres

# Supabase (Frontend)
NEXT_PUBLIC_SUPABASE_URL=https://[project].supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=[anon-key]
SUPABASE_SERVICE_ROLE_KEY=[service-role-key]
```

## Troubleshooting

### Error: "relation already exists"
- Migrations have already been applied
- If you need to reset: **WARNING - This deletes all data**:
  ```sql
  DROP TABLE IF EXISTS rate_limits CASCADE;
  DROP TABLE IF EXISTS generation_areas CASCADE;
  DROP TABLE IF EXISTS generations CASCADE;
  DROP TABLE IF EXISTS users_token_transactions CASCADE;
  DROP TABLE IF EXISTS users_token_accounts CASCADE;
  DROP TABLE IF EXISTS users CASCADE;
  ```

### Error: "permission denied"
- Ensure you're using the correct database URL with proper credentials
- Check that your database user has CREATE privileges

### Error: "function does not exist"
- Ensure migrations 001-006 are applied before migration 007
- Functions depend on tables being created first

## Next Steps

After migrations are applied:

1. **Test Database Functions**: Run verification queries above
2. **Configure RLS**: Verify row-level security is enabled
3. **Start Backend**: The FastAPI backend can now connect to the database
4. **Run Integration Tests**: Test full user flows with the database
