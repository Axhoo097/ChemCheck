import { Response, NextFunction } from 'express';
import { prisma } from '../../config/database';
import { AuthRequest } from '../../middleware/auth';
import { AppError } from '../../middleware/errorHandler';
import { parseProduct, parseIngredient } from '../../utils/prismaHelpers';

export class AnalysisController {
  // GET /api/analysis/history
  getHistory = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const { page = '1', limit = '20', category } = req.query as Record<string, string>;
      const pageNum = parseInt(page);
      const limitNum = Math.min(parseInt(limit), 50);
      const skip = (pageNum - 1) * limitNum;

      const where: any = { toxicityReport: { isNot: null } };
      if (category) where.category = category;

      const [products, total] = await Promise.all([
        prisma.product.findMany({
          where,
          include: {
            toxicityReport: { select: { overallScore: true, riskLevel: true, aiSummary: true, createdAt: true } },
            _count: { select: { reviews: true } },
          },
          orderBy: { updatedAt: 'desc' },
          skip,
          take: limitNum,
        }),
        prisma.product.count({ where }),
      ]);

      res.json({
        success: true,
        data: products.map(parseProduct),
        pagination: { page: pageNum, limit: limitNum, total, totalPages: Math.ceil(total / limitNum) },
      });
    } catch (error) {
      next(error);
    }
  };

  // GET /api/analysis/report/:productId
  getReport = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const { productId } = req.params;

      const product = await prisma.product.findUnique({
        where: { id: productId },
        include: {
          ingredients: {
            include: { ingredient: true },
            orderBy: { position: 'asc' },
          },
          toxicityReport: true,
          reviews: {
            include: { user: { select: { id: true, name: true, avatarUrl: true } } },
            orderBy: { helpfulCount: 'desc' },
            take: 5,
          },
          _count: { select: { reviews: true, favorites: true } },
        },
      });

      if (!product) throw new AppError('Product not found', 404);

      res.json({ success: true, data: parseProduct(product) });
    } catch (error) {
      next(error);
    }
  };

  // POST /api/analysis/analyze-text
  analyzeText = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const { text, productName } = req.body;
      if (!text) throw new AppError('Text is required', 400);

      // Import dynamically to avoid circular deps
      const { AiService } = await import('../../services/ai.service');
      const aiService = new AiService();

      const ingredientNames = await aiService.parseIngredients(text);
      if (ingredientNames.length === 0) {
        throw new AppError('No ingredients could be extracted from the text', 400);
      }

      const prediction = await aiService.predictToxicity(ingredientNames);

      // Create a temporary product entry
      const product = await prisma.product.create({
        data: {
          name: productName || 'Manual Analysis',
          brand: 'Manual Entry',
          category: 'PERSONAL_CARE',
          source: 'MANUAL',
          status: 'APPROVED',
          country: 'India',
        },
      });

      // Process ingredients
      for (let i = 0; i < ingredientNames.length; i++) {
        const name = ingredientNames[i].trim();
        if (!name) continue;

        let ingredient = await prisma.ingredient.findFirst({
          where: { name: { equals: name } },
        });

        if (!ingredient) {
          const risk = await aiService.getIngredientRisk(name);
          ingredient = await prisma.ingredient.create({
            data: {
              name,
              riskScore: risk,
              category: 'Uncategorized',
              healthEffects: JSON.stringify([]),
              alternatives: JSON.stringify([]),
              sources: JSON.stringify([]),
              aliases: JSON.stringify([name.toLowerCase()]),
            },
          });
        }

        await prisma.productIngredient.upsert({
          where: { productId_ingredientId: { productId: product.id, ingredientId: ingredient.id } },
          update: { position: i },
          create: { productId: product.id, ingredientId: ingredient.id, position: i },
        });
      }

      // Save toxicity report
      await prisma.toxicityReport.create({
        data: {
          productId: product.id,
          overallScore: prediction.overallScore,
          riskLevel: prediction.riskLevel as any,
          aiSummary: prediction.summary,
          harmfulIngredients: JSON.stringify(prediction.harmfulIngredients),
          safeIngredients: JSON.stringify(prediction.safeIngredients),
          warnings: JSON.stringify(prediction.warnings),
        },
      });

      const fullProduct = await prisma.product.findUnique({
        where: { id: product.id },
        include: {
          ingredients: { include: { ingredient: true }, orderBy: { position: 'asc' } },
          toxicityReport: true,
        },
      });

      res.status(201).json({ success: true, data: parseProduct(fullProduct), ingredientCount: ingredientNames.length });
    } catch (error) {
      next(error);
    }
  };

  // GET /api/analysis/ingredient/:name
  getIngredientInfo = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const { name } = req.params;

      let ingredient = await prisma.ingredient.findFirst({
        where: { name: { contains: name } },
      });

      if (!ingredient) {
        const { AiService } = await import('../../services/ai.service');
        const aiService = new AiService();
        const risk = await aiService.getIngredientRisk(name);
        return res.json({
          success: true,
          data: {
            name,
            riskScore: risk,
            category: 'Unknown',
            description: 'Not found in database',
            healthEffects: [],
            alternatives: [],
            isNatural: false,
            isBanned: false,
          },
        });
      }

      res.json({ success: true, data: parseIngredient(ingredient) });
    } catch (error) {
      next(error);
    }
  };
}
