# User Story 5: Token Account Management - Implementation Summary

## Overview
Implemented backend components for token account management to support the free credits with paid token system. Token accounts track purchased tokens, cumulative purchases, and consumption history.

## Files Created/Modified

### 1. Database Migrations (New)

#### `/Volumes/home/Projects_Hosted/Yarda_v5/supabase/migrations/007_rename_token_account_columns.sql`
- Renamed `lifetime_purchased` → `total_purchased`
- Renamed `lifetime_consumed` → `total_consumed`
- Updated to match test expectations and API naming conventions

#### `/Volumes/home/Projects_Hosted/Yarda_v5/supabase/migrations/008_update_functions_for_renamed_columns.sql`
- Updated `consume_credit()` function to use `total_consumed`
- Updated `refund_credit()` function to use `total_consumed`
- Ensures database functions use correct column names

#### `/Volumes/home/Projects_Hosted/Yarda_v5/supabase/migrations/009_update_get_credit_balance.sql`
- Updated `get_credit_balance()` function return type
- Changed `total_available` → `total_credits` to match API expectations
- Returns: `trial_credits`, `token_balance`, `total_credits`

#### `/Volumes/home/Projects_Hosted/Yarda_v5/supabase/migrations/010_create_token_account_trigger.sql`
- **CRITICAL**: Automatic token account creation trigger
- Created `handle_new_user()` function
- Trigger: `on_auth_user_created` fires when new user signs up
- Automatically creates:
  - User record in `public.users` table
  - Token account in `public.token_accounts` table (balance=0)
- Ensures every user has a token account from registration

### 2. Backend Models (Updated)

#### `/Volumes/home/Projects_Hosted/Yarda_v5/backend/src/models/token_account.py`
Changed field names:
- `lifetime_purchased` → `total_purchased`
- `lifetime_consumed` → `total_consumed`

All Pydantic models updated:
- `TokenAccountCreate`
- `TokenAccountUpdate`
- `TokenAccount`

### 3. Backend Services (Updated)

#### `/Volumes/home/Projects_Hosted/Yarda_v5/backend/src/services/auth_service.py`
Updated `register_user()` method:
- Creates token account during registration with correct field names
- Uses `total_purchased` and `total_consumed`
- Initializes all values to 0 for new accounts

### 4. API Endpoints (Updated)

#### `/Volumes/home/Projects_Hosted/Yarda_v5/backend/src/api/endpoints/credits.py`
Added new endpoint:

**GET `/api/credits/token-account`**
- Returns full token account details for authenticated user
- Response includes:
  - `id`: Token account UUID
  - `user_id`: User UUID
  - `balance`: Current token balance
  - `total_purchased`: Cumulative tokens purchased
  - `total_consumed`: Cumulative tokens consumed
  - `created_at`: Account creation timestamp
  - `updated_at`: Last update timestamp
- Protected by authentication
- RLS ensures users only see their own token account

Existing endpoint updated:
**GET `/api/credits/balance`**
- Already functional
- Returns `trial_credits`, `token_balance`, `total_credits`

### 5. Test Infrastructure (Updated)

#### `/Volumes/home/Projects_Hosted/Yarda_v5/backend/tests/conftest.py`
Added admin operations support:
- Created `AsyncAuthAdminWrapper` class
- Added `admin.delete_user()` method
- Supports token account cascade deletion tests
- Updated `verified_user` fixture to include all token account fields

## Key Features Implemented

### 1. Automatic Token Account Creation
When a user registers via `supabase.auth.sign_up()`:
1. User created in `auth.users` table (by Supabase)
2. Trigger `on_auth_user_created` fires automatically
3. User record created in `public.users` table
4. Token account created in `public.token_accounts` table
5. Initial values: `balance=0`, `total_purchased=0`, `total_consumed=0`

### 2. Token Account Tracking
- **balance**: Current available tokens (can decrease with consumption)
- **total_purchased**: Cumulative lifetime purchases (only increases)
- **total_consumed**: Cumulative lifetime consumption (tracks usage)

### 3. Credit Balance Queries
- `get_credit_balance()` function returns unified view:
  - Trial credits from `users.trial_credits`
  - Token balance from `token_accounts.balance`
  - Total available credits (sum of both)

### 4. Row Level Security (RLS)
- Token accounts protected by RLS policies
- Users can only access their own token account
- Service role (backend) has full access
- Enforced at database level

### 5. Cascade Deletion
- When user deleted from `auth.users`
- User record in `public.users` deleted (CASCADE)
- Token account in `public.token_accounts` deleted (CASCADE)
- Ensures no orphaned records

## Database Schema

### Token Accounts Table
```sql
CREATE TABLE token_accounts (
    id UUID PRIMARY KEY,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE UNIQUE,
    balance INTEGER CHECK (balance >= 0),
    total_purchased INTEGER CHECK (total_purchased >= 0),
    total_consumed INTEGER CHECK (total_consumed >= 0),
    created_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ
);
```

### Database Functions
1. **get_credit_balance(p_user_id UUID)**
   - Returns: `trial_credits`, `token_balance`, `total_credits`

2. **consume_credit(p_user_id UUID)**
   - Returns: `'trial'` or `'token'`
   - Consumes trial credits first, then tokens
   - Updates `total_consumed` when consuming tokens

