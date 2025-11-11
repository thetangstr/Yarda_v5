import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright configuration for Staging Environment Testing
 *
 * Frontend: https://yarda-v5-frontend-git-006-magic-link-auth-thetangstrs-projects.vercel.app
 * Backend: https://yarda-api-production.up.railway.app
 *
 * Authentication: Uses global setup to create authenticated session once,
 * then reuses that session across all tests.
 */
export default defineConfig({
  testDir: './tests/e2e',

  /* Run tests in files in parallel */
  fullyParallel: false, // Run sequentially for staging to avoid rate limits

  /* Fail the build on CI if you accidentally left test.only in the source code. */
  forbidOnly: !!process.env.CI,

  /* Retry failed tests */
  retries: 1,

  /* Single worker for staging tests */
  workers: 1,

  /* Reporter to use */
  reporter: [
    ['html', { outputFolder: 'playwright-report-staging' }],
    ['list'],
  ],

  /* Global setup - authenticate once before all tests */
  globalSetup: './tests/global-setup-staging.ts',

  /* Shared settings for all the projects below */
  use: {
    /* Base URL for staging - clean URL without share parameter */
    baseURL: 'https://yarda-v5-frontend-git-006-magic-link-auth-thetangstrs-projects.vercel.app',

    /* Use authenticated state from global setup */
    storageState: '.auth/staging-user.json',

    /* Vercel deployment protection bypass */
    extraHTTPHeaders: {
      'x-vercel-protection-bypass': 'k9jH7fG3pS5rWqXzBvC2mN6yT8dL2222',
      'x-vercel-set-bypass-cookie': 'k9jH7fG3pS5rWqXzBvC2mN6yT8dL2222',
    },

    /* Collect trace on failure */
    trace: 'on-first-retry',

    /* Screenshot on failure */
    screenshot: 'only-on-failure',

    /* Longer timeouts for staging environment */
    actionTimeout: 15000, // 15 seconds
    navigationTimeout: 30000, // 30 seconds
  },

  /* Test only chromium for staging */
  projects: [
    {
      name: 'chromium-staging',
      use: {
        ...devices['Desktop Chrome'],
        headless: true,
      },
    },
  ],

  /* Do not start local server for staging tests */
  // webServer is intentionally omitted - we test against deployed staging
});
