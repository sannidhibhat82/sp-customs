"""
Cart API - Book Now flow.
Supports guest (guest_session_id) and logged-in user.
Inventory is NOT modified; deduction happens on order placement after payment.
"""
from decimal import Decimal
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from app.database import get_db
from app.models.cart import Cart, CartItem
from app.models.product import Product
from app.models.variant import ProductVariant
from app.schemas.cart import (
    CartItemCreate,
    CartItemUpdate,
    CartItemResponse,
    CartResponse,
)
from app.services.auth import get_current_user
from app.models.user import User

router = APIRouter()


def _cart_selector():
    return select(Cart).options(
        selectinload(Cart.items).selectinload(CartItem.product),
        selectinload(Cart.items).selectinload(CartItem.variant),
    )


async def _get_or_create_cart(
    db: AsyncSession,
    user_id: Optional[int],
    guest_session_id: Optional[str],
) -> Cart:
    """Get active cart for user or guest, or create one."""
    carts = []
    if user_id:
        # Logged-in flow: include both user carts and guest-session carts so
        # post-login checkout can seamlessly continue with items added before login.
        result = await db.execute(
            _cart_selector()
            .where(Cart.user_id == user_id, Cart.status == "active")
            .order_by(Cart.updated_at.desc(), Cart.id.desc())
        )
        user_carts = result.scalars().unique().all()

        guest_carts = []
        if guest_session_id:
            guest_result = await db.execute(
                _cart_selector()
                .where(Cart.guest_session_id == guest_session_id, Cart.status == "active")
                .order_by(Cart.updated_at.desc(), Cart.id.desc())
            )
            guest_carts = guest_result.scalars().unique().all()

        carts = user_carts + [c for c in guest_carts if c.id not in {uc.id for uc in user_carts}]
        carts.sort(key=lambda c: (c.updated_at or c.created_at, c.id), reverse=True)
    elif guest_session_id:
        result = await db.execute(
            _cart_selector().where(
                Cart.guest_session_id == guest_session_id,
                Cart.status == "active",
            ).order_by(Cart.updated_at.desc(), Cart.id.desc())
        )
        carts = result.scalars().unique().all()
    else:
        raise HTTPException(status_code=400, detail="Provide Authorization or X-Guest-Session-Id")

    if carts:
        # Data hygiene: if duplicate active carts exist, merge all items into the newest cart
        # and archive the duplicates so future lookups are stable.
        primary = carts[0]
        if user_id and primary.user_id is None:
            primary.user_id = user_id
        if guest_session_id and not primary.guest_session_id:
            primary.guest_session_id = guest_session_id
        if len(carts) > 1:
            merged: dict[tuple[int, Optional[int]], CartItem] = {}
            for item in primary.items:
                merged[(item.product_id, item.variant_id)] = item

            for duplicate in carts[1:]:
                if user_id and duplicate.user_id is None:
                    duplicate.user_id = user_id
                for item in duplicate.items:
                    key = (item.product_id, item.variant_id)
                    existing = merged.get(key)
                    if existing:
                        existing.quantity += item.quantity
                        # Keep latest snapshot if available
                        if item.price_snapshot:
                            existing.price_snapshot = item.price_snapshot
                        await db.delete(item)
                    else:
                        item.cart_id = primary.id
                        merged[key] = item
                duplicate.status = "converted"
            await db.flush()

        return primary

    cart = Cart(user_id=user_id, guest_session_id=guest_session_id, status="active")
    db.add(cart)
    await db.flush()
    await db.refresh(cart)
    result = await db.execute(_cart_selector().where(Cart.id == cart.id))
    return result.scalar_one()


def _cart_item_to_response(item: CartItem) -> CartItemResponse:
    unit_price = None
    if item.price_snapshot and isinstance(item.price_snapshot.get("unit_price"), (int, float, str)):
        try:
            unit_price = Decimal(str(item.price_snapshot["unit_price"]))
        except Exception:
            pass
    product = item.product
    variant = item.variant
    product_name = product.name if product else None
    product_sku = product.sku if product else None
    product_slug = getattr(product, "slug", None) if product else None
    variant_name = variant.name if variant else None
    # Avoid lazy load in async context: only use eagerly loaded data (image_data left None here)
    image_data = None
    return CartItemResponse(
        id=item.id,
        uuid=item.uuid,
        cart_id=item.cart_id,
        product_id=item.product_id,
        variant_id=item.variant_id,
        quantity=item.quantity,
        price_snapshot=item.price_snapshot or {},
        created_at=item.created_at,
        product_name=product_name,
        product_sku=product_sku,
        product_slug=product_slug,
        variant_name=variant_name,
        unit_price=unit_price,
        image_data=image_data,
    )


