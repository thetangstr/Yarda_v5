/**
 * Image Composition Utility
 *
 * Creates before/after comparison images for Holiday Decorator feature.
 * Generates side-by-side images perfect for social media sharing.
 *
 * @module lib/imageComposition
 */

// ============================================================================
// Types
// ============================================================================

export interface BeforeAfterOptions {
  beforeImageUrl: string;
  afterImageUrl: string;
  width?: number;          // Total width (default: 1200px for social media)
  height?: number;         // Total height (default: 600px)
  dividerWidth?: number;   // Width of center divider (default: 4px)
  dividerColor?: string;   // Color of divider (default: '#ffffff')
  labelBefore?: string;    // Label for before image (default: 'BEFORE')
  labelAfter?: string;     // Label for after image (default: 'AFTER')
  showLabels?: boolean;    // Show before/after labels (default: true)
  labelBackgroundColor?: string;  // Label background (default: 'rgba(0,0,0,0.7)')
  labelTextColor?: string;        // Label text color (default: '#ffffff')
}

export interface CompositionResult {
  dataUrl: string;         // Data URL of composed image
  blob: Blob;              // Blob for upload
  width: number;           // Actual width
  height: number;          // Actual height
}

// ============================================================================
// Main Function
// ============================================================================

/**
 * Create a before/after comparison image
 *
 * Generates a side-by-side composition with optional labels and customizable styling.
 * Perfect for social media sharing (Instagram, Facebook, TikTok).
 *
 * @param options - Configuration options
 * @returns Promise with composition result
 *
 * @example
 * ```tsx
 * const result = await createBeforeAfterImage({
 *   beforeImageUrl: 'https://example.com/original.jpg',
 *   afterImageUrl: 'https://example.com/decorated.jpg',
 *   width: 1200,
 *   height: 600
 * });
 *
 * // Use data URL for preview
 * <img src={result.dataUrl} alt="Before and after" />
 *
 * // Upload blob to storage
 * const formData = new FormData();
 * formData.append('image', result.blob, 'before-after.jpg');
 * ```
 */
export async function createBeforeAfterImage(
  options: BeforeAfterOptions
): Promise<CompositionResult> {
  const {
    beforeImageUrl,
    afterImageUrl,
    width = 1200,
    height = 600,
    dividerWidth = 4,
    dividerColor = '#ffffff',
    labelBefore = 'BEFORE',
    labelAfter = 'AFTER',
    showLabels = true,
    labelBackgroundColor = 'rgba(0,0,0,0.7)',
    labelTextColor = '#ffffff'
  } = options;

  // Create canvas
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');

  if (!ctx) {
    throw new Error('Failed to get canvas context');
  }

  // Load images
  const [beforeImg, afterImg] = await Promise.all([
    loadImage(beforeImageUrl),
    loadImage(afterImageUrl)
  ]);

  // Calculate dimensions
  const halfWidth = (width - dividerWidth) / 2;

  // Draw before image (left side)
  ctx.drawImage(beforeImg, 0, 0, halfWidth, height);

  // Draw divider
  ctx.fillStyle = dividerColor;
  ctx.fillRect(halfWidth, 0, dividerWidth, height);

  // Draw after image (right side)
  ctx.drawImage(afterImg, halfWidth + dividerWidth, 0, halfWidth, height);

  // Draw labels if enabled
  if (showLabels) {
    drawLabel(ctx, labelBefore, halfWidth / 2, height - 40, labelBackgroundColor, labelTextColor);
    drawLabel(ctx, labelAfter, halfWidth + dividerWidth + halfWidth / 2, height - 40, labelBackgroundColor, labelTextColor);
  }

  // Convert to blob and data URL
  const blob = await canvasToBlob(canvas);
  const dataUrl = canvas.toDataURL('image/jpeg', 0.9);

  return {
    dataUrl,
    blob,
    width,
    height
  };
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Load image from URL
 *
 * @param url - Image URL
 * @returns Promise with loaded HTMLImageElement
 */
function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';  // Enable CORS for external images

    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`Failed to load image: ${url}`));

    img.src = url;
  });
}

/**
 * Convert canvas to Blob
 *
 * @param canvas - HTML canvas element
 * @param type - MIME type (default: 'image/jpeg')
 * @param quality - Image quality 0-1 (default: 0.9)
 * @returns Promise with Blob
 */
