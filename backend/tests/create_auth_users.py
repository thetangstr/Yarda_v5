"""
Create Supabase Auth Users for Test Accounts

This script creates auth.users entries for test accounts using Supabase Admin API.
Requires SUPABASE_SERVICE_ROLE_KEY (admin key) in .env

Usage:
    python tests/create_auth_users.py
    python tests/create_auth_users.py --reset  # Delete and recreate
"""

import asyncio
import os
import httpx
from dotenv import load_dotenv

load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL", "https://gxlmnjnjvlslijiowamn.supabase.co")
SUPABASE_SERVICE_ROLE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")

# Test password for all accounts
TEST_PASSWORD = "TestPassword123!"

TEST_ACCOUNTS = [
    {
        "id": "301dd4e9-7866-43d5-8550-dc64ff6d1fa2",
        "email": "test+trial@yarda.ai",
        "description": "Trial user with 3 credits"
    },
    {
        "id": "d8e86fbd-045d-422f-94e2-c6aa3f6a7b92",
        "email": "test+exhausted@yarda.ai",
        "description": "Trial exhausted, no tokens"
    },
    {
        "id": "655c468d-7623-46b7-82f2-75c99977633b",
        "email": "test+tokens@yarda.ai",
        "description": "50 tokens available"
    },
    {
        "id": "26c3bd34-d808-45a9-81a8-07e1c3166c3a",
        "email": "test+subscriber@yarda.ai",
        "description": "Active Pro subscription"
    },
    {
        "id": "b0355f7d-6553-460b-8484-3124383ef5b0",
        "email": "test+rich@yarda.ai",
        "description": "500 tokens + subscription"
    }
]


async def create_auth_user(client: httpx.AsyncClient, account: dict) -> dict:
    """Create a Supabase Auth user via Admin API"""

    url = f"{SUPABASE_URL}/auth/v1/admin/users"
    headers = {
        "apikey": SUPABASE_SERVICE_ROLE_KEY,
        "Authorization": f"Bearer {SUPABASE_SERVICE_ROLE_KEY}",
        "Content-Type": "application/json"
    }

    payload = {
        "email": account["email"],
        "password": TEST_PASSWORD,
        "email_confirm": True,  # Auto-confirm email
        "user_metadata": {
            "description": account["description"]
        }
    }

    # If we want to use the specific UUID from public.users
    # Note: This might not work if the user already exists
    # We'll try without specifying ID first, then update the public.users table

    try:
        response = await client.post(url, headers=headers, json=payload)
        response.raise_for_status()
        user_data = response.json()
        return user_data
    except httpx.HTTPStatusError as e:
        if e.response.status_code == 422:
            print(f"⚠️  User {account['email']} might already exist")
            # Try to get existing user
            return await get_auth_user(client, account["email"])
        else:
            raise


async def get_auth_user(client: httpx.AsyncClient, email: str) -> dict:
    """Get existing auth user by email"""

    url = f"{SUPABASE_URL}/auth/v1/admin/users"
    headers = {
        "apikey": SUPABASE_SERVICE_ROLE_KEY,
        "Authorization": f"Bearer {SUPABASE_SERVICE_ROLE_KEY}"
    }

    response = await client.get(url, headers=headers)
    response.raise_for_status()

    users = response.json().get("users", [])
    for user in users:
        if user["email"] == email:
            return user

    return None


async def delete_auth_user(client: httpx.AsyncClient, user_id: str) -> None:
    """Delete a Supabase Auth user"""

    url = f"{SUPABASE_URL}/auth/v1/admin/users/{user_id}"
    headers = {
        "apikey": SUPABASE_SERVICE_ROLE_KEY,
        "Authorization": f"Bearer {SUPABASE_SERVICE_ROLE_KEY}"
    }

    try:
        response = await client.delete(url, headers=headers)
        response.raise_for_status()
    except httpx.HTTPStatusError as e:
        if e.response.status_code == 404:
            pass  # User doesn't exist, that's fine
        else:
            raise


