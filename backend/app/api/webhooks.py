import logging
import hmac
import hashlib
import json
from typing import Any
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, Request, Header
from fastapi.responses import PlainTextResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from app.database import get_db
from app.models.order import Order
from app.config import settings
from app.api.checkout import _process_payment_success

# Use Uvicorn's logger so messages appear in systemd journal alongside access logs.
logger = logging.getLogger("uvicorn.error")

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
    event = (payload.get("event") or "").strip()
    entity: dict[str, Any] = ((payload.get("payload") or {}).get("payment") or {}).get("entity") or {}
    if not entity:
        entity = ((payload.get("payload") or {}).get("order") or {}).get("entity") or {}

    # Ignore unrelated events, but acknowledge receipt.
    if event not in ("payment.captured", "order.paid"):
        logger.info("Razorpay webhook ignored event=%s", event)
        return {"received": True, "ignored": True, "event": event}

    payment_entity: dict[str, Any] = ((payload.get("payload") or {}).get("payment") or {}).get("entity") or {}
    order_entity: dict[str, Any] = ((payload.get("payload") or {}).get("order") or {}).get("entity") or {}
    notes = (
        (payment_entity.get("notes") if isinstance(payment_entity.get("notes"), dict) else None)
        or (order_entity.get("notes") if isinstance(order_entity.get("notes"), dict) else None)
        or {}
    )

    # Prefer payment.order_id; fallback to order.id for order.paid payloads.
    razorpay_order_id = str(payment_entity.get("order_id") or order_entity.get("id") or entity.get("order_id") or "")
    razorpay_payment_id = str(entity.get("id") or "")
    if not razorpay_order_id:
        logger.warning("Razorpay webhook ignored reason=missing_order_id event=%s", event)
        return {"received": True, "ignored": True, "reason": "missing_order_id"}

    order = None
    # 1) Primary lookup by stored Razorpay order id
    try:
        result = await db.execute(
            select(Order)
            .options(selectinload(Order.items))
            .where(Order.payment_info["razorpay_order_id"].astext == razorpay_order_id)
        )
        order = result.scalar_one_or_none()
    except Exception:
        order = None

    # 2) Fallback lookup by order uuid passed in notes
    if not order and notes.get("order_uuid"):
        result = await db.execute(
            select(Order)
            .options(selectinload(Order.items))
            .where(Order.uuid == str(notes.get("order_uuid")))
        )
        order = result.scalar_one_or_none()

    # 3) Fallback lookup by order number/receipt
    if not order:
        order_number = (
            str(notes.get("order_number") or "")
            or str(order_entity.get("receipt") or "")
        )
        if order_number:
            result = await db.execute(
                select(Order)
                .options(selectinload(Order.items))
                .where(Order.order_number == order_number)
            )
            order = result.scalar_one_or_none()

    if not order:
        logger.warning(
            "Razorpay webhook order not found event=%s razorpay_order_id=%s notes=%s",
            event,
            razorpay_order_id,
            notes,
        )
        # Return 200 to avoid endless retries when order is missing/mismatched.
        return {"received": True, "ignored": True, "reason": "order_not_found"}

    logger.info(
        "Razorpay webhook matched event=%s order_id=%s order_number=%s razorpay_order_id=%s",
        event,
        order.id,
        order.order_number,
        razorpay_order_id,
    )

    if order.payment_status == "success":
        # Idempotent webhook: enrich payment_info even when already paid.
        existing = dict(order.payment_info or {})
        existing.update(
            {
                "gateway": "razorpay",
                "status": "paid",
                "razorpay_order_id": razorpay_order_id or existing.get("razorpay_order_id"),
                "razorpay_payment_id": razorpay_payment_id or existing.get("razorpay_payment_id"),
                "webhook_event": event,
            }
        )
        order.payment_info = existing
        await db.flush()
        logger.info(
            "Razorpay webhook already_processed event=%s order_id=%s order_number=%s",
            event,
            order.id,
            order.order_number,
        )
        return {"received": True, "success": True, "already": True}

    await _process_payment_success(order, db)
    payment_info = dict(order.payment_info or {})
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
    logger.info(
        "Razorpay webhook processed event=%s order_id=%s order_number=%s payment_id=%s",
        event,
        order.id,
        order.order_number,
        razorpay_payment_id or payment_info.get("razorpay_payment_id"),
    )
    return {"received": True, "success": True, "event": event, "order_id": order.id, "order_number": order.order_number}


