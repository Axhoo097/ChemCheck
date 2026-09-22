import uuid

from app.models.ingredient import EvidenceLevel, Ingredient, RiskLevel
from app.schemas.scoring import Category
from app.services.scoring import calculate_base_score, personalize_score


def _ingredient(risk_level, is_allergen=False, evidence_level=EvidenceLevel.strong, name="Test") -> Ingredient:
    return Ingredient(
        id=uuid.uuid4(),
        name=name,
        risk_level=risk_level,
        is_allergen=is_allergen,
        evidence_level=evidence_level,
    )


def test_no_ingredients_scores_100_and_best():
    result = calculate_base_score([])
    assert result.score == 100
    assert result.category == Category.BEST
    assert result.concern_count == 0
    assert result.allergen_count == 0
    assert result.breakdown == []


def test_all_low_risk_ingredients_scores_100():
    ingredients = [_ingredient(RiskLevel.low, name=f"Low {i}") for i in range(5)]
    result = calculate_base_score(ingredients)
    assert result.score == 100
    assert result.category == Category.BEST
    assert result.concern_count == 0


def test_single_medium_risk_strong_evidence_matches_hand_calculation():
    # base_points=8, multiplier=1.0 (strong) -> deduction=8 -> score=92
    result = calculate_base_score([_ingredient(RiskLevel.medium, evidence_level=EvidenceLevel.strong)])
    assert result.score == 92
    assert result.category == Category.BEST  # 92 >= 85
    assert result.concern_count == 1
    assert result.breakdown[0].points_deducted == 8.0


def test_single_high_risk_limited_evidence_matches_hand_calculation():
    # base_points=20, multiplier=0.5 (limited) -> deduction=10 -> score=90
    result = calculate_base_score([_ingredient(RiskLevel.high, evidence_level=EvidenceLevel.limited)])
    assert result.score == 90
    assert result.breakdown[0].points_deducted == 10.0


def test_allergen_adds_flat_five_point_penalty():
    # low risk (0 base) + allergen (+5) -> deduction=5 -> score=95
    result = calculate_base_score([_ingredient(RiskLevel.low, is_allergen=True)])
    assert result.score == 95
    assert result.allergen_count == 1
    assert result.concern_count == 0  # low risk isn't a "concern" on its own
    assert result.breakdown[0].points_deducted == 5.0


def test_multiple_high_risk_allergens_pushes_into_worst_category():
    # 3 high-risk allergens, strong evidence: each deduction = 20*1.0 + 5 = 25 -> total 75 -> score=25
    ingredients = [
        _ingredient(RiskLevel.high, is_allergen=True, evidence_level=EvidenceLevel.strong, name=f"High {i}")
        for i in range(3)
    ]
    result = calculate_base_score(ingredients)
    assert result.score == 25
    assert result.category == Category.WORST
    assert result.concern_count == 3
    assert result.allergen_count == 3


def test_score_never_goes_below_zero():
    ingredients = [
        _ingredient(RiskLevel.high, is_allergen=True, evidence_level=EvidenceLevel.strong, name=f"High {i}")
        for i in range(10)
    ]
    result = calculate_base_score(ingredients)
    assert result.score == 0
    assert result.category == Category.WORST


def test_category_thresholds_are_correctly_applied():
    # Directly exercise the boundary values via crafted deductions.
    # 85 -> Best, 84 -> Better, 60 -> Better, 59 -> Worst
    assert calculate_base_score([_ingredient(RiskLevel.low)]).category == Category.BEST  # score 100

    # One medium (strong evidence) = -8 => 92 => Best
    assert calculate_base_score([_ingredient(RiskLevel.medium, evidence_level=EvidenceLevel.strong)]).category == Category.BEST

    # Two high (strong evidence) = -40 => 60 => Better (boundary)
    two_high = [_ingredient(RiskLevel.high, evidence_level=EvidenceLevel.strong, name=f"H{i}") for i in range(2)]
    result = calculate_base_score(two_high)
    assert result.score == 60
    assert result.category == Category.BETTER

    # Three high (strong evidence) = -60 => 40 => Worst
    three_high = [_ingredient(RiskLevel.high, evidence_level=EvidenceLevel.strong, name=f"H{i}") for i in range(3)]
    result = calculate_base_score(three_high)
    assert result.score == 40
    assert result.category == Category.WORST


