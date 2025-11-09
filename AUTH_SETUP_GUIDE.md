# Test Account Authentication Setup Guide

**Created:** 2025-11-06
**Purpose:** Set up authentication for test accounts to enable manual Stripe payment testing

---

## Quick Summary

Test accounts exist in `public.users` but need `auth.users` entries to login. Three options available:

1. **✅ Option 1: Use Supabase Dashboard** (Easiest, 5 min)
2. **🔧 Option 2: Use SQL with Password Hash** (Advanced, 3 min)
3. **💻 Option 3: Check Current Login State** (If already logged in)

---

## Test Accounts

All accounts need authentication setup:

| Email | ID | Balance | Purpose |
|-------|---|---------|---------|
| test+trial@yarda.ai | 301dd4e9-7866-43d5-8550-dc64ff6d1fa2 | 3 trial credits | Trial flow testing |
| test+exhausted@yarda.ai | d8e86fbd-045d-422f-94e2-c6aa3f6a7b92 | 0 credits, 0 tokens | TC-2.1 (Token Purchase) |
| test+tokens@yarda.ai | 655c468d-7623-46b7-82f2-75c99977633b | 50 tokens | TC-2.2 (Token Deduction) |
| test+subscriber@yarda.ai | 26c3bd34-d808-45a9-81a8-07e1c3166c3a | Active subscription | Subscription testing |
| test+rich@yarda.ai | b0355f7d-6553-460b-8484-3124383ef5b0 | 500 tokens + subscription | Multi-payment testing |

**Recommended Test Password:** `TestPassword123!`

---

## Option 1: Supabase Dashboard (Recommended - Easiest)

### Step 1: Access Supabase Dashboard
```
https://supabase.com/dashboard/project/gxlmnjnjvlslijiowamn/auth/users
```

### Step 2: Create Each Test User

**For test+exhausted@yarda.ai (TC-2.1 testing):**

1. Click "Add user" button (top right)
2. Fill in details:
   ```
   Email: test+exhausted@yarda.ai
   Password: TestPassword123!
   ☑️ Auto Confirm User (check this box!)
   ```
3. Click "Create user"
4. User will be created with a new UUID

**Problem:** The UUID won't match our `public.users` entry!

**Solution:** After creating auth user, we need to sync IDs.

### Step 3: Sync UUIDs Between auth.users and public.users

After creating each auth user in the dashboard, run this SQL to sync:

```sql
-- Get the auth.users UUID
SELECT id, email FROM auth.users WHERE email = 'test+exhausted@yarda.ai';
-- Copy the UUID (e.g., abc123...)

-- Update public.users to match
UPDATE users SET id = 'abc123...' WHERE email = 'test+exhausted@yarda.ai';

-- Update token accounts (if exists)
UPDATE users_token_accounts
SET user_id = 'abc123...'
WHERE user_id = (SELECT id FROM users WHERE email = 'test+exhausted@yarda.ai');
```

**Repeat for all 5 test accounts.**

**Estimated Time:** 10-15 minutes for all accounts

---

## Option 2: SQL with Direct auth.users Insert (Advanced)

### ⚠️ Warning
This method directly inserts into `auth.users`. Requires Supabase's `crypt` extension for password hashing.

### Step 1: Enable pgcrypto Extension (if not enabled)
```sql
CREATE EXTENSION IF NOT EXISTS pgcrypto;
```

### Step 2: Insert auth.users with Matching UUIDs

**For test+exhausted@yarda.ai:**
```sql
-- Insert into auth.users with existing UUID from public.users
INSERT INTO auth.users (
    instance_id,
    id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    created_at,
    updated_at,
    raw_app_meta_data,
    raw_user_meta_data,
    is_super_admin,
    confirmation_token,
    email_change,
    email_change_token_new,
    recovery_token
) VALUES (
    '00000000-0000-0000-0000-000000000000',  -- Default instance_id
    'd8e86fbd-045d-422f-94e2-c6aa3f6a7b92',  -- Existing public.users ID
    'authenticated',
    'authenticated',
    'test+exhausted@yarda.ai',
    crypt('TestPassword123!', gen_salt('bf')),  -- Bcrypt hash
    NOW(),  -- Auto-confirm email
    NOW(),
    NOW(),
    '{"provider":"email","providers":["email"]}',
    '{}',
    false,
    '',
    '',
    '',
    ''
) ON CONFLICT (id) DO NOTHING;
```

