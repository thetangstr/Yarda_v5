"""
Prompt Builder Service

Assembles dynamic prompts for landscape generation based on:
- Style templates
- Preservation strength
- Custom user prompts
- Area-specific modifiers

Based on Yarda v2 implementation with enhancements.
"""

from typing import Optional
from .prompt_templates import get_style_prompt


class PromptBuilder:
    """
    Builder class for assembling landscape generation prompts.
    """

    def __init__(self):
        """Initialize the prompt builder."""
        pass

    def build_prompt(
        self,
        style: str,
        preservation_strength: float = 0.5,
        custom_prompt: Optional[str] = None,
        area: Optional[str] = None,
        address: Optional[str] = None,
    ) -> str:
        """
        Build a complete prompt for landscape generation.

        Args:
            style: The landscape style identifier (e.g., 'modern_minimalist')
            preservation_strength: Float 0.0-1.0 controlling transformation intensity
                - 0.0-0.4: Dramatic transformation
                - 0.4-0.6: Balanced transformation
                - 0.6-1.0: Subtle refinement
            custom_prompt: Optional user-provided custom instructions
            area: Optional area identifier ('front_yard', 'back_yard', 'walkway')
            address: Optional property address for context

        Returns:
            Complete assembled prompt string

        Raises:
            ValueError: If style is not found or preservation_strength is out of range
        """
        # Validate inputs
        if not 0.0 <= preservation_strength <= 1.0:
            raise ValueError(f"preservation_strength must be between 0.0 and 1.0, got {preservation_strength}")

        # Get base style prompt
        base_prompt = get_style_prompt(style)
        if not base_prompt:
            raise ValueError(f"Unknown style: {style}. Please use a valid style identifier.")

        # Start building the final prompt
        prompt_parts = []

        # Add area-specific prefix if provided
        if area:
            area_prefix = self._get_area_prefix(area)
            if area_prefix:
                prompt_parts.append(area_prefix)

        # Add base style prompt
        prompt_parts.append(base_prompt)

        # Add preservation strength modifier
        preservation_modifier = self._get_preservation_modifier(preservation_strength)
        if preservation_modifier:
            prompt_parts.append(preservation_modifier)

        # Add custom user prompt if provided
        if custom_prompt and custom_prompt.strip():
            custom_modifier = f"\n\n**Additional Custom Requirements:**\n{custom_prompt.strip()}"
            prompt_parts.append(custom_modifier)

        # Add address context if provided
        if address:
            address_context = f"\n\n**Property Location:** {address}"
            prompt_parts.append(address_context)

        # Add quality and technical modifiers (area-specific)
        prompt_parts.append(self._get_quality_modifiers(area))

        # Assemble final prompt
        final_prompt = "\n".join(prompt_parts)

        return final_prompt

    def _get_area_prefix(self, area: str) -> Optional[str]:
        """
        Get area-specific prefix for the prompt.

        Args:
            area: Area identifier

        Returns:
            Area-specific prefix string or None
        """
        area_prefixes = {
            "front_yard": "**FOCUS AREA: FRONT YARD (Street View)**\nPrimary focus on the front yard entrance and curb appeal.",
            "back_yard": "**FOCUS AREA: BACK YARD (Satellite Reference → 45° Perspective)**\n**INPUT IMAGE:** You are viewing an OVERHEAD SATELLITE IMAGE as a reference to understand the backyard layout, boundaries, and spatial dimensions.\n**YOUR TASK:** Use this overhead reference to CREATE A NEW IMAGE from a 45-degree angle, semi-ground level perspective showing a professionally designed backyard landscape. This should look like an architectural rendering or professional landscape design visualization, NOT a modified satellite view.\nPrimary focus on the backyard and outdoor living spaces.",
            "backyard": "**FOCUS AREA: BACK YARD (Satellite Reference → 45° Perspective)**\n**INPUT IMAGE:** You are viewing an OVERHEAD SATELLITE IMAGE as a reference to understand the backyard layout, boundaries, and spatial dimensions.\n**YOUR TASK:** Use this overhead reference to CREATE A NEW IMAGE from a 45-degree angle, semi-ground level perspective showing a professionally designed backyard landscape. This should look like an architectural rendering or professional landscape design visualization, NOT a modified satellite view.\nPrimary focus on the backyard and outdoor living spaces.",  # Support both variants
            "side_yard": "**FOCUS AREA: SIDE YARD (Satellite Reference → 45° Perspective)**\n**INPUT IMAGE:** You are viewing an OVERHEAD SATELLITE IMAGE as a reference to understand the side yard layout.\n**YOUR TASK:** Use this overhead reference to CREATE A NEW IMAGE from a 45-degree angle, semi-ground level perspective showing a professionally designed side yard.\nPrimary focus on the side yard pathway and transitional spaces.",
            "walkway": "**FOCUS AREA: WALKWAY (Satellite Reference → Ground Level)**\n**INPUT IMAGE:** You are viewing an OVERHEAD SATELLITE IMAGE as a reference to understand the walkway layout and surroundings.\n**YOUR TASK:** Use this overhead reference to CREATE A NEW IMAGE from a ground-level perspective showing a professionally designed walkway and pathway system. This should look like a ground-level photo of a beautifully designed pathway, NOT a modified satellite view.\nPrimary focus on the walkway, pathways, and circulation.",
        }
        return area_prefixes.get(area)

    def _get_preservation_modifier(self, preservation_strength: float) -> str:
        """
        Get preservation modifier based on strength value.

        Based on v2 implementation:
        - 0.6+: Subtle changes
        - 0.4-0.6: Balanced
        - <0.4: Dramatic

        Args:
            preservation_strength: Float 0.0-1.0

        Returns:
            Preservation modifier string
        """
        if preservation_strength > 0.6:
            return """
**PRESERVATION LEVEL: SUBTLE REFINEMENT**
- Make subtle, refined changes while keeping the overall scene very similar
- Preserve existing mature plants where possible
- Focus on enhancement rather than replacement
- Maintain the current character and scale
- Keep existing hardscaping and major features intact"""

        elif preservation_strength > 0.4:
            return """
**PRESERVATION LEVEL: BALANCED TRANSFORMATION**
- Balance transformation with preservation of the original character
- Keep major existing trees and structural elements
- Update plantings while respecting the existing layout
- Enhance rather than completely replace"""

        else:  # preservation_strength <= 0.4
            return """
**PRESERVATION LEVEL: DRAMATIC TRANSFORMATION**
- Feel free to make dramatic improvements while keeping the house intact
- Complete redesign of landscaping is encouraged
- Bold changes to create maximum visual impact
- Transform the entire yard aesthetic"""

    def _get_quality_modifiers(self, area: Optional[str] = None) -> str:
        """
        Get technical quality modifiers for consistent high-quality output.

        Different instructions for street view vs satellite imagery.

        Args:
            area: Area identifier to determine if satellite or street view

        Returns:
            Quality modifier string
        """
        # Check if this is a satellite view (backyard, walkway, side_yard)
        is_satellite = area in ["back_yard", "backyard", "walkway", "side_yard"]

        if is_satellite:
            # Satellite imagery: Use as reference to generate NEW PERSPECTIVE
            return """
**CRITICAL PERSPECTIVE TRANSFORMATION INSTRUCTIONS:**

**WHAT YOU ARE GIVEN:**
- An overhead satellite image as a REFERENCE ONLY
- Use it to understand: property boundaries, spatial layout, dimensions, orientation

**WHAT YOU MUST CREATE:**
- **For Backyard/Side Yard:** A NEW IMAGE from a 45-degree angle, semi-ground level perspective
- **For Walkway:** A NEW IMAGE from ground-level perspective
- This should look like a professional architectural rendering or design visualization
- NOT a modified or enhanced version of the satellite image

**PERSPECTIVE REQUIREMENTS:**

**45-Degree Angle (Backyard/Side Yard):**
- Camera angle: Elevated 45-degree viewing angle (architectural visualization style)
- Viewpoint: As if standing at the back of the property, looking across the yard
- Show depth and dimensionality - this is NOT a flat overhead view
- Include vertical elements: fences, pergolas, plantings, outdoor structures
- Professional architectural rendering quality

**Ground-Level (Walkway):**
- Camera angle: Eye-level, standing on the pathway looking forward
- Viewpoint: As if walking through the designed landscape
- Show the pathway from the user's perspective
- Include surrounding landscape elements at natural viewing height
- Professional photography quality

**DESIGN ELEMENTS TO INCLUDE:**
1. **Hardscaping:** Patios, decks, pergolas, fire pits, outdoor kitchens, retaining walls
2. **Softscaping:** Lush plantings, trees, shrubs, flower beds, ground cover
3. **Features:** Water features, lighting, outdoor furniture, decorative elements
4. **Materials:** Stone, wood, pavers, gravel - show texture and detail from the new perspective
5. **Depth & Dimension:** Show layers, depth, and 3D spatial relationships

**QUALITY STANDARDS:**
- High-resolution, photorealistic rendering
- Professional landscape architecture quality
- Natural lighting and shadows appropriate for the perspective
- Rich colors and textures
- Seamless integration of all design elements

**REMEMBER:**
- The satellite image is ONLY a reference for understanding the space
- You are creating a COMPLETELY NEW IMAGE from a different viewing angle
- This should look like a professional design rendering, NOT an enhanced satellite photo"""
        else:
            # Street view: Preserve house structure
            return """
**TECHNICAL REQUIREMENTS FOR STREET VIEW:**
- High-resolution, photorealistic rendering
- Professional landscape design quality
- Accurate plant proportions and realistic growth patterns
- Proper perspective and lighting
- Natural color balance and saturation
- Seamless integration with existing architecture

**CRITICAL:** The house structure, windows, doors, and roofline must remain exactly as shown in the original image. Only modify the landscape, hardscaping, and outdoor elements."""


# Singleton instance for easy import
prompt_builder = PromptBuilder()


def build_landscape_prompt(
    style: str,
    preservation_strength: float = 0.5,
    custom_prompt: Optional[str] = None,
    area: Optional[str] = None,
    address: Optional[str] = None,
) -> str:
    """
    Convenience function to build a landscape generation prompt.

    Args:
        style: The landscape style identifier
        preservation_strength: Float 0.0-1.0 controlling transformation intensity
        custom_prompt: Optional user-provided custom instructions
        area: Optional area identifier
        address: Optional property address

    Returns:
        Complete assembled prompt string

    Example:
        >>> prompt = build_landscape_prompt(
        ...     style="modern_minimalist",
        ...     preservation_strength=0.7,
        ...     custom_prompt="Add a water feature",
        ...     area="front_yard"
        ... )
    """
    return prompt_builder.build_prompt(
        style=style,
        preservation_strength=preservation_strength,
        custom_prompt=custom_prompt,
        area=area,
        address=address,
    )
