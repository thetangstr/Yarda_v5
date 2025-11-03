"""
Integration Tests for User Story 2: Webhook Idempotency

Test Scenarios:
- TC-WEBHOOK-1.1: Duplicate webhook prevented by UNIQUE constraint on payment_intent_id
- TC-WEBHOOK-1.2: Second webhook with same payment_intent_id is gracefully ignored
- TC-WEBHOOK-1.3: Different payment_intent_id creates new transaction
- TC-WEBHOOK-2.1: Webhook processing is atomic (all-or-nothing)
- TC-WEBHOOK-3.1: Concurrent webhooks with same payment_intent_id handled correctly

Requirements:
- FR-027: Idempotent webhook processing
- NFR-2.2: ACID transactions for financial operations
"""

import pytest
import pytest_asyncio
import asyncpg
import asyncio
from uuid import uuid4
from datetime import datetime


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
    email = f'webhook-test-{user_id}@test.com'

    # Create user
    await db_connection.execute("""
        INSERT INTO users (id, email, email_verified, password_hash)
        VALUES ($1, $2, true, 'hash')
    """, user_id, email)

    # Create token account with 0 tokens initially
    await db_connection.execute("""
        INSERT INTO users_token_accounts (user_id, balance, total_purchased, total_spent)
        VALUES ($1, 0, 0, 0)
    """, user_id)

    yield user_id, email

    # Cleanup
    await db_connection.execute("DELETE FROM users WHERE id = $1", user_id)


async def process_stripe_webhook(conn, user_id: uuid4, payment_intent_id: str, tokens: int, amount_cents: int):
    """
    Simulate webhook processing with idempotency.

    This mimics the actual webhook handler that:
    1. Checks if payment_intent_id already processed
    2. If not, creates transaction and credits tokens
    3. Uses UNIQUE constraint on stripe_payment_intent_id for idempotency
    """
    try:
        async with conn.transaction():
            # Try to insert transaction with payment_intent_id
            # If duplicate, this will raise UniqueViolationError
            await conn.execute("""
                INSERT INTO users_token_transactions (
                    user_id,
                    amount,
                    transaction_type,
                    description,
                    stripe_payment_intent_id,
                    price_paid_cents
                ) VALUES ($1, $2, 'purchase', $3, $4, $5)
            """, user_id, tokens, f'Purchased {tokens} tokens', payment_intent_id, amount_cents)

            # Credit tokens to account
            await conn.execute("""
                UPDATE users_token_accounts u
                SET balance = u.balance + $2,
                    total_purchased = u.total_purchased + $2
                WHERE u.user_id = $1
            """, user_id, tokens)

            return {"success": True, "message": "Tokens credited"}
    except asyncpg.UniqueViolationError:
        # Duplicate payment_intent_id - webhook already processed
        return {"success": False, "message": "Webhook already processed"}


@pytest.mark.asyncio
async def test_duplicate_webhook_prevented_by_unique_constraint(db_connection, test_user):
    """
    TC-WEBHOOK-1.1: Test that duplicate webhook is prevented by UNIQUE constraint.

    Setup:
    - User has 0 tokens
    - Process webhook for 50 tokens with payment_intent_id "pi_123"
    - Try to process same webhook again

    Expected Result:
    - First webhook succeeds, credits 50 tokens
    - Second webhook fails gracefully (idempotency)
    - Final balance is 50 (not 100)
    - Only 1 transaction in history
    """
    user_id, email = test_user
    payment_intent_id = f"pi_test_{uuid4()}"

    # Verify initial balance is 0
    balance = await db_connection.fetchval("""
        SELECT balance FROM users_token_accounts WHERE user_id = $1
    """, user_id)
    assert balance == 0

    # Process webhook first time
    result1 = await process_stripe_webhook(db_connection, user_id, payment_intent_id, 50, 4500)
    assert result1["success"] is True

    # Verify balance updated to 50
    balance = await db_connection.fetchval("""
        SELECT balance FROM users_token_accounts WHERE user_id = $1
    """, user_id)
    assert balance == 50

    # Process same webhook again (duplicate)
    result2 = await process_stripe_webhook(db_connection, user_id, payment_intent_id, 50, 4500)
    assert result2["success"] is False
    assert "already processed" in result2["message"]

    # Verify balance is STILL 50 (not 100)
    balance = await db_connection.fetchval("""
        SELECT balance FROM users_token_accounts WHERE user_id = $1
    """, user_id)
    assert balance == 50

    # Verify only 1 transaction exists
    transaction_count = await db_connection.fetchval("""
        SELECT COUNT(*) FROM users_token_transactions
        WHERE user_id = $1 AND stripe_payment_intent_id = $2
    """, user_id, payment_intent_id)
    assert transaction_count == 1


