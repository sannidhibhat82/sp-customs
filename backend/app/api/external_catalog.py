"""
External catalog integration APIs.

Separate, read-only endpoints that expose products and collections
in the JSON structure expected by external checkouts (used for Shiprocket
integration), without altering existing core APIs.
"""
from typing import List, Optional, Dict, Any
from decimal import Decimal

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from sqlalchemy.orm import selectinload

from app.database import get_db
from app.models.product import Product
from app.models.category import Category
from app.models.brand import Brand
from app.models.variant import ProductVariant


router = APIRouter()


def _decimal_to_str(value: Optional[Decimal]) -> Optional[str]:
    if value is None:
        return None
    return f"{value:.2f}"


def _product_to_external_dict(
    product: Product,
    brand: Optional[Brand],
    primary_image_src: Optional[str],
    variants: List[ProductVariant],
) -> Dict[str, Any]:
    """
    Map internal Product + Variants to external catalog product schema.
    """
    tags_str = ", ".join(product.tags or [])

    out: Dict[str, Any] = {
        "id": product.id,
        "title": product.name,
        "body_html": product.description or "",
        "vendor": brand.name if brand else "",
        "product_type": product.category.name if product.category else "",
        "created_at": product.created_at.isoformat() if product.created_at else None,
        "handle": product.slug,
        "updated_at": product.updated_at.isoformat() if product.updated_at else None,
        "tags": tags_str,
        "status": "active" if product.is_active else "inactive",
    }

    variant_items: List[Dict[str, Any]] = []
    for v in variants:
        price = v.price if v.price is not None else product.price

        grams = 0
        weight = 0.0
        weight_unit = "kg"

        v_primary_image = None
        if v.images:
            img = next((img for img in v.images if img.is_primary), v.images[0])
            v_primary_image = img.image_data

        image_src = v_primary_image or primary_image_src

        variant_items.append(
            {
                "id": v.id,
                "title": v.name,
                "price": _decimal_to_str(price) or "0.00",
                "sku": v.sku or product.sku,
                "created_at": v.created_at.isoformat() if getattr(v, "created_at", None) else None,
                "updated_at": v.updated_at.isoformat() if getattr(v, "updated_at", None) else None,
                "taxable": True,
                "grams": grams,
                "image": {"src": image_src} if image_src else None,
                "weight": weight,
                "weight_unit": weight_unit,
            }
        )

    out["variants"] = variant_items
    out["image"] = {"src": primary_image_src} if primary_image_src else None

    return out


@router.get("/external/products")
async def external_products(
    page: int = Query(0, ge=0, description="Zero-based page index expected by external integrations"),
    limit: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
):
    """
    External catalog: get all products in simplified structure.

    Used for Shiprocket product sync.
    Example:
    GET /external/products?page=0&limit=2
    """
    internal_page = page + 1

    base_query = (
        select(Product)
        .options(
            selectinload(Product.category),
            selectinload(Product.brand),
            selectinload(Product.images),
            selectinload(Product.variants).selectinload(ProductVariant.images),
        )
        .where(Product.is_active == True)
    )

    total_result = await db.execute(
        select(func.count(Product.id)).where(Product.is_active == True)
    )
    total = total_result.scalar() or 0

    offset = (internal_page - 1) * limit
    query = base_query.offset(offset).limit(limit)
    result = await db.execute(query)
    products = result.scalars().unique().all()

    items: List[Dict[str, Any]] = []
    for p in products:
        primary_image = None
        if p.images:
            img = next((img for img in p.images if img.is_primary), p.images[0])
            primary_image = img.image_data

        items.append(
            _product_to_external_dict(
                product=p,
                brand=p.brand,
                primary_image_src=primary_image,
                variants=p.variants or [],
            )
        )

    return {
        "data": {
            "total": total,
            "products": items,
        }
    }


@router.get("/external/collections")
async def external_collections(
    page: int = Query(0, ge=0, description="Zero-based page index expected by external integrations"),
    limit: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
):
    """
    External catalog: get collections list (mapped from categories).

    Used for Shiprocket collection sync.
    Example:
    GET /external/collections?page=0&limit=2
    """
    internal_page = page + 1

    base_query = select(Category).where(Category.is_active == True)

    total_result = await db.execute(
        select(func.count(Category.id)).where(Category.is_active == True)
    )
    total = total_result.scalar() or 0

    offset = (internal_page - 1) * limit
    query = (
        base_query.order_by(Category.sort_order, Category.name)
        .offset(offset)
        .limit(limit)
    )
    result = await db.execute(query)
    categories = result.scalars().all()

    collections: List[Dict[str, Any]] = []
    for c in categories:
        image_src = c.image_data
        collections.append(
            {
                "id": c.id,
                "updated_at": c.updated_at.isoformat() if c.updated_at else None,
                "body_html": c.description or "",
                "handle": c.slug,
                "image": {"src": image_src} if image_src else None,
                "title": c.name,
                "created_at": c.created_at.isoformat() if c.created_at else None,
            }
        )

    return {
        "data": {
            "total": total,
            "collections": collections,
        }
    }


@router.get("/external/collections/{collection_id}/products")
async def external_products_by_collection(
    collection_id: int,
    page: int = Query(0, ge=0, description="Zero-based page index expected by external integrations"),
    limit: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
):
    """
    External catalog: get products by collection (mapped from category_id).

    Used for Shiprocket collection-wise product sync.
    Example:
    GET /external/collections/1234/products?page=0&limit=1
    """
    internal_page = page + 1

    base_query = (
        select(Product)
        .options(
            selectinload(Product.category),
            selectinload(Product.brand),
            selectinload(Product.images),
            selectinload(Product.variants).selectinload(ProductVariant.images),
        )
        .where(Product.is_active == True)
        .where(Product.category_id == collection_id)
    )

    total_result = await db.execute(
        select(func.count(Product.id))
        .where(Product.is_active == True)
        .where(Product.category_id == collection_id)
    )
    total = total_result.scalar() or 0

    offset = (internal_page - 1) * limit
    query = base_query.offset(offset).limit(limit)
    result = await db.execute(query)
    products = result.scalars().unique().all()

    items: List[Dict[str, Any]] = []
    for p in products:
        primary_image = None
        if p.images:
            img = next((img for img in p.images if img.is_primary), p.images[0])
            primary_image = img.image_data

        items.append(
            _product_to_external_dict(
                product=p,
                brand=p.brand,
                primary_image_src=primary_image,
                variants=p.variants or [],
            )
        )

    return {
        "data": {
            "total": total,
            "products": items,
        }
    }

