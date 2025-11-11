# Gemini Image Generation Fix

**Date:** 2025-11-06
**Last Updated:** 2025-11-10
**Status:** ✅ FIXED (Updated with actual working solutions)
**Branch:** 004-generation-flow / 006-magic-link-auth

---

## Problem

The backend was unable to generate landscape images using Gemini AI. The code was using the wrong model and SDK:

### Issues Found

1. **Wrong Model**: Using `gemini-2.5-flash` (text-only model) instead of `gemini-2.5-flash-image` (image generation model)
2. **Wrong SDK**: Using old `google-generativeai` SDK instead of new `google-genai` SDK
3. **Wrong API Pattern**: Using `generate_content()` instead of `generate_content_stream()`
4. **Missing Configuration**: Missing `response_modalities=["IMAGE", "TEXT"]` and `image_config`
5. **Wrong Response Handling**: Trying to access `response.images` which doesn't exist

### Error Behavior

```python
# Old code (BROKEN):
self.model = genai.GenerativeModel("gemini-2.5-flash")  # ❌ Text model, no image generation
response = self.model.generate_content(...)
if hasattr(response, 'images') and response.images:  # ❌ Never exists
    return response.images[0].data
```

---

## Solution

Updated `backend/src/services/gemini_client.py` to use the correct Gemini 2.5 Flash Image model with streaming API.

### Changes Made

#### 1. Installed New SDK

```bash
pip install google-genai
```

#### 2. Updated Imports

```python
# OLD:
import google.generativeai as genai

# NEW:
from google import genai
from google.genai import types
import mimetypes
```

#### 3. Updated Client Initialization

```python
# OLD:
genai.configure(api_key=api_key)
self.model = genai.GenerativeModel("gemini-2.5-flash")

# NEW:
self.client = genai.Client(api_key=api_key)
self.model = "gemini-2.5-flash-image"  # Image generation model
```

#### 4. Updated Generation Method

```python
# Build content parts
content_parts = [
    types.Part.from_text(text=prompt)
]

# Add input image if provided
if input_image:
    content_parts.append(
        types.Part.from_bytes(
            data=input_image,
            mime_type="image/jpeg"
        )
    )

# Configure for image generation
generate_content_config = types.GenerateContentConfig(
    temperature=0.7,
    response_modalities=["IMAGE", "TEXT"],  # Enable image output
    image_config=types.ImageConfig(
        image_size="1K"  # 1024x1024 output
    )
)

# Use streaming API
image_data = None
text_response = ""

for chunk in self.client.models.generate_content_stream(
    model=self.model,
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
                break
            # Also capture any text response
            elif hasattr(part, 'text') and part.text:
                text_response += part.text

# Verify image was generated
if not image_data:
    raise Exception("No image generated in Gemini response")

return image_data
```

---

## Testing

### Manual Test

To test the image generation:

```python
# backend/tests/manual_test_gemini.py
import asyncio
from src.services.gemini_client import GeminiClient

async def test_generation():
    client = GeminiClient()

    # Test text-to-image generation
    image_bytes = await client.generate_landscape_design(
        input_image=None,
        address="21125 Seven Springs Dr, Cupertino, CA 95014",
        area_type="backyard",
        style="modern_minimalist",
        custom_prompt="Add a modern patio with clean lines"
    )

    # Save result
    with open("/tmp/test_generation.png", "wb") as f:
        f.write(image_bytes)

    print("✅ Image generated successfully!")
    print("📁 Saved to: /tmp/test_generation.png")

if __name__ == "__main__":
    asyncio.run(test_generation())
```

Run the test:

```bash
cd backend
./venv/bin/python tests/manual_test_gemini.py
```

### Expected Behavior

- ✅ Image generates successfully
- ✅ Output is 1024x1024 PNG
- ✅ Image matches the style and prompt
- ✅ No errors in console

---

## API Reference

### Gemini 2.5 Flash Image

- **Model ID**: `gemini-2.5-flash-image`
- **Input**: Text prompt + optional image
- **Output**: Generated image (inline_data in streaming chunks)
- **Image Size Options**: `"1K"` (1024x1024), `"2K"` (2048x2048)
- **Response Modalities**: Must include `"IMAGE"` in config

### Example Code (Simplified)

