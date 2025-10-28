from datetime import datetime
from typing import Optional
from pydantic import BaseModel, EmailStr, Field
from uuid import UUID


class UserBase(BaseModel):
    """Base user model with common attributes"""
    email: EmailStr


class UserCreate(UserBase):
    """Model for creating a new user"""
    password: str = Field(..., min_length=8)


class UserUpdate(BaseModel):
    """Model for updating user information"""
    email: Optional[EmailStr] = None
    email_verified: Optional[bool] = None
    trial_credits: Optional[int] = Field(None, ge=0)


class User(UserBase):
    """Complete user model"""
    id: UUID
    email_verified: bool = False
    email_verification_token: Optional[UUID] = None
    email_verification_expires_at: Optional[datetime] = None
    trial_credits: int = Field(default=3, ge=0)
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class UserWithCredits(User):
    """User model with credit information"""
    token_balance: int = 0
    total_available: int = 3

    @classmethod
    def from_user_and_token_account(cls, user: User, token_account: Optional['TokenAccount'] = None):
        """Create UserWithCredits from User and TokenAccount"""
        token_balance = token_account.balance if token_account else 0
        return cls(
            **user.model_dump(),
            token_balance=token_balance,
            total_available=user.trial_credits + token_balance
        )


class EmailVerificationRequest(BaseModel):
    """Model for email verification request"""
    token: UUID


class EmailVerificationResponse(BaseModel):
    """Model for email verification response"""
    success: bool
    message: str