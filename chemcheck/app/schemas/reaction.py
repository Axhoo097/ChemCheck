from datetime import date, datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field

from app.models.reaction import ReactionSeverity


class ReactionCreate(BaseModel):
    product_id: UUID
    reaction_type: str = Field(min_length=1, max_length=100)
    severity: ReactionSeverity
    occurred_on: date
    notes: str | None = Field(default=None, max_length=2000)


class ReactionOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    product_id: UUID | None
    reaction_type: str
    severity: ReactionSeverity
    occurred_on: date
    notes: str | None
    created_at: datetime


class SensitivitySuggestion(BaseModel):
    ingredient_id: UUID
    ingredient_name: str
    reason: str


class ReactionCreateResponse(BaseModel):
    reaction: ReactionOut
    suggested_sensitivities: list[SensitivitySuggestion] = []
