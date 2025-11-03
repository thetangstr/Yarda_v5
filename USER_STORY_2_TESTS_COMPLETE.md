# User Story 2: Token Purchase - Tests Complete ✅

**Status**: Tests Written (Following TDD)
**Branch**: `002-nextjs-migration`
**Date**: 2025-11-03

## Overview

Following Test-Driven Development (TDD) principles, all tests for User Story 2 have been written FIRST. These tests should currently **FAIL** since the implementation doesn't exist yet. The next phase is to implement the backend and frontend to make these tests **PASS**.

## Test Files Created

### 1. Frontend E2E Tests

#### `frontend/tests/e2e/token-purchase.spec.ts` (T039)

**Purpose**: End-to-end tests for complete token purchase user flow

**Test Scenarios** (9 tests):

1. **TC-TOK-1.1**: User with exhausted trial can purchase tokens
   - Register user → Exhaust trial → Try to generate → Modal appears → "Purchase Tokens" button visible

2. **TC-TOK-5.1**: Four token packages are available
   - Verify all 4 packages displayed with correct pricing:
     - Package 1: 10 tokens, $10.00, $1.00/token
     - Package 2: 50 tokens, $45.00, $0.90/token, Save 10%
     - Package 3: 100 tokens, $90.00, $0.90/token, Save 10%
     - Package 4: 500 tokens, $400.00, $0.80/token, Save 20%, BEST VALUE

3. **TC-TOK-1.2**: Token purchase flow via Stripe Checkout
   - Select package → Redirect to Stripe → Mock payment success → Return to app → Balance updated

4. **TC-TOK-1.3**: Token balance updates after successful purchase
   - Initial balance 0 → Purchase 10 tokens → Balance becomes 10

5. **TC-TOK-1.4 & TC-TOK-1.5**: Generate design using tokens and verify deduction
   - User has 10 tokens → Generate design → Balance decrements to 9 → Payment method shows "Paid with tokens"

6. **TC-TOK-2.1**: TokenBalance component auto-refreshes every 10 seconds
   - Initial balance 5 → External token addition → Wait 10 seconds → Balance updates to 15

7. **TC-TOK-3.1**: Webhook idempotency prevents duplicate credits
   - Webhook called twice with same payment_intent_id → Balance is 10 (not 20) → Only 1 transaction recorded

8. **TC-TOK-4.1**: Token refund on generation failure
   - User has 5 tokens → Generation fails → Token refunded → Balance back to 5 → Error message shows refund

9. **TC-AUTH-2.1**: Tokens checked THIRD after subscription and trial
   - Trial exhausted, subscription inactive → Has tokens → Can generate → Uses tokens

10. **TC-AUTH-3.2**: Active subscription preserves token balance
    - Active subscription, 50 tokens → Generate design → Balance still 50 → Payment method "subscription"

**Key Components Tested**:
- `[data-testid="token-purchase-modal"]`
- `[data-testid="token-balance"]`
- `[data-testid="package-0"]` through `[data-testid="package-3"]`
- `[data-testid="payment-method"]`
- `[data-testid="transaction-row"]`

### 2. Backend Integration Tests

#### `backend/tests/integration/test_token_deduction.py` (T040)

**Purpose**: Test atomic token deduction and race condition prevention

**Test Scenarios** (5 tests):

1. **TC-TOK-RACE-1.1**: Concurrent token deductions prevented by FOR UPDATE lock
   - 100 concurrent requests try to deduct from balance of 50
   - Exactly 50 succeed, 50 fail
   - Final balance is 0 (no race condition)

2. **TC-TOK-RACE-1.2**: CHECK constraint prevents negative token balance
   - Try to set balance to -1
   - UPDATE fails with constraint violation
   - Balance unchanged

3. **TC-TOK-RACE-1.3**: Token deduction with insufficient balance
   - Balance 50, try to deduct 51
   - Deduction fails
   - Balance remains 50

4. **TC-TOK-4.1**: Token refund after generation failure
   - Deduct 1 token → Generation fails → Refund 1 token
   - Balance restored to 50
   - Transaction history shows both deduction and refund

5. **Test multiple sequential token deductions**
   - Deduct 10 tokens sequentially
   - Final balance 40, total_spent 10

**Database Functions Tested**:
- Atomic token deduction with `FOR UPDATE`
- Token refund logic
- Transaction recording
- CHECK constraints

#### `backend/tests/integration/test_webhook_idempotency.py` (T041)

**Purpose**: Test webhook idempotency and duplicate prevention

**Test Scenarios** (6 tests):

