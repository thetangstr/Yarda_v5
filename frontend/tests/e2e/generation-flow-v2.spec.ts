/**
 * E2E Tests for Feature 005 - Port V2 Generation Flow
 *
 * User Stories Covered:
 * - US1 (P1): Single-page generation experience
 * - US5 (P1): Backend integration with polling
 *
 * Test Strategy (TDD):
 * - Write tests FIRST (Red)
 * - Implement components (Green)
 * - Refactor for quality (Refactor)
 *
 * Critical Requirements:
 * - No page navigation during generation flow
 * - Progress updates visible inline every 2 seconds
 * - Results display inline when complete
 * - 5-minute polling timeout
 */

import { test, expect, Page } from '@playwright/test';

// Test configuration
const POLLING_INTERVAL = 2000; // 2 seconds
const MAX_GENERATION_TIME = 120000; // 2 minutes (generous for real backend)

/**
 * Helper: Setup mock authentication for testing
 * Uses localStorage to bypass actual login flow
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

test.describe('US1 + US5: Single-Page Generation Flow with Polling', () => {
  test.beforeEach(async ({ page }) => {
    // Setup mock auth before each test
    await setupMockAuth(page);
  });

  /**
   * T008: E2E test for single-page generation flow
   *
   * User Story: US1 (P1) - Single-page generation experience
   *
   * Acceptance Criteria:
   * - Form, progress, and results all appear on same page
   * - No navigation occurs during generation
   * - User can see all sections inline
   */
  test('T008: Should complete generation flow without page navigation', async ({ page }) => {
    // Verify we're on generate page
    await expect(page).toHaveURL(/\/generate/);

    // Get initial URL
    const initialURL = page.url();

    // Fill in address
    await page.fill('input[placeholder*="address" i]', '123 Main St, San Francisco, CA');
    await page.waitForTimeout(1000); // Wait for autocomplete

    // Select first yard area (front_yard)
    await page.click('[data-testid="yard-area-front_yard"]');

    // Select a style
    await page.click('[data-testid="style-modern"]');

    // Add custom prompt
    await page.fill('textarea[name="custom_prompt"]', 'Modern minimalist landscaping');

    // Submit form
    await page.click('button:has-text("Generate Design")');

    // Wait for progress section to appear (should be inline)
    await expect(page.locator('[data-testid="generation-progress"]')).toBeVisible({
      timeout: 5000,
    });

    // CRITICAL: Verify URL has NOT changed (no navigation)
    expect(page.url()).toBe(initialURL);

    // Verify form is still visible but possibly disabled
    await expect(page.locator('input[placeholder*="address" i]')).toBeVisible();

    // Wait for generation to complete (up to 2 minutes)
    await expect(page.locator('[data-testid="generation-results"]')).toBeVisible({
      timeout: MAX_GENERATION_TIME,
    });

    // CRITICAL: Verify URL STILL has not changed
    expect(page.url()).toBe(initialURL);

    // Verify results are displayed inline
    await expect(page.locator('[data-testid="result-image-front_yard"]')).toBeVisible();

    // Verify "Start New Generation" button appears
    await expect(page.locator('button:has-text("Start New Generation")')).toBeVisible();
  });

  /**
   * T009: E2E test for polling progress updates
   *
   * User Story: US5 (P1) - Backend integration with polling
   *
   * Acceptance Criteria:
   * - Progress updates appear every 2 seconds
   * - Status changes are reflected in UI
   * - Polling continues until completion
   */
  test('T009: Should poll for progress updates every 2 seconds', async ({ page }) => {
    // Fill and submit form
    await page.fill('input[placeholder*="address" i]', '456 Elm St, Los Angeles, CA');
    await page.click('[data-testid="yard-area-back_yard"]');
    await page.click('[data-testid="style-modern"]');
    await page.click('button:has-text("Generate Design")');

    // Wait for progress section
    await expect(page.locator('[data-testid="generation-progress"]')).toBeVisible({
      timeout: 5000,
    });

    // Track progress updates
    const progressUpdates: string[] = [];
    let updateCount = 0;

    // Listen for progress text changes
    const progressLocator = page.locator('[data-testid="progress-status"]');

    // Wait for at least 2 progress updates (4 seconds minimum)
    const startTime = Date.now();
    while (updateCount < 2 && Date.now() - startTime < 10000) {
      const progressText = await progressLocator.textContent();
      if (progressText && !progressUpdates.includes(progressText)) {
        progressUpdates.push(progressText);
        updateCount++;
      }
      await page.waitForTimeout(POLLING_INTERVAL);
    }

    // Verify we got multiple updates
    expect(updateCount).toBeGreaterThanOrEqual(2);

    // Verify updates happened roughly every 2 seconds
    const elapsedTime = Date.now() - startTime;
    expect(elapsedTime).toBeGreaterThanOrEqual(4000); // At least 4 seconds for 2 updates
    expect(elapsedTime).toBeLessThan(10000); // But not more than 10 seconds
  });

  /**
   * T010: E2E test for inline results display
   *
   * User Story: US1 (P1) - Single-page generation experience
   *
   * Acceptance Criteria:
   * - Results appear inline when generation completes
   * - Image URLs are displayed
   * - Success/failure status is clear
   */
  test('T010: Should display results inline when generation completes', async ({ page }) => {
    // Fill and submit form
    await page.fill('input[placeholder*="address" i]', '789 Oak Ave, San Diego, CA');
    await page.click('[data-testid="yard-area-front_yard"]');
    await page.click('[data-testid="yard-area-back_yard"]');
    await page.click('[data-testid="style-modern"]');
    await page.fill('textarea[name="custom_prompt"]', 'Beautiful landscaping');
    await page.click('button:has-text("Generate Design")');

    // Wait for results section to appear
    await expect(page.locator('[data-testid="generation-results"]')).toBeVisible({
      timeout: MAX_GENERATION_TIME,
    });

    // Verify results are displayed inline (not on separate page)
    await expect(page).toHaveURL(/\/generate/);

    // Verify at least one result image is present
    const resultImages = page.locator('[data-testid^="result-image-"]');
    await expect(resultImages.first()).toBeVisible();

    // Verify image has valid src attribute (Vercel Blob URL)
    const firstImage = resultImages.first();
    const imageSrc = await firstImage.getAttribute('src');
    expect(imageSrc).toBeTruthy();
    expect(imageSrc).toMatch(/https?:\/\/.+\.(jpg|png|webp)/i);

    // Verify success message or status indicator
    await expect(
      page.locator('text=/generation complete|success|completed/i')
    ).toBeVisible();

    // Verify form is ready for new generation
    await expect(page.locator('button:has-text("Start New Generation")')).toBeVisible();
  });

  /**
   * T019: Error handling for network interruptions during polling
   *
   * User Story: US5 (P1) - Backend integration with polling
   *
   * Acceptance Criteria:
   * - Network errors are caught gracefully
   * - User sees error message
   * - User can retry
   */
  test('T019: Should handle network interruptions gracefully', async ({ page, context }) => {
    // Fill and submit form
    await page.fill('input[placeholder*="address" i]', '321 Pine St, Sacramento, CA');
    await page.click('[data-testid="yard-area-front_yard"]');
    await page.click('[data-testid="style-modern"]');
    await page.click('button:has-text("Generate Design")');

    // Wait for progress to start
    await expect(page.locator('[data-testid="generation-progress"]')).toBeVisible({
      timeout: 5000,
    });

    // Simulate network failure by going offline
    await context.setOffline(true);

    // Wait a few seconds for polling to fail
    await page.waitForTimeout(5000);

    // Verify error message appears
    await expect(
      page.locator('text=/network error|connection lost|failed to fetch/i')
    ).toBeVisible({ timeout: 10000 });

    // Restore network
    await context.setOffline(false);

    // Verify retry button or automatic retry
    // (Implementation may auto-retry or provide manual retry button)
    const hasRetryButton = await page
      .locator('button:has-text("Retry")')
      .isVisible()
      .catch(() => false);

    if (hasRetryButton) {
      // Manual retry case
      await page.click('button:has-text("Retry")');
      await expect(page.locator('[data-testid="generation-progress"]')).toBeVisible();
    } else {
      // Auto-retry case - progress should resume
      await expect(page.locator('[data-testid="generation-progress"]')).toBeVisible();
    }
  });

  /**
   * T020: Timeout handling (5 minutes)
   *
   * User Story: US5 (P1) - Backend integration with polling
   *
   * Acceptance Criteria:
   * - Polling stops after 5 minutes
   * - Timeout error message appears
   * - User can start new generation
   *
   * NOTE: This test uses mocked timeout since waiting 5 minutes is impractical
   */
  test('T020: Should timeout after 5 minutes of polling', async ({ page }) => {
    // Mock the polling timeout by intercepting API calls
    await page.route('**/v1/generations/*', async (route) => {
      // Always return "processing" status to simulate stuck generation
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          id: 'test-generation-id',
          status: 'processing',
          results: [
            {
              area_id: 'front_yard',
              status: 'processing',
              image_url: null,
              error: null,
            },
          ],
        }),
      });
    });

    // Fill and submit form
    await page.fill('input[placeholder*="address" i]', '654 Maple Dr, Fresno, CA');
    await page.click('[data-testid="yard-area-front_yard"]');
    await page.click('[data-testid="style-modern"]');
    await page.click('button:has-text("Generate Design")');

    // Wait for progress to start
    await expect(page.locator('[data-testid="generation-progress"]')).toBeVisible({
      timeout: 5000,
    });

    // Fast-forward time by manipulating client-side Date (if implementation uses Date.now())
    // OR wait for timeout error (mocked to 10 seconds for testing)
    // This depends on implementation - adjust as needed

    // For now, verify timeout message appears within reasonable time
    await expect(
      page.locator('text=/timeout|took too long|exceeded maximum time/i')
    ).toBeVisible({ timeout: 15000 });

    // Verify user can start new generation
    await expect(page.locator('button:has-text("Start New Generation")')).toBeVisible();
  });
});