@router.get("", response_model=CartResponse)
async def get_cart(
    guest_session_id: Optional[str] = Query(None, alias="guest_session_id"),
    db: AsyncSession = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user),
):
    """Get current cart (by user or guest_session_id)."""
    user_id = current_user.id if current_user else None
    if not user_id and not guest_session_id:
        raise HTTPException(status_code=400, detail="Provide Authorization or guest_session_id query param")
    cart = await _get_or_create_cart(db, user_id, guest_session_id)
    items_resp = [_cart_item_to_response(i) for i in cart.items]
    subtotal = Decimal(0)
    for i in cart.items:
        snap = i.price_snapshot or {}
        up = snap.get("unit_price")
        if up is not None:
            try:
                subtotal += Decimal(str(up)) * i.quantity
            except Exception:
                pass
    return CartResponse(
        id=cart.id,
        uuid=cart.uuid,
        user_id=cart.user_id,
        guest_session_id=cart.guest_session_id,
        status=cart.status,
        items=items_resp,
        item_count=len(items_resp),
        subtotal=subtotal,
        created_at=cart.created_at,
        updated_at=cart.updated_at,
    )


@router.post("/items", response_model=CartResponse)
async def add_to_cart(
    body: CartItemCreate,
    guest_session_id: Optional[str] = Query(None, alias="guest_session_id"),
    db: AsyncSession = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user),
):
    """Add item to cart. Locks unit price at current product/variant price."""
    user_id = current_user.id if current_user else None
    if not user_id and not guest_session_id:
        raise HTTPException(status_code=400, detail="Provide Authorization or guest_session_id")
    cart = await _get_or_create_cart(db, user_id, guest_session_id)

    # Resolve product and price
    product_result = await db.execute(
        select(Product).where(Product.id == body.product_id)
    )
    product = product_result.scalar_one_or_none()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    unit_price = product.price or Decimal(0)
    sku = product.sku
    variant_name = None
    if body.variant_id:
        var_result = await db.execute(
            select(ProductVariant).where(
                ProductVariant.id == body.variant_id,
                ProductVariant.product_id == product.id,
            )
        )
        variant = var_result.scalar_one_or_none()
        if not variant:
            raise HTTPException(status_code=404, detail="Variant not found")
        if variant.price is not None:
            unit_price = variant.price
        sku = variant.sku or sku
        variant_name = variant.name

    # Existing line for same product+variant?
    for item in cart.items:
        if item.product_id == body.product_id and item.variant_id == body.variant_id:
            item.quantity += body.quantity
            item.price_snapshot = {"unit_price": str(unit_price), "currency": "INR"}
            await db.flush()
            result = await db.execute(
                _cart_selector().where(Cart.id == cart.id).execution_options(populate_existing=True)
            )
            cart = result.scalar_one()
            items_resp = [_cart_item_to_response(i) for i in cart.items]
            subtotal = Decimal(0)
            for i in cart.items:
                snap = i.price_snapshot or {}
                up = snap.get("unit_price")
                if up is not None:
                    try:
                        subtotal += Decimal(str(up)) * i.quantity
                    except Exception:
                        pass
            return CartResponse(
                id=cart.id,
                uuid=cart.uuid,
                user_id=cart.user_id,
                guest_session_id=cart.guest_session_id,
                status=cart.status,
                items=items_resp,
                item_count=len(items_resp),
                subtotal=subtotal,
                created_at=cart.created_at,
                updated_at=cart.updated_at,
            )

    cart_item = CartItem(
        cart_id=cart.id,
        product_id=body.product_id,
        variant_id=body.variant_id,
        quantity=body.quantity,
        price_snapshot={"unit_price": str(unit_price), "currency": "INR"},
    )
    db.add(cart_item)
    await db.flush()
    # Reload cart with items (populate_existing so we see the new item)
    result = await db.execute(
        _cart_selector().where(Cart.id == cart.id).execution_options(populate_existing=True)
    )
    cart = result.scalar_one()
    items_resp = [_cart_item_to_response(i) for i in cart.items]
    subtotal = Decimal(0)
    for i in cart.items:
        snap = i.price_snapshot or {}
        up = snap.get("unit_price")
        if up is not None:
            try:
                subtotal += Decimal(str(up)) * i.quantity
            except Exception:
                pass
    return CartResponse(
        id=cart.id,
        uuid=cart.uuid,
        user_id=cart.user_id,
        guest_session_id=cart.guest_session_id,
        status=cart.status,
        items=items_resp,
        item_count=len(items_resp),
        subtotal=subtotal,
        created_at=cart.created_at,
        updated_at=cart.updated_at,
    )


