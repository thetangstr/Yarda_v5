"""
Vercel Blob storage service for image uploads.

Handles uploading generated landscape designs to Vercel Blob storage
and generating public URLs for retrieval.
"""

import os
from typing import BinaryIO, List
from datetime import datetime
import httpx


class BlobStorageService:
    """Service for managing image uploads to Vercel Blob storage."""

    def __init__(self):
        self.token = os.getenv("BLOB_READ_WRITE_TOKEN")
        if not self.token:
            raise ValueError("BLOB_READ_WRITE_TOKEN environment variable is required")

        self.base_url = "https://blob.vercel-storage.com"

    async def upload_image(
        self,
        image_data: bytes,
        filename: str,
        content_type: str = "image/png"
    ) -> str:
        """
        Upload an image to Vercel Blob storage.

        Args:
            image_data: Binary image data
            filename: Desired filename (will be made unique)
            content_type: MIME type of the image

        Returns:
            Public URL of the uploaded image

        Raises:
            Exception: If upload fails
        """
        # Generate unique filename with timestamp
        timestamp = datetime.utcnow().strftime("%Y%m%d_%H%M%S_%f")
        unique_filename = f"{timestamp}_{filename}"

        async with httpx.AsyncClient() as client:
            response = await client.put(
                f"{self.base_url}/{unique_filename}",
                content=image_data,
                headers={
                    "Authorization": f"Bearer {self.token}",
                    "Content-Type": content_type,
                    "x-content-type": content_type,
                },
                timeout=30.0
            )

            if response.status_code != 200:
                raise Exception(
                    f"Failed to upload image to Vercel Blob: {response.status_code} - {response.text}"
                )

            result = response.json()
            return result.get("url")

    async def upload_multiple_images(
        self,
        images: List[tuple[bytes, str]],
        content_type: str = "image/png"
    ) -> List[str]:
        """
        Upload multiple images in parallel.

        Args:
            images: List of (image_data, filename) tuples
            content_type: MIME type of the images

        Returns:
            List of public URLs in the same order as input

        Raises:
            Exception: If any upload fails
        """
        import asyncio

        tasks = [
            self.upload_image(image_data, filename, content_type)
            for image_data, filename in images
        ]

        return await asyncio.gather(*tasks)

    async def delete_image(self, url: str) -> bool:
        """
        Delete an image from Vercel Blob storage.

        Args:
            url: Public URL of the image to delete

        Returns:
            True if successful, False otherwise
        """
        async with httpx.AsyncClient() as client:
            response = await client.delete(
                url,
                headers={
                    "Authorization": f"Bearer {self.token}",
                },
                timeout=10.0
            )

            return response.status_code == 200


# Global storage service instance
storage_service = BlobStorageService()


def get_storage_service() -> BlobStorageService:
    """
    Dependency for FastAPI endpoints to access the storage service.

    Usage:
        @app.post("/upload")
        async def upload(storage: BlobStorageService = Depends(get_storage_service)):
            url = await storage.upload_image(image_data, "design.png")
            return {"url": url}
    """
    return storage_service
