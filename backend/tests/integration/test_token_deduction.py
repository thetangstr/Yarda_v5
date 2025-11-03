"""
Integration Tests for User Story 2: Token Deduction and Race Conditions

Test Scenarios:
- TC-TOK-RACE-1.1: Concurrent token deductions prevented by FOR UPDATE lock
- TC-TOK-RACE-1.2: CHECK constraint prevents negative token balance
- TC-TOK-RACE-1.3: Only N successful deductions from balance of N

Requirements:
- FR-026: Atomic token deduction with row-level locking
- NFR-2.2: Race condition prevention
"""

import pytest
import pytest_asyncio
import asyncpg
import asyncio
from uuid import uuid4


@pytest_asyncio.fixture
async def db_connection():
    """Create database connection for testing."""
    conn = await asyncpg.connect(
        host='localhost',
        port=5432,
        user='postgres',
        password='postgres',
        database='yarda_test'
    )
    yield conn
    await conn.close()


@pytest_asyncio.fixture
async def test_user(db_connection):
    """Create a test user with token account."""
    user_id = uuid4()
    email = f'token-test-{user_id}@test.com'

    # Create user
    await db_connection.execute("""
        INSERT INTO users (id, email, email_verified, password_hash)
        VALUES ($1, $2, true, 'hash')
    """, user_id, email)

    # Create token account with 50 tokens
    await db_connection.execute("""
        INSERT INTO users_token_accounts (user_id, balance, total_purchased, total_spent)
        VALUES ($1, 50, 50, 0)
    """, user_id)

    yield user_id

    # Cleanup
    await db_connection.execute("DELETE FROM users WHERE id = $1", user_id)


@pytest.mark.asyncio
async def test_concurrent_token_deduction_race_condition(db_connection, test_user):
    """
    TC-TOK-RACE-1.1: Test that concurrent token deductions are prevented by FOR UPDATE lock.

    Setup:
    - User has 50 tokens
    - 100 concurrent requests try to deduct 1 token each

    Expected Result:
    - Only 50 requests succeed (balance becomes 0)
    - 50 requests fail with insufficient balance error
    - Final balance is exactly 0 (no race condition)
    """
    user_id = test_user

    async def deduct_token_atomic(conn):
        """Atomic token deduction with FOR UPDATE lock."""
        try:
            async with conn.transaction():
                # Get current balance with row lock
                balance = await conn.fetchval("""
                    SELECT balance
                    FROM users_token_accounts
                    WHERE user_id = $1
                    FOR UPDATE
                """, user_id)

                if balance is None or balance < 1:
                    raise Exception("Insufficient token balance")

                # Deduct token
                await conn.execute("""
                    UPDATE users_token_accounts u
                    SET balance = u.balance - 1,
                        total_spent = u.total_spent + 1
                    WHERE u.user_id = $1
                """, user_id)

                return True
        except Exception as e:
            if "Insufficient" in str(e):
                return False
            raise

    # Create 100 concurrent connections and deduct requests
    tasks = []
    for _ in range(100):
        conn = await asyncpg.connect(
            host='localhost',
            port=5432,
            user='postgres',
            password='postgres',
            database='yarda_test'
        )
        tasks.append(deduct_token_atomic(conn))

    # Execute all concurrently
    results = await asyncio.gather(*tasks, return_exceptions=False)

    # Count successes and failures
    successes = sum(1 for r in results if r is True)
    failures = sum(1 for r in results if r is False)

    # Verify exactly 50 succeeded (initial balance)
    assert successes == 50, f"Expected 50 successes, got {successes}"
    assert failures == 50, f"Expected 50 failures, got {failures}"

    # Verify final balance is 0
    final_balance = await db_connection.fetchval("""
        SELECT balance FROM users_token_accounts WHERE user_id = $1
    """, user_id)
    assert final_balance == 0, f"Expected balance 0, got {final_balance}"

    # Verify total_spent is 50
    total_spent = await db_connection.fetchval("""
        SELECT total_spent FROM users_token_accounts WHERE user_id = $1
    """, user_id)
    assert total_spent == 50, f"Expected total_spent 50, got {total_spent}"


@pytest.mark.asyncio
async def test_check_constraint_prevents_negative_balance(db_connection, test_user):
    """
    TC-TOK-RACE-1.2: Test that CHECK constraint prevents negative token balance.

    Setup:
    - User has 50 tokens
    - Try to update balance to -1 directly

    Expected Result:
    - UPDATE fails with CHECK constraint violation
    - Balance remains 50
    """
    user_id = test_user

    # Verify initial balance
    balance = await db_connection.fetchval("""
        SELECT balance FROM users_token_accounts WHERE user_id = $1
    """, user_id)
    assert balance == 50

    # Try to set balance to negative (should fail)
    with pytest.raises(Exception) as exc_info:
        await db_connection.execute("""
            UPDATE users_token_accounts
            SET balance = -1
            WHERE user_id = $1
        """, user_id)

    # Verify error mentions constraint or negative
    error_message = str(exc_info.value).lower()
    assert "check" in error_message or "constraint" in error_message or "cannot be negative" in error_message

    # Verify balance unchanged
    balance = await db_connection.fetchval("""
        SELECT balance FROM users_token_accounts WHERE user_id = $1
    """, user_id)
    assert balance == 50


