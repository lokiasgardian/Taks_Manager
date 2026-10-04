import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import Calendar from '../components/Calendar';
import { useTodos } from '../hooks/useTodos';
import { todoApi } from '../api/todoApi';
import {
  getTodayDateKey,
  formatDisplayDate,
  formatMonthKey,
  generateRoutineDates,
  formatTime12Hour,
} from '../utils/dateUtils';

const ROUTINE_DURATIONS = [
  { key: '1_month', label: '1 Month', desc: '~30 Days', months: 1 },
  { key: '3_months', label: '3 Months', desc: '~90 Days', months: 3 },
  { key: '6_months', label: '6 Months', desc: '~180 Days', months: 6 },
];

const TIME_PRESETS = [
  { label: '🌅 7:00 AM', value: '07:00' },
  { label: '☀️ 9:00 AM', value: '09:00' },
  { label: '🥗 1:00 PM', value: '13:00' },
  { label: '🌆 5:00 PM', value: '17:00' },
  { label: '🌙 8:00 PM', value: '20:00' },
];

const Todo = () => {
  const todayKey = getTodayDateKey();
  const [selectedDate, setSelectedDate] = useState(todayKey);
  const [visibleMonth, setVisibleMonth] = useState(() => formatMonthKey(new Date()));
  const [contributedDates, setContributedDates] = useState({});

  // Task form state
  const [taskType, setTaskType] = useState('onetime'); // 'onetime' | 'routine'
  const [newTask, setNewTask] = useState('');
  const [routineDuration, setRoutineDuration] = useState('1_month');
  const [taskTime, setTaskTime] = useState('08:00');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successBanner, setSuccessBanner] = useState(null);

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
    fetchTodos,
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
      fetchSummary(visibleMonth);
    },
  });

  // Focus input on date selection
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus();
    }
  }, [selectedDate]);

  // Compute calculated routine range preview
  const routinePreview = useMemo(() => {
    if (taskType !== 'routine') return null;
    const dates = generateRoutineDates(selectedDate, routineDuration);
    const startDateFormatted = formatDisplayDate(selectedDate);
    const endDateFormatted = dates.length > 0 ? formatDisplayDate(dates[dates.length - 1]) : '';
    return {
      count: dates.length,
      startDate: startDateFormatted,
      endDate: endDateFormatted,
      timeFormatted: formatTime12Hour(taskTime),
    };
  }, [taskType, selectedDate, routineDuration, taskTime]);

  const handleAddTask = async (e) => {
    if (e) e.preventDefault();
    const trimmed = newTask.trim();
    if (!trimmed) {
      setError('Task text cannot be empty');
      return;
    }

    if (taskType === 'routine' && !taskTime) {
      setError('Please set a specific time for your routine');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    const payload = {
      text: trimmed,
      date: selectedDate,
      time: taskTime || '',
      taskType,
      routineDuration: taskType === 'routine' ? routineDuration : '',
    };

    const res = await addTodo(payload);
    setIsSubmitting(false);

    if (res) {
      setNewTask('');
      if (taskType === 'routine') {
        const durObj = ROUTINE_DURATIONS.find((d) => d.key === routineDuration);
        setSuccessBanner(
          `🎉 Routine "${trimmed}" scheduled for ${durObj?.label || 'duration'} (${routinePreview?.count || ''} days) at ${formatTime12Hour(taskTime)}!`
        );
        setTimeout(() => setSuccessBanner(null), 6000);
        // Refresh summary and todos
        fetchSummary(visibleMonth);
        fetchTodos();
      }
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
          🗓️ Calendar Todo & Routine Manager
        </h1>
        <p className="text-slate-400 text-sm mt-1">
          Plan daily tasks, build routines & habits, and conquer your goals
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

          {/* Success Banner */}
          {successBanner && (
            <div className="mb-4 p-3 bg-emerald-500/15 border border-emerald-500/40 rounded-xl text-emerald-300 text-sm flex justify-between items-center animate-fadeIn">
              <span className="flex items-center gap-2">
                <svg className="w-5 h-5 shrink-0 text-emerald-400" fill="currentColor" viewBox="0 0 20 20">
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                    clipRule="evenodd"
                  />
                </svg>
                {successBanner}
              </span>
              <button
                type="button"
                onClick={() => setSuccessBanner(null)}
                className="text-emerald-400 hover:text-white text-lg font-bold leading-none ml-2 cursor-pointer"
                aria-label="Dismiss banner"
              >
                ×
              </button>
            </div>
          )}

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

          {/* Add Task Container */}
          <div className="mb-6 bg-slate-800/60 border border-slate-700/60 rounded-xl p-4 shadow-sm">
            {/* Task Type Switcher */}
            <div className="flex items-center gap-2 mb-3.5 pb-3 border-b border-slate-700/40">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Type:</span>
              <div className="inline-flex p-1 bg-slate-900/80 rounded-lg border border-slate-700/60">
                <button
                  type="button"
                  onClick={() => {
                    setTaskType('onetime');
                    if (error) setError(null);
                  }}
                  className={`px-3 py-1 text-xs font-semibold rounded-md transition-all cursor-pointer flex items-center gap-1.5 ${
                    taskType === 'onetime'
                      ? 'bg-violet-600 text-white shadow-md shadow-violet-600/30'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <span>⚡</span> One-time Task
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setTaskType('routine');
                    if (error) setError(null);
                  }}
                  className={`px-3 py-1 text-xs font-semibold rounded-md transition-all cursor-pointer flex items-center gap-1.5 ${
                    taskType === 'routine'
                      ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-md shadow-purple-600/30'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <span>🔄</span> Routine (Recurring)
                </button>
              </div>
            </div>

            <form onSubmit={handleAddTask} className="space-y-3.5">
              {/* Task Text Input */}
              <div className="flex gap-2">
                <input
                  ref={inputRef}
                  type="text"
                  placeholder={
                    taskType === 'routine'
                      ? 'Routine name (e.g., Morning Workout, Daily Code Review)...'
                      : `Add task for ${isToday ? 'today' : selectedDate}...`
                  }
                  value={newTask}
                  onChange={(e) => {
                    setNewTask(e.target.value);
                    if (error) setError(null);
                  }}
                  maxLength={200}
                  className="flex-1 p-3 rounded-xl bg-slate-900 border border-slate-700 focus:outline-none focus:ring-2 focus:ring-violet-500 text-white placeholder-slate-400 text-sm transition-all"
                />

                {taskType === 'onetime' && (
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="bg-violet-600 hover:bg-violet-700 active:bg-violet-800 disabled:opacity-50 px-5 rounded-xl font-semibold text-sm transition-all cursor-pointer shadow-lg shadow-violet-600/20 shrink-0 flex items-center gap-1.5"
                  >
                    {isSubmitting ? (
                      <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                      '+ Add'
                    )}
                  </button>
                )}
              </div>

              {/* Routine Options */}
              {taskType === 'routine' && (
                <div className="space-y-3 pt-1 animate-fadeIn">
                  {/* Duration Selector */}
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1.5 flex items-center gap-1.5">
                      <span>⏱️ Repeat Duration:</span>
                      <span className="text-[11px] text-slate-400">(How long should this routine repeat?)</span>
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                      {ROUTINE_DURATIONS.map((dur) => (
                        <button
                          key={dur.key}
                          type="button"
                          onClick={() => setRoutineDuration(dur.key)}
                          className={`p-2.5 rounded-xl border text-center transition-all cursor-pointer ${
                            routineDuration === dur.key
                              ? 'bg-purple-900/40 border-purple-500 text-white shadow-sm shadow-purple-500/20 ring-1 ring-purple-500'
                              : 'bg-slate-900/60 border-slate-700/60 text-slate-400 hover:border-slate-600 hover:text-slate-200'
                          }`}
                        >
                          <div className="text-xs font-bold">{dur.label}</div>
                          <div className="text-[10px] text-purple-300/80 mt-0.5">{dur.desc}</div>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Set Time (Mandatory for routine) */}
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1.5 flex items-center gap-1.5">
                      <span>⏰ Set Time:</span>
                      <span className="text-[11px] text-purple-300 font-semibold">(Scheduled time of day)</span>
                    </label>

                    <div className="flex flex-wrap items-center gap-2">
                      <div className="relative">
                        <input
                          type="time"
                          value={taskTime}
                          onChange={(e) => setTaskTime(e.target.value)}
                          required
                          className="bg-slate-900 border border-slate-700 focus:border-purple-500 focus:ring-1 focus:ring-purple-500 text-white rounded-lg px-3 py-1.5 text-xs font-medium outline-none cursor-pointer"
                        />
                      </div>

                      {/* Quick Presets */}
                      <div className="flex flex-wrap gap-1.5">
                        {TIME_PRESETS.map((preset) => (
                          <button
                            key={preset.value}
                            type="button"
                            onClick={() => setTaskTime(preset.value)}
                            className={`px-2 py-1 rounded-md text-[11px] font-medium transition-all cursor-pointer ${
                              taskTime === preset.value
                                ? 'bg-purple-600 text-white shadow-sm'
                                : 'bg-slate-900/80 text-slate-400 hover:text-slate-200 hover:bg-slate-700/60'
                            }`}
                          >
                            {preset.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Summary & Submit Routine */}
                  {routinePreview && (
                    <div className="p-3 bg-purple-950/40 border border-purple-500/30 rounded-xl text-xs text-purple-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div>
                        <div className="font-semibold text-purple-100 flex items-center gap-1.5">
                          <span>📅 Schedule Summary:</span>
                        </div>
                        <p className="text-[11px] text-purple-300/90 mt-0.5">
                          Daily from <strong className="text-white">{routinePreview.startDate}</strong> to{' '}
                          <strong className="text-white">{routinePreview.endDate}</strong> at{' '}
                          <strong className="text-amber-300">{routinePreview.timeFormatted}</strong> ({routinePreview.count} total tasks)
                        </p>
                      </div>

                      <button
                        type="submit"
                        disabled={isSubmitting}
                        className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 active:from-purple-700 active:to-indigo-700 disabled:opacity-50 px-5 py-2 rounded-xl font-bold text-xs text-white transition-all cursor-pointer shadow-lg shadow-purple-600/30 shrink-0 flex items-center justify-center gap-1.5"
                      >
                        {isSubmitting ? (
                          <>
                            <span className="inline-block w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                            <span>Scheduling...</span>
                          </>
                        ) : (
                          <>
                            <span>✨</span>
                            <span>Create Routine</span>
                          </>
                        )}
                      </button>
                    </div>
                  )}
                </div>
              )}
            </form>
          </div>

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
                      : 'Create a one-time task or recurring routine above'}
                  </p>
                </li>
              )}

              {filteredTasks.map((task, index) => {
                const taskId = task._id || task.id;
                const isRoutineTask = task.taskType === 'routine' || Boolean(task.routineDuration);

                return (
                  <li
                    key={taskId}
                    className={`flex items-center justify-between p-3.5 rounded-xl border transition-all duration-150 group ${
                      task.completed
                        ? 'bg-slate-800/40 border-slate-800/60'
                        : 'bg-slate-800/90 border-slate-700/60 hover:border-slate-600 shadow-sm'
                    }`}
                  >
                    {/* Toggle Completion & Task Details */}
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

                      <div className="flex flex-wrap items-center gap-2">
                        <span
                          className={`text-sm ${
                            task.completed
                              ? 'line-through text-slate-500'
                              : 'text-slate-100 font-medium'
                          }`}
                        >
                          {task.text}
                        </span>

                        {/* Scheduled Time Badge */}
                        {task.time && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium bg-slate-900/90 text-amber-300 border border-amber-500/30 shrink-0">
                            <span>⏰</span>
                            <span>{formatTime12Hour(task.time)}</span>
                          </span>
                        )}

                        {/* Routine Badge */}
                        {isRoutineTask && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold bg-purple-950/80 text-purple-300 border border-purple-500/30 shrink-0">
                            <span>🔄</span>
                            <span>
                              Routine{' '}
                              {task.routineDuration === '1_month'
                                ? '1M'
                                : task.routineDuration === '3_months'
                                ? '3M'
                                : task.routineDuration === '6_months'
                                ? '6M'
                                : ''}
                            </span>
                          </span>
                        )}
                      </div>
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
