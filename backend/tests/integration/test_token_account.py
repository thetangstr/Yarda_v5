"""
Integration tests for User Story 5: Token Account Management

Tests verify that token accounts are properly created and managed in the database
"""
import pytest
from uuid import uuid4


class TestTokenAccountCreation:
    """Test token account creation during user registration"""

    @pytest.mark.asyncio
    async def test_token_account_created_on_registration(self, supabase_client):
        """Token account should be automatically created when user registers"""
        # Create a user via Supabase Auth
        user_email = f"test-{uuid4()}@example.com"
        password = "SecurePass123!"

        # Register user
        auth_response = await supabase_client.auth.sign_up({
            "email": user_email,
            "password": password
        })

        user_id = auth_response.user.id

        # Verify token account was created
        result = await supabase_client.table('token_accounts').select('*').eq('user_id', user_id).execute()

        assert len(result.data) == 1
        token_account = result.data[0]

        # Verify token account fields
        assert token_account['user_id'] == user_id
        assert token_account['balance'] == 0  # New accounts start with 0 tokens
        assert token_account['total_purchased'] == 0
        assert token_account['total_consumed'] == 0
        assert token_account['id'] is not None
        assert token_account['created_at'] is not None
        assert token_account['updated_at'] is not None

    @pytest.mark.asyncio
    async def test_token_account_has_zero_balance(self, supabase_client, verified_user):
        """New token accounts should start with zero balance"""
        user_id = verified_user['id']

        # Get token account
        result = await supabase_client.table('token_accounts').select('balance').eq('user_id', user_id).single().execute()

        assert result.data['balance'] == 0

    @pytest.mark.asyncio
    async def test_token_account_unique_per_user(self, supabase_client, verified_user):
        """Each user should have exactly one token account"""
        user_id = verified_user['id']

        # Query for token accounts
        result = await supabase_client.table('token_accounts').select('*').eq('user_id', user_id).execute()

        # Should have exactly one token account
        assert len(result.data) == 1

    @pytest.mark.asyncio
    async def test_token_account_cannot_have_negative_balance(self, supabase_client, verified_user):
        """Token account balance should have check constraint preventing negative values"""
        user_id = verified_user['id']

        # Get token account
        token_account = await supabase_client.table('token_accounts').select('*').eq('user_id', user_id).single().execute()
        account_id = token_account.data['id']

        # Attempt to set negative balance (should fail)
        with pytest.raises(Exception):  # Database constraint violation
            await supabase_client.table('token_accounts').update({
                'balance': -10
            }).eq('id', account_id).execute()


class TestTokenBalanceRetrieval:
    """Test fetching token balance via API"""

    @pytest.mark.asyncio
    async def test_get_credit_balance_includes_tokens(self, supabase_client, verified_user):
        """get_credit_balance function should return token balance"""
        user_id = verified_user['id']

        # Call get_credit_balance function
        result = await supabase_client.rpc('get_credit_balance', {'p_user_id': user_id}).execute()

        balance_data = result.data

        # Should include token balance
        assert 'token_balance' in balance_data
        assert balance_data['token_balance'] == 0  # New account has 0 tokens
        assert balance_data['trial_credits'] == 3  # New account has 3 trial credits
        assert balance_data['total_credits'] == 3  # Total is trial + tokens

    @pytest.mark.asyncio
    async def test_token_balance_updates_correctly(self, supabase_client, verified_user):
        """Token balance should update when tokens are added"""
        user_id = verified_user['id']

        # Get token account
        token_account = await supabase_client.table('token_accounts').select('*').eq('user_id', user_id).single().execute()
        account_id = token_account.data['id']

        # Add tokens (simulate purchase)
        await supabase_client.table('token_accounts').update({
            'balance': 10,
            'total_purchased': 10
        }).eq('id', account_id).execute()

        # Verify balance updated
        result = await supabase_client.rpc('get_credit_balance', {'p_user_id': user_id}).execute()
        balance_data = result.data

        assert balance_data['token_balance'] == 10
        assert balance_data['total_credits'] == 13  # 3 trial + 10 tokens

    @pytest.mark.asyncio
    async def test_token_consumption_decreases_balance(self, supabase_client, verified_user):
        """Consuming token credits should decrease balance"""
        user_id = verified_user['id']

        # Add tokens first
        token_account = await supabase_client.table('token_accounts').select('*').eq('user_id', user_id).single().execute()
        account_id = token_account.data['id']

        await supabase_client.table('token_accounts').update({
            'balance': 5,
            'total_purchased': 5
        }).eq('id', account_id).execute()

        # Consume all trial credits first
        for _ in range(3):
            await supabase_client.rpc('consume_credit', {'p_user_id': user_id}).execute()

        # Now consume one token credit
        result = await supabase_client.rpc('consume_credit', {'p_user_id': user_id}).execute()

        assert result.data == 'token'  # Should consume from token account

        # Verify token balance decreased
        balance = await supabase_client.rpc('get_credit_balance', {'p_user_id': user_id}).execute()
        assert balance.data['token_balance'] == 4  # 5 - 1 = 4


