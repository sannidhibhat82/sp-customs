"""
Order model for shipping and order management.
Uses JSONB for flexible data storage to avoid migrations.
"""
from sqlalchemy import Column, Integer, String, Boolean, ForeignKey, DateTime, Text, Numeric
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base
import uuid


class Order(Base):
    """
    Order model with JSONB for flexible shipping/customer data.
    This allows adding new fields without database migrations.
    """
    __tablename__ = "orders"
    
    id = Column(Integer, primary_key=True, index=True)
    uuid = Column(String(36), unique=True, default=lambda: str(uuid.uuid4()), index=True)
    
    # Order number (human-readable)
    order_number = Column(String(50), unique=True, nullable=False, index=True)
    
    # Order status: pending, processing, packed, shipped, delivered, cancelled
    status = Column(String(50), default="pending", index=True)
    
    # Pricing (calculated totals)
    subtotal = Column(Numeric(12, 2), default=0)
    discount_amount = Column(Numeric(12, 2), default=0)
    shipping_cost = Column(Numeric(12, 2), default=0)
    tax_amount = Column(Numeric(12, 2), default=0)
    total = Column(Numeric(12, 2), default=0)
    
    # Flexible shipping data stored as JSONB
    # Structure: {
    #   "customer_name": "...",
    #   "email": "...",
    #   "phone": "...",
    #   "address_line1": "...",
    #   "address_line2": "...",
    #   "city": "...",
    #   "state": "...",
    #   "postal_code": "...",
    #   "country": "...",
    #   "landmark": "...",
    #   "delivery_instructions": "..."
    # }
    shipping_info = Column(JSONB, default=dict, nullable=False)
    
    # Flexible billing data (if different from shipping)
    billing_info = Column(JSONB, default=dict, nullable=False)
    
    # Shipping details
    # Structure: {
    #   "carrier": "...",
    #   "tracking_number": "...",
    #   "shipping_method": "...",
    #   "estimated_delivery": "...",
    #   "weight": "...",
    #   "dimensions": {...}
    # }
    shipping_details = Column(JSONB, default=dict, nullable=False)
    
    # Payment info (flexible)
    # Structure: {
    #   "method": "...",
    #   "transaction_id": "...",
    #   "status": "...",
    #   "amount_paid": "..."
    # }
    payment_info = Column(JSONB, default=dict, nullable=False)
    
    # Invoice data (for printing)
    # Structure: {
    #   "invoice_number": "...",
    #   "invoice_date": "...",
    #   "due_date": "...",
    #   "terms": "...",
    #   "notes": "...",
    #   "company_details": {...}
    # }
    invoice_data = Column(JSONB, default=dict, nullable=False)
    
    # Additional flexible metadata
    # Can store anything extra: custom fields, tags, etc.
    extra_data = Column(JSONB, default=dict, nullable=False)
    
    # Notes
    internal_notes = Column(Text, nullable=True)
    customer_notes = Column(Text, nullable=True)
    
    # User who created the order
    created_by_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    shipped_at = Column(DateTime(timezone=True), nullable=True)
    delivered_at = Column(DateTime(timezone=True), nullable=True)
    
    # Relationships
    items = relationship("OrderItem", back_populates="order", cascade="all, delete-orphan")
    created_by = relationship("User", backref="orders")
    
    def __repr__(self):
        return f"<Order {self.order_number}>"


class OrderItem(Base):
    """
    Order line items (products in the order).
    """
    __tablename__ = "order_items"
    
    id = Column(Integer, primary_key=True, index=True)
    uuid = Column(String(36), unique=True, default=lambda: str(uuid.uuid4()), index=True)
    
    order_id = Column(Integer, ForeignKey("orders.id", ondelete="CASCADE"), nullable=False)
    product_id = Column(Integer, ForeignKey("products.id", ondelete="SET NULL"), nullable=True)
    variant_id = Column(Integer, ForeignKey("product_variants.id", ondelete="SET NULL"), nullable=True)
    
    # Product snapshot (in case product is deleted/changed)
    product_name = Column(String(500), nullable=False)
    product_sku = Column(String(100), nullable=False)
    product_barcode = Column(String(100), nullable=True)
    
    # Variant info (if applicable)
    variant_name = Column(String(255), nullable=True)
    variant_options = Column(JSONB, default=dict, nullable=False)
    
    # Pricing at time of order
    unit_price = Column(Numeric(12, 2), nullable=False, default=0)
    quantity = Column(Integer, nullable=False, default=1)
    discount = Column(Numeric(12, 2), default=0)
    total = Column(Numeric(12, 2), nullable=False, default=0)
    
    # Product image (base64 snapshot)
    product_image = Column(Text, nullable=True)
    
    # Additional item metadata (for flexible data)
    extra_data = Column(JSONB, default=dict, nullable=False)
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relationships
    order = relationship("Order", back_populates="items")
    product = relationship("Product")
    variant = relationship("ProductVariant")
    
    def __repr__(self):
        return f"<OrderItem {self.product_sku} x{self.quantity}>"


