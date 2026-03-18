"""
Shiprocket custom catalog sync (push).

Shiprocket endpoints (per SRC Custom Integration / checkout-api):
- POST /wh/v1/custom/product
- POST /wh/v1/custom/collection

These are different from our current pull-based endpoints:
- GET /external/products
- GET /external/collections
"""

from __future__ import annotations

import base64
import hashlib
import hmac
import json
import logging
from typing import Any, Dict, Optional

import httpx
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from app.config import settings
from app.models.category import Category
from app.models.product import Product
from app.models.variant import ProductVariant

# Reuse the exact mapping/payload rules already implemented for the pull API.
# This ensures variant fallback + quantity non-zero logic stays consistent.
from app.api.external_catalog import _product_to_external_dict

logger = logging.getLogger(__name__)


def _canonical_json_bytes(body: Dict[str, Any]) -> bytes:
    # Shiprocket signature examples expect HMAC-SHA256 of the raw JSON body bytes.
    # We must ensure we sign the *exact* body we send over the wire.
    return json.dumps(body, separators=(",", ":"), ensure_ascii=False).encode("utf-8")


def _shiprocket_catalog_auth_headers(body_bytes: bytes) -> Dict[str, str]:
    if not settings.SHIPROCKET_CHECKOUT_API_KEY or not settings.SHIPROCKET_CHECKOUT_SECRET_KEY:
        raise ValueError("Shiprocket custom catalog credentials not configured")

    sig_bytes = hmac.new(
        settings.SHIPROCKET_CHECKOUT_SECRET_KEY.encode("utf-8"),
        body_bytes,
        hashlib.sha256,
    ).digest()
    signature_b64 = base64.b64encode(sig_bytes).decode("ascii")

    return {
        "X-Api-Key": settings.SHIPROCKET_CHECKOUT_API_KEY,
        "X-Api-HMAC-SHA256": signature_b64,
    }


async def _post_custom_catalog(path: str, payload: Dict[str, Any]) -> Dict[str, Any]:
    if not settings.SHIPROCKET_CUSTOM_CATALOG_BASE_URL:
        raise ValueError("Shiprocket custom catalog base URL not configured")

    url = f"{settings.SHIPROCKET_CUSTOM_CATALOG_BASE_URL.rstrip('/')}{path}"
    body_bytes = _canonical_json_bytes(payload)
    headers = _shiprocket_catalog_auth_headers(body_bytes)

    async with httpx.AsyncClient() as client:
        r = await client.post(
            url,
            content=body_bytes,
            headers={**headers, "Content-Type": "application/json"},
            timeout=30.0,
        )
        if r.status_code >= 400:
            # Include response body for easier debugging (HMAC mismatch, payload mismatch, etc.)
            raise RuntimeError(
                f"Shiprocket custom catalog request failed status={r.status_code} url={url} body={r.text[:500]}"
            )
        return r.json() if r.content else {}


async def sync_shiprocket_custom_product(db: AsyncSession, product_id: int) -> Optional[Dict[str, Any]]:
    """
    Push a single product to Shiprocket (wh/v1/custom/product).
    Payload mapping reuses `app.api.external_catalog._product_to_external_dict`.
    """
    if not settings.SHIPROCKET_CUSTOM_CATALOG_ENABLED:
        return None

    # Fetch with the relationships needed to build the payload.
    result = await db.execute(
        select(Product)
        .options(
            selectinload(Product.category),
            selectinload(Product.brand),
            selectinload(Product.images),
            selectinload(Product.inventory),
            selectinload(Product.variants).selectinload(ProductVariant.images),
            selectinload(Product.variants).selectinload(ProductVariant.inventory),
        )
        .where(Product.id == product_id)
    )
    product: Optional[Product] = result.scalar_one_or_none()
    if not product:
        logger.warning("Shiprocket custom catalog: product not found product_id=%s", product_id)
        return None

    # `external_catalog` uses `BASE_URL` and chooses the primary variant image if present,
    # otherwise it falls back to the product image.
    primary_image_url: Optional[str] = None
    if product.images:
        img = next((img for img in product.images if img.is_primary), product.images[0])
        primary_image_url = f"{settings.PUBLIC_BASE_URL.rstrip('/')}/api/images/serve/{img.id}"

    payload = _product_to_external_dict(
        product=product,
        brand=product.brand,
        primary_image_src=primary_image_url,
        variants=product.variants or [],
    )

    try:
        return await _post_custom_catalog("/wh/v1/custom/product", payload)
    except Exception as e:
        logger.exception("Shiprocket custom catalog: failed syncing product_id=%s error=%s", product_id, e)
        return None


async def sync_shiprocket_custom_collection(db: AsyncSession, category_id: int) -> Optional[Dict[str, Any]]:
    """
    Push a single collection to Shiprocket (wh/v1/custom/collection).
    """
    if not settings.SHIPROCKET_CUSTOM_CATALOG_ENABLED:
        return None

    result = await db.execute(select(Category).where(Category.id == category_id))
    category: Optional[Category] = result.scalar_one_or_none()
    if not category:
        logger.warning("Shiprocket custom catalog: category not found category_id=%s", category_id)
        return None

    # Category images in our DB are base64-only; to avoid leaking base64, omit image in push payload.
    payload: Dict[str, Any] = {
        "id": category.id,
        "updated_at": category.updated_at.isoformat() if category.updated_at else None,
        "body_html": category.description or "",
        "handle": category.slug,
        "image": None,
        "title": category.name,
        "created_at": category.created_at.isoformat() if category.created_at else None,
    }

    try:
        return await _post_custom_catalog("/wh/v1/custom/collection", payload)
    except Exception as e:
        logger.exception(
            "Shiprocket custom catalog: failed syncing category_id=%s error=%s", category_id, e
        )
        return None


async def sync_shiprocket_custom_product_and_collection(
    db: AsyncSession, product_id: int
) -> None:
    """
    Convenience helper: push product, and if it has a category, push the related collection.
    """
    await sync_shiprocket_custom_product(db, product_id)

    # We re-fetch collection id cheaply via product->category_id instead of relying on relationships here.
    result = await db.execute(select(Product.category_id).where(Product.id == product_id))
    category_id = result.scalar_one_or_none()
    if category_id:
        await sync_shiprocket_custom_collection(db, category_id)

