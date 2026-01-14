from sqlalchemy import Column, Integer, String, Boolean, ForeignKey, DateTime, Text
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base
import uuid


class Inventory(Base):
    """
    Inventory model tied to products.
    Inventory is the source of truth for stock levels.
    """
    __tablename__ = "inventory"
    
    id = Column(Integer, primary_key=True, index=True)
    uuid = Column(String(36), unique=True, default=lambda: str(uuid.uuid4()), index=True)
    
    product_id = Column(Integer, ForeignKey("products.id", ondelete="CASCADE"), unique=True, nullable=False)
    
    # Stock levels
    quantity = Column(Integer, default=0, nullable=False)
    reserved_quantity = Column(Integer, default=0)  # For future order reservations
    
    # Stock thresholds
    low_stock_threshold = Column(Integer, default=5)
    reorder_point = Column(Integer, default=10)
    
    # Location (for future multi-location support)
    location = Column(String(255), default="main")
    
    # Status
    track_inventory = Column(Boolean, default=True)
    allow_backorder = Column(Boolean, default=False)
    
    # Metadata
    last_scanned_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    
    # Relationships
    product = relationship("Product", back_populates="inventory")
    logs = relationship("InventoryLog", back_populates="inventory", cascade="all, delete-orphan")
    
    @property
    def available_quantity(self):
        """Available quantity (total - reserved)."""
        return self.quantity - self.reserved_quantity
    
    @property
    def is_in_stock(self):
        """Check if product is in stock."""
        return self.available_quantity > 0
    
    @property
    def is_low_stock(self):
        """Check if stock is below threshold."""
        return self.available_quantity <= self.low_stock_threshold
    
    def __repr__(self):
        return f"<Inventory product_id={self.product_id} qty={self.quantity}>"


class InventoryLog(Base):
    """
    Audit log for all inventory changes.
    Tracks scans, adjustments, and all movements.
    """
    __tablename__ = "inventory_logs"
    
    id = Column(Integer, primary_key=True, index=True)
    uuid = Column(String(36), unique=True, default=lambda: str(uuid.uuid4()), index=True)
    
    inventory_id = Column(Integer, ForeignKey("inventory.id", ondelete="CASCADE"), nullable=False)
    
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
    inventory = relationship("Inventory", back_populates="logs")
    user = relationship("User", backref="inventory_logs")
    
    def __repr__(self):
        return f"<InventoryLog {self.action} {self.quantity_change:+d}>"

