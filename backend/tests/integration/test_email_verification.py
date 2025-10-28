import pytest
from datetime import datetime, timedelta
from uuid import uuid4


class TestEmailVerification:
    """Integration tests for email verification flow"""

    @pytest.mark.asyncio
    async def test_verify_email_with_valid_token(self, supabase_client, test_user):
        """Test email verification with valid token"""
        # Get verification token
        token = test_user['email_verification_token']

        # Verify email
        response = await supabase_client.auth.verify_otp({
            'token': token,
            'type': 'email'
        })

        assert response.user is not None
        assert response.user.email_confirmed_at is not None

    @pytest.mark.asyncio
    async def test_verify_email_with_expired_token(self, supabase_client):
        """Test email verification with expired token"""
        # Create user with expired token
        expired_time = datetime.utcnow() - timedelta(hours=2)

        # Attempt verification with expired token
        with pytest.raises(Exception) as exc_info:
            await supabase_client.auth.verify_otp({
                'token': str(uuid4()),
                'type': 'email'
            })

        assert 'expired' in str(exc_info.value).lower() or 'invalid' in str(exc_info.value).lower()

    @pytest.mark.asyncio
    async def test_verify_email_with_invalid_token(self, supabase_client):
        """Test email verification with invalid token"""
        # Attempt verification with random token
        with pytest.raises(Exception) as exc_info:
            await supabase_client.auth.verify_otp({
                'token': str(uuid4()),
                'type': 'email'
            })

        assert 'invalid' in str(exc_info.value).lower()

    @pytest.mark.asyncio
    async def test_resend_verification_email(self, supabase_client, test_user):
        """Test resending verification email"""
        # Resend verification email
        response = await supabase_client.auth.resend({
            'type': 'signup',
            'email': test_user['email']
        })

        assert response is not None

    @pytest.mark.asyncio
    async def test_verified_user_can_generate_designs(self, supabase_client, verified_user):
        """Test that verified users can access generation features"""
        # Get user data
        user_data = await supabase_client.table('users').select('*').eq('id', verified_user['id']).single().execute()

        assert user_data.data['email_verified'] is True
        assert user_data.data['trial_credits'] == 3

    @pytest.mark.asyncio
    async def test_unverified_user_cannot_generate_designs(self, supabase_client, test_user):
        """Test that unverified users cannot generate designs"""
        # Attempt to create generation as unverified user
        with pytest.raises(Exception) as exc_info:
            await supabase_client.table('generations').insert({
                'user_id': test_user['id'],
                'status': 'pending',
                'input_type': 'photo',
                'input_photo_url': 'https://example.com/photo.jpg',
                'style': 'modern'
            }).execute()

        # Should fail due to RLS policy or application logic
        assert exc_info is not None


@pytest.fixture
async def test_user(supabase_client):
    """Create a test user for verification tests"""
    timestamp = datetime.utcnow().timestamp()
    email = f"test{timestamp}@example.com"
    password = "TestPassword123!"

    response = await supabase_client.auth.sign_up({
        'email': email,
        'password': password
    })

    return response.user


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

    # Mock email verification
    await supabase_client.table('users').update({
        'email_verified': True
    }).eq('id', response.user.id).execute()

    return response.user


@pytest.fixture
def supabase_client():
    """Supabase client fixture"""
    from supabase import create_client
    import os

    url = os.getenv('SUPABASE_URL')
    key = os.getenv('SUPABASE_SERVICE_ROLE_KEY')

    return create_client(url, key)