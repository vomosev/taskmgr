// Pure formatting helpers shared across the TaskMgr UI.
// No React, no DOM access — safe to import from server or client components.

export const STATUS_LABELS = {
  todo: 'To do',
  in_progress: 'In progress',
  done: 'Done',
};

export const PRIORITY_LABELS = {
  low: 'Low',
  medium: 'Medium',
  high: 'High',
};

export const STATUS_OPTIONS = [
  { value: 'todo', label: STATUS_LABELS.todo },
  { value: 'in_progress', label: STATUS_LABELS.in_progress },
  { value: 'done', label: STATUS_LABELS.done },
];

export const PRIORITY_OPTIONS = [
  { value: 'low', label: PRIORITY_LABELS.low },
  { value: 'medium', label: PRIORITY_LABELS.medium },
  { value: 'high', label: PRIORITY_LABELS.high },
];

export const SORT_OPTIONS = [
  { value: 'due_date', label: 'Due date' },
  { value: 'created_at', label: 'Newest first' },
  { value: 'priority', label: 'Priority' },
];

const MONTHS = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
];

const MS_PER_DAY = 24 * 60 * 60 * 1000;

/**
 * Parse an ISO-ish date string (or Date) into a Date object, or null.
 * Accepts 'YYYY-MM-DD' and full ISO timestamps.
 */
export function parseDate(iso) {
  if (!iso) return null;
  if (iso instanceof Date) {
    return Number.isNaN(iso.getTime()) ? null : iso;
  }
  if (typeof iso !== 'string' && typeof iso !== 'number') return null;

  const raw = String(iso).trim();
  if (!raw) return null;

  // Date-only strings are treated as local dates to avoid timezone drift.
  const dateOnly = /^(\d{4})-(\d{2})-(\d{2})$/.exec(raw);
  if (dateOnly) {
    const year = Number(dateOnly[1]);
    const month = Number(dateOnly[2]) - 1;
    const day = Number(dateOnly[3]);
    const d = new Date(year, month, day);
    return Number.isNaN(d.getTime()) ? null : d;
  }

  const parsed = new Date(raw);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

/** Strip the time component so day comparisons are stable. */
function startOfDay(date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

/** Whole-day difference between two dates (b - a). */
function dayDiff(from, to) {
  const a = startOfDay(from).getTime();
  const b = startOfDay(to).getTime();
  return Math.round((b - a) / MS_PER_DAY);
}

/**
 * Format a date as '12 Mar 2025'. Returns '' for invalid/missing input.
 */
export function formatDate(iso) {
  const date = parseDate(iso);
  if (!date) return '';
  const day = date.getDate();
  const month = MONTHS[date.getMonth()];
  const year = date.getFullYear();
  return `${day} ${month} ${year}`;
}

/**
 * Format a date/time as '12 Mar 2025, 14:05'. Returns '' when invalid.
 */
export function formatDateTime(iso) {
  const date = parseDate(iso);
  if (!date) return '';
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${formatDate(date)}, ${hours}:${minutes}`;
}

/**
 * Convert a date to the 'YYYY-MM-DD' value used by <input type="date">.
 */
export function toDateInputValue(iso) {
  const date = parseDate(iso);
  if (!date) return '';
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Human friendly due-date copy: 'Due today', 'Due tomorrow', 'Due in 3 days',
 * 'Overdue by 2 days'. Returns '' when there is no valid date.
 */
export function formatRelativeDue(iso, now = new Date()) {
  const date = parseDate(iso);
  if (!date) return '';
  const reference = parseDate(now) || new Date();
  const diff = dayDiff(reference, date);

  if (diff === 0) return 'Due today';
  if (diff === 1) return 'Due tomorrow';
  if (diff === -1) return 'Overdue by 1 day';

  if (diff < -1) {
    const days = Math.abs(diff);
    if (days < 30) return `Overdue by ${days} days`;
    const months = Math.round(days / 30);
    return months === 1 ? 'Overdue by 1 month' : `Overdue by ${months} months`;
  }

  if (diff < 30) return `Due in ${diff} days`;
  const months = Math.round(diff / 30);
  return months === 1 ? 'Due in 1 month' : `Due in ${months} months`;
}

/**
 * True when a task's due date has passed and the task is not done.
 */
export function isOverdue(iso, status, now = new Date()) {
  if (status === 'done') return false;
  const date = parseDate(iso);
  if (!date) return false;
  const reference = parseDate(now) || new Date();
  return dayDiff(reference, date) < 0;
}

/**
 * Truncate text to `max` characters, adding an ellipsis when cut.
 */
export function truncate(text, max = 140) {
  if (text === null || text === undefined) return '';
  const value = String(text);
  const limit = Number.isFinite(max) && max > 0 ? Math.floor(max) : 140;
  if (value.length <= limit) return value;
  return `${value.slice(0, Math.max(0, limit - 1)).trimEnd()}…`;
}

/** Safe label lookups so unknown enum values never render as blank. */
export function statusLabel(status) {
  return STATUS_LABELS[status] || 'To do';
}

export function priorityLabel(priority) {
  return PRIORITY_LABELS[priority] || 'Medium';
}

/** Simple pluralisation helper used by stat tiles and counts. */
export function pluralize(count, singular, plural) {
  const n = Number(count) || 0;
  const word = n === 1 ? singular : plural || `${singular}s`;
  return `${n} ${word}`;
}

export default {
  STATUS_LABELS,
  PRIORITY_LABELS,
  STATUS_OPTIONS,
  PRIORITY_OPTIONS,
  SORT_OPTIONS,
  parseDate,
  formatDate,
  formatDateTime,
  toDateInputValue,
  formatRelativeDue,
  isOverdue,
  truncate,
  statusLabel,
  priorityLabel,
  pluralize,
};