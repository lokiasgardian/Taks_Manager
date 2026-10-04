import mongoose from 'mongoose';
import User from '../models/User.js';
import Todo from '../models/Todo.js';
import ActivityLog from '../models/ActivityLog.js';

// Regex for YYYY-MM-DD
const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Get high-level system statistics for Super Admin
 * GET /api/admin/stats
 */
export const getAdminStats = async (req, res, next) => {
  try {
    const totalUsers = await User.countDocuments();
    const totalTasks = await Todo.countDocuments();
    const completedTasks = await Todo.countDocuments({ completed: true });

    const completionRate =
      totalTasks > 0
        ? Number(((completedTasks / totalTasks) * 100).toFixed(1))
        : 0;

    // Start of today in Asia/Kolkata (IST = UTC+5:30)
    const now = new Date();
    // Offset for Asia/Kolkata is +5.5 hours
    const kolkataTime = new Date(now.getTime() + 5.5 * 60 * 60 * 1000);
    const todayStr = kolkataTime.toISOString().split('T')[0]; // "YYYY-MM-DD"
    const startOfTodayUTC = new Date(`${todayStr}T00:00:00.000+05:30`);

    const newUsersToday = await User.countDocuments({
      createdAt: { $gte: startOfTodayUTC },
    });

    // Distinct users with activity today
    const activeUsersAggregation = await ActivityLog.aggregate([
      {
        $match: {
          createdAt: { $gte: startOfTodayUTC },
        },
      },
      {
        $group: {
          _id: '$user',
        },
      },
      {
        $count: 'count',
      },
    ]);

    const activeUsersToday =
      activeUsersAggregation.length > 0 ? activeUsersAggregation[0].count : 0;

    res.status(200).json({
      success: true,
      data: {
        totalUsers,
        activeUsersToday,
        newUsersToday,
        totalTasks,
        completedTasks,
        completionRate,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get daily usage statistics for a date range
 * GET /api/admin/usage/daily?from=YYYY-MM-DD&to=YYYY-MM-DD
 */
export const getDailyUsage = async (req, res, next) => {
  try {
    let { from, to } = req.query;

    const now = new Date();
    const kolkataNow = new Date(now.getTime() + 5.5 * 60 * 60 * 1000);
    const defaultTo = kolkataNow.toISOString().split('T')[0];

    // Default 30 days ago
    const thirtyDaysAgo = new Date(kolkataNow.getTime() - 29 * 24 * 60 * 60 * 1000);
    const defaultFrom = thirtyDaysAgo.toISOString().split('T')[0];

    const fromDateStr = from && DATE_REGEX.test(from) ? from : defaultFrom;
    const toDateStr = to && DATE_REGEX.test(to) ? to : defaultTo;

    const fromDateUTC = new Date(`${fromDateStr}T00:00:00.000+05:30`);
    const toDateUTC = new Date(`${toDateStr}T23:59:59.999+05:30`);

    const dailyStats = await ActivityLog.aggregate([
      {
        $match: {
          createdAt: { $gte: fromDateUTC, $lte: toDateUTC },
        },
      },
      {
        $project: {
          date: {
            $dateToString: {
              format: '%Y-%m-%d',
              date: '$createdAt',
              timezone: 'Asia/Kolkata',
            },
          },
          user: 1,
          type: 1,
        },
      },
      {
        $group: {
          _id: '$date',
          users: { $addToSet: '$user' },
          signups: {
            $sum: { $cond: [{ $eq: ['$type', 'signup'] }, 1, 0] },
          },
          logins: {
            $sum: { $cond: [{ $eq: ['$type', 'login'] }, 1, 0] },
          },
          tasksCreated: {
            $sum: { $cond: [{ $eq: ['$type', 'task_created'] }, 1, 0] },
          },
          tasksCompleted: {
            $sum: { $cond: [{ $eq: ['$type', 'task_completed'] }, 1, 0] },
          },
        },
      },
      {
        $project: {
          _id: 0,
          date: '$_id',
          activeUsers: { $size: '$users' },
          signups: 1,
          logins: 1,
          tasksCreated: 1,
          tasksCompleted: 1,
        },
      },
      {
        $sort: { date: 1 },
      },
    ]);

    res.status(200).json({
      success: true,
      data: dailyStats,
      range: {
        from: fromDateStr,
        to: toDateStr,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get users list with task counts (privacy preserved - no task text)
 * GET /api/admin/users?page=1&limit=20&search=...
 */
export const getUsersList = async (req, res, next) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.max(1, Math.min(100, parseInt(req.query.limit) || 20));
    const search = req.query.search ? String(req.query.search).trim() : '';
    const status = req.query.status;

    const matchQuery = {};

    if (search) {
      matchQuery.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
      ];
    }

    if (status === 'active') {
      matchQuery.isActive = true;
    } else if (status === 'inactive') {
      matchQuery.isActive = false;
    }

    const total = await User.countDocuments(matchQuery);

    const users = await User.aggregate([
      { $match: matchQuery },
      {
        $lookup: {
          from: 'todos',
          localField: '_id',
          foreignField: 'user',
          as: 'userTodos',
        },
      },
      {
        $project: {
          _id: 1,
          name: 1,
          email: 1,
          role: 1,
          isActive: 1,
          lastLoginAt: 1,
          createdAt: 1,
          taskCount: { $size: '$userTodos' },
        },
      },
      { $sort: { createdAt: -1 } },
      { $skip: (page - 1) * limit },
      { $limit: limit },
    ]);

    res.status(200).json({
      success: true,
      data: {
        users,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Toggle user active/inactive status
 * PATCH /api/admin/users/:id/status
 * Body: { isActive: boolean }
 */
export const updateUserStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { isActive } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid user ID format',
      });
    }

    if (typeof isActive !== 'boolean') {
      return res.status(400).json({
        success: false,
        message: 'isActive must be a boolean value',
      });
    }

    // Guard: Super admin cannot deactivate themselves
    if (req.user._id.toString() === id.toString()) {
      return res.status(400).json({
        success: false,
        message: 'You cannot deactivate your own super admin account.',
      });
    }

    const user = await User.findByIdAndUpdate(
      id,
      { isActive },
      { new: true }
    ).select('-passwordHash');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    res.status(200).json({
      success: true,
      message: `User ${user.isActive ? 'activated' : 'deactivated'} successfully`,
      data: user,
    });
  } catch (error) {
    next(error);
  }
};
