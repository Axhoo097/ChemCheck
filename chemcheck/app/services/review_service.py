from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.review import Review
from app.models.user import User
from app.schemas.review import ReviewCreate
from app.services import product_service


async def create_review(db: AsyncSession, user: User, payload: ReviewCreate) -> Review:
    await product_service.get_product(db, str(payload.product_id))  # 404s if missing

    review = Review(
        user_id=user.id, product_id=payload.product_id, rating=payload.rating, comment=payload.comment
    )
    db.add(review)
    await db.commit()
    await db.refresh(review)
    return review


async def list_product_reviews(
    db: AsyncSession, product_id: str, page: int, page_size: int
) -> tuple[list[Review], int]:
    product = await product_service.get_product(db, product_id)  # 404s if missing

    count_stmt = select(func.count()).select_from(Review).where(Review.product_id == product.id)
    total_count = (await db.execute(count_stmt)).scalar_one()

    stmt = (
        select(Review)
        .where(Review.product_id == product.id)
        .order_by(Review.created_at.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
    )
    items = list((await db.execute(stmt)).scalars().all())
    return items, total_count
