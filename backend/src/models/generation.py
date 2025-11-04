"""
Generation Model
Feature: 003-google-maps-integration
Purpose: Landscape generation records with image source tracking
"""

from enum import Enum
from typing import Optional
from uuid import UUID
from datetime import datetime
from pydantic import BaseModel, Field


class ImageSource(str, Enum):
    """Source of property image used for generation"""
    USER_UPLOAD = "user_upload"
    GOOGLE_STREET_VIEW = "google_street_view"
    GOOGLE_SATELLITE = "google_satellite"


class GenerationStatus(str, Enum):
    """Status of landscape generation"""
    PENDING = "pending"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"


class PaymentType(str, Enum):
    """Payment method for generation"""
    TRIAL = "trial"
    TOKEN = "token"
    SUBSCRIPTION = "subscription"


class Generation(BaseModel):
    """
    Landscape generation record

    Tracks user requests for landscape designs, including payment method,
    image source, and generation status.
    """
    id: UUID
    user_id: UUID
    status: GenerationStatus
    payment_type: PaymentType
    tokens_deducted: int = Field(ge=0, description="Number of tokens deducted (0 for trial/subscription)")
    address: Optional[str] = Field(None, description="Property address for imagery retrieval")
    image_url: Optional[str] = Field(None, description="URL of uploaded or retrieved property image")
    request_params: dict = Field(description="Complete request configuration (areas, styles, prompts)")
    image_source: ImageSource = Field(description="Source of property image (user_upload, google_street_view, google_satellite)")
    error_message: Optional[str] = None
    created_at: datetime
    completed_at: Optional[datetime] = None

    class Config:
        orm_mode = True
        use_enum_values = True  # Serialize enums as their values


class GenerationCreate(BaseModel):
    """Request model for creating a new generation"""
    address: str = Field(min_length=5, description="Full property address")
    area: str = Field(description="Landscape area (front_yard, back_yard, side_yard, full_property)")
    style: str = Field(description="Design style")
    custom_prompt: Optional[str] = Field(None, max_length=500, description="Optional custom prompt")
    payment_type: PaymentType


class GenerationResponse(BaseModel):
    """Response model for generation endpoint"""
    id: UUID
    status: GenerationStatus
    image_url: Optional[str]
    image_source: ImageSource
    result_url: Optional[str]
    error_message: Optional[str]
    created_at: datetime

    class Config:
        orm_mode = True
        use_enum_values = True
