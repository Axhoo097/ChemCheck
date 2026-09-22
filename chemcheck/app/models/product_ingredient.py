import uuid

from sqlalchemy import ForeignKey, Integer
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base_class import Base
from app.models.types import GUID


class ProductIngredient(Base):
    """
    Join table between products and ingredients, ordered by `position`
    (a proxy for concentration — ingredient lists are conventionally
    printed in descending order of quantity).

    Cascade rules (Section 9 of the master prompt):
    - product deleted  -> this row is deleted too (ondelete="CASCADE")
    - ingredient deleted -> blocked at the DB level (ondelete="RESTRICT");
      product_service/ingredient_service also enforce this explicitly at
      the application level so the behavior is identical on SQLite
      (used in tests) and Postgres (used in production), since SQLite
      does not enforce FK constraints unless PRAGMA foreign_keys=ON.
    """

    __tablename__ = "product_ingredients"

    product_id: Mapped[uuid.UUID] = mapped_column(
        GUID(), ForeignKey("products.id", ondelete="CASCADE"), primary_key=True
    )
    ingredient_id: Mapped[uuid.UUID] = mapped_column(
        GUID(), ForeignKey("ingredients.id", ondelete="RESTRICT"), primary_key=True
    )
    position: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