@pytest.mark.asyncio
async def test_different_payment_intent_creates_new_transaction(db_connection, test_user):
    """
    TC-WEBHOOK-1.3: Test that different payment_intent_id creates new transaction.

    Setup:
    - Process webhook with payment_intent_id "pi_123" for 50 tokens
    - Process webhook with payment_intent_id "pi_456" for 50 tokens

    Expected Result:
    - Both webhooks succeed
    - Final balance is 100
    - 2 transactions in history
    """
    user_id, email = test_user
    payment_intent_id_1 = f"pi_test_{uuid4()}_1"
    payment_intent_id_2 = f"pi_test_{uuid4()}_2"

    # Process first webhook
    result1 = await process_stripe_webhook(db_connection, user_id, payment_intent_id_1, 50, 4500)
    assert result1["success"] is True

    # Verify balance is 50
    balance = await db_connection.fetchval("""
        SELECT balance FROM users_token_accounts WHERE user_id = $1
    """, user_id)
    assert balance == 50

    # Process second webhook with different payment_intent_id
    result2 = await process_stripe_webhook(db_connection, user_id, payment_intent_id_2, 50, 4500)
    assert result2["success"] is True

    # Verify balance is 100
    balance = await db_connection.fetchval("""
        SELECT balance FROM users_token_accounts WHERE user_id = $1
    """, user_id)
    assert balance == 100

    # Verify 2 transactions exist
    transaction_count = await db_connection.fetchval("""
        SELECT COUNT(*) FROM users_token_transactions WHERE user_id = $1
    """, user_id)
    assert transaction_count == 2


@pytest.mark.asyncio
async def test_webhook_processing_is_atomic(db_connection, test_user):
    """
    TC-WEBHOOK-2.1: Test that webhook processing is atomic (all-or-nothing).

    Setup:
    - Process webhook with invalid data that causes partial failure
    - Verify no partial updates occurred

    Expected Result:
    - If any part of webhook processing fails, entire transaction rolls back
    - Balance remains unchanged
    - No transaction recorded
    """
    user_id, email = test_user
    payment_intent_id = f"pi_test_{uuid4()}"

    # Verify initial balance
    initial_balance = await db_connection.fetchval("""
        SELECT balance FROM users_token_accounts WHERE user_id = $1
    """, user_id)
    assert initial_balance == 0

    # Try to process webhook that will fail (e.g., negative tokens)
    try:
        async with db_connection.transaction():
            # Insert transaction
            await db_connection.execute("""
                INSERT INTO users_token_transactions (
                    user_id,
                    amount,
                    transaction_type,
                    description,
                    stripe_payment_intent_id,
                    price_paid_cents
                ) VALUES ($1, $2, 'purchase', $3, $4, $5)
            """, user_id, -50, 'Invalid purchase', payment_intent_id, 4500)

            # This should fail due to CHECK constraint on amount
            await db_connection.execute("""
                UPDATE users_token_accounts u
                SET balance = u.balance + $2
                WHERE u.user_id = $1
            """, user_id, -50)
    except Exception:
        pass  # Expected to fail

    # Verify balance unchanged (transaction rolled back)
    balance = await db_connection.fetchval("""
        SELECT balance FROM users_token_accounts WHERE user_id = $1
    """, user_id)
    assert balance == 0

    # Verify no transaction recorded
    transaction_count = await db_connection.fetchval("""
        SELECT COUNT(*) FROM users_token_transactions
        WHERE user_id = $1 AND stripe_payment_intent_id = $2
    """, user_id, payment_intent_id)
    assert transaction_count == 0


