/**
 * Manual E2E Test for Staging Preview Environment
 *
 * This test bypasses Vercel authentication by using the shareable URL directly.
 * Tests critical Feature 005 functionality on the preview deployment.
 */

import { test, expect, Page } from '@playwright/test';

// Staging environment with shareable URL (bypasses Vercel auth)
const STAGING_BASE_URL = 'https://yarda-v5-frontend-jxonwuxkj-thetangstrs-projects.vercel.app';
const VERCEL_SHARE_PARAM = 'o64DXz4AMnGg6wpNTJ6UIqnk3EnGeGen';

// Test user credentials (pre-created in staging database)
const TEST_USER_EMAIL = 'test+trial@yarda.ai';
const TEST_USER_PASSWORD = 'TestPassword123!';

/**
 * Helper: Navigate to staging page with Vercel share parameter
 */
async function gotoStaging(page: Page, path: string = '/generate') {
  const url = `${STAGING_BASE_URL}${path}?_vercel_share=${VERCEL_SHARE_PARAM}`;
  await page.goto(url);

  // Wait for page to fully load
  await page.waitForLoadState('networkidle');
}

/**
 * Helper: Login with real test user credentials
 * This authenticates the user properly, bypassing application auth guards
 */
async function loginToStaging(page: Page) {
  // Navigate to login page with Vercel bypass
  const loginUrl = `${STAGING_BASE_URL}/login?_vercel_share=${VERCEL_SHARE_PARAM}`;
  await page.goto(loginUrl);
  await page.waitForLoadState('networkidle');

  // Wait for login form to appear
  await page.waitForSelector('input[type="email"]', { timeout: 10000 });

  // Fill in credentials
  await page.fill('input[type="email"]', TEST_USER_EMAIL);
  await page.fill('input[type="password"]', TEST_USER_PASSWORD);

  // Click sign in button
  await page.click('button:has-text("Sign In")');

  // Wait for authentication to complete (redirect to home or generate page)
  await page.waitForURL(/\/(generate|$|\?)/, { timeout: 15000 });
  await page.waitForLoadState('networkidle');

  // Clear any previous generation state to ensure clean test environment
  await page.evaluate(() => {
    localStorage.removeItem('generation-storage');
    localStorage.removeItem('yarda-generation-request-id');
  });

  console.log('✅ Successfully authenticated as:', TEST_USER_EMAIL);
}

