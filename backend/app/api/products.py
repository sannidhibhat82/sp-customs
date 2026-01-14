"""
Products API - Full product management with dynamic attributes.
"""
from typing import List, Optional
from decimal import Decimal
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, or_, and_
from sqlalchemy.orm import selectinload
import re

from app.database import get_db
from app.models.product import Product, ProductImage
from app.models.category import Category
from app.models.brand import Brand
from app.models.inventory import Inventory
from app.schemas.product import (
    ProductCreate, ProductUpdate, ProductResponse, ProductListResponse,
    CategoryInfo, BrandInfo, ProductImageResponse, InventoryInfo
)
from app.schemas.common import PaginatedResponse
from app.services.auth import get_admin_user, get_current_user
from app.services.event_service import EventService
from app.services.barcode_generator import BarcodeGenerator
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


@router.get("", response_model=PaginatedResponse[ProductListResponse])
async def list_products(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    category_id: Optional[int] = None,
    brand_id: Optional[int] = None,
    is_active: Optional[bool] = None,
    is_featured: Optional[bool] = None,
    in_stock: Optional[bool] = None,
    search: Optional[str] = None,
    sort_by: str = Query("created_at", regex="^(created_at|name|price|sort_order)$"),
    sort_order: str = Query("desc", regex="^(asc|desc)$"),
    db: AsyncSession = Depends(get_db)
):
    """List products with pagination and filters."""
    query = select(Product).options(
        selectinload(Product.category),
        selectinload(Product.brand),
        selectinload(Product.images),
        selectinload(Product.inventory),
    )
    
    # Filters
    if category_id:
        query = query.where(Product.category_id == category_id)
    if brand_id:
        query = query.where(Product.brand_id == brand_id)
    if is_active is not None:
        query = query.where(Product.is_active == is_active)
    if is_featured is not None:
        query = query.where(Product.is_featured == is_featured)
    if search:
        search_term = f"%{search}%"
        query = query.where(
            or_(
                Product.name.ilike(search_term),
                Product.description.ilike(search_term),
                Product.sku.ilike(search_term),
                Product.barcode.ilike(search_term),
            )
        )
    
    # Stock filter requires join
    if in_stock is not None:
        query = query.join(Inventory, isouter=True)
        if in_stock:
            query = query.where(Inventory.quantity > 0)
        else:
            query = query.where(or_(Inventory.quantity == 0, Inventory.quantity == None))
    
    # Count total
    count_query = select(func.count(Product.id))
    if category_id:
        count_query = count_query.where(Product.category_id == category_id)
    if brand_id:
        count_query = count_query.where(Product.brand_id == brand_id)
    if is_active is not None:
        count_query = count_query.where(Product.is_active == is_active)
    if search:
        count_query = count_query.where(
            or_(
                Product.name.ilike(search_term),
                Product.description.ilike(search_term),
                Product.sku.ilike(search_term),
            )
        )
    
    total_result = await db.execute(count_query)
    total = total_result.scalar() or 0
    
    # Sorting
    sort_column = getattr(Product, sort_by)
    if sort_order == "desc":
        query = query.order_by(sort_column.desc())
    else:
        query = query.order_by(sort_column.asc())
    
    # Pagination
    offset = (page - 1) * page_size
    query = query.offset(offset).limit(page_size)
    
    result = await db.execute(query)
    products = result.scalars().unique().all()
    
    # Transform to response
    items = []
    for p in products:
        primary_image = next((img.image_data for img in p.images if img.is_primary), None)
        if not primary_image and p.images:
            primary_image = p.images[0].image_data
        
        inventory_qty = p.inventory.quantity if p.inventory else 0
        
        items.append(ProductListResponse(
            id=p.id,
            uuid=p.uuid,
            name=p.name,
            slug=p.slug,
            short_description=p.short_description,
            sku=p.sku,
            price=p.price,
            compare_at_price=p.compare_at_price,
            category=CategoryInfo.model_validate(p.category) if p.category else None,
            brand=BrandInfo.model_validate(p.brand) if p.brand else None,
            primary_image=primary_image,
            inventory_quantity=inventory_qty,
            is_in_stock=inventory_qty > 0,
            is_active=p.is_active,
            is_featured=p.is_featured,
            is_new=p.is_new,
            created_at=p.created_at,
        ))
    
    total_pages = (total + page_size - 1) // page_size
    
    return PaginatedResponse(
        items=items,
        total=total,
        page=page,
        page_size=page_size,
        total_pages=total_pages,
        has_next=page < total_pages,
        has_prev=page > 1,
    )


@router.get("/search")
async def search_products(
    q: str = Query(..., min_length=1),
    limit: int = Query(10, le=50),
    db: AsyncSession = Depends(get_db)
):
    """Quick search for products (autocomplete)."""
    search_term = f"%{q}%"
    
    result = await db.execute(
        select(Product)
        .where(
            Product.is_active == True,
            or_(
                Product.name.ilike(search_term),
                Product.sku.ilike(search_term),
                Product.barcode.ilike(search_term),
            )
        )
        .limit(limit)
    )
    products = result.scalars().all()
    
    return [
        {
            "id": p.id,
            "uuid": p.uuid,
            "name": p.name,
            "sku": p.sku,
            "barcode": p.barcode,
        }
        for p in products
    ]


