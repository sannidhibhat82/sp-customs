"""
New-order WhatsApp notifications (admin alert + logged-in customer confirmation).
Uses the same Meta Cloud API credentials as OTP login.
"""
import logging
from typing import Optional

from app.config import settings
from app.services.whatsapp import is_configured, send_template

logger = logging.getLogger(__name__)

_MAX_CATEGORIES = 3


def _unique_categories(category_names: list[str]) -> list[str]:
    seen: list[str] = []
    for raw in category_names:
        name = (raw or "").strip()
        if name and name not in seen:
            seen.append(name)
    return seen


def _categories_summary(category_names: list[str], max_show: int = _MAX_CATEGORIES) -> str:
    """Up to max_show category names, then 'and N more' if needed (keeps template text short)."""
    unique = _unique_categories(category_names)
    if not unique:
        return "—"
    if len(unique) <= max_show:
        return ", ".join(unique)
    shown = ", ".join(unique[:max_show])
    more = len(unique) - max_show
    return f"{shown} and {more} more"


def notify_new_order(
    customer_name: str,
    category_names: list[str],
    *,
    customer_phone: Optional[str] = None,
    order_number: Optional[str] = None,
) -> None:
    """
    Notify admin and (if logged-in) customer about a paid order.
    Never raises — payment flow must not fail because of WhatsApp.
    """
    if not is_configured():
        logger.debug("WhatsApp not configured; skipping order notifications")
        return

    name = (customer_name or "Customer").strip()
    categories = _categories_summary(category_names)
    ref = (order_number or "").strip() or "—"
    admin_phone = (settings.WHATSAPP_ORDER_NOTIFY_PHONE or "919482617967").strip()
    admin_template = (settings.WHATSAPP_ORDER_TEMPLATE_NAME or "").strip()
    lang = (
        (settings.WHATSAPP_ORDER_TEMPLATE_LANGUAGE or "").strip()
        or (settings.WHATSAPP_TEMPLATE_LANGUAGE or "en_US").strip()
    )

    try:
        if admin_template:
            send_template(admin_phone, admin_template, lang, [name, categories])
        else:
            logger.warning("WHATSAPP_ORDER_TEMPLATE_NAME not set; skipping admin order alert")
    except Exception:
        logger.exception("Admin order WhatsApp notification failed")

    if not customer_phone:
        return

    customer_template = (getattr(settings, "WHATSAPP_ORDER_CUSTOMER_TEMPLATE_NAME", None) or "").strip()
    if not customer_template:
        logger.debug("No customer order template configured; skipping customer WhatsApp")
        return

    try:
        # Customer: order number only — no item/category list (see template body in Meta).
        send_template(customer_phone, customer_template, lang, [name, ref])
    except Exception:
        logger.exception("Customer order WhatsApp notification failed for %s", customer_phone)
