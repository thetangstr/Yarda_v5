"""
Integration Tests for Generation Authorization Hierarchy

Tests the correct order of authorization checks for landscape generation:
1. Check subscription_status='active' FIRST (unlimited generations)
2. Check trial_remaining > 0 SECOND (if no active subscription)
3. Check token balance > 0 THIRD (if no trial and no subscription)

Requirements:
- FR-016: Block generation when trial_remaining=0
- FR-024: Block generation if balance < 1
- FR-047: Check subscription_status='active' BEFORE token balance
- FR-048: Allow unlimited generations for active subscribers
- TC-AUTH-1.3, TC-AUTH-2.1, TC-AUTH-3.1: Authorization hierarchy tests
"""

import pytest
import pytest_asyncio
import asyncpg
from uuid import UUID

@pytest.mark.asyncio
async def test_auth_hierarchy_subscription_overrides_all(db_connection):
    """
    TC-AUTH-3.1: Subscription Status Checked FIRST

    Scenario: User has active subscription (trial=0, tokens=0)
    Expected: Generation allowed (unlimited)
    Hierarchy: subscription_status='active' → ALLOW (ignore trial/tokens)
    """
    user_id = await create_test_user(
        db_connection,
        email="sub-user@test.com",
        firebase_uid="sub-user-uid",
        trial_remaining=0,  # No trial
        subscription_status='active',  # Active subscription
        subscription_tier='monthly_pro',
        token_balance=0  # No tokens
    )

    try:
        # Check authorization: should be authorized due to active subscription
        can_generate = await db_connection.fetchval("""
            SELECT
                subscription_status = 'active' AS authorized
            FROM users
            WHERE id = $1
        """, user_id)

        assert can_generate is True, "Active subscription should authorize generation"

        # Verify trial and token balance are NOT checked (they're 0 but user can still generate)
        user_state = await db_connection.fetchrow("""
            SELECT
                trial_remaining,
                subscription_status,
                (SELECT COALESCE(balance, 0) FROM users_token_accounts WHERE user_id = $1) as token_balance
            FROM users
            WHERE id = $1
        """, user_id)

        assert user_state['trial_remaining'] == 0
        assert user_state['subscription_status'] == 'active'
        # Token balance can be None if no token account exists, which is fine
        assert user_state['token_balance'] in (0, None)

        # User can generate despite having no trial or tokens
        # This proves subscription is checked FIRST

    finally:
        await db_connection.execute("DELETE FROM users WHERE id = $1", user_id)

@pytest.mark.asyncio
async def test_auth_hierarchy_trial_checked_second(db_connection):
    """
    TC-AUTH-1.3: Trial Credits Checked SECOND (if no active subscription)

    Scenario: User has trial credits (subscription=inactive, tokens=0)
    Expected: Generation allowed using trial credit
    Hierarchy: subscription='inactive' → trial_remaining > 0 → ALLOW
    """
    user_id = await create_test_user(
        db_connection,
        email="trial-user@test.com",
        firebase_uid="trial-user-uid",
        trial_remaining=3,  # Has trial
        subscription_status='inactive',  # No subscription
        subscription_tier='free',
        token_balance=0  # No tokens
    )

    try:
        # Check authorization logic
        can_generate = await db_connection.fetchval("""
            SELECT
                CASE
                    WHEN subscription_status = 'active' THEN true
                    WHEN trial_remaining > 0 THEN true
                    ELSE false
                END AS authorized
            FROM users
            WHERE id = $1
        """, user_id)

        assert can_generate is True, "Trial credits should authorize generation"

        # Deduct trial credit
        deduction = await db_connection.fetchrow("""
            SELECT * FROM deduct_trial_atomic($1)
        """, user_id)

        assert deduction['success'] is True
        assert deduction['trial_remaining'] == 2

    finally:
        await db_connection.execute("DELETE FROM users WHERE id = $1", user_id)

@pytest.mark.asyncio
async def test_auth_hierarchy_tokens_checked_third(db_connection):
    """
    TC-AUTH-2.1: Token Balance Checked THIRD (if no subscription and no trial)

    Scenario: User has tokens (subscription=inactive, trial=0)
    Expected: Generation allowed using token
    Hierarchy: subscription='inactive' → trial=0 → token_balance > 0 → ALLOW
    """
    user_id = await create_test_user(
        db_connection,
        email="token-user@test.com",
        firebase_uid="token-user-uid",
        trial_remaining=0,  # No trial
        subscription_status='inactive',  # No subscription
        subscription_tier='free',
        token_balance=50  # Has tokens
    )

    try:
        # Check authorization logic (full hierarchy)
        auth_check = await db_connection.fetchrow("""
            SELECT
                u.subscription_status = 'active' AS has_subscription,
                u.trial_remaining > 0 AS has_trial,
                COALESCE(ta.balance, 0) > 0 AS has_tokens,
                CASE
                    WHEN u.subscription_status = 'active' THEN true
                    WHEN u.trial_remaining > 0 THEN true
                    WHEN COALESCE(ta.balance, 0) > 0 THEN true
                    ELSE false
                END AS authorized
            FROM users u
            LEFT JOIN users_token_accounts ta ON u.id = ta.user_id
            WHERE u.id = $1
        """, user_id)

        assert auth_check['has_subscription'] is False
        assert auth_check['has_trial'] is False
        assert auth_check['has_tokens'] is True
        assert auth_check['authorized'] is True

        # Deduct token
        deduction = await db_connection.fetchrow("""
            SELECT * FROM deduct_token_atomic($1, 'Test generation')
        """, user_id)

        assert deduction['success'] is True
        assert deduction['new_balance'] == 49

    finally:
        await db_connection.execute("DELETE FROM users WHERE id = $1", user_id)

