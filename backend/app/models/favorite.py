"""
Favorites (wishlist) model.
Stores user_id + product_id. For guest wishlist we use optional guest_session_id.
"""
from sqlalchemy import Column, Integer, String, ForeignKey, DateTime, UniqueConstraint
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base
import uuid


class Favorite(Base):
    """
    User or guest favorite product (wishlist).
    """
    __tablename__ = "favorites"

    id = Column(Integer, primary_key=True, index=True)
    uuid = Column(String(36), unique=True, default=lambda: str(uuid.uuid4()), index=True)

    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=True, index=True)
    guest_session_id = Column(String(255), nullable=True, index=True)
    product_id = Column(Integer, ForeignKey("products.id", ondelete="CASCADE"), nullable=False, index=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # At least one of user_id or guest_session_id must be set
    __table_args__ = (
        UniqueConstraint("user_id", "product_id", name="uq_favorites_user_product"),
        UniqueConstraint("guest_session_id", "product_id", name="uq_favorites_guest_product"),
    )

    user = relationship("User", backref="favorites")
    product = relationship("Product", backref="favorited_by")

    def __repr__(self):
        return f"<Favorite product_id={self.product_id}>"
