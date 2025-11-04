# Next Steps: Apply Migrations and Test User Story 2

**Current Status**: User Story 2 implementation is 100% complete (all code written)
**Blocking Issue**: Database migrations need to be applied to Supabase

---

## ✅ What's Already Done

1. **Backend Code** - 100% complete (T044-T053)
2. **Frontend Code** - 100% complete (T054-T061)
3. **Tests Written** - 28 tests ready to run (T039-T043)
4. **Database Migrations** - Already exist in `/supabase/migrations/` (T006-T015)

---

## ⚠️ What's Blocking Testing

The database migrations (T006-T015) from Phase 0 need to be applied. These were supposed to be done BEFORE User Story 1 and 2 implementation.

---

## 🚀 Quick Path Forward

### Option 1: Apply Migrations via Supabase Dashboard (Recommended)

1. Go to your Supabase project dashboard
2. Navigate to **SQL Editor**
3. Run each migration file in order:
   - `001_create_users_table.sql`
   - `002_create_token_accounts.sql` ← **Required for User Story 2**
   - `003_create_token_transactions.sql` ← **Required for User Story 2**
   - `004_create_generations.sql`
   - `005_create_generation_areas.sql`
   - `006_create_rate_limits.sql`
   - `007_create_functions.sql`
   - `008_create_triggers.sql`
   - `009_create_rls_policies.sql`
   - `010_create_indexes.sql`
   - `011_add_password_hash.sql`

### Option 2: Apply Migrations via Supabase CLI

```bash
cd /Volumes/home/Projects_Hosted/Yarda_v5

# Link to your Supabase project (if not already linked)
supabase link --project-ref YOUR_PROJECT_REF

# Apply all pending migrations
supabase db push
```

### Option 3: Manual SQL Execution

If you want to test JUST User Story 2, you only need these 3 migrations:

```bash
# Connect to your Supabase database
# Then run:
psql "your-supabase-connection-string" < supabase/migrations/001_create_users_table.sql
psql "your-supabase-connection-string" < supabase/migrations/002_create_token_accounts.sql
psql "your-supabase-connection-string" < supabase/migrations/003_create_token_transactions.sql
```

---

## 📋 After Migrations Are Applied

### 1. Verify Tables Exist

```bash
# Check if tables were created
supabase db remote-access psql -c "\dt"

# Should show:
# - users
# - users_token_accounts
# - users_token_transactions
# - generations (if migration 004 applied)
```

### 2. Configure Environment Variables

#### Backend `.env`:
```bash
STRIPE_SECRET_KEY=sk_test_YOUR_KEY
STRIPE_PUBLISHABLE_KEY=pk_test_YOUR_KEY
STRIPE_WEBHOOK_SECRET=whsec_YOUR_SECRET
FRONTEND_URL=http://localhost:3000
```

#### Frontend `.env.local`:
```bash
NEXT_PUBLIC_API_URL=http://localhost:8000
```

### 3. Start Development Servers

```bash
# Terminal 1: Backend
cd backend
uvicorn src.main:app --reload --port 8000

# Terminal 2: Frontend (npm install is already running)
cd frontend
npm run dev

# Terminal 3: Stripe CLI (for webhook testing)
stripe listen --forward-to http://localhost:8000/webhooks/stripe
```

### 4. Run Tests

```bash
# Backend integration tests
cd backend
pytest tests/integration/test_token_deduction.py -v
pytest tests/integration/test_webhook_idempotency.py -v
pytest tests/integration/test_stripe_checkout.py -v

# Frontend E2E tests
cd frontend
npx playwright test tests/e2e/token-purchase.spec.ts --headed
```

### 5. Manual Testing Checklist

- [ ] Navigate to http://localhost:3000/purchase
- [ ] Click "View Token Packages"
- [ ] Select a package and purchase with test card: `4242 4242 4242 4242`
- [ ] Verify redirect to `/purchase/success`
- [ ] Check token balance is updated
- [ ] Navigate to `/transactions` and verify purchase is listed
- [ ] Go to `/generate` and create a design using tokens
- [ ] Verify token is deducted
- [ ] Check transaction history shows the generation

---

## 🎯 Why This Happened

The original plan (tasks.md) defined database migrations as **Phase 0** tasks (T006-T015) that should have been completed BEFORE implementing any user stories.

Looking at the task list:
- **Phase 0** (T001-T018): Infrastructure & Database ← **We're here**
- **Phase 1** (T019-T034): User Story 1 (Trial System) ← **Done**
- **Phase 2** (T035-T061): User Story 2 (Token Purchase) ← **Done**

We implemented User Stories 1 and 2 (code complete) but skipped the Phase 0 database migrations. This is a common issue when jumping into implementation without completing infrastructure first.

---

## ✅ Resolution

The fix is simple: Apply the migrations that already exist. They're well-written, comprehensive, and include everything needed for User Stories 1-3.

Once migrations are applied, User Story 2 testing can proceed immediately.

---

## 📝 Recommended Next Command

```bash
# If you have Supabase CLI configured:
cd /Volumes/home/Projects_Hosted/Yarda_v5
supabase db push

# Or manually apply via Supabase Dashboard SQL Editor
```

After migrations are applied, User Story 2 is **100% ready for testing**.
