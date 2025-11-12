#!/usr/bin/env python3
"""Grant credits to admin account with pgbouncer compatibility."""

import asyncio
import asyncpg
import os
from dotenv import load_dotenv

load_dotenv()
DATABASE_URL = os.getenv("DATABASE_URL")

async def grant_credits():
    # Connect with statement_cache_size=0 for pgbouncer compatibility
    conn = await asyncpg.connect(DATABASE_URL, statement_cache_size=0)
    try:
        # Grant credits
        result = await conn.execute("""
            UPDATE users
            SET
                holiday_credits = 9999,
                holiday_credits_earned = 9999,
                trial_remaining = 100
            WHERE email = 'thetangstr@gmail.com'
        """)

        print(f"Update result: {result}")

        # Verify
        user = await conn.fetchrow(
            "SELECT email, holiday_credits, trial_remaining FROM users WHERE email = $1",
            'thetangstr@gmail.com'
        )

        if user:
            print(f"✅ Credits granted to {user['email']}")
            print(f"   Holiday credits: {user['holiday_credits']}")
            print(f"   Trial credits: {user['trial_remaining']}")
        else:
            print("❌ User not found - user may need to sign in first")
    finally:
        await conn.close()

if __name__ == "__main__":
    asyncio.run(grant_credits())