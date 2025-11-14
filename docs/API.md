# API Reference

Complete API endpoint documentation for Yarda AI Landscape Studio backend.

## Base URL

**Production:** `https://yarda-api-production.up.railway.app`
**Local:** `http://localhost:8000`

## Authentication

All endpoints except `/health` and webhooks require authentication via JWT bearer token.

**Header:**
```
Authorization: Bearer <access_token>
```

**Obtaining Token:**
- User authenticates via Supabase OAuth (Google)
- Frontend receives session with `access_token`
- Token included in all API requests

**Token Verification:**
- Backend verifies JWT signature with Supabase public key
- Extracts user ID from token claims
- No database lookup needed for auth (stateless)

---

## Error Responses

All errors follow this format:

```json
{
  "detail": "Error message describing what went wrong"
}
```

**Common HTTP Status Codes:**
- `200` - Success
- `201` - Resource created
- `400` - Bad request (validation error)
- `401` - Unauthorized (missing or invalid token)
- `403` - Forbidden (insufficient permissions)
- `404` - Resource not found
- `409` - Conflict (e.g., insufficient credits)
- `500` - Internal server error

---

## Health Check

### GET /health

Check if API is running.

**Authentication:** None required

**Response:**
```json
{
  "status": "healthy"
}
```

---

## Generations

### POST /v1/generations

Create a new generation request.

**Authentication:** Required

**Request:**
```json
{
  "address": "123 Main St, San Francisco, CA 94102",
  "areas": ["front_yard", "backyard"],
  "prompt": "Modern minimalist patio with drought-resistant plants"
}
```

**Field Validation:**
- `address` (string, required): Valid US address
- `areas` (array, required): One or more of `["front_yard", "backyard", "walkway"]`
- `prompt` (string, required): 10-500 characters

**Response (201 Created):**
```json
{
  "id": "gen_abc123",
  "user_id": "user_xyz789",
  "address": "123 Main St, San Francisco, CA 94102",
  "location": {
    "lat": 37.7749,
    "lng": -122.4194
  },
  "areas": ["front_yard", "backyard"],
  "prompt": "Modern minimalist patio with drought-resistant plants",
  "status": "pending",
  "image_urls": {
    "front_yard": {
      "original": null,
      "transformed": null
    },
    "backyard": {
      "original": null,
      "transformed": null
    }
  },
  "credits_remaining": 2,
  "estimated_completion_seconds": 120,
  "created_at": "2025-11-13T10:00:00Z"
}
```

**Errors:**
- `409` - Insufficient credits
- `400` - Invalid address or areas
- `422` - Validation error (prompt too short/long)

---

### GET /v1/generations/{id}

Get generation status and results.

**Authentication:** Required

**Response (200 OK):**
```json
{
  "id": "gen_abc123",
  "user_id": "user_xyz789",
  "address": "123 Main St, San Francisco, CA 94102",
  "status": "completed",
  "image_urls": {
    "front_yard": {
      "original": "https://blob.vercel-storage.com/...",
      "transformed": "https://blob.vercel-storage.com/..."
    },
    "backyard": {
      "original": "https://blob.vercel-storage.com/...",
      "transformed": "https://blob.vercel-storage.com/..."
    }
  },
  "credits_remaining": 1,
  "created_at": "2025-11-13T10:00:00Z",
  "completed_at": "2025-11-13T10:02:15Z"
}
```

**Status Values:**
- `pending` - Queued, not started
- `processing` - AI generation in progress
- `completed` - Success, images ready
- `failed` - Error occurred

**Errors:**
- `404` - Generation not found
- `403` - User doesn't own this generation

---

### GET /v1/generations

List user's generation history.

**Authentication:** Required

**Query Parameters:**
- `limit` (int, optional): Max results (default: 20, max: 100)
- `offset` (int, optional): Pagination offset (default: 0)

**Response (200 OK):**
```json
{
  "generations": [
    {
      "id": "gen_abc123",
      "address": "123 Main St",
      "status": "completed",
      "created_at": "2025-11-13T10:00:00Z"
    }
  ],
  "total": 42,
  "limit": 20,
  "offset": 0
}
```

