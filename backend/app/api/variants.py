"""
Variants API - Product variant management.
"""
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update, func
from sqlalchemy.orm import selectinload

from app.database import get_db
from app.models.variant import ProductVariant, VariantImage, VariantInventory, VariantInventoryLog, VariantOption
from app.models.product import Product
from app.schemas.variant import (
    VariantCreate, VariantUpdate, VariantResponse, VariantListResponse,
    VariantImageCreate, VariantImageResponse,
    VariantOptionCreate, VariantOptionUpdate, VariantOptionResponse,
    VariantInventoryInfo
)
from app.services.auth import get_admin_user, get_current_user
from app.services.image_storage import get_image_storage
from app.services.barcode_generator import BarcodeGenerator
from app.models.user import User
import re

router = APIRouter()


def generate_slug(name: str) -> str:
    """Generate URL-friendly slug from name."""
    slug = name.lower()
    slug = re.sub(r'[^a-z0-9]+', '-', slug)
    slug = slug.strip('-')
    return slug


# ============ Product Variants ============

@router.get("/product/{product_id}", response_model=List[VariantListResponse])
async def get_product_variants(
    product_id: int,
    db: AsyncSession = Depends(get_db)
):
    """Get all variants for a product."""
    result = await db.execute(
        select(ProductVariant)
        .options(
            selectinload(ProductVariant.images),
            selectinload(ProductVariant.inventory)
        )
        .where(ProductVariant.product_id == product_id)
        .order_by(ProductVariant.sort_order)
    )
    variants = result.scalars().all()
    
    response = []
    for v in variants:
        primary_image = next((img.image_data for img in v.images if img.is_primary), None)
        if not primary_image and v.images:
            primary_image = v.images[0].image_data
        
        response.append(VariantListResponse(
            id=v.id,
            uuid=v.uuid,
            name=v.name,
            sku=v.sku,
            barcode=v.barcode,
            options=v.options or {},
            price=v.price,
            compare_at_price=v.compare_at_price,
            primary_image=primary_image,
            images=[VariantImageResponse.model_validate(img) for img in v.images],
            inventory_quantity=v.inventory.quantity if v.inventory else 0,
            is_in_stock=v.inventory.is_in_stock if v.inventory else False,
            is_active=v.is_active,
            is_default=v.is_default
        ))
    
    return response


@router.get("/{variant_id}", response_model=VariantResponse)
async def get_variant(
    variant_id: int,
    db: AsyncSession = Depends(get_db)
):
    """Get a single variant by ID."""
    result = await db.execute(
        select(ProductVariant)
        .options(
            selectinload(ProductVariant.images),
            selectinload(ProductVariant.inventory)
        )
        .where(ProductVariant.id == variant_id)
    )
    variant = result.scalar_one_or_none()
    
    if not variant:
        raise HTTPException(status_code=404, detail="Variant not found")
    
    return VariantResponse(
        id=variant.id,
        uuid=variant.uuid,
        product_id=variant.product_id,
        name=variant.name,
        sku=variant.sku,
        barcode=variant.barcode,
        options=variant.options or {},
        price=variant.price,
        cost_price=variant.cost_price,
        compare_at_price=variant.compare_at_price,
        is_active=variant.is_active,
        is_default=variant.is_default,
        sort_order=variant.sort_order,
        images=[VariantImageResponse.model_validate(img) for img in variant.images],
        inventory=VariantInventoryInfo(
            quantity=variant.inventory.quantity,
            reserved_quantity=variant.inventory.reserved_quantity,
            available_quantity=variant.inventory.available_quantity,
            is_in_stock=variant.inventory.is_in_stock,
            is_low_stock=variant.inventory.is_low_stock,
            low_stock_threshold=variant.inventory.low_stock_threshold
        ) if variant.inventory else None,
        created_at=variant.created_at,
        updated_at=variant.updated_at
    )


@router.get("/{variant_id}/barcode-image")
async def get_variant_barcode_image(
    variant_id: int,
    db: AsyncSession = Depends(get_db)
):
    """Get the barcode image for a variant."""
    result = await db.execute(
        select(ProductVariant).where(ProductVariant.id == variant_id)
    )
    variant = result.scalar_one_or_none()
    
    if not variant:
        raise HTTPException(status_code=404, detail="Variant not found")
    
    if not variant.barcode:
        raise HTTPException(status_code=404, detail="Variant has no barcode")
    
    # Generate barcode image
    barcode_base64, _ = BarcodeGenerator.generate_barcode_image(variant.barcode)
    
    return {
        "barcode": variant.barcode,
        "barcode_image": barcode_base64,
        "variant_name": variant.name,
        "sku": variant.sku
    }


