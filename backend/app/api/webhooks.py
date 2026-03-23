import logging
import hmac
import hashlib
import json
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, Request, Header
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from app.database import get_db
from app.models.order import Order
from app.config import settings
from app.api.checkout import _process_payment_success

logger = logging.getLogger(__name__)

router = APIRouter()


def _verify_razorpay_webhook(payload: bytes, signature: str | None) -> bool:
    secret = settings.RAZORPAY_WEBHOOK_SECRET
    if not secret:
        # If secret isn't configured, do not trust webhook calls.
        return False
    if not signature:
        return False
    generated = hmac.new(secret.encode("utf-8"), payload, hashlib.sha256).hexdigest()
    return hmac.compare_digest(generated, signature.strip())


@router.post("/razorpay")
async def razorpay_payment_webhook(
    request: Request,
    db: AsyncSession = Depends(get_db),
    x_razorpay_signature: str | None = Header(None, alias="X-Razorpay-Signature"),
):
    """
    Razorpay webhook handler.
    Expected events include payment.captured and order.paid.
    """
    body = await request.body()
    if not _verify_razorpay_webhook(body, x_razorpay_signature):
        raise HTTPException(status_code=401, detail="Invalid webhook signature")
    try:
        payload = json.loads(body.decode("utf-8")) if body else {}
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid JSON")
    print(payload)
    print(x_razorpay_signature)
    event = (payload.get("event") or "").strip()
    entity: dict[str, Any] = ((payload.get("payload") or {}).get("payment") or {}).get("entity") or {}
    if not entity:
        entity = ((payload.get("payload") or {}).get("order") or {}).get("entity") or {}

    # Ignore unrelated events, but acknowledge receipt.
    if event not in ("payment.captured", "order.paid"):
        return {"received": True, "ignored": True, "event": event}

    # We persist razorpay_order_id in order.payment_info during order creation.
    razorpay_order_id = str(entity.get("order_id") or entity.get("id") or "")
    razorpay_payment_id = str(entity.get("id") or "")
    if not razorpay_order_id:
        return {"received": True, "ignored": True, "reason": "missing_order_id"}

    try:
        result = await db.execute(
            select(Order)
            .options(selectinload(Order.items))
            .where(Order.payment_info["razorpay_order_id"].astext == razorpay_order_id)
        )
        order = result.scalar_one_or_none()
    except Exception:
        order = None
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")

    if order.payment_status == "success":
        return {"received": True, "success": True, "already": True}

    await _process_payment_success(order, db)
    payment_info = order.payment_info or {}
    payment_info.update(
        {
            "gateway": "razorpay",
            "status": "paid",
            "razorpay_order_id": razorpay_order_id,
            "razorpay_payment_id": razorpay_payment_id or payment_info.get("razorpay_payment_id"),
            "webhook_event": event,
        }
    )
    order.payment_info = payment_info
    await db.flush()
    await db.refresh(order)
    return {"received": True, "success": True, "event": event, "order_id": order.id, "order_number": order.order_number}


@router.post("/shiprocket-shipping")
async def shiprocket_shipping_status_webhook(
    request: Request,
    db: AsyncSession = Depends(get_db),
):
    """
    Shiprocket Shipping (fulfillment) webhook.

    Shiprocket can POST shipment/order status updates (AWB, shipment_id, current_status, etc.).
    We update:
    - Order.shipment_status
    - Order.tracking_id (if provided and missing)
    - Order.shipping_details payload snapshot (non-sensitive)
    - Order.status (best-effort mapping to ORDER_STATUS_LIST)
    """
    import json

    body = await request.body()
    data: dict = {}
    if body:
        try:
            data = json.loads(body.decode())
        except Exception:
            raise HTTPException(status_code=400, detail="Invalid JSON")

    # Shiprocket varies payload keys; accept a few common ones.
    sr_order_id = data.get("order_id") or data.get("shiprocket_order_id") or data.get("sr_order_id")
    awb = data.get("awb") or data.get("awb_code") or data.get("tracking_id") or data.get("tracking_number")
    shipment_id = data.get("shipment_id") or data.get("shipmentid") or data.get("shipment")
    status_raw = (
        data.get("current_status")
        or data.get("status")
        or data.get("shipment_status")
        or data.get("order_status")
        or ""
    )
    status_norm = str(status_raw).strip()

    order: Order | None = None
    if sr_order_id:
        result = await db.execute(
            select(Order).where(Order.shiprocket_order_id == str(sr_order_id))
        )
        order = result.scalar_one_or_none()
    if not order and awb:
        result = await db.execute(select(Order).where(Order.tracking_id == str(awb)))
        order = result.scalar_one_or_none()
    if not order and shipment_id:
        result = await db.execute(select(Order).where(Order.shiprocket_shipment_id == str(shipment_id)))
        order = result.scalar_one_or_none()
    if not order:
        logger.warning(
            "Shiprocket shipping webhook order not found sr_order_id=%s shipment_id=%s awb=%s keys=%s",
            sr_order_id,
            shipment_id,
            awb,
            list(data.keys()),
        )
        raise HTTPException(status_code=404, detail="Order not found")

    # Update tracking if present
    if awb and not order.tracking_id:
        order.tracking_id = str(awb)

    # Store shipping webhook snapshot (safe subset)
    sd = order.shipping_details or {}
    sd["shiprocket_webhook"] = {
        "received_at": None,
        "order_id": str(sr_order_id) if sr_order_id else None,
        "shipment_id": str(shipment_id) if shipment_id else None,
        "awb": str(awb) if awb else None,
        "status": status_norm or None,
        "payload": data,
    }
    order.shipping_details = sd

    if status_norm:
        order.shipment_status = status_norm

        # Best-effort mapping to human status list
        status_list = [s.strip() for s in (getattr(settings, "ORDER_STATUS_LIST", "") or "").split(",") if s.strip()]
        mapping = {
            "PICKUP GENERATED": "Processing",
            "PICKED UP": "Processing",
            "IN TRANSIT": "Shipped",
            "SHIPPED": "Shipped",
            "OUT FOR DELIVERY": "Out for Delivery",
            "DELIVERED": "Delivered",
            "CANCELLED": "Cancelled",
            "RTO": "Cancelled",
        }
        mapped = mapping.get(status_norm.upper())
        if mapped and mapped in status_list:
            order.status = mapped

    await db.commit()
    await db.refresh(order)
    return {"received": True, "order_id": order.id, "order_number": order.order_number, "shipment_status": order.shipment_status, "tracking_id": order.tracking_id}
