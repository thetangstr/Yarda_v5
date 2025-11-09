/**
 * Authentication Helper Utilities for E2E Tests
 *
 * Critical Pattern: Always wait for Zustand hydration before checking auth state
 * to prevent redirect loops and race conditions.
 */

import { Page, expect } from '@playwright/test';

export interface TestUser {
  email: string;
  password: string;
  expectedBalance?: number;
  expectedTrial?: number;
}

/**
 * Wait for Zustand store hydration to complete
 * CRITICAL: This prevents authentication redirect bugs
 */
export async function waitForHydration(page: Page, timeout = 5000) {
  await page.waitForFunction(
    () => {
      const store = (window as any).userStore?.getState();
      return store?._hasHydrated === true;
    },
    { timeout }
  );
}

/**
 * Login and wait for Zustand hydration
 * This is the safest way to authenticate in E2E tests
 */
export async function loginAndHydrate(page: Page, user: TestUser) {
  // Navigate to auth page
  await page.goto('http://localhost:3000/auth');

  // Fill login form
  await page.fill('input[name="email"]', user.email);
  await page.fill('input[name="password"]', user.password);

  // Click Log In button
  await page.click('button:has-text("Log In")');

  // Wait for redirect to /generate or /
  await page.waitForURL(/\/(generate|$)/, { timeout: 10000 });

  // CRITICAL: Wait for Zustand hydration to complete
  await waitForHydration(page);

  // Verify user is authenticated
  const isAuth = await page.evaluate(() => {
    const store = (window as any).userStore?.getState();
    return store?.isAuthenticated === true;
  });

  expect(isAuth).toBe(true);
}

/**
 * Get current user from Zustand store
 */
export async function getCurrentUser(page: Page) {
  return await page.evaluate(() => {
    const store = (window as any).userStore?.getState();
    return store?.user || null;
  });
}

/**
 * Get current token balance from Zustand store
 */
export async function getTokenBalance(page: Page): Promise<number> {
  const balance = await page.evaluate(() => {
    const store = (window as any).userStore?.getState();
    return store?.user?.tokenBalance || 0;
  });
  return balance;
}

/**
 * Get trial credits remaining from Zustand store
 */
export async function getTrialRemaining(page: Page): Promise<number> {
  const trial = await page.evaluate(() => {
    const store = (window as any).userStore?.getState();
    return store?.user?.trialRemaining || 0;
  });
  return trial;
}

/**
 * Check if user is authenticated
 */
export async function isAuthenticated(page: Page): Promise<boolean> {
  return await page.evaluate(() => {
    const store = (window as any).userStore?.getState();
    return store?.isAuthenticated === true;
  });
}

/**
 * Logout user
 */
export async function logout(page: Page) {
  await page.evaluate(() => {
    const store = (window as any).userStore?.getState();
    store?.logout?.();
  });

  // Wait for redirect to login page
  await page.waitForURL(/\/(login|auth|$)/, { timeout: 5000 });
}

/**
 * Wait for token balance to reach expected value
 * Useful for verifying balance updates after purchases or generations
 */
export async function waitForTokenBalance(
  page: Page,
  expectedBalance: number,
  timeout = 10000
) {
  await page.waitForFunction(
    (expected) => {
      const store = (window as any).userStore?.getState();
      return store?.user?.tokenBalance === expected;
    },
    expectedBalance,
    { timeout }
  );
}

/**
 * Wait for trial credits to reach expected value
 */
export async function waitForTrialCredits(
  page: Page,
  expectedTrial: number,
  timeout = 10000
) {
  await page.waitForFunction(
    (expected) => {
      const store = (window as any).userStore?.getState();
      return store?.user?.trialRemaining === expected;
    },
    expectedTrial,
    { timeout }
  );
}

/**
 * Verify user has expected balances
 */
export async function verifyBalances(
  page: Page,
  expectedTokens?: number,
  expectedTrial?: number
) {
  const user = await getCurrentUser(page);

  if (expectedTokens !== undefined) {
    expect(user?.tokenBalance).toBe(expectedTokens);
  }

  if (expectedTrial !== undefined) {
    expect(user?.trialRemaining).toBe(expectedTrial);
  }
}

/**
 * Set user state in Zustand store (for testing edge cases)
 * WARNING: Use sparingly, prefer real authentication flow
 */
export async function setMockUserState(
  page: Page,
  userData: Partial<{
    tokenBalance: number;
    trialRemaining: number;
    email: string;
    isAuthenticated: boolean;
  }>
) {
  await page.evaluate((data) => {
    const store = (window as any).userStore?.getState();
    if (store?.setUser) {
      store.setUser({
        ...store.user,
        ...data,
      });
    }
  }, userData);
}

/**
 * Clear all authentication state and localStorage
 */
export async function clearAuthState(page: Page) {
  await page.evaluate(() => {
    // Clear Zustand store
    const store = (window as any).userStore?.getState();
    store?.logout?.();

    // Clear localStorage
    localStorage.clear();
  });
}

/**
 * Navigate to a page and wait for hydration
 * Prevents redirect issues when navigating to protected routes
 */
export async function navigateAndWaitHydration(page: Page, url: string) {
  await page.goto(url);
  await waitForHydration(page);
}
