"""
Phase 3 — deterministic rule-based safety scoring.

Deliberately NOT machine learning (Section 8 of the master prompt: never
claim rule-based logic is ML). This is a pure function: same input
ingredients always produce the same score, with no DB access inside it,
so it's trivially unit-testable and independent of the API route that
calls it.

Weights (documented here, not buried in code):
    - risk_level base points:      low=0, medium=8, high=20
    - evidence_level multiplier:   strong=1.0, moderate=0.8, limited=0.5
      (limited evidence -> we're less certain, so we penalize less)
    - allergen flag:               flat +5 point penalty, regardless of
      risk_level, because allergen status matters independently of
      general risk

Score starts at 100 and is reduced by each ingredient's deduction,
clamped to [0, 100].

Category thresholds:
    score >= 85  -> Best
    score >= 60  -> Better
    score <  60  -> Worst
"""
from uuid import UUID

from app.models.ingredient import EvidenceLevel, Ingredient, RiskLevel
from app.schemas.scoring import Category, ScoreBreakdownItem, ScoreResult

RISK_BASE_POINTS: dict[RiskLevel, float] = {
    RiskLevel.low: 0,
    RiskLevel.medium: 8,
    RiskLevel.high: 20,
}

EVIDENCE_MULTIPLIER: dict[EvidenceLevel, float] = {
    EvidenceLevel.strong: 1.0,
    EvidenceLevel.moderate: 0.8,
    EvidenceLevel.limited: 0.5,
}

ALLERGEN_PENALTY = 5.0

# Phase 4 — flat penalty per ingredient matching a user's saved
# sensitivity (a deliberate, confirmed statement from the user).
SENSITIVITY_PENALTY = 15.0

# Phase 7 — smaller flat penalty per ingredient the user has reacted to
# before but not (yet) saved as a sensitivity. Softer signal than an
# explicit sensitivity, hence the smaller penalty — the reaction pattern
# detector already offers to promote it to a real sensitivity.
REACTION_HISTORY_PENALTY = 8.0

BEST_THRESHOLD = 85
BETTER_THRESHOLD = 60


def _categorize(score: int) -> str:
    if score >= BEST_THRESHOLD:
        return Category.BEST
    if score >= BETTER_THRESHOLD:
        return Category.BETTER
    return Category.WORST


def calculate_base_score(ingredients: list[Ingredient]) -> ScoreResult:
    score = 100.0
    concern_count = 0
    allergen_count = 0
    breakdown: list[ScoreBreakdownItem] = []

    for ingredient in ingredients:
        base_points = RISK_BASE_POINTS[ingredient.risk_level]
        multiplier = EVIDENCE_MULTIPLIER[ingredient.evidence_level]
        deduction = base_points * multiplier

        if ingredient.is_allergen:
            deduction += ALLERGEN_PENALTY
            allergen_count += 1

        if ingredient.risk_level in (RiskLevel.medium, RiskLevel.high):
            concern_count += 1

        score -= deduction

        breakdown.append(
            ScoreBreakdownItem(
                ingredient_id=ingredient.id,
                name=ingredient.name,
                risk_level=ingredient.risk_level,
                is_allergen=ingredient.is_allergen,
                evidence_level=ingredient.evidence_level,
                points_deducted=round(deduction, 2),
            )
        )

    final_score = max(0, min(100, round(score)))

    return ScoreResult(
        score=final_score,
        category=_categorize(final_score),
        concern_count=concern_count,
        allergen_count=allergen_count,
        breakdown=breakdown,
    )


def personalize_score(
    base: ScoreResult,
    ingredients: list[Ingredient],
    sensitivity_ingredient_ids: set[UUID],
    reaction_ingredient_ids: set[UUID] | None = None,
) -> ScoreResult:
    """
    Phase 4 (+ Phase 7 extension) — layered on top of
    calculate_base_score(), still pure (no DB access here either; the
    caller fetches the ingredients and the user's sensitivity/reaction
    ingredient IDs beforehand).

    Two independent personalization signals, checked in priority order
    per ingredient — a saved sensitivity is a deliberate, confirmed
    statement from the user, so it takes precedence and carries the
    larger penalty; a past reaction is a softer signal (Phase 7's
    pattern detector already offers to promote it to a real sensitivity,
    so it isn't double-counted if the user already did):
      1. sensitivity_ingredient_ids — user explicitly saved this (Phase 4)
      2. reaction_ingredient_ids    — user logged a reaction to a past
         product containing this ingredient, but hasn't saved it as a
         sensitivity (Phase 7)

    The product itself hasn't changed — only its suitability for *this*
    user has (see Section 1: never claim it's "unsafe", it's a
    personalized ChemCheck risk category).
    """
    reaction_ingredient_ids = reaction_ingredient_ids or set()
    warnings: list[str] = []
    deduction = 0.0

    for ingredient in ingredients:
        if ingredient.id in sensitivity_ingredient_ids:
            warnings.append(
                f"This product contains {ingredient.name}, which is linked to a sensitivity "
                "you've saved on your profile."
            )
            deduction += SENSITIVITY_PENALTY
        elif ingredient.id in reaction_ingredient_ids:
            warnings.append(
                f"This product contains {ingredient.name}, which you've reacted to in a "
                "previous product."
            )
            deduction += REACTION_HISTORY_PENALTY

    if not warnings:
        # Personalization ran, just found nothing to warn about.
        return base.model_copy(update={"personalized": True})

    new_score = max(0, min(100, round(base.score - deduction)))
    return base.model_copy(
        update={
            "score": new_score,
            "category": _categorize(new_score),
            "warnings": warnings,
            "personalized": True,
        }
    )
