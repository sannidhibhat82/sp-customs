"""
Images API - Product image upload and management.
"""
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query, UploadFile, File, Form
from fastapi.responses import Response
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update
import base64

from app.database import get_db
from app.models.product import Product, ProductImage
from app.schemas.product import ProductImageCreate, ProductImageResponse
from app.services.auth import get_admin_user, get_current_user
from app.services.image_storage import get_image_storage
from app.services.event_service import EventService
from app.models.user import User

router = APIRouter()


@router.get("/product/{product_id}", response_model=List[ProductImageResponse])
async def get_product_images(
    product_id: int,
    db: AsyncSession = Depends(get_db)
):
    """Get all images for a product."""
    result = await db.execute(
        select(ProductImage)
        .where(ProductImage.product_id == product_id)
        .order_by(ProductImage.sort_order)
    )
    images = result.scalars().all()
    
    return [ProductImageResponse.model_validate(img) for img in images]


@router.post("/product/{product_id}", response_model=ProductImageResponse, status_code=status.HTTP_201_CREATED)
async def upload_product_image(
    product_id: int,
    data: ProductImageCreate,
    db: AsyncSession = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user)
):
    """
    Upload an image for a product (Base64).
    Can be called from mobile or desktop.
    """
    # Verify product exists
    product_result = await db.execute(select(Product).where(Product.id == product_id))
    product = product_result.scalar_one_or_none()
    
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    
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
            update(ProductImage)
            .where(ProductImage.product_id == product_id)
            .values(is_primary=False)
        )
    
    # Check if this is the first image
    existing_count = await db.execute(
        select(ProductImage.id).where(ProductImage.product_id == product_id)
    )
    is_first = len(existing_count.scalars().all()) == 0
    
    # Create image record
    image = ProductImage(
        product_id=product_id,
        filename=data.filename,
        content_type=data.content_type,
        image_data=storage_info.get("image_data", data.image_data),
        thumbnail_data=storage_info.get("thumbnail_data"),
        storage_type=storage_info.get("storage_type", "database"),
        storage_url=storage_info.get("storage_url"),
        width=storage_info.get("width"),
        height=storage_info.get("height"),
        file_size=storage_info.get("file_size"),
        alt_text=data.alt_text or product.name,
        is_primary=data.is_primary or is_first,  # First image is primary by default
        sort_order=data.sort_order,
    )
    
    db.add(image)
    await db.flush()
    
    # Log event
    await EventService.log_image_uploaded(
        db=db,
        product_id=product_id,
        image_id=image.id,
        image_uuid=image.uuid,
        user_id=current_user.id if current_user else None,
    )
    
    await db.commit()
    await db.refresh(image)
    
    return ProductImageResponse.model_validate(image)


@router.post("/product/{product_id}/upload", response_model=ProductImageResponse, status_code=status.HTTP_201_CREATED)
async def upload_product_image_file(
    product_id: int,
    file: UploadFile = File(...),
    is_primary: bool = Form(False),
    alt_text: Optional[str] = Form(None),
    db: AsyncSession = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user)
):
    """
    Upload an image file directly (multipart form).
    Useful for mobile camera uploads.
    """
    # Verify product exists
    product_result = await db.execute(select(Product).where(Product.id == product_id))
    product = product_result.scalar_one_or_none()
    
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    
    # Validate file type
    allowed_types = ["image/jpeg", "image/png", "image/webp", "image/gif"]
    if file.content_type not in allowed_types:
        raise HTTPException(
            status_code=400, 
            detail=f"Invalid file type. Allowed: {', '.join(allowed_types)}"
        )
    
    # Read file contents
    contents = await file.read()
    
    # Process image using storage service
    storage = get_image_storage()
    storage_info = await storage.store_image(contents, file.filename, file.content_type)
    
    # If this is primary, unset other primaries
    if is_primary:
        await db.execute(
            update(ProductImage)
            .where(ProductImage.product_id == product_id)
            .values(is_primary=False)
        )
    
    # Check if first image
    existing_count = await db.execute(
        select(ProductImage.id).where(ProductImage.product_id == product_id)
    )
    is_first = len(existing_count.scalars().all()) == 0
    
    # Create image record
    image = ProductImage(
        product_id=product_id,
        filename=file.filename,
        content_type=file.content_type,
        image_data=storage_info.get("image_data"),
        thumbnail_data=storage_info.get("thumbnail_data"),
        storage_type=storage_info.get("storage_type", "database"),
        storage_url=storage_info.get("storage_url"),
        width=storage_info.get("width"),
        height=storage_info.get("height"),
        file_size=storage_info.get("file_size"),
        alt_text=alt_text or product.name,
        is_primary=is_primary or is_first,
        sort_order=0,
    )
    
    db.add(image)
    await db.flush()
    
    await EventService.log_image_uploaded(
        db=db,
        product_id=product_id,
        image_id=image.id,
        image_uuid=image.uuid,
        user_id=current_user.id if current_user else None,
        device_type="mobile" if "Mobile" in (current_user.avatar_data or "") else "desktop",
    )
    
    await db.commit()
    await db.refresh(image)
    
    return ProductImageResponse.model_validate(image)


