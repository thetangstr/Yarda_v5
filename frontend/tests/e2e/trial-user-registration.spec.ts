/**
 * E2E Tests for User Story 1: Trial User Registration and First Generation
 *
 * Test Scenarios:
 * - TC-REG-1.1: User registers with email/password and receives 3 trial credits
 * - TC-REG-1.3: Email verification within 30 seconds
 * - TC-UI-1.1: Real-time trial counter displays correctly
 * - TC-UI-1.2: Trial exhausted modal when trial_remaining=0
 *
 * Requirements: FR-001 to FR-010 (Auth), FR-011 to FR-016 (Trial)
 */

import { test, expect } from '@playwright/test';

// Test data
const generateTestEmail = () => `test-${Date.now()}@yarda-test.com`;
const testPassword = 'SecurePassword123!';

test.describe('User Story 1: Trial User Registration', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to home page
    await page.goto('/');
  });

  test('TC-REG-1.1: User registers and receives 3 trial credits', async ({ page }) => {
    const testEmail = generateTestEmail();

    // Step 1: Click "Get Started Free" button
    await page.click('text=Get Started Free');

    // Step 2: Fill registration form
    await expect(page).toHaveURL(/.*register/);
    await page.fill('input[name="email"]', testEmail);
    await page.fill('input[name="password"]', testPassword);
    await page.fill('input[name="confirmPassword"]', testPassword);

    // Step 3: Submit registration
    await page.click('button[type="submit"]:has-text("Create Account")');

    // Step 4: Verify trial credits initialization
    await expect(page.locator('[data-testid="trial-counter"]')).toContainText('3 trial credits');

    // Step 5: Verify success message mentions trial credits
    await expect(page.locator('[data-testid="success-message"]')).toContainText(
      'You have 3 free trial credits to try Yarda'
    );

    // Step 6: Verify email verification prompt
    await expect(page.locator('[data-testid="verification-prompt"]')).toContainText(
      'Check your email to verify your account'
    );
  });

  test('TC-REG-1.4: Duplicate email registration is prevented', async ({ page }) => {
    const testEmail = generateTestEmail();

    // Register once
    await page.goto('/register');
    await page.fill('input[name="email"]', testEmail);
    await page.fill('input[name="password"]', testPassword);
    await page.fill('input[name="confirmPassword"]', testPassword);
    await page.click('button[type="submit"]');

    // Wait for success
    await expect(page.locator('[data-testid="trial-counter"]')).toBeVisible();

    // Log out
    await page.click('[data-testid="user-menu"]');
    await page.click('text=Logout');

    // Try to register again with same email
    await page.goto('/register');
    await page.fill('input[name="email"]', testEmail);
    await page.fill('input[name="password"]', testPassword);
    await page.fill('input[name="confirmPassword"]', testPassword);
    await page.click('button[type="submit"]');

    // Verify error message
    await expect(page.locator('[data-testid="error-message"]')).toContainText(
      'An account with this email already exists'
    );
  });

  test('TC-UI-1.1: Trial counter displays and updates correctly', async ({ page }) => {
    const testEmail = generateTestEmail();

    // Register user
    await page.goto('/register');
    await page.fill('input[name="email"]', testEmail);
    await page.fill('input[name="password"]', testPassword);
    await page.fill('input[name="confirmPassword"]', testPassword);
    await page.click('button[type="submit"]');

    // Verify trial counter shows 3
    const trialCounter = page.locator('[data-testid="trial-counter"]');
    await expect(trialCounter).toContainText('3');

    // Skip email verification for testing (backend should allow this in test mode)
    // OR mock the verification endpoint

    // Navigate to generate page
    await page.goto('/generate');

    // Fill generation form
    await page.fill('input[name="address"]', '123 Test Street, San Francisco, CA');
    await page.selectOption('select[name="area"]', 'front_yard');
    await page.selectOption('select[name="style"]', 'modern_minimalist');

    // Submit generation
    await page.click('button[type="submit"]:has-text("Generate Design")');

    // Wait for generation to complete (may take 30-60 seconds)
    await expect(page.locator('[data-testid="generation-status"]')).toContainText(
      'completed',
      { timeout: 90000 }
    );

    // Verify trial counter decreased to 2
    await expect(trialCounter).toContainText('2');

    // Verify trial counter in navbar also updated
    await expect(page.locator('[data-testid="navbar-trial-counter"]')).toContainText('2');
  });

  test('TC-UI-1.2: Trial exhausted modal displays when trial_remaining=0', async ({ page }) => {
    const testEmail = generateTestEmail();

    // Register user
    await page.goto('/register');
    await page.fill('input[name="email"]', testEmail);
    await page.fill('input[name="password"]', testPassword);
    await page.fill('input[name="confirmPassword"]', testPassword);
    await page.click('button[type="submit"]');

    // Generate 3 designs to exhaust trial credits
    for (let i = 0; i < 3; i++) {
      await page.goto('/generate');
      await page.fill('input[name="address"]', `${i+1} Test Street, SF, CA`);
      await page.selectOption('select[name="area"]', 'front_yard');
      await page.selectOption('select[name="style"]', 'modern_minimalist');
      await page.click('button[type="submit"]');

      // Wait for completion
      await expect(page.locator('[data-testid="generation-status"]')).toContainText(
        'completed',
        { timeout: 90000 }
      );

      // Verify trial counter decreased
      await expect(page.locator('[data-testid="trial-counter"]')).toContainText(
        `${2 - i}`
      );
    }

    // Verify trial counter shows 0
    await expect(page.locator('[data-testid="trial-counter"]')).toContainText('0');

    // Try to generate another design
    await page.goto('/generate');
    await page.fill('input[name="address"]', '4 Test Street, SF, CA');
    await page.selectOption('select[name="area"]', 'front_yard');
    await page.selectOption('select[name="style"]', 'modern_minimalist');
    await page.click('button[type="submit"]');

    // Verify trial exhausted modal appears
    const modal = page.locator('[data-testid="trial-exhausted-modal"]');
    await expect(modal).toBeVisible();
    await expect(modal).toContainText('Your trial credits are exhausted');

    // Verify modal has "Purchase Tokens" button
    await expect(modal.locator('button:has-text("Purchase Tokens")')).toBeVisible();

    // Verify modal has "Learn About Subscriptions" button
    await expect(modal.locator('button:has-text("Learn About Subscriptions")')).toBeVisible();

    // Verify generation was blocked (no generation status)
    await expect(page.locator('[data-testid="generation-status"]')).not.toBeVisible();
  });

  test('TC-AUTH-1.3: Generation is blocked when trial_remaining=0', async ({ page }) => {
    const testEmail = generateTestEmail();

    // Register user
    await page.goto('/register');
    await page.fill('input[name="email"]', testEmail);
    await page.fill('input[name="password"]', testPassword);
    await page.fill('input[name="confirmPassword"]', testPassword);
    await page.click('button[type="submit"]');

    // Manually set trial_remaining to 0 via backend API (for faster testing)
    // In real scenario, user would exhaust credits normally
    await page.evaluate(async (email) => {
      // This would be a test helper endpoint: POST /test/set-trial-remaining
      await fetch(`${process.env.NEXT_PUBLIC_API_URL}/test/set-trial-remaining`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, trial_remaining: 0 }),
      });
    }, testEmail);

    // Refresh page to update trial counter
    await page.reload();

    // Verify trial counter shows 0
    await expect(page.locator('[data-testid="trial-counter"]')).toContainText('0');

    // Navigate to generate page
    await page.goto('/generate');

    // Verify generate button is disabled
    const generateButton = page.locator('button[type="submit"]:has-text("Generate Design")');
    await expect(generateButton).toBeDisabled();

    // Verify message explaining why button is disabled
    await expect(page.locator('[data-testid="disabled-reason"]')).toContainText(
      'You have no trial credits remaining'
    );
  });

  test('TC-REG-1.5: Email format validation on registration', async ({ page }) => {
    await page.goto('/register');

    // Test invalid email formats
    const invalidEmails = [
      'notanemail',
      'missing@domain',
      '@nodomain.com',
      'spaces in@email.com',
    ];

    for (const email of invalidEmails) {
      await page.fill('input[name="email"]', email);
      await page.fill('input[name="password"]', testPassword);
      await page.fill('input[name="confirmPassword"]', testPassword);
      await page.click('button[type="submit"]');

      // Verify validation error
      await expect(page.locator('[data-testid="email-error"]')).toContainText(
        'Please enter a valid email address'
      );

      // Clear form for next test
      await page.fill('input[name="email"]', '');
    }
  });

  test('TC-REG-1.6: Password minimum 8 characters validation', async ({ page }) => {
    const testEmail = generateTestEmail();

    await page.goto('/register');

    // Test short password
    await page.fill('input[name="email"]', testEmail);
    await page.fill('input[name="password"]', 'Short1');
    await page.fill('input[name="confirmPassword"]', 'Short1');
    await page.click('button[type="submit"]');

    // Verify validation error
    await expect(page.locator('[data-testid="password-error"]')).toContainText(
      'Password must be at least 8 characters'
    );
  });
});

