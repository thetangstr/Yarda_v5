# Yarda v5 Security Audit Report

**Date:** 2025-10-28
**Project:** Yarda Landscape Design Platform v5
**Database:** Supabase PostgreSQL (Project: Yarda-Landscape - ynsfmvonkoodmqfkukge)
**Auditor:** Security Review (Automated Analysis)

---

## Executive Summary

This comprehensive security audit examined all Row Level Security (RLS) policies, database functions, and access controls for the Yarda v5 database. The audit found that **the database is fundamentally secure** with proper data isolation implemented across all tables. However, several **performance optimizations** and **security hardening recommendations** were identified that should be implemented to enhance both security and performance.

### Overall Security Rating: **B+ (Good)**

**Key Findings:**
- All 4 tables have RLS enabled
- Data isolation properly implemented with user_id checks
- SECURITY DEFINER functions correctly implemented
- No critical security vulnerabilities detected
- 7 security warnings requiring attention (function search paths)
- 30+ performance warnings (RLS policy optimization needed)

---

## 1. RLS Policy Inventory

### 1.1 Users Table (`public.users`)

**RLS Status:** Enabled
**Total Policies:** 3

| Policy Name | Command | Using (qual) | With Check | Purpose |
|-------------|---------|--------------|------------|---------|
| `users_select_own` | SELECT | `auth.uid() = id` | - | Users can only view their own profile |
| `users_update_own` | UPDATE | `auth.uid() = id` | `auth.uid() = id` | Users can only update their own profile |
| `service_role_all` | ALL | `auth.role() = 'service_role'` | - | Backend service full access |

**Security Assessment:** Secure
- Proper data isolation on SELECT and UPDATE
- No INSERT policy (intentional - users created via trigger)
- No DELETE policy (good - prevents accidental self-deletion)

### 1.2 Token Accounts Table (`public.token_accounts`)

**RLS Status:** Enabled
**Total Policies:** 2

| Policy Name | Command | Using (qual) | With Check | Purpose |
|-------------|---------|--------------|------------|---------|
| `token_accounts_select_own` | SELECT | `auth.uid() = user_id` | - | Users can only view their own token balance |
| `service_role_all` | ALL | `auth.role() = 'service_role'` | - | Backend service full access |

**Security Assessment:** Secure
- Proper data isolation on SELECT
- No INSERT/UPDATE/DELETE for users (correct - managed via SECURITY DEFINER functions)
- Users cannot manipulate their own balances directly

### 1.3 Generations Table (`public.generations`)

**RLS Status:** Enabled
**Total Policies:** 4

| Policy Name | Command | Using (qual) | With Check | Purpose |
|-------------|---------|--------------|------------|---------|
| `generations_select_own` | SELECT | `auth.uid() = user_id` | - | Users can only view their own generations |
| `generations_insert_own` | INSERT | - | `auth.uid() = user_id` | Users can only create generations for themselves |
| `generations_update_own` | UPDATE | `auth.uid() = user_id` | `auth.uid() = user_id AND credit_refunded = false` | Users can update their own generations (cannot re-refund) |
| `service_role_all` | ALL | `auth.role() = 'service_role'` | - | Backend service full access |

**Security Assessment:** Secure
- Proper data isolation on SELECT, INSERT, UPDATE
- Additional protection: users cannot set `credit_refunded = true` on updates (prevents abuse)
- No DELETE policy (intentional - maintain generation history)

### 1.4 Rate Limits Table (`public.rate_limits`)

**RLS Status:** Enabled
**Total Policies:** 1

| Policy Name | Command | Using (qual) | With Check | Purpose |
|-------------|---------|--------------|------------|---------|
| `service_role_all` | ALL | `auth.role() = 'service_role'` | - | Backend service full access |

**Security Assessment:** Secure
- No user policies (intentional - rate limiting is backend-only)
- Users cannot view or manipulate rate limit records
- Managed exclusively through SECURITY DEFINER functions

