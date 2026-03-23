"""
Shiprocket API integration.
All shipping, labels, invoices, and tracking via API only.
No dependency on Shiprocket dashboard.
Ref: https://apidocs.shiprocket.in/
SR Checkout (payment): use exact Base URL + create-session path from SRC Custom Integration doc:
  https://documenter.getpostman.com/view/25617008/2sB34bL3ig
"""
import time
import logging
import hmac
import hashlib
import json
import base64
from typing import Any, Dict, List, Optional

import httpx

from app.config import settings

logger = logging.getLogger(__name__)

# In-memory token cache (use Redis in production for multi-worker)
_token: Optional[str] = None
_token_expires_at: float = 0


def _get_cached_token() -> Optional[str]:
    global _token, _token_expires_at
    if _token and time.time() < _token_expires_at:
        return _token
    return None


def _set_cached_token(token: str, ttl_seconds: int) -> None:
    global _token, _token_expires_at
    _token = token
    _token_expires_at = time.time() + min(ttl_seconds, 86400 * 9)  # cap at 9 days


async def get_token() -> str:
    """Get valid Shiprocket auth token; refresh if needed."""
    cached = _get_cached_token()
    if cached:
        return cached
    if not settings.SHIPROCKET_EMAIL or not settings.SHIPROCKET_PASSWORD:
        raise ValueError("Shiprocket credentials not configured (SHIPROCKET_EMAIL, SHIPROCKET_PASSWORD)")
    async with httpx.AsyncClient() as client:
        r = await client.post(
            f"{settings.SHIPROCKET_BASE_URL}/auth/login",
            json={
                "email": settings.SHIPROCKET_EMAIL,
                "password": settings.SHIPROCKET_PASSWORD,
            },
            timeout=15.0,
        )
        r.raise_for_status()
        data = r.json()
        token = data.get("token")
        if not token:
            raise ValueError("Shiprocket auth response missing token")
        _set_cached_token(token, settings.SHIPROCKET_TOKEN_CACHE_TTL_SECONDS)
        return token


async def _request(
    method: str,
    path: str,
    *,
    json: Optional[Dict[str, Any]] = None,
    params: Optional[Dict[str, Any]] = None,
) -> Dict[str, Any]:
    """Authenticated request to Shiprocket API."""
    token = await get_token()
    url = f"{settings.SHIPROCKET_BASE_URL}{path}"
    async with httpx.AsyncClient() as client:
        r = await client.request(
            method,
            url,
            headers={"Authorization": f"Bearer {token}"},
            json=json,
            params=params,
            timeout=30.0,
        )
        r.raise_for_status()
        return r.json() if r.content else {}


# ---------- Courier & serviceability ----------


async def check_serviceability(
    pickup_postcode: str,
    delivery_postcode: str,
    weight: float,
    cod: int = 0,
) -> Dict[str, Any]:
    """
    Check courier serviceability between two pincodes.
    GET /courier/serviceability/
    weight in kg; cod 0=prepaid, 1=COD.
    """
    return await _request(
        "GET",
        "/courier/serviceability/",
        params={
            "pickup_postcode": pickup_postcode,
            "delivery_postcode": delivery_postcode,
            "weight": weight,
            "cod": cod,
        },
    )


async def get_rates(
    pickup_postcode: str,
    delivery_postcode: str,
    weight: float,
    order_id: str,
    cod: int = 0,
) -> Dict[str, Any]:
    """
    Get shipping rates.
    POST /courier/serviceability/
    """
    return await _request(
        "POST",
        "/courier/serviceability/",
        json={
            "pickup_postcode": pickup_postcode,
            "delivery_postcode": delivery_postcode,
            "weight": weight,
            "order_id": order_id,
            "cod": cod,
        },
    )


# ---------- Order creation ----------


async def create_order(order_payload: Dict[str, Any]) -> Dict[str, Any]:
    """
    Create order in Shiprocket (adhoc).
    POST /orders/create/adhoc
    Returns order_id, shipment_id, etc.
    """
    return await _request("POST", "/orders/create/adhoc", json=order_payload)


