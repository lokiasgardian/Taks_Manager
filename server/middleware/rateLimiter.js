import rateLimit from 'express-rate-limit';

/**
 * Rate limiter for sensitive authentication endpoints (login / signup)
 * 10 attempts per 15 minutes per IP
 */
export const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // 10 attempts
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many attempts from this IP. Please try again after 15 minutes.',
  },
});
