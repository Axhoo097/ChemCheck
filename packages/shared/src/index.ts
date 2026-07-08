// ============================================
// ChemCheck Shared Types
// ============================================

// ---- Enums ----
export enum UserRole {
  USER = 'USER',
  ADMIN = 'ADMIN',
  MODERATOR = 'MODERATOR',
}

export enum ProductCategory {
  GROCERY = 'GROCERY',
  COSMETIC = 'COSMETIC',
  SKINCARE = 'SKINCARE',
  HAIRCARE = 'HAIRCARE',
  FOOD = 'FOOD',
  BEVERAGE = 'BEVERAGE',
  PERSONAL_CARE = 'PERSONAL_CARE',
  BABY_CARE = 'BABY_CARE',
  HOUSEHOLD = 'HOUSEHOLD',
}

export enum ProductSource {
  OPEN_FOOD_FACTS = 'OPEN_FOOD_FACTS',
  MANUAL = 'MANUAL',
  BARCODE_SCAN = 'BARCODE_SCAN',
  OCR_SCAN = 'OCR_SCAN',
}

export enum ProductStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
}

export enum RiskLevel {
  BEST = 'BEST',
  BETTER = 'BETTER',
  WORST = 'WORST',
}

export enum SkinType {
  OILY = 'OILY',
  DRY = 'DRY',
  COMBINATION = 'COMBINATION',
  SENSITIVE = 'SENSITIVE',
  NORMAL = 'NORMAL',
}

export enum HairType {
  OILY = 'OILY',
  DRY = 'DRY',
  NORMAL = 'NORMAL',
  CURLY = 'CURLY',
  STRAIGHT = 'STRAIGHT',
  WAVY = 'WAVY',
  COILY = 'COILY',
}

export enum ReactionSeverity {
  MILD = 'MILD',
  MODERATE = 'MODERATE',
  SEVERE = 'SEVERE',
}

export enum NotificationType {
  PRODUCT_ALERT = 'PRODUCT_ALERT',
  RECOMMENDATION = 'RECOMMENDATION',
  REVIEW_REPLY = 'REVIEW_REPLY',
  SYSTEM = 'SYSTEM',
}

// ---- Interfaces ----
export interface IUser {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  avatarUrl?: string;
  googleId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface IUserProfile {
  userId: string;
  skinType?: SkinType;
  hairType?: HairType;
  allergies: string[];
  dietaryPrefs: string[];
  goals: string[];
}

export interface IProduct {
  id: string;
  barcode?: string;
  name: string;
  brand: string;
  category: ProductCategory;
  description?: string;
  imageUrl?: string;
  source: ProductSource;
  status: ProductStatus;
  country?: string;
  ingredients?: IProductIngredient[];
  toxicityReport?: IToxicityReport;
  createdAt: string;
}

export interface IIngredient {
  id: string;
  name: string;
  inciName?: string;
  casNumber?: string;
  riskScore: number;
  category: string;
  description?: string;
  healthEffects: string[];
  alternatives: string[];
  sources: string[];
  aliases: string[];
}

export interface IProductIngredient {
  productId: string;
  ingredientId: string;
  ingredient: IIngredient;
  concentration?: number;
  position: number;
}

export interface IToxicityReport {
  id: string;
  productId: string;
  overallScore: number;
  riskLevel: RiskLevel;
  aiSummary: string;
  harmfulIngredients: string[];
  safeIngredients: string[];
  warnings: string[];
  createdAt: string;
}

export interface IReview {
  id: string;
  userId: string;
  productId: string;
  rating: number;
  title?: string;
  comment: string;
  helpfulCount: number;
  user?: Pick<IUser, 'id' | 'name' | 'avatarUrl'>;
  createdAt: string;
}

export interface IUserReaction {
  id: string;
  userId: string;
  ingredientId: string;
  ingredient?: IIngredient;
  reactionType: string;
  severity: ReactionSeverity;
  notes?: string;
  date: string;
}

export interface IRecommendation {
  id: string;
  userId: string;
  productId: string;
  product?: IProduct;
  reason: string;
  score: number;
  createdAt: string;
}

export interface INotification {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  read: boolean;
  actionUrl?: string;
  createdAt: string;
}

export interface IAdminLog {
  id: string;
  adminId: string;
  action: string;
  entityType: string;
  entityId: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
}

export interface IProductComparison {
  id: string;
  userId: string;
  products: IProduct[];
  createdAt: string;
}

// ---- API Types ----
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
  pagination?: PaginationMeta;
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  name: string;
  email: string;
  password: string;
}

export interface AuthResponse {
  user: IUser;
  accessToken: string;
  refreshToken: string;
}

export interface ScanBarcodeRequest {
  barcode: string;
}

export interface CompareProductsRequest {
  productIds: string[];
}

export interface ToxicityPredictionRequest {
  ingredients: string[];
  productCategory?: ProductCategory;
}

export interface ToxicityPredictionResponse {
  overallScore: number;
  riskLevel: RiskLevel;
  ingredientScores: Array<{
    name: string;
    score: number;
    risk: RiskLevel;
    concerns: string[];
  }>;
  summary: string;
  warnings: string[];
}

export interface RecommendationRequest {
  userId: string;
  category: ProductCategory;
  skinType?: SkinType;
  hairType?: HairType;
  allergies?: string[];
  avoidIngredients?: string[];
}

export interface DashboardStats {
  totalUsers: number;
  totalProducts: number;
  totalScans: number;
  totalReviews: number;
  pendingApprovals: number;
  recentActivity: Array<{
    type: string;
    message: string;
    timestamp: string;
  }>;
  categoryBreakdown: Array<{
    category: string;
    count: number;
  }>;
}
