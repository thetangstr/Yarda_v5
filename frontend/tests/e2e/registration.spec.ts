import { test, expect } from '@playwright/test'

test.describe('User Registration', () => {
  test('should register new user with valid email and password', async ({ page }) => {
    // Navigate to registration page
    await page.goto('/register')

    // Fill registration form
    const timestamp = Date.now()
    const email = `test${timestamp}@example.com`
    const password = 'SecurePassword123!'

    await page.fill('[name=email]', email)
    await page.fill('[name=password]', password)
    await page.fill('[name=confirmPassword]', password)

    // Submit form
    await page.click('button[type=submit]')

    // Wait for success message
    await expect(page.locator('[data-testid=registration-success]')).toBeVisible()

    // Verify redirect to email verification page
    await expect(page).toHaveURL(/\/verify-email/)
  })

  test('should show error for invalid email', async ({ page }) => {
    await page.goto('/register')

    await page.fill('[name=email]', 'invalid-email')
    await page.fill('[name=password]', 'Password123!')
    await page.click('button[type=submit]')

    // Should show validation error
    await expect(page.locator('[data-testid=email-error]')).toBeVisible()
  })

  test('should show error for weak password', async ({ page }) => {
    await page.goto('/register')

    await page.fill('[name=email]', 'test@example.com')
    await page.fill('[name=password]', '123') // Too short
    await page.click('button[type=submit]')

    // Should show validation error
    await expect(page.locator('[data-testid=password-error]')).toBeVisible()
  })

  test('should show error for password mismatch', async ({ page }) => {
    await page.goto('/register')

    await page.fill('[name=email]', 'test@example.com')
    await page.fill('[name=password]', 'Password123!')
    await page.fill('[name=confirmPassword]', 'DifferentPassword123!')
    await page.click('button[type=submit]')

    // Should show validation error
    await expect(page.locator('[data-testid=password-mismatch-error]')).toBeVisible()
  })

  test('should show error for duplicate email', async ({ page }) => {
    await page.goto('/register')

    // Use a known existing email
    await page.fill('[name=email]', 'existing@example.com')
    await page.fill('[name=password]', 'Password123!')
    await page.click('button[type=submit]')

    // Should show error that email already exists
    await expect(page.locator('[data-testid=duplicate-email-error]')).toBeVisible()
  })
})