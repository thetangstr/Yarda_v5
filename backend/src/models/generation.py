from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field, validator
from uuid import UUID
from enum import Enum


class GenerationStatus(str, Enum):
    """Enum for generation status"""
    PENDING = "pending"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"


class InputType(str, Enum):
    """Enum for input type"""
    PHOTO = "photo"
    ADDRESS = "address"


class CreditType(str, Enum):
    """Enum for credit type used"""
    TRIAL = "trial"
    TOKEN = "token"


class GenerationBase(BaseModel):
    """Base generation model with common attributes"""
    input_type: InputType
    input_photo_url: Optional[str] = None
    input_address: Optional[str] = None
    style: str = Field(..., min_length=1)
    custom_prompt: Optional[str] = None

    @validator('input_photo_url', always=True)
    def validate_photo_input(cls, v, values):
        """Validate that photo URL is provided when input_type is photo"""
        if values.get('input_type') == InputType.PHOTO and not v:
            raise ValueError('input_photo_url is required when input_type is photo')
        return v

    @validator('input_address', always=True)
    def validate_address_input(cls, v, values):
        """Validate that address is provided when input_type is address"""
        if values.get('input_type') == InputType.ADDRESS and not v:
            raise ValueError('input_address is required when input_type is address')
        return v


class GenerationCreate(GenerationBase):
    """Model for creating a new generation"""
    pass


class Generation(GenerationBase):
    """Complete generation model"""
    id: UUID
    user_id: UUID
    status: GenerationStatus = GenerationStatus.PENDING
    output_image_url: Optional[str] = None
    error_message: Optional[str] = None
    processing_time_ms: Optional[int] = None
    credit_type: Optional[CreditType] = None
    credit_refunded: bool = False
    created_at: datetime
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class GenerationListResponse(BaseModel):
    """Response model for list of generations"""
    items: list[Generation]
    total: int
    limit: int
    offset: int


class CreditBalance(BaseModel):
    """Model for credit balance breakdown"""
    trial_credits: int = Field(ge=0)
    token_balance: int = Field(ge=0)
    total_available: int = Field(ge=0)
