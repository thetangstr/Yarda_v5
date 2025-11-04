"""
Integration tests for email validation in registration endpoint.

Tests ensure:
1. RFC 5322 compliant emails are accepted (including + symbol)
2. Invalid emails are properly rejected
3. No HTTP 500 errors on valid email formats
"""

import pytest
from httpx import AsyncClient
from src.main import app


@pytest.mark.asyncio
async def test_registration_with_plus_addressing():
    """Test that emails with + symbol (plus addressing) are accepted."""
    async with AsyncClient(app=app, base_url="http://test") as client:
        response = await client.post(
            "/auth/register",
            json={
                "email": "test+tag@example.com",
                "password": "securepassword123"
            }
        )

        # Should succeed (201 Created or 400 if already exists)
        assert response.status_code in [201, 400], f"Unexpected status: {response.status_code}"

        if response.status_code == 201:
            data = response.json()
            assert data["email"] == "test+tag@example.com"
            assert data["trial_remaining"] == 3
            assert data["verification_sent"] is True
        else:
            # If 400, should be duplicate email error, not validation error
            data = response.json()
            assert "already exists" in data["detail"].lower()


@pytest.mark.asyncio
async def test_registration_with_various_valid_emails():
    """Test that various RFC 5322 compliant emails are accepted."""
    valid_emails = [
        "user+123@domain.com",
        "first.last@example.com",
        "user_name@example.com",
        "test@sub-domain.example.com",
    ]

    async with AsyncClient(app=app, base_url="http://test") as client:
        for email in valid_emails:
            response = await client.post(
                "/auth/register",
                json={
                    "email": email,
                    "password": "securepassword123"
                }
            )

            # Should succeed (201 Created or 400 if already exists)
            assert response.status_code in [201, 400], \
                f"Email '{email}' failed with status {response.status_code}"

            # Should NOT be HTTP 500
            assert response.status_code != 500, \
                f"Email '{email}' caused HTTP 500 error"


@pytest.mark.asyncio
async def test_registration_with_invalid_emails():
    """Test that invalid emails are properly rejected with 422 Validation Error."""
    invalid_emails = [
        "notanemail",
        "missing@domain",
        "@nodomain.com",
        "user@",
        "user@@example.com",
    ]

    async with AsyncClient(app=app, base_url="http://test") as client:
        for email in invalid_emails:
            response = await client.post(
                "/auth/register",
                json={
                    "email": email,
                    "password": "securepassword123"
                }
            )

            # Should be validation error (422)
            assert response.status_code == 422, \
                f"Invalid email '{email}' should return 422, got {response.status_code}"


@pytest.mark.asyncio
async def test_login_with_plus_addressing():
    """Test that login works with emails containing + symbol."""
    test_email = "logintest+tag@example.com"
    test_password = "securepassword123"

    async with AsyncClient(app=app, base_url="http://test") as client:
        # First, register the user
        register_response = await client.post(
            "/auth/register",
            json={
                "email": test_email,
                "password": test_password
            }
        )

        # If already exists, that's fine
        assert register_response.status_code in [201, 400]

        # Try to login
        login_response = await client.post(
            "/auth/login",
            json={
                "email": test_email,
                "password": test_password
            }
        )

        # Login should work
        assert login_response.status_code == 200, \
            f"Login failed with status {login_response.status_code}"

        data = login_response.json()
        assert "access_token" in data
        assert data["user"]["email"] == test_email.lower()


@pytest.mark.asyncio
async def test_email_case_normalization():
    """Test that emails are normalized to lowercase."""
    async with AsyncClient(app=app, base_url="http://test") as client:
        response = await client.post(
            "/auth/register",
            json={
                "email": "TEST+TAG@EXAMPLE.COM",
                "password": "securepassword123"
            }
        )

        # Should succeed (201 Created or 400 if already exists)
        assert response.status_code in [201, 400]

        if response.status_code == 201:
            data = response.json()
            # Email should be normalized to lowercase
            assert data["email"] == "test+tag@example.com"
