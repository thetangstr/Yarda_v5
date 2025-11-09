# E2E Test Implementation Plan

**Created:** 2025-11-08
**Status:** Implementation Guide
**Target:** 28 new E2E test cases from TEST_PLAN.md

---

## 📋 Overview

This document provides a comprehensive implementation plan for the 28 new E2E test cases added to TEST_PLAN.md:
- **8 Purchase Flow Tests** (TC-PURCHASE-1 to TC-PURCHASE-8)
- **6 Token Management Tests** (TC-TOKEN-1 to TC-TOKEN-6)
- **14 Image Generation Tests** (TC-IMAGE-1 to TC-IMAGE-14)

---

## 🏗️ File Structure

```
frontend/tests/
├── e2e/
│   ├── purchase-flow.spec.ts          # NEW - TC-PURCHASE-1 to TC-PURCHASE-8
│   ├── token-management.spec.ts       # NEW - TC-TOKEN-1 to TC-TOKEN-6
│   ├── image-generation.spec.ts       # NEW - TC-IMAGE-1 to TC-IMAGE-14
│   └── helpers/
│       ├── auth-helpers.ts            # NEW - Login, register, hydration waits
│       ├── purchase-helpers.ts        # NEW - Stripe mocks, package selection
│       ├── token-helpers.ts           # NEW - Balance checks, transaction helpers
│       └── image-helpers.ts           # NEW - Image validation, download checks
└── fixtures/
    ├── test-users.json                # NEW - Predefined test accounts
    ├── stripe-mocks.json              # NEW - Stripe webhook payloads
    └── test-images.json               # NEW - Test image URLs
```

---

## 🎯 Implementation Priority

### Phase 1: Foundation & Helpers (Week 1)
1. Create helper utilities
2. Set up test fixtures
3. Implement authentication helpers

### Phase 2: Purchase Flow (Week 2)
4. TC-PURCHASE-1 to TC-PURCHASE-4 (UI tests)
5. TC-PURCHASE-5 (Webhook simulation)
6. TC-PURCHASE-6 to TC-PURCHASE-8 (Success/failure)

### Phase 3: Token Management (Week 3)
7. TC-TOKEN-1 to TC-TOKEN-3 (Basic functionality)
8. TC-TOKEN-4 to TC-TOKEN-6 (Advanced features)

### Phase 4: Image Generation (Week 4)
9. TC-IMAGE-1 to TC-IMAGE-5 (Backend integration)
10. TC-IMAGE-6 to TC-IMAGE-10 (UI features)
11. TC-IMAGE-11 to TC-IMAGE-14 (Advanced scenarios)

---

## 📝 Implementation Guide

### Step 1: Create Helper Utilities

#### `tests/helpers/auth-helpers.ts`

```typescript
import { Page, expect } from '@playwright/test';

export interface TestUser {
  email: string;
  password: string;
  tokenBalance?: number;
  trialRemaining?: number;
}

/**
 * Login and wait for Zustand hydration
 * Critical: Waits for _hasHydrated flag to prevent redirect issues
 */
export async function loginAndHydrate(page: Page, user: TestUser) {
  await page.goto('http://localhost:3000/auth');

  // Fill login form
  await page.fill('input[name="email"]', user.email);
  await page.fill('input[name="password"]', user.password);
  await page.click('button:has-text("Log In")');

  // Wait for redirect to /generate or /
  await page.waitForURL(/\/(generate|$)/);

  // CRITICAL: Wait for Zustand hydration to complete
  // This prevents authentication redirect bugs
  await page.waitForFunction(() => {
    const store = (window as any).userStore?.getState();
    return store?._hasHydrated === true;
  }, { timeout: 5000 });

  // Verify user is authenticated
  const isAuth = await page.evaluate(() => {
    const store = (window as any).userStore?.getState();
    return store?.isAuthenticated === true;
  });

  expect(isAuth).toBe(true);
}

/**
 * Check if user is authenticated without hydration wait
 */
export async function isAuthenticated(page: Page): Promise<boolean> {
  return await page.evaluate(() => {
    const store = (window as any).userStore?.getState();
    return store?.isAuthenticated === true;
  });
}

/**
 * Get current token balance from Zustand store
 */
export async function getTokenBalance(page: Page): Promise<number> {
  return await page.evaluate(() => {
    const store = (window as any).userStore?.getState();
    return store?.user?.tokenBalance ?? 0;
  });
}

/**
 * Get current trial remaining from Zustand store
 */
export async function getTrialRemaining(page: Page): Promise<number> {
  return await page.evaluate(() => {
    const store = (window as any).userStore?.getState();
    return store?.user?.trial_remaining ?? 0;
  });
}
```

