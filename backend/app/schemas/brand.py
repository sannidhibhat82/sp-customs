from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime


class BrandBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)
    description: Optional[str] = None
    website: Optional[str] = None
    sort_order: int = 0
    is_active: bool = True
    is_featured: bool = False


class BrandCreate(BrandBase):
    logo_data: Optional[str] = None  # Base64 logo
    category_ids: List[int] = []


class BrandUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=255)
    description: Optional[str] = None
    website: Optional[str] = None
    sort_order: Optional[int] = None
    is_active: Optional[bool] = None
    is_featured: Optional[bool] = None
    logo_data: Optional[str] = None
    category_ids: Optional[List[int]] = None


class BrandResponse(BaseModel):
    id: int
    uuid: str
    name: str
    slug: str
    description: Optional[str] = None
    logo_data: Optional[str] = None
    website: Optional[str] = None
    sort_order: int
    is_active: bool
    is_featured: bool
    product_count: int = 0
    category_ids: List[int] = []
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

