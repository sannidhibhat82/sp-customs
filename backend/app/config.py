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
    
    class Config:
        env_file = ".env"
        case_sensitive = True


settings = Settings()