async def update_public_users_id(client: httpx.AsyncClient, old_id: str, new_id: str, email: str) -> None:
    """Update public.users to match auth.users ID"""
    import asyncpg

    DATABASE_URL = os.getenv("DATABASE_URL")
    conn = await asyncpg.connect(DATABASE_URL, statement_cache_size=0)

    try:
        # Update users table
        await conn.execute("""
            UPDATE users
            SET id = $1
            WHERE id = $2
        """, new_id, old_id)

        # Update token accounts if they exist
        await conn.execute("""
            UPDATE users_token_accounts
            SET user_id = $1
            WHERE user_id = $2
        """, new_id, old_id)

        print(f"   Updated public.users.id: {old_id} → {new_id}")
    finally:
        await conn.close()


async def sync_auth_to_public_users(client: httpx.AsyncClient) -> None:
    """Sync auth.users IDs to public.users"""
    import asyncpg

    DATABASE_URL = os.getenv("DATABASE_URL")
    conn = await asyncpg.connect(DATABASE_URL, statement_cache_size=0)

    try:
        for account in TEST_ACCOUNTS:
            # Get auth user
            auth_user = await get_auth_user(client, account["email"])
            if not auth_user:
                continue

            auth_id = auth_user["id"]
            public_id = account["id"]

            if auth_id != public_id:
                print(f"⚠️  ID mismatch for {account['email']}")
                print(f"   Auth ID:   {auth_id}")
                print(f"   Public ID: {public_id}")
                print(f"   Updating public.users to match auth.users...")

                await update_public_users_id(client, public_id, auth_id, account["email"])
    finally:
        await conn.close()


async def main():
    import sys

    if not SUPABASE_SERVICE_ROLE_KEY:
        print("❌ SUPABASE_SERVICE_ROLE_KEY not found in .env")
        print("   Get this from: https://supabase.com/dashboard/project/gxlmnjnjvlslijiowamn/settings/api")
        print("   Look for 'service_role' key (not 'anon' key)")
        return 1

    print("\n" + "=" * 80)
    print("🔐 SUPABASE AUTH USER CREATION")
    print("=" * 80)

    reset = "--reset" in sys.argv

    async with httpx.AsyncClient(timeout=30.0) as client:
        if reset:
            print("\n🗑️  Deleting existing auth users...")
            for account in TEST_ACCOUNTS:
                auth_user = await get_auth_user(client, account["email"])
                if auth_user:
                    await delete_auth_user(client, auth_user["id"])
                    print(f"   ✅ Deleted {account['email']}")
            print()

        print("\n👤 Creating auth users...")
        print(f"📝 Password for all accounts: {TEST_PASSWORD}\n")

        created_users = []

        for account in TEST_ACCOUNTS:
            print(f"Creating: {account['email']}")
            try:
                user_data = await create_auth_user(client, account)
                created_users.append(user_data)

                print(f"✅ {account['email']}")
                print(f"   Auth ID: {user_data['id']}")
                print(f"   Email confirmed: {user_data.get('email_confirmed_at', 'Yes')}")
                print(f"   Description: {account['description']}")
                print()
            except Exception as e:
                print(f"❌ Failed to create {account['email']}: {e}")
                print()

        # Sync IDs between auth.users and public.users
        print("\n🔄 Syncing auth.users IDs with public.users...")
        await sync_auth_to_public_users(client)

    print("\n" + "=" * 80)
    print("✅ AUTH USER CREATION COMPLETE")
    print("=" * 80)

    print(f"\n🔐 Login Credentials:")
    print(f"   Password (all accounts): {TEST_PASSWORD}")
    print(f"\n📍 Login URL:")
    print(f"   http://localhost:3000")
    print(f"\n💡 To login:")
    print(f"   1. Navigate to http://localhost:3000")
    print(f"   2. Click 'Sign In'")
    print(f"   3. Use email: test+exhausted@yarda.ai")
    print(f"   4. Use password: {TEST_PASSWORD}")
    print()

    return 0


if __name__ == "__main__":
    exit_code = asyncio.run(main())
    exit(exit_code)
