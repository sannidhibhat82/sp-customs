from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from datetime import datetime
from decimal import Decimal


class ProductImageCreate(BaseModel):
    filename: str
    content_type: str = "image/jpeg"
    image_data: str  # Base64 encoded
    alt_text: Optional[str] = None
    is_primary: bool = False
    sort_order: int = 0


class ProductImageResponse(BaseModel):
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


class ProductBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=500)
    description: Optional[str] = None
    short_description: Optional[str] = None
    price: Optional[Decimal] = None
    cost_price: Optional[Decimal] = None
    compare_at_price: Optional[Decimal] = None
    category_id: Optional[int] = None
    brand_id: Optional[int] = None
    attributes: Dict[str, Any] = {}
    specifications: Dict[str, Any] = {}
    features: List[str] = []
    tags: List[str] = []  # Tags for search (e.g., ["bmw", "shift", "racing"])
    is_active: bool = True
    is_featured: bool = False
    is_new: bool = True
    visibility: str = "visible"  # visible, hidden, catalog_only
    meta_title: Optional[str] = None
    meta_description: Optional[str] = None
    sort_order: int = 0


class ProductCreate(ProductBase):
    initial_quantity: int = 0
    custom_sku: Optional[str] = Field(None, max_length=100, description="Optional custom SKU. If provided, barcode will be generated from this.")


class ProductUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=500)
    description: Optional[str] = None
    short_description: Optional[str] = None
    price: Optional[Decimal] = None
    cost_price: Optional[Decimal] = None
    compare_at_price: Optional[Decimal] = None
    category_id: Optional[int] = None
    brand_id: Optional[int] = None
    attributes: Optional[Dict[str, Any]] = None
    specifications: Optional[Dict[str, Any]] = None
    features: Optional[List[str]] = None
    tags: Optional[List[str]] = None  # Tags for search
    is_active: Optional[bool] = None
    is_featured: Optional[bool] = None
    is_new: Optional[bool] = None
    visibility: Optional[str] = None  # visible, hidden, catalog_only
    meta_title: Optional[str] = None
    meta_description: Optional[str] = None
    sort_order: Optional[int] = None


class InventoryInfo(BaseModel):
    quantity: int = 0
    reserved_quantity: int = 0
    available_quantity: int = 0
    is_in_stock: bool = False
    is_low_stock: bool = False
    low_stock_threshold: int = 5

    class Config:
        from_attributes = True


class CategoryInfo(BaseModel):
    id: int
    uuid: str
    name: str
    slug: str

    class Config:
        from_attributes = True


class BrandInfo(BaseModel):
    id: int
    uuid: str
    name: str
    slug: str
    logo_data: Optional[str] = None

    class Config:
        from_attributes = True


class ProductResponse(BaseModel):
    id: int
    uuid: str
    name: str
    slug: str
    description: Optional[str] = None
    short_description: Optional[str] = None
    sku: str
    barcode: Optional[str] = None
    barcode_data: Optional[str] = None
    qr_code_data: Optional[str] = None
    price: Optional[Decimal] = None
    cost_price: Optional[Decimal] = None
    compare_at_price: Optional[Decimal] = None
    attributes: Dict[str, Any] = {}
    specifications: Dict[str, Any] = {}
    features: List[str] = []
    tags: List[str] = []  # Tags for search
    category_id: Optional[int] = None
    brand_id: Optional[int] = None
    category: Optional[CategoryInfo] = None
    brand: Optional[BrandInfo] = None
    images: List[ProductImageResponse] = []
    inventory: Optional[InventoryInfo] = None
    is_active: bool
    is_featured: bool
    is_new: bool
    visibility: str
    meta_title: Optional[str] = None
    meta_description: Optional[str] = None
    sort_order: int
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class ProductListResponse(BaseModel):
    """Lighter product response for list views."""
    id: int
    uuid: str
    name: str
    slug: str
    short_description: Optional[str] = None
    sku: str
    price: Optional[Decimal] = None
    compare_at_price: Optional[Decimal] = None
    category: Optional[CategoryInfo] = None
    brand: Optional[BrandInfo] = None
    primary_image: Optional[str] = None  # Just the primary image data
    inventory_quantity: int = 0
    is_in_stock: bool = False
    is_active: bool
    is_featured: bool
    is_new: bool
    visibility: str = "visible"  # Include visibility for admin use
    tags: List[str] = []  # Tags for search
    created_at: datetime

    class Config:
        from_attributes = True


class ProductAttributeCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)
    attribute_type: str = "text"
    options: List[str] = []
    is_required: bool = False
    is_filterable: bool = True
    is_visible: bool = True
    sort_order: int = 0
    unit: Optional[str] = None


class ProductAttributeUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=255)
    attribute_type: Optional[str] = None
    options: Optional[List[str]] = None
    is_required: Optional[bool] = None
    is_filterable: Optional[bool] = None
    is_visible: Optional[bool] = None
    sort_order: Optional[int] = None
    unit: Optional[str] = None


class ProductAttributeResponse(BaseModel):
    id: int
    uuid: str
    name: str
    slug: str
    attribute_type: str
    options: List[str] = []
    is_required: bool
    is_filterable: bool
    is_visible: bool
    sort_order: int
    unit: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

