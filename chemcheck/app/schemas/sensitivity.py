from uuid import UUID

from pydantic import BaseModel, Field


class AddSensitivityRequest(BaseModel):
    ingredient_id: UUID
    severity_note: str | None = Field(default=None, max_length=500)


class UserSensitivityOut(BaseModel):
    ingredient_id: UUID
    ingredient_name: str
    severity_note: str | None = None
