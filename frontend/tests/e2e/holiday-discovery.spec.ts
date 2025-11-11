/**
 * Holiday Decorator Discovery & First Generation E2E Tests
 *
 * Tests for User Story 1: New User Discovery & First Generation
 *
 * User Journey:
 * 1. Visit homepage during holiday season → See festive Hero component
 * 2. Click CTA → Navigate to /holiday page
 * 3. Enter address → Geocoding + Street View preview
 * 4. Rotate Street View to find best angle
 * 5. Select decoration style (Classic/Modern/Over-the-Top)
 * 6. Generate → Progress tracking → Results display
 * 7. Credit balance updates from 1 to 0
 *
 * These tests follow TDD (Test-Driven Development) approach:
 * - Tests written FIRST
 * - Tests should FAIL before implementation
 * - Implementation written to make tests PASS
 */

import { test, expect } from '@playwright/test';

// ============================================================================
// Test Configuration & Helpers
// ============================================================================

const TEST_ADDRESS = '1600 Amphitheatre Parkway, Mountain View, CA';
const HEADING_DEFAULT = 180; // Degrees
const STYLE_CLASSIC = 'classic';

/**
 * Helper: Mock authenticated session with holiday credits
 */
async function setupAuthenticatedUser(page: any) {
  // Set localStorage to simulate authenticated user with holiday credits
  await page.goto('/');
  await page.evaluate(() => {
    const mockUser = {
      id: 'test-user-id',
      email: 'test@yarda.ai',
      email_verified: true,
      trial_remaining: 3,
      holiday_credits: 1,  // Start with 1 holiday credit
      holiday_credits_earned: 1,
      whats_new_modal_shown: true,  // Skip "What's New" modal for this test
      subscription_tier: 'free',
      subscription_status: 'inactive',
    };

    localStorage.setItem('user-storage', JSON.stringify({
      state: {
        user: mockUser,
        accessToken: 'e2e-mock-token',
        isAuthenticated: true,
        tokenBalance: { balance: 0, trial_remaining: 3 },
      },
      version: 0,
    }));
  });

  // Reload to apply localStorage state
  await page.reload();
}

// ============================================================================
// Test Suite
// ============================================================================

