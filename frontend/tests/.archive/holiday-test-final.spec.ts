import { test, expect } from '@playwright/test';

test.describe('Holiday Decorator - Full Flow', () => {
  test('Login → Address → Style → Generate with test user', async ({ page, context }) => {
    console.log('\n========== STEP 1: NAVIGATE TO HOLIDAY PAGE ==========');
    // Use the authenticated state from .auth/user.json if available
    const cookies = await context.cookies();
    console.log(`✅ Using ${cookies.length} cookies from authenticated context`);

    // Navigate directly to holiday page
    await page.goto('http://localhost:3000/holiday', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(3000);

    console.log(`\n📍 Current URL: ${page.url()}`);
    console.log(`📄 Page title: ${await page.title()}`);

    // Check if we're on holiday page or need to login
    if (page.url().includes('/login') || page.url().includes('/auth')) {
      console.log('\n⚠️ Not authenticated, redirecting to login');
      // Just go back to homepage and try the flow
      await page.goto('http://localhost:3000', { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(2000);
    }

    console.log('\n========== STEP 2: CHECK CREDIT BALANCE ==========');
    const creditBadge = page.locator('[data-testid="credit-display"]');
    if (await creditBadge.isVisible({ timeout: 3000 })) {
      const credits = await creditBadge.textContent();
      console.log(`✅ Credits found: ${credits?.trim()}`);
    } else {
      console.log('⚠️ Credit badge not visible, may not be logged in');
    }

    console.log('\n========== STEP 3: ENTER ADDRESS ==========');
    // Try multiple selectors for address input
    const addressSelectors = [
      'input[placeholder*="Address"]',
      'input[placeholder*="address"]',
      'input[name="address"]',
      'input[placeholder*="Main"]',
      'input[placeholder*="123"]',
    ];

    let addressInput = null;
    for (const selector of addressSelectors) {
      const input = page.locator(selector).first();
      if (await input.isVisible({ timeout: 2000 })) {
        addressInput = input;
        console.log(`✅ Found address input with selector: ${selector}`);
        break;
      }
    }

    if (!addressInput) {
      console.log('❌ Address input not found');
      console.log('🔍 Checking all input fields on page...');
      const inputs = await page.locator('input').all();
      for (let i = 0; i < inputs.length && i < 5; i++) {
        const placeholder = await inputs[i].getAttribute('placeholder');
        const name = await inputs[i].getAttribute('name');
        console.log(`  Input ${i}: placeholder="${placeholder}", name="${name}"`);
      }
      throw new Error('Could not find address input field');
    }

    await addressInput.click();
    await addressInput.fill('22054 clearwood ct 95014');
    console.log('✅ Address entered: 22054 clearwood ct 95014');
    await page.waitForTimeout(2000);

    console.log('\n========== STEP 4: WAIT FOR STREET VIEW ==========');
    const streetView = page.locator('[data-testid="street-view-rotator"]');
    try {
      await streetView.waitFor({ timeout: 8000 });
      console.log('✅ Street View Rotator appeared');
    } catch {
      console.log('⚠️ Street View Rotator did not appear (may not be needed)');
    }

    console.log('\n========== STEP 5: SELECT DECORATION STYLE ==========');
    const styleSelectors = [
      'button:has-text("Classic")',
      'button:has-text("Modern")',
      'button:has-text("Over")',
    ];

    let selectedStyle = false;
    for (const selector of styleSelectors) {
      const btn = page.locator(selector).first();
      if (await btn.isVisible({ timeout: 2000 })) {
        const text = await btn.textContent();
        await btn.click();
        console.log(`✅ Selected style: ${text?.trim()}`);
        selectedStyle = true;
        await page.waitForTimeout(500);
        break;
      }
    }

    if (!selectedStyle) {
      throw new Error('Could not find or click style button');
    }

    console.log('\n========== STEP 6: CLICK GENERATE BUTTON ==========');
    const generateBtn = page.locator('button:has-text("Generate")').first();

    if (await generateBtn.isVisible({ timeout: 3000 })) {
      const isDisabled = await generateBtn.isDisabled();
      if (isDisabled) {
        console.log('❌ Generate button is DISABLED');
        // Check if it's because of missing credits
        const errorMsg = await page.locator('[data-testid="error-message"]').first();
        if (await errorMsg.isVisible()) {
          const error = await errorMsg.textContent();
          console.log(`  Reason: ${error}`);
        }
        throw new Error('Generate button is disabled (insufficient credits?)');
      }

      await generateBtn.click();
      console.log('✅ Generate button clicked!');
      await page.waitForTimeout(1000);
    } else {
      // List all buttons
      const buttons = await page.locator('button').all();
      console.log(`Found ${buttons.length} buttons on page:`);
      for (let i = 0; i < Math.min(5, buttons.length); i++) {
        const text = await buttons[i].textContent();
        console.log(`  ${i}: ${text?.trim()}`);
      }
      throw new Error('Generate button not found');
    }

    console.log('\n========== STEP 7: WAIT FOR RESULTS ==========');
    const resultsElement = page.locator('[data-testid="generation-results"]');

    try {
      console.log('⏳ Waiting for generation to complete (up to 90 seconds)...');
      await resultsElement.waitFor({ timeout: 90000 });
      console.log('\n🎉 SUCCESS! Generation completed!');

      // Check for images
      const images = await page.locator('img').all();
      console.log(`📷 Found ${images.length} images on page`);

      // Check for before/after
      const beforeImage = page.locator('[data-testid="before-image"]');
      const afterImage = page.locator('[data-testid="after-image"]');

      if (await beforeImage.isVisible()) {
        console.log('✅ Before image displayed');
      }
      if (await afterImage.isVisible()) {
        console.log('✅ After image displayed');
      }

    } catch (error) {
      console.log('\n❌ Generation did not complete');

      // Check for error message
      const errorDisplay = page.locator('[data-testid="error-message"]');
      if (await errorDisplay.isVisible()) {
        const errorText = await errorDisplay.textContent();
        console.log(`❌ Error: ${errorText}`);
      }

      // Check for progress indicator still showing
      const progress = page.locator('[data-testid="generation-progress"]');
      if (await progress.isVisible()) {
        const progressText = await progress.textContent();
        console.log(`⏳ Still in progress: ${progressText?.split('\n')[0]}`);
      }

      throw error;
    }
  });
});
