import type { RawUserStats } from './types.js';

export type RankLevel = 'S' | 'A+' | 'A' | 'A-' | 'B+' | 'B' | 'B-' | 'C+' | 'C';

export interface Rank {
  level: RankLevel;
  /** "Top N%" — smaller is better. Rounded to one decimal. */
  percentile: number;
}

/**
 * Rank / percentile model.
 *
 * We combine a handful of activity metrics into a single 0..1 activity score,
 * then express it as a "top N%" percentile and a letter grade.
 *
 * For each metric we use the exponential CDF  f(x) = 1 - 2^(-x/median),  which
 * maps a raw value to (0,1): a user at the reference median scores 0.5 on that
 * metric, well-above-median saturates toward 1, and 0 maps to 0. The score is
 * the weighted mean of per-metric CDFs. Medians are rough, community-scale
 * reference points (not GitHub-official) chosen to spread real users sensibly;
 * they are tunable in one place. topPercent = (1 - score) * 100.
 *
 * This is intentionally a heuristic, documented and reproducible — not a claim
 * about GitHub's true global distribution.
 */

interface MetricRef {
  value: (s: RawUserStats) => number;
  median: number;
  weight: number;
}

const METRICS: MetricRef[] = [
  { value: (s) => s.totalCommits, median: 250, weight: 2 },
  { value: (s) => s.totalPRs, median: 50, weight: 3 },
  { value: (s) => s.totalIssues, median: 25, weight: 1 },
  { value: (s) => s.totalStars, median: 50, weight: 4 },
  { value: (s) => s.followers, median: 25, weight: 1 },
  { value: (s) => s.totalContributions, median: 1000, weight: 2 },
];

const THRESHOLDS: Array<{ level: RankLevel; maxTopPercent: number }> = [
  { level: 'S', maxTopPercent: 1 },
  { level: 'A+', maxTopPercent: 12.5 },
  { level: 'A', maxTopPercent: 25 },
  { level: 'A-', maxTopPercent: 37.5 },
  { level: 'B+', maxTopPercent: 50 },
  { level: 'B', maxTopPercent: 62.5 },
  { level: 'B-', maxTopPercent: 75 },
  { level: 'C+', maxTopPercent: 87.5 },
  { level: 'C', maxTopPercent: 100 },
];

/** Exponential CDF: 0 -> 0, median -> 0.5, large -> ~1. */
function exponentialCdf(value: number, median: number): number {
  if (value <= 0) return 0;
  return 1 - Math.pow(2, -value / median);
}

export function computeRank(stats: RawUserStats): Rank {
  let weighted = 0;
  let totalWeight = 0;
  for (const m of METRICS) {
    weighted += m.weight * exponentialCdf(m.value(stats), m.median);
    totalWeight += m.weight;
  }
  const score = totalWeight > 0 ? weighted / totalWeight : 0;
  const topPercent = Math.max(1, Math.min(100, (1 - score) * 100));
  const level = THRESHOLDS.find((t) => topPercent <= t.maxTopPercent)?.level ?? 'C';
  return { level, percentile: Math.round(topPercent * 10) / 10 };
}
