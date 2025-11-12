import { test, expect } from '@playwright/test';

test.describe('Holiday Decorator - Full User Flow', () => {
  test('Complete flow: Address → Style → Generate', async ({ page }) => {
    console.log('\n🏠 Step 1: Navigate to holiday page');
    await page.goto('/holiday');
    await page.waitForLoadState('domcontentloaded');

    // Verify page loaded
    const pageTitle = await page.title();
    console.log(`✅ Page loaded: ${pageTitle}`);

    // Check for credit display
    console.log('\n💰 Step 2: Check credit balance');
    const creditBadge = page.locator('[data-testid="credit-display"]');
    if (await creditBadge.isVisible()) {
      const credits = await creditBadge.textContent();
      console.log(`✅ Credits available: ${credits?.trim()}`);
    } else {
      console.log('⚠️ Credit badge not visible');
    }

    // Step 3: Enter address
    console.log('\n📍 Step 3: Enter address');
    const addressInput = page.locator('input#address, input[name="address"]').first();

    if (await addressInput.isVisible()) {
      await addressInput.fill('22054 clearwood ct 95014');
      await addressInput.blur();
      console.log('✅ Address entered: 22054 clearwood ct 95014');
      await page.waitForTimeout(3000);
    } else {
      throw new Error('Address input not found');
    }

    // Step 4: Wait for Street View
    console.log('\n🎥 Step 4: Wait for Street View Rotator');
    const streetView = page.locator('[data-testid="street-view-rotator"]');
    try {
      await streetView.waitFor({ timeout: 8000 });
      console.log('✅ Street View Rotator loaded');
    } catch {
      console.log('⚠️ Street View Rotator not loaded (continuing anyway)');
    }

    // Step 5: Select style
    console.log('\n🎨 Step 5: Select decoration style');
    const classicButton = page.locator('button:has-text("Classic")').first();

    if (await classicButton.isVisible()) {
      await classicButton.click();
      console.log('✅ Selected: Classic style');
      await page.waitForTimeout(500);
    } else {
      console.log('❌ Classic button not found');
      const allButtons = await page.locator('button').all();
      for (let i = 0; i < Math.min(3, allButtons.length); i++) {
        const text = await allButtons[i].textContent();
        console.log(`  Button: ${text?.trim()}`);
      }
      throw new Error('Could not find style button');
    }

    // Step 6: Check Generate button
    console.log('\n🚀 Step 6: Click Generate');
    const generateBtn = page.locator('button:has-text("Generate")').first();

    if (await generateBtn.isVisible()) {
      const isDisabled = await generateBtn.isDisabled();
      if (isDisabled) {
        console.log('❌ Generate button is disabled');
        const error = page.locator('[data-testid="error-message"]');
        if (await error.isVisible()) {
          const errorText = await error.textContent();
          console.log(`  Reason: ${errorText}`);
        }
        throw new Error('Generate button disabled - likely insufficient credits');
      }

      await generateBtn.click();
      console.log('✅ Generate button clicked');
      await page.waitForTimeout(2000);
    } else {
      throw new Error('Generate button not found');
    }

    // Step 7: Wait for generation to complete
    console.log('\n⏳ Step 7: Waiting for generation (up to 90 seconds)');
    const results = page.locator('[data-testid="generation-results"]');

    try {
      await results.waitFor({ timeout: 90000 });
      console.log('\n✅ ✅ ✅ SUCCESS! GENERATION COMPLETED! ✅ ✅ ✅');

      // Get before/after images
      const beforeImage = page.locator('[data-testid="before-image"]');
      const afterImage = page.locator('[data-testid="after-image"]');
      const beforeAfterImage = page.locator('[data-testid="before-after-image"]');

      console.log('\n📷 Images:');
      if (await beforeImage.isVisible()) {
        console.log('  ✅ Before image');
      }
      if (await afterImage.isVisible()) {
        console.log('  ✅ After image');
      }
      if (await beforeAfterImage.isVisible()) {
        console.log('  ✅ Before/After comparison');
      }

      // Verify download button exists
      const downloadBtn = page.locator('a:has-text("Download"), button:has-text("Download")').first();
      if (await downloadBtn.isVisible()) {
        console.log('  ✅ Download button available');
      }

    } catch (error) {
      console.log('\n❌ Generation did not complete');

      // Check error message
      const errorDisplay = page.locator('[data-testid="error-message"]');
      if (await errorDisplay.isVisible()) {
        const errorText = await errorDisplay.textContent();
        console.log(`  Error: ${errorText}`);
      }

      // Check if still loading
      const progress = page.locator('[data-testid="generation-progress"]');
      if (await progress.isVisible()) {
        const progressText = await progress.textContent();
        console.log(`  Status: ${progressText?.substring(0, 50)}`);
      }

      throw error;
    }
  });
});
