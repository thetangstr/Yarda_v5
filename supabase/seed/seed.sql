-- ============================================================================
-- Yarda v5 Seed Data Script
-- ============================================================================
-- Purpose: Create sample data for testing and development
-- Usage: Run in Supabase SQL Editor or via CLI
--
-- This script creates:
-- - 5 test users with different credit states
-- - Token accounts for all users
-- - Sample generations in various states
-- - Rate limit records for testing
--
-- ⚠️  WARNING: This will DELETE all existing data in test tables!
-- Only run in development/test environments, NEVER in production!
-- ============================================================================

-- ============================================================================
-- CLEANUP: Remove existing test data
-- ============================================================================

DO $
BEGIN
    RAISE NOTICE 'Cleaning up existing test data...';
END $;

-- Delete in correct order (respecting foreign keys)
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

DO $
BEGIN
    RAISE NOTICE 'Cleanup complete.';
END $;

-- ============================================================================
-- USER 1: Fresh user with full trial credits
-- ============================================================================

DO $
DECLARE
    v_user_id UUID := '00000000-0000-0000-0000-000000000001';
    v_email TEXT := 'seed-fresh-user@yarda.test';
BEGIN
    RAISE NOTICE 'Creating User 1: Fresh user with trial credits...';

    -- Create auth user
    INSERT INTO auth.users (
        id,
        instance_id,
        email,
        encrypted_password,
        email_confirmed_at,
        created_at,
        updated_at,
        aud,
        role
    ) VALUES (
        v_user_id,
        '00000000-0000-0000-0000-000000000000',
        v_email,
        crypt('TestPassword123!', gen_salt('bf')),
        NOW(),
        NOW(),
        NOW(),
        'authenticated',
        'authenticated'
    );

    -- Create user record (trigger will create token account)
    INSERT INTO public.users (id, email, email_verified, trial_credits)
    VALUES (v_user_id, v_email, TRUE, 3);

    -- Verify token account created by trigger
    INSERT INTO public.token_accounts (user_id, balance, total_purchased, total_consumed)
    VALUES (v_user_id, 0, 0, 0)
    ON CONFLICT (user_id) DO NOTHING;

    RAISE NOTICE 'User 1 created: % (Trial: 3, Tokens: 0)', v_email;
END $;

-- ============================================================================
-- USER 2: User with some trial credits used
-- ============================================================================

DO $
DECLARE
    v_user_id UUID := '00000000-0000-0000-0000-000000000002';
    v_email TEXT := 'seed-partial-trial@yarda.test';
    v_gen_id UUID;
BEGIN
    RAISE NOTICE 'Creating User 2: User with partial trial credits...';

    INSERT INTO auth.users (
        id,
        instance_id,
        email,
        encrypted_password,
        email_confirmed_at,
        created_at,
        updated_at,
        aud,
        role
    ) VALUES (
        v_user_id,
        '00000000-0000-0000-0000-000000000000',
        v_email,
        crypt('TestPassword123!', gen_salt('bf')),
        NOW(),
        NOW(),
        NOW(),
        'authenticated',
        'authenticated'
    );

    INSERT INTO public.users (id, email, email_verified, trial_credits)
    VALUES (v_user_id, v_email, TRUE, 1);  -- 2 credits already used

    INSERT INTO public.token_accounts (user_id, balance, total_purchased, total_consumed)
    VALUES (v_user_id, 0, 0, 0)
    ON CONFLICT (user_id) DO NOTHING;

    -- Create 2 completed generations (used trial credits)
    FOR i IN 1..2 LOOP
        v_gen_id := gen_random_uuid();
        INSERT INTO public.generations (
            id,
            user_id,
            address,
            style,
            credit_type,
            status,
            created_at,
            updated_at
        ) VALUES (
            v_gen_id,
            v_user_id,
            i || ' Sample Street, Test City, CA 94000',
            CASE WHEN i = 1 THEN 'modern' ELSE 'traditional' END,
            'trial',
            'completed',
            NOW() - (i || ' hours')::INTERVAL,
            NOW() - (i || ' hours')::INTERVAL + INTERVAL '5 minutes'
        );
    END LOOP;

    RAISE NOTICE 'User 2 created: % (Trial: 1, Tokens: 0, Generations: 2)', v_email;
END $;

-- ============================================================================
-- USER 3: User with trial exhausted, has purchased tokens
-- ============================================================================

DO $
DECLARE
    v_user_id UUID := '00000000-0000-0000-0000-000000000003';
    v_email TEXT := 'seed-token-user@yarda.test';
    v_gen_id UUID;
