import { graphql } from '../../github/client.js';
import { GitHubError } from '../../github/errors.js';
import { STREAK_QUERY, type StreakQueryResult } from '../../github/queries.js';
import type { TokenPool } from '../../github/token-pool.js';
import { addDays } from '../../util/date.js';
import type { ActivityFetchResult, ActivityPoint } from './types.js';

/**
 * Fetch daily contributions for the last `rangeDays` days in a single
 * contributionsCollection window (cheaper than the streak card's multi-year
 * walk). Reuses STREAK_QUERY since it already returns the daily calendar.
 */
export async function fetchUserActivity(
  pool: TokenPool,
  username: string,
  rangeDays: number,
  timeoutMs: number,
  now: Date = new Date(),
): Promise<ActivityFetchResult> {
  const to = now.toISOString();
  const from = new Date(now.getTime() - rangeDays * 86400000).toISOString();

  const result = await graphql<StreakQueryResult>(
    pool,
    STREAK_QUERY,
    { login: username, from, to },
    { timeoutMs },
  );
  if (!result.user) throw new GitHubError('user not found', 'not_found');

  const byDate = new Map<string, number>();
  for (const week of result.user.contributionsCollection.contributionCalendar.weeks) {
    for (const day of week.contributionDays) {
      byDate.set(day.date, day.contributionCount);
    }
  }

  // Emit an entry for every day in the window (fill gaps with 0) so the chart
  // x-axis is evenly spaced regardless of which days GitHub returned.
  const points: ActivityPoint[] = [];
  const todayStr = to.slice(0, 10);
  for (let i = rangeDays - 1; i >= 0; i--) {
    const date = addDays(todayStr, -i);
    points.push({ date, count: byDate.get(date) ?? 0 });
  }

  return { login: username, points };
}