---

## Users

### GET /v1/users/me

Get current user profile.

**Authentication:** Required

**Response (200 OK):**
```json
{
  "id": "user_xyz789",
  "email": "user@example.com",
  "email_verified": true,
  "trial_remaining": 2,
  "trial_used": 1,
  "token_balance": 10,
  "subscription_status": null,
  "subscription_tier": null,
  "preferred_language": "en",
  "created_at": "2025-11-01T00:00:00Z"
}
```

---

### GET /v1/users/me/profile

Get user profile with language preference (Feature 006 - i18n).

**Authentication:** Required

**Response (200 OK):**
```json
{
  "id": "user_xyz789",
  "email": "user@example.com",
  "preferred_language": "es"
}
```

**Errors:**
- `401` - Unauthorized (silently handled on client)
- `403` - Forbidden (silently handled on client)

---

### PUT /v1/users/preferences/language

Update user's language preference (Feature 006 - i18n).

**Authentication:** Required

**Request:**
```json
{
  "language": "zh"
}
```

**Validation:**
- `language` must be one of: `en`, `es`, `zh`

**Response (200 OK):**
```json
{
  "success": true,
  "language": "zh"
}
```

**Errors:**
- `400` - Invalid language code
- `401` - Unauthorized

---

## Tokens

### GET /v1/tokens/balance

Get user's token balance.

**Authentication:** Required

**Response (200 OK):**
```json
{
  "balance": 25
}
```

---

### POST /v1/tokens/purchase

Create Stripe Checkout session for token purchase.

**Authentication:** Required

**Request:**
```json
{
  "package": "pro",
  "success_url": "https://yarda.app/purchase/success",
  "cancel_url": "https://yarda.app/purchase/cancel"
}
```

**Package Options:**
- `starter`: 10 tokens, $9.99
- `pro`: 50 tokens, $39.99
- `enterprise`: 200 tokens, $129.99

**Response (200 OK):**
```json
{
  "checkout_url": "https://checkout.stripe.com/...",
  "session_id": "cs_test_..."
}
```

**Flow:**
1. Frontend calls this endpoint
2. Backend creates Stripe Checkout session
3. Frontend redirects user to `checkout_url`
4. User completes payment on Stripe
5. Stripe webhook notifies backend
6. Backend adds tokens to user balance

---

## Subscriptions

### POST /v1/subscriptions/subscribe

Create subscription via Stripe Checkout.

**Authentication:** Required

**Request:**
```json
{
  "plan": "pro",
  "success_url": "https://yarda.app/subscription/success",
  "cancel_url": "https://yarda.app/subscription/cancel"
}
```

**Plans:**
- `pro`: $99/month, unlimited generations

**Response (200 OK):**
```json
{
  "checkout_url": "https://checkout.stripe.com/...",
  "session_id": "cs_test_..."
}
```

---

### POST /v1/subscriptions/portal

Get Stripe Customer Portal URL for subscription management.

**Authentication:** Required

**Request:**
```json
{
  "return_url": "https://yarda.app/account"
}
```

**Response (200 OK):**
```json
{
  "portal_url": "https://billing.stripe.com/..."
}
```

**Portal Features:**
- Update payment method
- Cancel subscription
- View invoices
- Download receipts

---

## Holiday Decorator (Feature 007)

### POST /v1/holiday/generations

Create holiday decoration generation.

**Authentication:** Required

**Request:**
```json
{
  "address": "123 Main St, San Francisco, CA",
  "heading": 90,
  "pitch": 0,
  "style": "christmas"
}
```

**Field Validation:**
- `address` (string, required): Valid US address
- `heading` (float, required): 0-360 degrees (Street View heading)
- `pitch` (float, required): -90 to 90 degrees (Street View pitch)
- `style` (string, required): One of `["christmas", "halloween", "thanksgiving"]`

