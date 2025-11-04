# Subscription API - Quick Reference Guide

## Overview
The Yarda v5 subscription system provides Monthly Pro subscriptions at $99/month with unlimited landscape generations.

## Base URL
```
http://localhost:8000
```

## Authentication
Include JWT token in Authorization header:
```bash
Authorization: Bearer <user_id_token>
```

---

## API Endpoints

### 1. List Available Plans
Get all subscription plans with pricing and features.

```http
GET /subscriptions/plans
```

**Authentication:** Not required

**Response:**
```json
[
  {
    "plan_id": "monthly_pro",
    "name": "Monthly Pro",
    "description": "Unlimited landscape generations with priority processing",
    "price_monthly": 99.00,
    "price_cents": 9900,
    "features": [
      "Unlimited landscape generations",
      "Priority processing",
      "Advanced AI models",
      "Early access to new features",
      "Premium support",
      "No per-generation costs"
    ],
    "stripe_price_id": "price_1SPZ2IF7hxfSl7pFGtUJHKnB",
    "is_popular": true
  }
]
```

**cURL Example:**
```bash
curl http://localhost:8000/subscriptions/plans
```

---

### 2. Create Subscription
Create a Stripe Checkout session for subscription.

```http
POST /subscriptions/subscribe
```

**Authentication:** Required (verified email)

**Request Body:**
```json
{
  "plan_id": "monthly_pro",
  "success_url": "http://localhost:3000/subscription/success",
  "cancel_url": "http://localhost:3000/subscription/cancel"
}
```

**Response:**
```json
{
  "session_id": "cs_test_a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0",
  "url": "https://checkout.stripe.com/pay/cs_test_..."
}
```

**Errors:**
- `409 Conflict` - User already has active subscription
- `400 Bad Request` - Invalid plan_id or URLs
- `500 Internal Server Error` - Stripe API error

**cURL Example:**
```bash
curl -X POST http://localhost:8000/subscriptions/subscribe \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "plan_id": "monthly_pro",
    "success_url": "http://localhost:3000/subscription/success",
    "cancel_url": "http://localhost:3000/subscription/cancel"
  }'
```

**Frontend Flow:**
1. Call this endpoint to get checkout URL
2. Redirect user to `response.url`
3. Stripe handles payment
4. Webhook activates subscription
5. User redirected to `success_url`

---

### 3. Get Current Subscription
Get the authenticated user's subscription status.

```http
GET /subscriptions/current
```

**Authentication:** Required

**Response:**
```json
{
  "is_active": true,
  "plan": {
    "plan_id": "monthly_pro",
    "name": "Monthly Pro",
    "description": "Unlimited landscape generations with priority processing",
    "price_monthly": 99.00,
    "price_cents": 9900,
    "features": [...],
    "stripe_price_id": "price_1SPZ2IF7hxfSl7pFGtUJHKnB",
    "is_popular": true
  },
  "current_period_start": "2025-11-03T00:00:00Z",
  "current_period_end": "2025-12-03T00:00:00Z",
  "cancel_at_period_end": false,
  "status": "active"
}
```

**Status Values:**
- `active` - Subscription active, unlimited generations
- `past_due` - Payment failed, grace period (still unlimited)
- `cancelled` - Subscription cancelled, no access
- `inactive` - No subscription

**cURL Example:**
```bash
curl http://localhost:8000/subscriptions/current \
  -H "Authorization: Bearer <token>"
```

---

### 4. Cancel Subscription
Cancel the user's subscription.

```http
POST /subscriptions/cancel
```

**Authentication:** Required

**Request Body:**
```json
{
  "cancel_immediately": false
}
```

**Parameters:**
- `cancel_immediately` (boolean, optional, default: false)
  - `false` - Cancel at period end (recommended)
  - `true` - Cancel immediately

**Response:**
```json
{
  "success": true,
  "message": "Subscription will cancel at end of billing period",
  "cancel_at_period_end": true,
  "current_period_end": "2025-12-03T00:00:00Z"
}
```

