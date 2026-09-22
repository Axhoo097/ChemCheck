from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.errors import ServiceError
from app.models.ingredient import Ingredient
from app.models.user import User
from app.models.user_sensitivity import UserSensitivity
from app.schemas.sensitivity import UserSensitivityOut


def _parse_ingredient_uuid(value: str) -> UUID:
    try:
        return UUID(value)
    except ValueError:
        raise ServiceError("NOT_FOUND", "This sensitivity is not on your profile.", status_code=404)


async def list_user_sensitivities(db: AsyncSession, user: User) -> list[UserSensitivityOut]:
    stmt = (
        select(UserSensitivity, Ingredient)
        .join(Ingredient, Ingredient.id == UserSensitivity.ingredient_id)
        .where(UserSensitivity.user_id == user.id)
        .order_by(Ingredient.name.asc())
    )
    rows = (await db.execute(stmt)).all()

    return [
        UserSensitivityOut(ingredient_id=ingredient.id, ingredient_name=ingredient.name, severity_note=link.severity_note)
        for link, ingredient in rows
    ]


async def add_sensitivity(
    db: AsyncSession, user: User, ingredient_id: UUID, severity_note: str | None
) -> UserSensitivityOut:
    ingredient = await db.get(Ingredient, ingredient_id)
    if not ingredient:
        raise ServiceError("INGREDIENT_NOT_FOUND", "Ingredient not found.", status_code=404)

    existing_link = await db.get(UserSensitivity, (user.id, ingredient.id))
    if existing_link:
        existing_link.severity_note = severity_note
    else:
        db.add(UserSensitivity(user_id=user.id, ingredient_id=ingredient.id, severity_note=severity_note))
    await db.commit()

    return UserSensitivityOut(ingredient_id=ingredient.id, ingredient_name=ingredient.name, severity_note=severity_note)


async def remove_sensitivity(db: AsyncSession, user: User, ingredient_id: str) -> None:
    iid = _parse_ingredient_uuid(ingredient_id)
    link = await db.get(UserSensitivity, (user.id, iid))
    if not link:
        raise ServiceError("NOT_FOUND", "This sensitivity is not on your profile.", status_code=404)

    await db.delete(link)
    await db.commit()


async def get_user_sensitivity_ingredient_ids(db: AsyncSession, user_id: UUID) -> set[UUID]:
    """Used by analysis_service — just the ingredient IDs, for the scoring cross-check."""
    stmt = select(UserSensitivity.ingredient_id).where(UserSensitivity.user_id == user_id)
    return set((await db.execute(stmt)).scalars().all())
