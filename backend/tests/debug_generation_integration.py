"""
Debug Test: Step-by-Step Image Generation Integration

Tests each component of the generation flow independently to identify where things break.

Steps:
1. Address Validation + Maps API (Satellite + Street View)
2. Gemini API Call with Prompts
3. Gemini API Success + Payload Verification
4. Image Display (save to file for verification)

Usage:
    cd backend
    ./venv/bin/python tests/debug_generation_integration.py
"""

import asyncio
import os
import sys
from pathlib import Path
import json
from datetime import datetime

# Add parent directory to path for imports
sys.path.insert(0, str(Path(__file__).parent.parent))

from src.services.maps_service import MapsService
from src.services.gemini_client import GeminiClient
from src.services.prompt_builder import build_landscape_prompt

# Test configuration
TEST_ADDRESS = "21125 Seven Springs Dr, Cupertino, CA 95014, USA"
TEST_AREA = "backyard"
TEST_STYLE = "modern_minimalist"
TEST_CUSTOM_PROMPT = "Add a modern patio with clean lines and minimalist outdoor furniture"
OUTPUT_DIR = Path("/tmp/yarda_debug_test")


def print_step_header(step_num: int, step_name: str):
    """Print a formatted step header"""
    print("\n" + "="*80)
    print(f"STEP {step_num}: {step_name}")
    print("="*80 + "\n")


def print_success(message: str):
    """Print success message"""
    print(f"✅ {message}")


def print_error(message: str):
    """Print error message"""
    print(f"❌ {message}")


def print_info(message: str):
    """Print info message"""
    print(f"ℹ️  {message}")


async def step_1_address_and_maps():
    """
    Step 1: Address Validation + Google Maps API

    Tests:
    - Address parsing and validation
    - Google Maps Street View API call (via get_property_images)
    - Image retrieval and storage
    """
    print_step_header(1, "Address Validation + Google Maps API")

    try:
        # Initialize Maps service
        print_info("Initializing Maps service...")
        maps_service = MapsService()
        print_success("Maps service initialized")

        # Validate API key
        if not os.getenv("GOOGLE_MAPS_API_KEY"):
            print_error("GOOGLE_MAPS_API_KEY not found in environment")
            return False
        print_success(f"Google Maps API key found: {os.getenv('GOOGLE_MAPS_API_KEY')[:20]}...")

        # Test address
        print_info(f"Testing address: {TEST_ADDRESS}")

        # Fetch property images (Street View + Satellite)
        print_info("Fetching property imagery...")
        street_view_bytes, street_view_metadata, satellite_bytes, image_source = await maps_service.get_property_images(
            TEST_ADDRESS,
            TEST_AREA
        )

        OUTPUT_DIR.mkdir(exist_ok=True)

        # Check Street View
        if street_view_bytes:
            street_view_path = OUTPUT_DIR / "01_street_view.jpg"
            with open(street_view_path, "wb") as f:
                f.write(street_view_bytes)
            print_success(f"Street View image saved: {street_view_path}")
            print_info(f"   Size: {len(street_view_bytes):,} bytes ({len(street_view_bytes) / 1024:.1f} KB)")
            if street_view_metadata:
                print_info(f"   Pano ID: {street_view_metadata.pano_id}")
                print_info(f"   Date: {street_view_metadata.date}")
        else:
            print_error("Street View returned no data")

        # Check Satellite (may not be implemented yet)
        if satellite_bytes:
            satellite_path = OUTPUT_DIR / "01_satellite_view.jpg"
            with open(satellite_path, "wb") as f:
                f.write(satellite_bytes)
            print_success(f"Satellite image saved: {satellite_path}")
            print_info(f"   Size: {len(satellite_bytes):,} bytes ({len(satellite_bytes) / 1024:.1f} KB)")
        else:
            print_info("Satellite imagery not available (not yet implemented)")

        # Check image source
        print_success(f"Image source: {image_source}")

        # At least one image must be available
        if not street_view_bytes and not satellite_bytes:
            print_error("No imagery available")
            return False

        print_success("Step 1 PASSED: Maps API working correctly")
        return True

    except Exception as e:
        print_error(f"Step 1 FAILED: {str(e)}")
        import traceback
        traceback.print_exc()
        return False


