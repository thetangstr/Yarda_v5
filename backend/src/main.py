"""
FastAPI application entry point.

Main application setup with CORS, middleware, and route registration.
"""

from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from src.config import settings
from src.db.connection_pool import db_pool
from src.api.endpoints import auth, generations


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
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Register routers
app.include_router(auth.router)
app.include_router(generations.router)


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


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(
        "src.main:app",
        host="0.0.0.0",
        port=8000,
        reload=True,  # Enable auto-reload in development
        log_level="info"
    )
