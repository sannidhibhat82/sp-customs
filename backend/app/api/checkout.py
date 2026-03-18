"""
Checkout API - Book Now flow.
Validates cart, creates order (payment_pending), then on payment success:
inventory is deducted and Shiprocket order is created.
Inventory logic is NOT modified; we call the same deduction used by existing order create.
"""
import logging
from datetime import datetime
from decimal import Decimal
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update
from sqlalchemy.orm import selectinload

from app.database import get_db
from app.models.cart import Cart, CartItem
from app.models.order import Order, OrderItem
from app.models.order_address import OrderAddress
from app.models.user_address import UserAddress
from app.models.product import Product
from app.models.variant import ProductVariant
from app.models.user import User
from app.models.inventory import Inventory, InventoryLog
from app.schemas.cart import (
    CheckoutValidateResponse,
    CheckoutCreateRequest,
    CheckoutCreateResponse,
)
from app.services.auth import get_current_user
from app.config import settings

logger = logging.getLogger(__name__)
router = APIRouter()


async def _process_payment_success(order: Order, db: AsyncSession) -> None:
    """
    Deduct inventory only. Shiprocket order is created by admin after approval (with dimensions).
    Idempotent: safe to call if order already has payment_status=success.
    """
    if order.payment_status == "success":
        return
    if order.payment_status not in ("initiated", "pending"):
        raise HTTPException(status_code=400, detail=f"Order payment status is {order.payment_status}")
    for item in order.items:
        if item.product_id:
            prod_result = await db.execute(
                select(Product).options(selectinload(Product.inventory)).where(Product.id == item.product_id)
            )
            product = prod_result.scalar_one_or_none()
            if product and product.inventory:
                inv = product.inventory
                qty_before = inv.quantity
                if inv.quantity < item.quantity and not getattr(inv, "allow_backorder", False):
                    raise HTTPException(
                        status_code=400,
                        detail=f"Insufficient stock for {item.product_name}. Available: {inv.quantity}, Requested: {item.quantity}",
                    )
                inv.quantity = max(0, inv.quantity - item.quantity)
                inv.last_scanned_at = datetime.utcnow()
                log = InventoryLog(
                    inventory_id=inv.id,
                    action="order_out",
                    quantity_change=-item.quantity,
                    quantity_before=qty_before,
                    quantity_after=inv.quantity,
                    reason=f"Order {order.order_number}",
                    reference=order.order_number,
                    user_id=order.created_by_id,
                )
                db.add(log)
            if item.variant_id:
                var_result = await db.execute(
                    select(ProductVariant)
                    .options(selectinload(ProductVariant.inventory))
                    .where(ProductVariant.id == item.variant_id)
                )
                variant = var_result.scalar_one_or_none()
                if variant and variant.inventory:
                    vi = variant.inventory
                    if vi.quantity < item.quantity and not getattr(vi, "allow_backorder", False):
                        raise HTTPException(
                            status_code=400,
                            detail=f"Insufficient stock for variant {item.variant_name or item.product_name}",
                        )
                    vi.quantity = max(0, vi.quantity - item.quantity)
    order.payment_status = "success"
    order.payment_info = {**(order.payment_info or {}), "status": "paid"}
    await db.flush()
    # Shiprocket order is created by admin after approval (with package dimensions)


def _generate_order_number() -> str:
    now = datetime.now()
    return f"ORD-{now.strftime('%Y%m%d')}-{now.strftime('%H%M%S')}"


async def _get_cart_for_checkout(
    db: AsyncSession,
    cart_id: int,
    user_id: Optional[int],
    guest_session_id: Optional[str],
) -> Cart:
    q = (
        select(Cart)
        .options(
            selectinload(Cart.items).selectinload(CartItem.product),
            selectinload(Cart.items).selectinload(CartItem.variant),
        )
        .where(Cart.id == cart_id, Cart.status == "active")
    )
    if user_id:
        q = q.where(Cart.user_id == user_id)
    else:
        q = q.where(Cart.guest_session_id == guest_session_id)
    result = await db.execute(q)
    cart = result.scalar_one_or_none()
    if not cart:
        raise HTTPException(status_code=404, detail="Cart not found or already converted")
    return cart


