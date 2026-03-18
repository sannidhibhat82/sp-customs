"""
Favorites (wishlist) API.
Supports guest (guest_session_id) and logged-in user.
"""
from typing import Optional, List

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete
from sqlalchemy.orm import selectinload
from pydantic import BaseModel
from datetime import datetime

from app.database import get_db
from app.models.favorite import Favorite
from app.models.product import Product
from app.models.user import User
from app.services.auth import get_current_user

router = APIRouter()


class FavoriteResponse(BaseModel):
    id: int
    uuid: str
    product_id: int
    created_at: datetime
    product_name: Optional[str] = None
    product_slug: Optional[str] = None
    product_price: Optional[float] = None
    product_image: Optional[str] = None

    class Config:
        from_attributes = True


@router.get("", response_model=List[FavoriteResponse])
async def list_favorites(
    guest_session_id: Optional[str] = Query(None, alias="guest_session_id"),
    db: AsyncSession = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user),
):
    """List favorite products for user or guest."""
    user_id = current_user.id if current_user else None
    if not user_id and not guest_session_id:
        raise HTTPException(status_code=400, detail="Provide Authorization or guest_session_id")
    q = select(Favorite)
    if user_id:
        q = q.where(Favorite.user_id == user_id)
    else:
        q = q.where(Favorite.guest_session_id == guest_session_id)
    result = await db.execute(q)
    favs = result.scalars().all()
    out = []
    for f in favs:
        prod_result = await db.execute(
            select(Product).options(selectinload(Product.images)).where(Product.id == f.product_id)
        )
        prod = prod_result.scalar_one_or_none()
        img = None
        if prod and prod.images:
            img = prod.images[0].image_data if getattr(prod.images[0], "image_data", None) else None
        out.append(FavoriteResponse(
            id=f.id,
            uuid=f.uuid,
            product_id=f.product_id,
            created_at=f.created_at,
            product_name=prod.name if prod else None,
            product_slug=prod.slug if prod else None,
            product_price=float(prod.price) if prod and prod.price is not None else None,
            product_image=img,
        ))
    return out


@router.post("/{product_id}", response_model=FavoriteResponse)
async def add_favorite(
    product_id: int,
    guest_session_id: Optional[str] = Query(None, alias="guest_session_id"),
    db: AsyncSession = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user),
):
    """Add product to favorites."""
    user_id = current_user.id if current_user else None
    if not user_id and not guest_session_id:
        raise HTTPException(status_code=400, detail="Provide Authorization or guest_session_id")
    prod_result = await db.execute(select(Product).where(Product.id == product_id))
    if not prod_result.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Product not found")
    # Check existing
    q = select(Favorite).where(Favorite.product_id == product_id)
    if user_id:
        q = q.where(Favorite.user_id == user_id)
    else:
        q = q.where(Favorite.guest_session_id == guest_session_id)
    ex = await db.execute(q)
    if ex.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Already in favorites")
    fav = Favorite(user_id=user_id, guest_session_id=guest_session_id, product_id=product_id)
    db.add(fav)
    await db.flush()
    await db.refresh(fav)
    prod_result = await db.execute(
        select(Product).options(selectinload(Product.images)).where(Product.id == product_id)
    )
    prod = prod_result.scalar_one()
    img = None
    if prod.images:
        img = prod.images[0].image_data if getattr(prod.images[0], "image_data", None) else None
    return FavoriteResponse(
        id=fav.id,
        uuid=fav.uuid,
        product_id=fav.product_id,
        created_at=fav.created_at,
        product_name=prod.name,
        product_slug=prod.slug,
        product_price=float(prod.price) if prod.price is not None else None,
        product_image=img,
    )


@router.delete("/{product_id}")
async def remove_favorite(
    product_id: int,
    guest_session_id: Optional[str] = Query(None, alias="guest_session_id"),
    db: AsyncSession = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user),
):
    """Remove product from favorites."""
    user_id = current_user.id if current_user else None
    if not user_id and not guest_session_id:
        raise HTTPException(status_code=400, detail="Provide Authorization or guest_session_id")
    q = delete(Favorite).where(Favorite.product_id == product_id)
    if user_id:
        q = q.where(Favorite.user_id == user_id)
    else:
        q = q.where(Favorite.guest_session_id == guest_session_id)
    result = await db.execute(q)
    if result.rowcount == 0:
        raise HTTPException(status_code=404, detail="Favorite not found")
    return {"success": True}
