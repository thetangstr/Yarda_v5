/**
 * E2E Test: Google Maps Street View Integration
 * Feature: 003-google-maps-integration
 * User Story 1: Automatic Front Yard Image Retrieval via Street View
 *
 * Test: Front yard generation without image upload retrieves Street View
 */

import { test, expect } from '@playwright/test';

test.describe('Google Maps Street View Integration', () => {
  test('T012: Front yard generation without image upload retrieves Street View', async ({ page }) => {
    // Test data: Known address with Street View coverage
    const testAddress = '1600 Amphitheatre Parkway, Mountain View, CA 94043';

    // Step 1: Navigate to generation page
    await page.goto('/generate');

    // Step 2: Verify user is authenticated (redirect if not)
    await expect(page).toHaveURL(/\/generate/);

    // Step 3: Fill in generation form WITHOUT uploading image
    await page.fill('input[name="address"]', testAddress);
    await page.selectOption('select[name="area"]', 'front_yard');
    await page.selectOption('select[name="style"]', 'modern_minimalist');

    // Step 4: Verify image upload field is optional (should not be required)
    const imageInput = page.locator('input[type="file"]');
    await expect(imageInput).not.toHaveAttribute('required');

    // Step 5: Submit generation request
    await page.click('button[type="submit"]');

    // Step 6: Wait for generation to start
    await expect(page.locator('text=/Processing|Generating/')).toBeVisible({ timeout: 10000 });

    // Step 7: Wait for generation to complete (or reasonable timeout)
    // Note: Actual AI generation takes time, so we wait for either success or specific status
    const statusIndicator = page.locator('[data-testid="generation-status"]');
    await expect(statusIndicator).toHaveText(/completed|processing/i, { timeout: 30000 });

    // Step 8: Verify image source is set to 'google_street_view'
    // This should be displayed or available in the generation details
    const imageSource = page.locator('[data-testid="image-source"]');
    await expect(imageSource).toContainText('google_street_view');

    // Step 9: Verify no error message displayed
    await expect(page.locator('[data-testid="error-message"]')).not.toBeVisible();

    // Step 10: Verify generation was created successfully
    await expect(page.locator('[data-testid="generation-result"]')).toBeVisible();
  });

  test('T012-A: Verify Street View metadata check occurs before image fetch', async ({ page }) => {
    // This test verifies the cost optimization: FREE metadata check before PAID image request
    const testAddress = '1600 Amphitheatre Parkway, Mountain View, CA 94043';

    // Intercept API calls to verify order
    const apiCalls: string[] = [];

    page.on('request', request => {
      const url = request.url();
      if (url.includes('maps.googleapis.com')) {
        if (url.includes('streetview/metadata')) {
          apiCalls.push('metadata');
        } else if (url.includes('streetview?')) {
          apiCalls.push('image');
        }
      }
    });

    await page.goto('/generate');
    await page.fill('input[name="address"]', testAddress);
    await page.selectOption('select[name="area"]', 'front_yard');
    await page.click('button[type="submit"]');

    // Wait for processing
    await page.waitForTimeout(5000);

    // Verify metadata call happened before image call
    const metadataIndex = apiCalls.indexOf('metadata');
    const imageIndex = apiCalls.indexOf('image');

    expect(metadataIndex).toBeGreaterThanOrEqual(0); // Metadata call occurred
    expect(imageIndex).toBeGreaterThanOrEqual(0); // Image call occurred
    expect(metadataIndex).toBeLessThan(imageIndex); // Metadata BEFORE image
  });

  test('T012-B: Verify credit deduction occurs for Street View generation', async ({ page }) => {
    const testAddress = '1600 Amphitheatre Parkway, Mountain View, CA 94043';

    await page.goto('/generate');

    // Get initial credit count
    const initialCredits = await page.locator('[data-testid="credits-remaining"]').textContent();
    const initialCount = parseInt(initialCredits || '0');

    // Submit generation
    await page.fill('input[name="address"]', testAddress);
    await page.selectOption('select[name="area"]', 'front_yard');
    await page.click('button[type="submit"]');

    // Wait for generation to start (credit should be deducted immediately)
    await page.waitForTimeout(2000);

    // Verify credit was deducted
    const newCredits = await page.locator('[data-testid="credits-remaining"]').textContent();
    const newCount = parseInt(newCredits || '0');

    expect(newCount).toBe(initialCount - 1);
  });
});
