"""
Image Composition Utilities

Creates before/after comparison images for social sharing.
Combines original and decorated images side-by-side with labels.

Feature: 007-holiday-decorator (T027)
"""

from PIL import Image
from io import BytesIO
from typing import Optional


async def create_before_after_image(
    before_image_bytes: bytes,
    after_image_bytes: bytes,
    label_before: str = "BEFORE",
    label_after: str = "AFTER",
    output_format: str = "JPEG"
) -> bytes:
    """
    Create side-by-side before/after comparison image.

    Args:
        before_image_bytes: Original image bytes
        after_image_bytes: Decorated image bytes
        label_before: Label for before image (default: "BEFORE")
        label_after: Label for after image (default: "AFTER")
        output_format: Output format (default: "JPEG")

    Returns:
        Composed image bytes

    Example:
        >>> before_bytes = b"..."
        >>> after_bytes = b"..."
        >>> comparison_bytes = await create_before_after_image(before_bytes, after_bytes)
    """
    try:
        # Load images
        before_img = Image.open(BytesIO(before_image_bytes))
        after_img = Image.open(BytesIO(after_image_bytes))

        # Convert to RGB if needed (for JPEG compatibility)
        if before_img.mode != "RGB":
            before_img = before_img.convert("RGB")
        if after_img.mode != "RGB":
            after_img = after_img.convert("RGB")

        # Resize to consistent height
        target_height = 800
        before_width = int((target_height / before_img.height) * before_img.width)
        after_width = int((target_height / after_img.height) * after_img.width)

        before_img = before_img.resize((before_width, target_height), Image.Resampling.LANCZOS)
        after_img = after_img.resize((after_width, target_height), Image.Resampling.LANCZOS)

        # Create new canvas
        total_width = before_width + after_width
        canvas = Image.new("RGB", (total_width, target_height), color=(255, 255, 255))

        # Paste images side-by-side
        canvas.paste(before_img, (0, 0))
        canvas.paste(after_img, (before_width, 0))

        # TODO: Add labels with PIL.ImageDraw (optional enhancement)
        # For MVP, labels will be overlaid by frontend

        # Convert to bytes
        output_buffer = BytesIO()
        canvas.save(output_buffer, format=output_format, quality=90)
        output_buffer.seek(0)

        return output_buffer.read()

    except Exception as e:
        raise RuntimeError(f"Failed to create before/after image: {str(e)}")
