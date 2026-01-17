"""
Categories API endpoints - Dynamic hierarchical category management.
"""
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, update, delete
from sqlalchemy.orm import selectinload
import re

from app.database import get_db
from app.models.category import Category
from app.models.product import Product
from app.schemas.category import CategoryCreate, CategoryUpdate, CategoryResponse, CategoryTree
from app.services.auth import get_current_active_user, get_admin_user
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


@router.get("", response_model=List[CategoryResponse])
async def list_categories(
    parent_id: Optional[int] = Query(None, description="Filter by parent category"),
    is_active: Optional[bool] = Query(None, description="Filter by active status"),
    include_count: bool = Query(True, description="Include product count"),
    db: AsyncSession = Depends(get_db)
):
    """List all categories with optional filters."""
    query = select(Category)
    
    if parent_id is not None:
        query = query.where(Category.parent_id == parent_id)
    elif parent_id is None:
        # By default, show root categories
        pass
    
    if is_active is not None:
        query = query.where(Category.is_active == is_active)
    
    query = query.order_by(Category.sort_order, Category.name)
    
    result = await db.execute(query)
    categories = result.scalars().all()
    
    # Get product counts if requested
    responses = []
    for cat in categories:
        cat_dict = CategoryResponse.model_validate(cat).model_dump()
        if include_count:
            count_result = await db.execute(
                select(func.count(Product.id)).where(Product.category_id == cat.id)
            )
            cat_dict["product_count"] = count_result.scalar() or 0
        responses.append(CategoryResponse(**cat_dict))
    
    return responses


@router.get("/tree", response_model=List[CategoryTree])
async def get_category_tree(
    is_active: Optional[bool] = Query(None),
    db: AsyncSession = Depends(get_db)
):
    """Get categories as a nested tree structure."""
    query = select(Category)
    
    if is_active is not None:
        query = query.where(Category.is_active == is_active)
    
    query = query.order_by(Category.sort_order, Category.name)
    result = await db.execute(query)
    categories = result.scalars().all()
    
    # Get product counts for all categories in a single query
    product_counts = {}
    for cat in categories:
        count_result = await db.execute(
            select(func.count(Product.id)).where(
                Product.category_id == cat.id,
                Product.is_active == True
            )
        )
        product_counts[cat.id] = count_result.scalar() or 0
    
    # Build tree structure manually to avoid async attribute issues
    category_map = {}
    for cat in categories:
        category_map[cat.id] = {
            "id": cat.id,
            "uuid": cat.uuid,
            "name": cat.name,
            "slug": cat.slug,
            "description": cat.description,
            "image_data": cat.image_data,
            "parent_id": cat.parent_id,
            "level": cat.level,
            "path": cat.path,
            "sort_order": cat.sort_order,
            "is_active": cat.is_active,
            "is_featured": cat.is_featured,
            "product_count": product_counts.get(cat.id, 0),
            "created_at": cat.created_at,
            "updated_at": cat.updated_at,
            "children": []
        }
    
    root_categories = []
    for cat in categories:
        if cat.parent_id and cat.parent_id in category_map:
            category_map[cat.parent_id]["children"].append(category_map[cat.id])
        else:
            root_categories.append(category_map[cat.id])
    
    # Calculate total product count including children for parent categories
    def calculate_total_count(cat_data):
        total = cat_data["product_count"]
        for child in cat_data["children"]:
            total += calculate_total_count(child)
        cat_data["product_count"] = total
        return total
    
    for cat in root_categories:
        calculate_total_count(cat)
    
    return [CategoryTree(**cat) for cat in root_categories]


@router.get("/{category_id}", response_model=CategoryResponse)
async def get_category(
    category_id: int,
    db: AsyncSession = Depends(get_db)
):
    """Get a specific category by ID."""
    result = await db.execute(select(Category).where(Category.id == category_id))
    category = result.scalar_one_or_none()
    
    if not category:
        raise HTTPException(status_code=404, detail="Category not found")
    
    # Get product count
    count_result = await db.execute(
        select(func.count(Product.id)).where(Product.category_id == category.id)
    )
    
    response = CategoryResponse.model_validate(category)
    response.product_count = count_result.scalar() or 0
    
    return response


