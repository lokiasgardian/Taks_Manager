import jwt from 'jsonwebtoken';
import User from '../models/User.js';

/**
 * Protect routes: verify JWT in cookie or Authorization header,
 * check if user exists and is active.
 */
export const protect = async (req, res, next) => {
  try {
    let token = req.cookies?.token;

    // Also support Authorization header
    if (!token && req.headers.authorization?.startsWith('Bearer ')) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required. Please log in.',
      });
    }

    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET || 'super_secret_jwt_key_calendar_todo_2026_dev_mode'
    );

    const user = await User.findById(decoded.id);

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'User account not found. Please log in again.',
      });
    }

    if (!user.isActive) {
      return res.status(403).json({
        success: false,
        message: 'Your account has been deactivated. Please contact support.',
      });
    }

    // Attach user to request
    req.user = user;
    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'Session expired or invalid token. Please log in again.',
      });
    }
    next(error);
  }
};

/**
 * Restrict route to superadmin role only
 */
export const requireSuperAdmin = (req, res, next) => {
  if (!req.user || req.user.role !== 'superadmin') {
    return res.status(403).json({
      success: false,
      message: 'Access denied. Super admin privileges required.',
    });
  }
  next();
};
