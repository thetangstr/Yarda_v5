/**
 * Image Watermarking Utility
 *
 * Adds Yarda.AI watermark to images for social sharing
 * Watermark includes branding and URL
 */

/**
 * Add watermark to an image (canvas-based)
 * @param imageUrl - URL of the image to watermark
 * @returns Promise<string> - Data URL of watermarked image
 */
export async function addWatermarkToImage(imageUrl: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';

    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;

      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Could not get canvas context'));
        return;
      }

      // Draw original image
      ctx.drawImage(img, 0, 0);

      // Add semi-transparent overlay at bottom
      ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
      ctx.fillRect(0, canvas.height - 80, canvas.width, 80);

      // Add watermark text
      ctx.fillStyle = '#FFFFFF';
      ctx.font = 'bold 28px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto';
      ctx.textAlign = 'center';

      // Brand name
      ctx.fillText('🎄 Decorated with Yarda AI', canvas.width / 2, canvas.height - 45);

      // URL
      ctx.font = '14px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto';
      ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
      ctx.fillText('www.yarda.pro - Transform Your Yard with AI', canvas.width / 2, canvas.height - 18);

      // Convert to data URL
      const watermarkedUrl = canvas.toDataURL('image/jpeg', 0.9);
      resolve(watermarkedUrl);
    };

    img.onerror = () => {
      reject(new Error('Failed to load image'));
    };

    img.src = imageUrl;
  });
}

/**
 * Convert data URL to blob for clipboard/download
 * @param dataUrl - Data URL of image
 * @returns Promise<Blob> - Image blob
 */
export async function dataUrlToBlob(dataUrl: string): Promise<Blob> {
  const response = await fetch(dataUrl);
  return response.blob();
}

/**
 * Copy image to clipboard
 * @param imageUrl - URL of image to copy
 * @returns Promise<void>
 */
export async function copyImageToClipboard(imageUrl: string): Promise<void> {
  try {
    const blob = await dataUrlToBlob(imageUrl);
    await navigator.clipboard.write([
      new ClipboardItem({
        'image/png': blob,
      }),
    ]);
  } catch (error) {
    console.error('Failed to copy image to clipboard:', error);
    throw error;
  }
}

/**
 * Download image
 * @param imageUrl - URL of image to download
 * @param filename - Name for downloaded file
 */
export function downloadImage(imageUrl: string, filename: string = 'yarda-decorated.jpg'): void {
  const link = document.createElement('a');
  link.href = imageUrl;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

/**
 * Share image using Web Share API (native mobile sharing)
 * @param imageUrl - Data URL of watermarked image
 * @param title - Title for the share (platform name)
 * @param text - Text to include in share
 * @returns Promise<boolean> - True if shared successfully, false if Web Share API not supported
 */
export async function shareImageViaWebShare(
  imageUrl: string,
  title: string = '🎄 Decorated with Yarda AI',
  text: string = 'Check out my AI-decorated home!'
): Promise<boolean> {
  // Check if Web Share API is available
  if (!navigator.share || !navigator.canShare) {
    console.warn('Web Share API not supported on this device');
    return false;
  }

  try {
    // Convert data URL to Blob
    const blob = await dataUrlToBlob(imageUrl);

    // Create File object for sharing
    const file = new File([blob], 'yarda-decorated-holiday.jpg', { type: 'image/jpeg' });

    // Check if device can share files
    const shareData = {
      title,
      text,
      files: [file],
    };

    if (!navigator.canShare(shareData)) {
      console.warn('Device cannot share files via Web Share API');
      return false;
    }

    // Trigger native share intent
    await navigator.share(shareData);
    return true;
  } catch (error: any) {
    // User cancelled share or error occurred
    if (error.name === 'AbortError') {
      console.log('Share cancelled by user');
    } else {
      console.error('Web Share API error:', error);
    }
    return false;
  }
}

/**
 * Detect if Web Share API is available and supports files
 * @returns boolean - True if Web Share API can share files
 */
export function isWebShareAvailable(): boolean {
  return typeof navigator !== 'undefined' &&
         typeof navigator.share === 'function' &&
         typeof navigator.canShare === 'function';
}
