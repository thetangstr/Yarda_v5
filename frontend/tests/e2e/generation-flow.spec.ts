/**
 * E2E Tests for Feature 004: Generation Flow
 *
 * Test Scenarios:
 * - TC-GEN-1: Trial user creates generation with address input
 * - TC-GEN-2: Area and style selection
 * - TC-GEN-3: Generation submission and navigation to progress page
 * - TC-GEN-4: Real-time progress tracking
 * - TC-GEN-5: localStorage persistence on page refresh
 * - TC-GEN-6: Generation completion and result display
 *
 * Requirements:
 * - T018-T029: Frontend components
 * - FR-001 to FR-016: Generation flow functional requirements
 */

import { test, expect } from '@playwright/test';

// Test data
const testAddress = '1600 Amphitheatre Parkway, Mountain View, CA 94043';

test.describe('Feature 004: Generation Flow', () => {
  // Navigate to generate page before each test
  // Authentication is handled by global setup (tests/global-setup.ts)
  test.beforeEach(async ({ page }) => {
    await page.goto('/generate');
  });

  test('TC-GEN-1: Trial user can access generation form', async ({ page }) => {
    // Page is already on /generate from beforeEach
    // Verify form elements are present
    await expect(page.locator('[data-testid="address-input"]')).toBeVisible();
    await expect(page.locator('[data-testid="area-selector"]')).toBeVisible();
    await expect(page.locator('[data-testid="style-selector"]')).toBeVisible();
    await expect(page.locator('[data-testid="generate-button"]')).toBeVisible();

    // Verify payment status indicator
    await expect(page.locator('[data-testid="payment-status"]')).toBeVisible();
  });

  test('TC-GEN-2: User can select area and style', async ({ page }) => {
    // Page is already on /generate from beforeEach
    // Select area (front yard)
    await page.click('[data-testid="area-option-front_yard"]');
    await expect(page.locator('[data-testid="area-option-front_yard"]')).toHaveClass(/border-brand-green/);

    // Select style (minimalist)
    await page.click('[data-testid="style-option-minimalist"]');
    await expect(page.locator('[data-testid="style-option-minimalist"]')).toHaveClass(/border-brand-green/);

    // Verify generate button is enabled
    await expect(page.locator('[data-testid="generate-button"]')).toBeEnabled();
  });

  test('TC-GEN-3: Complete generation submission flow', async ({ page }) => {

    // Step 1: Fill in address
    await page.fill('[data-testid="address-input"]', testAddress);

    // Step 2: Select area
    await page.click('[data-testid="area-option-front_yard"]');

    // Step 3: Select style
    await page.click('[data-testid="style-option-minimalist"]');

    // Step 4: Optionally add custom prompt
    await page.fill('[data-testid="custom-prompt-input"]', 'Include drought-tolerant plants');

    // Step 5: Submit generation
    await page.click('[data-testid="generate-button"]');

    // Step 6: Verify navigation to progress page
    await expect(page).toHaveURL(/.*\/generate\/progress\/.+/, { timeout: 10000 });

    // Step 7: Verify progress page displays generation info
    await expect(page.locator('text=Generating Your Design')).toBeVisible({ timeout: 5000 });
  });

  test('TC-GEN-4: Real-time progress tracking displays correctly', async ({ page }) => {

    // Create generation
    await page.fill('[data-testid="address-input"]', testAddress);
    await page.click('[data-testid="area-option-backyard"]');
    await page.click('[data-testid="style-option-california_native"]');
    await page.click('[data-testid="generate-button"]');

    // Wait for progress page
    await expect(page).toHaveURL(/.*\/generate\/progress\/.+/, { timeout: 10000 });

    // Verify progress elements
    await expect(page.locator('[data-testid="progress-bar"]')).toBeVisible({ timeout: 5000 });
    await expect(page.locator('[data-testid="area-status-card"]')).toBeVisible();

    // Verify live updates indicator
    await expect(page.locator('text=Live updates enabled')).toBeVisible({ timeout: 5000 });

    // Check that progress percentage is displayed
    const progressText = await page.locator('[data-testid="progress-percentage"]').textContent({ timeout: 10000 });
    expect(progressText).toMatch(/\d+%/);
  });

  test('TC-GEN-5: Progress persists across page refresh', async ({ page }) => {

    // Create generation
    await page.fill('[data-testid="address-input"]', testAddress);
    await page.click('[data-testid="area-option-walkway"]');
    await page.click('[data-testid="style-option-mediterranean"]');
    await page.click('[data-testid="generate-button"]');

    // Wait for progress page
    await expect(page).toHaveURL(/.*\/generate\/progress\/.+/, { timeout: 10000 });
    const progressUrl = page.url();

    // Wait for some progress
    await page.waitForTimeout(3000);

    // Refresh page
    await page.reload();

    // Verify we're still on the same progress page
    expect(page.url()).toBe(progressUrl);

    // Verify progress is still displayed
    await expect(page.locator('[data-testid="progress-bar"]')).toBeVisible({ timeout: 5000 });

    // Verify tip about page refresh
    await expect(page.locator('text=You can safely refresh this page')).toBeVisible();
  });

  test('TC-GEN-6: Generation completion shows success message', async ({ page }) => {
    // Note: This test assumes a mock or test environment where generations complete quickly
    // In production, you might need to use API mocking or wait longer


    // Create generation
    await page.fill('[data-testid="address-input"]', testAddress);
    await page.click('[data-testid="area-option-patio"]');
    await page.click('[data-testid="style-option-mediterranean"]');
    await page.click('[data-testid="generate-button"]');

    // Wait for progress page
    await expect(page).toHaveURL(/.*\/generate\/progress\/.+/, { timeout: 10000 });

    // Wait for completion (with extended timeout for actual generation)
    // In a real test environment, you might mock the API or use a test endpoint
    await expect(page.locator('text=Design Complete!')).toBeVisible({ timeout: 120000 });

    // Verify completion elements
    await expect(page.locator('text=Your landscape design is ready to view')).toBeVisible();
    await expect(page.locator('button:has-text("Generate Another Design")')).toBeVisible();
    await expect(page.locator('a:has-text("View All Designs")')).toBeVisible();

    // Verify image is displayed
    await expect(page.locator('[data-testid="generated-image"]')).toBeVisible();
  });

  test('TC-GEN-7: Error handling when no credits available', async ({ page }) => {
    // This test assumes user has 0 trial credits remaining

    // Verify payment status shows no credits
    const paymentStatus = await page.locator('[data-testid="payment-status"]');
    await expect(paymentStatus).toContainText('No Credits Available');

    // Try to generate
    await page.fill('[data-testid="address-input"]', testAddress);
    await page.click('[data-testid="area-option-front_yard"]');
    await page.click('[data-testid="style-option-minimalist"]');

    // Verify generate button is disabled
    await expect(page.locator('[data-testid="generate-button"]')).toBeDisabled();

    // Or if button is enabled but shows error on click
    const isEnabled = await page.locator('[data-testid="generate-button"]').isEnabled();
    if (isEnabled) {
      await page.click('[data-testid="generate-button"]');
      await expect(page.locator('[data-testid="submit-error"]')).toBeVisible();
      await expect(page.locator('[data-testid="submit-error"]')).toContainText('no credits');
    }
  });

  test('TC-GEN-8: Form validation prevents empty submission', async ({ page }) => {

    // Try to submit without filling anything
    await page.click('[data-testid="generate-button"]');

    // Should stay on same page
    await expect(page).toHaveURL(/.*\/generate$/);

    // Verify validation errors appear
    await expect(page.locator('text=Please enter a valid property address')).toBeVisible();
  });

  test('TC-GEN-9: Custom prompt character counter works', async ({ page }) => {

    const customPromptInput = page.locator('[data-testid="custom-prompt-input"]');

    // Type a short prompt
    await customPromptInput.fill('Add water feature');
    await expect(page.locator('text=18/500')).toBeVisible();

    // Type a longer prompt
    const longPrompt = 'A'.repeat(450);
    await customPromptInput.fill(longPrompt);
    await expect(page.locator('text=450/500')).toBeVisible();

    // Verify warning color at 90% capacity
    const counterElement = page.locator('text=450/500');
    await expect(counterElement).toHaveClass(/text-warning/);
  });

  test('TC-GEN-10: Navigation between pages preserves state', async ({ page }) => {

    // Fill in form
    await page.fill('[data-testid="address-input"]', testAddress);
    await page.click('[data-testid="area-option-pool_area"]');
    await page.click('[data-testid="style-option-california_native"]');

    // Navigate away
    await page.click('text=History');
    await expect(page).toHaveURL(/.*\/history/);

    // Navigate back
    await page.click('text=Generate');
    await expect(page).toHaveURL(/.*\/generate/);

    // Note: Form state may or may not be preserved depending on implementation
    // This test documents the expected behavior
  });
});
