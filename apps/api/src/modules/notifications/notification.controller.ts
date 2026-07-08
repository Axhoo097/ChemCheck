import { Response, NextFunction } from 'express';
import { prisma } from '../../config/database';
import { AuthRequest } from '../../middleware/auth';

export class NotificationController {
  // GET /api/notifications
  getNotifications = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const { page = '1', limit = '20', unreadOnly = 'false' } = req.query as Record<string, string>;
      const pageNum = parseInt(page);
      const limitNum = Math.min(parseInt(limit), 50);
      const skip = (pageNum - 1) * limitNum;

      const where: any = { userId: req.user!.id };
      if (unreadOnly === 'true') where.read = false;

      const [notifications, total, unreadCount] = await Promise.all([
        prisma.notification.findMany({
          where,
          orderBy: { createdAt: 'desc' },
          skip,
          take: limitNum,
        }),
        prisma.notification.count({ where }),
        prisma.notification.count({ where: { userId: req.user!.id, read: false } }),
      ]);

      res.json({
        success: true,
        data: notifications,
        unreadCount,
        pagination: { page: pageNum, limit: limitNum, total, totalPages: Math.ceil(total / limitNum) },
      });
    } catch (error) {
      next(error);
    }
  };

  // PATCH /api/notifications/:id/read
  markRead = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;

      await prisma.notification.updateMany({
        where: { id, userId: req.user!.id },
        data: { read: true },
      });

      res.json({ success: true, message: 'Marked as read' });
    } catch (error) {
      next(error);
    }
  };

  // PATCH /api/notifications/read-all
  markAllRead = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      await prisma.notification.updateMany({
        where: { userId: req.user!.id, read: false },
        data: { read: true },
      });

      res.json({ success: true, message: 'All notifications marked as read' });
    } catch (error) {
      next(error);
    }
  };
}
