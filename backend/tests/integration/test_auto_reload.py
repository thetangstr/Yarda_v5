"""
Integration Tests for User Story 3: Auto-Reload Token Purchase

Test Scenarios:
- TC-AUTO-RELOAD-1.1: Auto-reload triggers when balance drops below threshold
- TC-AUTO-RELOAD-1.2: 60-second throttle prevents duplicate triggers
- TC-AUTO-RELOAD-1.3: Auto-reload disabled after 3 consecutive failures
- TC-AUTO-RELOAD-1.4: Failure count reset on successful reload
- TC-AUTO-RELOAD-1.5: Auto-reload does not trigger when disabled

Requirements:
- FR-036: Trigger auto-reload when balance drops below threshold
- FR-037: 60-second throttle to prevent duplicate charges
- FR-039: Increment failure_count on auto-reload payment failure
- FR-040: Disable auto_reload_enabled after 3 consecutive failures
- FR-042: Reset failure_count on successful auto-reload
- T065: Integration test for auto-reload trigger logic
"""

import pytest
import pytest_asyncio
import asyncpg
import asyncio
from uuid import uuid4
from datetime import datetime, timedelta

@pytest_asyncio.fixture
async def test_user_with_auto_reload(db_connection):
    """Create a test user with auto-reload enabled."""
    user_id = uuid4()
    email = f'auto-reload-test-{user_id}@test.com'

    # Create user
    await db_connection.execute("""
        INSERT INTO users (id, email, email_verified, password_hash)
        VALUES ($1, $2, true, 'hash')
    """, user_id, email)

    # Create token account with auto-reload enabled
    await db_connection.execute("""
        INSERT INTO users_token_accounts (
            user_id, balance, total_purchased, total_spent,
            auto_reload_enabled, auto_reload_threshold, auto_reload_amount,
            auto_reload_failure_count
        )
        VALUES ($1, 25, 100, 75, true, 20, 100, 0)
    """, user_id)

    yield user_id

    # Cleanup
    await db_connection.execute("DELETE FROM users WHERE id = $1", user_id)

@pytest.mark.asyncio
async def test_auto_reload_triggers_below_threshold(db_connection, test_user_with_auto_reload):
    """
    TC-AUTO-RELOAD-1.1: Test that auto-reload triggers when balance drops below threshold.

    Setup:
    - User has 25 tokens
    - Auto-reload enabled with threshold=20, amount=100
    - Deduct 6 tokens (balance becomes 19, below threshold)

    Expected Result:
    - Should return trigger info with should_trigger=True
    - trigger_info contains amount=100, threshold=20, balance=19
    - last_reload_at timestamp is recorded
    """
    user_id = test_user_with_auto_reload

    # Import services
    import sys
    sys.path.insert(0, '/Volumes/home/Projects_Hosted/Yarda_v5/backend')
    from src.services.auto_reload_service import AutoReloadService

    # Create connection pool (mock with single connection)
    class MockPool:
        def __init__(self, conn):
            self.conn = conn

        def acquire(self):
            return self

        async def __aenter__(self):
            return self.conn

        async def __aexit__(self, *args):
            pass

    pool = MockPool(db_connection)
    auto_reload_service = AutoReloadService(pool)

    # Deduct 6 tokens to bring balance to 19 (below threshold of 20)
    await db_connection.execute("""
        UPDATE users_token_accounts
        SET balance = balance - 6, total_spent = total_spent + 6
        WHERE user_id = $1
    """, user_id)

    # Check balance
    balance = await db_connection.fetchval("""
        SELECT balance FROM users_token_accounts WHERE user_id = $1
    """, user_id)
    assert balance == 19, f"Balance should be 19, got {balance}"

    # Check auto-reload trigger
    trigger_info = await auto_reload_service.check_and_trigger(user_id)

    # Verify trigger occurred
    assert trigger_info is not None, "Auto-reload should trigger"
    assert trigger_info["should_trigger"] is True
    assert trigger_info["amount"] == 100
    assert trigger_info["threshold"] == 20
    assert trigger_info["balance"] == 19
    assert trigger_info["user_id"] == str(user_id)

    # Record reload attempt (simulating what token_service does)
    await auto_reload_service.record_reload_attempt(user_id)

    # Verify last_reload_at was set
    last_reload = await db_connection.fetchval("""
        SELECT last_reload_at FROM users_token_accounts WHERE user_id = $1
    """, user_id)
    assert last_reload is not None, "last_reload_at should be set"