### Step 3: Repeat for All Test Accounts

**Script to insert all 5 accounts:**
```sql
-- test+trial@yarda.ai
INSERT INTO auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at, raw_app_meta_data, raw_user_meta_data, is_super_admin)
VALUES ('00000000-0000-0000-0000-000000000000', '301dd4e9-7866-43d5-8550-dc64ff6d1fa2', 'authenticated', 'authenticated', 'test+trial@yarda.ai', crypt('TestPassword123!', gen_salt('bf')), NOW(), NOW(), NOW(), '{"provider":"email","providers":["email"]}', '{}', false)
ON CONFLICT (id) DO NOTHING;

-- test+exhausted@yarda.ai
INSERT INTO auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at, raw_app_meta_data, raw_user_meta_data, is_super_admin)
VALUES ('00000000-0000-0000-0000-000000000000', 'd8e86fbd-045d-422f-94e2-c6aa3f6a7b92', 'authenticated', 'authenticated', 'test+exhausted@yarda.ai', crypt('TestPassword123!', gen_salt('bf')), NOW(), NOW(), NOW(), '{"provider":"email","providers":["email"]}', '{}', false)
ON CONFLICT (id) DO NOTHING;

-- test+tokens@yarda.ai
INSERT INTO auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at, raw_app_meta_data, raw_user_meta_data, is_super_admin)
VALUES ('00000000-0000-0000-0000-000000000000', '655c468d-7623-46b7-82f2-75c99977633b', 'authenticated', 'authenticated', 'test+tokens@yarda.ai', crypt('TestPassword123!', gen_salt('bf')), NOW(), NOW(), NOW(), '{"provider":"email","providers":["email"]}', '{}', false)
ON CONFLICT (id) DO NOTHING;

-- test+subscriber@yarda.ai
INSERT INTO auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at, raw_app_meta_data, raw_user_meta_data, is_super_admin)
VALUES ('00000000-0000-0000-0000-000000000000', '26c3bd34-d808-45a9-81a8-07e1c3166c3a', 'authenticated', 'authenticated', 'test+subscriber@yarda.ai', crypt('TestPassword123!', gen_salt('bf')), NOW(), NOW(), NOW(), '{"provider":"email","providers":["email"]}', '{}', false)
ON CONFLICT (id) DO NOTHING;

-- test+rich@yarda.ai
INSERT INTO auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at, raw_app_meta_data, raw_user_meta_data, is_super_admin)
VALUES ('00000000-0000-0000-0000-000000000000', 'b0355f7d-6553-460b-8484-3124383ef5b0', 'authenticated', 'authenticated', 'test+rich@yarda.ai', crypt('TestPassword123!', gen_salt('bf')), NOW(), NOW(), NOW(), '{"provider":"email","providers":["email"]}', '{}', false)
ON CONFLICT (id) DO NOTHING;
```

### Step 4: Verify Auth Users Created
```sql
SELECT id, email, email_confirmed_at, created_at
FROM auth.users
WHERE email LIKE 'test+%@yarda.ai'
ORDER BY email;
```

**Expected:** 5 rows, all with `email_confirmed_at` set (not NULL)

**Estimated Time:** 3-5 minutes

---

## Option 3: Check Current Login State

If you're already logged in to http://localhost:3000, you might be able to use the current session for testing.

### Step 1: Check Who's Logged In

**Open browser console at http://localhost:3000:**
```javascript
// Check localStorage for user info
JSON.parse(localStorage.getItem('user-storage'))

// Expected output:
{
  state: {
    user: {
      id: "...",
      email: "your@email.com",
      ...
    },
    accessToken: "eyJ...",
    ...
  }
}
```

