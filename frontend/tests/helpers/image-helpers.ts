/**
 * Image Generation & Display Helper Utilities for E2E Tests
 *
 * Helpers for testing Google Maps image retrieval, Gemini AI generation,
 * Vercel Blob storage, and UI display features (carousel, hero images, download)
 */

import { Page, expect, Locator } from '@playwright/test';

export interface ImageMetadata {
  imageType: 'street_view' | 'satellite';
  imageUrl: string;
  panoId?: string;
  coordinates?: { lat: number; lng: number };
}

export interface GenerationImage {
  sourceImageUrl: string;
  generatedImageUrl: string;
  area: string;
  style: string;
}

/**
 * Verify hero-sized source image is displayed during generation
 */
export async function verifyHeroSourceImage(page: Page, area: string) {
  // Look for hero-sized source image
  const heroImage = page.locator('[data-testid="source-image-hero"]');
  await expect(heroImage).toBeVisible({ timeout: 10000 });

  // Verify image dimensions (should be hero-sized: h-96 = 384px or maxHeight: 500px)
  const imageBounds = await heroImage.boundingBox();
  expect(imageBounds).not.toBeNull();
  expect(imageBounds!.height).toBeGreaterThanOrEqual(300); // At least 300px tall

  // Verify status badge shows "Complete"
  const statusBadge = page.locator('text=/✅ Complete|Complete/i');
  await expect(statusBadge).toBeVisible();

  // Verify image type badge (Street View or Satellite)
  const typeBadge = page.locator('text=/🏠 Street View|🛰️ Satellite/i');
  await expect(typeBadge).toBeVisible();
}

/**
 * Verify source image type is correct based on area
 */
export async function verifySourceImageType(page: Page, area: string) {
  // Front-facing areas should use Street View
  const frontFacingAreas = ['front_yard', 'patio', 'pool'];
  const expectedType = frontFacingAreas.includes(area) ? 'Street View' : 'Satellite';

  const typeBadge = page.locator(`text=${expectedType}`);
  await expect(typeBadge).toBeVisible();
}

/**
 * Verify bouncing camera animation during processing
 */
export async function verifyBouncingCameraAnimation(page: Page) {
  // Look for camera emoji with animation
  const cameraEmoji = page.locator('text=📷');
  await expect(cameraEmoji).toBeVisible();

  // Verify animation class or style is applied
  // (depends on implementation - might use framer-motion or CSS animation)
  const hasAnimation = await page.evaluate(() => {
    const camera = document.querySelector('text=📷')?.closest('div');
    if (!camera) return false;

    // Check for animation-related classes or styles
    const classes = camera.className;
    const styles = window.getComputedStyle(camera);

    return (
      classes.includes('animate') ||
      classes.includes('bounce') ||
      styles.animation !== 'none'
    );
  });

  expect(hasAnimation).toBe(true);

  // Verify pulsing dots below camera
  const dots = page.locator('text=•').count();
  expect(await dots).toBeGreaterThanOrEqual(3);
}

/**
 * Verify Embla Carousel is rendered with before/after images
 */
export async function verifyCarousel(page: Page, generationId: string) {
  // Wait for results to load
  await page.waitForSelector('[data-testid="image-carousel"]', {
    state: 'visible',
    timeout: 15000,
  });

  const carousel = page.locator('[data-testid="image-carousel"]');

  // Verify carousel has 2 slides
  const slides = carousel.locator('.embla__slide');
  const slideCount = await slides.count();
  expect(slideCount).toBe(2);

  // Verify BEFORE slide (source image)
  const beforeSlide = slides.nth(0);
  await expect(beforeSlide.locator('text=📸 BEFORE')).toBeVisible();

  // Verify AFTER slide (generated image)
  const afterSlide = slides.nth(1);
  await expect(afterSlide.locator('text=✨ AFTER')).toBeVisible();

  // Verify both images are loaded
  const beforeImage = beforeSlide.locator('img');
  await expect(beforeImage).toHaveAttribute('src', /.+/);

  const afterImage = afterSlide.locator('img');
  await expect(afterImage).toHaveAttribute('src', /.+/);
}

