import { v4 as uuidv4 } from 'uuid';
import { Ingredient, SEED_INGREDIENTS } from './ingredients';
import { calculateBaseScore, ScoreResult } from '../services/scoring';

export interface Product {
  id: string;
  name: string;
  brand: string;
  barcode?: string | null;
  category: string;
  description?: string | null;
  image_url?: string | null;
  created_at: string;
}

export interface ProductIngredientLink {
  id: string;
  product_id: string;
  ingredient_id: string;
}

export interface User {
  id: string;
  name: string;
  email: string;
  password_hash: string;
  skin_type?: string | null;
  hair_type?: string | null;
  diet_preference?: string | null;
  created_at: string;
  is_admin?: boolean;
}

export interface UserSensitivity {
  id: string;
  user_id: string;
  ingredient_id: string;
  severity_note?: string | null;
  created_at: string;
}

export interface Reaction {
  id: string;
  user_id: string;
  product_id: string;
  symptoms: string;
  severity: string;
  date_occurred: string;
  notes?: string | null;
  created_at: string;
}

export interface Review {
  id: string;
  user_id: string;
  product_id: string;
  rating: number;
  comment?: string | null;
  created_at: string;
}

export interface Alert {
  id: string;
  product_id: string;
  headline: string;
  details: string;
  severity: 'low' | 'medium' | 'high';
  created_at: string;
}

class InMemoryStore {
  ingredients: Map<string, Ingredient> = new Map();
  products: Map<string, Product> = new Map();
  productIngredients: ProductIngredientLink[] = [];
  users: Map<string, User> = new Map();
  sensitivities: UserSensitivity[] = [];
  reactions: Reaction[] = [];
  reviews: Review[] = [];
  alerts: Alert[] = [];

  constructor() {
    this.seed();
  }

