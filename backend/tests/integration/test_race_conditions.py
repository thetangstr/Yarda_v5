"""
Integration Tests for Race Condition Prevention

Tests concurrent operations on trial credits and token balances to verify
FOR UPDATE locking prevents negative balances and race conditions.

Requirements:
- FR-011: Atomic trial deduction with row-level locking
- FR-012: Prevent trial_remaining from going negative
- FR-022: Prevent token balance from going negative
- NFR-2.2: Data Integrity (ACID transactions, row-level locking)
"""

import pytest
import pytest_asyncio
import asyncio
import asyncpg
from typing import List
from uuid import UUID

@pytest.mark.asyncio
async def test_concurrent_trial_deduction_prevents_negative_balance(test_user):
    """
    TC-RACE-1.1: Concurrent Trial Deduction Prevention

    Scenario: 10 concurrent requests try to deduct trial credits when user has only 3
    Expected: Exactly 3 succeed, 7 fail with insufficient credits
    Assertion: trial_remaining never goes negative
    """
    user_id = test_user

    # Function to attempt trial deduction
    async def attempt_deduction(conn_string: str, user_id: UUID) -> bool:
        """Attempt to deduct one trial credit."""
        conn = await asyncpg.connect(conn_string)
        try:
            result = await conn.fetchrow("""
                SELECT * FROM deduct_trial_atomic($1)
            """, user_id)

            return result['success']
        finally:
            await conn.close()

    # Connection string (would come from environment in real test)
    conn_string = "postgresql://postgres:test_password@localhost/yarda_test"

    # Launch 10 concurrent deduction attempts
    tasks = [
        attempt_deduction(conn_string, user_id)
        for _ in range(10)
    ]

    results = await asyncio.gather(*tasks, return_exceptions=True)

    # Count successful deductions
    successful = sum(1 for r in results if r is True)
    failed = sum(1 for r in results if r is False)

    # Verify exactly 3 succeeded (initial trial_remaining)
    assert successful == 3, f"Expected 3 successful deductions, got {successful}"
    assert failed == 7, f"Expected 7 failed deductions, got {failed}"

    # Verify final trial_remaining is 0 (not negative)
    conn = await asyncpg.connect(conn_string)
    try:
        final_remaining = await conn.fetchval("""
            SELECT trial_remaining FROM users WHERE id = $1
        """, user_id)

        assert final_remaining == 0, f"Expected trial_remaining=0, got {final_remaining}"
        assert final_remaining >= 0, "trial_remaining went negative!"

        # Verify trial_used increased to 3
        trial_used = await conn.fetchval("""
            SELECT trial_used FROM users WHERE id = $1
        """, user_id)
        assert trial_used == 3, f"Expected trial_used=3, got {trial_used}"
    finally:
        await conn.close()

@pytest.mark.asyncio
async def test_concurrent_token_deduction_prevents_negative_balance(db_connection):
    """
    TC-RACE-2.1: Concurrent Token Deduction Prevention

    Scenario: 100 concurrent requests try to deduct tokens when user has only 50
    Expected: Exactly 50 succeed, 50 fail with insufficient balance
    Assertion: balance never goes negative
    """
    # Create test user
    user_id = await db_connection.fetchval("""
        INSERT INTO users (
            email,
            firebase_uid
        ) VALUES (
            'token-race-test@example.com',
            'test-firebase-uid-token'
        ) RETURNING id
    """)

    # Create token account with 50 tokens
    account_id = await db_connection.fetchval("""
        INSERT INTO users_token_accounts (
            user_id,
            balance
        ) VALUES (
            $1,
            50
        ) RETURNING id
    """, user_id)

    # Function to attempt token deduction
    async def attempt_token_deduction(conn_string: str, user_id: UUID) -> bool:
        """Attempt to deduct one token."""
        conn = await asyncpg.connect(conn_string)
        try:
            result = await conn.fetchrow("""
                SELECT * FROM deduct_token_atomic($1, 'Concurrent test generation')
            """, user_id)

            return result['success']
        finally:
            await conn.close()

    conn_string = "postgresql://postgres:test_password@localhost/yarda_test"

    # Launch 100 concurrent deduction attempts
    tasks = [
        attempt_token_deduction(conn_string, user_id)
        for _ in range(100)
    ]

    results = await asyncio.gather(*tasks, return_exceptions=True)

    # Count successful deductions
    successful = sum(1 for r in results if r is True)
    failed = sum(1 for r in results if r is False)

    # Verify exactly 50 succeeded (initial balance)
    assert successful == 50, f"Expected 50 successful deductions, got {successful}"
    assert failed == 50, f"Expected 50 failed deductions, got {failed}"

    # Verify final balance is 0 (not negative)
    final_balance = await db_connection.fetchval("""
        SELECT balance FROM users_token_accounts WHERE user_id = $1
    """, user_id)

    assert final_balance == 0, f"Expected balance=0, got {final_balance}"
    assert final_balance >= 0, "Balance went negative!"

    # Verify transaction count matches successful deductions
    transaction_count = await db_connection.fetchval("""
        SELECT COUNT(*) FROM users_token_transactions
        WHERE user_id = $1 AND type = 'deduction'
    """, user_id)

    assert transaction_count == 50, f"Expected 50 transactions, got {transaction_count}"

    # Cleanup
    await db_connection.execute("DELETE FROM users WHERE id = $1", user_id)

