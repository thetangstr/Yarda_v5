"""
Unit Tests for Subscription Webhook Handling

Tests for Stripe webhook processing for subscriptions:
- customer.subscription.created
- customer.subscription.updated
- customer.subscription.deleted
- invoice.payment_succeeded
- invoice.payment_failed

Requirements:
- FR-035: Subscription webhooks update user status
- T086: Extend webhook service for subscriptions
"""

import pytest
import pytest_asyncio
import asyncpg
from uuid import uuid4
from datetime import datetime, timezone, timedelta
from unittest.mock import Mock, patch, AsyncMock

from src.services.webhook_service import WebhookService

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
    email = f'subscribed-webhook-{user_id}@test.com'

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

    yield user_id, email

    # Cleanup
    await db_connection.execute("DELETE FROM users WHERE id = $1", user_id)

class TestSubscriptionCreatedWebhook:
    """Test customer.subscription.created webhook."""

    @pytest.mark.asyncio
    async def test_subscription_created_webhook(self, db_connection, db_pool, test_user):
        """
        Test processing subscription.created webhook.

        Expected:
        - User subscription activated
        - Tier updated to monthly_pro
        - Status set to active
        """
        user_id, email = test_user

        # Create webhook event
        now = datetime.now(timezone.utc)
        period_start = int(now.timestamp())
        period_end = int((now + timedelta(days=30)).timestamp())

        event = {
            'type': 'customer.subscription.created',
            'data': {
                'object': {
                    'id': 'sub_new123',
                    'customer': 'cus_test123',
                    'status': 'active',
                    'current_period_start': period_start,
                    'current_period_end': period_end,
                    'metadata': {
                        'user_id': str(user_id),
                        'plan_id': 'monthly_pro'
                    }
                }
            }
        }

        service = WebhookService(db_pool)

        result = await service.process_subscription_created(event)

        # Verify result
        assert result['success'] is True
        assert 'activated' in result['message']
        assert result['user_id'] == str(user_id)
        assert result['subscription_id'] == 'sub_new123'

        # Verify database updated
        user = await db_connection.fetchrow("""
            SELECT subscription_tier, subscription_status,
                   stripe_subscription_id
            FROM users WHERE id = $1
        """, user_id)

        assert user['subscription_tier'] == 'monthly_pro'
        assert user['subscription_status'] == 'active'
        assert user['stripe_subscription_id'] == 'sub_new123'

    @pytest.mark.asyncio
    async def test_subscription_created_without_user_id_in_metadata(
        self, db_connection, db_pool, test_user
    ):
        """
        Test subscription.created webhook without user_id in metadata.

        Expected:
        - User found by customer_id
        - Subscription activated
        """
        user_id, email = test_user

        now = datetime.now(timezone.utc)
        period_start = int(now.timestamp())
        period_end = int((now + timedelta(days=30)).timestamp())

        event = {
            'type': 'customer.subscription.created',
            'data': {
                'object': {
                    'id': 'sub_new123',
                    'customer': 'cus_test123',
                    'status': 'active',
                    'current_period_start': period_start,
                    'current_period_end': period_end,
                    'metadata': {}  # No user_id
                }
            }
        }

        service = WebhookService(db_pool)

        result = await service.process_subscription_created(event)

        # Should still succeed by finding user via customer_id
        assert result['success'] is True
        assert result['user_id'] == str(user_id)

    @pytest.mark.asyncio
    async def test_subscription_created_user_not_found(self, db_pool):
        """
        Test subscription.created webhook with non-existent user.

        Expected:
        - Returns failure
        - User not found message
        """
        now = datetime.now(timezone.utc)
        period_start = int(now.timestamp())
        period_end = int((now + timedelta(days=30)).timestamp())

        event = {
            'type': 'customer.subscription.created',
            'data': {
                'object': {
                    'id': 'sub_new123',
                    'customer': 'cus_nonexistent',
                    'status': 'active',
                    'current_period_start': period_start,
                    'current_period_end': period_end,
                    'metadata': {}
                }
            }
        }

        service = WebhookService(db_pool)

        result = await service.process_subscription_created(event)

        assert result['success'] is False
        assert 'not found' in result['message'].lower()

