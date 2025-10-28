import { test, expect } from '@playwright/test'

test.describe('Rate Limiting', () => {
  test.beforeEach(async ({ page }) => {
    // Register and verify user
    await page.goto('/register')

    const timestamp = Date.now()
    const email = `ratelimit${timestamp}@example.com`
    const password = 'RateLimit123!'

    await page.fill('[name=email]', email)
    await page.fill('[name=password]', password)
    await page.fill('[name=confirmPassword]', password)
    await page.click('button[type=submit]')

    await expect(page.locator('[data-testid=registration-success]')).toBeVisible()
  })

  test('should allow 3 generations within 60 seconds', async ({ page }) => {
    await page.goto('/generate')

    // Create 3 rapid generations
    for (let i = 0; i < 3; i++) {
      await page.fill('[name=address]', `${100 + i} Rate Test St`)
      await page.selectOption('[name=style]', 'modern')
      await page.click('[data-testid=generate-button]')

      // Wait a moment for generation to start
      await page.waitForTimeout(500)

      // Should succeed
      await expect(page.locator('[data-testid=generating-status]')).toBeVisible()
    }
  })

  test('should block 4th generation within 60 seconds', async ({ page }) => {
    await page.goto('/generate')

    // Make 3 rapid generations
    for (let i = 0; i < 3; i++) {
      await page.fill('[name=address]', `${i} Quick Gen St`)
      await page.selectOption('[name=style]', 'modern')
      await page.click('[data-testid=generate-button]')
      await page.waitForTimeout(300)
    }

    // 4th attempt should be rate limited
    await page.fill('[name=address]', '999 Blocked St')
    await page.selectOption('[name=style]', 'modern')
    await page.click('[data-testid=generate-button]')

    // Should show rate limit error
    await expect(page.locator('[data-testid=rate-limit-error]')).toBeVisible()
    await expect(page.locator('[data-testid=rate-limit-error]')).toContainText(
      /rate limit|too many requests|try again/i
    )
  })

  test('should display rate limit alert with retry timer', async ({ page }) => {
    await page.goto('/generate')

    // Trigger rate limit
    for (let i = 0; i < 3; i++) {
      await page.fill('[name=address]', `${i} Timer Test Rd`)
      await page.selectOption('[name=style]', 'modern')
      await page.click('[data-testid=generate-button]')
      await page.waitForTimeout(200)
    }

    // 4th attempt
    await page.fill('[name=address]', '4th Attempt Ave')
    await page.click('[data-testid=generate-button]')

    // Should show alert with timer
    await expect(page.locator('[data-testid=rate-limit-alert]')).toBeVisible()
    await expect(page.locator('[data-testid=retry-timer]')).toBeVisible()
    await expect(page.locator('[data-testid=retry-timer]')).toMatch(/\d+\s*seconds?/)
  })

  test('should disable generate button when rate limited', async ({ page }) => {
    await page.goto('/generate')

    // Trigger rate limit
    for (let i = 0; i < 3; i++) {
      await page.fill('[name=address]', `${i} Button Test Ln`)
      await page.selectOption('[name=style]', 'modern')
      await page.click('[data-testid=generate-button]')
      await page.waitForTimeout(200)
    }

    // Try 4th
    await page.fill('[name=address]', 'Should Be Disabled St')
    await page.click('[data-testid=generate-button]')

    // Button should be disabled
    await expect(page.locator('[data-testid=generate-button]')).toBeDisabled()
  })

  test('should allow generation after 60 seconds', async ({ page }) => {
    test.setTimeout(90000) // Extend timeout for this test

    await page.goto('/generate')

    // Make 3 generations
    for (let i = 0; i < 3; i++) {
      await page.fill('[name=address]', `${i} Wait Test Blvd`)
      await page.selectOption('[name=style]', 'modern')
      await page.click('[data-testid=generate-button]')
      await page.waitForTimeout(200)
    }

    // Wait for rate limit window to expire (65 seconds to be safe)
    await page.waitForTimeout(65000)

    // Should now be able to generate again
    await page.fill('[name=address]', 'After Wait Generation')
    await page.selectOption('[name=style]', 'modern')
    await page.click('[data-testid=generate-button]')

    // Should succeed
    await expect(page.locator('[data-testid=generating-status]')).toBeVisible()
    await expect(page.locator('[data-testid=rate-limit-error]')).not.toBeVisible()
  })

  test('should show remaining requests count', async ({ page }) => {
    await page.goto('/generate')

    // Should show "3 remaining"
    await expect(page.locator('[data-testid=requests-remaining]')).toContainText('3')

    // Make 1 generation
    await page.fill('[name=address]', '1st Generation Ave')
    await page.selectOption('[name=style]', 'modern')
    await page.click('[data-testid=generate-button]')
    await page.waitForTimeout(500)

    // Should show "2 remaining"
    await expect(page.locator('[data-testid=requests-remaining]')).toContainText('2')

    // Make another
    await page.fill('[name=address]', '2nd Generation St')
    await page.click('[data-testid=generate-button]')
    await page.waitForTimeout(500)

    // Should show "1 remaining"
    await expect(page.locator('[data-testid=requests-remaining]')).toContainText('1')
  })

  test('should update timer countdown in real-time', async ({ page }) => {
    await page.goto('/generate')

    // Trigger rate limit
    for (let i = 0; i < 3; i++) {
      await page.fill('[name=address]', `${i} Countdown Test`)
      await page.selectOption('[name=style]', 'modern')
      await page.click('[data-testid=generate-button]')
      await page.waitForTimeout(200)
    }

    // Trigger 4th
    await page.fill('[name=address]', '4th Countdown')
    await page.click('[data-testid=generate-button]')

    // Get initial timer value
    const timer = page.locator('[data-testid=retry-timer]')
    const initialText = await timer.textContent()
    const initialSeconds = parseInt(initialText?.match(/\d+/)?.[0] || '0')

    // Wait 3 seconds
    await page.waitForTimeout(3000)

    // Timer should have decreased
    const newText = await timer.textContent()
    const newSeconds = parseInt(newText?.match(/\d+/)?.[0] || '0')

    expect(newSeconds).toBeLessThan(initialSeconds)
  })

  test('should clear rate limit alert when timer expires', async ({ page }) => {
    test.setTimeout(90000)

    await page.goto('/generate')

    // Trigger rate limit
    for (let i = 0; i < 3; i++) {
      await page.fill('[name=address]', `${i} Clear Test`)
      await page.selectOption('[name=style]', 'modern')
      await page.click('[data-testid=generate-button]')
      await page.waitForTimeout(200)
    }

    await page.fill('[name=address]', '4th Clear Test')
    await page.click('[data-testid=generate-button]')

    // Alert should be visible
    await expect(page.locator('[data-testid=rate-limit-alert]')).toBeVisible()

    // Wait for window to expire
    await page.waitForTimeout(65000)

    // Alert should be gone
    await expect(page.locator('[data-testid=rate-limit-alert]')).not.toBeVisible()

    // Button should be enabled
    await expect(page.locator('[data-testid=generate-button]')).toBeEnabled()
  })
})
