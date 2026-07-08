import { Response, NextFunction } from 'express';
import { AuthRequest } from './auth';

export const requireRole = (...roles: string[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required.',
      });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        error: 'Insufficient permissions. Required roles: ' + roles.join(', '),
      });
    }

    next();
  };
};

export const requireAdmin = requireRole('ADMIN');
export const requireModerator = requireRole('ADMIN', 'MODERATOR');
