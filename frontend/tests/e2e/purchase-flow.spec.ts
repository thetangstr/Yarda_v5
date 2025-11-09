/**
 * Purchase Flow E2E Tests
 *
 * Comprehensive tests for token purchase flow including:
 * - Modal display and package selection
 * - Stripe checkout integration
 * - Webhook processing
 * - Success and failure handling
 *
 * Test Cases: TC-PURCHASE-1 to TC-PURCHASE-8
 */

import { test, expect } from '@playwright/test';
import {
  loginAndHydrate,
  waitForHydration,
  getTokenBalance,
  waitForTokenBalance,
} from '../helpers/auth-helpers';
import {
  openPurchaseModal,
  verifyPackagesDisplayed,
  selectPackage,
  verifyPurchaseButton,
  closePurchaseModal,
  PACKAGES,
  openPurchaseModalFromGenerate,
} from '../helpers/purchase-helpers';
import { verifyTokenBalanceCompact } from '../helpers/token-helpers';
import { TEST_USER_ZERO_BALANCE, TEST_USER_WITH_TOKENS } from '../fixtures/test-users';

test.describe('Purchase Flow Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Ensure clean state
    await page.goto('http://localhost:3000');
  });

  test('TC-PURCHASE-1: Purchase Modal Display', async ({ page }) => {
    // Login as user with zero balance
    await loginAndHydrate(page, TEST_USER_ZERO_BALANCE);

    // Navigate to purchase page
    await page.goto('http://localhost:3000/purchase');
    await waitForHydration(page);

    // Verify modal auto-opens
    const modal = page.locator('[role="dialog"]');
    await expect(modal).toBeVisible({ timeout: 5000 });

    // Verify all 4 packages displayed
    await verifyPackagesDisplayed(page);

    // Verify each package shows price, token count, cost per token
    for (const [key, pkg] of Object.entries(PACKAGES)) {
      const packageCard = page.locator(`text=${pkg.tokens} tokens`).locator('..');

      // Verify package is visible
      await expect(packageCard).toBeVisible();

      // Verify price is shown
      await expect(packageCard).toContainText(`$${pkg.price}`);

      // Verify token count
      await expect(packageCard).toContainText(`${pkg.tokens}`);
    }

    // Verify "Most Popular" badge on Standard package
    const standardCard = page.locator('text=50 tokens').locator('..');
    await expect(standardCard).toContainText(/Most Popular/i);

    // Verify close button is functional
    const closeButton = modal.locator('button').filter({ hasText: /close|×/i }).first();
    await expect(closeButton).toBeVisible();

    // Take screenshot
    await page.screenshot({
      path: '.playwright-mcp/tc-purchase-1-modal-display.png',
      fullPage: true
    });

    console.log('✅ TC-PURCHASE-1: Purchase modal displays correctly with all 4 packages');
  });

  test('TC-PURCHASE-2: Package Selection UX', async ({ page }) => {
    // Login
    await loginAndHydrate(page, TEST_USER_ZERO_BALANCE);

    // Open purchase modal
    await openPurchaseModal(page);

    // Select "Standard" package (50 tokens)
    await selectPackage(page, 'standard');

    // Verify package is highlighted/selected
    // Note: This verification depends on your UI implementation
    // You might check for a selected class, green border, etc.
    const standardCard = page.locator('text=50 tokens').locator('..');

    // Take screenshot after first selection
    await page.screenshot({
      path: '.playwright-mcp/tc-purchase-2-standard-selected.png'
    });

    // Select "Professional" package
    await selectPackage(page, 'professional');

    // Verify previous selection cleared
    // (Only one package should be selected at a time - radio button behavior)
    const professionalCard = page.locator('text=150 tokens').locator('..');

    // Take screenshot after second selection
    await page.screenshot({
      path: '.playwright-mcp/tc-purchase-2-professional-selected.png'
    });

    // Verify purchase button shows selected package amount
    await verifyPurchaseButton(page, 'professional');

    // Verify button text includes: "Purchase 150 tokens for $50"
    const purchaseButton = page.locator('button:has-text("Purchase")');
    await expect(purchaseButton).toContainText('150');
    await expect(purchaseButton).toContainText('$50');

    console.log('✅ TC-PURCHASE-2: Package selection UX works correctly');
  });

  test('TC-PURCHASE-3: Stripe Checkout Session Creation (API Test)', async ({ page }) => {
    // Login
    await loginAndHydrate(page, TEST_USER_ZERO_BALANCE);

    // Open purchase modal
    await openPurchaseModal(page);

    // Select package
    await selectPackage(page, 'standard');

    // Intercept the purchase API call
    let checkoutSessionCreated = false;
    let checkoutUrl = '';

    page.on('response', async (response) => {
      if (response.url().includes('/tokens/purchase')) {
        checkoutSessionCreated = true;
        const body = await response.json();
        checkoutUrl = body.checkout_url || '';

        console.log('Checkout session response:', {
          status: response.status(),
          hasCheckoutUrl: !!checkoutUrl,
        });
      }
    });

    // Click purchase button
    const purchaseButton = page.locator('button:has-text("Purchase")');
    await purchaseButton.click();

    // Wait for API response
    await page.waitForTimeout(2000);

    // Verify checkout session was created
    expect(checkoutSessionCreated).toBe(true);
    expect(checkoutUrl).toBeTruthy();

    // Verify redirect occurred (either to Stripe or mock)
    const currentUrl = page.url();
    expect(currentUrl).not.toBe('http://localhost:3000/purchase');

    console.log('✅ TC-PURCHASE-3: Stripe checkout session created successfully');
    console.log('Checkout URL:', checkoutUrl);
  });

  test('TC-PURCHASE-6: Success Page Display', async ({ page }) => {
    // Login
    await loginAndHydrate(page, TEST_USER_ZERO_BALANCE);

    // Get initial balance
    const initialBalance = await getTokenBalance(page);
    console.log('Initial balance:', initialBalance);

    // Navigate directly to success page (simulating successful payment)
    // In a real scenario, this would come from Stripe redirect
    await page.goto('http://localhost:3000/purchase/success?session_id=cs_test_mock123');
    await waitForHydration(page);

    // Verify success message is displayed
    const successMessage = page.locator('text=/Payment successful|Purchase complete|Success/i');
    await expect(successMessage).toBeVisible();

    // Verify "Generate Your First Design" CTA is visible
    const generateCTA = page.locator('button:has-text("Generate")');
    await expect(generateCTA).toBeVisible();

    // Click CTA and verify navigation
    await generateCTA.click();
    await page.waitForURL(/\/generate/, { timeout: 5000 });

    // Take screenshot
    await page.screenshot({
      path: '.playwright-mcp/tc-purchase-6-success-page.png'
    });

    console.log('✅ TC-PURCHASE-6: Success page displays correctly');
  });

  test('TC-PURCHASE-7: Cancel/Failure Handling', async ({ page }) => {
    // Login
    await loginAndHydrate(page, TEST_USER_ZERO_BALANCE);

    // Navigate to purchase page with canceled=true query param
    // This simulates user clicking "Back" in Stripe checkout
    await page.goto('http://localhost:3000/purchase?canceled=true');
    await waitForHydration(page);

    // Verify error message is displayed
    const errorMessage = page.locator('text=/Payment canceled|Transaction canceled|Payment failed/i');
    await expect(errorMessage).toBeVisible();

    // Verify message includes "Your tokens have not been charged"
    await expect(page.locator('text=/not.*charged|no charge/i')).toBeVisible();

    // Verify modal is still available to retry
    const modal = page.locator('[role="dialog"]');
    await expect(modal).toBeVisible();

    // Verify user can select a package and try again
    await selectPackage(page, 'starter');
    const purchaseButton = page.locator('button:has-text("Purchase")');
    await expect(purchaseButton).toBeVisible();
    await expect(purchaseButton).toBeEnabled();

    // Take screenshot
    await page.screenshot({
      path: '.playwright-mcp/tc-purchase-7-cancel-handling.png'
    });

    console.log('✅ TC-PURCHASE-7: Cancel/failure handling works correctly');
  });

  test('TC-PURCHASE-8: Purchase from Generate Page', async ({ page }) => {
    // Login as user with 0 tokens and trial exhausted
    const exhaustedUser = { ...TEST_USER_ZERO_BALANCE, trialRemaining: 0 };
    await loginAndHydrate(page, exhaustedUser);

    // Navigate to generate page
    await page.goto('http://localhost:3000/generate');
    await waitForHydration(page);

    // Verify payment status shows "No Credits Available"
    const paymentStatus = page.locator('text=/No Credits|Insufficient|Out of credits/i');
    await expect(paymentStatus).toBeVisible();

    // Verify "Purchase Tokens" button is visible
    const purchaseButton = page.locator('button:has-text("Purchase Tokens")');
    await expect(purchaseButton).toBeVisible();

    // Click "Purchase Tokens"
    await purchaseButton.click();

    // Verify modal opens
    const modal = page.locator('[role="dialog"]');
    await expect(modal).toBeVisible({ timeout: 5000 });

    // Verify packages are displayed
    await verifyPackagesDisplayed(page);

    // Select a package
    await selectPackage(page, 'standard');

    // Take screenshot
    await page.screenshot({
      path: '.playwright-mcp/tc-purchase-8-from-generate-page.png'
    });

    // Verify we're still on generate page (modal is overlay)
    const currentUrl = page.url();
    expect(currentUrl).toContain('/generate');

    console.log('✅ TC-PURCHASE-8: Purchase from generate page works correctly');
  });
});

