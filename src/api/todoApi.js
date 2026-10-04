const BASE_URL = import.meta.env.VITE_API_URL || '/api';

/**
 * Generic request helper with credentials and JSON error handling
 */
const request = async (endpoint, options = {}) => {
  const url = `${BASE_URL}${endpoint}`;
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
  const config = {
    credentials: 'include', // Ensure cookies are sent with cross-origin requests
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
    ...options,
  };

  try {
    const response = await fetch(url, config);
    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      const errorMessage =
        data.message || `HTTP error! status: ${response.status}`;
      const error = new Error(errorMessage);
      error.status = response.status;
      error.data = data;
      throw error;
    }

    return data;
  } catch (error) {
    console.error(
      `API Error on [${options.method || 'GET'}] ${url}:`,
      error.message
    );
    throw error;
  }
};

export const todoApi = {
  /**
   * Get tasks of a given date (sorted by order)
   * @param {string} date "YYYY-MM-DD"
   */
  getTodos: (date) => request(`/todos?date=${encodeURIComponent(date)}`),

  /**
   * Create a new task or routine
   * @param {{ text: string, date: string, time?: string, taskType?: string, routineDuration?: string }} payload
   */
  createTodo: (payload) =>
    request('/todos', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  /**
   * Update task text and/or completed status
   * @param {string} id
   * @param {{ text?: string, completed?: boolean }} payload
   */
  updateTodo: (id, payload) =>
    request(`/todos/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    }),

  /**
   * Delete a single task by ID
   * @param {string} id
   */
  deleteTodo: (id) =>
    request(`/todos/${id}`, {
      method: 'DELETE',
    }),

  /**
   * Clear all completed tasks of a given date
   * @param {string} date "YYYY-MM-DD"
   */
  clearCompletedTodos: (date) =>
    request(`/todos/completed?date=${encodeURIComponent(date)}`, {
      method: 'DELETE',
    }),

  /**
   * Save new order of tasks for a date
   * @param {{ date: string, orderedIds: string[] }} payload
   */
  reorderTodos: ({ date, orderedIds }) =>
    request('/todos/reorder', {
      method: 'PATCH',
      body: JSON.stringify({ date, orderedIds }),
    }),

  /**
   * Get monthly summary for calendar date indicators
   * @param {string} month "YYYY-MM"
   */
  getMonthlySummary: (month) =>
    request(`/todos/summary?month=${encodeURIComponent(month)}`),
};

export default todoApi;