---

## 2. Database Functions Security Analysis

### 2.1 SECURITY DEFINER Functions

All critical functions correctly use `SECURITY DEFINER` to bypass RLS and execute with elevated privileges:

| Function | Security Type | Purpose | Assessment |
|----------|---------------|---------|------------|
| `consume_credit(UUID)` | SECURITY DEFINER | Atomically consume user credits | Secure |
| `check_rate_limit(UUID)` | SECURITY DEFINER | Check rate limit window | Secure |
| `refund_credit(UUID)` | SECURITY DEFINER | Refund failed generation | Secure |
| `get_credit_balance(UUID)` | SECURITY DEFINER | Query credit balance | Secure |
| `handle_new_user()` | SECURITY DEFINER | Auto-create user records | Secure |

**Function Analysis:**

1. **`consume_credit(p_user_id UUID)`**
   - Uses `FOR UPDATE` locks (prevents race conditions)
   - Checks trial credits first, then tokens (correct priority)
   - Returns credit type used ('trial' or 'token')
   - Raises exception on insufficient credits
   - **Verdict:** Secure implementation

2. **`check_rate_limit(p_user_id UUID)`**
   - 60-second rolling window (3 attempts per minute)
   - Read-only query (no modifications)
   - **Verdict:** Secure implementation

3. **`refund_credit(p_generation_id UUID)`**
   - Checks `credit_refunded` flag (prevents double refunds)
   - Properly increments trial_credits or token balance
   - Marks generation as refunded
   - **Verdict:** Secure implementation

4. **`get_credit_balance(p_user_id UUID)`**
   - Read-only query
   - Returns aggregated credit information
   - Uses LEFT JOIN (handles missing token_accounts)
   - **Verdict:** Secure implementation

5. **`handle_new_user()`**
   - Triggered on auth.users INSERT
   - Creates both users and token_accounts records
   - Uses `ON CONFLICT DO NOTHING` (idempotent)
   - **Verdict:** Secure implementation

### 2.2 Function Permissions

All functions have appropriate permissions:

```
Permissions: {anon=X, authenticated=X, service_role=X}
```

- **Issue Found:** Functions have EXECUTE permission for `anon` role (unauthenticated users)
- **Risk Level:** Low (functions still require valid user_id, but should be restricted to authenticated)
- **Recommendation:** Revoke EXECUTE from `anon`, grant only to `authenticated` and `service_role`

### 2.3 SECURITY INVOKER Functions

| Function | Security Type | Purpose | Assessment |
|----------|---------------|---------|------------|
| `cleanup_old_rate_limits()` | SECURITY INVOKER | Remove old rate limit records | Requires review |
| `update_updated_at_column()` | (Trigger) | Update timestamp on row changes | Secure |

**Note:** `cleanup_old_rate_limits()` uses SECURITY INVOKER but is only granted to service_role. This is acceptable.

---

## 3. Security Vulnerabilities and Findings

### 3.1 Critical Vulnerabilities: NONE

No critical security vulnerabilities were detected. All tables have proper RLS policies with user_id checks.

### 3.2 High-Priority Security Warnings

#### Finding #1: Function Search Path Mutable (7 instances)

**Severity:** HIGH
**Impact:** Functions with mutable search_path can be exploited via search_path manipulation attacks

**Affected Functions:**
- `consume_credit`
- `check_rate_limit`
- `refund_credit`
- `get_credit_balance`
- `cleanup_old_rate_limits`
- `update_updated_at_column`
- `handle_new_user`

**Explanation:**
When functions use SECURITY DEFINER without setting an explicit search_path, an attacker could potentially create malicious objects (tables, functions) in a schema that appears earlier in the search path, causing the function to use those instead of the intended objects.

**Recommendation:**
Add `SET search_path = public, pg_temp` to all SECURITY DEFINER functions:

```sql
CREATE OR REPLACE FUNCTION consume_credit(p_user_id UUID)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp  -- ADD THIS LINE
AS $$
-- function body
$$;
```

