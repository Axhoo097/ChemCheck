import { Response, NextFunction } from 'express';
import { prisma } from '../../config/database';
import { AuthRequest } from '../../middleware/auth';
import { AppError } from '../../middleware/errorHandler';
import { logger } from '../../config/logger';

export class CommunityController {
  // GET /api/community/reviews?productId=...&page=1&limit=10
  getReviews = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const { productId, page = '1', limit = '10', sort = 'newest' } = req.query as Record<string, string>;
      const pageNum = parseInt(page);
      const limitNum = Math.min(parseInt(limit), 50);
      const skip = (pageNum - 1) * limitNum;

      const where: any = {};
      if (productId) where.productId = productId;

      const orderBy: any =
        sort === 'highest' ? { rating: 'desc' }
        : sort === 'lowest' ? { rating: 'asc' }
        : sort === 'helpful' ? { helpfulCount: 'desc' }
        : { createdAt: 'desc' };

      const [reviews, total] = await Promise.all([
        prisma.review.findMany({
          where,
          include: {
            user: { select: { id: true, name: true, avatarUrl: true } },
            product: { select: { id: true, name: true, brand: true, imageUrl: true } },
          },
          orderBy,
          skip,
          take: limitNum,
        }),
        prisma.review.count({ where }),
      ]);

      // Calculate average rating if querying by product
      let avgRating = null;
      if (productId) {
        const agg = await prisma.review.aggregate({
          where: { productId },
          _avg: { rating: true },
        });
        avgRating = agg._avg.rating;
      }

      res.json({
        success: true,
        data: reviews,
        avgRating,
        pagination: { page: pageNum, limit: limitNum, total, totalPages: Math.ceil(total / limitNum) },
      });
    } catch (error) {
      next(error);
    }
  };

  // POST /api/community/reviews
  createReview = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const { productId, rating, title, comment } = req.body;

      if (!productId || !rating || !comment) {
        throw new AppError('productId, rating, and comment are required', 400);
      }
      if (rating < 1 || rating > 5) {
        throw new AppError('Rating must be between 1 and 5', 400);
      }

      const product = await prisma.product.findUnique({ where: { id: productId } });
      if (!product) throw new AppError('Product not found', 404);

      const existing = await prisma.review.findUnique({
        where: { userId_productId: { userId: req.user!.id, productId } },
      });
      if (existing) throw new AppError('You have already reviewed this product', 409);

      const review = await prisma.review.create({
        data: {
          userId: req.user!.id,
          productId,
          rating: parseInt(rating),
          title: title || null,
          comment,
        },
        include: {
          user: { select: { id: true, name: true, avatarUrl: true } },
          product: { select: { id: true, name: true, brand: true } },
        },
      });

      logger.info(`Review created by ${req.user!.id} for product ${productId}`);
      res.status(201).json({ success: true, data: review });
    } catch (error) {
      next(error);
    }
  };

  // PUT /api/community/reviews/:id
  updateReview = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const { rating, title, comment } = req.body;

      const review = await prisma.review.findFirst({
        where: { id, userId: req.user!.id },
      });
      if (!review) throw new AppError('Review not found or not yours', 404);

      const updated = await prisma.review.update({
        where: { id },
        data: {
          ...(rating !== undefined && { rating: parseInt(rating) }),
          ...(title !== undefined && { title }),
          ...(comment !== undefined && { comment }),
        },
        include: {
          user: { select: { id: true, name: true, avatarUrl: true } },
        },
      });

      res.json({ success: true, data: updated });
    } catch (error) {
      next(error);
    }
  };

  // DELETE /api/community/reviews/:id
  deleteReview = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;

      const review = await prisma.review.findFirst({
        where: {
          id,
          OR: [{ userId: req.user!.id }, { user: { role: 'ADMIN' } }],
        },
      });
      if (!review) throw new AppError('Review not found or not authorized', 404);

      await prisma.review.delete({ where: { id } });
      res.json({ success: true, message: 'Review deleted' });
    } catch (error) {
      next(error);
    }
  };

  // POST /api/community/reviews/:id/helpful
  markHelpful = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;

      const review = await prisma.review.findUnique({ where: { id } });
      if (!review) throw new AppError('Review not found', 404);

      const updated = await prisma.review.update({
        where: { id },
        data: { helpfulCount: { increment: 1 } },
      });

      res.json({ success: true, data: { helpfulCount: updated.helpfulCount } });
    } catch (error) {
      next(error);
    }
  };

  // GET /api/community/feed - Recent community activity
  getFeed = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const { page = '1', limit = '15' } = req.query as Record<string, string>;
      const pageNum = parseInt(page);
      const limitNum = Math.min(parseInt(limit), 50);
      const skip = (pageNum - 1) * limitNum;

      const [reviews, total] = await Promise.all([
        prisma.review.findMany({
          include: {
            user: { select: { id: true, name: true, avatarUrl: true } },
            product: {
              select: {
                id: true, name: true, brand: true, imageUrl: true, category: true,
                toxicityReport: { select: { overallScore: true, riskLevel: true } },
              },
            },
          },
          orderBy: { createdAt: 'desc' },
          skip,
          take: limitNum,
        }),
        prisma.review.count(),
      ]);

      res.json({
        success: true,
        data: reviews,
        pagination: { page: pageNum, limit: limitNum, total, totalPages: Math.ceil(total / limitNum) },
      });
    } catch (error) {
      next(error);
    }
  };
}