async def step_2_prompt_generation():
    """
    Step 2: Gemini Prompt Generation

    Tests:
    - Prompt template system
    - Style-specific prompts
    - Custom prompt integration
    - Preservation strength handling
    """
    print_step_header(2, "Gemini Prompt Generation")

    try:
        print_info("Building landscape prompt...")
        print_info(f"   Style: {TEST_STYLE}")
        print_info(f"   Area: {TEST_AREA}")
        print_info(f"   Custom prompt: {TEST_CUSTOM_PROMPT}")
        print_info(f"   Preservation strength: 0.5 (balanced)")

        # Build prompt
        prompt = build_landscape_prompt(
            style=TEST_STYLE,
            preservation_strength=0.5,
            custom_prompt=TEST_CUSTOM_PROMPT,
            area=TEST_AREA,
            address=TEST_ADDRESS
        )

        print_success("Prompt generated successfully")
        print_info(f"   Length: {len(prompt)} characters")
        print_info(f"   Estimated tokens: ~{len(prompt.split())}")

        # Save prompt for inspection
        prompt_path = OUTPUT_DIR / "02_gemini_prompt.txt"
        with open(prompt_path, "w") as f:
            f.write(f"Address: {TEST_ADDRESS}\n")
            f.write(f"Area: {TEST_AREA}\n")
            f.write(f"Style: {TEST_STYLE}\n")
            f.write(f"Custom Prompt: {TEST_CUSTOM_PROMPT}\n")
            f.write(f"Preservation: 0.5\n")
            f.write("\n" + "="*80 + "\n\n")
            f.write(prompt)
        print_success(f"Prompt saved: {prompt_path}")

        # Display prompt preview
        print("\n" + "-"*80)
        print("PROMPT PREVIEW (first 500 chars):")
        print("-"*80)
        print(prompt[:500] + "...")
        print("-"*80 + "\n")

        print_success("Step 2 PASSED: Prompt generation working correctly")
        return True

    except Exception as e:
        print_error(f"Step 2 FAILED: {str(e)}")
        import traceback
        traceback.print_exc()
        return False


async def step_3_gemini_api_call():
    """
    Step 3: Gemini API Call + Response Validation

    Tests:
    - Gemini client initialization
    - API authentication
    - Image generation with gemini-2.5-flash-image model
    - Response payload structure
    - Image data extraction
    """
    print_step_header(3, "Gemini API Call + Response Validation")

    try:
        # Initialize Gemini client
        print_info("Initializing Gemini client...")
        gemini_client = GeminiClient()
        print_success("Gemini client initialized")

        # Validate API key
        if not os.getenv("GEMINI_API_KEY"):
            print_error("GEMINI_API_KEY not found in environment")
            return False
        print_success(f"Gemini API key found: {os.getenv('GEMINI_API_KEY')[:20]}...")

        # Check model
        print_info(f"Using model: {gemini_client.model}")
        if gemini_client.model != "gemini-2.5-flash-image":
            print_error(f"Wrong model! Expected gemini-2.5-flash-image, got {gemini_client.model}")
            return False
        print_success("Correct model: gemini-2.5-flash-image")

        # Generate image
        print_info("Calling Gemini API to generate image...")
        print_info("   This may take 30-60 seconds...")

        start_time = datetime.utcnow()

        image_bytes = await gemini_client.generate_landscape_design(
            input_image=None,  # Text-to-image mode
            address=TEST_ADDRESS,
            area_type=TEST_AREA,
            style=TEST_STYLE,
            custom_prompt=TEST_CUSTOM_PROMPT,
            preservation_strength=0.5
        )

        end_time = datetime.utcnow()
        duration = (end_time - start_time).total_seconds()

        if not image_bytes:
            print_error("Gemini API returned no image data")
            return False

        print_success(f"Image generated successfully in {duration:.1f} seconds")
        print_info(f"   Size: {len(image_bytes):,} bytes ({len(image_bytes) / 1024 / 1024:.2f} MB)")

        # Verify it's a valid image
        if not image_bytes.startswith(b'\x89PNG'):
            print_error("Generated data is not a valid PNG image")
            return False
        print_success("Valid PNG image format confirmed")

        # Save generated image
        image_path = OUTPUT_DIR / "03_gemini_generated.png"
        with open(image_path, "wb") as f:
            f.write(image_bytes)
        print_success(f"Generated image saved: {image_path}")

        # Save metadata
        metadata = {
            "address": TEST_ADDRESS,
            "area": TEST_AREA,
            "style": TEST_STYLE,
            "custom_prompt": TEST_CUSTOM_PROMPT,
            "preservation_strength": 0.5,
            "generation_time_seconds": duration,
            "image_size_bytes": len(image_bytes),
            "image_size_mb": round(len(image_bytes) / 1024 / 1024, 2),
            "model": gemini_client.model,
            "timestamp": end_time.isoformat()
        }

        metadata_path = OUTPUT_DIR / "03_metadata.json"
        with open(metadata_path, "w") as f:
            json.dump(metadata, f, indent=2)
        print_success(f"Metadata saved: {metadata_path}")

        print_success("Step 3 PASSED: Gemini API working correctly")
        return True

    except Exception as e:
        print_error(f"Step 3 FAILED: {str(e)}")
        import traceback
        traceback.print_exc()
        return False


