import { graphql } from '../../github/client.js';
import { GitHubError } from '../../github/errors.js';
import { STREAK_QUERY, type StreakQueryResult } from '../../github/queries.js';
import type { TokenPool } from '../../github/token-pool.js';
import type { ContributionDay, StreakFetchResult } from './types.js';

/** Cap history depth so an old account can't trigger unbounded fetches. */
const MAX_YEARS = 10;

/**
 * Fetch the full daily-contribution history, looping GitHub's ~1-year
 * contributionsCollection window per calendar year from account creation to
 * now, then merging days. This is what lets streaks span multiple years
 * accurately instead of being clipped to the last 12 months.
 */
export async function fetchUserStreak(
  pool: TokenPool,
  username: string,
  timeoutMs: number,
  now: Date = new Date(),
): Promise<StreakFetchResult> {
  const currentYear = now.getUTCFullYear();
  const byDate = new Map<string, number>();

  // First request (current year) also yields createdAt to bound the loop.
  const firstResult = await queryYear(pool, username, currentYear, now, timeoutMs);
  if (!firstResult.user) throw new GitHubError('user not found', 'not_found');
  const createdAt = firstResult.user.createdAt;
  mergeDays(byDate, firstResult);

  const createdYear = new Date(createdAt).getUTCFullYear();
  const earliestYear = Math.max(createdYear, currentYear - MAX_YEARS);

  for (let year = earliestYear; year < currentYear; year++) {
    const result = await queryYear(pool, username, year, now, timeoutMs);
    mergeDays(byDate, result);
  }

  const days: ContributionDay[] = [...byDate.entries()]
    .map(([date, count]) => ({ date, count }))
    .sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));

  return { login: username, createdAt, days };
}

async function queryYear(
  pool: TokenPool,
  login: string,
  year: number,
  now: Date,
  timeoutMs: number,
): Promise<StreakQueryResult> {
  const from = `${year}-01-01T00:00:00Z`;
  // For the current year, cap `to` at now; GitHub rejects future ranges.
  const to =
    year === now.getUTCFullYear() ? now.toISOString() : `${year}-12-31T23:59:59Z`;
  return graphql<StreakQueryResult>(
    pool,
    STREAK_QUERY,
    { login, from, to },
    { timeoutMs },
  );
}

function mergeDays(target: Map<string, number>, result: StreakQueryResult): void {
  const user = result.user;
  if (!user) return;
  for (const week of user.contributionsCollection.contributionCalendar.weeks) {
    for (const day of week.contributionDays) {
      // Last write wins; year windows don't overlap so this is a no-op merge.
      target.set(day.date, day.contributionCount);
    }
  }
}
