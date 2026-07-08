import axios from 'axios';
import { env } from '../config/env';
import { logger } from '../config/logger';

// Risk level mapping to our enum
const mapRiskLevel = (score: number): 'BEST' | 'BETTER' | 'WORST' => {
  if (score <= 30) return 'BEST';
  if (score <= 65) return 'BETTER';
  return 'WORST';
};

export class AiService {
  private baseUrl = env.AI_SERVICE_URL;

  async parseIngredients(text: string): Promise<string[]> {
    try {
      const response = await axios.post(
        `${this.baseUrl}/api/v1/nlp/parse`,
        { text },
        { timeout: 15000 }
      );
      return response.data.ingredients || [];
    } catch (error) {
      logger.warn('AI parse failed, using fallback regex parser');
      // Fallback: basic regex parsing
      return text
        .split(/[,\n;]/)
        .map(s => s.replace(/\(.*?\)/g, '').trim().replace(/^[^a-zA-Z0-9]+|[^a-zA-Z0-9\s\-]+$/g, ''))
        .filter(s => s.length > 2 && s.length < 80);
    }
  }

  async predictToxicity(ingredients: string[]): Promise<{
    overallScore: number;
    riskLevel: 'BEST' | 'BETTER' | 'WORST';
    summary: string;
    warnings: string[];
    harmfulIngredients: string[];
    safeIngredients: string[];
    ingredientDetails: any[];
  }> {
    try {
      const response = await axios.post(
        `${this.baseUrl}/api/v1/toxicity/analyze`,
        { ingredients },
        { timeout: 20000 }
      );
      const data = response.data;
      return {
        overallScore: data.overallScore ?? 0,
        riskLevel: (data.riskLevel as any) ?? mapRiskLevel(data.overallScore ?? 0),
        summary: data.aiSummary ?? data.verdict ?? 'Analysis complete',
        warnings: data.warnings ?? [],
        harmfulIngredients: data.harmfulIngredients ?? [],
        safeIngredients: data.safeIngredients ?? [],
        ingredientDetails: data.ingredients ?? [],
      };
    } catch (error) {
      logger.warn('AI toxicity service unavailable, using fallback scorer');
      // Comprehensive fallback chemical list
      const HIGH_RISK = ['paraben', 'sulfate', 'fragrance', 'parfum', 'formaldehyde', 'triclosan', 'phthalate', 'mercury', 'lead', 'coal tar', 'hydroquinone', 'oxybenzone'];
      const MOD_RISK = ['phenoxyethanol', 'retinol', 'alcohol denat', 'propylene glycol', 'mineral oil', 'talc', 'silicone', 'dimethicone', 'sodium benzoate', 'bha', 'bht'];
      
      const harmful: string[] = [];
      const warnings: string[] = [];
      let score = 5;

      for (const ing of ingredients) {
        const lower = ing.toLowerCase();
        if (HIGH_RISK.some(r => lower.includes(r))) {
          harmful.push(ing);
          score += 20;
          warnings.push(`HIGH RISK: ${ing}`);
        } else if (MOD_RISK.some(r => lower.includes(r))) {
          harmful.push(ing);
          score += 10;
          warnings.push(`MODERATE RISK: ${ing}`);
        }
      }

      score = Math.min(100, score);
      const riskLevel = mapRiskLevel(score);

      return {
        overallScore: score,
        riskLevel,
        summary: `Analysis of ${ingredients.length} ingredients found ${harmful.length} potentially harmful chemicals. Risk level: ${riskLevel}.`,
        warnings,
        harmfulIngredients: harmful,
        safeIngredients: ingredients.filter(i => !harmful.includes(i)),
        ingredientDetails: [],
      };
    }
  }

  async getIngredientRisk(name: string): Promise<number> {
    try {
      const response = await axios.get(
        `${this.baseUrl}/api/v1/toxicity/ingredient/${encodeURIComponent(name)}`,
        { timeout: 5000 }
      );
      return response.data.risk ?? 18;
    } catch {
      // Fallback
      const normalized = name.toLowerCase();
      if (normalized.includes('paraben') || normalized.includes('formaldehyde')) return 80;
      if (normalized.includes('sulfate')) return 60;
      if (normalized.includes('fragrance') || normalized.includes('parfum')) return 75;
      if (normalized.includes('aqua') || normalized.includes('water') || normalized.includes('glycerin')) return 0;
      if (normalized.includes('alcohol denat')) return 40;
      return 18;
    }
  }

  async getRecommendations(params: {
    harmfulIngredients: string[];
    category?: string;
    skinType?: string;
    hairType?: string;
    allergies?: string[];
  }) {
    try {
      const response = await axios.post(
        `${this.baseUrl}/api/v1/recommendations/suggest`,
        {
          harmful_ingredients: params.harmfulIngredients,
          category: params.category,
          skin_type: params.skinType,
          hair_type: params.hairType,
          allergies: params.allergies,
        },
        { timeout: 10000 }
      );
      return response.data;
    } catch {
      return {
        ingredient_alternatives: [],
        recommended_products: [],
        general_tips: [],
        summary: 'Recommendation service temporarily unavailable.'
      };
    }
  }
}
