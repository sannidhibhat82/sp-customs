"""
Orders API - Order management and shipping.
"""
from typing import List, Optional
from datetime import datetime
from decimal import Decimal
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, desc
from sqlalchemy.orm import selectinload

from app.database import get_db
from app.models.order import Order, OrderItem, DirectOrder, DirectOrderItem
from app.models.product import Product
from app.models.variant import ProductVariant
from app.models.user import User
from app.models.inventory import Inventory, InventoryLog
from app.schemas.order import (
    OrderCreate, OrderUpdate, OrderResponse, OrderListResponse,
    OrderItemCreate, OrderItemResponse, OrderScanRequest, OrderScanResponse,
    DirectOrderCreate, DirectOrderUpdate, DirectOrderResponse, DirectOrderListResponse,
    DirectOrderItemCreate, DirectOrderItemResponse
)
from app.services.auth import get_admin_user
from app.services.barcode_generator import BarcodeGenerator

router = APIRouter()


def generate_order_number() -> str:
    """Generate a unique order number."""
    now = datetime.now()
    return f"ORD-{now.strftime('%Y%m%d')}-{now.strftime('%H%M%S')}"


@router.get("", response_model=List[OrderListResponse])
async def list_orders(
    status_filter: Optional[str] = Query(None, alias="status"),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_admin_user)
):
    """List all orders with pagination."""
    query = select(Order).options(selectinload(Order.items))
    
    if status_filter:
        query = query.where(Order.status == status_filter)
    
    # Order by newest first
    query = query.order_by(desc(Order.created_at))
    
    # Pagination
    offset = (page - 1) * page_size
    query = query.offset(offset).limit(page_size)
    
    result = await db.execute(query)
    orders = result.scalars().all()
    
    return [
        OrderListResponse(
            id=order.id,
            uuid=order.uuid,
            order_number=order.order_number,
            status=order.status,
            total=order.total,
            shipping_info=order.shipping_info,
            item_count=len(order.items),
            created_at=order.created_at,
            updated_at=order.updated_at,
        )
        for order in orders
    ]


@router.get("/stats")
async def get_order_stats(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_admin_user)
):
    """Get order statistics."""
    # Total orders
    total_result = await db.execute(select(func.count(Order.id)))
    total_orders = total_result.scalar() or 0
    
    # Status counts
    status_counts = {}
    for status in ["pending", "processing", "packed", "shipped", "delivered", "cancelled"]:
        result = await db.execute(
            select(func.count(Order.id)).where(Order.status == status)
        )
        status_counts[status] = result.scalar() or 0
    
    # Today's orders
    today = datetime.now().date()
    today_result = await db.execute(
        select(func.count(Order.id)).where(func.date(Order.created_at) == today)
    )
    today_orders = today_result.scalar() or 0
    
    # Total revenue
    revenue_result = await db.execute(
        select(func.sum(Order.total)).where(Order.status != "cancelled")
    )
    total_revenue = revenue_result.scalar() or Decimal(0)
    
    return {
        "total_orders": total_orders,
        "today_orders": today_orders,
        "total_revenue": float(total_revenue),
        "status_counts": status_counts,
    }


# ============ Direct Orders (Brand-shipped) ============
# NOTE: These routes MUST be defined before /{order_id} to avoid route conflicts

def generate_direct_order_number() -> str:
    """Generate a unique direct order number."""
    now = datetime.now()
    return f"DO-{now.strftime('%Y%m%d')}-{now.strftime('%H%M%S')}"


@router.get("/direct", response_model=List[DirectOrderListResponse])
async def list_direct_orders(
    status_filter: Optional[str] = Query(None, alias="status"),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_admin_user)
):
    """List all direct orders (brand-shipped) with pagination."""
    query = select(DirectOrder).options(selectinload(DirectOrder.items))
    
    if status_filter:
        query = query.where(DirectOrder.status == status_filter)
    
    # Order by newest first
    query = query.order_by(desc(DirectOrder.order_date))
    
    # Pagination
    offset = (page - 1) * page_size
    query = query.offset(offset).limit(page_size)
    
    result = await db.execute(query)
    orders = result.scalars().all()
    
    return [
        DirectOrderListResponse(
            id=order.id,
            uuid=order.uuid,
            order_number=order.order_number,
            status=order.status,
            customer_info=order.customer_info,
            brand_name=order.brand_name,
            item_count=len(order.items),
            order_date=order.order_date,
            created_at=order.created_at,
            updated_at=order.updated_at,
        )
        for order in orders
    ]