3. **handle_new_user()**
   - Triggered on user creation
   - Creates user record and token account

## API Routes

### Credits Router (`/api/credits`)
- `GET /balance` - Get credit balance breakdown
- `GET /token-account` - Get full token account details

Both endpoints:
- Require authentication
- Protected by RLS
- Return 401 if not authenticated
- Return 404 if account not found

## Testing

### Integration Tests
Location: `/Volumes/home/Projects_Hosted/Yarda_v5/backend/tests/integration/test_token_account.py`

13 tests covering:
1. **Token Account Creation** (4 tests)
   - Automatic creation on registration
   - Zero balance initialization
   - One account per user (unique constraint)
   - Negative balance prevention (check constraint)

2. **Token Balance Retrieval** (3 tests)
   - Credit balance includes tokens
   - Balance updates correctly
   - Token consumption decreases balance

3. **Token Account Isolation** (3 tests)
   - RLS: Users can only access own account
   - Unique constraint prevents duplicates
   - Cascade deletion when user deleted

4. **Token Account Metadata** (3 tests)
   - `total_purchased` tracks cumulative purchases
   - `total_consumed` tracks usage
   - `updated_at` timestamp changes

### Running Tests
```bash
cd backend
source venv/bin/activate
pytest tests/integration/test_token_account.py -v
```

**Note**: Tests require `SUPABASE_SERVICE_ROLE_KEY` in `.env` file.

## Deployment Steps

### 1. Apply Database Migrations
```bash
# Option A: Using Supabase CLI (requires auth)
supabase login
supabase link --project-ref ynsfmvonkoodmqfkukge
supabase db push

# Option B: Manual SQL execution
# Run migrations 007, 008, 009, 010 in order via Supabase Dashboard
# SQL Editor: https://app.supabase.com/project/ynsfmvonkoodmqfkukge/sql
```

### 2. Configure Environment
Add to `backend/.env`:
```bash
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```
Get from: https://app.supabase.com/project/ynsfmvonkoodmqfkukge/settings/api

### 3. Run Tests
```bash
cd backend
source venv/bin/activate
pytest tests/integration/test_token_account.py -v
```

All 13 tests should pass after migrations are applied.

### 4. Verify Trigger
Test automatic token account creation:
```sql
-- In Supabase SQL Editor
SELECT * FROM auth.users WHERE email = 'test@example.com';
SELECT * FROM public.users WHERE id = '<user_id>';
SELECT * FROM public.token_accounts WHERE user_id = '<user_id>';
```

## Implementation Notes

### Design Decisions

1. **Column Naming Convention**
   - Changed from `lifetime_*` to `total_*`
   - More intuitive for API consumers
   - Matches common e-commerce patterns

2. **Automatic Creation via Trigger**
   - Eliminates race conditions
   - Ensures consistency
   - No manual account creation needed
   - Works with any auth method (email, OAuth, etc.)

3. **Separate Tracking Fields**
   - `balance`: Current usable tokens
   - `total_purchased`: Historical purchases (for analytics)
   - `total_consumed`: Historical usage (for analytics)
   - Enables business intelligence queries

4. **RLS at Database Level**
   - Security enforced in database
   - Can't be bypassed by buggy application code
   - Minimal performance impact

### Future Enhancements

1. **Token Purchases**
   - Add payment integration (Stripe)
   - Create `token_purchases` table for transaction history
   - Update `total_purchased` and `balance` atomically

2. **Token Packages**
   - Define token packages (10, 50, 100, 500)
   - Volume discounts
   - Promotional credits

3. **Expiration**
   - Add `expires_at` field for promotional tokens
   - Background job to expire old tokens
   - Separate purchased vs promotional tokens

4. **Analytics**
   - User token purchase patterns
   - Average consumption rates
   - Lifetime value calculations

## Troubleshooting

### Tests Skip with "Supabase environment variables not set"
**Solution**: Add `SUPABASE_SERVICE_ROLE_KEY` to `backend/.env`

### Token account not created on registration
**Solution**: Ensure migration 010 is applied (trigger creation)

### Column not found errors
**Solution**: Ensure migrations 007-009 are applied (column renames)

### RLS blocking access
**Solution**: Verify user is authenticated and accessing their own account

### Duplicate token account error
**Solution**: Each user can only have one token account (by design)

## Related Files

- Spec: `/Volumes/home/Projects_Hosted/Yarda_v5/specs/001-data-model/spec.md`
- Tests: `/Volumes/home/Projects_Hosted/Yarda_v5/backend/tests/integration/test_token_account.py`
- Migration Base: `/Volumes/home/Projects_Hosted/Yarda_v5/supabase/migrations/002_create_token_accounts.sql`

## Status

✅ **Backend Implementation Complete**
✅ **Database Schema Updated**
✅ **Migrations Created**
✅ **Tests Written**
⏳ **Pending**: Migrations need to be applied to Supabase
⏳ **Pending**: Add SUPABASE_SERVICE_ROLE_KEY to .env
⏳ **Pending**: Run integration tests

## Next Steps

1. Apply migrations 007-010 to Supabase database
2. Add service role key to backend/.env
3. Run integration tests to verify all 13 tests pass
4. Test via API endpoints using Postman/curl
5. Integrate with frontend (User Story 5 frontend components)
