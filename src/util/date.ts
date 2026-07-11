/**
 * Calendar-day helpers for timezone-aware streaks. We treat contribution days
 * as bare YYYY-MM-DD strings and do arithmetic at UTC noon to sidestep DST
 * edge cases — the day label is what matters, not the instant.
 */

/** The calendar date (YYYY-MM-DD) at `instant` in the given IANA timezone. */
export function todayInTimeZone(timeZone: string, instant: Date = new Date()): string {
  try {
    // en-CA formats as YYYY-MM-DD.
    return new Intl.DateTimeFormat('en-CA', {
      timeZone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(instant);
  } catch {
    // Invalid timezone -> fall back to UTC rather than throwing.
    return instant.toISOString().slice(0, 10);
  }
}

/** Add `n` days (may be negative) to a YYYY-MM-DD string, returning YYYY-MM-DD. */
export function addDays(date: string, n: number): string {
  const ms = Date.parse(`${date}T12:00:00Z`);
  const next = new Date(ms + n * 86400000);
  return next.toISOString().slice(0, 10);
}

/** True if `a` is the calendar day immediately before `b`. */
export function isPreviousDay(a: string, b: string): boolean {
  return addDays(a, 1) === b;
}

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

/** Format YYYY-MM-DD as "Mon D, YYYY" (deterministic, locale-free). */
export function formatDayLabel(date: string | null): string {
  if (!date) return '';
  const [y, m, d] = date.split('-').map((n) => parseInt(n, 10));
  if (!y || !m || !d) return '';
  return `${MONTHS[m - 1]} ${d}, ${y}`;
}

/** Validate a rough IANA timezone string; returns it or 'UTC'. */
export function normalizeTimeZone(tz: string | undefined): string {
  if (!tz) return 'UTC';
  try {
    new Intl.DateTimeFormat('en-CA', { timeZone: tz });
    return tz;
  } catch {
    return 'UTC';
  }
}
