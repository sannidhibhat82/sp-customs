from sqlalchemy import Column, Integer, String, DateTime, Text
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.sql import func
from app.database import Base
import uuid


class Event(Base):
    """
    Event log for real-time sync and audit trail.
    All changes are logged here for WebSocket broadcasting.
    """
    __tablename__ = "events"
    
    id = Column(Integer, primary_key=True, index=True)
    uuid = Column(String(36), unique=True, default=lambda: str(uuid.uuid4()), index=True)
    
    # Event type
    event_type = Column(String(100), nullable=False, index=True)
    # product_created, product_updated, product_deleted
    # category_created, category_updated, category_deleted
    # brand_created, brand_updated, brand_deleted
    # image_uploaded, image_deleted
    # inventory_scanned, inventory_updated
    
    # Entity reference
    entity_type = Column(String(50), nullable=False)  # product, category, brand, inventory
    entity_id = Column(Integer, nullable=True)
    entity_uuid = Column(String(36), nullable=True)
    
    # Event data
    data = Column(JSONB, default=dict, nullable=False)
    
    # Context
    user_id = Column(Integer, nullable=True)
    device_type = Column(String(50), nullable=True)
    ip_address = Column(String(50), nullable=True)
    
    # Status
    is_broadcasted = Column(String(10), default="pending")  # pending, sent, failed
    
    # Metadata
    created_at = Column(DateTime(timezone=True), server_default=func.now(), index=True)
    
    def __repr__(self):
        return f"<Event {self.event_type}>"