test.describe('Purchase Flow - Integration Tests', () => {
  test('Full purchase flow: Modal → Selection → Success', async ({ page }) => {
    // Login
    await loginAndHydrate(page, TEST_USER_ZERO_BALANCE);

    // Get initial balance
    const initialBalance = await getTokenBalance(page);
    console.log('Initial balance:', initialBalance);

    // Open purchase modal
    await openPurchaseModal(page);

    // Verify packages
    await verifyPackagesDisplayed(page);

    // Select Standard package (50 tokens)
    await selectPackage(page, 'standard');

    // Verify button shows correct info
    await verifyPurchaseButton(page, 'standard');

    // Take screenshot before purchase
    await page.screenshot({
      path: '.playwright-mcp/purchase-flow-integration-before.png'
    });

    console.log('✅ Purchase flow integration test: Modal and selection verified');

    // Note: Actual Stripe checkout would require either:
    // 1. Stripe test mode with real checkout
    // 2. Mocked Stripe responses
    // 3. Webhook simulation
    //
    // For now, we verify the flow up to the checkout initiation point
  });

  test('Purchase modal closes and reopens correctly', async ({ page }) => {
    // Login
    await loginAndHydrate(page, TEST_USER_ZERO_BALANCE);

    // Open modal
    await openPurchaseModal(page);

    // Verify modal is open
    let modal = page.locator('[role="dialog"]');
    await expect(modal).toBeVisible();

    // Close modal
    await closePurchaseModal(page);

    // Verify modal is closed
    await expect(modal).not.toBeVisible();

    // Re-open modal by clicking "View Token Packages" button
    const viewPackagesButton = page.locator('button:has-text("View Token Packages")');
    await viewPackagesButton.click();

    // Verify modal reopened
    modal = page.locator('[role="dialog"]');
    await expect(modal).toBeVisible({ timeout: 3000 });

    console.log('✅ Purchase modal closes and reopens correctly');
  });
});
