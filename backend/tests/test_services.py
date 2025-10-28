"""
Unit tests for services
These tests can run without database connection using mocks
"""

import pytest
from unittest.mock import Mock, MagicMock
from uuid import uuid4
from src.services.credit_service import CreditService
from src.services.generation_service import GenerationService
from src.models.generation import (
    GenerationCreate,
    InputType,
    CreditType,
    GenerationStatus
)


class TestCreditService:
    """Unit tests for CreditService"""

    def test_consume_credit_returns_trial(self):
        """Test that consume_credit returns correct credit type"""
        # Mock Supabase client
        mock_client = Mock()
        mock_response = Mock()
        mock_response.data = 'trial'
        mock_client.rpc.return_value.execute.return_value = mock_response

        service = CreditService(mock_client)
        user_id = uuid4()

        # This is async but doesn't actually await anything
        import asyncio
        credit_type = asyncio.run(service.consume_credit(user_id))

        assert credit_type == CreditType.TRIAL
        mock_client.rpc.assert_called_once_with(
            'consume_credit',
            {'p_user_id': str(user_id)}
        )

    def test_get_credit_balance_returns_balance(self):
        """Test that get_credit_balance returns correct data"""
        # Mock Supabase client
        mock_client = Mock()
        mock_response = Mock()
        mock_response.data = [{
            'trial_credits': 3,
            'token_balance': 10,
            'total_available': 13
        }]
        mock_client.rpc.return_value.execute.return_value = mock_response

        service = CreditService(mock_client)
        user_id = uuid4()

        import asyncio
        balance = asyncio.run(service.get_credit_balance(user_id))

        assert balance.trial_credits == 3
        assert balance.token_balance == 10
        assert balance.total_available == 13


class TestGenerationService:
    """Unit tests for GenerationService"""

    def test_create_generation_consumes_credit(self):
        """Test that create_generation consumes credit"""
        # Mock Supabase client
        mock_client = Mock()

        # Mock consume credit response
        mock_credit_response = Mock()
        mock_credit_response.data = 'trial'

        # Mock insert response
        mock_insert_response = Mock()
        mock_insert_response.data = [{
            'id': str(uuid4()),
            'user_id': str(uuid4()),
            'status': 'pending',
            'input_type': 'photo',
            'input_photo_url': 'https://example.com/photo.jpg',
            'style': 'modern',
            'credit_type': 'trial',
            'credit_refunded': False,
            'created_at': '2024-01-01T00:00:00Z'
        }]

        mock_client.rpc.return_value.execute.return_value = mock_credit_response
        mock_client.table.return_value.insert.return_value.execute.return_value = mock_insert_response

        service = GenerationService(mock_client)
        user_id = uuid4()

        generation_data = GenerationCreate(
            input_type=InputType.PHOTO,
            input_photo_url='https://example.com/photo.jpg',
            style='modern'
        )

        import asyncio
        generation = asyncio.run(service.create_generation(user_id, generation_data))

        assert generation is not None
        assert generation.credit_type == CreditType.TRIAL
        mock_client.rpc.assert_called_once()
