"""
Manual Test Script for Gemini Image Generation

Tests the updated gemini_client.py with gemini-2.5-flash-image model.

Usage:
    cd backend
    ./venv/bin/python tests/manual_test_gemini.py
"""

import asyncio
import os
import sys
from pathlib import Path

# Add parent directory to path for imports
sys.path.insert(0, str(Path(__file__).parent.parent))

from src.services.gemini_client import GeminiClient


async def test_text_to_image():
    """Test 1: Text-to-image generation (address-based)"""
    print("\n" + "=" * 80)
    print("TEST 1: Text-to-Image Generation (Address-based)")
    print("=" * 80)

    try:
        client = GeminiClient()

        print("\n📍 Generating landscape design for:")
        print("   Address: 21125 Seven Springs Dr, Cupertino, CA 95014, USA")
        print("   Area: Backyard")
        print("   Style: Modern Minimalist")
        print("\n⏳ Generating image...")

        image_bytes = await client.generate_landscape_design(
            input_image=None,
            address="21125 Seven Springs Dr, Cupertino, CA 95014, USA",
            area_type="backyard",
            style="modern_minimalist",
            custom_prompt="Add a modern patio with clean lines and minimalist furniture",
            preservation_strength=0.5
        )

        # Save result
        output_path = "/tmp/yarda_test_text_to_image.png"
        with open(output_path, "wb") as f:
            f.write(image_bytes)

        print("\n✅ SUCCESS!")
        print(f"📁 Image saved to: {output_path}")
        print(f"📊 Image size: {len(image_bytes):,} bytes ({len(image_bytes) / 1024:.1f} KB)")

        return True

    except Exception as e:
        print(f"\n❌ FAILED: {str(e)}")
        import traceback
        traceback.print_exc()
        return False


async def test_image_to_image():
    """Test 2: Image-to-image generation (with input photo)"""
    print("\n" + "=" * 80)
    print("TEST 2: Image-to-Image Generation (With Input Photo)")
    print("=" * 80)

    # Check if sample image exists
    sample_image_path = "/tmp/sample_yard.jpg"
    if not os.path.exists(sample_image_path):
        print(f"\n⚠️  SKIPPED: Sample image not found at {sample_image_path}")
        print("   To test image-to-image, place a yard photo at /tmp/sample_yard.jpg")
        return None

    try:
        client = GeminiClient()

        # Read input image
        with open(sample_image_path, "rb") as f:
            input_image = f.read()

        print(f"\n📸 Input image: {sample_image_path}")
        print(f"📊 Input size: {len(input_image):,} bytes ({len(input_image) / 1024:.1f} KB)")
        print("\n🎨 Transforming to:")
        print("   Style: Zen Garden")
        print("   Preservation: 60% (subtle changes)")
        print("\n⏳ Generating image...")

        image_bytes = await client.generate_landscape_design(
            input_image=input_image,
            address="Sample Backyard",
            area_type="backyard",
            style="zen_garden",
            custom_prompt="Transform into a peaceful zen garden with stone paths and water features",
            preservation_strength=0.6
        )

        # Save result
        output_path = "/tmp/yarda_test_image_to_image.png"
        with open(output_path, "wb") as f:
            f.write(image_bytes)

        print("\n✅ SUCCESS!")
        print(f"📁 Image saved to: {output_path}")
        print(f"📊 Output size: {len(image_bytes):,} bytes ({len(image_bytes) / 1024:.1f} KB)")

        return True

    except Exception as e:
        print(f"\n❌ FAILED: {str(e)}")
        import traceback
        traceback.print_exc()
        return False


async def main():
    """Run all tests"""
    print("\n" + "🔬" * 40)
    print("GEMINI 2.5 FLASH IMAGE - IMAGE GENERATION TEST SUITE")
    print("🔬" * 40)

    # Check API key
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        print("\n❌ ERROR: GEMINI_API_KEY not found in environment")
        print("   Make sure backend/.env has GEMINI_API_KEY set")
        return

    print(f"\n✅ API Key found: {api_key[:20]}...{api_key[-10:]}")
    print(f"✅ Model: gemini-2.5-flash-image")

    # Run tests
    results = []

    # Test 1: Text-to-image
    result1 = await test_text_to_image()
    results.append(("Text-to-Image", result1))

    # Test 2: Image-to-image (optional)
    result2 = await test_image_to_image()
    if result2 is not None:
        results.append(("Image-to-Image", result2))

    # Summary
    print("\n" + "=" * 80)
    print("TEST SUMMARY")
    print("=" * 80)

    passed = 0
    failed = 0
    skipped = 0

    for test_name, result in results:
        if result is True:
            print(f"✅ {test_name}: PASSED")
            passed += 1
        elif result is False:
            print(f"❌ {test_name}: FAILED")
            failed += 1
        else:
            print(f"⚠️  {test_name}: SKIPPED")
            skipped += 1

    print(f"\n📊 Results: {passed} passed, {failed} failed, {skipped} skipped")

    if failed > 0:
        print("\n⚠️  Some tests failed. Check the errors above.")
        return 1
    elif passed > 0:
        print("\n🎉 All tests passed!")
        return 0
    else:
        print("\n⚠️  No tests completed successfully.")
        return 1


if __name__ == "__main__":
    exit_code = asyncio.run(main())
    sys.exit(exit_code)
