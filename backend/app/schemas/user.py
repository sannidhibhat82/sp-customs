from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime


class UserBase(BaseModel):
    username: str = Field(..., min_length=3, max_length=100)
    email: Optional[str] = None
    full_name: Optional[str] = None
    role: str = "admin"


class UserCreate(UserBase):
    password: str = Field(..., min_length=6)


class UserUpdate(BaseModel):
    email: Optional[str] = None
    full_name: Optional[str] = None
    role: Optional[str] = None
    is_active: Optional[bool] = None
    password: Optional[str] = Field(None, min_length=6)


class UserResponse(BaseModel):
    id: int
    uuid: str
    username: str
    email: Optional[str] = None
    full_name: Optional[str] = None
    avatar_data: Optional[str] = None
    role: str
    is_active: bool
    is_superuser: bool
    last_login: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    expires_in: int
    user: UserResponse


class TokenData(BaseModel):
    user_id: Optional[int] = None
    username: Optional[str] = None


class LoginRequest(BaseModel):
    username: str
    password: str