@router.post("/product/{product_id}", response_model=VariantResponse, status_code=status.HTTP_201_CREATED)
async def create_variant(
    product_id: int,
    data: VariantCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_admin_user)
):
    """Create a new variant for a product."""
    # Verify product exists
    product_result = await db.execute(
        select(Product).options(selectinload(Product.inventory)).where(Product.id == product_id)
    )
    product = product_result.scalar_one_or_none()
    
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    
    # Get existing variant count
    count_result = await db.execute(
        select(func.count(ProductVariant.id)).where(ProductVariant.product_id == product_id)
    )
    variant_count = count_result.scalar() or 0
    is_first_variant = variant_count == 0
    
    # For the FIRST variant (default), inherit product's SKU and barcode
    # This represents the "original" product configuration
    if is_first_variant and (data.is_default or not data.sku):
        sku = data.sku or product.sku  # Use product SKU for default variant
        barcode = data.barcode or product.barcode  # Use product barcode for default variant
        # Also inherit product's inventory quantity
        initial_qty = data.initial_quantity if data.initial_quantity > 0 else (product.inventory.quantity if product.inventory else 0)
        # Mark as default
        is_default = True
    else:
        # For additional variants, generate new SKU and barcode
        sku = data.sku
        if not sku:
            sku = f"{product.sku}-{generate_slug(data.name)}"
        
        barcode = data.barcode
        if not barcode:
            # Format: SPCV + product_id (6 digits) + variant number (3 digits)
            barcode = f"SPCV{product_id:06d}{variant_count + 1:03d}"
        
        initial_qty = data.initial_quantity
        is_default = data.is_default
    
    # Check for duplicate SKU (skip if using product's own SKU for first variant)
    if not (is_first_variant and sku == product.sku):
        existing = await db.execute(select(ProductVariant).where(ProductVariant.sku == sku))
        if existing.scalar_one_or_none():
            raise HTTPException(status_code=400, detail="Variant with this SKU already exists")
    
    # Check for duplicate barcode
    if barcode and not (is_first_variant and barcode == product.barcode):
        existing_barcode = await db.execute(select(ProductVariant).where(ProductVariant.barcode == barcode))
        if existing_barcode.scalar_one_or_none():
            raise HTTPException(status_code=400, detail="Variant with this barcode already exists")
    
    # If this is set as default, unset other defaults
    if is_default:
        await db.execute(
            update(ProductVariant)
            .where(ProductVariant.product_id == product_id)
            .values(is_default=False)
        )
    
    # Create variant
    variant = ProductVariant(
        product_id=product_id,
        name=data.name,
        sku=sku,
        barcode=barcode,
        options=data.options,
        price=data.price if data.price else (product.price if is_first_variant else None),
        cost_price=data.cost_price if data.cost_price else (product.cost_price if is_first_variant else None),
        compare_at_price=data.compare_at_price if data.compare_at_price else (product.compare_at_price if is_first_variant else None),
        is_active=data.is_active,
        is_default=is_default,
        sort_order=data.sort_order
    )
    
    db.add(variant)
    await db.flush()
    
    # Create inventory record with proper initial quantity
    inventory = VariantInventory(
        variant_id=variant.id,
        quantity=initial_qty
    )
    db.add(inventory)
    
    await db.commit()
    await db.refresh(variant)
    
    # Reload with relationships
    result = await db.execute(
        select(ProductVariant)
        .options(
            selectinload(ProductVariant.images),
            selectinload(ProductVariant.inventory)
        )
        .where(ProductVariant.id == variant.id)
    )
    variant = result.scalar_one()
    
    return VariantResponse(
        id=variant.id,
        uuid=variant.uuid,
        product_id=variant.product_id,
        name=variant.name,
        sku=variant.sku,
        barcode=variant.barcode,
        options=variant.options or {},
        price=variant.price,
        cost_price=variant.cost_price,
        compare_at_price=variant.compare_at_price,
        is_active=variant.is_active,
        is_default=variant.is_default,
        sort_order=variant.sort_order,
        images=[],
        inventory=VariantInventoryInfo(
            quantity=variant.inventory.quantity,
            reserved_quantity=variant.inventory.reserved_quantity,
            available_quantity=variant.inventory.available_quantity,
            is_in_stock=variant.inventory.is_in_stock,
            is_low_stock=variant.inventory.is_low_stock,
            low_stock_threshold=variant.inventory.low_stock_threshold
        ) if variant.inventory else None,
        created_at=variant.created_at,
        updated_at=variant.updated_at
    )


