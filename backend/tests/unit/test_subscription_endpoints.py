"""
Unit Tests for Subscription API Endpoints

Tests for subscription REST API endpoints:
- GET /subscriptions/plans
- POST /subscriptions/subscribe
- GET /subscriptions/current
- POST /subscriptions/cancel
- GET /subscriptions/portal

Requirements:
- FR-033: Monthly Pro subscription at $99/month
- FR-034: Unlimited generations for active subscribers
- FR-036: Cancel subscription at period end
- FR-037: Customer portal for subscription management
- T087-T091: Subscription API endpoints
"""

import pytest
import pytest_asyncio
import asyncpg
from uuid import uuid4
from datetime import datetime, timezone, timedelta
from fastapi.testclient import TestClient
from unittest.mock import Mock, patch, MagicMock

from src.main import app
from src.api.dependencies import get_current_user, require_verified_email
from src.models.user import User

# Note: db_connection, test_user, and subscriber_user fixtures are provided by conftest.py

@pytest_asyncio.fixture
async def subscribed_user(db_connection):
    """Create a test user with active subscription for endpoint testing."""
    user_id = uuid4()
    email = f'subscribed-endpoint-{user_id}@test.com'

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

@pytest.fixture
def client():
    """Create test client."""
    return TestClient(app)

@pytest.fixture
def mock_auth(test_user):
    """Mock authentication dependency."""
    user_id, email = test_user

    mock_user = User(
        id=user_id,
        email=email,
        email_verified=True,
        subscription_tier='free',
        subscription_status='inactive',
        trial_generations_remaining=3,
        trial_generations_total=3,
        created_at=datetime.now(timezone.utc),
        updated_at=datetime.now(timezone.utc)
    )

    app.dependency_overrides[get_current_user] = lambda: mock_user
    app.dependency_overrides[require_verified_email] = lambda: mock_user

    yield mock_user

    app.dependency_overrides = {}

@pytest.fixture
def mock_subscribed_auth(subscribed_user):
    """Mock authentication for subscribed user."""
    user_id, email, period_end = subscribed_user

    mock_user = User(
        id=user_id,
        email=email,
        email_verified=True,
        subscription_tier='monthly_pro',
        subscription_status='active',
        trial_generations_remaining=0,
        trial_generations_total=3,
        created_at=datetime.now(timezone.utc),
        updated_at=datetime.now(timezone.utc)
    )

    app.dependency_overrides[get_current_user] = lambda: mock_user
    app.dependency_overrides[require_verified_email] = lambda: mock_user

    yield mock_user

    app.dependency_overrides = {}

class TestListPlansEndpoint:
    """Test GET /subscriptions/plans endpoint."""

    def test_list_plans_success(self, client):
        """
        Test listing subscription plans.

        Expected:
        - Returns list of plans
        - Monthly Pro plan included
        - Plan has correct pricing
        """
        response = client.get("/subscriptions/plans")

        assert response.status_code == 200

        plans = response.json()
        assert isinstance(plans, list)
        assert len(plans) > 0

        # Find Monthly Pro plan
        monthly_pro = next((p for p in plans if p['plan_id'] == 'monthly_pro'), None)
        assert monthly_pro is not None
        assert monthly_pro['name'] == 'Monthly Pro'
        assert monthly_pro['price_cents'] == 9900
        assert len(monthly_pro['features']) > 0
        assert monthly_pro['is_popular'] is True

    def test_list_plans_no_auth_required(self, client):
        """
        Test listing plans without authentication.

        Expected:
        - Success (public endpoint)
        """
        response = client.get("/subscriptions/plans")

        assert response.status_code == 200

