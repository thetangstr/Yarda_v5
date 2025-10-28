#!/usr/bin/env python3
"""
Verification script to check implementation completeness

Run this script to verify all files are created and imports work correctly.
"""

import sys
import os
from pathlib import Path


def check_file_exists(filepath, description):
    """Check if a file exists and print result"""
    exists = Path(filepath).exists()
    status = "✓" if exists else "✗"
    print(f"{status} {description}: {filepath}")
    return exists


def check_import(module_path, description):
    """Check if a module can be imported"""
    try:
        __import__(module_path)
        print(f"✓ {description}: {module_path}")
        return True
    except ImportError as e:
        print(f"✗ {description}: {module_path}")
        print(f"  Error: {e}")
        return False


def main():
    """Run verification checks"""
    print("=" * 60)
    print("Yarda Backend Implementation Verification")
    print("=" * 60)
    print()

    # Change to backend directory
    backend_dir = Path(__file__).parent
    os.chdir(backend_dir)

    # Add src to path for imports
    sys.path.insert(0, str(backend_dir))

    all_checks = []

    print("1. Checking File Structure")
    print("-" * 60)

    files_to_check = [
        ("src/models/generation.py", "Generation models"),
        ("src/services/credit_service.py", "Credit service"),
        ("src/services/generation_service.py", "Generation service"),
        ("src/api/endpoints/generations.py", "Generations endpoints"),
        ("src/api/endpoints/credits.py", "Credits endpoints"),
        ("src/models/__init__.py", "Models package init"),
        ("src/services/__init__.py", "Services package init"),
        ("src/api/endpoints/__init__.py", "Endpoints package init"),
        ("tests/conftest.py", "Test fixtures"),
        ("tests/test_services.py", "Unit tests"),
        ("IMPLEMENTATION_SUMMARY.md", "Implementation docs"),
        ("README.md", "README"),
        ("src/main.py", "Main application"),
    ]

    for filepath, description in files_to_check:
        all_checks.append(check_file_exists(filepath, description))

    print()
    print("2. Checking Module Imports")
    print("-" * 60)

    imports_to_check = [
        ("src.models.generation", "Generation models"),
        ("src.services.credit_service", "Credit service"),
        ("src.services.generation_service", "Generation service"),
        ("src.api.endpoints.generations", "Generations endpoints"),
        ("src.api.endpoints.credits", "Credits endpoints"),
    ]

    for module_path, description in imports_to_check:
        all_checks.append(check_import(module_path, description))

    print()
    print("3. Checking Model Classes")
    print("-" * 60)

    try:
        from src.models.generation import (
            Generation,
            GenerationCreate,
            GenerationStatus,
            InputType,
            CreditType,
            CreditBalance,
            GenerationListResponse
        )
        print("✓ All generation model classes imported successfully")
        all_checks.append(True)

        # Test model creation
        test_create = GenerationCreate(
            input_type=InputType.PHOTO,
            input_photo_url="https://example.com/test.jpg",
            style="modern"
        )
        print("✓ GenerationCreate model instantiation works")
        all_checks.append(True)

    except Exception as e:
        print(f"✗ Generation models import failed: {e}")
        all_checks.append(False)

    print()
    print("4. Checking Service Classes")
    print("-" * 60)

    try:
        from src.services.credit_service import CreditService
        from src.services.generation_service import GenerationService
        print("✓ Service classes imported successfully")
        all_checks.append(True)

        # Check methods exist
        credit_methods = ['consume_credit', 'refund_credit', 'get_credit_balance']
        for method in credit_methods:
            if hasattr(CreditService, method):
                print(f"  ✓ CreditService.{method} exists")
            else:
                print(f"  ✗ CreditService.{method} missing")
                all_checks.append(False)

        gen_methods = [
            'create_generation',
            'get_generation',
            'list_user_generations',
            'update_generation_status',
            'handle_generation_failure'
        ]
        for method in gen_methods:
            if hasattr(GenerationService, method):
                print(f"  ✓ GenerationService.{method} exists")
            else:
                print(f"  ✗ GenerationService.{method} missing")
                all_checks.append(False)

    except Exception as e:
        print(f"✗ Service classes import failed: {e}")
        all_checks.append(False)

    print()
    print("5. Checking API Endpoints")
    print("-" * 60)

    try:
        from src.api.endpoints.generations import router as gen_router
        from src.api.endpoints.credits import router as credit_router

        print(f"✓ Generations router has {len(gen_router.routes)} routes")
        for route in gen_router.routes:
            print(f"  - {route.methods} {route.path}")

        print(f"✓ Credits router has {len(credit_router.routes)} routes")
        for route in credit_router.routes:
            print(f"  - {route.methods} {route.path}")

        all_checks.append(True)

    except Exception as e:
        print(f"✗ API endpoints import failed: {e}")
        all_checks.append(False)

    print()
    print("6. Summary")
    print("=" * 60)

    passed = sum(all_checks)
    total = len(all_checks)
    percentage = (passed / total * 100) if total > 0 else 0

    print(f"Passed: {passed}/{total} ({percentage:.1f}%)")
    print()

    if passed == total:
        print("✓ All checks passed! Implementation is complete.")
        print()
        print("Next steps:")
        print("1. Set up .env file with Supabase credentials")
        print("2. Run database migrations: supabase db push")
        print("3. Run tests: pytest -v")
        print("4. Start server: python -m uvicorn src.main:app --reload")
        return 0
    else:
        print("✗ Some checks failed. Please review the output above.")
        return 1


if __name__ == "__main__":
    sys.exit(main())
