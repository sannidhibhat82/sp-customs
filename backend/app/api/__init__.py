from fastapi import APIRouter

from app.api import (
    auth,
    categories,
    brands,
    products,
    inventory,
    images,
    attributes,
    variants,
    homepage,
    orders,
    external_catalog,
    cart,
    checkout,
    favorites,
    webhooks,
    addresses,
)

api_router = APIRouter()

api_router.include_router(auth.router, prefix="/auth", tags=["Authentication"])
api_router.include_router(categories.router, prefix="/categories", tags=["Categories"])
api_router.include_router(brands.router, prefix="/brands", tags=["Brands"])
api_router.include_router(attributes.router, prefix="/attributes", tags=["Attributes"])
api_router.include_router(products.router, prefix="/products", tags=["Products"])
api_router.include_router(variants.router, prefix="/variants", tags=["Variants"])
api_router.include_router(inventory.router, prefix="/inventory", tags=["Inventory"])
api_router.include_router(images.router, prefix="/images", tags=["Images"])
api_router.include_router(homepage.router)
api_router.include_router(orders.router, prefix="/orders", tags=["Orders"])
api_router.include_router(
    external_catalog.router,
    prefix="",
    tags=["External Catalog Integration"],
)
api_router.include_router(
    favorites.router,
    prefix="/favorites",
    tags=["Favorites"],
)
api_router.include_router(
    cart.router,
    prefix="/cart",
    tags=["Cart"],
)
api_router.include_router(
    checkout.router,
    prefix="/checkout",
    tags=["Checkout"],
)
api_router.include_router(
    webhooks.router,
    prefix="/webhooks",
    tags=["Webhooks"],
)

api_router.include_router(
    addresses.router,
    prefix="/addresses",
    tags=["Addresses"],
)

