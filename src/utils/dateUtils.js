/**
 * Format a Date instance to "YYYY-MM-DD" in local time
 * @param {Date} [date=new Date()]
 * @returns {string} "YYYY-MM-DD"
 */
export const formatDateKey = (date = new Date()) => {
  const d = date instanceof Date ? date : new Date(date);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

/**
 * Format a Date instance to "YYYY-MM" in local time
 * @param {Date} [date=new Date()]
 * @returns {string} "YYYY-MM"
 */
export const formatMonthKey = (date = new Date()) => {
  const d = date instanceof Date ? date : new Date(date);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
};

/**
 * Get today's date formatted as "YYYY-MM-DD" in local time
 * @returns {string}
 */
export const getTodayDateKey = () => formatDateKey(new Date());

/**
 * Parse "YYYY-MM-DD" to local parts { year, monthIndex, day }
 * @param {string} dateKey "YYYY-MM-DD"
 */
export const parseDateKey = (dateKey) => {
  if (!dateKey) {
    const now = new Date();
    return {
      year: now.getFullYear(),
      monthIndex: now.getMonth(),
      day: now.getDate(),
    };
  }
  const [year, month, day] = dateKey.split('-').map(Number);
  return {
    year,
    monthIndex: month - 1,
    day,
  };
};

/**
 * Format "YYYY-MM-DD" to human readable date (e.g. "Sunday, 4 Oct 2026")
 * @param {string} dateString
 * @returns {string}
 */
export const formatDisplayDate = (dateString) => {
  if (!dateString) return '';
  const { year, monthIndex, day } = parseDateKey(dateString);
  const date = new Date(year, monthIndex, day);
  return date.toLocaleDateString('en-US', {
    weekday: 'long',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
};

/**
 * Format Month & Year for Header (e.g. "October 2026")
 * @param {number} year
 * @param {number} monthIndex (0-11)
 * @returns {string}
 */
export const formatMonthHeader = (year, monthIndex) => {
  const date = new Date(year, monthIndex, 1);
  return date.toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric',
  });
};

/**
 * Generate 35-42 grid day items for a given month/year
 * @param {number} year
 * @param {number} monthIndex 0-11
 * @returns {Array<{ dateKey: string, dayNumber: number, isCurrentMonth: boolean, isPrevMonth?: boolean, isNextMonth?: boolean }>}
 */
export const getCalendarGridDays = (year, monthIndex) => {
  const firstDayOfWeek = new Date(year, monthIndex, 1).getDay(); // 0 = Sun ... 6 = Sat
  const daysInCurrentMonth = new Date(year, monthIndex + 1, 0).getDate();
  const daysInPrevMonth = new Date(year, monthIndex, 0).getDate();

  const days = [];

  // Previous month padding
  for (let i = firstDayOfWeek - 1; i >= 0; i--) {
    const dayNum = daysInPrevMonth - i;
    const prevDate = new Date(year, monthIndex - 1, dayNum);
    days.push({
      dateKey: formatDateKey(prevDate),
      dayNumber: dayNum,
      isCurrentMonth: false,
      isPrevMonth: true,
    });
  }

  // Current month days
  for (let day = 1; day <= daysInCurrentMonth; day++) {
    const currDate = new Date(year, monthIndex, day);
    days.push({
      dateKey: formatDateKey(currDate),
      dayNumber: day,
      isCurrentMonth: true,
    });
  }

  // Next month padding to fill standard 42-day (6-row) grid
  const remainingCells = 42 - days.length;
  for (let day = 1; day <= remainingCells; day++) {
    const nextDate = new Date(year, monthIndex + 1, day);
    days.push({
      dateKey: formatDateKey(nextDate),
      dayNumber: day,
      isCurrentMonth: false,
      isNextMonth: true,
    });
  }

  return days;
};

/**
 * Local date arithmetic to move days forward/backward
 * @param {string} dateKey "YYYY-MM-DD"
 * @param {number} daysDelta
 * @returns {string} "YYYY-MM-DD"
 */
export const addDaysToKey = (dateKey, daysDelta) => {
  const { year, monthIndex, day } = parseDateKey(dateKey);
  const date = new Date(year, monthIndex, day + daysDelta);
  return formatDateKey(date);
};

/**
 * Generate all date keys (YYYY-MM-DD) for a given routine duration from a start date
 * @param {string} startDateKey "YYYY-MM-DD"
 * @param {string} duration "1_month" | "3_months" | "6_months"
 * @returns {string[]}
 */
export const generateRoutineDates = (startDateKey, duration) => {
  const dates = [];
  const { year, monthIndex, day } = parseDateKey(startDateKey);
  const start = new Date(year, monthIndex, day);

  let monthsToAdd = 1;
  if (duration === '3_months') monthsToAdd = 3;
  else if (duration === '6_months') monthsToAdd = 6;

  const end = new Date(year, monthIndex + monthsToAdd, day);

  const cur = new Date(start);
  while (cur <= end) {
    dates.push(formatDateKey(cur));
    cur.setDate(cur.getDate() + 1);
  }
  return dates;
};

/**
 * Format a 24-hour time string "HH:mm" to user friendly 12-hour format "h:mm A"
 * @param {string} timeStr "HH:mm" or "HH:mm:ss"
 * @returns {string}
 */
export const formatTime12Hour = (timeStr) => {
  if (!timeStr) return '';
  const parts = timeStr.split(':');
  if (parts.length < 2) return timeStr;
  let hours = parseInt(parts[0], 10);
  const minutes = parts[1];
  if (isNaN(hours)) return timeStr;

  const ampm = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12;
  hours = hours ? hours : 12; // '0' hours is '12'
  return `${hours}:${minutes} ${ampm}`;
};

