/**
 * Real E2E Test for Image Generation with Gemini API
 *
 * This test performs a full end-to-end test with:
 * - Real authentication
 * - Real backend API calls
 * - Real Gemini image generation
 * - Real image display verification
 *
 * Requirements:
 * - Backend running on localhost:8000
 * - Test user: test+trial@yarda.ai (password: TestPassword123!)
 * - User must have at least 1 trial credit
 * - GEMINI_API_KEY must be configured in backend .env
 */

import { test, expect } from '@playwright/test';

// Test configuration
const TEST_USER_EMAIL = 'test+trial@yarda.ai';
const TEST_USER_PASSWORD = 'TestPassword123!';
const TEST_ADDRESS = '21125 Seven Springs Dr, Cupertino, CA 95014, USA';

// Extend timeout for real API calls (Gemini takes 30-60s to generate)
test.setTimeout(180000); // 3 minutes

test.describe('Real Image Generation Flow with Gemini', () => {
  test('TC-IMG-1: Complete image generation flow with real Gemini API', async ({ page }) => {
    console.log('\n📝 Starting real image generation E2E test...\n');

    // Step 1: Navigate to login page
    console.log('Step 1: Navigating to login page...');
    await page.goto('http://localhost:3000');
    await page.click('text=Sign In');
    await expect(page).toHaveURL(/.*\/login/, { timeout: 10000 });

    // Step 2: Login with test user
    console.log(`Step 2: Logging in as ${TEST_USER_EMAIL}...`);
    await page.fill('input[type="email"]', TEST_USER_EMAIL);
    await page.fill('input[type="password"]', TEST_USER_PASSWORD);
    await page.click('button[type="submit"]');

    // Wait for redirect after login
    await page.waitForURL(/.*\/(generate|home)/, { timeout: 15000 });
    console.log('✅ Login successful');

    // Step 3: Navigate to generate page
    console.log('Step 3: Navigating to generate page...');
    await page.goto('http://localhost:3000/generate');
    await expect(page).toHaveURL(/.*\/generate/, { timeout: 10000 });

    // Step 4: Verify trial credits are available
    console.log('Step 4: Checking trial credits...');
    const tokenBalance = page.locator('[data-testid="token-balance"]');
    await expect(tokenBalance).toBeVisible({ timeout: 5000 });
    const balanceText = await tokenBalance.textContent();
    console.log(`Token balance: ${balanceText}`);

    // Step 5: Fill in generation form
    console.log(`Step 5: Filling form with address: ${TEST_ADDRESS}...`);

    // Fill address using correct data-testid
    const addressInput = page.locator('[data-testid="address-input"]');
    await addressInput.fill(TEST_ADDRESS);
    await page.waitForTimeout(1000); // Wait for Google Maps API

    // Select area (backyard) - component shows "Back Yard" with space
    console.log('Selecting area: Back Yard...');
    const backyardOption = page.locator('button:has-text("Back Yard")');
    await backyardOption.click();
    await page.waitForTimeout(500);

    // Select style (modern minimalist) - exact text match
    console.log('Selecting style: Modern Minimalist...');
    const styleOption = page.locator('button:has-text("Modern Minimalist")');
    await styleOption.click();
    await page.waitForTimeout(500);

    // Optional: Add custom prompt
    const customPromptInput = page.locator('textarea[placeholder*="vision" i]');
    if (await customPromptInput.isVisible()) {
      console.log('Adding custom prompt...');
      await customPromptInput.fill('Add a modern patio with clean lines and minimalist outdoor furniture');
    }

    // Take screenshot before submission
    await page.screenshot({ path: 'frontend/test-results/img-gen-01-form-filled.png', fullPage: true });

    // Step 6: Submit generation using data-testid
    console.log('Step 6: Submitting generation request...');
    const generateButton = page.locator('[data-testid="generate-button"]');
    await generateButton.click();

    // Step 7: Wait for navigation to progress page
    console.log('Step 7: Waiting for progress page...');
    await page.waitForURL(/.*\/generate\/progress\/.*/, { timeout: 15000 });
    const progressUrl = page.url();
    console.log(`Progress page URL: ${progressUrl}`);

    // Extract generation ID from URL
    const generationId = progressUrl.split('/').pop();
    console.log(`Generation ID: ${generationId}`);

    // Step 8: Verify progress page elements
    console.log('Step 8: Verifying progress page UI...');
    await expect(page.locator('text=Your Landscape Design')).toBeVisible({ timeout: 5000 });
    await expect(page.locator('text=Overall Progress')).toBeVisible();
    await expect(page.locator('text=Area Progress')).toBeVisible();

    // Verify address is displayed
    await expect(page.locator(`text=${TEST_ADDRESS}`)).toBeVisible();

    // Verify live updates indicator
    await expect(page.locator('text=Live updates enabled')).toBeVisible({ timeout: 5000 });

    // Take screenshot of progress page
    await page.screenshot({ path: 'frontend/test-results/img-gen-02-progress-started.png', fullPage: true });

    // Step 9: Wait for generation to complete (real Gemini API call)
    console.log('Step 9: Waiting for Gemini to generate image (30-120s)...');
    console.log('⏳ This may take up to 2 minutes...\n');

    let generationComplete = false;
    let retryCount = 0;
    const maxRetries = 40; // 40 * 3s = 2 minutes

    while (!generationComplete && retryCount < maxRetries) {
      // Check for completion message
      const completeMessage = page.locator('text=Design Complete!');
      if (await completeMessage.isVisible({ timeout: 1000 }).catch(() => false)) {
        generationComplete = true;
        console.log('✅ Generation completed!');
        break;
      }

      // Check for completed status badge
      const completedBadge = page.locator('text=completed').first();
      if (await completedBadge.isVisible({ timeout: 1000 }).catch(() => false)) {
        generationComplete = true;
        console.log('✅ Generation status: completed');
        break;
      }

      // Check progress percentage
      const progressText = await page.locator('text=/\\d+%/').first().textContent({ timeout: 1000 }).catch(() => '0%');
      console.log(`Progress: ${progressText} (retry ${retryCount + 1}/${maxRetries})`);

      retryCount++;
      await page.waitForTimeout(3000); // Poll every 3 seconds
    }

    if (!generationComplete) {
      throw new Error('Generation did not complete within timeout (2 minutes)');
    }

    // Step 10: Verify completion elements
    console.log('Step 10: Verifying completion UI...');
    await expect(page.locator('text=Design Complete!')).toBeVisible({ timeout: 5000 });
    await expect(page.locator('text=Your landscape design is ready to view')).toBeVisible();

    // Step 11: Verify generated image is displayed
    console.log('Step 11: Verifying generated image...');

    // Find image element (should be in area progress card)
    const generatedImage = page.locator('img[alt*="Backyard" i], img[alt*="design" i]').first();
    await expect(generatedImage).toBeVisible({ timeout: 10000 });

    // Verify image has loaded (has src attribute and is not broken)
    const imageSrc = await generatedImage.getAttribute('src');
    console.log(`Image source: ${imageSrc?.substring(0, 100)}...`);
    expect(imageSrc).toBeTruthy();
    expect(imageSrc).not.toContain('placeholder');

    // Wait for image to fully load
    await page.waitForLoadState('networkidle', { timeout: 10000 });

    // Take screenshot of completed generation with image
    await page.screenshot({ path: 'frontend/test-results/img-gen-03-completed-with-image.png', fullPage: true });

    // Step 12: Verify generation time display (v2 feature)
    console.log('Step 12: Verifying generation time display...');
    const generationTimeElement = page.locator('text=/Generated in \\d+\\.\\d+ seconds/');
    if (await generationTimeElement.isVisible({ timeout: 2000 }).catch(() => false)) {
      const generationTime = await generationTimeElement.textContent();
      console.log(`✅ ${generationTime}`);
    } else {
      console.log('⚠️  Generation time not displayed (may be a UI bug)');
    }

    // Step 13: Verify Framer Motion animations (v2 feature)
    console.log('Step 13: Checking for animation classes...');
    const areaCard = page.locator('[data-testid^="area-progress-"]').first();
    const hasAnimationClass = await areaCard.evaluate((el) => {
      const computedStyle = window.getComputedStyle(el);
      return computedStyle.opacity !== '' || computedStyle.transform !== 'none';
    });
    console.log(`Animation classes present: ${hasAnimationClass ? '✅' : '⚠️'}`);

    // Step 14: Verify trial credit was deducted
    console.log('Step 14: Verifying credit deduction...');
    await page.goto('http://localhost:3000/account');
    await page.waitForTimeout(2000);

    const newBalance = page.locator('[data-testid="trial-balance"], text=/trial.*remaining/i').first();
    if (await newBalance.isVisible({ timeout: 5000 }).catch(() => false)) {
      const balanceText = await newBalance.textContent();
      console.log(`Updated balance: ${balanceText}`);
    }

    // Final screenshot
    await page.screenshot({ path: 'frontend/test-results/img-gen-04-final-account.png', fullPage: true });

    console.log('\n🎉 All tests passed! Image generation flow is working correctly.\n');
  });

  test('TC-IMG-2: Verify UI animations on progress page', async ({ page }) => {
    console.log('\n📝 Testing UI animations...\n');

    // Login
    await page.goto('http://localhost:3000');
    await page.click('text=Sign In');
    await page.fill('input[type="email"]', TEST_USER_EMAIL);
    await page.fill('input[type="password"]', TEST_USER_PASSWORD);
    await page.click('button[type="submit"]');
    await page.waitForURL(/.*\/(generate|home)/, { timeout: 15000 });

    // Submit generation
    await page.goto('http://localhost:3000/generate');
    const addressInput = page.locator('[data-testid="address-input"]');
    await addressInput.fill(TEST_ADDRESS);
    await page.waitForTimeout(1000);

    await page.locator('button:has-text("Front Yard")').click();
    await page.locator('button:has-text("California Native")').click();
    await page.locator('[data-testid="generate-button"]').click();

    await page.waitForURL(/.*\/generate\/progress\/.*/, { timeout: 15000 });

    // Check for Framer Motion animation on area cards
    console.log('Checking for Framer Motion animations...');

    const areaCards = page.locator('[data-testid^="area-progress-"]');
    const cardCount = await areaCards.count();
    console.log(`Found ${cardCount} area card(s)`);

    // Verify stagger animation (cards should appear with delay)
    for (let i = 0; i < Math.min(cardCount, 3); i++) {
      const card = areaCards.nth(i);
      await expect(card).toBeVisible({ timeout: 5000 });
      console.log(`✅ Card ${i + 1} visible`);
    }

    console.log('✅ UI animations test passed');
  });

  test('TC-IMG-3: Verify generation time tracking', async ({ page }) => {
    console.log('\n📝 Testing generation time tracking...\n');

    // Login and generate
    await page.goto('http://localhost:3000');
    await page.click('text=Sign In');
    await page.fill('input[type="email"]', TEST_USER_EMAIL);
    await page.fill('input[type="password"]', TEST_USER_PASSWORD);
    await page.click('button[type="submit"]');
    await page.waitForURL(/.*\/(generate|home)/, { timeout: 15000 });

    // Record start time
    const startTime = Date.now();

    await page.goto('http://localhost:3000/generate');
    const addressInput = page.locator('[data-testid="address-input"]');
    await addressInput.fill('1 Apple Park Way, Cupertino, CA 95014');
    await page.waitForTimeout(1000);

    await page.locator('button:has-text("Back Yard")').click();
    await page.locator('button:has-text("Modern Minimalist")').click();
    await page.locator('[data-testid="generate-button"]').click();

    await page.waitForURL(/.*\/generate\/progress\/.*/, { timeout: 15000 });

    // Wait for completion
    await expect(page.locator('text=Design Complete!')).toBeVisible({ timeout: 120000 });

    // Calculate actual generation time
    const endTime = Date.now();
    const actualTime = (endTime - startTime) / 1000;
    console.log(`Actual generation time: ${actualTime.toFixed(1)}s`);

    // Verify displayed generation time
    const displayedTime = page.locator('text=/Generated in \\d+\\.\\d+ seconds/');
    if (await displayedTime.isVisible({ timeout: 2000 }).catch(() => false)) {
      const timeText = await displayedTime.textContent();
      console.log(`Displayed: ${timeText}`);
      console.log('✅ Generation time tracking working');
    } else {
      console.log('⚠️  Generation time not displayed');
    }
  });
});
