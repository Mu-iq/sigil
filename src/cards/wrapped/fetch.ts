import { fetchUserLanguages } from '../languages/fetch.js';
import { graphql } from '../../github/client.js';
import { GitHubError } from '../../github/errors.js';
import { STREAK_QUERY, type StreakQueryResult } from '../../github/queries.js';
import type { TokenPool } from '../../github/token-pool.js';
import type { ContributionDay } from '../streak/types.js';
import type { WrappedFetchResult } from './types.js';

/**
 * Fetch the data a Wrapped card needs: the year's daily contributions (one
 * contributionsCollection window) plus overall repo languages for the
 * signature-language highlight.
 */
export async function fetchWrappedData(
  pool: TokenPool,
  username: string,
  year: number,
  timeoutMs: number,
  now: Date = new Date(),
): Promise<WrappedFetchResult> {
  const from = `${year}-01-01T00:00:00Z`;
  // Cap the current year's window at now; GitHub rejects future ranges.
  const isCurrentYear = year === now.getUTCFullYear();
  const to = isCurrentYear ? now.toISOString() : `${year}-12-31T23:59:59Z`;

  const [calendar, languages] = await Promise.all([
    graphql<StreakQueryResult>(
      pool,
      STREAK_QUERY,
      { login: username, from, to },
      { timeoutMs },
    ),
    fetchUserLanguages(pool, username, { includePrivate: false }, timeoutMs),
  ]);

  if (!calendar.user) throw new GitHubError('user not found', 'not_found');

  const days: ContributionDay[] = [];
  for (const week of calendar.user.contributionsCollection.contributionCalendar.weeks) {
    for (const day of week.contributionDays) {
      days.push({ date: day.date, count: day.contributionCount });
    }
  }

  return { login: username, year, days, languages };
}
