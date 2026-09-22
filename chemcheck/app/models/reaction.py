import enum
import uuid
from datetime import date as date_type
from datetime import datetime

from sqlalchemy import Date, DateTime, Enum, ForeignKey, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base_class import Base
from app.models.types import GUID


class ReactionSeverity(str, enum.Enum):
    mild = "mild"
    moderate = "moderate"
    severe = "severe"


class Reaction(Base):
    """
    A user's self-logged reaction to a product (Section 8's reaction
    tracking). `product_id` is nullable with ondelete="SET NULL" — per
    Section 9, a user's own history/notes are preserved even if the
    product is later removed from the catalog, unlike product_ingredients
    where the product's own composition data is meaningless without it.
    """

    __tablename__ = "reactions"

    id: Mapped[uuid.UUID] = mapped_column(GUID(), primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(
        GUID(), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    product_id: Mapped[uuid.UUID | None] = mapped_column(
        GUID(), ForeignKey("products.id", ondelete="SET NULL"), nullable=True, index=True
    )
    reaction_type: Mapped[str] = mapped_column(String(100), nullable=False)  # free text: "redness", "itching", ...
    severity: Mapped[ReactionSeverity] = mapped_column(
        Enum(ReactionSeverity, native_enum=False, length=20), nullable=False
    )
    occurred_on: Mapped[date_type] = mapped_column(Date, nullable=False)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
