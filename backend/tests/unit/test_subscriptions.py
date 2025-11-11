"""
Unit Tests for Subscription Service

Tests for subscription service functions including:
- Checkout session creation
- Subscription status retrieval
- Subscription cancellation
- Customer portal URL generation
- Subscription activation/deactivation

Requirements:
- FR-033: Monthly Pro subscription at $99/month
- FR-034: Unlimited generations for active subscribers
- FR-036: Cancel subscription at period end
- FR-037: Customer portal for subscription management
- T085: Subscription service implementation
"""

import pytest
import pytest_asyncio
import asyncpg
from uuid import uuid4, UUID
from datetime import datetime, timezone, timedelta
from unittest.mock import Mock, patch, MagicMock, AsyncMock
from decimal import Decimal

from src.services.subscription_service import SubscriptionService
from src.models.subscription import (
    SubscriptionStatus,
    CreateSubscriptionResponse,
    CancelSubscriptionResponse,
    CustomerPortalResponse,
    MONTHLY_PRO_PLAN,
)

@pytest_asyncio.fixture
async def db_pool(db_connection):
    """Create mock database pool."""
    pool = Mock(spec=asyncpg.Pool)
    pool.acquire = AsyncMock(return_value=db_connection)
    pool.acquire.return_value.__aenter__ = AsyncMock(return_value=db_connection)
    pool.acquire.return_value.__aexit__ = AsyncMock(return_value=None)
    return pool

@pytest_asyncio.fixture
async def subscribed_user(db_connection):
    """Create a test user with active subscription."""
    user_id = uuid4()
    email = f'subscribed-test-{user_id}@test.com'

    period_end = datetime.now(timezone.utc) + timedelta(days=30)

    await db_connection.execute("""
        INSERT INTO users (
            id, email, email_verified, password_hash,
            subscription_tier, subscription_status,
            stripe_customer_id, stripe_subscription_id,
            current_period_end, cancel_at_period_end
        )
        VALUES ($1, $2, true, 'hash', 'monthly_pro', 'active',
                'cus_test123', 'sub_test123', $3, false)
    """, user_id, email, period_end)

    yield user_id, email, period_end

    # Cleanup
    await db_connection.execute("DELETE FROM users WHERE id = $1", user_id)

class TestSubscriptionServiceCheckout:
    """Test checkout session creation."""

    @pytest.mark.asyncio
    async def test_create_checkout_session_success(self, db_pool, test_user):
        """
        Test successful checkout session creation.

        Expected:
        - Stripe checkout session created with correct parameters
        - Session ID and URL returned
        - Customer created or retrieved
        """
        user_id, email = test_user

        with patch('stripe.checkout.Session.create') as mock_create, \
             patch('stripe.Customer.create') as mock_customer_create:

            # Mock Stripe responses
            mock_customer_create.return_value = Mock(id='cus_test123')
            mock_create.return_value = Mock(
                id='cs_test123',
                url='https://checkout.stripe.com/test123'
            )

            service = SubscriptionService(db_pool)

            result = await service.create_checkout_session(
                user_id=user_id,
                user_email=email,
                plan_id='monthly_pro',
                success_url='https://yarda.app/subscription/success',
                cancel_url='https://yarda.app/subscription/cancel'
            )

            # Verify response
            assert isinstance(result, CreateSubscriptionResponse)
            assert result.session_id == 'cs_test123'
            assert 'checkout.stripe.com' in result.url

            # Verify Stripe was called correctly
            mock_create.assert_called_once()
            call_kwargs = mock_create.call_args.kwargs
            assert call_kwargs['mode'] == 'subscription'
            assert call_kwargs['customer'] == 'cus_test123'
            assert 'line_items' in call_kwargs

    @pytest.mark.asyncio
    async def test_create_checkout_session_invalid_plan(self, db_pool, test_user):
        """
        Test checkout session creation with invalid plan.

        Expected:
        - Raises ValueError
        """
        user_id, email = test_user

        service = SubscriptionService(db_pool)

        with pytest.raises(ValueError, match="Invalid plan_id"):
            await service.create_checkout_session(
                user_id=user_id,
                user_email=email,
                plan_id='invalid_plan',
                success_url='https://yarda.app/subscription/success',
                cancel_url='https://yarda.app/subscription/cancel'
            )

    @pytest.mark.asyncio
    async def test_create_checkout_uses_existing_customer(self, db_connection, db_pool, test_user):
        """
        Test checkout session uses existing Stripe customer.

        Expected:
        - Existing customer ID used
        - No new customer created
        """
        user_id, email = test_user

        # Set existing customer ID
        await db_connection.execute("""
            UPDATE users SET stripe_customer_id = 'cus_existing123'
            WHERE id = $1
        """, user_id)

        with patch('stripe.checkout.Session.create') as mock_create, \
             patch('stripe.Customer.create') as mock_customer_create:

            mock_create.return_value = Mock(
                id='cs_test123',
                url='https://checkout.stripe.com/test123'
            )

            service = SubscriptionService(db_pool)

            await service.create_checkout_session(
                user_id=user_id,
                user_email=email,
                plan_id='monthly_pro',
                success_url='https://yarda.app/success',
                cancel_url='https://yarda.app/cancel'
            )

            # Verify no new customer created
            mock_customer_create.assert_not_called()

            # Verify existing customer used
            call_kwargs = mock_create.call_args.kwargs
            assert call_kwargs['customer'] == 'cus_existing123'