@pytest.mark.asyncio
async def test_auto_reload_does_not_trigger_above_threshold(db_connection, test_user_with_auto_reload):
    """
    TC-AUTO-RELOAD-1.5: Test that auto-reload does NOT trigger when balance is above threshold.

    Setup:
    - User has 25 tokens (above threshold of 20)
    - Auto-reload enabled

    Expected Result:
    - check_and_trigger() returns None (no trigger)
    """
    user_id = test_user_with_auto_reload

    import sys
    sys.path.insert(0, '/Volumes/home/Projects_Hosted/Yarda_v5/backend')
    from src.services.auto_reload_service import AutoReloadService

    class MockPool:
        def __init__(self, conn):
            self.conn = conn
        def acquire(self):
            return self
        async def __aenter__(self):
            return self.conn
        async def __aexit__(self, *args):
            pass

    pool = MockPool(db_connection)
    auto_reload_service = AutoReloadService(pool)

    # Balance is 25, above threshold of 20
    balance = await db_connection.fetchval("""
        SELECT balance FROM users_token_accounts WHERE user_id = $1
    """, user_id)
    assert balance == 25

    # Check auto-reload trigger
    trigger_info = await auto_reload_service.check_and_trigger(user_id)

    # Verify no trigger
    assert trigger_info is None, "Auto-reload should NOT trigger when above threshold"

@pytest.mark.asyncio
async def test_auto_reload_60_second_throttle(db_connection, test_user_with_auto_reload):
    """
    TC-AUTO-RELOAD-1.2: Test that 60-second throttle prevents duplicate triggers.

    Setup:
    - User has balance below threshold
    - last_reload_at was set 30 seconds ago
    - Try to trigger again

    Expected Result:
    - check_and_trigger() returns None (throttled)
    - After 60+ seconds, returns trigger info
    """
    user_id = test_user_with_auto_reload

    import sys
    sys.path.insert(0, '/Volumes/home/Projects_Hosted/Yarda_v5/backend')
    from src.services.auto_reload_service import AutoReloadService

    class MockPool:
        def __init__(self, conn):
            self.conn = conn
        def acquire(self):
            return self
        async def __aenter__(self):
            return self.conn
        async def __aexit__(self, *args):
            pass

    pool = MockPool(db_connection)
    auto_reload_service = AutoReloadService(pool)

    # Set balance below threshold
    await db_connection.execute("""
        UPDATE users_token_accounts
        SET balance = 10
        WHERE user_id = $1
    """, user_id)

    # Set last_reload_at to 30 seconds ago (within 60-second window)
    thirty_seconds_ago = datetime.utcnow() - timedelta(seconds=30)
    await db_connection.execute("""
        UPDATE users_token_accounts
        SET last_reload_at = $2
        WHERE user_id = $1
    """, user_id, thirty_seconds_ago)

    # Try to trigger (should be throttled)
    trigger_info = await auto_reload_service.check_and_trigger(user_id)
    assert trigger_info is None, "Auto-reload should be throttled (< 60 seconds)"

    # Set last_reload_at to 61 seconds ago (outside 60-second window)
    sixty_one_seconds_ago = datetime.utcnow() - timedelta(seconds=61)
    await db_connection.execute("""
        UPDATE users_token_accounts
        SET last_reload_at = $2
        WHERE user_id = $1
    """, user_id, sixty_one_seconds_ago)

    # Try to trigger again (should succeed)
    trigger_info = await auto_reload_service.check_and_trigger(user_id)
    assert trigger_info is not None, "Auto-reload should trigger after 60+ seconds"
    assert trigger_info["should_trigger"] is True

