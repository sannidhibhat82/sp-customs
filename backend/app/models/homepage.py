"""
Homepage content models for dynamic content management
"""
from sqlalchemy import Column, Integer, String, Boolean, DateTime, Text, Numeric, ForeignKey
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base
import uuid


class PromoBanner(Base):
    """Promotional banners for homepage carousel"""
    __tablename__ = "promo_banners"
    
    id = Column(Integer, primary_key=True, index=True)
    uuid = Column(String(36), unique=True, default=lambda: str(uuid.uuid4()), index=True)
    title = Column(String(255), nullable=False)
    subtitle = Column(String(255), nullable=True)
    description = Column(Text, nullable=True)
    cta_text = Column(String(100), default="Shop Now")  # Call to action button text
    cta_link = Column(String(500), default="/products")  # Link for CTA button
    gradient_from = Column(String(50), default="orange-600")  # Tailwind color
    gradient_to = Column(String(50), default="red-600")  # Tailwind color
    image_data = Column(Text, nullable=True)  # Optional background image
    is_active = Column(Boolean, default=True)
    sort_order = Column(Integer, default=0)
    start_date = Column(DateTime(timezone=True), nullable=True)  # Optional schedule
    end_date = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())


class Testimonial(Base):
    """Customer testimonials/reviews"""
    __tablename__ = "testimonials"
    
    id = Column(Integer, primary_key=True, index=True)
    uuid = Column(String(36), unique=True, default=lambda: str(uuid.uuid4()), index=True)
    customer_name = Column(String(255), nullable=False)
    customer_role = Column(String(255), nullable=True)  # e.g., "BMW Owner"
    customer_image = Column(Text, nullable=True)  # Base64 or URL
    rating = Column(Integer, default=5)  # 1-5 stars
    review_text = Column(Text, nullable=False)
    product_id = Column(Integer, ForeignKey("products.id", ondelete="SET NULL"), nullable=True)
    is_featured = Column(Boolean, default=False)
    is_active = Column(Boolean, default=True)
    sort_order = Column(Integer, default=0)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())


class InstagramReel(Base):
    """Instagram reels/videos showcase"""
    __tablename__ = "instagram_reels"
    
    id = Column(Integer, primary_key=True, index=True)
    uuid = Column(String(36), unique=True, default=lambda: str(uuid.uuid4()), index=True)
    title = Column(String(255), nullable=False)
    instagram_url = Column(String(500), nullable=True)  # Direct IG link
    embed_code = Column(Text, nullable=True)  # Instagram embed code
    thumbnail_data = Column(Text, nullable=True)  # Base64 thumbnail
    views_count = Column(String(50), nullable=True)  # Display text like "12.5K"
    icon_emoji = Column(String(10), default="📹")  # Emoji icon
    gradient_from = Column(String(50), default="rose-500")
    gradient_to = Column(String(50), default="pink-600")
    is_active = Column(Boolean, default=True)
    sort_order = Column(Integer, default=0)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())


class DealOfTheDay(Base):
    """Deal of the day configuration"""
    __tablename__ = "deal_of_the_day"
    
    id = Column(Integer, primary_key=True, index=True)
    uuid = Column(String(36), unique=True, default=lambda: str(uuid.uuid4()), index=True)
    product_id = Column(Integer, ForeignKey("products.id", ondelete="SET NULL"), nullable=True)
    title = Column(String(255), default="Deal of the Day")
    description = Column(Text, nullable=True)
    discount_percentage = Column(Integer, default=0)  # Percentage off
    deal_price = Column(Numeric(12, 2), nullable=True)  # Override price
    original_price = Column(Numeric(12, 2), nullable=True)  # Original price display
    end_time = Column(DateTime(timezone=True), nullable=True)  # Countdown end
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    
    # Relationship
    product = relationship("Product", foreign_keys=[product_id])


class ContactSubmission(Base):
    """Contact form submissions"""
    __tablename__ = "contact_submissions"
    
    id = Column(Integer, primary_key=True, index=True)
    uuid = Column(String(36), unique=True, default=lambda: str(uuid.uuid4()), index=True)
    name = Column(String(255), nullable=False)
    email = Column(String(255), nullable=False)
    phone = Column(String(50), nullable=True)
    subject = Column(String(500), nullable=True)
    message = Column(Text, nullable=False)
    product_id = Column(Integer, ForeignKey("products.id", ondelete="SET NULL"), nullable=True)
    status = Column(String(50), default="new")  # new, read, replied, closed
    notes = Column(Text, nullable=True)  # Admin notes
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())


class HomepageSettings(Base):
    """General homepage settings"""
    __tablename__ = "homepage_settings"
    
    id = Column(Integer, primary_key=True, index=True)
    key = Column(String(100), unique=True, nullable=False, index=True)
    value = Column(Text, nullable=True)
    value_json = Column(JSONB, nullable=True)  # For complex values
    description = Column(Text, nullable=True)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())


class NewsletterSubscription(Base):
    """Newsletter email subscriptions"""
    __tablename__ = "newsletter_subscriptions"
    
    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(255), unique=True, nullable=False, index=True)
    name = Column(String(255), nullable=True)
    is_active = Column(Boolean, default=True)
    subscribed_at = Column(DateTime(timezone=True), server_default=func.now())
    unsubscribed_at = Column(DateTime(timezone=True), nullable=True)


class FAQCategory(Base):
    """FAQ categories for grouping questions"""
    __tablename__ = "faq_categories"
    
    id = Column(Integer, primary_key=True, index=True)
    uuid = Column(String(36), unique=True, default=lambda: str(uuid.uuid4()), index=True)
    name = Column(String(255), nullable=False)
    slug = Column(String(255), unique=True, nullable=False, index=True)
    description = Column(Text, nullable=True)
    icon = Column(String(50), nullable=True)  # Icon name or emoji
    sort_order = Column(Integer, default=0)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    
    # Relationship
    questions = relationship("FAQQuestion", back_populates="category", cascade="all, delete-orphan")


class FAQQuestion(Base):
    """FAQ questions and answers"""
    __tablename__ = "faq_questions"
    
    id = Column(Integer, primary_key=True, index=True)
    uuid = Column(String(36), unique=True, default=lambda: str(uuid.uuid4()), index=True)
    category_id = Column(Integer, ForeignKey("faq_categories.id", ondelete="CASCADE"), nullable=False)
    question = Column(Text, nullable=False)
    answer = Column(Text, nullable=False)
    sort_order = Column(Integer, default=0)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    
    # Relationship
    category = relationship("FAQCategory", back_populates="questions")