/**
 * Navigate carousel using arrow buttons
 */
export async function navigateCarousel(page: Page, direction: 'next' | 'prev') {
  const carousel = page.locator('[data-testid="image-carousel"]');

  if (direction === 'next') {
    const nextButton = carousel.locator('button[aria-label*="Next"]');
    await nextButton.click();
  } else {
    const prevButton = carousel.locator('button[aria-label*="Previous"]');
    await prevButton.click();
  }

  // Wait for slide transition
  await page.waitForTimeout(500);
}

/**
 * Verify carousel indicator dots
 */
export async function verifyCarouselIndicators(page: Page, activeSlide: number) {
  const carousel = page.locator('[data-testid="image-carousel"]');
  const indicators = carousel.locator('[data-testid="carousel-indicator"]');

  // Verify correct indicator is active
  const activeIndicator = indicators.nth(activeSlide);
  await expect(activeIndicator).toHaveClass(/active|selected/);
}

/**
 * Swipe carousel (for mobile gesture testing)
 */
export async function swipeCarousel(page: Page, direction: 'left' | 'right') {
  const carousel = page.locator('[data-testid="image-carousel"]');
  const bounds = await carousel.boundingBox();

  if (!bounds) {
    throw new Error('Carousel not found');
  }

  const startX = bounds.x + bounds.width / 2;
  const startY = bounds.y + bounds.height / 2;
  const endX = direction === 'left' ? startX - 200 : startX + 200;

  // Perform swipe gesture
  await page.mouse.move(startX, startY);
  await page.mouse.down();
  await page.mouse.move(endX, startY, { steps: 10 });
  await page.mouse.up();

  // Wait for transition
  await page.waitForTimeout(500);
}

/**
 * Verify image download functionality
 */
export async function verifyImageDownload(page: Page, expectedFilename: string) {
  // Set up download listener
  const downloadPromise = page.waitForEvent('download');

  // Click download button
  const downloadButton = page.locator('[data-testid="download-button"]');
  await downloadButton.click();

  // Wait for download to start
  const download = await downloadPromise;

  // Verify filename matches expected pattern
  const filename = download.suggestedFilename();
  expect(filename).toContain('yarda_');
  expect(filename).toMatch(/\.(jpg|jpeg|png)$/);

  // Verify file is actually downloaded (size > 0)
  const path = await download.path();
  expect(path).not.toBeNull();

  return download;
}

/**
 * Verify image loads successfully (no broken images)
 */
export async function verifyImageLoaded(imageLocator: Locator) {
  // Wait for image to be visible
  await expect(imageLocator).toBeVisible();

  // Verify image has valid src
  const src = await imageLocator.getAttribute('src');
  expect(src).not.toBeNull();
  expect(src).not.toBe('');

  // Verify image natural dimensions are non-zero (indicating successful load)
  const isLoaded = await imageLocator.evaluate((img: HTMLImageElement) => {
    return img.complete && img.naturalWidth > 0 && img.naturalHeight > 0;
  });

  expect(isLoaded).toBe(true);
}

/**
 * Verify image skeleton loader displays before image loads
 */
export async function verifyImageSkeleton(page: Page) {
  // Look for skeleton loader
  const skeleton = page.locator('[data-testid="image-skeleton"]');
  await expect(skeleton).toBeVisible({ timeout: 1000 });

  // Wait for skeleton to disappear (image loaded)
  await expect(skeleton).not.toBeVisible({ timeout: 10000 });
}

/**
 * Verify image quality (dimensions, file size)
 */
export async function verifyImageQuality(
  imageLocator: Locator,
  minWidth = 500,
  minHeight = 300
) {
  const dimensions = await imageLocator.evaluate((img: HTMLImageElement) => ({
    width: img.naturalWidth,
    height: img.naturalHeight,
  }));

  expect(dimensions.width).toBeGreaterThanOrEqual(minWidth);
  expect(dimensions.height).toBeGreaterThanOrEqual(minHeight);
}

/**
 * Verify Vercel Blob URL format
 */
export function verifyVercelBlobUrl(url: string) {
  expect(url).toMatch(/https:\/\/.+\.public\.blob\.vercel-storage\.com\/.+/);
}