class DirectOrder(Base):
    """
    Direct Orders - Orders shipped directly by brands.
    These orders do NOT affect inventory.
    Used for manual tracking of brand-fulfilled orders.
    """
    __tablename__ = "direct_orders"
    
    id = Column(Integer, primary_key=True, index=True)
    uuid = Column(String(36), unique=True, default=lambda: str(uuid.uuid4()), index=True)
    
    # Order number (human-readable)
    order_number = Column(String(50), unique=True, nullable=False, index=True)
    
    # Status: pending, processing, shipped, delivered, cancelled
    status = Column(String(50), default="pending", index=True)
    
    # Customer info (flexible JSONB)
    customer_info = Column(JSONB, default=dict, nullable=False)
    # Structure: {
    #   "customer_name": "...",
    #   "email": "...",
    #   "phone": "...",
    #   "address": "...",
    # }
    
    # Brand info
    brand_name = Column(String(255), nullable=True)
    brand_id = Column(Integer, ForeignKey("brands.id", ondelete="SET NULL"), nullable=True)
    
    # Tracking info
    tracking_number = Column(String(255), nullable=True)
    carrier = Column(String(100), nullable=True)
    
    # Notes
    notes = Column(Text, nullable=True)
    
    # Additional metadata
    extra_data = Column(JSONB, default=dict, nullable=False)
    
    # User who created the order
    created_by_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    
    # Timestamps
    order_date = Column(DateTime(timezone=True), server_default=func.now())  # When order was placed
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    shipped_at = Column(DateTime(timezone=True), nullable=True)
    delivered_at = Column(DateTime(timezone=True), nullable=True)
    
    # Relationships
    items = relationship("DirectOrderItem", back_populates="order", cascade="all, delete-orphan")
    brand = relationship("Brand")
    created_by = relationship("User")
    
    def __repr__(self):
        return f"<DirectOrder {self.order_number}>"


class DirectOrderItem(Base):
    """
    Line items for Direct Orders.
    Does NOT affect inventory.
    """
    __tablename__ = "direct_order_items"
    
    id = Column(Integer, primary_key=True, index=True)
    uuid = Column(String(36), unique=True, default=lambda: str(uuid.uuid4()), index=True)
    
    order_id = Column(Integer, ForeignKey("direct_orders.id", ondelete="CASCADE"), nullable=False)
    product_id = Column(Integer, ForeignKey("products.id", ondelete="SET NULL"), nullable=True)
    variant_id = Column(Integer, ForeignKey("product_variants.id", ondelete="SET NULL"), nullable=True)
    
    # Product info (snapshot)
    product_name = Column(String(500), nullable=False)
    product_sku = Column(String(100), nullable=True)
    
    # Variant info (if applicable)
    variant_name = Column(String(255), nullable=True)
    variant_options = Column(JSONB, default=dict, nullable=False)
    
    # Quantity
    quantity = Column(Integer, nullable=False, default=1)
    
    # Optional pricing (for reference)
    unit_price = Column(Numeric(12, 2), nullable=True)
    
    # Additional item metadata
    extra_data = Column(JSONB, default=dict, nullable=False)
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relationships
    order = relationship("DirectOrder", back_populates="items")
    product = relationship("Product")
    variant = relationship("ProductVariant")
    
    def __repr__(self):
        return f"<DirectOrderItem {self.product_name} x{self.quantity}>"