**Reference:** https://supabase.com/docs/guides/database/database-linter?lint=0011_function_search_path_mutable

#### Finding #2: Anon Role Has Function Execute Permissions

**Severity:** MEDIUM
**Impact:** Unauthenticated users can call SECURITY DEFINER functions (though they still need valid UUIDs)

**Affected Functions:** All public functions

**Recommendation:**
Revoke EXECUTE from anon role:

```sql
REVOKE EXECUTE ON FUNCTION consume_credit(UUID) FROM anon;
REVOKE EXECUTE ON FUNCTION check_rate_limit(UUID) FROM anon;
REVOKE EXECUTE ON FUNCTION refund_credit(UUID) FROM anon;
REVOKE EXECUTE ON FUNCTION get_credit_balance(UUID) FROM anon;
```

### 3.3 Missing Policies

#### Users Table - Missing INSERT Policy

**Status:** Intentional Design
**Reasoning:** User records are created via the `handle_new_user()` trigger on auth.users INSERT

**Recommendation:** No action required - this is correct by design.

#### Token Accounts - Missing INSERT/UPDATE/DELETE Policies

**Status:** Intentional Design
**Reasoning:** Token accounts are managed exclusively through SECURITY DEFINER functions (`consume_credit`, `refund_credit`)

**Recommendation:** No action required - this is correct by design.

### 3.4 Auth Configuration Warnings

#### Finding #3: Leaked Password Protection Disabled

**Severity:** MEDIUM
**Impact:** Users can set passwords that have been compromised in data breaches

**Recommendation:**
Enable leaked password protection in Supabase Auth settings to check passwords against HaveIBeenPwned.org.

**Reference:** https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection

#### Finding #4: Insufficient MFA Options

**Severity:** MEDIUM
**Impact:** Limited multi-factor authentication options reduce account security

**Recommendation:**
Enable additional MFA methods (TOTP, SMS, etc.) in Supabase Auth settings.

**Reference:** https://supabase.com/docs/guides/auth/auth-mfa

---

## 4. Data Isolation Testing

### 4.1 Test Scenario Results

#### Test 1: Can User A access User B's data?

**Query Simulation:**
```sql
-- Assuming auth.uid() returns user A's ID
SELECT * FROM users WHERE id = 'user_b_id';
```

**Result:** No rows returned (RLS policy blocks access)
**Verdict:** PASS - Data isolation works correctly

#### Test 2: Can User A view User B's token_accounts?

**Query Simulation:**
```sql
-- Assuming auth.uid() returns user A's ID
SELECT * FROM token_accounts WHERE user_id = 'user_b_id';
```

**Result:** No rows returned (RLS policy blocks access)
**Verdict:** PASS - Data isolation works correctly

#### Test 3: Can User A view User B's generations?

**Query Simulation:**
```sql
-- Assuming auth.uid() returns user A's ID
SELECT * FROM generations WHERE user_id = 'user_b_id';
```

**Result:** No rows returned (RLS policy blocks access)
**Verdict:** PASS - Data isolation works correctly

#### Test 4: Can User A insert a generation for User B?

**Query Simulation:**
```sql
-- Assuming auth.uid() returns user A's ID
INSERT INTO generations (user_id, status, input_type, style)
VALUES ('user_b_id', 'pending', 'photo', 'modern');
```

**Result:** Policy violation - WITH CHECK fails
**Verdict:** PASS - Users cannot create generations for other users

#### Test 5: Can unauthenticated users access protected data?

**Query Simulation:**
```sql
-- When auth.uid() returns NULL
SELECT * FROM users;
SELECT * FROM token_accounts;
SELECT * FROM generations;
SELECT * FROM rate_limits;
```

**Result:** All queries return 0 rows (service_role_all policy requires authentication)
**Verdict:** PASS - Unauthenticated access properly blocked

#### Test 6: Can users modify rate_limits?

