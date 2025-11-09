/**
 * Purchase Flow Helper Utilities for E2E Tests
 *
 * Helpers for testing token purchase modal, Stripe checkout, and payment flows
 */

import { Page, expect } from '@playwright/test';
import { waitForHydration } from './auth-helpers';

export interface PackageOption {
  tokens: number;
  price: number;
  name: string;
  priceId?: string;
}

// Token package definitions (must match frontend/src/components/TokenPurchaseModal.tsx)
export const PACKAGES: Record<string, PackageOption> = {
  starter: { tokens: 10, price: 5, name: 'Starter' },
  standard: { tokens: 50, price: 20, name: 'Standard' },
  professional: { tokens: 150, price: 50, name: 'Professional' },
  enterprise: { tokens: 500, price: 150, name: 'Enterprise' },
};

/**
 * Navigate to purchase page and wait for modal
 * The modal should auto-open on page load
 */
export async function openPurchaseModal(page: Page) {
  await page.goto('http://localhost:3000/purchase');

  // Wait for hydration (critical fix from TC-PURCHASE-1)
  await waitForHydration(page);

  // Verify modal auto-opens
  await page.waitForSelector('[role="dialog"]', {
    state: 'visible',
    timeout: 5000,
  });
}

/**
 * Open purchase modal from generate page
 * Useful for testing TC-PURCHASE-8 (Purchase from Generate Page)
 */
export async function openPurchaseModalFromGenerate(page: Page) {
  await page.goto('http://localhost:3000/generate');
  await waitForHydration(page);

  // Click "Purchase Tokens" button
  await page.click('button:has-text("Purchase Tokens")');

  // Wait for modal to open
  await page.waitForSelector('[role="dialog"]', {
    state: 'visible',
    timeout: 5000,
  });
}

/**
 * Verify all token packages are displayed correctly
 */
export async function verifyPackagesDisplayed(page: Page) {
  const modal = page.locator('[role="dialog"]');
  await expect(modal).toBeVisible();

  // Verify all 4 packages are visible
  for (const [key, pkg] of Object.entries(PACKAGES)) {
    const packageCard = page.locator(`text=${pkg.tokens} tokens`);
    await expect(packageCard).toBeVisible();

    // Verify price is shown
    const priceText = `$${pkg.price}`;
    await expect(packageCard.locator('..').locator(`text=${priceText}`)).toBeVisible();
  }

  // Verify "Most Popular" badge on Standard package
  const standardCard = page.locator('text=50 tokens').locator('..');
  await expect(standardCard.locator('text=Most Popular')).toBeVisible();
}

/**
 * Select a token package
 */
export async function selectPackage(page: Page, packageKey: keyof typeof PACKAGES) {
  const pkg = PACKAGES[packageKey];

  // Click on the package card
  const packageCard = page.locator(`text=${pkg.tokens} tokens`).locator('..');
  await packageCard.click();

  // Verify selection visual feedback (green border or selected state)
  // This depends on your UI implementation
  // Example: await expect(packageCard).toHaveClass(/selected|border-green/);
}

/**
 * Verify purchase button shows correct package
 */
export async function verifyPurchaseButton(page: Page, packageKey: keyof typeof PACKAGES) {
  const pkg = PACKAGES[packageKey];

  const purchaseButton = page.locator('button:has-text("Purchase")');
  await expect(purchaseButton).toContainText(`${pkg.tokens} tokens`);
  await expect(purchaseButton).toContainText(`$${pkg.price}`);
}

/**
 * Click purchase button and verify Stripe redirect
 * NOTE: In real tests, you'd need to mock Stripe or use test mode
 */
export async function clickPurchaseButton(page: Page) {
  const purchaseButton = page.locator('button:has-text("Purchase")');
  await purchaseButton.click();

  // Wait for redirect to Stripe checkout
  // In test environment, you might redirect to a mock checkout page
  await page.waitForURL(/checkout\.stripe\.com|localhost:3000\/purchase\/mock-checkout/, {
    timeout: 10000,
  });
}

/**
 * Close purchase modal
 */
export async function closePurchaseModal(page: Page) {
  const closeButton = page.locator('[role="dialog"]').locator('button[aria-label*="Close"]');
  await closeButton.click();

  // Wait for modal to disappear
  await page.waitForSelector('[role="dialog"]', { state: 'hidden', timeout: 3000 });
}

/**
 * Mock Stripe checkout session creation
 * This intercepts the API call and returns a mock checkout URL
 */
