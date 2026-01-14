from pydantic import BaseModel
from typing import TypeVar, Generic, List, Optional
from datetime import datetime

T = TypeVar("T")


class PaginatedResponse(BaseModel, Generic[T]):
    """Generic paginated response."""
    items: List[T]
    total: int
    page: int
    page_size: int
    total_pages: int
    has_next: bool
    has_prev: bool


class MessageResponse(BaseModel):
    """Simple message response."""
    message: str
    success: bool = True
    data: Optional[dict] = None


class TimestampMixin(BaseModel):
    """Mixin for timestamp fields."""
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True

