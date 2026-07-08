import axios from 'axios';
import { logger } from '../config/logger';

interface OFFProduct {
  name: string;
  brand: string;
  category: string;
  description: string;
  imageUrl: string;
  country: string;
  nutriScore: string;
  novaGroup: number;
  ingredientsList: string[];
}

export class OpenFoodFactsService {
  private baseUrl = 'https://world.openfoodfacts.org/api/v2';

  async getProductByBarcode(barcode: string): Promise<OFFProduct | null> {
    try {
      const response = await axios.get(`${this.baseUrl}/product/${barcode}.json`, {
        timeout: 10000,
        headers: { 'User-Agent': 'ChemCheck/1.0 (contact@chemcheck.in)' },
      });

      if (response.data.status !== 1 || !response.data.product) {
        return null;
      }

      const product = response.data.product;

      // Parse ingredients from OFF data
      const ingredientsList = this.parseIngredients(product);

      // Map OFF categories to our categories
      const category = this.mapCategory(product.categories_tags || []);

      return {
        name: product.product_name || product.product_name_en || 'Unknown Product',
        brand: product.brands || 'Unknown Brand',
        category,
        description: product.generic_name || product.product_name || '',
        imageUrl: product.image_url || product.image_front_url || '',
        country: this.extractCountry(product),
        nutriScore: product.nutriscore_grade || null,
        novaGroup: product.nova_group || null,
        ingredientsList,
      };
    } catch (error) {
      logger.error('OpenFoodFacts API error:', error);
      return null;
    }
  }

  private parseIngredients(product: any): string[] {
    // Try structured ingredients first
    if (product.ingredients && Array.isArray(product.ingredients)) {
      return product.ingredients.map((ing: any) => ing.text || ing.id?.replace('en:', '') || '').filter(Boolean);
    }

    // Fall back to text parsing
    if (product.ingredients_text || product.ingredients_text_en) {
      const text = product.ingredients_text || product.ingredients_text_en;
      return text
        .split(/[,;]/)
        .map((s: string) => s.replace(/\(.*?\)/g, '').trim())
        .filter((s: string) => s.length > 1);
    }

    return [];
  }

  private mapCategory(tags: string[]): string {
    const categoryMap: Record<string, string> = {
      'en:beverages': 'BEVERAGE',
      'en:foods': 'FOOD',
      'en:snacks': 'FOOD',
      'en:dairy': 'FOOD',
      'en:cereals': 'GROCERY',
      'en:groceries': 'GROCERY',
      'en:cosmetics': 'COSMETIC',
      'en:body-care': 'PERSONAL_CARE',
      'en:hair-care': 'HAIRCARE',
      'en:skin-care': 'SKINCARE',
      'en:baby': 'BABY_CARE',
    };

    for (const tag of tags) {
      const normalized = tag.toLowerCase();
      for (const [key, value] of Object.entries(categoryMap)) {
        if (normalized.includes(key) || key.includes(normalized)) {
          return value;
        }
      }
    }

    return 'GROCERY';
  }

  private extractCountry(product: any): string {
    const countries = product.countries_tags || [];
    if (countries.includes('en:india')) return 'India';
    if (product.countries) {
      if (product.countries.toLowerCase().includes('india')) return 'India';
    }
    return countries[0]?.replace('en:', '') || 'Unknown';
  }
}
