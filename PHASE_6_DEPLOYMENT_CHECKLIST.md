# Phase 6: Deployment Checklist

## Pre-Deployment Tasks

### 1. Stripe Configuration
- [ ] Create Monthly Pro product in Stripe Dashboard
  - Product name: "Yarda Monthly Pro"
  - Price: $99/month recurring
- [ ] Copy Price ID (starts with `price_`)
- [ ] Test in Stripe Test Mode first
  - Create test product
  - Get test price ID (`price_test_`)
  - Test subscription flow

### 2. Environment Variables
- [ ] Add to local `.env.local`:
  ```bash
  STRIPE_MONTHLY_PRO_PRICE_ID=price_xxxxxxxxxxxxx
  ```
- [ ] Add to production (Vercel):
  ```bash
  vercel env add STRIPE_MONTHLY_PRO_PRICE_ID production
  ```
- [ ] Verify all Stripe keys are configured:
  - [ ] `STRIPE_SECRET_KEY`
  - [ ] `STRIPE_PUBLISHABLE_KEY`
  - [ ] `STRIPE_WEBHOOK_SECRET`
  - [ ] `STRIPE_MONTHLY_PRO_PRICE_ID`

### 3. Webhook Configuration
- [ ] Verify webhook endpoint: `/webhooks/stripe`
- [ ] Ensure these events are enabled:
  - [ ] `customer.subscription.created`
  - [ ] `customer.subscription.updated`
  - [ ] `customer.subscription.deleted`
  - [ ] `invoice.payment_succeeded`
  - [ ] `invoice.payment_failed`
  - [ ] `checkout.session.completed`
- [ ] Test webhook delivery in Stripe Dashboard

---

## Testing Checklist

### Unit Tests
- [ ] SubscriptionService.create_checkout_session()
- [ ] SubscriptionService.cancel_subscription()
- [ ] SubscriptionService.activate_subscription()
- [ ] WebhookService.process_subscription_created()
- [ ] WebhookService.process_subscription_updated()
- [ ] WebhookService.process_subscription_deleted()

### Integration Tests
- [ ] End-to-end subscription flow
- [ ] Webhook processing (all events)
- [ ] Authorization hierarchy
- [ ] Customer portal access

### Manual Testing

#### Subscribe Flow
- [ ] Navigate to subscription page
- [ ] Click "Subscribe to Monthly Pro"
- [ ] Complete Stripe Checkout (test card: `4242 4242 4242 4242`)
- [ ] Verify redirect to success URL
- [ ] Check webhook processed successfully
- [ ] Verify database: `subscription_status = 'active'`
- [ ] Verify `stripe_subscription_id` populated

#### Unlimited Generations
- [ ] Create landscape generation
- [ ] Verify no token deduction
- [ ] Verify no trial deduction
- [ ] Create 10+ generations
- [ ] Verify all succeed
- [ ] Check database: `tokens_deducted = 0` for subscription generations

#### Cancel Subscription
- [ ] Click "Cancel Subscription"
- [ ] Verify access continues
- [ ] Check `cancel_at_period_end = true`
- [ ] Verify message shows period end date
- [ ] Wait until period end (or simulate)
- [ ] Verify subscription deactivates
- [ ] Verify status changes to `cancelled`

#### Failed Payment
- [ ] Trigger failed payment in Stripe Dashboard
- [ ] Verify webhook processes
- [ ] Check status becomes `past_due`
- [ ] Verify user still has access (grace period)
- [ ] Create generation (should work)
- [ ] Update payment method in portal
- [ ] Verify status returns to `active`

#### Customer Portal
- [ ] Click "Manage Subscription"
- [ ] Verify portal opens
- [ ] Update payment method
- [ ] View invoices
- [ ] Download invoice PDF
- [ ] Cancel subscription from portal
- [ ] Verify cancellation syncs to database

---

## Database Verification

### Check Schema
- [ ] Verify users table has subscription fields:
  ```sql
  SELECT column_name, data_type
  FROM information_schema.columns
  WHERE table_name = 'users'
  AND column_name IN (
    'subscription_tier',
    'subscription_status',
    'stripe_customer_id',
    'stripe_subscription_id',
    'current_period_end',
    'cancel_at_period_end'
  );
  ```

