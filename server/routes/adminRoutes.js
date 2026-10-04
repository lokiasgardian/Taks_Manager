import express from 'express';
import {
  getAdminStats,
  getDailyUsage,
  getUsersList,
  updateUserStatus,
} from '../controllers/adminController.js';
import { protect, requireSuperAdmin } from '../middleware/authMiddleware.js';

const router = express.Router();

// All admin routes require valid authentication AND superadmin role
router.use(protect, requireSuperAdmin);

router.get('/stats', getAdminStats);
router.get('/usage/daily', getDailyUsage);
router.get('/users', getUsersList);
router.patch('/users/:id/status', updateUserStatus);

export default router;
