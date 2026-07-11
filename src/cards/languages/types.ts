/** How a language's weight is computed. */
export type LanguageWeight = 'size' | 'count';

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
