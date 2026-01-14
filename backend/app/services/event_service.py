"""
Event Service - Logs events for audit trail.
"""
from typing import Any, Optional
from datetime import datetime
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.event import Event


class EventService:
    """Service for logging events."""
    
    @staticmethod
    async def log_event(
        db: AsyncSession,
        event_type: str,
        entity_type: str,
        entity_id: Optional[int] = None,
        entity_uuid: Optional[str] = None,
        data: dict = None,
        user_id: Optional[int] = None,
        device_type: Optional[str] = None,
        ip_address: Optional[str] = None,
        broadcast: bool = False,  # Kept for compatibility but not used
    ) -> Event:
        """
        Log an event.
        
        Args:
            db: Database session
            event_type: Type of event (product_created, inventory_scanned, etc.)
            entity_type: Type of entity (product, category, brand, inventory)
            entity_id: ID of the entity
            entity_uuid: UUID of the entity
            data: Additional event data
            user_id: ID of user who triggered the event
            device_type: Type of device (mobile, desktop)
            ip_address: IP address of requester
        
        Returns:
            Created Event object
        """
        event = Event(
            event_type=event_type,
            entity_type=entity_type,
            entity_id=entity_id,
            entity_uuid=entity_uuid,
            data=data or {},
            user_id=user_id,
            device_type=device_type,
            ip_address=ip_address,
            is_broadcasted="none",
        )
        
        db.add(event)
        await db.flush()
        
        return event
    
    @staticmethod
    async def log_product_created(
        db: AsyncSession,
        product_id: int,
        product_uuid: str,
        product_data: dict,
        user_id: Optional[int] = None,
    ):
        """Log product creation event."""
        return await EventService.log_event(
            db=db,
            event_type="product_created",
            entity_type="product",
            entity_id=product_id,
            entity_uuid=product_uuid,
            data=product_data,
            user_id=user_id,
        )
    
    @staticmethod
    async def log_product_updated(
        db: AsyncSession,
        product_id: int,
        product_uuid: str,
        changes: dict,
        user_id: Optional[int] = None,
    ):
        """Log product update event."""
        return await EventService.log_event(
            db=db,
            event_type="product_updated",
            entity_type="product",
            entity_id=product_id,
            entity_uuid=product_uuid,
            data=changes,
            user_id=user_id,
        )
    
    @staticmethod
    async def log_inventory_scan(
        db: AsyncSession,
        product_id: int,
        product_uuid: str,
        scan_data: dict,
        user_id: Optional[int] = None,
        device_type: Optional[str] = None,
    ):
        """Log inventory scan event."""
        return await EventService.log_event(
            db=db,
            event_type="inventory_scanned",
            entity_type="inventory",
            entity_id=product_id,
            entity_uuid=product_uuid,
            data=scan_data,
            user_id=user_id,
            device_type=device_type,
        )
    
    @staticmethod
    async def log_image_uploaded(
        db: AsyncSession,
        product_id: int,
        image_id: int,
        image_uuid: str,
        user_id: Optional[int] = None,
        device_type: Optional[str] = None,
    ):
        """Log image upload event."""
        return await EventService.log_event(
            db=db,
            event_type="image_uploaded",
            entity_type="image",
            entity_id=image_id,
            entity_uuid=image_uuid,
            data={"product_id": product_id},
            user_id=user_id,
            device_type=device_type,
        )