@pytest.mark.asyncio
async def test_auto_reload_disabled_after_3_failures(db_connection, test_user_with_auto_reload):
    """
    TC-AUTO-RELOAD-1.3: Test that auto-reload is disabled after 3 consecutive failures.

    Setup:
    - User has auto-reload enabled
    - Record 3 consecutive payment failures

    Expected Result:
    - After 3rd failure, auto_reload_enabled is set to False
    - check_and_trigger() returns None (disabled)
    - auto_reload_failure_count is 3
    """
    user_id = test_user_with_auto_reload

    import sys
    sys.path.insert(0, '/Volumes/home/Projects_Hosted/Yarda_v5/backend')
    from src.services.auto_reload_service import AutoReloadService

    class MockPool:
        def __init__(self, conn):
            self.conn = conn
        def acquire(self):
            return self
        async def __aenter__(self):
            return self.conn
        async def __aexit__(self, *args):
            pass

    pool = MockPool(db_connection)
    auto_reload_service = AutoReloadService(pool)

    # Set balance below threshold
    await db_connection.execute("""
        UPDATE users_token_accounts
        SET balance = 10
        WHERE user_id = $1
    """, user_id)

    # Verify auto-reload is initially enabled
    enabled = await db_connection.fetchval("""
        SELECT auto_reload_enabled FROM users_token_accounts WHERE user_id = $1
    """, user_id)
    assert enabled is True

    # Record first failure
    disabled = await auto_reload_service.record_reload_failure(user_id)
    assert disabled is False, "Should not be disabled after 1 failure"

    failure_count = await db_connection.fetchval("""
        SELECT auto_reload_failure_count FROM users_token_accounts WHERE user_id = $1
    """, user_id)
    assert failure_count == 1

    # Record second failure
    disabled = await auto_reload_service.record_reload_failure(user_id)
    assert disabled is False, "Should not be disabled after 2 failures"

    failure_count = await db_connection.fetchval("""
        SELECT auto_reload_failure_count FROM users_token_accounts WHERE user_id = $1
    """, user_id)
    assert failure_count == 2

    # Record third failure (should disable)
    disabled = await auto_reload_service.record_reload_failure(user_id)
    assert disabled is True, "Should be disabled after 3 failures"

    failure_count = await db_connection.fetchval("""
        SELECT auto_reload_failure_count FROM users_token_accounts WHERE user_id = $1
    """, user_id)
    assert failure_count == 3

    # Verify auto-reload is now disabled
    enabled = await db_connection.fetchval("""
        SELECT auto_reload_enabled FROM users_token_accounts WHERE user_id = $1
    """, user_id)
    assert enabled is False, "auto_reload_enabled should be False after 3 failures"

    # Verify check_and_trigger returns None (disabled)
    trigger_info = await auto_reload_service.check_and_trigger(user_id)
    assert trigger_info is None, "Auto-reload should not trigger when disabled"

@pytest.mark.asyncio
async def test_auto_reload_failure_count_reset_on_success(db_connection, test_user_with_auto_reload):
    """
    TC-AUTO-RELOAD-1.4: Test that failure count is reset on successful reload.

    Setup:
    - User has 2 failures recorded
    - Successful auto-reload payment completes

    Expected Result:
    - auto_reload_failure_count is reset to 0
    - auto_reload_enabled remains True
    """
    user_id = test_user_with_auto_reload

    import sys
    sys.path.insert(0, '/Volumes/home/Projects_Hosted/Yarda_v5/backend')
    from src.services.auto_reload_service import AutoReloadService

    class MockPool:
        def __init__(self, conn):
            self.conn = conn
        def acquire(self):
            return self
        async def __aenter__(self):
            return self.conn
        async def __aexit__(self, *args):
            pass

    pool = MockPool(db_connection)
    auto_reload_service = AutoReloadService(pool)

    # Set failure count to 2
    await db_connection.execute("""
        UPDATE users_token_accounts
        SET auto_reload_failure_count = 2
        WHERE user_id = $1
    """, user_id)

    # Verify failure count is 2
    failure_count = await db_connection.fetchval("""
        SELECT auto_reload_failure_count FROM users_token_accounts WHERE user_id = $1
    """, user_id)
    assert failure_count == 2

    # Record successful reload
    await auto_reload_service.record_reload_success(user_id)

    # Verify failure count reset to 0
    failure_count = await db_connection.fetchval("""
        SELECT auto_reload_failure_count FROM users_token_accounts WHERE user_id = $1
    """, user_id)
    assert failure_count == 0, "Failure count should be reset to 0 after success"

    # Verify auto-reload still enabled
    enabled = await db_connection.fetchval("""
        SELECT auto_reload_enabled FROM users_token_accounts WHERE user_id = $1
    """, user_id)
    assert enabled is True