@router.get("/by-barcode/{barcode}")
async def get_product_by_barcode(
    barcode: str,
    db: AsyncSession = Depends(get_db)
):
    """Get product by barcode or QR code content."""
    # Try to decode QR content
    decoded = BarcodeGenerator.decode_barcode(barcode)
    
    if "product_id" in decoded:
        result = await db.execute(
            select(Product)
            .options(selectinload(Product.inventory))
            .where(Product.id == decoded["product_id"])
        )
    else:
        result = await db.execute(
            select(Product)
            .options(selectinload(Product.inventory))
            .where(Product.barcode == barcode)
        )
    
    product = result.scalar_one_or_none()
    
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    
    return {
        "id": product.id,
        "uuid": product.uuid,
        "name": product.name,
        "sku": product.sku,
        "barcode": product.barcode,
        "inventory_quantity": product.inventory.quantity if product.inventory else 0,
    }


@router.get("/{product_id}", response_model=ProductResponse)
async def get_product(
    product_id: int,
    db: AsyncSession = Depends(get_db)
):
    """Get a specific product with all details."""
    result = await db.execute(
        select(Product)
        .options(
            selectinload(Product.category),
            selectinload(Product.brand),
            selectinload(Product.images),
            selectinload(Product.inventory),
        )
        .where(Product.id == product_id)
    )
    product = result.scalar_one_or_none()
    
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    
    return ProductResponse(
        id=product.id,
        uuid=product.uuid,
        name=product.name,
        slug=product.slug,
        description=product.description,
        short_description=product.short_description,
        sku=product.sku,
        barcode=product.barcode,
        barcode_data=product.barcode_data,
        qr_code_data=product.qr_code_data,
        price=product.price,
        cost_price=product.cost_price,
        compare_at_price=product.compare_at_price,
        attributes=product.attributes,
        specifications=product.specifications,
        features=product.features,
        category_id=product.category_id,
        brand_id=product.brand_id,
        category=CategoryInfo.model_validate(product.category) if product.category else None,
        brand=BrandInfo.model_validate(product.brand) if product.brand else None,
        images=[ProductImageResponse.model_validate(img) for img in product.images],
        inventory=InventoryInfo(
            quantity=product.inventory.quantity,
            reserved_quantity=product.inventory.reserved_quantity,
            available_quantity=product.inventory.available_quantity,
            is_in_stock=product.inventory.is_in_stock,
            is_low_stock=product.inventory.is_low_stock,
            low_stock_threshold=product.inventory.low_stock_threshold,
        ) if product.inventory else None,
        is_active=product.is_active,
        is_featured=product.is_featured,
        is_new=product.is_new,
        visibility=product.visibility,
        meta_title=product.meta_title,
        meta_description=product.meta_description,
        sort_order=product.sort_order,
        created_at=product.created_at,
        updated_at=product.updated_at,
    )


@router.post("", response_model=ProductResponse, status_code=status.HTTP_201_CREATED)
async def create_product(
    data: ProductCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_admin_user)
):
    """Create a new product with auto-generated codes."""
    # Get existing slugs
    result = await db.execute(select(Product.slug))
    existing_slugs = [row[0] for row in result.fetchall()]
    
    slug = generate_slug(data.name, existing_slugs)
    
    # Create product first to get ID
    product = Product(
        name=data.name,
        slug=slug,
        description=data.description,
        short_description=data.short_description,
        price=data.price,
        cost_price=data.cost_price,
        compare_at_price=data.compare_at_price,
        attributes=data.attributes,
        specifications=data.specifications,
        features=data.features,
        category_id=data.category_id,
        brand_id=data.brand_id,
        is_active=data.is_active,
        is_featured=data.is_featured,
        is_new=data.is_new,
        visibility=data.visibility,
        meta_title=data.meta_title,
        meta_description=data.meta_description,
        sort_order=data.sort_order,
        sku="TEMP",  # Temporary, will be updated
    )
    
    db.add(product)
    await db.flush()
    
    # Generate SKU, barcode, and QR code
    codes = BarcodeGenerator.generate_product_codes(product.id, product.name)
    product.sku = codes["sku"]
    product.barcode = codes["barcode"]
    product.barcode_data = codes["barcode_data"]
    product.qr_code_data = codes["qr_code_data"]
    
    # Create inventory record
    inventory = Inventory(
        product_id=product.id,
        quantity=data.initial_quantity,
    )
    db.add(inventory)
    
    # Log event
    await EventService.log_product_created(
        db=db,
        product_id=product.id,
        product_uuid=product.uuid,
        product_data={"name": product.name, "sku": product.sku},
        user_id=current_user.id,
    )
    
    await db.commit()
    
    # Reload with relationships
    result = await db.execute(
        select(Product)
        .options(
            selectinload(Product.category),
            selectinload(Product.brand),
            selectinload(Product.images),
            selectinload(Product.inventory),
        )
        .where(Product.id == product.id)
    )
    product = result.scalar_one()
    
    return ProductResponse(
        id=product.id,
        uuid=product.uuid,
        name=product.name,
        slug=product.slug,
        description=product.description,
        short_description=product.short_description,
        sku=product.sku,
        barcode=product.barcode,
        barcode_data=product.barcode_data,
        qr_code_data=product.qr_code_data,
        price=product.price,
        cost_price=product.cost_price,
        compare_at_price=product.compare_at_price,
        attributes=product.attributes,
        specifications=product.specifications,
        features=product.features,
        category_id=product.category_id,
        brand_id=product.brand_id,
        category=CategoryInfo.model_validate(product.category) if product.category else None,
        brand=BrandInfo.model_validate(product.brand) if product.brand else None,
        images=[],
        inventory=InventoryInfo(
            quantity=product.inventory.quantity,
            reserved_quantity=0,
            available_quantity=product.inventory.quantity,
            is_in_stock=product.inventory.quantity > 0,
            is_low_stock=product.inventory.quantity <= 5,
            low_stock_threshold=5,
        ) if product.inventory else None,
        is_active=product.is_active,
        is_featured=product.is_featured,
        is_new=product.is_new,
        visibility=product.visibility,
        meta_title=product.meta_title,
        meta_description=product.meta_description,
        sort_order=product.sort_order,
        created_at=product.created_at,
        updated_at=product.updated_at,
    )