async def assign_awb(
    shipment_id: str,
    courier_id: int,
) -> Dict[str, Any]:
    """Assign AWB to shipment. POST /courier/assign/awb"""
    return await _request(
        "POST",
        "/courier/assign/awb",
        json={
            "shipment_id": shipment_id,
            "courier_id": courier_id,
        },
    )


async def create_pickup(shipment_id: str) -> Dict[str, Any]:
    """Create pickup for shipment. POST /courier/generate/pickup"""
    return await _request(
        "POST",
        "/courier/generate/pickup",
        json={"shipment_id": [shipment_id]},
    )


# ---------- Labels & invoices ----------


async def generate_label(shipment_id: str) -> Dict[str, Any]:
    """
    Generate shipping label (PDF).
    POST /courier/generate/label
    Returns label_url or base64 PDF.
    """
    return await _request(
        "POST",
        "/courier/generate/label",
        json={"shipment_id": [shipment_id]},
    )


async def generate_invoice(shipment_id: str) -> Dict[str, Any]:
    """
    Generate invoice (PDF) via Shiprocket.
    POST /orders/print/invoice
    """
    return await _request(
        "POST",
        "/orders/print/invoice",
        json={"shipment_id": [shipment_id]},
    )


# ---------- Tracking ----------


async def get_tracking(shipment_id: str) -> Dict[str, Any]:
    """Get tracking by shipment_id. GET /courier/track/shipment/{shipment_id}"""
    return await _request("GET", f"/courier/track/shipment/{shipment_id}")


async def get_tracking_by_awb(awb: str) -> Dict[str, Any]:
    """Get tracking by AWB. GET /courier/track/awb/{awb}"""
    return await _request("GET", f"/courier/track/awb/{awb}")


# ---------- Cancellation ----------


async def cancel_order(order_id: str) -> Dict[str, Any]:
    """Cancel order. POST /orders/cancel"""
    return await _request("POST", "/orders/cancel", json={"ids": [order_id]})


async def update_order_adhoc(order_payload: Dict[str, Any]) -> Dict[str, Any]:
    """Update adhoc order. POST /orders/update/adhoc"""
    return await _request("POST", "/orders/update/adhoc", json=order_payload)


def build_order_payload(
    order_number: str,
    customer_name: str,
    customer_phone: str,
    customer_email: str,
    address: str,
    city: str,
    state: str,
    pincode: str,
    country: str,
    order_items: List[Dict[str, Any]],
    total_amount: float,
    payment_method: str = "Prepaid",
    weight: float = 0.5,
    length: float = 10.0,
    width: float = 10.0,
    height: float = 5.0,
    pickup_location: str = "Primary",
) -> Dict[str, Any]:
    """
    Build Shiprocket adhoc order payload.
    payment_method: Prepaid | COD
    order_items: list of {name, sku, units, selling_price}
    """
    normalized_items: List[Dict[str, Any]] = []
    for it in order_items:
        normalized_items.append(
            {
                "name": it.get("name", ""),
                "sku": it.get("sku", ""),
                "units": int(it.get("units", 1) or 1),
                # Shiprocket adhoc endpoint expects selling_price
                "selling_price": float(it.get("selling_price", it.get("price", 0)) or 0),
                "discount": str(it.get("discount", "")),
                "tax": str(it.get("tax", "")),
                "hsn": it.get("hsn", ""),
            }
        )

    pm = (payment_method or "Prepaid").strip().lower()
    payment_method_value = "COD" if pm in ("cod", "cash_on_delivery", "cash on delivery") else "Prepaid"

    return {
        "order_id": order_number,
        "order_date": time.strftime("%Y-%m-%d %H:%M:%S"),
        "billing_customer_name": customer_name,
        "billing_last_name": "",
        "billing_address": address,
        "billing_address_2": "",
        "billing_city": city,
        "billing_pincode": pincode,
        "billing_state": state,
        "billing_country": country,
        "billing_email": customer_email,
        "billing_phone": customer_phone,
        "shipping_is_billing": True,
        "shipping_customer_name": customer_name,
        "shipping_last_name": "",
        "shipping_address": address,
        "shipping_address_2": "",
        "shipping_city": city,
        "shipping_pincode": pincode,
        "shipping_state": state,
        "shipping_country": country,
        "shipping_email": customer_email,
        "shipping_phone": customer_phone,
        "order_items": normalized_items,
        "payment_method": payment_method_value,
        "shipping_charges": 0,
        "giftwrap_charges": 0,
        "transaction_charges": 0,
        "total_discount": 0,
        "sub_total": total_amount,
        "length": length,
        # Shiprocket expects breadth, not width
        "breadth": width,
        "height": height,
        "weight": weight,
        "pickup_location": pickup_location,
    }