export async function mockStripeCheckout(page: Page, sessionId = 'cs_test_mock123') {
  await page.route('**/tokens/purchase', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        checkout_url: `http://localhost:3000/purchase/mock-checkout?session_id=${sessionId}`,
        session_id: sessionId,
      }),
    });
  });
}

/**
 * Mock Stripe webhook for successful payment
 * This simulates the backend receiving a checkout.session.completed event
 */
export async function triggerMockWebhook(
  page: Page,
  userId: string,
  packageKey: keyof typeof PACKAGES
) {
  const pkg = PACKAGES[packageKey];

  // In a real scenario, this would be triggered by Stripe
  // For testing, we can call the webhook endpoint directly with a mock payload
  await page.evaluate(
    async ({ userId, tokens }) => {
      // Mock webhook payload
      const payload = {
        type: 'checkout.session.completed',
        data: {
          object: {
            metadata: {
              user_id: userId,
              token_amount: tokens,
            },
            payment_intent: `pi_mock_${Date.now()}`,
          },
        },
      };

      // Call webhook endpoint (would need proper authentication in prod)
      await fetch('http://localhost:8000/v1/webhooks/stripe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
    },
    { userId, tokens: pkg.tokens }
  );
}

/**
 * Navigate to purchase success page
 * Simulates the redirect from Stripe after successful payment
 */
export async function navigateToSuccessPage(page: Page, sessionId = 'cs_test_success') {
  await page.goto(`http://localhost:3000/purchase/success?session_id=${sessionId}`);
  await waitForHydration(page);
}

/**
 * Verify success page displays correct information
 */
export async function verifySuccessPage(page: Page, expectedTokens: number) {
  // Verify success message
  await expect(page.locator('text=/Payment successful|Purchase complete/i')).toBeVisible();

  // Verify token amount mentioned
  await expect(page.locator(`text=${expectedTokens} tokens`)).toBeVisible();

  // Verify "Generate Your First Design" CTA
  const generateCTA = page.locator('button:has-text("Generate")');
  await expect(generateCTA).toBeVisible();
}

/**
 * Navigate to purchase cancel/failure page
 */
export async function navigateToCancelPage(page: Page) {
  await page.goto('http://localhost:3000/purchase?canceled=true');
  await waitForHydration(page);
}

/**
 * Verify cancel/failure page shows error message
 */
export async function verifyCancelPage(page: Page) {
  // Verify error message
  await expect(
    page.locator('text=/Payment canceled|Payment failed|Transaction canceled/i')
  ).toBeVisible();

  // Verify user can retry (modal should still be available)
  const purchaseButton = page.locator('button:has-text("Purchase")');
  await expect(purchaseButton).toBeVisible();
}

/**
 * Complete full purchase flow (for integration tests)
 * This handles the entire flow from modal to success page
 */
export async function completePurchaseFlow(
  page: Page,
  packageKey: keyof typeof PACKAGES,
  mockStripe = true
) {
  // Open modal
  await openPurchaseModal(page);

  // Verify packages
  await verifyPackagesDisplayed(page);

  // Select package
  await selectPackage(page, packageKey);

  // Mock Stripe if requested
  if (mockStripe) {
    await mockStripeCheckout(page);
  }

  // Click purchase
  await clickPurchaseButton(page);

  // If mocked, navigate to success
  if (mockStripe) {
    await navigateToSuccessPage(page);
    await verifySuccessPage(page, PACKAGES[packageKey].tokens);
  }
}

/**
 * Fill Stripe test card details (for real Stripe test mode)
 * WARNING: Only use in test mode with Stripe test keys
 */
export async function fillStripeTestCard(page: Page) {
  // Wait for Stripe iframe
  const stripeFrame = page.frameLocator('iframe[name*="stripe"]');

  // Fill card number
  await stripeFrame.locator('input[name="cardnumber"]').fill('4242 4242 4242 4242');

  // Fill expiry
  await stripeFrame.locator('input[name="exp-date"]').fill('12/34');

  // Fill CVC
  await stripeFrame.locator('input[name="cvc"]').fill('123');

  // Fill ZIP
  await stripeFrame.locator('input[name="postal"]').fill('12345');
}

/**
 * Submit Stripe checkout form
 */
export async function submitStripeCheckout(page: Page) {
  const submitButton = page.locator('button:has-text("Pay")');
  await submitButton.click();

  // Wait for processing and redirect
  await page.waitForURL(/\/purchase\/success/, { timeout: 30000 });
}