### Step 2: Check User's Balance State
```sql
-- Replace USER_ID with the ID from Step 1
SELECT
    u.id,
    u.email,
    u.trial_remaining,
    u.trial_used,
    COALESCE(ta.balance, 0) as token_balance,
    u.subscription_tier,
    u.subscription_status
FROM users u
LEFT JOIN users_token_accounts ta ON u.id = ta.user_id
WHERE u.id = 'USER_ID_FROM_STEP_1';
```

### Step 3: Determine Which Test Case You Can Run

**If user has:**
- `trial_remaining = 0, token_balance = 0` → Can test TC-2.1 (Token Purchase)
- `trial_remaining = 0, token_balance >= 1` → Can test TC-2.2 (Token Deduction)
- `trial_remaining >= 1` → Can test trial flow first

**If balance state doesn't match:** Need to create auth for test accounts (Options 1 or 2)

---

## After Authentication Setup

### Verify You Can Login

1. **Navigate to:** http://localhost:3000
2. **Click:** "Sign In"
3. **Enter credentials:**
   ```
   Email: test+exhausted@yarda.ai
   Password: TestPassword123!
   ```
4. **Expected:** Redirected to /generate
5. **Verify:** Navigation shows correct balance (0 trial, 0 tokens)

### If Login Fails

**Common Issues:**

1. **"Invalid login credentials"**
   - Check password is exactly: `TestPassword123!`
   - Verify email is exactly: `test+exhausted@yarda.ai`
   - Check auth.users entry exists: `SELECT * FROM auth.users WHERE email = 'test+exhausted@yarda.ai'`

2. **"Email not confirmed"**
   - Update: `UPDATE auth.users SET email_confirmed_at = NOW() WHERE email = 'test+exhausted@yarda.ai'`

3. **User loads but shows wrong balance**
   - Check UUID sync: `SELECT u.id as public_id, au.id as auth_id FROM users u LEFT JOIN auth.users au ON u.email = au.email WHERE u.email = 'test+exhausted@yarda.ai'`
   - If IDs don't match, run sync SQL from Option 1, Step 3

---

## Quick Reference: Login Credentials

```
Password (all accounts): TestPassword123!

TC-2.1 Testing:
  Email: test+exhausted@yarda.ai
  Balance: 0 trial, 0 tokens

TC-2.2 Testing:
  Email: test+tokens@yarda.ai
  Balance: 0 trial, 50 tokens
```

---

## Next Steps After Auth Setup

1. ✅ Verify login works for test+exhausted@yarda.ai
2. ✅ Verify balance shows "0 trial credits, 0 tokens"
3. ✅ Proceed with [STRIPE_PAYMENT_TEST_GUIDE.md](STRIPE_PAYMENT_TEST_GUIDE.md) TC-2.1
4. ✅ After TC-2.1, login as test+tokens@yarda.ai for TC-2.2

---

## Troubleshooting

### SQL Access via MCP

Use Supabase MCP tool:
```javascript
mcp__supabase__execute_sql({
  project_id: "gxlmnjnjvlslijiowamn",
  query: "SELECT * FROM auth.users WHERE email LIKE 'test+%@yarda.ai'"
})
```

### SQL Access via psql

```bash
psql $DATABASE_URL -c "SELECT id, email FROM auth.users WHERE email LIKE 'test+%@yarda.ai'"
```

### Reset Auth Users (if needed)

```sql
-- Delete auth users (keeps public.users intact)
DELETE FROM auth.users WHERE email LIKE 'test+%@yarda.ai';

-- Then recreate using Option 1 or 2
```

---

**Created:** 2025-11-06
**Purpose:** Enable Stripe payment testing with proper authentication
**Related:** [STRIPE_PAYMENT_TEST_GUIDE.md](STRIPE_PAYMENT_TEST_GUIDE.md), [PHASE_2_COMPLETE.md](PHASE_2_COMPLETE.md)