@router.put("/{variant_id}", response_model=VariantResponse)
async def update_variant(
    variant_id: int,
    data: VariantUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_admin_user)
):
    """Update a variant."""
    result = await db.execute(
        select(ProductVariant)
        .options(
            selectinload(ProductVariant.images),
            selectinload(ProductVariant.inventory)
        )
        .where(ProductVariant.id == variant_id)
    )
    variant = result.scalar_one_or_none()
    
    if not variant:
        raise HTTPException(status_code=404, detail="Variant not found")
    
    # If setting as default, unset other defaults
    if data.is_default:
        await db.execute(
            update(ProductVariant)
            .where(ProductVariant.product_id == variant.product_id)
            .where(ProductVariant.id != variant_id)
            .values(is_default=False)
        )
    
    # Update fields
    update_data = data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(variant, field, value)
    
    await db.commit()
    await db.refresh(variant)
    
    return VariantResponse(
        id=variant.id,
        uuid=variant.uuid,
        product_id=variant.product_id,
        name=variant.name,
        sku=variant.sku,
        barcode=variant.barcode,
        options=variant.options or {},
        price=variant.price,
        cost_price=variant.cost_price,
        compare_at_price=variant.compare_at_price,
        is_active=variant.is_active,
        is_default=variant.is_default,
        sort_order=variant.sort_order,
        images=[VariantImageResponse.model_validate(img) for img in variant.images],
        inventory=VariantInventoryInfo(
            quantity=variant.inventory.quantity,
            reserved_quantity=variant.inventory.reserved_quantity,
            available_quantity=variant.inventory.available_quantity,
            is_in_stock=variant.inventory.is_in_stock,
            is_low_stock=variant.inventory.is_low_stock,
            low_stock_threshold=variant.inventory.low_stock_threshold
        ) if variant.inventory else None,
        created_at=variant.created_at,
        updated_at=variant.updated_at
    )


@router.delete("/{variant_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_variant(
    variant_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_admin_user)
):
    """Delete a variant."""
    result = await db.execute(select(ProductVariant).where(ProductVariant.id == variant_id))
    variant = result.scalar_one_or_none()
    
    if not variant:
        raise HTTPException(status_code=404, detail="Variant not found")
    
    await db.delete(variant)
    await db.commit()


# ============ Variant Images ============

@router.post("/{variant_id}/images", response_model=VariantImageResponse, status_code=status.HTTP_201_CREATED)
async def upload_variant_image(
    variant_id: int,
    data: VariantImageCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_admin_user)
):
    """Upload an image for a variant."""
    # Verify variant exists
    variant_result = await db.execute(select(ProductVariant).where(ProductVariant.id == variant_id))
    variant = variant_result.scalar_one_or_none()
    
    if not variant:
        raise HTTPException(status_code=404, detail="Variant not found")
    
    # Process image using storage service
    storage = get_image_storage()
    storage_info = await storage.process_base64_upload(
        data.image_data,
        data.filename,
        data.content_type
    )
    
    # If this is the first image or marked as primary, unset other primaries
    if data.is_primary:
        await db.execute(
            update(VariantImage)
            .where(VariantImage.variant_id == variant_id)
            .values(is_primary=False)
        )
    
    # Check if this is the first image
    existing_count = await db.execute(
        select(VariantImage.id).where(VariantImage.variant_id == variant_id)
    )
    is_first = len(existing_count.scalars().all()) == 0
    
    # Create image record
    image = VariantImage(
        variant_id=variant_id,
        filename=data.filename,
        content_type=data.content_type,
        image_data=storage_info.get("image_data", data.image_data),
        thumbnail_data=storage_info.get("thumbnail_data"),
        storage_type=storage_info.get("storage_type", "database"),
        storage_url=storage_info.get("storage_url"),
        width=storage_info.get("width"),
        height=storage_info.get("height"),
        file_size=storage_info.get("file_size"),
        alt_text=data.alt_text or variant.name,
        is_primary=data.is_primary or is_first,
        sort_order=data.sort_order,
    )
    
    db.add(image)
    await db.commit()
    await db.refresh(image)
    
    return VariantImageResponse.model_validate(image)