### Test Data
- [ ] Create test user
- [ ] Subscribe to Monthly Pro
- [ ] Verify record updates:
  ```sql
  SELECT
    email,
    subscription_tier,
    subscription_status,
    stripe_customer_id,
    stripe_subscription_id,
    current_period_end,
    cancel_at_period_end
  FROM users
  WHERE email = 'test@example.com';
  ```

---

## API Testing

### Endpoint Tests

#### GET /subscriptions/plans
- [ ] Request without auth (should work)
- [ ] Verify response includes Monthly Pro plan
- [ ] Check price is $99.00
- [ ] Verify features list

#### POST /subscriptions/subscribe
- [ ] Request without auth → 401
- [ ] Request with unverified email → 403
- [ ] Request with verified user → 201
- [ ] Check response has `session_id` and `url`
- [ ] Verify Stripe session created
- [ ] Request with existing subscription → 409

#### GET /subscriptions/current
- [ ] Request without auth → 401
- [ ] Request with no subscription → returns inactive
- [ ] Request with active subscription → returns plan details

#### POST /subscriptions/cancel
- [ ] Request without auth → 401
- [ ] Request without subscription → 400
- [ ] Cancel at period end → Success
- [ ] Cancel immediately → Success
- [ ] Verify Stripe subscription updated

#### GET /subscriptions/portal
- [ ] Request without auth → 401
- [ ] Request without customer_id → 400
- [ ] Request with customer_id → Returns portal URL
- [ ] Verify portal URL opens

---

## Security Verification

### Authentication
- [ ] All endpoints require JWT (except GET /plans)
- [ ] Subscribe endpoint requires verified email
- [ ] Webhook endpoint verifies Stripe signature
- [ ] No sensitive data in error messages

### Authorization
- [ ] Users can only access their own subscriptions
- [ ] Users can only cancel their own subscriptions
- [ ] Portal URL is customer-specific
- [ ] No cross-user data leakage

### Data Protection
- [ ] No card data stored in database
- [ ] Stripe IDs are indexed for fast lookup
- [ ] Database connections encrypted
- [ ] Webhook payloads validated

---

## Performance Testing

### Load Tests
- [ ] 100 concurrent subscription requests
- [ ] 1000 generation authorization checks
- [ ] 100 concurrent webhook events
- [ ] Database query performance
- [ ] API response times <500ms

### Optimization
- [ ] Database indexes on subscription fields
- [ ] Efficient authorization hierarchy
- [ ] Minimal Stripe API calls
- [ ] Webhook idempotency working

---

## Monitoring Setup

### Alerts
- [ ] Failed webhook events
- [ ] High subscription cancellation rate
- [ ] Failed payment retries
- [ ] API error rate spikes
- [ ] Database connection issues

### Metrics
- [ ] Monthly Recurring Revenue (MRR)
- [ ] Active subscriber count
- [ ] Churn rate
- [ ] Average generations per subscriber
- [ ] Conversion rate (free → pro)

### Logging
- [ ] Subscription created events
- [ ] Subscription cancelled events
- [ ] Payment failures
- [ ] Webhook processing errors
- [ ] Authorization decisions

---

## Documentation Review

- [ ] README updated with subscription info
- [ ] API documentation includes subscription endpoints
- [ ] Environment variable documentation complete
- [ ] Stripe setup guide accessible
- [ ] User-facing subscription documentation

---

## Production Deployment

### Pre-Deploy
- [ ] All tests passing
- [ ] Code reviewed
- [ ] Documentation updated
- [ ] Stripe configured (LIVE mode)
- [ ] Environment variables set (production)

### Deploy Steps
1. [ ] Deploy to staging
2. [ ] Run full test suite on staging
3. [ ] Test with Stripe test mode
4. [ ] Switch to Stripe live mode
5. [ ] Deploy to production
6. [ ] Verify health check
7. [ ] Test subscription flow in production

