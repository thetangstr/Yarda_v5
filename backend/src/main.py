"""
FastAPI Application Entry Point

This is the main application file that initializes FastAPI with:
- Connection pooling lifecycle management
- Global exception handlers
- CORS middleware
- API routers
"""

from contextlib import asynccontextmanager
from fastapi import FastAPI, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
from dotenv import load_dotenv
import logging

# Load environment variables
load_dotenv()

# Import configuration
from .config import settings, get_log_config

# Configure logging
logging.config.dictConfig(get_log_config())
logger = logging.getLogger(__name__)

# Import custom exceptions
from .exceptions import YardaException, RateLimitError

# Import routers
from .api.endpoints import auth, generations, credits, rate_limits


# ============================================================================
# Application Lifecycle Management
# ============================================================================

@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Application lifecycle manager with connection pooling.

    Startup:
    - Initialize connection pool (handled by Supabase client)
    - Log application startup
    - Supabase's httpx client uses built-in connection pooling (default: 10 connections)

    Shutdown:
    - Cleanup resources
    - Log application shutdown
    """
    # Startup
    logger.info("=" * 80)
    logger.info("Starting Yarda API")
    logger.info("=" * 80)
    logger.info(f"Environment: {'Development' if settings.debug else 'Production'}")
    logger.info(f"API Host: {settings.api_host}:{settings.api_port}")
    logger.info(f"Log Level: {settings.log_level}")
    logger.info(f"Log Format: {settings.log_format}")
    logger.info(f"Rate Limiting: {settings.enable_rate_limiting}")
    logger.info(f"Max Page Size: {settings.max_page_size}")
    logger.info("Supabase connection pool initialized (httpx default: 10 connections)")
    logger.info("=" * 80)

    yield

    # Shutdown
    logger.info("=" * 80)
    logger.info("Shutting down Yarda API")
    logger.info("Cleaned up resources")
    logger.info("=" * 80)


# ============================================================================
# FastAPI Application
# ============================================================================

app = FastAPI(
    title="Yarda Landscape Designer API",
    description="""
    AI-powered landscape design generation platform.

    ## Features
    - User registration and email verification
    - Credit-based generation system (trial + token credits)
    - Rate limiting (3 requests per 60 seconds)
    - Asynchronous landscape design generation
    - Generation history with pagination

    ## Authentication
    All endpoints except registration and verification require authentication.
    Use the JWT token from Supabase Auth in the Authorization header:
    `Authorization: Bearer <token>`

    ## Credits System
    - New users get 3 free trial credits
    - Trial credits are consumed first
    - Token credits can be purchased (future feature)
    - Credits are automatically refunded if generation fails

    ## Rate Limiting
    - Maximum 3 generation requests per 60 seconds per user
    - Returns 429 with retry_after if limit exceeded
    - Check `/rate-limits/status` for current status
    """,
    version="1.0.0",
    docs_url="/api/docs",
    redoc_url="/api/redoc",
    lifespan=lifespan
)


# ============================================================================
# Middleware Configuration
# ============================================================================

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ============================================================================
# Global Exception Handlers
# ============================================================================

@app.exception_handler(YardaException)
async def yarda_exception_handler(request: Request, exc: YardaException):
    """
    Handle custom Yarda exceptions.

    Converts domain exceptions into appropriate HTTP responses.
    """
    logger.error(
        f"{exc.__class__.__name__}: {exc.message}",
        extra={
            "path": request.url.path,
            "method": request.method,
            "status_code": exc.status_code
        }
    )

    response_content = {
        "error": exc.__class__.__name__,
        "message": exc.message
    }

    # Add retry_after for rate limit errors
    if isinstance(exc, RateLimitError):
        response_content["retry_after"] = exc.retry_after

    return JSONResponse(
        status_code=exc.status_code,
        content=response_content
    )


@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    """
    Handle Pydantic validation errors.

    Returns detailed validation error information.
    """
    logger.error(
        f"Validation error: {exc.errors()}",
        extra={
            "path": request.url.path,
            "method": request.method,
            "errors": exc.errors()
        }
    )

    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content={
            "error": "ValidationError",
            "message": "Invalid request data",
            "details": exc.errors()
        }
    )


@app.exception_handler(Exception)
async def general_exception_handler(request: Request, exc: Exception):
    """
    Catch-all for unexpected errors.

    Logs full exception details but returns generic message to client.
    """
    logger.exception(
        "Unexpected error occurred",
        extra={
            "path": request.url.path,
            "method": request.method,
            "error_type": type(exc).__name__
        }
    )

    # Don't expose internal error details in production
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={
            "error": "InternalServerError",
            "message": "An unexpected error occurred. Please try again later."
        }
    )


# ============================================================================
# Router Registration
# ============================================================================

app.include_router(auth.router, prefix="/api")
app.include_router(generations.router, prefix="/api")
app.include_router(credits.router, prefix="/api")
app.include_router(rate_limits.router, prefix="/api")


# ============================================================================
# Health Check Endpoints
# ============================================================================

@app.get(
    "/",
    tags=["Health"],
    summary="Root endpoint",
    description="Basic API information and status check"
)
async def root():
    """Root endpoint - API information"""
    return {
        "name": "Yarda Landscape Designer API",
        "version": "1.0.0",
        "status": "operational",
        "docs": "/api/docs"
    }


@app.get(
    "/health",
    tags=["Health"],
    summary="Health check",
    description="Service health check for monitoring and load balancers"
)
async def health_check():
    """Health check endpoint for monitoring"""
    return {
        "status": "healthy",
        "service": "yarda-api",
        "version": "1.0.0",
        "database": "connected"  # Supabase handles connection health
    }


# ============================================================================
# Application Entry Point
# ============================================================================

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "main:app",
        host=settings.api_host,
        port=settings.api_port,
        reload=settings.debug,
        log_level=settings.log_level.lower(),
        log_config=get_log_config()
    )
