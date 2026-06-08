"""
WhatsApp Cloud API helpers — shared by OTP login and order notifications.
"""
import logging
from typing import Optional

import httpx

from app.config import settings

logger = logging.getLogger(__name__)


def is_configured() -> bool:
    return bool(
        (getattr(settings, "WHATSAPP_ACCESS_TOKEN", None) or "").strip()
        and (getattr(settings, "WHATSAPP_PHONE_NUMBER_ID", None) or "").strip()
    )


def recipient_digits(phone: str) -> str:
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


def send_template(
    to_phone: str,
    template_name: str,
    language_code: str,
    body_parameters: Optional[list[str]] = None,
    *,
    extra_components: Optional[list[dict]] = None,
) -> bool:
    """Send an approved template. Returns True on success; logs and returns False on failure."""
    if not is_configured():
        logger.debug("WhatsApp not configured; skipping template %s", template_name)
        return False
    token = (settings.WHATSAPP_ACCESS_TOKEN or "").strip()
    phone_number_id = (settings.WHATSAPP_PHONE_NUMBER_ID or "").strip()
    version = (getattr(settings, "WHATSAPP_GRAPH_API_VERSION", None) or "v21.0").strip()
    try:
        to_digits = recipient_digits(to_phone)
        components: list[dict] = []
        if body_parameters:
            components.append(
                {
                    "type": "body",
                    "parameters": [{"type": "text", "text": p} for p in body_parameters],
                }
            )
        if extra_components:
            components.extend(extra_components)
        template_payload: dict = {
            "name": template_name,
            "language": {"code": language_code},
        }
        if components:
            template_payload["components"] = components
        payload = {
            "messaging_product": "whatsapp",
            "to": to_digits,
            "type": "template",
            "template": template_payload,
        }
        url = f"https://graph.facebook.com/{version}/{phone_number_id}/messages"
        headers = {
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json",
        }
        with httpx.Client(timeout=30.0) as client:
            r = client.post(url, json=payload, headers=headers)
        if r.status_code >= 400:
            logger.error("WhatsApp template %s HTTP %s: %s", template_name, r.status_code, r.text)
            return False
        return True
    except Exception:
        logger.exception("WhatsApp template %s failed for %s", template_name, to_phone)
        return False