#### `tests/helpers/purchase-helpers.ts`

```typescript
import { Page, expect } from '@playwright/test';

export interface PackageOption {
  tokens: number;
  price: number;
  name: string;
}

export const PACKAGES: Record<string, PackageOption> = {
  starter: { tokens: 10, price: 5, name: 'Starter' },
  standard: { tokens: 50, price: 20, name: 'Standard' },
  professional: { tokens: 150, price: 50, name: 'Professional' },
  enterprise: { tokens: 500, price: 150, name: 'Enterprise' },
};

/**
 * Navigate to purchase page and wait for modal
 */
export async function openPurchaseModal(page: Page) {
  await page.goto('http://localhost:3000/purchase');

  // Wait for hydration (critical fix from TC-PURCHASE-1)
  await page.waitForFunction(() => {
    const store = (window as any).userStore?.getState();
    return store?._hasHydrated === true;
  }, { timeout: 5000 });

  // Verify modal auto-opens
  await page.waitForSelector('[role="dialog"]', { state: 'visible', timeout: 5000 });
}

/**
 * Select a package in the modal
 */
export async function selectPackage(page: Page, packageKey: keyof typeof PACKAGES) {
  const pkg = PACKAGES[packageKey];

  // Find and click the package card
  const packageCard = page.locator(`text=${pkg.tokens} tokens`).first();
  await packageCard.click();

  // Verify selection (green border or selected state)
  await expect(packageCard).toHaveClass(/selected|border-green/);

  // Verify purchase button updates
  const purchaseButton = page.locator('button:has-text("Purchase")');
  await expect(purchaseButton).toContainText(`${pkg.tokens} tokens`);
  await expect(purchaseButton).toContainText(`$${pkg.price}`);
}

/**
 * Complete Stripe checkout with test card
 */
export async function completeStripeCheckout(page: Page) {
  // Wait for redirect to Stripe
  await page.waitForURL(/checkout\.stripe\.com/, { timeout: 10000 });

  // Fill test card
  await page.fill('[name="cardnumber"]', '4242 4242 4242 4242');
  await page.fill('[name="exp-date"]', '12/34');
  await page.fill('[name="cvc"]', '123');
  await page.fill('[name="billingName"]', 'Test User');

  // Submit payment
  await page.click('button[type="submit"]');

  // Wait for redirect back to success page
  await page.waitForURL(/\/purchase\/success/, { timeout: 15000 });
}

/**
 * Mock Stripe webhook for testing
 * Use this for backend integration tests
 */
export function createStripeWebhookPayload(userId: string, packageTokens: number) {
  return {
    type: 'checkout.session.completed',
    data: {
      object: {
        id: `cs_test_${Date.now()}`,
        customer_email: 'test@example.com',
        payment_intent: `pi_test_${Date.now()}`,
        metadata: {
          user_id: userId,
          package_id: packageTokens.toString(),
          token_amount: packageTokens.toString(),
        },
      },
    },
  };
}
```

#### `tests/helpers/token-helpers.ts`

