"""
Unit Tests for Holiday Credit Service

Tests for holiday credit service functions including:
- Atomic credit deduction (prevents negative balance)
- Credit granting (social shares, admin grants)
- Balance queries with earnings breakdown
- Daily share limit checks

Requirements:
- FR-HOL-001: 1 free holiday credit on signup during season
- FR-HOL-002: Atomic credit deduction with row-level locking
- FR-HOL-003: Earn 1 credit per share (max 3/day)
- T014: HolidayCreditService implementation
"""

import pytest
import pytest_asyncio
from uuid import uuid4
from datetime import datetime, timezone, timedelta
from decimal import Decimal

from src.services.holiday_credit_service import HolidayCreditService
from src.models.holiday import CreditDeductionResult, HolidayCreditsResponse


@pytest_asyncio.fixture
async def holiday_user(db_connection):
    """
    Create a test user with holiday credits for testing.

    Note: The grant_initial_holiday_credit trigger will set credits to 1
    on insert during holiday season (Nov-Jan). We update to 3 after insert.

    Automatically cleans up after test completes.
    """
    user_id = uuid4()
    email = f"holiday-test-{user_id}@test.com"

    # Insert user (trigger will set holiday_credits=1 during Nov-Jan)
    await db_connection.execute("""
        INSERT INTO users (
            id, email, email_verified,
            subscription_tier, subscription_status
        ) VALUES (
            $1, $2, true, 'free', 'inactive'
        )
    """, user_id, email)

    # Update to desired test state (3 credits)
    await db_connection.execute("""
        UPDATE users
        SET holiday_credits = 3, holiday_credits_earned = 3
        WHERE id = $1
    """, user_id)

    yield user_id

    # Cleanup
    await db_connection.execute("DELETE FROM users WHERE id = $1", user_id)


@pytest_asyncio.fixture
async def no_credit_user(db_connection):
    """
    Create a test user with zero holiday credits.

    Note: The grant_initial_holiday_credit trigger will set credits to 1
    on insert during holiday season (Nov-Jan). We update to 0 after insert.
    """
    user_id = uuid4()
    email = f"no-credit-test-{user_id}@test.com"

    # Insert user (trigger will set holiday_credits=1 during Nov-Jan)
    await db_connection.execute("""
        INSERT INTO users (
            id, email, email_verified,
            subscription_tier, subscription_status
        ) VALUES (
            $1, $2, true, 'free', 'inactive'
        )
    """, user_id, email)

    # Update to desired test state (0 credits)
    await db_connection.execute("""
        UPDATE users
        SET holiday_credits = 0, holiday_credits_earned = 0
        WHERE id = $1
    """, user_id)

    yield user_id

    # Cleanup
    await db_connection.execute("DELETE FROM users WHERE id = $1", user_id)


@pytest_asyncio.fixture
async def credit_service(db_connection):
    """Create HolidayCreditService instance with mock pool."""
    # Create a simple mock pool that wraps the db_connection
    class MockPool:
        def __init__(self, conn):
            self.conn = conn

        async def fetchrow(self, query, *args):
            return await self.conn.fetchrow(query, *args)

        async def fetchval(self, query, *args):
            return await self.conn.fetchval(query, *args)

        async def fetch(self, query, *args):
            return await self.conn.fetch(query, *args)

        async def execute(self, query, *args):
            return await self.conn.execute(query, *args)

    pool = MockPool(db_connection)
    return HolidayCreditService(pool)


