"""
Token Account Models

Pydantic models for token account and transactions.

Requirements:
- FR-017 to FR-025 (Token Purchase)
- T044: TokenAccount model
- T045: TokenTransaction model
"""

from pydantic import BaseModel, Field, field_validator, ConfigDict
from uuid import UUID
from datetime import datetime
from typing import Optional
from decimal import Decimal


class TokenAccount(BaseModel):
    """
    Token account for a user.

    Tracks:
    - balance: Current available tokens
    - total_purchased: Lifetime tokens purchased
    - total_spent: Lifetime tokens spent on generations
    """

    user_id: UUID = Field(..., description="User ID (foreign key to users table)")
    balance: int = Field(..., ge=0, description="Current token balance (cannot be negative)")
    total_purchased: int = Field(
        default=0, ge=0, description="Total tokens purchased (lifetime)"
    )
    total_spent: int = Field(default=0, ge=0, description="Total tokens spent (lifetime)")
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

    model_config = ConfigDict(
        from_attributes=True,
        json_schema_extra={
            "example": {
                "user_id": "550e8400-e29b-41d4-a716-446655440000",
                "balance": 50,
                "total_purchased": 100,
                "total_spent": 50,
                "created_at": "2025-01-15T10:30:00Z",
                "updated_at": "2025-01-20T14:45:00Z",
            }
        }
    )


class TokenAccountResponse(BaseModel):
    """Response model for token account queries."""

    balance: int = Field(..., description="Current token balance")
    total_purchased: int = Field(..., description="Total tokens purchased")
    total_spent: int = Field(..., description="Total tokens spent")
    auto_reload_enabled: bool = Field(default=False, description="Auto-reload enabled")
    auto_reload_threshold: Optional[int] = Field(None, description="Reload threshold (1-100)")
    auto_reload_amount: Optional[int] = Field(None, description="Reload amount (min 10)")
    auto_reload_failure_count: int = Field(default=0, description="Consecutive failures")

    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "balance": 50,
                "total_purchased": 100,
                "total_spent": 50,
                "auto_reload_enabled": True,
                "auto_reload_threshold": 20,
                "auto_reload_amount": 100,
                "auto_reload_failure_count": 0,
            }
        }
    )


class TokenTransaction(BaseModel):
    """
    Token transaction record.

    Types:
    - purchase: Tokens purchased via Stripe
    - generation: Tokens spent on landscape generation
    - refund: Tokens refunded after failed generation
    """

    id: UUID = Field(default_factory=UUID, description="Transaction ID")
    user_id: UUID = Field(..., description="User ID")
    amount: int = Field(..., description="Token amount (positive for credit, negative for debit)")
    transaction_type: str = Field(
        ..., description="Transaction type: purchase, generation, refund"
    )
    description: str = Field(..., description="Human-readable description")
    stripe_payment_intent_id: Optional[str] = Field(
        None,
        description="Stripe payment intent ID (for idempotency, UNIQUE constraint)",
        max_length=255,
    )
    price_paid_cents: Optional[int] = Field(
        None, ge=0, description="Price paid in cents (for purchases)"
    )
    created_at: datetime = Field(default_factory=datetime.utcnow)

    @field_validator("transaction_type")
    @classmethod
    def validate_transaction_type(cls, v: str) -> str:
        """Validate transaction type is one of allowed values."""
        allowed_types = {"purchase", "generation", "refund"}
        if v not in allowed_types:
            raise ValueError(
                f"transaction_type must be one of {allowed_types}, got '{v}'"
            )
        return v

    @field_validator("amount")
    @classmethod
    def validate_amount_sign(cls, v: int, info) -> int:
        """Validate amount sign matches transaction type."""
        # Note: info.data is available in Pydantic v2
        transaction_type = info.data.get("transaction_type")

        if transaction_type == "purchase" and v <= 0:
            raise ValueError("purchase transactions must have positive amount")
        elif transaction_type == "generation" and v >= 0:
            raise ValueError("generation transactions must have negative amount")
        elif transaction_type == "refund" and v <= 0:
            raise ValueError("refund transactions must have positive amount")

        return v

    model_config = ConfigDict(
        from_attributes=True,
        json_schema_extra={
            "example": {
                "id": "650e8400-e29b-41d4-a716-446655440000",
                "user_id": "550e8400-e29b-41d4-a716-446655440000",
                "amount": 50,
                "transaction_type": "purchase",
                "description": "Purchased 50 tokens",
                "stripe_payment_intent_id": "pi_1234567890abcdef",
                "price_paid_cents": 4500,
                "created_at": "2025-01-20T14:45:00Z",
            }
        }
    )


class TokenTransactionResponse(BaseModel):
    """Response model for token transaction queries."""

    id: UUID
    amount: int
    transaction_type: str
    description: str
    price_paid_cents: Optional[int]
    created_at: datetime

    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "id": "650e8400-e29b-41d4-a716-446655440000",
                "amount": 50,
                "transaction_type": "purchase",
                "description": "Purchased 50 tokens",
                "price_paid_cents": 4500,
                "created_at": "2025-01-20T14:45:00Z",
            }
        }
    )