class TestSubscriptionServiceStatus:
    """Test subscription status retrieval."""

    @pytest.mark.asyncio
    async def test_get_subscription_status_active(self, db_pool, subscribed_user):
        """
        Test retrieving active subscription status.

        Expected:
        - is_active = True
        - plan details included
        - period dates included
        """
        user_id, email, period_end = subscribed_user

        with patch('stripe.Subscription.retrieve') as mock_retrieve:
            period_start = datetime.now(timezone.utc)
            mock_retrieve.return_value = Mock(
                current_period_start=int(period_start.timestamp())
            )

            service = SubscriptionService(db_pool)

            status = await service.get_subscription_status(user_id)

            assert isinstance(status, SubscriptionStatus)
            assert status.is_active is True
            assert status.status == 'active'
            assert status.plan is not None
            assert status.plan.plan_id == 'monthly_pro'
            assert status.current_period_end is not None
            assert status.cancel_at_period_end is False

    @pytest.mark.asyncio
    async def test_get_subscription_status_inactive(self, db_pool, test_user):
        """
        Test retrieving inactive subscription status.

        Expected:
        - is_active = False
        - no plan details
        """
        user_id, email = test_user

        service = SubscriptionService(db_pool)

        status = await service.get_subscription_status(user_id)

        assert isinstance(status, SubscriptionStatus)
        assert status.is_active is False
        assert status.status == 'inactive'
        assert status.plan is None

    @pytest.mark.asyncio
    async def test_get_subscription_status_past_due(self, db_connection, db_pool, subscribed_user):
        """
        Test retrieving past_due subscription status.

        Expected:
        - is_active = True (grace period)
        - status = 'past_due'
        """
        user_id, email, period_end = subscribed_user

        # Update to past_due
        await db_connection.execute("""
            UPDATE users SET subscription_status = 'past_due'
            WHERE id = $1
        """, user_id)

        with patch('stripe.Subscription.retrieve') as mock_retrieve:
            period_start = datetime.now(timezone.utc)
            mock_retrieve.return_value = Mock(
                current_period_start=int(period_start.timestamp())
            )

            service = SubscriptionService(db_pool)

            status = await service.get_subscription_status(user_id)

            assert status.is_active is True  # Still active in grace period
            assert status.status == 'past_due'

    @pytest.mark.asyncio
    async def test_get_subscription_status_user_not_found(self, db_pool):
        """
        Test retrieving status for non-existent user.

        Expected:
        - Raises ValueError
        """
        fake_user_id = uuid4()

        service = SubscriptionService(db_pool)

        with pytest.raises(ValueError, match="User not found"):
            await service.get_subscription_status(fake_user_id)

