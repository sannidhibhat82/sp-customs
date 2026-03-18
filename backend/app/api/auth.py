"""
Authentication API endpoints: admin (username/password) and customer (OTP).
"""
from datetime import timedelta
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.sql import func

from app.database import get_db
from app.models.user import User
from app.schemas.user import (
    Token, UserResponse, UserCreate, LoginRequest,
    SendOtpRequest, VerifyOtpRequest,
    UserMeUpdate,
)
from app.services.auth import AuthService, get_current_active_user
from app.services.otp import send_otp as otp_send, verify_otp as otp_verify
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


@router.put("/me", response_model=UserResponse)
async def update_my_profile(
    body: UserMeUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Update current user's profile (customer account)."""
    data = body.model_dump(exclude_unset=True)
    if "email" in data:
        # Normalize empty -> None
        data["email"] = (data["email"] or "").strip() or None
    if "full_name" in data:
        data["full_name"] = (data["full_name"] or "").strip() or None
    for k, v in data.items():
        setattr(current_user, k, v)
    await db.commit()
    await db.refresh(current_user)
    return UserResponse.model_validate(current_user)


# ---------- Customer OTP login ----------


@router.post("/send-otp")
async def send_otp(
    body: SendOtpRequest,
):
    """Send OTP to phone for customer login. Name stored for account creation on verify."""
    try:
        otp_send(body.phone, body.name)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    return {"message": "OTP sent"}


@router.post("/verify-otp", response_model=Token)
async def verify_otp(
    body: VerifyOtpRequest,
    db: AsyncSession = Depends(get_db),
):
    """Verify OTP and return JWT. Creates customer user if first time."""
    ok, name_from_send = otp_verify(body.phone, body.otp)
    if not ok:
        raise HTTPException(status_code=400, detail="Invalid or expired OTP")
    normalized_phone = body.phone.strip().replace(" ", "")
    name = name_from_send or body.name or ""
    result = await db.execute(select(User).where(User.phone == normalized_phone))
    user = result.scalar_one_or_none()
    if not user:
        # Create customer user: username must be unique, use phone
        username = normalized_phone.replace("+", "p").replace("-", "")[:100]
        if not username:
            username = "cust_" + normalized_phone[-10:]
        # Ensure username unique
        existing = await db.execute(select(User).where(User.username == username))
        if existing.scalar_one_or_none():
            username = f"cust_{normalized_phone[-10:]}_{id(body)}"[:100]
        user = User(
            username=username,
            phone=normalized_phone,
            full_name=name or None,
            role="customer",
            is_active=True,
            hashed_password=None,
        )
        db.add(user)
        await db.commit()
        await db.refresh(user)
    user.last_login = func.now()
    await db.commit()
    await db.refresh(user)
    access_token = AuthService.create_access_token(
        data={"sub": str(user.id), "username": user.username},
        expires_delta=timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES),
    )
    user_response = UserResponse(
        id=user.id, uuid=user.uuid, username=user.username,
        email=user.email, full_name=user.full_name, phone=user.phone,
        role=user.role, is_active=user.is_active, is_superuser=user.is_superuser,
        last_login=user.last_login, created_at=user.created_at, updated_at=user.updated_at,
        avatar_data=user.avatar_data,
    )
    return Token(
        access_token=access_token,
        token_type="bearer",
        expires_in=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        user=user_response,
    )


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