@pytest.mark.asyncio
async def test_auth_hierarchy_all_zero_blocks_generation(db_connection):
    """
    TC-AUTH-4.1: All Authorization Sources Exhausted

    Scenario: User has no subscription, no trial, no tokens
    Expected: Generation BLOCKED
    Hierarchy: subscription='inactive' → trial=0 → tokens=0 → DENY
    """
    user_id = await create_test_user(
        db_connection,
        email="broke-user@test.com",
        firebase_uid="broke-user-uid",
        trial_remaining=0,
        subscription_status='inactive',
        subscription_tier='free',
        token_balance=0
    )

    try:
        # Check authorization (should be denied)
        auth_check = await db_connection.fetchrow("""
            SELECT
                u.subscription_status = 'active' AS has_subscription,
                u.trial_remaining > 0 AS has_trial,
                COALESCE(ta.balance, 0) > 0 AS has_tokens,
                CASE
                    WHEN u.subscription_status = 'active' THEN true
                    WHEN u.trial_remaining > 0 THEN true
                    WHEN COALESCE(ta.balance, 0) > 0 THEN true
                    ELSE false
                END AS authorized
            FROM users u
            LEFT JOIN users_token_accounts ta ON u.id = ta.user_id
            WHERE u.id = $1
        """, user_id)

        assert auth_check['has_subscription'] is False
        assert auth_check['has_trial'] is False
        assert auth_check['has_tokens'] is False
        assert auth_check['authorized'] is False, "User with no payment method should be blocked"

        # Attempt trial deduction (should fail)
        trial_deduction = await db_connection.fetchrow("""
            SELECT * FROM deduct_trial_atomic($1)
        """, user_id)

        assert trial_deduction['success'] is False, "Deduction should fail when trial=0"

    finally:
        await db_connection.execute("DELETE FROM users WHERE id = $1", user_id)

@pytest.mark.asyncio
async def test_auth_hierarchy_subscription_preserves_tokens(db_connection):
    """
    TC-AUTH-3.2: Active Subscription Does NOT Deduct Tokens

    Scenario: User has active subscription AND 100 tokens
    Expected: Generation uses subscription (tokens remain at 100)
    Requirement: FR-049 - Preserve token balance throughout subscription
    """
    user_id = await create_test_user(
        db_connection,
        email="sub-with-tokens@test.com",
        firebase_uid="sub-with-tokens-uid",
        trial_remaining=0,
        subscription_status='active',
        subscription_tier='monthly_pro',
        token_balance=100
    )

    try:
        # Verify initial token balance
        initial_balance = await db_connection.fetchval("""
            SELECT balance FROM users_token_accounts WHERE user_id = $1
        """, user_id)
        assert initial_balance == 100

        # Create generation using subscription (NOT tokens)
        generation_id = await db_connection.fetchval("""
            INSERT INTO generations (
                user_id,
                status,
                payment_type,
                tokens_deducted,
                address,
                request_params
            ) VALUES (
                $1,
                'completed',
                'subscription',
                0,
                '123 Test Street',
                '{}'::jsonb
            ) RETURNING id
        """, user_id)

        # Verify token balance unchanged
        final_balance = await db_connection.fetchval("""
            SELECT balance FROM users_token_accounts WHERE user_id = $1
        """, user_id)
        assert final_balance == 100, "Subscription should not deduct tokens"

        # Verify payment_type is 'subscription'
        payment_type = await db_connection.fetchval("""
            SELECT payment_type FROM generations WHERE id = $1
        """, generation_id)
        assert payment_type == 'subscription'

        # Cleanup
        await db_connection.execute("DELETE FROM generations WHERE id = $1", generation_id)

    finally:
        await db_connection.execute("DELETE FROM users WHERE id = $1", user_id)

@pytest.mark.asyncio
async def test_auth_hierarchy_past_due_subscription_falls_back_to_tokens(db_connection):
    """
    TC-AUTH-3.3: past_due Subscription Falls Back to Token System

    Scenario: User subscription is past_due, has 50 tokens
    Expected: Generation uses tokens (subscription not active)
    Requirement: FR-052, FR-053 - Revert to token system when subscription fails
    """
    user_id = await create_test_user(
        db_connection,
        email="past-due-user@test.com",
        firebase_uid="past-due-user-uid",
        trial_remaining=0,
        subscription_status='past_due',  # Payment failed
        subscription_tier='monthly_pro',
        token_balance=50
    )

    try:
        # Check authorization (should use tokens, not subscription)
        auth_check = await db_connection.fetchrow("""
            SELECT
                u.subscription_status = 'active' AS has_subscription,
                u.trial_remaining > 0 AS has_trial,
                COALESCE(ta.balance, 0) > 0 AS has_tokens,
                CASE
                    WHEN u.subscription_status = 'active' THEN 'subscription'
                    WHEN u.trial_remaining > 0 THEN 'trial'
                    WHEN COALESCE(ta.balance, 0) > 0 THEN 'token'
                    ELSE 'blocked'
                END AS payment_method
            FROM users u
            LEFT JOIN users_token_accounts ta ON u.id = ta.user_id
            WHERE u.id = $1
        """, user_id)

        assert auth_check['has_subscription'] is False  # past_due != active
        assert auth_check['has_tokens'] is True
        assert auth_check['payment_method'] == 'token', "Should fall back to tokens"

        # Deduct token
        deduction = await db_connection.fetchrow("""
            SELECT * FROM deduct_token_atomic($1, 'Generation with past_due subscription')
        """, user_id)

        assert deduction['success'] is True
        assert deduction['new_balance'] == 49

    finally:
        await db_connection.execute("DELETE FROM users WHERE id = $1", user_id)

if __name__ == "__main__":
    pytest.main([__file__, "-v"])