BEGIN
    RAISE NOTICE 'Creating User 3: User with purchased tokens...';

    INSERT INTO auth.users (
        id,
        instance_id,
        email,
        encrypted_password,
        email_confirmed_at,
        created_at,
        updated_at,
        aud,
        role
    ) VALUES (
        v_user_id,
        '00000000-0000-0000-0000-000000000000',
        v_email,
        crypt('TestPassword123!', gen_salt('bf')),
        NOW(),
        NOW(),
        NOW(),
        'authenticated',
        'authenticated'
    );

    INSERT INTO public.users (id, email, email_verified, trial_credits)
    VALUES (v_user_id, v_email, TRUE, 0);  -- All trial credits used

    INSERT INTO public.token_accounts (user_id, balance, total_purchased, total_consumed)
    VALUES (v_user_id, 7, 10, 3)  -- Purchased 10, used 3, has 7 remaining
    ON CONFLICT (user_id) DO NOTHING;

    -- Create 3 trial generations (completed)
    FOR i IN 1..3 LOOP
        v_gen_id := gen_random_uuid();
        INSERT INTO public.generations (
            id,
            user_id,
            address,
            style,
            credit_type,
            status,
            created_at,
            updated_at
        ) VALUES (
            v_gen_id,
            v_user_id,
            i || ' Trial Lane, Test City, CA 94000',
            'modern',
            'trial',
            'completed',
            NOW() - (i + 10 || ' hours')::INTERVAL,
            NOW() - (i + 10 || ' hours')::INTERVAL + INTERVAL '5 minutes'
        );
    END LOOP;

    -- Create 3 token generations (completed)
    FOR i IN 1..3 LOOP
        v_gen_id := gen_random_uuid();
        INSERT INTO public.generations (
            id,
            user_id,
            address,
            style,
            credit_type,
            status,
            created_at,
            updated_at
        ) VALUES (
            v_gen_id,
            v_user_id,
            i || ' Token Boulevard, Test City, CA 94000',
            CASE WHEN i % 2 = 0 THEN 'contemporary' ELSE 'rustic' END,
            'token',
            'completed',
            NOW() - (i || ' hours')::INTERVAL,
            NOW() - (i || ' hours')::INTERVAL + INTERVAL '5 minutes'
        );
    END LOOP;

    RAISE NOTICE 'User 3 created: % (Trial: 0, Tokens: 7, Generations: 6)', v_email;
END $;

-- ============================================================================
-- USER 4: Power user with many generations in various states
-- ============================================================================

DO $
DECLARE
    v_user_id UUID := '00000000-0000-0000-0000-000000000004';
    v_email TEXT := 'seed-power-user@yarda.test';
    v_gen_id UUID;
BEGIN
    RAISE NOTICE 'Creating User 4: Power user with mixed generations...';

    INSERT INTO auth.users (
        id,
        instance_id,
        email,
        encrypted_password,
        email_confirmed_at,
        created_at,
        updated_at,
        aud,
        role
    ) VALUES (
        v_user_id,
        '00000000-0000-0000-0000-000000000000',
        v_email,
        crypt('TestPassword123!', gen_salt('bf')),
        NOW(),
        NOW(),
        NOW(),
        'authenticated',
        'authenticated'
    );

    INSERT INTO public.users (id, email, email_verified, trial_credits)
    VALUES (v_user_id, v_email, TRUE, 0);

    INSERT INTO public.token_accounts (user_id, balance, total_purchased, total_consumed)
    VALUES (v_user_id, 15, 50, 35)  -- Heavy user
    ON CONFLICT (user_id) DO NOTHING;

    -- Create 1 pending generation
    v_gen_id := gen_random_uuid();
    INSERT INTO public.generations (
        id, user_id, address, style, credit_type, status, created_at, updated_at
    ) VALUES (
        v_gen_id, v_user_id, '1 Pending Place, Test City, CA 94000',
        'modern', 'token', 'pending', NOW() - INTERVAL '30 seconds', NOW()
    );

    -- Create 1 processing generation
    v_gen_id := gen_random_uuid();
    INSERT INTO public.generations (
        id, user_id, address, style, credit_type, status, created_at, updated_at
    ) VALUES (
        v_gen_id, v_user_id, '2 Processing Plaza, Test City, CA 94000',
        'contemporary', 'token', 'processing', NOW() - INTERVAL '2 minutes', NOW()
    );

    -- Create 10 completed generations
    FOR i IN 1..10 LOOP
        v_gen_id := gen_random_uuid();
        INSERT INTO public.generations (
            id, user_id, address, style, credit_type, status, created_at, updated_at
        ) VALUES (
            v_gen_id, v_user_id,
            i || ' Completed Court, Test City, CA 94000',
            CASE
                WHEN i % 3 = 0 THEN 'modern'
                WHEN i % 3 = 1 THEN 'traditional'
                ELSE 'rustic'
            END,
            'token',
            'completed',
            NOW() - (i || ' days')::INTERVAL,
            NOW() - (i || ' days')::INTERVAL + INTERVAL '5 minutes'
        );
    END LOOP;

    -- Create 2 failed generations (with refunds)
    FOR i IN 1..2 LOOP
        v_gen_id := gen_random_uuid();
        INSERT INTO public.generations (
            id, user_id, address, style, credit_type, status,
            credit_refunded, error_message, created_at, updated_at
        ) VALUES (
            v_gen_id, v_user_id,
            i || ' Failed Street, Test City, CA 94000',
            'modern',
            'token',
            'failed',
            TRUE,
            'AI service temporarily unavailable',
            NOW() - (i + 5 || ' hours')::INTERVAL,
            NOW() - (i + 5 || ' hours')::INTERVAL + INTERVAL '1 minute'
        );
    END LOOP;

    RAISE NOTICE 'User 4 created: % (Trial: 0, Tokens: 15, Generations: 15)', v_email;