def test_personalize_with_no_matching_sensitivity_returns_base_unchanged():
    water = _ingredient(RiskLevel.low, name="Water")
    base = calculate_base_score([water])

    result = personalize_score(base, [water], sensitivity_ingredient_ids={uuid.uuid4()})

    assert result.score == base.score
    assert result.category == base.category
    assert result.warnings == []
    assert result.personalized is True


def test_personalize_with_matching_sensitivity_adds_warning_and_penalty():
    fragrance = _ingredient(RiskLevel.medium, name="Fragrance")
    base = calculate_base_score([fragrance])  # 8 points deducted -> 92

    result = personalize_score(base, [fragrance], sensitivity_ingredient_ids={fragrance.id})

    # base 92, minus flat 15-point sensitivity penalty -> 77
    assert result.score == 77
    assert result.category == Category.BETTER
    assert len(result.warnings) == 1
    assert "Fragrance" in result.warnings[0]
    assert result.personalized is True


def test_personalize_with_no_ingredients_matched_of_several():
    safe = _ingredient(RiskLevel.low, name="Glycerin")
    risky = _ingredient(RiskLevel.medium, name="Parfum")
    base = calculate_base_score([safe, risky])

    # user is only sensitive to the safe one's id substituted with a random id (no match)
    result = personalize_score(base, [safe, risky], sensitivity_ingredient_ids={uuid.uuid4()})
    assert result.warnings == []
    assert result.score == base.score


def test_personalize_multiple_matches_stack_penalties_and_warnings():
    a = _ingredient(RiskLevel.low, name="Ingredient A")
    b = _ingredient(RiskLevel.low, name="Ingredient B")
    base = calculate_base_score([a, b])  # both low risk -> 100

    result = personalize_score(base, [a, b], sensitivity_ingredient_ids={a.id, b.id})

    # two matches * 15 points each -> 100 - 30 = 70
    assert result.score == 70
    assert result.category == Category.BETTER
    assert len(result.warnings) == 2


def test_personalize_with_reaction_history_match_adds_warning_and_smaller_penalty():
    parfum = _ingredient(RiskLevel.low, name="Parfum")
    base = calculate_base_score([parfum])  # low risk -> 100

    result = personalize_score(base, [parfum], sensitivity_ingredient_ids=set(), reaction_ingredient_ids={parfum.id})

    # 100 - 8 (REACTION_HISTORY_PENALTY) = 92
    assert result.score == 92
    assert len(result.warnings) == 1
    assert "reacted to" in result.warnings[0]
    assert result.personalized is True


def test_personalize_sensitivity_takes_precedence_over_reaction_for_same_ingredient():
    parfum = _ingredient(RiskLevel.low, name="Parfum")
    base = calculate_base_score([parfum])

    # Same ingredient in BOTH sets -> only the sensitivity penalty/warning applies, not both.
    result = personalize_score(
        base, [parfum], sensitivity_ingredient_ids={parfum.id}, reaction_ingredient_ids={parfum.id}
    )

    assert result.score == 85  # 100 - 15 (SENSITIVITY_PENALTY), not 100 - 15 - 8
    assert len(result.warnings) == 1
    assert "sensitivity" in result.warnings[0]


def test_personalize_with_no_reaction_ingredient_ids_argument_defaults_safely():
    water = _ingredient(RiskLevel.low, name="Water")
    base = calculate_base_score([water])
    # Omitting reaction_ingredient_ids entirely (Phase 4 call sites, pre-Phase-7) must still work.
    result = personalize_score(base, [water], sensitivity_ingredient_ids=set())
    assert result.score == base.score
    assert result.warnings == []
