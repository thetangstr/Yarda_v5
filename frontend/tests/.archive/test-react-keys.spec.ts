import { test, expect, Page } from '@playwright/test';

/**
 * Sets up mock authentication by injecting user state into localStorage
 * This bypasses the actual login flow for faster testing
 */
async function setupMockAuth(page: Page) {
  const mockUserState = {
    state: {
      user: {
        id: 'test-user-id',
        email: 'test.uat.bypass@yarda.app',
        email_verified: true,
        trial_remaining: 3,
        trial_used: 0,
        subscription_status: null,
        subscription_tier: null,
      },
      accessToken: 'mock-access-token',
      isAuthenticated: true,
    },
    version: 0,
  };

  // Set mock auth state before navigating
  await page.addInitScript((mockState) => {
    localStorage.setItem('user-storage', JSON.stringify(mockState));
  }, mockUserState);

  // Navigate to generate page
  await page.goto('/generate');
}

test.describe('React Key Warnings Test', () => {
  test('should not show React key warnings in console', async ({ page }) => {
    const consoleWarnings: string[] = [];

    // Capture console warnings BEFORE navigation
    page.on('console', (msg) => {
      if (msg.type() === 'warning' && msg.text().includes('unique "key" prop')) {
        consoleWarnings.push(msg.text());
      }
    });

    // Setup mock auth and navigate
    await setupMockAuth(page);

    // Verify we're on generate page
    await expect(page).toHaveURL(/\/generate/);

    // Wait for generate form to load
    await page.waitForSelector('[data-testid="generate-form"]', { timeout: 5000 });

    // Fill in generation form
    await page.fill('input[placeholder*="address"]', '22054 Clearwood Ct, Cupertino, CA 95014, USA');

    // Select an area
    const frontYardButton = page.locator('button:has-text("Front Yard")').first();
    await frontYardButton.click();

    // Select a style
    const modernButton = page.locator('button:has-text("Modern")').first();
    await modernButton.click();

    // Submit generation (this will trigger progress components)
    await page.click('button:has-text("Generate")');

    // Wait for progress component to render
    await page.waitForSelector('[data-testid="generation-progress"]', { timeout: 10000 });

    // Take a screenshot
    await page.screenshot({ path: '.playwright-mcp/react-keys-test.png', fullPage: true });

    // Wait a bit for all animations and state updates
    await page.waitForTimeout(3000);

    // Verify no React key warnings were logged
    expect(consoleWarnings).toHaveLength(0);

    if (consoleWarnings.length > 0) {
      console.log('❌ React key warnings found:');
      consoleWarnings.forEach(warning => console.log(`  - ${warning}`));
    } else {
      console.log('✅ No React key warnings found!');
    }
  });
});
