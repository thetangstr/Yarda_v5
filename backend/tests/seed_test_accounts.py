"""
Test Account Seeding Script

Creates test users with various account states for E2E testing:
- New user (3 trial credits)
- Trial exhausted (0 trial, 0 tokens)
- Token user (0 trial, 50 tokens)
- Subscriber (active subscription)

Usage:
    python tests/seed_test_accounts.py [--reset]

Options:
    --reset: Delete existing test accounts before creating new ones
"""

import asyncio
import asyncpg
import os
from datetime import datetime, timedelta
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")

# Test account configurations
TEST_ACCOUNTS = [
    {
        "email": "test+trial@yarda.ai",
        "trial_remaining": 3,
        "trial_used": 0,
        "subscription_tier": None,
        "subscription_status": "inactive",
        "description": "New trial user with 3 credits"
    },
    {
        "email": "test+exhausted@yarda.ai",
        "trial_remaining": 0,
        "trial_used": 3,
        "subscription_tier": None,
        "subscription_status": "inactive",
        "description": "Trial exhausted, no tokens"
    },
    {
        "email": "test+tokens@yarda.ai",
        "trial_remaining": 0,
        "trial_used": 3,
        "subscription_tier": None,
        "subscription_status": "inactive",
        "description": "Trial exhausted, 50 tokens available"
    },
    {
        "email": "test+subscriber@yarda.ai",
        "trial_remaining": 0,
        "trial_used": 3,
        "subscription_tier": "monthly_pro",
        "subscription_status": "active",
        "stripe_subscription_id": "sub_test_12345",
        "current_period_end": datetime.now() + timedelta(days=30),
        "description": "Active Pro subscription ($99/month)"
    },
    {
        "email": "test+rich@yarda.ai",
        "trial_remaining": 0,
        "trial_used": 3,
        "subscription_tier": "monthly_pro",
        "subscription_status": "active",
        "stripe_subscription_id": "sub_test_67890",
        "current_period_end": datetime.now() + timedelta(days=15),
        "description": "Active subscription + 500 tokens"
    }
]

async def reset_test_accounts(conn: asyncpg.Connection):
    """Delete all test accounts"""
    test_emails = [acc["email"] for acc in TEST_ACCOUNTS]

    print("\n🗑️  Deleting existing test accounts...")
    for email in test_emails:
        result = await conn.execute(
            "DELETE FROM users WHERE email = $1",
            email
        )
        print(f"   - {email}: {result}")

    print("✅ Test accounts deleted\n")


async def create_test_accounts(conn: asyncpg.Connection):
    """Create test accounts with various states"""

    print("🌱 Creating test accounts...\n")

    created_accounts = []

    for account in TEST_ACCOUNTS:
        # Check if user already exists
        existing = await conn.fetchrow(
            "SELECT id, email FROM users WHERE email = $1",
            account["email"]
        )

        if existing:
            print(f"⏭️  {account['email']} already exists (ID: {existing['id']})")
            created_accounts.append({"id": existing["id"], **account})
            continue

        # Insert user
        user_id = await conn.fetchval("""
            INSERT INTO users (
                email,
                email_verified,
                trial_remaining,
                trial_used,
                subscription_tier,
                subscription_status,
                stripe_subscription_id,
                current_period_end
            ) VALUES (
                $1, true, $2, $3, $4, $5, $6, $7
            )
            RETURNING id
        """,
            account["email"],
            account["trial_remaining"],
            account["trial_used"],
            account.get("subscription_tier"),
            account["subscription_status"],
            account.get("stripe_subscription_id"),
            account.get("current_period_end")
        )

        # Create token account if needed (for test+tokens and test+rich users)
        if "test+tokens" in account["email"] or "test+rich" in account["email"]:
            token_balance = 50 if "test+tokens" in account["email"] else 500
            await conn.execute("""
                INSERT INTO users_token_accounts (user_id, balance)
                VALUES ($1, $2)
                ON CONFLICT (user_id) DO UPDATE SET balance = $2
            """, user_id, token_balance)

        created_accounts.append({"id": user_id, **account})

        # Get token balance for display
        token_balance = 0
        if "test+tokens" in account["email"] or "test+rich" in account["email"]:
            token_row = await conn.fetchrow(
                "SELECT balance FROM users_token_accounts WHERE user_id = $1", user_id
            )
            token_balance = token_row["balance"] if token_row else 0

        print(f"✅ {account['email']}")
        print(f"   ID: {user_id}")
        print(f"   Description: {account['description']}")
        print(f"   Trial: {account['trial_remaining']}/3")
        print(f"   Tokens: {token_balance}")
        if account.get("subscription_tier"):
            print(f"   Subscription: {account['subscription_tier']} ({account['subscription_status']})")
        print()

    return created_accounts


