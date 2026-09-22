from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.errors import ServiceError
from app.models.ingredient import Ingredient
from app.models.product_ingredient import ProductIngredient
from app.schemas.product_ingredient import ProductIngredientIn, ProductIngredientOut
from app.services import product_service


def _parse_ingredient_uuid(value: str) -> UUID:
    try:
        return UUID(value)
    except ValueError:
        raise ServiceError("NOT_FOUND", "Ingredient not found.", status_code=404)


async def list_product_ingredients(db: AsyncSession, product_id: str) -> list[ProductIngredientOut]:
    product = await product_service.get_product(db, product_id)  # 404s if the product doesn't exist

    stmt = (
        select(ProductIngredient, Ingredient)
        .join(Ingredient, Ingredient.id == ProductIngredient.ingredient_id)
        .where(ProductIngredient.product_id == product.id)
        .order_by(ProductIngredient.position.asc())
    )
    rows = (await db.execute(stmt)).all()

    return [
        ProductIngredientOut(
            ingredient_id=ingredient.id,
            name=ingredient.name,
            position=link.position,
            risk_level=ingredient.risk_level,
            is_allergen=ingredient.is_allergen,
        )
        for link, ingredient in rows
    ]


async def attach_ingredients(
    db: AsyncSession, product_id: str, items: list[ProductIngredientIn]
) -> list[ProductIngredientOut]:
    product = await product_service.get_product(db, product_id)

    for item in items:
        ingredient = await db.get(Ingredient, item.ingredient_id)
        if not ingredient:
            raise ServiceError(
                "INGREDIENT_NOT_FOUND", f"Ingredient {item.ingredient_id} not found.", status_code=404
            )

        existing_link = await db.get(ProductIngredient, (product.id, ingredient.id))
        if existing_link:
            existing_link.position = item.position
        else:
            db.add(ProductIngredient(product_id=product.id, ingredient_id=ingredient.id, position=item.position))

    await db.commit()
    return await list_product_ingredients(db, product_id)


async def remove_ingredient(db: AsyncSession, product_id: str, ingredient_id: str) -> None:
    product = await product_service.get_product(db, product_id)
    iid = _parse_ingredient_uuid(ingredient_id)

    link = await db.get(ProductIngredient, (product.id, iid))
    if not link:
        raise ServiceError("NOT_FOUND", "This ingredient is not linked to the product.", status_code=404)

    await db.delete(link)
    await db.commit()
