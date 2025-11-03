"""
Token Service

Handles token account operations with atomic transactions and race condition prevention.

Requirements:
- FR-026: Atomic token deduction with FOR UPDATE lock
- FR-066: Token refund on generation failure
- T046: Atomic deduct_token
- T047: Token refund
"""

import asyncpg
from uuid import UUID
from typing import Optional, Tuple
from datetime import datetime


class TokenService:
    """Service for managing token accounts and transactions."""

    def __init__(self, db_pool: asyncpg.Pool):
        """
        Initialize token service.

        Args:
            db_pool: Database connection pool
        """
        self.db_pool = db_pool

    async def get_token_balance(self, user_id: UUID) -> Tuple[int, int, int]:
        """
        Get user's token balance and statistics.

        Args:
            user_id: User ID

        Returns:
            Tuple of (balance, total_purchased, total_spent)
            Returns (0, 0, 0) if no token account exists
        """
        async with self.db_pool.acquire() as conn:
            row = await conn.fetchrow(
                """
                SELECT balance, total_purchased, total_spent
                FROM users_token_accounts
                WHERE user_id = $1
            """,
                user_id,
            )

            if row is None:
                return (0, 0, 0)

            return (row["balance"], row["total_purchased"], row["total_spent"])

    async def deduct_token_atomic(self, user_id: UUID) -> Tuple[bool, int]:
        """
        Atomically deduct 1 token from user's balance with FOR UPDATE lock.

        This prevents race conditions when multiple concurrent requests
        try to deduct tokens at the same time.

        Requirements:
        - FR-026: Atomic deduction with row-level locking
        - TC-TOK-RACE-1.1: Concurrent deductions prevented

        Args:
            user_id: User ID

        Returns:
            Tuple of (success: bool, new_balance: int)
            - success=True if token deducted successfully
            - success=False if insufficient balance or no account
        """
        async with self.db_pool.acquire() as conn:
            async with conn.transaction():
                # Get current balance with row lock (FOR UPDATE)
                # This prevents other transactions from reading/modifying
                # until this transaction completes
                balance = await conn.fetchval(
                    """
                    SELECT balance
                    FROM users_token_accounts
                    WHERE user_id = $1
                    FOR UPDATE
                """,
                    user_id,
                )

                # No account exists
                if balance is None:
                    return (False, 0)

                # Insufficient balance
                if balance < 1:
                    return (False, balance)

                # Deduct 1 token
                await conn.execute(
                    """
                    UPDATE users_token_accounts u
                    SET balance = u.balance - 1,
                        total_spent = u.total_spent + 1,
                        updated_at = NOW()
                    WHERE u.user_id = $1
                """,
                    user_id,
                )

                new_balance = balance - 1
                return (True, new_balance)

    async def refund_token(self, user_id: UUID) -> Tuple[bool, int]:
        """
        Refund 1 token to user's balance after failed generation.

        Requirements:
        - FR-066: Refund tokens on generation failure
        - TC-TOK-4.1: Token refunded when generation fails

        Args:
            user_id: User ID

        Returns:
            Tuple of (success: bool, new_balance: int)
            - success=True if token refunded successfully
            - success=False if no account exists
        """
        async with self.db_pool.acquire() as conn:
            async with conn.transaction():
                # Check if account exists
                account_exists = await conn.fetchval(
                    """
                    SELECT EXISTS(
                        SELECT 1 FROM users_token_accounts WHERE user_id = $1
                    )
                """,
                    user_id,
                )

                if not account_exists:
                    return (False, 0)

                # Refund 1 token
                new_balance = await conn.fetchval(
                    """
                    UPDATE users_token_accounts u
                    SET balance = u.balance + 1,
                        total_spent = GREATEST(u.total_spent - 1, 0),
                        updated_at = NOW()
                    WHERE u.user_id = $1
                    RETURNING balance
                """,
                    user_id,
                )

                return (True, new_balance)

    async def create_token_account(
        self, user_id: UUID, initial_balance: int = 0
    ) -> bool:
        """
        Create a token account for a user.

        Args:
            user_id: User ID
            initial_balance: Initial token balance (default: 0)

        Returns:
            True if account created successfully, False if already exists
        """
        async with self.db_pool.acquire() as conn:
            try:
                await conn.execute(
                    """
                    INSERT INTO users_token_accounts (
                        user_id,
                        balance,
                        total_purchased,
                        total_spent
                    ) VALUES ($1, $2, 0, 0)
                """,
                    user_id,
                    initial_balance,
                )
                return True
            except asyncpg.UniqueViolationError:
                # Account already exists
                return False

    async def add_tokens(
        self,
        user_id: UUID,
        tokens: int,
        transaction_type: str,
        description: str,
        stripe_payment_intent_id: Optional[str] = None,
        price_paid_cents: Optional[int] = None,
    ) -> Tuple[bool, Optional[UUID]]:
        """
        Add tokens to user's account and record transaction.

        Used for:
        - Token purchases via Stripe webhook
        - Test helpers

        Requirements:
        - FR-027: Idempotent webhook processing (via UNIQUE constraint)
        - TC-WEBHOOK-1.1: Duplicate webhook prevented

        Args:
            user_id: User ID
            tokens: Number of tokens to add (must be positive)
            transaction_type: Type of transaction (e.g., 'purchase')
            description: Human-readable description
            stripe_payment_intent_id: Stripe payment intent ID (for idempotency)
            price_paid_cents: Price paid in cents

        Returns:
            Tuple of (success: bool, transaction_id: Optional[UUID])
            - success=False if duplicate payment_intent_id (already processed)
            - success=True with transaction_id if tokens added successfully
        """
        if tokens <= 0:
            raise ValueError("tokens must be positive")

        async with self.db_pool.acquire() as conn:
            async with conn.transaction():
                try:
                    # Create transaction record
                    # UNIQUE constraint on stripe_payment_intent_id prevents duplicates
                    transaction_id = await conn.fetchval(
                        """
                        INSERT INTO users_token_transactions (
                            user_id,
                            amount,
                            transaction_type,
                            description,
                            stripe_payment_intent_id,
                            price_paid_cents
                        ) VALUES ($1, $2, $3, $4, $5, $6)
                        RETURNING id
                    """,
                        user_id,
                        tokens,
                        transaction_type,
                        description,
                        stripe_payment_intent_id,
                        price_paid_cents,
                    )

                    # Credit tokens to account
                    await conn.execute(
                        """
                        UPDATE users_token_accounts u
                        SET balance = u.balance + $2,
                            total_purchased = u.total_purchased + $2,
                            updated_at = NOW()
                        WHERE u.user_id = $1
                    """,
                        user_id,
                        tokens,
                    )

                    return (True, transaction_id)

                except asyncpg.UniqueViolationError:
                    # Duplicate payment_intent_id - webhook already processed
                    return (False, None)

    async def record_token_deduction(
        self, user_id: UUID, generation_id: UUID, description: str = "Landscape generation"
    ) -> UUID:
        """
        Record a token deduction transaction.

        Called after successful deduct_token_atomic().

        Args:
            user_id: User ID
            generation_id: Generation ID (for reference)
            description: Transaction description

        Returns:
            Transaction ID
        """
        async with self.db_pool.acquire() as conn:
            transaction_id = await conn.fetchval(
                """
                INSERT INTO users_token_transactions (
                    user_id,
                    amount,
                    transaction_type,
                    description,
                    generation_id
                ) VALUES ($1, -1, 'generation', $2, $3)
                RETURNING id
            """,
                user_id,
                description,
                generation_id,
            )
            return transaction_id

    async def record_token_refund(
        self, user_id: UUID, generation_id: UUID, description: str = "Generation failed - refunded"
    ) -> UUID:
        """
        Record a token refund transaction.

        Called after successful refund_token().

        Args:
            user_id: User ID
            generation_id: Generation ID (for reference)
            description: Transaction description

        Returns:
            Transaction ID
        """
        async with self.db_pool.acquire() as conn:
            transaction_id = await conn.fetchval(
                """
                INSERT INTO users_token_transactions (
                    user_id,
                    amount,
                    transaction_type,
                    description,
                    generation_id
                ) VALUES ($1, 1, 'refund', $2, $3)
                RETURNING id
            """,
                user_id,
                description,
                generation_id,
            )
            return transaction_id

    async def get_transaction_history(
        self, user_id: UUID, limit: int = 50, offset: int = 0
    ) -> list:
        """
        Get user's token transaction history.

        Args:
            user_id: User ID
            limit: Number of transactions to return
            offset: Pagination offset

        Returns:
            List of transaction records (dicts)
        """
        async with self.db_pool.acquire() as conn:
            transactions = await conn.fetch(
                """
                SELECT
                    id,
                    amount,
                    transaction_type,
                    description,
                    price_paid_cents,
                    created_at
                FROM users_token_transactions
                WHERE user_id = $1
                ORDER BY created_at DESC
                LIMIT $2 OFFSET $3
            """,
                user_id,
                limit,
                offset,
            )
            return [dict(tx) for tx in transactions]

    async def check_token_authorization(self, user_id: UUID) -> bool:
        """
        Check if user has at least 1 token available.

        Used in authorization hierarchy check (after subscription and trial).

        Args:
            user_id: User ID

        Returns:
            True if user has at least 1 token, False otherwise
        """
        balance, _, _ = await self.get_token_balance(user_id)
        return balance >= 1
