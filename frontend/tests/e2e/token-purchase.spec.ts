/**
 * E2E Tests for User Story 2: Token Purchase and Pay-Per-Use Generation
 *
 * Test Scenarios:
 * - TC-TOK-1.1: User with exhausted trial can purchase tokens
 * - TC-TOK-1.2: Token purchase flow via Stripe Checkout
 * - TC-TOK-1.3: Token balance updates after successful purchase
 * - TC-TOK-1.4: User can generate design using purchased tokens
 * - TC-TOK-1.5: Token balance decrements after generation
 * - TC-TOK-2.1: TokenBalance component displays and auto-refreshes
 * - TC-TOK-3.1: Webhook idempotency prevents duplicate credits
 * - TC-TOK-4.1: Token refund on generation failure
 * - TC-TOK-5.1: Four token packages available (10, 50, 100, 500 tokens)
 *
 * Requirements:
 * - FR-017 to FR-025 (Token Purchase)
 * - FR-026 (Atomic Deduction)
 * - FR-027 (Idempotent Webhooks)
 * - FR-066 (Refund on Failure)
 */

import { test, expect } from '@playwright/test';

// Test data
const generateTestEmail = () => `token-test-${Date.now()}@yarda-test.com`;
const testPassword = 'SecurePassword123!';

