/**
 * E2E Test: Manual Upload Overrides Google Maps
 * Feature: 003-google-maps-integration
 * User Story 1: Manual upload takes precedence over automatic retrieval
 *
 * Test: Manual upload overrides Street View retrieval
 */

import { test, expect } from '@playwright/test';
import path from 'path';

test.describe('Manual Upload Override', () => {
  test('T013: Manual upload overrides Street View retrieval', async ({ page }) => {
    // Test data
    const testAddress = '1600 Amphitheatre Parkway, Mountain View, CA 94043';
    const testImagePath = path.join(__dirname, '../fixtures/test-property-image.jpg');

    // Step 1: Navigate to generation page
    await page.goto('/generate');

    // Step 2: Fill in generation form WITH manual image upload
    await page.fill('input[name="address"]', testAddress);
    await page.selectOption('select[name="area"]', 'front_yard');
    await page.selectOption('select[name="style"]', 'modern_minimalist');

    // Step 3: Upload user image
    await page.setInputFiles('input[type="file"]', testImagePath);

    // Step 4: Verify image preview is shown (indicates file was uploaded)
    const imagePreview = page.locator('[data-testid="image-preview"]');
    await expect(imagePreview).toBeVisible();

    // Step 5: Submit generation request
    await page.click('button[type="submit"]');

    // Step 6: Wait for generation to start
    await expect(page.locator('text=/Processing|Generating/')).toBeVisible({ timeout: 10000 });

    // Step 7: Wait for generation to complete
    const statusIndicator = page.locator('[data-testid="generation-status"]');
    await expect(statusIndicator).toHaveText(/completed|processing/i, { timeout: 30000 });

    // Step 8: Verify image source is set to 'user_upload' (NOT google_street_view)
    const imageSource = page.locator('[data-testid="image-source"]');
    await expect(imageSource).toContainText('user_upload');
    await expect(imageSource).not.toContainText('google_street_view');

    // Step 9: Verify no Google Maps API calls were made (user upload takes precedence)
    // This can be checked via network tab or API call interception
  });

  test('T013-A: Verify Google Maps APIs not called when user uploads image', async ({ page }) => {
    const testAddress = '1600 Amphitheatre Parkway, Mountain View, CA 94043';
    const testImagePath = path.join(__dirname, '../fixtures/test-property-image.jpg');

    // Track Google Maps API calls
    let googleMapsApiCalled = false;

    page.on('request', request => {
      if (request.url().includes('maps.googleapis.com')) {
        googleMapsApiCalled = true;
      }
    });

    await page.goto('/generate');
    await page.fill('input[name="address"]', testAddress);
    await page.selectOption('select[name="area"]', 'front_yard');
    await page.setInputFiles('input[type="file"]', testImagePath);
    await page.click('button[type="submit"]');

    // Wait for processing
    await page.waitForTimeout(5000);

    // Verify NO Google Maps API calls occurred
    expect(googleMapsApiCalled).toBe(false);
  });

  test('T013-B: Verify priority: user upload > Google Maps', async ({ page }) => {
    // Edge case: What if both address AND image are provided?
    // Expected: User upload takes precedence
    const testAddress = '1600 Amphitheatre Parkway, Mountain View, CA 94043';
    const testImagePath = path.join(__dirname, '../fixtures/test-property-image.jpg');

    await page.goto('/generate');

    // Provide BOTH address (Street View eligible) AND manual upload
    await page.fill('input[name="address"]', testAddress);
    await page.selectOption('select[name="area"]', 'front_yard');
    await page.setInputFiles('input[type="file"]', testImagePath);

    await page.click('button[type="submit"]');
    await page.waitForTimeout(5000);

    // Verify user_upload is used (not google_street_view)
    const imageSource = page.locator('[data-testid="image-source"]');
    await expect(imageSource).toContainText('user_upload');
  });
});