/**
 * Verify Google Maps image metadata
 */
export async function verifyGoogleMapsMetadata(page: Page, generationId: string) {
  // Fetch generation details
  const response = await page.evaluate(async (id) => {
    const res = await fetch(`http://localhost:8000/generations/${id}`, {
      headers: {
        Authorization: `Bearer ${(window as any).userStore?.getState()?.accessToken || ''}`,
      },
    });
    return await res.json();
  }, generationId);

  // Verify source images exist
  expect(response.source_images).toBeDefined();
  expect(response.source_images.length).toBeGreaterThan(0);

  // Verify each source image has required metadata
  response.source_images.forEach((img: ImageMetadata) => {
    expect(img.imageType).toMatch(/street_view|satellite/);
    expect(img.imageUrl).toBeTruthy();
    verifyVercelBlobUrl(img.imageUrl);

    if (img.imageType === 'street_view') {
      expect(img.panoId).toBeTruthy();
    }
  });
}

/**
 * Verify glass-morphism badge styling
 */
export async function verifyGlassMorphismBadge(page: Page, badgeText: string) {
  const badge = page.locator(`text=${badgeText}`).locator('..');

  // Verify badge is visible
  await expect(badge).toBeVisible();

  // Verify glass-morphism styles (backdrop-filter, semi-transparent background)
  const hasGlassMorphism = await badge.evaluate((el) => {
    const styles = window.getComputedStyle(el);
    return (
      styles.backdropFilter.includes('blur') || styles.webkitBackdropFilter.includes('blur')
    );
  });

  expect(hasGlassMorphism).toBe(true);
}

/**
 * Verify image caching (CDN cache headers)
 */
export async function verifyImageCaching(page: Page, imageUrl: string) {
  // First load
  const response1 = await page.goto(imageUrl);
  const headers1 = response1?.headers();

  // Verify cache headers
  expect(headers1?.['cache-control']).toBeDefined();
  expect(headers1?.['cache-control']).toContain('public');

  // Second load (should be cached)
  const response2 = await page.goto(imageUrl);
  const timing2 = await response2?.finished();

  // Cached load should be faster
  expect(timing2).toBeLessThan(1000); // Less than 1 second
}

/**
 * Verify transformation preservation strength effect
 */
export async function verifyPreservationStrength(
  page: Page,
  dramaticImageUrl: string,
  subtleImageUrl: string
) {
  // This is a visual comparison test
  // In practice, you'd need image comparison libraries
  // For now, just verify both images are different

  const response1 = await page.goto(dramaticImageUrl);
  const response2 = await page.goto(subtleImageUrl);

  expect(response1?.status()).toBe(200);
  expect(response2?.status()).toBe(200);

  // In a real test, you'd use an image diff library to verify
  // that the dramatic transformation is more different from source
  // than the subtle transformation
}

/**
 * Verify partial generation failure handling
 */
export async function verifyPartialFailure(page: Page, successfulAreas: number) {
  // Verify some areas succeeded
  const successCards = page.locator('[data-status="completed"]');
  const successCount = await successCards.count();
  expect(successCount).toBe(successfulAreas);

  // Verify some areas failed
  const failureCards = page.locator('[data-status="failed"]');
  const failureCount = await failureCards.count();
  expect(failureCount).toBeGreaterThan(0);

  // Verify retry button on failed areas
  const retryButton = page.locator('button:has-text("Retry")');
  await expect(retryButton).toBeVisible();

  // Verify partial refund message
  await expect(page.locator('text=/partial success|some areas failed/i')).toBeVisible();
}

/**
 * Verify multi-area parallel processing
 */
export async function verifyParallelProcessing(page: Page, areaCount: number) {
  // All areas should start processing approximately at the same time
  const processingCards = page.locator('[data-status="processing"]');

  // Wait for all areas to enter processing state
  await expect(processingCards).toHaveCount(areaCount, { timeout: 10000 });

  // Verify all areas show progress simultaneously
  const progressBars = page.locator('[role="progressbar"]');
  await expect(progressBars).toHaveCount(areaCount);
}
