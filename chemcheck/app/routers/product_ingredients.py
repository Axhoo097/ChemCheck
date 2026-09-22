from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import require_admin
from app.db.session import get_db
from app.schemas.common import success_response
from app.schemas.product_ingredient import AttachIngredientsRequest
from app.services import product_ingredient_service

router = APIRouter(prefix="/api/v1/products/{product_id}/ingredients", tags=["product-ingredients"])


@router.get("")
async def list_product_ingredients(product_id: str, db: AsyncSession = Depends(get_db)) -> dict:
    items = await product_ingredient_service.list_product_ingredients(db, product_id)
    return success_response([item.model_dump(mode="json") for item in items])


@router.post("", status_code=201)
async def attach_ingredients(
    product_id: str,
    payload: AttachIngredientsRequest,
    db: AsyncSession = Depends(get_db),
    _admin=Depends(require_admin),
) -> dict:
    items = await product_ingredient_service.attach_ingredients(db, product_id, payload.ingredients)
    return success_response([item.model_dump(mode="json") for item in items])


@router.delete("/{ingredient_id}", status_code=204)
async def remove_ingredient(
    product_id: str,
    ingredient_id: str,
    db: AsyncSession = Depends(get_db),
    _admin=Depends(require_admin),
) -> None:
    await product_ingredient_service.remove_ingredient(db, product_id, ingredient_id)
