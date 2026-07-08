from fastapi import APIRouter
from pydantic import BaseModel
from typing import List, Optional
from services.scorer import calculate_toxicity, find_chemical

router = APIRouter()

class ToxicityRequest(BaseModel):
    ingredients: List[str]

class IngredientRiskRequest(BaseModel):
    name: str

@router.post("/analyze")
def analyze_toxicity(request: ToxicityRequest):
    """
    Analyzes a list of ingredients and returns a complete toxicity report.
    """
    report = calculate_toxicity(request.ingredients)
    return report

@router.get("/ingredient/{name}")
def get_ingredient_risk(name: str):
    """
    Returns the risk profile for a single ingredient.
    """
    match = find_chemical(name)
    if match:
        return {
            "name": name,
            "found": True,
            "risk": match.get("risk", 0),
            "category": match.get("category", "Unknown"),
            "description": match.get("description", ""),
            "safe": match.get("safe", True),
            "effects": match.get("effects", []),
            "alternatives": match.get("alternatives", [])
        }
    return {
        "name": name,
        "found": False,
        "risk": 18,
        "category": "Unknown",
        "description": "Not found in chemical safety database. Assumed low-moderate risk.",
        "safe": True,
        "effects": [],
        "alternatives": []
    }
