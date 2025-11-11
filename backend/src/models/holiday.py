"""
Holiday Decorator Feature Models

Pydantic models for the Holiday Decorator viral marketing feature.
Based on API contracts from specs/007-holiday-decorator/contracts/

These models define request/response schemas for API endpoints and database operations.
"""

from datetime import datetime
from typing import Literal, Optional
from pydantic import BaseModel, Field, field_validator
from decimal import Decimal


# ============================================================================
# Enums & Constants
# ============================================================================

HolidayStyle = Literal['classic', 'modern', 'over_the_top']
GenerationStatus = Literal['pending', 'processing', 'completed', 'failed']
SharePlatform = Literal['instagram', 'facebook', 'tiktok']
TransactionType = Literal['signup_bonus', 'social_share', 'generation', 'admin_grant', 'refund']


# ============================================================================
# Generation API Models (contracts/generation-api.md)
# ============================================================================

class HolidayGenerationRequest(BaseModel):
    """
    Request body for creating a new holiday generation.
    POST /v1/holiday/generations
    """
    address: str = Field(..., min_length=5, max_length=500, description="User-entered address")
    heading: int = Field(..., ge=0, lt=360, description="Street View heading (0-359 degrees)")
    pitch: Optional[int] = Field(default=0, ge=-90, le=90, description="Street View pitch (-90 to 90)")
    style: HolidayStyle = Field(..., description="Decoration style")

    @field_validator('address')
    @classmethod
    def validate_address(cls, v: str) -> str:
        """Ensure address is not just whitespace"""
        if not v.strip():
            raise ValueError("Address cannot be empty")
        return v.strip()


class LocationCoordinates(BaseModel):
    """Geographic coordinates from geocoding"""
    lat: float = Field(..., description="Latitude")
    lng: float = Field(..., description="Longitude")


class HolidayGenerationResponse(BaseModel):
    """
    Response from creating/fetching a holiday generation.
    POST /v1/holiday/generations
    GET /v1/holiday/generations/:id
    """
    id: str = Field(..., description="Generation UUID")
    user_id: str = Field(..., description="User UUID")
    address: str = Field(..., description="Geocoded address")
    location: LocationCoordinates
    street_view_heading: int
    street_view_pitch: int
    style: HolidayStyle
    status: GenerationStatus
    original_image_url: str = Field(..., description="Street View image URL (Vercel Blob)")
    decorated_image_url: Optional[str] = Field(default=None, description="Decorated image URL (NULL until completed)")
    before_after_image_url: Optional[str] = Field(default=None, description="Before/after comparison image URL")
    credits_remaining: int = Field(..., description="Holiday credits after deduction")
    created_at: datetime
    estimated_completion_seconds: int = Field(default=10, description="Estimated generation time")
    error_message: Optional[str] = Field(default=None, description="Error details if status === 'failed'")

    class Config:
        from_attributes = True  # Enable ORM mode for asyncpg Record


class HolidayGenerationListResponse(BaseModel):
    """
    Response from listing user's generations.
    GET /v1/holiday/generations
    """
    generations: list[HolidayGenerationResponse]
    total: int
    limit: int
    offset: int


# ============================================================================
# Sharing API Models (contracts/share-api.md)
# ============================================================================

class ShareRequest(BaseModel):
    """
    Request body for creating a share tracking link.
    POST /v1/holiday/shares
    """
    generation_id: str = Field(..., description="Holiday generation UUID")
    platform: SharePlatform = Field(..., description="Social media platform")


class ShareResponse(BaseModel):
    """
    Response from creating a share.
    POST /v1/holiday/shares
    """
    id: str = Field(..., description="Share UUID")
    user_id: str
    generation_id: str
    platform: SharePlatform
    tracking_link: str = Field(..., description="Unique tracking URL (e.g., https://yarda.com/h/abc123xyz)")
    share_url: str = Field(..., description="Platform-specific share URL")
    before_after_image_url: str = Field(..., description="Image to share")
    can_earn_credit: bool = Field(..., description="False if daily limit reached")
    daily_shares_remaining: int = Field(..., description="How many more shares allowed today")
    created_at: datetime

    class Config:
        from_attributes = True


class ShareListResponse(BaseModel):
    """
    Response from listing user's shares.
    GET /v1/holiday/shares
    """
    shares: list[ShareResponse]
    total: int
    limit: int
    offset: int


class ShareTrackResponse(BaseModel):
    """
    Response from tracking a share click.
    GET /v1/holiday/shares/track/:code
    """
    success: bool
    credit_granted: bool = Field(..., description="True if this was first click and credit was granted")
    credits_remaining: int = Field(..., description="New balance if credit granted")
    message: str


# ============================================================================
# Credits API Models (contracts/credits-api.md)
# ============================================================================

