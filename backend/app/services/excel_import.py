"""Parse original inventory Excel and return product groups for import."""
import re
from io import BytesIO

try:
    import openpyxl
except ImportError:
    openpyxl = None

def _parse_prices(price_cell):
    if price_cell is None or (isinstance(price_cell, str) and not price_cell.strip()):
        return []
    text = str(price_cell).strip()
    parts = re.findall(r"[\d,]+", text)
    return [int(p.replace(",", "")) for p in parts if p.replace(",", "").strip().isdigit()]

def _parse_variants(variant_cell):
    if variant_cell is None or (isinstance(variant_cell, str) and not variant_cell.strip()):
        return []
    text = re.sub(r"\s{2,}", " , ", str(variant_cell).strip())
    text = re.sub(r"/", ",", text)
    return [p.strip() for p in text.split(",") if p.strip() and p.strip() not in ("..", ".")]

def _infer_option_name(variant_values):
    if not variant_values:
        return "Option"
    first = (variant_values[0] or "").upper()
    if "SET OF" in first or first.startswith("SET "):
        return "Set"
    if first in ("SMALL", "MEDIUM", "LARGE", "UNIVERSAL FIT") or "STRING" in first:
        return "Size"
    if first in ("REMUS", "BORLA", "RGB", "CARBON FIBER", "FORGED CARBON FIBER"):
        return "Type"
    return "Option"

def parse_inventory_excel(file_bytes):
    if not openpyxl:
        raise RuntimeError("openpyxl required: pip install openpyxl")
    wb = openpyxl.load_workbook(BytesIO(file_bytes), read_only=True, data_only=True)
    ws = wb.active
    groups = []
    for i, row in enumerate(ws.iter_rows(values_only=True)):
        if i == 0:
            continue
        r = list(row) + [None] * 8
        name, qty, variants_text, price_text, features, description, category = r[1], r[2], r[3], r[4], r[5], r[6], r[7]
        if not name or (isinstance(name, str) and not name.strip()):
            continue
        name = (name or "").strip()
        category = (category or "").strip() or "Uncategorized"
        if not category and not description and not price_text:
            continue
        variant_list = _parse_variants(variants_text)
        price_list = _parse_prices(price_text)
        features_list = [x.strip() for x in re.split(r"[,;]", (features or "").strip().replace("\n", " ")) if x.strip()]
        short_desc = ((description or "")[:200]).strip() if description else ""
        desc = (description or "").strip() or ""
        qty_int = int(qty) if qty is not None and str(qty).isdigit() else 0
        if not variant_list and not price_list:
            groups.append({"product_name": name, "category": category, "description": desc, "short_description": short_desc, "features": features_list, "rows": [{"variant_option_name": "", "variant_value": "", "price": None, "initial_quantity": qty_int}]})
            continue
        if not variant_list and price_list:
            groups.append({"product_name": name, "category": category, "description": desc, "short_description": short_desc, "features": features_list, "rows": [{"variant_option_name": "", "variant_value": "", "price": price_list[0], "initial_quantity": qty_int}]})
            continue
        option_name = _infer_option_name(variant_list)
        rows = []
        for idx, var_val in enumerate(variant_list):
            price_val = price_list[idx] if idx < len(price_list) else (price_list[0] if price_list else None)
            rows.append({"variant_option_name": option_name, "variant_value": var_val.strip(), "price": price_val, "initial_quantity": qty_int})
        groups.append({"product_name": name, "category": category, "description": desc, "short_description": short_desc, "features": features_list, "rows": rows})
    wb.close()
    return groups
