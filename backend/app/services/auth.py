"""
Authentication Service - JWT-based authentication for admin users.
"""
from datetime import datetime, timedelta
from typing import Optional
import bcrypt
from jose import JWTError, jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.config import settings
from app.database import get_db
from app.models.user import User
from app.schemas.user import TokenData

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login", auto_error=False)


class AuthService:
    """Service for authentication operations."""
    
    @staticmethod
    def verify_password(plain_password: str, hashed_password: str) -> bool:
        """Verify a password against its hash."""
        password_bytes = plain_password.encode('utf-8')
        hash_bytes = hashed_password.encode('utf-8')
        return bcrypt.checkpw(password_bytes, hash_bytes)
    
    @staticmethod
    def get_password_hash(password: str) -> str:
        """Generate password hash."""
        password_bytes = password.encode('utf-8')
        salt = bcrypt.gensalt()
        hashed = bcrypt.hashpw(password_bytes, salt)
        return hashed.decode('utf-8')
    
    @staticmethod
    def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
        """Create a JWT access token."""
        to_encode = data.copy()
        
        if expires_delta:
            expire = datetime.utcnow() + expires_delta
        else:
            expire = datetime.utcnow() + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
        
        to_encode.update({"exp": expire})
        encoded_jwt = jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)
        return encoded_jwt
    
    @staticmethod
    def decode_token(token: str) -> Optional[TokenData]:
        """Decode and validate a JWT token."""
        try:
            payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
            sub = payload.get("sub")
            username: str = payload.get("username")
            
            if sub is None:
                return None
            
            # Convert sub to int (it's stored as string for JWT compliance)
            user_id = int(sub) if isinstance(sub, str) else sub
            
            return TokenData(user_id=user_id, username=username)
        except (JWTError, ValueError):
            return None
    
    @staticmethod
    async def authenticate_user(db: AsyncSession, username: str, password: str) -> Optional[User]:
        """Authenticate a user by username and password."""
        result = await db.execute(select(User).where(User.username == username))
        user = result.scalar_one_or_none()
        
        if not user:
            return None
        
        if not AuthService.verify_password(password, user.hashed_password):
            return None
        
        return user
    
    @staticmethod
    async def get_user_by_id(db: AsyncSession, user_id: int) -> Optional[User]:
        """Get a user by ID."""
        result = await db.execute(select(User).where(User.id == user_id))
        return result.scalar_one_or_none()
    
    @staticmethod
    async def create_initial_admin(db: AsyncSession) -> Optional[User]:
        """Create initial admin user if none exists."""
        result = await db.execute(select(User).limit(1))
        existing_user = result.scalar_one_or_none()
        
        if existing_user:
            return None
        
        admin = User(
            username=settings.ADMIN_USERNAME,
            email="admin@spcustoms.com",
            hashed_password=AuthService.get_password_hash(settings.ADMIN_PASSWORD),
            full_name="SP Customs Admin",
            role="admin",
            is_active=True,
            is_superuser=True,
        )
        
        db.add(admin)
        await db.commit()
        await db.refresh(admin)
        
        return admin


async def get_current_user(
    token: Optional[str] = Depends(oauth2_scheme),
    db: AsyncSession = Depends(get_db)
) -> Optional[User]:
    """Get current authenticated user from JWT token."""
    if not token:
        return None
    
    token_data = AuthService.decode_token(token)
    if not token_data or not token_data.user_id:
        return None
    
    user = await AuthService.get_user_by_id(db, token_data.user_id)
    if not user or not user.is_active:
        return None
    
    return user


async def get_current_active_user(
    current_user: Optional[User] = Depends(get_current_user)
) -> User:
    """Require authenticated user."""
    if not current_user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return current_user


async def get_admin_user(
    current_user: User = Depends(get_current_active_user)
) -> User:
    """Require admin user."""
    if current_user.role not in ["admin", "manager"] and not current_user.is_superuser:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not enough permissions",
        )
    return current_user

