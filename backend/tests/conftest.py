"""Shared pytest fixtures for integration tests"""

import pytest
import os
from datetime import datetime
from supabase import create_client
from typing import Any
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()


class AsyncSupabaseWrapper:
    """Wrapper to make Supabase client methods awaitable for testing"""

    def __init__(self, client):
        self._client = client

    def __getattr__(self, name):
        attr = getattr(self._client, name)
        if callable(attr):
            async def wrapper(*args, **kwargs):
                return attr(*args, **kwargs)
            return wrapper
        return attr

    def table(self, name):
        return AsyncTableWrapper(self._client.table(name))

    def rpc(self, fn, params=None):
        return AsyncRPCWrapper(self._client.rpc(fn, params))

    @property
    def auth(self):
        return AsyncAuthWrapper(self._client.auth)


class AsyncTableWrapper:
    """Wrapper for table operations"""

    def __init__(self, table):
        self._table = table

    def __getattr__(self, name):
        attr = getattr(self._table, name)
        if callable(attr):
            def wrapper(*args, **kwargs):
                result = attr(*args, **kwargs)
                # Return a wrapper if it's a query builder
                if hasattr(result, 'execute'):
                    return AsyncExecuteWrapper(result)
                return result
            return wrapper
        return attr

    def insert(self, data):
        return AsyncExecuteWrapper(self._table.insert(data))

    def select(self, *args, **kwargs):
        return AsyncExecuteWrapper(self._table.select(*args, **kwargs))

    def update(self, data):
        return AsyncExecuteWrapper(self._table.update(data))

    def delete(self):
        return AsyncExecuteWrapper(self._table.delete())


class AsyncRPCWrapper:
    """Wrapper for RPC operations"""

    def __init__(self, rpc):
        self._rpc = rpc

    async def execute(self):
        return self._rpc.execute()


class AsyncExecuteWrapper:
    """Wrapper that makes execute() awaitable"""

    def __init__(self, query):
        self._query = query

    def __getattr__(self, name):
        attr = getattr(self._query, name)
        if callable(attr) and name != 'execute':
            def wrapper(*args, **kwargs):
                result = attr(*args, **kwargs)
                return AsyncExecuteWrapper(result)
            return wrapper
        return attr

    async def execute(self):
        return self._query.execute()


class AsyncAuthAdminWrapper:
    """Wrapper for auth admin operations"""

    def __init__(self, admin):
        self._admin = admin

    async def delete_user(self, user_id):
        return self._admin.delete_user(user_id)


class AsyncAuthWrapper:
    """Wrapper for auth operations"""

    def __init__(self, auth):
        self._auth = auth

    async def sign_up(self, credentials):
        return self._auth.sign_up(credentials)

    async def sign_in(self, credentials):
        return self._auth.sign_in_with_password(credentials)

    async def get_user(self, token):
        return self._auth.get_user(token)

    async def verify_otp(self, params):
        return self._auth.verify_otp(params)

    async def resend(self, params):
        return self._auth.resend(params)

    @property
    def admin(self):
        return AsyncAuthAdminWrapper(self._auth.admin)


@pytest.fixture
def supabase_client():
    """Supabase client fixture with service role permissions and async wrapper"""
    url = os.getenv('SUPABASE_URL')
    key = os.getenv('SUPABASE_SERVICE_ROLE_KEY')

    if not url or not key:
        pytest.skip("Supabase environment variables not set")

    client = create_client(url, key)
    return AsyncSupabaseWrapper(client)


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
    """Create a verified test user with 3 trial credits"""
    timestamp = datetime.utcnow().timestamp()
    email = f"verified{timestamp}@example.com"
    password = "VerifiedPassword123!"

    # Sign up (token account automatically created by trigger)
    response = await supabase_client.auth.sign_up({
        'email': email,
        'password': password
    })

    user_id = response.user.id

    # Mark as verified
    await supabase_client.table('users').update({
        'email_verified': True
    }).eq('id', user_id).execute()

    # Note: Token account is automatically created by on_auth_user_created trigger
    # No need to manually create it

    return response.user
