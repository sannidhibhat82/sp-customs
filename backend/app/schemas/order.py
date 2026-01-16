"""
Order schemas for API validation.
"""
from typing import Optional, List, Any, Dict
from datetime import datetime
from decimal import Decimal
from pydantic import BaseModel, Field


# Shipping Info Schema
class ShippingInfo(BaseModel):
    customer_name: str
    email: Optional[str] = None
    phone: str
    address_line1: str
    address_line2: Optional[str] = None
    city: str
    state: str
    postal_code: str
    country: str = "India"
    landmark: Optional[str] = None
    delivery_instructions: Optional[str] = None


# Shipping Details Schema
class ShippingDetails(BaseModel):
    carrier: Optional[str] = None
    tracking_number: Optional[str] = None
    shipping_method: Optional[str] = None
    estimated_delivery: Optional[str] = None
    weight: Optional[str] = None
    dimensions: Optional[Dict[str, Any]] = None


# Payment Info Schema
class PaymentInfo(BaseModel):
    method: Optional[str] = None  # cash, upi, card, etc.
    transaction_id: Optional[str] = None
    status: str = "pending"  # pending, paid, refunded
    amount_paid: Optional[Decimal] = None


# Invoice Data Schema
class InvoiceData(BaseModel):
    invoice_number: Optional[str] = None
    invoice_date: Optional[str] = None
    due_date: Optional[str] = None
    terms: Optional[str] = None
    notes: Optional[str] = None
    company_details: Optional[Dict[str, Any]] = None


# Order Item Schemas
class OrderItemCreate(BaseModel):
    product_id: Optional[int] = None
    variant_id: Optional[int] = None
    product_name: str
    product_sku: str
    product_barcode: Optional[str] = None
    variant_name: Optional[str] = None
    variant_options: Dict[str, Any] = Field(default_factory=dict)
    unit_price: Decimal = Decimal(0)
    quantity: int = 1
    discount: Decimal = Decimal(0)
    product_image: Optional[str] = None
    extra_data: Dict[str, Any] = Field(default_factory=dict)


class OrderItemResponse(BaseModel):
    id: int
    uuid: str
    order_id: int
    product_id: Optional[int] = None
    variant_id: Optional[int] = None
    product_name: str
    product_sku: str
    product_barcode: Optional[str] = None
    variant_name: Optional[str] = None
    variant_options: Dict[str, Any] = Field(default_factory=dict)
    unit_price: Decimal
    quantity: int
    discount: Decimal
    total: Decimal
    product_image: Optional[str] = None
    extra_data: Dict[str, Any] = Field(default_factory=dict)
    created_at: datetime

    class Config:
        from_attributes = True


# Order Schemas
class OrderCreate(BaseModel):
    items: List[OrderItemCreate]
    shipping_info: Dict[str, Any] = Field(default_factory=dict)
    billing_info: Dict[str, Any] = Field(default_factory=dict)
    shipping_details: Dict[str, Any] = Field(default_factory=dict)
    payment_info: Dict[str, Any] = Field(default_factory=dict)
    invoice_data: Dict[str, Any] = Field(default_factory=dict)
    extra_data: Dict[str, Any] = Field(default_factory=dict)
    discount_amount: Decimal = Decimal(0)
    shipping_cost: Decimal = Decimal(0)
    tax_amount: Decimal = Decimal(0)
    internal_notes: Optional[str] = None
    customer_notes: Optional[str] = None


class OrderUpdate(BaseModel):
    status: Optional[str] = None
    shipping_info: Optional[Dict[str, Any]] = None
    billing_info: Optional[Dict[str, Any]] = None
    shipping_details: Optional[Dict[str, Any]] = None
    payment_info: Optional[Dict[str, Any]] = None
    invoice_data: Optional[Dict[str, Any]] = None
    extra_data: Optional[Dict[str, Any]] = None
    discount_amount: Optional[Decimal] = None
    shipping_cost: Optional[Decimal] = None
    tax_amount: Optional[Decimal] = None
    internal_notes: Optional[str] = None
    customer_notes: Optional[str] = None


class OrderResponse(BaseModel):
    id: int
    uuid: str
    order_number: str
    status: str
    subtotal: Decimal
    discount_amount: Decimal
    shipping_cost: Decimal
    tax_amount: Decimal
    total: Decimal
    shipping_info: Dict[str, Any]
    billing_info: Dict[str, Any]
    shipping_details: Dict[str, Any]
    payment_info: Dict[str, Any]
    invoice_data: Dict[str, Any]
    extra_data: Dict[str, Any]
    internal_notes: Optional[str] = None
    customer_notes: Optional[str] = None
    created_by_id: Optional[int] = None
    items: List[OrderItemResponse] = []
    created_at: datetime
    updated_at: datetime
    shipped_at: Optional[datetime] = None
    delivered_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class OrderListResponse(BaseModel):
    id: int
    uuid: str
    order_number: str
    status: str
    total: Decimal
    shipping_info: Dict[str, Any]
    item_count: int = 0
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


# For scanning products into order
class OrderScanRequest(BaseModel):
    barcode: Optional[str] = None
    product_id: Optional[int] = None
    variant_id: Optional[int] = None
    quantity: int = 1


class OrderScanResponse(BaseModel):
    success: bool
    product_id: int
    variant_id: Optional[int] = None
    product_name: str
    product_sku: str
    product_barcode: Optional[str] = None
    variant_name: Optional[str] = None
    variant_options: Dict[str, Any] = Field(default_factory=dict)
    unit_price: Decimal
    available_quantity: int
    product_image: Optional[str] = None


# Invoice generation
class InvoiceRequest(BaseModel):
    order_id: int
    include_logo: bool = True
    include_barcode: bool = True
