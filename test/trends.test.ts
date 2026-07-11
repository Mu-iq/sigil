import { describe, expect, it } from 'vitest';
import { hasEnoughHistory, netChange, toDailySeries } from '../src/snapshots/trends.js';
import type { Snapshot, SnapshotMetrics } from '../src/snapshots/types.js';

function snap(capturedAt: string, m: Partial<SnapshotMetrics>): Snapshot {
  return {
    username: 'mu-iq',
    capturedAt,
    metrics: {
      stars: 0,
      commits: 0,
      contributions: 0,
      followers: 0,
      prs: 0,
      issues: 0,
      ...m,
    },
  };
}

describe('toDailySeries', () => {
  it('extracts one metric ordered by day', () => {
    const series = toDailySeries(
      [
        snap('2026-01-01T00:00:00Z', { stars: 10 }),
        snap('2026-01-03T00:00:00Z', { stars: 14 }),
        snap('2026-01-02T00:00:00Z', { stars: 12 }),
      ],
      'stars',
    );
    expect(series.map((p) => p.date)).toEqual(['2026-01-01', '2026-01-02', '2026-01-03']);
    expect(series.map((p) => p.value)).toEqual([10, 12, 14]);
  });

  it('keeps the latest capture when two land on the same day', () => {
    const series = toDailySeries(
      [
        snap('2026-01-01T06:00:00Z', { commits: 100 }),
        snap('2026-01-01T18:00:00Z', { commits: 108 }),
      ],
      'commits',
    );
    expect(series).toHaveLength(1);
    expect(series[0]?.value).toBe(108);
  });
});

describe('netChange / hasEnoughHistory', () => {
  it('nets last minus first', () => {
    const series = toDailySeries(
      [
        snap('2026-01-01T00:00:00Z', { followers: 5 }),
        snap('2026-02-01T00:00:00Z', { followers: 20 }),
      ],
      'followers',
    );
    expect(netChange(series)).toBe(15);
  });

  it('returns 0 change and insufficient history for a single point', () => {
    const series = toDailySeries([snap('2026-01-01T00:00:00Z', { stars: 3 })], 'stars');
    expect(netChange(series)).toBe(0);
    expect(hasEnoughHistory(series)).toBe(false);
  });
});