# ---------- SR Checkout (Payment gateway) ----------
# Ref: https://docs.google.com/document/d/1uEcKW0uPAldhKiFCqJbAQnAmBTP6Azvlt_Rcxu5BW_0


async def create_checkout_access_token(
    *,
    items: List[Dict[str, Any]],
    redirect_url: str,
    mobile_app: bool = False,
    timestamp_iso: Optional[str] = None,
) -> Dict[str, Any]:
    """
    Create SR Checkout access token (headless checkout).

    Endpoint (per SRC Custom Integration): POST /api/v1/access-token/checkout
    Auth: X-Api-Key + X-Api-HMAC-SHA256 where signature is HMAC-SHA256(body) in Base64.

    Body shape (example):
      {
        "cart_data": {"items":[{"variant_id":"86","quantity":1}], "mobile_app": false},
        "redirect_url": "https://example.com/callback?order_uuid=...",
        "timestamp": "2026-03-18T12:34:56.000Z"
      }
    """
    if not settings.SHIPROCKET_CHECKOUT_API_KEY or not settings.SHIPROCKET_CHECKOUT_SECRET_KEY:
        raise ValueError("Shiprocket SR Checkout credentials not configured (SHIPROCKET_CHECKOUT_API_KEY/SECRET_KEY)")
    if not settings.SHIPROCKET_CHECKOUT_TOKEN_URL:
        raise ValueError("Shiprocket SR Checkout token URL not configured (SHIPROCKET_CHECKOUT_TOKEN_URL)")

    if not timestamp_iso:
        # Shiprocket examples use UTC with milliseconds and trailing Z
        timestamp_iso = time.strftime("%Y-%m-%dT%H:%M:%S.000Z", time.gmtime())

    payload = {
        "cart_data": {
            "items": items,
            "mobile_app": bool(mobile_app),
        },
        "redirect_url": redirect_url,
        "timestamp": timestamp_iso,
    }

    # Important: keep JSON canonicalized (no spaces) to match HMAC generation expectations
    body_bytes = json.dumps(payload, separators=(",", ":"), ensure_ascii=False).encode("utf-8")
    sig_bytes = hmac.new(
        settings.SHIPROCKET_CHECKOUT_SECRET_KEY.encode("utf-8"),
        body_bytes,
        hashlib.sha256,
    ).digest()
    signature_b64 = base64.b64encode(sig_bytes).decode("ascii")

    async with httpx.AsyncClient() as client:
        r = await client.post(
            settings.SHIPROCKET_CHECKOUT_TOKEN_URL,
            content=body_bytes,
            headers={
                "Content-Type": "application/json",
                "X-Api-Key": settings.SHIPROCKET_CHECKOUT_API_KEY,
                "X-Api-HMAC-SHA256": signature_b64,
            },
            timeout=20.0,
        )
        r.raise_for_status()
        data = r.json() if r.content else {}
        return data if isinstance(data, dict) else {"data": data}


