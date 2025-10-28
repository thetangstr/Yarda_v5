import pytest
import asyncio
from datetime import datetime, timedelta


class TestRateLimiting:
    """Integration tests for rolling window rate limiting"""

    @pytest.mark.asyncio
    async def test_check_rate_limit_allows_first_three_requests(self, supabase_client, verified_user):
        """Test that first 3 requests within 60 seconds are allowed"""
        user_id = verified_user['id']

        # Check rate limit 3 times
        for i in range(3):
            # Record attempt
            await supabase_client.table('rate_limits').insert({
                'user_id': user_id
            }).execute()

            # Check if under limit
            result = await supabase_client.rpc(
                'check_rate_limit', {'p_user_id': user_id}
            ).execute()

            assert result.data is True, f"Request {i + 1} should be allowed"

    @pytest.mark.asyncio
    async def test_check_rate_limit_blocks_fourth_request(self, supabase_client, verified_user):
        """Test that 4th request within 60 seconds is blocked"""
        user_id = verified_user['id']

        # Make 3 requests
        for _ in range(3):
            await supabase_client.table('rate_limits').insert({
                'user_id': user_id
            }).execute()

        # 4th request should be blocked
        result = await supabase_client.rpc(
            'check_rate_limit', {'p_user_id': user_id}
        ).execute()

        assert result.data is False, "4th request should be rate limited"

    @pytest.mark.asyncio
    async def test_rolling_window_allows_request_after_60_seconds(self, supabase_client, verified_user):
        """Test that requests older than 60 seconds don't count"""
        user_id = verified_user['id']

        # Create 3 old rate limit records (>60 seconds ago)
        old_timestamp = datetime.utcnow() - timedelta(seconds=65)

        for _ in range(3):
            # Insert with old timestamp (requires raw SQL)
            await supabase_client.table('rate_limits').insert({
                'user_id': user_id,
                'attempted_at': old_timestamp.isoformat()
            }).execute()

        # New request should be allowed (old ones don't count)
        result = await supabase_client.rpc(
            'check_rate_limit', {'p_user_id': user_id}
        ).execute()

        assert result.data is True, "Request should be allowed after window expires"

    @pytest.mark.asyncio
    async def test_cleanup_old_rate_limits(self, supabase_client, verified_user):
        """Test cleanup function removes old rate limit records"""
        user_id = verified_user['id']

        # Create old records (>2 minutes)
        old_timestamp = datetime.utcnow() - timedelta(minutes=3)

        for _ in range(5):
            await supabase_client.table('rate_limits').insert({
                'user_id': user_id,
                'attempted_at': old_timestamp.isoformat()
            }).execute()

        # Create recent record
        await supabase_client.table('rate_limits').insert({
            'user_id': user_id
        }).execute()

        # Run cleanup
        await supabase_client.rpc('cleanup_old_rate_limits', {}).execute()

        # Only recent record should remain
        records = await supabase_client.table('rate_limits').select('*').eq(
            'user_id', user_id
        ).execute()

        assert len(records.data) == 1, "Only recent record should remain after cleanup"

    @pytest.mark.asyncio
    async def test_rate_limit_per_user_isolation(self, supabase_client, verified_user):
        """Test that rate limits are per-user"""
        user1_id = verified_user['id']

        # Create second user
        timestamp = datetime.utcnow().timestamp()
        user2_response = await supabase_client.auth.sign_up({
            'email': f'ratelimit{timestamp}@example.com',
            'password': 'RateLimit123!'
        })
        user2_id = user2_response.user.id

        # User 1 makes 3 requests
        for _ in range(3):
            await supabase_client.table('rate_limits').insert({
                'user_id': user1_id
            }).execute()

        # User 1 should be rate limited
        user1_check = await supabase_client.rpc(
            'check_rate_limit', {'p_user_id': user1_id}
        ).execute()
        assert user1_check.data is False

        # User 2 should NOT be rate limited
        user2_check = await supabase_client.rpc(
            'check_rate_limit', {'p_user_id': user2_id}
        ).execute()
        assert user2_check.data is True

    @pytest.mark.asyncio
    async def test_count_attempts_in_window(self, supabase_client, verified_user):
        """Test counting attempts in the 60-second window"""
        user_id = verified_user['id']

        # Create 2 recent attempts
        for _ in range(2):
            await supabase_client.table('rate_limits').insert({
                'user_id': user_id
            }).execute()

        # Create 1 old attempt (outside window)
        old_timestamp = datetime.utcnow() - timedelta(seconds=70)
        await supabase_client.table('rate_limits').insert({
            'user_id': user_id,
            'attempted_at': old_timestamp.isoformat()
        }).execute()

        # Count recent attempts
        recent_count = await supabase_client.table('rate_limits').select(
            'id', count='exact'
        ).eq('user_id', user_id).gte(
            'attempted_at', (datetime.utcnow() - timedelta(seconds=60)).isoformat()
        ).execute()

        assert recent_count.count == 2, "Should count only attempts in last 60 seconds"

    @pytest.mark.asyncio
    async def test_concurrent_rate_limit_checks(self, supabase_client, verified_user):
        """Test that concurrent checks work correctly"""
        user_id = verified_user['id']

        # Add 2 existing attempts
        for _ in range(2):
            await supabase_client.table('rate_limits').insert({
                'user_id': user_id
            }).execute()

        # Make 3 concurrent checks
        checks = await asyncio.gather(*[
            supabase_client.rpc('check_rate_limit', {'p_user_id': user_id}).execute()
            for _ in range(3)
        ])

        # All should return True (only 2 existing attempts)
        assert all(check.data is True for check in checks)

    @pytest.mark.asyncio
    async def test_rate_limit_exact_boundary(self, supabase_client, verified_user):
        """Test rate limit at exactly 60 seconds boundary"""
        user_id = verified_user['id']

        # Create attempt at exactly 60 seconds ago
        boundary_timestamp = datetime.utcnow() - timedelta(seconds=60)

        await supabase_client.table('rate_limits').insert({
            'user_id': user_id,
            'attempted_at': boundary_timestamp.isoformat()
        }).execute()

        # This might be just inside or outside the window depending on implementation
        # The function checks for > NOW() - INTERVAL '60 seconds'
        result = await supabase_client.rpc(
            'check_rate_limit', {'p_user_id': user_id}
        ).execute()

        # Should be allowed (boundary case excluded from count)
        assert result.data is True


@pytest.fixture
async def verified_user(supabase_client):
    """Create a verified test user"""
    timestamp = datetime.utcnow().timestamp()
    email = f"verified{timestamp}@example.com"
    password = "VerifiedPassword123!"

    # Sign up
    response = await supabase_client.auth.sign_up({
        'email': email,
        'password': password
    })

    user_id = response.user.id

    # Mark as verified
    await supabase_client.table('users').update({
        'email_verified': True
    }).eq('id', user_id).execute()

    # Create token account
    await supabase_client.table('token_accounts').insert({
        'user_id': user_id,
        'balance': 0
    }).execute()

    return response.user


@pytest.fixture
def supabase_client():
    """Supabase client fixture"""
    from supabase import create_client
    import os

    url = os.getenv('SUPABASE_URL')
    key = os.getenv('SUPABASE_SERVICE_ROLE_KEY')

    return create_client(url, key)