class TestSubscriptionUpdatedWebhook:
    """Test customer.subscription.updated webhook."""

    @pytest.mark.asyncio
    async def test_subscription_updated_to_past_due(
        self, db_connection, db_pool, subscribed_user
    ):
        """
        Test subscription.updated webhook changing status to past_due.

        Expected:
        - Status updated to past_due
        - Period end updated
        """
        user_id, email = subscribed_user

        new_period_end = int((datetime.now(timezone.utc) + timedelta(days=60)).timestamp())

        event = {
            'type': 'customer.subscription.updated',
            'data': {
                'object': {
                    'id': 'sub_test123',
                    'status': 'past_due',
                    'current_period_end': new_period_end,
                    'cancel_at_period_end': False
                }
            }
        }

        service = WebhookService(db_pool)

        result = await service.process_subscription_updated(event)

        # Verify result
        assert result['success'] is True
        assert result['user_id'] == str(user_id)
        assert result['status'] == 'past_due'

        # Verify database
        status = await db_connection.fetchval("""
            SELECT subscription_status FROM users WHERE id = $1
        """, user_id)

        assert status == 'past_due'

    @pytest.mark.asyncio
    async def test_subscription_updated_cancel_at_period_end(
        self, db_connection, db_pool, subscribed_user
    ):
        """
        Test subscription.updated webhook with cancel_at_period_end flag.

        Expected:
        - cancel_at_period_end updated in database
        """
        user_id, email = subscribed_user

        period_end = int((datetime.now(timezone.utc) + timedelta(days=30)).timestamp())

        event = {
            'type': 'customer.subscription.updated',
            'data': {
                'object': {
                    'id': 'sub_test123',
                    'status': 'active',
                    'current_period_end': period_end,
                    'cancel_at_period_end': True
                }
            }
        }

        service = WebhookService(db_pool)

        result = await service.process_subscription_updated(event)

        assert result['success'] is True

        # Verify database
        cancel_flag = await db_connection.fetchval("""
            SELECT cancel_at_period_end FROM users WHERE id = $1
        """, user_id)

        assert cancel_flag is True

    @pytest.mark.asyncio
    async def test_subscription_updated_subscription_not_found(self, db_pool):
        """
        Test subscription.updated webhook with non-existent subscription.

        Expected:
        - Returns failure
        """
        event = {
            'type': 'customer.subscription.updated',
            'data': {
                'object': {
                    'id': 'sub_nonexistent',
                    'status': 'active',
                    'current_period_end': int(datetime.now(timezone.utc).timestamp()),
                    'cancel_at_period_end': False
                }
            }
        }

        service = WebhookService(db_pool)

        result = await service.process_subscription_updated(event)

        assert result['success'] is False

class TestSubscriptionDeletedWebhook:
    """Test customer.subscription.deleted webhook."""

    @pytest.mark.asyncio
    async def test_subscription_deleted_webhook(
        self, db_connection, db_pool, subscribed_user
    ):
        """
        Test subscription.deleted webhook.

        Expected:
        - Subscription deactivated
        - Tier reset to free
        - Status set to cancelled
        """
        user_id, email = subscribed_user

        event = {
            'type': 'customer.subscription.deleted',
            'data': {
                'object': {
                    'id': 'sub_test123'
                }
            }
        }

        service = WebhookService(db_pool)

        result = await service.process_subscription_deleted(event)

        # Verify result
        assert result['success'] is True
        assert result['user_id'] == str(user_id)
        assert 'deactivated' in result['message']

        # Verify database
        user = await db_connection.fetchrow("""
            SELECT subscription_tier, subscription_status,
                   stripe_subscription_id
            FROM users WHERE id = $1
        """, user_id)

        assert user['subscription_tier'] == 'free'
        assert user['subscription_status'] == 'cancelled'
        assert user['stripe_subscription_id'] is None

