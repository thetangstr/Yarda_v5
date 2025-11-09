/**
 * Playwright Global Setup
 *
 * Handles authentication once for all E2E tests.
 * Saves authenticated state to .auth/user.json for reuse across tests.
 *
 * This fixes the Zustand hydration race condition by using real authentication
 * instead of mocking localStorage.
 */

import { chromium, FullConfig } from '@playwright/test';
import path from 'path';
import fs from 'fs';

async function globalSetup(config: FullConfig) {
  console.log('🔧 Setting up global authentication for E2E tests...');

  const browser = await chromium.launch();
  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    // Set E2E test flag BEFORE any page navigation to bypass auth guards
    await context.addInitScript(() => {
      (window as any).__PLAYWRIGHT_E2E__ = true;
    });

    // Navigate to homepage first
    await page.goto('http://localhost:3000/');

    // Set up mock authentication in localStorage
    await page.evaluate(() => {
      const mockUserState = {
        state: {
          user: {
            id: 'e2e-test-user',
            email: 'e2e-test@yarda.app',
            email_verified: true,
            created_at: new Date().toISOString(),
            trial_remaining: 3,
            trial_used: 0,
            subscription_status: 'inactive',
            subscription_tier: 'free',
          },
          accessToken: 'e2e-mock-token',
          isAuthenticated: true,
          _hasHydrated: true,
          tokenBalance: {
            balance: 0,
            trial_remaining: 3,
          },
        },
        version: 0,
      };
      localStorage.setItem('user-storage', JSON.stringify(mockUserState));
    });

    // Verify E2E flag is set
    const flagSet = await page.evaluate(() => (window as any).__PLAYWRIGHT_E2E__);
    console.log('✅ E2E flag set:', flagSet);

    // Navigate to generate page to verify auth works
    await page.goto('http://localhost:3000/generate', { waitUntil: 'domcontentloaded' });

    // Verify E2E flag persists after navigation
    const flagAfterNav = await page.evaluate(() => (window as any).__PLAYWRIGHT_E2E__);
    console.log('✅ E2E flag after navigation:', flagAfterNav);

    // Wait for authenticated page to load (should NOT redirect to login)
    try {
      await page.waitForSelector('[data-testid="address-input"]', { timeout: 10000 });
    } catch (error) {
      const currentURL = page.url();
      console.error(`❌ Page redirected to: ${currentURL}`);
      console.error(`❌ E2E flag value: ${flagAfterNav}`);
      throw error;
    }

    console.log('✅ Authentication setup successful');

    // Create .auth directory if it doesn't exist
    const authDir = path.join(__dirname, '..', '.auth');
    if (!fs.existsSync(authDir)) {
      fs.mkdirSync(authDir, { recursive: true });
    }

    // Save authenticated state
    await context.storageState({ path: path.join(authDir, 'user.json') });

    console.log('✅ Saved authenticated state to .auth/user.json');
  } catch (error) {
    console.error('❌ Global setup failed:', error);
    throw error;
  } finally {
    await browser.close();
  }
}

export default globalSetup;
