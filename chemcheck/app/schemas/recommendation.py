from pydantic import BaseModel

from app.schemas.product import ProductOut


class AlternativeOut(BaseModel):
    product: ProductOut
    score: int
    category: str
