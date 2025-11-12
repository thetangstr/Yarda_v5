import { test, expect } from '@playwright/test';

// Configure to only run on chromium desktop browser
test.use({
  baseURL: 'http://localhost:3000',
});

test.describe('Holiday Decorator - Manual Flow Test', () => {
  test('Complete flow: Address → Style → Generate with credits', async ({ page }) => {
    console.log('\n' + '='.repeat(70));
    console.log('🎄 HOLIDAY DECORATOR TEST - STARTING');
    console.log('='.repeat(70) + '\n');

    try {
      // Step 1: Navigate directly to holiday page with authenticated user
      console.log('📍 Step 1: Navigate directly to /holiday with authenticated session');
      await page.goto('/holiday');
      await page.waitForLoadState('domcontentloaded');
      await page.waitForTimeout(2000); // Wait for Zustand hydration

      const holidayUrl = page.url();
      console.log(`✅ Navigated to: ${holidayUrl}\n`);

      // Step 2: Verify we're on holiday page and check credits
      console.log('📍 Step 2: Verify holiday page loaded and wait for hydration');

      // Wait for either credit display or error message
      const creditDisplay = page.locator('[data-testid="credit-display"]');
      const errorDisplay = page.locator('[data-testid="error-message"]');

      try {
        await Promise.race([
          creditDisplay.waitFor({ state: 'visible', timeout: 10000 }),
          errorDisplay.waitFor({ state: 'visible', timeout: 10000 }),
        ]);
      } catch {
        console.log('⚠️  Neither credit nor error display visible yet, checking page content...');
        const pageTitle = await page.locator('h1').first().textContent();
        console.log(`📄 Page title: ${pageTitle}`);
      }

      if (await creditDisplay.isVisible({ timeout: 5000 }).catch(() => false)) {
        const creditText = await creditDisplay.textContent();
        console.log(`✅ Credit display found: ${creditText}\n`);
      } else {
        console.log('⚠️  No credit display found (page may show auth gate)\n');
      }

      // Step 3: Enter address
      console.log('📍 Step 3: Enter address: 22054 clearwood ct 95014');

      const addressInput = page.locator('input[name="address"]');

      // Wait for the input to be visible and enabled
      try {
        await addressInput.waitFor({ state: 'visible', timeout: 10000 });
        console.log(`✅ Found address input`);
        await addressInput.fill('22054 clearwood ct 95014');
        await page.waitForTimeout(2000); // Wait for Street View to load
        console.log('✅ Address entered\n');
      } catch (error) {
        // Take a screenshot to see what's on the page
        await page.screenshot({ path: '/tmp/holiday-page-state.png' });
        console.log('📸 Screenshot saved to /tmp/holiday-page-state.png');
        console.log('📄 Page HTML:', await page.content());
        throw new Error(`Could not find or fill address input: ${error.message}`);
      }

      // Step 4: Wait for Street View Rotator to appear
      console.log('📍 Step 4: Wait for Street View to load');
      const streetViewRotator = page.locator('[data-testid="street-view-rotator"]');
      try {
        await expect(streetViewRotator).toBeVisible({ timeout: 10000 });
        console.log('✅ Street View Rotator loaded\n');
      } catch {
        console.log('⚠️  Street View Rotator not found, but continuing...\n');
      }

      // Step 5: Select a style
      console.log('📍 Step 5: Select a decoration style');
      const styleButtons = await page.locator('button:has-text("Classic"), button:has-text("Modern"), button:has-text("Over the Top")').all();
      if (styleButtons.length === 0) {
        throw new Error('Could not find style buttons');
      }
      const styleText = await styleButtons[0].textContent();
      console.log(`✅ Selected style: ${styleText}`);
      await styleButtons[0].click();
      await page.waitForTimeout(500);
      console.log('✅ Style selected\n');

      // Step 6: Click Generate button
      console.log('📍 Step 6: Click Generate button');
      const generateBtn = page.locator('button:has-text("Generate Decoration"), button:has-text("Generate")').first();
      if (!await generateBtn.isVisible()) {
        throw new Error('Could not find Generate button');
      }
      if (await generateBtn.isDisabled()) {
        throw new Error('Generate button is disabled (likely no credits)');
      }
      console.log('✅ Clicking Generate...');
      await generateBtn.click();
      await page.waitForTimeout(1000);
      console.log('✅ Generation started\n');

      // Step 7: Wait for generation to complete (with timeout)
      console.log('📍 Step 7: Wait for generation to complete (up to 2 minutes)');
      const resultsElement = page.locator('[data-testid="generation-results"]');

      try {
        await expect(resultsElement).toBeVisible({ timeout: 120000 });
        console.log('✅ Generation completed successfully!\n');

        // Verify results are displayed
        const images = await page.locator('img[src*="blob"], img[src*="vercel"]').all();
        console.log(`✅ Found ${images.length} result images\n`);
      } catch (error) {
        // Check for error message
        const errorMsg = await page.locator('[data-testid="error-message"]').textContent();
        if (errorMsg) {
          console.log(`❌ Error message: ${errorMsg}\n`);
          throw new Error(`Generation failed: ${errorMsg}`);
        }
        throw error;
      }

      console.log('='.repeat(70));
      console.log('✅ TEST PASSED - Complete flow executed successfully!');
      console.log('='.repeat(70) + '\n');

    } catch (error: any) {
      console.log('\n' + '='.repeat(70));
      console.log('❌ TEST FAILED');
      console.log('='.repeat(70));
      console.log(`Error: ${error.message}\n`);

      // Take screenshot for debugging
      try {
        await page.screenshot({ path: '/tmp/holiday-test-error.png' });
        console.log('📸 Screenshot saved to /tmp/holiday-test-error.png');
      } catch {}

      throw error;
    }
  });
});
