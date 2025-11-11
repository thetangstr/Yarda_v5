"""
Pytest Configuration and Fixtures

Provides test fixtures for:
- API mocking (Gemini, Google Maps, Stripe)
- Database connection to Supabase
- Test data generation
"""

import pytest
import pytest_asyncio
from unittest.mock import AsyncMock, MagicMock, patch
import asyncpg
import asyncio
import os
from datetime import datetime, timedelta
from dotenv import load_dotenv


# ==============================================================================
# API Mocking Fixtures
# ==============================================================================

@pytest.fixture
def mock_gemini_failure(mocker):
    """
    Mock Gemini API to simulate generation failures.

    Use this fixture to test refund logic when generation fails.

    Example:
        def test_trial_refund_on_failure(mock_gemini_failure):
            # Generation will fail and trigger refund logic
            result = await generation_service.create(...)
            assert result.status == "failed"
    """
    mock_response = mocker.patch(
        "src.services.gemini_client.GeminiClient.generate_design",
        new_callable=AsyncMock
    )
    mock_response.side_effect = Exception("Gemini API error: Rate limit exceeded")
    return mock_response


@pytest.fixture
def mock_gemini_timeout(mocker):
    """
    Mock Gemini API to simulate timeout errors.

    Use this for testing timeout handling and retry logic.
    """
    mock_response = mocker.patch(
        "src.services.gemini_client.GeminiClient.generate_design",
        new_callable=AsyncMock
    )
    mock_response.side_effect = asyncio.TimeoutError("Gemini API timeout")
    return mock_response


@pytest.fixture
def mock_gemini_success(mocker):
    """
    Mock Gemini API to return successful response.

    Use this for testing happy path without actually calling Gemini API.
    """
    mock_response = mocker.patch(
        "src.services.gemini_client.GeminiClient.generate_design",
        new_callable=AsyncMock
    )
    mock_response.return_value = {
        "image_urls": [
            "https://storage.googleapis.com/test/design1.jpg",
            "https://storage.googleapis.com/test/design2.jpg",
            "https://storage.googleapis.com/test/design3.jpg"
        ],
        "metadata": {
            "style": "Modern Minimalist",
            "area": "Front Yard",
            "generation_time": 3.5
        }
    }
    return mock_response


@pytest.fixture
def mock_google_maps_failure(mocker):
    """
    Mock Google Maps API to simulate failures.

    Use this for testing error handling when Street View is unavailable.
    """
    mock_response = mocker.patch(
        "src.services.maps_service.MapsService.get_street_view",
        new_callable=AsyncMock
    )
    mock_response.side_effect = Exception("Google Maps API error: Invalid API key")
    return mock_response


@pytest.fixture
def mock_stripe_failure(mocker):
    """
    Mock Stripe API to simulate payment failures.

    Use this for testing error handling in payment flows.
    """
    mock_response = mocker.patch(
        "stripe.checkout.Session.create",
        new_callable=MagicMock
    )
    mock_response.side_effect = Exception("Stripe API error: Card declined")
    return mock_response


# ==============================================================================
# Database Fixtures
# ==============================================================================

@pytest_asyncio.fixture
async def db_connection():
    """
    Provide a real database connection to Supabase for integration tests.

    Loads DATABASE_URL from .env file via python-dotenv.
    This connects to the remote Supabase database configured in backend/.env

    Connection string should be in format:
    postgresql://user.project:password@pooler.supabase.com:6543/postgres

    Yields:
        asyncpg.Connection: Active database connection for test execution
    """
    # Load environment variables from .env file
    load_dotenv()
    database_url = os.getenv("DATABASE_URL")

    if not database_url:
        pytest.skip(
            "DATABASE_URL not set in environment. "
            "Configure it in backend/.env file."
        )

    try:
        # Set statement_cache_size=0 to avoid conflicts with Supabase pgbouncer
        # (pgbouncer uses transaction mode which doesn't support prepared statements)
        conn = await asyncpg.connect(
            database_url,
            statement_cache_size=0
        )
    except asyncpg.InvalidPasswordError as e:
        pytest.fail(
            f"Database authentication failed. "
            f"Check DATABASE_URL in backend/.env. "
            f"Error: {str(e)}"
        )
    except asyncpg.PostgresError as e:
        pytest.fail(
            f"Database connection error: {str(e)}. "
            f"Verify DATABASE_URL is correct and database is accessible."
        )

    yield conn
    await conn.close()


