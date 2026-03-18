"""
Cart and CartItem models for Book Now / checkout flow.
Supports both logged-in users (user_id) and guests (guest_session_id).
Inventory is NOT modified here; deduction happens only on order placement after payment.
"""
from sqlalchemy import Column, Integer, String, ForeignKey, DateTime, Numeric
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base
import uuid


class Cart(Base):
    """
    Shopping cart. One per user or guest session.
    status: active | converted | abandoned
    """
    __tablename__ = "carts"

    id = Column(Integer, primary_key=True, index=True)
    uuid = Column(String(36), unique=True, default=lambda: str(uuid.uuid4()), index=True)

    # Optional: logged-in user (future customer accounts)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True)
    # Guest: frontend sends a stable session id (e.g. from cookie)
    guest_session_id = Column(String(255), nullable=True, index=True)

    status = Column(String(50), default="active", index=True)  # active | converted | abandoned

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    items = relationship("CartItem", back_populates="cart", cascade="all, delete-orphan")
    user = relationship("User", backref="carts")

    def __repr__(self):
        return f"<Cart {self.uuid} status={self.status}>"


class CartItem(Base):
    """
    Cart line item. Stores product/variant reference and price snapshot.
    Price snapshot locks the price at add-to-cart time.
    """
    __tablename__ = "cart_items"

    id = Column(Integer, primary_key=True, index=True)
    uuid = Column(String(36), unique=True, default=lambda: str(uuid.uuid4()), index=True)

    cart_id = Column(Integer, ForeignKey("carts.id", ondelete="CASCADE"), nullable=False, index=True)
    product_id = Column(Integer, ForeignKey("products.id", ondelete="CASCADE"), nullable=False, index=True)
    variant_id = Column(Integer, ForeignKey("product_variants.id", ondelete="CASCADE"), nullable=True, index=True)

    quantity = Column(Integer, nullable=False, default=1)
    # Price at time of add (so checkout uses locked price)
    price_snapshot = Column(JSONB, nullable=False)  # {"unit_price": "99.00", "currency": "INR"}

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    cart = relationship("Cart", back_populates="items")
    product = relationship("Product")
    variant = relationship("ProductVariant")

    def __repr__(self):
        return f"<CartItem cart={self.cart_id} product={self.product_id} qty={self.quantity}>"
