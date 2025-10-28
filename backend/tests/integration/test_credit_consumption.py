import pytest
from datetime import datetime
from uuid import uuid4


class TestCreditConsumption:
    """Integration tests for atomic credit consumption"""

    @pytest.mark.asyncio
    async def test_consume_trial_credit_atomically(self, supabase_client, verified_user):
        """Test atomic consumption of trial credit"""
        user_id = verified_user['id']

        # Get initial credits
        initial_balance = await supabase_client.rpc(
            'get_credit_balance', {'p_user_id': user_id}
        ).execute()

        assert initial_balance.data[0]['trial_credits'] == 3
        assert initial_balance.data[0]['token_balance'] == 0

        # Consume one credit
        result = await supabase_client.rpc(
            'consume_credit', {'p_user_id': user_id}
        ).execute()

        assert result.data == 'trial'

        # Verify credit was consumed
        new_balance = await supabase_client.rpc(
            'get_credit_balance', {'p_user_id': user_id}
        ).execute()

        assert new_balance.data[0]['trial_credits'] == 2
        assert new_balance.data[0]['token_balance'] == 0
        assert new_balance.data[0]['total_available'] == 2

    @pytest.mark.asyncio
    async def test_consume_token_when_trial_exhausted(self, supabase_client, verified_user):
        """Test that tokens are consumed after trial credits are exhausted"""
        user_id = verified_user['id']

        # Exhaust trial credits
        for _ in range(3):
            await supabase_client.rpc('consume_credit', {'p_user_id': user_id}).execute()

        # Add tokens
        await supabase_client.table('token_accounts').update({
            'balance': 5,
            'lifetime_purchased': 5
        }).eq('user_id', user_id).execute()

        # Consume credit - should use token
        result = await supabase_client.rpc(
            'consume_credit', {'p_user_id': user_id}
        ).execute()

        assert result.data == 'token'

        # Verify token was consumed
        balance = await supabase_client.rpc(
            'get_credit_balance', {'p_user_id': user_id}
        ).execute()

        assert balance.data[0]['trial_credits'] == 0
        assert balance.data[0]['token_balance'] == 4

    @pytest.mark.asyncio
    async def test_insufficient_credits_error(self, supabase_client, verified_user):
        """Test error when no credits available"""
        user_id = verified_user['id']

        # Exhaust all credits
        for _ in range(3):
            await supabase_client.rpc('consume_credit', {'p_user_id': user_id}).execute()

        # Try to consume with no credits
        with pytest.raises(Exception) as exc_info:
            await supabase_client.rpc('consume_credit', {'p_user_id': user_id}).execute()

        assert 'Insufficient credits' in str(exc_info.value)

    @pytest.mark.asyncio
    async def test_concurrent_credit_consumption(self, supabase_client, verified_user):
        """Test that concurrent consumption requests don't cause race conditions"""
        import asyncio
        user_id = verified_user['id']

        # Try to consume 3 credits concurrently (user has exactly 3 trial credits)
        tasks = [
            supabase_client.rpc('consume_credit', {'p_user_id': user_id}).execute()
            for _ in range(3)
        ]

        results = await asyncio.gather(*tasks, return_exceptions=True)

        # All 3 should succeed
        successful = [r for r in results if not isinstance(r, Exception)]
        assert len(successful) == 3
        assert all(r.data == 'trial' for r in successful)

        # No credits left
        balance = await supabase_client.rpc(
            'get_credit_balance', {'p_user_id': user_id}
        ).execute()

        assert balance.data[0]['trial_credits'] == 0

    @pytest.mark.asyncio
    async def test_refund_trial_credit(self, supabase_client, verified_user):
        """Test credit refund for failed generation"""
        user_id = verified_user['id']

        # Consume a credit
        credit_type = await supabase_client.rpc(
            'consume_credit', {'p_user_id': user_id}
        ).execute()

        assert credit_type.data == 'trial'

        # Create a failed generation
        generation = await supabase_client.table('generations').insert({
            'user_id': user_id,
            'status': 'failed',
            'input_type': 'address',
            'input_address': '123 Test St',
            'style': 'modern',
            'credit_type': 'trial',
            'error_message': 'Service unavailable'
        }).execute()

        generation_id = generation.data[0]['id']

        # Credits should be 2 now
        balance = await supabase_client.rpc(
            'get_credit_balance', {'p_user_id': user_id}
        ).execute()
        assert balance.data[0]['trial_credits'] == 2

        # Refund the credit
        await supabase_client.rpc(
            'refund_credit', {'p_generation_id': generation_id}
        ).execute()

        # Credits should be back to 3
        new_balance = await supabase_client.rpc(
            'get_credit_balance', {'p_user_id': user_id}
        ).execute()

        assert new_balance.data[0]['trial_credits'] == 3

        # Generation should be marked as refunded
        gen_record = await supabase_client.table('generations').select('*').eq(
            'id', generation_id
        ).single().execute()

        assert gen_record.data['credit_refunded'] is True

    @pytest.mark.asyncio
    async def test_refund_token_credit(self, supabase_client, verified_user):
        """Test token refund for failed generation"""
        user_id = verified_user['id']

        # Exhaust trial credits
        for _ in range(3):
            await supabase_client.rpc('consume_credit', {'p_user_id': user_id}).execute()

        # Add tokens
        await supabase_client.table('token_accounts').update({
            'balance': 5,
            'lifetime_purchased': 5
        }).eq('user_id', user_id).execute()

        # Consume a token
        await supabase_client.rpc('consume_credit', {'p_user_id': user_id}).execute()

        # Create failed generation with token
        generation = await supabase_client.table('generations').insert({
            'user_id': user_id,
            'status': 'failed',
            'input_type': 'photo',
            'input_photo_url': 'https://example.com/photo.jpg',
            'style': 'tropical',
            'credit_type': 'token',
            'error_message': 'AI service timeout'
        }).execute()

        generation_id = generation.data[0]['id']

        # Refund token
        await supabase_client.rpc(
            'refund_credit', {'p_generation_id': generation_id}
        ).execute()

        # Verify token refunded
        balance = await supabase_client.rpc(
            'get_credit_balance', {'p_user_id': user_id}
        ).execute()

        assert balance.data[0]['token_balance'] == 5
        assert balance.data[0]['trial_credits'] == 0

    @pytest.mark.asyncio
    async def test_refund_idempotency(self, supabase_client, verified_user):
        """Test that refund is idempotent (can't refund twice)"""
        user_id = verified_user['id']

        # Consume and create failed generation
        await supabase_client.rpc('consume_credit', {'p_user_id': user_id}).execute()

        generation = await supabase_client.table('generations').insert({
            'user_id': user_id,
            'status': 'failed',
            'input_type': 'address',
            'input_address': '789 Refund Test Ave',
            'style': 'modern',
            'credit_type': 'trial'
        }).execute()

        generation_id = generation.data[0]['id']

        # First refund
        await supabase_client.rpc(
            'refund_credit', {'p_generation_id': generation_id}
        ).execute()

        balance_after_first = await supabase_client.rpc(
            'get_credit_balance', {'p_user_id': user_id}
        ).execute()

        # Try to refund again
        await supabase_client.rpc(
            'refund_credit', {'p_generation_id': generation_id}
        ).execute()

        balance_after_second = await supabase_client.rpc(
            'get_credit_balance', {'p_user_id': user_id}
        ).execute()

        # Balance should not change on second refund
        assert balance_after_first.data[0]['trial_credits'] == balance_after_second.data[0]['trial_credits']

    @pytest.mark.asyncio
    async def test_credit_balance_query(self, supabase_client, verified_user):
        """Test get_credit_balance function returns correct breakdown"""
        user_id = verified_user['id']

        # Add tokens
        await supabase_client.table('token_accounts').update({
            'balance': 10,
            'lifetime_purchased': 10
        }).eq('user_id', user_id).execute()

        # Get balance
        balance = await supabase_client.rpc(
            'get_credit_balance', {'p_user_id': user_id}
        ).execute()

        assert balance.data[0]['trial_credits'] == 3
        assert balance.data[0]['token_balance'] == 10
        assert balance.data[0]['total_available'] == 13


@pytest.fixture
async def verified_user(supabase_client):
    """Create a verified test user with 3 trial credits"""
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
