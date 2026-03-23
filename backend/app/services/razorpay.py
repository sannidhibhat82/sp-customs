"""
Razorpay payment integration helpers.

Docs reference:
- Orders API: POST /v1/orders
- Signature verify: HMAC_SHA256(order_id|payment_id, key_secret)
"""
import hashlib
import hmac
from typing import Any, Dict, Optional

import httpx

from app.config import settings


def _auth() -> tuple[str, str]:
    if not settings.RAZORPAY_KEY_ID or not settings.RAZORPAY_KEY_SECRET:
        raise ValueError("Razorpay credentials are not configured")
    return settings.RAZORPAY_KEY_ID, settings.RAZORPAY_KEY_SECRET


async def create_order(*, amount_subunits: int, currency: str, receipt: str, notes: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
    key_id, key_secret = _auth()
    payload: Dict[str, Any] = {
        "amount": int(amount_subunits),
        "currency": (currency or "INR").upper(),
        "receipt": receipt[:40],
    }
    if notes:
        payload["notes"] = notes
    async with httpx.AsyncClient() as client:
        resp = await client.post(
            "https://api.razorpay.com/v1/orders",
            json=payload,
            auth=(key_id, key_secret),
            timeout=20.0,
        )
        resp.raise_for_status()
        data = resp.json()
        return data if isinstance(data, dict) else {}


def verify_signature(*, order_id: str, payment_id: str, signature: str) -> bool:
    _, key_secret = _auth()
    payload = f"{order_id}|{payment_id}".encode("utf-8")
    generated = hmac.new(key_secret.encode("utf-8"), payload, hashlib.sha256).hexdigest()
    return hmac.compare_digest(generated, signature or "")
