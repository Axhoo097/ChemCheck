import { Ingredient } from '../data/ingredients';

export type RiskLevel = 'low' | 'medium' | 'high';
export type EvidenceLevel = 'strong' | 'moderate' | 'limited';
export type Category = 'Best' | 'Better' | 'Worst';

export const RISK_BASE_POINTS: Record<RiskLevel, number> = {
  low: 0,
  medium: 8,
  high: 20,
};

export const EVIDENCE_MULTIPLIER: Record<EvidenceLevel, number> = {
  strong: 1.0,
  moderate: 0.8,
  limited: 0.5,
};

export const ALLERGEN_PENALTY = 5.0;
export const SENSITIVITY_PENALTY = 15.0;
export const REACTION_HISTORY_PENALTY = 8.0;

export const BEST_THRESHOLD = 85;
export const BETTER_THRESHOLD = 60;

export function categorizeScore(score: number): Category {
  if (score >= BEST_THRESHOLD) return 'Best';
  if (score >= BETTER_THRESHOLD) return 'Better';
  return 'Worst';
}

export interface ScoreBreakdownItem {
  ingredient_id: string;
  name: string;
  risk_level: RiskLevel;
  is_allergen: boolean;
  evidence_level: EvidenceLevel;
  points_deducted: number;
}

export interface ScoreResult {
  score: number;
  category: Category;
  concern_count: number;
  allergen_count: number;
  breakdown: ScoreBreakdownItem[];
  warnings?: string[];
  personalized?: boolean;
}

export function calculateBaseScore(ingredients: Ingredient[]): ScoreResult {
  let score = 100.0;
  let concern_count = 0;
  let allergen_count = 0;
  const breakdown: ScoreBreakdownItem[] = [];

  for (const ingredient of ingredients) {
    const basePoints = RISK_BASE_POINTS[ingredient.risk_level] ?? 0;
    const multiplier = EVIDENCE_MULTIPLIER[ingredient.evidence_level] ?? 1.0;
    let deduction = basePoints * multiplier;

    if (ingredient.is_allergen) {
      deduction += ALLERGEN_PENALTY;
      allergen_count += 1;
    }

    if (ingredient.risk_level === 'medium' || ingredient.risk_level === 'high') {
      concern_count += 1;
    }

    score -= deduction;

    breakdown.push({
      ingredient_id: ingredient.id,
      name: ingredient.name,
      risk_level: ingredient.risk_level,
      is_allergen: ingredient.is_allergen,
      evidence_level: ingredient.evidence_level,
      points_deducted: Math.round(deduction * 100) / 100,
    });
  }

  const finalScore = Math.max(0, Math.min(100, Math.round(score)));

  return {
    score: finalScore,
    category: categorizeScore(finalScore),
    concern_count,
    allergen_count,
    breakdown,
  };
}

export function personalizeScore(
  base: ScoreResult,
  ingredients: Ingredient[],
  sensitivityIngredientIds: Set<string>,
  reactionIngredientIds: Set<string> = new Set()
): ScoreResult {
  const warnings: string[] = [];
  let deduction = 0.0;

  for (const ingredient of ingredients) {
    if (sensitivityIngredientIds.has(ingredient.id)) {
      warnings.push(
        `This product contains ${ingredient.name}, which is linked to a sensitivity you've saved on your profile.`
      );
      deduction += SENSITIVITY_PENALTY;
    } else if (reactionIngredientIds.has(ingredient.id)) {
      warnings.push(
        `This product contains ${ingredient.name}, which you've reacted to in a previous product.`
      );
      deduction += REACTION_HISTORY_PENALTY;
    }
  }

  if (warnings.length === 0) {
    return {
      ...base,
      personalized: true,
      warnings: [],
    };
  }

  const newScore = Math.max(0, Math.min(100, Math.round(base.score - deduction)));
  return {
    ...base,
    score: newScore,
    category: categorizeScore(newScore),
    warnings,
    personalized: true,
  };
}