```typescript
import { Page, expect } from '@playwright/test';

/**
 * Verify token balance displayed in UI
 */
export async function verifyTokenBalance(page: Page, expectedBalance: number) {
  // Check navbar compact variant
  const navbarBalance = page.locator('[data-testid="token-balance-compact"]');
  await expect(navbarBalance).toContainText(expectedBalance.toString());

  // Or check full variant if on account page
  if (await page.url().includes('/account')) {
    const fullBalance = page.locator('[data-testid="token-balance-full"]');
    await expect(fullBalance).toContainText(expectedBalance.toString());
  }
}

/**
 * Wait for token balance to update (with polling)
 */
export async function waitForTokenBalance(
  page: Page,
  expectedBalance: number,
  timeout = 10000
) {
  const startTime = Date.now();

  while (Date.now() - startTime < timeout) {
    const currentBalance = await page.evaluate(() => {
      const store = (window as any).userStore?.getState();
      return store?.user?.tokenBalance ?? 0;
    });

    if (currentBalance === expectedBalance) {
      return true;
    }

    await page.waitForTimeout(500);
  }

  throw new Error(`Token balance did not update to ${expectedBalance} within ${timeout}ms`);
}

/**
 * Verify localStorage persistence
 */
export async function verifyLocalStoragePersistence(page: Page) {
  const localStorageData = await page.evaluate(() => {
    const data = localStorage.getItem('user-storage');
    return data ? JSON.parse(data) : null;
  });

  expect(localStorageData).toBeTruthy();
  expect(localStorageData.state.user).toBeTruthy();
  expect(localStorageData.state.accessToken).toBeTruthy();

  return localStorageData;
}
```

#### `tests/helpers/image-helpers.ts`

```typescript
import { Page, expect } from '@playwright/test';
import { promises as fs } from 'fs';
import path from 'path';

/**
 * Verify image loaded successfully
 */
export async function verifyImageLoaded(page: Page, imageSelector: string) {
  const image = page.locator(imageSelector);
  await expect(image).toBeVisible();

  // Check natural dimensions (image actually loaded)
  const dimensions = await image.evaluate((img: HTMLImageElement) => ({
    width: img.naturalWidth,
    height: img.naturalHeight,
    complete: img.complete,
  }));

  expect(dimensions.complete).toBe(true);
  expect(dimensions.width).toBeGreaterThan(0);
  expect(dimensions.height).toBeGreaterThan(0);

  return dimensions;
}

/**
 * Verify image URL format (Vercel Blob)
 */
export async function verifyVercelBlobUrl(imageUrl: string) {
  expect(imageUrl).toMatch(/https:\/\/.*\.public\.blob\.vercel-storage\.com/);

  // Verify image is accessible
  const response = await fetch(imageUrl);
  expect(response.status).toBe(200);
  expect(response.headers.get('content-type')).toMatch(/image\/(jpeg|png|webp)/);
}

/**
 * Download image and verify file
 */
export async function downloadAndVerifyImage(page: Page, downloadButtonSelector: string) {
  // Start waiting for download
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.click(downloadButtonSelector),
  ]);

  // Get downloaded file
  const filePath = await download.path();
  const fileName = download.suggestedFilename();

  // Verify filename format
  expect(fileName).toMatch(/yarda_.*_\d+\.(jpg|png)/);

  // Verify file size
  const stats = await fs.stat(filePath!);
  expect(stats.size).toBeGreaterThan(50 * 1024); // >50KB
  expect(stats.size).toBeLessThan(5 * 1024 * 1024); // <5MB

  return { filePath, fileName, size: stats.size };
}

/**
 * Verify carousel functionality
 */
export async function verifyCarousel(page: Page) {
  // Verify carousel container
  const carousel = page.locator('[data-testid="image-carousel"]');
  await expect(carousel).toBeVisible();

  // Verify slides
  const beforeSlide = page.locator('[data-carousel-slide="before"]');
  const afterSlide = page.locator('[data-carousel-slide="after"]');

  await expect(beforeSlide).toBeVisible();

  // Click next arrow
  await page.click('[data-carousel-control="next"]');
  await page.waitForTimeout(300); // Animation

  await expect(afterSlide).toBeVisible();

  // Click prev arrow
  await page.click('[data-carousel-control="prev"]');
  await page.waitForTimeout(300);

  await expect(beforeSlide).toBeVisible();

  // Verify indicator dots
  const dots = page.locator('[data-carousel-indicator]');
  await expect(dots).toHaveCount(2);
}
```

