import json
import os
from pathlib import Path
from typing import List, Dict, Any

DB_PATH = Path(__file__).parent.parent / "db" / "chemical_risk_db.json"

def load_chemical_db() -> Dict:
    if not DB_PATH.exists():
        return {}
    with open(DB_PATH, "r", encoding="utf-8") as f:
        return json.load(f)

CHEMICAL_DB = load_chemical_db()

def find_chemical(name: str) -> Dict | None:
    """Find a chemical in the database by name (exact or partial match)."""
    normalized = name.lower().strip()
    
    # 1. Exact match
    if normalized in CHEMICAL_DB:
        return CHEMICAL_DB[normalized]
    
    # 2. Check if normalized name starts with or contains a DB key
    for key, data in CHEMICAL_DB.items():
        if key in normalized or normalized.startswith(key[:6]):
            return data

    # 3. Fuzzy partial match
    for key, data in CHEMICAL_DB.items():
        if len(key) > 4 and key in normalized:
            return data
        if len(normalized) > 4 and normalized in key:
            return data

    return None

def calculate_toxicity(ingredients: List[str]) -> Dict[str, Any]:
    """
    Analyzes a list of ingredients and returns a detailed toxicity report.
    
    Returns:
        {
            overallScore: 0-100 (higher = more risky),
            riskLevel: "BEST" | "BETTER" | "WORST",
            verdict: str,
            aiSummary: str,
            ingredients: [...],
            harmfulIngredients: [...],
            safeIngredients: [...],
            warnings: [...],
            categories: {...}
        }
    """
    if not ingredients:
        return {
            "overallScore": 0,
            "riskLevel": "BEST",
            "verdict": "No Ingredients",
            "aiSummary": "No ingredients were provided for analysis.",
            "ingredients": [],
            "harmfulIngredients": [],
            "safeIngredients": [],
            "warnings": [],
            "categories": {}
        }

    total_risk = 0
    analyzed = []
    harmful_names = []
    safe_names = []
    warnings = []
    categories: Dict[str, int] = {}
    known_count = 0

    for ing in ingredients:
        ing = ing.strip()
        if not ing or len(ing) < 2:
            continue

        match = find_chemical(ing)

        if match:
            known_count += 1
            risk = match["risk"]
            total_risk += risk
            cat = match.get("category", "General")
            categories[cat] = categories.get(cat, 0) + 1

            entry = {
                "name": ing,
                "risk": risk,
                "category": cat,
                "description": match.get("description", ""),
                "safe": match.get("safe", True),
                "effects": match.get("effects", []),
                "alternatives": match.get("alternatives", []),
                "known": True
            }
            analyzed.append(entry)

            if not match.get("safe", True):
                harmful_names.append(ing)
                if risk >= 70:
                    warnings.append(f"HIGH RISK: {ing} — {match.get('description', '')[:80]}")
                elif risk >= 40:
                    warnings.append(f"MODERATE RISK: {ing} — {match.get('description', '')[:80]}")
            else:
                safe_names.append(ing)
        else:
            # Unknown ingredient — conservative default
            default_risk = 18
            total_risk += default_risk
            analyzed.append({
                "name": ing,
                "risk": default_risk,
                "category": "Unknown",
                "description": "Unknown ingredient. Assumed low-to-moderate risk.",
                "safe": True,
                "effects": [],
                "alternatives": [],
                "known": False
            })
            safe_names.append(ing)

    n = len(analyzed)
    if n == 0:
        avg_score = 0
    else:
        avg_score = total_risk / n

    # Apply curve: make bad profiles stand out more
    # Also weight by % of known harmful ingredients
    harmful_ratio = len(harmful_names) / n if n > 0 else 0
    overall_score = min(100, int(avg_score * 1.4 + harmful_ratio * 20))

    if overall_score <= 30:
        risk_level = "BEST"
        verdict = "Low Risk – Generally Safe"
    elif overall_score <= 65:
        risk_level = "BETTER"
        verdict = "Moderate Risk – Use with Caution"
    else:
        risk_level = "WORST"
        verdict = "High Risk – Contains Harmful Chemicals"

    # Generate AI summary
    harmful_list = ", ".join(harmful_names[:5]) if harmful_names else "none detected"
    known_pct = int(known_count / n * 100) if n > 0 else 0
    ai_summary = (
        f"Analysis of {n} ingredients found {len(harmful_names)} potentially harmful chemicals. "
        f"Overall risk score: {overall_score}/100 ({verdict}). "
        f"Top concerns: {harmful_list}. "
        f"{known_pct}% of ingredients were matched in our chemical safety database."
    )

    return {
        "overallScore": overall_score,
        "riskLevel": risk_level,
        "verdict": verdict,
        "aiSummary": ai_summary,
        "ingredients": analyzed,
        "harmfulIngredients": harmful_names,
        "safeIngredients": safe_names,
        "warnings": warnings,
        "categories": categories,
        "stats": {
            "total": n,
            "known": known_count,
            "harmful": len(harmful_names),
            "safe": len(safe_names)
        }
    }
