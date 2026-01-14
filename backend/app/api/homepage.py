"""
API endpoints for homepage content management
"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update, delete
from sqlalchemy.orm import selectinload
from typing import List, Optional
from datetime import datetime

from app.database import get_db
from app.models.homepage import (
    PromoBanner,
    Testimonial,
    InstagramReel,
    DealOfTheDay,
    ContactSubmission,
    HomepageSettings,
    NewsletterSubscription,
    FAQCategory,
    FAQQuestion,
)
from app.models.product import Product
from app.schemas.homepage import (
    PromoBannerCreate, PromoBannerUpdate, PromoBannerResponse,
    TestimonialCreate, TestimonialUpdate, TestimonialResponse,
    InstagramReelCreate, InstagramReelUpdate, InstagramReelResponse,
    DealOfTheDayCreate, DealOfTheDayUpdate, DealOfTheDayResponse,
    ContactSubmissionCreate, ContactSubmissionUpdate, ContactSubmissionResponse,
    HomepageSettingCreate, HomepageSettingUpdate, HomepageSettingResponse,
    NewsletterSubscriptionCreate, NewsletterSubscriptionResponse,
    HomepageContentResponse,
    FAQCategoryCreate, FAQCategoryUpdate, FAQCategoryResponse, FAQCategoryWithQuestions,
    FAQQuestionCreate, FAQQuestionUpdate, FAQQuestionResponse,
)
from app.services.auth import get_current_user

router = APIRouter(prefix="/homepage", tags=["Homepage"])


# ============ Public Endpoint - Get All Homepage Content ============

@router.get("/content", response_model=HomepageContentResponse)
async def get_homepage_content(db: AsyncSession = Depends(get_db)):
    """Get all active homepage content for public display"""
    now = datetime.utcnow()
    
    # Get active banners (within date range if specified)
    banners_query = select(PromoBanner).where(
        PromoBanner.is_active == True
    ).order_by(PromoBanner.sort_order)
    banners_result = await db.execute(banners_query)
    banners = banners_result.scalars().all()
    
    # Filter by date range
    active_banners = []
    for banner in banners:
        if banner.start_date and banner.start_date > now:
            continue
        if banner.end_date and banner.end_date < now:
            continue
        active_banners.append(banner)
    
    # Get active testimonials
    testimonials_query = select(Testimonial).where(
        Testimonial.is_active == True
    ).order_by(Testimonial.sort_order)
    testimonials_result = await db.execute(testimonials_query)
    testimonials = testimonials_result.scalars().all()
    
    # Get active reels
    reels_query = select(InstagramReel).where(
        InstagramReel.is_active == True
    ).order_by(InstagramReel.sort_order)
    reels_result = await db.execute(reels_query)
    reels = reels_result.scalars().all()
    
    # Get active deal of the day (also load product images for primary_image)
    deal_query = select(DealOfTheDay).options(
        selectinload(DealOfTheDay.product).selectinload(Product.images)
    ).where(DealOfTheDay.is_active == True).limit(1)
    deal_result = await db.execute(deal_query)
    deal = deal_result.scalar_one_or_none()
    
    # Get settings as dict
    settings_query = select(HomepageSettings)
    settings_result = await db.execute(settings_query)
    settings_list = settings_result.scalars().all()
    settings = {s.key: s.value_json if s.value_json else s.value for s in settings_list}
    
    return HomepageContentResponse(
        banners=active_banners,
        testimonials=testimonials,
        reels=reels,
        deal_of_the_day=deal,
        settings=settings,
    )


# ============ Promo Banners CRUD ============

@router.get("/banners", response_model=List[PromoBannerResponse])
async def get_banners(
    is_active: Optional[bool] = None,
    db: AsyncSession = Depends(get_db)
):
    query = select(PromoBanner).order_by(PromoBanner.sort_order)
    if is_active is not None:
        query = query.where(PromoBanner.is_active == is_active)
    result = await db.execute(query)
    return result.scalars().all()


@router.get("/banners/{banner_id}", response_model=PromoBannerResponse)
async def get_banner(banner_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(PromoBanner).where(PromoBanner.id == banner_id))
    banner = result.scalar_one_or_none()
    if not banner:
        raise HTTPException(status_code=404, detail="Banner not found")
    return banner


@router.post("/banners", response_model=PromoBannerResponse)
async def create_banner(
    data: PromoBannerCreate,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user)
):
    banner = PromoBanner(**data.model_dump())
    db.add(banner)
    await db.commit()
    await db.refresh(banner)
    return banner


@router.put("/banners/{banner_id}", response_model=PromoBannerResponse)
async def update_banner(
    banner_id: int,
    data: PromoBannerUpdate,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user)
):
    result = await db.execute(select(PromoBanner).where(PromoBanner.id == banner_id))
    banner = result.scalar_one_or_none()
    if not banner:
        raise HTTPException(status_code=404, detail="Banner not found")
    
    update_data = data.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(banner, key, value)
    
    await db.commit()
    await db.refresh(banner)
    return banner


@router.delete("/banners/{banner_id}")
async def delete_banner(
    banner_id: int,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user)
):
    result = await db.execute(select(PromoBanner).where(PromoBanner.id == banner_id))
    banner = result.scalar_one_or_none()
    if not banner:
        raise HTTPException(status_code=404, detail="Banner not found")
    
    await db.delete(banner)
    await db.commit()
    return {"message": "Banner deleted"}


# ============ Testimonials CRUD ============

@router.get("/testimonials", response_model=List[TestimonialResponse])
async def get_testimonials(
    is_active: Optional[bool] = None,
    is_featured: Optional[bool] = None,
    db: AsyncSession = Depends(get_db)
):
    query = select(Testimonial).order_by(Testimonial.sort_order)
    if is_active is not None:
        query = query.where(Testimonial.is_active == is_active)
    if is_featured is not None:
        query = query.where(Testimonial.is_featured == is_featured)
    result = await db.execute(query)
    return result.scalars().all()


@router.get("/testimonials/{testimonial_id}", response_model=TestimonialResponse)
async def get_testimonial(testimonial_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Testimonial).where(Testimonial.id == testimonial_id))
    testimonial = result.scalar_one_or_none()
    if not testimonial:
        raise HTTPException(status_code=404, detail="Testimonial not found")
    return testimonial


@router.post("/testimonials", response_model=TestimonialResponse)
async def create_testimonial(
    data: TestimonialCreate,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user)
):
    testimonial = Testimonial(**data.model_dump())
    db.add(testimonial)
    await db.commit()
    await db.refresh(testimonial)
    return testimonial


@router.put("/testimonials/{testimonial_id}", response_model=TestimonialResponse)
async def update_testimonial(
    testimonial_id: int,
    data: TestimonialUpdate,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user)
):
    result = await db.execute(select(Testimonial).where(Testimonial.id == testimonial_id))
    testimonial = result.scalar_one_or_none()
    if not testimonial:
        raise HTTPException(status_code=404, detail="Testimonial not found")
    
    update_data = data.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(testimonial, key, value)
    
    await db.commit()
    await db.refresh(testimonial)
    return testimonial


@router.delete("/testimonials/{testimonial_id}")
async def delete_testimonial(
    testimonial_id: int,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user)
):
    result = await db.execute(select(Testimonial).where(Testimonial.id == testimonial_id))
    testimonial = result.scalar_one_or_none()
    if not testimonial:
        raise HTTPException(status_code=404, detail="Testimonial not found")
    
    await db.delete(testimonial)
    await db.commit()
    return {"message": "Testimonial deleted"}


# ============ Instagram Reels CRUD ============

@router.get("/reels", response_model=List[InstagramReelResponse])
async def get_reels(
    is_active: Optional[bool] = None,
    db: AsyncSession = Depends(get_db)
):
    query = select(InstagramReel).order_by(InstagramReel.sort_order)
    if is_active is not None:
        query = query.where(InstagramReel.is_active == is_active)
    result = await db.execute(query)
    return result.scalars().all()


@router.get("/reels/{reel_id}", response_model=InstagramReelResponse)
async def get_reel(reel_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(InstagramReel).where(InstagramReel.id == reel_id))
    reel = result.scalar_one_or_none()
    if not reel:
        raise HTTPException(status_code=404, detail="Reel not found")
    return reel


@router.post("/reels", response_model=InstagramReelResponse)
async def create_reel(
    data: InstagramReelCreate,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user)
):
    reel = InstagramReel(**data.model_dump())
    db.add(reel)
    await db.commit()
    await db.refresh(reel)
    return reel


@router.put("/reels/{reel_id}", response_model=InstagramReelResponse)
async def update_reel(
    reel_id: int,
    data: InstagramReelUpdate,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user)
):
    result = await db.execute(select(InstagramReel).where(InstagramReel.id == reel_id))
    reel = result.scalar_one_or_none()
    if not reel:
        raise HTTPException(status_code=404, detail="Reel not found")
    
    update_data = data.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(reel, key, value)
    
    await db.commit()
    await db.refresh(reel)
    return reel


@router.delete("/reels/{reel_id}")
async def delete_reel(
    reel_id: int,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user)
):
    result = await db.execute(select(InstagramReel).where(InstagramReel.id == reel_id))
    reel = result.scalar_one_or_none()
    if not reel:
        raise HTTPException(status_code=404, detail="Reel not found")
    
    await db.delete(reel)
    await db.commit()
    return {"message": "Reel deleted"}


# ============ Deal of the Day CRUD ============

@router.get("/deals", response_model=List[DealOfTheDayResponse])
async def get_deals(db: AsyncSession = Depends(get_db)):
    query = select(DealOfTheDay).options(
        selectinload(DealOfTheDay.product).selectinload(Product.images)
    )
    result = await db.execute(query)
    return result.scalars().all()


@router.get("/deals/active", response_model=Optional[DealOfTheDayResponse])
async def get_active_deal(db: AsyncSession = Depends(get_db)):
    query = select(DealOfTheDay).options(
        selectinload(DealOfTheDay.product).selectinload(Product.images)
    ).where(DealOfTheDay.is_active == True).limit(1)
    result = await db.execute(query)
    return result.scalar_one_or_none()


@router.post("/deals", response_model=DealOfTheDayResponse)
async def create_deal(
    data: DealOfTheDayCreate,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user)
):
    deal = DealOfTheDay(**data.model_dump())
    db.add(deal)
    await db.commit()
    await db.refresh(deal)
    
    # Reload with product relationship and images
    result = await db.execute(
        select(DealOfTheDay).options(
            selectinload(DealOfTheDay.product).selectinload(Product.images)
        ).where(DealOfTheDay.id == deal.id)
    )
    return result.scalar_one()


@router.put("/deals/{deal_id}", response_model=DealOfTheDayResponse)
async def update_deal(
    deal_id: int,
    data: DealOfTheDayUpdate,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user)
):
    result = await db.execute(select(DealOfTheDay).where(DealOfTheDay.id == deal_id))
    deal = result.scalar_one_or_none()
    if not deal:
        raise HTTPException(status_code=404, detail="Deal not found")
    
    update_data = data.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(deal, key, value)
    
    await db.commit()
    
    # Reload with product relationship and images
    result = await db.execute(
        select(DealOfTheDay).options(
            selectinload(DealOfTheDay.product).selectinload(Product.images)
        ).where(DealOfTheDay.id == deal.id)
    )
    return result.scalar_one()


@router.delete("/deals/{deal_id}")
async def delete_deal(
    deal_id: int,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user)
):
    result = await db.execute(select(DealOfTheDay).where(DealOfTheDay.id == deal_id))
    deal = result.scalar_one_or_none()
    if not deal:
        raise HTTPException(status_code=404, detail="Deal not found")
    
    await db.delete(deal)
    await db.commit()
    return {"message": "Deal deleted"}


# ============ Contact Submissions ============

@router.get("/contacts", response_model=List[ContactSubmissionResponse])
async def get_contacts(
    status: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user)
):
    query = select(ContactSubmission).order_by(ContactSubmission.created_at.desc())
    if status:
        query = query.where(ContactSubmission.status == status)
    result = await db.execute(query)
    return result.scalars().all()


@router.post("/contacts", response_model=ContactSubmissionResponse)
async def create_contact(
    data: ContactSubmissionCreate,
    db: AsyncSession = Depends(get_db)
):
    """Public endpoint for contact form submissions"""
    contact = ContactSubmission(**data.model_dump())
    db.add(contact)
    await db.commit()
    await db.refresh(contact)
    return contact


@router.put("/contacts/{contact_id}", response_model=ContactSubmissionResponse)
async def update_contact(
    contact_id: int,
    data: ContactSubmissionUpdate,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user)
):
    result = await db.execute(select(ContactSubmission).where(ContactSubmission.id == contact_id))
    contact = result.scalar_one_or_none()
    if not contact:
        raise HTTPException(status_code=404, detail="Contact not found")
    
    update_data = data.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(contact, key, value)
    
    await db.commit()
    await db.refresh(contact)
    return contact


@router.delete("/contacts/{contact_id}")
async def delete_contact(
    contact_id: int,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user)
):
    result = await db.execute(select(ContactSubmission).where(ContactSubmission.id == contact_id))
    contact = result.scalar_one_or_none()
    if not contact:
        raise HTTPException(status_code=404, detail="Contact not found")
    
    await db.delete(contact)
    await db.commit()
    return {"message": "Contact deleted"}


# ============ Homepage Settings ============

@router.get("/settings", response_model=List[HomepageSettingResponse])
async def get_settings(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(HomepageSettings))
    return result.scalars().all()


@router.get("/settings/{key}", response_model=HomepageSettingResponse)
async def get_setting(key: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(HomepageSettings).where(HomepageSettings.key == key))
    setting = result.scalar_one_or_none()
    if not setting:
        raise HTTPException(status_code=404, detail="Setting not found")
    return setting


@router.post("/settings", response_model=HomepageSettingResponse)
async def create_or_update_setting(
    data: HomepageSettingCreate,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user)
):
    result = await db.execute(select(HomepageSettings).where(HomepageSettings.key == data.key))
    setting = result.scalar_one_or_none()
    
    if setting:
        setting.value = data.value
        setting.value_json = data.value_json
        setting.description = data.description
    else:
        setting = HomepageSettings(**data.model_dump())
        db.add(setting)
    
    await db.commit()
    await db.refresh(setting)
    return setting


@router.delete("/settings/{key}")
async def delete_setting(
    key: str,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user)
):
    result = await db.execute(select(HomepageSettings).where(HomepageSettings.key == key))
    setting = result.scalar_one_or_none()
    if not setting:
        raise HTTPException(status_code=404, detail="Setting not found")
    
    await db.delete(setting)
    await db.commit()
    return {"message": "Setting deleted"}


# ============ Newsletter ============

@router.post("/newsletter/subscribe", response_model=NewsletterSubscriptionResponse)
async def subscribe_newsletter(
    data: NewsletterSubscriptionCreate,
    db: AsyncSession = Depends(get_db)
):
    """Public endpoint for newsletter subscription"""
    # Check if already subscribed
    result = await db.execute(
        select(NewsletterSubscription).where(NewsletterSubscription.email == data.email)
    )
    existing = result.scalar_one_or_none()
    
    if existing:
        if existing.is_active:
            raise HTTPException(status_code=400, detail="Already subscribed")
        else:
            # Reactivate
            existing.is_active = True
            existing.unsubscribed_at = None
            await db.commit()
            await db.refresh(existing)
            return existing
    
    subscription = NewsletterSubscription(**data.model_dump())
    db.add(subscription)
    await db.commit()
    await db.refresh(subscription)
    return subscription


@router.get("/newsletter/subscriptions", response_model=List[NewsletterSubscriptionResponse])
async def get_subscriptions(
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user)
):
    result = await db.execute(
        select(NewsletterSubscription).order_by(NewsletterSubscription.subscribed_at.desc())
    )
    return result.scalars().all()


@router.post("/newsletter/unsubscribe")
async def unsubscribe_newsletter(
    email: str,
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(
        select(NewsletterSubscription).where(NewsletterSubscription.email == email)
    )
    subscription = result.scalar_one_or_none()
    
    if not subscription:
        raise HTTPException(status_code=404, detail="Subscription not found")
    
    subscription.is_active = False
    subscription.unsubscribed_at = datetime.utcnow()
    await db.commit()
    return {"message": "Unsubscribed successfully"}


# ============ FAQ CRUD ============

def generate_slug(name: str) -> str:
    """Generate URL-friendly slug from name"""
    import re
    slug = name.lower().strip()
    slug = re.sub(r'[^\w\s-]', '', slug)
    slug = re.sub(r'[-\s]+', '-', slug)
    return slug


# Public - Get all FAQ categories with questions
@router.get("/faqs", response_model=List[FAQCategoryWithQuestions])
async def get_faqs(db: AsyncSession = Depends(get_db)):
    """Get all active FAQ categories with their questions for the FAQ page"""
    query = select(FAQCategory).options(
        selectinload(FAQCategory.questions)
    ).where(FAQCategory.is_active == True).order_by(FAQCategory.sort_order)
    result = await db.execute(query)
    categories = result.scalars().all()
    
    # Filter to only active questions and sort them
    for cat in categories:
        cat.questions = sorted(
            [q for q in cat.questions if q.is_active],
            key=lambda x: x.sort_order
        )
    
    return categories


# Admin - FAQ Categories CRUD
@router.get("/faq-categories", response_model=List[FAQCategoryResponse])
async def get_faq_categories(
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user)
):
    query = select(FAQCategory).order_by(FAQCategory.sort_order)
    result = await db.execute(query)
    return result.scalars().all()


@router.post("/faq-categories", response_model=FAQCategoryResponse)
async def create_faq_category(
    data: FAQCategoryCreate,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user)
):
    slug = generate_slug(data.name)
    category = FAQCategory(**data.model_dump(), slug=slug)
    db.add(category)
    await db.commit()
    await db.refresh(category)
    return category


@router.put("/faq-categories/{category_id}", response_model=FAQCategoryResponse)
async def update_faq_category(
    category_id: int,
    data: FAQCategoryUpdate,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user)
):
    result = await db.execute(select(FAQCategory).where(FAQCategory.id == category_id))
    category = result.scalar_one_or_none()
    if not category:
        raise HTTPException(status_code=404, detail="FAQ category not found")
    
    update_data = data.model_dump(exclude_unset=True)
    if "name" in update_data:
        update_data["slug"] = generate_slug(update_data["name"])
    
    for key, value in update_data.items():
        setattr(category, key, value)
    
    await db.commit()
    await db.refresh(category)
    return category


@router.delete("/faq-categories/{category_id}")
async def delete_faq_category(
    category_id: int,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user)
):
    result = await db.execute(select(FAQCategory).where(FAQCategory.id == category_id))
    category = result.scalar_one_or_none()
    if not category:
        raise HTTPException(status_code=404, detail="FAQ category not found")
    
    await db.delete(category)
    await db.commit()
    return {"message": "FAQ category deleted"}


# Admin - FAQ Questions CRUD
@router.get("/faq-questions", response_model=List[FAQQuestionResponse])
async def get_faq_questions(
    category_id: Optional[int] = None,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user)
):
    query = select(FAQQuestion).order_by(FAQQuestion.sort_order)
    if category_id:
        query = query.where(FAQQuestion.category_id == category_id)
    result = await db.execute(query)
    return result.scalars().all()


@router.post("/faq-questions", response_model=FAQQuestionResponse)
async def create_faq_question(
    data: FAQQuestionCreate,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user)
):
    # Verify category exists
    cat_result = await db.execute(select(FAQCategory).where(FAQCategory.id == data.category_id))
    if not cat_result.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="FAQ category not found")
    
    question = FAQQuestion(**data.model_dump())
    db.add(question)
    await db.commit()
    await db.refresh(question)
    return question


@router.put("/faq-questions/{question_id}", response_model=FAQQuestionResponse)
async def update_faq_question(
    question_id: int,
    data: FAQQuestionUpdate,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user)
):
    result = await db.execute(select(FAQQuestion).where(FAQQuestion.id == question_id))
    question = result.scalar_one_or_none()
    if not question:
        raise HTTPException(status_code=404, detail="FAQ question not found")
    
    update_data = data.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(question, key, value)
    
    await db.commit()
    await db.refresh(question)
    return question


@router.delete("/faq-questions/{question_id}")
async def delete_faq_question(
    question_id: int,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user)
):
    result = await db.execute(select(FAQQuestion).where(FAQQuestion.id == question_id))
    question = result.scalar_one_or_none()
    if not question:
        raise HTTPException(status_code=404, detail="FAQ question not found")
    
    await db.delete(question)
    await db.commit()
    return {"message": "FAQ question deleted"}