---

### Step 2: Implement Purchase Flow Tests

#### `tests/e2e/purchase-flow.spec.ts`

```typescript
import { test, expect } from '@playwright/test';
import { loginAndHydrate, getTokenBalance } from '../helpers/auth-helpers';
import { openPurchaseModal, selectPackage, PACKAGES } from '../helpers/purchase-helpers';
import { verifyTokenBalance, waitForTokenBalance } from '../helpers/token-helpers';

test.describe('Purchase Flow - TC-PURCHASE-1 to TC-PURCHASE-8', () => {
  const testUser = {
    email: 'test.purchase@yarda.app',
    password: 'TestPass123!',
    tokenBalance: 0,
  };

  test.beforeEach(async ({ page }) => {
    // Login and ensure hydration
    await loginAndHydrate(page, testUser);
  });

  test('TC-PURCHASE-1: Purchase Modal Display', async ({ page }) => {
    // Navigate to purchase page
    await openPurchaseModal(page);

    // Verify modal is visible
    const modal = page.locator('[role="dialog"]');
    await expect(modal).toBeVisible();

    // Verify all 4 packages displayed
    for (const [key, pkg] of Object.entries(PACKAGES)) {
      const packageCard = page.locator(`text=${pkg.tokens} tokens`);
      await expect(packageCard).toBeVisible();
      await expect(packageCard).toContainText(`$${pkg.price}`);
    }

    // Verify "Most Popular" badge on Standard
    const standardCard = page.locator('text=50 tokens').locator('..');
    await expect(standardCard).toContainText('Most Popular');

    // Verify close button
    const closeButton = page.locator('button[aria-label="Close"]');
    await expect(closeButton).toBeVisible();

    await page.screenshot({ path: '.playwright-mcp/local/tc-purchase-1.png' });
  });

  test('TC-PURCHASE-2: Package Selection UX', async ({ page }) => {
    await openPurchaseModal(page);

    // Select Standard package
    await selectPackage(page, 'standard');

    // Verify visual feedback (green border)
    const standardCard = page.locator('text=50 tokens').locator('..');
    await expect(standardCard).toHaveClass(/border-green|selected/);

    // Select Professional package
    await selectPackage(page, 'professional');

    // Verify previous selection cleared
    const previousCard = page.locator('text=50 tokens').locator('..');
    await expect(previousCard).not.toHaveClass(/border-green|selected/);

    // Verify new selection
    const professionalCard = page.locator('text=150 tokens').locator('..');
    await expect(professionalCard).toHaveClass(/border-green|selected/);

    // Verify button text updates
    const purchaseButton = page.locator('button:has-text("Purchase")');
    await expect(purchaseButton).toContainText('150 tokens');
    await expect(purchaseButton).toContainText('$50');

    await page.screenshot({ path: '.playwright-mcp/local/tc-purchase-2.png' });
  });

  test('TC-PURCHASE-4: Checkout Redirect Flow', async ({ page }) => {
    await openPurchaseModal(page);
    await selectPackage(page, 'standard');

    // Click purchase button
    await page.click('button:has-text("Purchase")');

    // Should redirect to Stripe checkout
    // NOTE: In local testing, this will fail unless Stripe is configured
    // For full E2E, need Stripe test mode configured

    await page.waitForURL(/checkout\.stripe\.com|purchase\/success/, { timeout: 10000 });

    // If Stripe checkout loads, verify product details
    if (page.url().includes('checkout.stripe.com')) {
      await expect(page.locator('text=50 Yarda Tokens')).toBeVisible();
      await expect(page.locator('text=$20.00')).toBeVisible();
    }

    await page.screenshot({ path: '.playwright-mcp/local/tc-purchase-4.png' });
  });

  test('TC-PURCHASE-6: Success Page Display', async ({ page }) => {
    // This test assumes successful payment
    // In practice, would need to complete Stripe checkout or mock webhook

    // Navigate directly to success page (for UI testing)
    await page.goto('http://localhost:3000/purchase/success?session_id=cs_test_mock');

    // Verify success message
    await expect(page.locator('text=/Payment successful|50 tokens added/i')).toBeVisible();

    // Verify token balance displayed
    await verifyTokenBalance(page, 50);

    // Verify CTA button
    const ctaButton = page.locator('button:has-text("Generate Your First Design")');
    await expect(ctaButton).toBeVisible();

    // Click CTA
    await ctaButton.click();
    await page.waitForURL(/\/generate/);

    await page.screenshot({ path: '.playwright-mcp/local/tc-purchase-6.png' });
  });

  test('TC-PURCHASE-7: Cancel/Failure Handling', async ({ page }) => {
    await openPurchaseModal(page);
    await selectPackage(page, 'standard');

    // Click purchase
    await page.click('button:has-text("Purchase")');

    // If Stripe loads, click back button
    if (await page.url().includes('checkout.stripe.com')) {
      await page.goBack();
    }

    // Should return to purchase page with modal
    await page.waitForURL(/\/purchase/);

    // Check for cancel message if query param present
    if (page.url().includes('canceled=true')) {
      await expect(page.locator('text=/Payment canceled|not been charged/i')).toBeVisible();
    }

    // Modal should still be available
    const modal = page.locator('[role="dialog"]');
    await expect(modal).toBeVisible();

    await page.screenshot({ path: '.playwright-mcp/local/tc-purchase-7.png' });
  });

  test('TC-PURCHASE-8: Purchase from Generate Page', async ({ page }) => {
    // Set user to have 0 tokens, trial exhausted (in beforeEach or via API)

    // Navigate to generate page
    await page.goto('http://localhost:3000/generate');

    // Verify "No Credits Available" status
    await expect(page.locator('text=/No Credits Available|Insufficient/i')).toBeVisible();

    // Verify "Purchase Tokens" button
    const purchaseButton = page.locator('button:has-text("Purchase Tokens")');
    await expect(purchaseButton).toBeVisible();

    // Click button
    await purchaseButton.click();

    // Modal should open
    const modal = page.locator('[role="dialog"]');
    await expect(modal).toBeVisible();

    // Select package and purchase
    await selectPackage(page, 'starter');

    // After purchase (mocked), should redirect back to /generate
    // and payment status should update

    await page.screenshot({ path: '.playwright-mcp/local/tc-purchase-8.png' });
  });
});
```

