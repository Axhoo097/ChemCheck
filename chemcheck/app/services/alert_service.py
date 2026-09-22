from uuid import UUID

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.errors import ServiceError
from app.models.alert import Alert
from app.schemas.alert import AlertCreate, AlertUpdate
from app.services import ingredient_service, product_service


def _parse_uuid(value: str) -> UUID:
    try:
        return UUID(value)
    except ValueError:
        raise ServiceError("NOT_FOUND", "Alert not found.", status_code=404)


async def list_alerts(db: AsyncSession, page: int, page_size: int) -> tuple[list[Alert], int]:
    count_stmt = select(func.count()).select_from(Alert)
    total_count = (await db.execute(count_stmt)).scalar_one()

    stmt = select(Alert).order_by(Alert.created_at.desc()).offset((page - 1) * page_size).limit(page_size)
    items = list((await db.execute(stmt)).scalars().all())
    return items, total_count


async def get_alert(db: AsyncSession, alert_id: str) -> Alert:
    alert = await db.get(Alert, _parse_uuid(alert_id))
    if not alert:
        raise ServiceError("NOT_FOUND", "Alert not found.", status_code=404)
    return alert


async def create_alert(db: AsyncSession, payload: AlertCreate) -> Alert:
    # Validate any referenced product/ingredient actually exists (404s otherwise).
    if payload.product_id is not None:
        await product_service.get_product(db, str(payload.product_id))
    if payload.ingredient_id is not None:
        await ingredient_service.get_ingredient(db, str(payload.ingredient_id))

    alert = Alert(**payload.model_dump())
    db.add(alert)
    await db.commit()
    await db.refresh(alert)
    return alert


async def update_alert(db: AsyncSession, alert_id: str, payload: AlertUpdate) -> Alert:
    alert = await get_alert(db, alert_id)
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(alert, field, value)
    await db.commit()
    await db.refresh(alert)
    return alert


async def delete_alert(db: AsyncSession, alert_id: str) -> None:
    alert = await get_alert(db, alert_id)
    await db.delete(alert)
    await db.commit()


async def list_product_alerts(db: AsyncSession, product_id: str) -> list[Alert]:
    product = await product_service.get_product(db, product_id)  # 404s if missing
    stmt = select(Alert).where(Alert.product_id == product.id).order_by(Alert.created_at.desc())
    return list((await db.execute(stmt)).scalars().all())