test.describe('User Story 1: Email Verification', () => {
  test('TC-REG-1.3: Email verification link expires after 24 hours', async ({ page }) => {
    // This test would require mocking time or using a backend test endpoint
    // to create an expired verification token

    // Navigate with expired token
    await page.goto('/verify-email?token=expired-token-123');

    // Verify error message
    await expect(page.locator('[data-testid="error-message"]')).toContainText(
      'Verification link has expired'
    );

    // Verify "Resend Verification" button is available
    await expect(page.locator('button:has-text("Resend Verification")')).toBeVisible();
  });

  test('TC-REG-1.7: Resend verification email (rate limited to 3 per hour)', async ({ page }) => {
    const testEmail = generateTestEmail();

    // Register user
    await page.goto('/register');
    await page.fill('input[name="email"]', testEmail);
    await page.fill('input[name="password"]', testPassword);
    await page.fill('input[name="confirmPassword"]', testPassword);
    await page.click('button[type="submit"]');

    // Click "Resend Verification" 3 times
    for (let i = 0; i < 3; i++) {
      await page.click('button:has-text("Resend Verification")');
      await expect(page.locator('[data-testid="success-message"]')).toContainText(
        'Verification email sent'
      );
    }

    // Try 4th time - should be rate limited
    await page.click('button:has-text("Resend Verification")');
    await expect(page.locator('[data-testid="error-message"]')).toContainText(
      'Too many requests. Please try again in'
    );
  });
});
