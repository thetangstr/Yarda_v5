"""
Google Gemini AI client for landscape design generation.

Handles communication with Google Gemini 2.5 Flash API
for generating landscape design images.

Based on Yarda v2 implementation with enhancements:
- Style-specific prompt templates
- Preservation strength parameter
- Safety settings from v2
- Temperature configuration (0.7 for balanced creativity)
"""

import os
from google import genai
from google.genai import types
from typing import Optional, List
import base64
import uuid
from datetime import datetime
import mimetypes
import structlog

# Import our prompt building system
from src.services.prompt_builder import build_landscape_prompt
from src.services.usage_monitor import get_usage_monitor

logger = structlog.get_logger(__name__)


class GeminiClient:
    """Client for Google Gemini AI image generation."""

    def __init__(self):
        # Force reload of environment variables from .env file
        from dotenv import load_dotenv
        load_dotenv(override=True)

        api_key = os.getenv("GEMINI_API_KEY")
        if not api_key:
            raise ValueError("GEMINI_API_KEY environment variable is required")

        # Log which API key we're using for debugging
        logger.info(f"[GeminiClient] Using API key: {api_key[:15]}...{api_key[-4:]}")

        # Create Gemini client with google-genai SDK
        self.client = genai.Client(api_key=api_key)

        # Use Gemini 2.5 Flash Image for image generation
        self.model_name = "gemini-2.5-flash-image"

        # Initialize usage monitor
        self.usage_monitor = get_usage_monitor()

    async def generate_landscape_design(
        self,
        input_image: Optional[bytes],
        address: Optional[str],
        area_type: str,
        style: str,
        custom_prompt: Optional[str] = None,
        preservation_strength: float = 0.5
    ) -> bytes:
        """
        Generate a landscape design using Gemini AI.

        Args:
            input_image: Original yard image (optional)
            address: Property address (optional, alternative to image)
            area_type: Type of yard area (front_yard, backyard, etc.)
            style: Desired landscape style (modern_minimalist, etc.)
            custom_prompt: Additional custom instructions
            preservation_strength: Control transformation intensity (0.0-1.0)
                - 0.0-0.4: Dramatic transformation
                - 0.4-0.6: Balanced transformation
                - 0.6-1.0: Subtle refinement

        Returns:
            Generated image as bytes (PNG format)

        Raises:
            Exception: If generation fails
        """
        # Generate unique request ID for tracking
        request_id = str(uuid.uuid4())[:8]
        start_time = datetime.utcnow()

        # Build the prompt using our advanced prompt builder
        prompt = build_landscape_prompt(
            style=style,
            preservation_strength=preservation_strength,
            custom_prompt=custom_prompt,
            area=area_type,
            address=address
        )

        # Estimate input tokens (rough approximation)
        input_tokens = len(prompt.split()) + (500 if input_image else 0)

        try:
            # Build content parts for the request
            content_parts = [
                types.Part.from_text(text=prompt)
            ]

            # If input image is provided, add it to content
            if input_image:
                # Detect mime type or default to jpeg
                mime_type = "image/jpeg"
                content_parts.append(
                    types.Part.from_bytes(
                        data=input_image,
                        mime_type=mime_type
                    )
                )

            # Configure generation for image output
            generate_content_config = types.GenerateContentConfig(
                temperature=0.7,  # v2 setting for balanced creativity
                response_modalities=["IMAGE", "TEXT"],
                image_config=types.ImageConfig(
                    image_size="1K"  # 1024x1024 image output
                )
            )

            # Generate with API call using STREAMING (required for image generation)
            image_data = None
            text_response = ""

            # Use generate_content_stream (NOT generate_content) for image generation
            for chunk in self.client.models.generate_content_stream(
                model=self.model_name,
                contents=[
                    types.Content(
                        role="user",
                        parts=content_parts
                    )
                ],
                config=generate_content_config
            ):
                # Extract image from streaming chunks
                if (
                    chunk.candidates is not None
                    and chunk.candidates[0].content is not None
                    and chunk.candidates[0].content.parts is not None
                ):
                    for part in chunk.candidates[0].content.parts:
                        # Extract inline image data
                        if part.inline_data and part.inline_data.data:
                            image_data = part.inline_data.data
                        # Also capture any text response
                        elif hasattr(part, 'text') and part.text:
                            text_response += part.text

            # Verify we got image data
            if not image_data:
                raise Exception("No image generated in Gemini response")

            # Calculate response time and record success
            response_time_ms = int((datetime.utcnow() - start_time).total_seconds() * 1000)
            output_tokens = len(text_response.split()) if text_response else 0

            self.usage_monitor.record_request(
                request_id=request_id,
                model=self.model_name,
                style=style,
                address=address,
                input_tokens=input_tokens,
                output_tokens=output_tokens,
                image_generated=True,
                response_time_ms=response_time_ms,
                status="success",
                error_message=None,
                preservation_strength=preservation_strength,
                area_type=area_type
            )

            return image_data

        except Exception as e:
            # Record failure
            response_time_ms = int((datetime.utcnow() - start_time).total_seconds() * 1000)

            self.usage_monitor.record_request(
                request_id=request_id,
                model=self.model_name,
                style=style,
                address=address,
                input_tokens=input_tokens,
                output_tokens=0,
                image_generated=False,
                response_time_ms=response_time_ms,
                status="error",
                error_message=str(e),
                preservation_strength=preservation_strength,
                area_type=area_type
            )

            raise Exception(f"Gemini generation failed: {str(e)}")

    async def generate_landscape_design_streaming(
        self,
        input_image: Optional[bytes],
        address: Optional[str],
        area_type: str,
        style: str,
        custom_prompt: Optional[str] = None,
        preservation_strength: float = 0.5,
        progress_callback = None
    ) -> bytes:
        """
        Generate a landscape design with streaming progress updates (v2 enhancement).

        This method uses Gemini's streaming API to provide real-time progress updates
        during generation. Based on Yarda v2's streaming implementation with 5-minute timeout.

        Args:
            input_image: Original yard image (optional)
            address: Property address for context
            area_type: Type of yard area (front_yard, backyard, etc.)
            style: Design style to apply
            custom_prompt: Additional custom instructions
            preservation_strength: Control transformation intensity (0.0-1.0)
            progress_callback: Async callback function(stage: str, progress: int) for progress updates

        Returns:
            Generated landscape design image as bytes

        Raises:
            TimeoutError: If generation exceeds 5 minute timeout
            Exception: If generation fails
        """
        import asyncio
        from datetime import datetime

        # Build the prompt
        prompt = build_landscape_prompt(
            style=style,
            preservation_strength=preservation_strength,
            custom_prompt=custom_prompt,
            area=area_type,
            address=address
        )

        # Prepare image parts
        if input_image:
            image_parts = [{
                "mime_type": "image/jpeg",
                "data": base64.b64encode(input_image).decode('utf-8')
            }]
        else:
            image_parts = []

        # Generation config (matching v2 settings)
        generation_config = {
            "temperature": 0.7,
            "top_p": 0.95,
            "top_k": 40,
            "max_output_tokens": 8192,
        }

        # Safety settings (v2 configuration)
        safety_settings = [
            {
                "category": "HARM_CATEGORY_DANGEROUS_CONTENT",
                "threshold": "BLOCK_MEDIUM_AND_ABOVE"
            },
            {
                "category": "HARM_CATEGORY_HATE_SPEECH",
                "threshold": "BLOCK_MEDIUM_AND_ABOVE"
            },
            {
                "category": "HARM_CATEGORY_HARASSMENT",
                "threshold": "BLOCK_MEDIUM_AND_ABOVE"
            },
            {
                "category": "HARM_CATEGORY_SEXUALLY_EXPLICIT",
                "threshold": "BLOCK_MEDIUM_AND_ABOVE"
            }
        ]

        start_time = datetime.utcnow()

        # Report initial progress
        if progress_callback:
            await progress_callback("initializing", 0)

        try:
            # Variables to collect streamed data
            generated_images = []
            generated_text = ""

            # Streaming function that runs in executor
            async def stream_with_timeout():
                loop = asyncio.get_event_loop()

                def process_stream():
                    """Synchronous streaming processor (runs in thread pool)"""
                    nonlocal generated_images, generated_text

                    # Build content parts (prompt + image)
                    content_parts = [prompt]
                    if image_parts:
                        content_parts.extend(image_parts)

                    # Start streaming
                    chunk_count = 0
                    for chunk in self.model.generate_content(
                        content_parts,
                        generation_config=generation_config,
                        safety_settings=safety_settings,
                        stream=True  # Enable streaming
                    ):
                        chunk_count += 1

                        # Process candidate parts
                        if hasattr(chunk, 'candidates') and chunk.candidates:
                            for candidate in chunk.candidates:
                                if hasattr(candidate, 'content') and candidate.content:
                                    for part in candidate.content.parts:
                                        # Handle image data
                                        if hasattr(part, 'inline_data') and part.inline_data:
                                            image_data = part.inline_data.data
                                            generated_images.append(image_data)

                                        # Handle text responses
                                        if hasattr(part, 'text') and part.text:
                                            generated_text += part.text

                        # Update progress based on chunk count
                        # Estimate progress: chunks typically arrive in ~10-30 increments
                        estimated_progress = min(90, chunk_count * 3)
                        if progress_callback:
                            # Schedule callback in the event loop
                            asyncio.run_coroutine_threadsafe(
                                progress_callback("generating", estimated_progress),
                                loop
                            )

                # Run synchronous stream processing in executor
                await loop.run_in_executor(None, process_stream)

            # Execute with 5 minute timeout (v2 setting)
            if progress_callback:
                await progress_callback("processing", 10)

            await asyncio.wait_for(stream_with_timeout(), timeout=300.0)

            # Finalize
            if progress_callback:
                await progress_callback("finalizing", 95)

            # Return the generated image
            if generated_images:
                # Return the last/best image
                return base64.b64decode(generated_images[-1])
            else:
                raise Exception("No image generated by Gemini")

        except asyncio.TimeoutError:
            raise TimeoutError("Generation exceeded 5 minute timeout")
        except Exception as e:
            raise Exception(f"Gemini generation error: {str(e)}")

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



# Singleton Gemini client instance with lazy initialization
_gemini_client: Optional[GeminiClient] = None


def get_gemini_client() -> GeminiClient:
    """
    Dependency for FastAPI endpoints to access the Gemini client.
    Uses lazy initialization to prevent startup errors if GEMINI_API_KEY is missing.

    Usage:
        @app.post("/generate")
        async def generate(gemini: GeminiClient = Depends(get_gemini_client)):
            image = await gemini.generate_landscape_design(...)
            return {"image": image}
    """
    global _gemini_client
    if _gemini_client is None:
        _gemini_client = GeminiClient()
    return _gemini_client
