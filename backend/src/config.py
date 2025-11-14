"""
Application configuration management.

Loads environment variables and provides typed configuration objects.
"""

import os
import sys
from typing import Optional, Union
from pydantic import field_validator
from pydantic_settings import BaseSettings
import stripe
import structlog


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""

    # Database
    database_url: str

    # Supabase Auth
    supabase_url: str
    supabase_anon_key: str
    supabase_service_role_key: str

    # Stripe
    stripe_secret_key: str
    stripe_publishable_key: str
    stripe_webhook_secret: str
    stripe_monthly_pro_price_id: str = ""  # Stripe Price ID for Monthly Pro subscription


    # Google Gemini AI
    gemini_api_key: str

    # Google Maps API
    google_maps_api_key: str

    # Vercel Blob Storage
    blob_read_write_token: str

    # Email Configuration
    skip_email_verification: bool = True
    whitelisted_emails: str = ""

    # Application
    app_url: str = "http://localhost:3000"
    frontend_url: str = "http://localhost:3000"  # For email verification links
    api_url: str = "http://localhost:8000"
    environment: str = "development"

    # CORS (supports ports 3000-3003 for Next.js dev server auto-port selection)
    cors_origins: Union[list[str], str] = [
        "http://localhost:3000",
        "http://localhost:3001",
        "http://localhost:3002",
        "http://localhost:3003",
        "https://yarda.pro",  # Production frontend
        "https://www.yarda.pro",  # Production frontend with www
    ]

    @field_validator("cors_origins", mode="before")
    @classmethod
    def parse_cors_origins(cls, v):
        """
        Parse CORS origins from string or list.

        Supports Vercel preview URLs by pattern matching.
        If CORS_ORIGINS contains 'vercel', all *.vercel.app origins are allowed.
        """
        if isinstance(v, str):
            origins = [origin.strip() for origin in v.split(",")]
        else:
            origins = v

        # Add Vercel preview URL support
        # Check if any origin contains 'vercel' or if we should allow all Vercel previews
        if any("vercel" in origin.lower() for origin in origins):
            # Allow all Vercel preview deployments
            origins.append("https://yarda-v5-frontend-git-main-thetangstrs-projects.vercel.app")
            # Note: For wildcard support, we need to use allow_origin_regex in middleware

        return origins

    # Token/Trial Configuration
    trial_credits: int = 3
    token_cost_per_generation: int = 1

    # Auto-Reload Configuration
    auto_reload_min_amount: int = 10
    auto_reload_min_threshold: int = 1
    auto_reload_max_threshold: int = 100
    auto_reload_max_failures: int = 3
    auto_reload_throttle_seconds: int = 60

    # Generation Configuration
    max_image_size_mb: int = 10
    max_custom_prompt_length: int = 500
    max_areas_per_generation: int = 5
    generation_timeout_seconds: int = 300  # 5 minutes

    # Rate Limiting
    rate_limit_per_minute: int = 60
    rate_limit_per_hour: int = 1000

    class Config:
        env_file = ".env"
        case_sensitive = False


# Load settings
settings = Settings()


# Initialize Stripe SDK
stripe.api_key = settings.stripe_secret_key
stripe.api_version = "2024-10-28.acacia"  # Use latest stable version


def get_stripe_webhook_secret() -> str:
    """Get Stripe webhook secret for signature verification."""
    return settings.stripe_webhook_secret


def get_settings() -> Settings:
    """
    Dependency for FastAPI endpoints to access settings.

    Usage:
        @app.get("/config")
        async def get_config(settings: Settings = Depends(get_settings)):
            return {"environment": settings.environment}
    """
    return settings


# Configure structured logging for Google Maps API calls
def configure_logging():
    """
    Configure structlog for structured logging of Google Maps API calls.

    Logs API calls with:
    - api: Endpoint called (geocoding, street_view_metadata, street_view, satellite)
    - request_params: Request parameters (coordinates, address, size, etc.)
    - status: Response status
    - duration_ms: Response time in milliseconds
    - error_details: Error information (if any)
    """
    structlog.configure(
        processors=[
            structlog.contextvars.merge_contextvars,
            structlog.processors.add_log_level,
            structlog.processors.StackInfoRenderer(),
            structlog.dev.set_exc_info,
            structlog.processors.TimeStamper(fmt="iso"),
            structlog.dev.ConsoleRenderer() if settings.environment == "development"
            else structlog.processors.JSONRenderer(),
        ],
        wrapper_class=structlog.make_filtering_bound_logger(20),  # INFO level
        context_class=dict,
        logger_factory=structlog.PrintLoggerFactory(file=sys.stdout),
        cache_logger_on_first_use=False,
    )


# Initialize logging configuration
configure_logging()
