export interface Ingredient {
  id: string;
  name: string;
  function: string;
  risk_level: 'low' | 'medium' | 'high';
  is_allergen: boolean;
  evidence_level: 'strong' | 'moderate' | 'limited';
  description: string;
}

export interface ScoreBreakdownItem {
  ingredient_id: string;
  name: string;
  risk_level: 'low' | 'medium' | 'high';
  is_allergen: boolean;
  evidence_level: 'strong' | 'moderate' | 'limited';
  points_deducted: number;
}

export interface ScoreResult {
  score: number;
  category: 'Best' | 'Better' | 'Worst';
  concern_count: number;
  allergen_count: number;
  breakdown: ScoreBreakdownItem[];
  warnings?: string[];
  personalized?: boolean;
}

export interface Product {
  id: string;
  name: string;
  brand: string;
  barcode?: string | null;
  category: string;
  description?: string | null;
  image_url?: string | null;
  created_at: string;
  score?: number;
  category_rating?: 'Best' | 'Better' | 'Worst';
  ingredient_count?: number;
  allergen_count?: number;
  concern_count?: number;
  ingredients?: Ingredient[];
}

export interface UserSensitivity {
  id: string;
  user_id: string;
  ingredient_id: string;
  severity_note?: string | null;
  created_at: string;
  ingredient?: Ingredient;
}

export interface UserReaction {
  id: string;
  user_id: string;
  product_id: string;
  symptoms: string;
  severity: string;
  date_occurred: string;
  notes?: string | null;
  product?: Product;
}

export interface AlternativeRecommendation {
  product: Product;
  score: number;
  category: 'Best' | 'Better' | 'Worst';
  concern_count: number;
  allergen_count: number;
  has_user_sensitivity: boolean;
}
