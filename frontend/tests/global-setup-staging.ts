/**
 * Playwright Global Setup for STAGING Environment
 *
 * Creates authenticated session using real Supabase credentials for E2E testing in staging.
 * This setup authenticates once and saves the session state for reuse across all tests.
 */

import { chromium, FullConfig } from '@playwright/test';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function globalSetupStaging(config: FullConfig) {
  console.log('🔧 Setting up authentication for STAGING environment...');

  const baseURL = config.use?.baseURL || 'https://yarda-v5-frontend-git-007-holiday-decorator-thetangstrs-projects.vercel.app';

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    baseURL,
    extraHTTPHeaders: {
      'x-vercel-protection-bypass': 'k9jH7fG3pS5rWqXzBvC2mN6yT8dL2222',
      'x-vercel-set-bypass-cookie': 'k9jH7fG3pS5rWqXzBvC2mN6yT8dL2222',
    },
  });
  const page = await context.newPage();

  try {
    console.log(`📍 Navigating to staging with bypass secret...`);

    // Set E2E test flags BEFORE navigation
    await context.addInitScript(() => {
      (window as any).__PLAYWRIGHT_E2E__ = true;
      (window as any).__STAGING_E2E__ = true;
    });

    // STEP 1: Navigate to homepage with bypass headers
    await page.goto(baseURL, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForTimeout(2000);

    const afterLoadURL = page.url();
    console.log(`✅ Page loaded: ${afterLoadURL.substring(0, 100)}...`);

    // Check if we got redirected to Vercel login (means bypass failed)
    if (afterLoadURL.includes('vercel.com/login')) {
      console.error('❌ Bypass secret invalid or deployment protection changed');
      throw new Error('Vercel bypass failed - check bypass secret');
    }

    // STEP 2: Inject mock authentication state AND E2E flags
    console.log('✅ Injecting mock authentication state and E2E flags...');
    await page.evaluate(() => {
      // Set E2E flags on window (persists across navigations via cookies/storage)
      (window as any).__PLAYWRIGHT_E2E__ = true;
      (window as any).__STAGING_E2E__ = true;

      // Store E2E flags in localStorage so they persist
      localStorage.setItem('__PLAYWRIGHT_E2E__', 'true');
      localStorage.setItem('__STAGING_E2E__', 'true');

      const mockUserState = {
        state: {
          user: {
            id: 'staging-e2e-test-user',
            email: 'staging-e2e@yarda.app',
            email_verified: true,
            created_at: new Date().toISOString(),
            trial_remaining: 3,
            trial_used: 0,
            subscription_status: 'inactive',
            subscription_tier: 'free',
            tokenBalance: 0,
          },
          accessToken: 'staging-e2e-mock-token-' + Date.now(),
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

      console.log('[global-setup] E2E flags set:', {
        __PLAYWRIGHT_E2E__: (window as any).__PLAYWRIGHT_E2E__,
        localStorage: localStorage.getItem('__PLAYWRIGHT_E2E__'),
      });
    });

    // STEP 3: Verify E2E flags and mock auth are set
    const setupVerification = await page.evaluate(() => ({
      e2eFlag: localStorage.getItem('__PLAYWRIGHT_E2E__'),
      stagingFlag: localStorage.getItem('__STAGING_E2E__'),
      hasUserStorage: !!localStorage.getItem('user-storage'),
    }));
    console.log('✅ Setup verification:', setupVerification);

    if (!setupVerification.e2eFlag || !setupVerification.hasUserStorage) {
      throw new Error('E2E flags or user storage not set correctly!');
    }

    console.log('✅ Authentication and E2E flags configured successfully for staging');

    // Create .auth directory if it doesn't exist
    const authDir = path.join(__dirname, '..', '.auth');
    if (!fs.existsSync(authDir)) {
      fs.mkdirSync(authDir, { recursive: true });
    }

    // Save authenticated state
    const authFile = path.join(authDir, 'staging-user.json');
    await context.storageState({ path: authFile });

    console.log(`✅ Saved authenticated state to ${authFile}`);
  } catch (error) {
    console.error('❌ Staging global setup failed:', error);
    throw error;
  } finally {
    await browser.close();
  }
}

export default globalSetupStaging;