1. **TC-WEBHOOK-1.1**: Duplicate webhook prevented by UNIQUE constraint
   - Process webhook twice with same payment_intent_id
   - First succeeds, second fails gracefully
   - Balance is 50 (not 100)
   - Only 1 transaction recorded

2. **TC-WEBHOOK-1.3**: Different payment_intent_id creates new transaction
   - Two webhooks with different payment_intent_ids
   - Both succeed
   - Balance is 100
   - 2 transactions recorded

3. **TC-WEBHOOK-2.1**: Webhook processing is atomic
   - Webhook with invalid data causes failure
   - No partial updates occur
   - Transaction rolls back completely

4. **TC-WEBHOOK-3.1**: Concurrent webhooks with same payment_intent_id
   - 10 concurrent webhooks with same payment_intent_id
   - Only 1 succeeds
   - 9 fail gracefully
   - Balance is 50 (not 500)

5. **Test webhook with multiple users same payment_intent**
   - Same payment_intent_id for different users
   - First user's webhook succeeds
   - Second user's webhook fails (globally unique)

**Key Mechanism Tested**:
- UNIQUE constraint on `stripe_payment_intent_id`
- Transaction atomicity
- Concurrent webhook handling
- Race condition prevention

#### `backend/tests/integration/test_stripe_checkout.py` (T042)

**Purpose**: Test Stripe checkout session creation and pricing

**Test Scenarios** (7 tests):

1. **TC-STRIPE-1.1**: Create checkout session for token package
   - Select package → Create session
   - Session has correct amount, metadata, URL

2. **TC-STRIPE-1.2**: All 4 packages have correct pricing
   - Verify each package:
     - Package 1: $10.00 for 10 tokens
     - Package 2: $45.00 for 50 tokens
     - Package 3: $90.00 for 100 tokens
     - Package 4: $400.00 for 500 tokens

3. **TC-STRIPE-1.3**: Checkout session includes customer email
   - Session contains customer_email field
   - Email used for receipt and webhook matching

4. **TC-STRIPE-1.4**: Checkout session redirect URLs
   - success_url and cancel_url configured correctly

5. **TC-STRIPE-2.1**: Invalid package selection returns error
   - Try to create session with invalid package_id
   - Raises ValueError

6. **Test checkout session metadata structure**
   - Metadata contains package_id and tokens
   - Used by webhook for crediting

7. **Test package pricing calculations**
   - Verify price_per_token calculations
   - Verify discount percentages (10% and 20%)

**Token Packages Tested**:
```python
[
  { "tokens": 10, "price": 1000, "per_token": "1.00", "discount": None },
  { "tokens": 50, "price": 4500, "per_token": "0.90", "discount": "10%" },
  { "tokens": 100, "price": 9000, "per_token": "0.90", "discount": "10%" },
  { "tokens": 500, "price": 40000, "per_token": "0.80", "discount": "20%" },
]
```

## Test Helpers Required

For E2E tests to run, these test helper endpoints are needed in the backend:

```python
# Test helpers (only available in test environment)
POST /test/set-trial-remaining
  Body: { "email": "user@test.com", "trial_remaining": 0 }

POST /test/add-tokens
  Body: { "email": "user@test.com", "tokens": 10 }

POST /test/mock-stripe-success
  Body: { "tokens": 50, "amount_paid": 4500, "payment_intent_id": "pi_xxx" }

POST /test/force-generation-failure
  Body: { "enabled": true }

POST /test/set-subscription
  Body: { "email": "user@test.com", "status": "active", "tier": "pro" }
```

## Requirements Coverage

### Functional Requirements

**Token Purchase (FR-017 to FR-025)**: ✅ All Covered
- FR-017: Token purchase via Stripe ✅
- FR-018: Webhook credits tokens ✅
- FR-019: Token deduction before generation ✅
- FR-020: Token refund on failure ✅
- FR-021: Package 1 (10 tokens, $10) ✅
- FR-022: Package 2 (50 tokens, $45) ✅
- FR-023: Package 3 (100 tokens, $90) ✅
- FR-024: Package 4 (500 tokens, $400) ✅
- FR-025: Token package selection UI ✅

**Atomic Operations (FR-026)**: ✅ Covered
- FR-026: Atomic token deduction with FOR UPDATE lock ✅

**Webhook Idempotency (FR-027)**: ✅ Covered
- FR-027: UNIQUE constraint on payment_intent_id ✅

**Authorization Hierarchy (FR-047, FR-048)**: ✅ Covered
- Tokens checked THIRD (after subscription and trial) ✅

**Refund Policy (FR-066)**: ✅ Covered
- FR-066: Refund tokens on generation failure ✅

