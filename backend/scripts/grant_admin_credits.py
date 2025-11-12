#!/usr/bin/env python3
"""
Grant unlimited holiday credits to admin account.
Run this script to set admin privileges and holiday credits.
"""

import asyncio
import asyncpg
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")
ADMIN_EMAIL = "thetangstr@gmail.com"
HOLIDAY_CREDITS = 9999  # Effectively unlimited
TRIAL_CREDITS = 100  # Bonus trial credits
TOKEN_CREDITS = 1000  # Bonus token credits

async def grant_admin_credits():
    """Grant unlimited credits to admin account."""

    # Connect to database
    conn = await asyncpg.connect(DATABASE_URL)

    try:
        # Find the admin user
        user = await conn.fetchrow(
            "SELECT id, email, holiday_credits, trial_remaining FROM users WHERE email = $1",
            ADMIN_EMAIL
        )

        if not user:
            print(f"❌ User {ADMIN_EMAIL} not found in database")
            print("Please sign in at least once to create your user account")
            return

        print(f"Found user: {user['email']} (ID: {user['id']})")
        print(f"Current credits - Holiday: {user['holiday_credits']}, Trial: {user['trial_remaining']}")

        # Update credits for admin
        await conn.execute("""
            UPDATE users
            SET
                holiday_credits = $1,
                holiday_credits_earned = $1,
                trial_remaining = $2,
                trial_used = 0
            WHERE email = $3
        """, HOLIDAY_CREDITS, TRIAL_CREDITS, ADMIN_EMAIL)

        # Also add token balance
        await conn.execute("""
            INSERT INTO tokens (user_id, amount, balance_after, transaction_type, description)
            VALUES ($1, $2, $2, 'admin_grant', 'Admin credit grant')
            ON CONFLICT DO NOTHING
        """, user['id'], TOKEN_CREDITS)

        # Verify the update
        updated_user = await conn.fetchrow(
            "SELECT holiday_credits, holiday_credits_earned, trial_remaining FROM users WHERE email = $1",
            ADMIN_EMAIL
        )

        print("\n✅ Credits granted successfully!")
        print(f"Holiday credits: {updated_user['holiday_credits']}")
        print(f"Holiday credits earned: {updated_user['holiday_credits_earned']}")
        print(f"Trial credits: {updated_user['trial_remaining']}")
        print(f"Token balance: {TOKEN_CREDITS} (added)")

    finally:
        await conn.close()

if __name__ == "__main__":
    asyncio.run(grant_admin_credits())