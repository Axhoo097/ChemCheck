import enum
import uuid

from sqlalchemy import Boolean, Enum, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base_class import Base
from app.models.types import GUID


class RiskLevel(str, enum.Enum):
    low = "low"
    medium = "medium"
    high = "high"


class EvidenceLevel(str, enum.Enum):
    strong = "strong"
    moderate = "moderate"
    limited = "limited"


class Ingredient(Base):
    __tablename__ = "ingredients"

    id: Mapped[uuid.UUID] = mapped_column(GUID(), primary_key=True, default=uuid.uuid4)
    name: Mapped[str] = mapped_column(String(255), unique=True, nullable=False, index=True)
    function: Mapped[str | None] = mapped_column(String(255), nullable=True)
    risk_level: Mapped[RiskLevel] = mapped_column(
        Enum(RiskLevel, native_enum=False, length=20), nullable=False, default=RiskLevel.low
    )
    is_allergen: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    evidence_level: Mapped[EvidenceLevel] = mapped_column(
        Enum(EvidenceLevel, native_enum=False, length=20), nullable=False, default=EvidenceLevel.moderate
    )
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
