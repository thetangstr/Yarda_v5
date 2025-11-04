# Stripe Subscription Setup Guide

## Quick Setup for Monthly Pro Subscription

### Step 1: Create Subscription Product in Stripe

1. **Log in to Stripe Dashboard**
   - Go to: https://dashboard.stripe.com
   - Select your account

2. **Navigate to Products**
   - Click "Products" in left sidebar
   - Or go directly to: https://dashboard.stripe.com/products

3. **Create New Product**
   - Click "+ Add product" button
   - Fill in product details:

```
Product Name: Yarda Monthly Pro
Description: Unlimited AI landscape generations with priority processing
```

4. **Configure Pricing**
   - Pricing model: `Standard pricing`
   - Price: `$99.00` USD
   - Billing period: `Monthly`
   - Price description (optional): `Monthly Pro Subscription`

5. **Additional Options (Optional)**
   - Tax category: Software as a Service (SaaS)
   - Statement descriptor: `YARDA PRO`
   - Customer emails: ✅ Send invoice emails

6. **Save Product**
   - Click "Save product"
   - Product is now created!

---

### Step 2: Copy Price ID

1. After saving, you'll see the product page
2. Under "Pricing", you'll see the price you just created
3. Click on the price to expand details
4. Copy the **Price ID** (starts with `price_`)

**Example Price ID**:
```
price_1QAbCdEfGhIjKlMnOpQrStUv
```

**Important**: This is different from the Product ID. Make sure you copy the **Price ID**, not the Product ID.

---

### Step 3: Add Price ID to Environment Variables

#### Development (Local)

Add to `/Volumes/home/Projects_Hosted/Yarda_v5/backend/.env.local`:

```bash
STRIPE_MONTHLY_PRO_PRICE_ID=price_1QAbCdEfGhIjKlMnOpQrStUv
```

#### Production (Vercel)

```bash
# Method 1: Vercel CLI
vercel env add STRIPE_MONTHLY_PRO_PRICE_ID production
# When prompted, paste your price ID

# Method 2: Vercel Dashboard
# 1. Go to: https://vercel.com/your-project/settings/environment-variables
# 2. Click "Add New"
# 3. Name: STRIPE_MONTHLY_PRO_PRICE_ID
# 4. Value: price_1QAbCdEfGhIjKlMnOpQrStUv
# 5. Environment: Production
# 6. Click "Save"
```

---

### Step 4: Configure Webhook Events

Your webhook endpoint is already set up, but ensure these events are enabled:

**Webhook URL**: `https://your-domain.com/webhooks/stripe`

**Required Events**:
- ✅ `customer.subscription.created`
- ✅ `customer.subscription.updated`
- ✅ `customer.subscription.deleted`
- ✅ `invoice.payment_succeeded`
- ✅ `invoice.payment_failed`
- ✅ `checkout.session.completed` (already configured)

**How to Configure**:

1. Go to: https://dashboard.stripe.com/webhooks
2. Click on your webhook endpoint
3. Click "Add events" if any are missing
4. Select the events listed above
5. Click "Add events"

---

### Step 5: Test in Stripe Test Mode

Before going live, test in Stripe Test Mode:

1. **Switch to Test Mode**
   - Toggle "Test mode" in Stripe Dashboard (top right)

2. **Create Test Product**
   - Follow Steps 1-2 to create a test product
   - Copy the TEST price ID (starts with `price_test_`)

3. **Add Test Price ID**
   ```bash
   STRIPE_MONTHLY_PRO_PRICE_ID=price_test_1QAbCdEfGhIjKlMnOpQrStUv
   ```

4. **Test Subscription**
   - Use test card: `4242 4242 4242 4242`
   - Expiry: Any future date
   - CVC: Any 3 digits
   - ZIP: Any 5 digits

5. **Test Webhook Events**
   - Use Stripe CLI for local webhook testing:
   ```bash
   stripe listen --forward-to localhost:8000/webhooks/stripe
   ```

---

## Testing Checklist

### Manual Test Flow

- [ ] **Subscribe to Monthly Pro**
  1. Click "Subscribe" button
  2. Complete Stripe Checkout with test card
  3. Verify redirect to success URL
  4. Check webhook processed (`customer.subscription.created`)
  5. Verify database: `subscription_status = 'active'`

- [ ] **Unlimited Generations**
  1. Create landscape generation
  2. Verify no token/trial deduction
  3. Create 10+ generations
  4. Verify all succeed without payment

- [ ] **Cancel Subscription**
  1. Click "Cancel Subscription"
  2. Verify access continues until period end
  3. Check `cancel_at_period_end = true`
  4. Wait until period end (or simulate)
  5. Verify subscription deactivates

- [ ] **Failed Payment**
  1. Trigger failed payment in Stripe
  2. Verify status → `past_due`
  3. Verify user still has access (grace period)
  4. Update payment method
  5. Verify status → `active`

- [ ] **Customer Portal**
  1. Click "Manage Subscription"
  2. Verify portal opens
  3. Update payment method
  4. View invoices
  5. Cancel subscription

---

## Stripe Dashboard Navigation

### Key Pages

