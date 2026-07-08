import { Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { prisma } from '../../config/database';
import { env } from '../../config/env';
import { logger } from '../../config/logger';
import { AuthRequest } from '../../middleware/auth';
import { AppError } from '../../middleware/errorHandler';

export class AuthController {
  // POST /api/auth/register
  register = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const { name, email, password } = req.body;

      // Check existing user
      const existing = await prisma.user.findUnique({ where: { email } });
      if (existing) {
        throw new AppError('Email already registered', 409);
      }

      // Hash password
      const passwordHash = await bcrypt.hash(password, 12);

      // Create user with profile
      const user = await prisma.user.create({
        data: {
          name,
          email,
          passwordHash,
          profile: {
            create: {
              allergies: JSON.stringify([]),
              dietaryPrefs: JSON.stringify([]),
              goals: JSON.stringify([]),
            },
          },
        },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          avatarUrl: true,
          createdAt: true,
        },
      });

      // Generate tokens
      const { accessToken, refreshToken } = this.generateTokens(user.id, user.email, user.role);

      logger.info(`User registered: ${user.email}`);

      res.status(201).json({
        success: true,
        data: {
          user,
          accessToken,
          refreshToken,
        },
      });
    } catch (error) {
      next(error);
    }
  };

  // POST /api/auth/login
  login = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const { email, password } = req.body;

      const user = await prisma.user.findUnique({
        where: { email },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          avatarUrl: true,
          passwordHash: true,
          isActive: true,
          createdAt: true,
        },
      });

      if (!user || !user.passwordHash) {
        throw new AppError('Invalid email or password', 401);
      }

      if (!user.isActive) {
        throw new AppError('Account has been deactivated', 403);
      }

      const isValidPassword = await bcrypt.compare(password, user.passwordHash);
      if (!isValidPassword) {
        throw new AppError('Invalid email or password', 401);
      }

      // Update last login
      await prisma.user.update({
        where: { id: user.id },
        data: { lastLoginAt: new Date() },
      });

      const { accessToken, refreshToken } = this.generateTokens(user.id, user.email, user.role);

      const { passwordHash: _, ...userWithoutPassword } = user;

      logger.info(`User logged in: ${user.email}`);

      res.json({
        success: true,
        data: {
          user: userWithoutPassword,
          accessToken,
          refreshToken,
        },
      });
    } catch (error) {
      next(error);
    }
  };

  // POST /api/auth/refresh
  refreshToken = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const { refreshToken } = req.body;

      const decoded = jwt.verify(refreshToken, env.JWT_REFRESH_SECRET) as {
        id: string;
        email: string;
        role: string;
      };

      const user = await prisma.user.findUnique({
        where: { id: decoded.id },
        select: { id: true, email: true, role: true, isActive: true },
      });

      if (!user || !user.isActive) {
        throw new AppError('Invalid refresh token', 401);
      }

      const tokens = this.generateTokens(user.id, user.email, user.role);

      res.json({
        success: true,
        data: tokens,
      });
    } catch (error) {
      if (error instanceof jwt.JsonWebTokenError) {
        return res.status(401).json({
          success: false,
          error: 'Invalid refresh token',
        });
      }
      next(error);
    }
  };

  // POST /api/auth/logout
  logout = async (_req: AuthRequest, res: Response) => {
    // In a production app with token blacklisting, we'd add the token to a blacklist here
    res.json({
      success: true,
      message: 'Logged out successfully',
    });
  };

  // POST /api/auth/forgot-password
  forgotPassword = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const { email } = req.body;

      const user = await prisma.user.findUnique({ where: { email } });

      // Always return success (security: don't reveal if email exists)
      if (user) {
        // In production: generate reset token, send email
        logger.info(`Password reset requested for: ${email}`);
      }

      res.json({
        success: true,
        message: 'If the email exists, a password reset link has been sent.',
      });
    } catch (error) {
      next(error);
    }
  };

  // GET /api/auth/google
  googleAuth = async (_req: AuthRequest, res: Response) => {
    const googleAuthUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${env.GOOGLE_CLIENT_ID}&redirect_uri=${encodeURIComponent(env.GOOGLE_CALLBACK_URL)}&response_type=code&scope=openid%20email%20profile&access_type=offline`;
    res.redirect(googleAuthUrl);
  };

  // GET /api/auth/google/callback
  googleCallback = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const { code } = req.query;

      if (!code) {
        throw new AppError('Authorization code not provided', 400);
      }

      // In production: exchange code for tokens via Google OAuth API
      // For now, return a placeholder response
      res.json({
        success: true,
        message: 'Google OAuth callback received. Configure GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET for full integration.',
        code,
      });
    } catch (error) {
      next(error);
    }
  };

  // GET /api/auth/me
  getMe = async (req: AuthRequest, res: Response, next: NextFunction) => {
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
        },
      });

      if (!user) {
        throw new AppError('User not found', 404);
      }

      res.json({
        success: true,
        data: user,
      });
    } catch (error) {
      next(error);
    }
  };

  // ---- Helpers ----
  private generateTokens(id: string, email: string, role: string) {
    const accessToken = jwt.sign({ id, email, role }, env.JWT_SECRET, {
      expiresIn: env.JWT_EXPIRES_IN,
    } as jwt.SignOptions);

    const refreshToken = jwt.sign({ id, email, role }, env.JWT_REFRESH_SECRET, {
      expiresIn: env.JWT_REFRESH_EXPIRES_IN,
    } as jwt.SignOptions);

    return { accessToken, refreshToken };
  }
}
