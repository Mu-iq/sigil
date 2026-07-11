import { formatCompact } from '../../util/format.js';
import { computeRank, type Rank } from './rank.js';
import type { RawUserStats } from './types.js';

/** Stable metric keys — used for icon selection and show/hide filtering. */
export type StatKey =
  'stars' | 'commits' | 'prs' | 'issues' | 'contributions' | 'followers';

export const ALL_STAT_KEYS: StatKey[] = [
  'stars',
  'commits',
  'prs',
  'issues',
  'contributions',
  'followers',
];

const LABELS: Record<StatKey, string> = {
  stars: 'Total Stars Earned',
  commits: 'Total Commits',
  prs: 'Total PRs',
  issues: 'Total Issues',
  contributions: 'Contributions (last year)',
  followers: 'Followers',
};

export interface StatItem {
  key: StatKey;
  label: string;
  /** Display-formatted value (already compacted). */
  value: string;
}

/** Fully resolved display model the renderer consumes. Pure data, no I/O. */
export interface StatsCardModel {
  title: string;
  items: StatItem[];
  rank: Rank | null;
  showIcons: boolean;
}

/** Options that shape the transform output (post-validation). */
export interface StatsTransformOptions {
  /** Custom card title. Defaults to "<name>'s GitHub Stats". */
  title?: string | undefined;
  /** Whitelist of stat keys to show (overrides default set if provided). */
  show?: StatKey[] | undefined;
  /** Blacklist of stat keys to hide. */
  hide?: StatKey[] | undefined;
  showIcons: boolean;
  hideRank: boolean;
}

function rawValue(stats: RawUserStats, key: StatKey): number {
  switch (key) {
    case 'stars':
      return stats.totalStars;
    case 'commits':
      return stats.totalCommits;
    case 'prs':
      return stats.totalPRs;
    case 'issues':
      return stats.totalIssues;
    case 'contributions':
      return stats.totalContributions;
    case 'followers':
      return stats.followers;
  }
}

/**
 * Pure transform: raw stats + options -> display model. All business logic and
 * math lives here so it's unit-testable without any I/O or rendering.
 */
export function transformStats(
  stats: RawUserStats,
  options: StatsTransformOptions,
): StatsCardModel {
  const base = options.show && options.show.length > 0 ? options.show : ALL_STAT_KEYS;
  const hidden = new Set(options.hide ?? []);
  const keys = base.filter((k) => !hidden.has(k));

  const items: StatItem[] = keys.map((key) => ({
    key,
    label: LABELS[key],
    value: formatCompact(rawValue(stats, key)),
  }));

  return {
    title: options.title ?? `${stats.name}'s GitHub Stats`,
    items,
    rank: options.hideRank ? null : computeRank(stats),
    showIcons: options.showIcons,
  };
}
