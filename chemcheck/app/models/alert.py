import uuid
from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base_class import Base
from app.models.types import GUID


class Alert(Base):
    """
    Section 13's regulatory/recall notice. Attached to a product, an
    ingredient, or both (at least one is required — enforced in
    schemas/alert.py, not here).

    Cascade: unlike reactions/reviews (a user's own history, preserved
    with SET NULL per Section 9), an alert is catalog metadata *about*
    a product/ingredient — if that product or ingredient is removed
    from the catalog entirely, the notice referencing it no longer has
    anything to attach to, so it's deleted too (ondelete="CASCADE" on
    both FKs).
    """

    __tablename__ = "alerts"

    id: Mapped[uuid.UUID] = mapped_column(GUID(), primary_key=True, default=uuid.uuid4)
    product_id: Mapped[uuid.UUID | None] = mapped_column(
        GUID(), ForeignKey("products.id", ondelete="CASCADE"), nullable=True, index=True
    )
    ingredient_id: Mapped[uuid.UUID | None] = mapped_column(
        GUID(), ForeignKey("ingredients.id", ondelete="CASCADE"), nullable=True, index=True
    )
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
