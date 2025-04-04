import { Request, Response, NextFunction } from 'express';
import * as jwt from 'jsonwebtoken';
import { JWT_SECRET } from '../config/auth';

export interface AuthRequest extends Request {
  userId?: number;
  isAdmin?: boolean;
}

/**
 * Middleware to verify JWT token and authenticate requests
 */
export const authenticateToken = (req: AuthRequest, res: Response, next: NextFunction) => {
  // Get token from header
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN format
  
  if (!token) {
    return res.status(401).json({ 
      success: false, 
      message: 'Access denied. No token provided.' 
    });
  }

  try {
    // Verify token
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    
    // Add user data to request
    req.userId = decoded.id;
    req.isAdmin = decoded.isAdmin;
    
    next();
  } catch (error) {
    return res.status(403).json({ 
      success: false, 
      message: 'Invalid token' 
    });
  }
};

/**
 * Middleware to check if user is an admin
 */
export const isAdmin = (req: AuthRequest, res: Response, next: NextFunction) => {
  if (!req.isAdmin) {
    return res.status(403).json({ 
      success: false, 
      message: 'Access denied. Admin privileges required.' 
    });
  }
  
  next();
}; 