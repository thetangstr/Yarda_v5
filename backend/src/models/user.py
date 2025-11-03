"""
User models for authentication and trial credit management.

Pydantic models for request/response validation and database entities.
"""

from pydantic import BaseModel, EmailStr, Field, validator
from typing import Optional
from datetime import datetime
from uuid import UUID
import re


class UserBase(BaseModel):
    """Base user fields."""
    email: EmailStr


class UserRegisterRequest(BaseModel):
    """Request model for user registration."""
    email: EmailStr
    password: str = Field(..., min_length=8, description="Password must be at least 8 characters")

    @validator('password')
    def validate_password_strength(cls, v):
        """Validate password meets minimum requirements."""
        if len(v) < 8:
            raise ValueError('Password must be at least 8 characters')
        return v


class UserRegisterResponse(BaseModel):
    """Response model for successful registration."""
    user_id: UUID
    email: str
    trial_remaining: int = Field(default=3, description="Number of free trial credits")
    verification_sent: bool = Field(default=True, description="Whether verification email was sent")


class LoginRequest(BaseModel):
    """Request model for user login."""
    email: EmailStr
    password: str


class LoginResponse(BaseModel):
    """Response model for successful login."""
    access_token: str
    token_type: str = "Bearer"
    expires_in: int = Field(default=3600, description="Token expiration in seconds")


class VerifyEmailRequest(BaseModel):
    """Request model for email verification."""
    token: str = Field(..., description="Verification token from email")


class VerifyEmailResponse(BaseModel):
    """Response model for successful email verification."""
    success: bool
    message: str


class ResendVerificationRequest(BaseModel):
    """Request model for resending verification email."""
    email: EmailStr


class User(BaseModel):
    """Complete user model (matches database schema)."""
    id: UUID
    email: str
    email_verified: bool
    firebase_uid: str

    # Trial System
    trial_remaining: int = Field(ge=0, description="Trial credits remaining")
    trial_used: int = Field(ge=0, description="Trial credits used")

    # Subscription
    subscription_tier: str = Field(default="free")
    subscription_status: str = Field(default="inactive")
    stripe_customer_id: Optional[str] = None
    stripe_subscription_id: Optional[str] = None
    current_period_end: Optional[datetime] = None
    cancel_at_period_end: bool = False

    # Timestamps
    created_at: datetime
    updated_at: datetime

    class Config:
        orm_mode = True


class UserProfile(BaseModel):
    """Public user profile (safe to expose to client)."""
    user_id: UUID
    email: str
    email_verified: bool
    trial_remaining: int
    trial_used: int
    subscription_tier: str
    subscription_status: str
    created_at: datetime


class UpdateProfileRequest(BaseModel):
    """Request model for updating user profile."""
    current_password: Optional[str] = None
    new_password: Optional[str] = Field(None, min_length=8)
    new_email: Optional[EmailStr] = None


class PasswordResetRequest(BaseModel):
    """Request model for password reset."""
    email: EmailStr


class PasswordResetConfirm(BaseModel):
    """Request model for confirming password reset."""
    token: str
    new_password: str = Field(..., min_length=8)


# Type aliases for authorization
SubscriptionTier = str  # 'free', '7day_pass', 'per_property', 'monthly_pro'
SubscriptionStatus = str  # 'inactive', 'active', 'past_due', 'cancelled'