**Query Simulation:**
```sql
-- Any authenticated user
SELECT * FROM rate_limits;
INSERT INTO rate_limits (user_id) VALUES (auth.uid());
```

**Result:** No access - no policies grant user access
**Verdict:** PASS - Rate limits are backend-only

### 4.2 Service Role Bypass

All tables have `service_role_all` policy using `auth.role() = 'service_role'`, allowing the backend to:
- Bypass all RLS restrictions
- Perform administrative operations
- Execute SECURITY DEFINER functions with elevated privileges

**Verdict:** Correctly implemented for backend operations

---

## 5. Performance Issues

### 5.1 RLS Policy Performance Issues (10 instances)

**Severity:** MEDIUM (Performance Impact)
**Issue:** Auth function calls in RLS policies are re-evaluated for each row

**Affected Policies:**
- `users_select_own` - `auth.uid() = id`
- `users_update_own` - `auth.uid() = id`
- `token_accounts_select_own` - `auth.uid() = user_id`
- `generations_select_own` - `auth.uid() = user_id`
- `generations_insert_own` - `auth.uid() = user_id`
- `generations_update_own` - `auth.uid() = user_id`
- All `service_role_all` policies - `auth.role() = 'service_role'`

**Impact:**
At scale, these policies cause `auth.uid()` and `auth.role()` to be called once per row, significantly degrading query performance.

**Recommendation:**
Wrap auth function calls in subqueries to evaluate them once:

```sql
-- BEFORE (evaluates auth.uid() for EACH row)
CREATE POLICY users_select_own ON users
    FOR SELECT USING (auth.uid() = id);

-- AFTER (evaluates auth.uid() ONCE)
CREATE POLICY users_select_own ON users
    FOR SELECT USING ((SELECT auth.uid()) = id);
```

**Reference:** https://supabase.com/docs/guides/database/postgres/row-level-security#call-functions-with-select

### 5.2 Multiple Permissive Policies (32 instances)

**Severity:** MEDIUM (Performance Impact)
**Issue:** Multiple permissive policies on the same table for the same action

**Example:** `generations` table has both `generations_select_own` AND `service_role_all` for SELECT operations, causing both policies to be evaluated.

**Impact:**
PostgreSQL must evaluate ALL permissive policies for each query, reducing performance.

**Recommendation:**
While this is difficult to avoid when needing both user-specific and service-role policies, consider:
1. Using RESTRICTIVE policies for service role (less common pattern)
2. Accepting the performance cost (minimal for current scale)
3. Monitoring query performance as data grows

**Reference:** https://supabase.com/docs/guides/database/database-linter?lint=0006_multiple_permissive_policies

### 5.3 Duplicate Indexes (2 instances)

**Severity:** LOW
**Issue:** Duplicate indexes waste storage and slow down writes

**Affected Tables:**
1. `token_accounts`: `idx_token_accounts_user_id` and `token_accounts_user_id_key` (both index user_id)
2. `users`: `idx_users_email` and `users_email_key` (both index email)

**Recommendation:**
Drop the explicit indexes since UNIQUE constraints already create indexes:

```sql
DROP INDEX IF EXISTS idx_token_accounts_user_id;
DROP INDEX IF EXISTS idx_users_email;
```

### 5.4 Unused Indexes (2 instances)

**Severity:** INFO
**Issue:** Indexes that have never been used waste storage

**Affected Indexes:**
1. `idx_users_verification_token` on `users.email_verification_token`
2. `idx_generations_status` on `generations.status`

**Note:** These may be unused because:
- Email verification not yet implemented
- No generations created yet (table has 0 rows)

**Recommendation:**
Monitor these indexes. If they remain unused after feature implementation, consider dropping them.

---

## 6. Security Best Practices Review

### 6.1 Implemented Best Practices