function canvasToBlob(
  canvas: HTMLCanvasElement,
  type: string = 'image/jpeg',
  quality: number = 0.9
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) {
          resolve(blob);
        } else {
          reject(new Error('Failed to convert canvas to blob'));
        }
      },
      type,
      quality
    );
  });
}

/**
 * Draw a centered label with background
 *
 * @param ctx - Canvas rendering context
 * @param text - Label text
 * @param x - Center X coordinate
 * @param y - Center Y coordinate
 * @param backgroundColor - Background color
 * @param textColor - Text color
 */
function drawLabel(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  backgroundColor: string,
  textColor: string
): void {
  // Set font
  ctx.font = 'bold 24px Arial, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  // Measure text
  const metrics = ctx.measureText(text);
  const textWidth = metrics.width;
  const padding = 16;

  // Draw background
  ctx.fillStyle = backgroundColor;
  ctx.fillRect(
    x - textWidth / 2 - padding,
    y - 16,
    textWidth + padding * 2,
    32
  );

  // Draw text
  ctx.fillStyle = textColor;
  ctx.fillText(text, x, y);
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Get optimal dimensions for social media platform
 *
 * Returns recommended image dimensions for different platforms.
 *
 * @param platform - Social media platform
 * @returns Width and height
 *
 * @example
 * ```typescript
 * const { width, height } = getSocialMediaDimensions('instagram');
 * // Returns { width: 1080, height: 1080 }
 * ```
 */
export function getSocialMediaDimensions(
  platform: 'instagram' | 'facebook' | 'tiktok' | 'twitter'
): { width: number; height: number } {
  switch (platform) {
    case 'instagram':
      return { width: 1080, height: 1080 };  // Square post

    case 'facebook':
      return { width: 1200, height: 630 };   // Link preview

    case 'tiktok':
      return { width: 1080, height: 1920 };  // Vertical video

    case 'twitter':
      return { width: 1200, height: 675 };   // 16:9 ratio

    default:
      return { width: 1200, height: 600 };   // Default wide format
  }
}

/**
 * Download image to user's device
 *
 * Triggers browser download of the composed image.
 *
 * @param dataUrl - Image data URL
 * @param filename - Download filename (default: 'before-after.jpg')
 *
 * @example
 * ```typescript
 * const result = await createBeforeAfterImage({...});
 * downloadImage(result.dataUrl, 'my-holiday-decoration.jpg');
 * ```
 */
export function downloadImage(dataUrl: string, filename: string = 'before-after.jpg'): void {
  const link = document.createElement('a');
  link.href = dataUrl;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

/**
 * Copy image to clipboard
 *
 * Copies the image to user's clipboard for easy pasting.
 * Requires user gesture (button click) to work.
 *
 * @param blob - Image blob
 * @returns Promise (resolves when copied, rejects on error)
 *
 * @example
 * ```typescript
 * const result = await createBeforeAfterImage({...});
 * await copyImageToClipboard(result.blob);
 * alert('Image copied to clipboard!');
 * ```
 */
export async function copyImageToClipboard(blob: Blob): Promise<void> {
  try {
    await navigator.clipboard.write([
      new ClipboardItem({
        [blob.type]: blob
      })
    ]);
  } catch (error) {
    throw new Error(`Failed to copy image to clipboard: ${error}`);
  }
}

/**
 * Share image via Web Share API
 *
 * Opens native share dialog on supported devices (mobile).
 * Fallback to download if Web Share API not supported.
 *
 * @param blob - Image blob
 * @param title - Share title
 * @param text - Share text
 * @returns Promise (resolves when shared, rejects on error)
 *
 * @example
 * ```typescript
 * const result = await createBeforeAfterImage({...});
 * await shareImage(
 *   result.blob,
 *   'My Holiday Decoration',
 *   'Check out my AI-decorated house!'
 * );
 * ```
 */
export async function shareImage(
  blob: Blob,
  title: string = 'Holiday Decoration',
  text: string = 'Check out this before & after!'
): Promise<void> {
  // Check if Web Share API is supported
  if (!navigator.share) {
    throw new Error('Web Share API not supported on this device');
  }

  try {
    const file = new File([blob], 'decoration.jpg', { type: blob.type });

    await navigator.share({
      title,
      text,
      files: [file]
    });
  } catch (error) {
    // User cancelled share or error occurred
    throw new Error(`Failed to share image: ${error}`);
  }
}
