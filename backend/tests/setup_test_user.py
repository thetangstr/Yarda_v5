#!/usr/bin/env python3
"""
Setup Script for Test User (test@yarda.local)

Creates or updates a specific test user with full trial credits.

Usage:
    python tests/setup_test_user.py
"""

import asyncio
import asyncpg
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")
TEST_EMAIL = "test@yarda.local"


async def setup_test_user():
    """Create or update test user with trial credits"""

    if not DATABASE_URL:
        print("❌ DATABASE_URL not found in environment")
        print("   Make sure backend/.env exists with DATABASE_URL")
        return False

    print("\n" + "=" * 80)
    print(f"🔧 SETUP TEST USER: {TEST_EMAIL}")
    print("=" * 80)

    try:
        print(f"\n🔌 Connecting to database...")
        conn = await asyncpg.connect(DATABASE_URL, statement_cache_size=0)
        print("✅ Connected to Supabase\n")

        # Check if user already exists
        existing = await conn.fetchrow(
            "SELECT id, email, trial_remaining FROM users WHERE email = $1",
            TEST_EMAIL
        )

        if existing:
            print(f"Found existing user: {TEST_EMAIL}")
            print(f"  ID: {existing['id']}")
            print(f"  Current trial credits: {existing['trial_remaining']}")

            # Update to 3 trial credits
            await conn.execute(
                "UPDATE users SET trial_remaining = $1, trial_used = 0 WHERE email = $2",
                3,
                TEST_EMAIL
            )
            print(f"  Updated trial credits: 3/3 ✅")
            user_id = existing['id']
        else:
            # Create new user
            print(f"Creating new user: {TEST_EMAIL}")
            user_id = await conn.fetchval("""
                INSERT INTO users (
                    email,
                    email_verified,
                    trial_remaining,
                    trial_used,
                    subscription_tier,
                    subscription_status
                ) VALUES (
                    $1, true, $2, $3, $4, $5
                )
                RETURNING id
            """,
                TEST_EMAIL,
                3,  # trial_remaining
                0,  # trial_used
                None,  # subscription_tier
                "inactive"  # subscription_status
            )
            print(f"  Created with ID: {user_id}")
            print(f"  Trial credits: 3/3 ✅")

        # Verify final state
        final_user = await conn.fetchrow(
            "SELECT id, email, trial_remaining, trial_used FROM users WHERE email = $1",
            TEST_EMAIL
        )

        print(f"\n📊 Final User State:")
        print(f"  Email: {final_user['email']}")
        print(f"  ID: {final_user['id']}")
        print(f"  Trial Credits: {final_user['trial_remaining']}/3")
        print(f"  Trial Used: {final_user['trial_used']}")

        # Close connection
        await conn.close()

        print("\n" + "=" * 80)
        print("✅ TEST USER SETUP COMPLETE")
        print("=" * 80)
        print(f"\n🔐 Login Credentials:")
        print(f"  Email: {TEST_EMAIL}")
        print(f"  Password: Use any password (email-based auth via Supabase)")
        print(f"\n✨ User is ready to test generation with 3 trial credits!")
        print()

        return True

    except Exception as e:
        print(f"\n❌ Error: {e}")
        import traceback
        traceback.print_exc()
        return False


if __name__ == "__main__":
    success = asyncio.run(setup_test_user())
    exit(0 if success else 1)
