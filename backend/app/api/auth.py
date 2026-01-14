"""
Authentication API endpoints.
"""
from datetime import timedelta
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.sql import func

from app.database import get_db
from app.models.user import User
from app.schemas.user import Token, UserResponse, UserCreate, LoginRequest
from app.services.auth import AuthService, get_current_active_user
from app.config import settings

router = APIRouter()


@router.post("/login", response_model=Token)
async def login(
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: AsyncSession = Depends(get_db)
):
    """Login and get access token."""
    user = await AuthService.authenticate_user(db, form_data.username, form_data.password)
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    # Update last login
    user.last_login = func.now()
    await db.commit()
    await db.refresh(user)
    
    # Create access token
    access_token = AuthService.create_access_token(
        data={"sub": str(user.id), "username": user.username},
        expires_delta=timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    )
    
    user_response = UserResponse(
        id=user.id,
        uuid=user.uuid,
        username=user.username,
        email=user.email,
        full_name=user.full_name,
        role=user.role,
        is_active=user.is_active,
        is_superuser=user.is_superuser,
        last_login=user.last_login,
        created_at=user.created_at,
        updated_at=user.updated_at
    )
    
    return Token(
        access_token=access_token,
        token_type="bearer",
        expires_in=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        user=user_response
    )


@router.post("/login/json", response_model=Token)
async def login_json(
    credentials: LoginRequest,
    db: AsyncSession = Depends(get_db)
):
    """Login with JSON body."""
    user = await AuthService.authenticate_user(db, credentials.username, credentials.password)
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
        )
    
    user.last_login = func.now()
    await db.commit()
    await db.refresh(user)
    
    access_token = AuthService.create_access_token(
        data={"sub": str(user.id), "username": user.username},
        expires_delta=timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    )
    
    user_response = UserResponse(
        id=user.id,
        uuid=user.uuid,
        username=user.username,
        email=user.email,
        full_name=user.full_name,
        role=user.role,
        is_active=user.is_active,
        is_superuser=user.is_superuser,
        last_login=user.last_login,
        created_at=user.created_at,
        updated_at=user.updated_at
    )
    
    return Token(
        access_token=access_token,
        token_type="bearer",
        expires_in=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        user=user_response
    )


@router.get("/me", response_model=UserResponse)
async def get_current_user_info(
    current_user: User = Depends(get_current_active_user)
):
    """Get current authenticated user."""
    return UserResponse.model_validate(current_user)


@router.post("/register", response_model=UserResponse)
async def register_user(
    user_data: UserCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Register a new user (admin only)."""
    if not current_user.is_superuser:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only superusers can create new users"
        )
    
    # Check if username exists
    from sqlalchemy import select
    result = await db.execute(select(User).where(User.username == user_data.username))
    if result.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Username already registered"
        )
    
    new_user = User(
        username=user_data.username,
        email=user_data.email,
        hashed_password=AuthService.get_password_hash(user_data.password),
        full_name=user_data.full_name,
        role=user_data.role,
        is_active=True,
    )
    
    db.add(new_user)
    await db.commit()
    await db.refresh(new_user)
    
    return UserResponse.model_validate(new_user)

