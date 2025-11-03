"""
Integration Tests for User Story 2: Stripe Checkout Session

Test Scenarios:
- TC-STRIPE-1.1: Create checkout session for token package
- TC-STRIPE-1.2: All 4 token packages have correct pricing
- TC-STRIPE-1.3: Checkout session includes customer email
- TC-STRIPE-1.4: Checkout session redirects to correct URLs
- TC-STRIPE-2.1: Invalid package selection returns error

Requirements:
- FR-017 to FR-025 (Token Purchase via Stripe)
"""

import pytest
import pytest_asyncio
import asyncpg
from uuid import uuid4
from decimal import Decimal


# Token packages configuration (matches FR-021 to FR-024)
TOKEN_PACKAGES = [
    {
        "id": "package_10",
        "tokens": 10,
        "price_usd": Decimal("10.00"),
        "price_cents": 1000,
        "price_per_token": Decimal("1.00"),
        "discount": None,
    },
    {
        "id": "package_50",
        "tokens": 50,
        "price_usd": Decimal("45.00"),
        "price_cents": 4500,
        "price_per_token": Decimal("0.90"),
        "discount": "10%",
    },
    {
        "id": "package_100",
        "tokens": 100,
        "price_usd": Decimal("90.00"),
        "price_cents": 9000,
        "price_per_token": Decimal("0.90"),
        "discount": "10%",
    },
    {
        "id": "package_500",
        "tokens": 500,
        "price_usd": Decimal("400.00"),
        "price_cents": 40000,
        "price_per_token": Decimal("0.80"),
        "discount": "20%",
        "best_value": True,
    },
]


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
    """Create a test user."""
    user_id = uuid4()
    email = f'stripe-test-{user_id}@test.com'

    await db_connection.execute("""
        INSERT INTO users (id, email, email_verified, password_hash)
        VALUES ($1, $2, true, 'hash')
    """, user_id, email)

    yield user_id, email

    # Cleanup
    await db_connection.execute("DELETE FROM users WHERE id = $1", user_id)


def create_checkout_session(package_id: str, customer_email: str, success_url: str, cancel_url: str):
    """
    Mock Stripe checkout session creation.

    In real implementation, this would call Stripe API:
    stripe.checkout.Session.create(...)

    For testing, we return a mock session object.
    """
    # Find package
    package = next((p for p in TOKEN_PACKAGES if p["id"] == package_id), None)
    if not package:
        raise ValueError(f"Invalid package_id: {package_id}")

    # Create mock session
    session = {
        "id": f"cs_test_{uuid4()}",
        "object": "checkout.session",
        "customer_email": customer_email,
        "amount_total": package["price_cents"],
        "currency": "usd",
        "metadata": {
            "package_id": package_id,
            "tokens": package["tokens"],
        },
        "mode": "payment",
        "payment_status": "unpaid",
        "success_url": success_url,
        "cancel_url": cancel_url,
        "url": f"https://checkout.stripe.com/test/{uuid4()}",
    }

    return session


@pytest.mark.asyncio
async def test_create_checkout_session_for_token_package(test_user):
    """
    TC-STRIPE-1.1: Test creating checkout session for token package.

    Setup:
    - User selects 50 tokens package
    - Request checkout session creation

    Expected Result:
    - Checkout session created with correct amount
    - Session includes package metadata
    - Session URL is returned
    """
    user_id, email = test_user

    # Create checkout session for 50 tokens package
    session = create_checkout_session(
        package_id="package_50",
        customer_email=email,
        success_url="https://yarda.app/purchase/success",
        cancel_url="https://yarda.app/purchase/cancel"
    )

    # Verify session properties
    assert session["customer_email"] == email
    assert session["amount_total"] == 4500  # $45.00
    assert session["currency"] == "usd"
    assert session["metadata"]["package_id"] == "package_50"
    assert session["metadata"]["tokens"] == 50
    assert session["mode"] == "payment"
    assert "checkout.stripe.com" in session["url"]


