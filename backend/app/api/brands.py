"""
Brands API endpoints - Dynamic brand management.
"""
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, update
from sqlalchemy.orm import selectinload
import re

from app.database import get_db
from app.models.brand import Brand, brand_categories
from app.models.category import Category
from app.models.product import Product
from app.schemas.brand import BrandCreate, BrandUpdate, BrandResponse
from app.services.auth import get_admin_user
from app.services.event_service import EventService
from app.models.user import User

router = APIRouter()


def generate_slug(name: str, existing_slugs: list = None) -> str:
    """Generate URL-friendly slug from name."""
    slug = re.sub(r'[^\w\s-]', '', name.lower())
    slug = re.sub(r'[-\s]+', '-', slug).strip('-')
    
    if existing_slugs and slug in existing_slugs:
        counter = 1
        while f"{slug}-{counter}" in existing_slugs:
            counter += 1
        slug = f"{slug}-{counter}"
    
    return slug


@router.get("", response_model=List[BrandResponse])
async def list_brands(
    is_active: Optional[bool] = Query(None),
    category_id: Optional[int] = Query(None, description="Filter by category"),
    include_count: bool = Query(True),
    db: AsyncSession = Depends(get_db)
):
    """List all brands."""
    query = select(Brand).options(selectinload(Brand.categories))
    
    if is_active is not None:
        query = query.where(Brand.is_active == is_active)
    
    if category_id:
        query = query.join(brand_categories).where(brand_categories.c.category_id == category_id)
    
    query = query.order_by(Brand.sort_order, Brand.name)
    
    result = await db.execute(query)
    brands = result.scalars().unique().all()
    
    responses = []
    for brand in brands:
        brand_dict = {
            "id": brand.id,
            "uuid": brand.uuid,
            "name": brand.name,
            "slug": brand.slug,
            "description": brand.description,
            "logo_data": brand.logo_data,
            "website": brand.website,
            "sort_order": brand.sort_order,
            "is_active": brand.is_active,
            "is_featured": brand.is_featured,
            "category_ids": [c.id for c in brand.categories],
            "created_at": brand.created_at,
            "updated_at": brand.updated_at,
            "product_count": 0,
        }
        
        if include_count:
            count_result = await db.execute(
                select(func.count(Product.id)).where(Product.brand_id == brand.id)
            )
            brand_dict["product_count"] = count_result.scalar() or 0
        
        responses.append(BrandResponse(**brand_dict))
    
    return responses


@router.get("/{brand_id}", response_model=BrandResponse)
async def get_brand(
    brand_id: int,
    db: AsyncSession = Depends(get_db)
):
    """Get a specific brand."""
    result = await db.execute(
        select(Brand).options(selectinload(Brand.categories)).where(Brand.id == brand_id)
    )
    brand = result.scalar_one_or_none()
    
    if not brand:
        raise HTTPException(status_code=404, detail="Brand not found")
    
    count_result = await db.execute(
        select(func.count(Product.id)).where(Product.brand_id == brand.id)
    )
    
    return BrandResponse(
        id=brand.id,
        uuid=brand.uuid,
        name=brand.name,
        slug=brand.slug,
        description=brand.description,
        logo_data=brand.logo_data,
        website=brand.website,
        sort_order=brand.sort_order,
        is_active=brand.is_active,
        is_featured=brand.is_featured,
        category_ids=[c.id for c in brand.categories],
        product_count=count_result.scalar() or 0,
        created_at=brand.created_at,
        updated_at=brand.updated_at,
    )