@pytest.mark.asyncio
async def test_concurrent_webhooks_with_same_payment_intent(db_connection, test_user):
    """
    TC-WEBHOOK-3.1: Test concurrent webhooks with same payment_intent_id.

    Setup:
    - 10 concurrent webhook requests with same payment_intent_id
    - Each tries to credit 50 tokens

    Expected Result:
    - Only 1 webhook succeeds
    - 9 webhooks fail gracefully with "already processed"
    - Final balance is 50 (not 500)
    - Only 1 transaction in history
    """
    user_id, email = test_user
    payment_intent_id = f"pi_test_{uuid4()}"

    # Create 10 concurrent webhook processing tasks
    tasks = []
    for _ in range(10):
        conn = await asyncpg.connect(
            host='localhost',
            port=5432,
            user='postgres',
            password='postgres',
            database='yarda_test'
        )
        tasks.append(process_stripe_webhook(conn, user_id, payment_intent_id, 50, 4500))

    # Execute all concurrently
    results = await asyncio.gather(*tasks, return_exceptions=False)

    # Count successes and failures
    successes = sum(1 for r in results if r["success"] is True)
    failures = sum(1 for r in results if r["success"] is False)

    # Verify exactly 1 succeeded
    assert successes == 1, f"Expected 1 success, got {successes}"
    assert failures == 9, f"Expected 9 failures, got {failures}"

    # Verify final balance is 50 (not 500)
    balance = await db_connection.fetchval("""
        SELECT balance FROM users_token_accounts WHERE user_id = $1
    """, user_id)
    assert balance == 50

    # Verify only 1 transaction exists
    transaction_count = await db_connection.fetchval("""
        SELECT COUNT(*) FROM users_token_transactions
        WHERE user_id = $1 AND stripe_payment_intent_id = $2
    """, user_id, payment_intent_id)
    assert transaction_count == 1


@pytest.mark.asyncio
async def test_webhook_with_multiple_users_same_payment_intent(db_connection):
    """
    Test that same payment_intent_id can be used by different users (edge case).

    Note: In reality, each payment_intent is unique per transaction,
    but this tests that the UNIQUE constraint is properly scoped.

    Expected Result:
    - Same payment_intent_id should NOT work for different users
    - This tests that payment_intent_id is globally unique, not per-user
    """
    # Create two users
    user_id_1 = uuid4()
    email_1 = f'webhook-user1-{user_id_1}@test.com'
    await db_connection.execute("""
        INSERT INTO users (id, email, email_verified, password_hash)
        VALUES ($1, $2, true, 'hash')
    """, user_id_1, email_1)
    await db_connection.execute("""
        INSERT INTO users_token_accounts (user_id, balance, total_purchased, total_spent)
        VALUES ($1, 0, 0, 0)
    """, user_id_1)

    user_id_2 = uuid4()
    email_2 = f'webhook-user2-{user_id_2}@test.com'
    await db_connection.execute("""
        INSERT INTO users (id, email, email_verified, password_hash)
        VALUES ($1, $2, true, 'hash')
    """, user_id_2, email_2)
    await db_connection.execute("""
        INSERT INTO users_token_accounts (user_id, balance, total_purchased, total_spent)
        VALUES ($1, 0, 0, 0)
    """, user_id_2)

    payment_intent_id = f"pi_test_{uuid4()}"

    # Process webhook for user 1
    result1 = await process_stripe_webhook(db_connection, user_id_1, payment_intent_id, 50, 4500)
    assert result1["success"] is True

    # Try to process same payment_intent_id for user 2 (should fail)
    result2 = await process_stripe_webhook(db_connection, user_id_2, payment_intent_id, 50, 4500)
    assert result2["success"] is False

    # Cleanup
    await db_connection.execute("DELETE FROM users WHERE id IN ($1, $2)", user_id_1, user_id_2)