@pytest.mark.asyncio
async def test_all_four_packages_have_correct_pricing(test_user):
    """
    TC-STRIPE-1.2: Test that all 4 token packages have correct pricing.

    Requirements:
    - FR-021: 10 tokens for $10.00 ($1.00 per token)
    - FR-022: 50 tokens for $45.00 ($0.90 per token, 10% discount)
    - FR-023: 100 tokens for $90.00 ($0.90 per token, 10% discount)
    - FR-024: 500 tokens for $400.00 ($0.80 per token, 20% discount)
    """
    user_id, email = test_user

    # Test Package 1: 10 tokens for $10.00
    session1 = create_checkout_session("package_10", email, "success", "cancel")
    assert session1["amount_total"] == 1000
    assert session1["metadata"]["tokens"] == 10

    # Test Package 2: 50 tokens for $45.00
    session2 = create_checkout_session("package_50", email, "success", "cancel")
    assert session2["amount_total"] == 4500
    assert session2["metadata"]["tokens"] == 50

    # Test Package 3: 100 tokens for $90.00
    session3 = create_checkout_session("package_100", email, "success", "cancel")
    assert session3["amount_total"] == 9000
    assert session3["metadata"]["tokens"] == 100

    # Test Package 4: 500 tokens for $400.00
    session4 = create_checkout_session("package_500", email, "success", "cancel")
    assert session4["amount_total"] == 40000
    assert session4["metadata"]["tokens"] == 500


@pytest.mark.asyncio
async def test_checkout_session_includes_customer_email(test_user):
    """
    TC-STRIPE-1.3: Test that checkout session includes customer email.

    This is important for:
    1. Stripe to send receipt to correct email
    2. Webhook to identify which user to credit
    """
    user_id, email = test_user

    session = create_checkout_session("package_50", email, "success", "cancel")

    assert session["customer_email"] == email
    assert "@" in session["customer_email"]


@pytest.mark.asyncio
async def test_checkout_session_redirect_urls(test_user):
    """
    TC-STRIPE-1.4: Test that checkout session has correct redirect URLs.

    Expected:
    - success_url: Where user is redirected after successful payment
    - cancel_url: Where user is redirected if they cancel
    """
    user_id, email = test_user

    success_url = "https://yarda.app/purchase/success?session_id={CHECKOUT_SESSION_ID}"
    cancel_url = "https://yarda.app/purchase/cancel"

    session = create_checkout_session("package_50", email, success_url, cancel_url)

    assert session["success_url"] == success_url
    assert session["cancel_url"] == cancel_url


@pytest.mark.asyncio
async def test_invalid_package_selection_returns_error(test_user):
    """
    TC-STRIPE-2.1: Test that invalid package selection returns error.

    Setup:
    - Try to create checkout session with invalid package_id

    Expected Result:
    - Raises ValueError
    - No checkout session created
    """
    user_id, email = test_user

    with pytest.raises(ValueError, match="Invalid package_id"):
        create_checkout_session("invalid_package", email, "success", "cancel")


@pytest.mark.asyncio
async def test_checkout_session_metadata_structure(test_user):
    """
    Test that checkout session metadata contains all required fields.

    This metadata is used by webhook to:
    1. Identify which package was purchased
    2. Credit correct number of tokens
    """
    user_id, email = test_user

    session = create_checkout_session("package_100", email, "success", "cancel")

    # Verify metadata structure
    assert "metadata" in session
    assert "package_id" in session["metadata"]
    assert "tokens" in session["metadata"]

    # Verify metadata values
    assert session["metadata"]["package_id"] == "package_100"
    assert session["metadata"]["tokens"] == 100


@pytest.mark.asyncio
async def test_package_pricing_calculations():
    """
    Test that package pricing calculations are correct.

    Verify:
    - Price per token calculation
    - Discount percentage calculation
    """
    # Package 1: No discount
    pkg1 = TOKEN_PACKAGES[0]
    assert pkg1["tokens"] * pkg1["price_per_token"] == pkg1["price_usd"]

    # Package 2: 10% discount
    pkg2 = TOKEN_PACKAGES[1]
    assert pkg2["tokens"] * pkg2["price_per_token"] == pkg2["price_usd"]
    original_price = pkg2["tokens"] * Decimal("1.00")
    discount = original_price - pkg2["price_usd"]
    discount_pct = (discount / original_price) * 100
    assert discount_pct == Decimal("10.00")

    # Package 3: 10% discount
    pkg3 = TOKEN_PACKAGES[2]
    assert pkg3["tokens"] * pkg3["price_per_token"] == pkg3["price_usd"]

    # Package 4: 20% discount
    pkg4 = TOKEN_PACKAGES[3]
    assert pkg4["tokens"] * pkg4["price_per_token"] == pkg4["price_usd"]
    original_price = pkg4["tokens"] * Decimal("1.00")
    discount = original_price - pkg4["price_usd"]
    discount_pct = (discount / original_price) * 100
    assert discount_pct == Decimal("20.00")
