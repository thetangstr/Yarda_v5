import pytest
from datetime import datetime, timedelta


class TestGenerationHistory:
    """Integration tests for generation history and pagination"""

    @pytest.mark.asyncio
    async def test_list_user_generations(self, supabase_client, verified_user):
        """Test listing user's generations"""
        user_id = verified_user['id']

        # Create 3 generations
        for i in range(3):
            await supabase_client.table('generations').insert({
                'user_id': user_id,
                'status': 'completed',
                'input_type': 'address',
                'input_address': f'{100 + i} Test Street',
                'style': 'modern',
                'credit_type': 'trial',
                'output_image_url': f'https://example.com/output{i}.jpg',
                'processing_time_ms': 1000 + i
            }).execute()

        # List generations
        generations = await supabase_client.table('generations').select('*').eq(
            'user_id', user_id
        ).order('created_at', desc=True).execute()

        assert len(generations.data) == 3

    @pytest.mark.asyncio
    async def test_pagination_with_limit_and_offset(self, supabase_client, verified_user):
        """Test pagination with limit and offset"""
        user_id = verified_user['id']

        # Create 15 generations
        for i in range(15):
            await supabase_client.table('generations').insert({
                'user_id': user_id,
                'status': 'completed',
                'input_type': 'address',
                'input_address': f'Generation {i} Street',
                'style': 'modern',
                'credit_type': 'trial'
            }).execute()

        # Get first page (10 items)
        page1 = await supabase_client.table('generations').select('*').eq(
            'user_id', user_id
        ).order('created_at', desc=True).limit(10).execute()

        assert len(page1.data) == 10

        # Get second page (5 items)
        page2 = await supabase_client.table('generations').select('*').eq(
            'user_id', user_id
        ).order('created_at', desc=True).limit(10).offset(10).execute()

        assert len(page2.data) == 5

        # Ensure no overlap
        page1_ids = {gen['id'] for gen in page1.data}
        page2_ids = {gen['id'] for gen in page2.data}
        assert len(page1_ids & page2_ids) == 0

    @pytest.mark.asyncio
    async def test_generations_ordered_by_created_at_desc(self, supabase_client, verified_user):
        """Test generations are returned in reverse chronological order"""
        user_id = verified_user['id']

        # Create generations with specific addresses
        addresses = ['First', 'Second', 'Third']
        for address in addresses:
            await supabase_client.table('generations').insert({
                'user_id': user_id,
                'status': 'completed',
                'input_type': 'address',
                'input_address': f'{address} Generation',
                'style': 'modern',
                'credit_type': 'trial'
            }).execute()
            # Small delay to ensure different timestamps
            import asyncio
            await asyncio.sleep(0.1)

        # Get generations
        generations = await supabase_client.table('generations').select('*').eq(
            'user_id', user_id
        ).order('created_at', desc=True).execute()

        # Most recent should be first
        assert generations.data[0]['input_address'] == 'Third Generation'
        assert generations.data[1]['input_address'] == 'Second Generation'
        assert generations.data[2]['input_address'] == 'First Generation'

    @pytest.mark.asyncio
    async def test_filter_by_status(self, supabase_client, verified_user):
        """Test filtering generations by status"""
        user_id = verified_user['id']

        # Create generations with different statuses
        statuses = ['completed', 'failed', 'completed', 'processing', 'completed']
        for i, status in enumerate(statuses):
            await supabase_client.table('generations').insert({
                'user_id': user_id,
                'status': status,
                'input_type': 'address',
                'input_address': f'{i} Status Test St',
                'style': 'modern',
                'credit_type': 'trial'
            }).execute()

        # Filter for completed only
        completed = await supabase_client.table('generations').select('*').eq(
            'user_id', user_id
        ).eq('status', 'completed').execute()

        assert len(completed.data) == 3
        assert all(gen['status'] == 'completed' for gen in completed.data)

        # Filter for failed only
        failed = await supabase_client.table('generations').select('*').eq(
            'user_id', user_id
        ).eq('status', 'failed').execute()

        assert len(failed.data) == 1
        assert failed.data[0]['status'] == 'failed'

    @pytest.mark.asyncio
    async def test_user_isolation_in_history(self, supabase_client, verified_user):
        """Test that users can only see their own generations"""
        user1_id = verified_user['id']

        # Create second user
        timestamp = datetime.utcnow().timestamp()
        user2_response = await supabase_client.auth.sign_up({
            'email': f'user2{timestamp}@example.com',
            'password': 'User2Password123!'
        })
        user2_id = user2_response.user.id

        await supabase_client.table('users').update({
            'email_verified': True
        }).eq('id', user2_id).execute()

        # Create generations for both users
        await supabase_client.table('generations').insert({
            'user_id': user1_id,
            'status': 'completed',
            'input_type': 'address',
            'input_address': 'User 1 Generation',
            'style': 'modern',
            'credit_type': 'trial'
        }).execute()

        await supabase_client.table('generations').insert({
            'user_id': user2_id,
            'status': 'completed',
            'input_type': 'address',
            'input_address': 'User 2 Generation',
            'style': 'modern',
            'credit_type': 'trial'
        }).execute()

        # Get user 1's generations
        user1_gens = await supabase_client.table('generations').select('*').eq(
            'user_id', user1_id
        ).execute()

        # Should only see their own
        assert len(user1_gens.data) == 1
        assert user1_gens.data[0]['input_address'] == 'User 1 Generation'

    @pytest.mark.asyncio
    async def test_generation_includes_all_fields(self, supabase_client, verified_user):
        """Test that generation records include all expected fields"""
        user_id = verified_user['id']

        # Create a complete generation
        generation_data = {
            'user_id': user_id,
            'status': 'completed',
            'input_type': 'photo',
            'input_photo_url': 'https://example.com/input.jpg',
            'style': 'tropical',
            'custom_prompt': 'Add palm trees',
            'output_image_url': 'https://example.com/output.jpg',
            'processing_time_ms': 2500,
            'credit_type': 'trial',
            'credit_refunded': False
        }

        result = await supabase_client.table('generations').insert(
            generation_data
        ).execute()

        generation_id = result.data[0]['id']

        # Retrieve it
        retrieved = await supabase_client.table('generations').select('*').eq(
            'id', generation_id
        ).single().execute()

        # Verify all fields
        assert retrieved.data['user_id'] == user_id
        assert retrieved.data['status'] == 'completed'
        assert retrieved.data['input_type'] == 'photo'
        assert retrieved.data['input_photo_url'] == 'https://example.com/input.jpg'
        assert retrieved.data['style'] == 'tropical'
        assert retrieved.data['custom_prompt'] == 'Add palm trees'
        assert retrieved.data['output_image_url'] == 'https://example.com/output.jpg'
        assert retrieved.data['processing_time_ms'] == 2500
        assert retrieved.data['credit_type'] == 'trial'
        assert retrieved.data['credit_refunded'] is False
        assert retrieved.data['created_at'] is not None
        assert retrieved.data['id'] is not None

    @pytest.mark.asyncio
    async def test_count_total_generations(self, supabase_client, verified_user):
        """Test counting total generations for pagination metadata"""
        user_id = verified_user['id']

        # Create 25 generations
        for i in range(25):
            await supabase_client.table('generations').insert({
                'user_id': user_id,
                'status': 'completed',
                'input_type': 'address',
                'input_address': f'{i} Test St',
                'style': 'modern',
                'credit_type': 'trial'
            }).execute()

        # Count total
        count_result = await supabase_client.table('generations').select(
            'id', count='exact'
        ).eq('user_id', user_id).execute()

        assert count_result.count == 25

    @pytest.mark.asyncio
    async def test_empty_history_for_new_user(self, supabase_client, verified_user):
        """Test that new users have empty history"""
        user_id = verified_user['id']

        # Get generations (should be empty)
        generations = await supabase_client.table('generations').select('*').eq(
            'user_id', user_id
        ).execute()

        assert len(generations.data) == 0


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
