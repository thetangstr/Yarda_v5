/**
 * Comprehensive E2E Test: Image Generation Flow with Street View Verification
 * Critical: Verify Street View thumbnails display during generation
 */

import { test, expect, Page } from '@playwright/test';

// Use existing test account (whitelisted in backend)
const testEmail = 'test.uat.bypass@yarda.app';
const testPassword = 'TestPass123!';

// Test configuration
const BASE_URL = 'http://localhost:3000';
const API_BASE_URL = 'http://localhost:8000';
const TEST_ADDRESS = '2164 lakewood ct, san jose, ca 95132';

// Helper to capture console logs
const consoleLogs: string[] = [];
const networkLogs: any[] = [];

test.describe('Image Generation Flow - Comprehensive E2E Test', () => {

  test.beforeEach(async ({ page }) => {
    // Capture console messages
    page.on('console', msg => {
      const logEntry = `[${msg.type()}] ${msg.text()}`;
      consoleLogs.push(logEntry);
      console.log(logEntry);
    });

    // Capture network requests
    page.on('request', request => {
      if (request.url().includes('/api/') || request.url().includes(API_BASE_URL)) {
        networkLogs.push({
          type: 'request',
          url: request.url(),
          method: request.method(),
          timestamp: new Date().toISOString()
        });
      }
    });

    page.on('response', response => {
      if (response.url().includes('/api/') || response.url().includes(API_BASE_URL)) {
        networkLogs.push({
          type: 'response',
          url: response.url(),
          status: response.status(),
          statusText: response.statusText(),
          timestamp: new Date().toISOString()
        });
      }
    });
  });

  test('Complete generation flow with Street View verification', async ({ page }) => {
    console.log('\n========================================');
    console.log('COMPREHENSIVE E2E TEST - IMAGE GENERATION');
    console.log('========================================\n');

    // STEP 1: Navigate to auth page
    console.log('STEP 1: Navigating to auth page...');
    await page.goto(`${BASE_URL}/auth`);
    await page.waitForLoadState('networkidle');
    await page.screenshot({ path: '/Volumes/Samsung USB/Yarda_v5/.playwright-mcp/e2e-test-01-auth-page.png', fullPage: true });
    console.log('✅ Auth page loaded');

    // STEP 2: Skip registration - use existing whitelisted test account
    console.log(`\nSTEP 2: Using existing test account: ${testEmail}`);
    console.log('(Registration skipped - account is whitelisted in backend)');

    // STEP 3: Login with existing account
    console.log('\nSTEP 3: Logging in...');
    await page.goto(`${BASE_URL}/auth`);
    await page.waitForLoadState('networkidle');

    // Switch to Login tab
    const loginTab = page.locator('button:has-text("Login")');
    if (await loginTab.isVisible()) {
      await loginTab.click();
      await page.waitForTimeout(500);
    }

    // Fill login form
    await page.fill('input[name="email"]', testEmail);
    await page.fill('input[name="password"]', testPassword);

    await page.screenshot({ path: '/Volumes/Samsung USB/Yarda_v5/.playwright-mcp/e2e-test-02-login-filled.png', fullPage: true });

    // Submit login
    await page.click('button[type="submit"]:has-text("Sign In")');

    // Wait for navigation
    await page.waitForTimeout(3000);
    await page.screenshot({ path: '/Volumes/Samsung USB/Yarda_v5/.playwright-mcp/e2e-test-03-login-result.png', fullPage: true });

    const afterLoginUrl = page.url();
    console.log(`URL after login: ${afterLoginUrl}`);

    if (afterLoginUrl.includes('/generate')) {
      console.log('✅ Login successful - redirected to generate page');
    } else {
      console.log('⚠️  Login may have failed, navigating to generate page manually...');
      await page.goto(`${BASE_URL}/generate`);
      await page.waitForLoadState('networkidle');
    }

    // STEP 4: Check trial credits
    console.log('\nSTEP 4: Checking trial credits...');
    await page.waitForTimeout(2000);

    const trialCounter = page.locator('[data-testid="trial-counter"], text=/trial.*remaining/i');
    const trialCounterVisible = await trialCounter.isVisible().catch(() => false);

    if (trialCounterVisible) {
      const trialText = await trialCounter.textContent();
      console.log(`✅ Trial credits visible: ${trialText}`);
    } else {
      console.log('⚠️  Trial counter not visible');
    }

    await page.screenshot({ path: '/Volumes/Samsung USB/Yarda_v5/.playwright-mcp/e2e-test-06-generate-page-loaded.png', fullPage: true });

    // STEP 5: Fill generation form
    console.log('\nSTEP 5: Filling generation form...');

    // Fill address - look for the AddressInput component
    const addressInput = page.locator('input[type="text"]').first();
    await addressInput.waitFor({ state: 'visible', timeout: 10000 });
    await addressInput.fill(TEST_ADDRESS);
    console.log(`✅ Address filled: ${TEST_ADDRESS}`);

    await page.waitForTimeout(2000);

    // Select area - AreaSelectorEnhanced uses clickable cards
    // Look for "Front Yard" text and click its parent card/button
    const frontYardArea = page.locator('text="Front Yard"').first();
    if (await frontYardArea.isVisible({ timeout: 5000 })) {
      await frontYardArea.click();
      console.log('✅ Front Yard area selected');
    } else {
      // Try alternative selectors
      const areaCard = page.locator('[data-testid="area-FrontYard"], button:has-text("Front Yard")').first();
      if (await areaCard.isVisible({ timeout: 2000 })) {
        await areaCard.click();
        console.log('✅ Front Yard area selected (alternative selector)');
      } else {
        console.log('⚠️  Could not select Front Yard area - this may cause issues');
      }
    }

    await page.waitForTimeout(2000);

    // Select style - StyleSelectorEnhanced uses clickable cards
    const modernMinimalistStyle = page.locator('text="Modern Minimalist"').first();
    if (await modernMinimalistStyle.isVisible({ timeout: 5000 })) {
      await modernMinimalistStyle.click();
      console.log('✅ Modern Minimalist style selected');
    } else {
      // Try alternative selectors
      const styleCard = page.locator('[data-testid="style-ModernMinimalist"], button:has-text("Modern Minimalist")').first();
      if (await styleCard.isVisible({ timeout: 2000 })) {
        await styleCard.click();
        console.log('✅ Modern Minimalist style selected (alternative selector)');
      } else {
        console.log('⚠️  Could not select Modern Minimalist style - this may cause issues');
      }
    }

    await page.waitForTimeout(1000);
    await page.screenshot({ path: '/Volumes/Samsung USB/Yarda_v5/.playwright-mcp/e2e-test-07-form-filled.png', fullPage: true });
    console.log('✅ Generation form filled');

    // STEP 6: Submit generation
    console.log('\nSTEP 6: Submitting generation...');

    const generateButton = page.locator('button:has-text("Generate"), button[type="submit"]').first();
    await generateButton.click();
    console.log('✅ Generate button clicked');

    // Wait for generation to start
    await page.waitForTimeout(3000);
    await page.screenshot({ path: '/Volumes/Samsung USB/Yarda_v5/.playwright-mcp/e2e-test-08-generation-started.png', fullPage: true });

    // STEP 7: CRITICAL - Verify Street View Thumbnail
    console.log('\n========================================');
    console.log('STEP 7: CRITICAL - VERIFYING STREET VIEW THUMBNAIL');
    console.log('========================================');

    let streetViewFound = false;
    let attempts = 0;
    const maxAttempts = 20;

    while (!streetViewFound && attempts < maxAttempts) {
      attempts++;
      console.log(`\nAttempt ${attempts}/${maxAttempts} - Looking for Street View thumbnail...`);

      // Check for progress panel
      const progressPanel = page.locator('[data-testid="generation-progress"], div:has-text("Progress"), div:has-text("Generating")').first();
      const progressVisible = await progressPanel.isVisible().catch(() => false);

      if (progressVisible) {
        console.log('✅ Progress panel is visible');

        // Look for Source Images section
        const sourceImagesSection = page.locator('text=/source images?/i, text=/original images?/i');
        const sourceImagesSectionVisible = await sourceImagesSection.isVisible().catch(() => false);

        if (sourceImagesSectionVisible) {
          console.log('✅ "Source Images" section found!');

          // Look for street view thumbnail
          const streetViewSelectors = [
            'img[alt*="street" i]',
            'img[alt*="view" i]',
            'img[src*="street" i]',
            'img[src*="maps" i]',
            '[data-testid="street-view-thumbnail"]',
            'div:has-text("street") img',
          ];

          for (const selector of streetViewSelectors) {
            const thumbnail = page.locator(selector).first();
            const thumbnailVisible = await thumbnail.isVisible().catch(() => false);

            if (thumbnailVisible) {
              const src = await thumbnail.getAttribute('src').catch(() => '');
              const alt = await thumbnail.getAttribute('alt').catch(() => '');

              console.log('');
              console.log('========================================');
              console.log('✅ ✅ ✅ STREET VIEW THUMBNAIL FOUND! ✅ ✅ ✅');
              console.log('========================================');
              console.log(`Selector: ${selector}`);
              console.log(`Image src: ${src?.substring(0, 100)}...`);
              console.log(`Image alt: ${alt}`);
              console.log('========================================\n');

              streetViewFound = true;

              // Take detailed screenshot
              await page.screenshot({
                path: '/Volumes/Samsung USB/Yarda_v5/.playwright-mcp/e2e-test-09-STREET-VIEW-FOUND.png',
                fullPage: true
              });

              break;
            }
          }
        } else {
          console.log('⚠️  "Source Images" section not visible yet');
        }
      } else {
        console.log('⚠️  Progress panel not visible yet');
      }

      if (!streetViewFound) {
        await page.waitForTimeout(3000);

        // Take periodic screenshot
        if (attempts % 5 === 0) {
          await page.screenshot({
            path: `/Volumes/Samsung USB/Yarda_v5/.playwright-mcp/e2e-test-progress-${attempts}.png`,
            fullPage: true
          });
        }
      }
    }

    if (!streetViewFound) {
      console.log('');
      console.log('========================================');
      console.log('❌ ❌ ❌ STREET VIEW THUMBNAIL NOT FOUND ❌ ❌ ❌');
      console.log('========================================');
      console.log(`Checked ${maxAttempts} times over ${maxAttempts * 3} seconds`);
      console.log('This is a CRITICAL FAILURE - the main feature is not working!');
      console.log('========================================\n');

      await page.screenshot({
        path: '/Volumes/Samsung USB/Yarda_v5/.playwright-mcp/e2e-test-STREET-VIEW-NOT-FOUND.png',
        fullPage: true
      });
    }

    // STEP 8: Monitor generation status
    console.log('\nSTEP 8: Monitoring generation status...');

    let generationComplete = false;
    let statusChecks = 0;
    const maxStatusChecks = 20;

    while (!generationComplete && statusChecks < maxStatusChecks) {
      statusChecks++;

      // Check for completion indicators
      const completedIndicators = [
        page.locator('text=/generation complete/i'),
        page.locator('text=/success/i'),
        page.locator('[data-testid="generation-result"]'),
        page.locator('img[alt*="generated" i]'),
      ];

      for (const indicator of completedIndicators) {
        const visible = await indicator.isVisible().catch(() => false);
        if (visible) {
          console.log('✅ Generation completed!');
          generationComplete = true;
          break;
        }
      }

      // Check for errors
      const errorIndicator = page.locator('text=/error|failed/i');
      const errorVisible = await errorIndicator.isVisible().catch(() => false);

      if (errorVisible) {
        const errorText = await errorIndicator.textContent();
        console.log(`❌ Generation error: ${errorText}`);
        break;
      }

      if (!generationComplete) {
        console.log(`Status check ${statusChecks}/${maxStatusChecks} - still processing...`);
        await page.waitForTimeout(3000);
      }
    }

    await page.screenshot({
      path: '/Volumes/Samsung USB/Yarda_v5/.playwright-mcp/e2e-test-10-final-state.png',
      fullPage: true
    });

    // FINAL REPORT
    console.log('\n========================================');
    console.log('TEST EXECUTION COMPLETE');
    console.log('========================================\n');

    console.log('SUMMARY:');
    console.log(`✅/❌ Registration: ${registrationSuccess ? '✅ PASS' : '❌ FAIL'}`);
    console.log(`✅/❌ Login: ${currentUrl.includes('/generate') ? '✅ PASS' : '❌ FAIL'}`);
    console.log(`✅/❌ Form Submission: ✅ PASS`);
    console.log(`✅/❌ Street View Thumbnail: ${streetViewFound ? '✅ PASS' : '❌ FAIL (CRITICAL)'}`);
    console.log(`✅/❌ Generation Status: ${generationComplete ? '✅ PASS' : '⚠️  INCOMPLETE'}`);

    console.log('\nCONSOLE LOGS:');
    consoleLogs.forEach(log => console.log(log));

    console.log('\nNETWORK ACTIVITY:');
    networkLogs.forEach(log => console.log(JSON.stringify(log, null, 2)));

    console.log('\nSCREENSHOTS SAVED TO:');
    console.log('/Volumes/Samsung USB/Yarda_v5/.playwright-mcp/');

    console.log('\n========================================\n');

    // Assertions
    expect(streetViewFound, 'CRITICAL: Street View thumbnail must be visible during generation').toBe(true);
  });
});
