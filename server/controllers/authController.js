import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import User from '../models/User.js';
import ActivityLog from '../models/ActivityLog.js';

const signupSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, 'Name must be at least 2 characters')
    .max(50, 'Name cannot exceed 50 characters'),
  email: z.string().trim().toLowerCase().email('Invalid email address format'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters long')
    .regex(
      /^(?=.*[A-Za-z])(?=.*\d)/,
      'Password must contain at least one letter and one number'
    ),
});

const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email('Invalid email address format'),
  password: z.string().min(1, 'Password is required'),
});

const getCookieOptions = () => ({
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
});

const generateToken = (userId) => {
  return jwt.sign(
    { id: userId },
    process.env.JWT_SECRET || 'super_secret_jwt_key_calendar_todo_2026_dev_mode',
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );
};

/**
 * Register a new user
 * POST /api/auth/signup
 */
export const signup = async (req, res, next) => {
  try {
    const parseResult = signupSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({
        success: false,
        message: parseResult.error.errors.map((e) => e.message).join(', '),
      });
    }

    const { name, email, password } = parseResult.data;

    // Check if user exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: 'An account with this email already exists.',
      });
    }

    const salt = await bcrypt.genSalt(12);
    const passwordHash = await bcrypt.hash(password, salt);

    const user = await User.create({
      name,
      email,
      passwordHash,
      role: 'user',
      isActive: true,
    });

    // Log signup activity
    await ActivityLog.create({
      user: user._id,
      type: 'signup',
    });

    // Issue token in cookie and response body
    const token = generateToken(user._id);
    res.cookie('token', token, getCookieOptions());

    res.status(201).json({
      success: true,
      message: 'Account created successfully',
      token,
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        isActive: user.isActive,
        createdAt: user.createdAt,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Authenticate user & get token
 * POST /api/auth/login
 */
export const login = async (req, res, next) => {
  try {
    const parseResult = loginSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({
        success: false,
        message: parseResult.error.errors.map((e) => e.message).join(', '),
      });
    }

    const { email, password } = parseResult.data;

    // Load user including passwordHash
    const user = await User.findOne({ email }).select('+passwordHash');
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password.',
      });
    }

    if (!user.isActive) {
      return res.status(403).json({
        success: false,
        message: 'Your account has been deactivated. Please contact support.',
      });
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password.',
      });
    }

    // Update lastLoginAt
    user.lastLoginAt = new Date();
    await user.save();

    // Log login activity
    await ActivityLog.create({
      user: user._id,
      type: 'login',
    });

    // Issue token in cookie and response body
    const token = generateToken(user._id);
    res.cookie('token', token, getCookieOptions());

    res.status(200).json({
      success: true,
      message: 'Logged in successfully',
      token,
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        isActive: user.isActive,
        lastLoginAt: user.lastLoginAt,
        createdAt: user.createdAt,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Log out user & clear cookie
 * POST /api/auth/logout
 */
export const logout = (req, res) => {
  res.clearCookie('token', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
  });

  res.status(200).json({
    success: true,
    message: 'Logged out successfully',
  });
};

/**
 * Get current authenticated user session
 * GET /api/auth/me
 */
export const getMe = async (req, res) => {
  res.status(200).json({
    success: true,
    user: {
      _id: req.user._id,
      name: req.user.name,
      email: req.user.email,
      role: req.user.role,
      isActive: req.user.isActive,
      lastLoginAt: req.user.lastLoginAt,
      createdAt: req.user.createdAt,
    },
  });
};
