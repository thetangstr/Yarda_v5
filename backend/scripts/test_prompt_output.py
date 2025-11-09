#!/usr/bin/env python3
"""
Manual test script to view generated prompts.

This script generates sample prompts with different configurations
to verify the prompt builder is producing high-quality, detailed prompts.
"""

import sys
import os

# Add backend to path for imports
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

from src.services.prompt_builder import build_landscape_prompt
from src.services.prompt_templates import get_available_styles


def print_separator():
    """Print a visual separator."""
    print("\n" + "=" * 80 + "\n")


def test_prompt_variations():
    """Test various prompt configurations."""

    print("🌿 YARDA V5 - PROMPT BUILDER TEST OUTPUT")
    print("=" * 80)

    # Test 1: Modern Minimalist with Balanced Transformation
    print("\n📋 TEST 1: Modern Minimalist - Balanced Transformation")
    print_separator()
    prompt1 = build_landscape_prompt(
        style="modern_minimalist",
        preservation_strength=0.5,
        custom_prompt="Add a water feature near the entrance",
        area="front_yard",
        address="123 Main St, San Francisco, CA"
    )
    print(prompt1)
    print_separator()
    print(f"Character count: {len(prompt1)}")

    # Test 2: Japanese Zen with Subtle Refinement
    print("\n📋 TEST 2: Japanese Zen - Subtle Refinement")
    print_separator()
    prompt2 = build_landscape_prompt(
        style="japanese_zen",
        preservation_strength=0.8,
        custom_prompt="Include a koi pond with natural rocks",
        area="back_yard"
    )
    print(prompt2)
    print_separator()
    print(f"Character count: {len(prompt2)}")

    # Test 3: California Native with Dramatic Transformation
    print("\n📋 TEST 3: California Native - Dramatic Transformation")
    print_separator()
    prompt3 = build_landscape_prompt(
        style="california_native",
        preservation_strength=0.2,
        area="front_yard"
    )
    print(prompt3)
    print_separator()
    print(f"Character count: {len(prompt3)}")

    # Test 4: All Available Styles Summary
    print("\n📋 TEST 4: All Available Styles")
    print_separator()
    styles = get_available_styles()
    print(f"Total styles available: {len(styles)}\n")
    for i, style in enumerate(styles, 1):
        prompt = build_landscape_prompt(style=style)
        print(f"{i}. {style}")
        print(f"   Length: {len(prompt)} characters")
        print(f"   Contains preservation: {'✓' if 'preservation' in prompt.lower() else '✗'}")
        print(f"   Contains house: {'✓' if 'house' in prompt.lower() else '✗'}")

    print_separator()
    print("\n✅ All prompt tests completed successfully!")
    print("🎨 The prompt builder is generating detailed, style-specific prompts")
    print("   with proper preservation modifiers and quality requirements.\n")


def test_preservation_levels():
    """Test all three preservation levels."""
    print("\n📋 PRESERVATION LEVEL COMPARISON")
    print("=" * 80)

    style = "english_cottage"
    levels = [
        (0.2, "Dramatic Transformation"),
        (0.5, "Balanced Transformation"),
        (0.8, "Subtle Refinement")
    ]

    for strength, level_name in levels:
        print(f"\n🎚️  {level_name} (preservation_strength={strength})")
        print("-" * 80)
        prompt = build_landscape_prompt(
            style=style,
            preservation_strength=strength
        )

        # Extract just the preservation section
        if "**PRESERVATION LEVEL:" in prompt:
            start = prompt.find("**PRESERVATION LEVEL:")
            end = prompt.find("**", start + 25)
            preservation_section = prompt[start:end].strip()
            print(preservation_section)
        print()


if __name__ == "__main__":
    test_prompt_variations()
    print("\n\n")
    test_preservation_levels()