@router.put("/{product_id}", response_model=ProductResponse)
async def update_product(
    product_id: int,
    data: ProductUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_admin_user)
):
    """Update a product."""
    result = await db.execute(
        select(Product)
        .options(
            selectinload(Product.category),
            selectinload(Product.brand),
            selectinload(Product.images),
            selectinload(Product.inventory),
        )
        .where(Product.id == product_id)
    )
    product = result.scalar_one_or_none()
    
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    
    update_data = data.model_dump(exclude_unset=True)
    
    # Convert Decimal to float for JSON serialization (for event logging)
    serializable_changes = {
        k: float(v) if isinstance(v, Decimal) else v 
        for k, v in update_data.items()
    }
    
    # Update slug if name changed
    if "name" in update_data:
        result = await db.execute(select(Product.slug).where(Product.id != product_id))
        existing_slugs = [row[0] for row in result.fetchall()]
        update_data["slug"] = generate_slug(update_data["name"], existing_slugs)
    
    for key, value in update_data.items():
        setattr(product, key, value)
    
    await EventService.log_product_updated(
        db=db,
        product_id=product.id,
        product_uuid=product.uuid,
        changes=serializable_changes,
        user_id=current_user.id,
    )
    
    await db.commit()
    
    # Reload with all relationships
    result = await db.execute(
        select(Product)
        .options(
            selectinload(Product.category),
            selectinload(Product.brand),
            selectinload(Product.images),
            selectinload(Product.inventory),
        )
        .where(Product.id == product_id)
    )
    product = result.scalar_one()
    
    return ProductResponse(
        id=product.id,
        uuid=product.uuid,
        name=product.name,
        slug=product.slug,
        description=product.description,
        short_description=product.short_description,
        sku=product.sku,
        barcode=product.barcode,
        barcode_data=product.barcode_data,
        qr_code_data=product.qr_code_data,
        price=product.price,
        cost_price=product.cost_price,
        compare_at_price=product.compare_at_price,
        attributes=product.attributes,
        specifications=product.specifications,
        features=product.features,
        category_id=product.category_id,
        brand_id=product.brand_id,
        category=CategoryInfo.model_validate(product.category) if product.category else None,
        brand=BrandInfo.model_validate(product.brand) if product.brand else None,
        images=[ProductImageResponse.model_validate(img) for img in product.images],
        inventory=InventoryInfo(
            quantity=product.inventory.quantity,
            reserved_quantity=product.inventory.reserved_quantity,
            available_quantity=product.inventory.available_quantity,
            is_in_stock=product.inventory.is_in_stock,
            is_low_stock=product.inventory.is_low_stock,
            low_stock_threshold=product.inventory.low_stock_threshold,
        ) if product.inventory else None,
        is_active=product.is_active,
        is_featured=product.is_featured,
        is_new=product.is_new,
        visibility=product.visibility,
        meta_title=product.meta_title,
        meta_description=product.meta_description,
        sort_order=product.sort_order,
        created_at=product.created_at,
        updated_at=product.updated_at,
    )


@router.delete("/{product_id}")
async def delete_product(
    product_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_admin_user)
):
    """Delete a product."""
    result = await db.execute(select(Product).where(Product.id == product_id))
    product = result.scalar_one_or_none()
    
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    
    await EventService.log_event(
        db=db,
        event_type="product_deleted",
        entity_type="product",
        entity_id=product.id,
        entity_uuid=product.uuid,
        data={"name": product.name, "sku": product.sku},
        user_id=current_user.id,
    )
    
    await db.delete(product)
    await db.commit()
    
    return {"message": "Product deleted successfully"}