@router.put("/items/{item_id}", response_model=CartResponse)
async def update_cart_item(
    item_id: int,
    body: CartItemUpdate,
    guest_session_id: Optional[str] = Query(None, alias="guest_session_id"),
    db: AsyncSession = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user),
):
    """Update cart item quantity."""
    user_id = current_user.id if current_user else None
    if not user_id and not guest_session_id:
        raise HTTPException(status_code=400, detail="Provide Authorization or guest_session_id")
    cart = await _get_or_create_cart(db, user_id, guest_session_id)
    item = next((i for i in cart.items if i.id == item_id), None)
    if not item:
        raise HTTPException(status_code=404, detail="Cart item not found")
    item.quantity = body.quantity
    await db.flush()
    result = await db.execute(_cart_selector().where(Cart.id == cart.id))
    cart = result.scalar_one()
    items_resp = [_cart_item_to_response(i) for i in cart.items]
    subtotal = Decimal(0)
    for i in cart.items:
        snap = i.price_snapshot or {}
        up = snap.get("unit_price")
        if up is not None:
            try:
                subtotal += Decimal(str(up)) * i.quantity
            except Exception:
                pass
    return CartResponse(
        id=cart.id,
        uuid=cart.uuid,
        user_id=cart.user_id,
        guest_session_id=cart.guest_session_id,
        status=cart.status,
        items=items_resp,
        item_count=len(items_resp),
        subtotal=subtotal,
        created_at=cart.created_at,
        updated_at=cart.updated_at,
    )


@router.delete("/items/{item_id}", response_model=CartResponse)
async def remove_cart_item(
    item_id: int,
    guest_session_id: Optional[str] = Query(None, alias="guest_session_id"),
    db: AsyncSession = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user),
):
    """Remove item from cart."""
    user_id = current_user.id if current_user else None
    if not user_id and not guest_session_id:
        raise HTTPException(status_code=400, detail="Provide Authorization or guest_session_id")
    cart = await _get_or_create_cart(db, user_id, guest_session_id)
    item = next((i for i in cart.items if i.id == item_id), None)
    if not item:
        raise HTTPException(status_code=404, detail="Cart item not found")
    await db.delete(item)
    await db.flush()
    result = await db.execute(_cart_selector().where(Cart.id == cart.id))
    cart = result.scalar_one()
    items_resp = [_cart_item_to_response(i) for i in cart.items]
    subtotal = Decimal(0)
    for i in cart.items:
        snap = i.price_snapshot or {}
        up = snap.get("unit_price")
        if up is not None:
            try:
                subtotal += Decimal(str(up)) * i.quantity
            except Exception:
                pass
    return CartResponse(
        id=cart.id,
        uuid=cart.uuid,
        user_id=cart.user_id,
        guest_session_id=cart.guest_session_id,
        status=cart.status,
        items=items_resp,
        item_count=len(items_resp),
        subtotal=subtotal,
        created_at=cart.created_at,
        updated_at=cart.updated_at,
    )


@router.delete("", response_model=CartResponse)
async def clear_cart(
    guest_session_id: Optional[str] = Query(None, alias="guest_session_id"),
    db: AsyncSession = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user),
):
    """Remove all items from cart."""
    user_id = current_user.id if current_user else None
    if not user_id and not guest_session_id:
        raise HTTPException(status_code=400, detail="Provide Authorization or guest_session_id")
    cart = await _get_or_create_cart(db, user_id, guest_session_id)
    for item in list(cart.items):
        await db.delete(item)
    await db.flush()
    result = await db.execute(_cart_selector().where(Cart.id == cart.id))
    cart = result.scalar_one()
    return CartResponse(
        id=cart.id,
        uuid=cart.uuid,
        user_id=cart.user_id,
        guest_session_id=cart.guest_session_id,
        status=cart.status,
        items=[],
        item_count=0,
        subtotal=Decimal(0),
        created_at=cart.created_at,
        updated_at=cart.updated_at,
    )