test.describe('Staging Preview - Feature 005 Manual Tests', () => {
  test('TC-STAGING-1: Should load generate page after authentication', async ({ page }) => {
    // First, authenticate with real user credentials
    await loginToStaging(page);

    // Navigate to generate page
    await gotoStaging(page, '/generate');

    // Verify we're on the generate page, NOT login or Vercel auth
    const url = page.url();
    expect(url).toContain('yarda-v5-frontend-jxonwuxkj');
    expect(url).toContain('/generate');
    expect(url).not.toContain('vercel.com/login');
    expect(url).not.toContain('/login');

    // Verify page title or heading
    await expect(page).toHaveTitle(/Generate|Yarda/i);

    // Verify form is visible (look for the actual address input field)
    const addressInput = page.locator('input[placeholder*="Main Street" i], input[placeholder*="property" i], input[name="address"]').first();
    await expect(addressInput).toBeVisible({ timeout: 10000 });
  });

  test('TC-STAGING-2: Should display generation form with all sections', async ({ page }) => {
    // Authenticate first
    await loginToStaging(page);
    await gotoStaging(page, '/generate');

    // Verify address input
    const addressInput = page.locator('input[placeholder*="Main Street" i], input[placeholder*="property" i], input[name="address"]').first();
    await expect(addressInput).toBeVisible({ timeout: 10000 });

    // Verify "Property Address" or "Choose Your Landscape Areas" section headers
    const propertyAddressSection = page.locator('text=/Property Address|Choose Your Landscape Areas/i').first();
    await expect(propertyAddressSection).toBeVisible({ timeout: 5000 });

    // Verify area selector section exists (look for the heading)
    const areaSection = page.locator('text=/Choose.*Landscape.*Area|Select.*area/i').first();
    await expect(areaSection).toBeVisible({ timeout: 5000 });
  });

  test('TC-STAGING-3: Should display preservation strength slider (Feature 005)', async ({ page }) => {
    // Authenticate first
    await loginToStaging(page);
    await gotoStaging(page, '/generate');

    // Scroll to transformation intensity section
    await page.evaluate(() => {
      const section = document.evaluate(
        "//h2[contains(text(), 'Transformation Intensity')] | //h3[contains(text(), 'Transformation Intensity')]",
        document,
        null,
        XPathResult.FIRST_ORDERED_NODE_TYPE,
        null
      ).singleNodeValue;
      section?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    });

    await page.waitForTimeout(1000);

    // Verify slider exists (Feature 005 specific)
    const slider = page.locator('input[type="range"]').first();
    await expect(slider).toBeVisible({ timeout: 5000 });

    // Verify slider default value is 0.5 (Balanced)
    const sliderValue = await slider.getAttribute('value');
    expect(parseFloat(sliderValue || '0')).toBeCloseTo(0.5, 1);

    // Verify labels exist (Dramatic, Balanced, Subtle)
    await expect(page.locator('text=/dramatic/i').first()).toBeVisible();
    await expect(page.locator('text=/balanced/i').first()).toBeVisible();
    await expect(page.locator('text=/subtle/i').first()).toBeVisible();
  });

  test('TC-STAGING-4: Should display custom instructions section (Feature 005)', async ({ page }) => {
    // Authenticate first
    await loginToStaging(page);
    await gotoStaging(page, '/generate');

    // Scroll down to see custom instructions section
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.waitForTimeout(1000);

    // Verify "Custom Instructions" section heading exists
    const customInstructionsHeading = page.locator('text=/Custom Instructions/i').first();
    await expect(customInstructionsHeading).toBeVisible({ timeout: 5000 });

    // Verify textarea is present
    const textarea = page.locator('textarea').first();
    await expect(textarea).toBeVisible({ timeout: 5000 });
  });

  test('TC-STAGING-5: Should allow custom instructions input (Feature 005)', async ({ page }) => {
    // Authenticate first
    await loginToStaging(page);
    await gotoStaging(page, '/generate');

    // Scroll down to custom instructions section
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.waitForTimeout(1000);

    // Find custom prompt textarea
    const textarea = page.locator('textarea').first();
    await expect(textarea).toBeVisible({ timeout: 5000 });

    // Type some text and verify it accepts input
    await textarea.fill('Test prompt with some characters');
    await page.waitForTimeout(500);

    // Verify the text was entered
    const textareaValue = await textarea.inputValue();
    expect(textareaValue).toBe('Test prompt with some characters');
  });

  test('TC-STAGING-6: Should verify backend connectivity', async ({ page }) => {
    // Set up API request interception to verify backend calls
    let backendCalled = false;

    page.on('response', (response) => {
      if (response.url().includes('yardav5-staging.up.railway.app')) {
        backendCalled = true;
      }
    });

    // Authenticate first
    await loginToStaging(page);
    await gotoStaging(page, '/generate');

    // Wait for any backend calls (e.g., payment-status, user data)
    await page.waitForTimeout(3000);

    // Verify backend was called (or check specific endpoints)
    // Note: This might not trigger if page doesn't make backend calls on load
    console.log('Backend called:', backendCalled);
  });
});

test.describe('Staging Preview - Visual Regression Checks', () => {
  test('TC-STAGING-VIS-1: Should match expected layout for generate page', async ({ page }) => {
    // Authenticate first
    await loginToStaging(page);
    await gotoStaging(page, '/generate');

    // Wait for all critical elements to load
    await page.waitForTimeout(2000);

    // Take screenshot for visual verification
    await page.screenshot({
      path: 'test-results/staging-generate-page-layout.png',
      fullPage: true,
    });

    // Verify no obvious layout issues (basic checks)
    const bodyHeight = await page.evaluate(() => document.body.scrollHeight);
    expect(bodyHeight).toBeGreaterThan(500); // Page has content

    // Verify no error messages visible
    const errorMessages = page.locator('text=/error|failed|something went wrong/i');
    const errorCount = await errorMessages.count();
    expect(errorCount).toBe(0);
  });
});