### Post-Deploy
- [ ] Monitor error logs
- [ ] Check webhook delivery
- [ ] Verify first subscription
- [ ] Test customer portal
- [ ] Monitor performance metrics

---

## Rollback Plan

### If Issues Detected
1. [ ] Identify issue (logs, errors, metrics)
2. [ ] Assess impact (users affected, revenue loss)
3. [ ] Decision: Fix forward or rollback?

### Rollback Steps (if needed)
1. [ ] Deploy previous version
2. [ ] Verify health check
3. [ ] Test critical paths
4. [ ] Communicate to affected users
5. [ ] Review logs to identify root cause

---

## User Communication

### Before Launch
- [ ] Announce Monthly Pro subscription
- [ ] Email existing users
- [ ] Update website/landing page
- [ ] Prepare FAQ
- [ ] Train support team

### At Launch
- [ ] Send launch announcement
- [ ] Social media posts
- [ ] Update pricing page
- [ ] Enable subscription button

### After Launch
- [ ] Monitor support tickets
- [ ] Gather user feedback
- [ ] Track conversion metrics
- [ ] Iterate based on feedback

---

## Support Preparation

### Knowledge Base
- [ ] How to subscribe
- [ ] How to cancel
- [ ] Billing cycle explanation
- [ ] Refund policy
- [ ] Failed payment handling

### Support Team Training
- [ ] Subscription flow walkthrough
- [ ] Customer portal usage
- [ ] Common issues and solutions
- [ ] Escalation procedures
- [ ] Stripe dashboard access

### Common Issues
- [ ] "Subscription not activating" → Check webhook
- [ ] "Payment failed" → Update payment method
- [ ] "Can't cancel" → Use customer portal
- [ ] "Charged after cancellation" → Check period end

---

## Legal & Compliance

- [ ] Terms of Service updated
- [ ] Privacy Policy reviewed
- [ ] Subscription terms clear
- [ ] Cancellation policy stated
- [ ] Refund policy documented
- [ ] Tax compliance (if applicable)
- [ ] GDPR compliance (if EU users)

---

## Final Go/No-Go Decision

### Go Criteria (All must be YES)
- [ ] All tests passing
- [ ] Stripe configured (production)
- [ ] Environment variables set
- [ ] Webhooks configured and tested
- [ ] Documentation complete
- [ ] Support team trained
- [ ] Monitoring/alerts active
- [ ] Rollback plan ready

### No-Go Criteria (Any YES = delay)
- [ ] Critical bugs found
- [ ] Test failures
- [ ] Stripe not configured
- [ ] Security concerns
- [ ] Performance issues
- [ ] Missing documentation

---

## Post-Launch Monitoring (First 7 Days)

### Daily Checks
- [ ] New subscriber count
- [ ] Active subscription count
- [ ] Failed payment count
- [ ] Cancellation count
- [ ] Support ticket volume
- [ ] Error rate

### Weekly Review
- [ ] MRR calculation
- [ ] Churn rate analysis
- [ ] User feedback summary
- [ ] Performance metrics
- [ ] Optimization opportunities

---

## Success Metrics (30 Days)

### Targets
- [ ] 50+ active subscribers
- [ ] <5% monthly churn
- [ ] >80% renewal rate
- [ ] <1% payment failure rate
- [ ] <10 support tickets/day
- [ ] 99.9% uptime

### If Targets Not Met
- [ ] Analyze reasons
- [ ] Gather user feedback
- [ ] Adjust pricing/features
- [ ] Improve onboarding
- [ ] Enhance support

---

## Sign-Off

**Development Lead**: _________________ Date: _______
- Code complete and tested

**QA Lead**: _________________ Date: _______
- All tests passing

**Product Manager**: _________________ Date: _______
- Features approved

**DevOps**: _________________ Date: _______
- Infrastructure ready

**Support Lead**: _________________ Date: _______
- Team trained and ready

**Executive Sponsor**: _________________ Date: _______
- Approved for production

---

**Deployment Status**: ⏳ Pending Stripe Configuration

**Next Action**: Configure Stripe product and complete testing checklist
