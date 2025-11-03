"""
Google Gemini AI client for landscape design generation.

Handles communication with Google Gemini 2.5 Flash API
for generating landscape design images.
"""

import os
import google.generativeai as genai
from typing import Optional, List
import base64


class GeminiClient:
    """Client for Google Gemini AI image generation."""

    def __init__(self):
        api_key = os.getenv("GEMINI_API_KEY")
        if not api_key:
            raise ValueError("GEMINI_API_KEY environment variable is required")

        # Configure Gemini SDK
        genai.configure(api_key=api_key)

        # Use Gemini 2.5 Flash for fast generation
        self.model = genai.GenerativeModel("gemini-2.5-flash")

    async def generate_landscape_design(
        self,
        input_image: Optional[bytes],
        address: Optional[str],
        area_type: str,
        style: str,
        custom_prompt: Optional[str] = None
    ) -> bytes:
        """
        Generate a landscape design using Gemini AI.

        Args:
            input_image: Original yard image (optional)
            address: Property address (optional, alternative to image)
            area_type: Type of yard area (front_yard, backyard, etc.)
            style: Desired landscape style (modern_minimalist, etc.)
            custom_prompt: Additional custom instructions

        Returns:
            Generated image as bytes (PNG format)

        Raises:
            Exception: If generation fails
        """
        # Build the prompt
        prompt = self._build_prompt(area_type, style, address, custom_prompt)

        try:
            # If input image is provided, use it for vision-based generation
            if input_image:
                # Convert bytes to base64 for Gemini API
                image_parts = [
                    {
                        "mime_type": "image/jpeg",
                        "data": base64.b64encode(input_image).decode()
                    }
                ]

                response = self.model.generate_content(
                    [prompt, image_parts[0]],
                    generation_config={
                        "temperature": 0.8,
                        "top_p": 0.95,
                        "top_k": 40,
                        "max_output_tokens": 8192,
                    }
                )
            else:
                # Text-only generation (address-based)
                response = self.model.generate_content(
                    prompt,
                    generation_config={
                        "temperature": 0.8,
                        "top_p": 0.95,
                        "top_k": 40,
                        "max_output_tokens": 8192,
                    }
                )

            # Extract image from response
            # Note: This is a simplified implementation
            # Actual Gemini API may return image data differently
            if hasattr(response, 'images') and response.images:
                return response.images[0].data

            # If no image in response, raise error
            raise Exception("No image generated in Gemini response")

        except Exception as e:
            raise Exception(f"Gemini generation failed: {str(e)}")

    async def generate_multiple_angles(
        self,
        input_image: Optional[bytes],
        address: Optional[str],
        area_type: str,
        style: str,
        custom_prompt: Optional[str] = None,
        num_angles: int = 2
    ) -> List[bytes]:
        """
        Generate multiple angle views of a landscape design.

        Used for backyard designs that need 2-3 different perspectives.

        Args:
            input_image: Original yard image
            address: Property address
            area_type: Type of yard area
            style: Desired landscape style
            custom_prompt: Additional custom instructions
            num_angles: Number of angles to generate (2-3)

        Returns:
            List of generated images as bytes

        Raises:
            Exception: If generation fails
        """
        import asyncio

        # Generate multiple angles in parallel
        tasks = [
            self.generate_landscape_design(
                input_image, address, area_type, style,
                f"{custom_prompt or ''} - Angle {i+1} of {num_angles}"
            )
            for i in range(num_angles)
        ]

        return await asyncio.gather(*tasks)

    def _build_prompt(
        self,
        area_type: str,
        style: str,
        address: Optional[str],
        custom_prompt: Optional[str]
    ) -> str:
        """
        Build the Gemini prompt for landscape generation.

        Args:
            area_type: Type of yard area
            style: Desired landscape style
            address: Property address (if no image)
            custom_prompt: Additional custom instructions

        Returns:
            Complete prompt string
        """
        # Area type descriptions
        area_descriptions = {
            "front_yard": "front yard entrance and curb appeal",
            "backyard": "backyard outdoor living space",
            "walkway": "walkway and pathway landscaping",
            "side_yard": "side yard utility and aesthetic design"
        }

        # Style descriptions
        style_descriptions = {
            "modern_minimalist": "modern minimalist design with clean lines and minimal plantings",
            "california_native": "California native plants with drought-resistant landscaping",
            "japanese_zen": "Japanese zen garden with rocks, bamboo, and meditation spaces",
            "english_garden": "English cottage garden with lush flowers and romantic pathways",
            "desert_landscape": "desert landscape with cacti, succulents, and xeriscaping"
        }

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


# Global Gemini client instance
gemini_client = GeminiClient()


def get_gemini_client() -> GeminiClient:
    """
    Dependency for FastAPI endpoints to access the Gemini client.

    Usage:
        @app.post("/generate")
        async def generate(gemini: GeminiClient = Depends(get_gemini_client)):
            image = await gemini.generate_landscape_design(...)
            return {"image": image}
    """
    return gemini_client