@router.get("/validate", response_model=CheckoutValidateResponse)
async def validate_checkout(
    cart_id: int = Query(...),
    guest_session_id: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user),
):
    """
    Validate cart for checkout: check stock and optionally fetch shipping options.
    Does not modify cart or inventory.
    """
    user_id = current_user.id if current_user else None
    if not user_id and not guest_session_id:
        raise HTTPException(status_code=400, detail="Provide Authorization or guest_session_id")
    cart = await _get_cart_for_checkout(db, cart_id, user_id, guest_session_id)
    errors: List[str] = []
    subtotal = Decimal(0)
    for item in cart.items:
        snap = item.price_snapshot or {}
        up = snap.get("unit_price")
        if up is not None:
            try:
                subtotal += Decimal(str(up)) * item.quantity
            except Exception:
                pass
        # Check stock (read-only; do not modify inventory)
        product_id = item.product_id
        variant_id = item.variant_id
        if variant_id:
            var_result = await db.execute(
                select(ProductVariant)
                .options(selectinload(ProductVariant.inventory))
                .where(ProductVariant.id == variant_id)
            )
            var = var_result.scalar_one_or_none()
            if not var or not var.inventory:
                errors.append(f"Variant for product id {product_id} has no inventory")
            elif var.inventory.quantity < item.quantity:
                errors.append(
                    f"Insufficient stock for {item.product.name or product_id}. "
                    f"Available: {var.inventory.quantity}, Requested: {item.quantity}"
                )
        else:
            prod_result = await db.execute(
                select(Product).options(selectinload(Product.inventory)).where(Product.id == product_id)
            )
            prod = prod_result.scalar_one_or_none()
            if not prod or not prod.inventory:
                errors.append(f"Product id {product_id} has no inventory")
            elif prod.inventory.quantity < item.quantity:
                allow_back = getattr(prod.inventory, "allow_backorder", False)
                if not allow_back:
                    errors.append(
                        f"Insufficient stock for {prod.name}. "
                        f"Available: {prod.inventory.quantity}, Requested: {item.quantity}"
                    )
    shipping_options: Optional[List[Dict[str, Any]]] = None
    if settings.SHIPROCKET_EMAIL and not errors:
        try:
            from app.services.shiprocket import check_serviceability
            pickup = settings.SHIPROCKET_PICKUP_PINCODE
            delivery = "110001"  # Will be replaced with address.pincode at create
            resp = await check_serviceability(pickup, delivery, 0.5, 0)
            if resp.get("data", {}).get("available_courier_companies"):
                shipping_options = resp["data"].get("available_courier_companies", [])[:5]
        except Exception:
            pass
    discount_pct = getattr(settings, "CUSTOMER_DISCOUNT_PERCENT", None) or 0
    return CheckoutValidateResponse(
        valid=len(errors) == 0,
        cart_id=cart.id,
        item_count=len(cart.items),
        subtotal=subtotal,
        shipping_options=shipping_options,
        errors=errors,
        customer_discount_percent=float(discount_pct) if discount_pct else None,
    )


