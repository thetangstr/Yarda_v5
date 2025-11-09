import { defineConfig, devices } from '@playwright/test';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Playwright configuration for Staging Environment Testing
 *
 * Frontend: https://yarda-v5-frontend-jxonwuxkj-thetangstrs-projects.vercel.app
 * Backend: https://yardav5-staging.up.railway.app
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

  /* Shared settings for all the projects below */
  use: {
    /* Base URL for staging - using shareable URL to bypass Vercel auth */
    baseURL: 'https://yarda-v5-frontend-jxonwuxkj-thetangstrs-projects.vercel.app/?_vercel_share=o64DXz4AMnGg6wpNTJ6UIqnk3EnGeGen',

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