**Errors:**
- `400 Bad Request` - No active subscription

**cURL Example:**
```bash
# Cancel at period end (recommended)
curl -X POST http://localhost:8000/subscriptions/cancel \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"cancel_immediately": false}'

# Cancel immediately
curl -X POST http://localhost:8000/subscriptions/cancel \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"cancel_immediately": true}'
```

---

### 5. Get Customer Portal
Get Stripe Customer Portal URL for self-service.

```http
GET /subscriptions/portal?return_url=http://localhost:3000/account
```

**Authentication:** Required

**Query Parameters:**
- `return_url` (string, required) - URL to return after portal session

**Response:**
```json
{
  "url": "https://billing.stripe.com/session/live_..."
}
```

**Customer Portal Features:**
- Update payment method
- View invoices
- Download receipts
- Update billing information
- Cancel subscription

**Errors:**
- `400 Bad Request` - User has no Stripe customer ID

**cURL Example:**
```bash
curl "http://localhost:8000/subscriptions/portal?return_url=http://localhost:3000/account" \
  -H "Authorization: Bearer <token>"
```

**Frontend Flow:**
1. Call this endpoint to get portal URL
2. Redirect user to `response.url`
3. User manages subscription on Stripe
4. Stripe redirects to `return_url`

---

## Webhook Events

### Endpoint
```http
POST /webhooks/stripe
```

**Headers:**
```
Stripe-Signature: t=...,v1=...,v0=...
```

### Supported Events

#### 1. customer.subscription.created
Fired when a new subscription is created.

**Action:** Activates subscription in database
- Sets `subscription_status = 'active'`
- Sets `subscription_tier = 'monthly_pro'`
- Stores Stripe subscription ID

#### 2. customer.subscription.updated
Fired when subscription is modified.

**Action:** Updates subscription status
- Updates `subscription_status`
- Updates `current_period_end`
- Updates `cancel_at_period_end`

#### 3. customer.subscription.deleted
Fired when subscription ends.

**Action:** Deactivates subscription
- Sets `subscription_status = 'cancelled'`
- Sets `subscription_tier = 'free'`
- Clears Stripe subscription ID

#### 4. invoice.payment_succeeded
Fired when recurring payment succeeds.

**Action:** Ensures subscription remains active
- Sets `subscription_status = 'active'`

#### 5. invoice.payment_failed
Fired when recurring payment fails.

**Action:** Updates to past_due
- Sets `subscription_status = 'past_due'`
- User gets 3-day grace period

---

## Authorization Hierarchy

When a user creates a landscape generation, the system checks payment methods in this order:

### 1. Active Subscription (Priority 1)
```python
if user.subscription_status in ['active', 'past_due']:
    # Unlimited generations, NO DEDUCTION
    return 'subscription'
```

**Statuses:**
- `active` - Normal active subscription
- `past_due` - Payment failed, 3-day grace period

**Behavior:**
- Unlimited landscape generations
- No trial or token deduction
- Full access to all features

### 2. Trial Credits (Priority 2)
```python
if trial_remaining > 0:
    # Limited generations, DEDUCT 1 TRIAL
    return 'trial'
```

**Behavior:**
- 3 free trials per user
- 1 trial deducted per generation
- Falls back to tokens when trials exhausted

### 3. Token Balance (Priority 3)
```python
if token_balance > 0:
    # Pay-per-use, DEDUCT 1 TOKEN
    return 'token'
```

**Behavior:**
- 1 token = 1 generation
- Tokens purchased via Stripe Checkout
- Auto-reload available

### 4. No Payment Method
```python
raise HTTPException(403, {
    "error": "insufficient_payment",
    "message": "No payment method available. Please purchase tokens or subscribe to Monthly Pro.",
    "trial_remaining": 0,
    "token_balance": 0,
    "subscription_status": "inactive"
})
```

