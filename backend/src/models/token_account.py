from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field
from uuid import UUID


class TokenAccountBase(BaseModel):
    """Base token account model"""
    user_id: UUID


class TokenAccountCreate(TokenAccountBase):
    """Model for creating a new token account"""
    balance: int = Field(default=0, ge=0)
    total_purchased: int = Field(default=0, ge=0)
    total_consumed: int = Field(default=0, ge=0)


class TokenAccountUpdate(BaseModel):
    """Model for updating token account"""
    balance: Optional[int] = Field(None, ge=0)
    total_purchased: Optional[int] = Field(None, ge=0)
    total_consumed: Optional[int] = Field(None, ge=0)


class TokenAccount(TokenAccountBase):
    """Complete token account model"""
    id: UUID
    balance: int = Field(ge=0)
    total_purchased: int = Field(ge=0)
    total_consumed: int = Field(ge=0)
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class TokenPurchaseRequest(BaseModel):
    """Model for token purchase request"""
    quantity: int = Field(..., gt=0, le=1000)
    payment_method_id: str


class TokenPurchaseResponse(BaseModel):
    """Model for token purchase response"""
    success: bool
    new_balance: int
    purchased_quantity: int
    transaction_id: UUID
