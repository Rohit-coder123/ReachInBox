import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config';
import { UnauthorizedError, ForbiddenError } from '../shared/errors';
import { prisma } from '../database/prisma';
import { Role } from '@prisma/client';

export interface JwtPayload {
  userId: string;
  email: string;
  role: Role;
  iat?: number;
  exp?: number;
}

declare global {
  namespace Express {
    interface User {
      id: string;
      email: string;
      name: string;
      avatar?: string | null;
      role: Role;
    }
  }
}

export const authenticateJwt = async (
  req: Request,
  _res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    let token: string | undefined;

    // Check Authorization header: Bearer <token>
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.split(' ')[1];
    } else if (req.cookies && req.cookies.access_token) {
      token = req.cookies.access_token;
    }

    if (!token) {
      throw new UnauthorizedError('Authentication token is required');
    }

    const decoded = jwt.verify(token, config.jwt.secret) as JwtPayload;

    // Fetch user from DB to verify user exists and is active
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: { id: true, email: true, name: true, avatar: true, role: true },
    });

    if (!user) {
      throw new UnauthorizedError('User account associated with token not found');
    }

    req.user = user;
    next();
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      next(new UnauthorizedError('Authentication token has expired'));
    } else if (error instanceof jwt.JsonWebTokenError) {
      next(new UnauthorizedError('Invalid authentication token'));
    } else {
      next(error);
    }
  }
};

export const requireRole = (requiredRole: Role) => {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      return next(new UnauthorizedError('Authentication required'));
    }

    if (req.user.role !== requiredRole && req.user.role !== Role.ADMIN) {
      return next(new ForbiddenError('You do not have sufficient permissions to perform this action'));
    }

    next();
  };
};