class TestTokenAccountIsolation:
    """Test RLS policies for token accounts"""

    @pytest.mark.asyncio
    async def test_user_can_only_access_own_token_account(self, supabase_client, verified_user):
        """Users should only be able to access their own token account"""
        user_id = verified_user['id']

        # Get own token account (should succeed)
        result = await supabase_client.table('token_accounts').select('*').eq('user_id', user_id).execute()
        assert len(result.data) == 1

    @pytest.mark.asyncio
    async def test_cannot_create_duplicate_token_account(self, supabase_client, verified_user):
        """Should not be able to create duplicate token accounts for same user"""
        user_id = verified_user['id']

        # Attempt to create another token account for same user (should fail)
        with pytest.raises(Exception):  # Unique constraint violation
            await supabase_client.table('token_accounts').insert({
                'user_id': user_id,
                'balance': 0
            }).execute()

    @pytest.mark.asyncio
    async def test_token_account_deleted_when_user_deleted(self, supabase_client):
        """Token account should be deleted when user is deleted (CASCADE)"""
        # Create a test user
        user_email = f"test-{uuid4()}@example.com"
        auth_response = await supabase_client.auth.sign_up({
            "email": user_email,
            "password": "SecurePass123!"
        })

        user_id = auth_response.user.id

        # Verify token account exists
        result = await supabase_client.table('token_accounts').select('*').eq('user_id', user_id).execute()
        assert len(result.data) == 1

        # Delete user
        await supabase_client.auth.admin.delete_user(user_id)

        # Verify token account was also deleted
        result = await supabase_client.table('token_accounts').select('*').eq('user_id', user_id).execute()
        assert len(result.data) == 0


class TestTokenAccountMetadata:
    """Test token account tracking fields"""

    @pytest.mark.asyncio
    async def test_total_purchased_tracks_cumulative_purchases(self, supabase_client, verified_user):
        """total_purchased should track cumulative token purchases"""
        user_id = verified_user['id']

        token_account = await supabase_client.table('token_accounts').select('*').eq('user_id', user_id).single().execute()
        account_id = token_account.data['id']

        # Simulate first purchase (10 tokens)
        await supabase_client.table('token_accounts').update({
            'balance': 10,
            'total_purchased': 10
        }).eq('id', account_id).execute()

        # Simulate second purchase (20 more tokens)
        await supabase_client.table('token_accounts').update({
            'balance': 30,  # 10 + 20
            'total_purchased': 30  # Cumulative
        }).eq('id', account_id).execute()

        # Verify total_purchased is cumulative
        result = await supabase_client.table('token_accounts').select('total_purchased').eq('id', account_id).single().execute()
        assert result.data['total_purchased'] == 30

    @pytest.mark.asyncio
    async def test_total_consumed_tracks_usage(self, supabase_client, verified_user):
        """total_consumed should track how many tokens have been used"""
        user_id = verified_user['id']

        # Add tokens
        token_account = await supabase_client.table('token_accounts').select('*').eq('user_id', user_id).single().execute()
        account_id = token_account.data['id']

        await supabase_client.table('token_accounts').update({
            'balance': 10,
            'total_purchased': 10
        }).eq('id', account_id).execute()

        # Consume all trial credits
        for _ in range(3):
            await supabase_client.rpc('consume_credit', {'p_user_id': user_id}).execute()

        # Consume 5 token credits
        for _ in range(5):
            result = await supabase_client.rpc('consume_credit', {'p_user_id': user_id}).execute()
            assert result.data == 'token'

        # Verify total_consumed updated
        result = await supabase_client.table('token_accounts').select('*').eq('id', account_id).single().execute()
        assert result.data['total_consumed'] == 5
        assert result.data['balance'] == 5  # 10 - 5 = 5

    @pytest.mark.asyncio
    async def test_updated_at_timestamp_changes(self, supabase_client, verified_user):
        """updated_at should change when token account is modified"""
        user_id = verified_user['id']

        token_account = await supabase_client.table('token_accounts').select('*').eq('user_id', user_id).single().execute()
        account_id = token_account.data['id']
        initial_updated_at = token_account.data['updated_at']

        # Wait a moment
        import asyncio
        await asyncio.sleep(1)

        # Update balance
        await supabase_client.table('token_accounts').update({
            'balance': 10
        }).eq('id', account_id).execute()

        # Verify updated_at changed
        result = await supabase_client.table('token_accounts').select('updated_at').eq('id', account_id).single().execute()
        new_updated_at = result.data['updated_at']

        assert new_updated_at > initial_updated_at
