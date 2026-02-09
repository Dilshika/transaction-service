import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import logger, { logSecurityEvent } from '../utils/logger';

export interface AuthRequest extends Request {
  user?: {
    id: string;
    email: string;
    role: string;
  };
}

export const authMiddleware = (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      return res.status(401).json({ error: 'No authorization header provided' });
    }

    const parts = authHeader.split(' ');
    
    if (parts.length !== 2 || parts[0] !== 'Bearer') {
      return res.status(401).json({ error: 'Invalid authorization header format' });
    }

    const token = parts[1];
    const secret = process.env.JWT_SECRET || 'your-secret-key';

    try {
      const decoded = jwt.verify(token, secret) as any;
      
      req.user = {
        id: decoded.userId || decoded.id,
        email: decoded.email,
        role: decoded.role,
      };

      logger.debug('User authenticated', { userId: req.user.id });
      next();
    } catch (jwtError) {
      logSecurityEvent('Invalid JWT token', {
        error: jwtError,
        ip: req.ip,
        userAgent: req.get('user-agent'),
      });
      
      return res.status(401).json({ error: 'Invalid or expired token' });
    }
  } catch (error) {
    logger.error('Auth middleware error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

export const optionalAuthMiddleware = (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      return next();
    }

    const parts = authHeader.split(' ');
    
    if (parts.length !== 2 || parts[0] !== 'Bearer') {
      return next();
    }

    const token = parts[1];
    const secret = process.env.JWT_SECRET || 'your-secret-key';

    try {
      const decoded = jwt.verify(token, secret) as any;
      
      req.user = {
        id: decoded.userId || decoded.id,
        email: decoded.email,
        role: decoded.role,
      };

      logger.debug('User authenticated (optional)', { userId: req.user.id });
    } catch (jwtError) {
      // Don't fail, just continue without user context
      logger.debug('Optional auth failed, continuing without user context');
    }

    next();
  } catch (error) {
    logger.error('Optional auth middleware error:', error);
    next();
  }
};

// GraphQL context creation
export const createGraphQLContext = ({ req }: { req: AuthRequest }) => {
  return {
    user: req.user,
    ip: req.ip,
    userAgent: req.get('user-agent'),
  };
};