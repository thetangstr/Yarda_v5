#!/usr/bin/env python3
"""
Test script to verify prompt generation logic for all area/style combinations.

This script simulates the Gemini prompt building without requiring authentication
or actual API calls.
"""

# Area type descriptions (from backend/src/services/gemini_client.py)
area_descriptions = {
    "front_yard": "front yard entrance and curb appeal",
    "backyard": "backyard outdoor living space",
    "walkway": "walkway and pathway landscaping",
    "side_yard": "side yard utility and aesthetic design"
}

# Style descriptions (from backend/src/services/gemini_client.py)
style_descriptions = {
    "modern_minimalist": "modern minimalist design with clean lines and minimal plantings",
    "california_native": "California native plants with drought-resistant landscaping",
    "japanese_zen": "Japanese zen garden with rocks, bamboo, and meditation spaces",
    "english_garden": "English cottage garden with lush flowers and romantic pathways",
    "desert_landscape": "desert landscape with cacti, succulents, and xeriscaping"
}


def build_prompt(area_type: str, style: str, address: str = None, custom_prompt: str = None) -> str:
    """
    Build the Gemini prompt for landscape generation.

    This matches the logic in backend/src/services/gemini_client.py:_build_prompt()
    """
    area_desc = area_descriptions.get(area_type, area_type)
    style_desc = style_descriptions.get(style, style)

    prompt = f"""Generate a professional landscape design for a {area_desc}.
Style: {style_desc}

Requirements:
- Photo-realistic rendering
- Professional landscape architecture quality
- Incorporate the specified style elements
- Maintain proper scale and proportions
- Include appropriate plants for the climate
- Show proper hardscaping (paths, patios, etc.)
"""

    if address:
        prompt += f"\nProperty location: {address}"

    if custom_prompt:
        prompt += f"\n\nAdditional requirements: {custom_prompt}"

    prompt += "\n\nGenerate a high-quality landscape design image."

    return prompt


def test_all_combinations(test_address: str = "22054 clearwood ct cupertino 95014"):
    """Test all area/style combinations with the test address."""

    print("=" * 80)
    print("LANDSCAPE GENERATION PROMPT TEST")
    print("=" * 80)
    print(f"\nTest Address: {test_address}\n")

    test_count = 0

    # Test all combinations
    for area_type, area_label in [
        ("front_yard", "Front Yard"),
        ("backyard", "Backyard"),
        ("walkway", "Walkway"),
        ("side_yard", "Side Yard")
    ]:
        for style, style_label in [
            ("modern_minimalist", "Modern Minimalist"),
            ("california_native", "California Native"),
            ("japanese_zen", "Japanese Zen"),
            ("english_garden", "English Garden"),
            ("desert_landscape", "Desert Landscape")
        ]:
            test_count += 1
            print(f"\n{'=' * 80}")
            print(f"TEST #{test_count}: {area_label} + {style_label}")
            print(f"API Values: area='{area_type}', style='{style}'")
            print(f"{'=' * 80}\n")

            prompt = build_prompt(area_type, style, test_address)
            print(prompt)
            print()

    print(f"\n{'=' * 80}")
    print(f"TOTAL TESTS: {test_count}")
    print(f"{'=' * 80}\n")


def test_with_custom_prompt():
    """Test with custom user prompt."""

    print("\n" + "=" * 80)
    print("CUSTOM PROMPT TEST")
    print("=" * 80 + "\n")

    custom_prompts = [
        "Add a water feature",
        "Include native California plants only",
        "Design for low maintenance",
        "Add seating area for entertaining"
    ]

    for i, custom in enumerate(custom_prompts, 1):
        print(f"\nCUSTOM PROMPT TEST #{i}")
        print(f"Custom: {custom}")
        print("-" * 80 + "\n")

        prompt = build_prompt(
            "backyard",
            "modern_minimalist",
            "22054 clearwood ct cupertino 95014",
            custom
        )
        print(prompt)
        print()


def test_edge_cases():
    """Test edge cases."""

    print("\n" + "=" * 80)
    print("EDGE CASE TESTS")
    print("=" * 80 + "\n")

    # Test 1: No address
    print("TEST: No address provided")
    print("-" * 80)
    prompt = build_prompt("front_yard", "modern_minimalist")
    print(prompt)
    print()

    # Test 2: Long address
    print("\nTEST: Long address")
    print("-" * 80)
    prompt = build_prompt(
        "backyard",
        "japanese_zen",
        "1234 Very Long Street Name Avenue, Apartment Building Complex Unit 567, San Francisco, California 94102, United States"
    )
    print(prompt)
    print()

    # Test 3: Invalid area type (should fall back to value)
    print("\nTEST: Invalid area type (should use raw value)")
    print("-" * 80)
    prompt = build_prompt("invalid_area", "modern_minimalist", "123 Main St")
    print(prompt)
    print()


def verify_prompt_elements():
    """Verify all required elements are in prompts."""

    print("\n" + "=" * 80)
    print("PROMPT VALIDATION")
    print("=" * 80 + "\n")

    required_elements = [
        "Generate a professional landscape design",
        "Photo-realistic rendering",
        "Professional landscape architecture quality",
        "proper scale and proportions",
        "appropriate plants for the climate",
        "proper hardscaping"
    ]

    test_prompt = build_prompt(
        "front_yard",
        "modern_minimalist",
        "22054 clearwood ct cupertino 95014"
    )

    print("Checking for required elements:\n")
    all_present = True

    for element in required_elements:
        present = element.lower() in test_prompt.lower()
        status = "✓" if present else "✗"
        print(f"{status} {element}")
        if not present:
            all_present = False

    print(f"\n{'✓ ALL ELEMENTS PRESENT' if all_present else '✗ MISSING ELEMENTS'}")
    print()


if __name__ == "__main__":
    # Run all tests
    test_all_combinations()
    test_with_custom_prompt()
    test_edge_cases()
    verify_prompt_elements()

    print("\n" + "=" * 80)
    print("API ENDPOINT INFORMATION")
    print("=" * 80)
    print("""
Backend API: https://yarda-api-production.up.railway.app

Endpoint: POST /v1/generations

Headers:
  Content-Type: multipart/form-data
  Authorization: Bearer <access_token>

Form Data:
  address: string (required) - Property address
  area: string (required) - One of: front_yard, backyard, walkway, side_yard
  style: string (required) - One of: modern_minimalist, california_native,
                              japanese_zen, english_garden, desert_landscape
  custom_prompt: string (optional) - Additional design instructions
  image: file (optional) - User uploaded image

Expected Response:
{
  "id": "uuid",
  "status": "pending",
  "payment_method": "trial|token|subscription",
  "image_source": "google_street_view|user_upload",
  "message": "Generation started. This may take 30-60 seconds."
}
""")
    print("=" * 80 + "\n")
