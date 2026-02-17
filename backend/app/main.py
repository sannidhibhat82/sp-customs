"""
SP Customs - Vehicle Gadgets Inventory Platform
Main FastAPI Application
"""
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.config import settings
from app.database import init_db, AsyncSessionLocal
from app.api import api_router
from app.services.auth import AuthService


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan handler."""
    # Startup
    print(f"Starting {settings.APP_NAME} v{settings.APP_VERSION}")
    
    # Initialize database
    await init_db()
    print("Database initialized")
    
    # Create initial admin user
    async with AsyncSessionLocal() as db:
        admin = await AuthService.create_initial_admin(db)
        if admin:
            print(f"Created initial admin user: {admin.username}")
    
    yield
    
    # Shutdown
    print("Shutting down...")


app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    description="Dynamic Vehicle Gadgets Inventory & Catalog Platform",
    lifespan=lifespan,
    docs_url="/docs" if settings.ENABLE_API_DOCS else None,
    redoc_url="/redoc" if settings.ENABLE_API_DOCS else None,
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS + ["*"],  # Allow all for development
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include API router
app.include_router(api_router, prefix="/api")





@app.get("/")
async def root():
    """Root endpoint."""
    out = {
        "name": settings.APP_NAME,
        "version": settings.APP_VERSION,
        "status": "running",
        "api": "/api",
    }
    if settings.ENABLE_API_DOCS:
        out["docs"] = "/docs"
    return out


@app.get("/health")
async def health_check():
    """Health check endpoint."""
    return {"status": "healthy"}


# Exception handlers
@app.exception_handler(Exception)
async def global_exception_handler(request, exc):
    """Global exception handler. Log the real error so production logs show the cause."""
    import logging
    import traceback
    logger = logging.getLogger(__name__)
    logger.error(
        "Unhandled exception: %s\n%s",
        exc,
        traceback.format_exc(),
        exc_info=True,
    )
    return JSONResponse(
        status_code=500,
        content={
            "detail": "Internal server error",
            "message": str(exc) if settings.DEBUG else "An error occurred",
        }
    )


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=8000,
        reload=settings.DEBUG,
    )