// Mock Stripe checkout success
async function mockStripeCheckoutSuccess(page: any, packageIndex: number) {
  // This would normally redirect to Stripe and back
  // For E2E tests, we'll mock the success callback
  const packages = [
    { tokens: 10, price: 10.00 },
    { tokens: 50, price: 45.00 },
    { tokens: 100, price: 90.00 },
    { tokens: 500, price: 400.00 },
  ];

  const selectedPackage = packages[packageIndex];

  // Simulate webhook being called (in real scenario, Stripe would call this)
  await page.evaluate(async ({ tokens, price }) => {
    const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/test/mock-stripe-success`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        tokens,
        amount_paid: price * 100, // Convert to cents
        payment_intent_id: `pi_mock_${Date.now()}`,
      }),
    });
    return response.json();
  }, selectedPackage);
}

test.describe('User Story 2: Token Purchase', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to home page
    await page.goto('/');
  });

  test('TC-TOK-1.1: User with exhausted trial can purchase tokens', async ({ page }) => {
    const testEmail = generateTestEmail();

    // Step 1: Register user
    await page.goto('/register');
    await page.fill('input[name="email"]', testEmail);
    await page.fill('input[name="password"]', testPassword);
    await page.fill('input[name="confirmPassword"]', testPassword);
    await page.click('button[type="submit"]');

    // Step 2: Wait for registration success
    await expect(page.locator('[data-testid="trial-counter"]')).toBeVisible();

    // Step 3: Exhaust trial credits (set to 0 via test helper)
    await page.evaluate(async (email) => {
      await fetch(`${process.env.NEXT_PUBLIC_API_URL}/test/set-trial-remaining`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, trial_remaining: 0 }),
      });
    }, testEmail);

    // Step 4: Refresh to update UI
    await page.reload();

    // Step 5: Verify trial counter shows 0
    await expect(page.locator('[data-testid="trial-counter"]')).toContainText('0');

    // Step 6: Try to generate (should show trial exhausted modal)
    await page.goto('/generate');
    await page.fill('input[name="address"]', '123 Test St, SF, CA');
    await page.click('button[type="submit"]');

    // Step 7: Verify trial exhausted modal appears
    const modal = page.locator('[data-testid="trial-exhausted-modal"]');
    await expect(modal).toBeVisible();

    // Step 8: Click "Purchase Tokens" button
    await modal.locator('button:has-text("Purchase Tokens")').click();

    // Step 9: Verify TokenPurchaseModal appears
    await expect(page.locator('[data-testid="token-purchase-modal"]')).toBeVisible();
  });

  test('TC-TOK-5.1: Four token packages are available', async ({ page }) => {
    const testEmail = generateTestEmail();

    // Register and exhaust trial
    await page.goto('/register');
    await page.fill('input[name="email"]', testEmail);
    await page.fill('input[name="password"]', testPassword);
    await page.fill('input[name="confirmPassword"]', testPassword);
    await page.click('button[type="submit"]');

    await page.evaluate(async (email) => {
      await fetch(`${process.env.NEXT_PUBLIC_API_URL}/test/set-trial-remaining`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, trial_remaining: 0 }),
      });
    }, testEmail);

    // Open token purchase modal
    await page.goto('/purchase');

    // Verify 4 packages are displayed
    const modal = page.locator('[data-testid="token-purchase-modal"]');

    // Package 1: 10 tokens for $10
    await expect(modal.locator('[data-testid="package-0"]')).toContainText('10 tokens');
    await expect(modal.locator('[data-testid="package-0"]')).toContainText('$10.00');
    await expect(modal.locator('[data-testid="package-0"]')).toContainText('$1.00 per token');

    // Package 2: 50 tokens for $45 (10% discount)
    await expect(modal.locator('[data-testid="package-1"]')).toContainText('50 tokens');
    await expect(modal.locator('[data-testid="package-1"]')).toContainText('$45.00');
    await expect(modal.locator('[data-testid="package-1"]')).toContainText('$0.90 per token');
    await expect(modal.locator('[data-testid="package-1"]')).toContainText('Save 10%');

    // Package 3: 100 tokens for $90 (10% discount)
    await expect(modal.locator('[data-testid="package-2"]')).toContainText('100 tokens');
    await expect(modal.locator('[data-testid="package-2"]')).toContainText('$90.00');
    await expect(modal.locator('[data-testid="package-2"]')).toContainText('$0.90 per token');
    await expect(modal.locator('[data-testid="package-2"]')).toContainText('Save 10%');

    // Package 4: 500 tokens for $400 (20% discount) - BEST VALUE
    await expect(modal.locator('[data-testid="package-3"]')).toContainText('500 tokens');
    await expect(modal.locator('[data-testid="package-3"]')).toContainText('$400.00');
    await expect(modal.locator('[data-testid="package-3"]')).toContainText('$0.80 per token');
    await expect(modal.locator('[data-testid="package-3"]')).toContainText('Save 20%');
    await expect(modal.locator('[data-testid="package-3"]')).toContainText('BEST VALUE');
  });

  test('TC-TOK-1.2: Token purchase flow via Stripe Checkout', async ({ page }) => {
    const testEmail = generateTestEmail();

    // Register and exhaust trial
    await page.goto('/register');
    await page.fill('input[name="email"]', testEmail);
    await page.fill('input[name="password"]', testPassword);
    await page.fill('input[name="confirmPassword"]', testPassword);
    await page.click('button[type="submit"]');

    await page.evaluate(async (email) => {
      await fetch(`${process.env.NEXT_PUBLIC_API_URL}/test/set-trial-remaining`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, trial_remaining: 0 }),
      });
    }, testEmail);

    // Open token purchase modal
    await page.goto('/purchase');

    // Select 50 tokens package (index 1)
    await page.click('[data-testid="package-1"] button:has-text("Purchase")');

    // In real scenario, this would redirect to Stripe
    // For testing, we verify the checkout session is created
    await expect(page).toHaveURL(/.*checkout.stripe.com.*|.*success.*/);

    // Mock successful payment (simulate webhook)
    await mockStripeCheckoutSuccess(page, 1);

    // Return to app
    await page.goto('/generate');

    // Verify token balance updated
    await expect(page.locator('[data-testid="token-balance"]')).toContainText('50');
  });

  test('TC-TOK-1.3: Token balance updates after successful purchase', async ({ page }) => {
    const testEmail = generateTestEmail();

    // Register user
    await page.goto('/register');
    await page.fill('input[name="email"]', testEmail);
    await page.fill('input[name="password"]', testPassword);
    await page.fill('input[name="confirmPassword"]', testPassword);
    await page.click('button[type="submit"]');

    // Initial token balance should be 0
    await page.goto('/generate');
    await expect(page.locator('[data-testid="token-balance"]')).toContainText('0');

    // Purchase 10 tokens
    await page.click('[data-testid="purchase-tokens-button"]');
    await page.click('[data-testid="package-0"] button:has-text("Purchase")');

    // Mock successful payment
    await mockStripeCheckoutSuccess(page, 0);

    // Verify token balance updated to 10
    await page.goto('/generate');
    await expect(page.locator('[data-testid="token-balance"]')).toContainText('10');
  });

  test('TC-TOK-1.4 & TC-TOK-1.5: Generate design using tokens and verify deduction', async ({ page }) => {
    const testEmail = generateTestEmail();

    // Register and add tokens
    await page.goto('/register');
    await page.fill('input[name="email"]', testEmail);
    await page.fill('input[name="password"]', testPassword);
    await page.fill('input[name="confirmPassword"]', testPassword);
    await page.click('button[type="submit"]');

    // Add 10 tokens via test helper
    await page.evaluate(async (email) => {
      await fetch(`${process.env.NEXT_PUBLIC_API_URL}/test/add-tokens`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, tokens: 10 }),
      });
    }, testEmail);

    // Navigate to generate page
    await page.goto('/generate');

    // Verify initial token balance is 10
    await expect(page.locator('[data-testid="token-balance"]')).toContainText('10');

    // Fill generation form
    await page.fill('input[name="address"]', '123 Test Street, San Francisco, CA');
    await page.selectOption('select[name="area"]', 'front_yard');
    await page.selectOption('select[name="style"]', 'modern_minimalist');

    // Upload test image
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles('./tests/fixtures/sample-yard.jpg');

    // Submit generation
    await page.click('button[type="submit"]:has-text("Generate Design")');

    // Wait for generation to complete
    await expect(page.locator('[data-testid="generation-status"]')).toContainText(
      'completed',
      { timeout: 90000 }
    );

    // Verify token balance decreased to 9
    await expect(page.locator('[data-testid="token-balance"]')).toContainText('9');

    // Verify payment method was 'token'
    await expect(page.locator('[data-testid="payment-method"]')).toContainText('Paid with tokens');
  });

  test('TC-TOK-2.1: TokenBalance component auto-refreshes every 10 seconds', async ({ page }) => {
    const testEmail = generateTestEmail();

    // Register user
    await page.goto('/register');
    await page.fill('input[name="email"]', testEmail);
    await page.fill('input[name="password"]', testPassword);
    await page.fill('input[name="confirmPassword"]', testPassword);
    await page.click('button[type="submit"]');

    // Set initial token balance to 5
    await page.evaluate(async (email) => {
      await fetch(`${process.env.NEXT_PUBLIC_API_URL}/test/add-tokens`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, tokens: 5 }),
      });
    }, testEmail);

    // Navigate to generate page
    await page.goto('/generate');

    // Verify initial balance is 5
    await expect(page.locator('[data-testid="token-balance"]')).toContainText('5');

    // Simulate external token addition (e.g., another device purchased tokens)
    await page.evaluate(async (email) => {
      await fetch(`${process.env.NEXT_PUBLIC_API_URL}/test/add-tokens`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, tokens: 10 }),
      });
    }, testEmail);

    // Wait 10 seconds for auto-refresh
    await page.waitForTimeout(10000);

    // Verify balance updated to 15 (5 + 10)
    await expect(page.locator('[data-testid="token-balance"]')).toContainText('15');
  });

  test('TC-TOK-3.1: Webhook idempotency prevents duplicate credits', async ({ page }) => {
    const testEmail = generateTestEmail();

    // Register user
    await page.goto('/register');
    await page.fill('input[name="email"]', testEmail);
    await page.fill('input[name="password"]', testPassword);
    await page.fill('input[name="confirmPassword"]', testPassword);
    await page.click('button[type="submit"]');

    // Simulate webhook being called twice with same payment_intent_id
    const paymentIntentId = `pi_test_${Date.now()}`;

    for (let i = 0; i < 2; i++) {
      await page.evaluate(async ({ email, paymentIntentId }) => {
        await fetch(`${process.env.NEXT_PUBLIC_API_URL}/webhooks/stripe`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: 'checkout.session.completed',
            data: {
              object: {
                customer_email: email,
                payment_intent: paymentIntentId,
                amount_total: 1000, // $10.00 = 10 tokens
              },
            },
          }),
        });
      }, { email: testEmail, paymentIntentId });
    }

    // Navigate to generate page
    await page.goto('/generate');

    // Verify token balance is 10 (not 20)
    await expect(page.locator('[data-testid="token-balance"]')).toContainText('10');

    // Verify transaction history shows only 1 transaction
    await page.goto('/transactions');
    const transactions = page.locator('[data-testid="transaction-row"]');
    await expect(transactions).toHaveCount(1);
  });

  test('TC-TOK-4.1: Token refund on generation failure', async ({ page }) => {
    const testEmail = generateTestEmail();

    // Register and add tokens
    await page.goto('/register');
    await page.fill('input[name="email"]', testEmail);
    await page.fill('input[name="password"]', testPassword);
    await page.fill('input[name="confirmPassword"]', testPassword);
    await page.click('button[type="submit"]');

    await page.evaluate(async (email) => {
      await fetch(`${process.env.NEXT_PUBLIC_API_URL}/test/add-tokens`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, tokens: 5 }),
      });
    }, testEmail);

    // Navigate to generate page
    await page.goto('/generate');

    // Verify initial balance is 5
    await expect(page.locator('[data-testid="token-balance"]')).toContainText('5');

    // Force generation failure via test helper (e.g., invalid Gemini API key)
    await page.evaluate(async () => {
      await fetch(`${process.env.NEXT_PUBLIC_API_URL}/test/force-generation-failure`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled: true }),
      });
    });

    // Fill generation form
    await page.fill('input[name="address"]', '123 Test Street, SF, CA');
    await page.selectOption('select[name="area"]', 'front_yard');
    await page.selectOption('select[name="style"]', 'modern_minimalist');
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles('./tests/fixtures/sample-yard.jpg');

    // Submit generation
    await page.click('button[type="submit"]');

    // Wait for generation to fail
    await expect(page.locator('[data-testid="generation-status"]')).toContainText(
      'failed',
      { timeout: 30000 }
    );

    // Verify token was refunded (balance back to 5)
    await expect(page.locator('[data-testid="token-balance"]')).toContainText('5');

    // Verify error message displayed
    await expect(page.locator('[data-testid="generation-error"]')).toBeVisible();
    await expect(page.locator('[data-testid="generation-error"]')).toContainText(
      'Your token has been refunded'
    );

    // Disable failure mode
    await page.evaluate(async () => {
      await fetch(`${process.env.NEXT_PUBLIC_API_URL}/test/force-generation-failure`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled: false }),
      });
    });
  });
});

test.describe('User Story 2: Authorization Hierarchy with Tokens', () => {
  test('TC-AUTH-2.1: Tokens checked THIRD after subscription and trial', async ({ page }) => {
    const testEmail = generateTestEmail();

    // Register user
    await page.goto('/register');
    await page.fill('input[name="email"]', testEmail);
    await page.fill('input[name="password"]', testPassword);
    await page.fill('input[name="confirmPassword"]', testPassword);
    await page.click('button[type="submit"]');

    // Exhaust trial credits
    await page.evaluate(async (email) => {
      await fetch(`${process.env.NEXT_PUBLIC_API_URL}/test/set-trial-remaining`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, trial_remaining: 0 }),
      });
    }, testEmail);

    // Add tokens
    await page.evaluate(async (email) => {
      await fetch(`${process.env.NEXT_PUBLIC_API_URL}/test/add-tokens`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, tokens: 10 }),
      });
    }, testEmail);

    // Navigate to generate page
    await page.goto('/generate');

    // Verify user can generate (using tokens)
    await page.fill('input[name="address"]', '123 Test St, SF, CA');
    const generateButton = page.locator('button[type="submit"]:has-text("Generate Design")');
    await expect(generateButton).toBeEnabled();

    // Verify authorization indicator shows "Using tokens"
    await expect(page.locator('[data-testid="payment-source"]')).toContainText('Using tokens');
  });

  test('TC-AUTH-3.2: Active subscription preserves token balance', async ({ page }) => {
    const testEmail = generateTestEmail();

    // Register user
    await page.goto('/register');
    await page.fill('input[name="email"]', testEmail);
    await page.fill('input[name="password"]', testPassword);
    await page.fill('input[name="confirmPassword"]', testPassword);
    await page.click('button[type="submit"]');

    // Set subscription to active
    await page.evaluate(async (email) => {
      await fetch(`${process.env.NEXT_PUBLIC_API_URL}/test/set-subscription`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, status: 'active', tier: 'pro' }),
      });
    }, testEmail);

    // Add tokens
    await page.evaluate(async (email) => {
      await fetch(`${process.env.NEXT_PUBLIC_API_URL}/test/add-tokens`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, tokens: 50 }),
      });
    }, testEmail);

    // Navigate to generate page
    await page.goto('/generate');

    // Verify initial token balance is 50
    await expect(page.locator('[data-testid="token-balance"]')).toContainText('50');

    // Generate design
    await page.fill('input[name="address"]', '123 Test St, SF, CA');
    await page.selectOption('select[name="area"]', 'front_yard');
    await page.selectOption('select[name="style"]', 'modern_minimalist');
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles('./tests/fixtures/sample-yard.jpg');
    await page.click('button[type="submit"]');

    // Wait for generation
    await expect(page.locator('[data-testid="generation-status"]')).toContainText('completed', { timeout: 90000 });

    // Verify token balance is STILL 50 (subscription used, not tokens)
    await expect(page.locator('[data-testid="token-balance"]')).toContainText('50');

    // Verify payment method was 'subscription'
    await expect(page.locator('[data-testid="payment-method"]')).toContainText('Paid with subscription');
  });
});
