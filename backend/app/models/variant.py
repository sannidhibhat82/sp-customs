"""
Product Variant model for handling product variations like color, size, etc.
Each variant can have its own images, price, and inventory.
"""
from sqlalchemy import Column, Integer, String, Boolean, ForeignKey, DateTime, Text, Numeric
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base
import uuid as uuid_lib


class ProductVariant(Base):
    """
    Product variant for handling variations like color, size, etc.
    Each variant can have its own images, price, SKU, and inventory.
    """
    __tablename__ = "product_variants"
    
    id = Column(Integer, primary_key=True, index=True)
    uuid = Column(String(36), unique=True, default=lambda: str(uuid_lib.uuid4()), index=True)
    
    product_id = Column(Integer, ForeignKey("products.id", ondelete="CASCADE"), nullable=False)
    
    # Variant identification
    name = Column(String(255), nullable=False)  # e.g., "Red / Large"
    sku = Column(String(100), unique=True, nullable=True, index=True)
    barcode = Column(String(100), unique=True, nullable=True, index=True)
    
    # Variant options (e.g., {"color": "Red", "size": "Large"})
    options = Column(JSONB, default=dict, nullable=False)
    
    # Pricing (if different from parent product)
    price = Column(Numeric(12, 2), nullable=True)
    cost_price = Column(Numeric(12, 2), nullable=True)
    compare_at_price = Column(Numeric(12, 2), nullable=True)
    
    # Status
    is_active = Column(Boolean, default=True)
    is_default = Column(Boolean, default=False)  # Default variant to show
    
    # Sorting
    sort_order = Column(Integer, default=0)
    
    # Metadata
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    
    # Relationships
    product = relationship("Product", back_populates="variants")
    images = relationship("VariantImage", back_populates="variant", cascade="all, delete-orphan", order_by="VariantImage.sort_order")
    inventory = relationship("VariantInventory", back_populates="variant", uselist=False, cascade="all, delete-orphan")
    
    def __repr__(self):
        return f"<ProductVariant {self.name}>"


class VariantImage(Base):
    """
    Images specific to a product variant.
    """
    __tablename__ = "variant_images"
    
    id = Column(Integer, primary_key=True, index=True)
    uuid = Column(String(36), unique=True, default=lambda: str(uuid_lib.uuid4()), index=True)
    
    variant_id = Column(Integer, ForeignKey("product_variants.id", ondelete="CASCADE"), nullable=False)
    
    # Image data
    filename = Column(String(255), nullable=False)
    content_type = Column(String(100), default="image/jpeg")
    image_data = Column(Text, nullable=False)  # Base64 encoded image
    thumbnail_data = Column(Text, nullable=True)  # Base64 encoded thumbnail
    
    # For future S3 migration
    storage_type = Column(String(50), default="database")
    storage_url = Column(String(1000), nullable=True)
    
    # Image metadata
    width = Column(Integer, nullable=True)
    height = Column(Integer, nullable=True)
    file_size = Column(Integer, nullable=True)
    
    # Display
    alt_text = Column(String(255), nullable=True)
    is_primary = Column(Boolean, default=False)
    sort_order = Column(Integer, default=0)
    
    # Metadata
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relationships
    variant = relationship("ProductVariant", back_populates="images")
    
    def __repr__(self):
        return f"<VariantImage {self.filename}>"


class VariantInventory(Base):
    """
    Inventory tracking for product variants.
    """
    __tablename__ = "variant_inventory"
    
    id = Column(Integer, primary_key=True, index=True)
    uuid = Column(String(36), unique=True, default=lambda: str(uuid_lib.uuid4()), index=True)
    
    variant_id = Column(Integer, ForeignKey("product_variants.id", ondelete="CASCADE"), nullable=False, unique=True)
    
    # Stock levels
    quantity = Column(Integer, default=0)
    reserved_quantity = Column(Integer, default=0)  # Reserved for pending orders
    
    # Thresholds
    low_stock_threshold = Column(Integer, default=5)
    
    # Metadata
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    
    # Relationships
    variant = relationship("ProductVariant", back_populates="inventory")
    
    @property
    def available_quantity(self):
        return max(0, self.quantity - self.reserved_quantity)
    
    @property
    def is_in_stock(self):
        return self.available_quantity > 0
    
    @property
    def is_low_stock(self):
        return self.available_quantity <= self.low_stock_threshold
    
    def __repr__(self):
        return f"<VariantInventory variant_id={self.variant_id} qty={self.quantity}>"


class VariantInventoryLog(Base):
    """
    Audit log for all variant inventory changes.
    Tracks scans, adjustments, and all movements for variants.
    """
    __tablename__ = "variant_inventory_logs"
    
    id = Column(Integer, primary_key=True, index=True)
    uuid = Column(String(36), unique=True, default=lambda: str(uuid_lib.uuid4()), index=True)
    
    variant_inventory_id = Column(Integer, ForeignKey("variant_inventory.id", ondelete="CASCADE"), nullable=False)
    
    # Change details
    action = Column(String(50), nullable=False)  # scan_in, scan_out, adjustment, initial
    quantity_change = Column(Integer, nullable=False)  # Positive or negative
    quantity_before = Column(Integer, nullable=False)
    quantity_after = Column(Integer, nullable=False)
    
    # Context
    reason = Column(Text, nullable=True)
    reference = Column(String(255), nullable=True)  # Order ID, scan session ID, etc.
    
    # Device info
    device_type = Column(String(50), nullable=True)  # mobile, desktop
    device_info = Column(String(500), nullable=True)
    
    # User who made the change
    user_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    
    # Metadata
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relationships
    variant_inventory = relationship("VariantInventory", backref="logs")
    user = relationship("User", foreign_keys=[user_id])
    
    def __repr__(self):
        return f"<VariantInventoryLog id={self.id} action={self.action} change={self.quantity_change}>"


class VariantOption(Base):
    """
    Defines available variant options for products (e.g., Color, Size).
    These are templates that can be used across products.
    """
    __tablename__ = "variant_options"
    
    id = Column(Integer, primary_key=True, index=True)
    uuid = Column(String(36), unique=True, default=lambda: str(uuid_lib.uuid4()), index=True)
    
    name = Column(String(100), nullable=False, unique=True)  # e.g., "Color", "Size"
    slug = Column(String(100), unique=True, nullable=False, index=True)
    
    # Predefined values for this option
    values = Column(JSONB, default=list, nullable=False)  # ["Red", "Blue", "Green"]
    
    # Display settings
    display_type = Column(String(50), default="dropdown")  # dropdown, color_swatch, button
    sort_order = Column(Integer, default=0)
    
    # Metadata
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    
    def __repr__(self):
        return f"<VariantOption {self.name}>"
