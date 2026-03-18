from sqlalchemy import Column, Integer, String, Boolean, DateTime
from sqlalchemy.sql import func
from app.database import Base
import uuid


class User(Base):
    """
    User model: admin (username/password) and customer (phone/OTP).
    Customers place orders and are identified by phone; no separate customer table.
    """
    __tablename__ = "users"
    
    id = Column(Integer, primary_key=True, index=True)
    uuid = Column(String(36), unique=True, default=lambda: str(uuid.uuid4()), index=True)
    
    username = Column(String(100), unique=True, nullable=False, index=True)
    email = Column(String(255), unique=True, nullable=True, index=True)
    # Nullable for OTP-only customer users; admin users have password
    hashed_password = Column(String(255), nullable=True)
    
    # Customer profile (OTP login): phone is primary identifier
    phone = Column(String(20), unique=True, nullable=True, index=True)
    
    # Profile
    full_name = Column(String(255), nullable=True)
    avatar_data = Column(String, nullable=True)  # Base64 encoded avatar
    
    # Role: admin, manager, viewer (backend); customer (storefront)
    role = Column(String(50), default="admin")
    
    # Status
    is_active = Column(Boolean, default=True)
    is_superuser = Column(Boolean, default=False)
    
    # Metadata
    last_login = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    
    @property
    def is_customer(self) -> bool:
        return self.role == "customer"
    
    def __repr__(self):
        return f"<User {self.username}>"

