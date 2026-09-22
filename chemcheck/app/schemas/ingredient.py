from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field

from app.models.ingredient import EvidenceLevel, RiskLevel


class IngredientCreate(BaseModel):
    name: str = Field(min_length=1, max_length=255)
    function: str | None = Field(default=None, max_length=255)
    risk_level: RiskLevel = RiskLevel.low
    is_allergen: bool = False
    evidence_level: EvidenceLevel = EvidenceLevel.moderate
    description: str | None = None


class IngredientUpdate(BaseModel):
    function: str | None = Field(default=None, max_length=255)
    risk_level: RiskLevel | None = None
    is_allergen: bool | None = None
    evidence_level: EvidenceLevel | None = None
    description: str | None = None


class IngredientOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    name: str
    function: str | None = None
    risk_level: RiskLevel
    is_allergen: bool
    evidence_level: EvidenceLevel
    description: str | None = None