  private seed() {
    // 1. Seed ingredients
    for (const item of SEED_INGREDIENTS) {
      const id = uuidv4();
      this.ingredients.set(id, { id, ...item });
    }

    const findIng = (name: string) =>
      Array.from(this.ingredients.values()).find(
        (i) => i.name.toLowerCase() === name.toLowerCase()
      );

    // 2. Seed Default User (Demo account)
    const demoUserId = 'demo-user-123';
    this.users.set(demoUserId, {
      id: demoUserId,
      name: 'Ashish Demo',
      email: 'demo@chemcheck.io',
      password_hash: '$2a$10$demoHashedPasswordChemCheckDemo123',
      skin_type: 'sensitive',
      hair_type: 'dry',
      diet_preference: 'veg',
      created_at: new Date().toISOString(),
      is_admin: true,
    });

    // 3. Seed Sample Products
    const sampleProducts = [
      {
        name: 'Gentle Hydrating Cleanser',
        brand: 'PureCare',
        category: 'cleanser',
        barcode: '8901234567890',
        description: 'A mild soap-free daily foaming face wash for dry & sensitive skin.',
        image_url: 'https://images.unsplash.com/photo-1556228720-195a672e8a03?w=400&q=80',
        ingredientNames: [
          'Water',
          'Glycerin',
          'Sodium Cocoyl Isethionate',
          'Panthenol',
          'Hyaluronic Acid',
          'Allantoin',
          'Xanthan Gum',
        ],
      },
      {
        name: 'Deep Clarifying Sulfate Shampoo',
        brand: 'SalonPro',
        category: 'shampoo',
        barcode: '8909876543210',
        description: 'High-foaming anti-residue shampoo for oily scalp and heavy buildup.',
        image_url: 'https://images.unsplash.com/photo-1535585209827-a15fcdbc4c2d?w=400&q=80',
        ingredientNames: [
          'Water',
          'Sodium Laureth Sulfate',
          'Sodium Lauryl Sulfate',
          'Cocamidopropyl Betaine',
          'Sodium Chloride',
          'Fragrance (Parfum)',
          'Phenoxyethanol',
          'Citric Acid',
        ],
      },
      {
        name: 'Mineral Barrier Sunscreen SPF 50',
        brand: 'ShieldBio',
        category: 'sunscreen',
        barcode: '8905556667778',
        description: 'Non-nano zinc & titanium dioxide mineral sun protection.',
        image_url: 'https://images.unsplash.com/photo-1598440947619-2c35fc9aa908?w=400&q=80',
        ingredientNames: [
          'Water',
          'Zinc Oxide',
          'Titanium Dioxide',
          'Squalane',
          'Glycerin',
          'Tocopherol (Vitamin E)',
          'Silica',
          'Disodium EDTA',
        ],
      },
      {
        name: 'Chemical Active Defense Sunscreen SPF 30',
        brand: 'SunGlow',
        category: 'sunscreen',
        barcode: '8904443332221',
        description: 'Fast-absorbing chemical sun lotion with chemical filters.',
        image_url: 'https://images.unsplash.com/photo-1526947425960-945c6e72858f?w=400&q=80',
        ingredientNames: [
          'Water',
          'Oxybenzone',
          'Octinoxate',
          'Avobenzone',
          'Fragrance (Parfum)',
          'Phenoxyethanol',
          'Propylene Glycol',
        ],
      },
      {
        name: 'Advanced Retinol Renewal Night Serum',
        brand: 'DermaCell',
        category: 'serum',
        barcode: '8901112223334',
        description: '0.5% encapsulated pure retinol with niacinamide and soothing botanicals.',
        image_url: 'https://images.unsplash.com/photo-1620916566398-39f1143ab7be?w=400&q=80',
        ingredientNames: [
          'Water',
          'Glycerin',
          'Retinol',
          'Niacinamide',
          'Hyaluronic Acid',
          'Bisabolol',
          'Centella Asiatica Extract',
          'Tocopherol (Vitamin E)',
          'Phenoxyethanol',
        ],
      },
      {
        name: 'Barrier Ceramide Ultra Cream',
        brand: 'PureCare',
        category: 'moisturizer',
        barcode: '8907778889990',
        description: 'Rich barrier recovery cream packed with multi-ceramides and squalane.',
        image_url: 'https://images.unsplash.com/photo-1571781926291-c477ebfd024b?w=400&q=80',
        ingredientNames: [
          'Water',
          'Shea Butter',
          'Ceramide NP',
          'Squalane',
          'Centella Asiatica Extract',
          'Glycerin',
          'Cetearyl Alcohol',
          'Xanthan Gum',
        ],
      },
    ];

    for (const prodData of sampleProducts) {
      const pId = uuidv4();
      const product: Product = {
        id: pId,
        name: prodData.name,
        brand: prodData.brand,
        category: prodData.category,
        barcode: prodData.barcode,
        description: prodData.description,
        image_url: prodData.image_url,
        created_at: new Date().toISOString(),
      };
      this.products.set(pId, product);

      for (const ingName of prodData.ingredientNames) {
        const found = findIng(ingName);
        if (found) {
          this.productIngredients.push({
            id: uuidv4(),
            product_id: pId,
            ingredient_id: found.id,
          });
        }
      }
    }

    // 4. Seed user sensitivities for demo user: Fragrance (Parfum)
    const fragrance = findIng('Fragrance (Parfum)');
    if (fragrance) {
      this.sensitivities.push({
        id: uuidv4(),
        user_id: demoUserId,
        ingredient_id: fragrance.id,
        severity_note: 'Causes contact dermatitis and redness.',
        created_at: new Date().toISOString(),
      });
    }

    // 5. Seed sample product alert
    const sulfateShampoo = Array.from(this.products.values()).find((p) =>
      p.name.includes('Sulfate Shampoo')
    );
    if (sulfateShampoo) {
      this.alerts.push({
        id: uuidv4(),
        product_id: sulfateShampoo.id,
        headline: 'Potential scalp dryness notice',
        details:
          'Contains both SLS and SLES in primary surfactant position; may exacerbate dry, peeling, or sensitive scalps.',
        severity: 'medium',
        created_at: new Date().toISOString(),
      });
    }
  }

  getIngredientsForProduct(productId: string): Ingredient[] {
    const links = this.productIngredients.filter((pi) => pi.product_id === productId);
    const result: Ingredient[] = [];
    for (const link of links) {
      const ing = this.ingredients.get(link.ingredient_id);
      if (ing) result.push(ing);
    }
    return result;
  }
}

export const store = new InMemoryStore();
