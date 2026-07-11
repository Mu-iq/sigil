/**
 * Normalized, source-of-truth stats for a user, produced by the fetch step and
 * consumed by the pure transform. No SVG or GitHub-wire concerns leak in here.
 */
export interface RawUserStats {
  login: string;
  name: string;
  totalStars: number;
  totalCommits: number;
  totalPRs: number;
  totalIssues: number;
  totalContributions: number;
  followers: number;
  /** Repos owned (non-fork), for context/percentile inputs. */
  repoCount: number;
}

/** Options that affect what/how stats are fetched. */
export interface StatsFetchOptions {
  /** Include private (restricted) contributions in the commit total. */
  countPrivate: boolean;
}
