#!/usr/bin/env python3
"""
Quick test script to verify Gemini API key works after removing restrictions.
Tests the exact same code path used in production.
"""

import os
import sys
import asyncio
from pathlib import Path

# Add src to path
sys.path.insert(0, str(Path(__file__).parent / "src"))

from google import genai
from google.genai import types

# Load environment
from dotenv import load_dotenv
load_dotenv()

async def test_gemini_api():
    """Test Gemini API with a simple image generation request."""

    api_key = os.getenv("GEMINI_API_KEY")

    print("=" * 80)
    print("🧪 GEMINI API KEY TEST")
    print("=" * 80)
    print(f"\n📋 API Key: {api_key[:20]}...{api_key[-10:]}")
    print(f"🎯 Model: gemini-2.5-flash-image")
    print(f"🔧 SDK: google-genai (latest)")

    if not api_key:
        print("\n❌ ERROR: GEMINI_API_KEY not found in environment")
        return False

    try:
        # Create client
        print("\n📡 Step 1: Creating Gemini client...")
        client = genai.Client(api_key=api_key)
        print("   ✅ Client created successfully")

        # Test prompt
        test_prompt = """Generate a modern minimalist front yard landscape design.

Style: Clean lines, simple geometry, minimal plantings
Features: Low-maintenance native plants, geometric concrete walkway, simple lighting
Colors: Neutral tones with green accents

Generate a photorealistic image of this design."""

        print(f"\n📝 Step 2: Preparing test prompt...")
        print(f"   Prompt length: {len(test_prompt)} characters")

        # Configure generation
        generate_content_config = types.GenerateContentConfig(
            temperature=0.7,
            response_modalities=["IMAGE", "TEXT"],
            image_config=types.ImageConfig(
                image_size="1K"  # 1024x1024
            )
        )

        print("\n🎨 Step 3: Calling Gemini API to generate image...")
        print("   ⏱️  This may take 10-30 seconds...")

        # Make the API call
        response = client.models.generate_content(
            model="gemini-2.5-flash-image",
            contents=[
                types.Content(
                    role="user",
                    parts=[types.Part.from_text(text=test_prompt)]
                )
            ],
            config=generate_content_config
        )

        print("   ✅ API call completed successfully!")

        # Check response
        print("\n📦 Step 4: Processing response...")

        image_data = None
        text_response = ""

        if response and response.candidates:
            for part in response.candidates[0].content.parts:
                if hasattr(part, 'inline_data') and part.inline_data and part.inline_data.data:
                    image_data = part.inline_data.data
                    print(f"   ✅ Image data received: {len(image_data)} bytes")
                elif hasattr(part, 'text') and part.text:
                    text_response += part.text
                    print(f"   📄 Text response: {text_response[:100]}...")

        if image_data:
            print("\n" + "=" * 80)
            print("✅ SUCCESS! Gemini API is working correctly!")
            print("=" * 80)
            print(f"\n✨ Generated image size: {len(image_data):,} bytes")
            print(f"✨ Image data type: {type(image_data)}")

            # Save test image
            output_path = Path(__file__).parent / "test_gemini_output.png"
            with open(output_path, "wb") as f:
                f.write(image_data)
            print(f"✨ Test image saved to: {output_path}")

            print("\n🎉 Your Gemini API key is working perfectly!")
            print("🎉 Image generation is ready for production use!")
            return True
        else:
            print("\n⚠️  WARNING: API call succeeded but no image data received")
            print(f"   Response candidates: {len(response.candidates) if response.candidates else 0}")
            if text_response:
                print(f"   Text received: {text_response}")
            return False

    except Exception as e:
        print("\n" + "=" * 80)
        print("❌ ERROR: Gemini API call failed")
        print("=" * 80)
        print(f"\n🔴 Error type: {type(e).__name__}")
        print(f"🔴 Error message: {str(e)}")

        # Parse detailed error if available
        if hasattr(e, 'args') and len(e.args) > 0:
            error_details = str(e.args[0])
            if "API key expired" in error_details:
                print("\n💡 Diagnosis: API key is expired")
                print("   Solution: Create a new API key at https://aistudio.google.com")
            elif "API_KEY_INVALID" in error_details:
                print("\n💡 Diagnosis: API key is invalid or revoked")
                print("   Solution: Create a new API key at https://aistudio.google.com")
            elif "quota" in error_details.lower():
                print("\n💡 Diagnosis: Quota exceeded")
                print("   Solution: Check your quota limits in Google Cloud Console")
            elif "permission" in error_details.lower():
                print("\n💡 Diagnosis: Permission denied")
                print("   Solution: Enable Generative Language API in Google Cloud Console")

        return False

if __name__ == "__main__":
    print("\n🚀 Starting Gemini API test...\n")
    success = asyncio.run(test_gemini_api())

    print("\n" + "=" * 80)
    if success:
        print("✅ TEST PASSED - Ready to use Gemini in production!")
        print("=" * 80)
        sys.exit(0)
    else:
        print("❌ TEST FAILED - Please fix the issues above before proceeding")
        print("=" * 80)
        sys.exit(1)