@router.get("/direct/stats")
async def get_direct_order_stats(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_admin_user)
):
    """Get direct order statistics."""
    # Total orders
    total_result = await db.execute(select(func.count(DirectOrder.id)))
    total_orders = total_result.scalar() or 0
    
    # Status counts
    status_counts = {}
    for status in ["pending", "processing", "shipped", "delivered", "cancelled"]:
        result = await db.execute(
            select(func.count(DirectOrder.id)).where(DirectOrder.status == status)
        )
        status_counts[status] = result.scalar() or 0
    
    # Today's orders
    today = datetime.now().date()
    today_result = await db.execute(
        select(func.count(DirectOrder.id)).where(func.date(DirectOrder.order_date) == today)
    )
    today_orders = today_result.scalar() or 0
    
    return {
        "total_orders": total_orders,
        "today_orders": today_orders,
        "status_counts": status_counts,
    }


@router.get("/direct/{order_id}", response_model=DirectOrderResponse)
async def get_direct_order(
    order_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_admin_user)
):
    """Get a specific direct order."""
    result = await db.execute(
        select(DirectOrder)
        .options(selectinload(DirectOrder.items))
        .where(DirectOrder.id == order_id)
    )
    order = result.scalar_one_or_none()
    
    if not order:
        raise HTTPException(status_code=404, detail="Direct order not found")
    
    return DirectOrderResponse(
        id=order.id,
        uuid=order.uuid,
        order_number=order.order_number,
        status=order.status,
        customer_info=order.customer_info,
        brand_name=order.brand_name,
        brand_id=order.brand_id,
        tracking_number=order.tracking_number,
        carrier=order.carrier,
        notes=order.notes,
        extra_data=order.extra_data,
        created_by_id=order.created_by_id,
        items=[DirectOrderItemResponse.model_validate(item) for item in order.items],
        order_date=order.order_date,
        created_at=order.created_at,
        updated_at=order.updated_at,
        shipped_at=order.shipped_at,
        delivered_at=order.delivered_at,
    )


@router.post("/direct", response_model=DirectOrderResponse)
async def create_direct_order(
    data: DirectOrderCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_admin_user)
):
    """
    Create a new direct order (brand-shipped).
    NOTE: This does NOT affect inventory as items are shipped directly by brands.
    """
    # Generate order number
    order_number = generate_direct_order_number()
    
    # Create order
    order = DirectOrder(
        order_number=order_number,
        status="pending",
        customer_info=data.customer_info,
        brand_name=data.brand_name,
        brand_id=data.brand_id,
        tracking_number=data.tracking_number,
        carrier=data.carrier,
        notes=data.notes,
        extra_data=data.extra_data,
        order_date=data.order_date or datetime.utcnow(),
        created_by_id=current_user.id,
    )
    
    db.add(order)
    await db.flush()  # Get the order ID
    
    # Create order items (NO inventory deduction)
    for item_data in data.items:
        item = DirectOrderItem(
            order_id=order.id,
            product_id=item_data.product_id,
            variant_id=item_data.variant_id,
            product_name=item_data.product_name,
            product_sku=item_data.product_sku,
            variant_name=item_data.variant_name,
            variant_options=item_data.variant_options,
            quantity=item_data.quantity,
            unit_price=item_data.unit_price,
            extra_data=item_data.extra_data,
        )
        db.add(item)
    
    await db.commit()
    await db.refresh(order)
    
    # Reload with items
    result = await db.execute(
        select(DirectOrder)
        .options(selectinload(DirectOrder.items))
        .where(DirectOrder.id == order.id)
    )
    order = result.scalar_one()
    
    return DirectOrderResponse(
        id=order.id,
        uuid=order.uuid,
        order_number=order.order_number,
        status=order.status,
        customer_info=order.customer_info,
        brand_name=order.brand_name,
        brand_id=order.brand_id,
        tracking_number=order.tracking_number,
        carrier=order.carrier,
        notes=order.notes,
        extra_data=order.extra_data,
        created_by_id=order.created_by_id,
        items=[DirectOrderItemResponse.model_validate(item) for item in order.items],
        order_date=order.order_date,
        created_at=order.created_at,
        updated_at=order.updated_at,
        shipped_at=order.shipped_at,
        delivered_at=order.delivered_at,
    )