async def step_4_image_display_verification():
    """
    Step 4: Image Display Verification

    Tests:
    - Image can be read from disk
    - Image has correct dimensions
    - Image can be displayed/processed
    - Elegant viewer preparation (metadata, thumbnails)
    """
    print_step_header(4, "Image Display Verification")

    try:
        from PIL import Image

        image_path = OUTPUT_DIR / "03_gemini_generated.png"

        if not image_path.exists():
            print_error(f"Generated image not found at {image_path}")
            return False

        print_info(f"Reading image from: {image_path}")

        # Load image
        img = Image.open(image_path)
        print_success("Image loaded successfully")

        # Get image info
        width, height = img.size
        mode = img.mode
        format_name = img.format

        print_info(f"   Dimensions: {width}x{height}")
        print_info(f"   Mode: {mode}")
        print_info(f"   Format: {format_name}")

        # Verify expected dimensions (should be 1024x1024)
        if width != 1024 or height != 1024:
            print_error(f"Unexpected dimensions! Expected 1024x1024, got {width}x{height}")
            return False
        print_success("Correct dimensions: 1024x1024")

        # Create thumbnail for viewer
        thumbnail_size = (400, 400)
        img_thumb = img.copy()
        img_thumb.thumbnail(thumbnail_size)

        thumbnail_path = OUTPUT_DIR / "04_thumbnail.png"
        img_thumb.save(thumbnail_path)
        print_success(f"Thumbnail created: {thumbnail_path} ({thumbnail_size[0]}x{thumbnail_size[1]})")

        # Create display metadata
        display_metadata = {
            "original_image": str(image_path),
            "thumbnail": str(thumbnail_path),
            "dimensions": {"width": width, "height": height},
            "format": format_name,
            "mode": mode,
            "file_size_bytes": image_path.stat().st_size,
            "display_ready": True,
            "viewer_recommendation": "Use responsive image viewer with zoom capability"
        }

        display_metadata_path = OUTPUT_DIR / "04_display_metadata.json"
        with open(display_metadata_path, "w") as f:
            json.dump(display_metadata, f, indent=2)
        print_success(f"Display metadata saved: {display_metadata_path}")

        print_success("Step 4 PASSED: Image ready for elegant display")
        return True

    except ImportError:
        print_error("PIL/Pillow not installed. Run: pip install Pillow")
        return False
    except Exception as e:
        print_error(f"Step 4 FAILED: {str(e)}")
        import traceback
        traceback.print_exc()
        return False


async def run_all_tests():
    """Run all debug tests in sequence"""
    print("\n" + "🔬"*40)
    print("IMAGE GENERATION INTEGRATION DEBUG TEST SUITE")
    print("🔬"*40 + "\n")

    print_info(f"Output directory: {OUTPUT_DIR}")
    OUTPUT_DIR.mkdir(exist_ok=True)

    # Track results
    results = []

    # Step 1: Maps API
    result1 = await step_1_address_and_maps()
    results.append(("Step 1: Address + Maps API", result1))

    if not result1:
        print_error("Step 1 failed - cannot proceed")
        return False

    # Step 2: Prompt Generation
    result2 = await step_2_prompt_generation()
    results.append(("Step 2: Prompt Generation", result2))

    if not result2:
        print_error("Step 2 failed - cannot proceed")
        return False

    # Step 3: Gemini API
    result3 = await step_3_gemini_api_call()
    results.append(("Step 3: Gemini API Call", result3))

    if not result3:
        print_error("Step 3 failed - cannot proceed")
        return False

    # Step 4: Display Verification
    result4 = await step_4_image_display_verification()
    results.append(("Step 4: Image Display", result4))

    # Print summary
    print("\n" + "="*80)
    print("TEST SUMMARY")
    print("="*80 + "\n")

    passed = sum(1 for _, result in results if result)
    failed = sum(1 for _, result in results if not result)

    for test_name, result in results:
        status = "✅ PASSED" if result else "❌ FAILED"
        print(f"{status} - {test_name}")

    print(f"\n📊 Results: {passed}/4 passed, {failed}/4 failed")

    if failed == 0:
        print("\n🎉 All integration tests passed!")
        print(f"\nGenerated files available at: {OUTPUT_DIR}")
        print("You can now inspect:")
        print("  - 01_street_view.jpg (Google Maps Street View)")
        print("  - 01_satellite_view.jpg (Google Maps Satellite)")
        print("  - 02_gemini_prompt.txt (Prompt sent to Gemini)")
        print("  - 03_gemini_generated.png (Generated landscape design)")
        print("  - 03_metadata.json (Generation metadata)")
        print("  - 04_thumbnail.png (Thumbnail for viewer)")
        print("  - 04_display_metadata.json (Display information)")
        return True
    else:
        print("\n⚠️  Some tests failed. Check errors above for details.")
        return False


if __name__ == "__main__":
    success = asyncio.run(run_all_tests())
    sys.exit(0 if success else 1)