async def create_checkout_session(
    order_id: int,
    order_number: str,
    order_uuid: str,
    amount: float,
    currency: str,
    customer_name: str,
    customer_email: str,
    customer_phone: str,
    success_url: str,
    cancel_url: str,
    webhook_url: str,
) -> Optional[Dict[str, Any]]:
    """
    Create SR Checkout payment session. Returns dict with checkout_url (and optionally session_id)
    or None if disabled/failed. Uses SHIPROCKET_CHECKOUT_SESSION_URL and same auth as shipping API.
    """
    from app.config import settings
    if not settings.SHIPROCKET_CHECKOUT_ENABLED or not settings.SHIPROCKET_CHECKOUT_SESSION_URL:
        logger.info(
            "Shiprocket checkout session skipped enabled=%s has_session_url=%s",
            settings.SHIPROCKET_CHECKOUT_ENABLED,
            bool(settings.SHIPROCKET_CHECKOUT_SESSION_URL),
        )
        return None
    logger.info(
        "Shiprocket checkout session start order_id=%s order_number=%s amount=%s currency=%s",
        order_id,
        order_number,
        amount,
        currency.upper() or "INR",
    )
    payload = {
        "order_id": order_id,
        "order_number": order_number,
        "order_uuid": order_uuid,
        "amount": amount,
        "currency": currency.upper() or "INR",
        "customer": {
            "name": customer_name,
            "email": customer_email or "",
            "phone": customer_phone,
        },
        "success_url": success_url,
        "cancel_url": cancel_url,
        "webhook_url": webhook_url,
    }
    body_bytes = json.dumps(payload, separators=(",", ":")).encode("utf-8")

    def _hmac_headers() -> Dict[str, str]:
        """X-Api-Key + X-Api-HMAC-SHA256 per SR Checkout doc (HMAC SHA256 in Base64)."""
        h = {"X-Api-Key": settings.SHIPROCKET_CHECKOUT_API_KEY}
        if settings.SHIPROCKET_CHECKOUT_SECRET_KEY:
            sig_bytes = hmac.new(
                settings.SHIPROCKET_CHECKOUT_SECRET_KEY.encode("utf-8"),
                body_bytes,
                hashlib.sha256,
            ).digest()
            h["X-Api-HMAC-SHA256"] = base64.b64encode(sig_bytes).decode("ascii")
        return h

    def _session_url_with_public_api(base_url: str) -> Optional[str]:
        """If base_url is checkout-api.shiprocket.com and path does not contain /public-api/, insert it."""
        if "/public-api" in base_url:
            return None
        try:
            from urllib.parse import urlparse, urlunparse
            parsed = urlparse(base_url)
            netloc = parsed.netloc
            path = parsed.path or "/"
            if "checkout-api.shiprocket.com" in netloc and not path.startswith("/public-api"):
                new_path = "/public-api" + path if path.startswith("/") else "/public-api/" + path
                new = parsed._replace(path=new_path)
                return urlunparse(new)
        except Exception:
            pass
        return None

    async def _post(
        headers: Dict[str, str],
        body: bytes = body_bytes,
        *,
        session_url: Optional[str] = None,
    ) -> Optional[Dict[str, Any]]:
        url = session_url or settings.SHIPROCKET_CHECKOUT_SESSION_URL
        logger.info(
            "Shiprocket checkout session request url=%s payload_keys=%s",
            url,
            list(payload.keys()),
        )
        async with httpx.AsyncClient() as client:
            r = await client.post(
                url,
                content=body,
                headers={**headers, "Content-Type": "application/json"},
                timeout=15.0,
            )
            if r.status_code >= 400:
                logger.warning(
                    "Shiprocket checkout session failed status=%s body=%s",
                    r.status_code,
                    (r.text[:500] if r.text else ""),
                )
                if r.status_code == 404 and r.text and "public-api" in r.text and session_url is None:
                    alt_url = _session_url_with_public_api(settings.SHIPROCKET_CHECKOUT_SESSION_URL or "")
                    if alt_url:
                        logger.info(
                            "Shiprocket checkout session retrying with public-api URL url=%s",
                            alt_url,
                        )
                        return await _post(headers, body, session_url=alt_url)
                return None
            data = r.json() if r.content else {}
            logger.info(
                "Shiprocket checkout session response status=%s keys=%s",
                r.status_code,
                list(data.keys()) if isinstance(data, dict) else type(data).__name__,
            )
            return data

    data: Optional[Dict[str, Any]] = None
    # Try auth in order: (1) X-Api-Key + X-Api-HMAC-SHA256 (checkout-api.shiprocket.com), (2) Bearer API key, (3) X-API-Key only, (4) Shipping token
    auth_tried: List[str] = []
    if settings.SHIPROCKET_CHECKOUT_API_KEY:
        # SR Checkout doc: checkout-api.shiprocket.com uses X-Api-Key and X-Api-HMAC-SHA256
        auth_tried.append("X-Api-Key + HMAC")
        data = await _post(_hmac_headers())
        if data:
            auth_tried.clear()
            url = (
                data.get("checkout_url")
                or data.get("payment_url")
                or data.get("redirect_url")
                or data.get("url")
                or (data.get("data", {}) or {}).get("checkout_url")
                or (data.get("data", {}) or {}).get("payment_url")
            )
            if url:
                logger.info(
                    "Shiprocket checkout session success auth=X-Api-Key+HMAC checkout_url_len=%s session_id=%s",
                    len(url),
                    data.get("session_id") or data.get("id"),
                )
                return {"checkout_url": url, "session_id": data.get("session_id") or data.get("id")}
            logger.warning(
                "Shiprocket checkout session response 200 but no checkout_url keys=%s",
                list(data.keys()) if isinstance(data, dict) else "non-dict",
            )
        auth_tried.append("Bearer API key")
        data = await _post({"Authorization": f"Bearer {settings.SHIPROCKET_CHECKOUT_API_KEY}"})
        if data:
            auth_tried.clear()
            url = (
                data.get("checkout_url")
                or data.get("payment_url")
                or data.get("redirect_url")
                or data.get("url")
                or (data.get("data", {}) or {}).get("checkout_url")
                or (data.get("data", {}) or {}).get("payment_url")
            )
            if url:
                logger.info(
                    "Shiprocket checkout session success auth=Bearer+API_key checkout_url_len=%s session_id=%s",
                    len(url),
                    data.get("session_id") or data.get("id"),
                )
                return {"checkout_url": url, "session_id": data.get("session_id") or data.get("id")}
            logger.warning(
                "Shiprocket checkout session Bearer response 200 but no checkout_url keys=%s",
                list(data.keys()) if isinstance(data, dict) else "non-dict",
            )
        headers = {"X-API-Key": settings.SHIPROCKET_CHECKOUT_API_KEY}
        if settings.SHIPROCKET_CHECKOUT_SECRET_KEY:
            headers["X-API-Secret"] = settings.SHIPROCKET_CHECKOUT_SECRET_KEY
        auth_tried.append("X-API-Key (+ Secret)")
        data = await _post(headers)
        if data:
            auth_tried.clear()
            url = (
                data.get("checkout_url")
                or data.get("payment_url")
                or data.get("redirect_url")
                or data.get("url")
                or (data.get("data", {}) or {}).get("checkout_url")
                or (data.get("data", {}) or {}).get("payment_url")
            )
            if url:
                logger.info(
                    "Shiprocket checkout session success auth=X-API-Key+Secret checkout_url_len=%s session_id=%s",
                    len(url),
                    data.get("session_id") or data.get("id"),
                )
                return {"checkout_url": url, "session_id": data.get("session_id") or data.get("id")}
            logger.warning(
                "Shiprocket checkout session X-API-Key+Secret response 200 but no checkout_url keys=%s",
                list(data.keys()) if isinstance(data, dict) else "non-dict",
            )
    # No shipping-token fallback: checkout-api.shiprocket.com uses Checkout API Key + Secret only.
    # SHIPROCKET_EMAIL/PASSWORD are for the shipping API (apiv2.shiprocket.in), not required for payment.
    if not settings.SHIPROCKET_CHECKOUT_API_KEY:
        logger.warning("Shiprocket checkout session no SHIPROCKET_CHECKOUT_API_KEY configured")
    elif auth_tried:
        logger.warning(
            "Shiprocket checkout session could not get checkout_url; auth_tried=%s",
            auth_tried,
        )
    return None

