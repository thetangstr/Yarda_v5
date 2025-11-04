# Phase 2: Foundational Infrastructure - COMPLETE ✅

**Status**: Production Ready
**Completion Date**: 2025-11-03
**Database**: Supabase PostgreSQL (Project: yarda, ID: srktllgrxvgwjlbxmpeh)

---

## 📋 Executive Summary

Phase 2 establishes the foundational database schema and infrastructure that ALL user stories depend on. This phase is complete and verified, unblocking parallel implementation of User Stories 1-6.

### Key Infrastructure Delivered

✅ **Database Connection Pool** - asyncpg pool with connection management
✅ **Core Tables** - users, token_accounts, token_transactions, generations, etc.
✅ **Database Functions** - Atomic operations with row-level locking
✅ **Constraints & Indexes** - Data integrity and performance optimization
✅ **Auto-Reload Fields** - Already integrated from Phase 5

---

## 🗄️ Database Schema

### Tables Created

| Table | Purpose | Key Features |
|-------|---------|--------------|
| `users` | User accounts with auth & trials | trial_remaining (≥0), subscription_tier, CHECK constraints |
| `users_token_accounts` | Token balances with auto-reload | balance (≥0), auto_reload_* fields, throttle tracking |
| `users_token_transactions` | Audit trail for all token ops | transaction_type, stripe_payment_intent_id (unique) |
| `generations` | Landscape design requests | status, payment_type, image_urls[] |
| `profiles` | User profile data | full_name, avatar_url, RLS enabled |
| `subscriptions` | Stripe subscription records | stripe_subscription_id (unique), status tracking |
| `webhook_events` | Webhook processing log | event_id (unique), processed flag, retry_count |
| `blob_uploads` | Vercel Blob storage tracking | blob_url (unique), expiration_date, TTL management |
| `styles` | Landscape style presets | prompt templates, Gemini config, active flag |
| `admin_config` | System configuration | key-value store, requires_admin flag |

### Database Functions (Atomic Operations)

**Token Management:**
- `get_token_balance(p_user_id UUID) → INTEGER`
  - Fast read-only balance check

- `deduct_token_atomic(p_user_id UUID, p_description TEXT) → (success, new_balance, transaction_id)`
  - Atomically deducts 1 token with FOR UPDATE lock
  - Prevents race conditions (concurrent requests)
  - Records transaction in audit trail

- `add_tokens(p_user_id, p_amount, p_type, p_description, p_stripe_payment_intent_id) → (success, new_balance, transaction_id)`
  - Idempotent token credits (checks stripe_payment_intent_id)
  - Prevents duplicate webhook processing
  - Supports purchase, refund, auto_reload types

**Auto-Reload:**
- `check_auto_reload_trigger(p_user_id UUID) → BOOLEAN`
  - 4-condition check: enabled, below threshold, 60s throttle, <3 failures
  - Used after each token deduction

**Trial Management:**
- `deduct_trial_atomic(p_user_id UUID) → (success, trial_remaining)`
  - Atomically deducts 1 trial credit with FOR UPDATE lock
  - Prevents race conditions

- `refund_trial(p_user_id UUID) → (success, trial_remaining)`
  - Refunds trial credit on generation failure

---

## 🔒 Data Integrity Guarantees

### CHECK Constraints

```sql
-- Prevent negative balances
users_token_accounts.balance >= 0
users.trial_remaining >= 0
users.trial_used >= 0

-- Validate enums
users.subscription_tier IN ('free', '7day_pass', 'per_property', 'monthly_pro')
users.subscription_status IN ('inactive', 'active', 'past_due', 'cancelled')
users_token_transactions.transaction_type IN ('purchase', 'generation', 'refund', 'auto_reload')

-- Validate auto-reload config
users_token_accounts.auto_reload_threshold BETWEEN 1 AND 100 (when not null)
users_token_accounts.auto_reload_amount >= 10 (when not null)
```

### UNIQUE Constraints

```sql
-- Prevent duplicate users
users.email UNIQUE
users.firebase_uid UNIQUE
users.stripe_customer_id UNIQUE

-- Prevent duplicate transactions
users_token_accounts.user_id UNIQUE (one account per user)
webhook_events.event_id UNIQUE (idempotent webhook processing)
subscriptions.stripe_subscription_id UNIQUE
blob_uploads.blob_url UNIQUE
```

### Indexes for Performance

```sql
-- Users table
idx_users_email ON users(email)
idx_users_firebase_uid ON users(firebase_uid)
idx_users_stripe_customer_id ON users(stripe_customer_id) WHERE stripe_customer_id IS NOT NULL
idx_users_subscription_status ON users(subscription_status) WHERE subscription_status != 'inactive'

-- Token accounts (optimized for foreign key lookups)
users_token_accounts.user_id UNIQUE (implicit index from constraint)
```

---

## 🔗 Connection Pool Configuration

**File**: `backend/src/db/connection_pool.py`

```python
class DatabasePool:
    def __init__(self):
        self._pool: Optional[asyncpg.Pool] = None

    async def connect(self):
        self._pool = await asyncpg.create_pool(
            database_url,
            min_size=2,       # Minimum connections
            max_size=10,      # Maximum connections
            max_queries=50000,
            max_inactive_connection_lifetime=300,  # 5 minutes
            command_timeout=60  # 60 second timeout
        )
```

**Usage in FastAPI:**