class TestSubscriptionServiceCancellation:
    """Test subscription cancellation."""

    @pytest.mark.asyncio
    async def test_cancel_subscription_at_period_end(self, db_connection, db_pool, subscribed_user):
        """
        Test canceling subscription at period end.

        Expected:
        - Stripe subscription marked for cancellation
        - Database updated with cancel_at_period_end = True
        - User retains access until period end
        """
        user_id, email, period_end = subscribed_user

        with patch('stripe.Subscription.modify') as mock_modify:
            mock_modify.return_value = Mock(
                id='sub_test123',
                cancel_at_period_end=True
            )

            service = SubscriptionService(db_pool)

            result = await service.cancel_subscription(
                user_id=user_id,
                cancel_immediately=False
            )

            # Verify response
            assert isinstance(result, CancelSubscriptionResponse)
            assert result.success is True
            assert result.cancel_at_period_end is True
            assert result.current_period_end is not None
            assert 'end of billing period' in result.message

            # Verify Stripe called correctly
            mock_modify.assert_called_once_with(
                'sub_test123',
                cancel_at_period_end=True
            )

            # Verify database updated
            cancel_flag = await db_connection.fetchval("""
                SELECT cancel_at_period_end FROM users WHERE id = $1
            """, user_id)
            assert cancel_flag is True

    @pytest.mark.asyncio
    async def test_cancel_subscription_immediately(self, db_connection, db_pool, subscribed_user):
        """
        Test canceling subscription immediately.

        Expected:
        - Stripe subscription deleted
        - Database updated to cancelled status
        """
        user_id, email, period_end = subscribed_user

        with patch('stripe.Subscription.modify') as mock_modify, \
             patch('stripe.Subscription.delete') as mock_delete:

            mock_delete.return_value = Mock(id='sub_test123', status='canceled')

            service = SubscriptionService(db_pool)

            result = await service.cancel_subscription(
                user_id=user_id,
                cancel_immediately=True
            )

            # Verify response
            assert result.success is True
            assert result.cancel_at_period_end is False
            assert 'cancelled immediately' in result.message

            # Verify Stripe delete called
            mock_delete.assert_called_once_with('sub_test123')

            # Verify database updated
            status = await db_connection.fetchval("""
                SELECT subscription_status FROM users WHERE id = $1
            """, user_id)
            assert status == 'cancelled'

    @pytest.mark.asyncio
    async def test_cancel_subscription_no_active_subscription(self, db_pool, test_user):
        """
        Test canceling when no active subscription exists.

        Expected:
        - Raises ValueError
        """
        user_id, email = test_user

        service = SubscriptionService(db_pool)

        with pytest.raises(ValueError, match="No active subscription"):
            await service.cancel_subscription(user_id=user_id)

    @pytest.mark.asyncio
    async def test_cancel_subscription_already_cancelled(self, db_connection, db_pool, subscribed_user):
        """
        Test canceling already cancelled subscription.

        Expected:
        - Raises ValueError
        """
        user_id, email, period_end = subscribed_user

        # Update to cancelled
        await db_connection.execute("""
            UPDATE users SET subscription_status = 'cancelled'
            WHERE id = $1
        """, user_id)

        service = SubscriptionService(db_pool)

        with pytest.raises(ValueError, match="Subscription is not active"):
            await service.cancel_subscription(user_id=user_id)

class TestSubscriptionServiceCustomerPortal:
    """Test customer portal URL generation."""

    @pytest.mark.asyncio
    async def test_get_customer_portal_url(self, db_connection, db_pool, subscribed_user):
        """
        Test generating customer portal URL.

        Expected:
        - Stripe portal session created
        - Portal URL returned
        """
        user_id, email, period_end = subscribed_user

        with patch('stripe.billing_portal.Session.create') as mock_create:
            mock_create.return_value = Mock(
                url='https://billing.stripe.com/session/test123'
            )

            service = SubscriptionService(db_pool)

            result = await service.get_customer_portal_url(
                user_id=user_id,
                return_url='https://yarda.app/account'
            )

            # Verify response
            assert isinstance(result, CustomerPortalResponse)
            assert 'billing.stripe.com' in result.url

            # Verify Stripe called correctly
            mock_create.assert_called_once()
            call_kwargs = mock_create.call_args.kwargs
            assert call_kwargs['customer'] == 'cus_test123'
            assert call_kwargs['return_url'] == 'https://yarda.app/account'

    @pytest.mark.asyncio
    async def test_get_customer_portal_no_customer_id(self, db_pool, test_user):
        """
        Test portal URL generation without Stripe customer.

        Expected:
        - Raises ValueError
        """
        user_id, email = test_user

        service = SubscriptionService(db_pool)

        with pytest.raises(ValueError, match="no Stripe customer ID"):
            await service.get_customer_portal_url(
                user_id=user_id,
                return_url='https://yarda.app/account'
            )

