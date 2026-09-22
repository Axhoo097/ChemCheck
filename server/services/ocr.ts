import { Ingredient } from '../data/ingredients';
import { store } from '../data/store';

export function splitIngredientText(rawText: string): string[] {
  if (!rawText) return [];

  // Remove common label noise words like "Ingredients:", "Contains:", etc.
  const cleaned = rawText
    .replace(/^ingredients\s*[:\-]?/i, '')
    .replace(/^active ingredients\s*[:\-]?/i, '')
    .replace(/^inactive ingredients\s*[:\-]?/i, '')
    .replace(/^other ingredients\s*[:\-]?/i, '');

  // Split by comma, semicolon, bullet, pipe, or newlines
  const rawTokens = cleaned.split(/[,;\n•|]/);

  const tokens: string[] = [];
  for (let token of rawTokens) {
    // Strip leading/trailing punctuation and extra whitespace
    token = token.trim().replace(/^[\*\.\-\(\)]+|[\*\.\-\(\)]+$/g, '').trim();
    if (token.length >= 2) {
      tokens.push(token);
    }
  }

  return tokens;
}

export interface MatchedIngredient {
  token: string;
  ingredient: Ingredient;
  match_confidence: number;
}

export function matchIngredientTokens(tokens: string[]): {
  matched: MatchedIngredient[];
  unmatched: string[];
} {
  const matched: MatchedIngredient[] = [];
  const unmatched: string[] = [];
  const allIngredients = Array.from(store.ingredients.values());

  for (const token of tokens) {
    const lowerToken = token.toLowerCase();

    // Exact match or contains
    let bestMatch: Ingredient | null = null;
    let confidence = 0;

    for (const ing of allIngredients) {
      const lowerName = ing.name.toLowerCase();

      if (lowerName === lowerToken) {
        bestMatch = ing;
        confidence = 1.0;
        break;
      }

      if (lowerToken.includes(lowerName) || lowerName.includes(lowerToken)) {
        if (confidence < 0.85) {
          bestMatch = ing;
          confidence = 0.85;
        }
      }
    }

    if (bestMatch && confidence >= 0.8) {
      matched.push({
        token,
        ingredient: bestMatch,
        match_confidence: confidence,
      });
    } else {
      unmatched.push(token);
    }
  }

  return { matched, unmatched };
}