END $;

-- ============================================================================
-- USER 5: Rate limited user
-- ============================================================================

DO $
DECLARE
    v_user_id UUID := '00000000-0000-0000-0000-000000000005';
    v_email TEXT := 'seed-rate-limited@yarda.test';
BEGIN
    RAISE NOTICE 'Creating User 5: Rate limited user...';

    INSERT INTO auth.users (
        id,
        instance_id,
        email,
        encrypted_password,
        email_confirmed_at,
        created_at,
        updated_at,
        aud,
        role
    ) VALUES (
        v_user_id,
        '00000000-0000-0000-0000-000000000000',
        v_email,
        crypt('TestPassword123!', gen_salt('bf')),
        NOW(),
        NOW(),
        NOW(),
        'authenticated',
        'authenticated'
    );

    INSERT INTO public.users (id, email, email_verified, trial_credits)
    VALUES (v_user_id, v_email, TRUE, 2);

    INSERT INTO public.token_accounts (user_id, balance, total_purchased, total_consumed)
    VALUES (v_user_id, 0, 0, 0)
    ON CONFLICT (user_id) DO NOTHING;

    -- Create 3 rate limit records (within 60 second window)
    INSERT INTO public.rate_limits (user_id, attempted_at)
    VALUES
        (v_user_id, NOW() - INTERVAL '10 seconds'),
        (v_user_id, NOW() - INTERVAL '20 seconds'),
        (v_user_id, NOW() - INTERVAL '30 seconds');

    RAISE NOTICE 'User 5 created: % (Trial: 2, Rate limited: 3 attempts)', v_email;
END $;

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================

DO $
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '============================================================';
    RAISE NOTICE 'SEED DATA CREATION COMPLETE';
    RAISE NOTICE '============================================================';
    RAISE NOTICE '';
END $;

-- Show all seed users with their credit balances
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

-- ============================================================================
-- TEST CREDENTIALS
-- ============================================================================
-- All users have the same password: TestPassword123!
--
-- User 1: seed-fresh-user@yarda.test
--   - Trial: 3, Tokens: 0
--   - Use: Test fresh user experience
--
-- User 2: seed-partial-trial@yarda.test
--   - Trial: 1, Tokens: 0
--   - Use: Test user with some trial credits used
--
-- User 3: seed-token-user@yarda.test
--   - Trial: 0, Tokens: 7 (purchased 10, used 3)
--   - Use: Test token purchase and consumption
--
-- User 4: seed-power-user@yarda.test
--   - Trial: 0, Tokens: 15 (purchased 50, used 35)
--   - Generations: 15 (1 pending, 1 processing, 10 completed, 2 failed)
--   - Use: Test generation history, status polling, error handling
--
-- User 5: seed-rate-limited@yarda.test
--   - Trial: 2, Tokens: 0
--   - Rate limit: 3 attempts in last 60 seconds
--   - Use: Test rate limiting behavior
-- ============================================================================

-- ============================================================================
-- CLEANUP COMMAND (to remove all seed data)
-- ============================================================================
-- Run this to remove all seed data:
--
-- DELETE FROM rate_limits WHERE user_id IN (
--     SELECT id FROM auth.users WHERE email LIKE 'seed-%@yarda.test'
-- );
-- DELETE FROM generations WHERE user_id IN (
--     SELECT id FROM auth.users WHERE email LIKE 'seed-%@yarda.test'
-- );
-- DELETE FROM token_accounts WHERE user_id IN (
--     SELECT id FROM auth.users WHERE email LIKE 'seed-%@yarda.test'
-- );
-- DELETE FROM users WHERE email LIKE 'seed-%@yarda.test';
-- DELETE FROM auth.users WHERE email LIKE 'seed-%@yarda.test';
-- ============================================================================
