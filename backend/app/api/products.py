"""
Products API - Full product management with dynamic attributes.
"""
from typing import List, Optional
from decimal import Decimal
from fastapi import APIRouter, Depends, HTTPException, status, Query, UploadFile, File
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, or_, and_, String
from sqlalchemy.orm import selectinload
import re

from app.database import get_db
from app.models.product import Product, ProductImage
from app.models.category import Category
from app.models.brand import Brand
from app.models.inventory import Inventory
from app.models.variant import ProductVariant, VariantInventory
from app.schemas.product import (
    ProductCreate, ProductUpdate, ProductResponse, ProductListResponse,
    CategoryInfo, BrandInfo, ProductImageResponse, InventoryInfo
)
from app.schemas.common import PaginatedResponse
from app.services.auth import get_admin_user, get_current_user
from app.services.event_service import EventService
from app.services.barcode_generator import BarcodeGenerator
from app.services.excel_import import parse_inventory_excel
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
    tags: Optional[str] = None,  # Comma-separated tags for filtering
    visibility: Optional[str] = None,  # Filter by visibility (admin use)
    include_hidden: bool = Query(False, description="Include hidden products (admin only)"),
    sort_by: str = Query("created_at", pattern="^(created_at|name|price|sort_order)$"),
    sort_order: str = Query("desc", pattern="^(asc|desc)$"),
    db: AsyncSession = Depends(get_db)
):
    """List products with pagination and filters.
    
    For public views (is_active=True), hidden products are automatically excluded
    unless include_hidden=True (for admin use).
    """
    query = select(Product).options(
        selectinload(Product.category),
        selectinload(Product.brand),
        selectinload(Product.images),
        selectinload(Product.inventory),
        selectinload(Product.variants).selectinload(ProductVariant.inventory),
    )
    
    # Filters
    if category_id:
        query = query.where(Product.category_id == category_id)
    if brand_id:
        query = query.where(Product.brand_id == brand_id)
    if is_active is not None:
        query = query.where(Product.is_active == is_active)
        # For public views (is_active=True), exclude hidden products unless explicitly requested
        if is_active == True and not include_hidden:
            query = query.where(Product.visibility != "hidden")
    if is_featured is not None:
        query = query.where(Product.is_featured == is_featured)
    if visibility:
        query = query.where(Product.visibility == visibility)
    
    # Tag search
    if tags:
        tag_list = [t.strip().lower() for t in tags.split(",") if t.strip()]
        if tag_list:
            # Search for any matching tag (case-insensitive)
            for tag in tag_list:
                # Use JSONB containment or text search
                query = query.where(
                    func.lower(func.cast(Product.tags, String)).contains(tag.lower())
                )
    
    # Search including tags
    if search:
        search_term = f"%{search}%"
        search_lower = search.lower()
        query = query.where(
            or_(
                Product.name.ilike(search_term),
                Product.description.ilike(search_term),
                Product.sku.ilike(search_term),
                Product.barcode.ilike(search_term),
                # Also search in tags
                func.lower(func.cast(Product.tags, String)).contains(search_lower),
            )
        )
    
    # Stock filter requires join
    if in_stock is not None:
        query = query.join(Inventory, isouter=True)
        if in_stock:
            query = query.where(Inventory.quantity > 0)
        else:
            query = query.where(or_(Inventory.quantity == 0, Inventory.quantity == None))
    
    # Count total with same filters
    count_query = select(func.count(Product.id))
    if category_id:
        count_query = count_query.where(Product.category_id == category_id)
    if brand_id:
        count_query = count_query.where(Product.brand_id == brand_id)
    if is_active is not None:
        count_query = count_query.where(Product.is_active == is_active)
        if is_active == True and not include_hidden:
            count_query = count_query.where(Product.visibility != "hidden")
    if visibility:
        count_query = count_query.where(Product.visibility == visibility)
    if tags:
        tag_list = [t.strip().lower() for t in tags.split(",") if t.strip()]
        for tag in tag_list:
            count_query = count_query.where(
                func.lower(func.cast(Product.tags, String)).contains(tag.lower())
            )
    if search:
        search_lower = search.lower()
        count_query = count_query.where(
            or_(
                Product.name.ilike(search_term),
                Product.description.ilike(search_term),
                Product.sku.ilike(search_term),
                func.lower(func.cast(Product.tags, String)).contains(search_lower),
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
        
        # For products with variants, inventory is on variants; use sum of variant stock for list
        inventory_qty = p.inventory.quantity if p.inventory else 0
        if p.variants and inventory_qty == 0:
            inventory_qty = sum((vi.quantity or 0) for v in p.variants for vi in [v.inventory] if vi)
        # For products with variants, product.price may be None; use default/first variant price for list display
        display_price = p.price
        if display_price is None and p.variants:
            default_v = next((v for v in p.variants if v.is_default), None) or (p.variants[0] if p.variants else None)
            if default_v and default_v.price is not None:
                display_price = default_v.price
        display_compare = p.compare_at_price
        if display_compare is None and p.variants and display_price is not None:
            default_v = next((v for v in p.variants if v.is_default), None) or (p.variants[0] if p.variants else None)
            if default_v and default_v.compare_at_price is not None:
                display_compare = default_v.compare_at_price

        items.append(ProductListResponse(
            id=p.id,
            uuid=p.uuid,
            name=p.name,
            slug=p.slug,
            short_description=p.short_description,
            sku=p.sku,
            price=display_price,
            compare_at_price=display_compare,
            category=CategoryInfo.model_validate(p.category) if p.category else None,
            brand=BrandInfo.model_validate(p.brand) if p.brand else None,
            primary_image=primary_image,
            inventory_quantity=inventory_qty,
            is_in_stock=inventory_qty > 0,
            is_active=p.is_active,
            is_featured=p.is_featured,
            is_new=p.is_new,
            visibility=p.visibility,
            tags=p.tags or [],
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
    include_variants: bool = Query(True, description="Include product variants in search"),
    include_hidden: bool = Query(False, description="Include hidden products (for admin order creation)"),
    db: AsyncSession = Depends(get_db)
):
    """Quick search for products and variants (autocomplete).
    
    By default excludes hidden products. Set include_hidden=True for admin order creation.
    """
    from app.models.variant import ProductVariant, VariantInventory, VariantImage
    
    search_term = f"%{q}%"
    search_lower = q.lower()
    results = []
    
    # Build visibility filter
    visibility_filter = Product.is_active == True
    if not include_hidden:
        visibility_filter = and_(Product.is_active == True, Product.visibility != "hidden")
    
    # Search products - also search in tags
    product_result = await db.execute(
        select(Product)
        .options(selectinload(Product.images), selectinload(Product.inventory))
        .where(
            visibility_filter,
            or_(
                Product.name.ilike(search_term),
                Product.sku.ilike(search_term),
                Product.barcode.ilike(search_term),
                # Also search in tags
                func.lower(func.cast(Product.tags, String)).contains(search_lower),
            )
        )
        .limit(limit)
    )
    products = product_result.scalars().all()
    
    for p in products:
        results.append({
            "id": p.id,
            "uuid": p.uuid,
            "name": p.name,
            "sku": p.sku,
            "barcode": p.barcode,
            "price": float(p.price) if p.price else 0,
            "quantity": p.inventory.available_quantity if p.inventory else 0,
            "primary_image": p.primary_image,
            "is_variant": False,
            "tags": p.tags or [],
        })
    
    # Search variants if enabled
    if include_variants and len(results) < limit:
        variant_limit = limit - len(results)
        # Build variant visibility filter
        variant_visibility_filter = and_(ProductVariant.is_active == True, Product.is_active == True)
        if not include_hidden:
            variant_visibility_filter = and_(
                ProductVariant.is_active == True,
                Product.is_active == True,
                Product.visibility != "hidden"
            )
        
        # Join with Product to also search by parent product name
        variant_result = await db.execute(
            select(ProductVariant)
            .join(Product, ProductVariant.product_id == Product.id)
            .options(
                selectinload(ProductVariant.product).selectinload(Product.images),
                selectinload(ProductVariant.inventory),
                selectinload(ProductVariant.images)
            )
            .where(
                variant_visibility_filter,
                or_(
                    # Search by variant fields
                    ProductVariant.name.ilike(search_term),
                    ProductVariant.sku.ilike(search_term),
                    ProductVariant.barcode.ilike(search_term),
                    # Also search by parent product name
                    Product.name.ilike(search_term),
                )
            )
            .limit(variant_limit)
        )
        variants = variant_result.scalars().all()
        
        for v in variants:
            # Get variant image or fall back to product image
            variant_image = None
            if v.images and len(v.images) > 0:
                variant_image = v.images[0].image_data
            elif v.product and v.product.primary_image:
                variant_image = v.product.primary_image
            
            # Get variant inventory
            qty = v.inventory.available_quantity if v.inventory else 0
            
            # Get price (variant price or fall back to product price)
            price = float(v.price) if v.price else (float(v.product.price) if v.product and v.product.price else 0)
            
            results.append({
                "id": v.product_id,
                "uuid": v.uuid,
                "name": f"{v.product.name if v.product else ''} - {v.name}",
                "sku": v.sku or (v.product.sku if v.product else ''),
                "barcode": v.barcode,
                "price": price,
                "quantity": qty,
                "primary_image": variant_image,
                "is_variant": True,
                "variant_id": v.id,
                "variant_name": v.name,
                "variant_options": v.options,
            })
    
    return results


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


def _product_to_response(product: Product) -> ProductResponse:
    """Build ProductResponse from a loaded Product (with category, brand, images, inventory)."""
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
        badges=getattr(product, 'badges', None) or {},
        tags=product.tags or [],
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


@router.get("/by-slug/{slug}", response_model=ProductResponse)
async def get_product_by_slug(
    slug: str,
    db: AsyncSession = Depends(get_db)
):
    """Get a product by slug (for public detail pages). Only returns active, non-hidden products."""
    result = await db.execute(
        select(Product)
        .options(
            selectinload(Product.category),
            selectinload(Product.brand),
            selectinload(Product.images),
            selectinload(Product.inventory),
        )
        .where(Product.slug == slug)
        .where(Product.is_active == True)
        .where(Product.visibility != "hidden")
    )
    product = result.scalar_one_or_none()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    return _product_to_response(product)


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
    
    return _product_to_response(product)


@router.post("", response_model=ProductResponse, status_code=status.HTTP_201_CREATED)
async def create_product(
    data: ProductCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_admin_user)
):
    """Create a new product with auto-generated or custom codes."""
    # Get existing slugs
    result = await db.execute(select(Product.slug))
    existing_slugs = [row[0] for row in result.fetchall()]
    
    slug = generate_slug(data.name, existing_slugs)
    
    # Check if custom SKU is provided and validate uniqueness
    if data.custom_sku:
        # Check if SKU already exists
        existing_sku = await db.execute(
            select(Product).where(Product.sku == data.custom_sku)
        )
        if existing_sku.scalar_one_or_none():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"SKU '{data.custom_sku}' already exists. Please use a unique SKU."
            )
        
        # Check if barcode already exists (same as SKU for custom)
        existing_barcode = await db.execute(
            select(Product).where(Product.barcode == data.custom_sku)
        )
        if existing_barcode.scalar_one_or_none():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Barcode '{data.custom_sku}' already exists."
            )
    
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
        badges=getattr(data, 'badges', {}) or {},
        tags=data.tags,
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
    
    # Generate SKU, barcode, and QR code (use custom SKU if provided)
    if data.custom_sku:
        # Use custom SKU and generate barcode from it
        codes = BarcodeGenerator.generate_barcode_from_sku(data.custom_sku, product.id)
        product.sku = data.custom_sku
        product.barcode = data.custom_sku  # Use SKU as barcode
        product.barcode_data = codes["barcode_data"]
        product.qr_code_data = codes["qr_code_data"]
    else:
        # Auto-generate everything
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
        badges=getattr(product, 'badges', None) or {},
        tags=product.tags or [],
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
        badges=getattr(product, 'badges', None) or {},
        tags=product.tags or [],
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