**Response (201 Created):**
```json
{
  "id": "holiday_gen_abc123",
  "user_id": "user_xyz789",
  "address": "123 Main St, San Francisco, CA",
  "location": {
    "lat": 37.7749,
    "lng": -122.4194
  },
  "street_view_heading": 90,
  "street_view_pitch": 0,
  "style": "christmas",
  "status": "pending",
  "original_image_url": null,
  "decorated_image_url": null,
  "before_after_image_url": null,
  "credits_remaining": 0,
  "estimated_completion_seconds": 10,
  "created_at": "2025-11-13T10:00:00Z"
}
```

**Errors:**
- `409` - Insufficient holiday credits
- `400` - Invalid address or style

---

### GET /v1/holiday/generations/{id}

Get holiday generation status.

**Authentication:** Required

**Response (200 OK):**
```json
{
  "id": "holiday_gen_abc123",
  "status": "completed",
  "original_image_url": "https://blob.vercel-storage.com/...",
  "decorated_image_url": "https://blob.vercel-storage.com/...",
  "before_after_image_url": "https://blob.vercel-storage.com/...",
  "credits_remaining": 2,
  "completed_at": "2025-11-13T10:00:15Z"
}
```

---

### GET /v1/holiday/credits

Get holiday credit balance.

**Authentication:** Required

**Response (200 OK):**
```json
{
  "credits": 2,
  "shares_today": 1,
  "max_shares_per_day": 3
}
```

---

### GET /v1/holiday/generations

List user's holiday generation history.

**Authentication:** Required

**Query Parameters:**
- `limit` (int, optional): Max results (default: 20, max: 100)
- `offset` (int, optional): Pagination offset (default: 0)

**Response (200 OK):**
```json
{
  "generations": [
    {
      "id": "holiday_gen_abc123",
      "style": "christmas",
      "status": "completed",
      "created_at": "2025-11-13T10:00:00Z"
    }
  ],
  "total": 5,
  "limit": 20,
  "offset": 0
}
```

---

## Webhooks

### POST /v1/webhooks/stripe

Stripe webhook endpoint for payment events.

**Authentication:** Webhook signature verification (not JWT)

**Signature Verification:**
```python
signature = request.headers.get("stripe-signature")
event = stripe.Webhook.construct_event(
    request.body,
    signature,
    STRIPE_WEBHOOK_SECRET
)
```

**Handled Events:**
- `checkout.session.completed` - Token purchase or subscription creation
- `invoice.payment_succeeded` - Subscription renewal
- `customer.subscription.deleted` - Subscription cancelled

**Response (200 OK):**
```json
{
  "status": "success"
}
```

**Idempotency:**
- Backend stores processed event IDs in database
- Duplicate events ignored
- Prevents duplicate token additions or subscription updates

---

## Rate Limiting

**Not currently implemented.**

Future implementation:
- 100 requests/minute per user (authenticated endpoints)
- 10 requests/minute per IP (unauthenticated endpoints)

---

## Pagination

All list endpoints support pagination:

**Query Parameters:**
- `limit` (int): Max results per page (default: 20, max: 100)
- `offset` (int): Number of items to skip (default: 0)

**Response Format:**
```json
{
  "results": [...],
  "total": 100,
  "limit": 20,
  "offset": 40
}
```

**Example:**
```
GET /v1/generations?limit=20&offset=40
```

Returns items 41-60 of 100 total results.

---

## Testing

### Test Mode (Stripe)

All endpoints work in Stripe test mode:

- Use test API keys: `sk_test_...`, `pk_test_...`
- Use test cards: `4242 4242 4242 4242`
- No real charges

### Local Webhook Testing

```bash
# Install Stripe CLI
stripe listen --forward-to localhost:8000/v1/webhooks/stripe

# Trigger test event
stripe trigger payment_intent.succeeded
```

---

For architecture details, see [ARCHITECTURE.md](ARCHITECTURE.md).
For deployment environments, see [DEPLOYMENT.md](DEPLOYMENT.md).
For database schema, see [DATABASE.md](DATABASE.md).
