/**
 * Date utilities for parsing, filtering, and comparing dates (UTC-based for consistency with DB).
 */

/**
 * Parse a value to a Date. Accepts ISO string, timestamp, or Date.
 * @param {string|number|Date|null|undefined} value
 * @returns {Date|null} Parsed date or null if invalid
 */
export function parseDate(value) {
  if (value == null) return null;
  if (value instanceof Date) return isNaN(value.getTime()) ? null : value;
  const d = new Date(value);
  return isNaN(d.getTime()) ? null : d;
}

/**
 * Parse and return start of day in UTC (for comparison).
 * @param {string|number|Date|null|undefined} value
 * @returns {Date|null}
 */
export function parseDateUTC(value) {
  const d = parseDate(value);
  if (!d) return null;
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

/**
 * Get month (1–12) and year from a date value.
 * @param {string|number|Date|null|undefined} value
 * @returns {{ month: number, year: number }|null}
 */
export function getMonthYear(value) {
  const d = parseDate(value);
  if (!d) return null;
  return {
    month: d.getUTCMonth() + 1,
    year: d.getUTCFullYear(),
  };
}

/**
 * Check if a date falls within the given month and/or year.
 * @param {string|number|Date|null|undefined} dateStr
 * @param {number|null|undefined} month - 1–12
 * @param {number|null|undefined} year - 4-digit year
 * @returns {boolean}
 */
export function inMonthYear(dateStr, month, year) {
  if (dateStr == null) return false;
  const d = parseDate(dateStr);
  if (!d) return false;
  const m = d.getUTCMonth() + 1;
  const y = d.getUTCFullYear();
  if (year != null && y !== Number(year)) return false;
  if (month != null && m !== Number(month)) return false;
  return true;
}

/**
 * Day difference (actual - due). Rounded to nearest day.
 * @param {string|number|Date} due
 * @param {string|number|Date} actual
 * @returns {number}
 */
export function dayDiff(due, actual) {
  const d = parseDateUTC(due);
  const a = parseDateUTC(actual);
  if (!d || !a) return NaN;
  return Math.round((a - d) / (1000 * 60 * 60 * 24));
}

/**
 * Classify on-time status: early, on_time, delay, or pending.
 * @param {string|null|undefined} due - ISO date (YYYY-MM-DD)
 * @param {string|null|undefined} actual - ISO date
 * @returns {'early'|'on_time'|'delay'|'pending'}
 */
export function classifyOnTime(due, actual) {
  if (!due) return 'pending';
  const dueDate = parseDateUTC(due);
  if (!dueDate) return 'pending';
  const today = startOfDayUTC(new Date());
  if (!actual) {
    return dueDate < today ? 'delay' : 'pending';
  }
  const actualDate = parseDateUTC(actual);
  if (!actualDate) return 'pending';
  const diffDays = dayDiff(due, actual);
  if (diffDays < 0) return 'early';
  if (diffDays <= 0) return 'on_time';
  return 'delay';
}

/**
 * Start of day in UTC.
 * @param {Date} d
 * @returns {Date}
 */
export function startOfDayUTC(d) {
  const x = new Date(d);
  return new Date(Date.UTC(x.getUTCFullYear(), x.getUTCMonth(), x.getUTCDate()));
}

/**
 * Start of month in UTC (first day of month).
 * @param {number} year - 4-digit
 * @param {number} month - 1–12
 * @returns {Date}
 */
export function startOfMonth(year, month) {
  return new Date(Date.UTC(Number(year), Number(month) - 1, 1));
}

/**
 * End of month in UTC (last day, 23:59:59.999).
 * @param {number} year - 4-digit
 * @param {number} month - 1–12
 * @returns {Date}
 */
export function endOfMonth(year, month) {
  return new Date(Date.UTC(Number(year), Number(month), 0, 23, 59, 59, 999));
}

/**
 * Format Date as YYYY-MM-DD (UTC).
 * @param {Date|string|number} value
 * @returns {string|null}
 */
export function toISODate(value) {
  const d = parseDate(value);
  if (!d) return null;
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, '0');
  const day = String(d.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/**
 * Today's date in UTC as YYYY-MM-DD.
 * @returns {string}
 */
export function todayISO() {
  return toISODate(new Date()) ?? '';
}

/**
 * Return start and end Date for a given month/year (UTC).
 * @param {number} year - 4-digit
 * @param {number} month - 1–12
 * @returns {{ start: Date, end: Date }}
 */
export function monthRange(year, month) {
  return {
    start: startOfMonth(year, month),
    end: endOfMonth(year, month),
  };
}
