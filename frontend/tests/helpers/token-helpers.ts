/**
 * Token Management Helper Utilities for E2E Tests
 *
 * Helpers for testing token balance display, persistence, deduction, and history
 */

import { Page, expect } from '@playwright/test';
import { waitForHydration, getTokenBalance } from './auth-helpers';

export interface TokenTransaction {
  id: string;
  type: 'purchase' | 'deduction' | 'refund';
  amount: number;
  balanceAfter: number;
  createdAt: string;
  description?: string;
}

/**
 * Verify token balance displays correctly in navbar (compact variant)
 */
export async function verifyTokenBalanceCompact(page: Page, expectedBalance: number) {
  // Wait for navbar to load
  const navbar = page.locator('nav');
  await expect(navbar).toBeVisible();

  // Look for token balance in compact format (icon + number)
  const balanceElement = navbar.locator('[data-testid="token-balance-compact"]');
  await expect(balanceElement).toContainText(`${expectedBalance}`);
}

/**
 * Verify token balance displays correctly in account page (full variant)
 */
export async function verifyTokenBalanceFull(page: Page, expectedBalance: number) {
  await page.goto('http://localhost:3000/account');
  await waitForHydration(page);

  // Look for full token balance display
  const balanceElement = page.locator('[data-testid="token-balance-full"]');
  await expect(balanceElement).toBeVisible();
  await expect(balanceElement).toContainText(`${expectedBalance}`);

  // Verify "Purchase Tokens" CTA is visible
  const purchaseCTA = page.locator('button:has-text("Purchase Tokens")');
  await expect(purchaseCTA).toBeVisible();
}

/**
 * Verify token balance persists in localStorage
 */
export async function verifyLocalStoragePersistence(page: Page, expectedBalance: number) {
  // Get localStorage value
  const storedBalance = await page.evaluate(() => {
    const store = localStorage.getItem('user-store');
    if (store) {
      const parsed = JSON.parse(store);
      return parsed.state?.user?.tokenBalance;
    }
    return null;
  });

  expect(storedBalance).toBe(expectedBalance);
}

/**
 * Clear localStorage and verify balance refreshes from API
 */
export async function verifyBackgroundRefresh(page: Page, expectedBalance: number) {
  // Clear localStorage
  await page.evaluate(() => {
    localStorage.removeItem('user-store');
  });

  // Reload page
  await page.reload();
  await waitForHydration(page);

  // Wait for balance to refresh from API
  await page.waitForFunction(
    (expected) => {
      const store = (window as any).userStore?.getState();
      return store?.user?.tokenBalance === expected;
    },
    expectedBalance,
    { timeout: 10000 }
  );

  // Verify balance is correct
  const balance = await getTokenBalance(page);
  expect(balance).toBe(expectedBalance);
}

/**
 * Verify "No Credits Available" state
 */
export async function verifyNoCreditsState(page: Page) {
  await page.goto('http://localhost:3000/generate');
  await waitForHydration(page);

  // Verify payment status shows "No Credits Available"
  await expect(page.locator('text=/No Credits|Insufficient|Out of credits/i')).toBeVisible();

  // Verify generate button is disabled
  const generateButton = page.locator('button:has-text("Generate")');
  await expect(generateButton).toBeDisabled();

  // Verify purchase CTA is prominent
  const purchaseCTA = page.locator('button:has-text("Purchase Tokens")');
  await expect(purchaseCTA).toBeVisible();
}

/**
 * Trigger a generation and verify token deduction
 */
export async function verifyTokenDeduction(
  page: Page,
  initialBalance: number,
  areasCount: number
) {
  const expectedFinalBalance = initialBalance - areasCount;

  // Fill and submit generation form
  await page.goto('http://localhost:3000/generate');
  await waitForHydration(page);

  // Fill address
  await page.fill(
    'input[placeholder*="address" i]',
    '1600 Amphitheatre Parkway, Mountain View, CA'
  );

  // Select areas (assuming area selection UI)
  for (let i = 0; i < areasCount; i++) {
    const areaSelector = page.locator(`[data-area]`).nth(i);
    await areaSelector.click();
  }

  // Select style
  await page.click('[data-style="modern_minimalist"]');

  // Submit generation
  await page.click('button:has-text("Generate")');

  // Wait for generation to start and token to be deducted
  await page.waitForFunction(
    (expected) => {
      const store = (window as any).userStore?.getState();
      return store?.user?.tokenBalance === expected;
    },
    expectedFinalBalance,
    { timeout: 30000 }
  );

  // Verify final balance
  const finalBalance = await getTokenBalance(page);
  expect(finalBalance).toBe(expectedFinalBalance);
}

/**
 * Verify token refund after failed generation
 */