@router.put("/direct/{order_id}", response_model=DirectOrderResponse)
async def update_direct_order(
    order_id: int,
    data: DirectOrderUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_admin_user)
):
    """Update a direct order."""
    result = await db.execute(
        select(DirectOrder)
        .options(selectinload(DirectOrder.items))
        .where(DirectOrder.id == order_id)
    )
    order = result.scalar_one_or_none()
    
    if not order:
        raise HTTPException(status_code=404, detail="Direct order not found")
    
    update_data = data.model_dump(exclude_unset=True)
    
    # Handle status changes
    if "status" in update_data:
        new_status = update_data["status"]
        if new_status == "shipped" and not order.shipped_at:
            order.shipped_at = datetime.utcnow()
        elif new_status == "delivered" and not order.delivered_at:
            order.delivered_at = datetime.utcnow()
    
    for key, value in update_data.items():
        setattr(order, key, value)
    
    await db.commit()
    await db.refresh(order)
    
    return DirectOrderResponse(
        id=order.id,
        uuid=order.uuid,
        order_number=order.order_number,
        status=order.status,
        customer_info=order.customer_info,
        brand_name=order.brand_name,
        brand_id=order.brand_id,
        tracking_number=order.tracking_number,
        carrier=order.carrier,
        notes=order.notes,
        extra_data=order.extra_data,
        created_by_id=order.created_by_id,
        items=[DirectOrderItemResponse.model_validate(item) for item in order.items],
        order_date=order.order_date,
        created_at=order.created_at,
        updated_at=order.updated_at,
        shipped_at=order.shipped_at,
        delivered_at=order.delivered_at,
    )


@router.delete("/direct/{order_id}")
async def delete_direct_order(
    order_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_admin_user)
):
    """Delete a direct order."""
    result = await db.execute(
        select(DirectOrder).where(DirectOrder.id == order_id)
    )
    order = result.scalar_one_or_none()
    
    if not order:
        raise HTTPException(status_code=404, detail="Direct order not found")
    
    await db.delete(order)
    await db.commit()
    
    return {"success": True, "message": "Direct order deleted"}


@router.post("/direct/{order_id}/update-status")
async def update_direct_order_status(
    order_id: int,
    status: str = Query(...),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_admin_user)
):
    """Quick status update for a direct order."""
    valid_statuses = ["pending", "processing", "shipped", "delivered", "cancelled"]
    if status not in valid_statuses:
        raise HTTPException(status_code=400, detail=f"Invalid status. Must be one of: {valid_statuses}")
    
    result = await db.execute(
        select(DirectOrder).where(DirectOrder.id == order_id)
    )
    order = result.scalar_one_or_none()
    
    if not order:
        raise HTTPException(status_code=404, detail="Direct order not found")
    
    order.status = status
    
    if status == "shipped" and not order.shipped_at:
        order.shipped_at = datetime.utcnow()
    elif status == "delivered" and not order.delivered_at:
        order.delivered_at = datetime.utcnow()
    
    await db.commit()
    
    return {"success": True, "status": status}


# ============ Regular Orders ============

@router.get("/{order_id}", response_model=OrderResponse)
async def get_order(
    order_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_admin_user)
):
    """Get a specific order."""
    result = await db.execute(
        select(Order)
        .options(selectinload(Order.items))
        .where(Order.id == order_id)
    )
    order = result.scalar_one_or_none()
    
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    
    return OrderResponse(
        id=order.id,
        uuid=order.uuid,
        order_number=order.order_number,
        status=order.status,
        subtotal=order.subtotal,
        discount_amount=order.discount_amount,
        shipping_cost=order.shipping_cost,
        tax_amount=order.tax_amount,
        total=order.total,
        shipping_info=order.shipping_info,
        billing_info=order.billing_info,
        shipping_details=order.shipping_details,
        payment_info=order.payment_info,
        invoice_data=order.invoice_data,
        extra_data=order.extra_data,
        internal_notes=order.internal_notes,
        customer_notes=order.customer_notes,
        created_by_id=order.created_by_id,
        items=[OrderItemResponse.model_validate(item) for item in order.items],
        created_at=order.created_at,
        updated_at=order.updated_at,
        shipped_at=order.shipped_at,
        delivered_at=order.delivered_at,
    )