test.describe('Holiday Decorator - User Story 1: Discovery & First Generation', () => {
  /**
   * T022-1: Verify homepage shows holiday hero during season
   *
   * EXPECTED TO FAIL until HolidayHero component is created
   */
  test('should show holiday hero on homepage during season', async ({ page }) => {
    await page.goto('/');

    // Wait for page load
    await page.waitForLoadState('networkidle');

    // Check for holiday hero component
    const heroSection = page.locator('[data-testid="holiday-hero"]');
    await expect(heroSection).toBeVisible();

    // Verify hero has video/animation
    const heroVideo = heroSection.locator('video, [data-testid="hero-animation"]');
    await expect(heroVideo).toBeVisible();

    // Verify hero has headline
    const headline = heroSection.locator('h1, [data-testid="hero-headline"]');
    await expect(headline).toContainText(/Transform Your Home.*Winter Wonderland/i);

    // Verify hero has CTA button (Link component, not button)
    const ctaButton = heroSection.locator('a:has-text("Get Started Free")');
    await expect(ctaButton).toBeVisible();
  });

  /**
   * T022-2: Verify clicking CTA navigates to holiday page
   *
   * EXPECTED TO FAIL until /holiday route is created
   */
  test('should navigate to holiday page when CTA clicked', async ({ page }) => {
    // Setup authenticated user first
    await setupAuthenticatedUser(page);

    await page.goto('/');

    // Click "Get Started Free" CTA (Link component)
    const ctaButton = page.locator('[data-testid="holiday-hero"] a:has-text("Get Started Free")');
    await ctaButton.click();

    // Verify redirect to /holiday page
    await expect(page).toHaveURL('/holiday');
  });

  /**
   * T022-3: Verify holiday page has address input and components
   *
   * EXPECTED TO FAIL until holiday.tsx page is created
   */
  test('should render holiday page with all components', async ({ page }) => {
    await setupAuthenticatedUser(page);
    await page.goto('/holiday');

    // Wait for page load
    await page.waitForLoadState('networkidle');

    // Verify address search input
    const addressInput = page.locator('input[placeholder*="address"], input[name="address"]');
    await expect(addressInput).toBeVisible();

    // Verify credit balance display
    const creditDisplay = page.locator('[data-testid="credit-display"]');
    await expect(creditDisplay).toBeVisible();
    await expect(creditDisplay).toContainText('1'); // User has 1 credit

    // Verify Street View rotator component (initially hidden until address entered)
    // Will become visible after geocoding

    // Verify style selector component (initially disabled)
    // Will become enabled after heading selected

    // Verify generate button (initially disabled)
    const generateButton = page.locator('button:has-text("Generate")');
    await expect(generateButton).toBeVisible();
    await expect(generateButton).toBeDisabled();
  });

  /**
   * T022-4: Complete generation flow end-to-end
   *
   * EXPECTED TO FAIL until full flow is implemented
   * This is the MAIN test for User Story 1
   */
  test('should complete full generation flow: address → rotation → style → generate → results', async ({ page }) => {
    await setupAuthenticatedUser(page);
    await page.goto('/holiday');

    // Step 1: Enter address
    const addressInput = page.locator('input[name="address"], input[placeholder*="address"]');
    await addressInput.fill(TEST_ADDRESS);
    await addressInput.press('Enter');

    // Wait for geocoding and Street View preview to load
    await page.waitForTimeout(2000); // Allow time for API calls

    // Verify Street View rotator appears
    const streetViewRotator = page.locator('[data-testid="street-view-rotator"]');
    await expect(streetViewRotator).toBeVisible();

    // Verify Street View preview image loads
    const previewImage = streetViewRotator.locator('img');
    await expect(previewImage).toBeVisible();

    // Step 2: Rotate Street View to adjust heading
    // Default heading should be 180 degrees
    const headingDisplay = page.locator('[data-testid="heading-display"]');
    await expect(headingDisplay).toContainText('180');

    // Wait for image to finish loading and page to stabilize
    await page.waitForTimeout(2000);

    // Click rotation button via JavaScript to bypass Next.js portal blocking
    // The portal intercepts pointer events, so we trigger the click programmatically
    await page.evaluate(() => {
      const button = document.querySelector('[data-testid="rotate-left"]') as HTMLButtonElement;
      if (button) {
        button.click();
      }
    });

    // Wait for state update to propagate and re-render
    await page.waitForTimeout(1000);

    // Verify heading changed (180 - 45 = 135)
    await expect(headingDisplay).toContainText('135');

    // Step 3: Select decoration style
    const styleSelector = page.locator('[data-testid="style-selector"]');
    await expect(styleSelector).toBeVisible();

    // Click "Classic" style card via JavaScript to bypass portal blocking
    await page.evaluate(() => {
      const button = document.querySelector('[data-testid="style-classic"]') as HTMLButtonElement;
      if (button) {
        button.click();
      }
    });

    // Wait for state update
    await page.waitForTimeout(500);

    // Verify style is selected (visual indicator - green border and background)
    const classicStyleCard = page.locator('[data-testid="style-classic"]');
    await expect(classicStyleCard).toHaveClass(/border-green-500|bg-green-50/);

    // Step 4: Generate button should now be enabled
    const generateButton = page.locator('button:has-text("Generate")');
    await expect(generateButton).toBeEnabled();

    // Click generate via JavaScript to bypass portal blocking
    await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const generateBtn = buttons.find(btn => btn.textContent?.includes('Generate'));
      if (generateBtn) {
        generateBtn.click();
      }
    });

    // Step 5: Progress tracking should appear inline (no navigation)
    const progressSection = page.locator('[data-testid="generation-progress"]');
    await expect(progressSection).toBeVisible();

    // Verify progress shows status (e.g., "Generating your decoration...")
    await expect(progressSection).toContainText(/Creating|Generating|Processing|In progress/i);

    // Wait for generation to complete (timeout: 2 minutes)
    await page.waitForTimeout(5000); // Initial wait for status update

    // Poll for completion (check every 2 seconds)
    let generationComplete = false;
    for (let i = 0; i < 60; i++) {  // Max 2 minutes (60 * 2s)
      const resultsSection = page.locator('[data-testid="generation-results"]');
      const isVisible = await resultsSection.isVisible();

      if (isVisible) {
        generationComplete = true;
        break;
      }

      await page.waitForTimeout(2000);
    }

    expect(generationComplete).toBe(true);

    // Step 6: Results should display inline (no navigation)
    const resultsSection = page.locator('[data-testid="generation-results"]');
    await expect(resultsSection).toBeVisible();

    // Verify before image (original)
    const beforeImage = resultsSection.locator('[data-testid="before-image"], img[alt*="before"]');
    await expect(beforeImage).toBeVisible();

    // Verify after image (decorated)
    const afterImage = resultsSection.locator('[data-testid="after-image"], img[alt*="after"]');
    await expect(afterImage).toBeVisible();

    // Verify before/after comparison image
    const comparisonImage = resultsSection.locator('[data-testid="before-after-image"]');
    await expect(comparisonImage).toBeVisible();

    // Step 7: Credit balance should update from 1 to 0
    const creditDisplay = page.locator('[data-testid="credit-display"]');
    await expect(creditDisplay).toContainText('0'); // Used 1 credit

    // Verify "Create New Design" button appears
    const newDesignButton = page.locator('button:has-text("Create New Design")');
    await expect(newDesignButton).toBeVisible();
  });

  /**
   * T022-5: Verify insufficient credits prevents generation
   *
   * EXPECTED TO FAIL until credit validation is implemented
   */
  test('should prevent generation when user has 0 credits', async ({ page }) => {
    // Setup user with 0 holiday credits
    await page.goto('/');
    await page.evaluate(() => {
      const mockUser = {
        id: 'test-user-id',
        email: 'test@yarda.ai',
        email_verified: true,
        trial_remaining: 3,
        holiday_credits: 0,  // NO holiday credits
        holiday_credits_earned: 0,
        whats_new_modal_shown: true,
        subscription_tier: 'free',
        subscription_status: 'inactive',
      };

      localStorage.setItem('user-storage', JSON.stringify({
        state: {
          user: mockUser,
          accessToken: 'e2e-mock-token',
          isAuthenticated: true,
          tokenBalance: { balance: 0, trial_remaining: 3 },
        },
        version: 0,
      }));
    });

    await page.reload();
    await page.goto('/holiday');

    // Enter address and select style (complete form)
    const addressInput = page.locator('input[name="address"]');
    await addressInput.fill(TEST_ADDRESS);
    await addressInput.press('Enter');

    await page.waitForTimeout(2000);

    // Wait for any Next.js portals to disappear before clicking
    await page.waitForLoadState('networkidle');

    const classicStyleCard = page.locator('[data-testid="style-classic"]');
    await classicStyleCard.click({ force: true }); // Use force to bypass portal blocking

    // Generate button should be disabled OR show "Insufficient Credits" message
    const generateButton = page.locator('button:has-text("Generate")');

    // Option 1: Button is disabled
    const isDisabled = await generateButton.isDisabled();

    // Option 2: Button shows error when clicked
    if (!isDisabled) {
      await generateButton.click();

      const errorMessage = page.locator('[data-testid="error-message"], .toast-error');
      await expect(errorMessage).toBeVisible();
      await expect(errorMessage).toContainText(/Insufficient.*credit/i);
    } else {
      expect(isDisabled).toBe(true);
    }
  });

  /**
   * T022-6: Meta-test to verify implementation exists
   *
   * This should FAIL until basic components are created
   */
  test('meta-test: verify holiday page implementation exists', async ({ page }) => {
    await setupAuthenticatedUser(page);
    await page.goto('/holiday');

    // Check for page title
    await expect(page).toHaveTitle(/Holiday.*Decorator|Yarda/i);

    // Check for main components (will fail until implemented)
    const addressInput = page.locator('input[name="address"]');
    await expect(addressInput).toBeVisible();

    const creditDisplay = page.locator('[data-testid="credit-display"]');
    await expect(creditDisplay).toBeVisible();

    // This test passes only when basic implementation exists
    // Before implementation, this should FAIL
  });
});
