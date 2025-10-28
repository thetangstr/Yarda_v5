import { test, expect } from '@playwright/test'

test.describe('Credit Consumption', () => {
  test.beforeEach(async ({ page }) => {
    // Register and login a new user for each test
    await page.goto('/register')

    const timestamp = Date.now()
    const email = `credit${timestamp}@example.com`
    const password = 'CreditTest123!'

    await page.fill('[name=email]', email)
    await page.fill('[name=password]', password)
    await page.fill('[name=confirmPassword]', password)
    await page.click('button[type=submit]')

    // Wait for registration success
    await expect(page.locator('[data-testid=registration-success]')).toBeVisible()
  })

  test('should consume trial credit when generating design', async ({ page }) => {
    // Navigate to generation page
    await page.goto('/generate')

    // Verify initial credit count is 3
    await expect(page.locator('[data-testid=trial-credits]')).toHaveText('3')

    // Upload photo or enter address
    await page.fill('[name=address]', '123 Main Street, San Francisco, CA')
    await page.selectOption('[name=style]', 'modern')

    // Generate design
    await page.click('[data-testid=generate-button]')

    // Wait for generation to start
    await expect(page.locator('[data-testid=generating-status]')).toBeVisible()

    // Wait for generation to complete
    await expect(page.locator('[data-testid=generation-complete]')).toBeVisible({ timeout: 30000 })

    // Verify credit was consumed (3 -> 2)
    await expect(page.locator('[data-testid=trial-credits]')).toHaveText('2')
  })

  test('should prioritize trial credits over tokens', async ({ page }) => {
    // Add some tokens to user account (simulate purchase)
    // This would need backend API call or test setup

    await page.goto('/generate')

    // Initial state: 3 trial + tokens
    const initialTrialCredits = await page.locator('[data-testid=trial-credits]').textContent()
    const initialTokenBalance = await page.locator('[data-testid=token-balance]').textContent()

    // Generate design
    await page.fill('[name=address]', '456 Oak Ave, Seattle, WA')
    await page.selectOption('[name=style]', 'tropical')
    await page.click('[data-testid=generate-button]')

    // Wait for completion
    await expect(page.locator('[data-testid=generation-complete]')).toBeVisible({ timeout: 30000 })

    // Verify trial credit was consumed, not token
    await expect(page.locator('[data-testid=trial-credits]')).toHaveText(
      String(Number(initialTrialCredits) - 1)
    )
    await expect(page.locator('[data-testid=token-balance]')).toHaveText(initialTokenBalance)
  })

  test('should refund credit if generation fails', async ({ page }) => {
    await page.goto('/generate')

    // Initial credits
    const initialCredits = await page.locator('[data-testid=trial-credits]').textContent()

    // Trigger generation that will fail (invalid input)
    await page.fill('[name=address]', '') // Empty address
    await page.click('[data-testid=generate-button]')

    // Wait for error
    await expect(page.locator('[data-testid=generation-error]')).toBeVisible()

    // Verify credit was refunded
    await expect(page.locator('[data-testid=trial-credits]')).toHaveText(initialCredits!)
  })

  test('should show insufficient credits error when out of credits', async ({ page }) => {
    await page.goto('/generate')

    // Consume all 3 trial credits
    for (let i = 0; i < 3; i++) {
      await page.fill('[name=address]', `${100 + i} Test St, Portland, OR`)
      await page.selectOption('[name=style]', 'modern')
      await page.click('[data-testid=generate-button]')
      await expect(page.locator('[data-testid=generation-complete]')).toBeVisible({ timeout: 30000 })
    }

    // Verify 0 credits remaining
    await expect(page.locator('[data-testid=trial-credits]')).toHaveText('0')

    // Try to generate with no credits
    await page.fill('[name=address]', '999 Final St, Denver, CO')
    await page.click('[data-testid=generate-button]')

    // Should show insufficient credits error
    await expect(page.locator('[data-testid=insufficient-credits-error]')).toBeVisible()
    await expect(page.locator('[data-testid=insufficient-credits-error]')).toContainText(
      'Insufficient credits'
    )
  })

  test('should update credit balance in real-time', async ({ page }) => {
    await page.goto('/generate')

    // Watch credit display
    const creditsDisplay = page.locator('[data-testid=trial-credits]')
    await expect(creditsDisplay).toHaveText('3')

    // Start generation
    await page.fill('[name=address]', '789 Pine Rd, Austin, TX')
    await page.selectOption('[name=style]', 'minimalist')
    await page.click('[data-testid=generate-button]')

    // Credit should be deducted immediately
    await expect(creditsDisplay).toHaveText('2')

    // Should remain 2 even while processing
    await expect(page.locator('[data-testid=generating-status]')).toBeVisible()
    await expect(creditsDisplay).toHaveText('2')
  })

  test('should display credit type used in generation', async ({ page }) => {
    await page.goto('/generate')

    // Generate design
    await page.fill('[name=address]', '321 Elm St, Boston, MA')
    await page.selectOption('[name=style]', 'contemporary')
    await page.click('[data-testid=generate-button]')

    // Wait for completion
    await expect(page.locator('[data-testid=generation-complete]')).toBeVisible({ timeout: 30000 })

    // Navigate to history
    await page.goto('/history')

    // Most recent generation should show credit type
    const firstGeneration = page.locator('[data-testid=generation-card]').first()
    await expect(firstGeneration.locator('[data-testid=credit-type]')).toHaveText('trial')
  })
})
