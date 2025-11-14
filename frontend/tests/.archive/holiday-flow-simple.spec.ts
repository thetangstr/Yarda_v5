import { test, expect } from '@playwright/test';

test.describe('Holiday Decorator Flow', () => {
  test('Complete flow: Login → Address → Style → Generate', async ({ page }) => {
    // Step 1: Navigate to home
    console.log('\n🏠 Navigating to homepage...');
    await page.goto('http://localhost:3000', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2000);

    // Step 2: Click "Get Started Free" button
    console.log('🔘 Looking for "Get Started Free" button...');
    const getStartedBtn = page.locator('button:has-text("Get Started Free")').first();

    if (await getStartedBtn.isVisible()) {
      console.log('✅ Found button, clicking...');
      await getStartedBtn.click();
      await page.waitForTimeout(1000);
    } else {
      console.log('⚠️ "Get Started Free" button not found');
      // List all buttons to help debug
      const buttons = await page.locator('button').all();
      for (let i = 0; i < Math.min(5, buttons.length); i++) {
        const text = await buttons[i].textContent();
        console.log(`  Button ${i}: ${text}`);
      }
    }

    // Step 3: Check current page
    console.log(`📍 Current URL: ${page.url()}`);

    // Step 4: Check for credit display
    const creditBadge = page.locator('[data-testid="credit-display"]');
    if (await creditBadge.isVisible({ timeout: 3000 })) {
      const credits = await creditBadge.textContent();
      console.log(`💰 Credits found: ${credits}`);
    } else {
      console.log('⚠️ Credit badge not visible');
    }

    // Step 5: Enter address
    console.log('\n📍 Entering address: 22054 clearwood ct 95014');
    const addressInput = page.locator('input[placeholder*="Address"], input[placeholder*="address"], input[name="address"]').first();

    if (await addressInput.isVisible({ timeout: 3000 })) {
      await addressInput.click();
      await addressInput.fill('22054 clearwood ct 95014');
      console.log('✅ Address entered');
      await page.waitForTimeout(2000);
    } else {
      throw new Error('Address input not found');
    }

    // Step 6: Wait for Street View
    console.log('\n🎥 Waiting for Street View Rotator...');
    const streetView = page.locator('[data-testid="street-view-rotator"]');
    try {
      await streetView.waitFor({ timeout: 5000 });
      console.log('✅ Street View Rotator loaded');
    } catch {
      console.log('⚠️ Street View Rotator not found, continuing...');
    }

    // Step 7: Select style
    console.log('\n🎨 Selecting decoration style...');
    const classicBtn = page.locator('button:has-text("Classic")').first();

    if (await classicBtn.isVisible({ timeout: 3000 })) {
      await classicBtn.click();
      console.log('✅ Classic style selected');
      await page.waitForTimeout(500);
    } else {
      const modernBtn = page.locator('button:has-text("Modern")').first();
      if (await modernBtn.isVisible()) {
        await modernBtn.click();
        console.log('✅ Modern style selected');
      } else {
        throw new Error('No style buttons found');
      }
    }

    // Step 8: Click Generate
    console.log('\n🚀 Clicking Generate button...');
    const generateBtn = page.locator('button:has-text("Generate")').first();

    if (await generateBtn.isVisible({ timeout: 3000 })) {
      const isDisabled = await generateBtn.isDisabled();
      if (isDisabled) {
        console.log('❌ Generate button is disabled');
        throw new Error('Generate button is disabled (likely no credits)');
      }
      await generateBtn.click();
      console.log('✅ Generate clicked');
      await page.waitForTimeout(1000);
    } else {
      throw new Error('Generate button not found');
    }

    // Step 9: Wait for completion
    console.log('\n⏳ Waiting for generation to complete (max 60 seconds)...');
    const results = page.locator('[data-testid="generation-results"]');

    try {
      await results.waitFor({ timeout: 60000 });
      console.log('\n✅ SUCCESS! Generation completed!');

      // Verify images loaded
      const images = await page.locator('img').all();
      console.log(`📷 Found ${images.length} images on results page`);

    } catch {
      // Check for error message
      const errorMsg = page.locator('[data-testid="error-message"]');
      if (await errorMsg.isVisible()) {
        const error = await errorMsg.textContent();
        console.log(`\n❌ Generation failed: ${error}`);
      } else {
        console.log('\n❌ Generation did not complete in time');
      }
      throw new Error('Generation did not complete');
    }
  });
});
