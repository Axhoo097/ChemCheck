import { Response, NextFunction } from 'express';
import { prisma } from '../../config/database';
import { logger } from '../../config/logger';
import { AuthRequest } from '../../middleware/auth';
import { AppError } from '../../middleware/errorHandler';
import { OpenFoodFactsService } from '../../services/openFoodFacts.service';
import { OcrService } from '../../services/ocr.service';
import { AiService } from '../../services/ai.service';
import { parseProduct, parseToxicityReport } from '../../utils/prismaHelpers';

const offService = new OpenFoodFactsService();
const ocrService = new OcrService();
const aiService = new AiService();

export class ProductController {
  // GET /api/products/search
  searchProducts = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const { q, category, brand, page = '1', limit = '20', sortBy = 'name', order = 'asc' } = req.query as Record<string, string>;

      const pageNum = parseInt(page);
      const limitNum = Math.min(parseInt(limit), 50);
      const skip = (pageNum - 1) * limitNum;

      const where: any = { status: 'APPROVED' };
      if (q) {
        where.OR = [
          { name: { contains: q } },
          { brand: { contains: q } },
          { description: { contains: q } },
        ];
      }
      if (category) where.category = category;
      if (brand) where.brand = { contains: brand };

      const [products, total] = await Promise.all([
        prisma.product.findMany({
          where,
          skip,
          take: limitNum,
          orderBy: { [sortBy]: order },
          include: {
            toxicityReport: { select: { overallScore: true, riskLevel: true } },
            _count: { select: { reviews: true } },
          },
        }),
        prisma.product.count({ where }),
      ]);