---

### Step 3: Implement Token Management Tests

#### `tests/e2e/token-management.spec.ts`

```typescript
import { test, expect } from '@playwright/test';
import { loginAndHydrate, getTokenBalance } from '../helpers/auth-helpers';
import { verifyTokenBalance, waitForTokenBalance, verifyLocalStoragePersistence } from '../helpers/token-helpers';

test.describe('Token Management - TC-TOKEN-1 to TC-TOKEN-6', () => {
  const testUser = {
    email: 'test.tokens@yarda.app',
    password: 'TestPass123!',
    tokenBalance: 50,
  };

  test('TC-TOKEN-1: Balance Persistence Across Sessions', async ({ page, context }) => {
    // Login and verify initial balance
    await loginAndHydrate(page, testUser);
    await page.goto('http://localhost:3000/account');

    const initialBalance = await getTokenBalance(page);
    expect(initialBalance).toBe(50);

    // Verify localStorage
    const storageData = await verifyLocalStoragePersistence(page);
    expect(storageData.state.user.tokenBalance).toBe(50);

    // Close browser (clear memory, keep localStorage)
    await context.close();

    // Reopen browser with same storage
    const newContext = await page.context().browser()!.newContext({ storageState: await context.storageState() });
    const newPage = await newContext.newPage();

    await newPage.goto('http://localhost:3000/account');

    // Verify balance loads from localStorage immediately
    const cachedBalance = await newPage.evaluate(() => {
      const data = localStorage.getItem('user-storage');
      return data ? JSON.parse(data).state.user.tokenBalance : null;
    });
    expect(cachedBalance).toBe(50);

    // Wait for API refresh
    await newPage.waitForTimeout(2000);

    // Verify balance still correct after API call
    const refreshedBalance = await getTokenBalance(newPage);
    expect(refreshedBalance).toBe(50);

    await newPage.screenshot({ path: '.playwright-mcp/local/tc-token-1.png' });
  });

  test('TC-TOKEN-2: Balance Display Variants', async ({ page }) => {
    await loginAndHydrate(page, testUser);

    // Test compact variant in navbar
    await page.goto('http://localhost:3000/generate');
    const compactVariant = page.locator('[data-testid="token-balance-compact"]');
    await expect(compactVariant).toBeVisible();
    await expect(compactVariant).toContainText('50');

    // Test full variant in account page
    await page.goto('http://localhost:3000/account?tab=tokens');
    const fullVariant = page.locator('[data-testid="token-balance-full"]');
    await expect(fullVariant).toBeVisible();
    await expect(fullVariant).toContainText('50');
    await expect(fullVariant).toContainText('Purchase History'); // Full variant shows more info

    // Verify CTAs functional in full variant
    const purchaseButton = page.locator('button:has-text("Purchase Tokens")');
    await expect(purchaseButton).toBeVisible();
    await purchaseButton.click();

    // Modal should open
    await expect(page.locator('[role="dialog"]')).toBeVisible();

    await page.screenshot({ path: '.playwright-mcp/local/tc-token-2.png' });
  });

  test('TC-TOKEN-3: Token Exhaustion Handling', async ({ page }) => {
    // Login as user with 1 token, trial=0
    const exhaustedUser = { ...testUser, tokenBalance: 1, trialRemaining: 0 };
    await loginAndHydrate(page, exhaustedUser);

    // Generate design to exhaust token
    await page.goto('http://localhost:3000/generate');

    // Fill form and submit
    await page.fill('input[name="address"]', '1600 Amphitheatre Parkway, Mountain View, CA');
    await page.click('[data-area="front_yard"]');
    await page.click('[data-style="modern_minimalist"]');
    await page.click('button:has-text("Generate")');

    // Wait for token deduction
    await waitForTokenBalance(page, 0);

    // Navigate back to generate
    await page.goto('http://localhost:3000/generate');

    // Verify "No Credits Available"
    await expect(page.locator('text=/No Credits|Insufficient/i')).toBeVisible();

    // Verify generate button disabled
    const generateButton = page.locator('button:has-text("Generate")');
    await expect(generateButton).toBeDisabled();

    // Verify purchase CTA prominent
    await expect(page.locator('button:has-text("Purchase Tokens")')).toBeVisible();

    // Try to submit form
    await generateButton.click({ force: true });

    // Verify error toast
    await expect(page.locator('text=/Insufficient tokens/i')).toBeVisible({ timeout: 5000 });

    await page.screenshot({ path: '.playwright-mcp/local/tc-token-3.png' });
  });

  test('TC-TOKEN-6: Authorization Priority System', async ({ page }) => {
    // This test requires backend API calls to set different states
    // For demonstration, showing the structure

    // User with subscription + trial + tokens
    const multiMethodUser = {
      email: 'test.multi@yarda.app',
      password: 'TestPass123!',
      subscription: 'active',
      trialRemaining: 2,
      tokenBalance: 50,
    };

    await loginAndHydrate(page, multiMethodUser);
    await page.goto('http://localhost:3000/generate');

    // Verify payment status shows subscription
    await expect(page.locator('text=/Unlimited|Subscription/i')).toBeVisible();

    // Generate design - should NOT deduct trial or tokens
    // (Implementation would need to verify via API call)

    await page.screenshot({ path: '.playwright-mcp/local/tc-token-6.png' });
  });
});
```

