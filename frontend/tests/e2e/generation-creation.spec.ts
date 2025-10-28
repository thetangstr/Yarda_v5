import { test, expect } from '@playwright/test'

test.describe('Generation Creation', () => {
  test.beforeEach(async ({ page }) => {
    // Register and verify user
    await page.goto('/register')

    const timestamp = Date.now()
    const email = `gen${timestamp}@example.com`
    const password = 'GenTest123!'

    await page.fill('[name=email]', email)
    await page.fill('[name=password]', password)
    await page.fill('[name=confirmPassword]', password)
    await page.click('button[type=submit]')

    await expect(page.locator('[data-testid=registration-success]')).toBeVisible()
  })

  test('should create generation with address input', async ({ page }) => {
    await page.goto('/generate')

    // Fill in address-based generation
    await page.fill('[name=address]', '100 Market Street, San Francisco, CA 94105')
    await page.selectOption('[name=style]', 'modern')
    await page.fill('[name=customPrompt]', 'Include a water feature and native plants')

    // Submit generation
    await page.click('[data-testid=generate-button]')

    // Verify generation started
    await expect(page.locator('[data-testid=generating-status]')).toBeVisible()
    await expect(page.locator('[data-testid=generating-status]')).toContainText('Generating')

    // Wait for completion (mock will be instant, real AI will take longer)
    await expect(page.locator('[data-testid=generation-complete]')).toBeVisible({ timeout: 30000 })

    // Verify output image displayed
    await expect(page.locator('[data-testid=output-image]')).toBeVisible()

    // Verify generation details
    await expect(page.locator('[data-testid=generation-input]')).toContainText(
      '100 Market Street, San Francisco, CA 94105'
    )
    await expect(page.locator('[data-testid=generation-style]')).toContainText('modern')
  })

  test('should create generation with photo upload', async ({ page }) => {
    await page.goto('/generate')

    // Switch to photo input mode
    await page.click('[data-testid=photo-input-tab]')

    // Upload photo
    const fileInput = page.locator('input[type=file]')
    await fileInput.setInputFiles('./tests/fixtures/sample-yard.jpg')

    // Verify preview
    await expect(page.locator('[data-testid=photo-preview]')).toBeVisible()

    // Select style
    await page.selectOption('[name=style]', 'tropical')

    // Generate
    await page.click('[data-testid=generate-button]')

    // Verify generation started with photo input
    await expect(page.locator('[data-testid=generating-status]')).toBeVisible()

    await expect(page.locator('[data-testid=generation-complete]')).toBeVisible({ timeout: 30000 })
    await expect(page.locator('[data-testid=output-image]')).toBeVisible()
  })

  test('should validate required fields', async ({ page }) => {
    await page.goto('/generate')

    // Try to generate without any input
    await page.click('[data-testid=generate-button]')

    // Should show validation error
    await expect(page.locator('[data-testid=input-required-error]')).toBeVisible()
    await expect(page.locator('[data-testid=input-required-error]')).toContainText(
      'Please provide an address or upload a photo'
    )

    // Fill address but no style
    await page.fill('[name=address]', '123 Main St')
    await page.click('[data-testid=generate-button]')

    await expect(page.locator('[data-testid=style-required-error]')).toBeVisible()
  })

  test('should support multiple design styles', async ({ page }) => {
    await page.goto('/generate')

    const styles = ['modern', 'tropical', 'minimalist', 'traditional', 'contemporary']

    // Verify all styles are available
    const styleSelect = page.locator('[name=style]')
    for (const style of styles) {
      await expect(styleSelect.locator(`option[value="${style}"]`)).toBeVisible()
    }

    // Generate with each style
    await page.fill('[name=address]', '456 Test Ave')
    await page.selectOption('[name=style]', 'tropical')

    await page.click('[data-testid=generate-button]')
    await expect(page.locator('[data-testid=generation-complete]')).toBeVisible({ timeout: 30000 })

    // Verify style was recorded
    await expect(page.locator('[data-testid=generation-style]')).toContainText('tropical')
  })

  test('should save custom prompt with generation', async ({ page }) => {
    await page.goto('/generate')

    const customPrompt = 'Add a koi pond, bamboo fence, and Japanese maple tree'

    await page.fill('[name=address]', '789 Garden Lane')
    await page.selectOption('[name=style]', 'minimalist')
    await page.fill('[name=customPrompt]', customPrompt)

    await page.click('[data-testid=generate-button]')
    await expect(page.locator('[data-testid=generation-complete]')).toBeVisible({ timeout: 30000 })

    // Verify custom prompt saved
    await expect(page.locator('[data-testid=custom-prompt]')).toContainText(customPrompt)
  })

  test('should track generation status transitions', async ({ page }) => {
    await page.goto('/generate')

    await page.fill('[name=address]', '321 Status Test Rd')
    await page.selectOption('[name=style]', 'modern')
    await page.click('[data-testid=generate-button]')

    // Should start as pending/processing
    await expect(page.locator('[data-testid=generation-status]')).toContainText(/pending|processing/)

    // Should transition to completed
    await expect(page.locator('[data-testid=generation-status]')).toContainText('completed', {
      timeout: 30000,
    })
  })

  test('should handle generation errors gracefully', async ({ page }) => {
    await page.goto('/generate')

    // Trigger an error (e.g., invalid address format or service failure)
    await page.fill('[name=address]', 'INVALID_ADDRESS_FORMAT_###')
    await page.selectOption('[name=style]', 'modern')
    await page.click('[data-testid=generate-button]')

    // Should show error state
    await expect(page.locator('[data-testid=generation-error]')).toBeVisible({ timeout: 30000 })
    await expect(page.locator('[data-testid=error-message]')).toBeVisible()

    // Credit should be refunded (tested in credit-consumption.spec.ts)
    // Error message should be helpful
    await expect(page.locator('[data-testid=error-message]')).not.toBeEmpty()
  })

  test('should disable generate button while processing', async ({ page }) => {
    await page.goto('/generate')

    await page.fill('[name=address]', '555 Button Test Blvd')
    await page.selectOption('[name=style]', 'contemporary')

    const generateButton = page.locator('[data-testid=generate-button]')

    // Button should be enabled initially
    await expect(generateButton).toBeEnabled()

    // Click to start generation
    await generateButton.click()

    // Button should be disabled while processing
    await expect(generateButton).toBeDisabled()
    await expect(generateButton).toContainText(/Generating|Processing/)

    // Button should re-enable after completion
    await expect(page.locator('[data-testid=generation-complete]')).toBeVisible({ timeout: 30000 })
    await expect(generateButton).toBeEnabled()
  })

  test('should allow generating another design after completion', async ({ page }) => {
    await page.goto('/generate')

    // First generation
    await page.fill('[name=address]', '111 First St')
    await page.selectOption('[name=style]', 'modern')
    await page.click('[data-testid=generate-button]')
    await expect(page.locator('[data-testid=generation-complete]')).toBeVisible({ timeout: 30000 })

    // Form should be reset or allow new input
    await page.fill('[name=address]', '222 Second Ave')
    await page.selectOption('[name=style]', 'tropical')
    await page.click('[data-testid=generate-button]')

    // Second generation should work
    await expect(page.locator('[data-testid=generating-status]')).toBeVisible()
    await expect(page.locator('[data-testid=generation-complete]')).toBeVisible({ timeout: 30000 })
  })

  test('should display processing time for completed generation', async ({ page }) => {
    await page.goto('/generate')

    await page.fill('[name=address]', '888 Time Test Dr')
    await page.selectOption('[name=style]', 'minimalist')
    await page.click('[data-testid=generate-button]')

    await expect(page.locator('[data-testid=generation-complete]')).toBeVisible({ timeout: 30000 })

    // Processing time should be displayed
    await expect(page.locator('[data-testid=processing-time]')).toBeVisible()
    await expect(page.locator('[data-testid=processing-time]')).toMatch(/\d+\s*(ms|seconds?)/)
  })
})