async def display_account_summary(conn: asyncpg.Connection):
    """Display summary of all test accounts"""

    test_emails = [acc["email"] for acc in TEST_ACCOUNTS]

    print("\n" + "=" * 80)
    print("📊 TEST ACCOUNT SUMMARY")
    print("=" * 80 + "\n")

    for email in test_emails:
        user = await conn.fetchrow("""
            SELECT
                id,
                email,
                trial_remaining,
                trial_used,
                subscription_tier,
                subscription_status,
                created_at
            FROM users
            WHERE email = $1
        """, email)

        if user:
            # Get token balance
            token_row = await conn.fetchrow("""
                SELECT balance FROM users_token_accounts WHERE user_id = $1
            """, user['id'])
            token_balance = token_row['balance'] if token_row else 0

            print(f"Email: {user['email']}")
            print(f"  ID: {user['id']}")
            print(f"  Trial: {user['trial_remaining']}/3 (used: {user['trial_used']})")
            print(f"  Tokens: {token_balance}")
            print(f"  Subscription: {user['subscription_tier'] or 'None'} ({user['subscription_status']})")
            print(f"  Created: {user['created_at']}")
            print()


async def main():
    """Main execution"""
    import sys

    if not DATABASE_URL:
        print("❌ DATABASE_URL not found in environment")
        print("   Make sure backend/.env exists with DATABASE_URL")
        return

    print("\n" + "=" * 80)
    print("🌱 TEST ACCOUNT SEEDING")
    print("=" * 80)

    # Parse arguments
    reset = "--reset" in sys.argv

    try:
        # Connect to database (disable statement cache for Supabase pooler)
        print(f"\n🔌 Connecting to database...")
        conn = await asyncpg.connect(DATABASE_URL, statement_cache_size=0)
        print("✅ Connected to Supabase\n")

        # Reset if requested
        if reset:
            await reset_test_accounts(conn)

        # Create test accounts
        accounts = await create_test_accounts(conn)

        # Display summary
        await display_account_summary(conn)

        # Close connection
        await conn.close()

        print("=" * 80)
        print("✅ TEST ACCOUNT SEEDING COMPLETE")
        print("=" * 80)
        print(f"\n📝 Created {len(accounts)} test accounts")
        print("\n🔐 Test Account Credentials:")
        print("   Note: These accounts use email-based auth via Supabase.")
        print("   To login, use the Supabase Auth UI with these emails.")
        print("\n📚 Usage in E2E Tests:")
        print("   1. Use 'test+trial@yarda.ai' for trial flow testing")
        print("   2. Use 'test+exhausted@yarda.ai' for trial exhausted scenarios")
        print("   3. Use 'test+tokens@yarda.ai' for token purchase testing")
        print("   4. Use 'test+subscriber@yarda.ai' for subscription testing")
        print("   5. Use 'test+rich@yarda.ai' for multi-payment method testing")
        print("\n🔄 To reset and recreate:")
        print("   python tests/seed_test_accounts.py --reset")
        print()

    except Exception as e:
        print(f"\n❌ Error: {e}")
        import traceback
        traceback.print_exc()
        return 1

    return 0


if __name__ == "__main__":
    exit_code = asyncio.run(main())
    exit(exit_code)
