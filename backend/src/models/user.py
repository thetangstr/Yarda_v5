"""
User models for authentication and trial credit management.

Pydantic models for request/response validation and database entities.
"""

from pydantic import BaseModel, Field, field_validator
from typing import Optional
from datetime import datetime
from uuid import UUID
import re


# RFC 5322 compliant email regex pattern
# This pattern supports common email formats including:
# - Plus addressing: user+tag@domain.com
# - Dots in local part: first.last@domain.com
# - Numbers and special chars: user123@domain.co.uk
EMAIL_REGEX = re.compile(
    r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
)


def validate_email(email: str) -> str:
    """
    Validate email format using RFC 5322 compliant regex.

    Accepts:
    - Plus addressing: test+tag@example.com
    - Dots in local part: first.last@example.com
    - Numbers and underscores: user_123@example.com
    - Percent signs: user%name@example.com
    - Hyphens in domain: user@my-domain.com

    Rejects:
    - Missing @ symbol
    - Multiple @ symbols
    - Missing domain
    - Invalid characters

    Args:
        email: Email address to validate

    Returns:
        Normalized email (lowercase)

    Raises:
        ValueError: If email format is invalid
    """
    if not email:
        raise ValueError('Email is required')

    # Normalize to lowercase
    email = email.lower().strip()

    # Validate format
    if not EMAIL_REGEX.match(email):
        raise ValueError('Invalid email format')

    # Additional checks
    if email.count('@') != 1:
        raise ValueError('Email must contain exactly one @ symbol')

    local_part, domain = email.split('@')

    if not local_part or not domain:
        raise ValueError('Email must have both local and domain parts')

    if len(email) > 254:  # RFC 5321 maximum email length
        raise ValueError('Email is too long (max 254 characters)')

    if len(local_part) > 64:  # RFC 5321 maximum local part length
        raise ValueError('Email local part is too long (max 64 characters)')

    return email


class UserBase(BaseModel):
    """Base user fields."""
    email: str

    @field_validator('email')
    @classmethod
    def validate_email_field(cls, v):
        """Validate email format."""
        return validate_email(v)


class UserRegisterRequest(BaseModel):
    """Request model for user registration."""
    email: str
    password: str = Field(..., min_length=8, description="Password must be at least 8 characters")

    @field_validator('email')
    @classmethod
    def validate_email_field(cls, v):
        """Validate email format."""
        return validate_email(v)

    @field_validator('password')
    @classmethod
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
    email: str
    password: str

    @field_validator('email')
    @classmethod
    def validate_email_field(cls, v):
        """Validate email format."""
        return validate_email(v)


class LoginResponse(BaseModel):
    """Response model for successful login."""
    access_token: str
    token_type: str = "bearer"
    user: "User"


class VerifyEmailRequest(BaseModel):
    """Request model for email verification."""
    token: str = Field(..., description="Verification token from email")


class VerifyEmailResponse(BaseModel):
    """Response model for successful email verification."""
    success: bool
    message: str


class ResendVerificationRequest(BaseModel):
    """Request model for resending verification email."""
    email: str

    @field_validator('email')
    @classmethod
    def validate_email_field(cls, v):
        """Validate email format."""
        return validate_email(v)


class User(BaseModel):
    """Complete user model (matches database schema)."""
    id: UUID
    email: str
    email_verified: bool
    firebase_uid: Optional[str] = None

    # Trial System
    trial_remaining: int = Field(ge=0, description="Trial credits remaining")
    trial_used: int = Field(ge=0, description="Trial credits used")

    # Subscription
    subscription_tier: Optional[str] = Field(default=None)
    subscription_status: str = Field(default="inactive")
    stripe_customer_id: Optional[str] = None
    stripe_subscription_id: Optional[str] = None
    current_period_end: Optional[datetime] = None
    cancel_at_period_end: bool = False

    # Timestamps
    created_at: datetime
    updated_at: Optional[datetime] = None

    model_config = {"from_attributes": True}


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
    new_email: Optional[str] = None

    @field_validator('new_email')
    @classmethod
    def validate_new_email_field(cls, v):
        """Validate new email format if provided."""
        if v is not None:
            return validate_email(v)
        return v


class PasswordResetRequest(BaseModel):
    """Request model for password reset."""
    email: str

    @field_validator('email')
    @classmethod
    def validate_email_field(cls, v):
        """Validate email format."""
        return validate_email(v)


class PasswordResetConfirm(BaseModel):
    """Request model for confirming password reset."""
    token: str
    new_password: str = Field(..., min_length=8)


# Type aliases for authorization
SubscriptionTier = str  # 'free', '7day_pass', 'per_property', 'monthly_pro'
SubscriptionStatus = str  # 'inactive', 'active', 'past_due', 'cancelled'


# ============================================================================
# Payment Status Models (Feature: 004-generation-flow)
# ============================================================================

class PaymentStatusResponse(BaseModel):
    """
    User's current payment capabilities for generation flow.

    Feature: 004-generation-flow
    Endpoint: GET /v1/users/payment-status
    Requirements: FR-007 (payment hierarchy), FR-019 (payment display)
    """
    active_payment_method: str = Field(
        description="Currently active payment method (hierarchy: subscription > trial > token > none)",
        examples=["subscription", "trial", "token", "none"]
    )
    trial_remaining: int = Field(
        ge=0,
        description="Trial credits remaining (3 on registration)"
    )
    trial_used: int = Field(
        ge=0,
        description="Trial credits used"
    )
    token_balance: int = Field(
        ge=0,
        description="Purchased tokens available"
    )
    subscription_tier: Optional[str] = Field(
        None,
        description="Subscription tier (e.g. 'monthly_pro')",
        examples=["monthly_pro", None]
    )
    subscription_status: Optional[str] = Field(
        None,
        description="Subscription status (active/past_due/cancelled)",
        examples=["active", "past_due", None]
    )
    can_generate: bool = Field(
        description="Whether user has any payment method available"
    )
