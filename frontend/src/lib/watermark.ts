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
