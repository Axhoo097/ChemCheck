from uuid import UUID

from pydantic import BaseModel

from app.models.ingredient import EvidenceLevel, RiskLevel


class Category:
    WORST = "Worst"
    BETTER = "Better"
    BEST = "Best"


class ScoreBreakdownItem(BaseModel):
    ingredient_id: UUID
    name: str
    risk_level: RiskLevel
    is_allergen: bool
    evidence_level: EvidenceLevel
    points_deducted: float


class ScoreResult(BaseModel):
    score: int
    category: str
    concern_count: int
    allergen_count: int
    breakdown: list[ScoreBreakdownItem]
    warnings: list[str] = []
    personalized: bool = False
