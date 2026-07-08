import { api } from './axios';

// --- AUTH & PROFILE ---
export async function getProfile() {
  const res = await api.get('/users/profile');
  return res.data;
}

export async function updateProfile(data: {
  name?: string;
  skinType?: string;
  hairType?: string;
  allergies?: string[];
  dietaryPrefs?: string[];
  goals?: string[];
  age?: number;
  gender?: string;
  avatarUrl?: string;
}) {
  const res = await api.put('/users/profile', data);
  return res.data;
}

export async function getUserStats() {
  const res = await api.get('/users/stats');
  return res.data;
}

// --- PRODUCTS ---
export async function searchProducts(params: {
  q?: string;
  category?: string;
  brand?: string;
  page?: number;
  limit?: number;
}) {
  const res = await api.get('/products/search', { params });
  return res.data;
}

export async function getProduct(id: string) {
  const res = await api.get(`/products/${id}`);
  return res.data;
}

export async function getProductAnalysis(id: string) {
  const res = await api.get(`/products/${id}/analysis`);
  return res.data;
}

export async function scanBarcode(barcode: string) {
  const res = await api.post('/products/scan/barcode', { barcode });
  return res.data;
}

export async function scanOCR(formData: FormData) {
  const res = await api.post('/products/scan/ocr', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return res.data;
}

export async function compareProducts(productIds: string[]) {
  const res = await api.post('/products/compare', { productIds });
  return res.data;
}

// --- ANALYSIS HISTORY & TEXT ---
export async function getAnalysisHistory(params?: { category?: string; page?: number; limit?: number }) {
  const res = await api.get('/analysis/history', { params });
  return res.data;
}

export async function getAnalysisReport(productId: string) {
  const res = await api.get(`/analysis/report/${productId}`);
  return res.data;
}

export async function analyzeText(text: string, productName?: string) {
  const res = await api.post('/analysis/analyze-text', { text, productName });
  return res.data;
}

export async function getIngredientInfo(name: string) {
  const res = await api.get(`/analysis/ingredient/${encodeURIComponent(name)}`);
  return res.data;
}

// --- FAVORITES ---
export async function getFavorites() {
  const res = await api.get('/users/favorites');
  return res.data;
}

export async function addFavorite(productId: string) {
  const res = await api.post(`/users/favorites/${productId}`);
  return res.data;
}

export async function removeFavorite(productId: string) {
  const res = await api.delete(`/users/favorites/${productId}`);
  return res.data;
}

// --- REACTIONS ---
export async function getReactions() {
  const res = await api.get('/users/reactions');
  return res.data;
}

export async function logReaction(data: {
  ingredientName: string;
  reactionType: string;
  severity: string;
  notes?: string;
  productUsed?: string;
  date?: string;
}) {
  const res = await api.post('/users/reactions', data);
  return res.data;
}

export async function deleteReaction(id: string) {
  const res = await api.delete(`/users/reactions/${id}`);
  return res.data;
}

// --- COMMUNITY ---
export async function getReviews(productId: string) {
  const res = await api.get(`/community/product/${productId}`);
  return res.data;
}

export async function getCommunityFeed(params?: { page?: number; limit?: number }) {
  const res = await api.get('/community/feed', { params });
  return res.data;
}

export async function createReview(productId: string, data: { rating: number; title?: string; comment: string }) {
  const res = await api.post(`/community/product/${productId}`, data);
  return res.data;
}

export async function upvoteReview(reviewId: string) {
  const res = await api.post(`/community/review/${reviewId}/helpful`);
  return res.data;
}

// --- RECOMMENDATIONS ---
export async function getPersonalizedRecommendations(params?: { category?: string; limit?: number }) {
  const res = await api.get('/recommendations', { params });
  return res.data;
}

export async function generateProductRecommendations(productId: string) {
  const res = await api.post('/recommendations/generate', { productId });
  return res.data;
}

// --- ADMIN ---
export async function getAdminDashboard() {
  const res = await api.get('/admin/dashboard');
  return res.data;
}

export async function getAdminProducts(params?: { page?: number; limit?: number; status?: string; category?: string; q?: string }) {
  const res = await api.get('/admin/products', { params });
  return res.data;
}

export async function createAdminProduct(data: {
  name: string;
  brand: string;
  category: string;
  description?: string;
  imageUrl?: string;
  barcode?: string;
  country?: string;
}) {
  const res = await api.post('/admin/products', data);
  return res.data;
}

export async function updateAdminProduct(productId: string, data: any) {
  const res = await api.patch(`/admin/products/${productId}`, data);
  return res.data;
}

export async function deleteAdminProduct(productId: string) {
  const res = await api.delete(`/admin/products/${productId}`);
  return res.data;
}

export async function getAdminUsers(params?: { page?: number; limit?: number; q?: string }) {
  const res = await api.get('/admin/users', { params });
  return res.data;
}

export async function updateAdminUser(userId: string, data: { isActive?: boolean; role?: string }) {
  const res = await api.patch(`/admin/users/${userId}`, data);
  return res.data;
}

export async function getAdminIngredients(params?: { page?: number; limit?: number; q?: string; minRisk?: number; maxRisk?: number }) {
  const res = await api.get('/admin/ingredients', { params });
  return res.data;
}

export async function getAdminLogs(params?: { page?: number; limit?: number }) {
  const res = await api.get('/admin/logs', { params });
  return res.data;
}