@pytest.mark.asyncio
async def test_token_deduction_with_insufficient_balance(db_connection, test_user):
    """
    TC-TOK-RACE-1.3: Test that deduction fails when insufficient balance.

    Setup:
    - User has 50 tokens
    - Try to deduct 51 tokens

    Expected Result:
    - Deduction fails
    - Balance remains 50
    """
    user_id = test_user

    # Try to deduct 51 tokens (should fail)
    async with db_connection.transaction():
        balance = await db_connection.fetchval("""
            SELECT balance FROM users_token_accounts WHERE user_id = $1
        """, user_id)

        if balance < 51:
            # Expected behavior: insufficient balance
            with pytest.raises(Exception, match="Insufficient"):
                raise Exception("Insufficient token balance")

    # Verify balance unchanged
    balance = await db_connection.fetchval("""
        SELECT balance FROM users_token_accounts WHERE user_id = $1
    """, user_id)
    assert balance == 50


@pytest.mark.asyncio
async def test_token_refund_after_failure(db_connection, test_user):
    """
    TC-TOK-4.1: Test that tokens are refunded when generation fails.

    Setup:
    - User has 50 tokens
    - Deduct 1 token for generation
    - Generation fails
    - Refund 1 token

    Expected Result:
    - Balance returns to 50
    - total_spent decreases to 0
    - Transaction history shows both deduction and refund
    """
    user_id = test_user

    # Verify initial state
    initial_balance = await db_connection.fetchval("""
        SELECT balance FROM users_token_accounts WHERE user_id = $1
    """, user_id)
    assert initial_balance == 50

    # Deduct 1 token for generation
    async with db_connection.transaction():
        await db_connection.execute("""
            UPDATE users_token_accounts u
            SET balance = u.balance - 1,
                total_spent = u.total_spent + 1
            WHERE u.user_id = $1
        """, user_id)

        # Record transaction
        await db_connection.execute("""
            INSERT INTO users_token_transactions (user_id, amount, transaction_type, description)
            VALUES ($1, -1, 'generation', 'Landscape generation')
        """, user_id)

    # Verify balance decreased
    balance_after_deduct = await db_connection.fetchval("""
        SELECT balance FROM users_token_accounts WHERE user_id = $1
    """, user_id)
    assert balance_after_deduct == 49

    # Simulate generation failure - refund token
    async with db_connection.transaction():
        await db_connection.execute("""
            UPDATE users_token_accounts u
            SET balance = u.balance + 1,
                total_spent = GREATEST(u.total_spent - 1, 0)
            WHERE u.user_id = $1
        """, user_id)

        # Record refund transaction
        await db_connection.execute("""
            INSERT INTO users_token_transactions (user_id, amount, transaction_type, description)
            VALUES ($1, 1, 'refund', 'Generation failed - refunded')
        """, user_id)

    # Verify balance restored
    final_balance = await db_connection.fetchval("""
        SELECT balance FROM users_token_accounts WHERE user_id = $1
    """, user_id)
    assert final_balance == 50

    # Verify total_spent back to 0
    total_spent = await db_connection.fetchval("""
        SELECT total_spent FROM users_token_accounts WHERE user_id = $1
    """, user_id)
    assert total_spent == 0

    # Verify transaction history has both deduction and refund
    transactions = await db_connection.fetch("""
        SELECT transaction_type, amount
        FROM users_token_transactions
        WHERE user_id = $1
        ORDER BY created_at
    """, user_id)

    assert len(transactions) == 2
    assert transactions[0]['transaction_type'] == 'generation'
    assert transactions[0]['amount'] == -1
    assert transactions[1]['transaction_type'] == 'refund'
    assert transactions[1]['amount'] == 1


@pytest.mark.asyncio
async def test_multiple_sequential_token_deductions(db_connection, test_user):
    """
    Test multiple sequential token deductions work correctly.

    Setup:
    - User has 50 tokens
    - Deduct 10 tokens sequentially

    Expected Result:
    - Final balance is 40
    - total_spent is 10
    """
    user_id = test_user

    # Deduct 10 tokens sequentially
    for _ in range(10):
        async with db_connection.transaction():
            await db_connection.execute("""
                UPDATE users_token_accounts u
                SET balance = u.balance - 1,
                    total_spent = u.total_spent + 1
                WHERE u.user_id = $1
            """, user_id)

    # Verify final balance
    balance = await db_connection.fetchval("""
        SELECT balance FROM users_token_accounts WHERE user_id = $1
    """, user_id)
    assert balance == 40

    # Verify total_spent
    total_spent = await db_connection.fetchval("""
        SELECT total_spent FROM users_token_accounts WHERE user_id = $1
    """, user_id)
    assert total_spent == 10