@router.post("/create", response_model=CheckoutCreateResponse)
async def create_checkout_order(
    body: CheckoutCreateRequest,
    db: AsyncSession = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user),
):
    """
    Create order from cart with status payment_pending.
    Does NOT deduct inventory yet; that happens on payment success webhook.
    """
    if not settings.ENABLE_BOOK_NOW:
        raise HTTPException(status_code=503, detail="Book Now is temporarily disabled")
    user_id = current_user.id if current_user else None
    if not user_id and not body.guest_session_id:
        raise HTTPException(status_code=400, detail="Provide Authorization or guest_session_id")
    cart = await _get_cart_for_checkout(db, body.cart_id, user_id, body.guest_session_id)
    if not cart.items:
        raise HTTPException(status_code=400, detail="Cart is empty")

    # Build order from cart (price snapshot locked)
    order_number = _generate_order_number()
    subtotal = Decimal(0)
    order_items_data = []
    for item in cart.items:
        snap = item.price_snapshot or {}
        up = Decimal(str(snap.get("unit_price", 0)))
        line_total = up * item.quantity
        subtotal += line_total
        product = item.product
        variant = item.variant
        order_items_data.append({
            "product_id": item.product_id,
            "variant_id": item.variant_id,
            "product_name": product.name if product else "",
            "product_sku": (variant.sku if variant else product.sku) if product else "",
            "product_barcode": getattr(product, "barcode", None) if product else None,
            "variant_name": variant.name if variant else None,
            "variant_options": (variant.options or {}) if variant else {},
            "unit_price": up,
            "quantity": item.quantity,
            "discount": Decimal(0),
            "total": line_total,
            "product_image": None,  # Avoid lazy load (primary_image uses product.images)
        })
    # Logged-in customer discount (from admin-configured percentage)
    discount_amount = Decimal(0)
    if user_id:
        discount_pct = getattr(settings, "CUSTOMER_DISCOUNT_PERCENT", 0) or 0
        if discount_pct > 0:
            discount_amount = (subtotal * Decimal(str(discount_pct)) / Decimal(100)).quantize(Decimal("0.01"))
    shipping_cost = Decimal(0)  # Can be set from Shiprocket rate later
    tax_amount = Decimal(0)
    total = subtotal - discount_amount + shipping_cost + tax_amount

    shipping_info = {
        "customer_name": body.address.name,
        "phone": body.address.phone,
        "email": "",  # Optional from address if we add it
        "address_line1": body.address.address,
        "address_line2": "",
        "city": body.address.city,
        "state": body.address.state,
        "postal_code": body.address.pincode,
        "country": body.address.country,
    }
    invoice_data = {
        "invoice_number": f"INV-{order_number.replace('ORD-', '')}",
        "invoice_date": datetime.now().strftime("%Y-%m-%d"),
    }
    payment_info: Dict[str, Any] = {"method": "online", "status": "pending", "amount_paid": None}

    order = Order(
        order_number=order_number,
        status="Pending Approval",
        subtotal=subtotal,
        discount_amount=discount_amount,
        shipping_cost=shipping_cost,
        tax_amount=tax_amount,
        total=total,
        shipping_info=shipping_info,
        billing_info=shipping_info,
        shipping_details={},
        payment_info=payment_info,
        invoice_data=invoice_data,
        extra_data={},
        created_by_id=user_id,
        cart_id=cart.id,
        payment_status="initiated",
        shipment_status=None,
        shiprocket_order_id=None,
        shiprocket_shipment_id=None,
    )
    db.add(order)
    await db.flush()

    for od in order_items_data:
        oi = OrderItem(
            order_id=order.id,
            product_id=od["product_id"],
            variant_id=od.get("variant_id"),
            product_name=od["product_name"],
            product_sku=od["product_sku"],
            product_barcode=od.get("product_barcode"),
            variant_name=od.get("variant_name"),
            variant_options=od.get("variant_options", {}),
            unit_price=od["unit_price"],
            quantity=od["quantity"],
            discount=od["discount"],
            total=od["total"],
            product_image=od.get("product_image"),
            extra_data={},
        )
        db.add(oi)

    addr = OrderAddress(
        order_id=order.id,
        name=body.address.name,
        phone=body.address.phone,
        address=body.address.address,
        city=body.address.city,
        state=body.address.state,
        pincode=body.address.pincode,
        country=body.address.country,
    )
    db.add(addr)

    # Save address to "My Account" for logged-in customers
    if current_user and current_user.role == "customer":
        existing_addr_result = await db.execute(
            select(UserAddress).where(
                UserAddress.user_id == current_user.id,
                UserAddress.name == body.address.name,
                UserAddress.phone == body.address.phone,
                UserAddress.address == body.address.address,
                UserAddress.city == body.address.city,
                UserAddress.state == body.address.state,
                UserAddress.pincode == body.address.pincode,
                UserAddress.country == body.address.country,
            )
        )
        existing = existing_addr_result.scalar_one_or_none()
        if not existing:
            has_default_result = await db.execute(
                select(UserAddress.id)
                .where(UserAddress.user_id == current_user.id, UserAddress.is_default == True)  # noqa: E712
                .limit(1)
            )
            is_default = has_default_result.scalar_one_or_none() is None
            if is_default:
                await db.execute(update(UserAddress).where(UserAddress.user_id == current_user.id).values(is_default=False))
            db.add(
                UserAddress(
                    user_id=current_user.id,
                    name=body.address.name,
                    phone=body.address.phone,
                    address=body.address.address,
                    city=body.address.city,
                    state=body.address.state,
                    pincode=body.address.pincode,
                    country=body.address.country,
                    is_default=is_default,
                )
            )

    # Mark cart as converted
    cart.status = "converted"
    await db.flush()
    await db.refresh(order)

    # SR Checkout (Shiprocket payment gateway) - ref: Shiprocket Checkout Integration Guide
    # When Shiprocket payment is not enabled, send user to our fallback payment page.
    redirect_url = f"{settings.FRONTEND_BASE_URL.rstrip('/')}/checkout/payment?order_uuid={order.uuid}"
    payment_intent_id = None
    client_secret = None
    shiprocket_token = None
    shiprocket_token_expires_at = None
    shiprocket_checkout_order_id = None

    # Shiprocket SR Checkout (Headless token) flow:
    # Create token server-side, then frontend calls HeadlessCheckout.addToCart(event, token, ...)
    if settings.SHIPROCKET_CHECKOUT_ENABLED and settings.SHIPROCKET_CHECKOUT_API_KEY and settings.SHIPROCKET_CHECKOUT_SECRET_KEY:
        from app.services.shiprocket import create_checkout_access_token

        # Dedicated pay page that loads Shiprocket JS and initiates checkout
        redirect_url = f"{settings.FRONTEND_BASE_URL.rstrip('/')}/checkout/shiprocket/pay?order_uuid={order.uuid}"

        # Build items from order/cart items. Shiprocket examples expect variant_id as string.
        token_items: List[Dict[str, Any]] = []
        for it in cart.items:
            variant_or_product_id = it.variant_id or it.product_id
            token_items.append({"variant_id": str(variant_or_product_id), "quantity": int(it.quantity)})

        # Redirect/callback after payment (Shiprocket appends oid/ost). We include our order_uuid for correlation.
        callback_url = f"{settings.FRONTEND_BASE_URL.rstrip('/')}/checkout/shiprocket/redirect?order_uuid={order.uuid}"

        try:
            token_resp = await create_checkout_access_token(
                items=token_items,
                redirect_url=callback_url,
                mobile_app=False,
            )
            result = token_resp.get("result") or {}
            shiprocket_token = result.get("token")
            shiprocket_token_expires_at = result.get("expires_at")
            shiprocket_checkout_order_id = (result.get("data") or {}).get("order_id")
            if shiprocket_token:
                order.payment_info = {
                    **(order.payment_info or {}),
                    "shiprocket_token": shiprocket_token,
                    "shiprocket_token_expires_at": shiprocket_token_expires_at,
                    "shiprocket_checkout_order_id": str(shiprocket_checkout_order_id) if shiprocket_checkout_order_id else None,
                }
                await db.flush()
            else:
                # If Shiprocket responds but token missing, fall back
                redirect_url = f"{settings.FRONTEND_BASE_URL.rstrip('/')}/checkout/payment?order_uuid={order.uuid}"
        except Exception as e:
            # If token creation fails, fall back to internal payment page
            logger.exception("Shiprocket checkout token generation failed order_id=%s: %s", order.id, e)
            redirect_url = f"{settings.FRONTEND_BASE_URL.rstrip('/')}/checkout/payment?order_uuid={order.uuid}"

    # Ensure redirect_url is absolute so frontend can do full redirect to payment or success
    if not redirect_url or not (redirect_url.startswith("http://") or redirect_url.startswith("https://")):
        redirect_url = f"{settings.FRONTEND_BASE_URL.rstrip('/')}/order/success?order_id={order.uuid}"
    return CheckoutCreateResponse(
        order_id=order.id,
        order_number=order.order_number,
        order_uuid=order.uuid,
        total=total,
        payment_status=order.payment_status or "initiated",
        payment_intent_id=payment_intent_id,
        client_secret=client_secret,
        redirect_url=redirect_url,
        shiprocket_token=shiprocket_token,
        shiprocket_token_expires_at=shiprocket_token_expires_at,
        shiprocket_checkout_order_id=str(shiprocket_checkout_order_id) if shiprocket_checkout_order_id else None,
    )


