"""
FastAPI application entry point.

Main application setup with CORS, middleware, and route registration.
"""

from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from src.config import settings
from src.db.connection_pool import db_pool
from src.api.endpoints import auth, generations, tokens, webhooks, subscriptions, users, holiday, credits
from src.api.endpoints import debug
from src.services.share_service import ShareService
from src.services.holiday_credit_service import HolidayCreditService
from fastapi import HTTPException
from fastapi.responses import RedirectResponse


@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Application lifespan manager.

    Handles startup and shutdown events:
    - Startup: Initialize database connection pool
    - Shutdown: Close database connections
    """
    # Startup
    print("Starting Yarda AI Landscape Studio API...")
    await db_pool.connect()
    print(f"Database connection pool initialized")

    yield

    # Shutdown
    print("Shutting down...")
    await db_pool.disconnect()
    print("Database connection pool closed")


# Create FastAPI application
app = FastAPI(
    title="Yarda AI Landscape Studio",
    description="API for AI-powered landscape design generation",
    version="1.0.0",
    lifespan=lifespan
)


# Configure CORS
print(f"[CORS Debug] Configured CORS origins: {settings.cors_origins}")
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    # Note: Vercel preview URLs should be added to cors_origins in production
)


# Register routers
app.include_router(auth.router)
app.include_router(users.router)  # NEW: User profile and payment status endpoints
app.include_router(generations.router)
app.include_router(tokens.router)
app.include_router(webhooks.router)
app.include_router(subscriptions.router)  # NEW: Monthly Pro subscription endpoints
app.include_router(holiday.router)  # NEW: Holiday decorator endpoints (Feature 007)
app.include_router(credits.router)  # NEW: Unified credit balance endpoint (Credit Systems Consolidation)
app.include_router(debug.router)  # DEBUG: Admin debug logging endpoints


@app.get("/")
async def root():
    """Health check endpoint."""
    return {
        "name": "Yarda AI Landscape Studio API",
        "version": "1.0.0",
        "status": "healthy",
        "environment": settings.environment
    }


@app.get("/health")
async def health_check():
    """
    Health check endpoint for monitoring.

    Returns:
        Health status with database connection status
    """
    # Check database connection
    try:
        await db_pool.fetchval("SELECT 1")
        db_status = "connected"
    except Exception as e:
        db_status = f"error: {str(e)}"

    return {
        "status": "healthy" if db_status == "connected" else "unhealthy",
        "database": db_status,
        "environment": settings.environment
    }


@app.get("/h/{tracking_code}")
async def track_share(tracking_code: str):
    """
    Track social media share clicks and award credits.

    This endpoint is accessed when someone clicks on a shared holiday decorator link.
    It tracks the click and potentially awards a credit to the sharer.

    Args:
        tracking_code: Unique tracking code from the share URL

    Returns:
        Redirect to the holiday decorator page with a success message
    """
    try:
        # Initialize services
        credit_service = HolidayCreditService(db_pool)
        share_service = ShareService(
            db_pool=db_pool,
            credit_service=credit_service,
            base_url="https://yarda.pro"
        )

        # Track the share click
        success, credit_granted, credits_remaining, message = await share_service.track_share_click(
            tracking_code=tracking_code
        )

        # Build redirect URL with query parameters
        redirect_url = "https://yarda.pro/holiday"
        if credit_granted:
            redirect_url += "?share_credited=true"
        elif success:
            redirect_url += "?share_tracked=true"
        else:
            redirect_url += "?share_invalid=true"

        # Redirect to the holiday page
        return RedirectResponse(url=redirect_url, status_code=302)

    except Exception as e:
        # On error, redirect to holiday page without parameters
        return RedirectResponse(url="https://yarda.pro/holiday", status_code=302)


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(
        "src.main:app",
        host="0.0.0.0",
        port=8000,
        reload=True,  # Enable auto-reload in development
        log_level="info"
    )