@router.post("", response_model=OrderResponse)
async def create_order(
    data: OrderCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_admin_user)
):
    """Create a new order."""
    # Generate order number
    order_number = generate_order_number()
    
    # Calculate subtotal from items
    subtotal = Decimal(0)
    for item in data.items:
        item_total = (item.unit_price * item.quantity) - item.discount
        subtotal += item_total
    
    # Calculate total
    total = subtotal - data.discount_amount + data.shipping_cost + data.tax_amount
    
    # Generate invoice number
    invoice_data = data.invoice_data.copy()
    if not invoice_data.get("invoice_number"):
        invoice_data["invoice_number"] = f"INV-{order_number.replace('ORD-', '')}"
    if not invoice_data.get("invoice_date"):
        invoice_data["invoice_date"] = datetime.now().strftime("%Y-%m-%d")
    
    # Create order
    order = Order(
        order_number=order_number,
        status="pending",
        subtotal=subtotal,
        discount_amount=data.discount_amount,
        shipping_cost=data.shipping_cost,
        tax_amount=data.tax_amount,
        total=total,
        shipping_info=data.shipping_info,
        billing_info=data.billing_info,
        shipping_details=data.shipping_details,
        payment_info=data.payment_info,
        invoice_data=invoice_data,
        extra_data=data.extra_data,
        internal_notes=data.internal_notes,
        customer_notes=data.customer_notes,
        created_by_id=current_user.id,
    )
    
    db.add(order)
    await db.flush()  # Get the order ID
    
    # Create order items and deduct inventory
    for item_data in data.items:
        item_total = (item_data.unit_price * item_data.quantity) - item_data.discount
        
        item = OrderItem(
            order_id=order.id,
            product_id=item_data.product_id,
            variant_id=item_data.variant_id,
            product_name=item_data.product_name,
            product_sku=item_data.product_sku,
            product_barcode=item_data.product_barcode,
            variant_name=item_data.variant_name,
            variant_options=item_data.variant_options,
            unit_price=item_data.unit_price,
            quantity=item_data.quantity,
            discount=item_data.discount,
            total=item_total,
            product_image=item_data.product_image,
            extra_data=item_data.extra_data,
        )
        db.add(item)
        
        # Deduct inventory
        if item_data.product_id:
            # Get product with inventory
            product_result = await db.execute(
                select(Product)
                .options(selectinload(Product.inventory))
                .where(Product.id == item_data.product_id)
            )
            product = product_result.scalar_one_or_none()
            
            if product and product.inventory:
                inventory = product.inventory
                quantity_before = inventory.quantity
                
                # Check if enough stock (allow backorder if enabled)
                if inventory.quantity < item_data.quantity and not inventory.allow_backorder:
                    raise HTTPException(
                        status_code=400, 
                        detail=f"Insufficient stock for {item_data.product_name}. Available: {inventory.quantity}, Requested: {item_data.quantity}"
                    )
                
                # Deduct from inventory
                inventory.quantity = max(0, inventory.quantity - item_data.quantity)
                inventory.last_scanned_at = datetime.utcnow()
                
                # Create inventory log
                log = InventoryLog(
                    inventory_id=inventory.id,
                    action="order_out",
                    quantity_change=-item_data.quantity,
                    quantity_before=quantity_before,
                    quantity_after=inventory.quantity,
                    reason=f"Order {order_number}",
                    reference=order_number,
                    user_id=current_user.id,
                )
                db.add(log)
            
            # Also handle variant inventory if variant_id is provided
            if item_data.variant_id:
                variant_result = await db.execute(
                    select(ProductVariant)
                    .options(selectinload(ProductVariant.inventory))
                    .where(ProductVariant.id == item_data.variant_id)
                )
                variant = variant_result.scalar_one_or_none()
                
                if variant and variant.inventory:
                    variant_inventory = variant.inventory
                    variant_qty_before = variant_inventory.quantity
                    
                    # Check stock
                    if variant_inventory.quantity < item_data.quantity and not variant_inventory.allow_backorder:
                        raise HTTPException(
                            status_code=400,
                            detail=f"Insufficient stock for variant {item_data.variant_name or item_data.product_name}. Available: {variant_inventory.quantity}, Requested: {item_data.quantity}"
                        )
                    
                    # Deduct from variant inventory
                    variant_inventory.quantity = max(0, variant_inventory.quantity - item_data.quantity)
    
    await db.commit()
    await db.refresh(order)
    
    # Reload with items
    result = await db.execute(
        select(Order)
        .options(selectinload(Order.items))
        .where(Order.id == order.id)
    )
    order = result.scalar_one()
    
    return OrderResponse(
        id=order.id,
        uuid=order.uuid,
        order_number=order.order_number,
        status=order.status,
        subtotal=order.subtotal,
        discount_amount=order.discount_amount,
        shipping_cost=order.shipping_cost,
        tax_amount=order.tax_amount,
        total=order.total,
        shipping_info=order.shipping_info,
        billing_info=order.billing_info,
        shipping_details=order.shipping_details,
        payment_info=order.payment_info,
        invoice_data=order.invoice_data,
        extra_data=order.extra_data,
        internal_notes=order.internal_notes,
        customer_notes=order.customer_notes,
        created_by_id=order.created_by_id,
        items=[OrderItemResponse.model_validate(item) for item in order.items],
        created_at=order.created_at,
        updated_at=order.updated_at,
        shipped_at=order.shipped_at,
        delivered_at=order.delivered_at,
    )