---

### Step 4: Implement Image Generation Tests

Due to length, here's the structure for image tests:

#### `tests/e2e/image-generation.spec.ts`

```typescript
import { test, expect } from '@playwright/test';
import { loginAndHydrate } from '../helpers/auth-helpers';
import {
  verifyImageLoaded,
  verifyVercelBlobUrl,
  downloadAndVerifyImage,
  verifyCarousel
} from '../helpers/image-helpers';

test.describe('Image Generation - TC-IMAGE-1 to TC-IMAGE-14', () => {
  // TC-IMAGE-1: Source Image Retrieval (Google Maps)
  test('TC-IMAGE-1: Source Image Retrieval', async ({ page }) => {
    // Submit generation
    // Verify Google Maps API called (via network inspection)
    // Verify images uploaded to Vercel Blob
    // Verify generation record includes source_image_url
  });

  // TC-IMAGE-6: Before/After Image Display (Carousel)
  test('TC-IMAGE-6: Before/After Carousel', async ({ page }) => {
    // Complete generation
    // Verify carousel renders with 2 slides
    await verifyCarousel(page);

    // Verify badges
    await expect(page.locator('text=BEFORE')).toBeVisible();
    await expect(page.locator('text=AFTER')).toBeVisible();
  });

  // TC-IMAGE-7: Hero-Sized Source Image Display
  test('TC-IMAGE-7: Hero-Sized Source Image', async ({ page }) => {
    // Submit generation
    // Verify source image displays at 500px height
    const sourceImage = page.locator('[data-testid="source-image-hero"]');
    await expect(sourceImage).toBeVisible();

    const dimensions = await verifyImageLoaded(page, '[data-testid="source-image-hero"]');
    expect(dimensions.height).toBeGreaterThanOrEqual(500);

    // Verify badges
    await expect(page.locator('text=/Street View|Satellite/i')).toBeVisible();
  });

  // TC-IMAGE-8: Image Download Functionality
  test('TC-IMAGE-8: Image Download', async ({ page }) => {
    // Complete generation
    const download = await downloadAndVerifyImage(page, '[data-testid="download-button"]');

    expect(download.fileName).toMatch(/yarda_frontyard_modernminimalist_\d+\.jpg/);
    expect(download.size).toBeGreaterThan(500 * 1024); // >500KB
  });
});
```