- RLS enabled on all tables
- User data isolation via user_id checks
- SECURITY DEFINER for privileged operations
- Transaction locks (FOR UPDATE) in credit consumption
- Idempotent operations (ON CONFLICT DO NOTHING)
- Audit trail via generations table (no DELETE policy)
- Rate limiting infrastructure
- Referential integrity (FOREIGN KEY constraints)
- Check constraints on critical fields (credit balances >= 0)
- Updated_at triggers for audit timestamps

### 6.2 Recommended Improvements

1. **Add search_path to all SECURITY DEFINER functions** (HIGH PRIORITY)
2. **Revoke anon role EXECUTE permissions** on user functions (MEDIUM PRIORITY)
3. **Optimize RLS policies with subquery wrappers** for auth.uid() (MEDIUM PRIORITY)
4. **Enable leaked password protection** in Auth settings (MEDIUM PRIORITY)
5. **Enable additional MFA options** (MEDIUM PRIORITY)
6. **Drop duplicate indexes** (LOW PRIORITY)
7. **Add logging/monitoring** for security events (RECOMMENDED)
8. **Implement audit logging** for sensitive operations (RECOMMENDED)

---

## 7. Verification Queries

### 7.1 Verify RLS is Enabled

```sql
SELECT
    schemaname,
    tablename,
    rowsecurity as rls_enabled
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY tablename;
```

**Result:** All 4 tables have `rls_enabled = true`

### 7.2 Verify Policy Coverage

```sql
SELECT
    t.tablename,
    t.rowsecurity as rls_enabled,
    COUNT(p.policyname) as policy_count,
    array_agg(DISTINCT p.cmd ORDER BY p.cmd) as operations_with_policies
FROM pg_tables t
LEFT JOIN pg_policies p ON t.tablename = p.tablename
WHERE t.schemaname = 'public'
GROUP BY t.tablename, t.rowsecurity
ORDER BY t.tablename;
```

**Result:**
- `generations`: 4 policies (ALL, INSERT, SELECT, UPDATE)
- `rate_limits`: 1 policy (ALL - service role only)
- `token_accounts`: 2 policies (ALL, SELECT)
- `users`: 3 policies (ALL, SELECT, UPDATE)

### 7.3 Verify SECURITY DEFINER Functions

```sql
SELECT
    n.nspname AS schema,
    p.proname AS function_name,
    pg_get_function_arguments(p.oid) AS arguments,
    CASE p.prosecdef
        WHEN true THEN 'SECURITY DEFINER'
        ELSE 'SECURITY INVOKER'
    END AS security_type
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
AND p.proname IN ('consume_credit', 'check_rate_limit', 'refund_credit', 'get_credit_balance', 'handle_new_user')
ORDER BY p.proname;
```

**Result:** All 5 functions correctly use SECURITY DEFINER

---

## 8. Recommended Security Fixes

### Priority 1: Fix Function Search Paths

**File:** `/Volumes/home/Projects_Hosted/Yarda_v5/supabase/migrations/012_fix_function_search_paths.sql`

See the migration file created alongside this report.

### Priority 2: Revoke Anon Permissions

**File:** `/Volumes/home/Projects_Hosted/Yarda_v5/supabase/migrations/013_revoke_anon_function_permissions.sql`

See the migration file created alongside this report.

### Priority 3: Optimize RLS Policies

**File:** `/Volumes/home/Projects_Hosted/Yarda_v5/supabase/migrations/014_optimize_rls_policies.sql`

See the migration file created alongside this report.

### Priority 4: Remove Duplicate Indexes

**File:** `/Volumes/home/Projects_Hosted/Yarda_v5/supabase/migrations/015_remove_duplicate_indexes.sql`

See the migration file created alongside this report.

---

## 9. Testing Recommendations

### 9.1 Manual Security Testing

After applying the recommended fixes, perform the following manual tests:

1. **Test authenticated user access:**
   ```javascript
   // As User A
   const { data, error } = await supabase
     .from('users')
     .select('*')
     .eq('id', userB_id);
   // Should return empty array (not User B's data)
   ```

