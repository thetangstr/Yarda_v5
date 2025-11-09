"""
Unit tests for the prompt builder service.

Tests verify that prompts are correctly assembled from:
- Style-specific templates
- Preservation strength modifiers
- Custom user prompts
- Area-specific prefixes
- Address context
"""

import pytest
from src.services.prompt_builder import (
    PromptBuilder,
    build_landscape_prompt,
)
from src.services.prompt_templates import (
    get_style_prompt,
    get_available_styles,
    get_style_metadata,
)


class TestPromptTemplates:
    """Test prompt template retrieval and metadata."""

    def test_get_style_prompt_returns_template(self):
        """Test that valid styles return prompt templates."""
        prompt = get_style_prompt("modern_minimalist")
        assert prompt is not None
        assert "modern minimalist" in prompt.lower()
        assert "**Design Philosophy:**" in prompt

    def test_get_style_prompt_unknown_style(self):
        """Test that unknown styles return None."""
        prompt = get_style_prompt("nonexistent_style")
        assert prompt is None

    def test_get_available_styles_returns_list(self):
        """Test that available styles are returned."""
        styles = get_available_styles()
        assert isinstance(styles, list)
        assert len(styles) == 10  # We have 10 styles defined
        assert "modern_minimalist" in styles
        assert "japanese_zen" in styles
        assert "california_native" in styles

    def test_get_style_metadata_returns_dict(self):
        """Test that style metadata is returned."""
        metadata = get_style_metadata("modern_minimalist")
        assert metadata is not None
        assert "name" in metadata
        assert "description" in metadata
        assert metadata["name"] == "Modern Minimalist"

    def test_all_styles_have_metadata(self):
        """Test that all styles have corresponding metadata."""
        styles = get_available_styles()
        for style in styles:
            metadata = get_style_metadata(style)
            assert metadata is not None
            assert "name" in metadata
            assert "description" in metadata


class TestPromptBuilder:
    """Test the PromptBuilder class functionality."""

    def setup_method(self):
        """Set up test fixtures."""
        self.builder = PromptBuilder()

    def test_build_basic_prompt(self):
        """Test building a basic prompt with just style."""
        prompt = self.builder.build_prompt(style="modern_minimalist")

        # Should contain the style template
        assert "modern minimalist" in prompt.lower()

        # Should contain quality modifiers
        assert "**TECHNICAL REQUIREMENTS:**" in prompt
        assert "photorealistic" in prompt.lower()

    def test_build_prompt_with_preservation_subtle(self):
        """Test prompt with subtle preservation (>0.6)."""
        prompt = self.builder.build_prompt(
            style="modern_minimalist",
            preservation_strength=0.8
        )

        assert "**PRESERVATION LEVEL: SUBTLE REFINEMENT**" in prompt
        assert "subtle, refined changes" in prompt.lower()

    def test_build_prompt_with_preservation_balanced(self):
        """Test prompt with balanced preservation (0.4-0.6)."""
        prompt = self.builder.build_prompt(
            style="modern_minimalist",
            preservation_strength=0.5
        )

        assert "**PRESERVATION LEVEL: BALANCED TRANSFORMATION**" in prompt
        assert "balance transformation" in prompt.lower()

    def test_build_prompt_with_preservation_dramatic(self):
        """Test prompt with dramatic preservation (<0.4)."""
        prompt = self.builder.build_prompt(
            style="modern_minimalist",
            preservation_strength=0.3
        )

        assert "**PRESERVATION LEVEL: DRAMATIC TRANSFORMATION**" in prompt
        assert "dramatic improvements" in prompt.lower()

    def test_build_prompt_with_custom_prompt(self):
        """Test prompt with custom user instructions."""
        custom = "Add a water feature near the entrance"
        prompt = self.builder.build_prompt(
            style="modern_minimalist",
            custom_prompt=custom
        )

        assert "**Additional Custom Requirements:**" in prompt
        assert custom in prompt

    def test_build_prompt_with_area(self):
        """Test prompt with area-specific prefix."""
        prompt = self.builder.build_prompt(
            style="modern_minimalist",
            area="front_yard"
        )

        assert "**FOCUS AREA: FRONT YARD**" in prompt
        assert "front yard entrance and curb appeal" in prompt.lower()

    def test_build_prompt_with_address(self):
        """Test prompt with property address."""
        address = "123 Main St, San Francisco, CA"
        prompt = self.builder.build_prompt(
            style="modern_minimalist",
            address=address
        )

        assert "**Property Location:**" in prompt
        assert address in prompt

    def test_build_prompt_all_parameters(self):
        """Test prompt with all parameters combined."""
        prompt = self.builder.build_prompt(
            style="japanese_zen",
            preservation_strength=0.7,
            custom_prompt="Include a koi pond",
            area="back_yard",
            address="456 Elm St, Seattle, WA"
        )

        # Check all components are present
        assert "japanese zen" in prompt.lower()
        assert "**FOCUS AREA: BACK YARD**" in prompt
        assert "**PRESERVATION LEVEL: SUBTLE REFINEMENT**" in prompt
        assert "Include a koi pond" in prompt
        assert "456 Elm St, Seattle, WA" in prompt
        assert "**TECHNICAL REQUIREMENTS:**" in prompt

    def test_preservation_strength_validation(self):
        """Test that invalid preservation strength raises error."""
        with pytest.raises(ValueError, match="preservation_strength must be between"):
            self.builder.build_prompt(
                style="modern_minimalist",
                preservation_strength=1.5
            )

        with pytest.raises(ValueError, match="preservation_strength must be between"):
            self.builder.build_prompt(
                style="modern_minimalist",
                preservation_strength=-0.1
            )

    def test_unknown_style_raises_error(self):
        """Test that unknown style raises error."""
        with pytest.raises(ValueError, match="Unknown style"):
            self.builder.build_prompt(style="nonexistent_style")

    def test_empty_custom_prompt_ignored(self):
        """Test that empty custom prompts are ignored."""
        prompt1 = self.builder.build_prompt(style="modern_minimalist")
        prompt2 = self.builder.build_prompt(
            style="modern_minimalist",
            custom_prompt=""
        )
        prompt3 = self.builder.build_prompt(
            style="modern_minimalist",
            custom_prompt="   "
        )

        # All should be identical (empty custom prompts ignored)
        assert prompt1 == prompt2
        assert prompt1 == prompt3

    def test_area_prefix_for_all_areas(self):
        """Test area prefixes for all supported areas."""
        areas = {
            "front_yard": "FRONT YARD",
            "back_yard": "BACK YARD",
            "side_yard": "SIDE YARD",
            "walkway": "WALKWAY"
        }

        for area_key, area_name in areas.items():
            prompt = self.builder.build_prompt(
                style="modern_minimalist",
                area=area_key
            )
            assert f"**FOCUS AREA: {area_name}**" in prompt

    def test_unknown_area_ignored(self):
        """Test that unknown areas don't add prefix."""
        prompt = self.builder.build_prompt(
            style="modern_minimalist",
            area="unknown_area"
        )

        # Should not have any area prefix
        assert "**FOCUS AREA:" not in prompt


