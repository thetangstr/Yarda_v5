/**
 * Image Generation Flow Test with Debug Panel Monitoring
 *
 * Tests the complete generation flow and captures debug logs
 */

import { test, expect } from '@playwright/test';

test.describe('Image Generation Flow - Debug Test', () => {
  test('should complete generation flow with debug monitoring', async ({ page, context }) => {
    // Enable network logging
    const requests: string[] = [];
    page.on('request', (req) => {
      if (req.url().includes('/api/v1') || req.url().includes('/debug')) {
        requests.push(`${req.method()} ${req.url()}`);
      }
    });

    // Listen for console messages
    const consoleLogs: string[] = [];
    page.on('console', (msg) => {
      console.log(`[${msg.type()}] ${msg.text()}`);
      consoleLogs.push(`[${msg.type()}] ${msg.text()}`);
    });

    // Navigate to generate page
    console.log('\n=== Step 1: Navigate to Generate Page ===');
    await page.goto('http://localhost:3000/generate');

    // Wait for page to load
    await page.waitForLoadState('networkidle');

    // Take screenshot of initial form
    await page.screenshot({ path: 'test-results/01-generate-form-initial.png' });
    console.log('✓ Initial form loaded');

    // Wait for address input to be available
    const addressInput = page.locator('input[name="address"]');
    await addressInput.waitFor({ state: 'visible', timeout: 10000 });
    console.log('✓ Address input visible');

    // Enter address
    console.log('\n=== Step 2: Enter Address ===');
    await addressInput.fill('123 Main Street, San Francisco, CA');
    console.log('✓ Address entered');

    // Wait for autocomplete suggestions
    await page.waitForTimeout(500);

    // Look for autocomplete suggestion and click it
    const suggestions = page.locator('[role="option"]');
    const suggestionCount = await suggestions.count();
    console.log(`Found ${suggestionCount} suggestions`);

    if (suggestionCount > 0) {
      await suggestions.first().click();
      await page.waitForTimeout(500);
      console.log('✓ Suggestion selected');
    }

    await page.screenshot({ path: 'test-results/02-address-entered.png' });

    // Select yard area (Front Yard)
    console.log('\n=== Step 3: Select Yard Area ===');
    const frontYardBtn = page.locator('button:has-text("Front Yard")').first();
    await frontYardBtn.click({ timeout: 5000 });
    console.log('✓ Front Yard selected');

    await page.screenshot({ path: 'test-results/03-area-selected.png' });

    // Select design style
    console.log('\n=== Step 4: Select Design Style ===');
    const styleBtn = page.locator('button:has-text("Modern Minimalist")').first();
    if (await styleBtn.isVisible({ timeout: 3000 })) {
      await styleBtn.click();
      console.log('✓ Modern Minimalist style selected');
    } else {
      console.log('⚠ Style button not found, trying alternative selector');
      await page.locator('div[role="button"]:has-text("Modern")').first().click({ timeout: 5000 });
    }

    await page.screenshot({ path: 'test-results/04-style-selected.png' });

    // Click Generate button
    console.log('\n=== Step 5: Click Generate Button ===');
    const generateBtn = page.locator('button:has-text("Generate")').first();
    await generateBtn.click({ timeout: 5000 });
    console.log('✓ Generate button clicked');

    // Wait for generation to start
    await page.waitForTimeout(1000);
    await page.screenshot({ path: 'test-results/05-generation-started.png' });

    // Monitor debug panel
    console.log('\n=== Step 6: Monitor Debug Panel ===');
    const debugPanel = page.locator('text=DEBUG PANEL');

    let debugPanelFound = false;
    for (let i = 0; i < 30; i++) {
      if (await debugPanel.isVisible({ timeout: 1000 }).catch(() => false)) {
        debugPanelFound = true;
        console.log('✓ Debug panel found');
        break;
      }
      console.log(`Waiting for debug panel... (${i + 1}/30)`);
      await page.waitForTimeout(500);
    }

    if (debugPanelFound) {
      // Click to expand debug panel
      await debugPanel.click();
      await page.waitForTimeout(500);
      await page.screenshot({ path: 'test-results/06-debug-panel-open.png' });

      // Wait and watch for logs to appear
      console.log('Monitoring debug logs for generation steps...');

      const logContainer = page.locator('div[class*="overflow-y-auto"]').first();

      // Monitor for up to 60 seconds
      for (let i = 0; i < 120; i++) {
        const logText = await logContainer.textContent().catch(() => '');

        if (logText.includes('image_generation_complete') || logText.includes('image_displayed')) {
          console.log('✓ Generation completed!');
          await page.screenshot({ path: 'test-results/07-generation-complete.png' });
          break;
        }

        if (logText.includes('error') || logText.includes('Error')) {
          console.log('✗ Error found in logs');
          await page.screenshot({ path: 'test-results/07-generation-error.png' });

          // Extract error details
          const errorLogs = await page.locator('[class*="text-red"]').allTextContents();
          console.log('Error logs:', errorLogs);
          break;
        }

        console.log(`Waiting for completion... (${i + 1}/120 seconds)`);
        await page.waitForTimeout(500);
      }

      // Take final screenshot of debug panel
      await page.screenshot({ path: 'test-results/08-debug-final.png' });

      // Extract full debug log content
      const allLogs = await logContainer.textContent();
      console.log('\n=== Debug Panel Logs ===');
      console.log(allLogs);
    } else {
      console.log('⚠ Debug panel not found');
    }

    // Check for generated image
    console.log('\n=== Step 7: Check for Generated Image ===');
    const generatedImg = page.locator('img[alt*="Generated"]').first();
    if (await generatedImg.isVisible({ timeout: 5000 }).catch(() => false)) {
      console.log('✓ Generated image displayed');
      await page.screenshot({ path: 'test-results/09-generated-image.png' });
    } else {
      console.log('⚠ Generated image not found yet');
    }

    // Print request log
    console.log('\n=== API Requests Made ===');
    requests.forEach(req => console.log(req));

    // Check for errors in console
    console.log('\n=== Console Output ===');
    consoleLogs.forEach(log => {
      if (log.includes('error') || log.includes('Error') || log.includes('failed')) {
        console.log(`⚠ ${log}`);
      }
    });

    console.log('\n=== Test Complete ===\n');
  });
});