class TestCreditDeduction:
    """Test atomic credit deduction operations."""

    @pytest.mark.asyncio
    async def test_deduct_credit_success(self, credit_service, holiday_user):
        """
        Test successful credit deduction with sufficient balance.

        Expected:
        - Credit deducted atomically
        - Success = true
        - Credits remaining = 2 (3 - 1)
        """
        result = await credit_service.deduct_credit(holiday_user)

        assert result.success is True
        assert result.credits_remaining == 2
        assert result.error_message is None

    @pytest.mark.asyncio
    async def test_deduct_credit_insufficient(self, credit_service, no_credit_user):
        """
        Test credit deduction with insufficient balance.

        Expected:
        - Deduction fails
        - Success = false
        - Credits remaining = 0
        - Error message present
        """
        result = await credit_service.deduct_credit(no_credit_user)

        assert result.success is False
        assert result.credits_remaining == 0
        assert result.error_message == "Insufficient holiday credits"

    @pytest.mark.asyncio
    async def test_deduct_multiple_credits(self, credit_service, holiday_user):
        """
        Test multiple sequential deductions.

        Expected:
        - First deduction: success, 2 remaining
        - Second deduction: success, 1 remaining
        - Third deduction: success, 0 remaining
        - Fourth deduction: fail, 0 remaining
        """
        # First deduction
        result1 = await credit_service.deduct_credit(holiday_user)
        assert result1.success is True
        assert result1.credits_remaining == 2

        # Second deduction
        result2 = await credit_service.deduct_credit(holiday_user)
        assert result2.success is True
        assert result2.credits_remaining == 1

        # Third deduction
        result3 = await credit_service.deduct_credit(holiday_user)
        assert result3.success is True
        assert result3.credits_remaining == 0

        # Fourth deduction should fail
        result4 = await credit_service.deduct_credit(holiday_user)
        assert result4.success is False
        assert result4.credits_remaining == 0

    @pytest.mark.asyncio
    async def test_deduct_credit_prevents_negative_balance(
        self, credit_service, holiday_user, db_connection
    ):
        """
        Test that atomic deduction prevents negative balance.

        Expected:
        - After deducting all credits, balance cannot go below 0
        - Database constraint enforced
        """
        # Deduct all 3 credits
        await credit_service.deduct_credit(holiday_user)
        await credit_service.deduct_credit(holiday_user)
        await credit_service.deduct_credit(holiday_user)

        # Verify balance is 0
        balance = await db_connection.fetchval(
            "SELECT holiday_credits FROM users WHERE id = $1",
            holiday_user
        )
        assert balance == 0

        # Try to deduct when balance is 0
        result = await credit_service.deduct_credit(holiday_user)
        assert result.success is False

        # Verify balance still 0 (not negative)
        balance = await db_connection.fetchval(
            "SELECT holiday_credits FROM users WHERE id = $1",
            holiday_user
        )
        assert balance == 0


class TestCreditGrant:
    """Test credit granting operations."""

    @pytest.mark.asyncio
    async def test_grant_credit_success(self, credit_service, no_credit_user):
        """
        Test successful credit grant.

        Expected:
        - Credit granted
        - New balance = 1
        - Credits earned incremented
        """
        new_balance = await credit_service.grant_credit(
            no_credit_user,
            amount=1,
            reason="social_share"
        )

        assert new_balance == 1

    @pytest.mark.asyncio
    async def test_grant_multiple_credits(self, credit_service, no_credit_user):
        """
        Test granting multiple credits at once.

        Expected:
        - Credits granted
        - New balance = 5
        """
        new_balance = await credit_service.grant_credit(
            no_credit_user,
            amount=5,
            reason="admin_grant"
        )

        assert new_balance == 5

    @pytest.mark.asyncio
    async def test_grant_credit_increments_earned(
        self, credit_service, no_credit_user, db_connection
    ):
        """
        Test that granting credits increments both balance and earned.

        Expected:
        - holiday_credits += amount
        - holiday_credits_earned += amount
        """
        # Grant 3 credits
        await credit_service.grant_credit(no_credit_user, amount=3)

        # Verify both columns updated
        row = await db_connection.fetchrow(
            "SELECT holiday_credits, holiday_credits_earned FROM users WHERE id = $1",
            no_credit_user
        )

        assert row['holiday_credits'] == 3
        assert row['holiday_credits_earned'] == 3

    @pytest.mark.asyncio
    async def test_grant_credit_invalid_amount(self, credit_service, no_credit_user):
        """
        Test that granting invalid amount raises error.

        Expected:
        - ValueError raised for amount <= 0
        """
        with pytest.raises(ValueError, match="Amount must be positive"):
            await credit_service.grant_credit(no_credit_user, amount=0)

        with pytest.raises(ValueError, match="Amount must be positive"):
            await credit_service.grant_credit(no_credit_user, amount=-1)

    @pytest.mark.asyncio
    async def test_grant_credit_to_existing_balance(
        self, credit_service, holiday_user
    ):
        """
        Test granting credits to user with existing balance.

        Expected:
        - Credits added to existing balance
        - New balance = 3 + 2 = 5
        """
        new_balance = await credit_service.grant_credit(
            holiday_user,
            amount=2,
            reason="social_share"
        )

        assert new_balance == 5


class TestBalanceQuery:
    """Test balance query operations."""

    @pytest.mark.asyncio
    async def test_get_balance_success(self, credit_service, holiday_user):
        """
        Test successful balance query.

        Expected:
        - Current balance = 3
        - Total earned = 3
        - Can generate = true
        """
        response = await credit_service.get_balance(holiday_user)

        assert response.holiday_credits == 3
        assert response.holiday_credits_earned == 3
        assert response.can_generate is True

    @pytest.mark.asyncio
    async def test_get_balance_zero_credits(self, credit_service, no_credit_user):
        """
        Test balance query for user with zero credits.

        Expected:
        - Current balance = 0
        - Can generate = false
        """
        response = await credit_service.get_balance(no_credit_user)

        assert response.holiday_credits == 0
        assert response.can_generate is False

    @pytest.mark.asyncio
    async def test_get_balance_invalid_user(self, credit_service):
        """
        Test balance query for non-existent user.

        Expected:
        - ValueError raised
        """
        fake_user_id = uuid4()

        with pytest.raises(ValueError, match="User .* not found"):
            await credit_service.get_balance(fake_user_id)

    @pytest.mark.asyncio
    async def test_balance_earnings_breakdown(
        self, credit_service, holiday_user
    ):
        """
        Test earnings breakdown calculation.

        Expected:
        - Breakdown includes signup_bonus and social_shares
        """
        response = await credit_service.get_balance(holiday_user)

        assert response.earnings_breakdown is not None
        assert response.earnings_breakdown.signup_bonus >= 0
        assert response.earnings_breakdown.social_shares >= 0
        assert response.earnings_breakdown.other >= 0