---

## Subscription Lifecycle

### New Subscription
```
1. User clicks "Subscribe" → POST /subscriptions/subscribe
2. Backend creates Stripe Checkout session
3. User redirected to Stripe
4. User completes payment
5. Stripe webhook: customer.subscription.created
6. Backend activates subscription
7. User gets unlimited generations
```

### Active Subscription
```
User subscription_status = 'active'
├─ Creates generation
├─ Backend checks authorization_hierarchy()
├─ Returns 'subscription' (priority 1)
├─ NO deduction
└─ Generation proceeds
```

### Recurring Payment
```
1. Stripe charges card monthly
2. If successful: invoice.payment_succeeded webhook
   └─ Subscription remains active
3. If failed: invoice.payment_failed webhook
   └─ subscription_status = 'past_due'
   └─ User gets 3-day grace period
   └─ Still unlimited generations
```

### Cancellation
```
1. User cancels → POST /subscriptions/cancel
2. Backend cancels in Stripe (at period end)
3. Stripe webhook: customer.subscription.updated
   └─ cancel_at_period_end = true
4. User keeps access until current_period_end
5. On period end: customer.subscription.deleted webhook
6. Backend deactivates subscription
   └─ subscription_status = 'cancelled'
   └─ Falls back to trial/tokens
```

---

## Error Codes

### 400 Bad Request
```json
{
  "detail": "Invalid plan_id. Must be one of: monthly_pro"
}
```

```json
{
  "detail": "No active subscription found"
}
```

### 401 Unauthorized
```json
{
  "detail": "Invalid authentication token"
}
```

### 403 Forbidden
```json
{
  "detail": "Email verification required. Please check your email."
}
```

```json
{
  "detail": {
    "error": "insufficient_payment",
    "message": "No payment method available. Please purchase tokens or subscribe to Monthly Pro.",
    "trial_remaining": 0,
    "token_balance": 0,
    "subscription_status": "inactive"
  }
}
```

### 409 Conflict
```json
{
  "detail": {
    "error": "subscription_already_active",
    "message": "You already have an active subscription",
    "current_plan": "monthly_pro",
    "current_period_end": "2025-12-03T00:00:00Z"
  }
}
```

### 500 Internal Server Error
```json
{
  "detail": "Failed to create subscription checkout: <error message>"
}
```

---

## TypeScript/JavaScript Examples

### 1. List Plans
```typescript
const response = await fetch('http://localhost:8000/subscriptions/plans');
const plans = await response.json();
console.log(plans[0].name); // "Monthly Pro"
```

### 2. Create Subscription
```typescript
const response = await fetch('http://localhost:8000/subscriptions/subscribe', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${userToken}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    plan_id: 'monthly_pro',
    success_url: 'http://localhost:3000/subscription/success',
    cancel_url: 'http://localhost:3000/subscription/cancel',
  }),
});

const { url } = await response.json();
window.location.href = url; // Redirect to Stripe Checkout
```

### 3. Get Current Subscription
```typescript
const response = await fetch('http://localhost:8000/subscriptions/current', {
  headers: {
    'Authorization': `Bearer ${userToken}`,
  },
});

const subscription = await response.json();
if (subscription.is_active) {
  console.log('User has unlimited generations!');
  console.log('Renews on:', subscription.current_period_end);
}
```

### 4. Cancel Subscription
```typescript
const response = await fetch('http://localhost:8000/subscriptions/cancel', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${userToken}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    cancel_immediately: false, // Cancel at period end
  }),
});

const result = await response.json();
if (result.success) {
  console.log('Subscription will end on:', result.current_period_end);
}
```

### 5. Open Customer Portal
```typescript
const returnUrl = encodeURIComponent('http://localhost:3000/account');
const response = await fetch(
  `http://localhost:8000/subscriptions/portal?return_url=${returnUrl}`,
  {
    headers: {
      'Authorization': `Bearer ${userToken}`,
    },
  }
);