class TestInvoiceWebhooks:
    """Test invoice payment webhooks."""

    @pytest.mark.asyncio
    async def test_invoice_payment_succeeded(
        self, db_connection, db_pool, subscribed_user
    ):
        """
        Test invoice.payment_succeeded webhook.

        Expected:
        - Subscription status confirmed as active
        """
        user_id, email = subscribed_user

        # Set to past_due first
        await db_connection.execute("""
            UPDATE users SET subscription_status = 'past_due'
            WHERE id = $1
        """, user_id)

        event = {
            'type': 'invoice.payment_succeeded',
            'data': {
                'object': {
                    'subscription': 'sub_test123',
                    'customer': 'cus_test123'
                }
            }
        }

        service = WebhookService(db_pool)

        result = await service.process_invoice_payment_succeeded(event)

        # Verify result
        assert result['success'] is True
        assert result['user_id'] == str(user_id)

        # Verify status reset to active
        status = await db_connection.fetchval("""
            SELECT subscription_status FROM users WHERE id = $1
        """, user_id)

        assert status == 'active'

    @pytest.mark.asyncio
    async def test_invoice_payment_succeeded_non_subscription(self, db_pool):
        """
        Test invoice.payment_succeeded for non-subscription invoice.

        Expected:
        - Acknowledged but no action taken
        """
        event = {
            'type': 'invoice.payment_succeeded',
            'data': {
                'object': {
                    'subscription': None,  # Not a subscription invoice
                    'customer': 'cus_test123'
                }
            }
        }

        service = WebhookService(db_pool)

        result = await service.process_invoice_payment_succeeded(event)

        assert result['success'] is True
        assert 'non-subscription' in result['message'].lower()

    @pytest.mark.asyncio
    async def test_invoice_payment_failed(
        self, db_connection, db_pool, subscribed_user
    ):
        """
        Test invoice.payment_failed webhook.

        Expected:
        - Subscription status updated to past_due
        """
        user_id, email = subscribed_user

        event = {
            'type': 'invoice.payment_failed',
            'data': {
                'object': {
                    'subscription': 'sub_test123',
                    'customer': 'cus_test123'
                }
            }
        }

        service = WebhookService(db_pool)

        result = await service.process_invoice_payment_failed(event)

        # Verify result
        assert result['success'] is True
        assert result['user_id'] == str(user_id)
        assert 'past_due' in result['message']

        # Verify status updated
        status = await db_connection.fetchval("""
            SELECT subscription_status FROM users WHERE id = $1
        """, user_id)

        assert status == 'past_due'

class TestWebhookEventProcessing:
    """Test main webhook event processing."""

    @pytest.mark.asyncio
    async def test_process_subscription_webhook_event(
        self, db_connection, db_pool, test_user
    ):
        """
        Test processing full webhook event with signature verification.

        Expected:
        - Signature verified
        - Event processed
        - User subscription activated
        """
        user_id, email = test_user

        payload = b'{"type": "customer.subscription.created"}'
        signature = 'test_signature'

        now = datetime.now(timezone.utc)
        period_start = int(now.timestamp())
        period_end = int((now + timedelta(days=30)).timestamp())

        mock_event = {
            'type': 'customer.subscription.created',
            'data': {
                'object': {
                    'id': 'sub_new123',
                    'customer': 'cus_test123',
                    'status': 'active',
                    'current_period_start': period_start,
                    'current_period_end': period_end,
                    'metadata': {
                        'user_id': str(user_id),
                        'plan_id': 'monthly_pro'
                    }
                }
            }
        }

        with patch('src.services.stripe_service.StripeService.construct_webhook_event') as mock_construct:
            mock_construct.return_value = mock_event

            service = WebhookService(db_pool)

            result = await service.process_webhook_event(payload, signature)

            # Verify result
            assert result['success'] is True
            assert result['event_type'] == 'customer.subscription.created'
            assert 'user_id' in result

            # Verify signature was checked
            mock_construct.assert_called_once_with(payload, signature)

    @pytest.mark.asyncio
    async def test_process_webhook_event_invalid_signature(self, db_pool):
        """
        Test webhook with invalid signature.

        Expected:
        - Returns failure
        - Event not processed
        """
        payload = b'{"type": "customer.subscription.created"}'
        signature = 'invalid_signature'

        with patch('src.services.stripe_service.StripeService.construct_webhook_event') as mock_construct:
            mock_construct.side_effect = ValueError("Invalid signature")

            service = WebhookService(db_pool)

            result = await service.process_webhook_event(payload, signature)

            assert result['success'] is False
            assert 'signature' in result['message'].lower()

    @pytest.mark.asyncio
    async def test_process_webhook_event_unknown_type(self, db_pool):
        """
        Test webhook with unknown event type.

        Expected:
        - Acknowledged but not processed
        """
        payload = b'{"type": "unknown.event.type"}'
        signature = 'test_signature'

        mock_event = {
            'type': 'unknown.event.type',
            'data': {}
        }

        with patch('src.services.stripe_service.StripeService.construct_webhook_event') as mock_construct:
            mock_construct.return_value = mock_event

            service = WebhookService(db_pool)

            result = await service.process_webhook_event(payload, signature)

            # Should acknowledge unknown events
            assert result['success'] is True
            assert result['event_type'] == 'unknown.event.type'
            assert 'acknowledged' in result['message'].lower()