@router.post("/payment-success")
async def payment_success_webhook(
    order_id: int = Query(...),
    db: AsyncSession = Depends(get_db),
):
    """
    Called when payment is confirmed (e.g. by payment gateway webhook or manual confirm).
    Deducts inventory, creates Shiprocket order, generates label/invoice.
    Idempotent: if order already has payment_status=success, skip.
    """
    if settings.SHIPROCKET_CHECKOUT_ENABLED:
        raise HTTPException(status_code=400, detail="Manual payment confirmation is disabled when Shiprocket Checkout is enabled")
    result = await db.execute(
        select(Order)
        .options(selectinload(Order.items))
        .where(Order.id == order_id)
    )
    order = result.scalar_one_or_none()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    if order.payment_status == "success":
        return {"success": True, "message": "Already processed"}
    await _process_payment_success(order, db)
    await db.refresh(order)
    return {"success": True, "order_id": order.id, "order_number": order.order_number}


@router.post("/shiprocket/token")
async def get_or_create_shiprocket_token(
    order_uuid: str = Query(...),
    db: AsyncSession = Depends(get_db),
):
    """
    Idempotently create (or return cached) Shiprocket SR Checkout headless token for an order.
    Used by frontend pay page.
    """
    result = await db.execute(select(Order).options(selectinload(Order.items)).where(Order.uuid == order_uuid))
    order = result.scalar_one_or_none()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    if order.payment_status == "success":
        return {"ok": True, "paid": True}
    if not settings.SHIPROCKET_CHECKOUT_ENABLED:
        raise HTTPException(status_code=400, detail="Shiprocket Checkout is disabled")

    payment_info = order.payment_info or {}
    existing_token = payment_info.get("shiprocket_token")
    existing_expires_at = payment_info.get("shiprocket_token_expires_at")
    existing_sr_oid = payment_info.get("shiprocket_checkout_order_id")
    if existing_token:
        return {
            "ok": True,
            "token": existing_token,
            "expires_at": existing_expires_at,
            "shiprocket_order_id": existing_sr_oid,
        }

    from app.services.shiprocket import create_checkout_access_token

    # We don't have cart here; use order items (variant_id if possible, else product_id)
    token_items: List[Dict[str, Any]] = []
    for it in order.items:
        variant_or_product_id = it.variant_id or it.product_id or it.id
        token_items.append({"variant_id": str(variant_or_product_id), "quantity": int(it.quantity)})

    callback_url = f"{settings.FRONTEND_BASE_URL.rstrip('/')}/checkout/shiprocket/redirect?order_uuid={order.uuid}"
    token_resp = await create_checkout_access_token(items=token_items, redirect_url=callback_url, mobile_app=False)
    result_obj = token_resp.get("result") or {}
    token = result_obj.get("token")
    expires_at = result_obj.get("expires_at")
    shiprocket_order_id = (result_obj.get("data") or {}).get("order_id")
    if not token:
        raise HTTPException(status_code=502, detail="Shiprocket token generation failed")

    order.payment_info = {
        **payment_info,
        "shiprocket_token": token,
        "shiprocket_token_expires_at": expires_at,
        "shiprocket_checkout_order_id": str(shiprocket_order_id) if shiprocket_order_id else None,
    }
    await db.flush()
    return {"ok": True, "token": token, "expires_at": expires_at, "shiprocket_order_id": shiprocket_order_id}