# DB limits: product_variants.sku and .barcode are VARCHAR(100); .name is String(255)
VARIANT_NAME_MAX_LEN = 255
VARIANT_SKU_MAX_LEN = 100


def _variant_slug(name: str, max_len: Optional[int] = None) -> str:
    """URL-friendly slug for variant name (used in SKU suffix). Truncates to max_len if set."""
    s = re.sub(r"[^a-z0-9]+", "-", (name or "").lower()).strip("-")
    s = s or "var"
    if max_len is not None and len(s) > max_len:
        s = s[:max_len].rstrip("-")
    return s or "var"


@router.post("/upload-excel")
async def upload_products_excel(
    file: UploadFile = File(..., description="Excel file (original inventory format: Sl no, PRODUCT NAME, QUNTITY, VARIENTS, PRICE, FEATURES, DISCRIPTION, Category)"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_admin_user),
):
    """
    Upload an Excel file to create products and variants (temporary bulk import).
    Accepts the original inventory format; file is not stored permanently.
    """
    if not file.filename or not file.filename.lower().endswith((".xlsx", ".xls")):
        raise HTTPException(status_code=400, detail="File must be an Excel file (.xlsx or .xls)")
    content = await file.read()
    if len(content) > 10 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="File too large (max 10MB)")
    try:
        groups = parse_inventory_excel(content)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Invalid Excel format: {str(e)}")
    if not groups:
        return {"created": 0, "products": [], "message": "No valid product rows found"}

    # Load existing categories by name (case-insensitive)
    cat_result = await db.execute(select(Category.id, Category.name))
    category_by_name = {row[1].lower(): row[0] for row in cat_result.fetchall()}
    cat_slugs_result = await db.execute(select(Category.slug))
    existing_cat_slugs = [r[0] for r in cat_slugs_result.fetchall()]
    product_slugs_result = await db.execute(select(Product.slug))
    existing_product_slugs = [r[0] for r in product_slugs_result.fetchall()]

    created_products = []
    for group in groups:
        cat_name = group["category"]
        cat_name_lower = cat_name.lower()
        if cat_name_lower not in category_by_name:
            slug = re.sub(r"[^\w\s-]", "", cat_name.lower())
            slug = re.sub(r"[-\s]+", "-", slug).strip("-") or "category"
            n = 1
            while slug in existing_cat_slugs:
                slug = f"{slug}-{n}"
                n += 1
            existing_cat_slugs.append(slug)
            new_cat = Category(
                name=cat_name,
                slug=slug,
                description=f"{cat_name} category",
                is_active=True,
                is_featured=False,
            )
            db.add(new_cat)
            await db.flush()
            category_by_name[cat_name_lower] = new_cat.id
        category_id = category_by_name[cat_name_lower]

        first = group["rows"][0]
        has_variants = any(r.get("variant_value") for r in group["rows"])
        base_price = None if has_variants else (Decimal(first["price"]) if first.get("price") is not None else None)
        initial_qty = 0 if has_variants else (first.get("initial_quantity") or 0)

        slug = generate_slug(group["product_name"], existing_product_slugs)
        existing_product_slugs.append(slug)
        product = Product(
            name=group["product_name"],
            slug=slug,
            description=group.get("description") or None,
            short_description=group.get("short_description") or None,
            price=base_price,
            category_id=category_id,
            brand_id=None,
            features=group.get("features") or [],
            badges={},
            is_active=True,
            is_featured=False,
            is_new=True,
            sku="TEMP",
        )
        db.add(product)
        await db.flush()
        codes = BarcodeGenerator.generate_product_codes(product.id, product.name)
        product.sku = codes["sku"]
        product.barcode = codes["barcode"]
        product.barcode_data = codes["barcode_data"]
        product.qr_code_data = codes["qr_code_data"]
        db.add(Inventory(product_id=product.id, quantity=initial_qty))
        await EventService.log_product_created(db=db, product_id=product.id, product_uuid=product.uuid, product_data={"name": product.name, "sku": product.sku}, user_id=current_user.id)

        variant_count = 0
        if has_variants:
            for row in group["rows"]:
                vval = (row.get("variant_value") or "").strip()
                if not vval:
                    continue
                opt_name = (row.get("variant_option_name") or "").strip()
                options = {opt_name: vval} if opt_name and vval else {}
                vname = (vval or "Default").strip()
                if len(vname) > VARIANT_NAME_MAX_LEN:
                    vname = vname[:VARIANT_NAME_MAX_LEN].rstrip()
                price = Decimal(row["price"]) if row.get("price") is not None else (product.price if variant_count == 0 else None)
                qty = row.get("initial_quantity") or 0
                is_first = variant_count == 0
                if is_first:
                    v_sku = product.sku
                    v_barcode = product.barcode
                    is_default = True
                else:
                    suffix_max = VARIANT_SKU_MAX_LEN - len(product.sku) - 1  # for "-"
                    slug_suffix = _variant_slug(vname, max_len=max(suffix_max, 10))
                    v_sku = f"{product.sku}-{slug_suffix}"
                    if len(v_sku) > VARIANT_SKU_MAX_LEN:
                        v_sku = v_sku[:VARIANT_SKU_MAX_LEN].rstrip("-")
                    v_barcode = f"SPCV{product.id:06d}{variant_count + 1:03d}"
                    is_default = False
                existing_sku = await db.execute(select(ProductVariant).where(ProductVariant.sku == v_sku))
                if existing_sku.scalar_one_or_none():
                    suffix_max = VARIANT_SKU_MAX_LEN - len(product.sku) - 2 - len(str(variant_count))  # "-" and "-N"
                    slug_suffix = _variant_slug(vname, max_len=max(suffix_max, 5))
                    v_sku = f"{product.sku}-{slug_suffix}-{variant_count}"
                    if len(v_sku) > VARIANT_SKU_MAX_LEN:
                        v_sku = v_sku[:VARIANT_SKU_MAX_LEN].rstrip("-")
                variant = ProductVariant(
                    product_id=product.id,
                    name=vname,
                    sku=v_sku,
                    barcode=v_barcode,
                    options=options,
                    price=price,
                    is_active=True,
                    is_default=is_default,
                    sort_order=variant_count,
                )
                db.add(variant)
                await db.flush()
                db.add(VariantInventory(variant_id=variant.id, quantity=qty))
                variant_count += 1
        created_products.append({"id": product.id, "name": product.name, "variants": variant_count})
    await db.commit()
    return {"created": len(created_products), "products": created_products}

