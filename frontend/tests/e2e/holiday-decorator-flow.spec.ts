import { test, expect } from '@playwright/test';

test.describe('Holiday Decorator - Complete Flow', () => {
  test('Login → Address → Style → Generate with credits', async ({ page }) => {
    // Step 1: Navigate to homepage
    console.log('🏠 Opening homepage...');
    await page.goto('http://localhost:3000');
    await page.waitForLoadState('networkidle');

    // Step 2: Click "Get Started Free" or "Start for Free" button
    console.log('🔘 Looking for start button...');
    let clicked = false;

    const possibleSelectors = [
      'button:has-text("Get Started Free")',
      'button:has-text("Start for Free")',
      'a:has-text("Get Started Free")',
      'a:has-text("Start for Free")',
    ];

    for (const selector of possibleSelectors) {
      const button = page.locator(selector).first();
      if (await button.isVisible()) {
        console.log(`✅ Found button with selector: ${selector}`);
        await button.click();
        clicked = true;
        break;
      }
    }

    if (!clicked) {
      throw new Error('Could not find start button');
    }

    // Wait for navigation
    await page.waitForLoadState('networkidle');
    const currentUrl = page.url();
    console.log(`📍 Current URL: ${currentUrl}`);

    // Step 3: Handle login if needed
    if (currentUrl.includes('/login') || currentUrl.includes('/auth')) {
      console.log('🔐 On login page, looking for authentication options...');

      // Wait a moment for page to fully load
      await page.waitForTimeout(1000);

      // Try to find email input
      const emailInputs = await page.locator('input[type="email"], input[name="email"]').all();
      if (emailInputs.length > 0) {
        console.log('📧 Found email input, entering test user email...');
        await emailInputs[0].fill('thetangstr@gmail.com');

        // Look for continue button
        const buttons = await page.locator('button').all();
        for (const btn of buttons) {
          const text = await btn.textContent();
          if (text && (text.includes('Continue') || text.includes('Send') || text.includes('Next'))) {
            console.log(`✅ Clicking button: ${text}`);
            await btn.click();
            await page.waitForLoadState('networkidle');
            break;
          }
        }
      }

      // Check for Google sign-in (we may need to skip this in headless)
      const googleBtn = page.locator('button:has-text("Google")').first();
      if (await googleBtn.isVisible()) {
        console.log('ℹ️ Google sign-in button available but skipping (requires browser interaction)');
      }
    }

    // Step 4: Verify we're on holiday page or login complete
    await page.waitForTimeout(2000);
    const finalUrl = page.url();
    console.log(`📍 Final URL after auth: ${finalUrl}`);

    // Check for credit display
    const creditDisplay = page.locator('[data-testid="credit-display"]');
    if (await creditDisplay.isVisible()) {
      const creditText = await creditDisplay.textContent();
      console.log(`💰 Credits found: ${creditText}`);
    }

    // Step 5: Enter address
    console.log('📍 Entering address: 22054 clearwood ct 95014');
    const addressInputSelectors = [
      'input[name="address"]',
      'input[placeholder*="Address"]',
      'input[placeholder*="address"]',
      'input[placeholder*="Main"]',
    ];

    let addressFound = false;
    for (const selector of addressInputSelectors) {
      const input = page.locator(selector).first();
      if (await input.isVisible()) {
        console.log(`✅ Found address input with selector: ${selector}`);
        await input.fill('22054 clearwood ct 95014');
        addressFound = true;
        await page.waitForTimeout(1000);
        break;
      }
    }

    if (!addressFound) {
      throw new Error('Could not find address input field');
    }

    // Step 6: Wait for Street View Rotator to appear
    console.log('🎥 Waiting for Street View Rotator...');
    const streetViewRotator = page.locator('[data-testid="street-view-rotator"]');
    try {
      await expect(streetViewRotator).toBeVisible({ timeout: 5000 });
      console.log('✅ Street View Rotator loaded');
    } catch {
      console.log('⚠️ Street View Rotator not found, but continuing...');
    }

    // Step 7: Select a style
    console.log('🎨 Selecting decoration style...');
    const styleSelectors = [
      'button:has-text("Classic")',
      'button:has-text("Modern")',
      'button:has-text("Over the Top")',
    ];

    let styleSelected = false;
    for (const selector of styleSelectors) {
      const btn = page.locator(selector).first();
      if (await btn.isVisible()) {
        const styleText = await btn.textContent();
        console.log(`✅ Selecting style: ${styleText}`);
        await btn.click();
        styleSelected = true;
        await page.waitForTimeout(500);
        break;
      }
    }

    if (!styleSelected) {
      throw new Error('Could not find and select style button');
    }

    // Step 8: Click Generate button
    console.log('🚀 Clicking Generate button...');
    const generateSelectors = [
      'button:has-text("Generate Decoration")',
      'button:has-text("Generate")',
    ];

    let generationStarted = false;
    for (const selector of generateSelectors) {
      const btn = page.locator(selector).first();
      if (await btn.isVisible() && !await btn.isDisabled()) {
        console.log(`✅ Clicking: ${selector}`);
        await btn.click();
        generationStarted = true;
        await page.waitForTimeout(1000);
        break;
      }
    }

    if (!generationStarted) {
      throw new Error('Could not click Generate button (may be disabled)');
    }

    // Step 9: Wait for results
    console.log('⏳ Waiting for generation results (up to 2 minutes)...');
    const resultsElement = page.locator('[data-testid="generation-results"]');

    try {
      await expect(resultsElement).toBeVisible({ timeout: 120000 });
      console.log('✅ Generation completed successfully!');

      // Check for images
      const images = await page.locator('img[src*="blob"]').all();
      console.log(`✅ Found ${images.length} result images`);
    } catch (error) {
      // Check for errors
      const errorDisplay = page.locator('[data-testid="error-message"]');
      let errorText = '';
      if (await errorDisplay.isVisible()) {
        errorText = await errorDisplay.textContent() || '';
        console.log(`❌ Error: ${errorText}`);
      }

      // Log page content for debugging
      const html = await page.content();
      if (html.includes('Generation failed')) {
        console.log('❌ Generation failed - see error message above');
      }

      throw error;
    }
  });
});
