import uuid
from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, String, func
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base_class import Base
from app.models.types import GUID


class UserSensitivity(Base):
    """
    A user's self-reported sensitivity to a specific ingredient.

    Both FKs cascade: if the user is deleted, their sensitivities are
    meaningless (Section 9's user-delete rule). If the ingredient itself
    is deleted, the sensitivity record is just removed too — unlike
    product_ingredients, this is personal preference data, not catalog
    integrity, so there's no reason to RESTRICT the ingredient delete.
    """

    __tablename__ = "user_sensitivities"

    user_id: Mapped[uuid.UUID] = mapped_column(
        GUID(), ForeignKey("users.id", ondelete="CASCADE"), primary_key=True
    )
    ingredient_id: Mapped[uuid.UUID] = mapped_column(
        GUID(), ForeignKey("ingredients.id", ondelete="CASCADE"), primary_key=True
    )
    severity_note: Mapped[str | None] = mapped_column(String(500), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