```python
from src.db.connection_pool import get_db
from fastapi import Depends

@app.get("/tokens/balance")
async def get_balance(db = Depends(get_db)):
    async with db.acquire() as conn:
        balance = await conn.fetchval(
            "SELECT get_token_balance($1)", user_id
        )
    return {"balance": balance}
```

---

## ✅ Verification Checklist

- [X] Database connection pool working (asyncpg Pool initialized)
- [X] All 10 core tables created with correct schemas
- [X] All 6 database functions created and callable
- [X] CHECK constraints preventing negative balances
- [X] UNIQUE constraints preventing duplicates
- [X] Indexes created for fast lookups
- [X] Auto-reload fields integrated (from Phase 5)
- [X] Foreign key relationships established
- [X] RLS policies applied where needed

---

## 📊 Database Statistics

**Tables**: 10 total
- 3 core user/token tables (users, users_token_accounts, users_token_transactions)
- 2 generation tables (generations, generation_areas - note: generation_areas not yet in production)
- 5 supporting tables (profiles, subscriptions, webhook_events, blob_uploads, styles, admin_config)

**Functions**: 6 total (all critical atomic operations)

**Current Data**:
- Users: 1 (test account exists)
- Token Accounts: 1
- Token Transactions: 0
- Generations: 0
- Styles: 3 (preset landscape styles)
- Profiles: 2

---

## 🚦 Readiness Status

### ✅ READY - Can Start Immediately

All user stories can now proceed in parallel:

- **User Story 1 (Trial System)** ✅
  - `users` table with trial fields exists
  - `deduct_trial_atomic()` function ready
  - `refund_trial()` function ready

- **User Story 2 (Token Purchase)** ✅
  - `users_token_accounts` table exists
  - `users_token_transactions` table with stripe_payment_intent_id exists
  - `deduct_token_atomic()` function ready
  - `add_tokens()` function with idempotency ready

- **User Story 3 (Auto-Reload)** ✅ ALREADY COMPLETE (Phase 5)
  - Auto-reload fields exist in `users_token_accounts`
  - `check_auto_reload_trigger()` function ready
  - Backend services implemented
  - Frontend components implemented

- **User Story 4 (Subscriptions)** ✅
  - `users` table with subscription fields exists
  - `subscriptions` table exists
  - Stripe integration ready

- **User Story 5 (Multi-Area Generation)** ⚠️ PARTIALLY READY
  - `generations` table exists
  - `generation_areas` table NOT YET CREATED (add in US5 implementation)

- **User Story 6 (Transaction History)** ✅
  - `users_token_transactions` table with full audit trail exists
  - Ready for filtering, pagination, CSV export

---

## 🔧 Configuration

**Database URL**: Configured in `backend/.env`
```
DATABASE_URL=postgresql://postgres.srktllgrxvgwjlbxmpeh:****@aws-0-us-east-1.pooler.supabase.com:6543/postgres
```

**Supabase Project**: `yarda` (ID: `srktllgrxvgwjlbxmpeh`)
- Region: us-east-1
- Status: ACTIVE_HEALTHY
- Database Version: PostgreSQL 17.4.1.074

---

## 🎯 Next Steps

The foundational infrastructure is complete. Development can now proceed with:

### Immediate Priority (P1 - MVP)

1. **User Story 1: Trial System** (T019-T038, 20 tasks, ~3 days)
   - Can start immediately
   - No blockers
   - Delivers first user value

2. **User Story 2: Token Purchase** (T039-T053, 23 tasks, ~4 days)
   - Can start immediately or in parallel with US1
   - No blockers
   - Completes monetization path

### Medium Priority (P2)

3. **User Story 4: Subscriptions** (T079-T099, 21 tasks, ~3 days)
   - Can start after US2 or in parallel
   - Recurring revenue stream

### Lower Priority (P3)

4. **User Story 5: Multi-Area Generation** (T100-T118, 19 tasks, ~3 days)
   - Requires `generation_areas` table creation
   - Convenience feature

5. **User Story 6: Transaction History** (T119-T133, 15 tasks, ~2 days)
   - Can start after US2
   - Transparency feature

---

## 📞 Developer Notes

### Testing Database Functions

```python
# Test get_token_balance
balance = await db.fetchval("SELECT get_token_balance($1)", user_id)

# Test deduct_token_atomic
result = await db.fetchrow(
    "SELECT * FROM deduct_token_atomic($1, $2)",
    user_id, "Test generation"
)
# result: (success=True, new_balance=49, transaction_id='...')

# Test add_tokens (idempotent)
result = await db.fetchrow(
    "SELECT * FROM add_tokens($1, $2, $3, $4, $5)",
    user_id, 50, 'purchase', 'Purchased 50 tokens', 'pi_123'
)
# Calling again with same pi_123 returns existing transaction (idempotent)

# Test auto-reload trigger
should_trigger = await db.fetchval(
    "SELECT check_auto_reload_trigger($1)", user_id
)
```

### Race Condition Prevention

All critical operations use `FOR UPDATE` row-level locks:

```sql
-- Example: Token deduction
SELECT id, balance FROM users_token_accounts
WHERE user_id = $1
FOR UPDATE;  -- Locks this row until transaction commits

-- This prevents two concurrent deductions from seeing the same balance
```

---

## 🎉 Phase 2 Complete!

All foundational database infrastructure is production-ready. User story implementation can now proceed at full speed with no database blockers.

**Estimated MVP Delivery**: 8 days (US1 + US2)
**Estimated Full Feature Set**: 19.5 days (all user stories)
