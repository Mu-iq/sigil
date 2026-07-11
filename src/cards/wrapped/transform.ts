import { isPreviousDay } from '../../util/date.js';
import { transformLanguages } from '../languages/transform.js';
import type { ContributionDay } from '../streak/types.js';
import type { WrappedFetchResult, WrappedModel } from './types.js';

const MONTHS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

/**
 * Pure Wrapped computation: a year's daily contributions + overall languages
 * become a shareable summary. Only days within the requested year are counted,
 * so a partial current-year window still summarizes correctly.
 */
export function transformWrapped(data: WrappedFetchResult): WrappedModel {
  const prefix = `${data.year}-`;
  const days = data.days
    .filter((d) => d.date.startsWith(prefix))
    .sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));

  let total = 0;
  let activeDays = 0;
  let bestDay: ContributionDay | null = null;
  const monthTotals = new Array<number>(12).fill(0);

  for (const day of days) {
    total += day.count;
    if (day.count > 0) activeDays += 1;
    if (!bestDay || day.count > bestDay.count) bestDay = day;
    const monthIdx = parseInt(day.date.slice(5, 7), 10) - 1;
    if (monthIdx >= 0 && monthIdx < 12) {
      monthTotals[monthIdx] = (monthTotals[monthIdx] ?? 0) + day.count;
    }
  }

  const busiestMonth = pickBusiestMonth(monthTotals);
  const longestStreak = computeLongestStreak(days);
  const topLanguage = pickTopLanguage(data);

  return {
    year: data.year,
    totalContributions: total,
    activeDays,
    busiestMonth,
    bestDay:
      bestDay && bestDay.count > 0 ? { date: bestDay.date, count: bestDay.count } : null,
    longestStreak,
    topLanguage,
  };
}

function pickBusiestMonth(monthTotals: number[]): WrappedModel['busiestMonth'] {
  let bestIdx = -1;
  let bestVal = 0;
  monthTotals.forEach((v, i) => {
    if (v > bestVal) {
      bestVal = v;
      bestIdx = i;
    }
  });
  return bestIdx >= 0 ? { month: MONTHS[bestIdx]!, count: bestVal } : null;
}

function computeLongestStreak(days: ContributionDay[]): number {
  let longest = 0;
  let run = 0;
  let prev: string | null = null;
  for (const day of days) {
    if (day.count > 0) {
      run = prev !== null && isPreviousDay(prev, day.date) ? run + 1 : 1;
      if (run > longest) longest = run;
    } else {
      run = 0;
    }
    prev = day.date;
  }
  return longest;
}

function pickTopLanguage(data: WrappedFetchResult): WrappedModel['topLanguage'] {
  const model = transformLanguages(data.languages, { weight: 'size', langsCount: 5 });
  const top = model.slices.find((s) => s.name !== 'Other');
  return top ? { name: top.name, color: top.color } : null;
}
