"""
Inventory API - Stock management and barcode scanning.
"""
from typing import List, Optional
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, status, Query, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from sqlalchemy.orm import selectinload

from app.database import get_db
from app.models.product import Product
from app.models.inventory import Inventory, InventoryLog
from app.models.variant import ProductVariant, VariantInventory, VariantInventoryLog
from app.schemas.inventory import (
    InventoryUpdate, InventoryResponse, InventoryScanRequest, 
    InventoryScanResponse, InventoryLogResponse,
    InventoryBulkScanRequest, InventoryBulkScanResponse
)
from app.services.auth import get_admin_user, get_current_user
from app.services.event_service import EventService
from app.services.barcode_generator import BarcodeGenerator
from app.models.user import User

router = APIRouter()


@router.get("", response_model=List[InventoryResponse])
async def list_inventory(
    low_stock: Optional[bool] = Query(None, description="Filter low stock items"),
    out_of_stock: Optional[bool] = Query(None, description="Filter out of stock items"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_admin_user)
):
    """List all inventory records."""
    query = select(Inventory).options(selectinload(Inventory.product))
    
    if out_of_stock:
        query = query.where(Inventory.quantity == 0)
    elif low_stock:
        query = query.where(Inventory.quantity <= Inventory.low_stock_threshold, Inventory.quantity > 0)
    
    result = await db.execute(query)
    inventory_items = result.scalars().all()
    
    return [
        InventoryResponse(
            id=inv.id,
            uuid=inv.uuid,
            product_id=inv.product_id,
            quantity=inv.quantity,
            reserved_quantity=inv.reserved_quantity,
            available_quantity=inv.available_quantity,
            low_stock_threshold=inv.low_stock_threshold,
            reorder_point=inv.reorder_point,
            location=inv.location,
            track_inventory=inv.track_inventory,
            allow_backorder=inv.allow_backorder,
            is_in_stock=inv.is_in_stock,
            is_low_stock=inv.is_low_stock,
            last_scanned_at=inv.last_scanned_at,
            created_at=inv.created_at,
            updated_at=inv.updated_at,
        )
        for inv in inventory_items
    ]


@router.get("/stats")
async def get_inventory_stats(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_admin_user)
):
    """Get inventory statistics."""
    # Total products
    total_result = await db.execute(select(func.count(Product.id)))
    total_products = total_result.scalar() or 0
    
    # In stock
    in_stock_result = await db.execute(
        select(func.count(Inventory.id)).where(Inventory.quantity > 0)
    )
    in_stock = in_stock_result.scalar() or 0
    
    # Out of stock
    out_of_stock_result = await db.execute(
        select(func.count(Inventory.id)).where(Inventory.quantity == 0)
    )
    out_of_stock = out_of_stock_result.scalar() or 0
    
    # Low stock
    low_stock_result = await db.execute(
        select(func.count(Inventory.id)).where(
            Inventory.quantity > 0,
            Inventory.quantity <= Inventory.low_stock_threshold
        )
    )
    low_stock = low_stock_result.scalar() or 0
    
    # Total inventory value (if cost prices available)
    # This is a simplified calculation
    
    return {
        "total_products": total_products,
        "in_stock": in_stock,
        "out_of_stock": out_of_stock,
        "low_stock": low_stock,
    }


@router.get("/{product_id}", response_model=InventoryResponse)
async def get_product_inventory(
    product_id: int,
    db: AsyncSession = Depends(get_db)
):
    """Get inventory for a specific product."""
    result = await db.execute(
        select(Inventory).where(Inventory.product_id == product_id)
    )
    inventory = result.scalar_one_or_none()
    
    if not inventory:
        raise HTTPException(status_code=404, detail="Inventory not found")
    
    return InventoryResponse(
        id=inventory.id,
        uuid=inventory.uuid,
        product_id=inventory.product_id,
        quantity=inventory.quantity,
        reserved_quantity=inventory.reserved_quantity,
        available_quantity=inventory.available_quantity,
        low_stock_threshold=inventory.low_stock_threshold,
        reorder_point=inventory.reorder_point,
        location=inventory.location,
        track_inventory=inventory.track_inventory,
        allow_backorder=inventory.allow_backorder,
        is_in_stock=inventory.is_in_stock,
        is_low_stock=inventory.is_low_stock,
        last_scanned_at=inventory.last_scanned_at,
        created_at=inventory.created_at,
        updated_at=inventory.updated_at,
    )


