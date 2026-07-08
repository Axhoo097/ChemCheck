import { z } from 'zod';

export const scanBarcodeSchema = z.object({
  barcode: z.string().min(4, 'Barcode must be at least 4 characters').max(50),
});

export const searchProductSchema = z.object({
  q: z.string().optional(),
  category: z.string().optional(),
  brand: z.string().optional(),
  page: z.string().optional().default('1'),
  limit: z.string().optional().default('20'),
  sortBy: z.enum(['name', 'brand', 'createdAt', 'riskScore']).optional().default('name'),
  order: z.enum(['asc', 'desc']).optional().default('asc'),
});

export const compareProductsSchema = z.object({
  productIds: z.array(z.string().uuid()).min(2, 'At least 2 products required').max(5, 'Maximum 5 products'),
});
