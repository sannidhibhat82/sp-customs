"""
Cart and checkout schemas for Book Now flow.
"""
from typing import Optional, List, Any, Dict
from datetime import datetime
from decimal import Decimal
from pydantic import BaseModel, Field


class PriceSnapshot(BaseModel):
    unit_price: str
    currency: str = "INR"


class CartItemCreate(BaseModel):
    product_id: int
    variant_id: Optional[int] = None
    quantity: int = Field(ge=1, le=999)


class CartItemUpdate(BaseModel):
    quantity: int = Field(ge=1, le=999)


class CartItemResponse(BaseModel):
    id: int
    uuid: str
    cart_id: int
    product_id: int
    variant_id: Optional[int] = None
    quantity: int
    price_snapshot: Dict[str, Any]
    created_at: datetime
    # Populated from product/variant
    product_name: Optional[str] = None
    product_sku: Optional[str] = None
    product_slug: Optional[str] = None
    variant_name: Optional[str] = None
    unit_price: Optional[Decimal] = None
    image_data: Optional[str] = None

    class Config:
        from_attributes = True


class CartResponse(BaseModel):
    id: int
    uuid: str
    user_id: Optional[int] = None
    guest_session_id: Optional[str] = None
    status: str
    items: List[CartItemResponse] = []
    item_count: int = 0
    subtotal: Optional[Decimal] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


# ---------- Checkout ----------


class OrderAddressCreate(BaseModel):
    name: str
    phone: str
    address: str
    city: str
    state: str
    pincode: str
    country: str = "India"


class CheckoutValidateResponse(BaseModel):
    valid: bool
    cart_id: int
    item_count: int
    subtotal: Decimal
    shipping_options: Optional[List[Dict[str, Any]]] = None
    errors: List[str] = []
    customer_discount_percent: Optional[float] = None  # Show "Login to get X% off"


class CheckoutCreateRequest(BaseModel):
    cart_id: int
    address: OrderAddressCreate
    guest_session_id: Optional[str] = None


class CheckoutCreateResponse(BaseModel):
    order_id: int
    order_number: str
    order_uuid: str
    total: Decimal
    payment_status: str
    payment_intent_id: Optional[str] = None
    client_secret: Optional[str] = None
    redirect_url: Optional[str] = None