class TestSubscriptionServiceWebhookHelpers:
    """Test webhook helper methods."""

    @pytest.mark.asyncio
    async def test_activate_subscription(self, db_connection, db_pool, test_user):
        """
        Test activating subscription.

        Expected:
        - User updated to monthly_pro tier
        - Status set to active
        - Stripe IDs saved
        """
        user_id, email = test_user

        service = SubscriptionService(db_pool)

        period_start = datetime.now(timezone.utc)
        period_end = period_start + timedelta(days=30)

        result = await service.activate_subscription(
            user_id=user_id,
            subscription_id='sub_new123',
            customer_id='cus_new123',
            plan_id='monthly_pro',
            current_period_start=period_start,
            current_period_end=period_end
        )

        assert result is True

        # Verify database updated
        user = await db_connection.fetchrow("""
            SELECT subscription_tier, subscription_status,
                   stripe_customer_id, stripe_subscription_id,
                   cancel_at_period_end
            FROM users WHERE id = $1
        """, user_id)

        assert user['subscription_tier'] == 'monthly_pro'
        assert user['subscription_status'] == 'active'
        assert user['stripe_customer_id'] == 'cus_new123'
        assert user['stripe_subscription_id'] == 'sub_new123'
        assert user['cancel_at_period_end'] is False

    @pytest.mark.asyncio
    async def test_update_subscription_status(self, db_connection, db_pool, subscribed_user):
        """
        Test updating subscription status.

        Expected:
        - Status updated in database
        - Period end updated if provided
        """
        user_id, email, period_end = subscribed_user

        service = SubscriptionService(db_pool)

        new_period_end = datetime.now(timezone.utc) + timedelta(days=60)

        result = await service.update_subscription_status(
            user_id=user_id,
            status='past_due',
            current_period_end=new_period_end,
            cancel_at_period_end=True
        )

        assert result is True

        # Verify database updated
        user = await db_connection.fetchrow("""
            SELECT subscription_status, current_period_end, cancel_at_period_end
            FROM users WHERE id = $1
        """, user_id)

        assert user['subscription_status'] == 'past_due'
        assert user['cancel_at_period_end'] is True

    @pytest.mark.asyncio
    async def test_deactivate_subscription(self, db_connection, db_pool, subscribed_user):
        """
        Test deactivating subscription.

        Expected:
        - Tier reset to free
        - Status set to cancelled
        - Stripe IDs cleared
        """
        user_id, email, period_end = subscribed_user

        service = SubscriptionService(db_pool)

        result = await service.deactivate_subscription(user_id=user_id)

        assert result is True

        # Verify database updated
        user = await db_connection.fetchrow("""
            SELECT subscription_tier, subscription_status,
                   stripe_subscription_id, current_period_end,
                   cancel_at_period_end
            FROM users WHERE id = $1
        """, user_id)

        assert user['subscription_tier'] == 'free'
        assert user['subscription_status'] == 'cancelled'
        assert user['stripe_subscription_id'] is None
        assert user['current_period_end'] is None
        assert user['cancel_at_period_end'] is False

    @pytest.mark.asyncio
    async def test_get_user_id_by_subscription_id(self, db_connection, db_pool, subscribed_user):
        """
        Test finding user by subscription ID.

        Expected:
        - Returns correct user ID
        """
        user_id, email, period_end = subscribed_user

        service = SubscriptionService(db_pool)

        found_user_id = await service.get_user_id_by_subscription_id('sub_test123')

        assert found_user_id == user_id

    @pytest.mark.asyncio
    async def test_get_user_id_by_customer_id(self, db_connection, db_pool, subscribed_user):
        """
        Test finding user by customer ID.

        Expected:
        - Returns correct user ID
        """
        user_id, email, period_end = subscribed_user

        service = SubscriptionService(db_pool)

        found_user_id = await service.get_user_id_by_customer_id('cus_test123')

        assert found_user_id == user_id

class TestSubscriptionModels:
    """Test subscription models and helper functions."""

    def test_monthly_pro_plan_configuration(self):
        """
        Test Monthly Pro plan configuration.

        Expected:
        - Price is $99/month
        - Features list populated
        - Is marked as popular
        """
        assert MONTHLY_PRO_PLAN.plan_id == 'monthly_pro'
        assert MONTHLY_PRO_PLAN.name == 'Monthly Pro'
        assert MONTHLY_PRO_PLAN.price_monthly == Decimal('99.00')
        assert MONTHLY_PRO_PLAN.price_cents == 9900
        assert len(MONTHLY_PRO_PLAN.features) > 0
        assert MONTHLY_PRO_PLAN.is_popular is True
        assert 'Unlimited' in MONTHLY_PRO_PLAN.features[0]

    def test_get_subscription_plan(self):
        """Test getting plan by ID."""
        from src.models.subscription import get_subscription_plan

        plan = get_subscription_plan('monthly_pro')
        assert plan is not None
        assert plan.plan_id == 'monthly_pro'

        invalid_plan = get_subscription_plan('invalid')
        assert invalid_plan is None
