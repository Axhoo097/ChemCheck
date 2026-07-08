import { Response, NextFunction } from 'express';
import { prisma } from '../../config/database';
import { AuthRequest } from '../../middleware/auth';
import { AppError } from '../../middleware/errorHandler';
import { logger } from '../../config/logger';
import { parseProduct, parseIngredient } from '../../utils/prismaHelpers';

export class AdminController {
  // GET /api/admin/dashboard - Platform stats
  getDashboard = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const [
        totalUsers,
        totalProducts,
        totalReviews,
        totalIngredients,
        totalReports,
        pendingProducts,
        recentUsers,
        recentProducts,
      ] = await Promise.all([
        prisma.user.count(),
        prisma.product.count(),
        prisma.review.count(),
        prisma.ingredient.count(),
        prisma.toxicityReport.count(),
        prisma.product.count({ where: { status: 'PENDING' } }),
        prisma.user.findMany({
          orderBy: { createdAt: 'desc' },
          take: 5,
          select: { id: true, name: true, email: true, role: true, createdAt: true },
        }),
        prisma.product.findMany({
          orderBy: { createdAt: 'desc' },
          take: 5,
          include: { toxicityReport: { select: { overallScore: true, riskLevel: true } } },
        }),
      ]);

      // Risk level distribution
      const riskDist = await prisma.toxicityReport.groupBy({
        by: ['riskLevel'],
        _count: { riskLevel: true },
      });

      // Category distribution
      const categoryDist = await prisma.product.groupBy({
        by: ['category'],
        _count: { category: true },
      });

