from sqlalchemy import Column, Integer, String, Boolean, ForeignKey, DateTime, Text
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base
import uuid


class Category(Base):
    """
    Hierarchical category model with unlimited nesting.
    Each category can have a parent (for sub-categories) or be a root category.
    """
    __tablename__ = "categories"
    
    id = Column(Integer, primary_key=True, index=True)
    uuid = Column(String(36), unique=True, default=lambda: str(uuid.uuid4()), index=True)
    
    name = Column(String(255), nullable=False)
    slug = Column(String(255), unique=True, nullable=False, index=True)
    description = Column(Text, nullable=True)
    image_data = Column(Text, nullable=True)  # Base64 encoded image
    background_color = Column(String(50), nullable=True)  # Hex color for background when no image
    
    # Hierarchical structure
    parent_id = Column(Integer, ForeignKey("categories.id", ondelete="SET NULL"), nullable=True)
    level = Column(Integer, default=0)  # Depth level for quick queries
    path = Column(String(500), nullable=True)  # Materialized path for efficient queries (e.g., "1/5/12")
    
    # Display and ordering
    sort_order = Column(Integer, default=0)
    is_active = Column(Boolean, default=True)
    is_featured = Column(Boolean, default=False)
    
    # Metadata
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    
    # Relationships
    parent = relationship("Category", remote_side=[id], backref="children")
    products = relationship("Product", back_populates="category")
    
    def __repr__(self):
        return f"<Category {self.name}>"

