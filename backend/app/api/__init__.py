from fastapi import APIRouter

from app.api import auth, categories, brands, products, inventory, images, attributes, variants, homepage, orders

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