const { url } = await response.json();
window.location.href = url; // Redirect to Stripe Portal
```

---

## Testing with Stripe CLI

### 1. Install Stripe CLI
```bash
brew install stripe/stripe-cli/stripe
```

### 2. Login
```bash
stripe login
```

### 3. Forward Webhooks to Local Server
```bash
stripe listen --forward-to localhost:8000/webhooks/stripe
```

### 4. Trigger Test Events
```bash
# Trigger subscription created
stripe trigger customer.subscription.created

# Trigger subscription updated
stripe trigger customer.subscription.updated

# Trigger subscription deleted
stripe trigger customer.subscription.deleted

# Trigger invoice payment succeeded
stripe trigger invoice.payment_succeeded

# Trigger invoice payment failed
stripe trigger invoice.payment_failed
```

---

## Environment Variables

```bash
# Stripe Keys
STRIPE_SECRET_KEY=sk_test_...
STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Stripe Price ID for Monthly Pro
STRIPE_MONTHLY_PRO_PRICE_ID=price_1SPZ2IF7hxfSl7pFGtUJHKnB

# Application URLs
APP_URL=http://localhost:3000
API_URL=http://localhost:8000
```

---

## Database Schema Reference

### Users Table - Subscription Fields
```sql
subscription_tier VARCHAR(50) DEFAULT 'free' NOT NULL
  CHECK (subscription_tier IN ('free', '7day_pass', 'per_property', 'monthly_pro'))

subscription_status VARCHAR(50) DEFAULT 'inactive' NOT NULL
  CHECK (subscription_status IN ('inactive', 'active', 'past_due', 'cancelled'))

stripe_customer_id VARCHAR(255) UNIQUE

stripe_subscription_id VARCHAR(255)

current_period_end TIMESTAMP WITH TIME ZONE

cancel_at_period_end BOOLEAN DEFAULT false NOT NULL
```

---

## Common Use Cases

### Check if User Has Active Subscription
```typescript
const response = await fetch('/subscriptions/current', {
  headers: { 'Authorization': `Bearer ${token}` }
});
const sub = await response.json();

if (sub.is_active && !sub.cancel_at_period_end) {
  // User has active subscription
  // Show "Unlimited Generations" badge
}
```

### Show Subscription Status
```typescript
const sub = await getSubscription();

if (sub.status === 'active') {
  if (sub.cancel_at_period_end) {
    return `Active until ${sub.current_period_end}`;
  } else {
    return `Renews on ${sub.current_period_end}`;
  }
} else if (sub.status === 'past_due') {
  return 'Payment failed - please update payment method';
} else {
  return 'No active subscription';
}
```

### Handle Subscription Button
```typescript
const sub = await getSubscription();

if (sub.is_active) {
  if (sub.cancel_at_period_end) {
    // Show "Reactivate" button
    // User can resume subscription
  } else {
    // Show "Manage Subscription" button
    // Opens customer portal
  }
} else {
  // Show "Subscribe Now" button
  // Creates new subscription
}
```

---

## Support & Troubleshooting

### User Already Has Active Subscription
**Error:** 409 Conflict
**Solution:** Check current subscription first, show manage/cancel options

### Webhook Not Firing
**Check:**
1. Webhook endpoint configured in Stripe Dashboard
2. Webhook secret matches environment variable
3. Webhook signature verification passes
4. Server is reachable from Stripe

### Subscription Not Activating
**Check:**
1. Webhook event received (check logs)
2. User ID in metadata
3. Database connection
4. Stripe subscription ID stored

### User Can't Create Generations
**Check:**
1. Subscription status is 'active' or 'past_due'
2. Authorization hierarchy logic
3. Database query for subscription_status

---

**Last Updated:** 2025-11-03
**API Version:** 1.0.0
**Backend:** FastAPI + Python
**Payment:** Stripe
