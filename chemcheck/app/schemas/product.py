from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


class ProductCreate(BaseModel):
    name: str = Field(min_length=1, max_length=255)
    brand: str | None = Field(default=None, max_length=255)
    barcode: str | None = Field(default=None, max_length=64)
    category: str = Field(min_length=1, max_length=100)
    description: str | None = None
    image_url: str | None = Field(default=None, max_length=500)


class ProductUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=255)
    brand: str | None = Field(default=None, max_length=255)
    barcode: str | None = Field(default=None, max_length=64)
    category: str | None = Field(default=None, min_length=1, max_length=100)
    description: str | None = None
    image_url: str | None = Field(default=None, max_length=500)


class ProductOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    name: str
    brand: str | None = None
    barcode: str | None = None
    category: str
    description: str | None = None
    image_url: str | None = None
    created_at: datetime