      res.json({
        success: true,
        data: products.map(parseProduct),
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          totalPages: Math.ceil(total / limitNum),
        },
      });
    } catch (error) {
      next(error);
    }
  };

  // GET /api/products/:id
  getProduct = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;

      const product = await prisma.product.findUnique({
        where: { id },
        include: {
          ingredients: {
            include: { ingredient: true },
            orderBy: { position: 'asc' },
          },
          toxicityReport: true,
          reviews: {
            include: {
              user: { select: { id: true, name: true, avatarUrl: true } },
            },
            orderBy: { createdAt: 'desc' },
            take: 10,
          },
          _count: { select: { reviews: true, favorites: true } },
        },
      });

      if (!product) {
        throw new AppError('Product not found', 404);
      }

      res.json({ success: true, data: parseProduct(product) });
    } catch (error) {
      next(error);
    }
  };

  // POST /api/products/scan/barcode
  scanBarcode = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const { barcode } = req.body;

      // 1. Check local database first
      let product = await prisma.product.findUnique({
        where: { barcode },
        include: {
          ingredients: { include: { ingredient: true }, orderBy: { position: 'asc' } },
          toxicityReport: true,
        },
      });

      if (product) {
        return res.json({ success: true, data: parseProduct(product), source: 'local' });
      }

      // 2. Fetch from OpenFoodFacts
      const offData = await offService.getProductByBarcode(barcode);

      if (!offData) {
        throw new AppError('Product not found. Try OCR scanning or manual entry.', 404);
      }

      // 3. Store product in our DB
      product = await prisma.product.create({
        data: {
          barcode,
          name: offData.name,
          brand: offData.brand,
          category: offData.category as any || 'GROCERY',
          description: offData.description,
          imageUrl: offData.imageUrl,
          source: 'BARCODE_SCAN',
          status: 'APPROVED',
          country: offData.country || 'India',
          nutriScore: offData.nutriScore,
          novaGroup: offData.novaGroup,
        },
        include: {
          ingredients: { include: { ingredient: true } },
          toxicityReport: true,
        },
      });

      // 4. Process ingredients through AI
      if (offData.ingredientsList && offData.ingredientsList.length > 0) {
        await this.processIngredients(product.id, offData.ingredientsList);
      }

      // 5. Generate toxicity report
      const updatedProduct = await prisma.product.findUnique({
        where: { id: product.id },
        include: {
          ingredients: { include: { ingredient: true }, orderBy: { position: 'asc' } },
          toxicityReport: true,
        },
      });

      res.status(201).json({ success: true, data: parseProduct(updatedProduct), source: 'openfoodfacts' });
    } catch (error) {
      next(error);
    }
  };

  // POST /api/products/scan/ocr
  scanOCR = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.file) {
        throw new AppError('No image file provided', 400);
      }

      // 1. Extract text from image
      const extractedText = await ocrService.extractText(req.file.path);

      // 2. Parse ingredients from extracted text using AI
      const ingredientNames = await aiService.parseIngredients(extractedText);

      if (ingredientNames.length === 0) {
        throw new AppError('No ingredients could be extracted from the image', 400);
      }

      // 3. Create product with extracted ingredients
      const product = await prisma.product.create({
        data: {
          name: req.body.productName || 'Scanned Product',
          brand: req.body.brand || 'Unknown',
          category: req.body.category || 'GROCERY',
          source: 'OCR_SCAN',
          status: 'PENDING',
          country: 'India',
          imageUrl: `/uploads/${req.file.filename}`,
        },
      });

      // 4. Process ingredients
      await this.processIngredients(product.id, ingredientNames);

      const updatedProduct = await prisma.product.findUnique({
        where: { id: product.id },
        include: {
          ingredients: { include: { ingredient: true }, orderBy: { position: 'asc' } },
          toxicityReport: true,
        },
      });

      res.status(201).json({
        success: true,
        data: parseProduct(updatedProduct),
        extractedText,
        ingredientCount: ingredientNames.length,
      });
    } catch (error) {
      next(error);
    }
  };

  // GET /api/products/:id/analysis
  getAnalysis = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;

      let report = await prisma.toxicityReport.findUnique({
        where: { productId: id },
      });

      if (!report) {
        // Generate on-the-fly
        const product = await prisma.product.findUnique({
          where: { id },
          include: { ingredients: { include: { ingredient: true } } },
        });

        if (!product) {
          throw new AppError('Product not found', 404);
        }

        const ingredientNames = product.ingredients.map((pi: any) => pi.ingredient.name);
        if (ingredientNames.length > 0) {
          const prediction = await aiService.predictToxicity(ingredientNames);

          report = await prisma.toxicityReport.create({
            data: {
              productId: id,
              overallScore: prediction.overallScore,
              riskLevel: prediction.riskLevel as any,
              aiSummary: prediction.summary,
              harmfulIngredients: JSON.stringify(prediction.warnings),
              safeIngredients: JSON.stringify(ingredientNames.filter(
                (n: any) => !prediction.warnings.includes(n)
              )),
              warnings: JSON.stringify(prediction.warnings),
            },
          });
        }
      }

      const product = await prisma.product.findUnique({
        where: { id },
        include: {
          ingredients: { include: { ingredient: true }, orderBy: { position: 'asc' } },
          toxicityReport: true,
        },
      });

      res.json({ success: true, data: { product: parseProduct(product), report: parseToxicityReport(report) } });
    } catch (error) {
      next(error);
    }
  };

  // POST /api/products/compare
  compareProducts = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const { productIds } = req.body;

      const products = await prisma.product.findMany({
        where: { id: { in: productIds } },
        include: {
          ingredients: {
            include: { ingredient: true },
            orderBy: { position: 'asc' },
          },
          toxicityReport: true,
          _count: { select: { reviews: true } },
        },
      });

      if (products.length < 2) {
        throw new AppError('At least 2 valid products are required for comparison', 400);
      }

      // Build comparison data
      const parsedProducts = products.map(parseProduct);
      const comparison = {
        products: parsedProducts,
        commonIngredients: this.findCommonIngredients(parsedProducts),
        uniqueIngredients: this.findUniqueIngredients(parsedProducts),
        safetyComparison: parsedProducts.map((p: any) => ({
          id: p.id,
          name: p.name,
          brand: p.brand,
          overallScore: p.toxicityReport?.overallScore ?? null,
          riskLevel: p.toxicityReport?.riskLevel ?? null,
          reviewCount: p._count.reviews,
        })),
        recommendation: this.pickBestProduct(parsedProducts),
      };

      // Save comparison if user is logged in
      if (req.user && products.length === 2) {
        await prisma.productComparison.create({
          data: {
            userId: req.user.id,
            product1Id: products[0].id,
            product2Id: products[1].id,
          },
        });
      }

      res.json({ success: true, data: comparison });
    } catch (error) {
      next(error);
    }
  };

  // ---- Private helpers ----
  private async processIngredients(productId: string, ingredientNames: string[]) {
    for (let i = 0; i < ingredientNames.length; i++) {
      const name = ingredientNames[i].trim();
      if (!name) continue;

      let ingredient = await prisma.ingredient.findFirst({
        where: {
          OR: [
            { name: { equals: name } },
            { inciName: { equals: name } },
            { aliases: { contains: `"${name.toLowerCase()}"` } },
          ],
        },
      });

      if (!ingredient) {
        // Create new ingredient entry with AI-estimated risk score
        const riskScore = await aiService.getIngredientRisk(name);
        ingredient = await prisma.ingredient.create({
          data: {
            name: name,
            riskScore: riskScore,
            category: 'Uncategorized',
            healthEffects: JSON.stringify([]),
            alternatives: JSON.stringify([]),
            sources: JSON.stringify([]),
            aliases: JSON.stringify([name.toLowerCase()]),
          },
        });
      }

      await prisma.productIngredient.upsert({
        where: {
          productId_ingredientId: {
            productId,
            ingredientId: ingredient.id,
          },
        },
        update: { position: i },
        create: {
          productId,
          ingredientId: ingredient.id,
          position: i,
        },
      });
    }

    // Generate toxicity report
    try {
      const productIngredients = await prisma.productIngredient.findMany({
        where: { productId },
        include: { ingredient: true },
      });

      const names = productIngredients.map((pi: any) => pi.ingredient.name);
      const prediction = await aiService.predictToxicity(names);

      await prisma.toxicityReport.upsert({
        where: { productId },
        update: {
          overallScore: prediction.overallScore,
          riskLevel: prediction.riskLevel as any,
          aiSummary: prediction.summary,
          harmfulIngredients: JSON.stringify(prediction.warnings),
          safeIngredients: JSON.stringify(names.filter((n: any) => !prediction.warnings.includes(n))),
          warnings: JSON.stringify(prediction.warnings),
        },
        create: {
          productId,
          overallScore: prediction.overallScore,
          riskLevel: prediction.riskLevel as any,
          aiSummary: prediction.summary,
          harmfulIngredients: JSON.stringify(prediction.warnings),
          safeIngredients: JSON.stringify(names.filter((n: any) => !prediction.warnings.includes(n))),
          warnings: JSON.stringify(prediction.warnings),
        },
      });
    } catch (err) {
      logger.warn('Failed to generate toxicity report', err);
    }
  }

  private findCommonIngredients(products: any[]) {
    if (products.length < 2) return [];
    const sets = products.map(
      (p) => new Set(p.ingredients.map((pi: any) => pi.ingredient.name.toLowerCase()))
    );
    const common = [...sets[0]].filter((name) => sets.every((s) => s.has(name)));
    return common;
  }

  private findUniqueIngredients(products: any[]) {
    return products.map((p) => {
      const otherSets = products
        .filter((other) => other.id !== p.id)
        .map((other) => new Set(other.ingredients.map((pi: any) => pi.ingredient.name.toLowerCase())));

      const unique = p.ingredients
        .map((pi: any) => pi.ingredient.name)
        .filter((name: string) => !otherSets.some((s) => s.has(name.toLowerCase())));

      return { productId: p.id, productName: p.name, uniqueIngredients: unique };
    });
  }

  private pickBestProduct(products: any[]) {
    const scored = products
      .filter((p) => p.toxicityReport)
      .sort((a, b) => (a.toxicityReport.overallScore || 100) - (b.toxicityReport.overallScore || 100));

    if (scored.length === 0) return null;
    return {
      bestProduct: scored[0].name,
      bestProductId: scored[0].id,
      reason: `${scored[0].name} has the lowest toxicity score (${scored[0].toxicityReport.overallScore}/100)`,
    };
  }
}
