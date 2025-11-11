"""
Unified Credits API Models

Pydantic models for the unified credit balance endpoint.
Consolidates trial, token, and holiday credit systems into single response.

Feature: Credit Systems Consolidation (2025-11-11)
"""

from pydantic import BaseModel, Field
from typing import Optional


# ============================================================================
# Balance Detail Models
# ============================================================================

class TrialBalanceDetail(BaseModel):
    """Detailed trial credit balance"""
    remaining: int = Field(..., description="Trial credits remaining")
    used: int = Field(..., description="Trial credits used")
    total_granted: int = Field(default=3, description="Total trials granted on signup")

    class Config:
        from_attributes = True


class TokenBalanceDetail(BaseModel):
    """Detailed token credit balance"""
    balance: int = Field(..., description="Current token balance")
    total_purchased: int = Field(..., description="Total tokens purchased (lifetime)")
    total_spent: int = Field(..., description="Total tokens spent (lifetime)")
    total_refunded: int = Field(default=0, description="Total tokens refunded")

    class Config:
        from_attributes = True


class HolidayEarningsBreakdown(BaseModel):
    """Breakdown of how holiday credits were earned"""
    signup_bonus: int = Field(default=0, description="Credits from signup (1 or 0)")
    social_shares: int = Field(default=0, description="Credits from social shares")
    other: int = Field(default=0, description="Future: referrals, promotions, admin grants")


class HolidayBalanceDetail(BaseModel):
    """Detailed holiday credit balance"""
    credits: int = Field(..., description="Current holiday credits")
    earned: int = Field(..., description="Total earned (lifetime)")
    can_generate: bool = Field(..., description="True if credits > 0")
    earnings_breakdown: HolidayEarningsBreakdown

    class Config:
        from_attributes = True


# ============================================================================
# Unified Balance Response
# ============================================================================

class UnifiedBalanceResponse(BaseModel):
    """
    Unified credit balance response for all credit types.

    GET /v1/credits/balance

    Returns detailed balance information for trial, token, and holiday credits
    in a single atomic query. Replaces individual balance endpoints.

    Example response:
    ```json
    {
        "trial": {
            "remaining": 2,
            "used": 1,
            "total_granted": 3
        },
        "token": {
            "balance": 50,
            "total_purchased": 100,
            "total_spent": 48,
            "total_refunded": 2
        },
        "holiday": {
            "credits": 3,
            "earned": 5,
            "can_generate": true,
            "earnings_breakdown": {
                "signup_bonus": 1,
                "social_shares": 3,
                "other": 1
            }
        }
    }
    ```
    """
    trial: TrialBalanceDetail
    token: TokenBalanceDetail
    holiday: HolidayBalanceDetail

    class Config:
        from_attributes = True


# ============================================================================
# Simple Balance Response (Lightweight)
# ============================================================================

class SimpleBalanceResponse(BaseModel):
    """
    Lightweight balance response with just the numbers.

    For use cases where only current balances are needed without metadata.
    Used internally or for performance-critical endpoints.
    """
    trial: int = Field(..., description="Trial credits remaining")
    token: int = Field(..., description="Token balance")
    holiday: int = Field(..., description="Holiday credits")

    class Config:
        from_attributes = True