class TestSubscribeEndpoint:
    """Test POST /subscriptions/subscribe endpoint."""

    def test_subscribe_success(self, client, mock_auth, test_user):
        """
        Test creating subscription checkout session.

        Expected:
        - Returns session_id and URL
        - Stripe checkout session created
        """
        with patch('stripe.checkout.Session.create') as mock_create, \
             patch('stripe.Customer.create') as mock_customer_create:

            mock_customer_create.return_value = Mock(id='cus_new123')
            mock_create.return_value = Mock(
                id='cs_test123',
                url='https://checkout.stripe.com/test123'
            )

            response = client.post('/subscriptions/subscribe', json={
                'plan_id': 'monthly_pro',
                'success_url': 'https://yarda.app/subscription/success',
                'cancel_url': 'https://yarda.app/subscription/cancel'
            })

            assert response.status_code == 201

            data = response.json()
            assert 'session_id' in data
            assert 'url' in data
            assert data['session_id'] == 'cs_test123'
            assert 'checkout.stripe.com' in data['url']

    def test_subscribe_invalid_plan(self, client, mock_auth):
        """
        Test subscribing with invalid plan ID.

        Expected:
        - Returns 400 error
        """
        response = client.post('/subscriptions/subscribe', json={
            'plan_id': 'invalid_plan',
            'success_url': 'https://yarda.app/success',
            'cancel_url': 'https://yarda.app/cancel'
        })

        assert response.status_code == 400

    def test_subscribe_missing_urls(self, client, mock_auth):
        """
        Test subscribing without redirect URLs.

        Expected:
        - Returns 422 validation error
        """
        response = client.post('/subscriptions/subscribe', json={
            'plan_id': 'monthly_pro'
        })

        assert response.status_code == 422

    def test_subscribe_already_active_subscription(self, client, mock_subscribed_auth):
        """
        Test subscribing when user already has active subscription.

        Expected:
        - Returns 409 conflict error
        """
        with patch('stripe.Subscription.retrieve') as mock_retrieve:
            mock_retrieve.return_value = Mock(
                current_period_start=int(datetime.now(timezone.utc).timestamp())
            )

            response = client.post('/subscriptions/subscribe', json={
                'plan_id': 'monthly_pro',
                'success_url': 'https://yarda.app/success',
                'cancel_url': 'https://yarda.app/cancel'
            })

            assert response.status_code == 409

            data = response.json()
            assert 'detail' in data
            assert 'error' in data['detail']
            assert data['detail']['error'] == 'subscription_already_active'

    def test_subscribe_requires_verified_email(self, client, test_user):
        """
        Test subscribing requires verified email.

        Expected:
        - Returns 401/403 without verified email
        """
        # Remove auth override
        app.dependency_overrides = {}

        response = client.post('/subscriptions/subscribe', json={
            'plan_id': 'monthly_pro',
            'success_url': 'https://yarda.app/success',
            'cancel_url': 'https://yarda.app/cancel'
        })

        assert response.status_code in [401, 403]

class TestCurrentSubscriptionEndpoint:
    """Test GET /subscriptions/current endpoint."""

    def test_get_current_subscription_active(self, client, mock_subscribed_auth):
        """
        Test getting current active subscription.

        Expected:
        - Returns subscription details
        - is_active = True
        - Plan details included
        """
        with patch('stripe.Subscription.retrieve') as mock_retrieve:
            mock_retrieve.return_value = Mock(
                current_period_start=int(datetime.now(timezone.utc).timestamp())
            )

            response = client.get('/subscriptions/current')

            assert response.status_code == 200

            data = response.json()
            assert data['is_active'] is True
            assert data['status'] == 'active'
            assert data['plan'] is not None
            assert data['plan']['plan_id'] == 'monthly_pro'
            assert data['cancel_at_period_end'] is False

    def test_get_current_subscription_inactive(self, client, mock_auth):
        """
        Test getting subscription status for non-subscriber.

        Expected:
        - Returns subscription status
        - is_active = False
        - No plan details
        """
        response = client.get('/subscriptions/current')

        assert response.status_code == 200

        data = response.json()
        assert data['is_active'] is False
        assert data['status'] == 'inactive'
        assert data['plan'] is None

    def test_get_current_subscription_requires_auth(self, client):
        """
        Test getting subscription requires authentication.

        Expected:
        - Returns 401 without auth
        """
        # Remove auth override
        app.dependency_overrides = {}

        response = client.get('/subscriptions/current')

        assert response.status_code in [401, 403]

class TestCancelSubscriptionEndpoint:
    """Test POST /subscriptions/cancel endpoint."""

    def test_cancel_subscription_at_period_end(self, client, mock_subscribed_auth):
        """
        Test canceling subscription at period end.

        Expected:
        - Returns success
        - cancel_at_period_end = True
        - Access retained until period end
        """
        with patch('stripe.Subscription.modify') as mock_modify:
            mock_modify.return_value = Mock(
                id='sub_test123',
                cancel_at_period_end=True
            )

            response = client.post('/subscriptions/cancel', json={
                'cancel_immediately': False
            })

            assert response.status_code == 200

            data = response.json()
            assert data['success'] is True
            assert data['cancel_at_period_end'] is True
            assert 'period end' in data['message'].lower()
            assert data['current_period_end'] is not None

    def test_cancel_subscription_immediately(self, client, mock_subscribed_auth):
        """
        Test canceling subscription immediately.

        Expected:
        - Returns success
        - Subscription deleted
        """
        with patch('stripe.Subscription.modify') as mock_modify, \
             patch('stripe.Subscription.delete') as mock_delete:

            mock_delete.return_value = Mock(id='sub_test123', status='canceled')

            response = client.post('/subscriptions/cancel', json={
                'cancel_immediately': True
            })

            assert response.status_code == 200

            data = response.json()
            assert data['success'] is True
            assert data['cancel_at_period_end'] is False
            assert 'immediately' in data['message'].lower()

    def test_cancel_subscription_no_active_subscription(self, client, mock_auth):
        """
        Test canceling without active subscription.

        Expected:
        - Returns 400 error
        """
        response = client.post('/subscriptions/cancel', json={
            'cancel_immediately': False
        })

        assert response.status_code == 400

        data = response.json()
        assert 'no active subscription' in data['detail'].lower()

    def test_cancel_subscription_requires_auth(self, client):
        """
        Test canceling requires authentication.

        Expected:
        - Returns 401 without auth
        """
        # Remove auth override
        app.dependency_overrides = {}

        response = client.post('/subscriptions/cancel', json={
            'cancel_immediately': False
        })

        assert response.status_code in [401, 403]

    def test_cancel_subscription_default_at_period_end(self, client, mock_subscribed_auth):
        """
        Test cancel defaults to period end (not immediate).

        Expected:
        - Defaults to cancel_immediately = False
        """
        with patch('stripe.Subscription.modify') as mock_modify:
            mock_modify.return_value = Mock(
                id='sub_test123',
                cancel_at_period_end=True
            )

            # Don't specify cancel_immediately (should default to False)
            response = client.post('/subscriptions/cancel', json={})

            assert response.status_code == 200

            data = response.json()
            assert data['cancel_at_period_end'] is True

