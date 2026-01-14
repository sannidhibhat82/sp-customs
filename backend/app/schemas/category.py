from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime


class CategoryBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)
    description: Optional[str] = None
    parent_id: Optional[int] = None
    sort_order: int = 0
    is_active: bool = True
    is_featured: bool = False


class CategoryCreate(CategoryBase):
    image_data: Optional[str] = None  # Base64 image
    background_color: Optional[str] = None  # Hex color for background when no image


class CategoryUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=255)
    description: Optional[str] = None
    parent_id: Optional[int] = None
    sort_order: Optional[int] = None
    is_active: Optional[bool] = None
    is_featured: Optional[bool] = None
    image_data: Optional[str] = None
    background_color: Optional[str] = None


class CategoryResponse(BaseModel):
    id: int
    uuid: str
    name: str
    slug: str
    description: Optional[str] = None
    image_data: Optional[str] = None
    background_color: Optional[str] = None
    parent_id: Optional[int] = None
    level: int
    path: Optional[str] = None
    sort_order: int
    is_active: bool
    is_featured: bool
    product_count: int = 0
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class CategoryTree(CategoryResponse):
    """Category with nested children for tree view."""
    children: List["CategoryTree"] = []
    
    class Config:
        from_attributes = True


# Enable recursive model
CategoryTree.model_rebuild()