@router.put("/{product_id}", response_model=InventoryResponse)
async def update_inventory(
    product_id: int,
    data: InventoryUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_admin_user)
):
    """Update inventory settings for a product."""
    result = await db.execute(
        select(Inventory).where(Inventory.product_id == product_id)
    )
    inventory = result.scalar_one_or_none()
    
    if not inventory:
        raise HTTPException(status_code=404, detail="Inventory not found")
    
    update_data = data.model_dump(exclude_unset=True)
    
    # If quantity is being changed, log it
    if "quantity" in update_data and update_data["quantity"] != inventory.quantity:
        old_qty = inventory.quantity
        new_qty = update_data["quantity"]
        
        log = InventoryLog(
            inventory_id=inventory.id,
            action="adjustment",
            quantity_change=new_qty - old_qty,
            quantity_before=old_qty,
            quantity_after=new_qty,
            reason="Manual adjustment",
            user_id=current_user.id,
        )
        db.add(log)
        
        await EventService.log_event(
            db=db,
            event_type="inventory_updated",
            entity_type="inventory",
            entity_id=inventory.product_id,
            data={
                "previous_quantity": old_qty,
                "new_quantity": new_qty,
                "change": new_qty - old_qty,
            },
            user_id=current_user.id,
        )
    
    for key, value in update_data.items():
        setattr(inventory, key, value)
    
    await db.commit()
    await db.refresh(inventory)
    
    return InventoryResponse(
        id=inventory.id,
        uuid=inventory.uuid,
        product_id=inventory.product_id,
        quantity=inventory.quantity,
        reserved_quantity=inventory.reserved_quantity,
        available_quantity=inventory.available_quantity,
        low_stock_threshold=inventory.low_stock_threshold,
        reorder_point=inventory.reorder_point,
        location=inventory.location,
        track_inventory=inventory.track_inventory,
        allow_backorder=inventory.allow_backorder,
        is_in_stock=inventory.is_in_stock,
        is_low_stock=inventory.is_low_stock,
        last_scanned_at=inventory.last_scanned_at,
        created_at=inventory.created_at,
        updated_at=inventory.updated_at,
    )


@router.post("/scan", response_model=InventoryScanResponse)
async def scan_inventory(
    data: InventoryScanRequest,
    request: Request,
    db: AsyncSession = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user)
):
    """
    Process a barcode/QR scan to update inventory.
    Can be called from mobile or desktop.
    Supports both product barcodes and variant barcodes.
    """
    product = None
    variant = None
    inventory = None
    item_name = None
    item_sku = None
    
    # First, check if this barcode matches any variant (including default variant with product barcode)
    if data.barcode:
        result = await db.execute(
            select(ProductVariant)
            .options(
                selectinload(ProductVariant.inventory),
                selectinload(ProductVariant.product)
            )
            .where(ProductVariant.barcode == data.barcode)
        )
        variant = result.scalar_one_or_none()
        
        if variant:
            product = variant.product
            inventory = variant.inventory
            item_name = f"{product.name} - {variant.name}"
            item_sku = variant.sku
    
    # If not a variant barcode, try to find product by ID or barcode
    if not variant:
        if data.product_id:
            result = await db.execute(
                select(Product)
                .options(
                    selectinload(Product.inventory),
                    selectinload(Product.variants).selectinload(ProductVariant.inventory)
                )
                .where(Product.id == data.product_id)
            )
            product = result.scalar_one_or_none()
        elif data.barcode:
            # Try to decode QR content first
            decoded = BarcodeGenerator.decode_barcode(data.barcode)
            
            if "product_id" in decoded:
                result = await db.execute(
                    select(Product)
                    .options(
                        selectinload(Product.inventory),
                        selectinload(Product.variants).selectinload(ProductVariant.inventory)
                    )
                    .where(Product.id == decoded["product_id"])
                )
                product = result.scalar_one_or_none()
            else:
                result = await db.execute(
                    select(Product)
                    .options(
                        selectinload(Product.inventory),
                        selectinload(Product.variants).selectinload(ProductVariant.inventory)
                    )
                    .where(Product.barcode == data.barcode)
                )
                product = result.scalar_one_or_none()
        
        if product:
            # Check if product has variants - if so, use the default variant's inventory
            if product.variants:
                # Find default variant (or first variant if no default)
                default_variant = next((v for v in product.variants if v.is_default), None)
                if not default_variant and product.variants:
                    default_variant = product.variants[0]
                
                if default_variant:
                    variant = default_variant
                    inventory = default_variant.inventory
                    item_name = f"{product.name} - {default_variant.name}"
                    item_sku = default_variant.sku
                else:
                    inventory = product.inventory
                    item_name = product.name
                    item_sku = product.sku
            else:
                # No variants, use product inventory
                inventory = product.inventory
                item_name = product.name
                item_sku = product.sku
    
    if not product:
        raise HTTPException(status_code=404, detail="Product or variant not found")
    
    if not inventory:
        raise HTTPException(status_code=404, detail="Inventory not initialized")
    
    previous_qty = inventory.quantity
    
    # Calculate change based on action
    if data.action == "scan_in":
        change = abs(data.quantity)
    elif data.action == "scan_out":
        change = -abs(data.quantity)
        if inventory.quantity + change < 0:
            raise HTTPException(
                status_code=400, 
                detail=f"Cannot remove {abs(change)} items. Only {inventory.quantity} in stock."
            )
    else:
        raise HTTPException(status_code=400, detail="Invalid action. Use 'scan_in' or 'scan_out'")
    
    # Update inventory
    inventory.quantity += change
    
    # Update last_scanned_at if available (only on Inventory, not VariantInventory)
    if hasattr(inventory, 'last_scanned_at'):
        inventory.last_scanned_at = datetime.utcnow()
    
    # Create log entry
    if variant:
        # Create variant inventory log
        variant_log = VariantInventoryLog(
            variant_inventory_id=inventory.id,
            action=data.action,
            quantity_change=change,
            quantity_before=previous_qty,
            quantity_after=inventory.quantity,
            reason=data.reason,
            device_type=data.device_type,
            device_info=data.device_info,
            user_id=current_user.id if current_user else None,
        )
        db.add(variant_log)
    elif hasattr(inventory, 'id'):
        # Create product inventory log
        log = InventoryLog(
            inventory_id=inventory.id,
            action=data.action,
            quantity_change=change,
            quantity_before=previous_qty,
            quantity_after=inventory.quantity,
            reason=data.reason,
            device_type=data.device_type,
            device_info=data.device_info,
            user_id=current_user.id if current_user else None,
        )
        db.add(log)
    
    # Broadcast event
    await EventService.log_inventory_scan(
        db=db,
        product_id=product.id,
        product_uuid=product.uuid,
        scan_data={
            "product_name": item_name,
            "product_sku": item_sku,
            "action": data.action,
            "previous_quantity": previous_qty,
            "new_quantity": inventory.quantity,
            "change": change,
            "variant_id": variant.id if variant else None,
            "variant_name": variant.name if variant else None,
        },
        user_id=current_user.id if current_user else None,
        device_type=data.device_type,
    )
    
    await db.commit()
    
    # Get low stock threshold (different for variant vs product)
    low_stock_threshold = getattr(inventory, 'low_stock_threshold', 5)
    
    return InventoryScanResponse(
        success=True,
        message=f"Inventory {'increased' if change > 0 else 'decreased'} by {abs(change)}" + (f" for {variant.name}" if variant else ""),
        product_id=product.id,
        product_name=item_name,
        product_sku=item_sku,
        previous_quantity=previous_qty,
        new_quantity=inventory.quantity,
        change=change,
        is_in_stock=inventory.quantity > 0,
        is_low_stock=inventory.quantity <= low_stock_threshold,
        timestamp=datetime.utcnow(),
    )


