-- Optimize RLS policies by wrapping auth function calls in subqueries
-- This prevents the functions from being re-evaluated for each row
-- Reference: https://supabase.com/docs/guides/database/postgres/row-level-security#call-functions-with-select

-- Users table policies
DROP POLICY IF EXISTS users_select_own ON users;
CREATE POLICY users_select_own ON users
    FOR SELECT USING ((SELECT auth.uid()) = id);

DROP POLICY IF EXISTS users_update_own ON users;
CREATE POLICY users_update_own ON users
    FOR UPDATE USING ((SELECT auth.uid()) = id)
    WITH CHECK ((SELECT auth.uid()) = id);

DROP POLICY IF EXISTS service_role_all ON users;
CREATE POLICY service_role_all ON users
    FOR ALL USING ((SELECT auth.role()) = 'service_role');

-- Token accounts policies
DROP POLICY IF EXISTS token_accounts_select_own ON token_accounts;
CREATE POLICY token_accounts_select_own ON token_accounts
    FOR SELECT USING ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS service_role_all ON token_accounts;
CREATE POLICY service_role_all ON token_accounts
    FOR ALL USING ((SELECT auth.role()) = 'service_role');

-- Generations policies
DROP POLICY IF EXISTS generations_select_own ON generations;
CREATE POLICY generations_select_own ON generations
    FOR SELECT USING ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS generations_insert_own ON generations;
CREATE POLICY generations_insert_own ON generations
    FOR INSERT WITH CHECK ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS generations_update_own ON generations;
CREATE POLICY generations_update_own ON generations
    FOR UPDATE USING ((SELECT auth.uid()) = user_id)
    WITH CHECK ((SELECT auth.uid()) = user_id AND credit_refunded = FALSE);

DROP POLICY IF EXISTS service_role_all ON generations;
CREATE POLICY service_role_all ON generations
    FOR ALL USING ((SELECT auth.role()) = 'service_role');

-- Rate limits policies
DROP POLICY IF EXISTS service_role_all ON rate_limits;
CREATE POLICY service_role_all ON rate_limits
    FOR ALL USING ((SELECT auth.role()) = 'service_role');

-- Comment
COMMENT ON MIGRATION IS 'Performance optimization: Wrap auth function calls in subqueries to evaluate once per query instead of once per row';
