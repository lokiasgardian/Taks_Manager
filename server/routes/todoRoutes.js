import express from 'express';
import {
  getHealth,
  getTodosByDate,
  createTodo,
  updateTodo,
  deleteTodo,
  clearCompletedTodos,
  reorderTodos,
  getMonthlySummary,
} from '../controllers/todoController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

// Health check (public)
router.get('/health', getHealth);

// All todo endpoints below require authentication
router.use(protect);

// Specific named routes
router.get('/summary', getMonthlySummary);
router.delete('/completed', clearCompletedTodos);
router.patch('/reorder', reorderTodos);

// General collection routes
router.get('/', getTodosByDate);
router.post('/', createTodo);

// Individual item routes
router.patch('/:id', updateTodo);
router.delete('/:id', deleteTodo);

export default router;
