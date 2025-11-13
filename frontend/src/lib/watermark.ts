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
 * @param mimeType - MIME type for the blob (defaults to image/jpeg)
 * @returns Promise<Blob> - Image blob with correct MIME type
 */
export async function dataUrlToBlob(dataUrl: string, mimeType: string = 'image/jpeg'): Promise<Blob> {
  try {
    // Try fetching the data URL
    const response = await fetch(dataUrl);
    let blob = await response.blob();

    // If blob type is empty or incorrect, create a new blob with correct type
    if (!blob.type || blob.type === 'application/octet-stream') {
      blob = new Blob([blob], { type: mimeType });
    }

    return blob;
  } catch (error) {
    // Fallback: manually parse data URL and create blob
    const parts = dataUrl.split(',');
    const byteString = atob(parts[1]);
    const ab = new ArrayBuffer(byteString.length);
    const view = new Uint8Array(ab);

    for (let i = 0; i < byteString.length; i++) {
      view[i] = byteString.charCodeAt(i);
    }

    return new Blob([ab], { type: mimeType });
  }
}

/**
 * Copy image to clipboard
 * @param imageUrl - URL of image to copy (data URL)
 * @returns Promise<void>
 */
export async function copyImageToClipboard(imageUrl: string): Promise<void> {
  try {
    // Watermarked images are always JPEG
    const mimeType = 'image/jpeg';
    const blob = await dataUrlToBlob(imageUrl, mimeType);

    // Ensure blob has correct MIME type for clipboard write
    let finalBlob = blob;
    if (finalBlob.type !== mimeType) {
      finalBlob = new Blob([blob], { type: mimeType });
    }

    await navigator.clipboard.write([
      new ClipboardItem({
        [mimeType]: finalBlob,
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
    // Convert data URL to Blob with explicit MIME type
    const blob = await dataUrlToBlob(imageUrl, 'image/jpeg');

    // Create File object for sharing with correct MIME type
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
 * Detect if device is actually mobile (not just a resized desktop browser)
 * Checks for actual mobile user agent, not viewport size
 * @returns boolean - True if device is actually mobile
 */
export function isMobileDevice(): boolean {
  if (typeof navigator === 'undefined') return false;

  const userAgent = navigator.userAgent || navigator.vendor || (window as any).opera;

  // Mobile device detection based on user agent
  // This checks for actual mobile OS, not just viewport size
  const mobileRegex = /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini|mobile|tablet/i;
  return mobileRegex.test(userAgent.toLowerCase());
}

/**
 * Detect if Web Share API is available and device is actually mobile
 * @returns boolean - True if Web Share API can share files on actual mobile device
 */
export function isWebShareAvailable(): boolean {
  // Must be on actual mobile device AND have Web Share API
  return isMobileDevice() &&
         typeof navigator !== 'undefined' &&
         typeof navigator.share === 'function' &&
         typeof navigator.canShare === 'function';
}