class TestCustomerPortalEndpoint:
    """Test GET /subscriptions/portal endpoint."""

    def test_get_customer_portal_url(self, client, mock_subscribed_auth):
        """
        Test getting customer portal URL.

        Expected:
        - Returns portal URL
        - Stripe session created
        """
        with patch('stripe.billing_portal.Session.create') as mock_create:
            mock_create.return_value = Mock(
                url='https://billing.stripe.com/session/test123'
            )

            response = client.get('/subscriptions/portal', params={
                'return_url': 'https://yarda.app/account'
            })

            assert response.status_code == 200

            data = response.json()
            assert 'url' in data
            assert 'billing.stripe.com' in data['url']

            # Verify Stripe called with correct params
            mock_create.assert_called_once()
            call_kwargs = mock_create.call_args.kwargs
            assert call_kwargs['return_url'] == 'https://yarda.app/account'

    def test_get_customer_portal_no_stripe_customer(self, client, mock_auth):
        """
        Test getting portal without Stripe customer ID.

        Expected:
        - Returns 400 error
        """
        response = client.get('/subscriptions/portal', params={
            'return_url': 'https://yarda.app/account'
        })

        assert response.status_code == 400

        data = response.json()
        assert 'no stripe customer' in data['detail'].lower()

    def test_get_customer_portal_missing_return_url(self, client, mock_subscribed_auth):
        """
        Test portal without return URL.

        Expected:
        - Returns 422 validation error
        """
        response = client.get('/subscriptions/portal')

        assert response.status_code == 422

    def test_get_customer_portal_requires_auth(self, client):
        """
        Test portal requires authentication.

        Expected:
        - Returns 401 without auth
        """
        # Remove auth override
        app.dependency_overrides = {}

        response = client.get('/subscriptions/portal', params={
            'return_url': 'https://yarda.app/account'
        })

        assert response.status_code in [401, 403]

class TestEndpointErrorHandling:
    """Test error handling across endpoints."""

    def test_subscribe_stripe_error(self, client, mock_auth):
        """
        Test subscription when Stripe API fails.

        Expected:
        - Returns 500 error
        """
        with patch('stripe.checkout.Session.create') as mock_create, \
             patch('stripe.Customer.create') as mock_customer_create:

            import stripe
            mock_customer_create.return_value = Mock(id='cus_new123')
            mock_create.side_effect = stripe.StripeError("API error")

            response = client.post('/subscriptions/subscribe', json={
                'plan_id': 'monthly_pro',
                'success_url': 'https://yarda.app/success',
                'cancel_url': 'https://yarda.app/cancel'
            })

            assert response.status_code == 500

    def test_cancel_stripe_error(self, client, mock_subscribed_auth):
        """
        Test cancel when Stripe API fails.

        Expected:
        - Returns 500 error
        """
        with patch('stripe.Subscription.modify') as mock_modify:
            import stripe
            mock_modify.side_effect = stripe.StripeError("API error")

            response = client.post('/subscriptions/cancel', json={
                'cancel_immediately': False
            })

            assert response.status_code == 500

    def test_portal_stripe_error(self, client, mock_subscribed_auth):
        """
        Test portal when Stripe API fails.

        Expected:
        - Returns 500 error
        """
        with patch('stripe.billing_portal.Session.create') as mock_create:
            import stripe
            mock_create.side_effect = stripe.StripeError("API error")

            response = client.get('/subscriptions/portal', params={
                'return_url': 'https://yarda.app/account'
            })

            assert response.status_code == 500
