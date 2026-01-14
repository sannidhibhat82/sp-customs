from sqlalchemy import Column, Integer, String, Boolean, DateTime, Text, Table, ForeignKey
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base
import uuid


# Association table for brand-category relationship
brand_categories = Table(
    "brand_categories",
    Base.metadata,
    Column("brand_id", Integer, ForeignKey("brands.id", ondelete="CASCADE"), primary_key=True),
    Column("category_id", Integer, ForeignKey("categories.id", ondelete="CASCADE"), primary_key=True),
)


class Brand(Base):
    """
    Brand model with optional category linkage.
    Brands can be associated with specific categories or be global.
    """
    __tablename__ = "brands"
    
    id = Column(Integer, primary_key=True, index=True)
    uuid = Column(String(36), unique=True, default=lambda: str(uuid.uuid4()), index=True)
    
    name = Column(String(255), nullable=False, unique=True)
    slug = Column(String(255), unique=True, nullable=False, index=True)
    description = Column(Text, nullable=True)
    logo_data = Column(Text, nullable=True)  # Base64 encoded logo
    website = Column(String(500), nullable=True)
    
    # Display
    sort_order = Column(Integer, default=0)
    is_active = Column(Boolean, default=True)
    is_featured = Column(Boolean, default=False)
    
    # Metadata
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    
    # Relationships
    categories = relationship("Category", secondary=brand_categories, backref="brands")
    products = relationship("Product", back_populates="brand")
    
    def __repr__(self):
        return f"<Brand {self.name}>"