/**
 * Additional Test: "Start New Generation" button (T018)
 *
 * User Story: US1 (P1) - Single-page generation experience
 *
 * Acceptance Criteria:
 * - Button appears after completion
 * - Clicking resets form without page reload
 * - Form is ready for new submission
 */
test.describe('US1: Start New Generation Flow', () => {
  test.beforeEach(async ({ page }) => {
    await setupMockAuth(page);
  });

  test('T018: Should reset form without page reload', async ({ page }) => {
    // Complete a generation first
    await page.fill('input[placeholder*="address" i]', '111 Test St, San Francisco, CA');
    await page.click('[data-testid="yard-area-front_yard"]');
    await page.click('[data-testid="style-modern"]');
    await page.fill('textarea[name="custom_prompt"]', 'Test prompt');
    await page.click('button:has-text("Generate Design")');

    // Wait for completion
    await expect(page.locator('[data-testid="generation-results"]')).toBeVisible({
      timeout: MAX_GENERATION_TIME,
    });

    // Get URL before clicking "Start New Generation"
    const urlBeforeReset = page.url();

    // Click "Start New Generation"
    await page.click('button:has-text("Start New Generation")');

    // Verify URL has NOT changed (no page reload)
    expect(page.url()).toBe(urlBeforeReset);

    // Verify form is reset
    await expect(page.locator('input[placeholder*="address" i]')).toHaveValue('');
    await expect(page.locator('textarea[name="custom_prompt"]')).toHaveValue('');

    // Verify results section is hidden
    await expect(page.locator('[data-testid="generation-results"]')).not.toBeVisible();

    // Verify progress section is hidden
    await expect(page.locator('[data-testid="generation-progress"]')).not.toBeVisible();

    // Verify form is enabled and ready
    await expect(page.locator('button:has-text("Generate Design")')).toBeEnabled();
  });
});