@router.put("/{image_id}", response_model=ProductImageResponse)
async def update_image(
    image_id: int,
    alt_text: Optional[str] = None,
    is_primary: Optional[bool] = None,
    sort_order: Optional[int] = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_admin_user)
):
    """Update image metadata."""
    result = await db.execute(select(ProductImage).where(ProductImage.id == image_id))
    image = result.scalar_one_or_none()
    
    if not image:
        raise HTTPException(status_code=404, detail="Image not found")
    
    if alt_text is not None:
        image.alt_text = alt_text
    
    if sort_order is not None:
        image.sort_order = sort_order
    
    if is_primary is not None and is_primary:
        # Unset other primaries
        await db.execute(
            update(ProductImage)
            .where(ProductImage.product_id == image.product_id, ProductImage.id != image_id)
            .values(is_primary=False)
        )
        image.is_primary = True
    
    await db.commit()
    await db.refresh(image)
    
    return ProductImageResponse.model_validate(image)


@router.delete("/product/{product_id}/{image_id}")
async def delete_product_image(
    product_id: int,
    image_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_admin_user)
):
    """Delete a product image by product and image ID."""
    result = await db.execute(
        select(ProductImage)
        .where(ProductImage.id == image_id, ProductImage.product_id == product_id)
    )
    image = result.scalar_one_or_none()
    
    if not image:
        raise HTTPException(status_code=404, detail="Image not found")
    
    was_primary = image.is_primary
    
    # Delete from storage if needed
    storage = get_image_storage()
    await storage.delete_image({
        "storage_type": image.storage_type,
        "storage_url": image.storage_url,
    })
    
    await EventService.log_event(
        db=db,
        event_type="image_deleted",
        entity_type="image",
        entity_id=image.id,
        entity_uuid=image.uuid,
        data={"product_id": product_id},
        user_id=current_user.id,
    )
    
    await db.delete(image)
    
    # If deleted image was primary, set another as primary
    if was_primary:
        next_image_result = await db.execute(
            select(ProductImage)
            .where(ProductImage.product_id == product_id)
            .order_by(ProductImage.sort_order)
            .limit(1)
        )
        next_image = next_image_result.scalar_one_or_none()
        if next_image:
            next_image.is_primary = True
    
    await db.commit()
    
    return {"message": "Image deleted successfully"}


@router.put("/product/{product_id}/{image_id}/primary")
async def set_primary_image(
    product_id: int,
    image_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_admin_user)
):
    """Set an image as the primary image for a product."""
    result = await db.execute(
        select(ProductImage)
        .where(ProductImage.id == image_id, ProductImage.product_id == product_id)
    )
    image = result.scalar_one_or_none()
    
    if not image:
        raise HTTPException(status_code=404, detail="Image not found")
    
    # Unset other primaries
    await db.execute(
        update(ProductImage)
        .where(ProductImage.product_id == product_id)
        .values(is_primary=False)
    )
    
    # Set this one as primary
    image.is_primary = True
    
    await db.commit()
    await db.refresh(image)
    
    return ProductImageResponse.model_validate(image)