---

## 🧪 Testing Best Practices

### 1. Use Data Test IDs

Add to components:
```tsx
<div data-testid="token-balance-compact">{balance} tokens</div>
<img data-testid="source-image-hero" src={sourceImageUrl} />
<button data-testid="download-button">Download</button>
```

### 2. Wait for Hydration

Always wait for Zustand hydration:
```typescript
await page.waitForFunction(() => {
  const store = (window as any).userStore?.getState();
  return store?._hasHydrated === true;
});
```

### 3. Mock External Services

For Stripe:
```typescript
// Option 1: Use Stripe test mode
// Option 2: Mock Stripe redirect
await page.route('**/checkout.stripe.com/**', route => {
  route.fulfill({
    status: 200,
    body: '<html>Mock Stripe Checkout</html>',
  });
});
```

### 4. Screenshot Everything

```typescript
await page.screenshot({
  path: `.playwright-mcp/local/tc-${testName}.png`,
  fullPage: true
});
```

### 5. Handle Network Delays

```typescript
// Wait for API calls
await page.waitForResponse(response =>
  response.url().includes('/api/tokens/purchase') && response.status() === 200
);

// Or use timeout
await page.waitForTimeout(2000); // Only when necessary
```

---

## 📊 Expected Outcomes

After implementation:
- ✅ 28 new E2E test cases functional
- ✅ Purchase flow fully tested end-to-end
- ✅ Token management lifecycle validated
- ✅ Image generation pipeline verified
- ✅ 90%+ test coverage for critical user journeys
- ✅ CI/CD ready test suite

---

## 🚀 Next Steps

1. **Week 1:** Implement helpers and fixtures
2. **Week 2:** Build purchase flow tests (TC-PURCHASE-1 to TC-PURCHASE-8)
3. **Week 3:** Build token management tests (TC-TOKEN-1 to TC-TOKEN-6)
4. **Week 4:** Build image generation tests (TC-IMAGE-1 to TC-IMAGE-14)
5. **Week 5:** Integration with CI/CD pipeline

---

**Status:** Ready for Implementation
**Effort:** 4-5 weeks (1 developer)
**Prerequisites:** Stripe test mode configured, test accounts created