```python
from google import genai
from google.genai import types

client = genai.Client(api_key=api_key)

for chunk in client.models.generate_content_stream(
    model="gemini-2.5-flash-image",
    contents=[
        types.Content(
            role="user",
            parts=[
                types.Part.from_text(text="Generate a modern backyard design")
            ]
        )
    ],
    config=types.GenerateContentConfig(
        response_modalities=["IMAGE", "TEXT"],
        image_config=types.ImageConfig(image_size="1K")
    )
):
    # Process streaming chunks
    for part in chunk.candidates[0].content.parts:
        if part.inline_data and part.inline_data.data:
            image_data = part.inline_data.data
```

---

## Additional Issues Fixed (2025-11-10)

### 1. Environment Variable Loading Issue

**Problem:** Even with the correct API key in `.env`, the backend was still using an expired/cached API key, resulting in:
```
API key expired. Please renew the API key (status 400 INVALID_ARGUMENT)
```

**Root Cause:** The GeminiClient was caching environment variables at module import time. Even after updating the `.env` file and restarting the server, it would still use the old cached value.

**Solution:** Force reload of environment variables in GeminiClient.__init__:

```python
# backend/src/services/gemini_client.py
def __init__(self):
    # Force reload of environment variables from .env file
    from dotenv import load_dotenv
    load_dotenv(override=True)  # ← Critical: override=True forces reload

    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        raise ValueError("GEMINI_API_KEY environment variable is required")

    # Log which API key we're using for debugging
    logger.info(f"[GeminiClient] Using API key: {api_key[:15]}...{api_key[-4:]}")

    # Create Gemini client with google-genai SDK
    self.client = genai.Client(api_key=api_key)
```

### 2. React Key Warnings

**Problem:** Console warnings appearing:
```
Warning: Each child in a list should have a unique 'key' prop
```

**Root Cause:** Keys were incorrectly placed on parent divs that weren't direct children of map() functions. React only needs keys on elements that are direct children of arrays/map operations.

**Solution:** Remove unnecessary keys from non-mapped elements:

```typescript
// frontend/src/components/generation/GenerationProgressInline.tsx
// WRONG - This div is NOT a direct child of map():
<div key="progress-cards" className="space-y-4">

// CORRECT - No key needed:
<div className="space-y-4">
```

```typescript
// frontend/src/components/generation/GenerationResultsInline.tsx
// WRONG - This div is NOT a direct child of map():
<div key="results-grid" className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 mb-8">

// CORRECT - No key needed:
<div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 mb-8">
```

**Rule:** Only add keys to elements that are:
1. Direct children of map() operations
2. Conditionally rendered siblings (when using AnimatePresence)
3. Elements in arrays that React needs to track

---

## Files Modified

- `backend/src/services/gemini_client.py` - Updated to use gemini-2.5-flash-image model + force env reload
- `frontend/src/components/generation/GenerationProgressInline.tsx` - Removed unnecessary key from line 92
- `frontend/src/components/generation/GenerationResultsInline.tsx` - Removed unnecessary key from line 277
- Backend restarted with new SDK and environment loading fix

---

## Debugging Tips

If you encounter similar issues:

1. **API Key Errors**:
   - Check which key is actually being used: Add logging in GeminiClient
   - Verify `.env` file has correct key
   - Force reload with `load_dotenv(override=True)`
   - Check for environment variable caching issues

2. **React Key Warnings**:
   - Keys are only needed for direct children of map() operations
   - Don't add keys to wrapper divs around mapped elements
   - Use React DevTools to inspect component tree

3. **Test with Simple Scripts**:
   - Create standalone test scripts to isolate issues
   - Test API keys directly with curl/requests
   - Verify environment loading separately from main app

## Next Steps

1. ✅ Backend restarted with updated code
2. ✅ Fixed environment variable loading issue
3. ✅ Fixed React key warnings
4. ✅ Documented actual working solutions
5. ⏳ Test image generation with real user flow
6. ⏳ Monitor for any remaining issues

---

## Related Issues

- **Webhook signature verification**: Still failing (unrelated to image generation)
- **UI doesn't match v2**: Needs design updates to GenerationProgress component

---

**Author:** Claude Code
**Reference:** Code example provided by user based on Google Gemini API documentation