class TestBuildLandscapePrompt:
    """Test the convenience function."""

    def test_build_landscape_prompt_basic(self):
        """Test the convenience function works."""
        prompt = build_landscape_prompt(style="modern_minimalist")

        assert "modern minimalist" in prompt.lower()
        assert "**TECHNICAL REQUIREMENTS:**" in prompt

    def test_build_landscape_prompt_with_parameters(self):
        """Test convenience function with all parameters."""
        prompt = build_landscape_prompt(
            style="english_cottage",
            preservation_strength=0.5,
            custom_prompt="Add rose arbor",
            area="front_yard",
            address="789 Oak Ave"
        )

        assert "english cottage" in prompt.lower()
        assert "**PRESERVATION LEVEL: BALANCED TRANSFORMATION**" in prompt
        assert "Add rose arbor" in prompt
        assert "**FOCUS AREA: FRONT YARD**" in prompt
        assert "789 Oak Ave" in prompt


class TestPromptStructure:
    """Test the overall structure and quality of generated prompts."""

    def setup_method(self):
        """Set up test fixtures."""
        self.builder = PromptBuilder()

    def test_prompt_order(self):
        """Test that prompt components appear in the correct order."""
        prompt = self.builder.build_prompt(
            style="modern_minimalist",
            preservation_strength=0.5,
            custom_prompt="Custom instructions",
            area="front_yard",
            address="123 Main St"
        )

        # Split into lines for easier analysis
        lines = prompt.split('\n')
        prompt_text = '\n'.join(lines)

        # Area should come before style
        area_pos = prompt_text.find("**FOCUS AREA:")
        style_pos = prompt_text.find("modern minimalist")
        assert area_pos < style_pos

        # Preservation should come after style
        preservation_pos = prompt_text.find("**PRESERVATION LEVEL:")
        assert style_pos < preservation_pos

        # Custom prompt should come after preservation
        custom_pos = prompt_text.find("**Additional Custom Requirements:**")
        assert preservation_pos < custom_pos

        # Address should come after custom
        address_pos = prompt_text.find("**Property Location:**")
        assert custom_pos < address_pos

        # Technical requirements should be last
        tech_pos = prompt_text.find("**TECHNICAL REQUIREMENTS:**")
        assert address_pos < tech_pos

    def test_prompt_preserves_house_structure(self):
        """Test that all prompts include house preservation instruction."""
        styles = get_available_styles()

        for style in styles:
            prompt = build_landscape_prompt(style=style)
            # Should appear in either the template or technical requirements
            assert (
                "house" in prompt.lower() and
                ("preserve" in prompt.lower() or "remain" in prompt.lower())
            )

    def test_all_styles_produce_valid_prompts(self):
        """Test that all styles can generate valid prompts."""
        styles = get_available_styles()

        for style in styles:
            # Test with various preservation strengths
            for strength in [0.3, 0.5, 0.8]:
                prompt = build_landscape_prompt(
                    style=style,
                    preservation_strength=strength
                )

                # Should be non-empty and contain key sections
                assert len(prompt) > 0
                assert "**PRESERVATION LEVEL:" in prompt
                assert "**TECHNICAL REQUIREMENTS:**" in prompt

    def test_prompt_length_reasonable(self):
        """Test that generated prompts are comprehensive but not excessive."""
        prompt = build_landscape_prompt(
            style="modern_minimalist",
            preservation_strength=0.5,
            custom_prompt="Add water feature",
            area="front_yard",
            address="123 Main St"
        )

        # Should be detailed (>500 chars) but not overly long (<5000 chars)
        assert len(prompt) > 500
        assert len(prompt) < 5000
