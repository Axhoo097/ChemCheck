import { Response, NextFunction } from 'express';
import { prisma } from '../../config/database';
import { AuthRequest } from '../../middleware/auth';
import { AppError } from '../../middleware/errorHandler';
import { AiService } from '../../services/ai.service';
import { parseProduct, parseUserProfile } from '../../utils/prismaHelpers';

const aiService = new AiService();

export class RecommendationController {
  // GET /api/recommendations
  getRecommendations = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const userId = req.user!.id;
      const { category, limit = '10' } = req.query as Record<string, string>;
      const limitNum = Math.min(parseInt(limit), 30);

      // Get user profile to personalize recommendations
      const userProfileRaw = await prisma.userProfile.findUnique({
        where: { userId },
      });
      const userProfile = parseUserProfile(userProfileRaw);

      // Get user's reaction history to understand allergens
      const reactions = await prisma.userReaction.findMany({
        where: { userId },
        include: { ingredient: true },
        take: 50,
      });
      const allergenNames = reactions.map(r => r.ingredient.name);

      // Get existing recommendations
      const existing = await prisma.recommendation.findMany({
        where: { userId, ...(category && { category }) },
        include: {
          product: {
            include: {
              toxicityReport: { select: { overallScore: true, riskLevel: true, aiSummary: true } },
              _count: { select: { reviews: true } },
            },
          },
        },
        orderBy: { score: 'desc' },
        take: limitNum,
      });

      if (existing.length >= limitNum) {
        const parsedExisting = existing.map(e => {
          if (e.product) {
            return { ...e, product: parseProduct(e.product) };
          }
          return e;
        });
        return res.json({ success: true, data: parsedExisting });
      }

      // Generate new recommendations if we don't have enough
      const targetCategory = category?.toUpperCase() || null;
      const where: any = {
        status: 'APPROVED',
        NOT: {
          id: { in: existing.map(e => e.productId) },
        },
      };
      if (targetCategory) where.category = targetCategory;

      const products = await prisma.product.findMany({
        where,
        include: {
          ingredients: { include: { ingredient: true } },
          toxicityReport: true,
          _count: { select: { reviews: true } },
        },
        take: 50,
      });
      const parsedProducts = products.map(parseProduct);

      // Score each product
      const scored = parsedProducts
        .filter(p => p.toxicityReport)
        .map(p => {
          let score = 100 - (p.toxicityReport?.overallScore ?? 50);
          
          // Boost products without user's allergens
          const productIngredients = p.ingredients.map((pi: any) => pi.ingredient.name.toLowerCase());
          const hasAllergens = allergenNames.some(a => productIngredients.includes(a.toLowerCase()));
          if (hasAllergens) score -= 30;

          // Boost based on skin type compatibility
          if (userProfile?.skinType === 'SENSITIVE') {
            const hasFrangrance = productIngredients.some((i: string) => i.includes('fragrance') || i.includes('parfum'));
            if (!hasFrangrance) score += 10;
          }

          return { product: p, score: Math.max(0, Math.min(100, score)) };
        })
        .sort((a, b) => b.score - a.score)
        .slice(0, limitNum - existing.length);

      // Save new recommendations
      const newRecs = await Promise.all(
        scored.map(({ product, score }) =>
          prisma.recommendation.upsert({
            where: { id: `placeholder-${userId}-${product.id}` },
            update: { score, category: product.category },
            create: {
              userId,
              productId: product.id,
              reason: score >= 70
                ? `Low toxicity score (${product.toxicityReport?.overallScore}/100) and safe ingredient profile`
                : `Moderate safety profile suitable for your preferences`,
              score,
              category: product.category,
            },
          }).catch(() => null) // Ignore upsert errors for non-existent placeholder IDs
        )
      );

      // Re-fetch updated recommendations
      const allRecs = await prisma.recommendation.findMany({
        where: { userId, ...(category && { category }) },
        include: {
          product: {
            include: {
              toxicityReport: { select: { overallScore: true, riskLevel: true, aiSummary: true } },
              _count: { select: { reviews: true } },
            },
          },
        },
        orderBy: { score: 'desc' },
        take: limitNum,
      });

      const parsedRecs = allRecs.map(r => {
        if (r.product) {
          return { ...r, product: parseProduct(r.product) };
        }
        return r;
      });

      res.json({ success: true, data: parsedRecs });
    } catch (error) {
      next(error);
    }
  };

  // POST /api/recommendations/generate
  generateRecommendations = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const userId = req.user!.id;
      const { productId } = req.body;

      if (!productId) throw new AppError('productId is required', 400);

      // Get the reference product
      const productRaw = await prisma.product.findUnique({
        where: { id: productId },
        include: {
          ingredients: { include: { ingredient: true } },
          toxicityReport: true,
        },
      });
      if (!productRaw) throw new AppError('Product not found', 404);
      const product = parseProduct(productRaw);

      const harmfulIngredients = product.toxicityReport?.harmfulIngredients ?? [];
      const userProfileRaw = await prisma.userProfile.findUnique({ where: { userId } });
      const userProfile = parseUserProfile(userProfileRaw);

      // Call AI service for recommendations
      const aiRecs = await aiService.getRecommendations({
        harmfulIngredients,
        category: product.category.toLowerCase(),
        skinType: userProfile?.skinType ?? undefined,
        hairType: userProfile?.hairType ?? undefined,
        allergies: userProfile?.allergies ?? [],
      });

      res.json({ success: true, data: aiRecs });
    } catch (error) {
      next(error);
    }
  };
}
