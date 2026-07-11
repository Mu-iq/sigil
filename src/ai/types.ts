/** Public signals fed to the AI summary. Only non-sensitive, public data. */
export interface SummarySignals {
  login: string;
  name: string;
  totalStars: number;
  totalCommits: number;
  totalPRs: number;
  totalContributions: number;
  followers: number;
  repoCount: number;
  /** Top language names by size, most first (may be empty). */
  topLanguages: string[];
}

/**
 * Pluggable AI provider. Implementations call their API over fetch (this runs
 * on Workers, no SDK). Providers are used ONLY by the scheduled job.
 */
export interface AiProvider {
  readonly name: string;
  readonly model: string;
  /** Generate a completion, or null if the model declined / failed. */
  complete(system: string, user: string, timeoutMs: number): Promise<string | null>;
}
