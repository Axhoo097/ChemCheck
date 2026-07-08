export const RISK_LEVELS = {
  BEST: { label: 'Best', color: '#10B981', maxScore: 30 },
  BETTER: { label: 'Better', color: '#F59E0B', maxScore: 65 },
  WORST: { label: 'Worst', color: '#EF4444', maxScore: 100 },
} as const;

export const PRODUCT_CATEGORIES = [
  { value: 'GROCERY', label: 'Grocery', icon: '🛒' },
  { value: 'COSMETIC', label: 'Cosmetics', icon: '💄' },
  { value: 'SKINCARE', label: 'Skincare', icon: '🧴' },
  { value: 'HAIRCARE', label: 'Haircare', icon: '💇' },
  { value: 'FOOD', label: 'Food', icon: '🍽️' },
  { value: 'BEVERAGE', label: 'Beverages', icon: '🥤' },
  { value: 'PERSONAL_CARE', label: 'Personal Care', icon: '🧼' },
  { value: 'BABY_CARE', label: 'Baby Care', icon: '👶' },
  { value: 'HOUSEHOLD', label: 'Household', icon: '🏠' },
] as const;

export const SKIN_TYPES = [
  { value: 'OILY', label: 'Oily' },
  { value: 'DRY', label: 'Dry' },
  { value: 'COMBINATION', label: 'Combination' },
  { value: 'SENSITIVE', label: 'Sensitive' },
  { value: 'NORMAL', label: 'Normal' },
] as const;

export const HAIR_TYPES = [
  { value: 'OILY', label: 'Oily' },
  { value: 'DRY', label: 'Dry' },
  { value: 'NORMAL', label: 'Normal' },
  { value: 'CURLY', label: 'Curly' },
  { value: 'STRAIGHT', label: 'Straight' },
  { value: 'WAVY', label: 'Wavy' },
  { value: 'COILY', label: 'Coily' },
] as const;

export const REACTION_SEVERITIES = [
  { value: 'MILD', label: 'Mild', color: '#F59E0B' },
  { value: 'MODERATE', label: 'Moderate', color: '#F97316' },
  { value: 'SEVERE', label: 'Severe', color: '#EF4444' },
] as const;

export const COMMON_ALLERGIES = [
  'Fragrance', 'Parabens', 'Sulfates', 'Phthalates',
  'Formaldehyde', 'Gluten', 'Dairy', 'Nuts', 'Soy',
  'Shellfish', 'Latex', 'Nickel', 'Lanolin', 'Propylene Glycol',
  'Coal Tar', 'Hydroquinone', 'Triclosan', 'Oxybenzone',
] as const;

export const API_ROUTES = {
  AUTH: {
    REGISTER: '/api/auth/register',
    LOGIN: '/api/auth/login',
    REFRESH: '/api/auth/refresh',
    LOGOUT: '/api/auth/logout',
    GOOGLE: '/api/auth/google',
    FORGOT_PASSWORD: '/api/auth/forgot-password',
  },
  PRODUCTS: {
    SEARCH: '/api/products/search',
    GET: (id: string) => `/api/products/${id}`,
    SCAN_BARCODE: '/api/products/scan/barcode',
    SCAN_OCR: '/api/products/scan/ocr',
    ANALYSIS: (id: string) => `/api/products/${id}/analysis`,
    COMPARE: '/api/products/compare',
  },
  USERS: {
    PROFILE: '/api/users/profile',
    REACTIONS: '/api/users/reactions',
    FAVORITES: '/api/users/favorites',
  },
  RECOMMENDATIONS: '/api/recommendations',
  COMMUNITY: {
    REVIEWS: (productId: string) => `/api/community/${productId}/reviews`,
  },
  ADMIN: {
    DASHBOARD: '/api/admin/dashboard',
    USERS: '/api/admin/users',
    PRODUCTS: '/api/admin/products',
    APPROVE: (id: string) => `/api/admin/products/${id}/approve`,
    INGREDIENTS: '/api/admin/ingredients',
    LOGS: '/api/admin/logs',
  },
} as const;
