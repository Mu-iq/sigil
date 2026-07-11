import { addDays, isPreviousDay } from '../../util/date.js';
import type { StreakFetchResult, StreakModel, StreakRange } from './types.js';

const EMPTY: StreakRange = { length: 0, startDate: null, endDate: null };

/**
 * Pure streak computation. Timezone-awareness lives in the caller: it passes
 * `today` as the current calendar date in the requested timezone, and this
 * function decides streak boundaries against that day (no naive UTC "now").
 *
 * Rules:
 * - longest streak = the longest run of consecutive days each with >0
 *   contributions, anywhere in history.
 * - current streak = the run ending today (if today has contributions) or
 *   ending yesterday (today may still be in progress). If neither today nor
 *   yesterday has contributions, the current streak is 0.
 */
export function transformStreak(data: StreakFetchResult, today: string): StreakModel {
  const counts = new Map<string, number>();
  let total = 0;
  for (const d of data.days) {
    counts.set(d.date, d.count);
    total += d.count;
  }

  const dates = [...counts.keys()].sort();
  const firstDate = dates.length > 0 ? dates[0]! : null;

  // Longest streak: walk ascending, extending when days are adjacent and >0.
  let longest: StreakRange = EMPTY;
  let runStart: string | null = null;
  let prev: string | null = null;
  for (const date of dates) {
    const active = (counts.get(date) ?? 0) > 0;
    if (active && prev !== null && runStart !== null && isPreviousDay(prev, date)) {
      // extend current run
    } else if (active) {
      runStart = date; // start a new run
    } else {
      runStart = null; // break
    }
    if (active && runStart !== null) {
      const length = dayCount(runStart, date);
      if (length > longest.length) {
        longest = { length, startDate: runStart, endDate: date };
      }
    }
    prev = date;
  }

  // Current streak: start from today if it has contributions, else yesterday.
  const current = computeCurrent(counts, today);

  return {
    totalContributions: total,
    firstDate,
    currentStreak: current,
    longestStreak: longest,
  };
}

function computeCurrent(counts: Map<string, number>, today: string): StreakRange {
  const yesterday = addDays(today, -1);
  let end: string;
  if ((counts.get(today) ?? 0) > 0) {
    end = today;
  } else if ((counts.get(yesterday) ?? 0) > 0) {
    end = yesterday;
  } else {
    return EMPTY;
  }

  let start = end;
  while ((counts.get(addDays(start, -1)) ?? 0) > 0) {
    start = addDays(start, -1);
  }
  return { length: dayCount(start, end), startDate: start, endDate: end };
}

/** Inclusive day count between two YYYY-MM-DD dates. */
function dayCount(start: string, end: string): number {
  const ms = Date.parse(`${end}T12:00:00Z`) - Date.parse(`${start}T12:00:00Z`);
  return Math.round(ms / 86400000) + 1;
}