@pytest.mark.asyncio
async def test_check_constraint_prevents_negative_trial():
    """
    TC-RACE-1.2: CHECK Constraint Prevents Negative Trial

    Scenario: Direct UPDATE attempt to set trial_remaining to negative
    Expected: Database raises exception
    Assertion: CHECK constraint enforcement
    """
    conn = await asyncpg.connect("postgresql://postgres:test_password@localhost/yarda_test")

    try:
        # Create test user
        user_id = await conn.fetchval("""
            INSERT INTO users (
                email,
                firebase_uid,
                trial_remaining
            ) VALUES (
                'check-constraint-test@example.com',
                'test-firebase-uid-check',
                3
            ) RETURNING id
        """)

        # Attempt to set trial_remaining to negative (should fail)
        with pytest.raises(asyncpg.exceptions.RaiseError, match="Trial remaining cannot be negative"):
            await conn.execute("""
                UPDATE users
                SET trial_remaining = -1
                WHERE id = $1
            """, user_id)

        # Verify trial_remaining is still 3 (unchanged)
        remaining = await conn.fetchval("""
            SELECT trial_remaining FROM users WHERE id = $1
        """, user_id)

        assert remaining == 3, "CHECK constraint did not prevent negative value!"

        # Cleanup
        await conn.execute("DELETE FROM users WHERE id = $1", user_id)

    finally:
        await conn.close()

@pytest.mark.asyncio
async def test_check_constraint_prevents_negative_token_balance():
    """
    TC-RACE-2.2: CHECK Constraint Prevents Negative Token Balance

    Scenario: Direct UPDATE attempt to set balance to negative
    Expected: Database raises exception
    Assertion: CHECK constraint enforcement
    """
    conn = await asyncpg.connect("postgresql://postgres:test_password@localhost/yarda_test")

    try:
        # Create test user and token account
        user_id = await conn.fetchval("""
            INSERT INTO users (
                email,
                firebase_uid
            ) VALUES (
                'token-check-test@example.com',
                'test-firebase-uid-token-check'
            ) RETURNING id
        """)

        account_id = await conn.fetchval("""
            INSERT INTO users_token_accounts (
                user_id,
                balance
            ) VALUES (
                $1,
                100
            ) RETURNING id
        """, user_id)

        # Attempt to set balance to negative (should fail)
        with pytest.raises(asyncpg.exceptions.RaiseError, match="Token balance cannot be negative"):
            await conn.execute("""
                UPDATE users_token_accounts
                SET balance = -50
                WHERE user_id = $1
            """, user_id)

        # Verify balance is still 100 (unchanged)
        balance = await conn.fetchval("""
            SELECT balance FROM users_token_accounts WHERE user_id = $1
        """, user_id)

        assert balance == 100, "CHECK constraint did not prevent negative balance!"

        # Cleanup
        await conn.execute("DELETE FROM users WHERE id = $1", user_id)

    finally:
        await conn.close()

@pytest.mark.asyncio
async def test_trigger_prevents_negative_trial():
    """
    TC-RACE-1.3: Trigger Prevents Negative Trial (Additional Safety)

    Scenario: Attempt INSERT with negative trial_remaining
    Expected: Trigger raises exception before INSERT
    Assertion: Trigger validation enforcement
    """
    conn = await asyncpg.connect("postgresql://postgres:test_password@localhost/yarda_test")

    try:
        # Attempt to insert user with negative trial_remaining
        with pytest.raises(Exception) as exc_info:
            await conn.execute("""
                INSERT INTO users (
                    email,
                    firebase_uid,
                    trial_remaining
                ) VALUES (
                    'trigger-test@example.com',
                    'test-firebase-uid-trigger',
                    -5
                )
            """)

        # Verify exception message mentions negative balance
        assert "cannot be negative" in str(exc_info.value).lower()

    finally:
        await conn.close()

if __name__ == "__main__":
    pytest.main([__file__, "-v"])
