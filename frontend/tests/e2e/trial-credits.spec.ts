import { test, expect } from '@playwright/test'

test.describe('Trial Credit Allocation', () => {
  test('should allocate 3 trial credits to new user', async ({ page }) => {
    // Register a new user
    await page.goto('/register')

    const timestamp = Date.now()
    const email = `trial${timestamp}@example.com`
    const password = 'TrialPassword123!'

    await page.fill('[name=email]', email)
    await page.fill('[name=password]', password)
    await page.fill('[name=confirmPassword]', password)
    await page.click('button[type=submit]')

    // Wait for registration to complete
    await page.waitForURL(/\/dashboard|\/verify-email/)

    // Navigate to dashboard if not already there
    if (!page.url().includes('/dashboard')) {
      await page.goto('/dashboard')
    }

    // Verify trial credits display shows exactly 3
    await expect(page.locator('[data-testid=trial-credits]')).toHaveText('3')
  })

  test('should display trial credits on user dashboard', async ({ page }) => {
    // Assuming user is logged in
    await page.goto('/dashboard')

    // Check that credit display component is visible
    await expect(page.locator('[data-testid=credit-display]')).toBeVisible()

    // Check that trial credits section exists
    await expect(page.locator('[data-testid=trial-credits]')).toBeVisible()

    // Check that token balance section exists
    await expect(page.locator('[data-testid=token-balance]')).toBeVisible()
  })

  test('should show total available credits', async ({ page }) => {
    await page.goto('/dashboard')

    // Get trial credits count
    const trialCredits = await page.locator('[data-testid=trial-credits]').textContent()
    const tokenBalance = await page.locator('[data-testid=token-balance]').textContent()

    // Calculate expected total
    const expectedTotal = Number(trialCredits) + Number(tokenBalance)

    // Verify total matches
    const totalCredits = await page.locator('[data-testid=total-credits]').textContent()
    expect(Number(totalCredits)).toBe(expectedTotal)
  })

  test('should initialize token account with zero balance', async ({ page }) => {
    // Register new user
    await page.goto('/register')

    const timestamp = Date.now()
    await page.fill('[name=email]', `token${timestamp}@example.com`)
    await page.fill('[name=password]', 'TokenPassword123!')
    await page.fill('[name=confirmPassword]', 'TokenPassword123!')
    await page.click('button[type=submit]')

    // Navigate to dashboard
    await page.goto('/dashboard')

    // Verify token balance is 0
    await expect(page.locator('[data-testid=token-balance]')).toHaveText('0')
  })
})