@pytest.mark.asyncio
async def test_auto_reload_does_not_trigger_when_disabled(db_connection, test_user_with_auto_reload):
    """
    Test that auto-reload does not trigger when explicitly disabled by user.

    Setup:
    - User has balance below threshold
    - auto_reload_enabled = False

    Expected Result:
    - check_and_trigger() returns None
    """
    user_id = test_user_with_auto_reload

    import sys
    sys.path.insert(0, '/Volumes/home/Projects_Hosted/Yarda_v5/backend')
    from src.services.auto_reload_service import AutoReloadService

    class MockPool:
        def __init__(self, conn):
            self.conn = conn
        def acquire(self):
            return self
        async def __aenter__(self):
            return self.conn
        async def __aexit__(self, *args):
            pass

    pool = MockPool(db_connection)
    auto_reload_service = AutoReloadService(pool)

    # Disable auto-reload
    await db_connection.execute("""
        UPDATE users_token_accounts
        SET auto_reload_enabled = false, balance = 10
        WHERE user_id = $1
    """, user_id)

    # Verify balance is below threshold
    balance = await db_connection.fetchval("""
        SELECT balance FROM users_token_accounts WHERE user_id = $1
    """, user_id)
    assert balance == 10, "Balance should be 10 (below threshold of 20)"

    # Try to trigger
    trigger_info = await auto_reload_service.check_and_trigger(user_id)

    # Verify no trigger
    assert trigger_info is None, "Auto-reload should NOT trigger when disabled"

@pytest.mark.asyncio
async def test_configure_auto_reload(db_connection):
    """
    Test configuring auto-reload settings.

    Setup:
    - Create user with no auto-reload config
    - Enable auto-reload with threshold=30, amount=200

    Expected Result:
    - Configuration is saved correctly
    - Validation errors for invalid inputs
    """
    user_id = uuid4()
    email = f'config-test-{user_id}@test.com'

    # Create user
    await db_connection.execute("""
        INSERT INTO users (id, email, email_verified, password_hash)
        VALUES ($1, $2, true, 'hash')
    """, user_id, email)

    # Create token account without auto-reload
    await db_connection.execute("""
        INSERT INTO users_token_accounts (user_id, balance)
        VALUES ($1, 50)
    """, user_id)

    import sys
    sys.path.insert(0, '/Volumes/home/Projects_Hosted/Yarda_v5/backend')
    from src.services.auto_reload_service import AutoReloadService

    class MockPool:
        def __init__(self, conn):
            self.conn = conn
        def acquire(self):
            return self
        async def __aenter__(self):
            return self.conn
        async def __aexit__(self, *args):
            pass

    pool = MockPool(db_connection)
    auto_reload_service = AutoReloadService(pool)

    # Configure auto-reload
    success = await auto_reload_service.configure_auto_reload(
        user_id=user_id,
        enabled=True,
        threshold=30,
        amount=200
    )
    assert success is True

    # Verify configuration saved
    config = await db_connection.fetchrow("""
        SELECT auto_reload_enabled, auto_reload_threshold, auto_reload_amount
        FROM users_token_accounts
        WHERE user_id = $1
    """, user_id)

    assert config['auto_reload_enabled'] is True
    assert config['auto_reload_threshold'] == 30
    assert config['auto_reload_amount'] == 200

    # Test validation: threshold out of range
    with pytest.raises(ValueError, match="Threshold must be between 1 and 100"):
        await auto_reload_service.configure_auto_reload(
            user_id=user_id,
            enabled=True,
            threshold=101,
            amount=200
        )

    # Test validation: amount too low
    with pytest.raises(ValueError, match="Amount must be at least 10"):
        await auto_reload_service.configure_auto_reload(
            user_id=user_id,
            enabled=True,
            threshold=30,
            amount=5
        )

    # Cleanup
    await db_connection.execute("DELETE FROM users WHERE id = $1", user_id)
