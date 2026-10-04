import mongoose from 'mongoose';
import Todo from '../models/Todo.js';
import ActivityLog from '../models/ActivityLog.js';

// Regex validators
const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;
const MONTH_REGEX = /^\d{4}-\d{2}$/;

/**
 * Health check endpoint
 * GET /api/health
 */
export const getHealth = (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Todo API is running smoothly',
    timestamp: new Date().toISOString(),
  });
};

/**
 * Get all todos for a specific date for the authenticated user
 * GET /api/todos?date=YYYY-MM-DD
 */
export const getTodosByDate = async (req, res, next) => {
  try {
    const { date } = req.query;
    const userId = req.user._id;

    if (!date || !DATE_REGEX.test(date)) {
      return res.status(400).json({
        success: false,
        message: 'A valid date query parameter is required (format: YYYY-MM-DD)',
      });
    }

    const todos = await Todo.find({ user: userId, date }).sort({
      order: 1,
      createdAt: 1,
    });

    res.status(200).json({
      success: true,
      data: todos,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Helper to compute array of YYYY-MM-DD date strings for routine duration
 */
const getRoutineDates = (startDateStr, duration) => {
  const dates = [];
  const [year, month, day] = startDateStr.split('-').map(Number);
  const start = new Date(year, month - 1, day);

  let monthsToAdd = 1;
  if (duration === '3_months') monthsToAdd = 3;
  else if (duration === '6_months') monthsToAdd = 6;

  const end = new Date(year, month - 1 + monthsToAdd, day);

  const cur = new Date(start);
  while (cur <= end) {
    const y = cur.getFullYear();
    const m = String(cur.getMonth() + 1).padStart(2, '0');
    const d = String(cur.getDate()).padStart(2, '0');
    dates.push(`${y}-${m}-${d}`);
    cur.setDate(cur.getDate() + 1);
  }
  return dates;
};

/**
 * Create a new todo or routine for the authenticated user
 * POST /api/todos
 * Body: { text, date, time, taskType, routineDuration }
 */
export const createTodo = async (req, res, next) => {
  try {
    const {
      text,
      date,
      time = '',
      taskType = 'onetime',
      routineDuration = '',
    } = req.body;
    const userId = req.user._id;

    if (!date || !DATE_REGEX.test(date)) {
      return res.status(400).json({
        success: false,
        message: 'A valid date is required (format: YYYY-MM-DD)',
      });
    }

    const trimmedText = typeof text === 'string' ? text.trim() : '';
    if (!trimmedText) {
      return res.status(400).json({
        success: false,
        message: 'Task text cannot be empty',
      });
    }

    if (trimmedText.length > 200) {
      return res.status(400).json({
        success: false,
        message: 'Task text cannot exceed 200 characters',
      });
    }

    const trimmedTime = typeof time === 'string' ? time.trim() : '';

    // Handle Routine task creation
    if (taskType === 'routine') {
      const validDurations = ['1_month', '3_months', '6_months'];
      if (!validDurations.includes(routineDuration)) {
        return res.status(400).json({
          success: false,
          message: 'Routine duration must be 1_month, 3_months, or 6_months',
        });
      }

      if (!trimmedTime) {
        return res.status(400).json({
          success: false,
          message: 'Please set a time for the routine',
        });
      }

      const routineDates = getRoutineDates(date, routineDuration);
      const routineGroupId = new mongoose.Types.ObjectId().toString();

      // Bulk upsert to avoid duplicate key errors on individual dates
      const bulkOps = routineDates.map((d, index) => ({
        updateOne: {
          filter: { user: userId, date: d, text: trimmedText },
          update: {
            $setOnInsert: {
              user: userId,
              date: d,
              text: trimmedText,
              time: trimmedTime,
              taskType: 'routine',
              routineDuration,
              routineGroupId,
              completed: false,
              order: index,
            },
          },
          upsert: true,
        },
      }));

      if (bulkOps.length > 0) {
        await Todo.bulkWrite(bulkOps);
      }

      await ActivityLog.create({
        user: userId,
        type: 'task_created',
      });

      const currentDayTodo = await Todo.findOne({
        user: userId,
        date,
        text: trimmedText,
      });

      return res.status(201).json({
        success: true,
        message: `Routine successfully scheduled for ${routineDates.length} days`,
        totalDays: routineDates.length,
        data: currentDayTodo || {
          user: userId,
          date,
          text: trimmedText,
          time: trimmedTime,
          taskType: 'routine',
          routineDuration,
          routineGroupId,
          completed: false,
        },
      });
    }

    // Standard One-time Task creation
    // Check duplicate per user per date
    const existing = await Todo.findOne({ user: userId, date, text: trimmedText });
    if (existing) {
      return res.status(409).json({
        success: false,
        message: 'A task with this text already exists on this date.',
      });
    }

    // Calculate order: position = highest order on this date + 1
    const lastTodo = await Todo.findOne({ user: userId, date }).sort({ order: -1 });
    const order =
      lastTodo && typeof lastTodo.order === 'number' ? lastTodo.order + 1 : 0;

    const todo = await Todo.create({
      user: userId,
      text: trimmedText,
      date,
      time: trimmedTime,
      taskType: 'onetime',
      completed: false,
      order,
    });

    // Log activity
    await ActivityLog.create({
      user: userId,
      type: 'task_created',
    });

    res.status(201).json({
      success: true,
      data: todo,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Update todo text and/or completed status for authenticated user
 * PATCH /api/todos/:id
 * Body: { text, completed }
 */
export const updateTodo = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { text, completed } = req.body;
    const userId = req.user._id;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid todo ID format',
      });
    }

    const existingTodo = await Todo.findOne({ _id: id, user: userId });
    if (!existingTodo) {
      return res.status(404).json({
        success: false,
        message: 'Todo not found',
      });
    }

    const updateData = {};

    if (text !== undefined) {
      const trimmedText = typeof text === 'string' ? text.trim() : '';
      if (!trimmedText) {
        return res.status(400).json({
          success: false,
          message: 'Task text cannot be empty',
        });
      }
      if (trimmedText.length > 200) {
        return res.status(400).json({
          success: false,
          message: 'Task text cannot exceed 200 characters',
        });
      }
      updateData.text = trimmedText;
    }

    const wasCompleted = existingTodo.completed;
    if (completed !== undefined) {
      updateData.completed = Boolean(completed);
    }

    const updatedTodo = await Todo.findOneAndUpdate(
      { _id: id, user: userId },
      updateData,
      { new: true, runValidators: true }
    );

    // Log activity if transitioned to completed
    if (completed === true && !wasCompleted) {
      await ActivityLog.create({
        user: userId,
        type: 'task_completed',
      });
    }

    res.status(200).json({
      success: true,
      data: updatedTodo,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Delete a todo by ID for authenticated user
 * DELETE /api/todos/:id
 */
export const deleteTodo = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user._id;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid todo ID format',
      });
    }

    const todo = await Todo.findOneAndDelete({ _id: id, user: userId });

    if (!todo) {
      return res.status(404).json({
        success: false,
        message: 'Todo not found',
      });
    }

    // Log deletion activity
    await ActivityLog.create({
      user: userId,
      type: 'task_deleted',
    });

    res.status(200).json({
      success: true,
      message: 'Todo deleted successfully',
      data: todo,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Clear all completed todos for a given date for authenticated user
 * DELETE /api/todos/completed?date=YYYY-MM-DD
 */
export const clearCompletedTodos = async (req, res, next) => {
  try {
    const { date } = req.query;
    const userId = req.user._id;

    if (!date || !DATE_REGEX.test(date)) {
      return res.status(400).json({
        success: false,
        message: 'A valid date query parameter is required (format: YYYY-MM-DD)',
      });
    }

    const result = await Todo.deleteMany({
      user: userId,
      date,
      completed: true,
    });

    res.status(200).json({
      success: true,
      message: `Cleared ${result.deletedCount} completed tasks`,
      deletedCount: result.deletedCount,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Reorder todos for a specific date for authenticated user
 * PATCH /api/todos/reorder
 * Body: { date, orderedIds: [] }
 */
export const reorderTodos = async (req, res, next) => {
  try {
    const { date, orderedIds } = req.body;
    const userId = req.user._id;

    if (!date || !DATE_REGEX.test(date)) {
      return res.status(400).json({
        success: false,
        message: 'A valid date is required (format: YYYY-MM-DD)',
      });
    }

    if (!Array.isArray(orderedIds)) {
      return res.status(400).json({
        success: false,
        message: 'orderedIds must be an array of todo IDs',
      });
    }

    for (const id of orderedIds) {
      if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({
          success: false,
          message: `Invalid todo ID format: ${id}`,
        });
      }
    }

    const bulkOps = orderedIds.map((id, index) => ({
      updateOne: {
        filter: { _id: id, user: userId, date },
        update: { $set: { order: index } },
      },
    }));

    if (bulkOps.length > 0) {
      await Todo.bulkWrite(bulkOps);
    }

    const updatedTodos = await Todo.find({ user: userId, date }).sort({
      order: 1,
      createdAt: 1,
    });

    res.status(200).json({
      success: true,
      message: 'Todos reordered successfully',
      data: updatedTodos,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get monthly summary of tasks per date for authenticated user
 * GET /api/todos/summary?month=YYYY-MM
 */
export const getMonthlySummary = async (req, res, next) => {
  try {
    const { month } = req.query;
    const userId = req.user._id;

    if (!month || !MONTH_REGEX.test(month)) {
      return res.status(400).json({
        success: false,
        message: 'A valid month query parameter is required (format: YYYY-MM)',
      });
    }

    const summary = await Todo.aggregate([
      {
        $match: {
          user: new mongoose.Types.ObjectId(userId),
          date: { $regex: `^${month}-\\d{2}$` },
        },
      },
      {
        $group: {
          _id: '$date',
          total: { $sum: 1 },
          completed: {
            $sum: { $cond: [{ $eq: ['$completed', true] }, 1, 0] },
          },
        },
      },
      {
        $project: {
          _id: 0,
          date: '$_id',
          total: 1,
          completed: 1,
        },
      },
      {
        $sort: { date: 1 },
      },
    ]);

    res.status(200).json({
      success: true,
      data: summary,
    });
  } catch (error) {
    next(error);
  }
};