@router.post("", response_model=BrandResponse, status_code=status.HTTP_201_CREATED)
async def create_brand(
    data: BrandCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_admin_user)
):
    """Create a new brand."""
    # Check for duplicate name
    existing = await db.execute(select(Brand).where(Brand.name == data.name))
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Brand with this name already exists")
    
    # Get existing slugs
    result = await db.execute(select(Brand.slug))
    existing_slugs = [row[0] for row in result.fetchall()]
    
    slug = generate_slug(data.name, existing_slugs)
    
    brand = Brand(
        name=data.name,
        slug=slug,
        description=data.description,
        logo_data=data.logo_data,
        website=data.website,
        sort_order=data.sort_order,
        is_active=data.is_active,
        is_featured=data.is_featured,
    )
    
    # Add category associations
    if data.category_ids:
        categories_result = await db.execute(
            select(Category).where(Category.id.in_(data.category_ids))
        )
        brand.categories = list(categories_result.scalars().all())
    
    db.add(brand)
    await db.flush()
    
    await EventService.log_event(
        db=db,
        event_type="brand_created",
        entity_type="brand",
        entity_id=brand.id,
        entity_uuid=brand.uuid,
        data={"name": brand.name},
        user_id=current_user.id,
    )
    
    await db.commit()
    
    # Reload with relationships
    result = await db.execute(
        select(Brand).options(selectinload(Brand.categories)).where(Brand.id == brand.id)
    )
    brand = result.scalar_one()
    
    return BrandResponse(
        id=brand.id,
        uuid=brand.uuid,
        name=brand.name,
        slug=brand.slug,
        description=brand.description,
        logo_data=brand.logo_data,
        website=brand.website,
        sort_order=brand.sort_order,
        is_active=brand.is_active,
        is_featured=brand.is_featured,
        category_ids=[c.id for c in brand.categories],
        product_count=0,
        created_at=brand.created_at,
        updated_at=brand.updated_at,
    )


@router.put("/{brand_id}", response_model=BrandResponse)
async def update_brand(
    brand_id: int,
    data: BrandUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_admin_user)
):
    """Update a brand."""
    result = await db.execute(
        select(Brand).options(selectinload(Brand.categories)).where(Brand.id == brand_id)
    )
    brand = result.scalar_one_or_none()
    
    if not brand:
        raise HTTPException(status_code=404, detail="Brand not found")
    
    update_data = data.model_dump(exclude_unset=True)
    
    # Update slug if name changed
    if "name" in update_data:
        # Check for duplicate
        existing = await db.execute(
            select(Brand).where(Brand.name == update_data["name"], Brand.id != brand_id)
        )
        if existing.scalar_one_or_none():
            raise HTTPException(status_code=400, detail="Brand with this name already exists")
        
        result = await db.execute(select(Brand.slug).where(Brand.id != brand_id))
        existing_slugs = [row[0] for row in result.fetchall()]
        update_data["slug"] = generate_slug(update_data["name"], existing_slugs)
    
    # Handle category associations
    if "category_ids" in update_data:
        category_ids = update_data.pop("category_ids")
        if category_ids is not None:
            categories_result = await db.execute(
                select(Category).where(Category.id.in_(category_ids))
            )
            brand.categories = list(categories_result.scalars().all())
    
    for key, value in update_data.items():
        setattr(brand, key, value)
    
    await EventService.log_event(
        db=db,
        event_type="brand_updated",
        entity_type="brand",
        entity_id=brand.id,
        entity_uuid=brand.uuid,
        data=update_data,
        user_id=current_user.id,
    )
    
    await db.commit()
    
    # Reload with relationships
    result = await db.execute(
        select(Brand).options(selectinload(Brand.categories)).where(Brand.id == brand_id)
    )
    brand = result.scalar_one()
    
    count_result = await db.execute(
        select(func.count(Product.id)).where(Product.brand_id == brand.id)
    )
    
    return BrandResponse(
        id=brand.id,
        uuid=brand.uuid,
        name=brand.name,
        slug=brand.slug,
        description=brand.description,
        logo_data=brand.logo_data,
        website=brand.website,
        sort_order=brand.sort_order,
        is_active=brand.is_active,
        is_featured=brand.is_featured,
        category_ids=[c.id for c in brand.categories],
        product_count=count_result.scalar() or 0,
        created_at=brand.created_at,
        updated_at=brand.updated_at,
    )


@router.delete("/{brand_id}")
async def delete_brand(
    brand_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_admin_user)
):
    """Delete a brand."""
    result = await db.execute(select(Brand).where(Brand.id == brand_id))
    brand = result.scalar_one_or_none()
    
    if not brand:
        raise HTTPException(status_code=404, detail="Brand not found")
    
    await EventService.log_event(
        db=db,
        event_type="brand_deleted",
        entity_type="brand",
        entity_id=brand.id,
        entity_uuid=brand.uuid,
        data={"name": brand.name},
        user_id=current_user.id,
    )
    
    await db.delete(brand)
    await db.commit()
    
    return {"message": "Brand deleted successfully"}