@router.put("/{order_id}", response_model=OrderResponse)
async def update_order(
    order_id: int,
    data: OrderUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_admin_user)
):
    """Update an order."""
    result = await db.execute(
        select(Order)
        .options(selectinload(Order.items))
        .where(Order.id == order_id)
    )
    order = result.scalar_one_or_none()
    
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    
    update_data = data.model_dump(exclude_unset=True)
    
    # Handle status changes
    if "status" in update_data:
        new_status = update_data["status"]
        if new_status == "shipped" and not order.shipped_at:
            order.shipped_at = datetime.utcnow()
        elif new_status == "delivered" and not order.delivered_at:
            order.delivered_at = datetime.utcnow()
    
    # Recalculate total if pricing changes
    if any(key in update_data for key in ["discount_amount", "shipping_cost", "tax_amount"]):
        discount = update_data.get("discount_amount", order.discount_amount)
        shipping = update_data.get("shipping_cost", order.shipping_cost)
        tax = update_data.get("tax_amount", order.tax_amount)
        order.total = order.subtotal - discount + shipping + tax
    
    for key, value in update_data.items():
        setattr(order, key, value)
    
    await db.commit()
    await db.refresh(order)
    
    return OrderResponse(
        id=order.id,
        uuid=order.uuid,
        order_number=order.order_number,
        status=order.status,
        subtotal=order.subtotal,
        discount_amount=order.discount_amount,
        shipping_cost=order.shipping_cost,
        tax_amount=order.tax_amount,
        total=order.total,
        shipping_info=order.shipping_info,
        billing_info=order.billing_info,
        shipping_details=order.shipping_details,
        payment_info=order.payment_info,
        invoice_data=order.invoice_data,
        extra_data=order.extra_data,
        internal_notes=order.internal_notes,
        customer_notes=order.customer_notes,
        created_by_id=order.created_by_id,
        items=[OrderItemResponse.model_validate(item) for item in order.items],
        created_at=order.created_at,
        updated_at=order.updated_at,
        shipped_at=order.shipped_at,
        delivered_at=order.delivered_at,
    )


@router.delete("/{order_id}")
async def delete_order(
    order_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_admin_user)
):
    """Delete an order."""
    result = await db.execute(
        select(Order).where(Order.id == order_id)
    )
    order = result.scalar_one_or_none()
    
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    
    await db.delete(order)
    await db.commit()
    
    return {"success": True, "message": "Order deleted"}


