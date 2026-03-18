from pydantic_settings import BaseSettings
from typing import Optional
import os


class Settings(BaseSettings):
    # Application
    APP_NAME: str = "SP Customs - Vehicle Gadgets Platform"
    APP_VERSION: str = "1.0.0"
    DEBUG: bool = True
    ENABLE_API_DOCS: bool = True  # Set to false to hide /docs and /redoc
    
    # Database
    DATABASE_URL: str = "postgresql+asyncpg://spcustoms:spcustoms123@localhost:5434/sp_customs"
    DATABASE_URL_SYNC: str = "postgresql://spcustoms:spcustoms123@localhost:5434/sp_customs"
    
    # Security
    SECRET_KEY: str = "sp-customs-secret-key-change-in-production-2024"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 7  # 7 days
    
    # Admin credentials (initial setup)
    ADMIN_USERNAME: str = "admin"
    ADMIN_PASSWORD: str = "admin123"
    
    # Image Storage
    IMAGE_STORAGE_TYPE: str = "database"  # "database" or "s3"
    MAX_IMAGE_SIZE_MB: int = 10
    IMAGE_QUALITY: int = 85
    
    # S3 Configuration (for future migration)
    S3_BUCKET_NAME: Optional[str] = None
    S3_REGION: Optional[str] = None
    AWS_ACCESS_KEY_ID: Optional[str] = None
    AWS_SECRET_ACCESS_KEY: Optional[str] = None
    
    # CORS
    CORS_ORIGINS: list = ["http://localhost:3000", "http://127.0.0.1:3000"]

    # Public base URL for building absolute links in external integrations
    # (can be overridden via env, e.g. PUBLIC_BASE_URL="https://spcustoms.in")
    PUBLIC_BASE_URL: str = "http://localhost:8000"
    
    # Shiprocket (shipping, labels, invoices, tracking - API only, no dashboard dependency)
    SHIPROCKET_BASE_URL: str = "https://apiv2.shiprocket.in/v1/external"
    SHIPROCKET_EMAIL: Optional[str] = None
    SHIPROCKET_PASSWORD: Optional[str] = None
    SHIPROCKET_TOKEN_CACHE_TTL_SECONDS: int = 86400  # 24h; token valid 10 days
    SHIPROCKET_PICKUP_PINCODE: str = "110001"
    
    # Shiprocket SR Checkout (payment gateway) - ref: https://docs.google.com/document/d/1uEcKW0uPAldhKiFCqJbAQnAmBTP6Azvlt_Rcxu5BW_0
    SHIPROCKET_CHECKOUT_ENABLED: bool = False
    # API Key & Secret for SR Checkout (from Shiprocket dashboard)
    SHIPROCKET_CHECKOUT_API_KEY: Optional[str] = None
    SHIPROCKET_CHECKOUT_SECRET_KEY: Optional[str] = None
    # SR Checkout "access token" endpoint (headless checkout) from SRC Custom Integration doc
    # Example: https://checkout-api.shiprocket.com/api/v1/access-token/checkout
    SHIPROCKET_CHECKOUT_TOKEN_URL: str = "https://checkout-api.shiprocket.com/api/v1/access-token/checkout"
    # Full URL to create checkout session (e.g. https://apiv2.shiprocket.in/v1/external/checkout/session or SR Checkout API from doc)
    SHIPROCKET_CHECKOUT_SESSION_URL: Optional[str] = None
    # Secret to verify webhook signature (set from SR Checkout dashboard; can be same as secret key)
    SHIPROCKET_CHECKOUT_WEBHOOK_SECRET: Optional[str] = None

    # Shiprocket custom catalog push (SRC Custom Integration):
    # POST https://checkout-api.shiprocket.com/wh/v1/custom/product
    # POST https://checkout-api.shiprocket.com/wh/v1/custom/collection
    SHIPROCKET_CUSTOM_CATALOG_ENABLED: bool = False
    SHIPROCKET_CUSTOM_CATALOG_BASE_URL: str = "https://checkout-api.shiprocket.com"
    # Frontend base URL for success/cancel redirects (e.g. https://yoursite.com)
    FRONTEND_BASE_URL: str = "http://localhost:3000"
    # Backend base URL for webhook URL (e.g. https://api.yoursite.com - must be publicly reachable)
    BACKEND_BASE_URL: str = "http://localhost:8000"
    
    # Feature flag: enable Book Now / checkout flow
    ENABLE_BOOK_NOW: bool = True
    
    # Customer OTP login (Twilio); when not set, dummy OTP used for development
    OTP_DUMMY_FOR_DEV: bool = True
    OTP_DUMMY_CODE: str = "123456"
    TWILIO_ACCOUNT_SID: Optional[str] = None
    TWILIO_AUTH_TOKEN: Optional[str] = None
    TWILIO_PHONE_NUMBER: Optional[str] = None
    
    # Store settings (admin-managed): customer discount %, order status list
    CUSTOMER_DISCOUNT_PERCENT: float = 10.0
    ORDER_STATUS_LIST: str = "Pending Approval,Processing,Packed,Shipped,Out for Delivery,Delivered,Cancelled"
    
    class Config:
        env_file = ".env"
        case_sensitive = True


settings = Settings()

