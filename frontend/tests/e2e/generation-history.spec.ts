import { test, expect } from '@playwright/test'

test.describe('Generation History', () => {
  test.beforeEach(async ({ page }) => {
    // Register and verify user
    await page.goto('/register')

    const timestamp = Date.now()
    const email = `history${timestamp}@example.com`
    const password = 'HistoryTest123!'

    await page.fill('[name=email]', email)
    await page.fill('[name=password]', password)
    await page.fill('[name=confirmPassword]', password)
    await page.click('button[type=submit]')

    await expect(page.locator('[data-testid=registration-success]')).toBeVisible()
  })

  test('should display all user generations in history', async ({ page }) => {
    // Create 3 generations
    for (let i = 0; i < 3; i++) {
      await page.goto('/generate')
      await page.fill('[name=address]', `${100 + i} Test Street, City ${i}`)
      await page.selectOption('[name=style]', 'modern')
      await page.click('[data-testid=generate-button]')
      await expect(page.locator('[data-testid=generation-complete]')).toBeVisible({ timeout: 30000 })
    }

    // Navigate to history
    await page.goto('/history')

    // Should show all 3 generations
    const generationCards = page.locator('[data-testid=generation-card]')
    await expect(generationCards).toHaveCount(3)
  })

  test('should show generation details in history card', async ({ page }) => {
    // Create one generation
    await page.goto('/generate')
    const address = '456 History Lane, San Francisco, CA'
    const style = 'tropical'
    const customPrompt = 'Add palm trees and tropical flowers'

    await page.fill('[name=address]', address)
    await page.selectOption('[name=style]', style)
    await page.fill('[name=customPrompt]', customPrompt)
    await page.click('[data-testid=generate-button]')
    await expect(page.locator('[data-testid=generation-complete]')).toBeVisible({ timeout: 30000 })

    // Navigate to history
    await page.goto('/history')

    // First card should show details
    const firstCard = page.locator('[data-testid=generation-card]').first()
    await expect(firstCard).toContainText(address)
    await expect(firstCard).toContainText(style)
    await expect(firstCard).toContainText(customPrompt)
  })

  test('should display generation status in history', async ({ page }) => {
    await page.goto('/generate')
    await page.fill('[name=address]', '789 Status Test Blvd')
    await page.selectOption('[name=style]', 'minimalist')
    await page.click('[data-testid=generate-button]')
    await expect(page.locator('[data-testid=generation-complete]')).toBeVisible({ timeout: 30000 })

    await page.goto('/history')

    // Should show completed status
    const statusBadge = page.locator('[data-testid=generation-status]').first()
    await expect(statusBadge).toContainText('completed')
  })

  test('should show credit type used in history', async ({ page }) => {
    await page.goto('/generate')
    await page.fill('[name=address]', '321 Credit Test Ave')
    await page.selectOption('[name=style]', 'contemporary')
    await page.click('[data-testid=generate-button]')
    await expect(page.locator('[data-testid=generation-complete]')).toBeVisible({ timeout: 30000 })

    await page.goto('/history')

    // Should show trial credit type
    const creditType = page.locator('[data-testid=credit-type]').first()
    await expect(creditType).toContainText('trial')
  })

  test('should display generations in reverse chronological order', async ({ page }) => {
    // Create 3 generations with different addresses
    const addresses = ['First Generation St', 'Second Generation Ave', 'Third Generation Blvd']

    for (const address of addresses) {
      await page.goto('/generate')
      await page.fill('[name=address]', address)
      await page.selectOption('[name=style]', 'modern')
      await page.click('[data-testid=generate-button]')
      await expect(page.locator('[data-testid=generation-complete]')).toBeVisible({ timeout: 30000 })
    }

    await page.goto('/history')

    // Most recent should be first (Third Generation Blvd)
    const firstCard = page.locator('[data-testid=generation-card]').first()
    await expect(firstCard).toContainText('Third Generation Blvd')

    // Oldest should be last
    const lastCard = page.locator('[data-testid=generation-card]').last()
    await expect(lastCard).toContainText('First Generation St')
  })

  test('should show empty state when no generations exist', async ({ page }) => {
    await page.goto('/history')

    // Should show empty state
    await expect(page.locator('[data-testid=empty-history]')).toBeVisible()
    await expect(page.locator('[data-testid=empty-history]')).toContainText('No generations yet')

    // Should have CTA to create first generation
    await expect(page.locator('[data-testid=create-first-generation]')).toBeVisible()
  })

  test('should support pagination for large history', async ({ page }) => {
    // Create more than one page of generations (assuming 10 per page)
    for (let i = 0; i < 15; i++) {
      await page.goto('/generate')
      await page.fill('[name=address]', `Generation ${i} Street`)
      await page.selectOption('[name=style]', 'modern')
      await page.click('[data-testid=generate-button]')
      await expect(page.locator('[data-testid=generation-complete]')).toBeVisible({ timeout: 30000 })
    }

    await page.goto('/history')

    // First page should show 10 generations
    const firstPageCards = page.locator('[data-testid=generation-card]')
    await expect(firstPageCards).toHaveCount(10)

    // Should have pagination controls
    await expect(page.locator('[data-testid=pagination-next]')).toBeVisible()

    // Click next page
    await page.click('[data-testid=pagination-next]')

    // Should show remaining 5 generations
    await expect(firstPageCards).toHaveCount(5)
  })

  test('should filter by status', async ({ page }) => {
    // Create completed and failed generations
    // (Would need to mock or trigger failures)
    await page.goto('/generate')
    await page.fill('[name=address]', '111 Filter Test St')
    await page.selectOption('[name=style]', 'modern')
    await page.click('[data-testid=generate-button]')
    await expect(page.locator('[data-testid=generation-complete]')).toBeVisible({ timeout: 30000 })

    await page.goto('/history')

    // Select filter
    await page.selectOption('[data-testid=status-filter]', 'completed')

    // Should only show completed generations
    const statusBadges = page.locator('[data-testid=generation-status]')
    const count = await statusBadges.count()
    for (let i = 0; i < count; i++) {
      await expect(statusBadges.nth(i)).toContainText('completed')
    }
  })

  test('should show generation details in modal', async ({ page }) => {
    await page.goto('/generate')
    const address = '999 Modal Test Dr'
    const style = 'tropical'
    const customPrompt = 'Include a waterfall feature'

    await page.fill('[name=address]', address)
    await page.selectOption('[name=style]', style)
    await page.fill('[name=customPrompt]', customPrompt)
    await page.click('[data-testid=generate-button]')
    await expect(page.locator('[data-testid=generation-complete]')).toBeVisible({ timeout: 30000 })

    await page.goto('/history')

    // Click on generation card to open modal
    await page.locator('[data-testid=generation-card]').first().click()

    // Modal should open
    await expect(page.locator('[data-testid=generation-modal]')).toBeVisible()

    // Should show all details
    await expect(page.locator('[data-testid=modal-address]')).toContainText(address)
    await expect(page.locator('[data-testid=modal-style]')).toContainText(style)
    await expect(page.locator('[data-testid=modal-prompt]')).toContainText(customPrompt)
    await expect(page.locator('[data-testid=modal-status]')).toContainText('completed')
    await expect(page.locator('[data-testid=modal-credit-type]')).toContainText('trial')
    await expect(page.locator('[data-testid=modal-processing-time]')).toBeVisible()
    await expect(page.locator('[data-testid=modal-output-image]')).toBeVisible()
  })

  test('should close modal when clicking close button', async ({ page }) => {
    // Create generation
    await page.goto('/generate')
    await page.fill('[name=address]', '888 Close Test Ln')
    await page.selectOption('[name=style]', 'modern')
    await page.click('[data-testid=generate-button]')
    await expect(page.locator('[data-testid=generation-complete]')).toBeVisible({ timeout: 30000 })

    await page.goto('/history')

    // Open modal
    await page.locator('[data-testid=generation-card]').first().click()
    await expect(page.locator('[data-testid=generation-modal]')).toBeVisible()

    // Close modal
    await page.click('[data-testid=close-modal]')
    await expect(page.locator('[data-testid=generation-modal]')).not.toBeVisible()
  })

  test('should show processing time for each generation', async ({ page }) => {
    await page.goto('/generate')
    await page.fill('[name=address]', '777 Time Test Way')
    await page.selectOption('[name=style]', 'minimalist')
    await page.click('[data-testid=generate-button]')
    await expect(page.locator('[data-testid=generation-complete]')).toBeVisible({ timeout: 30000 })

    await page.goto('/history')

    // Should show processing time
    const processingTime = page.locator('[data-testid=processing-time]').first()
    await expect(processingTime).toBeVisible()
    await expect(processingTime).toMatch(/\d+\s*(ms|seconds?|minutes?)/)
  })

  test('should display thumbnail images in history cards', async ({ page }) => {
    await page.goto('/generate')
    await page.fill('[name=address]', '555 Image Test Rd')
    await page.selectOption('[name=style]', 'contemporary')
    await page.click('[data-testid=generate-button]')
    await expect(page.locator('[data-testid=generation-complete]')).toBeVisible({ timeout: 30000 })

    await page.goto('/history')

    // Should show thumbnail
    const thumbnail = page.locator('[data-testid=generation-thumbnail]').first()
    await expect(thumbnail).toBeVisible()
    await expect(thumbnail).toHaveAttribute('src', /.+/)
  })
})
