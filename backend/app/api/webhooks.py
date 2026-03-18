"""
Webhooks for external services (e.g. Shiprocket SR Checkout payment success).

Shiprocket Order webhook (POST to SELLER_REGISTERED_WEBHOOK_URL) sends:
  order_id (str, Shiprocket's), platform_order_id (may be our order ref),
  status "SUCCESS", cart_data, shipping_address, payment_type, total_amount_payable, etc.
Success redirect: GET redirect_url?oid=<shiprocket_order_id>&ost=SUCCESS
"""
import hmac
import hashlib
import logging
import base64
from typing import Any, Optional

from fastapi import APIRouter, Depends, HTTPException, Request, Header
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from app.database import get_db
from app.models.order import Order
from app.api.checkout import _process_payment_success
from app.config import settings

logger = logging.getLogger(__name__)

router = APIRouter()


def _verify_shiprocket_webhook(payload: bytes, signature: Optional[str]) -> bool:
    """Verify webhook signature using HMAC-SHA256 if secret is configured."""
    if not settings.SHIPROCKET_CHECKOUT_WEBHOOK_SECRET or not signature:
        return not settings.SHIPROCKET_CHECKOUT_WEBHOOK_SECRET
    secret = settings.SHIPROCKET_CHECKOUT_WEBHOOK_SECRET.encode("utf-8")
    digest = hmac.new(secret, payload, hashlib.sha256).digest()
    expected_hex = digest.hex()
    expected_b64 = base64.b64encode(digest).decode("ascii")
    sig = (signature or "").strip()
    # Accept common formats:
    # - "sha256=<hex>"
    # - raw hex
    # - raw base64 (same as token API header style)
    if sig.startswith("sha256="):
        sig = sig[len("sha256="):]
    return (
        hmac.compare_digest(sig, expected_hex)
        or hmac.compare_digest(sig, expected_b64)
        or hmac.compare_digest(signature, f"sha256={expected_hex}")
    )


@router.post("/shiprocket-checkout")
async def shiprocket_checkout_webhook(
    request: Request,
    db: AsyncSession = Depends(get_db),
    x_signature: Optional[str] = Header(None, alias="X-Signature"),
    x_webhook_signature: Optional[str] = Header(None, alias="X-Webhook-Signature"),
    x_api_hmac_sha256: Optional[str] = Header(None, alias="X-Api-HMAC-SHA256"),
):
    """
    SR Checkout order webhook (Shiprocket POST to your registered URL).
    Payload: order_id (Shiprocket's str), platform_order_id, status "SUCCESS", cart_data,
    shipping_address, payment_type, total_amount_payable, etc.
    Order lookup: order_id (int = our id), order_number, platform_order_id, merchant_order_id, reference.
    Status: SUCCESS, paid, success, completed (case-insensitive).
    """
    import json
    body = await request.body()
    logger.info(
        "Shiprocket checkout webhook received body_len=%s",
        len(body),
    )
    signature = x_signature or x_webhook_signature or x_api_hmac_sha256
    if not _verify_shiprocket_webhook(body, signature):
        logger.warning("Shiprocket checkout webhook signature verification failed")
        raise HTTPException(status_code=401, detail="Invalid signature")
    data: dict = {}
    if body:
        try:
            data = json.loads(body.decode())
        except Exception as e:
            logger.warning("Shiprocket checkout webhook invalid JSON: %s", e)
            raise HTTPException(status_code=400, detail="Invalid JSON")
    platform_order_id = data.get("platform_order_id")
    order_number = (
        data.get("order_number")
        or platform_order_id
        or data.get("merchant_order_id")
        or data.get("reference")
    )
    logger.info(
        "Shiprocket checkout webhook payload keys=%s order_id=%s platform_order_id=%s status=%s",
        list(data.keys()),
        data.get("order_id"),
        platform_order_id,
        data.get("status"),
    )
    status_raw = (data.get("status") or "").strip()
    status = status_raw.lower()
    if status_raw and status not in ("paid", "success", "completed"):
        logger.info("Shiprocket checkout webhook skipped status=%s", status_raw)
        return {"received": True, "skipped": True, "reason": "status_not_success"}
    # Resolve our order:
    # - by internal id (int) if Shiprocket echoes it in order_id
    # - by order_number / platform_order_id / merchant_order_id / reference
    # - by Shiprocket order id stored in payment_info["shiprocket_checkout_order_id"]
    order_id_raw = data.get("order_id")
    order = None
    if order_id_raw is not None:
        try:
            oid = int(order_id_raw)
            result = await db.execute(
                select(Order).options(selectinload(Order.items)).where(Order.id == oid)
            )
            order = result.scalar_one_or_none()
            if order:
                logger.info("Shiprocket checkout webhook matched order by id=%s", oid)
        except (TypeError, ValueError):
            pass
    if not order and order_number:
        onum = str(order_number)
        result = await db.execute(
            select(Order).options(selectinload(Order.items)).where(Order.order_number == onum)
        )
        order = result.scalar_one_or_none()
        if order:
            logger.info(
                "Shiprocket checkout webhook matched order by order_number/platform_order_id=%s",
                onum,
            )
    if not order and order_id_raw is not None:
        # Match by Shiprocket order id stored during token/session creation
        sr_oid = str(order_id_raw)
        try:
            result = await db.execute(
                select(Order)
                .options(selectinload(Order.items))
                .where(Order.payment_info["shiprocket_checkout_order_id"].astext == sr_oid)
            )
            order = result.scalar_one_or_none()
            if order:
                logger.info("Shiprocket checkout webhook matched order by stored shiprocket_checkout_order_id=%s", sr_oid)
        except Exception:
            pass
    if not order:
        logger.warning(
            "Shiprocket checkout webhook order not found order_id=%s platform_order_id=%s order_number=%s",
            order_id_raw,
            platform_order_id,
            order_number,
        )
        raise HTTPException(status_code=404, detail="Order not found")
    if order.payment_status == "success":
        logger.info("Shiprocket checkout webhook already processed order_id=%s", order.id)
        return {"received": True, "success": True, "message": "Already processed"}
    try:
        await _process_payment_success(order, db)
        # Store Shiprocket checkout payload in payment_info for reference
        sr_order_id = data.get("order_id")
        payment_info = order.payment_info or {}
        if sr_order_id is not None:
            payment_info["shiprocket_checkout_order_id"] = str(sr_order_id)
        if data.get("payment_type") is not None:
            payment_info["payment_type"] = data.get("payment_type")
        if data.get("total_amount_payable") is not None:
            payment_info["total_amount_payable"] = data.get("total_amount_payable")
        order.payment_info = payment_info
        await db.flush()
        await db.refresh(order)
        logger.info(
            "Shiprocket checkout webhook processed order_id=%s order_number=%s sr_order_id=%s",
            order.id,
            order.order_number,
            sr_order_id,
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.exception("Shiprocket checkout webhook processing failed: %s", e)
        raise HTTPException(status_code=500, detail="Processing failed")
    return {"received": True, "success": True, "order_id": order.id, "order_number": order.order_number}


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