@router.post("/scan/bulk", response_model=InventoryBulkScanResponse)
async def bulk_scan_inventory(
    data: InventoryBulkScanRequest,
    request: Request,
    db: AsyncSession = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user)
):
    """Process multiple scans at once."""
    results = []
    errors = []
    
    for scan in data.scans:
        try:
            result = await scan_inventory(scan, request, db, current_user)
            results.append(result)
        except HTTPException as e:
            errors.append({
                "barcode": scan.barcode,
                "product_id": scan.product_id,
                "error": e.detail,
            })
    
    return InventoryBulkScanResponse(
        success_count=len(results),
        error_count=len(errors),
        results=results,
        errors=errors,
    )


@router.get("/{product_id}/logs", response_model=List[InventoryLogResponse])
async def get_inventory_logs(
    product_id: int,
    limit: int = Query(50, le=100),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_admin_user)
):
    """Get inventory change history for a product."""
    result = await db.execute(
        select(Inventory).where(Inventory.product_id == product_id)
    )
    inventory = result.scalar_one_or_none()
    
    if not inventory:
        raise HTTPException(status_code=404, detail="Inventory not found")
    
    logs_result = await db.execute(
        select(InventoryLog)
        .where(InventoryLog.inventory_id == inventory.id)
        .order_by(InventoryLog.created_at.desc())
        .limit(limit)
    )
    logs = logs_result.scalars().all()
    
    return [InventoryLogResponse.model_validate(log) for log in logs]


@router.get("/variant/{variant_id}/logs", response_model=List[InventoryLogResponse])
async def get_variant_inventory_logs(
    variant_id: int,
    limit: int = Query(50, le=100),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_admin_user)
):
    """Get inventory change history for a variant."""
    # Get variant inventory
    result = await db.execute(
        select(VariantInventory).where(VariantInventory.variant_id == variant_id)
    )
    variant_inventory = result.scalar_one_or_none()
    
    if not variant_inventory:
        return []
    
    # Get logs
    logs_result = await db.execute(
        select(VariantInventoryLog)
        .where(VariantInventoryLog.variant_inventory_id == variant_inventory.id)
        .order_by(VariantInventoryLog.created_at.desc())
        .limit(limit)
    )
    logs = logs_result.scalars().all()
    
    # Map to response format (same as InventoryLogResponse)
    return [
        {
            "id": log.id,
            "uuid": log.uuid,
            "action": log.action,
            "quantity_change": log.quantity_change,
            "quantity_before": log.quantity_before,
            "quantity_after": log.quantity_after,
            "reason": log.reason,
            "reference": log.reference,
            "device_type": log.device_type,
            "device_info": log.device_info,
            "user_id": log.user_id,
            "created_at": log.created_at,
        }
        for log in logs
    ]

