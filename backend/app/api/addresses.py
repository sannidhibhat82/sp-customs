"""
Saved addresses (customer account).
"""

from typing import List

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update

from app.database import get_db
from app.models.user import User
from app.models.user_address import UserAddress
from app.schemas.address import AddressCreate, AddressUpdate, AddressResponse
from app.services.auth import get_current_user


router = APIRouter()


def _require_customer(user: User | None) -> User:
    if not user or user.role != "customer":
        raise HTTPException(status_code=401, detail="Login required")
    return user


@router.get("", response_model=List[AddressResponse])
async def list_addresses(
    db: AsyncSession = Depends(get_db),
    current_user: User | None = Depends(get_current_user),
):
    user = _require_customer(current_user)
    result = await db.execute(
        select(UserAddress).where(UserAddress.user_id == user.id).order_by(UserAddress.is_default.desc(), UserAddress.updated_at.desc())
    )
    return result.scalars().all()


@router.post("", response_model=AddressResponse)
async def create_address(
    body: AddressCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User | None = Depends(get_current_user),
):
    user = _require_customer(current_user)

    # If setting default, unset others
    if body.is_default:
        await db.execute(update(UserAddress).where(UserAddress.user_id == user.id).values(is_default=False))

    addr = UserAddress(
        user_id=user.id,
        name=body.name,
        phone=body.phone,
        address=body.address,
        city=body.city,
        state=body.state,
        pincode=body.pincode,
        country=body.country,
        is_default=bool(body.is_default),
    )
    db.add(addr)
    await db.commit()
    await db.refresh(addr)
    return addr


@router.put("/{address_id}", response_model=AddressResponse)
async def update_address(
    address_id: int,
    body: AddressUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User | None = Depends(get_current_user),
):
    user = _require_customer(current_user)
    result = await db.execute(select(UserAddress).where(UserAddress.id == address_id, UserAddress.user_id == user.id))
    addr = result.scalar_one_or_none()
    if not addr:
        raise HTTPException(status_code=404, detail="Address not found")

    data = body.model_dump(exclude_unset=True)
    if data.get("is_default") is True:
        await db.execute(update(UserAddress).where(UserAddress.user_id == user.id).values(is_default=False))

    for k, v in data.items():
        setattr(addr, k, v)
    await db.commit()
    await db.refresh(addr)
    return addr


@router.delete("/{address_id}")
async def delete_address(
    address_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User | None = Depends(get_current_user),
):
    user = _require_customer(current_user)
    result = await db.execute(select(UserAddress).where(UserAddress.id == address_id, UserAddress.user_id == user.id))
    addr = result.scalar_one_or_none()
    if not addr:
        raise HTTPException(status_code=404, detail="Address not found")
    await db.delete(addr)
    await db.commit()
    return {"success": True}