### Non-Functional Requirements

**Data Integrity (NFR-2.2)**: ✅ Covered
- ACID transactions ✅
- Row-level locking (FOR UPDATE) ✅
- CHECK constraints ✅
- Race condition prevention ✅
- Webhook idempotency ✅

**Performance (NFR-2.3)**: ✅ Covered
- Token balance endpoint (<100ms) ✅
- Real-time balance updates (10-second refresh) ✅

## Expected Test Results (Current State)

**Current Status**: ❌ ALL TESTS SHOULD FAIL

This is **EXPECTED** and **CORRECT** for TDD:

```bash
# Backend tests
pytest backend/tests/integration/test_token_deduction.py
# Expected: 5 failures (implementation not yet created)

pytest backend/tests/integration/test_webhook_idempotency.py
# Expected: 6 failures (webhook handler not implemented)

pytest backend/tests/integration/test_stripe_checkout.py
# Expected: 7 failures (Stripe service not implemented)

# Frontend tests
npx playwright test tests/e2e/token-purchase.spec.ts
# Expected: 10 failures (components and API not implemented)
```

**Total**: 28 tests written, all should fail initially

## Next Steps: Backend Implementation (T044-T053)

Now that tests are written, we'll implement the backend to make them pass:

### Phase 4B: Backend Implementation

**T044**: Create `TokenAccount` Pydantic model
- Fields: user_id, balance, total_purchased, total_spent, created_at, updated_at

**T045**: Create `TokenTransaction` Pydantic model
- Fields: id, user_id, amount, transaction_type, description, stripe_payment_intent_id, price_paid_cents

**T046**: Implement `token_service.py` with atomic deduction
```python
async def deduct_token_atomic(user_id: UUID) -> tuple[bool, int]:
    """Deduct 1 token with FOR UPDATE lock."""
    async with pool.acquire() as conn:
        async with conn.transaction():
            balance = await conn.fetchval("""
                SELECT balance FROM users_token_accounts
                WHERE user_id = $1 FOR UPDATE
            """, user_id)

            if balance < 1:
                return False, balance

            await conn.execute("""
                UPDATE users_token_accounts u
                SET balance = u.balance - 1,
                    total_spent = u.total_spent + 1
                WHERE u.user_id = $1
            """, user_id)

            return True, balance - 1
```

**T047**: Implement `refund_token()` in token_service
```python
async def refund_token(user_id: UUID) -> tuple[bool, int]:
    """Refund 1 token after failed generation."""
    async with pool.acquire() as conn:
        async with conn.transaction():
            await conn.execute("""
                UPDATE users_token_accounts u
                SET balance = u.balance + 1,
                    total_spent = GREATEST(u.total_spent - 1, 0)
                WHERE u.user_id = $1
            """, user_id)
```

**T048**: Implement `stripe_service.py`
- Create checkout session
- Retrieve session
- Validate webhook signature

**T049**: Implement `webhook_service.py` with idempotency
- Process `checkout.session.completed` event
- UNIQUE constraint on payment_intent_id
- Credit tokens atomically

**T050**: Create `/purchase/checkout` endpoint
- Takes package_id
- Returns Stripe checkout session URL

**T051**: Create `/tokens/balance` endpoint (<100ms)
- Returns current token balance
- Cached with Redis (future optimization)

**T052**: Create `/webhooks/stripe` endpoint
- Validates signature
- Processes events idempotently
- Returns 200 immediately

**T053**: Extend generation authorization in `/generations/`
- Check authorization hierarchy: subscription > trial > tokens
- Deduct payment method accordingly

## Test-Driven Development Workflow

```mermaid
graph LR
    A[Write Tests] --> B[Run Tests - FAIL ❌]
    B --> C[Implement Code]
    C --> D[Run Tests - PASS ✅]
    D --> E[Refactor]
    E --> F[Run Tests Again - PASS ✅]
    F --> G[Next Feature]
```

**Current Stage**: A → B (Tests written, ready to implement)

## Summary

✅ **Test Phase Complete**: All 28 tests written following TDD
- 10 E2E tests for user flow
- 18 integration tests for backend logic

❌ **Expected Result**: All tests should currently FAIL (no implementation)

🚀 **Next Action**: Implement backend (T044-T053) to make tests PASS

This follows the proven TDD methodology used successfully in User Story 1, where:
1. Tests were written first
2. Implementation was created to make tests pass
3. All 17 backend tests passed ✅
4. 1/9 frontend E2E tests passed (waiting for backend server)

Now proceeding to backend implementation phase! 💪
