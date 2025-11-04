"""
Test email validation to ensure RFC 5322 compliance.

This script tests the email validation logic to ensure:
1. Valid emails with + symbol are accepted
2. Other RFC 5322 compliant emails are accepted
3. Invalid emails are properly rejected
"""

import sys
from pathlib import Path

# Add src to path
sys.path.insert(0, str(Path(__file__).parent / "src"))

from models.user import validate_email, UserRegisterRequest
from pydantic import ValidationError


def test_email_validation():
    """Test email validation with various inputs."""

    print("Testing Email Validation")
    print("=" * 60)

    # Valid emails that should be accepted
    valid_emails = [
        "test+tag@example.com",
        "user+123@domain.com",
        "first.last@example.com",
        "user_name@example.com",
        "user123@example.com",
        "test@sub-domain.example.com",
        "user%test@example.com",
        "a@b.co",
        "TEST@EXAMPLE.COM",  # Should be normalized to lowercase
    ]

    # Invalid emails that should be rejected
    invalid_emails = [
        "notanemail",
        "missing@domain",
        "@nodomain.com",
        "user@",
        "user@@example.com",
        "",
        "user @example.com",
        "user@.com",
        "user@domain.",
    ]

    print("\n✓ Testing VALID emails (should all pass):")
    print("-" * 60)

    for email in valid_emails:
        try:
            normalized = validate_email(email)
            print(f"  ✓ '{email}' -> '{normalized}'")
        except ValueError as e:
            print(f"  ✗ FAILED: '{email}' - {e}")
            return False

    print("\n✓ Testing INVALID emails (should all be rejected):")
    print("-" * 60)

    for email in invalid_emails:
        try:
            normalized = validate_email(email)
            print(f"  ✗ FAILED: '{email}' was accepted (should be rejected)")
            return False
        except ValueError as e:
            print(f"  ✓ '{email}' correctly rejected: {e}")

    print("\n✓ Testing Pydantic model validation:")
    print("-" * 60)

    # Test valid registration request
    try:
        request = UserRegisterRequest(
            email="test+tag@example.com",
            password="securepassword123"
        )
        print(f"  ✓ UserRegisterRequest with email '{request.email}' created successfully")
    except ValidationError as e:
        print(f"  ✗ FAILED: Valid email rejected by Pydantic: {e}")
        return False

    # Test invalid registration request
    try:
        request = UserRegisterRequest(
            email="notanemail",
            password="securepassword123"
        )
        print(f"  ✗ FAILED: Invalid email accepted by Pydantic")
        return False
    except ValidationError as e:
        print(f"  ✓ Invalid email correctly rejected by Pydantic")

    print("\n" + "=" * 60)
    print("✓ ALL TESTS PASSED!")
    print("=" * 60)

    return True


if __name__ == "__main__":
    success = test_email_validation()
    sys.exit(0 if success else 1)
