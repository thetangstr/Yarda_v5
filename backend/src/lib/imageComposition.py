"""
Image Composition Utilities

Creates before/after comparison images for social sharing.
Combines original and decorated images side-by-side with labels.

Feature: 007-holiday-decorator (T027)
"""

from PIL import Image, ImageDraw, ImageFont
from io import BytesIO
from typing import Optional
import os


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

        # Convert to RGBA for transparency support
        canvas = canvas.convert("RGBA")

        # Create overlay for text with transparency
        overlay = Image.new("RGBA", canvas.size, (255, 255, 255, 0))
        draw = ImageDraw.Draw(overlay)

        # Try to use a nice font, fall back to default if not available
        try:
            # Try to use system font
            label_font = ImageFont.truetype("/System/Library/Fonts/Helvetica.ttc", 48)
            watermark_font = ImageFont.truetype("/System/Library/Fonts/Helvetica.ttc", 32)
        except:
            try:
                # Try DejaVu fonts (commonly available on Linux)
                label_font = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", 48)
                watermark_font = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", 32)
            except:
                # Fall back to PIL default font (will be small)
                label_font = ImageFont.load_default()
                watermark_font = ImageFont.load_default()

        # Add BEFORE label with semi-transparent background
        before_text = "BEFORE"
        before_bbox = draw.textbbox((0, 0), before_text, font=label_font)
        before_width_text = before_bbox[2] - before_bbox[0]
        before_height_text = before_bbox[3] - before_bbox[1]
        before_x = 30
        before_y = 30

        # Draw semi-transparent black background for BEFORE label
        draw.rectangle(
            [before_x - 15, before_y - 10, before_x + before_width_text + 15, before_y + before_height_text + 10],
            fill=(0, 0, 0, 200)
        )
        draw.text((before_x, before_y), before_text, font=label_font, fill=(255, 255, 255, 255))

        # Add AFTER label with semi-transparent background
        after_text = "AFTER"
        after_bbox = draw.textbbox((0, 0), after_text, font=label_font)
        after_width_text = after_bbox[2] - after_bbox[0]
        after_height_text = after_bbox[3] - after_bbox[1]
        after_x = before_width + 30
        after_y = 30

        # Draw semi-transparent black background for AFTER label
        draw.rectangle(
            [after_x - 15, after_y - 10, after_x + after_width_text + 15, after_y + after_height_text + 10],
            fill=(0, 0, 0, 200)
        )
        draw.text((after_x, after_y), after_text, font=label_font, fill=(255, 255, 255, 255))

        # Add watermark at bottom center
        watermark_text = "yarda.pro - transform your yard in seconds!"
        watermark_bbox = draw.textbbox((0, 0), watermark_text, font=watermark_font)
        watermark_width = watermark_bbox[2] - watermark_bbox[0]
        watermark_height = watermark_bbox[3] - watermark_bbox[1]
        watermark_x = (total_width - watermark_width) // 2
        watermark_y = target_height - watermark_height - 40

        # Draw semi-transparent black background for watermark
        draw.rectangle(
            [watermark_x - 25, watermark_y - 12, watermark_x + watermark_width + 25, watermark_y + watermark_height + 12],
            fill=(0, 0, 0, 220)
        )

        # Draw watermark text in white
        draw.text((watermark_x, watermark_y), watermark_text, font=watermark_font, fill=(255, 255, 255, 255))

        # Composite overlay onto canvas
        canvas = Image.alpha_composite(canvas, overlay)

        # Convert back to RGB for JPEG
        canvas = canvas.convert("RGB")

        # Convert to bytes
        output_buffer = BytesIO()
        canvas.save(output_buffer, format=output_format, quality=90)
        output_buffer.seek(0)

        return output_buffer.read()

    except Exception as e:
        raise RuntimeError(f"Failed to create before/after image: {str(e)}")
