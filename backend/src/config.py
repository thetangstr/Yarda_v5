"""
Application Configuration
Centralized configuration management using Pydantic Settings
"""
import os
from typing import List
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    """
    Application settings with validation and environment variable support.

    All settings can be configured via environment variables.
    For local development, use a .env file in the backend directory.
    """

    # ============================================================================
    # Supabase Configuration
    # ============================================================================
    supabase_url: str
    supabase_anon_key: str
    supabase_service_role_key: str

    # ============================================================================
    # API Server Configuration
    # ============================================================================
    api_host: str = "0.0.0.0"
    api_port: int = 8000
    debug: bool = False

    # CORS - comma-separated list of allowed origins
    allowed_origins: str = "*"

    @property
    def origins_list(self) -> List[str]:
        """Parse allowed origins from comma-separated string"""
        if self.allowed_origins == "*":
            return ["*"]
        return [origin.strip() for origin in self.allowed_origins.split(",")]

    # ============================================================================
    # Performance Configuration
    # ============================================================================
    # Connection pooling is handled by Supabase client (httpx)
    # Default pool limits: 10 connections
    max_page_size: int = 100
    default_page_size: int = 20

    # ============================================================================
    # Rate Limiting Configuration
    # ============================================================================
    rate_limit_window: int = 60  # seconds
    rate_limit_max_requests: int = 3

    # ============================================================================
    # Logging Configuration
    # ============================================================================
    log_level: str = "INFO"
    log_format: str = "json"  # "json" or "text"

    # ============================================================================
    # Feature Flags
    # ============================================================================
    enable_email_verification: bool = True
    enable_rate_limiting: bool = True

    # ============================================================================
    # Pydantic Configuration
    # ============================================================================
    class Config:
        """Pydantic configuration"""
        env_file = ".env"
        env_file_encoding = "utf-8"
        case_sensitive = False
        # Allow reading from environment variables
        extra = "ignore"


# ============================================================================
# Singleton Instance
# ============================================================================
# This instance is loaded once at startup and shared across the application
settings = Settings()


# ============================================================================
# Logging Configuration Helper
# ============================================================================
def get_log_config() -> dict:
    """
    Get logging configuration based on settings.

    Returns:
        dict: Logging configuration for uvicorn/FastAPI
    """
    if settings.log_format == "json":
        return {
            "version": 1,
            "disable_existing_loggers": False,
            "formatters": {
                "json": {
                    "()": "pythonjsonlogger.jsonlogger.JsonFormatter",
                    "format": "%(asctime)s %(name)s %(levelname)s %(message)s"
                }
            },
            "handlers": {
                "console": {
                    "class": "logging.StreamHandler",
                    "formatter": "json",
                    "stream": "ext://sys.stdout"
                }
            },
            "root": {
                "level": settings.log_level,
                "handlers": ["console"]
            }
        }
    else:
        # Text format (default)
        return {
            "version": 1,
            "disable_existing_loggers": False,
            "formatters": {
                "default": {
                    "format": "%(asctime)s - %(name)s - %(levelname)s - %(message)s"
                }
            },
            "handlers": {
                "console": {
                    "class": "logging.StreamHandler",
                    "formatter": "default",
                    "stream": "ext://sys.stdout"
                }
            },
            "root": {
                "level": settings.log_level,
                "handlers": ["console"]
            }
        }