@router.post("", response_model=CategoryResponse, status_code=status.HTTP_201_CREATED)
async def create_category(
    data: CategoryCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_admin_user)
):
    """Create a new category."""
    # Check for duplicate name (case-insensitive)
    existing = await db.execute(
        select(Category).where(func.lower(Category.name) == func.lower(data.name))
    )
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Category with this name already exists")
    
    # Get existing slugs
    result = await db.execute(select(Category.slug))
    existing_slugs = [row[0] for row in result.fetchall()]
    
    slug = generate_slug(data.name, existing_slugs)
    
    # Calculate level and path
    level = 0
    path = ""
    if data.parent_id:
        parent_result = await db.execute(select(Category).where(Category.id == data.parent_id))
        parent = parent_result.scalar_one_or_none()
        if not parent:
            raise HTTPException(status_code=400, detail="Parent category not found")
        level = parent.level + 1
        path = f"{parent.path}/{parent.id}" if parent.path else str(parent.id)
    
    category = Category(
        name=data.name,
        slug=slug,
        description=data.description,
        image_data=data.image_data,
        parent_id=data.parent_id,
        level=level,
        path=path,
        sort_order=data.sort_order,
        is_active=data.is_active,
        is_featured=data.is_featured,
    )
    
    db.add(category)
    await db.flush()
    
    # Update path to include self
    category.path = f"{path}/{category.id}" if path else str(category.id)
    
    # Log event
    await EventService.log_event(
        db=db,
        event_type="category_created",
        entity_type="category",
        entity_id=category.id,
        entity_uuid=category.uuid,
        data={"name": category.name, "slug": category.slug},
        user_id=current_user.id,
    )
    
    await db.commit()
    await db.refresh(category)
    
    return CategoryResponse.model_validate(category)


@router.put("/{category_id}", response_model=CategoryResponse)
async def update_category(
    category_id: int,
    data: CategoryUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_admin_user)
):
    """Update a category."""
    result = await db.execute(select(Category).where(Category.id == category_id))
    category = result.scalar_one_or_none()
    
    if not category:
        raise HTTPException(status_code=404, detail="Category not found")
    
    update_data = data.model_dump(exclude_unset=True)
    
    # Update slug if name changed
    if "name" in update_data:
        # Check for duplicate name
        existing = await db.execute(
            select(Category).where(
                func.lower(Category.name) == func.lower(update_data["name"]),
                Category.id != category_id
            )
        )
        if existing.scalar_one_or_none():
            raise HTTPException(status_code=400, detail="Category with this name already exists")
        
        result = await db.execute(select(Category.slug).where(Category.id != category_id))
        existing_slugs = [row[0] for row in result.fetchall()]
        update_data["slug"] = generate_slug(update_data["name"], existing_slugs)
    
    # Handle parent change
    if "parent_id" in update_data:
        if update_data["parent_id"] == category_id:
            raise HTTPException(status_code=400, detail="Category cannot be its own parent")
        
        if update_data["parent_id"]:
            parent_result = await db.execute(
                select(Category).where(Category.id == update_data["parent_id"])
            )
            parent = parent_result.scalar_one_or_none()
            if not parent:
                raise HTTPException(status_code=400, detail="Parent category not found")
            update_data["level"] = parent.level + 1
            update_data["path"] = f"{parent.path}/{category.id}" if parent.path else f"{parent.id}/{category.id}"
        else:
            update_data["level"] = 0
            update_data["path"] = str(category.id)
    
    for key, value in update_data.items():
        setattr(category, key, value)
    
    # Log event
    await EventService.log_event(
        db=db,
        event_type="category_updated",
        entity_type="category",
        entity_id=category.id,
        entity_uuid=category.uuid,
        data=update_data,
        user_id=current_user.id,
    )
    
    await db.commit()
    await db.refresh(category)
    
    return CategoryResponse.model_validate(category)


@router.delete("/{category_id}")
async def delete_category(
    category_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_admin_user)
):
    """Delete a category."""
    result = await db.execute(select(Category).where(Category.id == category_id))
    category = result.scalar_one_or_none()
    
    if not category:
        raise HTTPException(status_code=404, detail="Category not found")
    
    # Check for children
    children_result = await db.execute(
        select(func.count(Category.id)).where(Category.parent_id == category_id)
    )
    if children_result.scalar() > 0:
        raise HTTPException(
            status_code=400,
            detail="Cannot delete category with sub-categories. Delete children first."
        )
    
    # Log event before deletion
    await EventService.log_event(
        db=db,
        event_type="category_deleted",
        entity_type="category",
        entity_id=category.id,
        entity_uuid=category.uuid,
        data={"name": category.name},
        user_id=current_user.id,
    )
    
    await db.delete(category)
    await db.commit()
    
    return {"message": "Category deleted successfully"}


@router.post("/reorder")
async def reorder_categories(
    order: List[dict],  # [{"id": 1, "sort_order": 0}, ...]
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_admin_user)
):
    """Reorder categories."""
    for item in order:
        await db.execute(
            update(Category)
            .where(Category.id == item["id"])
            .values(sort_order=item["sort_order"])
        )
    
    await db.commit()
    return {"message": "Categories reordered successfully"}

