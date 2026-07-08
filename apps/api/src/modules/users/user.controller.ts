import { Response, NextFunction } from 'express';
import { prisma } from '../../config/database';
import { logger } from '../../config/logger';
import { AuthRequest } from '../../middleware/auth';
import { AppError } from '../../middleware/errorHandler';

export class UserController {
  // GET /api/users/profile
  getProfile = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const user = await prisma.user.findUnique({
        where: { id: req.user!.id },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          avatarUrl: true,
          createdAt: true,
          updatedAt: true,
          profile: true,
          _count: {
            select: {
              reviews: true,
              reactions: true,
              favorites: true,
            },
          },
        },
      });

      if (!user) throw new AppError('User not found', 404);
      if (user.profile) {
        try {
          user.profile.allergies = JSON.parse(user.profile.allergies as string) as any;
        } catch { user.profile.allergies = [] as any; }
        try {
          user.profile.dietaryPrefs = JSON.parse(user.profile.dietaryPrefs as string) as any;
        } catch { user.profile.dietaryPrefs = [] as any; }
        try {
          user.profile.goals = JSON.parse(user.profile.goals as string) as any;
        } catch { user.profile.goals = [] as any; }
      }
      res.json({ success: true, data: user });
    } catch (error) {
      next(error);
    }
  };

  // PUT /api/users/profile
  updateProfile = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const { name, skinType, hairType, allergies, dietaryPrefs, goals, age, gender, avatarUrl } = req.body;

      const updates: any = {};
      if (name) updates.name = name;
      if (avatarUrl) updates.avatarUrl = avatarUrl;

      const profileUpdates: any = {};
      if (skinType !== undefined) profileUpdates.skinType = skinType;
      if (hairType !== undefined) profileUpdates.hairType = hairType;
      if (allergies !== undefined) profileUpdates.allergies = JSON.stringify(allergies);
      if (dietaryPrefs !== undefined) profileUpdates.dietaryPrefs = JSON.stringify(dietaryPrefs);
      if (goals !== undefined) profileUpdates.goals = JSON.stringify(goals);
      if (age !== undefined) profileUpdates.age = age;
      if (gender !== undefined) profileUpdates.gender = gender;

      // Update user and profile in a transaction
      const updatedUser = await prisma.$transaction(async (tx) => {
        const user = await tx.user.update({
          where: { id: req.user!.id },
          data: updates,
          select: { id: true, name: true, email: true, role: true, avatarUrl: true },
        });

        if (Object.keys(profileUpdates).length > 0) {
          await tx.userProfile.upsert({
            where: { userId: req.user!.id },
            update: profileUpdates,
            create: {
              userId: req.user!.id,
              allergies: JSON.stringify([]),
              dietaryPrefs: JSON.stringify([]),
              goals: JSON.stringify([]),
              ...profileUpdates,
            },
          });
        }

        const result = await tx.user.findUnique({
          where: { id: req.user!.id },
          select: {
            id: true, name: true, email: true, role: true,
            avatarUrl: true, createdAt: true, updatedAt: true, profile: true,
          },
        });
        if (result && result.profile) {
          try {
            result.profile.allergies = JSON.parse(result.profile.allergies as string) as any;
          } catch { result.profile.allergies = [] as any; }
          try {
            result.profile.dietaryPrefs = JSON.parse(result.profile.dietaryPrefs as string) as any;
          } catch { result.profile.dietaryPrefs = [] as any; }
          try {
            result.profile.goals = JSON.parse(result.profile.goals as string) as any;
          } catch { result.profile.goals = [] as any; }
        }
        return result;
      });

      logger.info(`Profile updated for user ${req.user!.id}`);
      res.json({ success: true, data: updatedUser });
    } catch (error) {
      next(error);
    }
  };

  // GET /api/users/reactions
  getReactions = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const { page = '1', limit = '20' } = req.query as Record<string, string>;
      const pageNum = parseInt(page);
      const limitNum = Math.min(parseInt(limit), 50);
      const skip = (pageNum - 1) * limitNum;

      const [reactions, total] = await Promise.all([
        prisma.userReaction.findMany({
          where: { userId: req.user!.id },
          include: { ingredient: { select: { name: true, category: true, riskScore: true } } },
          orderBy: { date: 'desc' },
          skip,
          take: limitNum,
        }),
        prisma.userReaction.count({ where: { userId: req.user!.id } }),
      ]);

      res.json({
        success: true,
        data: reactions,
        pagination: { page: pageNum, limit: limitNum, total, totalPages: Math.ceil(total / limitNum) },
      });
    } catch (error) {
      next(error);
    }
  };

  // POST /api/users/reactions
  logReaction = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const { ingredientName, reactionType, severity, notes, productUsed, date } = req.body;

      // Find or create ingredient
      const ingredients = await prisma.ingredient.findMany({
        where: { name: { contains: ingredientName } },
      });
      let ingredient = ingredients.find(
        (i) => i.name.toLowerCase() === ingredientName.toLowerCase()
      );

      if (!ingredient) {
        ingredient = await prisma.ingredient.create({
          data: {
            name: ingredientName,
            riskScore: 30,
            category: 'Uncategorized',
            healthEffects: JSON.stringify([]),
            alternatives: JSON.stringify([]),
            sources: JSON.stringify([]),
            aliases: JSON.stringify([ingredientName.toLowerCase()]),
          },
        });
      }

      const reaction = await prisma.userReaction.create({
        data: {
          userId: req.user!.id,
          ingredientId: ingredient.id,
          reactionType,
          severity: severity || 'MILD',
          notes: notes || '',
          productUsed: productUsed || '',
          date: date ? new Date(date) : new Date(),
        },
        include: { ingredient: { select: { name: true, category: true, riskScore: true } } },
      });

      res.status(201).json({ success: true, data: reaction });
    } catch (error) {
      next(error);
    }
  };

  // DELETE /api/users/reactions/:id
  deleteReaction = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;

      const reaction = await prisma.userReaction.findFirst({
        where: { id, userId: req.user!.id },
      });

      if (!reaction) throw new AppError('Reaction not found', 404);

      await prisma.userReaction.delete({ where: { id } });
      res.json({ success: true, message: 'Reaction deleted' });
    } catch (error) {
      next(error);
    }
  };

  // GET /api/users/favorites
  getFavorites = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const favorites = await prisma.userFavorite.findMany({
        where: { userId: req.user!.id },
        include: {
          product: {
            include: { toxicityReport: { select: { overallScore: true, riskLevel: true } } },
          },
        },
        orderBy: { createdAt: 'desc' },
      });

      res.json({ success: true, data: favorites });
    } catch (error) {
      next(error);
    }
  };

  // POST /api/users/favorites/:productId
  addFavorite = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const { productId } = req.params;

      const product = await prisma.product.findUnique({ where: { id: productId } });
      if (!product) throw new AppError('Product not found', 404);

      const favorite = await prisma.userFavorite.upsert({
        where: { userId_productId: { userId: req.user!.id, productId } },
        update: {},
        create: { userId: req.user!.id, productId },
      });

      res.json({ success: true, data: favorite });
    } catch (error) {
      next(error);
    }
  };

  // DELETE /api/users/favorites/:productId
  removeFavorite = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const { productId } = req.params;

      await prisma.userFavorite.deleteMany({
        where: { userId: req.user!.id, productId },
      });

      res.json({ success: true, message: 'Removed from favorites' });
    } catch (error) {
      next(error);
    }
  };

  // GET /api/users/stats
  getStats = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const userId = req.user!.id;

      const [reactionCount, favCount, reviewCount, recentReactions] = await Promise.all([
        prisma.userReaction.count({ where: { userId } }),
        prisma.userFavorite.count({ where: { userId } }),
        prisma.review.count({ where: { userId } }),
        prisma.userReaction.findMany({
          where: { userId },
          include: { ingredient: true },
          orderBy: { date: 'desc' },
          take: 5,
        }),
      ]);

      res.json({
        success: true,
        data: {
          reactions: reactionCount,
          favorites: favCount,
          reviews: reviewCount,
          recentReactions,
        },
      });
    } catch (error) {
      next(error);
    }
  };
}
