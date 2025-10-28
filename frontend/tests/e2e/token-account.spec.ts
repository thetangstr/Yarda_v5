import { test, expect } from '@playwright/test'

/**
 * E2E Tests for User Story 5: Token Account Management
 *
 * Tests verify that token accounts are properly displayed and managed in the UI
 */

test.describe('Token Account Display', () => {
  test.beforeEach(async ({ page }) => {
    // Register a new user to start with fresh state
    await page.goto('/register')

    const timestamp = Date.now()
    const email = `test-${timestamp}@example.com`
    const password = 'SecurePass123!'

    await page.fill('[data-testid=email-input]', email)
    await page.fill('[data-testid=password-input]', password)
    await page.fill('[data-testid=confirm-password-input]', password)
    await page.click('[data-testid=register-button]')

    // For testing purposes, we'll mock email verification
    // In production, user would click link in email
    await page.waitForURL('/verify-email')
  })

  test('should display token account with zero balance for new users', async ({ page }) => {
    // Navigate to a page that shows credit display (e.g., generate page)
    await page.goto('/generate')

    // Should show token balance component
    await expect(page.locator('[data-testid=token-balance]')).toBeVisible()

    // New users should have 0 tokens
    await expect(page.locator('[data-testid=token-balance]')).toHaveText('0')
  })

  test('should display trial credits and token balance separately', async ({ page }) => {
    await page.goto('/generate')

    // Should show both credit types
    await expect(page.locator('[data-testid=trial-credits]')).toBeVisible()
    await expect(page.locator('[data-testid=token-balance]')).toBeVisible()

    // New users should have 3 trial credits and 0 tokens
    await expect(page.locator('[data-testid=trial-credits]')).toHaveText('3')
    await expect(page.locator('[data-testid=token-balance]')).toHaveText('0')
  })

  test('should display total credits combining trial and tokens', async ({ page }) => {
    await page.goto('/generate')

    // Total should be sum of trial + tokens
    await expect(page.locator('[data-testid=total-credits]')).toBeVisible()
    await expect(page.locator('[data-testid=total-credits]')).toHaveText('3')
  })

  test('should show token account ID in user profile', async ({ page }) => {
    await page.goto('/profile')

    // Token account section should be visible
    await expect(page.locator('[data-testid=token-account-section]')).toBeVisible()

    // Should show account ID (UUID format)
    const accountId = await page.locator('[data-testid=token-account-id]').textContent()
    expect(accountId).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)
  })

  test('should fetch and display token balance from API', async ({ page }) => {
    await page.goto('/generate')

    // Wait for API call to complete
    await page.waitForResponse(response =>
      response.url().includes('/api/credits/balance') && response.status() === 200
    )

    // Token balance should be loaded and displayed
    await expect(page.locator('[data-testid=token-balance]')).not.toHaveText('...')
    await expect(page.locator('[data-testid=token-balance]')).toHaveText('0')
  })

  test('should update token balance after credit consumption', async ({ page }) => {
    await page.goto('/generate')

    // Initially 3 trial credits, 0 tokens
    await expect(page.locator('[data-testid=trial-credits]')).toHaveText('3')
    await expect(page.locator('[data-testid=token-balance]')).toHaveText('0')

    // Consume all trial credits
    for (let i = 0; i < 3; i++) {
      await page.fill('[data-testid=address-input]', '123 Main St, City, State')
      await page.selectOption('[data-testid=style-select]', 'modern')
      await page.click('[data-testid=generate-button]')
      await page.waitForTimeout(2000) // Wait for generation
    }

    // All trial credits consumed
    await expect(page.locator('[data-testid=trial-credits]')).toHaveText('0')

    // Token balance should still be 0 (no tokens purchased yet)
    await expect(page.locator('[data-testid=token-balance]')).toHaveText('0')

    // Total credits should be 0
    await expect(page.locator('[data-testid=total-credits]')).toHaveText('0')
  })

  test('should show purchase tokens CTA when balance is zero', async ({ page }) => {
    await page.goto('/generate')

    // Consume all trial credits first
    for (let i = 0; i < 3; i++) {
      await page.fill('[data-testid=address-input]', '123 Main St, City, State')
      await page.selectOption('[data-testid=style-select]', 'modern')
      await page.click('[data-testid=generate-button]')
      await page.waitForTimeout(2000)
    }

    // Should show "Purchase Tokens" CTA
    await expect(page.locator('[data-testid=purchase-tokens-cta]')).toBeVisible()
    await expect(page.locator('[data-testid=purchase-tokens-cta]')).toHaveText(/Purchase Tokens/i)
  })

  test('should navigate to purchase page when clicking purchase CTA', async ({ page }) => {
    await page.goto('/generate')

    // Consume all credits
    for (let i = 0; i < 3; i++) {
      await page.fill('[data-testid=address-input]', '123 Main St, City, State')
      await page.selectOption('[data-testid=style-select]', 'modern')
      await page.click('[data-testid=generate-button]')
      await page.waitForTimeout(2000)
    }

    // Click purchase CTA
    await page.click('[data-testid=purchase-tokens-cta]')

    // Should navigate to purchase page
    await expect(page).toHaveURL('/purchase-tokens')
  })

  test('should display token balance in credit display component', async ({ page }) => {
    await page.goto('/generate')

    // Credit display should have all sections
    const creditDisplay = page.locator('[data-testid=credit-display]')
    await expect(creditDisplay).toBeVisible()

    // Should show trial credits section
    await expect(creditDisplay.locator('[data-testid=trial-credits-section]')).toBeVisible()

    // Should show token balance section
    await expect(creditDisplay.locator('[data-testid=token-balance-section]')).toBeVisible()

    // Should show total credits section
    await expect(creditDisplay.locator('[data-testid=total-credits-section]')).toBeVisible()
  })

  test('should refresh token balance on page load', async ({ page }) => {
    // Go to generate page
    await page.goto('/generate')

    // Verify balance loaded
    await expect(page.locator('[data-testid=token-balance]')).toHaveText('0')

    // Navigate away and back
    await page.goto('/history')
    await page.goto('/generate')

    // Should fetch balance again
    await page.waitForResponse(response =>
      response.url().includes('/api/credits/balance') && response.status() === 200
    )

    // Balance should still be displayed
    await expect(page.locator('[data-testid=token-balance]')).toHaveText('0')
  })
})
