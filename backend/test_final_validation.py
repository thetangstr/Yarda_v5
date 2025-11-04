"""
Final comprehensive validation test.

This script simulates real-world scenarios to ensure the email validation
fix works correctly end-to-end.
"""

import sys
from pathlib import Path

# Add src to path
sys.path.insert(0, str(Path(__file__).parent / "src"))

from models.user import UserRegisterRequest, LoginRequest, PasswordResetRequest
from pydantic import ValidationError


def test_comprehensive_scenarios():
    """Test comprehensive real-world scenarios."""

    print("\n" + "="*70)
    print("COMPREHENSIVE EMAIL VALIDATION TEST")
    print("="*70)

    scenarios = [
        {
            "name": "Plus Addressing for Gmail Filtering",
            "email": "user+receipts@gmail.com",
            "should_pass": True
        },
        {
            "name": "Plus Addressing with Numbers",
            "email": "developer+test123@company.com",
            "should_pass": True
        },
        {
            "name": "Corporate Email with Dots",
            "email": "first.last@company.com",
            "should_pass": True
        },
        {
            "name": "Underscore in Local Part",
            "email": "user_name@example.com",
            "should_pass": True
        },
        {
            "name": "Subdomain Email",
            "email": "admin@mail.example.com",
            "should_pass": True
        },
        {
            "name": "Hyphenated Domain",
            "email": "user@my-company.com",
            "should_pass": True
        },
        {
            "name": "Short Email",
            "email": "a@b.io",
            "should_pass": True
        },
        {
            "name": "Mixed Case (Should Normalize)",
            "email": "User+Tag@Example.COM",
            "should_pass": True,
            "expected_normalized": "user+tag@example.com"
        },
        {
            "name": "Invalid - No Domain",
            "email": "user@",
            "should_pass": False
        },
        {
            "name": "Invalid - No @",
            "email": "userexample.com",
            "should_pass": False
        },
        {
            "name": "Invalid - Double @",
            "email": "user@@example.com",
            "should_pass": False
        },
        {
            "name": "Invalid - No TLD",
            "email": "user@localhost",
            "should_pass": False
        },
        {
            "name": "Invalid - Space in Email",
            "email": "user name@example.com",
            "should_pass": False
        }
    ]

    passed = 0
    failed = 0

    for scenario in scenarios:
        print(f"\nTest: {scenario['name']}")
        print(f"  Email: {scenario['email']}")
        print(f"  Expected: {'PASS' if scenario['should_pass'] else 'FAIL'}")

        try:
            # Test with UserRegisterRequest
            request = UserRegisterRequest(
                email=scenario['email'],
                password="SecurePass123!"
            )

            if scenario['should_pass']:
                normalized = request.email
                print(f"  Result: ✓ PASSED - Normalized to: {normalized}")

                # Check if normalization is correct
                if 'expected_normalized' in scenario:
                    if normalized == scenario['expected_normalized']:
                        print(f"  Normalization: ✓ Correct")
                    else:
                        print(f"  Normalization: ✗ Expected {scenario['expected_normalized']}, got {normalized}")
                        failed += 1
                        continue

                passed += 1
            else:
                print(f"  Result: ✗ FAILED - Should have been rejected")
                failed += 1

        except ValidationError as e:
            if not scenario['should_pass']:
                error_msg = str(e.errors()[0]['msg'])
                print(f"  Result: ✓ PASSED - Correctly rejected: {error_msg}")
                passed += 1
            else:
                print(f"  Result: ✗ FAILED - Should have been accepted")
                print(f"  Error: {e.errors()[0]['msg']}")
                failed += 1

    # Test multiple model types
    print("\n" + "-"*70)
    print("Testing Multiple Model Types with Plus Addressing")
    print("-"*70)

    test_email = "test+validation@example.com"

    try:
        # Test UserRegisterRequest
        reg = UserRegisterRequest(email=test_email, password="password123")
        print(f"✓ UserRegisterRequest: {reg.email}")

        # Test LoginRequest
        login = LoginRequest(email=test_email, password="password123")
        print(f"✓ LoginRequest: {login.email}")

        # Test PasswordResetRequest
        reset = PasswordResetRequest(email=test_email)
        print(f"✓ PasswordResetRequest: {reset.email}")

        print("\n✓ All model types accept plus addressing!")
        passed += 3

    except ValidationError as e:
        print(f"\n✗ Model validation failed: {e}")
        failed += 3

    # Summary
    print("\n" + "="*70)
    print("TEST SUMMARY")
    print("="*70)
    print(f"Total Tests: {passed + failed}")
    print(f"Passed: {passed}")
    print(f"Failed: {failed}")

    if failed == 0:
        print("\n🎉 ALL TESTS PASSED! Email validation is working correctly.")
        print("="*70)
        return True
    else:
        print(f"\n❌ {failed} test(s) failed. Please review the output above.")
        print("="*70)
        return False


if __name__ == "__main__":
    success = test_comprehensive_scenarios()
    sys.exit(0 if success else 1)
