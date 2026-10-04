import React, { useState, useRef, useEffect, useCallback } from 'react';
import Calendar from '../components/Calendar';
import { useTodos } from '../hooks/useTodos';
import { todoApi } from '../api/todoApi';
import {
  getTodayDateKey,
  formatDisplayDate,
  formatMonthKey,
} from '../utils/dateUtils';

const Todo = () => {
  const todayKey = getTodayDateKey();
  const [selectedDate, setSelectedDate] = useState(todayKey);
  const [visibleMonth, setVisibleMonth] = useState(() => formatMonthKey(new Date()));
  const [contributedDates, setContributedDates] = useState({});
  const [newTask, setNewTask] = useState('');
  const [filter, setFilter] = useState('all');

  const inputRef = useRef(null);

  // Fetch summary for the visible month
  const fetchSummary = useCallback(async (month) => {
    if (!month) return;
    try {
      const response = await todoApi.getMonthlySummary(month);
      if (response.success && Array.isArray(response.data)) {
        const summaryMap = {};
        response.data.forEach((item) => {
          summaryMap[item.date] = {
            total: item.total,
            completed: item.completed,
          };
        });
        setContributedDates(summaryMap);
      }
    } catch (err) {
      console.error('Failed to load monthly summary:', err);
    }
  }, []);

  // Fetch summary on visible month change
  useEffect(() => {
    fetchSummary(visibleMonth);
  }, [visibleMonth, fetchSummary]);

  // Hook for todos with optimistic summary updates
  const {
    todos,
    loading,
    error,
    setError,
    addTodo,
    toggleComplete,
    removeTodo,
    moveUp,
    moveDown,
    clearCompleted,
  } = useTodos(selectedDate, {
    onTaskAdded: ({ date }) => {
      setContributedDates((prev) => {
        const current = prev[date] || { total: 0, completed: 0 };
        return {
          ...prev,
          [date]: {
            total: current.total + 1,
            completed: current.completed,
          },
        };
      });
    },
    onTaskToggled: ({ completed, date }) => {
      setContributedDates((prev) => {
        const current = prev[date];
        if (!current) return prev;
        const newCompleted = completed
          ? current.completed + 1
          : Math.max(0, current.completed - 1);
        return {
          ...prev,
          [date]: {
            total: current.total,
            completed: newCompleted,
          },
        };
      });
    },
    onTaskRemoved: ({ completed, date }) => {
      setContributedDates((prev) => {
        const current = prev[date];
        if (!current) return prev;
        const newTotal = current.total - 1;
        if (newTotal <= 0) {
          const updated = { ...prev };
          delete updated[date];
          return updated;
        }
        return {
          ...prev,
          [date]: {
            total: newTotal,
            completed: completed
              ? Math.max(0, current.completed - 1)
              : current.completed,
          },
        };
      });
    },
    onCompletedCleared: ({ date, count }) => {
      setContributedDates((prev) => {
        const current = prev[date];
        if (!current) return prev;
        const newTotal = current.total - count;
        if (newTotal <= 0) {
          const updated = { ...prev };
          delete updated[date];
          return updated;
        }
        return {
          ...prev,
          [date]: {
            total: newTotal,
            completed: 0,
          },
        };
      });
    },
    onMutated: () => {
      // Background sync with database aggregation
      fetchSummary(visibleMonth);
    },
  });

  // Focus input on date selection
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus();
    }
  }, [selectedDate]);

  const handleAddTask = async (e) => {
    if (e) e.preventDefault();
    const success = await addTodo(newTask);
    if (success) {
      setNewTask('');
    }
  };

  const filteredTasks = todos.filter((task) => {
    if (filter === 'completed') return task.completed;
    if (filter === 'pending') return !task.completed;
    return true;
  });

  const isToday = selectedDate === todayKey;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 text-white flex flex-col items-center py-8 px-4 sm:px-6 lg:px-8">
      {/* App Header */}
      <header className="mb-8 text-center">
        <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight bg-gradient-to-r from-violet-400 to-purple-200 bg-clip-text text-transparent">
          🗓️ Calendar Todo Manager
        </h1>
        <p className="text-slate-400 text-sm mt-1">
          Plan your days, track milestones, and conquer your goals
        </p>
      </header>

      {/* Main Grid Layout */}
      <main className="w-full max-w-6xl grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Calendar */}
        <section className="lg:col-span-5 w-full">
          <Calendar
            selectedDate={selectedDate}
            onSelectDate={(date) => setSelectedDate(date)}
            contributedDates={contributedDates}
            onMonthChange={(month) => setVisibleMonth(month)}
          />
        </section>

        {/* Right Column: Todo Panel */}
        <section className="lg:col-span-7 w-full bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl">
          {/* Panel Date Header */}
          <div className="flex flex-wrap items-center justify-between gap-3 mb-6 pb-4 border-b border-slate-800">
            <div>
              <div className="flex items-center gap-2.5">
                <h2 className="text-xl sm:text-2xl font-bold text-slate-100">
                  {formatDisplayDate(selectedDate)}
                </h2>
                {isToday && (
                  <span className="px-2.5 py-0.5 text-xs font-semibold rounded-full bg-violet-600/30 text-violet-300 border border-violet-500/40">
                    Today
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                {todos.length} {todos.length === 1 ? 'task' : 'tasks'} total •{' '}
                {todos.filter((t) => t.completed).length} completed
              </p>
            </div>
          </div>

          {/* Error Banner */}
          {error && (
            <div className="mb-4 p-3 bg-red-500/15 border border-red-500/40 rounded-xl text-red-300 text-sm flex justify-between items-center animate-fadeIn">
              <span className="flex items-center gap-2">
                <svg
                  className="w-4 h-4 shrink-0 text-red-400"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
                    clipRule="evenodd"
                  />
                </svg>
                {error}
              </span>
              <button
                type="button"
                onClick={() => setError(null)}
                className="text-red-400 hover:text-white text-lg font-bold leading-none ml-2 cursor-pointer"
                aria-label="Dismiss error notification"
              >
                ×
              </button>
            </div>
          )}

          {/* Add Task Input Form */}
          <form onSubmit={handleAddTask} className="flex gap-2 mb-5">
            <input
              ref={inputRef}
              type="text"
              placeholder={`Add task for ${isToday ? 'today' : selectedDate}...`}
              value={newTask}
              onChange={(e) => {
                setNewTask(e.target.value);
                if (error) setError(null);
              }}
              maxLength={200}
              className="flex-1 p-3 rounded-xl bg-slate-800 border border-slate-700 focus:outline-none focus:ring-2 focus:ring-violet-500 text-white placeholder-slate-400 text-sm transition-all"
            />
            <button
              type="submit"
              className="bg-violet-600 hover:bg-violet-700 active:bg-violet-800 px-5 rounded-xl font-semibold text-sm transition-all cursor-pointer shadow-lg shadow-violet-600/20 shrink-0"
            >
              Add
            </button>
          </form>

          {/* Filters & Actions Bar */}
          <div className="flex flex-wrap justify-between items-center gap-2 mb-4 text-sm">
            <div className="flex gap-1.5 bg-slate-800/80 p-1 rounded-lg border border-slate-700/50">
              {['all', 'completed', 'pending'].map((f) => (
                <button
                  key={f}
                  type="button"
                  onClick={() => setFilter(f)}
                  className={`px-3 py-1 rounded-md capitalize text-xs font-medium transition-all cursor-pointer ${
                    filter === f
                      ? 'bg-violet-600 text-white shadow-sm'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-700/50'
                  }`}
                >
                  {f}
                </button>
              ))}
            </div>

            <button
              type="button"
              onClick={clearCompleted}
              disabled={!todos.some((t) => t.completed)}
              className={`text-xs transition-colors cursor-pointer font-medium ${
                todos.some((t) => t.completed)
                  ? 'text-red-400 hover:text-red-300'
                  : 'text-slate-600 cursor-not-allowed'
              }`}
            >
              Clear Completed
            </button>
          </div>

          {/* Task List / Skeleton / Empty State */}
          {loading ? (
            <div className="space-y-2.5 py-2">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="h-12 bg-slate-800/60 border border-slate-700/30 rounded-xl animate-pulse"
                />
              ))}
            </div>
          ) : (
            <ul className="space-y-2.5 min-h-[140px]">
              {filteredTasks.length === 0 && (
                <li className="flex flex-col items-center justify-center py-10 text-slate-500">
                  <span className="text-3xl mb-2">📋</span>
                  <p className="text-sm font-medium">No tasks found for this date</p>
                  <p className="text-xs text-slate-500 mt-1">
                    {filter !== 'all'
                      ? `Try switching from the "${filter}" filter`
                      : 'Type a task above and press Enter to add one'}
                  </p>
                </li>
              )}

              {filteredTasks.map((task, index) => {
                const taskId = task._id || task.id;
                return (
                  <li
                    key={taskId}
                    className={`flex items-center justify-between p-3.5 rounded-xl border transition-all duration-150 group ${
                      task.completed
                        ? 'bg-slate-800/40 border-slate-800/60'
                        : 'bg-slate-800/90 border-slate-700/60 hover:border-slate-600 shadow-sm'
                    }`}
                  >
                    {/* Toggle Completion */}
                    <button
                      type="button"
                      onClick={() => toggleComplete(taskId)}
                      className="flex items-center gap-3 flex-1 text-left cursor-pointer break-all pr-3"
                    >
                      <span
                        className={`w-5 h-5 rounded-lg border flex items-center justify-center transition-all shrink-0 ${
                          task.completed
                            ? 'bg-violet-600 border-violet-500 text-white'
                            : 'border-slate-600 bg-slate-900 group-hover:border-violet-400'
                        }`}
                      >
                        {task.completed && (
                          <svg
                            className="w-3.5 h-3.5"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={3}
                              d="M5 13l4 4L19 7"
                            />
                          </svg>
                        )}
                      </span>
                      <span
                        className={`text-sm ${
                          task.completed
                            ? 'line-through text-slate-500'
                            : 'text-slate-100 font-medium'
                        }`}
                      >
                        {task.text}
                      </span>
                    </button>

                    {/* Task Actions */}
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={() => moveUp(index)}
                        disabled={index === 0}
                        className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                          index === 0
                            ? 'text-slate-700 cursor-not-allowed opacity-40'
                            : 'text-slate-400 hover:text-blue-400 hover:bg-slate-700'
                        }`}
                        title="Move task up"
                        aria-label="Move task up"
                      >
                        <svg
                          className="w-4 h-4"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M5 15l7-7 7 7"
                          />
                        </svg>
                      </button>

                      <button
                        type="button"
                        onClick={() => moveDown(index)}
                        disabled={index === todos.length - 1}
                        className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                          index === todos.length - 1
                            ? 'text-slate-700 cursor-not-allowed opacity-40'
                            : 'text-slate-400 hover:text-blue-400 hover:bg-slate-700'
                        }`}
                        title="Move task down"
                        aria-label="Move task down"
                      >
                        <svg
                          className="w-4 h-4"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M19 9l-7 7-7-7"
                          />
                        </svg>
                      </button>

                      <button
                        type="button"
                        onClick={() => removeTodo(taskId)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-red-400 hover:bg-slate-700 transition-colors cursor-pointer ml-0.5"
                        title="Delete task"
                        aria-label="Delete task"
                      >
                        <svg
                          className="w-4 h-4"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                          />
                        </svg>
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </main>
    </div>
  );
};

export default Todo;
