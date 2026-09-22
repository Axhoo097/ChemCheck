from uuid import UUID

from sqlalchemy import delete, func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.errors import ServiceError
from app.models.alert import Alert
from app.models.product import Product
from app.models.product_ingredient import ProductIngredient
from app.schemas.product import ProductCreate, ProductUpdate


def _parse_uuid(value: str) -> UUID:
    try:
        return UUID(value)
    except ValueError:
        raise ServiceError("NOT_FOUND", "Product not found.", status_code=404)


async def list_products(
    db: AsyncSession,
    page: int,
    page_size: int,
    category: str | None = None,
    q: str | None = None,
) -> tuple[list[Product], int]:
    stmt = select(Product)
    count_stmt = select(func.count()).select_from(Product)

    if category:
        stmt = stmt.where(Product.category == category)
        count_stmt = count_stmt.where(Product.category == category)
    if q:
        pattern = f"%{q}%"
        text_filter = or_(Product.name.ilike(pattern), Product.brand.ilike(pattern))
        stmt = stmt.where(text_filter)
        count_stmt = count_stmt.where(text_filter)

    total_count = (await db.execute(count_stmt)).scalar_one()
    stmt = stmt.order_by(Product.created_at.desc()).offset((page - 1) * page_size).limit(page_size)
    items = list((await db.execute(stmt)).scalars().all())
    return items, total_count


async def get_product(db: AsyncSession, product_id: str) -> Product:
    product = await db.get(Product, _parse_uuid(product_id))
    if not product:
        raise ServiceError("NOT_FOUND", "Product not found.", status_code=404)
    return product


async def get_product_by_barcode(db: AsyncSession, barcode: str) -> Product | None:
    return (await db.execute(select(Product).where(Product.barcode == barcode))).scalar_one_or_none()


async def create_product(db: AsyncSession, payload: ProductCreate) -> Product:
    if payload.barcode:
        existing = (
            await db.execute(select(Product).where(Product.barcode == payload.barcode))
        ).scalar_one_or_none()
        if existing:
            raise ServiceError(
                "BARCODE_ALREADY_EXISTS", "A product with this barcode already exists.", status_code=409
            )

    product = Product(**payload.model_dump())
    db.add(product)
    await db.commit()
    await db.refresh(product)
    return product


async def update_product(db: AsyncSession, product_id: str, payload: ProductUpdate) -> Product:
    product = await get_product(db, product_id)
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(product, field, value)
    await db.commit()
    await db.refresh(product)
    return product


async def delete_product(db: AsyncSession, product_id: str) -> None:
    product = await get_product(db, product_id)

    # Section 9 CASCADE rule, done explicitly (not left to the DB) so
    # it behaves the same on SQLite (tests) and Postgres (production).
    await db.execute(delete(ProductIngredient).where(ProductIngredient.product_id == product.id))
    await db.execute(delete(Alert).where(Alert.product_id == product.id))
    await db.delete(product)
    await db.commit()
