"""
Order address model for structured shipping/billing address per order.
Complements Order.shipping_info JSONB for backward compatibility.
"""
from sqlalchemy import Column, Integer, String, ForeignKey, DateTime, Text
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base
import uuid


class OrderAddress(Base):
    """
    One shipping address per order (normalized fields for Shiprocket/APIs).
    """
    __tablename__ = "order_addresses"

    id = Column(Integer, primary_key=True, index=True)
    uuid = Column(String(36), unique=True, default=lambda: str(uuid.uuid4()), index=True)

    order_id = Column(Integer, ForeignKey("orders.id", ondelete="CASCADE"), nullable=False, index=True)

    name = Column(String(255), nullable=False)
    phone = Column(String(50), nullable=False)
    address = Column(Text, nullable=False)  # full address line(s)
    city = Column(String(100), nullable=False)
    state = Column(String(100), nullable=False)
    pincode = Column(String(20), nullable=False)
    country = Column(String(100), default="India")

    created_at = Column(DateTime(timezone=True), server_default=func.now())

    order = relationship("Order", back_populates="order_address", uselist=False)

    def __repr__(self):
        return f"<OrderAddress order_id={self.order_id} {self.city}>"
