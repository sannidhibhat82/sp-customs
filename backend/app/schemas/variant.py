"""
Schemas for product variants.
"""
from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from datetime import datetime
from decimal import Decimal


# Variant Image Schemas
class VariantImageCreate(BaseModel):
    filename: str
    content_type: str = "image/jpeg"
    image_data: str  # Base64 encoded
    alt_text: Optional[str] = None
    is_primary: bool = False
    sort_order: int = 0


class VariantImageResponse(BaseModel):
    id: int
    uuid: str
    filename: str
    content_type: str
    image_data: str
    thumbnail_data: Optional[str] = None
    storage_type: str
    storage_url: Optional[str] = None
    width: Optional[int] = None
    height: Optional[int] = None
    file_size: Optional[int] = None
    alt_text: Optional[str] = None
    is_primary: bool
    sort_order: int
    created_at: datetime

    class Config:
        from_attributes = True


# Variant Inventory Schemas
class VariantInventoryInfo(BaseModel):
    quantity: int = 0
    reserved_quantity: int = 0
    available_quantity: int = 0
    is_in_stock: bool = False
    is_low_stock: bool = False
    low_stock_threshold: int = 5

    class Config:
        from_attributes = True


# Variant Schemas
class VariantCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)
    sku: Optional[str] = None
    barcode: Optional[str] = None
    options: Dict[str, str] = {}  # e.g., {"color": "Red", "size": "Large"}
    price: Optional[Decimal] = None
    cost_price: Optional[Decimal] = None
    compare_at_price: Optional[Decimal] = None
    is_active: bool = True
    is_default: bool = False
    sort_order: int = 0
    initial_quantity: int = 0


class VariantUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=255)
    sku: Optional[str] = None
    barcode: Optional[str] = None
    options: Optional[Dict[str, str]] = None
    price: Optional[Decimal] = None
    cost_price: Optional[Decimal] = None
    compare_at_price: Optional[Decimal] = None
    is_active: Optional[bool] = None
    is_default: Optional[bool] = None
    sort_order: Optional[int] = None


class VariantResponse(BaseModel):
    id: int
    uuid: str
    product_id: int
    name: str
    sku: Optional[str] = None
    barcode: Optional[str] = None
    options: Dict[str, str] = {}
    price: Optional[Decimal] = None
    cost_price: Optional[Decimal] = None
    compare_at_price: Optional[Decimal] = None
    is_active: bool
    is_default: bool
    sort_order: int
    images: List[VariantImageResponse] = []
    inventory: Optional[VariantInventoryInfo] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class VariantListResponse(BaseModel):
    """Lighter variant response for list views."""
    id: int
    uuid: str
    name: str
    sku: Optional[str] = None
    barcode: Optional[str] = None
    options: Dict[str, str] = {}
    price: Optional[Decimal] = None
    compare_at_price: Optional[Decimal] = None
    primary_image: Optional[str] = None
    images: List[VariantImageResponse] = []  # All variant images
    inventory_quantity: int = 0
    is_in_stock: bool = False
    is_active: bool
    is_default: bool

    class Config:
        from_attributes = True


# Variant Option Schemas (Templates)
class VariantOptionCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    values: List[str] = []
    display_type: str = "dropdown"  # dropdown, color_swatch, button
    sort_order: int = 0


class VariantOptionUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=100)
    values: Optional[List[str]] = None
    display_type: Optional[str] = None
    sort_order: Optional[int] = None


class VariantOptionResponse(BaseModel):
    id: int
    uuid: str
    name: str
    slug: str
    values: List[str] = []
    display_type: str
    sort_order: int
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
