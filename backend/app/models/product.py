from sqlalchemy import Column, Integer, String, Boolean, ForeignKey, DateTime, Text, Numeric, LargeBinary
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base
import uuid


class Product(Base):
    """
    Product model with dynamic attributes stored as JSONB.
    Each product can have unlimited custom attributes.
    """
    __tablename__ = "products"
    
    id = Column(Integer, primary_key=True, index=True)
    uuid = Column(String(36), unique=True, default=lambda: str(uuid.uuid4()), index=True)
    
    # Basic info
    name = Column(String(500), nullable=False)
    slug = Column(String(500), unique=True, nullable=False, index=True)
    description = Column(Text, nullable=True)
    short_description = Column(String(1000), nullable=True)
    
    # SKU and identification
    sku = Column(String(100), unique=True, nullable=False, index=True)
    barcode = Column(String(100), unique=True, nullable=True, index=True)
    barcode_data = Column(Text, nullable=True)  # Base64 encoded barcode image
    qr_code_data = Column(Text, nullable=True)  # Base64 encoded QR code image
    
    # Pricing
    price = Column(Numeric(12, 2), nullable=True)
    cost_price = Column(Numeric(12, 2), nullable=True)
    compare_at_price = Column(Numeric(12, 2), nullable=True)
    
    # Dynamic attributes (unlimited key-value pairs)
    attributes = Column(JSONB, default=dict, nullable=False)
    
    # Specifications and features
    specifications = Column(JSONB, default=dict, nullable=False)
    features = Column(JSONB, default=list, nullable=False)
    
    # Relationships
    category_id = Column(Integer, ForeignKey("categories.id", ondelete="SET NULL"), nullable=True)
    brand_id = Column(Integer, ForeignKey("brands.id", ondelete="SET NULL"), nullable=True)
    
    # Status
    is_active = Column(Boolean, default=True)
    is_featured = Column(Boolean, default=False)
    is_new = Column(Boolean, default=True)
    visibility = Column(String(50), default="visible")  # visible, hidden, catalog_only
    # hidden = active but not shown to users on public pages (only visible in admin)
    # visible = shown everywhere
    # catalog_only = shown in catalog but not on homepage/featured sections
    
    # Tags for search (e.g., ["bmw", "shift", "racing"])
    tags = Column(JSONB, default=list, nullable=False)
    
    # SEO
    meta_title = Column(String(255), nullable=True)
    meta_description = Column(Text, nullable=True)
    
    # Sorting
    sort_order = Column(Integer, default=0)
    
    # Metadata
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    
    # Relationships
    category = relationship("Category", back_populates="products")
    brand = relationship("Brand", back_populates="products")
    images = relationship("ProductImage", back_populates="product", cascade="all, delete-orphan", order_by="ProductImage.sort_order")
    inventory = relationship("Inventory", back_populates="product", uselist=False, cascade="all, delete-orphan")
    variants = relationship("ProductVariant", back_populates="product", cascade="all, delete-orphan", order_by="ProductVariant.sort_order")
    
    @property
    def has_variants(self):
        return len(self.variants) > 0 if self.variants else False
    
    @property
    def primary_image(self):
        """Returns the first image's data (sorted by sort_order)"""
        if self.images and len(self.images) > 0:
            return self.images[0].image_data
        return None
    
    def __repr__(self):
        return f"<Product {self.name}>"


class ProductImage(Base):
    """
    Product image stored directly in database.
    Abstracted for easy migration to S3/external storage.
    """
    __tablename__ = "product_images"
    
    id = Column(Integer, primary_key=True, index=True)
    uuid = Column(String(36), unique=True, default=lambda: str(uuid.uuid4()), index=True)
    
    product_id = Column(Integer, ForeignKey("products.id", ondelete="CASCADE"), nullable=False)
    
    # Image data
    filename = Column(String(255), nullable=False)
    content_type = Column(String(100), default="image/jpeg")
    image_data = Column(Text, nullable=False)  # Base64 encoded image
    thumbnail_data = Column(Text, nullable=True)  # Base64 encoded thumbnail
    
    # For future S3 migration
    storage_type = Column(String(50), default="database")  # database, s3
    storage_url = Column(String(1000), nullable=True)  # S3 URL when migrated
    
    # Image metadata
    width = Column(Integer, nullable=True)
    height = Column(Integer, nullable=True)
    file_size = Column(Integer, nullable=True)  # in bytes
    
    # Display
    alt_text = Column(String(255), nullable=True)
    is_primary = Column(Boolean, default=False)
    sort_order = Column(Integer, default=0)
    
    # Metadata
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relationships
    product = relationship("Product", back_populates="images")
    
    def __repr__(self):
        return f"<ProductImage {self.filename}>"


class ProductAttribute(Base):
    """
    Attribute definitions that can be used across products.
    These serve as templates/suggestions for product attributes.
    """
    __tablename__ = "product_attributes"
    
    id = Column(Integer, primary_key=True, index=True)
    uuid = Column(String(36), unique=True, default=lambda: str(uuid.uuid4()), index=True)
    
    name = Column(String(255), nullable=False, unique=True)
    slug = Column(String(255), unique=True, nullable=False, index=True)
    
    # Attribute type: text, number, boolean, select, multi-select
    attribute_type = Column(String(50), default="text")
    
    # For select/multi-select types
    options = Column(JSONB, default=list, nullable=False)  # ["Option1", "Option2"]
    
    # Validation
    is_required = Column(Boolean, default=False)
    is_filterable = Column(Boolean, default=True)  # Can be used in catalog filters
    is_visible = Column(Boolean, default=True)  # Show on product page
    
    # Display
    sort_order = Column(Integer, default=0)
    unit = Column(String(50), nullable=True)  # e.g., "mm", "kg", "W"
    
    # Metadata
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    
    def __repr__(self):
        return f"<ProductAttribute {self.name}>"

