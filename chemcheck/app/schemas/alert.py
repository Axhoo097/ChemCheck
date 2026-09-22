from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, model_validator


class AlertCreate(BaseModel):
    product_id: UUID | None = None
    ingredient_id: UUID | None = None
    title: str = Field(min_length=1, max_length=255)
    description: str = Field(min_length=1)

    @model_validator(mode="after")
    def require_a_target(self):
        if self.product_id is None and self.ingredient_id is None:
            raise ValueError("An alert must reference at least a product_id or an ingredient_id.")
        return self


class AlertUpdate(BaseModel):
    # product_id/ingredient_id are intentionally not editable after
    # creation — what the alert is about shouldn't silently change;
    # create a new alert instead.
    title: str | None = Field(default=None, min_length=1, max_length=255)
    description: str | None = Field(default=None, min_length=1)


class AlertOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    product_id: UUID | None
    ingredient_id: UUID | None
    title: str
    description: str
    created_at: datetime
