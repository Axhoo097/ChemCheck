from fastapi import APIRouter
from pydantic import BaseModel
from typing import List, Optional
from services.parser import parse_ingredient_text
from services.scorer import calculate_toxicity

router = APIRouter()

class ParseRequest(BaseModel):
    text: str

class AnalyzeTextRequest(BaseModel):
    text: str
    product_name: Optional[str] = "Scanned Product"

@router.post("/parse")
def parse_ingredients(request: ParseRequest):
    """
    Parses raw ingredient text into a clean list of ingredient names.
    """
    ingredients = parse_ingredient_text(request.text)
    return {
        "ingredients": ingredients,
        "count": len(ingredients),
        "raw_text": request.text[:500]
    }

@router.post("/analyze-text")
def analyze_ingredient_text(request: AnalyzeTextRequest):
    """
    Parses ingredient text AND runs toxicity analysis in one call.
    """
    ingredients = parse_ingredient_text(request.text)
    if not ingredients:
        return {
            "ingredients": [],
            "count": 0,
            "report": None,
            "error": "No ingredients could be extracted from the text."
        }
    report = calculate_toxicity(ingredients)
    return {
        "ingredients": ingredients,
        "count": len(ingredients),
        "report": report
    }
