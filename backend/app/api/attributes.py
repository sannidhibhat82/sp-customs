"""
Product Attributes API - Dynamic attribute definitions.
"""
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
import re

from app.database import get_db
from app.models.product import ProductAttribute
from app.schemas.product import ProductAttributeCreate, ProductAttributeUpdate, ProductAttributeResponse
from app.services.auth import get_admin_user
from app.models.user import User

router = APIRouter()


def generate_slug(name: str, existing_slugs: list = None) -> str:
    """Generate URL-friendly slug."""
    slug = re.sub(r'[^\w\s-]', '', name.lower())
    slug = re.sub(r'[-\s]+', '-', slug).strip('-')
    
    if existing_slugs and slug in existing_slugs:
        counter = 1
        while f"{slug}-{counter}" in existing_slugs:
            counter += 1
        slug = f"{slug}-{counter}"
    
    return slug


@router.get("", response_model=List[ProductAttributeResponse])
async def list_attributes(
    is_filterable: Optional[bool] = Query(None),
    db: AsyncSession = Depends(get_db)
):
    """List all attribute definitions."""
    query = select(ProductAttribute)
    
    if is_filterable is not None:
        query = query.where(ProductAttribute.is_filterable == is_filterable)
    
    query = query.order_by(ProductAttribute.sort_order, ProductAttribute.name)
    
    result = await db.execute(query)
    attributes = result.scalars().all()
    
    return [ProductAttributeResponse.model_validate(attr) for attr in attributes]


@router.get("/{attribute_id}", response_model=ProductAttributeResponse)
async def get_attribute(
    attribute_id: int,
    db: AsyncSession = Depends(get_db)
):
    """Get a specific attribute."""
    result = await db.execute(select(ProductAttribute).where(ProductAttribute.id == attribute_id))
    attribute = result.scalar_one_or_none()
    
    if not attribute:
        raise HTTPException(status_code=404, detail="Attribute not found")
    
    return ProductAttributeResponse.model_validate(attribute)


@router.post("", response_model=ProductAttributeResponse, status_code=status.HTTP_201_CREATED)
async def create_attribute(
    data: ProductAttributeCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_admin_user)
):
    """Create a new attribute definition."""
    # Check for duplicate name
    existing = await db.execute(select(ProductAttribute).where(ProductAttribute.name == data.name))
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Attribute with this name already exists")
    
    # Get existing slugs
    result = await db.execute(select(ProductAttribute.slug))
    existing_slugs = [row[0] for row in result.fetchall()]
    
    slug = generate_slug(data.name, existing_slugs)
    
    attribute = ProductAttribute(
        name=data.name,
        slug=slug,
        attribute_type=data.attribute_type,
        options=data.options,
        is_required=data.is_required,
        is_filterable=data.is_filterable,
        is_visible=data.is_visible,
        sort_order=data.sort_order,
        unit=data.unit,
    )
    
    db.add(attribute)
    await db.commit()
    await db.refresh(attribute)
    
    return ProductAttributeResponse.model_validate(attribute)


@router.put("/{attribute_id}", response_model=ProductAttributeResponse)
async def update_attribute(
    attribute_id: int,
    data: ProductAttributeUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_admin_user)
):
    """Update an attribute definition."""
    result = await db.execute(select(ProductAttribute).where(ProductAttribute.id == attribute_id))
    attribute = result.scalar_one_or_none()
    
    if not attribute:
        raise HTTPException(status_code=404, detail="Attribute not found")
    
    update_data = data.model_dump(exclude_unset=True)
    
    if "name" in update_data:
        existing = await db.execute(
            select(ProductAttribute).where(
                ProductAttribute.name == update_data["name"],
                ProductAttribute.id != attribute_id
            )
        )
        if existing.scalar_one_or_none():
            raise HTTPException(status_code=400, detail="Attribute with this name already exists")
        
        result = await db.execute(select(ProductAttribute.slug).where(ProductAttribute.id != attribute_id))
        existing_slugs = [row[0] for row in result.fetchall()]
        update_data["slug"] = generate_slug(update_data["name"], existing_slugs)
    
    for key, value in update_data.items():
        setattr(attribute, key, value)
    
    await db.commit()
    await db.refresh(attribute)
    
    return ProductAttributeResponse.model_validate(attribute)


@router.delete("/{attribute_id}")
async def delete_attribute(
    attribute_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_admin_user)
):
    """Delete an attribute definition."""
    result = await db.execute(select(ProductAttribute).where(ProductAttribute.id == attribute_id))
    attribute = result.scalar_one_or_none()
    
    if not attribute:
        raise HTTPException(status_code=404, detail="Attribute not found")
    
    await db.delete(attribute)
    await db.commit()
    
    return {"message": "Attribute deleted successfully"}

