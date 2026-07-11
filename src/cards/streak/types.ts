/** One calendar day of contributions (date is a YYYY-MM-DD calendar day). */
export interface ContributionDay {
  date: string;
  count: number;
}

/** Raw streak input: all days merged across years, ascending by date. */
export interface StreakFetchResult {
  login: string;
  createdAt: string;
  days: ContributionDay[];
}

export interface StreakRange {
  length: number;
  /** YYYY-MM-DD, or null when length is 0. */
  startDate: string | null;
  endDate: string | null;
}

/** Display model produced by the pure transform. */
export interface StreakModel {
  totalContributions: number;
  /** Earliest day we have data for (range start), for the "since" caption. */
  firstDate: string | null;
  currentStreak: StreakRange;
  longestStreak: StreakRange;
}
