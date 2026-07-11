import type { ContributionDay } from '../streak/types.js';
import type { LanguagesFetchResult } from '../languages/types.js';

export interface WrappedFetchResult {
  login: string;
  year: number;
  /** Daily contributions within the requested year. */
  days: ContributionDay[];
  /** Repo languages (overall) for the signature-language highlight. */
  languages: LanguagesFetchResult;
}

export interface WrappedModel {
  year: number;
  totalContributions: number;
  /** Number of days with at least one contribution. */
  activeDays: number;
  busiestMonth: { month: string; count: number } | null;
  bestDay: { date: string; count: number } | null;
  longestStreak: number;
  topLanguage: { name: string; color: string } | null;
}
