from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime


class InventoryUpdate(BaseModel):
    quantity: Optional[int] = None
    low_stock_threshold: Optional[int] = None
    reorder_point: Optional[int] = None
    track_inventory: Optional[bool] = None
    allow_backorder: Optional[bool] = None
    location: Optional[str] = None


class InventoryResponse(BaseModel):
    id: int
    uuid: str
    product_id: int
    quantity: int
    reserved_quantity: int
    available_quantity: int
    low_stock_threshold: int
    reorder_point: int
    location: str
    track_inventory: bool
    allow_backorder: bool
    is_in_stock: bool
    is_low_stock: bool
    last_scanned_at: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class InventoryScanRequest(BaseModel):
    """Request body for barcode/QR scan."""
    product_id: Optional[int] = None  # Either product_id or barcode required
    barcode: Optional[str] = None
    action: str = "scan_in"  # scan_in (+1), scan_out (-1)
    quantity: int = 1  # Number to add/remove
    reason: Optional[str] = None
    device_type: Optional[str] = None  # mobile, desktop
    device_info: Optional[str] = None


class InventoryScanResponse(BaseModel):
    """Response after successful scan."""
    success: bool
    message: str
    product_id: int
    product_name: str
    product_sku: str
    previous_quantity: int
    new_quantity: int
    change: int
    is_in_stock: bool
    is_low_stock: bool
    timestamp: datetime

    class Config:
        from_attributes = True


class InventoryLogResponse(BaseModel):
    id: int
    uuid: str
    action: str
    quantity_change: int
    quantity_before: int
    quantity_after: int
    reason: Optional[str] = None
    reference: Optional[str] = None
    device_type: Optional[str] = None
    user_id: Optional[int] = None
    created_at: datetime

    class Config:
        from_attributes = True


class InventoryBulkScanRequest(BaseModel):
    """Bulk scan request for efficiency."""
    scans: List[InventoryScanRequest]


class InventoryBulkScanResponse(BaseModel):
    """Response for bulk scan."""
    success_count: int
    error_count: int
    results: List[InventoryScanResponse]
    errors: List[dict] = []