      res.json({
        success: true,
        data: {
          stats: {
            totalUsers,
            totalProducts,
            totalReviews,
            totalIngredients,
            totalReports,
            pendingProducts,
          },
          riskDistribution: riskDist,
          categoryDistribution: categoryDist,
          recentUsers,
          recentProducts: recentProducts.map(parseProduct),
        },
      });
    } catch (error) {
      next(error);
    }
  };

  // GET /api/admin/products - All products with filters
  getProducts = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const { page = '1', limit = '20', status, category, q } = req.query as Record<string, string>;
      const pageNum = parseInt(page);
      const limitNum = Math.min(parseInt(limit), 100);
      const skip = (pageNum - 1) * limitNum;

      const where: any = {};
      if (status) where.status = status;
      if (category) where.category = category;
      if (q) {
        where.OR = [
          { name: { contains: q } },
          { brand: { contains: q } },
        ];
      }

      const [products, total] = await Promise.all([
        prisma.product.findMany({
          where,
          include: {
            toxicityReport: { select: { overallScore: true, riskLevel: true } },
            _count: { select: { reviews: true, ingredients: true } },
          },
          orderBy: { createdAt: 'desc' },
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

  // POST /api/admin/products - Create product manually
  createProduct = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const { name, brand, category, description, imageUrl, barcode, country } = req.body;

      const product = await prisma.product.create({
        data: {
          name,
          brand,
          category,
          description,
          imageUrl,
          barcode,
          country: country || 'India',
          source: 'MANUAL',
          status: 'APPROVED',
        },
      });

      await prisma.adminLog.create({
        data: {
          adminId: req.user!.id,
          action: 'CREATE_PRODUCT',
          entityType: 'product',
          entityId: product.id,
          metadata: JSON.stringify({ name, brand }),
        },
      });

      res.status(201).json({ success: true, data: parseProduct(product) });
    } catch (error) {
      next(error);
    }
  };

  // PATCH /api/admin/products/:id - Update product status or details
  updateProduct = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const updates = req.body;

      const product = await prisma.product.update({
        where: { id },
        data: updates,
      });

      await prisma.adminLog.create({
        data: {
          adminId: req.user!.id,
          action: 'UPDATE_PRODUCT',
          entityType: 'product',
          entityId: id,
          metadata: JSON.stringify(updates),
        },
      });

      logger.info(`Admin ${req.user!.id} updated product ${id}`);
      res.json({ success: true, data: parseProduct(product) });
    } catch (error) {
      next(error);
    }
  };

  // DELETE /api/admin/products/:id
  deleteProduct = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;

      await prisma.product.delete({ where: { id } });

      await prisma.adminLog.create({
        data: {
          adminId: req.user!.id,
          action: 'DELETE_PRODUCT',
          entityType: 'product',
          entityId: id,
        },
      });

      res.json({ success: true, message: 'Product deleted' });
    } catch (error) {
      next(error);
    }
  };

  // GET /api/admin/users - All users
  getUsers = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const { page = '1', limit = '20', q } = req.query as Record<string, string>;
      const pageNum = parseInt(page);
      const limitNum = Math.min(parseInt(limit), 100);
      const skip = (pageNum - 1) * limitNum;

      const where: any = {};
      if (q) {
        where.OR = [
          { name: { contains: q } },
          { email: { contains: q } },
        ];
      }

      const [users, total] = await Promise.all([
        prisma.user.findMany({
          where,
          select: {
            id: true, name: true, email: true, role: true,
            isActive: true, createdAt: true, lastLoginAt: true,
            _count: { select: { reviews: true, reactions: true } },
          },
          orderBy: { createdAt: 'desc' },
          skip,
          take: limitNum,
        }),
        prisma.user.count({ where }),
      ]);

      res.json({
        success: true,
        data: users,
        pagination: { page: pageNum, limit: limitNum, total, totalPages: Math.ceil(total / limitNum) },
      });
    } catch (error) {
      next(error);
    }
  };

  // PATCH /api/admin/users/:id - Toggle active/deactivate
  updateUser = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const { isActive, role } = req.body;

      const user = await prisma.user.update({
        where: { id },
        data: { ...(isActive !== undefined && { isActive }), ...(role && { role }) },
        select: { id: true, name: true, email: true, role: true, isActive: true },
      });

      res.json({ success: true, data: user });
    } catch (error) {
      next(error);
    }
  };

  // GET /api/admin/ingredients - Chemical database management
  getIngredients = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const { page = '1', limit = '30', q, minRisk, maxRisk } = req.query as Record<string, string>;
      const pageNum = parseInt(page);
      const limitNum = Math.min(parseInt(limit), 100);
      const skip = (pageNum - 1) * limitNum;

      const where: any = {};
      if (q) where.name = { contains: q };
      if (minRisk) where.riskScore = { ...where.riskScore, gte: parseInt(minRisk) };
      if (maxRisk) where.riskScore = { ...where.riskScore, lte: parseInt(maxRisk) };

      const [ingredients, total] = await Promise.all([
        prisma.ingredient.findMany({
          where,
          orderBy: { riskScore: 'desc' },
          skip,
          take: limitNum,
        }),
        prisma.ingredient.count({ where }),
      ]);

      res.json({
        success: true,
        data: ingredients.map(parseIngredient),
        pagination: { page: pageNum, limit: limitNum, total, totalPages: Math.ceil(total / limitNum) },
      });
    } catch (error) {
      next(error);
    }
  };

  // GET /api/admin/logs
  getLogs = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const { page = '1', limit = '30' } = req.query as Record<string, string>;
      const pageNum = parseInt(page);
      const limitNum = Math.min(parseInt(limit), 100);
      const skip = (pageNum - 1) * limitNum;

      const [logs, total] = await Promise.all([
        prisma.adminLog.findMany({
          include: { admin: { select: { id: true, name: true, email: true } } },
          orderBy: { createdAt: 'desc' },
          skip,
          take: limitNum,
        }),
        prisma.adminLog.count(),
      ]);

      const parsedLogs = logs.map(l => {
        const log = { ...l };
        if (typeof log.metadata === 'string') {
          try {
            log.metadata = JSON.parse(log.metadata);
          } catch {
            log.metadata = null;
          }
        }
        return log;
      });

      res.json({
        success: true,
        data: parsedLogs,
        pagination: { page: pageNum, limit: limitNum, total, totalPages: Math.ceil(total / limitNum) },
      });
    } catch (error) {
      next(error);
    }
  };
}