@router.post("/shipping-status")
async def shiprocket_shipping_status_webhook(
    request: Request,
    db: AsyncSession = Depends(get_db),
    x_api_key: str | None = Header(None, alias="x-api-key"),
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
    # Optional token validation from Shiprocket dashboard webhook settings.
    expected_token = (settings.SHIPROCKET_SHIPPING_WEBHOOK_TOKEN or "").strip()
    if expected_token and (x_api_key or "").strip() != expected_token:
        raise HTTPException(status_code=401, detail="Invalid webhook token")

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
        # Acknowledge to avoid retries for unmatched payloads.
        return {"received": True, "ignored": True, "reason": "order_not_found"}

    # Update tracking if present
    if awb and not order.tracking_id:
        order.tracking_id = str(awb)

    # Store shipping webhook snapshot (safe subset)
    scans = data.get("scans")
    timeline: list[dict[str, Any]] = []
    if isinstance(scans, list):
        for s in scans:
            if not isinstance(s, dict):
                continue
            timeline.append(
                {
                    "date": s.get("date"),
                    "activity": s.get("activity"),
                    "location": s.get("location"),
                }
            )

    sd = order.shipping_details or {}
    sd["shiprocket_webhook"] = {
        "received_at": datetime.utcnow().isoformat(),
        "order_id": str(sr_order_id) if sr_order_id else None,
        "shipment_id": str(shipment_id) if shipment_id else None,
        "awb": str(awb) if awb else None,
        "status": status_norm or None,
        "scans": timeline,
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


def _verify_whatsapp_webhook_signature(body: bytes, signature_header: str | None, app_secret: str) -> bool:
    """Verify X-Hub-Signature-256 from Meta (WhatsApp) webhooks."""
    if not app_secret or not signature_header:
        return False
    sig = signature_header.strip()
    if not sig.startswith("sha256="):
        return False
    expected = hmac.new(app_secret.encode("utf-8"), body, hashlib.sha256).hexdigest()
    received = sig[7:]
    return hmac.compare_digest(expected, received)


@router.get("/whatsapp")
async def whatsapp_webhook_verify(request: Request):
    """
    Meta WhatsApp webhook verification (GET).
    Configure callback URL in Meta Developer App → WhatsApp → Configuration with the same verify token as WHATSAPP_VERIFY_TOKEN.
    See: https://developers.facebook.com/documentation/business-messaging/whatsapp/webhooks/overview/
    """
    params = request.query_params
    mode = params.get("hub.mode")
    token = params.get("hub.verify_token")
    challenge = params.get("hub.challenge")
    expected = (settings.WHATSAPP_VERIFY_TOKEN or "").strip()
    if mode == "subscribe" and token == expected and expected:
        return PlainTextResponse(content=challenge or "")
    raise HTTPException(status_code=403, detail="Verification failed")


@router.post("/whatsapp")
async def whatsapp_webhook_events(
    request: Request,
    x_hub_signature_256: str | None = Header(None, alias="X-Hub-Signature-256"),
):
    """
    Meta WhatsApp webhook events (POST): message status, inbound messages, etc.
    Acknowledge quickly with 200; optional signature check when WHATSAPP_APP_SECRET is set.
    """
    body = await request.body()
    secret = (getattr(settings, "WHATSAPP_APP_SECRET", None) or "").strip()
    if secret:
        if not _verify_whatsapp_webhook_signature(body, x_hub_signature_256, secret):
            raise HTTPException(status_code=401, detail="Invalid webhook signature")

    try:
        payload = json.loads(body.decode("utf-8")) if body else {}
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid JSON")

    # Minimal logging for delivery / errors (template sends emit statuses here).
    try:
        entries = payload.get("entry") or []
        for entry in entries:
            changes = entry.get("changes") or []
            for change in changes:
                value = change.get("value") or {}
                statuses = value.get("statuses") or []
                for st in statuses:
                    logger.info(
                        "WhatsApp status id=%s status=%s recipient=%s",
                        st.get("id"),
                        st.get("status"),
                        st.get("recipient_id"),
                    )
    except Exception:
        logger.exception("WhatsApp webhook parse log failed")

    return {"success": True}
