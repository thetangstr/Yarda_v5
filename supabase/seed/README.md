# Seed Data for Yarda v5

This directory contains SQL scripts to populate the database with sample data for testing and development.

## Quick Start

### Option A: Supabase SQL Editor (Recommended)

1. Open [Supabase SQL Editor](https://app.supabase.com/project/ynsfmvonkoodmqfkukge/sql/new)
2. Copy the contents of `seed.sql`
3. Paste into SQL Editor
4. Click "Run" (or press Cmd/Ctrl + Enter)
5. Verify success in output

### Option B: Supabase CLI

```bash
cd supabase
supabase db reset --linked  # Resets database and runs all migrations + seed
```

Or run seed only:

```bash
psql -h db.ynsfmvonkoodmqfkukge.supabase.co \
     -U postgres \
     -d postgres \
     -f seed/seed.sql
```

## What Gets Created

The seed script creates **5 test users** with different credit states:

### User 1: Fresh User (`seed-fresh-user@yarda.test`)
- **Trial Credits:** 3
- **Token Balance:** 0
- **Generations:** 0
- **Use Case:** Test new user experience, first-time generation

### User 2: Partial Trial (`seed-partial-trial@yarda.test`)
- **Trial Credits:** 1 (2 already used)
- **Token Balance:** 0
- **Generations:** 2 (both completed, used trial credits)
- **Use Case:** Test trial credit consumption, mid-trial user experience

### User 3: Token User (`seed-token-user@yarda.test`)
- **Trial Credits:** 0 (all used)
- **Token Balance:** 7
- **Total Purchased:** 10 tokens
- **Total Consumed:** 3 tokens
- **Generations:** 6 (3 trial + 3 token, all completed)
- **Use Case:** Test token purchase flow, token consumption, purchase history

### User 4: Power User (`seed-power-user@yarda.test`)
- **Trial Credits:** 0
- **Token Balance:** 15
- **Total Purchased:** 50 tokens
- **Total Consumed:** 35 tokens
- **Generations:** 15
  - 1 pending
  - 1 processing
  - 10 completed
  - 2 failed (with refunds)
- **Use Case:** Test generation history, status polling, pagination, error handling

### User 5: Rate Limited (`seed-rate-limited@yarda.test`)
- **Trial Credits:** 2
- **Token Balance:** 0
- **Rate Limits:** 3 attempts in last 60 seconds
- **Use Case:** Test rate limiting behavior, rate limit UI

## Test Credentials

**All users share the same password:** `TestPassword123!`

Example login:
```
Email: seed-fresh-user@yarda.test
Password: TestPassword123!
```

## Use Cases by Feature

### Testing Registration & Email Verification
- Create a new user (not using seed data)
- Verify email verification flow

### Testing Trial Credits
- Use **User 1** (fresh with 3 trial credits)
- Generate 3 designs, verify credits decrease
- Verify purchase CTA appears after exhaustion

### Testing Token Purchase & Consumption
- Use **User 3** (has purchased tokens)
- Verify token balance displays correctly
- Generate design using token credit
- Verify token balance decreases

### Testing Generation History
- Use **User 4** (power user with 15 generations)
- Test pagination (if displaying 10 per page)
- Test filtering by status (pending, processing, completed, failed)
- Test generation details modal

### Testing Rate Limiting
- Use **User 5** (already rate limited)
- Attempt to generate design
- Verify rate limit error with countdown timer
- Wait 60 seconds, verify can generate again

### Testing Error Handling
- Use **User 4** to view failed generations
- Verify credit refund occurred
- Verify error messages display correctly

## Database Verification

After running the seed script, verify data was created:

```sql
-- Check all seed users
SELECT
    u.email,
    u.trial_credits,
    t.balance as token_balance,
    t.total_purchased,
    t.total_consumed,
    (SELECT COUNT(*) FROM generations WHERE user_id = u.id) as total_generations
FROM users u
LEFT JOIN token_accounts t ON t.user_id = u.id
WHERE u.email LIKE 'seed-%@yarda.test'
ORDER BY u.email;
```

Expected output:
```
email                           | trial_credits | token_balance | total_purchased | total_consumed | total_generations
--------------------------------|---------------|---------------|-----------------|----------------|------------------
seed-fresh-user@yarda.test      | 3             | 0             | 0               | 0              | 0
seed-partial-trial@yarda.test   | 1             | 0             | 0               | 0              | 2
seed-power-user@yarda.test      | 0             | 15            | 50              | 35             | 15
seed-rate-limited@yarda.test    | 2             | 0             | 0               | 0              | 0
seed-token-user@yarda.test      | 0             | 7             | 10              | 3              | 6
```

## Cleanup

To remove all seed data:

```sql
DELETE FROM rate_limits WHERE user_id IN (
    SELECT id FROM auth.users WHERE email LIKE 'seed-%@yarda.test'
);
DELETE FROM generations WHERE user_id IN (
    SELECT id FROM auth.users WHERE email LIKE 'seed-%@yarda.test'
);
DELETE FROM token_accounts WHERE user_id IN (
    SELECT id FROM auth.users WHERE email LIKE 'seed-%@yarda.test'
);
DELETE FROM users WHERE email LIKE 'seed-%@yarda.test';
DELETE FROM auth.users WHERE email LIKE 'seed-%@yarda.test';
```

## Important Notes

**⚠️ Development/Test Only**
- This script is designed for development and testing environments
- **NEVER run in production** - it will delete existing data
- All seed users use the same simple password for testing convenience

**Automatic Token Account Creation**
- The seed script relies on the `on_auth_user_created` trigger
- This trigger automatically creates a token account when a user is created
- If the trigger is not working, token accounts are manually inserted as a fallback

**UUIDs**
- Seed users use predictable UUIDs (00000000-0000-0000-0000-00000000000X)
- This makes it easy to identify seed data in queries and logs
- Real users will have random UUIDs

**Rate Limits**
- User 5's rate limits expire after 60 seconds
- Re-run the seed script to reset rate limits for testing

## Integration with Tests

The seed data is designed to complement automated tests:

**Backend Integration Tests (47 tests):**
- Create temporary users via fixtures
- Use actual Supabase authentication
- Tests are isolated and clean up after themselves

**Frontend E2E Tests (59 tests):**
- Use seed data for read-only tests (viewing history, balances)
- Create temporary users for write tests (registration, generation)
- Playwright handles test isolation

**Manual Testing:**
- Use seed data for exploratory testing
- Test complete user journeys without creating new accounts each time
- Quickly reset to known state by re-running seed script

## Troubleshooting

**"User already exists" error:**
- Run the cleanup commands first
- Or drop and recreate the database

**Token accounts not created:**
- Verify the `on_auth_user_created` trigger exists
- Check trigger logs in Supabase dashboard

**Rate limits not working:**
- Verify rate_limits table has the 3 records for User 5
- Check that `attempted_at` is within the last 60 seconds

**Cannot login with seed users:**
- Verify password is exactly: `TestPassword123!`
- Check that users were created in auth.users table
- Verify email_confirmed_at is not null

## Next Steps

After running seed data:

1. **Test API endpoints** with seed users via Postman/Insomnia
2. **Test frontend** by logging in as different users
3. **Test complete user journeys** following the integration testing guide
4. **Report any issues** with seed data or test scenarios
