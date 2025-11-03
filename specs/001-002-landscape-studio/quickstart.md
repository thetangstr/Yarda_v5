# Quickstart Guide: AI Landscape Studio

**Feature Branch**: `001-002-landscape-studio`
**Last Updated**: 2025-11-03
**Status**: Implementation Ready

---

## Table of Contents

1. [Overview](#overview)
2. [Prerequisites](#prerequisites)
3. [Quick Setup](#quick-setup)
4. [Test Scenarios](#test-scenarios)
5. [API Examples](#api-examples)
6. [Common Workflows](#common-workflows)
7. [Troubleshooting](#troubleshooting)

---

## Overview

This guide provides quick-start instructions for implementing and testing the AI Landscape Studio feature. It includes:

- **Test Scenarios**: Complete test cases mapped to user stories (US1-US6)
- **API Examples**: cURL commands for all major endpoints
- **Workflows**: Step-by-step implementation guides
- **Edge Cases**: Critical race conditions and error scenarios

---

## Prerequisites

### Required Services

1. **Supabase**: PostgreSQL database with migrations applied
2. **Stripe**: Test mode account with webhook configured
3. **Google Gemini**: API key for 2.5 Flash model
4. **Vercel Blob**: Storage for generated images
5. **Firebase**: Authentication with email/password and Google OAuth

### Required Configuration

```bash
# Backend (.env)
DATABASE_URL=postgresql://user:pass@host:5432/yarda
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
GEMINI_API_KEY=AIza...
VERCEL_BLOB_READ_WRITE_TOKEN=vercel_blob_...
FIREBASE_PROJECT_ID=yarda-prod
JWT_SECRET=your-jwt-secret

# Frontend (.env.local)
VITE_API_URL=http://localhost:8000/v1
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_...
VITE_FIREBASE_API_KEY=AIza...
VITE_FIREBASE_AUTH_DOMAIN=yarda-prod.firebaseapp.com
```

---

## Quick Setup

### 1. Database Setup

```bash
# Apply all migrations
cd supabase
psql $DATABASE_URL -f migrations/001_create_users_table.sql
psql $DATABASE_URL -f migrations/002_create_token_accounts.sql
psql $DATABASE_URL -f migrations/003_create_token_transactions.sql
psql $DATABASE_URL -f migrations/004_create_generations.sql
psql $DATABASE_URL -f migrations/005_create_generation_areas.sql
psql $DATABASE_URL -f migrations/006_create_rate_limits.sql
psql $DATABASE_URL -f migrations/007_create_functions.sql
psql $DATABASE_URL -f migrations/008_create_triggers.sql
psql $DATABASE_URL -f migrations/009_create_rls_policies.sql
psql $DATABASE_URL -f migrations/010_create_indexes.sql

# Verify schema
psql $DATABASE_URL -c "\dt"
psql $DATABASE_URL -c "\df"
```

### 2. Backend Setup

```bash
cd backend
pip install -r requirements.txt
uvicorn src.main:app --reload --port 8000
```

### 3. Frontend Setup

```bash
cd frontend
npm install
npm run dev
```

### 4. Stripe Webhook Setup

```bash
# Install Stripe CLI
brew install stripe/stripe-cli/stripe

# Forward webhooks to local backend
stripe listen --forward-to localhost:8000/v1/webhooks/stripe
```

---

## Test Scenarios

### User Story 1: Trial User Registration and First Generation (P1)

**Test Case 1.1 - Happy Path: Registration with Trial Credits**

```bash
# Step 1: Register new user
curl -X POST http://localhost:8000/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "sarah@example.com",
    "password": "SecurePass123!"
  }'

# Expected Response:
{
  "user_id": "550e8400-e29b-41d4-a716-446655440000",
  "email": "sarah@example.com",
  "trial_remaining": 3,
  "verification_sent": true
}

# Step 2: Verify email
curl -X POST http://localhost:8000/v1/auth/verify-email \
  -H "Content-Type: application/json" \
  -d '{
    "token": "verification-token-from-email"
  }'

# Step 3: Login
curl -X POST http://localhost:8000/v1/auth/token \
  -H "Content-Type: application/json" \
  -d '{
    "email": "sarah@example.com",
    "password": "SecurePass123!"
  }'

# Expected Response:
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "token_type": "Bearer",
  "expires_in": 3600
}

# Step 4: Check balance
curl -X GET http://localhost:8000/v1/tokens/balance \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."

# Expected Response:
{
  "balance": 0,
  "trial_remaining": 3
}

# Step 5: Generate first design
curl -X POST http://localhost:8000/v1/generations \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -F "image=@/path/to/yard-photo.jpg" \
  -F 'areas=[{"area_type": "front_yard", "style": "modern_minimalist"}]'

# Expected Response:
{
  "generation_id": "650e8400-e29b-41d4-a716-446655440000",
  "status": "pending",
  "areas": [
    {
      "area_id": "750e8400-e29b-41d4-a716-446655440000",
      "area_type": "front_yard",
      "status": "pending"
    }
  ]
}

# Step 6: Poll for progress
curl -X GET http://localhost:8000/v1/generations/650e8400-e29b-41d4-a716-446655440000 \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."

# Expected Response (in-progress):
{
  "generation_id": "650e8400-e29b-41d4-a716-446655440000",
  "status": "processing",
  "progress": 45,
  "payment_type": "trial",
  "areas": [
    {
      "area_id": "750e8400-e29b-41d4-a716-446655440000",
      "status": "processing",
      "progress": 45
    }
  ]
}

# Expected Response (completed):
{
  "generation_id": "650e8400-e29b-41d4-a716-446655440000",
  "status": "completed",
  "progress": 100,
  "payment_type": "trial",
  "areas": [
    {
      "area_id": "750e8400-e29b-41d4-a716-446655440000",
      "status": "completed",
      "progress": 100,
      "image_urls": [
        "https://blob.vercel-storage.com/abc123.png"
      ]
    }
  ]
}

# Step 7: Verify trial decremented
curl -X GET http://localhost:8000/v1/tokens/balance \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."

# Expected Response:
{
  "balance": 0,
  "trial_remaining": 2
}
```

**Test Case 1.2 - Race Condition: Concurrent Trial Deductions**

```bash
# Generate 10 concurrent requests with trial_remaining=1
# Expected: Only 1 succeeds, 9 return "Insufficient trials"
# Final trial_remaining=0 (not negative)

for i in {1..10}; do
  curl -X POST http://localhost:8000/v1/generations \
    -H "Authorization: Bearer $TOKEN" \
    -F "image=@/path/to/yard.jpg" \
    -F 'areas=[{"area_type": "front_yard", "style": "modern_minimalist"}]' &
done
wait

# Verify database: trial_remaining >= 0
psql $DATABASE_URL -c "SELECT trial_remaining FROM users WHERE id = '$USER_ID';"
```

**Test Case 1.3 - Error Handling: Generation Failure Refund**

```bash
# Simulate Gemini API timeout by disabling internet or setting invalid API key
# Expected: Trial refunded automatically

# Check balance before
curl -X GET http://localhost:8000/v1/tokens/balance \
  -H "Authorization: Bearer $TOKEN"
# Response: trial_remaining=2

# Attempt generation (will fail)
curl -X POST http://localhost:8000/v1/generations \
  -H "Authorization: Bearer $TOKEN" \
  -F "image=@/path/to/yard.jpg" \
  -F 'areas=[{"area_type": "front_yard", "style": "modern_minimalist"}]'

# Poll for result
curl -X GET http://localhost:8000/v1/generations/$GENERATION_ID \
  -H "Authorization: Bearer $TOKEN"

# Expected Response:
{
  "status": "failed",
  "areas": [
    {
      "status": "failed",
      "error_message": "Generation failed, please try again"
    }
  ]
}

# Check balance after (trial refunded)
curl -X GET http://localhost:8000/v1/tokens/balance \
  -H "Authorization: Bearer $TOKEN"
# Response: trial_remaining=2 (refunded)
```

---

### User Story 2: Token Purchase and Pay-Per-Use Generation (P1)

**Test Case 2.1 - Happy Path: Token Purchase**

```bash
# Step 1: Create Stripe Checkout session
curl -X POST http://localhost:8000/v1/tokens/purchase \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "package_id": "tokens_50"
  }'

# Expected Response:
{
  "checkout_url": "https://checkout.stripe.com/c/pay/cs_test_...",
  "session_id": "cs_test_..."
}

# Step 2: Complete checkout in browser (use test card 4242 4242 4242 4242)

# Step 3: Stripe webhook fires (automatic)
# Webhook processes checkout.session.completed event
# Tokens credited atomically with stripe_payment_intent_id for idempotency

# Step 4: Verify balance
curl -X GET http://localhost:8000/v1/tokens/balance \
  -H "Authorization: Bearer $TOKEN"

# Expected Response:
{
  "balance": 50,
  "trial_remaining": 0
}

# Step 5: Check transaction history
curl -X GET http://localhost:8000/v1/tokens/transactions \
  -H "Authorization: Bearer $TOKEN"

# Expected Response:
{
  "transactions": [
    {
      "transaction_id": "850e8400-e29b-41d4-a716-446655440000",
      "amount": 50,
      "type": "purchase",
      "description": "Token purchase: 50 tokens",
      "balance_after": 50,
      "stripe_payment_intent_id": "pi_3ABC123",
      "created_at": "2025-11-03T10:30:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 1
  }
}
```

**Test Case 2.2 - Idempotency: Duplicate Webhook**

```bash
# Simulate duplicate webhook (Stripe retries on timeout)
# Send same webhook 3 times with same payment_intent_id

# Expected: Tokens credited only once due to UNIQUE constraint
# Database: Only 1 transaction record with that payment_intent_id

psql $DATABASE_URL -c "
  SELECT COUNT(*) FROM users_token_transactions
  WHERE stripe_payment_intent_id = 'pi_3ABC123';
"
# Expected: 1 (not 3)

psql $DATABASE_URL -c "
  SELECT balance FROM users_token_accounts
  WHERE user_id = '$USER_ID';
"
# Expected: 50 (not 150)
```

**Test Case 2.3 - Race Condition: Concurrent Token Deductions**

```bash
# Start with balance=1
# Send 10 concurrent generation requests
# Expected: Only 1 succeeds, 9 return "Insufficient tokens"

# Set balance to 1
psql $DATABASE_URL -c "
  UPDATE users_token_accounts
  SET balance = 1
  WHERE user_id = '$USER_ID';
"

# Fire 10 concurrent requests
for i in {1..10}; do
  curl -X POST http://localhost:8000/v1/generations \
    -H "Authorization: Bearer $TOKEN" \
    -F "image=@/path/to/yard.jpg" \
    -F 'areas=[{"area_type": "backyard", "style": "japanese_zen"}]' &
done
wait

# Verify results
# Expected: 1 generation created (status=pending)
# Expected: 9 requests failed with 402 "Insufficient tokens"

psql $DATABASE_URL -c "
  SELECT balance FROM users_token_accounts
  WHERE user_id = '$USER_ID';
"
# Expected: 0 (not negative)

psql $DATABASE_URL -c "
  SELECT COUNT(*) FROM users_token_transactions
  WHERE user_id = '$USER_ID' AND type = 'deduction';
"
# Expected: 1 (not 10)
```

---

### User Story 3: Auto-Reload Configuration (P2)

**Test Case 3.1 - Happy Path: Auto-Reload Trigger**

```bash
# Step 1: Enable auto-reload
curl -X PUT http://localhost:8000/v1/tokens/auto-reload \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "enabled": true,
    "threshold": 20,
    "amount": 100
  }'

# Expected Response:
{
  "enabled": true,
  "threshold": 20,
  "amount": 100,
  "failure_count": 0,
  "last_reload_at": null
}

# Step 2: Set balance to 20
psql $DATABASE_URL -c "
  UPDATE users_token_accounts
  SET balance = 20
  WHERE user_id = '$USER_ID';
"

# Step 3: Generate design (drops balance to 19)
curl -X POST http://localhost:8000/v1/generations \
  -H "Authorization: Bearer $TOKEN" \
  -F "image=@/path/to/yard.jpg" \
  -F 'areas=[{"area_type": "front_yard", "style": "modern_minimalist"}]'

# Expected: Auto-reload triggers within 5 seconds
# Stripe creates payment_intent, webhook credits 100 tokens

# Step 4: Verify balance after auto-reload
curl -X GET http://localhost:8000/v1/tokens/balance \
  -H "Authorization: Bearer $TOKEN"

# Expected Response:
{
  "balance": 119,  # 19 + 100 from auto-reload
  "trial_remaining": 0
}

# Step 5: Check transaction history
curl -X GET http://localhost:8000/v1/tokens/transactions?type=auto_reload \
  -H "Authorization: Bearer $TOKEN"

# Expected: 1 auto_reload transaction
```

**Test Case 3.2 - Throttle: Prevent Duplicate Auto-Reload**

```bash
# Auto-reload triggered 30 seconds ago
# Generate another design (drops below threshold again)
# Expected: No duplicate auto-reload (60-second throttle)

# Check last_reload_at
curl -X GET http://localhost:8000/v1/tokens/auto-reload \
  -H "Authorization: Bearer $TOKEN"

# Response: last_reload_at = "2025-11-03T10:30:00Z" (30s ago)

# Attempt generation
curl -X POST http://localhost:8000/v1/generations \
  -H "Authorization: Bearer $TOKEN" \
  -F "image=@/path/to/yard.jpg" \
  -F 'areas=[{"area_type": "backyard", "style": "california_native"}]'

# Expected: Generation succeeds
# Expected: Auto-reload NOT triggered (throttled)

# Verify transaction history
curl -X GET http://localhost:8000/v1/tokens/transactions?type=auto_reload \
  -H "Authorization: Bearer $TOKEN"

# Expected: Still only 1 auto_reload transaction
```

**Test Case 3.3 - Failure Handling: Disable After 3 Failures**

```bash
# Simulate card declined (use Stripe test card 4000 0000 0000 0341)

# Set failure_count to 2
psql $DATABASE_URL -c "
  UPDATE users_token_accounts
  SET auto_reload_failure_count = 2
  WHERE user_id = '$USER_ID';
"

# Trigger auto-reload (3rd failure)
curl -X POST http://localhost:8000/v1/generations \
  -H "Authorization: Bearer $TOKEN" \
  -F "image=@/path/to/yard.jpg" \
  -F 'areas=[{"area_type": "walkway", "style": "desert_landscape"}]'

# Expected: Generation succeeds (uses existing balance)
# Expected: Auto-reload fails (card declined)
# Expected: auto_reload_enabled set to false

# Verify auto-reload disabled
curl -X GET http://localhost:8000/v1/tokens/auto-reload \
  -H "Authorization: Bearer $TOKEN"

# Expected Response:
{
  "enabled": false,  # Disabled after 3 failures
  "threshold": 20,
  "amount": 100,
  "failure_count": 3
}
```

---

### User Story 4: Subscription Upgrade and Unlimited Generation (P2)

**Test Case 4.1 - Happy Path: Subscribe to Monthly Pro**

```bash
# Step 1: Create subscription checkout
curl -X POST http://localhost:8000/v1/subscriptions/subscribe \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "plan_id": "monthly_pro"
  }'

# Expected Response:
{
  "checkout_url": "https://checkout.stripe.com/c/pay/cs_test_..."
}

# Step 2: Complete checkout (card 4242 4242 4242 4242)

# Step 3: Verify subscription activated
curl -X GET http://localhost:8000/v1/subscriptions/current \
  -H "Authorization: Bearer $TOKEN"

# Expected Response:
{
  "subscription_id": "sub_1ABC123",
  "plan": "monthly_pro",
  "status": "active",
  "current_period_start": "2025-11-03T00:00:00Z",
  "current_period_end": "2025-12-03T00:00:00Z",
  "cancel_at_period_end": false
}

# Step 4: Verify token balance preserved
curl -X GET http://localhost:8000/v1/tokens/balance \
  -H "Authorization: Bearer $TOKEN"

# Expected Response:
{
  "balance": 30,  # Token balance unchanged
  "trial_remaining": 0
}

# Step 5: Generate design without token deduction
curl -X POST http://localhost:8000/v1/generations \
  -H "Authorization: Bearer $TOKEN" \
  -F "image=@/path/to/yard.jpg" \
  -F 'areas=[{"area_type": "front_yard", "style": "english_garden"}]'

# Step 6: Verify no token deducted
curl -X GET http://localhost:8000/v1/tokens/balance \
  -H "Authorization: Bearer $TOKEN"

# Expected Response:
{
  "balance": 30,  # Balance unchanged
  "trial_remaining": 0
}

# Step 7: Check generation record
curl -X GET http://localhost:8000/v1/generations/$GENERATION_ID \
  -H "Authorization: Bearer $TOKEN"

# Expected: payment_type="subscription", tokens_deducted=null
```

**Test Case 4.2 - Cancellation: Access Until Period End**

```bash
# Step 1: Cancel subscription
curl -X POST http://localhost:8000/v1/subscriptions/cancel \
  -H "Authorization: Bearer $TOKEN"

# Expected Response:
{
  "cancel_at_period_end": true,
  "current_period_end": "2025-12-03T00:00:00Z"
}

# Step 2: Verify still active until period end
curl -X GET http://localhost:8000/v1/subscriptions/current \
  -H "Authorization: Bearer $TOKEN"

# Expected Response:
{
  "status": "active",  # Still active
  "cancel_at_period_end": true,
  "current_period_end": "2025-12-03T00:00:00Z"
}

# Step 3: Generate design (should still work until Dec 3)
curl -X POST http://localhost:8000/v1/generations \
  -H "Authorization: Bearer $TOKEN" \
  -F "image=@/path/to/yard.jpg" \
  -F 'areas=[{"area_type": "backyard", "style": "modern_minimalist"}]'

# Expected: Generation succeeds without token deduction

# Step 4: Simulate period end (Dec 4)
# Webhook: customer.subscription.deleted

# Step 5: Verify reverted to token system
curl -X GET http://localhost:8000/v1/subscriptions/current \
  -H "Authorization: Bearer $TOKEN"

# Expected Response:
{
  "status": "cancelled"
}

# Step 6: Verify tokens required for generation
curl -X POST http://localhost:8000/v1/generations \
  -H "Authorization: Bearer $TOKEN" \
  -F "image=@/path/to/yard.jpg" \
  -F 'areas=[{"area_type": "front_yard", "style": "japanese_zen"}]'

# Expected: Token deducted (balance decrements from 30 to 29)
```

---

### User Story 5: Multi-Area Landscape Generation (P3)

**Test Case 5.1 - Happy Path: Parallel 3-Area Generation**

```bash
# Step 1: Create 3-area generation request
curl -X POST http://localhost:8000/v1/generations \
  -H "Authorization: Bearer $TOKEN" \
  -F "image=@/path/to/yard.jpg" \
  -F 'areas=[
    {"area_type": "front_yard", "style": "modern_minimalist", "custom_prompt": "Add native plants"},
    {"area_type": "backyard", "style": "japanese_zen", "custom_prompt": "Include koi pond"},
    {"area_type": "walkway", "style": "desert_landscape"}
  ]'

# Expected Response:
{
  "generation_id": "950e8400-e29b-41d4-a716-446655440000",
  "status": "pending",
  "areas": [
    {"area_id": "a50e8400-e29b-41d4-a716-446655440001", "area_type": "front_yard", "status": "pending"},
    {"area_id": "a50e8400-e29b-41d4-a716-446655440002", "area_type": "backyard", "status": "pending"},
    {"area_id": "a50e8400-e29b-41d4-a716-446655440003", "area_type": "walkway", "status": "pending"}
  ]
}

# Step 2: Verify 3 tokens deducted upfront
curl -X GET http://localhost:8000/v1/tokens/balance \
  -H "Authorization: Bearer $TOKEN"

# Expected: balance decreased by 3

# Step 3: Poll for progress (all areas update independently)
curl -X GET http://localhost:8000/v1/generations/950e8400-e29b-41d4-a716-446655440000 \
  -H "Authorization: Bearer $TOKEN"

# Expected Response (in-progress):
{
  "status": "processing",
  "progress": 50,
  "areas": [
    {"area_id": "...", "status": "completed", "progress": 100, "image_urls": ["https://..."]},
    {"area_id": "...", "status": "processing", "progress": 60},
    {"area_id": "...", "status": "processing", "progress": 40}
  ]
}

# Step 4: Verify completion time <90 seconds (parallel, not sequential)
# Time: ~60-90 seconds for all 3 (not 3×60=180 seconds)
```

**Test Case 5.2 - Partial Failure: 1 Area Fails, 2 Succeed**

```bash
# Simulate Gemini timeout for backyard only

# Expected: Front yard and walkway complete successfully
# Expected: Backyard shows error status
# Expected: 1 token refunded (2 tokens charged total)

curl -X GET http://localhost:8000/v1/generations/$GENERATION_ID \
  -H "Authorization: Bearer $TOKEN"

# Expected Response:
{
  "status": "completed",  # Overall status completed (partial success)
  "areas": [
    {
      "area_type": "front_yard",
      "status": "completed",
      "image_urls": ["https://..."]
    },
    {
      "area_type": "backyard",
      "status": "failed",
      "error_message": "Generation timeout"
    },
    {
      "area_type": "walkway",
      "status": "completed",
      "image_urls": ["https://..."]
    }
  ]
}

# Verify 1 token refunded
curl -X GET http://localhost:8000/v1/tokens/transactions \
  -H "Authorization: Bearer $TOKEN"

# Expected: 1 deduction (-3), 1 refund (+1), net -2 tokens
```

---

### User Story 6: Transaction History and Usage Analytics (P3)

**Test Case 6.1 - Transaction History with Pagination**

```bash
# Step 1: Generate 50 transactions
# (10 purchases, 30 deductions, 10 refunds)

# Step 2: Query transaction history
curl -X GET "http://localhost:8000/v1/tokens/transactions?page=1&limit=20" \
  -H "Authorization: Bearer $TOKEN"

# Expected Response:
{
  "transactions": [
    {
      "transaction_id": "...",
      "amount": -1,
      "type": "deduction",
      "description": "Generation for Front Yard",
      "balance_after": 49,
      "created_at": "2025-11-03T10:30:00Z"
    },
    # ... 19 more transactions
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 50
  }
}

# Step 3: Verify running balance accuracy
# Query all transactions and recalculate balance
curl -X GET "http://localhost:8000/v1/tokens/transactions?limit=50" \
  -H "Authorization: Bearer $TOKEN"

# Verify: Final balance_after matches current balance
```

**Test Case 6.2 - Filter by Type and Date Range**

```bash
# Filter purchases only, last 30 days
curl -X GET "http://localhost:8000/v1/tokens/transactions?type=purchase&start_date=2025-10-04&end_date=2025-11-03" \
  -H "Authorization: Bearer $TOKEN"

# Expected: Only purchase transactions in date range
# Expected: Response time <200ms
```

**Test Case 6.3 - Usage Statistics**

```bash
curl -X GET http://localhost:8000/v1/account/statistics \
  -H "Authorization: Bearer $TOKEN"

# Expected Response:
{
  "tokens_used_week": 23,
  "tokens_used_month": 87,
  "tokens_used_lifetime": 234,
  "designs_generated_week": 23,
  "designs_generated_month": 87,
  "designs_generated_lifetime": 234
}
```

---

## API Examples

### Authentication

```bash
# Register
curl -X POST http://localhost:8000/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email": "user@example.com", "password": "SecurePass123!"}'

# Login
curl -X POST http://localhost:8000/v1/auth/token \
  -H "Content-Type: application/json" \
  -d '{"email": "user@example.com", "password": "SecurePass123!"}'

# Verify Email
curl -X POST http://localhost:8000/v1/auth/verify-email \
  -H "Content-Type: application/json" \
  -d '{"token": "verification-token"}'
```

### Token Operations

```bash
# Get Balance
curl -X GET http://localhost:8000/v1/tokens/balance \
  -H "Authorization: Bearer $TOKEN"

# Purchase Tokens
curl -X POST http://localhost:8000/v1/tokens/purchase \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"package_id": "tokens_50"}'

# Transaction History
curl -X GET http://localhost:8000/v1/tokens/transactions \
  -H "Authorization: Bearer $TOKEN"
```

### Generation

```bash
# Create Generation (Single Area)
curl -X POST http://localhost:8000/v1/generations \
  -H "Authorization: Bearer $TOKEN" \
  -F "image=@/path/to/yard.jpg" \
  -F 'areas=[{"area_type": "front_yard", "style": "modern_minimalist"}]'

# Create Generation (Multi-Area)
curl -X POST http://localhost:8000/v1/generations \
  -H "Authorization: Bearer $TOKEN" \
  -F "image=@/path/to/yard.jpg" \
  -F 'areas=[
    {"area_type": "front_yard", "style": "modern_minimalist"},
    {"area_type": "backyard", "style": "japanese_zen"},
    {"area_type": "walkway", "style": "desert_landscape"}
  ]'

# Get Generation Status
curl -X GET http://localhost:8000/v1/generations/$GENERATION_ID \
  -H "Authorization: Bearer $TOKEN"
```

---

## Common Workflows

### Workflow 1: First-Time User Journey

1. Register with email/password → Receive verification email
2. Verify email → trial_remaining=3
3. Generate first design → trial_remaining=2
4. Generate second design → trial_remaining=1
5. Generate third design → trial_remaining=0
6. Attempt fourth design → "Trial Exhausted" modal
7. Purchase 50 tokens → balance=50
8. Continue generating with tokens

### Workflow 2: Power User with Auto-Reload

1. Purchase 100 tokens → balance=100
2. Enable auto-reload (threshold=20, amount=100)
3. Generate 81 designs → balance=19
4. Auto-reload triggers → balance=119
5. Continue generating seamlessly

### Workflow 3: Subscription User

1. Subscribe to Monthly Pro → subscription_status='active'
2. Generate unlimited designs → no token deduction
3. Token balance preserved throughout subscription
4. Cancel subscription → cancel_at_period_end=true
5. After period end → revert to token system

---

## Troubleshooting

### Issue: Tokens not credited after payment

**Diagnosis**:
```bash
# Check Stripe webhook logs
stripe logs tail --filter-events checkout.session.completed

# Check database for payment_intent_id
psql $DATABASE_URL -c "
  SELECT * FROM users_token_transactions
  WHERE stripe_payment_intent_id = 'pi_3ABC123';
"
```

**Solution**: Manually trigger webhook or contact Stripe support.

---

### Issue: Negative token balance

**Diagnosis**:
```bash
# Check for race condition
psql $DATABASE_URL -c "
  SELECT balance FROM users_token_accounts
  WHERE balance < 0;
"

# Check transaction log
psql $DATABASE_URL -c "
  SELECT * FROM users_token_transactions
  WHERE user_id = '$USER_ID'
  ORDER BY created_at DESC
  LIMIT 10;
"
```

**Solution**: This should never happen due to CHECK constraint. If it does, there's a critical bug in the deduction logic (FOR UPDATE not working).

---

### Issue: Generation stuck in "processing"

**Diagnosis**:
```bash
# Check generation status
psql $DATABASE_URL -c "
  SELECT * FROM generations
  WHERE status = 'processing'
  AND created_at < NOW() - INTERVAL '10 minutes';
"

# Check backend logs for Gemini API errors
```

**Solution**: Implement 5-minute timeout with automatic refund.

---

## Performance Benchmarks

| Endpoint | P95 Response Time | Target |
|----------|-------------------|--------|
| GET /tokens/balance | 50ms | <100ms |
| POST /tokens/deduct | 30ms | <50ms |
| GET /tokens/transactions | 150ms | <200ms |
| POST /generations (single) | 45 seconds | 30-60s |
| POST /generations (3 areas) | 75 seconds | 60-90s |

---

## Next Steps

1. **Run Integration Tests**: Execute all test scenarios in `tests/integration/`
2. **Load Testing**: Use Playwright to simulate 100+ concurrent users
3. **Security Audit**: Run OWASP ZAP scan on all endpoints
4. **Deploy to Staging**: Verify webhook configuration with Stripe production mode
5. **Monitor Metrics**: Set up Sentry, DataDog, or PostHog for error tracking

---

**Questions?** Contact the engineering team or refer to the [full specification](spec.md).