@pytest_asyncio.fixture
async def test_user(db_connection):
    """
    Create a test user with trial credits for testing.

    Automatically cleans up after test completes.
    """
    user_id = await db_connection.fetchval("""
        INSERT INTO users (
            email, email_verified,
            trial_remaining, trial_used,
            subscription_tier, subscription_status
        ) VALUES (
            $1, true, 3, 0, 'free', 'inactive'
        )
        RETURNING id
    """, f"test+{datetime.now().timestamp()}@yarda.ai")

    yield user_id

    # Cleanup
    await db_connection.execute("DELETE FROM users WHERE id = $1", user_id)


@pytest_asyncio.fixture
async def token_user(db_connection):
    """
    Create a test user with no trials (token balance only).

    Automatically cleans up after test completes.
    """
    user_id = await db_connection.fetchval("""
        INSERT INTO users (
            email, email_verified,
            trial_remaining, trial_used,
            subscription_tier, subscription_status
        ) VALUES (
            $1, true, 0, 3, 'free', 'inactive'
        )
        RETURNING id
    """, f"test+tokens+{datetime.now().timestamp()}@yarda.ai")

    yield user_id

    # Cleanup
    await db_connection.execute("DELETE FROM users WHERE id = $1", user_id)


@pytest_asyncio.fixture
async def subscriber_user(db_connection):
    """
    Create a test user with active subscription.

    Automatically cleans up after test completes.
    """
    user_id = await db_connection.fetchval("""
        INSERT INTO users (
            email, email_verified,
            trial_remaining, trial_used,
            subscription_tier, subscription_status,
            stripe_subscription_id, current_period_end
        ) VALUES (
            $1, true, 0, 3, 'monthly_pro', 'active',
            $2, $3
        )
        RETURNING id
    """,
        f"test+sub+{datetime.now().timestamp()}@yarda.ai",
        "sub_test_" + str(int(datetime.now().timestamp())),
        datetime.now() + timedelta(days=30)
    )

    yield user_id

    # Cleanup
    await db_connection.execute("DELETE FROM users WHERE id = $1", user_id)


# ==============================================================================
# Test Data Fixtures
# ==============================================================================

@pytest.fixture
def sample_generation_request():
    """
    Provide sample generation request data for testing.
    """
    return {
        "address": "1600 Amphitheatre Parkway, Mountain View, CA",
        "area": "Front Yard",
        "style": "Modern Minimalist",
        "prompt": "Create a minimalist front yard design with native plants",
        "preservation_strength": 0.5
    }


@pytest.fixture
def sample_stripe_webhook_event():
    """
    Provide sample Stripe webhook event for testing.
    """
    return {
        "id": "evt_test_webhook",
        "type": "checkout.session.completed",
        "data": {
            "object": {
                "id": "cs_test_checkout",
                "customer": "cus_test_customer",
                "client_reference_id": "test-user-id",
                "amount_total": 2900,
                "payment_status": "paid",
                "metadata": {
                    "package": "starter",
                    "tokens": 20
                }
            }
        }
    }


# ==============================================================================
# Utility Fixtures
# ==============================================================================

@pytest.fixture
def mock_datetime(mocker):
    """
    Mock datetime for testing time-sensitive logic.

    Example:
        def test_subscription_expiry(mock_datetime):
            mock_datetime.return_value = datetime(2025, 11, 6, 12, 0, 0)
            # Test logic with fixed time
    """
    mock_now = mocker.patch("datetime.datetime")
    return mock_now


@pytest.fixture(autouse=True)
def reset_singletons():
    """
    Reset singleton instances between tests to avoid state leakage.

    This runs automatically for all tests.
    """
    # Add singleton reset logic here if needed
    yield
    # Cleanup after test
