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
from app.models.variant import ProductVariant, VariantInventory
from app.config import settings


router = APIRouter()

# Base URL for building absolute image URLs for external consumers
BASE_URL = settings.PUBLIC_BASE_URL.rstrip("/")


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

    # Build product-level options from all variant option dicts
    option_values_map: Dict[str, set] = {}
    for v in variants:
        if v.options:
            for k, v_val in v.options.items():
                if not v_val:
                    continue
                option_values_map.setdefault(k, set()).add(str(v_val))

    options_list: List[Dict[str, Any]] = [
        {"name": name, "values": sorted(list(values))}
        for name, values in option_values_map.items()
    ]

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
        "options": options_list,
    }

    variant_items: List[Dict[str, Any]] = []
    for v in variants:
        price = v.price if v.price is not None else product.price
        compare_at_price = v.compare_at_price if getattr(v, "compare_at_price", None) is not None else product.compare_at_price

        grams = 0
        weight = 0.0
        weight_unit = "kg"

        # For external consumers we expose image URL, not raw base64.
        # Prefer variant's primary image if available, otherwise fall back to product-level image URL.
        v_primary_image_url: Optional[str] = None
        if v.images:
            img = next((img for img in v.images if img.is_primary), v.images[0])
            # Serve by image ID (absolute URL)
            v_primary_image_url = f"{BASE_URL}/api/images/serve/{img.id}"

        image_src = v_primary_image_url or primary_image_src

        # Quantity from variant inventory if available
        quantity = 0
        if getattr(v, "inventory", None):
            inv: VariantInventory = v.inventory
            quantity = getattr(inv, "available_quantity", None) or inv.quantity or 0

        variant_items.append(
            {
                "id": v.id,
                "title": v.name,
                "price": _decimal_to_str(price) or "0.00",
                "compare_at_price": _decimal_to_str(compare_at_price) if compare_at_price is not None else None,
                "sku": v.sku or product.sku,
                "created_at": v.created_at.isoformat() if getattr(v, "created_at", None) else None,
                "updated_at": v.updated_at.isoformat() if getattr(v, "updated_at", None) else None,
                "taxable": True,
                "grams": grams,
                "image": {"src": image_src} if image_src else None,
                "weight": weight,
                "weight_unit": weight_unit,
                "quantity": quantity,
                "option_values": v.options or {},
            }
        )

    out["variants"] = variant_items
    out["image"] = {"src": primary_image_src} if primary_image_src else None

    return out


@router.get("/external/products")
async def external_products(
    page: int = Query(0, ge=0, description="Zero-based page index expected by external integrations"),
    limit: Optional[int] = Query(
        None,
        ge=1,
        le=100,
        description="Items per page. If omitted, all products are returned.",
    ),
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
            selectinload(Product.variants)
            .selectinload(ProductVariant.images),
            selectinload(Product.variants)
            .selectinload(ProductVariant.inventory),
        )
        .where(Product.is_active == True)
    )

    total_result = await db.execute(
        select(func.count(Product.id)).where(Product.is_active == True)
    )
    total = total_result.scalar() or 0

    # Pagination only when limit is provided. If limit is None, return all.
    if limit is not None:
        offset = (internal_page - 1) * limit
        query = base_query.offset(offset).limit(limit)
    else:
        query = base_query
    result = await db.execute(query)
    products = result.scalars().unique().all()

    items: List[Dict[str, Any]] = []
    for p in products:
        # For external consumers we expose a URL that serves the binary image.
        primary_image_url: Optional[str] = None
        if p.images:
            img = next((img for img in p.images if img.is_primary), p.images[0])
            primary_image_url = f"{BASE_URL}/api/images/serve/{img.id}"

        items.append(
            _product_to_external_dict(
                product=p,
                brand=p.brand,
                primary_image_src=primary_image_url,
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
        # Collection images are currently stored as base64 only; no stable URL,
        # so we omit image.src to avoid leaking raw data.
        image_src = None
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
            selectinload(Product.variants)
            .selectinload(ProductVariant.images),
            selectinload(Product.variants)
            .selectinload(ProductVariant.inventory),
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
        primary_image_url: Optional[str] = None
        if p.images:
            img = next((img for img in p.images if img.is_primary), p.images[0])
            primary_image_url = f"{BASE_URL}/api/images/serve/{img.id}"

        items.append(
            _product_to_external_dict(
                product=p,
                brand=p.brand,
                primary_image_src=primary_image_url,
                variants=p.variants or [],
            )
        )

    return {
        "data": {
            "total": total,
            "products": items,
        }
    }