@router.post("/shiprocket/confirm")
async def confirm_shiprocket_payment_redirect(
    order_uuid: str = Query(...),
    oid: str = Query(..., description="Shiprocket order id from redirect param `oid`"),
    ost: str = Query(..., description="Shiprocket status from redirect param `ost` (e.g. SUCCESS)"),
    db: AsyncSession = Depends(get_db),
):
    """
    Confirm payment based on Shiprocket redirect params.
    We require `oid` to match the Shiprocket order id we received during token creation.
    Then we mark payment success and deduct inventory.

    Note: webhook is preferred for security; this is a pragmatic fallback.
    """
    result = await db.execute(select(Order).options(selectinload(Order.items)).where(Order.uuid == order_uuid))
    order = result.scalar_one_or_none()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    if (ost or "").strip().upper() not in ("SUCCESS", "PAID", "COMPLETED"):
        raise HTTPException(status_code=400, detail=f"Payment status not successful: {ost}")
    payment_info = order.payment_info or {}
    expected_oid = payment_info.get("shiprocket_checkout_order_id")
    if expected_oid and str(expected_oid) != str(oid):
        raise HTTPException(status_code=400, detail="Shiprocket order id mismatch")
    if order.payment_status == "success":
        return {"ok": True, "already": True}
    await _process_payment_success(order, db)
    payment_info = order.payment_info or {}
    payment_info["shiprocket_checkout_order_id"] = str(oid)
    order.payment_info = payment_info
    await db.flush()
    return {"ok": True, "success": True, "order_id": order.id, "order_number": order.order_number}
