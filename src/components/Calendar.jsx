import React, { useState, useEffect, useMemo } from 'react';
import {
  getTodayDateKey,
  parseDateKey,
  formatMonthHeader,
  getCalendarGridDays,
  formatDisplayDate,
  formatMonthKey,
  addDaysToKey,
} from '../utils/dateUtils';

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

/**
 * Calendar component with contributed dates highlighting, tooltips, and legend
 *
 * @param {Object} props
 * @param {string} props.selectedDate - "YYYY-MM-DD"
 * @param {Function} props.onSelectDate - (dateKey: string) => void
 * @param {Object} [props.contributedDates={}] - Map of "YYYY-MM-DD" -> { total: number, completed: number }
 * @param {Function} [props.onMonthChange] - (monthString: string) => void
 */
const Calendar = ({
  selectedDate,
  onSelectDate,
  contributedDates = {},
  onMonthChange,
}) => {
  const todayKey = useMemo(() => getTodayDateKey(), []);

  // Maintain internal visible month view
  const initialDateParts = useMemo(
    () => parseDateKey(selectedDate || todayKey),
    [selectedDate, todayKey]
  );

  const [viewYear, setViewYear] = useState(initialDateParts.year);
  const [viewMonth, setViewMonth] = useState(initialDateParts.monthIndex);

  // Notify parent on month change
  useEffect(() => {
    const monthKey = formatMonthKey(new Date(viewYear, viewMonth, 1));
    if (onMonthChange) {
      onMonthChange(monthKey);
    }
  }, [viewYear, viewMonth, onMonthChange]);

  // Month navigation
  const handlePrevMonth = () => {
    if (viewMonth === 0) {
      setViewYear((prev) => prev - 1);
      setViewMonth(11);
    } else {
      setViewMonth((prev) => prev - 1);
    }
  };

  const handleNextMonth = () => {
    if (viewMonth === 11) {
      setViewYear((prev) => prev + 1);
      setViewMonth(0);
    } else {
      setViewMonth((prev) => prev + 1);
    }
  };

  const handleJumpToToday = () => {
    const todayParts = parseDateKey(todayKey);
    setViewYear(todayParts.year);
    setViewMonth(todayParts.monthIndex);
    if (onSelectDate) {
      onSelectDate(todayKey);
    }
  };

  const handleSelectDate = (dateKey) => {
    const { year, monthIndex } = parseDateKey(dateKey);
    if (year !== viewYear || monthIndex !== viewMonth) {
      setViewYear(year);
      setViewMonth(monthIndex);
    }
    if (onSelectDate) {
      onSelectDate(dateKey);
    }
  };

  // Keyboard navigation
  const handleKeyDown = (e, currentDateKey) => {
    let nextDateKey = null;
    if (e.key === 'ArrowLeft') {
      nextDateKey = addDaysToKey(currentDateKey, -1);
      e.preventDefault();
    } else if (e.key === 'ArrowRight') {
      nextDateKey = addDaysToKey(currentDateKey, 1);
      e.preventDefault();
    } else if (e.key === 'ArrowUp') {
      nextDateKey = addDaysToKey(currentDateKey, -7);
      e.preventDefault();
    } else if (e.key === 'ArrowDown') {
      nextDateKey = addDaysToKey(currentDateKey, 7);
      e.preventDefault();
    } else if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleSelectDate(currentDateKey);
      return;
    }

    if (nextDateKey) {
      handleSelectDate(nextDateKey);
      setTimeout(() => {
        const el = document.getElementById(`calendar-day-${nextDateKey}`);
        if (el) el.focus();
      }, 10);
    }
  };

  const calendarDays = useMemo(
    () => getCalendarGridDays(viewYear, viewMonth),
    [viewYear, viewMonth]
  );

  return (
    <div
      className="bg-slate-900 border border-slate-800 rounded-2xl p-5 sm:p-6 shadow-xl select-none"
      role="region"
      aria-label="Calendar Task Navigator"
    >
      {/* Header with Month / Year and Navigation */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-bold text-slate-100 flex items-center gap-2">
          <span>{formatMonthHeader(viewYear, viewMonth)}</span>
        </h2>

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={handleJumpToToday}
            className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-violet-600/20 text-violet-400 hover:bg-violet-600 hover:text-white transition-all cursor-pointer mr-1"
            title="Jump to today"
            aria-label="Go to today's date"
          >
            Today
          </button>

          <button
            type="button"
            onClick={handlePrevMonth}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
            aria-label="Previous month"
            title="Previous month"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 19l-7-7 7-7"
              />
            </svg>
          </button>

          <button
            type="button"
            onClick={handleNextMonth}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
            aria-label="Next month"
            title="Next month"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 5l7 7-7 7"
              />
            </svg>
          </button>
        </div>
      </div>

      {/* Weekday Labels */}
      <div className="grid grid-cols-7 gap-1 mb-2 text-center">
        {WEEKDAYS.map((day) => (
          <div
            key={day}
            className="text-xs font-semibold text-slate-400 uppercase tracking-wider py-1"
          >
            {day}
          </div>
        ))}
      </div>

      {/* Days Grid */}
      <div className="grid grid-cols-7 gap-1.5" role="grid">
        {calendarDays.map((dayObj) => {
          const { dateKey, dayNumber, isCurrentMonth } = dayObj;
          const isSelected = dateKey === selectedDate;
          const isToday = dateKey === todayKey;

          // Contribution info
          const contribution = contributedDates[dateKey];
          const hasTasks = Boolean(contribution && contribution.total > 0);
          const allCompleted =
            hasTasks && contribution.completed === contribution.total;

          // Accessibility label
          let ariaLabel = formatDisplayDate(dateKey);
          if (isToday) ariaLabel += ' (Today)';
          if (hasTasks) {
            ariaLabel += `, ${contribution.total} task${
              contribution.total > 1 ? 's' : ''
            }, ${contribution.completed} completed`;
          }

          // Tooltip description
          let titleText = formatDisplayDate(dateKey);
          if (hasTasks) {
            titleText += ` • ${contribution.total} task${
              contribution.total > 1 ? 's' : ''
            } (${contribution.completed} completed)`;
          }

          // Determine cell styling
          let cellStyle = '';
          if (isSelected) {
            cellStyle =
              'bg-violet-600 text-white font-bold shadow-lg shadow-violet-600/30 scale-[1.03] z-10 ring-2 ring-violet-400';
          } else if (isToday) {
            cellStyle =
              'ring-2 ring-violet-500/80 text-violet-300 font-semibold bg-violet-500/15 hover:bg-violet-500/25';
          } else if (!isCurrentMonth) {
            cellStyle =
              'text-slate-600 hover:text-slate-400 hover:bg-slate-800/40 opacity-40';
          } else if (allCompleted) {
            cellStyle =
              'bg-emerald-950/40 text-emerald-300 border border-emerald-500/30 hover:bg-emerald-900/40 hover:border-emerald-500/50';
          } else if (hasTasks) {
            cellStyle =
              'bg-amber-950/40 text-amber-300 border border-amber-500/30 hover:bg-amber-900/40 hover:border-amber-500/50';
          } else {
            cellStyle =
              'text-slate-200 hover:bg-slate-800 hover:text-white border border-transparent';
          }

          return (
            <button
              key={dateKey}
              id={`calendar-day-${dateKey}`}
              type="button"
              role="gridcell"
              tabIndex={isSelected ? 0 : -1}
              aria-selected={isSelected}
              aria-label={ariaLabel}
              title={titleText}
              onClick={() => handleSelectDate(dateKey)}
              onKeyDown={(e) => handleKeyDown(e, dateKey)}
              className={`
                relative h-11 sm:h-12 w-full rounded-xl flex flex-col items-center justify-center
                text-sm font-medium transition-all duration-150 cursor-pointer focus:outline-none focus:ring-2 focus:ring-violet-400
                ${cellStyle}
              `}
            >
              {/* Day Number */}
              <span>{dayNumber}</span>

              {/* Task Indicator Dot */}
              {hasTasks && (
                <span
                  className={`
                    absolute bottom-1 w-1.5 h-1.5 rounded-full transition-all
                    ${
                      isSelected
                        ? 'bg-white shadow-sm'
                        : allCompleted
                        ? 'bg-emerald-400 shadow-sm shadow-emerald-400/50'
                        : 'bg-amber-400 shadow-sm shadow-amber-400/50'
                    }
                  `}
                />
              )}
            </button>
          );
        })}
      </div>

      {/* Legend */}
      <div className="mt-5 pt-4 border-t border-slate-800 flex flex-wrap items-center justify-center gap-4 text-xs text-slate-400">
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-amber-400 shadow-sm shadow-amber-400/40" />
          <span>Pending</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 shadow-sm shadow-emerald-400/40" />
          <span>All done</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-3.5 h-3.5 rounded-md ring-2 ring-violet-500/80 bg-violet-500/20" />
          <span>Today</span>
        </div>
      </div>
    </div>
  );
};

export default Calendar;
