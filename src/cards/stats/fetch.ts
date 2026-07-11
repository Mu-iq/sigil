import { graphql } from '../../github/client.js';
import { GitHubError } from '../../github/errors.js';
import { STATS_QUERY, type StatsQueryResult } from '../../github/queries.js';
import type { TokenPool } from '../../github/token-pool.js';
import type { RawUserStats, StatsFetchOptions } from './types.js';

/** Hard cap on repo pages so a pathological account can't run away with quota. */
const MAX_REPO_PAGES = 20; // 20 * 100 = 2000 repos

/**
 * Fetch and aggregate a user's stats. Pages through ALL owned non-fork repos to
 * compute a correct star total (the bug other tools have is stopping at 100).
 */
export async function fetchUserStats(
  pool: TokenPool,
  username: string,
  options: StatsFetchOptions,
  timeoutMs: number,
): Promise<RawUserStats> {
  let after: string | null = null;
  let totalStars = 0;
  let first: StatsQueryResult['user'] = null;
  let pages = 0;

  do {
    const result: StatsQueryResult = await graphql<StatsQueryResult>(
      pool,
      STATS_QUERY,
      { login: username, after },
      { timeoutMs },
    );
    const user = result.user;
    if (!user) throw new GitHubError('user not found', 'not_found');
    if (!first) first = user;

    for (const repo of user.repositories.nodes) {
      totalStars += repo.stargazerCount;
    }

    const pageInfo = user.repositories.pageInfo;
    after = pageInfo.hasNextPage ? pageInfo.endCursor : null;
    pages += 1;
  } while (after !== null && pages < MAX_REPO_PAGES);

  const c = first!.contributionsCollection;
  const totalCommits =
    c.totalCommitContributions +
    (options.countPrivate ? c.restrictedContributionsCount : 0);

  return {
    login: first!.login,
    name: first!.name ?? first!.login,
    totalStars,
    totalCommits,
    totalPRs: first!.pullRequests.totalCount,
    totalIssues: first!.issues.totalCount,
    totalContributions: c.contributionCalendar.totalContributions,
    followers: first!.followers.totalCount,
    repoCount: first!.repositories.totalCount,
  };
}