class EarningsBreakdown(BaseModel):
    """Breakdown of how credits were earned"""
    signup_bonus: int = Field(default=0, description="Credits from signup (1 or 0)")
    social_shares: int = Field(default=0, description="Credits from social shares")
    other: int = Field(default=0, description="Future: referrals, promotions, etc.")


class HolidayCreditsResponse(BaseModel):
    """
    Response from getting holiday credits balance.
    GET /v1/holiday/credits
    """
    holiday_credits: int = Field(..., description="Current balance")
    holiday_credits_earned: int = Field(..., description="Total earned (lifetime)")
    can_generate: bool = Field(..., description="True if credits > 0")
    earnings_breakdown: EarningsBreakdown


class HolidayCreditTransaction(BaseModel):
    """Single credit transaction record"""
    id: str
    user_id: str
    amount: int = Field(..., description="+1 (earned) or -1 (spent)")
    transaction_type: TransactionType
    balance_after: int = Field(..., description="Balance after transaction")
    related_generation_id: Optional[str] = Field(default=None, description="If type === 'generation'")
    related_share_id: Optional[str] = Field(default=None, description="If type === 'social_share'")
    created_at: datetime

    class Config:
        from_attributes = True


class HolidayCreditHistoryResponse(BaseModel):
    """
    Response from getting credit transaction history.
    GET /v1/holiday/credits/history
    """
    transactions: list[HolidayCreditTransaction]
    total: int
    limit: int
    offset: int


# ============================================================================
# Email API Models (contracts/email-api.md)
# ============================================================================

class EmailHDRequest(BaseModel):
    """
    Request body for requesting HD image via email.
    POST /v1/holiday/email/request-hd
    """
    generation_id: str = Field(..., description="Generation UUID")
    email: str = Field(..., description="Email address for HD image delivery")

    @field_validator('email')
    @classmethod
    def validate_email(cls, v: str) -> str:
        """Basic email validation"""
        if '@' not in v or '.' not in v.split('@')[-1]:
            raise ValueError("Invalid email address")
        return v.lower().strip()


class EmailHDResponse(BaseModel):
    """
    Response from email HD request.
    POST /v1/holiday/email/request-hd
    """
    success: bool
    message: str
    email_sent_to: str
    subscribed_to_nurture: bool = Field(..., description="True if added to email nurture list")


# ============================================================================
# Database Models (Internal, not exposed via API)
# ============================================================================

class HolidayGenerationDB(BaseModel):
    """
    Internal database model for holiday_generations table.
    Used for database queries and ORM operations.
    """
    id: str
    user_id: str
    address: str
    geocoded_lat: Decimal
    geocoded_lng: Decimal
    street_view_heading: int
    street_view_pitch: int
    style: HolidayStyle
    original_image_url: str
    decorated_image_url: Optional[str] = None
    before_after_image_url: Optional[str] = None
    status: GenerationStatus
    error_message: Optional[str] = None
    credit_deducted: bool = False
    credit_refunded: bool = False
    gemini_prompt: Optional[str] = None
    generation_duration_seconds: Optional[int] = None
    created_at: datetime
    updated_at: datetime
    completed_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class SocialShareDB(BaseModel):
    """
    Internal database model for social_shares table.
    """
    id: str
    user_id: str
    generation_id: str
    platform: SharePlatform
    tracking_link: str
    tracking_code: str
    clicked: bool = False
    credit_granted: bool = False
    credit_granted_at: Optional[datetime] = None
    verification_method: Literal['tracking_link', 'oauth_api'] = 'tracking_link'
    verified: bool = False
    verified_at: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class EmailNurtureDB(BaseModel):
    """
    Internal database model for email_nurture_list table.
    """
    id: str
    user_id: Optional[str] = None
    email: str
    source: str = 'holiday_decorator'
    opted_in: bool = True
    opted_out_at: Optional[datetime] = None
    campaign_tag: str = 'holiday_to_spring_2025'
    email_sent_count: int = 0
    last_email_sent_at: Optional[datetime] = None
    converted_to_landscape: bool = False
    converted_at: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


# ============================================================================
# Service Layer Models (for business logic)
# ============================================================================

class CreditDeductionResult(BaseModel):
    """Result from atomic credit deduction operation"""
    success: bool
    credits_remaining: int
    error_message: Optional[str] = None


class DailyShareLimitCheck(BaseModel):
    """Result from daily share limit check"""
    can_share: bool
    shares_today: int
    shares_remaining: int
    reset_at: datetime


# ============================================================================
# API Error Models
# ============================================================================

class HolidayAPIError(BaseModel):
    """Standard API error response"""
    error: str = Field(..., description="Error code (e.g., 'INSUFFICIENT_CREDITS')")
    message: str = Field(..., description="Human-readable error message")
    details: Optional[dict] = Field(default=None, description="Additional error context")