@router.delete("/{variant_id}/images/{image_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_variant_image(
    variant_id: int,
    image_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_admin_user)
):
    """Delete a variant image."""
    result = await db.execute(
        select(VariantImage)
        .where(VariantImage.id == image_id)
        .where(VariantImage.variant_id == variant_id)
    )
    image = result.scalar_one_or_none()
    
    if not image:
        raise HTTPException(status_code=404, detail="Image not found")
    
    await db.delete(image)
    await db.commit()


# ============ Variant Options (Templates) ============

@router.get("/options/", response_model=List[VariantOptionResponse])
async def get_variant_options(
    db: AsyncSession = Depends(get_db)
):
    """Get all variant option templates."""
    result = await db.execute(
        select(VariantOption).order_by(VariantOption.sort_order)
    )
    return [VariantOptionResponse.model_validate(opt) for opt in result.scalars().all()]


@router.post("/options/", response_model=VariantOptionResponse, status_code=status.HTTP_201_CREATED)
async def create_variant_option(
    data: VariantOptionCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_admin_user)
):
    """Create a new variant option template."""
    slug = generate_slug(data.name)
    
    # Check for duplicate
    existing = await db.execute(select(VariantOption).where(VariantOption.slug == slug))
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Variant option with this name already exists")
    
    option = VariantOption(
        name=data.name,
        slug=slug,
        values=data.values,
        display_type=data.display_type,
        sort_order=data.sort_order
    )
    
    db.add(option)
    await db.commit()
    await db.refresh(option)
    
    return VariantOptionResponse.model_validate(option)


@router.put("/options/{option_id}", response_model=VariantOptionResponse)
async def update_variant_option(
    option_id: int,
    data: VariantOptionUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_admin_user)
):
    """Update a variant option template."""
    result = await db.execute(select(VariantOption).where(VariantOption.id == option_id))
    option = result.scalar_one_or_none()
    
    if not option:
        raise HTTPException(status_code=404, detail="Variant option not found")
    
    update_data = data.model_dump(exclude_unset=True)
    
    # Update slug if name changes
    if "name" in update_data:
        update_data["slug"] = generate_slug(update_data["name"])
    
    for field, value in update_data.items():
        setattr(option, field, value)
    
    await db.commit()
    await db.refresh(option)
    
    return VariantOptionResponse.model_validate(option)


@router.delete("/options/{option_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_variant_option(
    option_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_admin_user)
):
    """Delete a variant option template."""
    result = await db.execute(select(VariantOption).where(VariantOption.id == option_id))
    option = result.scalar_one_or_none()
    
    if not option:
        raise HTTPException(status_code=404, detail="Variant option not found")
    
    await db.delete(option)
    await db.commit()


# ============ Variant Inventory ============

@router.put("/{variant_id}/inventory", response_model=VariantInventoryInfo)
async def update_variant_inventory(
    variant_id: int,
    quantity: int = Query(..., ge=0),
    adjustment_type: str = Query("set", pattern="^(set|add|remove)$"),
    reason: Optional[str] = Query(None, description="Reason for adjustment"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_admin_user)
):
    """Update variant inventory."""
    result = await db.execute(
        select(VariantInventory).where(VariantInventory.variant_id == variant_id)
    )
    inventory = result.scalar_one_or_none()
    
    if not inventory:
        raise HTTPException(status_code=404, detail="Variant inventory not found")
    
    # Store old quantity for logging
    old_quantity = inventory.quantity
    
    if adjustment_type == "set":
        inventory.quantity = quantity
    elif adjustment_type == "add":
        inventory.quantity += quantity
    elif adjustment_type == "remove":
        inventory.quantity = max(0, inventory.quantity - quantity)
    
    new_quantity = inventory.quantity
    quantity_change = new_quantity - old_quantity
    
    # Create inventory log entry if quantity changed
    if quantity_change != 0:
        log = VariantInventoryLog(
            variant_inventory_id=inventory.id,
            action=adjustment_type,
            quantity_change=quantity_change,
            quantity_before=old_quantity,
            quantity_after=new_quantity,
            reason=reason or f"Manual {adjustment_type} adjustment",
            user_id=current_user.id,
        )
        db.add(log)
    
    await db.commit()
    await db.refresh(inventory)
    
    return VariantInventoryInfo(
        quantity=inventory.quantity,
        reserved_quantity=inventory.reserved_quantity,
        available_quantity=inventory.available_quantity,
        is_in_stock=inventory.is_in_stock,
        is_low_stock=inventory.is_low_stock,
        low_stock_threshold=inventory.low_stock_threshold
    )
