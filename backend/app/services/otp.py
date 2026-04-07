"""
OTP service for customer login: send and verify OTP.
Supports WhatsApp Cloud API (template) and development dummy OTP when WhatsApp is not configured.
"""
import random
import string
import time
import logging
from typing import Optional

import httpx

from app.config import settings

logger = logging.getLogger(__name__)

# In-memory store: phone -> { "otp": str, "expires_at": float }
_otp_store: dict[str, dict] = {}
OTP_TTL_SECONDS = 300  # 5 minutes
OTP_LENGTH = 6


def _generate_otp() -> str:
    return "".join(random.choices(string.digits, k=OTP_LENGTH))


def _has_whatsapp() -> bool:
    return bool(
        (getattr(settings, "WHATSAPP_ACCESS_TOKEN", None) or "").strip()
        and (getattr(settings, "WHATSAPP_PHONE_NUMBER_ID", None) or "").strip()
    )


def send_otp(phone: str, name: Optional[str] = None) -> str:
    """
    Generate and store OTP for phone.
    If WhatsApp Cloud API is configured, sends template message; else dummy OTP for dev.
    Name is stored so we can create user on verify. Returns the OTP stored.
    """
    normalized = phone.strip().replace(" ", "")
    if not normalized:
        raise ValueError("Phone number required")

    use_dummy = getattr(settings, "OTP_DUMMY_FOR_DEV", True) and not _has_whatsapp()
    if use_dummy:
        otp = getattr(settings, "OTP_DUMMY_CODE", "123456")
    else:
        otp = _generate_otp()

    _otp_store[normalized] = {
        "otp": otp,
        "expires_at": time.time() + OTP_TTL_SECONDS,
        "name": (name or "").strip() or None,
    }

    if _has_whatsapp():
        try:
            _send_whatsapp_template(normalized, otp)
        except Exception as e:
            logger.exception("WhatsApp send failed: %s", e)
            raise
    return otp


def _whatsapp_recipient_digits(phone: str) -> str:
    """E.164 digits only, no + (WhatsApp Cloud API `to` field)."""
    p = phone.strip().replace(" ", "")
    digits = "".join(c for c in p if c.isdigit())
    if not digits:
        raise ValueError("Invalid phone number")
    if len(digits) > 10:
        if len(digits) == 11 and digits.startswith("0"):
            return "91" + digits[1:]
        return digits
    if len(digits) == 10:
        return "91" + digits
    return digits


def _send_whatsapp_template(to_phone: str, otp: str) -> None:
    """Send OTP via WhatsApp approved template (one body variable: login code)."""
    token = (settings.WHATSAPP_ACCESS_TOKEN or "").strip()
    phone_number_id = (settings.WHATSAPP_PHONE_NUMBER_ID or "").strip()
    version = (getattr(settings, "WHATSAPP_GRAPH_API_VERSION", None) or "v21.0").strip()
    template_name = (getattr(settings, "WHATSAPP_OTP_TEMPLATE_NAME", None) or "otp_login").strip()
    lang = (getattr(settings, "WHATSAPP_OTP_TEMPLATE_LANGUAGE", None) or "en_US").strip()
    if not token or not phone_number_id:
        logger.warning("WhatsApp not fully configured; skipping send")
        return

    to_digits = _whatsapp_recipient_digits(to_phone)
    url = f"https://graph.facebook.com/{version}/{phone_number_id}/messages"
    components: list[dict] = [
        {
            "type": "body",
            "parameters": [{"type": "text", "text": otp}],
        }
    ]
    if getattr(settings, "WHATSAPP_OTP_TEMPLATE_HAS_URL_BUTTON", False):
        btn_text = otp
        if not getattr(settings, "WHATSAPP_OTP_URL_BUTTON_USE_BODY_OTP", True):
            btn_text = (getattr(settings, "WHATSAPP_OTP_URL_BUTTON_PARAM", None) or "").strip()
        components.append(
            {
                "type": "button",
                "sub_type": "url",
                "index": "0",
                "parameters": [{"type": "text", "text": btn_text}],
            }
        )
    payload = {
        "messaging_product": "whatsapp",
        "to": to_digits,
        "type": "template",
        "template": {
            "name": template_name,
            "language": {"code": lang},
            "components": components,
        },
    }
    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json",
    }
    with httpx.Client(timeout=30.0) as client:
        r = client.post(url, json=payload, headers=headers)
    if r.status_code >= 400:
        logger.error("WhatsApp API HTTP %s: %s", r.status_code, r.text)
        r.raise_for_status()


def verify_otp(phone: str, otp: str) -> tuple[bool, Optional[str]]:
    """
    Verify OTP for phone. Returns (success, name_from_send).
    Development: dummy OTP (e.g. 123456) always valid (name from store if present).
    """
    normalized = phone.strip().replace(" ", "")
    dummy = getattr(settings, "OTP_DUMMY_CODE", "123456")
    if otp.strip() == dummy:
        entry = _otp_store.get(normalized)
        name = entry.get("name") if entry else None
        return True, name
    entry = _otp_store.get(normalized)
    if not entry:
        return False, None
    if time.time() > entry["expires_at"]:
        del _otp_store[normalized]
        return False, None
    if entry["otp"] != otp.strip():
        return False, None
    name = entry.get("name")
    del _otp_store[normalized]
    return True, name