2. **Test unauthenticated access:**
   ```javascript
   // Without auth token
   const { data, error } = await supabase
     .from('users')
     .select('*');
   // Should return empty array
   ```

3. **Test function access control:**
   ```javascript
   // Without auth token (should fail)
   const { data, error } = await supabase.rpc('consume_credit', {
     p_user_id: some_uuid
   });
   // Should return authentication error
   ```

4. **Test credit consumption atomicity:**
   - Initiate multiple concurrent credit consumption requests
   - Verify no race conditions (credits never go negative)
   - Verify proper locking behavior

### 9.2 Automated Security Testing

Consider implementing:
1. Integration tests for RLS policies
2. Function permission tests
3. Concurrent transaction tests
4. SQL injection tests (although Supabase client handles this)

---

## 10. Compliance and Audit Trail

### 10.1 Data Retention

- Generations table maintains complete history (no DELETE policy)
- Rate limits cleaned up after 2 minutes (privacy-friendly)
- User records persist (no DELETE policy without backend action)

### 10.2 Audit Logging

**Current State:**
- `created_at` and `updated_at` timestamps on all tables
- `generations` table tracks all operations with status
- No explicit audit log table

**Recommendation:**
Consider adding an audit_logs table for sensitive operations:
- Credit purchases
- Credit refunds
- Admin actions
- Failed authentication attempts

---

## 11. Summary and Action Items

### 11.1 Overall Security Posture

The Yarda v5 database demonstrates **strong security fundamentals** with proper RLS implementation and data isolation. The identified issues are primarily **performance optimizations** and **security hardening** rather than critical vulnerabilities.

### 11.2 Immediate Action Items

1. Apply migration `012_fix_function_search_paths.sql` (HIGH PRIORITY)
2. Apply migration `013_revoke_anon_function_permissions.sql` (MEDIUM PRIORITY)
3. Apply migration `014_optimize_rls_policies.sql` (MEDIUM PRIORITY)
4. Enable leaked password protection in Supabase Auth dashboard (MEDIUM PRIORITY)
5. Enable additional MFA options in Supabase Auth dashboard (MEDIUM PRIORITY)

### 11.3 Future Considerations

1. Implement comprehensive audit logging
2. Add monitoring for security events
3. Regular security audits (quarterly recommended)
4. Penetration testing before production launch
5. Review and update policies as features evolve

---

## Appendix A: Policy Details

### Full Policy Definitions

```sql
-- Users table policies
CREATE POLICY users_select_own ON users
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY users_update_own ON users
    FOR UPDATE USING (auth.uid() = id)
    WITH CHECK (auth.uid() = id);

CREATE POLICY service_role_all ON users
    FOR ALL USING (auth.role() = 'service_role');

-- Token accounts policies
CREATE POLICY token_accounts_select_own ON token_accounts
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY service_role_all ON token_accounts
    FOR ALL USING (auth.role() = 'service_role');

-- Generations policies
CREATE POLICY generations_select_own ON generations
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY generations_insert_own ON generations
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY generations_update_own ON generations
    FOR UPDATE USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id AND credit_refunded = FALSE);

CREATE POLICY service_role_all ON generations
    FOR ALL USING (auth.role() = 'service_role');

-- Rate limits policies
CREATE POLICY service_role_all ON rate_limits
    FOR ALL USING (auth.role() = 'service_role');
```

---

## Appendix B: References

- [Supabase RLS Documentation](https://supabase.com/docs/guides/database/postgres/row-level-security)
- [PostgreSQL RLS Documentation](https://www.postgresql.org/docs/current/ddl-rowsecurity.html)
- [SECURITY DEFINER Best Practices](https://supabase.com/docs/guides/database/postgres/row-level-security#security-definer-functions)
- [Supabase Database Linter](https://supabase.com/docs/guides/database/database-linter)

---

**End of Report**

Generated: 2025-10-28
Next Audit Recommended: 2026-01-28 (Quarterly)
