import { describe, expect, it } from 'vitest';
import { transformStreak } from '../src/cards/streak/transform.js';
import type { StreakFetchResult } from '../src/cards/streak/types.js';

/** Build contiguous daily data from a start date and a count-per-day array. */
function series(start: string, counts: number[]): StreakFetchResult {
  const days = counts.map((count, i) => {
    const ms = Date.parse(`${start}T12:00:00Z`) + i * 86400000;
    return { date: new Date(ms).toISOString().slice(0, 10), count };
  });
  return { login: 'x', createdAt: `${start}T00:00:00Z`, days };
}

describe('transformStreak', () => {
  it('sums total contributions', () => {
    const m = transformStreak(series('2026-01-01', [1, 2, 0, 3]), '2026-01-05');
    expect(m.totalContributions).toBe(6);
    expect(m.firstDate).toBe('2026-01-01');
  });

  it('finds the longest run of consecutive active days', () => {
    // active: 1,1,1 then break then 1,1
    const m = transformStreak(series('2026-01-01', [1, 1, 1, 0, 1, 1]), '2026-01-10');
    expect(m.longestStreak.length).toBe(3);
    expect(m.longestStreak.startDate).toBe('2026-01-01');
    expect(m.longestStreak.endDate).toBe('2026-01-03');
  });

  it('counts the current streak through today when today is active', () => {
    const m = transformStreak(series('2026-01-01', [0, 1, 1, 1]), '2026-01-04');
    expect(m.currentStreak.length).toBe(3);
    expect(m.currentStreak.endDate).toBe('2026-01-04');
    expect(m.currentStreak.startDate).toBe('2026-01-02');
  });

  it('keeps the streak alive through yesterday when today has no data yet', () => {
    // days cover through 01-04; "today" is 01-05 with no contribution recorded.
    const m = transformStreak(series('2026-01-01', [1, 1, 1, 1]), '2026-01-05');
    expect(m.currentStreak.length).toBe(4);
    expect(m.currentStreak.endDate).toBe('2026-01-04');
  });

  it('breaks the current streak when neither today nor yesterday is active', () => {
    const m = transformStreak(series('2026-01-01', [1, 1, 0, 0]), '2026-01-04');
    expect(m.currentStreak.length).toBe(0);
    expect(m.currentStreak.startDate).toBeNull();
  });

  it('timezone shifts "today" and therefore the current-streak verdict', () => {
    // Active through 01-04. In a tz still on 01-04, streak is live; in a tz
    // already on 01-06 (skipped a full empty day), it is broken.
    const data = series('2026-01-01', [1, 1, 1, 1]);
    expect(transformStreak(data, '2026-01-04').currentStreak.length).toBe(4);
    expect(transformStreak(data, '2026-01-05').currentStreak.length).toBe(4);
    expect(transformStreak(data, '2026-01-06').currentStreak.length).toBe(0);
  });

  it('handles an empty history without throwing', () => {
    const m = transformStreak(
      { login: 'x', createdAt: '2026-01-01', days: [] },
      '2026-01-05',
    );
    expect(m.totalContributions).toBe(0);
    expect(m.currentStreak.length).toBe(0);
    expect(m.longestStreak.length).toBe(0);
    expect(m.firstDate).toBeNull();
  });
});