| Page | URL | Purpose |
|------|-----|---------|
| Products | https://dashboard.stripe.com/products | Manage subscription products |
| Prices | https://dashboard.stripe.com/prices | View all pricing plans |
| Subscriptions | https://dashboard.stripe.com/subscriptions | View active subscriptions |
| Customers | https://dashboard.stripe.com/customers | View customer list |
| Webhooks | https://dashboard.stripe.com/webhooks | Configure webhook events |
| Events | https://dashboard.stripe.com/events | View webhook event log |
| Logs | https://dashboard.stripe.com/logs | API request logs |

---

## Test Cards

### Successful Payment
```
Card: 4242 4242 4242 4242
```

### Failed Payment
```
Card: 4000 0000 0000 0341
```

### Requires 3D Secure
```
Card: 4000 0027 6000 3184
```

### Declined Card
```
Card: 4000 0000 0000 0002
```

All test cards:
- Expiry: Any future date (e.g., 12/34)
- CVC: Any 3 digits (e.g., 123)
- ZIP: Any 5 digits (e.g., 12345)

---

## Troubleshooting

### Price ID Not Found

**Error**: "Invalid price_id"

**Solution**:
1. Verify you copied the **Price ID**, not Product ID
2. Check it starts with `price_` (or `price_test_` in test mode)
3. Ensure you're in the correct mode (test vs. live)

### Webhook Not Firing

**Error**: Subscription created but database not updated

**Solution**:
1. Check webhook is configured in Stripe Dashboard
2. Verify webhook URL is correct and accessible
3. Check webhook secret is correct
4. View Events page in Stripe to see if webhook was sent
5. Check backend logs for webhook processing errors

### Customer Portal Not Loading

**Error**: "Customer has no Stripe customer ID"

**Solution**:
1. User must complete a purchase or subscription first
2. Stripe creates customer_id during first transaction
3. Check `users.stripe_customer_id` is populated

### Subscription Not Activating

**Error**: Webhook received but status still 'inactive'

**Solution**:
1. Check webhook handler logs for errors
2. Verify subscription_id is stored in database
3. Check Stripe subscription status is 'active'
4. Verify user_id mapping is correct

---

## Production Checklist

Before going live:

- [ ] Create LIVE product in Stripe (not test mode)
- [ ] Copy LIVE price ID (starts with `price_`, not `price_test_`)
- [ ] Add LIVE price ID to production environment variables
- [ ] Configure webhook endpoint for production domain
- [ ] Test webhook delivery from Stripe to production
- [ ] Enable all required webhook events
- [ ] Set up email notifications for failed payments
- [ ] Configure Stripe billing portal settings
- [ ] Set up Stripe tax collection (if required)
- [ ] Enable Stripe Radar for fraud prevention
- [ ] Set up monitoring alerts for subscription events

---

## Stripe Settings Recommendations

### Billing Portal Settings

Go to: https://dashboard.stripe.com/settings/billing/portal

Recommended configuration:
- ✅ Allow customers to update payment methods
- ✅ Allow customers to view invoices
- ✅ Allow customers to cancel subscriptions
- ❌ Disable immediate cancellation (force end-of-period)
- ✅ Send cancellation emails
- ✅ Send payment failure emails

### Email Settings

Go to: https://dashboard.stripe.com/settings/emails

Recommended emails:
- ✅ Successful payments
- ✅ Failed payments
- ✅ Subscription created
- ✅ Subscription cancelled
- ✅ Upcoming invoice

### Tax Settings

Go to: https://dashboard.stripe.com/settings/tax

- Configure based on your jurisdiction
- Consider Stripe Tax for automatic calculation

---

## Support

### Stripe Resources

- **Documentation**: https://stripe.com/docs/billing/subscriptions/overview
- **API Reference**: https://stripe.com/docs/api/subscriptions
- **Webhook Guide**: https://stripe.com/docs/webhooks
- **Support**: https://support.stripe.com

### Internal Resources

- Implementation Summary: `/PHASE_6_SUBSCRIPTION_COMPLETE.md`
- API Endpoints: `/backend/src/api/endpoints/subscriptions.py`
- Service Logic: `/backend/src/services/subscription_service.py`
- Webhook Handlers: `/backend/src/services/webhook_service.py`

---

## Environment Variables Reference

All required Stripe environment variables:

```bash
# Stripe API Keys
STRIPE_SECRET_KEY=sk_test_xxxxxxxxxxxxx
STRIPE_PUBLISHABLE_KEY=pk_test_xxxxxxxxxxxxx
STRIPE_WEBHOOK_SECRET=whsec_xxxxxxxxxxxxx

# Subscription Price IDs
STRIPE_MONTHLY_PRO_PRICE_ID=price_xxxxxxxxxxxxx

# Optional: Future subscription tiers
# STRIPE_WEEKLY_PASS_PRICE_ID=price_xxxxxxxxxxxxx
# STRIPE_ANNUAL_PRO_PRICE_ID=price_xxxxxxxxxxxxx
```

**Security Note**: Never commit these values to Git. Always use `.env.local` (gitignored) for local development and environment variable managers for production.
