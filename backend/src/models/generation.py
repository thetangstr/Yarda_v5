"""
Generation Model
Feature: 004-generation-flow (extends 003-google-maps-integration)
Purpose: Landscape generation records with multi-area support and progress tracking
"""

from enum import Enum
from typing import Optional, List, Dict, Any
from uuid import UUID
from datetime import datetime
from pydantic import BaseModel, Field, validator


class ImageSource(str, Enum):
    """Source of property image used for generation"""
    USER_UPLOAD = "user_upload"
    GOOGLE_STREET_VIEW = "google_street_view"
    GOOGLE_SATELLITE = "google_satellite"


class YardArea(str, Enum):
    """Type of yard area for landscape generation"""
    FRONT_YARD = "front_yard"
    BACKYARD = "backyard"
    WALKWAY = "walkway"
    PATIO = "patio"
    POOL_AREA = "pool_area"


class DesignStyle(str, Enum):
    """Landscape design style options (synced with frontend Feature 005)"""
    MODERN_MINIMALIST = "modern_minimalist"
    CALIFORNIA_NATIVE = "california_native"
    JAPANESE_ZEN = "japanese_zen"
    ENGLISH_GARDEN = "english_garden"
    DESERT_LANDSCAPE = "desert_landscape"
    MEDITERRANEAN = "mediterranean"  # Legacy, keeping for backward compatibility


class GenerationStatus(str, Enum):
    """Status of landscape generation (multi-area request)"""
    PENDING = "pending"
    PROCESSING = "processing"
    COMPLETED = "completed"
    PARTIAL_FAILED = "partial_failed"  # Some areas succeeded, some failed
    FAILED = "failed"


class AreaStatus(str, Enum):
    """Status of individual area within multi-area generation"""
    NOT_STARTED = "not_started"
    PENDING = "pending"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"


class ProcessingStage(str, Enum):
    """Detailed progress tracking for area generation"""
    QUEUED = "queued"
    RETRIEVING_IMAGERY = "retrieving_imagery"
    ANALYZING_PROPERTY = "analyzing_property"
    GENERATING_DESIGN = "generating_design"
    APPLYING_STYLE = "applying_style"
    FINALIZING = "finalizing"
    COMPLETE = "complete"


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


# ============================================================================
# Multi-Area Generation Models (Feature: 004-generation-flow)
# ============================================================================

class AreaRequest(BaseModel):
    """Request model for individual yard area within multi-area generation"""
    area: YardArea = Field(description="Type of yard area to generate")
    style: DesignStyle = Field(description="Design style for this area")
    custom_prompt: Optional[str] = Field(
        None,
        max_length=500,
        description="Optional custom prompt for this area (max 500 characters)"
    )
    preservation_strength: float = Field(
        default=0.5,
        ge=0.0,
        le=1.0,
        description="Control transformation intensity: 0.0-0.4 = dramatic, 0.4-0.6 = balanced, 0.6-1.0 = subtle"
    )


class AreaStatusResponse(BaseModel):
    """Progress tracking for individual area within multi-area generation"""
    id: UUID = Field(description="Unique identifier for this area")
    area: YardArea = Field(description="Type of yard area")
    style: DesignStyle = Field(description="Design style applied")
    status: AreaStatus = Field(description="Current status of this area")
    progress: int = Field(ge=0, le=100, description="Progress percentage (0-100)")
    current_stage: Optional[ProcessingStage] = Field(
        None,
        description="Current processing stage"
    )
    status_message: Optional[str] = Field(
        None,
        description="User-facing progress message"
    )
    image_url: Optional[str] = Field(None, description="Generated design image URL (single)")
    image_urls: Optional[List[str]] = Field(None, description="Generated design image URLs (array for multi-angle support)")
    error_message: Optional[str] = Field(None, description="Error message if failed")
    completed_at: Optional[datetime] = Field(None, description="Completion timestamp")

    class Config:
        orm_mode = True
        use_enum_values = True


class CreateGenerationRequest(BaseModel):
    """
    Request model for creating multi-area generation

    Supports both single-area and multi-area generation requests.
    Payment method is determined by backend based on user's subscription/token/trial status.
    """
    address: str = Field(
        min_length=5,
        max_length=200,
        description="Full property address for imagery retrieval"
    )
    areas: List[AreaRequest] = Field(
        min_items=1,
        max_items=5,
        description="List of yard areas to generate (1-5 areas)"
    )

    @validator('areas')
    def validate_unique_areas(cls, areas):
        """Ensure no duplicate area types in request"""
        area_types = [area.area for area in areas]
        if len(area_types) != len(set(area_types)):
            raise ValueError("Duplicate area types not allowed in single generation request")
        return areas


class MultiAreaGenerationResponse(BaseModel):
    """
    Response model for multi-area generation request

    Includes overall status and per-area progress tracking.
    """
    id: UUID = Field(description="Unique generation request ID")
    user_id: Optional[UUID] = Field(None, description="User who created this generation")
    status: GenerationStatus = Field(description="Overall generation status")
    address: Optional[str] = Field(None, description="Property address")
    total_cost: int = Field(ge=1, description="Total cost in credits/tokens")
    payment_method: PaymentType = Field(description="Payment method used (trial/token/subscription)")
    areas: List[AreaStatusResponse] = Field(description="Status for each requested area")
    source_images: Optional[List[Dict[str, Any]]] = Field(None, description="Source images (Street View/Satellite)")
    created_at: datetime = Field(description="Request creation timestamp")
    start_processing_at: Optional[datetime] = Field(
        None,
        description="When processing started"
    )
    completed_at: Optional[datetime] = Field(
        None,
        description="When all areas completed (or request failed)"
    )
    estimated_completion: Optional[datetime] = Field(
        None,
        description="Estimated completion time (for pending/processing status)"
    )
    error_message: Optional[str] = Field(
        None,
        description="Overall error message (for failed status)"
    )

    class Config:
        orm_mode = True
        use_enum_values = True
