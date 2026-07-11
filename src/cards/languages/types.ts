/** How a language's weight is computed. */
/**
 * How language slices are weighted:
 * - `bytes`  — raw code size (a few huge files can dominate).
 * - `count`  — number of repos each language appears in (what you build in).
 * - `hybrid` — blend of normalized byte share and normalized repo-count share.
 */
export type LanguageWeight = 'bytes' | 'count' | 'hybrid';

/**
 * Per-repo language data flattened from the GraphQL response. This is the raw
 * material the pure transform aggregates — no SVG or wire concerns here.
 */
export interface RepoLanguages {
  repo: string;
  isPrivate: boolean;
  /** Languages in this repo with their byte sizes. */
  languages: Array<{ name: string; color: string | null; size: number }>;
}

export interface LanguagesFetchResult {
  login: string;
  repos: RepoLanguages[];
}

/** One aggregated language row produced by the transform. */
export interface LanguageSlice {
  name: string;
  color: string;
  /** Absolute weight (bytes if size-weighted, repo count if count-weighted). */
  weight: number;
  /** Share of the shown total, 0..100, rounded to one decimal. */
  percentage: number;
}

export interface LanguagesFetchOptions {
  /** Include private repos' languages. Requires a token that can see them. */
  includePrivate: boolean;
}