class TokenPackage(BaseModel):
    """
    Token package for purchase.

    Requirements:
    - FR-021: 10 tokens for $10.00
    - FR-022: 50 tokens for $45.00 (10% discount)
    - FR-023: 100 tokens for $90.00 (10% discount)
    - FR-024: 500 tokens for $400.00 (20% discount, BEST VALUE)
    """

    package_id: str = Field(..., description="Unique package identifier")
    tokens: int = Field(..., gt=0, description="Number of tokens")
    price_usd: Decimal = Field(..., gt=0, description="Price in USD")
    price_cents: int = Field(..., gt=0, description="Price in cents (for Stripe)")
    price_per_token: Decimal = Field(..., gt=0, description="Price per token")
    discount_percent: Optional[int] = Field(None, ge=0, le=100, description="Discount %")
    is_best_value: bool = Field(default=False, description="Best value badge")

    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "package_id": "package_50",
                "tokens": 50,
                "price_usd": "45.00",
                "price_cents": 4500,
                "price_per_token": "0.90",
                "discount_percent": 10,
                "is_best_value": False,
            }
        }
    )


# Token package definitions (FR-021 to FR-024)
TOKEN_PACKAGES = [
    TokenPackage(
        package_id="package_10",
        tokens=10,
        price_usd=Decimal("10.00"),
        price_cents=1000,
        price_per_token=Decimal("1.00"),
        discount_percent=None,
        is_best_value=False,
    ),
    TokenPackage(
        package_id="package_50",
        tokens=50,
        price_usd=Decimal("45.00"),
        price_cents=4500,
        price_per_token=Decimal("0.90"),
        discount_percent=10,
        is_best_value=False,
    ),
    TokenPackage(
        package_id="package_100",
        tokens=100,
        price_usd=Decimal("90.00"),
        price_cents=9000,
        price_per_token=Decimal("0.90"),
        discount_percent=10,
        is_best_value=False,
    ),
    TokenPackage(
        package_id="package_500",
        tokens=500,
        price_usd=Decimal("400.00"),
        price_cents=40000,
        price_per_token=Decimal("0.80"),
        discount_percent=20,
        is_best_value=True,
    ),
]


def get_token_package(package_id: str) -> Optional[TokenPackage]:
    """Get token package by ID."""
    return next((pkg for pkg in TOKEN_PACKAGES if pkg.package_id == package_id), None)


class CreateCheckoutSessionRequest(BaseModel):
    """Request to create Stripe checkout session."""

    package_id: str = Field(..., description="Token package ID")

    @field_validator("package_id")
    @classmethod
    def validate_package_exists(cls, v: str) -> str:
        """Validate package ID exists."""
        if get_token_package(v) is None:
            raise ValueError(f"Invalid package_id: {v}")
        return v

    model_config = ConfigDict(
        json_schema_extra={"example": {"package_id": "package_50"}}
    )


class CreateCheckoutSessionResponse(BaseModel):
    """Response with Stripe checkout session URL."""

    session_id: str = Field(..., description="Stripe checkout session ID")
    url: str = Field(..., description="Checkout URL to redirect user")

    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "session_id": "cs_test_1234567890abcdef",
                "url": "https://checkout.stripe.com/pay/cs_test_1234567890abcdef",
            }
        }
    )


class ConfigureAutoReloadRequest(BaseModel):
    """
    Request to configure auto-reload settings.

    Requirements:
    - FR-034: Enable auto-reload with threshold (1-100) and amount (min 10)
    """

    enabled: bool = Field(..., description="Enable or disable auto-reload")
    threshold: Optional[int] = Field(
        None, ge=1, le=100, description="Balance threshold to trigger reload (1-100)"
    )
    amount: Optional[int] = Field(
        None, ge=10, description="Amount of tokens to reload (minimum 10)"
    )

    @field_validator("threshold")
    @classmethod
    def validate_threshold_when_enabled(cls, v: Optional[int], info) -> Optional[int]:
        """Validate threshold is provided when enabling auto-reload."""
        enabled = info.data.get("enabled")
        if enabled and v is None:
            raise ValueError("threshold required when enabling auto-reload")
        return v

    @field_validator("amount")
    @classmethod
    def validate_amount_when_enabled(cls, v: Optional[int], info) -> Optional[int]:
        """Validate amount is provided when enabling auto-reload."""
        enabled = info.data.get("enabled")
        if enabled and v is None:
            raise ValueError("amount required when enabling auto-reload")
        return v

    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "enabled": True,
                "threshold": 20,
                "amount": 100,
            }
        }
    )


class AutoReloadConfigResponse(BaseModel):
    """
    Response with current auto-reload configuration.

    Requirements:
    - FR-034 to FR-042: All auto-reload configuration fields
    """

    auto_reload_enabled: bool = Field(..., description="Auto-reload enabled")
    auto_reload_threshold: Optional[int] = Field(
        None, description="Balance threshold (1-100)"
    )
    auto_reload_amount: Optional[int] = Field(None, description="Reload amount (min 10)")
    auto_reload_failure_count: int = Field(
        default=0, description="Consecutive failure count"
    )
    last_reload_at: Optional[datetime] = Field(
        None, description="Last reload timestamp (for throttling)"
    )

    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "auto_reload_enabled": True,
                "auto_reload_threshold": 20,
                "auto_reload_amount": 100,
                "auto_reload_failure_count": 0,
                "last_reload_at": "2025-01-20T14:45:00Z",
            }
        }
    )
