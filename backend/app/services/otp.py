"""
OTP service for customer login: send and verify OTP.
Supports WhatsApp Cloud API (template) and development dummy OTP when WhatsApp is not configured.
"""
import random
import string
import time
import logging
from typing import Optional

from app.config import settings
from app.services.whatsapp import is_configured, send_template

logger = logging.getLogger(__name__)

# In-memory store: phone -> { "otp": str, "expires_at": float }
_otp_store: dict[str, dict] = {}
OTP_TTL_SECONDS = 300  # 5 minutes
OTP_LENGTH = 6


def _generate_otp() -> str:
    return "".join(random.choices(string.digits, k=OTP_LENGTH))


def _has_whatsapp() -> bool:
    return is_configured()


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


def _send_whatsapp_template(to_phone: str, otp: str) -> None:
    """Send OTP via WhatsApp approved template (one body variable: login code)."""
    template_name = (getattr(settings, "WHATSAPP_OTP_TEMPLATE_NAME", None) or "otp_login").strip()
    lang = (settings.WHATSAPP_TEMPLATE_LANGUAGE or "en_US").strip()
    extra_components: list[dict] = []
    if getattr(settings, "WHATSAPP_OTP_TEMPLATE_HAS_URL_BUTTON", False):
        btn_text = otp
        if not getattr(settings, "WHATSAPP_OTP_URL_BUTTON_USE_BODY_OTP", True):
            btn_text = (getattr(settings, "WHATSAPP_OTP_URL_BUTTON_PARAM", None) or "").strip()
        extra_components.append(
            {
                "type": "button",
                "sub_type": "url",
                "index": "0",
                "parameters": [{"type": "text", "text": btn_text}],
            }
        )
    if not send_template(to_phone, template_name, lang, [otp], extra_components=extra_components or None):
        raise RuntimeError("WhatsApp OTP template send failed")


def verify_otp(phone: str, otp: str) -> tuple[bool, Optional[str]]:
    """
    Verify OTP for phone. Returns (success, name_from_send).
    When OTP_DUMMY_FOR_DEV is True, OTP_DUMMY_CODE (e.g. 123456) is accepted without a prior send match.
    When False, only the code issued for this phone (send-otp) is valid.
    """
    normalized = phone.strip().replace(" ", "")
    dummy = getattr(settings, "OTP_DUMMY_CODE", "123456")
    if getattr(settings, "OTP_DUMMY_FOR_DEV", True) and otp.strip() == dummy:
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
