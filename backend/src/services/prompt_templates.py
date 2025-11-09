"""
Style-Specific Prompt Templates for Landscape Generation

This module contains detailed, style-specific prompts for AI-powered landscape design.
Each prompt includes:
- Design philosophy and aesthetic principles
- Specific plant species and materials
- Architectural elements and features
- Preservation instructions

Based on Yarda v2 implementation with enhancements for v5.
"""

from typing import Dict, Optional

# Core style prompt templates (reduced to 3 core styles)
STYLE_PROMPTS: Dict[str, str] = {
    "minimalist": """Transform this residential landscape into a stunning modern minimalist design:

**Design Philosophy:**
- Clean geometric lines and structured plantings
- Limited color palette with focus on greens and grays
- Zen-inspired simplicity with negative space

**Plant Selection:**
- Drought-tolerant plants arranged in architectural patterns
- Ornamental grasses (Miscanthus, Pennisetum, Blue Fescue)
- Structured evergreens (Boxwood, Japanese Yew)
- Agave and succulents for accent

**Hardscaping & Materials:**
- Contemporary materials (poured concrete, steel edging, glass accents)
- Linear pathways with clean edges
- Gravel or decomposed granite for ground cover
- Modern outdoor lighting (LED strips, uplights)

**Key Features:**
- Geometric planting beds with precise edges
- Minimalist water features (linear fountains, reflecting pools)
- Contemporary sculptures or art pieces
- Hidden drainage and irrigation

**Important:** Preserve the house structure exactly as shown.""",

    "mediterranean": """Transform this residential landscape into a classic Mediterranean garden:

**Design Philosophy:**
- Warm earth tones and sun-loving plants
- Terracotta and natural stone elements
- Drought-tolerant and heat-resistant design

**Plant Selection:**
- Olive trees and Italian Cypress
- Lavender, Rosemary, and Mediterranean herbs
- Citrus trees (Lemon, Orange, Kumquat)
- Bougainvillea and Jasmine for climbing
- Santolina and Germander for low hedges
- Agapanthus and Society Garlic for color

**Hardscaping & Materials:**
- Terracotta tiles and clay paving
- Natural stone walls and gravel paths
- Wrought iron accents and arbors
- Terracotta pots and urns

**Key Features:**
- Courtyard-style seating areas
- Fountain or water feature as focal point
- Pergola with climbing vines
- Herb gardens in raised beds or containers
- Warm-toned gravel or decomposed granite
- Stone walls with built-in seating

**Important:** Preserve the house structure exactly as shown.""",

    "california_native": """Transform this residential landscape into a sustainable California native garden:

**Design Philosophy:**
- Drought-tolerant and water-wise design
- Support for local wildlife and pollinators
- Mediterranean-inspired naturalistic style

**Plant Selection:**
- California natives (Sage, Buckwheat, Manzanita)
- Ceanothus (California Lilac) - various species
- California Poppy and native wildflowers
- Toyon (California Holly) and Coffeeberry
- Native grasses (Purple Needlegrass, Deer Grass)
- Matilija Poppy and Penstemon for accents
- Oaks (if space permits) or California Sycamore

**Hardscaping & Materials:**
- Decomposed granite pathways and patios
- Natural stone (local sourcing preferred)
- Permeable paving for water infiltration
- Mulch (wood chips or bark) for moisture retention

**Key Features:**
- Dry creek beds for drainage and aesthetics
- Rock gardens with succulents and natives
- Habitat-friendly features (bird houses, bee hotels)
- Low-maintenance native grass meadows
- Drought-tolerant ground covers (Silver Carpet, Yarrow)
- Sustainable irrigation (drip systems, rainwater harvesting)

**Important:** Preserve the house structure exactly as shown.""",
}


def get_style_prompt(style: str) -> Optional[str]:
    """
    Get the detailed prompt for a specific landscape style.

    Args:
        style: The style identifier (e.g., 'modern_minimalist', 'japanese_zen')

    Returns:
        The detailed prompt string for the style, or None if style not found
    """
    return STYLE_PROMPTS.get(style)


def get_available_styles() -> list[str]:
    """
    Get a list of all available style identifiers.

    Returns:
        List of style keys
    """
    return list(STYLE_PROMPTS.keys())


def get_style_metadata(style: str) -> Optional[Dict[str, str]]:
    """
    Get human-readable metadata for a style.

    Args:
        style: The style identifier

    Returns:
        Dictionary with 'name' and 'description' keys, or None if not found
    """
    metadata = {
        "minimalist": {
            "name": "Minimalist",
            "description": "Clean lines, contemporary materials, and zen-inspired simplicity"
        },
        "mediterranean": {
            "name": "Mediterranean",
            "description": "Sun-loving plants, terracotta, and warm earth tones"
        },
        "california_native": {
            "name": "California Native",
            "description": "Drought-tolerant native plants for sustainable, water-wise landscaping"
        },
    }
    return metadata.get(style)
