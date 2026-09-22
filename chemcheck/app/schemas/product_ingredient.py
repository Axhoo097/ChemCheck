from uuid import UUID

from pydantic import BaseModel, Field

from app.models.ingredient import RiskLevel


class ProductIngredientIn(BaseModel):
    ingredient_id: UUID
    position: int = Field(default=0, ge=0)


class AttachIngredientsRequest(BaseModel):
    ingredients: list[ProductIngredientIn] = Field(min_length=1)


class ProductIngredientOut(BaseModel):
    ingredient_id: UUID
    name: str
    position: int
    risk_level: RiskLevel
    is_allergen: bool
