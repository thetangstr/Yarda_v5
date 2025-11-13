import { test, expect } from '@playwright/test';

/**
 * Language Switching E2E Tests
 *
 * Tests the i18n system including:
 * - Language switcher component functionality
 * - Translation rendering in multiple languages
 * - Language persistence across page reloads
 */

test.describe('Language Switching - Frontend', () => {
  // Clear localStorage before each test
  test.beforeEach(async ({ page }) => {
    // Navigate to login page first to establish context
    await page.goto('/login');
    await page.waitForLoadState('domcontentloaded');
    // Now clear localStorage
    await page.evaluate(() => localStorage.clear());
  });

  test('should render login page in English by default', async ({ page }) => {
    // Already navigated in beforeEach, page is ready
    await page.waitForLoadState('domcontentloaded');

    // Check for English content - check title and main heading
    const pageTitle = await page.title();
    expect(pageTitle).toContain('Login');
  });

  test('should display language switcher on login page', async ({ page }) => {
    // Check that language switcher button exists
    const langSwitcher = page.locator('button[aria-label="Change language"]');
    await expect(langSwitcher).toBeVisible();
  });

  test('should have all three language options available', async ({ page }) => {
    // Click language switcher to open dropdown
    const langButton = page.locator('button[aria-label="Change language"]');
    await langButton.click();
    await page.waitForTimeout(500);

    // Check for all three language options in the dropdown
    // Look for buttons with role="option"
    const englishOption = page.locator('button[role="option"]:has-text("English")').first();
    const spanishOption = page.locator('button[role="option"]:has-text("Español")').first();
    const chineseOption = page.locator('button[role="option"]:has-text("中文")').first();

    await expect(englishOption).toBeVisible();
    await expect(spanishOption).toBeVisible();
    await expect(chineseOption).toBeVisible();
  });

  test('should switch to Spanish and persist preference', async ({ page }) => {
    // Open language switcher
    const langButton = page.locator('button[aria-label="Change language"]');
    await langButton.click();
    await page.waitForTimeout(500);

    // Click Spanish option
    const spanishOption = page.locator('button[role="option"]:has-text("Español")').first();
    await spanishOption.click();
    await page.waitForTimeout(1000);

    // Verify Spanish preference is saved in localStorage
    const locale = await page.evaluate(() => localStorage.getItem('preferred-locale'));
    expect(locale).toBe('es');

    // Reload page and verify Spanish is still set
    await page.reload();
    await page.waitForLoadState('domcontentloaded');

    // Check that Spanish switcher button still shows Spanish
    const switcherButton = page.locator('button[aria-label="Change language"]');
    const buttonText = await switcherButton.textContent();
    expect(buttonText).toContain('Español');
  });

  test('should switch between multiple languages', async ({ page }) => {
    // Test switching from English to Spanish
    let langButton = page.locator('button[aria-label="Change language"]');
    await langButton.click();
    await page.waitForTimeout(500);

    let option = page.locator('button[role="option"]:has-text("Español")').first();
    await option.click();
    await page.waitForTimeout(500);

    // Verify Spanish is set
    let locale = await page.evaluate(() => localStorage.getItem('preferred-locale'));
    expect(locale).toBe('es');

    // Now switch to Chinese
    langButton = page.locator('button[aria-label="Change language"]');
    await langButton.click();
    await page.waitForTimeout(500);

    option = page.locator('button[role="option"]:has-text("中文")').first();
    await option.click();
    await page.waitForTimeout(500);

    // Verify Chinese is now set
    locale = await page.evaluate(() => localStorage.getItem('preferred-locale'));
    expect(locale).toBe('zh');

    // Switch back to English
    langButton = page.locator('button[aria-label="Change language"]');
    await langButton.click();
    await page.waitForTimeout(500);

    option = page.locator('button[role="option"]:has-text("English")').first();
    await option.click();
    await page.waitForTimeout(500);

    // Verify English is now set
    locale = await page.evaluate(() => localStorage.getItem('preferred-locale'));
    expect(locale).toBe('en');
  });

  test('should display correct active language indicator', async ({ page }) => {
    // Open switcher
    const langButton = page.locator('button[aria-label="Change language"]');
    await langButton.click();
    await page.waitForTimeout(500);

    // English should be selected by default (aria-selected=true)
    const englishOption = page.locator('button[role="option"]:has-text("English")').first();
    const isEnglishSelected = await englishOption.getAttribute('aria-selected');
    expect(isEnglishSelected).toBe('true');

    // Click Spanish
    const spanishOption = page.locator('button[role="option"]:has-text("Español")').first();
    await spanishOption.click();
    await page.waitForTimeout(500);

    // Open switcher again
    await langButton.click();
    await page.waitForTimeout(500);

    // Spanish should now be selected
    const spanishOptionAfter = page.locator('button[role="option"]:has-text("Español")').first();
    const isSpanishSelected = await spanishOptionAfter.getAttribute('aria-selected');
    expect(isSpanishSelected).toBe('true');
  });

  test('register page should also support language switching', async ({ page }) => {
    // Navigate to register page
    await page.goto('/register');
    await page.waitForLoadState('domcontentloaded');

    // Check language switcher exists
    const langSwitcher = page.locator('button[aria-label="Change language"]');
    await expect(langSwitcher).toBeVisible();

    // Open switcher
    await langSwitcher.click();
    await page.waitForTimeout(500);

    // Should have language options
    const spanishOption = page.locator('button[role="option"]:has-text("Español")').first();
    await expect(spanishOption).toBeVisible();
  });

  test('language preference should close switcher when clicking outside', async ({ page }) => {
    // Open switcher
    const langButton = page.locator('button[aria-label="Change language"]');
    await langButton.click();
    await page.waitForTimeout(500);

    // Verify dropdown is open (options visible)
    const options = page.locator('button[role="option"]');
    expect(await options.count()).toBeGreaterThan(0);

    // Click outside the switcher (on the main form area)
    await page.click('h1', { force: true });
    await page.waitForTimeout(300);

    // Switcher should be closed - options should not be visible
    const optionsList = page.locator('[role="listbox"]');
    await expect(optionsList).not.toBeVisible();
  });
});
