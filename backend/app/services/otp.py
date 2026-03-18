"""
OTP service for customer login: send and verify OTP.
Supports Twilio (when configured) and development dummy OTP.
"""
import random
import string
import time
import logging
from typing import Optional

from app.config import settings

logger = logging.getLogger(__name__)

# In-memory store: phone -> { "otp": str, "expires_at": float }
_otp_store: dict[str, dict] = {}
OTP_TTL_SECONDS = 300  # 5 minutes
OTP_LENGTH = 6


def _generate_otp() -> str:
    return "".join(random.choices(string.digits, k=OTP_LENGTH))


def send_otp(phone: str, name: Optional[str] = None) -> str:
    """
    Generate and store OTP for phone. If Twilio configured, send SMS; else use dummy for dev.
    Name is stored so we can create user on verify. Returns the OTP stored.
    """
    normalized = phone.strip().replace(" ", "")
    if not normalized:
        raise ValueError("Phone number required")
    otp = _generate_otp()
    if getattr(settings, "OTP_DUMMY_FOR_DEV", True) or not getattr(settings, "TWILIO_ACCOUNT_SID", None):
        otp = getattr(settings, "OTP_DUMMY_CODE", "123456")
    _otp_store[normalized] = {
        "otp": otp,
        "expires_at": time.time() + OTP_TTL_SECONDS,
        "name": (name or "").strip() or None,
    }
    if getattr(settings, "TWILIO_ACCOUNT_SID", None) and getattr(settings, "TWILIO_AUTH_TOKEN", None):
        try:
            _send_twilio_sms(normalized, otp)
        except Exception as e:
            logger.exception("Twilio send failed: %s", e)
            raise
    return otp


def _send_twilio_sms(to_phone: str, otp: str) -> None:
    """Send OTP via Twilio (optional dependency)."""
    try:
        from twilio.rest import Client
        client = Client(settings.TWILIO_ACCOUNT_SID, settings.TWILIO_AUTH_TOKEN)
        from_ = getattr(settings, "TWILIO_PHONE_NUMBER", None)
        if not from_:
            logger.warning("TWILIO_PHONE_NUMBER not set; skipping send")
            return
        client.messages.create(
            body=f"Your SP Customs login OTP is: {otp}. Valid for 5 minutes.",
            from_=from_,
            to=to_phone if to_phone.startswith("+") else f"+91{to_phone.lstrip('0')}",
        )
    except ImportError:
        logger.warning("twilio not installed; OTP not sent. Set OTP_DUMMY_FOR_DEV=true for testing.")


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