class TestDailyShareLimit:
    """Test daily share limit checks."""

    @pytest.mark.asyncio
    async def test_check_daily_share_limit_no_shares(
        self, credit_service, holiday_user
    ):
        """
        Test share limit check with no shares today.

        Expected:
        - Can share = true
        """
        can_share = await credit_service.check_daily_share_limit(holiday_user)
        assert can_share is True

    @pytest.mark.asyncio
    async def test_get_daily_shares_remaining_initial(
        self, credit_service, holiday_user
    ):
        """
        Test shares remaining with no shares today.

        Expected:
        - Shares remaining = 3
        """
        remaining = await credit_service.get_daily_shares_remaining(holiday_user)
        assert remaining == 3

    @pytest.mark.asyncio
    async def test_check_daily_share_limit_with_shares(
        self, credit_service, holiday_user, db_connection
    ):
        """
        Test share limit check after creating shares.

        Expected:
        - After 2 shares: can_share = true, remaining = 1
        - After 3 shares: can_share = false, remaining = 0
        """
        # Create a test generation for sharing
        gen_id = uuid4()
        await db_connection.execute("""
            INSERT INTO holiday_generations (
                id, user_id, address, geocoded_lat, geocoded_lng,
                street_view_heading, style, original_image_url, status
            ) VALUES (
                $1, $2, 'Test Address', 37.7749, -122.4194,
                180, 'classic', 'https://test.com/image.jpg', 'completed'
            )
        """, gen_id, holiday_user)

        # Create 2 shares
        for i in range(2):
            await db_connection.execute("""
                INSERT INTO social_shares (
                    user_id, generation_id, platform,
                    tracking_link, tracking_code
                ) VALUES (
                    $1, $2, 'instagram', $3, $4
                )
            """, holiday_user, gen_id, f"https://test.com/h/test{i}", f"test{i}")

        # Check limit (should still be able to share)
        can_share = await credit_service.check_daily_share_limit(holiday_user)
        assert can_share is True

        remaining = await credit_service.get_daily_shares_remaining(holiday_user)
        assert remaining == 1

        # Create 3rd share
        await db_connection.execute("""
            INSERT INTO social_shares (
                user_id, generation_id, platform,
                tracking_link, tracking_code
            ) VALUES (
                $1, $2, 'facebook', $3, $4
            )
        """, holiday_user, gen_id, "https://test.com/h/test3", "test3")

        # Check limit (should be at limit)
        can_share = await credit_service.check_daily_share_limit(holiday_user)
        assert can_share is False

        remaining = await credit_service.get_daily_shares_remaining(holiday_user)
        assert remaining == 0

        # Cleanup
        await db_connection.execute("DELETE FROM social_shares WHERE user_id = $1", holiday_user)
        await db_connection.execute("DELETE FROM holiday_generations WHERE id = $1", gen_id)


class TestValidationHelpers:
    """Test validation helper methods."""

    @pytest.mark.asyncio
    async def test_has_sufficient_credits_true(self, credit_service, holiday_user):
        """
        Test has_sufficient_credits with sufficient balance.

        Expected:
        - Returns true when credits >= required
        """
        result = await credit_service.has_sufficient_credits(holiday_user, required=1)
        assert result is True

        result = await credit_service.has_sufficient_credits(holiday_user, required=3)
        assert result is True

    @pytest.mark.asyncio
    async def test_has_sufficient_credits_false(self, credit_service, holiday_user):
        """
        Test has_sufficient_credits with insufficient balance.

        Expected:
        - Returns false when credits < required
        """
        result = await credit_service.has_sufficient_credits(holiday_user, required=4)
        assert result is False

    @pytest.mark.asyncio
    async def test_has_sufficient_credits_zero_balance(
        self, credit_service, no_credit_user
    ):
        """
        Test has_sufficient_credits with zero balance.

        Expected:
        - Returns false
        """
        result = await credit_service.has_sufficient_credits(no_credit_user, required=1)
        assert result is False