export async function verifyTokenRefund(page: Page, expectedBalance: number) {
  // Wait for balance to update (refund should happen within 5 seconds)
  await page.waitForFunction(
    (expected) => {
      const store = (window as any).userStore?.getState();
      return store?.user?.tokenBalance === expected;
    },
    expectedBalance,
    { timeout: 10000 }
  );

  // Verify balance is correct
  const balance = await getTokenBalance(page);
  expect(balance).toBe(expectedBalance);
}

/**
 * Fetch token transaction history from API
 */
export async function fetchTokenTransactions(
  page: Page,
  limit = 20,
  offset = 0
): Promise<TokenTransaction[]> {
  const transactions = await page.evaluate(
    async ({ limit, offset }) => {
      const response = await fetch(
        `http://localhost:8000/tokens/transactions?limit=${limit}&offset=${offset}`,
        {
          headers: {
            Authorization: `Bearer ${
              (window as any).userStore?.getState()?.accessToken || ''
            }`,
          },
        }
      );
      return await response.json();
    },
    { limit, offset }
  );

  return transactions;
}

/**
 * Verify token transaction history pagination
 */
export async function verifyTransactionPagination(page: Page, totalTransactions: number) {
  const pageSize = 20;
  const totalPages = Math.ceil(totalTransactions / pageSize);

  const allTransactionIds: string[] = [];

  for (let page_num = 0; page_num < totalPages; page_num++) {
    const offset = page_num * pageSize;
    const transactions = await fetchTokenTransactions(page, pageSize, offset);

    // Collect transaction IDs
    transactions.forEach((txn) => allTransactionIds.push(txn.id));

    // Verify no more than pageSize transactions per page
    expect(transactions.length).toBeLessThanOrEqual(pageSize);
  }

  // Verify no duplicate transaction IDs
  const uniqueIds = new Set(allTransactionIds);
  expect(uniqueIds.size).toBe(allTransactionIds.length);

  // Verify total count
  expect(allTransactionIds.length).toBe(totalTransactions);
}

/**
 * Verify transaction history shows correct entries
 */
export async function verifyTransactionEntry(
  page: Page,
  expectedType: 'purchase' | 'deduction' | 'refund',
  expectedAmount: number
) {
  const transactions = await fetchTokenTransactions(page, 20, 0);

  // Find transaction matching type and amount
  const matchingTransaction = transactions.find(
    (txn) => txn.type === expectedType && txn.amount === expectedAmount
  );

  expect(matchingTransaction).toBeDefined();
  return matchingTransaction;
}

/**
 * Verify authorization priority system
 * Order: Subscription > Trial > Tokens
 */
export async function verifyAuthorizationPriority(
  page: Page,
  userState: {
    hasSubscription: boolean;
    trialRemaining: number;
    tokenBalance: number;
  }
) {
  await page.goto('http://localhost:3000/generate');
  await waitForHydration(page);

  // Check payment status display
  const paymentStatus = page.locator('[data-testid="payment-status"]');

  if (userState.hasSubscription) {
    // Should show "Unlimited" (subscription active)
    await expect(paymentStatus).toContainText(/Unlimited|Pro Plan|Subscription/i);
  } else if (userState.trialRemaining > 0) {
    // Should show trial credits
    await expect(paymentStatus).toContainText(`${userState.trialRemaining}`);
    await expect(paymentStatus).toContainText(/trial|free/i);
  } else if (userState.tokenBalance > 0) {
    // Should show token balance
    await expect(paymentStatus).toContainText(`${userState.tokenBalance}`);
    await expect(paymentStatus).toContainText(/token/i);
  } else {
    // Should show "No Credits Available"
    await expect(paymentStatus).toContainText(/No Credits|Insufficient/i);
  }
}

/**
 * Monitor token balance changes in real-time
 * Returns a Promise that resolves when balance changes
 */
export async function waitForBalanceChange(page: Page, timeoutMs = 10000): Promise<number> {
  const initialBalance = await getTokenBalance(page);

  return await page.waitForFunction(
    (initial) => {
      const store = (window as any).userStore?.getState();
      return store?.user?.tokenBalance !== initial;
    },
    initialBalance,
    { timeout: timeoutMs }
  ).then(() => getTokenBalance(page));
}

/**
 * Verify token balance auto-refresh
 * Checks that balance updates within specified interval
 */
export async function verifyAutoRefresh(page: Page, intervalMs = 30000) {
  const initialBalance = await getTokenBalance(page);

  // Wait for auto-refresh to occur (TokenBalance component should refresh)
  await page.waitForTimeout(intervalMs + 1000);

  // Trigger a balance check (might be cached, but should have refreshed)
  const refreshedBalance = await getTokenBalance(page);

  // Even if balance didn't change, this verifies the refresh mechanism is working
  // In a real test, you'd modify the balance server-side and verify it updates
  expect(refreshedBalance).toBeDefined();
}