@router.delete("/{image_id}")
async def delete_image(
    image_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_admin_user)
):
    """Delete a product image."""
    result = await db.execute(select(ProductImage).where(ProductImage.id == image_id))
    image = result.scalar_one_or_none()
    
    if not image:
        raise HTTPException(status_code=404, detail="Image not found")
    
    product_id = image.product_id
    was_primary = image.is_primary
    
    # Delete from storage if needed
    storage = get_image_storage()
    await storage.delete_image({
        "storage_type": image.storage_type,
        "storage_url": image.storage_url,
    })
    
    await EventService.log_event(
        db=db,
        event_type="image_deleted",
        entity_type="image",
        entity_id=image.id,
        entity_uuid=image.uuid,
        data={"product_id": product_id},
        user_id=current_user.id,
    )
    
    await db.delete(image)
    
    # If deleted image was primary, set another as primary
    if was_primary:
        next_image_result = await db.execute(
            select(ProductImage)
            .where(ProductImage.product_id == product_id)
            .order_by(ProductImage.sort_order)
            .limit(1)
        )
        next_image = next_image_result.scalar_one_or_none()
        if next_image:
            next_image.is_primary = True
    
    await db.commit()
    
    return {"message": "Image deleted successfully"}


@router.post("/reorder")
async def reorder_images(
    order: List[dict],  # [{"id": 1, "sort_order": 0}, ...]
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_admin_user)
):
    """Reorder images for a product."""
    for item in order:
        await db.execute(
            update(ProductImage)
            .where(ProductImage.id == item["id"])
            .values(sort_order=item["sort_order"])
        )
    
    await db.commit()
    return {"message": "Images reordered successfully"}


@router.get("/serve/product/{product_id}")
async def serve_product_image(
    product_id: int,
    db: AsyncSession = Depends(get_db)
):
    """
    Serve the primary product image as an actual image file.
    This is used for Open Graph previews (WhatsApp, Facebook, etc.)
    """
    # Get product's primary image
    result = await db.execute(
        select(ProductImage)
        .where(ProductImage.product_id == product_id)
        .order_by(ProductImage.sort_order)
        .limit(1)
    )
    image = result.scalar_one_or_none()
    
    if not image or not image.image_data:
        raise HTTPException(status_code=404, detail="Image not found")
    
    # Decode base64 image data
    image_data = image.image_data
    
    # Remove data URL prefix if present
    if image_data.startswith('data:'):
        # Extract the base64 part after the comma
        image_data = image_data.split(',', 1)[1] if ',' in image_data else image_data
    
    try:
        image_bytes = base64.b64decode(image_data)
    except Exception:
        raise HTTPException(status_code=500, detail="Failed to decode image")
    
    # Determine content type from image data
    content_type = "image/png"  # default
    if image.content_type:
        content_type = image.content_type
    elif image_data.startswith('/9j/'):
        content_type = "image/jpeg"
    elif image_data.startswith('iVBOR'):
        content_type = "image/png"
    elif image_data.startswith('R0lGO'):
        content_type = "image/gif"
    elif image_data.startswith('UklGR'):
        content_type = "image/webp"
    
    return Response(
        content=image_bytes,
        media_type=content_type,
        headers={
            "Cache-Control": "public, max-age=86400",  # Cache for 24 hours
        }
    )


@router.get("/serve/{image_id}")
async def serve_image_by_id(
    image_id: int,
    db: AsyncSession = Depends(get_db)
):
    """
    Serve a specific image by ID as an actual image file.
    """
    result = await db.execute(
        select(ProductImage).where(ProductImage.id == image_id)
    )
    image = result.scalar_one_or_none()
    
    if not image or not image.image_data:
        raise HTTPException(status_code=404, detail="Image not found")
    
    # Decode base64 image data
    image_data = image.image_data
    
    # Remove data URL prefix if present
    if image_data.startswith('data:'):
        image_data = image_data.split(',', 1)[1] if ',' in image_data else image_data
    
    try:
        image_bytes = base64.b64decode(image_data)
    except Exception:
        raise HTTPException(status_code=500, detail="Failed to decode image")
    
    content_type = image.content_type or "image/png"
    
    return Response(
        content=image_bytes,
        media_type=content_type,
        headers={
            "Cache-Control": "public, max-age=86400",
        }
    )