@router.post("/scan", response_model=OrderScanResponse)
async def scan_product_for_order(
    data: OrderScanRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_admin_user)
):
    """
    Scan a product barcode to add to order.
    Returns product details for order creation.
    """
    product = None
    variant = None
    
    # First, check if this barcode matches any variant
    if data.barcode:
        result = await db.execute(
            select(ProductVariant)
            .options(
                selectinload(ProductVariant.inventory),
                selectinload(ProductVariant.product).selectinload(Product.images)
            )
            .where(ProductVariant.barcode == data.barcode)
        )
        variant = result.scalar_one_or_none()
        
        if variant:
            product = variant.product
    
    # If not a variant barcode, try to find product
    if not variant:
        if data.product_id:
            result = await db.execute(
                select(Product)
                .options(
                    selectinload(Product.inventory),
                    selectinload(Product.images),
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
                        selectinload(Product.images),
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
                        selectinload(Product.images),
                        selectinload(Product.variants).selectinload(ProductVariant.inventory)
                    )
                    .where(Product.barcode == data.barcode)
                )
                product = result.scalar_one_or_none()
    
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    
    # Check if product is active (inactive products cannot be added to orders)
    if not product.is_active:
        raise HTTPException(
            status_code=400, 
            detail=f"Product '{product.name}' is inactive and cannot be added to orders"
        )
    
    # Get inventory info
    if variant:
        inventory = variant.inventory
        available_qty = inventory.quantity if inventory else 0
        unit_price = variant.price if variant.price else (product.price or Decimal(0))
        
        return OrderScanResponse(
            success=True,
            product_id=product.id,
            variant_id=variant.id,
            product_name=product.name,
            product_sku=variant.sku,
            product_barcode=variant.barcode,
            variant_name=variant.name,
            variant_options=variant.options or {},
            unit_price=unit_price,
            available_quantity=available_qty,
            product_image=product.primary_image,
        )
    else:
        # Check if product has variants
        if product.variants:
            # Use default variant
            default_variant = next((v for v in product.variants if v.is_default), None)
            if not default_variant and product.variants:
                default_variant = product.variants[0]
            
            if default_variant:
                inventory = default_variant.inventory
                available_qty = inventory.quantity if inventory else 0
                unit_price = default_variant.price if default_variant.price else (product.price or Decimal(0))
                
                return OrderScanResponse(
                    success=True,
                    product_id=product.id,
                    variant_id=default_variant.id,
                    product_name=product.name,
                    product_sku=default_variant.sku,
                    product_barcode=default_variant.barcode,
                    variant_name=default_variant.name,
                    variant_options=default_variant.options or {},
                    unit_price=unit_price,
                    available_quantity=available_qty,
                    product_image=product.primary_image,
                )
        
        # No variants, use product inventory
        inventory = product.inventory
        available_qty = inventory.quantity if inventory else 0
        
        return OrderScanResponse(
            success=True,
            product_id=product.id,
            variant_id=None,
            product_name=product.name,
            product_sku=product.sku,
            product_barcode=product.barcode,
            variant_name=None,
            variant_options={},
            unit_price=product.price or Decimal(0),
            available_quantity=available_qty,
            product_image=product.primary_image,
        )


@router.post("/{order_id}/update-status")
async def update_order_status(
    order_id: int,
    status: str = Query(...),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_admin_user)
):
    """Quick status update for an order."""
    valid_statuses = ["pending", "processing", "packed", "shipped", "delivered", "cancelled"]
    if status not in valid_statuses:
        raise HTTPException(status_code=400, detail=f"Invalid status. Must be one of: {valid_statuses}")
    
    result = await db.execute(
        select(Order).where(Order.id == order_id)
    )
    order = result.scalar_one_or_none()
    
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    
    order.status = status
    
    if status == "shipped" and not order.shipped_at:
        order.shipped_at = datetime.utcnow()
    elif status == "delivered" and not order.delivered_at:
        order.delivered_at = datetime.utcnow()
    
    await db.commit()
    
    return {"success": True, "status": status}
