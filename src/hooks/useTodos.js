import { useState, useEffect, useCallback, useRef } from 'react';
import { todoApi } from '../api/todoApi';
import { generateRoutineDates } from '../utils/dateUtils';

/**
 * Custom hook to manage todos for a selected date with optimistic updates
 * @param {string} selectedDate "YYYY-MM-DD"
 * @param {Object} [options]
 * @param {Function} [options.onTaskAdded] - ({ text, date }) => void
 * @param {Function} [options.onTaskToggled] - ({ id, completed, date }) => void
 * @param {Function} [options.onTaskRemoved] - ({ id, completed, date }) => void
 * @param {Function} [options.onCompletedCleared] - ({ date, count }) => void
 * @param {Function} [options.onMutated] - () => void
 */
export const useTodos = (selectedDate, options = {}) => {
  const {
    onTaskAdded,
    onTaskToggled,
    onTaskRemoved,
    onCompletedCleared,
    onMutated,
  } = options;

  const [todos, setTodos] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const todosRef = useRef(todos);
  todosRef.current = todos;

  // Fetch todos whenever selectedDate changes
  const fetchTodos = useCallback(async () => {
    if (!selectedDate) return;
    setLoading(true);
    setError(null);
    try {
      const response = await todoApi.getTodos(selectedDate);
      if (response.success && Array.isArray(response.data)) {
        setTodos(response.data);
      }
    } catch (err) {
      setError(err.message || 'Failed to load tasks for this date');
    } finally {
      setLoading(false);
    }
  }, [selectedDate]);

  useEffect(() => {
    fetchTodos();
  }, [fetchTodos]);

  /**
   * Add a new task or routine
   * @param {string|{ text: string, time?: string, taskType?: string, routineDuration?: string }} payload
   */
  const addTodo = async (payload) => {
    const isObject = typeof payload === 'object' && payload !== null;
    const trimmed = (isObject ? payload.text : payload || '').trim();
    if (!trimmed) return false;

    const time = isObject ? payload.time || '' : '';
    const taskType = isObject ? payload.taskType || 'onetime' : 'onetime';
    const routineDuration = isObject ? payload.routineDuration || '' : '';

    // Check duplicate locally on this date
    if (todos.some((t) => t.text.toLowerCase() === trimmed.toLowerCase())) {
      setError('A task with this text already exists on this date.');
      return false;
    }

    setError(null);

    // Optimistic notification
    if (onTaskAdded) {
      onTaskAdded({ text: trimmed, date: selectedDate });
    }

    try {
      const response = await todoApi.createTodo({
        text: trimmed,
        date: selectedDate,
        time,
        taskType,
        routineDuration,
      });

      if (response.success) {
        if (response.data) {
          setTodos((prev) => [...prev, response.data]);
        }

        // If routine was created, ensure all subsequent days in the range are populated
        if (taskType === 'routine' && routineDuration) {
          // If the backend didn't bulk-create (older deployment), generate remaining dates on client
          if (!response.totalDays || response.totalDays <= 1) {
            const allDates = generateRoutineDates(selectedDate, routineDuration);
            const remainingDates = allDates.slice(1);
            // Fire creation for remaining dates in batches
            Promise.all(
              remainingDates.map((d) =>
                todoApi
                  .createTodo({
                    text: trimmed,
                    date: d,
                    time,
                    taskType: 'routine',
                    routineDuration,
                  })
                  .catch(() => null)
              )
            ).then(() => {
              if (onMutated) onMutated();
            });
          }
        }

        if (onMutated) onMutated();
        return response;
      }
      return false;
    } catch (err) {
      setError(err.message || 'Failed to create task');
      if (onMutated) onMutated(); // refresh to keep in sync
      return false;
    }
  };

  /**
   * Toggle task completion (optimistic update)
   */
  const toggleComplete = async (id) => {
    const previousTodos = [...todosRef.current];
    const target = previousTodos.find((t) => (t._id || t.id) === id);
    if (!target) return;

    const newCompleted = !target.completed;

    // Optimistically update UI
    setTodos((prev) =>
      prev.map((t) =>
        (t._id || t.id) === id ? { ...t, completed: newCompleted } : t
      )
    );
    setError(null);

    if (onTaskToggled) {
      onTaskToggled({ id, completed: newCompleted, date: selectedDate });
    }

    try {
      await todoApi.updateTodo(id, { completed: newCompleted });
      if (onMutated) onMutated();
    } catch (err) {
      // Rollback on error
      setTodos(previousTodos);
      setError(err.message || 'Failed to update task');
      if (onMutated) onMutated();
    }
  };

  /**
   * Remove a task (optimistic update)
   */
  const removeTodo = async (id) => {
    const previousTodos = [...todosRef.current];
    const target = previousTodos.find((t) => (t._id || t.id) === id);
    const wasCompleted = target ? target.completed : false;

    // Optimistically remove from UI
    setTodos((prev) => prev.filter((t) => (t._id || t.id) !== id));
    setError(null);

    if (onTaskRemoved) {
      onTaskRemoved({ id, completed: wasCompleted, date: selectedDate });
    }

    try {
      await todoApi.deleteTodo(id);
      if (onMutated) onMutated();
    } catch (err) {
      // Rollback on error
      setTodos(previousTodos);
      setError(err.message || 'Failed to delete task');
      if (onMutated) onMutated();
    }
  };

  /**
   * Move task up in the list (optimistic update)
   */
  const moveUp = async (index) => {
    if (index === 0) return;
    const previousTodos = [...todosRef.current];
    const updated = [...previousTodos];
    [updated[index], updated[index - 1]] = [updated[index - 1], updated[index]];

    // Optimistic UI update
    setTodos(updated);
    setError(null);

    try {
      const orderedIds = updated.map((t) => t._id || t.id);
      await todoApi.reorderTodos({ date: selectedDate, orderedIds });
    } catch (err) {
      // Rollback on error
      setTodos(previousTodos);
      setError(err.message || 'Failed to reorder tasks');
    }
  };

  /**
   * Move task down in the list (optimistic update)
   */
  const moveDown = async (index) => {
    if (index === todosRef.current.length - 1) return;
    const previousTodos = [...todosRef.current];
    const updated = [...previousTodos];
    [updated[index], updated[index + 1]] = [updated[index + 1], updated[index]];

    // Optimistic UI update
    setTodos(updated);
    setError(null);

    try {
      const orderedIds = updated.map((t) => t._id || t.id);
      await todoApi.reorderTodos({ date: selectedDate, orderedIds });
    } catch (err) {
      // Rollback on error
      setTodos(previousTodos);
      setError(err.message || 'Failed to reorder tasks');
    }
  };

  /**
   * Clear all completed tasks (optimistic update)
   */
  const clearCompleted = async () => {
    const previousTodos = [...todosRef.current];
    const completedCount = previousTodos.filter((t) => t.completed).length;
    const remaining = previousTodos.filter((t) => !t.completed);

    if (remaining.length === previousTodos.length) return;

    // Optimistic UI update
    setTodos(remaining);
    setError(null);

    if (onCompletedCleared) {
      onCompletedCleared({ date: selectedDate, count: completedCount });
    }

    try {
      await todoApi.clearCompletedTodos(selectedDate);
      if (onMutated) onMutated();
    } catch (err) {
      // Rollback on error
      setTodos(previousTodos);
      setError(err.message || 'Failed to clear completed tasks');
      if (onMutated) onMutated();
    }
  };

  return {
    todos,
    loading,
    error,
    setError,
    fetchTodos,
    addTodo,
    toggleComplete,
    removeTodo,
    moveUp,
    moveDown,
    clearCompleted,
  };
};

export default useTodos;
