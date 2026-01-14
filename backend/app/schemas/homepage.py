"""
Pydantic schemas for homepage content
"""
from pydantic import BaseModel, EmailStr
from typing import Optional, List, Any
from datetime import datetime


# ============ Promo Banner Schemas ============

class PromoBannerBase(BaseModel):
    title: str
    subtitle: Optional[str] = None
    description: Optional[str] = None
    cta_text: str = "Shop Now"
    cta_link: str = "/products"
    gradient_from: str = "orange-600"
    gradient_to: str = "red-600"
    image_data: Optional[str] = None
    is_active: bool = True
    sort_order: int = 0
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None


class PromoBannerCreate(PromoBannerBase):
    pass


class PromoBannerUpdate(BaseModel):
    title: Optional[str] = None
    subtitle: Optional[str] = None
    description: Optional[str] = None
    cta_text: Optional[str] = None
    cta_link: Optional[str] = None
    gradient_from: Optional[str] = None
    gradient_to: Optional[str] = None
    image_data: Optional[str] = None
    is_active: Optional[bool] = None
    sort_order: Optional[int] = None
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None


class PromoBannerResponse(PromoBannerBase):
    id: int
    uuid: str
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True


# ============ Testimonial Schemas ============

class TestimonialBase(BaseModel):
    customer_name: str
    customer_role: Optional[str] = None
    customer_image: Optional[str] = None
    rating: int = 5
    review_text: str
    product_id: Optional[int] = None
    is_featured: bool = False
    is_active: bool = True
    sort_order: int = 0


class TestimonialCreate(TestimonialBase):
    pass


class TestimonialUpdate(BaseModel):
    customer_name: Optional[str] = None
    customer_role: Optional[str] = None
    customer_image: Optional[str] = None
    rating: Optional[int] = None
    review_text: Optional[str] = None
    product_id: Optional[int] = None
    is_featured: Optional[bool] = None
    is_active: Optional[bool] = None
    sort_order: Optional[int] = None


class TestimonialResponse(TestimonialBase):
    id: int
    uuid: str
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True


# ============ Instagram Reel Schemas ============

class InstagramReelBase(BaseModel):
    title: str
    instagram_url: Optional[str] = None
    embed_code: Optional[str] = None
    thumbnail_data: Optional[str] = None
    views_count: Optional[str] = None
    icon_emoji: str = "📹"
    gradient_from: str = "rose-500"
    gradient_to: str = "pink-600"
    is_active: bool = True
    sort_order: int = 0


class InstagramReelCreate(InstagramReelBase):
    pass


class InstagramReelUpdate(BaseModel):
    title: Optional[str] = None
    instagram_url: Optional[str] = None
    embed_code: Optional[str] = None
    thumbnail_data: Optional[str] = None
    views_count: Optional[str] = None
    icon_emoji: Optional[str] = None
    gradient_from: Optional[str] = None
    gradient_to: Optional[str] = None
    is_active: Optional[bool] = None
    sort_order: Optional[int] = None


class InstagramReelResponse(InstagramReelBase):
    id: int
    uuid: str
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True


# ============ Deal of the Day Schemas ============

class DealOfTheDayBase(BaseModel):
    product_id: Optional[int] = None
    title: str = "Deal of the Day"
    description: Optional[str] = None
    discount_percentage: int = 0
    deal_price: Optional[float] = None
    original_price: Optional[float] = None
    end_time: Optional[datetime] = None
    is_active: bool = True


class DealOfTheDayCreate(DealOfTheDayBase):
    pass


class DealOfTheDayUpdate(BaseModel):
    product_id: Optional[int] = None
    title: Optional[str] = None
    description: Optional[str] = None
    discount_percentage: Optional[int] = None
    deal_price: Optional[float] = None
    original_price: Optional[float] = None
    end_time: Optional[datetime] = None
    is_active: Optional[bool] = None


class ProductMinimal(BaseModel):
    id: int
    name: str
    slug: Optional[str] = None
    price: Optional[float] = None
    primary_image: Optional[str] = None
    
    class Config:
        from_attributes = True


class DealOfTheDayResponse(DealOfTheDayBase):
    id: int
    uuid: str
    product: Optional[ProductMinimal] = None
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True


# ============ Contact Submission Schemas ============

class ContactSubmissionBase(BaseModel):
    name: str
    email: EmailStr
    phone: Optional[str] = None
    subject: Optional[str] = None
    message: str
    product_id: Optional[int] = None


class ContactSubmissionCreate(ContactSubmissionBase):
    pass


class ContactSubmissionUpdate(BaseModel):
    status: Optional[str] = None
    notes: Optional[str] = None


class ContactSubmissionResponse(ContactSubmissionBase):
    id: int
    uuid: str
    status: str
    notes: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True


# ============ Homepage Settings Schemas ============

class HomepageSettingBase(BaseModel):
    key: str
    value: Optional[str] = None
    value_json: Optional[Any] = None
    description: Optional[str] = None


class HomepageSettingCreate(HomepageSettingBase):
    pass


class HomepageSettingUpdate(BaseModel):
    value: Optional[str] = None
    value_json: Optional[Any] = None
    description: Optional[str] = None


class HomepageSettingResponse(HomepageSettingBase):
    id: int
    updated_at: datetime
    
    class Config:
        from_attributes = True


# ============ Newsletter Schemas ============

class NewsletterSubscriptionCreate(BaseModel):
    email: EmailStr
    name: Optional[str] = None


class NewsletterSubscriptionResponse(BaseModel):
    id: int
    email: str
    name: Optional[str] = None
    is_active: bool
    subscribed_at: datetime
    
    class Config:
        from_attributes = True


# ============ FAQ Schemas ============

class FAQQuestionBase(BaseModel):
    question: str
    answer: str
    sort_order: int = 0
    is_active: bool = True


class FAQQuestionCreate(FAQQuestionBase):
    category_id: int


class FAQQuestionUpdate(BaseModel):
    question: Optional[str] = None
    answer: Optional[str] = None
    category_id: Optional[int] = None
    sort_order: Optional[int] = None
    is_active: Optional[bool] = None


class FAQQuestionResponse(FAQQuestionBase):
    id: int
    uuid: str
    category_id: int
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True


class FAQCategoryBase(BaseModel):
    name: str
    description: Optional[str] = None
    icon: Optional[str] = None
    sort_order: int = 0
    is_active: bool = True


class FAQCategoryCreate(FAQCategoryBase):
    pass


class FAQCategoryUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    icon: Optional[str] = None
    sort_order: Optional[int] = None
    is_active: Optional[bool] = None


class FAQCategoryResponse(FAQCategoryBase):
    id: int
    uuid: str
    slug: str
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True


class FAQCategoryWithQuestions(FAQCategoryResponse):
    """Category with nested questions for the FAQ page"""
    questions: List[FAQQuestionResponse] = []


# ============ Aggregate Response for Homepage ============

class HomepageContentResponse(BaseModel):
    banners: List[PromoBannerResponse] = []
    testimonials: List[TestimonialResponse] = []
    reels: List[InstagramReelResponse] = []
    deal_of_the_day: Optional[DealOfTheDayResponse] = None
    settings: dict = {}
