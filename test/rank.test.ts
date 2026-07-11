import { describe, expect, it } from 'vitest';
import { computeRank } from '../src/cards/stats/rank.js';
import type { RawUserStats } from '../src/cards/stats/types.js';

function stats(overrides: Partial<RawUserStats>): RawUserStats {
  return {
    login: 'x',
    name: 'X',
    totalStars: 0,
    totalCommits: 0,
    totalPRs: 0,
    totalIssues: 0,
    totalContributions: 0,
    followers: 0,
    repoCount: 0,
    ...overrides,
  };
}

describe('computeRank', () => {
  it('gives a low (worse) rank to an empty account', () => {
    const r = computeRank(stats({}));
    expect(r.percentile).toBeGreaterThanOrEqual(99);
    expect(r.level).toBe('C');
  });

  it('gives a top rank to a very active account', () => {
    const r = computeRank(
      stats({
        totalStars: 5000,
        totalCommits: 8000,
        totalPRs: 1200,
        totalIssues: 600,
        totalContributions: 20000,
        followers: 3000,
      }),
    );
    expect(r.percentile).toBeLessThanOrEqual(5);
    expect(['S', 'A+']).toContain(r.level);
  });

  it('is monotonic: more activity never worsens the percentile', () => {
    const low = computeRank(stats({ totalStars: 10, totalCommits: 50 }));
    const high = computeRank(stats({ totalStars: 500, totalCommits: 2000 }));
    expect(high.percentile).toBeLessThanOrEqual(low.percentile);
  });

  it('clamps percentile into [1, 100]', () => {
    const r = computeRank(stats({ totalStars: 1e9, totalCommits: 1e9 }));
    expect(r.percentile).toBeGreaterThanOrEqual(1);
    expect(r.percentile).toBeLessThanOrEqual(100);
  });
});
